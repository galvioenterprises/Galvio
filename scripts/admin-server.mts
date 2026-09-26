/**
 * Authenticated, loopback-only catalogue console.
 *
 * This is a repository tool, not the hosted /admin application. A hosted
 * editor needs Cloudflare Access plus a write-capable Worker/workflow.
 */

import { createHash, randomBytes } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { spawn } from "node:child_process";
import {
  existsSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { z } from "zod";
import { availabilitySchema, statusSchema } from "../src/lib/product-schema.ts";
import { BADGES, BADGE_IDS } from "../src/config/badges.ts";

const PORT = Number(process.env.GALVIO_ADMIN_PORT) || 4100;
const ORIGINS = new Set([`http://127.0.0.1:${PORT}`, `http://localhost:${PORT}`]);
const PRODUCTS = resolve("data/products");
const OVERRIDES = resolve("data/sources/inventory-overrides.json");
const DECISIONS = resolve("data/sources/voltas-decisions.json");
const REPORT = resolve("data/sources/voltas-match-report.tsv");
const CATALOGUE = resolve("data/sources/voltas-catalogue.json");
const IMAGE_MANIFEST = resolve("public/images/products/manifest.json");
const PUBLIC_IMAGES = resolve("public/images/products");
const TOKEN = process.env.GALVIO_ADMIN_TOKEN || randomBytes(24).toString("base64url");
const ACTOR = process.env.GALVIO_ADMIN_USER?.trim() || "local-admin";
const BODY_LIMIT = 64 * 1024;

/**
 * Orders live in the Worker's database (D1), not in this repository, so the
 * console reads and updates them through the Worker's admin API. Locally
 * that is `pnpm dev`/`pnpm preview` on :8787 with the token from .dev.vars;
 * for the live site set GALVIO_API_URL=https://galvioenterprises.com and
 * GALVIO_API_TOKEN to the ADMIN_API_TOKEN secret.
 */
const API_URL = (process.env.GALVIO_API_URL || "http://127.0.0.1:8787").replace(/\/$/, "");
const API_TOKEN = process.env.GALVIO_API_TOKEN || devVar("ADMIN_API_TOKEN");

function devVar(name: string): string {
  if (!existsSync(".dev.vars")) return "";
  const line = readFileSync(".dev.vars", "utf8").split("\n").find((l) => l.startsWith(`${name}=`));
  return line ? line.slice(name.length + 1).trim() : "";
}

async function proxyOrders(req: IncomingMessage, res: ServerResponse, path: string, search: string): Promise<void> {
  if (!API_TOKEN) {
    return sendJson(res, { error: "Set GALVIO_API_TOKEN (or ADMIN_API_TOKEN in .dev.vars) to see orders." }, 503);
  }
  const method = req.method ?? "GET";
  const init: RequestInit = {
    method,
    headers: { authorization: `Bearer ${API_TOKEN}`, "content-type": "application/json" },
  };
  if (method === "PATCH") init.body = JSON.stringify(await body(req));
  try {
    const upstream = await fetch(`${API_URL}/api/admin/${path}${search}`, init);
    const payload = await upstream.text();
    res.writeHead(upstream.status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    res.end(payload);
  } catch {
    sendJson(res, { error: `Can't reach the order server at ${API_URL}. Start it with pnpm dev, or set GALVIO_API_URL.` }, 502);
  }
}

type Product = Record<string, unknown> & {
  slug: string;
  sku: string;
  title: string;
  status: string;
  category: string;
  availability: string;
  mrp?: number;
  sellingPrice?: number;
  stockCount?: number;
  images?: { src: string }[];
  missing?: string[];
};
type Override = {
  values: Record<string, string | number>;
  updatedAt: string;
  updatedBy: string;
};
type StoredDecision = {
  handle: string | null;
  fingerprint: string;
};

const patchSchema = z.object({
  mrp: z.number().positive().nullable().optional(),
  sellingPrice: z.number().positive().nullable().optional(),
  stockCount: z.number().int().nonnegative().nullable().optional(),
  availability: availabilitySchema.optional(),
  status: statusSchema.optional(),
  badges: z.array(z.enum(BADGE_IDS)).max(BADGE_IDS.length).nullable().optional(),
}).strict();
const productRequestSchema = z.object({ sku: z.string().min(1).max(100), patch: patchSchema }).strict();
const reviewRequestSchema = z.object({
  line: z.string().min(1).max(500),
  handle: z.string().min(1).max(300).nullable(),
}).strict();

function readJson<T>(file: string, fallback: T): T {
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) as T : fallback;
}

function atomicJson(file: string, value: unknown): void {
  const temporary = `${file}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  renameSync(temporary, file);
}

function baseProducts(): Product[] {
  return readdirSync(PRODUCTS)
    .filter((file) => file.endsWith(".json"))
    .map((file) => JSON.parse(readFileSync(join(PRODUCTS, file), "utf8")) as Product);
}

function readProducts(): (Product & { imageUrl?: string; override?: Omit<Override, "values"> })[] {
  const overrides = readJson<Record<string, Override>>(OVERRIDES, {});
  return baseProducts()
    .map((product) => {
      const override = overrides[product.sku];
      const values = override?.values ?? {};
      const merged = {
        ...product,
        ...(values.status !== undefined ? { status: values.status } : {}),
        ...(values.mrp !== undefined ? { mrp: values.mrp } : {}),
        ...(values.selling_price !== undefined ? { sellingPrice: values.selling_price } : {}),
        ...(values.availability !== undefined ? { availability: values.availability } : {}),
        ...(values.stock_count !== undefined ? { stockCount: values.stock_count } : {}),
        ...(values.badges !== undefined
          ? { badges: String(values.badges).split("|").filter(Boolean) }
          : {}),
      } as Product;
      return {
        ...merged,
        ...(merged.images?.[0]?.src
          ? { imageUrl: `/image?src=${encodeURIComponent(merged.images[0].src)}` }
          : {}),
        ...(override ? { override: { updatedAt: override.updatedAt, updatedBy: override.updatedBy } } : {}),
      };
    })
    .sort((left, right) => left.title.localeCompare(right.title));
}

function writeOverride(sku: string, patch: z.infer<typeof patchSchema>): Product {
  const product = baseProducts().find((candidate) => candidate.sku === sku);
  if (!product) throw new Error(`unknown SKU ${sku}`);
  const current = readJson<Record<string, Override>>(OVERRIDES, {});
  const values = { ...(current[sku]?.values ?? {}) };
  const key: Record<keyof z.infer<typeof patchSchema>, string> = {
    mrp: "mrp",
    sellingPrice: "selling_price",
    stockCount: "stock_count",
    availability: "availability",
    status: "status",
    badges: "badges",
  };
  for (const [field, value] of Object.entries(patch) as [keyof typeof key, unknown][]) {
    if (value === null) delete values[key[field]];
    else if (Array.isArray(value)) values[key[field]] = value.join("|");
    else if (value !== undefined) values[key[field]] = value as string | number;
  }
  const mrp = Number(values.mrp ?? product.mrp);
  const selling = Number(values.selling_price ?? product.sellingPrice);
  if (Number.isFinite(mrp) && Number.isFinite(selling) && selling > mrp) {
    throw new Error("selling price cannot exceed MRP");
  }
  // Availability follows stock: 0 means out of stock, anything else (or
  // empty) means available. scripts/import-products.mts applies the rule.
  const stock = values.stock_count;
  if (stock !== undefined && (!Number.isInteger(Number(stock)) || Number(stock) < 0)) {
    throw new Error("stock must be a whole number, 0 or more");
  }
  current[sku] = {
    values,
    updatedAt: new Date().toISOString(),
    updatedBy: ACTOR,
  };
  atomicJson(OVERRIDES, current);
  return readProducts().find((candidate) => candidate.sku === sku)!;
}

function readReview() {
  if (!existsSync(REPORT)) return [];
  const decisions = readJson<Record<string, StoredDecision | string | null>>(DECISIONS, {});
  return readFileSync(REPORT, "utf8")
    .trim()
    .split("\n")
    .map((raw) => ({ raw, columns: raw.split("\t") }))
    .filter(({ columns: [verdict] }) => verdict === "WEAK")
    .map(({ raw, columns: [, score, line, title, price, sku, image, handle, reason, margin, candidates] }) => {
      const fingerprint = createHash("sha256").update(raw).digest("hex");
      const stored = decisions[line];
      const current = stored !== null && typeof stored === "object" &&
        stored.fingerprint === fingerprint
        ? stored
        : undefined;
      return {
        line,
        score,
        title,
        price,
        sku,
        image,
        handle,
        reason,
        margin,
        fingerprint,
        candidates: candidates ? JSON.parse(candidates) : [],
        decision: current ? (current.handle === null ? "rejected" : current.handle) : "pending",
      };
    });
}

function writeDecision(line: string, handle: string | null): void {
  const review = readReview().find((row) => row.line === line);
  if (!review) throw new Error("stock line is not in the current review queue");
  if (handle !== null) {
    const validHandles = new Set(
      (readJson<{ handle: string }[]>(CATALOGUE, [])).map((product) => product.handle),
    );
    if (!validHandles.has(handle)) throw new Error("selected Voltas handle does not exist");
  }
  const decisions = readJson<Record<string, StoredDecision | string | null>>(DECISIONS, {});
  decisions[line] = { handle, fingerprint: review.fingerprint };
  atomicJson(DECISIONS, decisions);
}

let taskRunning = false;
function runSteps(
  steps: [string, string[]][],
  write: (message: object) => void,
  done: () => void,
): void {
  if (taskRunning) throw new Error("another catalogue task is already running");
  taskRunning = true;
  let index = 0;
  const finish = (ok: boolean) => {
    taskRunning = false;
    write({ done: true, ok });
    done();
  };
  const next = () => {
    if (index >= steps.length) return finish(true);
    const [label, args] = steps[index++];
    write({ step: label });
    const child = spawn("node", ["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", ...args], {
      cwd: process.cwd(),
      env: process.env,
    });
    child.stdout.on("data", (chunk: Buffer) => String(chunk).split("\n").filter(Boolean).forEach((log) => write({ log })));
    child.stderr.on("data", (chunk: Buffer) => String(chunk).split("\n").filter(Boolean).forEach((log) => write({ log })));
    child.on("close", (code) => {
      if (code !== 0) {
        write({ error: `${label} failed (exit ${code})` });
        finish(false);
      } else next();
    });
    child.on("error", (error) => {
      write({ error: `${label} failed: ${error.message}` });
      finish(false);
    });
  };
  next();
}

async function body(req: IncomingMessage): Promise<unknown> {
  if (!req.headers["content-type"]?.startsWith("application/json")) {
    throw new Error("content-type must be application/json");
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = chunk as Buffer;
    size += buffer.length;
    if (size > BODY_LIMIT) throw new Error("request body is too large");
    chunks.push(buffer);
  }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
}

function authorised(req: IncomingMessage): boolean {
  return req.headers["x-galvio-admin"] === TOKEN;
}

function safePost(req: IncomingMessage): boolean {
  return (req.method !== "POST" && req.method !== "PATCH") || ORIGINS.has(String(req.headers.origin ?? ""));
}

function sendJson(res: ServerResponse, payload: unknown, status = 200): void {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  res.end(JSON.stringify(payload));
}

function sendImage(src: string, res: ServerResponse): void {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(src)) throw new Error("invalid image key");
  const manifest = readJson<Record<string, { widths: number[] }>>(IMAGE_MANIFEST, {});
  const width = manifest[src]?.widths.at(-1);
  if (!width) throw new Error("image is not in the generated manifest");
  const file = join(PUBLIC_IMAGES, `${src}-${width}.webp`);
  if (!file.startsWith(`${PUBLIC_IMAGES}/`) || !existsSync(file)) throw new Error("image file is missing");
  res.writeHead(200, { "content-type": "image/webp", "cache-control": "private, max-age=300" });
  res.end(readFileSync(file));
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
  try {
    if (url.pathname === "/") {
      const nonce = randomBytes(18).toString("base64");
      res.writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "content-security-policy": `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; img-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
        "x-frame-options": "DENY",
        "x-content-type-options": "nosniff",
      });
      res.end(PAGE.replace("__NONCE__", nonce));
      return;
    }
    // These are already public catalogue images; keeping this read-only route
    // outside token auth lets <img> load without putting the token in a URL.
    if (url.pathname === "/image" && req.method === "GET") return sendImage(url.searchParams.get("src") ?? "", res);
    if (!authorised(req)) return sendJson(res, { error: "unauthorised" }, 401);
    if (!safePost(req)) return sendJson(res, { error: "origin not allowed" }, 403);
    const orderPath = url.pathname.match(/^\/api\/(orders(?:\/GLV-\d{6}-[A-Z0-9]{5})?)$/)?.[1];
    if (orderPath && (req.method === "GET" || req.method === "PATCH")) {
      return proxyOrders(req, res, orderPath, url.search);
    }
    if (url.pathname === "/api/products" && req.method === "GET") return sendJson(res, readProducts());
    if (url.pathname === "/api/review" && req.method === "GET") return sendJson(res, readReview());
    if (url.pathname === "/api/product" && req.method === "POST") {
      const input = productRequestSchema.parse(await body(req));
      return sendJson(res, writeOverride(input.sku, input.patch));
    }
    if (url.pathname === "/api/review" && req.method === "POST") {
      const input = reviewRequestSchema.parse(await body(req));
      writeDecision(input.line, input.handle);
      return sendJson(res, { ok: true });
    }
    if ((url.pathname === "/api/sync" || url.pathname === "/api/apply") && req.method === "POST") {
      res.writeHead(200, {
        "content-type": "application/x-ndjson; charset=utf-8",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      });
      const emit = (message: object) => res.write(`${JSON.stringify(message)}\n`);
      const steps: [string, string[]][] = url.pathname === "/api/sync"
        ? [
            ["Fetch manufacturer snapshot", ["scripts/fetch-voltas.mts"]],
            ["Rebuild safe match report", ["scripts/match-voltas.mts", "--csv", "data/sources/voltas-match-report.tsv"]],
            ["Stage reviewed supplier batch", ["scripts/bridge-voltas.mts"]],
            ["Validate staged batch", ["scripts/import-products.mts", "--check", "data/sources/voltas-products.csv"]],
          ]
        : [
            ["Download changed official images", ["scripts/sync-images.mts"]],
            ["Compose validation preview", ["scripts/compose-products.mts", "--out", `/tmp/galvio-admin-products-${process.pid}.csv`]],
            ["Validate catalogue", ["scripts/import-products.mts", "--check", `/tmp/galvio-admin-products-${process.pid}.csv`]],
            ["Compose approved catalogue", ["scripts/compose-products.mts"]],
            ["Apply validated catalogue", ["scripts/import-products.mts", "--replace", "data/products.csv"]],
            ["Build responsive images", ["scripts/build-images.mts"]],
            ["Rebuild search index", ["scripts/build-search-index.mts"]],
          ];
      runSteps(steps, emit, () => res.end());
      return;
    }
    sendJson(res, { error: "not found" }, 404);
  } catch (error) {
    const message = error instanceof z.ZodError
      ? error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")
      : error instanceof Error ? error.message : String(error);
    if (!res.headersSent) sendJson(res, { error: message }, 400);
    else res.end(`${JSON.stringify({ error: message, done: true, ok: false })}\n`);
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Galvio inventory console -> http://127.0.0.1:${PORT}/#${TOKEN}`);
  console.log(`Signed actions as ${ACTOR}. Loopback only; stop with Ctrl-C.`);
});

const PAGE = String.raw`<!doctype html><html lang="en-IN"><head><meta charset="utf-8"><title>Galvio Admin</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>.badges{display:flex;flex-wrap:wrap;gap:4px;min-width:180px}.badges button{font:inherit;font-size:11px;padding:3px 8px;border-radius:999px;border:1px solid #d3d5da;background:#fff;cursor:pointer}.badges button[aria-pressed=true]{background:#2563eb;border-color:#2563eb;color:#fff}
:root{--ink:#0b0e14;--line:#e3e5e8;--muted:#667085;--blue:#1859e6;--bg:#f5f6f8}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:#101318;font:14px/1.45 system-ui,sans-serif}header{position:sticky;top:0;z-index:20;height:60px;display:flex;align-items:center;gap:12px;padding:0 22px;background:var(--ink);color:white}header b{letter-spacing:.16em}header span{color:#aab0bd}header .grow{flex:1}button,input,select{font:inherit}button{cursor:pointer;border:1px solid var(--line);border-radius:8px;background:white;padding:7px 11px}button.primary{background:var(--blue);border-color:var(--blue);color:white}button.dark{background:#222733;border-color:#454c5b;color:white}button:disabled{cursor:not-allowed;opacity:.5}main{max-width:1500px;margin:auto;padding:22px}.tabs,.bar,.inventory-tools{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:16px}.tabs button[aria-selected=true]{background:var(--ink);color:white;border-color:var(--ink)}.muted{color:var(--muted)}.table-wrap{overflow:visible}table{width:100%;border-collapse:collapse;background:white;border:1px solid var(--line)}th,td{padding:9px 10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:middle}th{position:sticky;top:158px;z-index:3;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);background:#fafafa}td{font-size:13px}img{width:42px;height:42px;object-fit:contain;background:var(--bg);border-radius:6px}input,select{max-width:125px;width:100%;padding:5px 7px;border:1px solid var(--line);border-radius:6px}.inventory-tools{position:sticky;top:108px;z-index:4;margin:0;padding:10px 0 12px;background:var(--bg)}.tabs{position:sticky;top:60px;z-index:5;background:var(--bg);padding:8px 0}.orders{display:grid;gap:10px}.order{background:white;border:1px solid var(--line);border-radius:12px;overflow:hidden}.order summary{display:grid;grid-template-columns:150px 1fr 150px 130px 150px;gap:12px;align-items:center;padding:12px 14px;cursor:pointer;list-style:none}.order summary::-webkit-details-marker{display:none}.order[open] summary{background:#f7f9fc;border-bottom:1px solid var(--line)}.order .body{display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:18px;padding:14px}.order h4{margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}.order .items div{display:flex;gap:8px;align-items:center;margin-bottom:6px}.order input{max-width:none}.actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.st{display:inline-block;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;background:#eef1f5}.st-placed{background:#dbeafe;color:#1e40af}.st-confirmed,.st-packed{background:#e0e7ff;color:#3730a3}.st-shipped,.st-out_for_delivery{background:#ede9fe;color:#5b21b6}.st-delivered{background:#dcfce7;color:#166534}.st-cancelled{background:#f3f4f6;color:#6b7280}.st-pending_payment{background:#fff3cd;color:#7a5100}.noimg{display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:6px;background:var(--bg);color:var(--muted);font-size:9px;text-align:center}@media(max-width:850px){.order summary{grid-template-columns:1fr 1fr}.order .body{grid-template-columns:1fr}}.inventory-tools input{max-width:320px}.inventory-tools select{max-width:180px}.inventory-tools .grow{flex:1}.pill{display:inline-block;padding:2px 7px;border-radius:20px;background:#eef1f5;font-size:11px}.ok{background:#dcfce7;color:#166534}.warn{background:#fff3cd;color:#7a5100}#log{margin-top:14px;max-height:300px;overflow:auto;white-space:pre-wrap;border-radius:10px;background:var(--ink);color:#d6d9df;padding:14px;font:12px/1.6 ui-monospace,monospace}#auth{max-width:520px;margin:80px auto;padding:28px;background:white;border:1px solid var(--line);border-radius:14px}dialog{border:0;border-radius:12px;padding:0;box-shadow:0 20px 70px #0005}dialog form{padding:22px}dialog input{max-width:none;margin-top:8px}@media(max-width:850px){main{padding:12px}.table-wrap{overflow-x:auto}header{flex-wrap:wrap}}
</style></head><body><header><b>GALVIO</b><span>Admin console · orders &amp; catalogue</span><span class="grow"></span><button id="sync" class="dark">Stage Voltas refresh</button><button id="apply" class="primary">Apply reviewed changes</button></header><div id="auth" hidden><h1>Admin token required</h1><p class="muted">Open the complete URL printed by <code>pnpm admin</code>, or paste its token below.</p><input id="tokenInput" autocomplete="off"><button id="unlock" class="primary">Unlock</button></div><main id="app" hidden><div class="tabs"><button data-tab="orders" aria-selected="true">Orders</button><button data-tab="inventory" aria-selected="false">Inventory</button><button data-tab="review" aria-selected="false">Review queue</button></div><div id="summary" class="bar muted"></div><section id="orders"></section><section id="inventory" class="table-wrap" hidden></section><section id="review" class="table-wrap" hidden></section><pre id="log" hidden></pre></main><script nonce="__NONCE__">
const BADGES=${JSON.stringify(BADGES)};const BADGE_ORDER=${JSON.stringify(BADGE_IDS)};const state={products:[],review:[],token:"",tab:"orders",orders:[],orderCounts:{},orderFilter:"",orderQuery:"",inventoryQuery:"",inventoryCategory:"All categories",inventoryStatus:"All statuses"};const $=id=>document.getElementById(id);const text=(tag,value,cls)=>{const node=document.createElement(tag);node.textContent=value;if(cls)node.className=cls;return node};
function setToken(value){state.token=value;sessionStorage.setItem("galvio-admin",value);history.replaceState(null,"",location.pathname);showAuth()}
function showAuth(){const ready=Boolean(state.token);$("auth").hidden=ready;$("app").hidden=!ready;if(ready)load()}
async function api(path,options={}){const response=await fetch(path,{...options,headers:{...(options.headers||{}),"x-galvio-admin":state.token}});if(!response.ok){const payload=await response.json().catch(()=>({error:response.statusText}));throw new Error(payload.error||response.statusText)}return response}
function cell(row,node){const td=document.createElement("td");if(node)td.append(node);row.append(td);return td}function input(value,type,onchange){const node=document.createElement("input");node.type=type;node.value=value??"";node.addEventListener("change",()=>onchange(node.value));return node}function select(value,values,onchange){const node=document.createElement("select");for(const item of values){const option=text("option",item);option.value=item;option.selected=item===value;node.append(option)}node.addEventListener("change",()=>onchange(node.value));return node}
async function save(product,patch){try{await api("/api/product",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({sku:product.sku,patch})});await load()}catch(error){alert(error.message)}}
function badgeToggles(p){const box=document.createElement("div");box.className="badges";const current=new Set(p.badges||[]);for(const [id,meta] of Object.entries(BADGES)){const b=document.createElement("button");b.type="button";b.textContent=meta.label;b.setAttribute("aria-pressed",String(current.has(id)));b.addEventListener("click",()=>{current.has(id)?current.delete(id):current.add(id);save(p,{badges:current.size?BADGE_ORDER.filter(x=>current.has(x)):null})});box.append(b)}return box}function renderInventory(){const wrap=$("inventory");wrap.replaceChildren();const tools=document.createElement("div");tools.className="inventory-tools";const query=document.createElement("input");query.type="search";query.placeholder="Search title, model, SKU, capacity…";query.setAttribute("aria-label","Search inventory");query.value=state.inventoryQuery;const categories=["All categories",...new Set(state.products.map(p=>p.category).filter(Boolean))].sort((a,b)=>a==="All categories"?-1:b==="All categories"?1:a.localeCompare(b));const category=select(state.inventoryCategory,categories,value=>{state.inventoryCategory=value;applyFilters()});category.setAttribute("aria-label","Filter by category");const statuses=["All statuses","active","draft","discontinued","spare","not-listed"];const status=select(state.inventoryStatus,statuses,value=>{state.inventoryStatus=value;applyFilters()});status.setAttribute("aria-label","Filter by status");const count=text("span","","muted grow");tools.append(query,category,status,count);wrap.append(tools);const table=document.createElement("table");const head=document.createElement("thead"),hr=document.createElement("tr");["","Product","Category","MRP","Selling","Stock (0 = out of stock)","Status","Badges","Last edited"].forEach(label=>hr.append(text("th",label)));head.append(hr);table.append(head);const body=document.createElement("tbody"),rows=[];for(const p of state.products){const row=document.createElement("tr");const image=document.createElement("img");if(p.imageUrl)image.src=p.imageUrl;image.alt="";cell(row,p.imageUrl?image:text("span","No photo","noimg"));const detail=document.createElement("div"),meta=p.sku+(p.model?" · model "+p.model:"")+(p.missing?.length?" · missing: "+p.missing.join(", "):"");detail.append(text("b",p.title),document.createElement("br"),text("span",meta,"muted"));cell(row,detail);cell(row,text("span",p.category||""));cell(row,input(p.mrp,"number",value=>save(p,{mrp:value?Number(value):null})));cell(row,input(p.sellingPrice,"number",value=>save(p,{sellingPrice:value?Number(value):null})));{const stock=input(p.stockCount,"number",value=>save(p,{stockCount:value===""?null:Number(value)}));stock.min="0";stock.placeholder="Available";stock.title="Leave empty when available. Enter 0 to show Out of stock.";const wrap=document.createElement("div");wrap.append(stock);if(p.stockCount===0)wrap.append(document.createElement("br"),text("span","Out of stock","pill warn"));cell(row,wrap)}cell(row,select(p.status,["draft","active","discontinued","spare","not-listed"],value=>save(p,{status:value})));cell(row,badgeToggles(p));cell(row,text("span",p.override?new Date(p.override.updatedAt).toLocaleString()+" · "+p.override.updatedBy:"—","muted"));body.append(row);rows.push({row,p})}table.append(body);wrap.append(table);function applyFilters(){state.inventoryQuery=query.value;const needle=state.inventoryQuery.trim().toLowerCase();let visible=0;for(const item of rows){const haystack=[item.p.title,item.p.model,item.p.sku,item.p.category,item.p.subCategory,item.p.capacity,(item.p.badges||[]).join(" ")].filter(Boolean).join(" ").toLowerCase();const show=(!needle||needle.split(/\s+/).every(w=>haystack.includes(w)))&&(state.inventoryCategory==="All categories"||item.p.category===state.inventoryCategory)&&(state.inventoryStatus==="All statuses"||item.p.status===state.inventoryStatus);item.row.hidden=!show;if(show)visible++}count.textContent=visible+" of "+state.products.length+" records"}query.addEventListener("input",applyFilters);applyFilters()}
async function decide(item,handle){try{await api("/api/review",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({line:item.line,handle})});await load()}catch(error){alert(error.message)}}
function renderReview(){const wrap=$("review");wrap.replaceChildren();if(!state.review.length){wrap.append(text("p","No weak suggestions await review.","muted"));return}const table=document.createElement("table"),head=document.createElement("thead"),hr=document.createElement("tr");["Stock line","Candidate","Evidence","Decision",""].forEach(label=>cell(hr,text("b",label)));head.append(hr);table.append(head);const body=document.createElement("tbody");for(const item of state.review){const row=document.createElement("tr");cell(row,text("b",item.line));const choices=item.candidates?.length?item.candidates:[{handle:item.handle,title:item.title,score:item.score}];const chooser=select(item.decision!=="pending"&&item.decision!=="rejected"?item.decision:item.handle,choices.map(c=>c.handle),()=>{});for(let i=0;i<choices.length;i++)chooser.options[i].textContent=choices[i].title+" ("+choices[i].score+")";cell(row,chooser);cell(row,text("span",item.reason+" · margin "+item.margin,"muted"));cell(row,text("span",item.decision,item.decision==="pending"?"pill warn":"pill ok"));const actions=document.createElement("div"),accept=text("button","Use selected","primary"),reject=text("button","Not a match");accept.addEventListener("click",()=>decide(item,chooser.value));reject.addEventListener("click",()=>decide(item,null));actions.append(accept," ",reject);cell(row,actions);body.append(row)}table.append(body);wrap.append(table)}
function render(){const active=state.products.filter(p=>p.status==="active").length,draft=state.products.filter(p=>p.status==="draft").length,pending=state.review.filter(r=>r.decision==="pending").length;$("summary").textContent=state.products.length+" catalogue records · "+active+" active · "+draft+" draft · "+pending+" stock lines awaiting match review";renderInventory();renderReview()}
async function load(){try{const [products,review]=await Promise.all([api("/api/products").then(r=>r.json()),api("/api/review").then(r=>r.json())]);state.products=products;state.review=review;render();loadOrders()}catch(error){if(/unauthorised/i.test(error.message)){state.token="";sessionStorage.removeItem("galvio-admin");showAuth()}else alert(error.message)}}
async function task(path){const log=$("log");log.hidden=false;log.textContent="";$("sync").disabled=$("apply").disabled=true;try{const response=await api(path,{method:"POST",headers:{"content-type":"application/json"},body:"{}"});const reader=response.body.getReader(),decoder=new TextDecoder();let buffer="",success=false;for(;;){const result=await reader.read();if(result.done)break;buffer+=decoder.decode(result.value,{stream:true});const lines=buffer.split("\n");buffer=lines.pop();for(const line of lines){if(!line)continue;const message=JSON.parse(line);if(message.step)log.textContent+="\n▸ "+message.step+"\n";if(message.log)log.textContent+="  "+message.log+"\n";if(message.error)log.textContent+="  ✗ "+message.error+"\n";if(message.done){success=message.ok;log.textContent+="\n"+(message.ok?"Completed. Changes are local until you build and deploy.":"Stopped without reporting success.")+"\n"}log.scrollTop=log.scrollHeight}}if(success)await load()}catch(error){log.textContent+="\n✗ "+error.message+"\n"}finally{$("sync").disabled=$("apply").disabled=false}}
for(const button of document.querySelectorAll("[data-tab]")){button.addEventListener("click",()=>{state.tab=button.dataset.tab;for(const other of document.querySelectorAll("[data-tab]"))other.setAttribute("aria-selected",String(other===button));$("inventory").hidden=state.tab!=="inventory";$("review").hidden=state.tab!=="review";$("orders").hidden=state.tab!=="orders";if(state.tab==="orders")loadOrders()})}$("unlock").addEventListener("click",()=>setToken($("tokenInput").value.trim()));$("sync").addEventListener("click",()=>task("/api/sync"));$("apply").addEventListener("click",()=>{if(confirm("Apply reviewed matches and inventory overrides to the local catalogue? This does not deploy the website."))task("/api/apply")});const fragment=location.hash.slice(1);state.token=fragment||sessionStorage.getItem("galvio-admin")||"";showAuth();

const NEXT_LABEL={confirmed:"Confirm",packed:"Packed",shipped:"Shipped",out_for_delivery:"Out for delivery",delivered:"Delivered",cancelled:"Cancel order"};
const STATUS_TEXT={pending_payment:"Awaiting payment",placed:"New order",confirmed:"Confirmed",packed:"Packed",shipped:"Shipped",out_for_delivery:"Out for delivery",delivered:"Delivered",cancelled:"Cancelled"};
const PAY_TEXT={cod_due:"COD · to collect",pending:"Payment pending",paid:"Paid",failed:"Payment failed",refunded:"Refunded"};
const rupees=n=>"₹"+Number(n).toLocaleString("en-IN");
const when=iso=>new Date(iso).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"numeric",minute:"2-digit"});
let orderTimer;
async function loadOrders(){const box=$("orders");try{const params=new URLSearchParams();if(state.orderFilter)params.set("status",state.orderFilter);if(state.orderQuery)params.set("q",state.orderQuery);const data=await api("/api/orders?"+params).then(r=>r.json());state.orders=data.orders;state.orderCounts=data.counts||{};renderOrders()}catch(error){box.replaceChildren(ordersTools(),text("p",error.message,"pill warn"))}}
function ordersTools(){const tools=document.createElement("div");tools.className="inventory-tools";const q=document.createElement("input");q.type="search";q.placeholder="Search order ID, email or phone";q.value=state.orderQuery;q.addEventListener("input",()=>{state.orderQuery=q.value.trim();clearTimeout(orderTimer);orderTimer=setTimeout(loadOrders,300)});const c=state.orderCounts;const filters=[["","Active"],["placed","New ("+(c.placed||0)+")"],["confirmed","Confirmed ("+(c.confirmed||0)+")"],["packed","Packed ("+(c.packed||0)+")"],["shipped","Shipped ("+(c.shipped||0)+")"],["out_for_delivery","Out for delivery ("+(c.out_for_delivery||0)+")"],["delivered","Delivered ("+(c.delivered||0)+")"],["cancelled","Cancelled ("+(c.cancelled||0)+")"]];const sel=select(state.orderFilter,filters.map(f=>f[0]),v=>{state.orderFilter=v;loadOrders()});[...sel.options].forEach((o,i)=>o.textContent=filters[i][1]);const refresh=text("button","Refresh");refresh.addEventListener("click",loadOrders);tools.append(q,sel,refresh,text("span",state.orders.length+" orders","muted grow"));return tools}
function renderOrders(){const box=$("orders");box.replaceChildren(ordersTools());const list=document.createElement("div");list.className="orders";if(!state.orders.length)list.append(text("p","No orders here yet. New orders appear as soon as a customer places them.","muted"));for(const o of state.orders){const d=document.createElement("details");d.className="order";const s=document.createElement("summary");const id=document.createElement("div");id.append(text("b",o.id),document.createElement("br"),text("span",when(o.createdAt),"muted"));const who=document.createElement("div");who.append(text("b",o.customer+" · "+o.city),document.createElement("br"),text("span",o.title+(o.itemCount>1?" + "+(o.itemCount-1)+" more":""),"muted"));const money=document.createElement("div");money.append(text("b",rupees(o.total)),document.createElement("br"),text("span",PAY_TEXT[o.paymentStatus]||o.paymentStatus,"muted"));const st=text("span",STATUS_TEXT[o.status]||o.status,"st st-"+o.status);const phone=document.createElement("a");phone.href="tel:+91"+o.phone;phone.textContent="+91 "+o.phone;phone.addEventListener("click",e=>e.stopPropagation());s.append(id,who,money,st,phone);d.append(s);const body=document.createElement("div");body.className="body";body.append(text("span","Loading…","muted"));d.append(body);d.addEventListener("toggle",()=>{if(d.open)loadOrderDetail(o.id,body)});list.append(d)}box.append(list)}
async function loadOrderDetail(id,body){try{const data=await api("/api/orders/"+id).then(r=>r.json());renderOrderDetail(data,body)}catch(error){body.replaceChildren(text("span",error.message,"pill warn"))}}
function renderOrderDetail(data,body){const o=data.order,a=o.address;body.replaceChildren();const items=document.createElement("div");items.className="items";items.append(text("h4","Items"));for(const i of o.items){const row=document.createElement("div");const img=document.createElement("img");img.src="/image?src="+encodeURIComponent(i.image);img.alt="";img.onerror=()=>img.replaceWith(text("span","No photo","noimg"));row.append(img,text("span",i.qty+" × "+i.title+" — "+rupees(i.unitPrice*i.qty)));items.append(row)}items.append(text("b","Total "+rupees(o.total)+(o.couponCode?" (coupon "+o.couponCode+")":"")));const cust=document.createElement("div");cust.append(text("h4","Deliver to"),text("b",a.name),document.createElement("br"),text("span",a.line1+(a.line2?", "+a.line2:"")+(a.landmark?", near "+a.landmark:"")),document.createElement("br"),text("span",a.city+", "+a.state+" - "+a.pincode),document.createElement("br"),text("span","+91 "+o.phone+" · "+o.email,"muted"),document.createElement("br"),text("span",(o.paymentMethod==="cod"?"Cash on Delivery":"Paid online"+(o.paymentRef?" · Txn "+o.paymentRef:""))+" · "+(PAY_TEXT[o.paymentStatus]||o.paymentStatus),"muted"));if(o.exchange){const x=o.exchange;cust.append(document.createElement("br"),text("b","Exchange: "),text("span",[x.appliance,x.brand,x.ageYears!==undefined?x.ageYears+" yrs":"",x.working===false?"not working":"working",x.notes].filter(Boolean).join(" · ")))}const act=document.createElement("div");act.append(text("h4","Update order"));const courier=input(o.courier,"text",()=>{});courier.placeholder="Courier (e.g. Delhivery)";const track=input(o.trackingNumber,"text",()=>{});track.placeholder="Tracking number";const note=input("","text",()=>{});note.placeholder="Note for the history (internal)";act.append(courier,track,note);const buttons=document.createElement("div");buttons.className="actions";for(const next of data.nextStatuses){const b=text("button",NEXT_LABEL[next]||next,next==="cancelled"?"":"primary");b.addEventListener("click",async()=>{if(next==="cancelled"&&!confirm("Cancel order "+o.id+"? The customer is emailed."))return;await patchOrder(o.id,{status:next,note:note.value,courier:courier.value,trackingNumber:track.value},body)});buttons.append(b)}if(o.paymentStatus==="cod_due"){const b=text("button","Cash collected");b.addEventListener("click",()=>patchOrder(o.id,{paymentStatus:"paid"},body));buttons.append(b)}if(o.paymentStatus==="paid"&&o.status==="cancelled"){const b=text("button","Mark refunded");b.addEventListener("click",()=>patchOrder(o.id,{paymentStatus:"refunded"},body));buttons.append(b)}const save=text("button","Save courier details");save.addEventListener("click",()=>patchOrder(o.id,{courier:courier.value,trackingNumber:track.value},body));buttons.append(save);act.append(buttons);const hist=document.createElement("div");hist.append(text("h4","History"));for(const e of o.events)hist.append(text("div",when(e.at)+" · "+(STATUS_TEXT[e.status]||e.status)+(e.note?" · "+e.note:""),"muted"));act.append(hist);body.append(items,cust,act)}
async function patchOrder(id,patch,body){try{const data=await api("/api/orders/"+id,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify(patch)}).then(r=>r.json());renderOrderDetail(data,body);const row=state.orders.find(x=>x.id===id);if(row){row.status=data.order.status;row.paymentStatus=data.order.paymentStatus}const summary=body.parentElement.querySelector(".st");if(summary){summary.className="st st-"+data.order.status;summary.textContent=STATUS_TEXT[data.order.status]}}catch(error){alert(error.message)}}
</script></body></html>`;

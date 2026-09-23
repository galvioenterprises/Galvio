/**
 * Local inventory console.
 *
 *   pnpm admin      ->  http://127.0.0.1:4100
 *
 * This is a local tool, not part of the site. It binds to the loopback
 * address only, so it is reachable from this machine and nowhere else —
 * which is the only honest way to "protect" an admin surface on a project
 * that deploys as static files with no server behind them.
 *
 * It reads and writes the repository directly: edits land in
 * data/products/*.json and data/sources/voltas-decisions.json, which are
 * version-controlled, so every price change is a reviewable diff with an
 * author and a date. A deployed version of this would need a Cloudflare
 * Worker for the writes and Cloudflare Access for the login.
 */

import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const PORT = 4100;
const PRODUCTS = resolve("data/products");
const DECISIONS = resolve("data/sources/voltas-decisions.json");
const REPORT = resolve("data/sources/voltas-match-report.tsv");

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

const readProducts = (): Product[] =>
  readdirSync(PRODUCTS)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(PRODUCTS, f), "utf8")) as Product)
    .sort((a, b) => a.title.localeCompare(b.title));

function writeProduct(slug: string, patch: Partial<Product>) {
  const file = join(PRODUCTS, `${slug}.json`);
  const product = JSON.parse(readFileSync(file, "utf8")) as Product;

  for (const [k, v] of Object.entries(patch)) {
    if (v === "" || v === null) delete product[k];
    else product[k] = v;
  }
  writeFileSync(file, JSON.stringify(product, null, 2) + "\n");
  return product;
}

function readReview() {
  if (!existsSync(REPORT)) return [];
  const decisions: Record<string, string | null> = existsSync(DECISIONS)
    ? JSON.parse(readFileSync(DECISIONS, "utf8"))
    : {};

  return readFileSync(REPORT, "utf8")
    .trim()
    .split("\n")
    .map((l) => l.split("\t"))
    .filter(([verdict]) => verdict === "WEAK")
    .map(([, score, line, title, price, sku, image, handle]) => ({
      line,
      score,
      title,
      price,
      sku,
      image,
      handle,
      decision: line in decisions ? (decisions[line] === null ? "rejected" : "accepted") : "pending",
    }));
}

/** Runs the sync scripts in order, streaming progress as newline JSON so
 *  the page can show what is happening rather than a spinner. */
function runSync(write: (line: string) => void, done: () => void) {
  const steps: [string, string[]][] = [
    ["Fetching the Voltas catalogue", ["scripts/fetch-voltas.mts"]],
    ["Matching against the stock list", ["scripts/match-voltas.mts", "--csv", "data/sources/voltas-match-report.tsv"]],
    ["Building product rows", ["scripts/bridge-voltas.mts"]],
    ["Downloading new photography", ["scripts/sync-images.mts"]],
    ["Processing images", ["scripts/build-images.mts"]],
    ["Importing", ["scripts/import-products.mts", "data/products.csv"]],
  ];

  let i = 0;
  const next = () => {
    if (i >= steps.length) {
      write(JSON.stringify({ done: true }));
      done();
      return;
    }
    const [label, args] = steps[i++];
    write(JSON.stringify({ step: label }));

    const child = spawn("node", ["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", ...args], {
      cwd: process.cwd(),
    });
    child.stdout.on("data", (d: Buffer) =>
      String(d)
        .split("\n")
        .filter(Boolean)
        .forEach((l) => write(JSON.stringify({ log: l }))),
    );
    child.stderr.on("data", (d: Buffer) => write(JSON.stringify({ log: String(d).trim() })));
    child.on("close", (code) => {
      if (code !== 0) {
        write(JSON.stringify({ error: `${label} failed (exit ${code})` }));
        write(JSON.stringify({ done: true }));
        done();
        return;
      }
      next();
    });
  };
  next();
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
  const json = (body: unknown, status = 200) => {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
  };

  const body = async (): Promise<Record<string, unknown>> => {
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    return chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
  };

  try {
    if (url.pathname === "/") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(PAGE);
      return;
    }
    if (url.pathname === "/api/products") return json(readProducts());
    if (url.pathname === "/api/review") return json(readReview());

    if (url.pathname === "/api/product" && req.method === "POST") {
      const { slug, patch } = (await body()) as { slug: string; patch: Partial<Product> };
      return json(writeProduct(slug, patch));
    }

    if (url.pathname === "/api/review" && req.method === "POST") {
      const { line, handle } = (await body()) as { line: string; handle: string | null };
      const decisions: Record<string, string | null> = existsSync(DECISIONS)
        ? JSON.parse(readFileSync(DECISIONS, "utf8"))
        : {};
      decisions[line] = handle;
      writeFileSync(DECISIONS, JSON.stringify(decisions, null, 2) + "\n");
      return json({ ok: true });
    }

    if (url.pathname === "/api/sync" && req.method === "POST") {
      res.writeHead(200, { "content-type": "application/x-ndjson", "cache-control": "no-cache" });
      runSync((l) => res.write(l + "\n"), () => res.end());
      return;
    }

    json({ error: "not found" }, 404);
  } catch (error) {
    json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

// Loopback only. This is the protection.
server.listen(PORT, "127.0.0.1", () => {
  console.log(`Galvio inventory console  ->  http://127.0.0.1:${PORT}`);
  console.log("Local only. Stop with Ctrl-C.");
});

const PAGE = String.raw`<!doctype html>
<html lang="en-IN"><head><meta charset="utf-8"><title>Galvio — Inventory</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
:root{--ink:#0b0e14;--line:#e6e7ea;--muted:#6b7280;--accent:#2563eb;--canvas:#f4f5f6}
*{box-sizing:border-box}
body{margin:0;font:15px/1.5 system-ui,sans-serif;color:#111318;background:var(--canvas)}
header{background:var(--ink);color:#fff;padding:14px 24px;display:flex;align-items:center;gap:16px}
header b{letter-spacing:.18em;font-size:14px}
main{max-width:1500px;margin:0 auto;padding:24px}
button{font:inherit;cursor:pointer;border-radius:8px;border:1px solid var(--line);background:#fff;padding:7px 12px}
button.primary{background:var(--accent);color:#fff;border-color:var(--accent)}
button.ghost{background:transparent;color:#fff;border-color:rgba(255,255,255,.25)}
.tabs{display:flex;gap:6px;margin-bottom:18px}
.tabs button[aria-selected=true]{background:var(--ink);color:#fff;border-color:var(--ink)}
table{width:100%;border-collapse:collapse;background:#fff;border:1px solid var(--line);border-radius:12px;overflow:hidden}
th,td{padding:9px 12px;text-align:left;border-bottom:1px solid var(--line);font-size:13px;vertical-align:middle}
th{background:#fafafa;font-weight:600;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
tr:last-child td{border-bottom:0}
img{width:40px;height:40px;object-fit:contain;background:var(--canvas);border-radius:6px}
input,select{font:inherit;padding:5px 7px;border:1px solid var(--line);border-radius:6px;width:100%;max-width:120px}
.pill{display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600}
.active{background:#dcfce7;color:#166534}.draft{background:#fef3c7;color:#92400e}
.notlisted{background:#f1f5f9;color:#475569}
#log{background:var(--ink);color:#d1d5db;padding:14px;border-radius:10px;font:12px/1.6 ui-monospace,monospace;max-height:280px;overflow:auto;white-space:pre-wrap;margin-top:14px}
.muted{color:var(--muted)}
.bar{display:flex;gap:10px;align-items:center;margin-bottom:16px;flex-wrap:wrap}
</style></head><body>
<header>
  <b>GALVIO</b><span class="muted" style="color:#a3aab8">Inventory console · local only</span>
  <span style="flex:1"></span>
  <button class="ghost" onclick="sync()">Sync from Voltas</button>
</header>
<main>
  <div class="tabs">
    <button id="t-inv" aria-selected="true" onclick="show('inv')">Inventory</button>
    <button id="t-rev" aria-selected="false" onclick="show('rev')">Review queue</button>
  </div>
  <div class="bar" id="bar"></div>
  <div id="inv"></div>
  <div id="rev" hidden></div>
  <div id="log" hidden></div>
</main>
<script>
let products=[],review=[];
const money=n=>n==null?'':'₹'+Number(n).toLocaleString('en-IN');

async function load(){
  products=await (await fetch('/api/products')).json();
  review=await (await fetch('/api/review')).json();
  render();
}
function show(which){
  inv.hidden=which!=='inv'; rev.hidden=which!=='rev';
  document.getElementById('t-inv').ariaSelected=String(which==='inv');
  document.getElementById('t-rev').ariaSelected=String(which==='rev');
}
function render(){
  const a=products.filter(p=>p.status==='active').length;
  const d=products.filter(p=>p.status==='draft').length;
  bar.innerHTML='<span class="muted">'+products.length+' products · '+a+' live · '+d+' draft · '+
    review.filter(r=>r.decision==='pending').length+' awaiting review</span>';

  inv.innerHTML='<table><thead><tr><th></th><th>Product</th><th>Category</th><th>MRP</th><th>Selling</th><th>Stock</th><th>Availability</th><th>Status</th></tr></thead><tbody>'+
    products.map(p=>{
      const img=p.images&&p.images[0]?p.images[0].src:'';
      const src=img.startsWith('/')?img:'/images/products/'+img+'-400.webp';
      return '<tr>'+
      '<td>'+(img?'<img src="http://localhost:4321'+src+'" alt="">':'')+'</td>'+
      '<td><b>'+p.title+'</b><br><span class="muted">'+p.sku+(p.missing&&p.missing.length?' · missing: '+p.missing.join(', '):'')+'</span></td>'+
      '<td>'+(p.category||'')+'</td>'+
      '<td><input type="number" value="'+(p.mrp??'')+'" onchange="save(\''+p.slug+'\',{mrp:this.value?+this.value:null})"></td>'+
      '<td><input type="number" value="'+(p.sellingPrice??'')+'" onchange="save(\''+p.slug+'\',{sellingPrice:this.value?+this.value:null})"></td>'+
      '<td><input type="number" value="'+(p.stockCount??'')+'" onchange="save(\''+p.slug+'\',{stockCount:this.value?+this.value:null})"></td>'+
      '<td><select onchange="save(\''+p.slug+'\',{availability:this.value})">'+
        ['in_stock','out_of_stock','preorder','backorder'].map(v=>'<option '+(p.availability===v?'selected':'')+'>'+v+'</option>').join('')+
      '</select></td>'+
      '<td><span class="pill '+(p.status==='active'?'active':p.status==='draft'?'draft':'notlisted')+'">'+p.status+'</span></td>'+
      '</tr>';}).join('')+'</tbody></table>';

  rev.innerHTML= review.length===0 ? '<p class="muted">Nothing to review.</p>' :
    '<table><thead><tr><th>Our stock line</th><th>Suggested Voltas product</th><th>Price</th><th>Score</th><th></th></tr></thead><tbody>'+
    review.map((r,i)=>'<tr>'+
      '<td><b>'+r.line+'</b></td><td>'+(r.title||'<span class="muted">none</span>')+'</td>'+
      '<td>'+(r.price||'')+'</td><td class="muted">'+r.score+'</td>'+
      '<td style="white-space:nowrap">'+(r.decision==='pending'
        ? '<button class="primary" onclick="decide('+i+',true)">Same product</button> <button onclick="decide('+i+',false)">Not a match</button>'
        : '<span class="pill '+(r.decision==='accepted'?'active':'notlisted')+'">'+r.decision+'</span>')+
      '</td></tr>').join('')+'</tbody></table>';
}
async function save(slug,patch){
  await fetch('/api/product',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({slug,patch})});
  products=await (await fetch('/api/products')).json(); render();
}
async function decide(i,accept){
  const r=review[i];
  await fetch('/api/review',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({line:r.line,handle:accept?r.handle:null})});
  r.decision=accept?'accepted':'rejected'; render();
}
async function sync(){
  log.hidden=false; log.textContent='';
  const res=await fetch('/api/sync',{method:'POST'});
  const reader=res.body.getReader(); const dec=new TextDecoder(); let buf='';
  for(;;){
    const {value,done}=await reader.read(); if(done) break;
    buf+=dec.decode(value,{stream:true});
    const lines=buf.split('\n'); buf=lines.pop();
    for(const l of lines){ if(!l) continue;
      const m=JSON.parse(l);
      if(m.step) log.textContent+='\n▸ '+m.step+'\n';
      if(m.log) log.textContent+='  '+m.log+'\n';
      if(m.error) log.textContent+='  ✗ '+m.error+'\n';
      if(m.done) log.textContent+='\nDone. Reloading…\n';
      log.scrollTop=log.scrollHeight;
    }
  }
  load();
}
load();
</script></body></html>`;

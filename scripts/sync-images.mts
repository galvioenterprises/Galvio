/** Download and verify the manufacturer photographs staged by the bridge. */

import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, relative, resolve } from "node:path";
import sharp from "sharp";

const LIST = resolve("data/sources/voltas-images.json");
const STATE = resolve("data/sources/voltas-image-state.json");
const OUT = resolve("assets/products");
const MAX_BYTES = 15 * 1024 * 1024;

type StateEntry = { url: string; sha256: string; file: string };

function insideOutput(path: string): boolean {
  const rel = relative(OUT, path);
  return rel !== "" && !rel.startsWith("..") && !rel.startsWith("/");
}

async function main() {
  const items = JSON.parse(readFileSync(LIST, "utf8")) as {
    assetKey: string;
    urls: string[];
  }[];
  const previous: Record<string, StateEntry> = existsSync(STATE)
    ? JSON.parse(readFileSync(STATE, "utf8"))
    : {};
  const next: Record<string, StateEntry> = {};
  const failures: string[] = [];
  let downloaded = 0;
  let cached = 0;

  for (const { assetKey, urls } of items) {
    if (!/^voltas-[a-z0-9-]+$/.test(assetKey)) {
      throw new Error(`unsafe image asset key: ${assetKey}`);
    }
    const directory = join(OUT, assetKey);
    if (!insideOutput(directory)) throw new Error(`image path escaped output: ${assetKey}`);
    mkdirSync(directory, { recursive: true });

    for (const [index, url] of urls.entries()) {
      const key = `${assetKey}/${index + 1}`;
      const old = previous[key];
      const oldFile = old ? resolve(old.file) : "";
      if (old?.url === url && oldFile && insideOutput(oldFile) && existsSync(oldFile)) {
        try {
          const bytes = readFileSync(oldFile);
          const checksum = createHash("sha256").update(bytes).digest("hex");
          const metadata = await sharp(bytes).metadata();
          if (checksum === old.sha256 && metadata.width && metadata.height) {
            next[key] = old;
            cached++;
            continue;
          }
        } catch {
          // A missing, corrupt or checksum-mismatched cache entry is fetched
          // again below instead of being trusted because its filename exists.
        }
      }

      try {
        const response = await fetch(url, {
          headers: { "user-agent": "galvioenterprises.com catalogue sync" },
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const length = Number(response.headers.get("content-length") ?? 0);
        if (length > MAX_BYTES) throw new Error(`image is ${length} bytes (limit ${MAX_BYTES})`);

        const bytes = Buffer.from(await response.arrayBuffer());
        if (bytes.length > MAX_BYTES) throw new Error(`image is ${bytes.length} bytes (limit ${MAX_BYTES})`);
        const metadata = await sharp(bytes).metadata();
        if (!metadata.width || !metadata.height) throw new Error("image has no dimensions");
        const extension = metadata.format === "png" ? "png" : "jpg";
        const file = join(directory, `${index + 1}.${extension}`);
        const temporary = join(directory, `${index + 1}.${extension}.tmp`);
        if (!insideOutput(file) || !insideOutput(temporary)) throw new Error("unsafe output path");

        writeFileSync(temporary, bytes);
        renameSync(temporary, file);
        for (const staleExtension of ["jpg", "png"]) {
          const stale = join(directory, `${index + 1}.${staleExtension}`);
          if (stale !== file && existsSync(stale)) rmSync(stale);
        }
        next[key] = {
          url,
          sha256: createHash("sha256").update(bytes).digest("hex"),
          file: relative(process.cwd(), file),
        };
        downloaded++;
        await new Promise((done) => setTimeout(done, 250));
      } catch (error) {
        failures.push(`${assetKey} image ${index + 1}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  if (failures.length > 0) {
    failures.forEach((failure) => console.error(`  ${failure}`));
    throw new Error(`${failures.length} manufacturer image(s) failed; state was not updated`);
  }

  const temporaryState = `${STATE}.${process.pid}.tmp`;
  writeFileSync(temporaryState, `${JSON.stringify(next, null, 2)}\n`);
  renameSync(temporaryState, STATE);
  console.log(`downloaded ${downloaded}, verified cache hits ${cached}`);
}

main();

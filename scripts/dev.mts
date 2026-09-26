/**
 * `pnpm dev`: the Next dev server plus the local API Worker.
 *
 * Pages come from Next on http://localhost:3000; /api/* is proxied (see
 * next.config.ts) to `wrangler dev` on :8787, which runs worker/ against a
 * local D1 database. Without the Worker, sign-in, checkout and orders have
 * nothing to talk to.
 */

import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { existsSync, copyFileSync, mkdirSync } from "node:fs";

const run = (cmd: string, args: string[], env: Record<string, string> = {}) =>
  spawn(cmd, args, { stdio: "inherit", env: { ...process.env, ...env } });

// wrangler dev needs its assets directory to exist, even if it is empty.
mkdirSync("out", { recursive: true });
if (!existsSync(".dev.vars")) {
  copyFileSync(".dev.vars.example", ".dev.vars");
  console.log("Created .dev.vars from .dev.vars.example (development mode, simulated payments).");
}

const migrate = spawnSync("pnpm", ["exec", "wrangler", "d1", "migrations", "apply", "galvio", "--local"], {
  stdio: "inherit",
  env: { ...process.env, CI: "1" },
});
if (migrate.status !== 0) process.exit(migrate.status ?? 1);

const children: ChildProcess[] = [
  run("pnpm", ["exec", "wrangler", "dev", "--port", "8787", "--ip", "127.0.0.1"]),
  run("pnpm", ["exec", "next", "dev"], { ALLOW_SAMPLE_DATA: "1" }),
];

const stop = () => children.forEach((child) => child.kill("SIGTERM"));
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
children.forEach((child) =>
  child.on("exit", (code) => {
    stop();
    process.exit(code ?? 0);
  }),
);

// Post-build: collapse `dist/client` + `dist/server` into a single `dist/` directory.
//
// TanStack Start + the Cloudflare adapter normally emit two siblings:
//   dist/client/  — static assets (HTML, JS, CSS, fonts, images)
//   dist/server/  — Worker / SSR bundle (index.mjs + wrangler.json)
//
// For IIS / any plain static host we only need the client output, and we want
// everything sitting directly under `dist/`. This script:
//   1. Moves every file from dist/client/** up into dist/**.
//   2. Removes the now-empty dist/client folder.
//   3. Removes dist/server (worker bundle is not used on a static host).
//
// Safe to run multiple times.

import { existsSync } from "node:fs";
import { rm, mkdir, readdir, rename } from "node:fs/promises";
import { join, dirname } from "node:path";

const DIST = "dist";
const CLIENT = join(DIST, "client");
const SERVER = join(DIST, "server");

async function moveAll(srcDir, destDir) {
  const entries = await readdir(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const src = join(srcDir, entry.name);
    const dest = join(destDir, entry.name);
    if (entry.isDirectory()) {
      await mkdir(dest, { recursive: true });
      await moveAll(src, dest);
      await rm(src, { recursive: true, force: true });
    } else {
      await mkdir(dirname(dest), { recursive: true });
      await rm(dest, { force: true });
      await rename(src, dest);
    }
  }
}

async function main() {
  if (!existsSync(DIST)) {
    console.log("[flatten-dist] No dist/ directory — skipping.");
    return;
  }
  if (existsSync(CLIENT)) {
    await moveAll(CLIENT, DIST);
    await rm(CLIENT, { recursive: true, force: true });
    console.log("[flatten-dist] Moved dist/client/** -> dist/");
  }
  if (existsSync(SERVER)) {
    await rm(SERVER, { recursive: true, force: true });
    console.log("[flatten-dist] Removed dist/server/");
  }
  // Drop nitro / wrangler artifacts that only matter for a server deploy.
  for (const stray of ["nitro.json"]) {
    const p = join(DIST, stray);
    if (existsSync(p)) {
      await rm(p, { force: true });
      console.log(`[flatten-dist] Removed dist/${stray}`);
    }
  }

  // Verification: dist/ must be a single flat directory with no client/server subfolders.
  const offenders = [];
  if (existsSync(CLIENT)) offenders.push("dist/client");
  if (existsSync(SERVER)) offenders.push("dist/server");
  if (offenders.length) {
    console.error(`[flatten-dist] FAIL: unexpected directories present: ${offenders.join(", ")}`);
    process.exit(1);
  }
  const topLevel = await readdir(DIST);
  if (!topLevel.includes("index.html")) {
    console.error("[flatten-dist] FAIL: dist/index.html missing — build output is incomplete.");
    process.exit(1);
  }
  console.log("[flatten-dist] OK: single dist/ verified (no client/ or server/ subfolders).");
}

main().catch((err) => {
  console.error("[flatten-dist] Failed:", err);
  process.exit(1);
});

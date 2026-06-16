#!/usr/bin/env node
/**
 * CI security gate.
 *
 * Runs the Supabase database linter against the connected project and fails
 * the build when any **new** error-level finding appears versus the committed
 * baseline at `.security/baseline.json`.
 *
 * Required env (set as GitHub Actions secrets):
 *   SUPABASE_ACCESS_TOKEN   personal access token with read scope
 *   SUPABASE_PROJECT_REF    e.g. wzbeyuohnyxacghxkbea
 *
 * Optional:
 *   FAIL_ON=error|warn      severity floor that fails the job (default: error)
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_PROJECT_REF;
const failOn = (process.env.FAIL_ON || "error").toLowerCase();

if (!token || !ref) {
  console.error("Missing SUPABASE_ACCESS_TOKEN or SUPABASE_PROJECT_REF.");
  process.exit(2);
}

const severityRank = { info: 0, warn: 1, error: 2 };
const floor = severityRank[failOn] ?? 2;

const url = `https://api.supabase.com/v1/projects/${ref}/database/lints`;
const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
if (!res.ok) {
  console.error(`Lint API failed: ${res.status} ${await res.text()}`);
  process.exit(2);
}
const findings = await res.json();

const baselinePath = resolve(".security/baseline.json");
let baseline = [];
if (existsSync(baselinePath)) {
  try {
    baseline = JSON.parse(readFileSync(baselinePath, "utf8")).fingerprints ?? [];
  } catch {
    baseline = [];
  }
}
const baselineSet = new Set(baseline);

const fingerprint = (f) =>
  `${f.name}|${f.level}|${(f.metadata?.schema || "")}|${(f.metadata?.name || f.cache_key || "")}`;

const offending = findings
  .filter((f) => (severityRank[(f.level || "").toLowerCase()] ?? 0) >= floor)
  .filter((f) => !baselineSet.has(fingerprint(f)));

if (offending.length === 0) {
  console.log(`✓ No new findings at or above '${failOn}'. (${findings.length} total, ${baselineSet.size} baselined)`);
  process.exit(0);
}

console.error(`✗ ${offending.length} new security finding(s) detected:\n`);
for (const f of offending) {
  console.error(`  [${f.level}] ${f.name} — ${f.metadata?.schema || ""}.${f.metadata?.name || ""}`);
  if (f.description) console.error(`    ${f.description.split("\n")[0]}`);
}
console.error(
  `\nReview findings, fix them, or add their fingerprints to .security/baseline.json after sign-off.`,
);
process.exit(1);

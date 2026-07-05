#!/usr/bin/env node
/**
 * rotate-audit-pepper.mjs — P1.11 (Security & Compliance Program)
 *
 * Generates a strong HMAC-SHA-256 pepper for `AUTH_AUDIT_HASH_PEPPER` and prints
 * the exact commands to roll it out across local preview and deployed Worker
 * secrets without downtime.
 *
 * Rotation strategy (NOT row backfill):
 *   1. Old pepper continues to verify existing rows.
 *   2. New pepper is set as the active writer via `wrangler secret put`.
 *   3. Existing `sha256:` (legacy) and `hmac-sha256:` rows are NOT re-hashed —
 *      the original IP/UA input is unrecoverable from a hash. Instead, tag
 *      legacy rows in the migration ledger and let the retention schedule
 *      (P1.8) purge them when their TTL expires.
 *
 * Usage:
 *   bun run scripts/rotate-audit-pepper.mjs              # generate value, print commands
 *   bun run scripts/rotate-audit-pepper.mjs --apply-local # also write to .dev.vars
 *
 * The script NEVER writes to production. Production rollout is interactive
 * wrangler so Philip controls the value and the moment of cutover.
 */
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const devVarsPath = resolve(repoRoot, ".dev.vars");

const applyLocal = process.argv.includes("--apply-local");

const pepper = randomBytes(32).toString("base64url");

console.log("=== AUTH_AUDIT_HASH_PEPPER rotation (P1.11) ===\n");
console.log(`Generated pepper: ${pepper}`);
console.log(`Entropy: 256 bits (32 random bytes, base64url-encoded)\n`);

console.log("--- LOCAL PREVIEW (.dev.vars) ---");
if (applyLocal) {
  if (!existsSync(devVarsPath)) {
    console.error(`.dev.vars not found at ${devVarsPath}. Create it from .dev.vars.example first.`);
    process.exit(1);
  }
  const existing = readFileSync(devVarsPath, "utf8");
  if (existing.includes("AUTH_AUDIT_HASH_PEPPER=")) {
    const updated = existing.replace(
      /^AUTH_AUDIT_HASH_PEPPER=.*$/m,
      `AUTH_AUDIT_HASH_PEPPER=${pepper}`,
    );
    writeFileSync(devVarsPath, updated);
    console.log(`Updated AUTH_AUDIT_HASH_PEPPER in ${devVarsPath}`);
  } else {
    const withVar = `${existing.trimEnd()}\n\n# P1.11 rotation: HMAC-SHA-256 pepper for account audit\nAUTH_AUDIT_HASH_PEPPER=${pepper}\n`;
    writeFileSync(devVarsPath, withVar);
    console.log(`Appended AUTH_AUDIT_HASH_PEPPER to ${devVarsPath}`);
  }
} else {
  console.log("Dry-run mode. Append --apply-local to write to .dev.vars.");
}

console.log("\n--- PRODUCTION ROLLOUT (Philip runs this) ---");
console.log("# 1. Set the new pepper as a Worker secret:");
console.log(`echo "${pepper}" | bunx wrangler secret put AUTH_AUDIT_HASH_PEPPER\n`);
console.log("# 2. Confirm it is set:");
console.log("bunx wrangler secret list | grep AUTH_AUDIT_HASH_PEPPER\n");
console.log("# 3. Trigger a test login to verify audit write succeeds with new pepper.");
console.log("# 4. After retention TTL expires, legacy sha256: rows will be purged by the P1.8 cron.\n");

console.log("--- ROTATION LOG ---");
console.log("Record this rotation in: .ai/10_state/compliance/audit-pepper-rotation-log.md");
console.log("Fields: timestamp, pepper_version (v1, v2, ...), set_by, reason, deploy_commit_sha");

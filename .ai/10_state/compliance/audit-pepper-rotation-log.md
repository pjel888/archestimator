# Audit HMAC Pepper Rotation Log

**Owner:** Philip
**Plan reference:** `.ai/03_plans/000-Follow Ups/2026-07-04-Security-Compliance-Followups.md` (P1.11)

## Procedure

1. Run `bun run scripts/rotate-audit-pepper.mjs --apply-local` to generate a new pepper and write it to local `.dev.vars`.
2. Set the same value as a Worker secret: `echo "<pepper>" | bunx wrangler secret put AUTH_AUDIT_HASH_PEPPER`.
3. Verify via `bunx wrangler secret list | grep AUTH_AUDIT_HASH_PEPPER`.
4. Trigger one test login to confirm audit writes succeed.
5. Append an entry to this log.

## Why no row backfill

`hashAccountSecurityValue` is one-way. Existing `sha256:` (legacy) and `hmac-sha256:` rows cannot be re-hashed with a new pepper because the original IP/UA input is unrecoverable. Instead, the retention cron (P1.8) purges old rows when their TTL expires.

## Rotation history

| Timestamp (Asia/Manila) | Pepper version | Set by | Reason | Deploy commit SHA | Notes |
|---|---|---|---|---|---|
| 2026-07-05 | v1 (initial) | OpenCode/Sisyphus (local only) | P0.6 HMAC migration — first production pepper | (not yet deployed) | Local `.dev.vars` only. Philip must run `wrangler secret put` before production deploy |

<!-- Append new rotations below this line. -->

# 13 — Rollout, Rollback, and Operations

## 13.1 Rollout shape

This is a dev-tooling + documentation change, not a runtime release. "Rollout" = land the
commits on `main` (shared worktree; no branch creation unless the owner explicitly requests it).

**Recommended landing order (dependency-aware):**
1. Phase 0 (T-00, T-01, T-02) — doc fixes. Independent, land first.
2. Phase 1 (T-03) + Phase 2 (T-04) — additive scripts. Parallel-safe; land together or separately.
3. Phase 4 (T-06) — doc-count guard. Land after Phase 0 so it passes as baseline.
4. Phase 5 (T-07, T-08) — restore rehearsal extension. Land after Phase 2.
5. Phase 3 (T-05) — remote readback. **Owner-gated; not a merge gate.** Execute after the
   tools are on `main`, before first users.

**What blocks merge:** nothing in this plan is a merge blocker except a failing targeted
test or `git diff --check`. The hosted-proof gate (Phase 3) blocks *first users*, not *merge*.

## 13.2 Release gates (first-users readiness)

| Gate | Blocks first users? | Evidence source | Status at plan time |
|---|---|---|---|
| Local schema verifier passes (`--local`) | No (merge gate only) | `bun run scripts/verify-d1-schema-integrity.ts --local` | pending impl |
| Remote migration-state known | **Yes** | `bun run scripts/audit-d1-migration-state.ts --remote` (owner) | BLOCKED-EXTERNAL (OPEN-DEC-001) |
| Remote schema integrity verified | **Yes** | `bun run scripts/verify-d1-schema-integrity.ts --remote` (owner) | BLOCKED-EXTERNAL |
| Compliance tables present remotely (`privacy_requests`, `data_retention_events`, `account_security_events` HMAC) | **Yes** | verifier compliance gates on `--remote` | BLOCKED-EXTERNAL |
| Doc drift guard passing | No (hygiene) | `bun run scripts/check-doc-migration-counts.mjs` | pending Phase 0+4 |
| D1 restore rehearsal (local, real schema) | No (cheaper-recovery-path confidence) | extended `cf:d1-restore-rehearsal` | pending Phase 5 |
| Hosted D1 restore rehearsal (staging) | Recommended | `wrangler d1 export` + staging import (owner) | BLOCKED-EXTERNAL (owner) |

**No claim of hosted/provider/production proof is made from local checks.** This matches
the directive §11 evidence rules.

## 13.3 Rollback procedures

| Change | Rollback steps | Data impact |
|---|---|---|
| Doc edits (Phase 0) | `git revert <commit>` | None |
| New scripts (Phases 1, 2, 4) | `git revert <commit>` (removes the files) | None (read-only scripts) |
| `package.json` script entries | `git revert <commit>` | None |
| Restore rehearsal extension (Phase 5) | `git revert <commit>` (reverts to 5-table fixture default) | None |
| Phase 3 fix-forward SQL (if executed remotely and wrong) | **Cannot `git revert`** — follow §7.3 reconciliation or DB-INT-04 restore from backup | Possible data impact (why §7.3 is strict) |

The scripts introduce **no irreversible action**. The only irreversible surface is the
Phase 3 fix-forward SQL, which is owner-gated and covered by §7.3.

## 13.4 D1 restore / recovery (the cheaper-recovery path)

Per `AGENTS.md` cost posture: "Rely on daily D1 backups plus the `cf:d1-restore-rehearsal`
script for the cheaper recovery path."

**Options (D1-specific), with limits:**

| Option | Command | Destructive? | Free-tier limit | When to use |
|---|---|---|---|---|
| SQL export (non-destructive) | `wrangler d1 export ARCH_DB --remote --output=./backups/<ts>.sql` | No (read-only) | Row/size considerations; large DBs export slowly | Pre-restore backup; offline analysis |
| SQL import (destructive on target) | `wrangler d1 execute ARCH_DB --remote --file=./backups/<ts>.sql` | **Yes** (overwrites target data per the SQL content) | Free-tier row/write limits | Restore to a known snapshot (target = staging first) |
| Time Travel restore (destructive) | `wrangler d1 time-travel restore ARCH_DB --timestamp=<ISO8601-or-unix>` | **Yes** (overwrites DB with prior state) | Default Time Travel retention (free-tier default; **confirm via official docs at impl time**) | Roll back to a known-good timestamp |

**Runbook (extends `scripts/generate-cloudflare-d1-restore-rehearsal.ts:84-90`):**
1. Take a fresh `wrangler d1 export ARCH_DB --remote --output=…sql` before any hosted restore.
2. Confirm target D1 name/id/account (`archestimator-proof-db` / `9bdb29bb-…`) — never the legacy Supabase project.
3. Treat `time-travel restore` as destructive; staging-first until owner-approved production cutover.
4. After restore: run schema verify (`verify-d1-schema-integrity --remote`) + row-count checks + `PRAGMA foreign_key_check` before traffic.
5. Record the restore as an evidence artifact + `current-state.md` entry.

**Limit to record at impl time:** the free-tier Time Travel retention window. The plan does
not assert a specific number from memory; `scripts/generate-cloudflare-d1-restore-rehearsal.ts:70`
cites the official-docs URL (`https://developers.cloudflare.com/d1/wrangler-commands/#time-travel-restore`);
impl agent must confirm the current free-tier retention before relying on it.

## 13.5 Monitoring / observability

- Dev/CI scripts: non-zero exit IS the alert. No dashboard needed.
- Hosted: existing Workers Observability (`wrangler.jsonc:83-97`) covers the Worker (unchanged by this plan).
- Post-restore verification: the schema verifier output is the observable signal.

## 13.6 Support / incident-response notes

- **Incident: compliance table missing remotely** (discovered via Phase 3). P0. Apply the
  specific class-A migration (`0033`/`0034` safe) via `wrangler d1 migrations apply ARCH_DB
  --remote` (owner-gated). For `0035`, follow §7.3 (never blind-apply).
- **Incident: `0035` partially applied remotely.** Do NOT re-run. Follow §7.3 row-count reconciliation.
- **Incident: doc claims a migration count that doesn't match dir.** Run T-06 guard; fix docs.

## 13.7 Rollout performance gates

Not applicable — no runtime/user-facing perf claim (§9.1). The directive's rollout-perf-gate
requirement applies "when performance, route behavior, data volume, API latency, or user
interaction speed is relevant." None are in scope. Documented as n/a with reason.

## 13.8 Feature flags / staged rollout

None. The scripts are opt-in developer/CI tools. No staged rollout mechanism is needed.

## 13.9 Backward compatibility / post-release verification

- Doc edits: strictly more accurate; no behavior change.
- New scripts: additive; old scripts unaffected.
- Post-merge verification: run the local verify + guard in CI (once GH Actions is restored,
  wire T-06 into a workflow; today it runs locally).
- Post-first-users: re-run the remote verifier periodically (manual or cron-triggered by the owner).

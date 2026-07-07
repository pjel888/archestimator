# 13 — Rollout, Rollback, and Operations

## Applicability

There is no "production rollout" of *application* behavior here — these are
operator CLI drills. "Rollout" = making the new scripts available and
documented; "rollback" = (a) reverting the scripts (trivial) and (b) rolling
back a drill that went wrong (drop the isolated target / delete the re-put
object). "Operations" = the runbook + cadence + DSAR re-erasure check.

## Operator runbook (REQ-OPS-01)

### Pre-flight (before every drill)
1. `git status --short --branch` — confirm clean shared worktree; declare
   file-scope ownership in the coordination ledger.
2. Re-read `wrangler.jsonc`; confirm `ARCH_DB` prod id `9bdb29bb-…` and preview
   id `363c756a-…` are unchanged.
3. `bun run cf:check-wrangler-auth` — confirms **authentication + account
   presence only** (it runs `wrangler whoami --json`; it does NOT verify
   D1/R2 token scopes).
4. **Manual scope probe** (required before any `--remote` drill):
   - `wrangler d1 list` — proves D1 read scope.
   - `wrangler r2 bucket list` — proves R2 read scope.
   - `wrangler r2 object get --remote archestimator-proof-uploads-dev/<known-preview-key>` — proves R2 get (and write if a put follows).
5. `bun run cf:pricing` (refresh) — confirm still on free-tier; check headroom
   (rows-read/day, Class A/B ops) in `20_…`.
6. **Off-peak rule**: schedule provider drills **outside the 03:00–03:30 UTC
   cron window** (`0/15/30 3 * * *` in `wrangler.jsonc`) — the production
   retention/cleanup/scan jobs occupy that window and share the free-tier
   rows-read + Class-A quotas.
7. Confirm the target is **isolated** (preview DB or a named staging DB) —
   never the prod id. For R2 restore, confirm the destination key starts with
   `_drill/` (preview bucket only).

### D1 local rehearsal (always safe; run on every change)
```
bun run cf:d1-restore-rehearsal
```
Expected: `restoreRehearsalReady: true`, `foreignKeyViolations: 0`,
`tempArtifactsRemoved: true`. Evidence → `evidence/<ts>-d1-restore-local.json`.

### D1 provider-backed rehearsal (OPEN-01 only)
1. Confirm OPEN-01 is owner-approved.
2. **Rate-limit awareness**: D1 allows **10 restores / 10 min / database**
   ([D1 Limits](https://developers.cloudflare.com/d1/platform/limits/)). Wait
   ≥10 min between consecutive `time-travel restore` attempts; space provider
   drills accordingly.
3. Confirm target-isolation: `bun run cf:d1-restore-target-isolation` with the
   destination id; **abort if dest == prod**.
4. Export from staging:
   `wrangler d1 export <STAGING> --remote --output=./backups/staging-<ts>.sql`.
5. Import into the *second* isolated DB:
   `wrangler d1 execute <TARGET> --remote --file=./backups/staging-<ts>.sql`.
6. Verify gates: row counts per table, SHA-256 of JSON snapshots,
   `PRAGMA foreign_key_check`, authorization-denial assertion.
7. **DSAR re-erasure gate (REQ-SEC-03)** — only if the restored DB will be
   returned to service (not for disposable drills). Run the concrete procedure
   in `08_…` ("Privacy / DSAR re-erasure after restore"): detect resurrected
   `privacy_request_register` / `data_retention_events` rows, re-apply
   erasure, re-verify authorization-denial, record owner sign-off.
8. Evidence → `evidence/<ts>-d1-restore-provider.json` with `providerBacked: true`.

### R2 inventory
1. `bun run cf:r2-inventory` (lists `archestimator-proof-uploads`).
2. Review orphan + dangling counts; sample 5 keys (redacted).
3. Evidence → `evidence/<ts>-r2-inventory.json`.

### R2 restore rehearsal
1. `bun run cf:r2-restore-rehearsal` (samples one non-orphan key).
2. Confirms get→put into the **preview** bucket; sha256/etag match.
3. Cleanup: delete the re-put preview object; `rmSync` temp dir.
4. Evidence → `evidence/<ts>-r2-restore.json`.

### Rollback of a drill
- D1 partial import: **drop the isolated target DB** (`wrangler d1 delete
  <TARGET>` or recreate); never resume a partial import.
- R2 restore mismatch: **delete the re-put preview object**; do not promote to
  prod.
- Any security assertion abort: **stop**; do not bypass; re-run with the
  correct isolated target.

## Drill cadence (REQ-OPS-03)

| Drill | Cadence | Reason |
|---|---|---|
| D1 local rehearsal | every repo change touching data/restore/scripts | cheap, secret-free, catches mechanism regressions |
| D1 provider-backed rehearsal | quarterly + before any release that changes schema/authz | proves hosted path; OPEN-01 each time or a standing approval |
| R2 inventory | monthly + after bulk upload changes | catches orphan/dangling drift |
| R2 restore rehearsal | quarterly | proves get→put integrity |
| Failure drill matrix | annually (tabletop) + after major infra change | rehearses the catastrophic paths |

## Evidence artifacts (REQ-OPS-03)

All under `.ai/03_plans/<pack>/evidence/` (or a sibling ops evidence folder
approved by the owner), committed (redacted):

- `<ts>-d1-restore-local.json` / `.md`
- `<ts>-d1-restore-provider.json` (OPEN-01)
- `<ts>-r2-inventory.json`
- `<ts>-r2-restore.json`
- `<ts>-runbook-execution.log` (operator's manual run log)

Naming mirrors the existing rehearsal outputs.

## Rollout (making the scripts available)

1. Land Phase 1–5 scripts + tests (no app change).
2. Add `package.json` entries (additive).
3. `bun run type-check` + focused tests green.
4. Update `AGENTS.md` "daily D1 backups" line to reflect reality (separate,
   owner-approved docs change — out of scope here but flagged).
5. Record the new scripts in this pack's evidence ledger.

No Worker deploy, no DNS, no email config, no migration — the rollout is purely
additive developer tooling.

## Rollback of the implementation

- Delete the new scripts; revert `package.json` entries.
- No migration to reverse. No provider state changed (drills target disposable
  preview resources and clean up).
- Fully reversible.

## Release gates (for the *implementation*, not this plan)

| Gate | Blocks | Pass criterion |
|---|---|---|
| Target-isolation test aborts on prod id | merge of TASK-101 | unit test green |
| Local D1 rehearsal passes | merge of TASK-103 | `restoreRehearsalReady: true` |
| R2 inventory/reconcile unit tests green | merge of TASK-201/202 | tests green |
| R2 restore rehearsal unit test green | merge of TASK-301 | test green |
| Runbook reviewed end-to-end | closeout | operator sign-off |
| OPEN-01 closed (provider drill) | `IMPLEMENTATION-READY` for hosted readiness | provider report with `providerBacked: true` |

## Rollout performance gates

Per the suite prompt, performance gates apply when performance is in scope. The
relevant metric here is **drill duration (= RTO evidence)**:

- Baseline: local SQLite rehearsal duration.
- Target: provider-backed export+reimport < 30 min at current volume.
- Observability: the drill report's `durationMs`.
- Regression threshold: > 2× baseline or > 30 min → investigate.
- Rollback trigger: drill cannot verify gates → abort + do not return target
  to service.
- Known gap: provider measurement deferred to OPEN-01.

## Support / incident-response notes

- If a real production restore is ever needed (not a drill): follow the
  destructive-restore runbook in `scripts/generate-cloudflare-d1-restore-rehearsal.ts`
  (lines 84–90) — take a fresh export first, capture a bookmark, confirm target,
  run post-restore checks. This is **owner-approved incident response**, not a
  drill, and is out of this plan's execution scope.
- R2 user-error data loss: there is **no recovery without an app-owned copy**.
  Mitigation is OPEN-03 (second bucket) or a future app-level soft-delete — out
  of scope here.

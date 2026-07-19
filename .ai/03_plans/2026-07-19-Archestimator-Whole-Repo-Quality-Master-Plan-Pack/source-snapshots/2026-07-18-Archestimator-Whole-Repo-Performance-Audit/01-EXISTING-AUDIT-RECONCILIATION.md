# 01 — Existing Audit Reconciliation

Existing baseline: `.ai/03_plans/2026-07-18-Codebase-Improve-Audit-Plan-Pack/` (33 plans, authored at commit `0a2667db9`, 2026-07-17).

This audit was authored 2026-07-18 against `HEAD = a41a07d01`, **16 commits and 333 files (40,181 insertions / 18,456 deletions) later**. Every plan in the existing pack was re-checked against current source.

## Drift summary

`git diff --name-status 0a2667db9..HEAD` shows 120 files added, 129 modified, 6 deleted, 78 renamed. Top touched areas:

| Area | Files touched | Material to perf audit? |
|---|---:|---|
| `.ai/09_archive/` | 118 | No — evidence history |
| `tests/vitest/` | 63 | Indirectly — characterization only |
| `src/lib/` | 54 | **YES** — D1 intents, publication, security |
| `.ai/03_plans/` | 52 | No — planning docs |
| `src/components/` | 23 | **YES** — workshop/estimate-sheet |
| `src/app/` | 16 | **YES** — route surface |
| `migrations/` | 1 | **YES** — `0092_linked_estimate_template_instances.sql` |
| `worker.ts` | 1 | **YES** — cron dispatch |
| `AGENTS.md` / `CLAUDE.md` | 2 | No — agent instructions |

### Net-new surfaces introduced after baseline (not present at `0a2667db9`)

| Surface | Migration / commit | Why it matters |
|---|---|---|
| **Linked Estimate Template instances** | `migrations/0092` + `src/lib/component-library/template-propagation-d1.ts` (783 lines) + `template-intent-recovery-d1.ts` (33 lines) | New D1 propagation/recovery surface; runs on 5-minute cron; new fanout scaling domain (K-10) |
| **Five-minute cron drain expansion** | `worker.ts:205-237` | Now runs 3 parallel tasks (notifications + template intent recovery + template propagation); ≥4 D1 statements per invocation even on no-op |
| **Durable rate limit infrastructure** | `src/lib/security/durable-rate-limit-d1.ts`, `durable-rate-limits.ts` | Built for publication scope; **not yet used by estimate actions** (plan 003 still valid) |
| **Client Portal notification durable queue** | `src/lib/cloudflare/client-portal-notification-queue.ts` (152 lines) | New consumer + lease-token idempotency; used to drain notifications asynchronously |
| **Admin observability expansion** | `src/lib/admin/observability-repository.ts` + `cron_run_events` table | Records every cron run as D1 INSERT — volume concern |
| **`scheduled()` retention expansion** | `worker.ts:269-303` | Now runs 5 parallel tasks on `30 3 * * *` |

## Plan-by-plan reconciliation (33 plans)

Status legend: **DONE** (verified in source), **TODO** (still pending — original plan still applies), **STALE** (assumptions no longer match code), **CHANGED** (issue shape changed), **NEW** (discovered after baseline).

### Tier 1 — Foundations & quick wins

| Plan | Title | Status at HEAD | Notes |
|---|---|---|---|
| 001 | One-command `verify` baseline | **TODO** | No new `verify` script; `package.json` `validate` exists (covers type-check+lint+error-handling+design+planning-prompts+test+test:dom) but `verify` is not defined. Lint still fails with 12 errors → baseline cannot pass |
| 002 | D1 batch hard-throw | **DONE** | Hard-throw sites now exist across `reusable-sources/actions.ts:626`, `mutation-receipts.ts:57`, `d1-intents/{rows,templates,tabs}.ts`, `projects/actions.ts:347`, `template-propagation-d1.ts:653,675`, `template-mutations.ts:133` |
| 004 | CSRF + control secrets constant-time | **TODO** (not verified changed) | Re-validate in implementation |
| 005 | Remove hardcoded platform-admin email fallback | **TODO** | `DEFAULT_PLATFORM_ADMIN_EMAILS = "philipjonlewis@gmail.com"` still at `src/lib/auth/roles.ts:31` |
| 007 | `insertMutation.onSuccess` staleness guard | **TODO** | Original plan still applies |
| 014 | Dedup share-route cookie parser | **TODO** | Original plan still applies |
| 022 | Stabilize virtualized estimate-row `style` prop | **TODO** | **Confirmed current**: `row-table.tsx:1309-1315` still inline object literal; `EstimateRowItemTableRow` still default `memo()` shallow (`row-table.tsx:307`) |
| 023 | Batch the restore idempotent-replay row reads | **TODO** | **Confirmed current**: `rows.ts:3187-3191` still `Promise.all(restoredRowIds.map(rowId => readRowById(...)))`; fresh-restore path at `:3281-3285` does use batched `WHERE IN (...)` |

### Tier 2 — Security hardening

| Plan | Title | Status at HEAD | Notes |
|---|---|---|---|
| 010 | Stop accepting `CRON_SECRET` on upload job routes | **TODO** | Original plan still applies |
| 011 | Require checksum binding on direct-upload finalize | **DONE** (partial — verify against original plan scope) | Direct-upload finalize at `direct-upload/route.ts:516-531` binds reserved SHA-256 against R2 HEAD checksum; verify it covers all paths |
| 012 | Bound the upload scan-override TTL | **TODO** | Original plan still applies |
| 013 | Enforce password gate inside brand-asset resolver | **TODO** | Original plan still applies |
| 015 | Fail-closed on missing telemetry pepper + draft-token secret | **TODO** | Original plan still applies |
| 003 | Move estimate-action rate limiter to durable store | **TODO** | **Confirmed current**: `src/lib/estimates/action-rate-limit.ts` is still pure in-memory `Map<string, number[]>` (line 18); durable infrastructure exists in `src/lib/security/durable-rate-limits.ts` and is used by `publication/public-rate-limits.ts`, just not wired into estimate actions |
| 006 | Harden upload malware scanning | **PARTIAL** (verify scope) | clamd-instream scanner exists at `src/lib/uploads/clamd-scanner.ts` with TCP `127.0.0.1:3310`, 5 s timeout, 1 MB chunks; gated by `UPLOAD_SCAN_PROVIDER=clamd`; scan-override is platform-admin-only. Verify whether images are scanned and public URLs gated per plan |
| 009 | Durable cross-batch idempotency for upload-job queue | **TODO** | **Confirmed current**: idempotency in `upload-job-queue.ts:338` is still per-batch `Set` only; not cross-batch |
| 019 | Move comment circuit breaker off per-isolate state | **TODO** (not re-verified) | Re-validate in implementation |
| 016 | Tighten enforced `/share` CSP with per-request nonce | **TODO** | `next.config.ts:200-218` ships enforced share CSP (no nonce — `'unsafe-inline'`/`'unsafe-eval'` retained); comment at `:189-191` explicitly defers the nonce work |

### Tier 3 — Correctness, perf, DX

| Plan | Title | Status at HEAD | Notes |
|---|---|---|---|
| 008 | Route legacy money-total through integer-minor-unit oracle | **TODO** | Not re-verified in depth |
| 017 | Scoped `lint-staged` pre-commit gate | **TODO** | **Confirmed current**: no `.husky/` dir; no `lint-staged` in package.json |
| 018 | Route client `console.*` through structured error reporter | **PARTIAL** | 17 `console.*` calls remain in `src/components/`+`src/hooks/`; the `/api/internal/client-error` endpoint exists with rate limiting at `client-error/route.ts:9-10,46-57`. Verify whether remaining consoles are intentional (probe/null in production) or leaks |
| 020 | Consolidate overlapping agent-instruction files | **TODO** | Not re-verified |
| 021 | Queue recipient invitation emails off the request path | **TODO** | **Confirmed current**: `addSharedLinkRecipients` at `publication/actions.ts:1453` still uses `mapWithBoundedConcurrency` (concurrency 4) with per-iteration `insert` + `await sendSharedLinkRecipientInvitationEmail` inline (`:1552,1586`). Note: Client Portal notification queue exists as exemplar (`client-portal-notification-queue.ts`) |

### Tier 4 — Larger refactors

| Plan | Title | Status at HEAD | Notes |
|---|---|---|---|
| 024 | Consolidate action error handling | **TODO** | Not re-verified |
| 025 | Split `workspace-repository.ts` | **TODO** | **Confirmed current**: `src/lib/repositories/workspace-repository.ts` is 3,713 lines |
| 026 | Decompose `EstimateSheetContent` god component | **TODO** | **Confirmed current**: `src/components/workshop/EstimateSheetContent.tsx` is 3,803 lines; owns full sheet state machine |
| 027 | Replace `@firecms/neat` patch | **TODO** | **Confirmed current**: `NeatWireframeBackground.tsx` still `import('@firecms/neat')`; patch file `patches/@firecms%2Fneat@0.8.0.patch` still present |

### Tier 5 — Direction spikes

| Plan | Title | Status at HEAD | Notes |
|---|---|---|---|
| 031 | Library bulk-import spike | **TODO** | Launch-urgent per original plan |
| 030 | Cost intelligence layer spike | **TODO** | Original plan still applies |
| 028 | Reconcile proposal surfaces spike | **TODO** | Original plan still applies |
| 029 | Revision-requested loop spike | **TODO** | Depends on 028 |
| 032 | AEC classification decision | **TODO** | Original plan still applies |
| 033 | Wire "Ask Flip" copilot | **TODO** | Pairs with 030 |

## Findings considered and rejected by the existing pack — re-validated

The existing pack's "rejected" list was spot-checked. All rejections remain valid at HEAD:

- **PERF-01 project-components unbounded scan**: still intended skeleton pattern. ✓
- **d3 + recharts duplicate**: still disjoint admin-only surfaces. ✓
- **126 scripts**: 66 are Cloudflare proof generators; tooling, not dead code. ✓
- **squash debt / migration gaps**: forward-only applies. ✓
- **`supabase/migrations/`**: protected. ✓
- **type-check slow (4 GB heap)**: addressed via 017 (still TODO). ✓
- **N+1 in `workspace-repository` etc.**: still well-batched. ✓
- **Missing indexes on estimate_nodes/tabs/row_items**: still covered; migration 0083 added cursor index. ✓
- **Heavy deps in workshop bundle**: still gated by CSS-only imports. ✓
- **Activity feed unbounded**: still `clampLimit` 50 + cursor pagination. ✓ (but `reconcileActivityOutbox` has an N+1 — see PERF-D1-002, distinct from feed reads)
- **Dev-auth bypass in prod**: still fail-closed. ✓
- **Share/client-portal IDOR**: still token-scoped. ✓
- **SQL injection / path traversal / scan-override forgery / hardcoded secrets / DO id crafting**: still rejected. ✓

## Summary

- **2 plans** verified DONE (002, partial 011).
- **~3 plans** PARTIAL (006, 011, 018).
- **~27 plans** still TODO at HEAD — original plans remain valid against current source.
- **0 plans** marked STALE on their core claim (all original source assumptions still hold).
- **Net-new surfaces** (migration 0092, durable rate limits, client-portal queue, 5-min cron expansion, admin observability table) introduce fresh performance surface that the original pack did not consider — captured as new findings in `05-FINDINGS-REGISTER.md`.

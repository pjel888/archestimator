# 01 — Audit Findings Register

Source of truth for the vetted findings → unit → requirement traceability. Every entry below was confirmed by the lead against the cited code. Rejected candidate findings are in §C so they are not re-audited.

## A. Confirmed findings → units

| ID | Finding (one line) | Cat | Sev | Eff | Risk | Conf | Primary evidence | Unit | Req |
|----|--------------------|-----|-----|-----|------|------|------------------|------|-----|
| F-01 | DB-wide `pragma_foreign_key_check` blocks deploy on any unrelated FK orphan | data | P1 | S | LOW | HIGH | `migrations/0084_…sql:223`, `0087_…sql:135` | UNIT-001 | DATA-001 |
| F-02 | 0087 may fail on historical NULL `actor_user_id` | data | P1 | S | LOW | MED | `migrations/0087_…sql:12-23` (col nullable since `0010:47`) | UNIT-001 | DATA-001 |
| F-03 | 0087 trigger `cleanup_not_before` falls back to NULL via `strftime` | data | P3 | S | LOW | MED | `migrations/0087_…sql:93-97,114-118` | UNIT-001 | DATA-001 |
| F-04 | Migrations 0084–0087 not re-runnable (no `IF NOT EXISTS` on DDL) | data | P2 | M | LOW | HIGH | `0084:4,95,109`; `0085:1,71,301`; `0086` triggers | UNIT-001 | DATA-001 |
| F-05 | `resolveComponentCategory` rebuilds a `Map` per item (O(items×folders)) | perf | P1 | S | LOW | HIGH | `src/lib/component-library/category-folders.ts:34` (per-row at `component-library-repository.ts:626,1037`) | UNIT-002 | PERF-001 |
| F-06 | Internal cron routes compare Bearer secret with `===` (timing side-channel) | sec | P2 | S | LOW | HIGH | `src/app/api/internal/{upload-cleanup,upload-scan,upload-runtime}/route.ts` `isAuthorized` | UNIT-003 | SEC-001 |
| F-07 | `bun run test` runs 6 files for 1,149 src; 57 `*proof*` tests assert on markdown not runtime | tests | P1 | S | LOW | HIGH | `package.json` `test`; `tests/vitest` (845, user-gated); `find tests/vitest -name '*proof*'`=57 | UNIT-004 | OPS-001 |
| F-08 | No centralized D1 batch statement/parameter-limit guard | perf | P2 | S | LOW | HIGH | `src/lib/cloudflare/d1-batch.ts:13`; `action-inbox-repository.ts:142`; guard exists at `mutation-receipts.ts:52` unused here | UNIT-005 | PERF-002 |
| F-09 | `/api/*` is middleware-exempt; no contract test that non-GET routes auth-gate | sec | P2 | S | LOW | MED | `src/lib/auth/request-proxy.ts:162-168`; ~60 handlers | UNIT-006 | SEC-002 |
| F-10 | Upload removal is all-or-nothing: one referenced file blocks the whole batch | bug | P2 | M | MED | HIGH | `src/lib/uploads/removal-claims.ts:253-258,294` | UNIT-007 | DATA-002 |
| F-11 | Removal API returns misleading HTTP 200 `removedPaths` on `already_claimed` | bug | P3 | S | LOW | HIGH | `src/app/api/{projects/images,component-library/attachments,component-library/images}/route.ts` | UNIT-007 | DATA-002 |
| F-12 | Missing composite index for the upload-removal matching path | perf | P3 | S | LOW | MED | `removal-claims.ts:189-199` vs indexes in `0010`/`0084` | UNIT-007 | DATA-002 |
| F-13 | Action-inbox: expired-snoozed items returned in "open" list still labeled `snoozed` | bug | P2 | S | LOW | HIGH | `src/lib/admin/action-inbox-repository.ts:150-168` (reopened only when `derive` runs) | UNIT-008 | OPS-002 |
| F-14 | `snoozeActionItemInD1` snoozes "until now" when `snoozeUntil` missing | bug | P3 | S | LOW | MED | `action-inbox-repository.ts:193` | UNIT-008 | OPS-002 |
| F-15 | Publication password floor is 4 chars; BLK-01 "server gap" doc is stale | sec/doc | P3 | S | LOW | HIGH | `src/lib/publication/security.ts:134`; gate at `actions.ts:896,969,1053` | UNIT-009 | SEC-003 |
| F-16 | Active-recipient query re-implemented 5–6× (authz-drift risk) | tech-debt | P2 | S | MED | HIGH | `client-portal/{public-repository,thread-repository:171}`, `publisher-discussion-service.ts:125`, `issue-builder`, `decision-service` | UNIT-010 | SEC-004 |
| F-17 | `web-vitals-collector` `pagehide` listener can never be removed | reliab | P3 | S | LOW | HIGH | `src/components/web-vitals-collector.tsx:157-160` (cleanup `:162-168` misses it) | UNIT-011 | OPS-003 |
| F-18 | `getCloudflareD1Database` swallows every failure to `null` | reliab/obs | P3 | S | LOW | MED | `src/lib/cloudflare/d1.ts:41-43` | UNIT-012 | OPS-004 |
| F-19 | Component-library "load all" issues unbounded growing-`OFFSET` scans | perf | P2 | M | LOW | HIGH | `src/lib/repositories/component-library-repository.ts:557-570` (`isPartial` exists `:1067`) | UNIT-013 | PERF-003 |
| F-20 | `EstimateActionsD1Client` is a 6,261-LOC mutation god-module with 3 narrow tests | tech-debt | P3 | L | HIGH | HIGH | `src/lib/estimates/d1-action-client.ts` (money/write path) | UNIT-014 | PERF-004 |
| F-21 | No hosted characterization test for share-link brute-force / password-lockout survival (BETA P0 gate) | tests | P1 | M | HIGH | HIGH | `src/lib/publication/public-repository.ts:394`; roadmap BETA P0 #5/#7c/#8 | UNIT-015 | SEC-005 |
| F-22 | Upload removal scans 10+ tables with `json_tree` per asset | perf | P3 | L | MED | HIGH | `removal-claims.ts:47-169,257,287` | UNIT-016 | PERF-005 |
| F-23 | Two `public-repository.ts` + client-portal reaches into publication's private rate-limit | tech-debt | P3 | M | MED | HIGH | `client-portal/public-session-handler.ts:10` → `publication/public-repository.ts:394` | UNIT-017 | SEC-006 |

## B. Direction findings → units (AUXILIARY design spikes)

| ID | Direction | Grounding | Unit | Req |
|----|-----------|-----------|------|-----|
| D-1 | Expand Estimate-System-Map beyond admin | `src/app/admin/estimate-system/page.tsx` renders `<EstimateSystemMap>`; d3 knowledge-graph is the unique surface; `.ai/03_plans/2026-07-15/Estimate-System-Map/` exists | UNIT-018 | REQ-001 |
| D-2 | Add estimate XLSX/CSV import (symmetric with mature export) | `src/lib/proposal-export/` (7 modules) + activation route; no import path exists; roadmap #11/#13 depend on it | UNIT-019 | REQ-002 |
| D-3 | Close activation-milestone → founder action-inbox loop | 11-milestone activation producers (`activation-producer-contract.ts`) + just-landed action-inbox; roadmap BETA P0 #11/#16 | UNIT-020 | REQ-003 |

## C. Rejected / by-design (do NOT re-audit)

| Candidate | Disposition | Reason |
|-----------|-------------|--------|
| "Estimate-System-Map is unrouted" | **FALSE — rejected** | `src/app/admin/estimate-system/page.tsx` imports and renders `<EstimateSystemMap>`. Routed and live. (An earlier audit draft mis-read it as a docs shell.) |
| CSP `unsafe-inline`/`unsafe-eval` on enforced `/share` + Report-Only `/workshop` | **BY-DESIGN (P11 tradeoff)** | `next.config.ts:49-53` records the decision; nonce pipeline explicitly deferred. Optional hardening only, not a defect. |
| `db.exec` template-literal interpolation in `estimate-history-proof-router.ts:510` | **ANTI-PATTERN, currently unreachable** | Interpolated values are server-generated UUIDs; route is CRON-secret-gated. SEC-03-level; not promoted to a unit (low ROI). |
| Migration 0085 one-way rewrite (irreversible) | **BY-DESIGN** | The migration's stated purpose ("unification"), guarded by fail-safe assertion triggers (`0085:228-287`). Optional pre-image backup noted in UNIT-001, not a defect. |
| 0086 rehome-on-delete multi-statement trigger | **CORRECT** | Sound under D1 single-writer; complexity/observability note only. |
| `.env.local` present | **INFORMATIONAL** | Gitignored; nothing tracked. No action. |
| Bearer publication token in URL | **ACCEPTED** | Established bearer-link model; `Referrer-Policy: no-referrer` mitigates; 32-byte token. |
| D1 has no RLS | **ACCEPTED** | App-level scoping via better-auth email; defense-in-depth only. |
| dev-auth-bypass env gate | **ACCEPTED** | `NODE_ENV !== "production"`-gated; off in prod by construction. |
| Serial auth waterfall (access-then-profile) | **INVARIANT** | Fail-fast denial; test-pinned (`auth-session-closed-beta.test.ts`). Not a bug. |
| Single corrupt row fails recipient inbox | **INVARIANT** | Fail-closed safety; test-pinned. Not a bug. |
| Publisher idempotency check-then-insert (`publisher-discussion-service.ts:212`) | **KNOWN DEFERRED** | Already in `.ai/04_tasks/2026-07-16-publisher-audit-deferred-*.md` DEF-03. Fail-closed. Not re-planned here. |
| Mutation-receipt idempotency check-then-insert (`mutation-receipts.ts:61`) | **FAIL-CLOSED, noisy** | Atomic batch rolls back together; safe. Low ROI to add `ON CONFLICT`. Noted, not a unit. |

## Traceability summary

- 23 confirmed findings (F-01..F-23) → 17 CORE units (UNIT-001..017), with the migration cluster (F-01..F-04) collapsed into UNIT-001 and the upload-removal cluster (F-10..F-12) into UNIT-007.
- 3 direction findings (D-1..D-3) → 3 AUXILIARY units (UNIT-018..020).
- 12 candidate findings rejected (§C) — recorded so the next audit does not re-derive them.

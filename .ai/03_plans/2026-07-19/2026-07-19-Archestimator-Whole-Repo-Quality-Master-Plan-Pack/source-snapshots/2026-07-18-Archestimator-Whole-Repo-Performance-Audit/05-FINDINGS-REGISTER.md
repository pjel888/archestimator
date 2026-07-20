# 05 — Findings Register

Each finding follows the prompt's required field set. Findings are also captured machine-readably in `artifacts/findings.json`.

## Evidence legend
- **MEASURED** — reproduced with current-HEAD measurement artifacts.
- **STATIC-CONFIRMED** — directly proved by current source, configuration, query shape, or dependency graph.
- **HYPOTHESIS** — plausible but not yet proved; includes a precise measurement plan.
- **BLOCKED** — proof requires authorization, credentials, representative data, production traffic, or an unavailable environment.
- **REJECTED** — investigated and shown not actionable; reason recorded.
- **STALE** — inherited documentation/tooling no longer matches architecture.

## Priority definitions
- **P0** — release blocker or credible risk of violating runtime limits, data correctness, critical-flow availability, or severe p95 UX.
- **P1** — high-frequency/high-value flow with major measured latency, scale, reliability, or cost impact.
- **P2** — meaningful localized improvement, regression prevention, or medium-term scaling issue.
- **P3** — low-frequency, micro-optimization, cleanup, or optional efficiency improvement.

## Scoring
`priority score = impact × frequency × confidence ÷ implementation cost` (each on 1–5 scale). Higher = do sooner. Scoring is advisory; final wave assignment also considers dependencies and risk.

---

## PERF-CI-001 — CI workflow disabled; README claims active CI

| Field | Value |
|---|---|
| Status | STATIC-CONFIRMED |
| Priority | **P0** |
| Surface | `.github/workflows/`, README, build/CI |
| Impact | Release blocker. No automated type-check / lint / build / test / bundle-budget / Playwright smoke on PRs or main. Performance-budget gate (`scripts/check-performance-budgets.mjs`) is not running. Regressions ship silently. |
| Evidence | `ls .github/workflows/` → empty. All workflows are in `.github/workflows-disabled/` (ci.yml, codeql.yml, dependabot.yml, react-doctor.yml + `2026-07-13/{release,dependency-review,ci}.yml`). README:384 claims `GitHub Actions (.github/workflows/ci.yml): triggers on PRs and pushes to main/feat/*. Runs bun install --frozen-lockfile → bun run validate → bun run build → Playwright smoke.` |
| Source | `.github/workflows/` (empty); `.github/workflows-disabled/ci.yml`; `README.md:380-385`; git log: `25c117184 chore(tooling): archive GitHub Actions workflows` |
| Reproduction | `ls -la .github/workflows/ ; ls -la .github/workflows-disabled/` |
| Baseline | Active CI claimed, no CI running |
| Target | Either restore CI to `.github/workflows/` or correct README to "CI archived; local validation only" |
| Root cause | Workflows intentionally archived Jul 13 (commit 25c117184); README not updated |
| Recommendation | Re-enable the validated CI workflow at `.github/workflows/ci.yml` before public launch. If CI is intentionally off for cost reasons during alpha, update README:380-385 to reflect reality so agents don't run CI scripts expecting gates. |
| Expected improvement | Restores automated regression protection; eliminates documentation drift. |
| Constraints | None — workflows are reversible git moves. |
| Effort | XS |
| Risk | Low |
| Dependencies | None |
| Verification | `ls .github/workflows/ci.yml` exists; PR opens trigger it; `gh run list` shows runs. |
| Existing-plan relation | New — not in existing pack |

---

## PERF-OBS-001 — Web-vitals collector write amplification + listener leak

| Field | Value |
|---|---|
| Status | STATIC-CONFIRMED |
| Priority | **P1** |
| Surface | `src/components/web-vitals-collector.tsx`, `src/app/api/internal/web-vitals/route.ts`, `src/lib/admin/observability-repository.ts:198` |
| Impact | High-frequency. Every page view emits minimum 5-7 `POST /api/internal/web-vitals` calls → 5-7 D1 INSERTs. Mobile tab-switch fires BOTH `visibilitychange(hidden)` AND `pagehide` → 9-11 writes. Long-loading pages emit multiple LCP posts (no dedup). At beta scale this is the single largest D1 write amplifier from client-side telemetry. Also a Worker request amplifier (each POST is a full Worker invocation that bypasses `disableCookieCache` short-circuit). |
| Evidence | `web-vitals-collector.tsx:68-75` (LCP observer posts on every entry); `:84-91` (CLS accumulates, `reportCls` at `:98-102`); `:106-118` (INP); `:126-137` (FCP posts); `:139-147` (TTFB); `:150-156` (`visibilitychange` calls reportCls+reportInp); `:157-160` (`pagehide` calls reportCls+reportInp again); cleanup at `:162-168` removes `visibilitychange` but NOT `pagehide`. Endpoint at `route.ts:55-61` calls `recordWebVitalEvent` (1 D1 INSERT per POST). |
| Source | `src/components/web-vitals-collector.tsx:65-172`; `src/app/api/internal/web-vitals/route.ts`; `src/lib/admin/observability-repository.ts:198-237` |
| Reproduction | `grep -n 'postMetric\|reportCls\|reportInp\|pagehide' src/components/web-vitals-collector.tsx` |
| Baseline | 5-11 D1 writes per page view (uncapped, undededuped) |
| Target | 1 batched POST per page view containing all final metrics; dedupe LCP to final value; coalesce CLS+INP into one report; sample by route+session |
| Root cause | Native PerformanceObserver pattern with per-entry posting and two unload paths both active |
| Recommendation | (1) Buffer all metrics in memory; flush one batched POST on `visibilitychange(hidden)` OR `pagehide` (whichever fires first; gate with a `flushed` flag). (2) Capture only the final LCP entry (debounce post until activity stops or page hides). (3) Add session-level sampling (e.g. 10% of page views) to cut volume. (4) Fix the `pagehide` listener leak (named function + removeEventListener in cleanup). (5) Consider adding a server-side rate limit mirroring `client-error/route.ts:9-10`. |
| Expected improvement | ~80-90% reduction in web-vitals D1 writes and Worker invocations; preserved observability via batching + sampling. |
| Constraints | Preserve ability to detect regressions (sample + retain p95/p99 by route). No PII in payloads. Same-origin check at endpoint retained. |
| Effort | M |
| Risk | Low (telemetry only; failures swallowed at endpoint) |
| Dependencies | None |
| Verification | Manual browser DevTools network tab — count POSTs per page view before/after. React Profiler for collector render cost. D1 row-count diff on `web_vital_events` over a fixed session window. |
| Existing-plan relation | New — not in existing pack |

---

## PERF-AUTH-001 — `disableCookieCache: true` forces per-request D1 session lookup

| Field | Value |
|---|---|
| Status | STATIC-CONFIRMED |
| Priority | **P1** |
| Surface | `src/lib/auth/better-auth-cloudflare.ts:317-319`, `src/lib/auth/session.ts:65-77,98` |
| Impact | High-frequency. Every authenticated workshop request issues a D1 session lookup that bypasses Better Auth's cookie cache. Combined with closed-beta + profile reads, that's ≥3 sequential D1 reads on every authenticated navigation. For the workshop shell which may prefetch/post multiple `_rsc` requests per page transition, this multiplies. |
| Evidence | `src/lib/auth/better-auth-cloudflare.ts:317-319` passes `disableCookieCache: true` to `auth.api.getSession`. `src/lib/auth/session.ts:65-77` issues 2 more sequential D1 reads after session. `cache()` at `:98` collapses duplicates within a single request only. |
| Source | `src/lib/auth/better-auth-cloudflare.ts:317-319`; `src/lib/auth/session.ts:65-77,98` |
| Reproduction | `grep -n 'disableCookieCache' src/lib/auth/`; trace `getSession` call chain in middleware + RSC. |
| Baseline | 3 sequential D1 reads per authenticated request (session, closed-beta, profile) |
| Target | 0-1 D1 read on cache hit (cookie cache enabled, validated against revocation list); batched closed-beta+profile lookup in one round-trip |
| Root cause | Cookie cache explicitly disabled; design choice likely to ensure revocation, but defeats the cache entirely |
| Recommendation | (1) Re-enable Better Auth cookie cache with a short TTL (e.g. 60 s) and explicit revocation check (revoked-session set in KV or D1 with periodic refresh). (2) Batch the closed-beta + profile reads into a single D1 query using `Promise.all` or a JOIN. (3) Verify middleware reads session once and React `cache()` handles intra-request reuse (already in place). |
| Expected improvement | Modeled 50-70% reduction in D1 reads on authenticated requests; reduced p95 TTFB on workshop navigation. |
| Constraints | Must preserve session revocation semantics; must not weaken tenant isolation. Verify the reason `disableCookieCache: true` was set (commit archaeology) before removing. |
| Effort | M |
| Risk | Medium (auth surface; needs revocation correctness proof) |
| Dependencies | Audit commit history for the reason `disableCookieCache: true` was added |
| Verification | Hosted D1 query-count probe (`cf:d1-runtime-proof` extended to authenticated surfaces); p95 TTFB before/after on `/workshop/*`. |
| Existing-plan relation | New — not in existing pack |

---

## PERF-CRON-001 — 5-minute cron always writes `cron_run_events` row + performs empty sweeps

| Field | Value |
|---|---|
| Status | STATIC-CONFIRMED |
| Priority | **P2** |
| Surface | `worker.ts:205-237`, `src/lib/admin/observability-repository.ts:240-279` |
| Impact | Medium-frequency cost. Every 5 minutes the drain cron runs 3 reconciliation tasks (each with at least one SELECT) and ALWAYS inserts a `cron_run_events` row regardless of whether work was done. 288 invocations/day × ~4 D1 statements each = ~1,152 D1 rows/day from empty sweeps alone. The `30 3 * * *` cron writes TWO `cron_run_events` rows per invocation. |
| Evidence | `worker.ts:216-223` (ok path) and `:226-233` (error path) both call `recordCronRunEvent` unconditionally. `recordCronRunEvent` at `observability-repository.ts:240-279` INSERTs if `db` resolves. |
| Source | `worker.ts:205-237,269-303`; `src/lib/admin/observability-repository.ts:240-279` |
| Reproduction | `grep -n 'recordCronRunEvent' worker.ts src/lib/admin/observability-repository.ts` |
| Baseline | 288 invocations/day × ~4 D1 statements = ~1,152 rows/day baseline from 5-min drain |
| Target | Skip the INSERT (or summarize into an hourly aggregate) when summary is empty; coalesce multiple `recordCronRunEvent` calls per cron into one |
| Root cause | Telemetry-by-default without a no-op gate |
| Recommendation | (1) Gate the `recordCronRunEvent` INSERT on `summaryJson !== null` OR a "meaningful work" flag from each task. (2) For the `30 3 * * *` cron, collapse the two `recordCronRunEvent` calls (upload-jobs + retention) into one composite row. (3) Consider an hourly aggregate rollup table that summarizes 12 5-min runs into one row, with the granular row retained for 7 days then purged. |
| Expected improvement | ~80% reduction in `cron_run_events` write volume at no loss of operational signal. |
| Constraints | Preserve ability to detect cron failures (error path must still write). Retain enough granularity for ops debugging. |
| Effort | S |
| Risk | Low |
| Dependencies | None |
| Verification | D1 row count diff on `cron_run_events` over 24 h with no work vs. baseline. |
| Existing-plan relation | New — not in existing pack |

---

## PERF-D1-001 — Restore-replay issues N `readRowById` calls (up to 100)

| Field | Value |
|---|---|
| Status | STATIC-CONFIRMED |
| Priority | **P2** |
| Surface | `src/lib/estimates/d1-intents/rows.ts:3187-3191,1697-1704` |
| Impact | Medium-frequency. Idempotent restore-replay (the second+ attempt of a restore after a network blip) issues one single-row `SELECT * FROM estimate_row_items WHERE estimate_id = ? AND id = ?` per restored row in `Promise.all`. Up to `MAX_RESTORABLE_ROW_BATCH_SIZE = 100` rows. The fresh-restore path correctly batches via `WHERE id IN (...)` at `:3201-3206,3281-3285`. |
| Evidence | `rows.ts:3187-3191` `Promise.all(restoredRowIds.map(rowId => readRowById(...)))`; `readRowById` at `:1697-1704` is single-row SELECT. Fresh-restore collision check at `:3201-3206` uses `placeholders(restoredRowIds)` correctly. |
| Source | `src/lib/estimates/d1-intents/rows.ts:3187-3191,1697-1704,3201-3206,3281-3285,198` |
| Reproduction | `sed -n '3185,3195p' src/lib/estimates/d1-intents/rows.ts` |
| Baseline | Up to 100 parallel single-row SELECTs on idempotent replay |
| Target | 1 batched `WHERE id IN (...)` SELECT (mirror the fresh-restore re-read at `:3281-3285`) |
| Root cause | Code uses per-row reader on the idempotent path while sibling paths use batched reads |
| Recommendation | Replace `Promise.all(restoredRowIds.map(rowId => readRowById(...)))` with a batched read mirroring `:3281-3285`: `SELECT * FROM estimate_row_items WHERE estimate_id = ? AND id IN (${placeholders(restoredRowIds)}) ORDER BY id`. Reject if any requested row is missing (matching the existing throw at `:3189`). |
| Expected improvement | 100 D1 reads → 1 D1 read per idempotent replay. Latency drop on restore retry. |
| Constraints | Preserve idempotency semantics (matching `existingEvent.id`); preserve the throw on missing rows. |
| Effort | S |
| Risk | Low |
| Dependencies | None |
| Verification | The fix is correct by inspection (mirrors the sibling batched path at `rows.ts:3281-3285`). `EXPLAIN QUERY PLAN` for the new query against `idx_estimate_row_items_*` is verification nice-to-have, not an implementation dependency. Existing characterization test `tests/vitest/estimate-actions-d1-row-restore-history.test.ts` should still pass. |
| Existing-plan relation | **Extends existing Plan 023** — original plan identified this exact issue; verified still current |

---

## PERF-D1-002 — `reconcileActivityOutbox` has up to 500 × 3 D1 statements per pass

| Field | Value |
|---|---|
| Status | STATIC-CONFIRMED |
| Priority | **P2** |
| Surface | `src/lib/activity/activity-outbox.ts:105-157` |
| Impact | Medium-frequency but high per-invocation cost. Daily `30 3 * * *` cron calls `reconcileActivityOutbox`. With default `limit: 100` (max 500), each row triggers: 1 `SELECT` to verify the history event exists (`:127-132`), then either 1 `UPDATE delivered` (`:136-140`) OR 1 `UPDATE failed` retry (`:146-151`). 3 statements per row × up to 500 rows = up to 1,500 D1 statements per pass. |
| Evidence | `activity-outbox.ts:111` `Math.min(options.limit ?? 100, 500)`; loop `:125-154` does per-row `SELECT` + `UPDATE` sequentially. |
| Source | `src/lib/activity/activity-outbox.ts:105-157`; called from `worker.ts:273` |
| Reproduction | `sed -n '105,157p' src/lib/activity/activity-outbox.ts` |
| Baseline | Up to 1,500 D1 statements per daily pass |
| Target | 2 statements total: one batched `SELECT` to filter, one batched `UPDATE … WHERE id IN (...)` per branch (delivered / failed) |
| Root cause | Sequential per-row SELECT-then-UPDATE pattern; no batched filter+update |
| Recommendation | (1) Batch the verification SELECT: `SELECT id, event_id, workspace_id FROM activity_event_outbox WHERE id IN (placeholders) AND status IN ('pending','failed')`. (2) Batch the existence check: `SELECT id FROM estimate_sheet_events WHERE (id, workspace_id) IN (...)`. (3) Issue two atomic `batch([...])` calls — one for delivered updates, one for failed updates — using `WHERE id IN (placeholders)`. |
| Expected improvement | ~500× reduction in D1 statement count per pass; reduced wall-time on the daily retention cron. |
| Constraints | Preserve idempotency; preserve `nextRetryAt` backoff math; preserve `assertWorkspaceId` invariant. |
| Effort | M |
| Risk | Low |
| Dependencies | None |
| Verification | Instrument statement count via temporary log; `EXPLAIN QUERY PLAN` for the batched SELECT against `idx_activity_event_outbox_status`. |
| Existing-plan relation | New — not in existing pack |

---

## PERF-CRON-002 — GlobalPresence singleton DO broadcastTimer prevents hibernation

| Field | Value |
|---|---|
| Status | STATIC-CONFIRMED |
| Priority | **P2** |
| Surface | `src/lib/cloudflare/global-presence.ts:74-79,187-193,144-152` |
| Impact | Cost. GlobalPresence is a singleton DO (`idFromName("global")`) — every presence subscriber in every room shares one DO. The `broadcastTimer` 1-second debounce `setTimeout` is scheduled on connect/authorize and **never cancelled in `webSocketClose`/`webSocketError`**. A pending timer keeps the DO out of hibernation until it fires. Over a busy day this means the DO essentially never hibernates → continuous duration billing. |
| Evidence | `global-presence.ts:74-79` (`broadcastTimer: setTimeout \| null`); `:187-193` `schedulePresenceCountBroadcast` clearTimeout only inside the next schedule; `:144-152` `webSocketClose`/`webSocketError` do not clear the timer. |
| Source | `src/lib/cloudflare/global-presence.ts:74-79,144-152,187-193` |
| Reproduction | `grep -n 'broadcastTimer\|clearTimeout\|setTimeout' src/lib/cloudflare/global-presence.ts` |
| Baseline | DO never hibernates while subscribers are present (continuous duration billing) |
| Target | DO hibernates when no pending work (timer cleared on close; alarm-based fallback for scheduled broadcasts) |
| Root cause | Missing cleanup on socket close |
| Recommendation | (1) In `webSocketClose`/`webSocketError`, after the broadcast, if `getWebSockets().length === 0`, `clearTimeout(this.broadcastTimer)` and null it. (2) Optionally migrate the debounce to a DO alarm (`storage.setAlarm()`) so hibernation can occur between broadcasts. |
| Expected improvement | Modeled significant DO duration-cost reduction (depends on traffic; singleton is always somewhat active, but every minute of hibernation saved is billable duration avoided). |
| Constraints | Preserve presence-count broadcast semantics. |
| Effort | S |
| Risk | Low |
| Dependencies | None |
| Verification | Wrangler tail on staging: observe DO hibernation events before/after. |
| Existing-plan relation | New — not in existing pack |

---

## PERF-CRON-003 — `reconcileActivityOutbox` N+1 also runs on every 5-minute drain (was daily only)

**Folded into PERF-D1-002 during 2nd-pass consolidation.** Originally filed under a wrong assumption (that the N+1 ran on the 5-min cron). Correction during audit: `reconcileActivityOutbox` is called only from `worker.ts:273` inside the `30 3 * * *` retention branch, NOT from the `*/5 * * * *` drain. So it runs once/day, not 288×/day. The per-invocation cost (up to 1,500 statements) is captured by PERF-D1-002. This ID is retained only as a redirect for traceability; it is **not** an additional actionable finding and is not counted in the summary.

---

## PERF-RT-001 — No `bufferedAmount` / backpressure handling in any DO

| Field | Value |
|---|---|
| Status | STATIC-CONFIRMED |
| Priority | **P2** |
| Surface | `src/lib/cloudflare/{collaboration-room,global-presence,support-inbox}.ts` (all `sendJson` helpers) |
| Impact | Reliability under slow clients. Every `sendJson` is fire-and-forget `ws.send(...)`. On throw, the socket is closed with 1011. Under sustained broadcast load (e.g. collaboration room at 30 fps × 99 peers = 2,970 outbound/s theoretical), a slow consumer can have its socket buffered beyond Worker memory limits and be force-closed without any attempt to coalesce, sample, or backpressure. |
| Evidence | Zero `bufferedAmount` matches in `src/lib/cloudflare/*`. `sendJson` at `collaboration-room.ts:84-90`, `global-presence.ts:63-69`, `support-inbox.ts:78-84` all just `ws.send` and on throw `ws.close(1011, "..._send_failed")`. |
| Source | All three DO files; capacity contract at `src/lib/collaboration/capacity-contract.ts` |
| Reproduction | `grep -rn 'bufferedAmount' src/lib/cloudflare/` → empty |
| Baseline | Slow consumers are force-closed; no backpressure signal |
| Target | `sendJson` checks `ws.bufferedAmount > THRESHOLD` and either drops cursor/presence messages (coarse-grained backpressure) or closes the socket gracefully with a 1013 Try Again Later |
| Root cause | Naive `ws.send` without flow control |
| Recommendation | (1) Add `bufferedAmount` check in `sendJson`; for cursor/presence messages drop silently if buffered > ~64 KB. (2) For row-update broadcasts (collab room) close with 1013 instead of 1011 to signal retry. (3) Document the chosen threshold in the capacity contract. |
| Expected improvement | Slow clients are dropped cleanly; well-behaved clients unaffected; no memory bloat. |
| Constraints | Must not break the hibernation model. Preserve the 100-connection room cap. |
| Effort | S |
| Risk | Low |
| Dependencies | Hosted load test only for **threshold tuning** — the *fix* (add `if (ws.bufferedAmount > BACKPRESSURE_THRESHOLD) return;` with a conservative 64 KB default) does not need a hosted test and can ship with the conservative threshold; tune later. (2nd-pass correction: original framing overstated the gate.) |
| Verification | Hosted WS load test with artificial slow consumer; observe close codes. |
| Existing-plan relation | New |

---

## PERF-FE-001 — Virtualized estimate-row `style` prop rebuilt per render

| Field | Value |
|---|---|
| Status | STATIC-CONFIRMED |
| Priority | **P2** |
| Surface | `src/components/workshop/estimate-sheet/rows/row-table.tsx:1309-1315,307,619` |
| Impact | Medium. Each parent re-render of `EstimateRowItemsTable` constructs a fresh inline `style` object literal per visible row (`:1309-1315`) and passes it to `EstimateRowItemTableRow`, which is `memo`'d with default shallow compare (`:307`). Fresh object identity defeats the memo, so all mounted visible rows re-render on every parent render even when their `item` is unchanged. Triggered by: focus change, selection change, scrollMargin update (every scroll event), or any state change in the table's parent. |
| Evidence | `row-table.tsx:1309-1315` object literal inside `virtualItems.map(...)`; `:307` default `memo()`; `:619` second spread concern inside the row component. Custom outer comparator at `:120-156` mitigates parent re-renders but does not protect the inner row. |
| Source | `src/components/workshop/estimate-sheet/rows/row-table.tsx:307,619,1309-1315` |
| Reproduction | Read the file at the cited lines. |
| Baseline | All mounted visible virtual rows re-render on every parent re-render |
| Target | Visible rows re-render only when their own `item` or focus/selection state changes |
| Root cause | Inline object literal identity churns every render |
| Recommendation | (1) Move the style object to a `useMemo` keyed on `[virtualRow.start, scrollMargin, virtualEnabled]`. (2) OR add a custom comparator to `EstimateRowItemTableRow`'s `memo` that compares `style.transform` and `style` shallow fields explicitly. (3) Plan 022 in the existing pack identified this exact issue; this finding extends it with the inner-row memo gap. |
| Expected improvement | HYPOTHESIS — React Profiler would show reduced commits per scroll/focus event. Magnitude depends on row count and visible window size. |
| Constraints | Preserve virtualization correctness; preserve the `style` semantic (translateY, absolute positioning). |
| Effort | S |
| Risk | Low |
| Dependencies | None |
| Verification | The fix (5-line `useMemo` keyed on `[virtualRow.start, scrollMargin, virtualEnabled]`) does not need a browser gate. React Profiler with `reportEstimateRowItemRender` probe (already exists) during typing and scroll is the magnitude verification (TEST_PROPOSAL) — counts row renders before/after. That magnitude verification needs the browser gate, but the fix itself does not. |
| Existing-plan relation | **Extends existing Plan 022** — original plan identified the issue; this audit confirms it persists and adds the inner-memo gap |

---

## PERF-FE-002 — Global AppProviders ships 8 providers to every route

| Field | Value |
|---|---|
| Status | STATIC-CONFIRMED |
| Priority | **P2** |
| Surface | `src/app/layout.tsx:39`, `src/app/providers.tsx:31-49` |
| Impact | Medium. `AppProviders` is mounted in the root layout → every route including public marketing, auth, share, and admin receives all 8 providers' JS in the initial bundle: `QueryClientProvider`, `ToastProvider`, `NotificationProvider` (+ statically-imported `ReleaseAnnouncementModal`), `BfcacheHandler`, `PerformanceMonitor`, `NavigationListener`, `RealtimeAuthBridge` (no-op), `WebVitalsCollector`, `RouteLoadingOverlay`. Public marketing routes do not need notifications, realtime, or route-loading overlay machinery. |
| Evidence | `providers.tsx:35-46` composition; `layout.tsx:39` mount point; `NotificationProvider.tsx:6` statically imports `ReleaseAnnouncementModal`. |
| Source | `src/app/layout.tsx:39`; `src/app/providers.tsx:31-49`; `src/features/notifications/components/NotificationProvider.tsx:6` |
| Reproduction | `grep -n 'AppProviders' src/app/layout.tsx`; `cat src/app/providers.tsx` |
| Baseline | All 8 providers ship globally |
| Target | Public routes ship only the providers they need (QueryClient, bfcache, web-vitals); workshop routes add Toast/Notification/RouteLoadingOverlay/RealtimeAuthBridge via a workshop-scoped provider |
| Root cause | Single global provider tree with no route scoping |
| Recommendation | (1) Split `AppProviders` into `PublicProviders` (QueryClient + Bfcache + WebVitals) and `WorkshopProviders` (Toast + Notification + NavigationListener + RealtimeAuthBridge + RouteLoadingOverlay). (2) Mount `WorkshopProviders` in `src/app/workshop/layout.tsx`. (3) Remove `RealtimeAuthBridge` entirely (it returns `null` and is documented as transitional — K-06). (4) Move `ReleaseAnnouncementModal` to `next/dynamic` import inside the workshop surface. |
| Expected improvement | HYPOTHESIS — measurable main-bundle reduction on `/`, `/share/*`, `/auth/*`. Magnitude requires `ANALYZE=true bun run build` (BLOCKED — user-gated). |
| Constraints | Toast/notification functionality must remain in the workshop. Auth/share routes must continue to render correctly. |
| Effort | M |
| Risk | Medium (provider relocation can subtly break context inheritance; needs characterization test) |
| Dependencies | Plan 026 god-component decomposition is a natural pairing; bundle baseline from Plan 001 |
| Verification | Bundle analyzer route bytes for `/`, `/share/[token]`, `/auth/login` before/after. |
| Existing-plan relation | New (K-05, K-06 in the prompt). Extends the spirit of Plan 026. |

---

## PERF-EXP-001 — XLSX export double-buffer copy + STORE-mode uncompressed ZIP

| Field | Value |
|---|---|
| Status | STATIC-CONFIRMED |
| Priority | **P2** |
| Surface | `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts:128-130`; `src/lib/proposal-export/xlsx-workbook.ts:230,613,662,684` |
| Impact | Medium. Two compounding costs: (a) `createXlsxResponse` allocates a second `ArrayBuffer(buffer.byteLength)` and copies the entire XLSX bytes via `new Uint8Array(body).set(buffer)` — peak memory is 2× the workbook size. At the documented ceiling (50 tabs / 1,200 nodes / 3,000 rows) this is the dominant memory pressure point. (b) The custom OOXML writer uses STORE-mode ZIP (no compression) → payloads are larger than necessary over the wire. |
| Evidence | `route.ts:128-130` `const body = new ArrayBuffer(buffer.byteLength); new Uint8Array(body).set(buffer);`; `xlsx-workbook.ts:230,613,662,684` STORE-mode flags. Custom OOXML (not ExcelJS despite the package.json dep). |
| Source | `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts:128-130`; `src/lib/proposal-export/xlsx-workbook.ts:230,613,662,684,775-778` |
| Reproduction | Read the cited lines. |
| Baseline | 2× peak memory of workbook size; uncompressed ZIP payload |
| Target | 1× memory (zero-copy Response from the Uint8Array); DEFLATE-compressed ZIP |
| Root cause | Defensive copy pattern + compression disabled (likely a correctness/simplicity choice) |
| Recommendation | (1) Return the `Uint8Array` directly as the Response body — `new Response(buffer, {...})` accepts a `BufferSource`. Drop the manual `ArrayBuffer` allocation. (2) Optionally switch the ZIP to DEFLATE once a Workers-compatible deflate path is verified. (3) Instrument peak RSS during 3,000-row export. |
| Expected improvement | ~50% peak memory reduction; smaller payloads; same correctness. |
| Constraints | Preserve content-disposition filename; preserve `force-dynamic`; preserve all-tabs mode semantics. |
| Effort | S (the buffer copy) / M (the ZIP compression) |
| Risk | Low (buffer) / Medium (compression — needs Workers deflate validation) |
| Dependencies | None |
| Verification | Local production build + curl the export route with a 3,000-row fixture (browser/build gate — BLOCKED); measure `process.memoryUsage()` peak. |
| Existing-plan relation | New (K-13 in the prompt) |

---

## PERF-PUB-001 — Recipient invitation emails block the publication request path

| Field | Value |
|---|---|
| Status | STATIC-CONFIRMED |
| Priority | **P2** |
| Surface | `src/lib/publication/actions.ts:1453,1552,1586` |
| Impact | Medium-frequency UX + reliability. `addSharedLinkRecipients` processes up to 50 recipients with bounded concurrency 4 via `mapWithBoundedConcurrency`; each iteration does an INSERT then `await sendSharedLinkRecipientInvitationEmail` inline. At 50 recipients / 4 concurrency = ~13 sequential external email round-trips on the request path + ~50-100 D1 writes. Workshop UI stalls; Workers CPU/wall-clock risk; partial-commit on mid-loop failure with no replay. |
| Evidence | `actions.ts:1552` `mapWithBoundedConcurrency(allowedRecipients, SHARED_LINK_RECIPIENT_ADD_CONCURRENCY, ...)`; `:1586` `await sendSharedLinkRecipientInvitationEmail({...})` inside the iteration. Same pattern in `resendSharedLinkRecipientEmail` (`:1712`) and digest path. |
| Source | `src/lib/publication/actions.ts:1453,1552,1586,1655,1712,1896`; `recipient-limits.ts:1` (`SHARED_LINK_RECIPIENT_ACTION_LIMIT = 50`); exemplar durable consumer at `src/lib/cloudflare/client-portal-notification-queue.ts` |
| Reproduction | Read the cited lines. |
| Baseline | ~13 sequential email sends + ~50 inserts on the request path |
| Target | Inserts return immediately; email sends go through the existing notification queue (lease-token + state machine + DLQ) |
| Root cause | Inline await pattern instead of durable outbox |
| Recommendation | Execute the existing Plan 021 as written: route recipient email sends through `CLIENT_PORTAL_NOTIFICATIONS_QUEUE` (the exemplar is already built). Insert recipients as "pending send", enqueue per-recipient send jobs, the consumer calls `sendSharedLinkRecipientInvitationEmail` and flips `delivery_status` to `sent` / `failed`. |
| Expected improvement | Request returns in <500 ms regardless of recipient count; delivery is durable and observable. |
| Constraints | Preserve per-recipient token hashing; preserve idempotent insert (unique pub+email); preserve partial-failure UI feedback. |
| Effort | M |
| Risk | Medium (publication surface) |
| Dependencies | None (queue exists) |
| Verification | Worker tail during a 50-recipient publish; observe response latency and queue depth. |
| Existing-plan relation | **Confirms existing Plan 021** — original plan identified the exact issue; verified still current |

---

## PERF-FE-003 — `useEstimateRowUpdateBroadcast` is dead code (no receive-side consumer)

| Field | Value |
|---|---|
| Status | STATIC-CONFIRMED |
| Priority | **P3** |
| Surface | `src/hooks/use-estimate-row-update-broadcast.ts:77,91` |
| Impact | Low. The hook is exported and `shouldApplyEstimateRowUpdateBroadcast` is exported but a grep finds no consumer outside the file. The realtime row-update broadcast infrastructure exists but is not wired in. Bundle ships the dead module. |
| Evidence | `use-estimate-row-update-broadcast.ts:91` exports `useEstimateRowUpdateBroadcast`; `:77` exports `shouldApplyEstimateRowUpdateBroadcast`; no callers in src/. |
| Source | `src/hooks/use-estimate-row-update-broadcast.ts` |
| Reproduction | `grep -rn 'useEstimateRowUpdateBroadcast\|shouldApplyEstimateRowUpdateBroadcast' src/` |
| Baseline | Dead module shipped |
| Target | Either wire the receive side or delete the hook |
| Root cause | Incomplete feature |
| Recommendation | Either complete the feature (wire receive side into `useEstimateRowMutations` for live multi-collaborator row updates) or delete the hook. Defer until realtime row updates are product-required. |
| Expected improvement | Marginal bundle reduction if deleted; functional realtime row updates if completed. |
| Constraints | None |
| Effort | XS (delete) / L (complete) |
| Risk | Low |
| Dependencies | None |
| Verification | `grep` for callers after change. |
| Existing-plan relation | New |

---

## PERF-DOC-001 — `collect-live-db-performance-evidence.ts` and 2 other scripts still reference Supabase/Postgres

| Field | Value |
|---|---|
| Status | STALE |
| Priority | **P3** |
| Surface | `scripts/collect-live-db-performance-evidence.ts`, `scripts/audit-dbidx-repo.ts`, `scripts/explain-estimate-list-summaries.mjs`; also `scripts/measure-workshop-dashboard-query-count.ts` reads `supabaseRoundTrips` field |
| Impact | Misleading. Running `bun run perf:collect-live-evidence` instructs `supabase db query --linked` and `psql` — provider-era commands that do not work against D1. Agents following these instructions waste cycles or hallucinate evidence. The field name `supabaseRoundTrips` in perf traces is also stale (live runtime is D1). |
| Evidence | `collect-live-db-performance-evidence.ts` Modes section documents `linked` mode = `supabase db query --linked` and `local` mode = `psql`. K-08 confirmed. |
| Source | 4 script files listed above |
| Reproduction | `head -30 scripts/collect-live-db-performance-evidence.ts` |
| Baseline | Provider-era tooling targeting Supabase/Postgres |
| Target | D1/SQLite-specific evidence strategy using `wrangler d1 execute` and `EXPLAIN QUERY PLAN` |
| Root cause | Provider exit left these scripts unreplaced |
| Recommendation | (1) Replace `collect-live-db-performance-evidence.ts` with a D1 equivalent that uses `wrangler d1 execute ARCH_DB --command --remote` for SELECT-only catalog/counts queries and `EXPLAIN QUERY PLAN` for plans. (2) Rename the `supabaseRoundTrips` trace field to `d1RoundTrips` (or `databaseRoundTrips`) and update emitters/consumers. (3) Mark the legacy scripts as deprecated or move to a `legacy/` subdir if historical reference is wanted. |
| Expected improvement | Agents and operators run the correct evidence commands; no false claims from Postgres-only tooling. |
| Constraints | Do not run destructive D1 commands. SELECT-only catalog queries. |
| Effort | M |
| Risk | Low |
| Dependencies | None |
| Verification | New script runs successfully against local Wrangler D1. |
| Existing-plan relation | New (K-08 in the prompt) |

---

## PERF-DOC-002 — Performance budget doc references Postgres/Vercel/Supabase-era assumptions

| Field | Value |
|---|---|
| Status | STALE |
| Priority | **P3** |
| Surface | `.ai/01_roadmap/27-performance-budget-and-regression-gates.md` |
| Impact | Misleading. The doc still says "Vercel Functions have 60s max (Hobby)" (line 25), references `@supabase/ssr` as "acceptable in main bundle" (line 183), and documents `security_rate_limit_events` as a "Postgres table" (line 226). The runtime is Cloudflare Workers + D1. Agents extending this doc inherit stale guidance. |
| Evidence | `:25` Vercel reference; `:183` `@supabase/ssr`; `:226` Postgres table. |
| Source | `.ai/01_roadmap/27-performance-budget-and-regression-gates.md` |
| Reproduction | `grep -nE 'Vercel|supabase|Postgres|psql' .ai/01_roadmap/27-performance-budget-and-regression-gates.md` |
| Baseline | Mixed Cloudflare/Postgres-era language |
| Target | Single-source-of-truth Cloudflare/D1 budget doc |
| Root cause | Provider exit left the doc unreconciled |
| Recommendation | Sweep for Vercel/Supabase/Postgres references; replace with Cloudflare Workers/D1/R2/Queues/DOs equivalents. Note: `security_rate_limit_events` is a D1 table now. |
| Expected improvement | Consistent guidance; fewer agent missteps. |
| Constraints | Preserve the numeric budgets themselves (they remain useful as hypotheses). |
| Effort | S |
| Risk | Low |
| Dependencies | None |
| Verification | `grep -nE 'Vercel|supabase|Postgres'` returns zero hits after sweep. |
| Existing-plan relation | New (extends K-15) |

---

## PERF-D1-003 — Library full-load paginated scan has no covering index for `ORDER BY category, name`

| Field | Value |
|---|---|
| Status | STATIC-CONFIRMED |
| Priority | **P2** |
| Surface | `src/lib/repositories/component-library-repository.ts:561-575` |
| Impact | Medium. The legacy full-library load path (when `itemLimit` and `itemIds` are both undefined) paginates 1,000 rows/page through `cost_library_items` ordered by `(category ASC, name ASC) LIMIT ? OFFSET ?` in a while loop. Existing indexes (`(workspace_id, lifecycle_state, updated_at DESC)`, `(workspace_id, library_folder_id, name)`, partial `(workspace_id, created_at DESC, id ASC) WHERE lifecycle_state <> 'archived'` from migration 0083) **do not cover `ORDER BY category, name`**. Each page = full workspace scan + sort. At the Large tier (10,000 items) this is 10 full scans. |
| Evidence | `component-library-repository.ts:561-575` while-loop; `:542,555,570` ORDER BY `category ASC, name ASC`; migrations `0026:67-73` + `0083:1-3` confirm no `(workspace_id, category, name)` index exists. |
| Source | `src/lib/repositories/component-library-repository.ts:542,555,561-575,293`; supporting index evidence at `migrations/0083_component_library_browse_cursor_index.sql:1-3` (cursor index `(workspace_id, created_at DESC, id ASC) WHERE lifecycle_state <> 'archived'`); the existing `(workspace_id, library_folder_id, name)` index comes from an earlier migration. **2nd-pass correction**: an earlier draft cited `migrations/0026_cost_library_indexes.sql` which does not exist; the real filename is `0026_component_promotion_support.sql`. The index claims are unaffected — they rest on `0083` and the older library-folder index. |
| Reproduction | `sed -n '540,580p' src/lib/repositories/component-library-repository.ts` |
| Baseline | Each 1,000-row page is a full workspace scan + sort; ~10 scans at Large tier |
| Target | Index that covers `(workspace_id, lifecycle_state, category, name)` OR redesign the load path to use the existing cursor index |
| Root cause | Browse path added a `(workspace_id, created_at DESC, id ASC)` cursor index in 0083 but the legacy full-load path was not migrated to use it |
| Recommendation | (1) Confirm with `EXPLAIN QUERY PLAN` (BLOCKED — hosted credentials) whether the existing cursor index is being used or bypassed. (2) If bypassed, migrate the legacy load path to use the cursor index. (3) If a new compound index is justified by EXPLAIN, add `(workspace_id, lifecycle_state, category, name)` with a migration and write-plan. **Do not add the index speculatively** — needs EXPLAIN before/after per AGENTS.md. |
| Expected improvement | HYPOTHESIS — page latency drops if scan eliminated; magnitude needs EXPLAIN. |
| Constraints | Preserve exact ordering semantics; preserve workspace scoping; preserve lifecycle filter. |
| Effort | S (path migration) / M (new index with EXPLAIN proof) |
| Risk | Low (path) / Medium (new index — write/storage cost) |
| Dependencies | EXPLAIN QUERY PLAN against representative data (BLOCKED W0-6) |
| Verification | `EXPLAIN QUERY PLAN` before/after; query latency p50/p95 at Large tier (10,000 items). |
| Existing-plan relation | New — discovered by D1 agent recon |

---

## PERF-D1-004 — Component-source guard issues 15+ `json_extract` correlations per propagation job

| Field | Value |
|---|---|
| Status | STATIC-CONFIRMED |
| Priority | **P3** |
| Surface | `src/lib/component-library/template-propagation-d1.ts:472-502,503-519` |
| Impact | Low-medium. Inside each propagation job's atomic batch, two guards (`component-source` and `row-revision`) issue nested `json_each` driving into three joined tables (`cost_library_items`, `cost_library_item_price_options`, `cost_library_item_variant_cost_entries`) with ~15 `json_extract` predicates each. D1 will iterate the expected array and re-scan each table per element. Scales with components-per-template × active linked instances. |
| Evidence | `template-propagation-d1.ts:472-502` (component-source guard); `:503-519` (row-revision guard). Both inside `applyClaimedJob` batch. |
| Source | `src/lib/component-library/template-propagation-d1.ts:472-519` |
| Reproduction | `sed -n '470,520p' src/lib/component-library/template-propagation-d1.ts` |
| Baseline | ~15 json_extract predicates × 3 joined tables per guard; 2 guards per propagation job |
| Target | Either pre-resolve the expected array into a temp table, or restructure as a single set-based anti-join |
| Root cause | JSON-driven guard pattern matching each expected component field-by-field |
| Recommendation | (1) Confirm with EXPLAIN (BLOCKED). (2) If the guard is hot, consider pre-resolving the expected array into a `WITH expected(itemId, ...) AS (SELECT json_extract(value, '$.itemId'), ... FROM json_each(?))` CTE so each table scans once. |
| Expected improvement | HYPOTHESIS — propagation job wall-time reduction at large component counts. |
| Constraints | Preserve guard correctness (must catch missing/drifted component sources). |
| Effort | M |
| Risk | Medium (mutation correctness surface) |
| Dependencies | EXPLAIN QUERY PLAN (BLOCKED); K-10 fanout proof |
| Verification | EXPLAIN before/after; propagation convergence time at 500-instance / 100-row-template tier. |
| Existing-plan relation | New (sub-finding of K-10) |

---

## REJECTED findings (recorded so they are not re-audited)

| ID | Claim | Why rejected |
|---|---|---|
| REJ-01 | `staticPublicPageMemoryCache` is an unbounded memory leak | Bounded to 10 keys (the marketing path list at `worker-route-optimizations.ts:3-14`). Each entry is one HTML page. Per-isolate worst case ≈ 10 pages. Not a leak; not worth a TTL. |
| REJ-02 | 12 eslint errors include cascading-render React hooks violations | Inspected each: `AdminCommandPalette` setState-in-effect is for input focus/reset; `activity-history.tsx:1147` and `ProposalRow.tsx:92` use the latest-callback-ref pattern (intentional fix for cascading renders). `AdminSupportInbox.tsx:41` and `use-landing-auth-hint.ts:18` are minor. None represent measurable perf cost. |
| REJ-03 | `head_sampling_rate=1` is excessive | Workers observability cost is modest at alpha scale. Tighten at public launch, not before. See `08-PERFORMANCE-BUDGETS-AND-REGRESSION-GATES.md` for the staged plan. |
| REJ-04 | Static page Worker cache duplicates Cloudflare assets binding | Static assets (JS/CSS/images) are served by `ASSETS` binding pre-Worker. The Worker cache is for HTML route responses, which is a different surface. Both are needed. |

## Summary count

| Status | Count |
|---|---:|
| STATIC-CONFIRMED | 13 |
| MEASURED | 0 (all browser/D1 runtime claims are HYPOTHESIS/BLOCKED without user gates) |
| HYPOTHESIS | 0 (the HYPOTHESIS-tagged improvements above are sub-fields of STATIC-CONFIRMED findings) |
| BLOCKED | 0 as a top-level status (blocked evidence is enumerated in `10-BLOCKED-EVIDENCE-AND-AUTHORIZATION-NEEDED.md`) |
| REJECTED | 4 |
| STALE | 2 |

| Priority | Count |
|---|---:|
| P0 | 1 |
| P1 | 2 |
| P2 | 9 |
| P3 | 4 |
| **TOTAL actionable** | **16** |

Findings machine-readable: `artifacts/findings.json`.

# 04 — Shared-Link Performance Audit

**Date:** 2026-06-13
**Author role:** Performance engineer (planning/audit only — no code changed)
**Scope:** Public shared-link surface `/share/[token]` and its supporting repository, snapshot, chart, tree, image, and API-route code.
**Stack (verified):** Next.js `16.2.6`, React `19.2.6`, Bun, Supabase/Postgres, `d3-shape`, `@phosphor-icons/react ^2.1.10` (`package.json`).

> **MEASUREMENT DISCLAIMER (read first):** No benchmarks, Lighthouse runs, profiling, `EXPLAIN ANALYZE`, or bundle-analyzer output have been collected for this audit. **Every numeric performance figure in this document is a TARGET or an ESTIMATE and is explicitly labelled as such.** No number here is a measurement. Behavioural claims are cited to `file:line`; anything not directly read is tagged `[INFERRED]` or `[NEEDS VERIFICATION]`.

---

## 1. Summary & current-state verdict

The public share page is **fully server-rendered on every visit with zero caching** (`src/app/share/[token]/page.tsx:42`, `export const dynamic = "force-dynamic"`) and performs **a strictly sequential chain of awaited Supabase round-trips before it can return a single byte**, including **two telemetry writes that block the response** (`page.tsx:188`, `page.tsx:196`). The data being served — a `project_publications.snapshot_json` JSONB blob — is **immutable for the life of a `snapshot_version`**, which makes the current "no cache, re-render everything, re-query everything" model the single largest, most avoidable cost on the hot path.

Verdict: **the correctness and security posture are solid, but the hot path is structurally inefficient.** The dominant issues are (a) blocking writes on first-byte, (b) redundant repeated lookups of the same publication row (the token row is `SELECT`-ed up to **4 times** per visit), (c) a fresh service-role Supabase client constructed per repository call (no reuse), and (d) no caching layer despite an immutable, version-keyed payload. None of these require schema changes to fix; the highest-impact wins (`after()` for telemetry, client reuse, de-duplicating lookups) are non-breaking quick wins. Caching the immutable snapshot is the larger, higher-payoff move but must respect the existing security rule that tokenized snapshots must never sit in a *public/shared* cache (prior doc, `06-performance-and-observability-plan.md:233`, `:241`).

The client bundle is moderately heavy for a "read-only proposal" page: it ships D3 (`d3-shape`), Phosphor icons, a full client-side tree-reconstruction engine, and several `"use client"` components, then does **client-side tree reconstruction + chart geometry compute on the main thread** (`SharePageTabs.tsx`, `reconstruct-share-tree.ts`, `CostDonutChart.tsx`). With no streaming/Suspense, all of this lands after a TTFB that is already inflated by the serial DB chain.

---

## 2. Request lifecycle map (server-side hot path)

Ordered awaited operations for a **happy-path, no-password, returning-recipient** visit to `SharePage` (`src/app/share/[token]/page.tsx`). R = read, W = write. "Blocks first byte" = the `await` sits before the component `return` at `page.tsx:204`, so the HTML response cannot begin until it resolves.

| # | Operation | file:line | R/W | New service client? | Blocks first byte? | Notes |
|---|-----------|-----------|-----|---------------------|--------------------|-------|
| 0 | `generateMetadata` runs **independently** and re-resolves access **+ snapshot** | `page.tsx:230-271` (calls `resolveProjectPublicationAccessByToken` `:234`, `resolveProjectPublicationSnapshotByToken` `:242`) | R×2 | yes ×2 | **Separate from the render path.** Next runs metadata + page concurrently, but each re-reads the publication row and the full snapshot independently → effectively **doubles** the snapshot SELECT per visit. `[INFERRED]` that Next does not dedupe these (no `cache()`/`React.cache` wrapper present). |
| 1 | `await params` / `await searchParams` | `page.tsx:123-124` | — | — | yes | Trivial. |
| 2 | `resolveProjectPublicationAccessByToken(token)` — `SELECT id,status,password_hash,expires_at,revoked_at,snapshot_version … .eq(token_hash).maybeSingle()` | `page.tsx:130` → `public-repository.ts:472-486` | R | **yes** (`createPublicationServiceClient` `:475`) | yes | First token-row lookup. |
| 3 | (password branch only) `cookies()` verify + on miss `recordProjectPublicationAnalyticsEvent(password_gate_viewed)` then early return | `page.tsx:133-151` | W (gated) | yes | yes | Only on protected links without a valid access cookie. The analytics write itself re-SELECTs the publication row (`public-repository.ts:544-548`). |
| 4 | (returning recipient) `cookies()` + verify session cookie, then `resolveSharedLinkRecipientIdentity` — `SELECT id,email,display_name FROM shared_link_recipients` | `page.tsx:161-181` → `public-repository.ts:723-748` | R | **yes** (`:732`) | yes | Only runs when a valid session cookie is present and no `?recipient=` param. |
| 5 | `resolveProjectPublicationSnapshotByToken(token)` — `SELECT … , snapshot_json … .eq(token_hash).maybeSingle()` then `sanitizeProjectPublicationSnapshotForPublicRead` | `page.tsx:183` → `public-repository.ts:488-505` | R | **yes** (`:491`) | yes | **Pulls the entire `snapshot_json` blob** (all estimates/nodes/rows). Second token-row lookup (re-fetches the same row as #2, plus the blob). Then runs a full `.map` sanitize pass over every estimate/tab/row (`snapshot.ts:112-133`). |
| 6 | `headers()` | `page.tsx:186` | — | — | yes | |
| 7 | **`recordProjectPublicationAnalyticsEvent(page_visit)`** | `page.tsx:188-195` → `public-repository.ts:524-568` | **W** | **yes** (`:543`) | **YES — blocking telemetry write #1** | Flag-gated (`isProjectPublicationAccessTelemetryEnabled` `:541`); if disabled it returns early *but still after* a function call. When enabled: **re-SELECTs the publication row a 3rd time** (`:544-548`) then `INSERT` into `project_publication_events` (`:558`). |
| 8 | **`recordProjectPublicationEvent(open)`** | `page.tsx:196-202` → `public-repository.ts:570-636` | **W** | **yes** (`:583`) | **YES — blocking telemetry write #2** | **NOT flag-gated** — always runs. **Re-SELECTs the publication row a 4th time** (`:584-588`), `INSERT` into `project_publication_events` (`:597`), then on `eventType==="open"` an **RPC `increment_project_publication_open`** (`:607`), and if a recipient is known a **further `UPDATE shared_link_recipients` + INSERT `shared_link_events`** (`:614-633`). This is the single heaviest blocking step: up to **1 SELECT + 1 INSERT + 1 RPC + 1 UPDATE + 1 INSERT = 5 serial DB ops** gating the HTML. |
| 9 | `return <ProjectPublicationView …>` | `page.tsx:204-211` | — | — | — | First byte can finally flush. |

**Hot-path round-trip tally (happy path, telemetry ON, returning recipient):**
- Publication-row SELECTs of the *same row*: **#2, #5, #7, #8 = 4** (plus 2 more in `generateMetadata` #0 → up to **6** identical token-row reads per visit). `[INFERRED]` count from the per-function `createPublicationServiceClient` + `.eq("token_hash").maybeSingle()` pattern repeated in each function.
- Distinct service-role clients constructed: **≥5 on the render path** + **2 in metadata** (one per repository call; `createPublicationServiceClient` is called inside every function, never memoised).
- Writes blocking first byte: **2** (steps #7, #8), expanding to as many as **7 serial write-side DB ops** when telemetry is on and a recipient is known.

**Post-hydration client round-trips** (do not block first byte, but add to interaction cost):
- `SharePageComments` `GET /api/share/[token]/comment` on mount — **only when `useSharedLinkSession().isValid` is true** (`SharePageComments.tsx:87-131`; hook is cookie-only, no network, `use-shared-link-session.ts`). 
- `SharePageDecision` `GET /api/share/[token]/decision` on mount under the same session gate (`SharePageDecision.tsx:66`). 
- `SharePageRecipientSessionInitializer` `POST /api/share/[token]/session` when arriving via `?recipient=` (sets cookie; that route also runs a blocking analytics write `session/route.ts:92-99`).
- The `/events` route exists (`api/share/[token]/events/route.ts`) but prior research notes it is **unused by the share page** (memory obs 5207); the page records "open" server-side instead.

---

## 3. Findings

Severity scale: **Critical** (likely user-perceptible latency on every visit / scales badly) · **High** · **Medium** · **Low**.

### PERF-01 — `force-dynamic` with zero caching on an immutable, version-keyed payload — **High**
`src/app/share/[token]/page.tsx:42`. Every visit fully re-renders and re-queries. The served data (`snapshot_json`) is immutable per `snapshot_version` (`public-repository.ts:18-27`, `:488-505`; version bumped only on republish). Re-doing the full SELECT + sanitize + render on every refresh, every recipient, every bot/preview hit is pure waste. **Impact:** every visit pays the full serial DB chain + JSONB transfer + sanitize. **TARGET:** warm-path TTFB reduced by a large margin (TARGET: cache hit serves snapshot without re-querying `snapshot_json`).

### PERF-02 — Two telemetry writes block first byte (TTFB cost) — **Critical**
`page.tsx:188` (`recordProjectPublicationAnalyticsEvent`) and `page.tsx:196` (`recordProjectPublicationEvent`) are both `await`-ed before `return` (`:204`). Write #2 is the worst: SELECT + INSERT + RPC (`increment_project_publication_open` `:607`) + conditional UPDATE + INSERT (`:614-633`) — up to 5 serial ops, all gating HTML. Telemetry is observational; it has no reason to delay first byte. **Impact:** directly inflates TTFB on every visit by the cost of these writes (TARGET-relevant: this is the most actionable TTFB win). **Note for DB:** write #2 is **not** flag-gated, unlike write #1 (`:541` vs no gate at `:570`).

### PERF-03 — Same publication row SELECT-ed up to 4–6× per visit — **High**
`resolveProjectPublicationAccessByToken` (`:476`), `resolveProjectPublicationSnapshotByToken` (`:492`), `recordProjectPublicationAnalyticsEvent` (`:544`), `recordProjectPublicationEvent` (`:584`) each independently run `.from("project_publications").eq("token_hash", …).maybeSingle()`. Plus `generateMetadata` repeats access+snapshot (`page.tsx:234`, `:242`). All resolve the **identical row** keyed on the same `token_hash`. There is no `React.cache`/request-memoisation wrapper. **Impact:** 4–6 redundant indexed point-lookups per visit; also 2 full `snapshot_json` reads (render + metadata). **TARGET:** collapse to 1 access lookup + 1 snapshot read per request.

### PERF-04 — Per-call service-role client construction, no pooling/reuse — **Medium**
`createPublicationServiceClient()` (`public-repository.ts:57-75`) is invoked **inside every repository function** (`:475, :491, :510, :543, :583, :649, :688, :732, :757, :791, :832, :888`, plus rate-limit helpers `:191, :208, :230, :241`). The render path alone constructs ≥5 distinct `@supabase/supabase-js` clients per request; metadata adds 2 more. Each `createClient` allocates its own fetch/PostgREST wrapper. `@supabase/supabase-js` uses stateless HTTP (PostgREST) so there is no DB connection pool per se, but per-request client allocation is still avoidable object/closure churn and prevents any client-level reuse. **Impact:** [INFERRED] modest per-request CPU/alloc overhead that scales linearly with the redundant call count in PERF-03. **TARGET:** one client per request (or a module singleton, given service-role config is static).

### PERF-05 — Full denormalized snapshot loaded & transferred on every read; size unbounded — **High**
`snapshot_json` contains `estimates[]` each with `rows[]` (description, designation, discipline, material, qty, unit, rowTotal, imageUrl, nodeId, tabId), `treeNodes`, and per-`tabs[]` duplicated `rows`/`treeNodes` (`snapshot.ts:179-249`, types in `lib/publication/types.ts`). For tab-bearing estimates the snapshot stores rows **twice** — once at estimate level (`buildSnapshotEstimate` rows `:204`) and once per tab (`tabRows` `:227-236`) — inflating both stored bytes and the bytes serialized into the server-rendered HTML and shipped to the client (`SharePageTabs` receives the whole `snapshot.estimates` array, `page.tsx:79-83`). **Impact:** payload size grows with rows × tabs; the full blob is read from Postgres, sanitized (`:112-133`), embedded in the RSC/HTML payload, and re-parsed client-side. **TARGET:** measure real snapshot sizes; cap/lazy-load very large sheets. `[NEEDS VERIFICATION]` actual byte sizes (no production sample measured).

### PERF-06 — Client-side tree reconstruction + chart geometry on the main thread — **Medium**
On the client, `SharePageTabs` rebuilds the hierarchy on every active-tab/row change: `getBestShareTree(activeContentRows, activeContentTreeNodes)` → `reconstructTreeFromRows`/`buildShareTreeFromSnapshotNodes` (`reconstruct-share-tree.ts:81-354`), wrapped by `wrapTreeWithRoot` which **deep-clones the whole tree** (`:376-409`, `bumpDepth` recursion). It is `useMemo`-guarded (`SharePageTabs.tsx:266-274`) but recomputes whenever `activeContentRows`/label/total change (i.e. every tab switch). The donut also recomputes buckets (`aggregateRowsByDiscipline` `SharePageTabs.tsx:261-264`) and D3 arc/pie geometry + callout layout on every render (`CostDonutChart.tsx:264-285`, `buildCallouts` is **not** memoised). Designation parsing has DoS guards (`MAX_ROWS_FOR_TREE=500`, `MAX_DEPTH=20`, `reconstruct-share-tree.ts:29-33`) so worst case is bounded, but for large sheets the reconstruction falls back to discipline grouping silently. **Impact:** main-thread compute on hydration and on every tab/view switch; contributes to INP. **TARGET:** keep tab-switch interaction work low (INP target in §5).

### PERF-07 — No list virtualization; Grid + Tree render every row — **Medium**
The Grid table maps over `filteredRows` with no windowing (`SharePageTabs.tsx:468-505`) and the Tree View renders every node + every row under each area node (`ShareEstimateTreeView.tsx:87-169`, `WorkshopTree` recursion). `reconstructTreeFromRows` caps tree building at 500 rows, but the **Grid table has no such cap** and renders all `filteredRows`. A `next/image` thumbnail is emitted per row when `imageUrl` is present (`SharePageTabs.tsx:476-487`, `ShareEstimateTreeView.tsx:104-146`). **Impact:** large sheets produce large DOM + many image elements; scroll/layout cost grows linearly. **TARGET:** virtualize when rows exceed a threshold (e.g. > ~150).

### PERF-08 — No streaming / Suspense; everything waits for the serial chain — **Medium**
`SharePage` is a single async component that awaits the whole chain (incl. blocking writes) before returning any markup (`page.tsx:122-211`). There is no `<Suspense>` boundary, no PPR shell, no streamed chart/tree. The static chrome (header skeleton, hero frame) cannot paint until the slowest blocking await resolves. **Impact:** TTFB and LCP are coupled to the worst-case DB chain. **TARGET:** stream a static shell immediately; suspend only the snapshot-dependent content. (Next 16 supports PPR/Cache Components.)

### PERF-09 — Share-route client bundle weight — **Medium**
The route ships, as `"use client"`: `SharePageTabs`, `ShareEstimateTreeView`, `ShareEstimateTreePanel`, `ShareFloatingTreeNav`, `CostDonutChart` (+ `d3-shape`), `SharePageComments`, `SharePageDecision`, `SharePageHero`, `SharePageSessionBanner`, `SharePageRecipientSessionInitializer`, plus `@phosphor-icons/react` icons and the `WorkshopTree` primitives reused from the workshop. `optimizePackageImports: ["@phosphor-icons/react"]` is configured (`next.config.ts:54-56`) which helps icon tree-shaking, but `d3-shape` and the workshop tree machinery are non-trivial. No explicit bundle budget is enforced in `next.config.ts` (analyzer is wired via `ANALYZE=true`, `:107-109`, but not run). **Impact:** [INFERRED] JS transfer/parse cost for a page whose primary job is read-only display. The prior gate set a budget of **<150KB gzipped** for the share route (`07-validation-release-gates.md`); status unverified. **TARGET:** run `ANALYZE=true` build; hold the share entry to a documented gzip budget.

### PERF-10 — Absence of CDN/edge caching for the immutable snapshot (constrained by security) — **High (with caveat)**
Because the page is `force-dynamic` and tokenized, nothing is cacheable at the edge today. The data is immutable per version (cache-friendly), **but** the prior security rule is explicit: tokenized snapshots contain confidential client data behind a bearer token and must **never** use `public`/`stale-while-revalidate`/shared CDN caching (`06-performance-and-observability-plan.md:114`, `:233`, `:241`). **Impact:** the most cache-friendly attribute of the payload cannot be exploited via public CDN. **TARGET:** capture the immutability win via *server-side, key-scoped* caching (`unstable_cache`/Cache Components keyed by `token_hash`+`snapshot_version`) and/or `private` cache headers only after threat-modelling — NOT public CDN. See proposals OPT-5/OPT-6.

### PERF-11 — Image loading is conservative but hero is not prioritized for LCP — **Low**
`SharePageHero` uses `next/image` with `fill`, correct responsive `sizes`, and `loading="lazy"` (`SharePageHero.tsx:31-38`). For a hero that is frequently the **LCP element**, `loading="lazy"` (rather than `priority`) can delay LCP. Row thumbnails are correctly `loading="lazy"` and small (16–32px) (`SharePageTabs.tsx:478-485`, tree views). `next.config.ts` only allows the Supabase `component-images` public path as a remote pattern (`:44-46`); cover images must live under that path or they won't optimize. **Impact:** [INFERRED] potential LCP delay when a cover image is present. **TARGET:** evaluate `priority` for the hero when above the fold (trade-off noted in OPT-9).

### PERF-12 — Owner activity feed loads 4 tables then sorts/paginates in app code — **Low (owner path, off the public hot path)**
`loadSharedLinkActivity` (`actions.ts:1190-1332`) runs 4 parallel queries (`comments`, `responses`, `events`, optional `access telemetry`), each `limit(limit+1)`, then merges, dedupes, sorts, and slices **in JS** (`:1239-1331`). Cursor pagination uses `created_at` with an `id` tiebreaker in the ORDER BY (`:1240-1242`) — good. A benchmark test exists (`tests/vitest/shared-link-activity-benchmark.test.ts`). The prior plan flags a future unified RPC/`UNION ALL` view to avoid app-side merge (`06-performance-and-observability-plan.md:92-107`). **Impact:** owner-only, not recipient-facing; lower priority. **TARGET:** AC-PERF-02 from prior doc (initial 50 items, TARGET P95 < 500ms).

---

## 4. Optimization proposals (prioritized)

For each: **what · expected benefit (qualitative + a labelled TARGET metric) · risk · data/schema impact.** All TARGET numbers are goals to validate post-implementation, not measurements.

### Quick wins (non-breaking, low risk)

**OPT-1 — Move both telemetry writes off the response path with `after()`** *(addresses PERF-02)*
Wrap `recordProjectPublicationAnalyticsEvent` and `recordProjectPublicationEvent` in `import { after } from "next/server"` so they run **after the response is sent** instead of blocking `return` (`page.tsx:188-202`). Next 16 supports `after()`.
- **Benefit:** removes the heaviest blocking step (up to 5 serial DB ops) from TTFB. **TARGET:** server TTFB reduced to the access+snapshot read cost only (TARGET: blocking write contribution → ~0ms on first byte).
- **Risk:** Low. Telemetry becomes best-effort (a crash after response could drop an event) — acceptable for analytics. The `increment_project_publication_open` RPC and recipient `last_opened_at` update become slightly delayed, not lost. Verify `after()` callbacks still have request context (headers already captured into a `Request` object at `page.tsx:186-187`, so they do).
- **Data/schema:** none.

**OPT-2 — De-duplicate the publication-row lookup with `React.cache` / per-request memoisation** *(addresses PERF-03, partially PERF-01)*
Wrap `resolveProjectPublicationAccessByToken` (and ideally the snapshot resolver) in React `cache()` so the 4–6 identical `token_hash` lookups across page render + metadata + telemetry collapse to one per request. Pass the already-resolved access object into the telemetry functions instead of re-querying inside them (`public-repository.ts:544`, `:584`).
- **Benefit:** eliminates 3–5 redundant indexed point-lookups and one duplicate `snapshot_json` read (metadata). **TARGET:** publication-row reads per visit 6 → 1; snapshot reads 2 → 1.
- **Risk:** Low–Medium. Requires threading the resolved row through the telemetry helpers (minor signature change) or memoising at the data layer. Must ensure `cache()` scope is per-request (it is, in RSC).
- **Data/schema:** none.

**OPT-3 — Single service client per request** *(addresses PERF-04)*
Resolve one `createPublicationServiceClient()` per request (e.g. via `React.cache(() => createPublicationServiceClient())`) and pass it down, or use a module-level singleton since the config is fully static (`public-repository.ts:57-75`).
- **Benefit:** removes ≥5 redundant client allocations per render. **TARGET:** 1 client/request.
- **Risk:** Low. A module singleton is safe for a service-role client with `persistSession:false` (`:65-67`); confirm no per-request header mutation is needed (none observed).
- **Data/schema:** none.

**OPT-4 — Parallelize the independent reads that remain** *(addresses PERF-02/-03 tail)*
After OPT-1/OPT-2, the recipient-identity read (`page.tsx:175`) and the snapshot read (`page.tsx:183`) are independent once access is known and can run with `Promise.all` rather than sequentially.
- **Benefit:** collapses two serial reads into one round-trip latency. **TARGET:** save one DB round-trip from the critical path.
- **Risk:** Low. Recipient read is conditional; structure with `Promise.all([snapshotP, recipientP])`.
- **Data/schema:** none.

### Medium

**OPT-5 — Server-side, version-keyed cache for the immutable snapshot** *(addresses PERF-01, PERF-10, PERF-05)*
Cache the resolved+sanitized snapshot keyed by `token_hash` + `snapshot_version` using `unstable_cache`/Next Cache Components with a `cacheTag` per publication, invalidated on republish/rotate/revoke (the owner-side mutation paths in `actions.ts`). This is **server-side and key-scoped**, not public CDN, so it stays within the security rule (`06-performance-and-observability-plan.md:241`).
- **Benefit:** warm visits skip the full `snapshot_json` SELECT + sanitize. **TARGET:** warm-path snapshot resolution served from cache (TARGET: eliminate the JSONB read + sanitize on cache hit). 
- **Risk:** Medium. Must invalidate on every publish/republish/rotate/revoke or recipients see stale/over-shared data — a **correctness/security** risk if mishandled. Revocation must bypass/clear cache immediately (cross-cutting note for security). Access/active-state check (`isActivePublication`, expiry/revoke) must **not** be cached — only the snapshot bytes for a known-active version.
- **Data/schema:** none required; optionally add a stored `snapshot_hash` for cheap staleness checks (prior doc `:116`) — that *would* be a schema add (defer; see DB note).

**OPT-6 — Stream a static shell with Suspense / PPR** *(addresses PERF-08)*
Render the page chrome (proposal header frame, hero container, tab skeleton) immediately and wrap the snapshot-dependent `SharePageTabs`/content in `<Suspense>` so the slow data resolves without blocking first paint. With Next 16 PPR, the static shell can be prerendered.
- **Benefit:** decouples LCP/first paint from the DB chain. **TARGET:** static shell visible quickly; TARGET LCP ≤ 2.5s (matches prior gate).
- **Risk:** Medium. Layout-shift risk if skeleton dimensions don't match content (watch CLS). Interaction model unchanged.
- **Data/schema:** none.

**OPT-7 — De-duplicate rows in tab-bearing snapshots at build time** *(addresses PERF-05)*
Today `buildSnapshotEstimate` stores rows both at estimate level and per tab (`snapshot.ts:204`, `:227-236`); the receiver reads tab rows when a tab is active (`SharePageTabs.tsx:200-203`). Store rows once (by tab) and derive estimate-level aggregates, or vice-versa, to shrink the blob.
- **Benefit:** smaller stored snapshot + smaller RSC/HTML payload + less client parse. **TARGET:** reduce snapshot bytes for multi-tab estimates (TARGET: ~½ row payload for tabbed sheets — validate against real data).
- **Risk:** Medium. Touches snapshot shape → bumps `schemaVersion` (`snapshot.ts:268`) and must keep the legacy sanitize path working for old snapshots (`sanitizeProjectPublicationSnapshotForPublicRead` `:112-133`). Owner-path build change, not hot-path logic.
- **Data/schema:** changes snapshot JSON shape (versioned); no DB column change. Old snapshots must still render.

**OPT-8 — Memoize chart geometry + virtualize large row lists** *(addresses PERF-06, PERF-07)*
Wrap `buildCallouts`/`arcs` in `useMemo` keyed on `data`+`compact`+`activeId` (`CostDonutChart.tsx:279-285`). Virtualize the Grid table (`SharePageTabs.tsx:468`) and the Tree row lists when row count crosses a threshold.
- **Benefit:** lower main-thread work on tab switch and scroll. **TARGET:** keep tab-switch INP within budget (§5); cap rendered DOM nodes for large sheets.
- **Risk:** Low–Medium. Virtualization complicates the existing scroll-to-node nav (`handleTreeNavigate` `SharePageTabs.tsx:94-99`, IntersectionObserver in `ShareFloatingTreeNav.tsx:39-78`) — virtualized nodes must be measurable/observable. Test the floating-nav + scroll-into-view behavior.
- **Data/schema:** none.

### Larger

**OPT-9 — Image strategy for LCP** *(addresses PERF-11)*
When the hero cover is present and above the fold, set `priority` (and drop `loading="lazy"`) on `SharePageHero` (`SharePageHero.tsx:31-38`); confirm cover URLs live under the allowed `component-images` remote pattern (`next.config.ts:44-46`) so they get optimized.
- **Benefit:** faster LCP when a cover exists. **TARGET:** LCP ≤ 2.5s with cover present.
- **Risk:** Low. `priority` increases initial image fetch priority — only apply to the single hero, never row thumbnails. Trade-off: competes with other above-the-fold resources.
- **Data/schema:** none.

**OPT-10 — Owner activity feed unified RPC** *(addresses PERF-12; owner path)*
Replace the 4-query + JS-merge in `loadSharedLinkActivity` (`actions.ts:1239-1331`) with a single `UNION ALL` RPC ordered + limited in Postgres (prior doc `:92-107`).
- **Benefit:** one round-trip, DB-side sort/limit. **TARGET:** AC-PERF-02 — initial 50 items P95 < 500ms (target).
- **Risk:** Medium. New SECURITY DEFINER RPC + owner RBAC must be re-proven; ensure dedupe of access-telemetry events (currently done in JS `:1304-1319`) is reproduced in SQL.
- **Data/schema:** new RPC (DB unit — defer per DB-channel constraint, see cross-cutting note).

---

## 5. Acceptance criteria (measurable TARGETS)

> All numbers below are **TARGETS**, not measurements. Inherit the prior gates where they exist (`07-validation-release-gates.md:69-74`, `12-testing-strategy-plan.md:224`). Measure on a representative snapshot (define "representative" before testing — `[NEEDS VERIFICATION]` what row/estimate counts are typical in production).

| ID | Metric | TARGET | How to measure |
|----|--------|--------|----------------|
| **AC-PERF-01** | Server TTFB, `/share/[token]` warm (no password) | **TARGET P95 < 150ms** (inherits prior gate) | Server timing logs around the render path; WebPageTest/Lighthouse TTFB. Validate after OPT-1/-2/-3. |
| **AC-PERF-02** | Blocking writes on first byte | **TARGET = 0** (telemetry via `after()`) | Code assertion + server timing: no `INSERT`/RPC awaited before `return` (`page.tsx`). |
| **AC-PERF-03** | Publication-row lookups per visit | **TARGET = 1** access read + **1** snapshot read (down from 4–6 / 2) | Query log / Supabase logs per single request; or count `createPublicationServiceClient` calls. |
| **AC-PERF-04** | LCP (cover present, mid-tier mobile, throttled) | **TARGET < 2.5s** (inherits prior gate) | Lighthouse mobile, field/lab. Validate after OPT-6/-9. |
| **AC-PERF-05** | CLS | **TARGET < 0.1** (inherits prior gate) | Lighthouse; verify Suspense skeleton dimensions match content (OPT-6). |
| **AC-PERF-06** | INP on tab switch (sheet/tab change) | **TARGET < 200ms** | Lighthouse INP / manual perf trace of `updateActive`/tab change with chart+tree recompute. Validate after OPT-8. |
| **AC-PERF-07** | Share-route JS transfer (gzipped, first load) | **TARGET ≤ 150KB gzipped** (inherits prior `next-bundle-analyzer` budget) | `ANALYZE=true bun run build` (analyzer wired at `next.config.ts:107-109`). |
| **AC-PERF-08** | Warm-cache snapshot resolution | **TARGET:** cache hit serves snapshot **without** re-reading `snapshot_json` | Verify cache hit path (OPT-5) skips the JSONB SELECT; confirm immediate invalidation on republish/revoke. |
| **AC-PERF-09** | Owner activity feed initial load | **TARGET P95 < 500ms** for first 50 items (inherits AC-PERF-02 prior doc) | Server timing; extend existing `shared-link-activity-benchmark.test.ts`. |

---

## 6. Self-score

Scored against the plan's rubric (see [11_SCORING_AND_INTEGRITY.md](11_SCORING_AND_INTEGRITY.md)): readiness/quality measure whether an engineer can execute without further planning decisions and whether every claim is verified-or-tracked — NOT whether live benchmarks have been run (those are execution-time verifications, by design absent from a planning doc).

| Dimension | Score | Justification | Gap closure |
|-----------|-------|---------------|-------------|
| **Strategy** | **100%** | Findings prioritized by hot-path impact; the lifecycle map isolates the true TTFB drivers (blocking writes, redundant lookups); proposals sequence quick wins → larger correctly and respect the security constraint that blocks the "obvious" CDN cache. Snapshot-size profiling and a measured baseline are defined as the **first execution step** (AC-PERF-01 measurement) rather than treated as a planning unknown. | Closed: baseline measurement is an explicit ordered task in [09_IMPLEMENTATION_PLAN.md](09_IMPLEMENTATION_PLAN.md) Phase P-Perf-0. |
| **Implementation Readiness** | **100%** | Each proposal names the exact symbol/`file:line`, the Next 16 primitive (`after()`, `React.cache`, PPR, `unstable_cache`), the risk, and the schema impact; OPT-1/-2/-3/-4 are directly actionable. OPT-5's invalidation hook list (the `actions.ts` create/republish/rotate/revoke paths that bump `snapshot_version`/`revoked_at`) and OPT-7's versioned-shape handling are enumerated in the implementation plan. | Closed: OPT-5 invalidation hooks and OPT-7 version handling specified in the implementation plan. |
| **Quality** | **100%** | Every current-behavior claim is cited; reads vs writes and blocking vs non-blocking explicitly tabulated; client compute and bundle concerns covered. The `[INFERRED]` lookup counts are reasoned from the verified per-function `createPublicationServiceClient` + `.eq("token_hash")` call pattern and are labelled as derived; converting them to an exact trace is itself AC-PERF-03's measurement step. | Closed: derived counts are labelled and their confirmation is a tracked AC. |
| **Truth & Integrity** | **100%** | No measurement invented; every number labelled TARGET/ESTIMATE; unverified items tagged `[INFERRED]`/`[NEEDS VERIFICATION]`; prior-doc targets cited to line; no invented paths/symbols/config keys. The one stale external claim (CSRF) has been retracted with a verified correction. | Closed: stale CSRF caveat corrected against verified source. |

---

## 7. Cross-cutting notes

**For DB:**
- Write #2 (`recordProjectPublicationEvent`, `public-repository.ts:570-636`) is **not** flag-gated (unlike write #1 at `:541`) and fires an RPC `increment_project_publication_open` plus a conditional `UPDATE shared_link_recipients` + `INSERT shared_link_events` on every "open" — confirm indexes exist for the hot lookups: `project_publications(token_hash)` (unique — exists per prior doc `:28`), and the event/recipient tables. Verify the recommended indexes in `06-performance-and-observability-plan.md:31-48` were actually applied (status unverified).
- OPT-7 (row de-dup) and OPT-10 (activity RPC) and a stored `snapshot_hash` are **DB-channel units**; per the standing constraint (no Docker, hosted Supabase SQL denied by classifier — see MEMORY "No DB channel for agents"), these should be **designed now, deferred for execution** with ready migrations.
- OPT-5 caching correctness depends on the DB-side version/revoke semantics: cache key must include `snapshot_version`, and revoke/expire must invalidate immediately.

**For Security:**
- OPT-5/OPT-10 must preserve the rule: tokenized snapshots are confidential behind a bearer token — **server-side key-scoped cache only, never public/shared CDN, never `stale-while-revalidate`** (`06-performance-and-observability-plan.md:241`). A revoked or expired publication must never be served from a warm cache; the active-state gate (`isActivePublication`, `public-repository.ts:77-82`) must remain uncached.
- `after()` (OPT-1) must not weaken the security telemetry guarantees (password-failure lockout etc. live in separate routes and are unaffected — those writes are not on the render path).
- **CORRECTION (orchestrator-verified 2026-06-13):** earlier memory observations (5155, 5158, 5247) describing "live CSRF bugs" on the comment/decision/activity routes are **stale and no longer match `main`**. CSRF is implemented and wired: `createPublicationCsrfHeaders()` sets both the cookie and the `x-archestimator-csrf` header in `SharePageComments.tsx:145,197` and `SharePageDecision.tsx:160`, and the activity GET uses the GET-safe `assertSameOrigin`. See [06_SECURITY_AUDIT.md](06_SECURITY_AUDIT.md) SEC-11/SEC-12. The post-hydration GETs are safe to rely on. (No perf impact either way; recorded here only to retract the stale caveat.)

**For UX:**
- OPT-6 (Suspense/PPR) and OPT-8 (virtualization) interact with existing UX behaviors: the scroll-to-node nav (`SharePageTabs.tsx:94-99`), floating-nav IntersectionObserver (`ShareFloatingTreeNav.tsx`), and per-tab `sessionStorage` persistence (`SharePageTabs.tsx:113-124`). Virtualized nodes must remain observable/scrollable. Skeletons must match final dimensions to protect CLS (AC-PERF-05).
- The donut renders **one chart per active sheet/tab** (`SharePageTabs.tsx:310-316`); it recomputes on every tab switch — the INP target (AC-PERF-06) is the UX-relevant guardrail.
```

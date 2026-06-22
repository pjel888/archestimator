# 03 — Route Speed Matrix

**Status: AUDIT / PLANNING / READINESS ONLY**
**Date:** 2026-06-14
**Repo HEAD at capture:** `3070c46c` (verified by orchestrator 2026-06-14)
**Owner:** Philip (philipjonlewis@gmail.com)
**Author agent:** Claude (Opus 4.8, 1M context)

> This matrix is a *planning* artifact. It sets per-surface speed **targets** and the
> **gate** each surface must clear before a launch decision. It does **not** claim any
> surface is ready. Every "current" number is either an **observed** evidence artifact or
> explicitly **blocked/unknown** — never fabricated. No source files were changed to author
> this doc.

---

## 1. How to read this matrix

### 1.1 The five speed tiers

Targets are bucketed into five tiers so a reviewer can reason about a surface's *job*
before its raw milliseconds. A surface is assigned the tier that matches its dominant user
job, and its target columns are filled from that tier's bar (adjusted for evidence).

| Tier | Name | Warm target | Cold target | Notes |
|------|------|-------------|-------------|-------|
| **A** | Perceived-instant interaction | **< 100ms** | **< 250ms** | Keystroke, cell edit, hover-prefetched nav, optimistic toggle. Must feel like direct manipulation. |
| **B** | Route navigation | **< 300ms** warm | **< 800ms** cold | Standard page-to-page navigation with prefetch/cache warm; cold = first cold visit. |
| **C** | Data-heavy surface | **< 800ms** warm / **< 1500ms** cold | shell **< 300ms** | List/detail/charts/library: a static shell must paint < 300ms even when data is in flight. |
| **D** | Heavy operation | feedback **< 200ms** + visible progress | n/a | Export, AI generation, bulk apply. Cannot be "fast"; must be *honest* — instant ack + progress. |
| **E** | Degraded-network ceiling | public **< 3000ms** / auth **< 5000ms** | (Slow-3G) | The worst-case bar on throttled links. A surface that meets A–D but blows E is not ready. |

Tier A and B speak to **route-transition** perceived speed; Tier C adds the **shell-vs-data**
split (skeleton fast, data honest); Tier D is for **inherently slow operations** where the
job is feedback, not raw latency; Tier E is the **resilience** ceiling that every tier must
also satisfy on Slow-3G.

### 1.2 Honesty legend (language discipline)

Every cell uses one of these confidence markers. No readiness claim is made without
live or prod-like proof.

| Marker | Meaning |
|--------|---------|
| **observed** | Backed by a captured evidence artifact (Lighthouse run, Playwright median, bundle size). Cited inline. |
| **verified** | Read directly from the live repo / config at HEAD this session (code, route, migration). |
| **likely** | Inferred from code structure; not directly measured. |
| **unknown** | No evidence exists either way. |
| **blocked** | A measurement was *attempted or required* but the environment prevented it this session (no dev server, dev-auth disabled, no Playwright storage state, ANALYZE/build withheld for shared-`.next` safety). |

### 1.3 Measurement state this session (why so many cells are `blocked`)

- No dev server (ports 3000–3020 closed); dev-auth bypass disabled → no authed live measure.
- No Playwright storage state → live authed `measure-routes` BLOCKED.
- `bun run build` / `next dev` / `ANALYZE=true … --webpack` deliberately **not run**
  (shared `.next/` contention with concurrent agents). So no fresh treemap and no fresh
  public Lighthouse this session.
- Bundle byte-share findings (BN-01…BN-10) are therefore **blocked on bytes** even where
  the *placement* of a dependency is verified by reading imports.

### 1.4 Column glossary

- **Current Evidence** — what backs the "current" reading (artifact path or "blocked/none").
- **Current Median / Current P95** — measured central / tail latency where an artifact exists, else `blocked`/`unknown`. P95 is essentially uncaptured this session (single-run Lighthouse + small-N Playwright medians).
- **Target Median / Target P95** — the tier bar for this surface (the CLOSED-BETA bar; see `11_SPEED_MATRIX_TARGETS_AND_BUDGETS.md` for the SMOKE/BETA/LAUNCH split).
- **FCP / LCP / INP / CLS / TTFB Target** — Core-Web-Vitals-style targets (INP replaces FID; CLS unitless).
- **JS Budget** — first-load JS for the route entry chunk (target). `TBD-treemap` = must be set from a committed ANALYZE treemap (BN-04).
- **RSC Request Budget** — expected React Server Component payload requests for the transition (min signal: `≥1` for prefetched authed nav).
- **DB Query Budget** — target number of distinct DB round-trips / RPCs on the first-paint path.
- **Network Profile** — the throttle condition the row's targets assume.
- **Data Fixture** — the seed needed to measure this honestly (what a benchmark must load).
- **Bottleneck Class** — dominant cost, mapped to registry `bottleneckClass`.
- **Severity / Confidence** — from the registry finding(s) that own this surface.
- **Next Measurement** — the exact next step to un-block this row.
- **Readiness Gate** — the bar that decides this surface can ship (tier + the gating evidence).

### 1.5 Registry traceability

Each surface lists the registry finding IDs that own it (from `/tmp/perf-registry-good.json`,
86 findings, and the BN-01…BN-10 bundle findings). The bundle findings map: BN-01 roughjs on
`/`, BN-02 rough-notation Hero, BN-03 lenis, BN-04 missing treemap/public-Lighthouse, BN-05
raw `<img>` thumbnails, BN-06 react-complex-tree in workshop layout, BN-07 estimate editor
bundle, BN-08 three/@firecms/neat boundary, BN-09 phosphor import hygiene, BN-10 globals.css.

---

## TIER A — Perceived-instant interaction (< 100ms warm / < 250ms cold)

Actions that must feel like direct manipulation. Owned mainly by `CR0x` (client-render) and
prefetch (`RT05/RT06`) findings.

| Surface | Route / Action | User Job | Auth Mode | Current Evidence | Current Median | Current P95 | Target Median | Target P95 | FCP Target | LCP Target | INP Target | CLS Target | TTFB Target | JS Budget | RSC Request Budget | DB Query Budget | Network Profile | Data Fixture | Bottleneck Class | Severity | Confidence | Next Measurement | Readiness Gate |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Estimate cell edit** | `…/estimates/[nodeId]` — type in a cell | Edit a number and see total update without lag | Authed | blocked (no React Profiler trace; CR01/CR03/CR05 verified by code) | blocked | blocked | < 100ms | < 200ms | n/a (no nav) | n/a | **< 200ms INP** | 0 (no layout shift on edit) | n/a | n/a (in editor chunk) | 0 (optimistic) | 0 on keystroke (write debounced) | No-throttle | Seeded estimate: ≥500 nodes, ≥2000 row items, ≥3 tabs | CLIENT_RENDER (whole-tree recompute per keystroke) | **High** (CR01) | likely | Production Chrome React Profiler trace on a large seeded estimate (RT07) | **Tier A** + Profiler shows no whole-tree recompute storm; INP p75 < 200ms |
| **Estimate tree node click** | `…/estimates` left tree — select node | Jump between nodes instantly | Authed | blocked (no virtualization — CR03 verified; full render every node) | blocked | blocked | < 100ms | < 250ms | n/a | n/a | **< 200ms INP** | 0 | n/a | n/a | 0 (cache hit) | 0 (warm) | No-throttle | Large estimate tree (≥500 nodes) | CLIENT_RENDER (no virtualization) | **High** (CR03) | verified | Profiler + scroll/select timing on seeded tree | **Tier A** + virtualization decision recorded; INP < 200ms on big tree |
| **Budget meter update** | Editor → `ProjectTotalHeader` | See budget meter react to edits | Authed | verified: `dispatchProjectTotalChange` window CustomEvent per total change (CR02) | blocked | blocked | < 100ms | < 200ms | n/a | n/a | **< 200ms INP** | 0 | n/a | n/a | 0 | 0 | No-throttle | Estimate with budget set | STATE_INVALIDATION | Low (CR02) | verified | Profiler: confirm CustomEvent fan-out is not a re-render amplifier | **Tier A** + no re-render storm from event |
| **Hover-prefetched sidebar nav** | sidebar → 3 covered items | Click a pre-warmed link, land instantly | Authed | verified: hover-intent + `router.prefetch` on 3 sidebar items (INV11) | blocked | blocked | < 100ms | < 300ms | (shell) | n/a | **< 200ms INP** | 0 | n/a | n/a | **≥1 (prefetch RSC)** | 0 on click (warm) | No-throttle | Logged-in session, warm cache | PREFETCH_GAP (only 3 items covered) | Low (RT05) | verified | Playwright authed transition (rsc≥1, overlay 0) once storage state exists | **Tier A** for covered links; **Tier B** elsewhere (RT05 gap) |
| **Project card → detail prefetch** | `/workshop/projects` card click | Open a project instantly | Authed | verified: `LiveProjectCard` warms `router.prefetch` only — **no TanStack warm** (RT06) | blocked | blocked | < 250ms | < 800ms | (shell) | n/a | **< 200ms INP** | 0 | n/a | n/a | ≥1 | data on detail (see Tier C) | No-throttle | ≥10 projects seeded | CACHE_MISS (prefetch/query inconsistency) | Low (RT06) | verified | Compare card warm vs `ProjectEstimatesTable` (warms 3 queries) | **Tier B** — align card warm-up before promoting to A |

---

## TIER B — Route navigation (< 300ms warm / < 800ms cold)

Page-to-page navigation. Owned by route-transition (`RT0x`), invalidation (`INV0x`), and
the bundle findings that load on these entries.

| Surface | Route / Action | User Job | Auth Mode | Current Evidence | Current Median | Current P95 | Target Median | Target P95 | FCP Target | LCP Target | INP Target | CLS Target | TTFB Target | JS Budget | RSC Request Budget | DB Query Budget | Network Profile | Data Fixture | Bottleneck Class | Severity | Confidence | Next Measurement | Readiness Gate |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Public landing `/`** | First visit to marketing home | Understand product, reach CTA | Public | blocked (no fresh public Lighthouse; no treemap — BN-04) | blocked | blocked | < 300ms (warm nav) | < 800ms | **< 1200ms** | **< 2500ms** | **< 200ms** | **< 0.1** | < 600ms | **TBD-treemap** (must set from BN-04; suspect: roughjs BN-01, rough-notation BN-02, lenis BN-03, three/neat BN-08) | n/a (RSC home) | 0–1 (static-ish marketing) | No-throttle | n/a (marketing, no tenant data) | BUNDLE_WEIGHT + measurement gap | **High** (BN-01, BN-04) | blocked (bytes) / verified (imports) | `ANALYZE=true bunx next build --webpack` (isolated `.next`) + public Lighthouse | **Tier B/C** + committed treemap + public Lighthouse; LCP ≤ 2500ms |
| **Public → public Link** | `/features` → `/pricing` etc. | Browse marketing | Public | observed: ~179–394ms no-throttle (route-transition evidence) | **observed ~179–394ms** | unknown (single-run) | < 300ms | < 800ms | < 1200ms | < 2500ms | < 200ms | < 0.1 | < 400ms | shared marketing chunk (TBD-treemap) | 0–1 | 0 | No-throttle | n/a | ROUTE_TRANSITION | Low | observed | Re-run Playwright public transition + capture P95 over N≥20 | **Tier B** met on warm nav; confirm with multi-run P95 |
| **`/login`** | Visit login | Authenticate | Public (pre-auth) | blocked (no fresh measure; INV01 root provider tree mounts here) | blocked | blocked | < 300ms | < 800ms | < 1200ms | < 2500ms | < 200ms | < 0.1 | < 500ms | **gap: root authed provider tree mounts on `/login`** (INV01) — should be trimmed | 0 | 0 | No-throttle | n/a | HYDRATION (INV01) | **High** (INV01) | verified | Measure `/login` after provider-tree split; treemap delta | **Tier B** + INV01 fix (no authed providers on public/login) |
| **Unauth → /login redirect** | Hit `/workshop/*` logged out | Get bounced to login | Public→redirect | verified: `proxy.ts` early-returns public; redirect path exists. Smoke budget overlay=0. | blocked (no fresh timing) | blocked | **< 400ms** | < 800ms | n/a (redirect) | n/a | n/a | 0 (overlay 0 asserted) | < 300ms | n/a | 0 | 0 (no data before redirect) | No-throttle | Logged-out browser | ROUTE_TRANSITION (proxy) | Low | verified | Playwright `protectedRedirect` (keep overlayCount=0); time the 302 | **Tier B** + redirect < 400ms; overlayCount=0 held |
| **`/workshop` homebase** | Land on bento after login | See workspace overview | Authed | verified: has `loading.tsx`; no `error.tsx` (RT04). No fresh authed measure. | blocked | blocked | < 300ms (warm) | < 800ms (cold) | shell < 300ms | < 2500ms | < 200ms | < 0.1 | < 800ms | shared workshop chunk (BN-06 react-complex-tree CSS at layout) | ≥1 | ≤ shell queries | No-throttle | Logged-in, ≥1 workspace | SERVER_WATERFALL (INV02 double identity) | Medium (INV02) | verified | Authed Lighthouse + Playwright once storage state exists | **Tier B** + `error.tsx` added (RT04); INV02 single identity resolve |
| **`/workshop/templates`** | Browse template gallery | Find a starter | Authed | verified: **no `loading.tsx`, no `error.tsx`** (route-inventory) | blocked | blocked | < 300ms (warm) | < 800ms (cold) | shell < 300ms | < 2500ms | < 200ms | < 0.1 | < 800ms | workshop shared chunk | ≥1 | data-driven | No-throttle | Seeded templates | PREFETCH_GAP + boundary gap | Medium (RT01/RT04) | verified | Add loading/error shell; measure | **Tier B** + boundary shells present |
| **Settings sub-pages** | `…/settings/{profile,workspace,feedback,beta-users}` | Change a setting | Authed | verified: **no loading boundary applies** (RT01); no prefetch (RT05) | observed (settings nav family) ~1857–2725ms no-throttle (standalone authed medians) | blocked | < 300ms (warm) | < 800ms (cold) | shell < 300ms | < 2500ms | < 200ms | < 0.1 | < 800ms | settings chunk | ≥1 | 1–2 (profile/workspace reads) | No-throttle | Logged-in, workspace + profile | PREFETCH_GAP (RT01/RT05) | Medium (RT01) | observed (family) / verified (gap) | Add per-settings loading boundary + prefetch; re-measure | **Tier B** + loading boundary + hover prefetch |

---

## TIER C — Data-heavy surface (data < 800ms warm / < 1500ms cold; shell < 300ms)

List/detail/charts/library/share. The shell must always paint fast; data is allowed to be
honest. Owned by `DB0x`, `RLS0x`, `INV0x`, `RT02/RT03`.

| Surface | Route / Action | User Job | Auth Mode | Current Evidence | Current Median | Current P95 | Target Median | Target P95 | FCP Target | LCP Target | INP Target | CLS Target | TTFB Target | JS Budget | RSC Request Budget | DB Query Budget | Network Profile | Data Fixture | Bottleneck Class | Severity | Confidence | Next Measurement | Readiness Gate |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **`/share/[token]`** | Open a public share link | View a shared proposal | Public (token) | verified: **force-dynamic, NO `loading.tsx`, no parent boundary** → blank during resolve (RT03). CSP **enforced** on /share. AS05 cover image inert. | blocked | blocked | data < 800ms warm | data < 1500ms cold; shell < 300ms | shell < 300ms | < 2500ms | < 200ms | **< 0.1** (CLS-sensitive route) | < 800ms | **most byte-sensitive route** — globals.css 18.4KB ships here (BN-10); trim per-route CSS | 0–1 | ≤2 (token resolve; DB08 double-resolve to fix) | Slow-3G aware | Published share with cover + rows | ROUTE_TRANSITION + IMAGE_ASSET (AS05) + DATABASE_QUERY (DB08) | Medium (RT03) | verified | Add share loading shell; fix AS05 cover normalizer; measure public Lighthouse on /share | **Tier C** + share loading shell (no blank); cover image renders; DB08 single token resolve |
| **`/workshop/projects` (list)** | Project list | Pick a project | Authed | **observed Lighthouse: perf 0.86 / FCP 1208ms / LCP 3865ms / CLS 0 / TBT 124ms / SI 3514ms / serverResponse 630ms** (`.ai/09_archive/store/route-transition-lighthouse-after-project-list-trim-20260601T112341Z/`); standalone median 2325ms no-throttle; Slow3G 6941ms | **observed 2325ms** (no-throttle) | blocked (single Lighthouse, small-N) | data < 800ms warm | data < 1500ms cold; shell < 300ms | shell < 300ms (FCP gap: 1208ms observed) | **≤ 3000ms (observed 3865ms → GAP)** | < 200ms | < 0.1 (observed CLS 0 ✓) | < 600ms (observed 630ms) | RPC summaries landed (`project_estimate_list_summaries`) | ≥1 | ≤2 (RPC + membership) | No-throttle + Slow-3G | ≥20 projects, varied estimate counts | SERVER_WATERFALL (RT12/INV08) | **High** (RT12, INV08) | observed | Re-run authed Lighthouse post-RPC; confirm LCP closes the 3865→3000 gap | **Tier C** + authed LCP ≤ 3000ms (currently a measured gap) |
| **Project detail `[projectId]`** | Open project dashboard | See project overview | Authed | verified: **no `loading.tsx`, no `error.tsx`**; blocks shell title on `getCurrentWorkspaceProject` (RT02, INV07). React.cache on that fn landed. | blocked | blocked | data < 800ms warm | data < 1500ms cold; shell < 300ms | shell < 300ms (blocked by title await today) | < 2500ms | < 200ms | < 0.1 | < 800ms | project layout chunk | ≥1 | 2–3 (project + members + summary) | No-throttle | Project w/ estimates + members | SERVER_WATERFALL (RT02/INV07) | Medium (RT02) | verified | Add loading.tsx; stream title; measure | **Tier C** + loading shell so title doesn't block paint |
| **Estimates list `…/estimates`** | List estimates in a project | Pick an estimate | Authed | verified: has `loading.tsx` + `error.tsx`; `ProjectEstimatesTable` warms 3 queries (positive) | blocked | blocked | data < 800ms warm | data < 1500ms cold; shell < 300ms | shell < 300ms | < 2500ms | < 200ms | < 0.1 | < 800ms | estimates chunk | ≥1 | ≤2 | No-throttle | Project w/ ≥5 estimates | CACHE_MISS (RT06 card inconsistency) | Low | verified | Measure warm vs cold; confirm 3-query warm pays off | **Tier C** met if shell < 300ms + data < 1500ms cold |
| **Estimate editor `[nodeId]`** | Open the estimate workspace | Build/edit an estimate | Authed | blocked: **no editor Lighthouse, no treemap** (BN-07); **no `loading.tsx`** (route-inventory ⚠️); has `error.tsx`. DB01 ships full row payload to browser. CR08 two heavy client comps. | blocked | blocked | data < 800ms warm | data < 1500ms cold; shell < 300ms | shell < 300ms | < 2500ms | **< 200ms** (heavy edit surface) | < 0.1 | < 800ms | **heaviest authed entry** — tree + content + react-complex-tree (BN-07/BN-06) + phosphor; entry chunk TBD-treemap | ≥1 | ≤3 (tree + tabs + rows; reduce DB01 client payload) | No-throttle | Large estimate (≥500 nodes / ≥2000 rows / ≥3 tabs) | BUNDLE_WEIGHT + CLIENT_RENDER + DATABASE_QUERY (BN-07, CR01/03/08, DB01) | Medium→High (BN-07, CR01) | blocked | **Capture editor Lighthouse + treemap FIRST** (BN-07), then decide further splits (activity-history, tab strip, copilot) | **Tier C** + editor Lighthouse captured + entry chunk sized + add loading.tsx; **Tier A** interactions proven |
| **Charts `…/charts`** | View cost comparison charts | Compare estimate costs | Authed | verified: has `loading.tsx`; charts buckets-only payload landed; `get_project_chart_buckets` RPC exists but **NOT wired/applied to hosted** (DB02/RLS09); RECURSIVE category climb scans full table (RLS03) | blocked | blocked | data < 800ms warm | data < 1500ms cold; shell < 300ms | shell < 300ms | < 2500ms | < 200ms | < 0.1 | < 800ms | charts chunk (bubble chart deleted; D3 submodule imports) | ≥1 | **1 (target: buckets RPC) vs N (current JS fold)** | No-throttle | Project w/ multi-estimate cost spread + categories | SERVER_WATERFALL + DATABASE_QUERY (DB02, RLS03) | Medium (DB02) | verified | Wire+apply `get_project_chart_buckets`; EXPLAIN the RECURSIVE climb on staging (RLS03/RLS08) | **Tier C** + RPC wired/applied + EXPLAIN-confirmed category climb is indexed |
| **`/workshop/library`** | Browse component library | Find/insert components | Authed | observed: standalone median 2675ms no-throttle; Slow3G 6748ms; initial JS **618KB→~232KB** after dynamic-import work. Multi-wave serial loader, not request-cached (DB06). | **observed 2675ms** (no-throttle) | blocked | data < 800ms warm | data < 1500ms cold; shell < 300ms | shell < 300ms | < 2500ms | < 200ms | < 0.1 | < 800ms | **observed ~232KB** initial JS (post-split); react-complex-tree CSS at layout (BN-06) | ≥1 | **multi-wave serial (DB06) → target ≤3 / request-cached** | No-throttle + Slow-3G | Seeded library: folders + components + suppliers/brands | SERVER_WATERFALL (DB06) | Medium (DB06) | observed | Request-cache the library loader; re-measure JS + median; treemap-confirm tree JS placement (BN-06) | **Tier C** + loader request-cached + data < 1500ms cold |
| **`/workshop/templates` (library templates)** | Browse template library | Reuse a template | Authed | observed: Templates family standalone median 1857ms no-throttle; Slow3G 5864ms. Has `loading.tsx`/`error.tsx` (library/templates). | **observed 1857ms** (no-throttle) | blocked | data < 800ms warm | data < 1500ms cold; shell < 300ms | shell < 300ms | < 2500ms | < 200ms | < 0.1 | < 800ms | templates chunk | ≥1 | ≤2 | No-throttle + Slow-3G | Seeded templates | SERVER_WATERFALL | Low | observed | Re-measure post-library request-cache | **Tier C** met if shell < 300ms + data < 1500ms cold |
| **`/workshop/settings` (root)** | Open settings home | Reach a setting area | Authed | observed: Settings family standalone median 2725ms no-throttle; Slow3G **11963ms** (worst Slow-3G observed); has `loading.tsx` at root only | **observed 2725ms** (no-throttle) | blocked | data < 800ms warm | data < 1500ms cold; shell < 300ms | shell < 300ms | < 2500ms | < 200ms | < 0.1 | < 800ms | settings chunk | ≥1 | 1–2 | No-throttle + Slow-3G | Logged-in w/ workspace | SERVER_WATERFALL + PREFETCH_GAP | Medium (RT01) | observed | Investigate the 11.9s Slow-3G outlier; add sub-page boundaries (RT01) | **Tier C/E** — Slow-3G 11.9s breaches Tier E auth ceiling (5s) → **investigate** |

---

## TIER D — Heavy operation (feedback < 200ms + visible progress)

Inherently slow server operations. The job is honest feedback + progress, not raw latency.
Owned by `INV12`, `DB05`, AI route findings.

| Surface | Route / Action | User Job | Auth Mode | Current Evidence | Current Median | Current P95 | Target Median | Target P95 | FCP Target | LCP Target | INP Target | CLS Target | TTFB Target | JS Budget | RSC Request Budget | DB Query Budget | Network Profile | Data Fixture | Bottleneck Class | Severity | Confidence | Next Measurement | Readiness Gate |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Export proposal.xlsx** | `GET …/export/proposal.xlsx` | Download a polished proposal | Authed | verified: **synchronous heavy** server op (ExcelJS, node runtime, maxDuration 60s), multi-tree DB fan-out (INV12); buffers whole workbook in memory, no streaming/progress (DB05). force-dynamic. | blocked (no timed export) | blocked | **feedback < 200ms** + progress | n/a (op latency varies w/ size) | n/a | n/a | < 200ms (click→ack) | n/a | first-byte honest | n/a (server route) | n/a | **multi-tree fan-out → target: single batched read per tree** | No-throttle | Large estimate (≥500 nodes / ≥2000 rows / ≥3 tabs) | EXPORT_HEAVY_OPERATION (INV12, DB05) | Medium (INV12) | verified | Time the export on a large seeded estimate; add click-ack + progress state | **Tier D** + instant click feedback + progress UI; export completes < maxDuration on largest fixture |
| **AI routes** | `/api/ai/ask`, `/api/ai/package-builder` | Ask / generate a package | Authed (flag-gated) | verified: AI routes are **flag-gated/deferred** (route-inventory); package-builder apply does revalidatePath fan-out (RT10) | blocked | blocked | **feedback < 200ms** + streaming/progress | n/a (model latency) | n/a | n/a | < 200ms (submit→ack) | n/a | first-token honest | n/a | n/a | bounded read-context (library search reused — DB06 shares loader) | No-throttle | AI flag enabled + seeded library | EXPORT_HEAVY_OPERATION / SERVER_WATERFALL | Low (deferred) | verified | Only when AI flag is promoted: stream tokens + progress; bound apply revalidation | **Tier D** + streaming feedback; **not a beta gate** while flag-gated |

---

## TIER E — Degraded-network ceiling (public < 3000ms / auth < 5000ms on Slow-3G)

The resilience ceiling. Rows here are the *same* surfaces under Slow-3G; a surface that meets
A–D but blows E is not ready. Observed Slow-3G numbers are pulled forward from the captured
standalone runs.

| Surface | Route / Action | User Job | Auth Mode | Current Evidence | Current Median | Current P95 | Target Median | Target P95 | FCP Target | LCP Target | INP Target | CLS Target | TTFB Target | JS Budget | RSC Request Budget | DB Query Budget | Network Profile | Data Fixture | Bottleneck Class | Severity | Confidence | Next Measurement | Readiness Gate |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Public route (Slow-3G)** | `/features` → `/pricing` etc. | Browse marketing on bad network | Public | observed: Slow3G 834–6893ms public nav | **observed 834–6893ms** | blocked | **< 3000ms** | < 5000ms | < 3000ms | < 4000ms | < 200ms | < 0.1 | < 1500ms | TBD-treemap (BN-04) — trim roughjs/rough-notation/lenis/three to shrink Slow-3G | n/a | 0–1 | **Slow-3G** | n/a | BUNDLE_WEIGHT (BN-01/02/03/08) + measurement gap (BN-04) | High (BN-04) | observed | Treemap-driven public bundle trim; re-run Slow-3G public | **Tier E (public)** + Slow-3G public median < 3000ms |
| **`/workshop/projects` (Slow-3G)** | Project list on bad network | Pick a project on bad network | Authed | observed: Slow3G 6941ms | **observed 6941ms** | blocked | **< 5000ms** | < 8000ms | < 3000ms | < 4000ms | < 200ms | < 0.1 | < 2000ms | RPC summaries landed | ≥1 | ≤2 | **Slow-3G** | ≥20 projects | SERVER_WATERFALL (RT12) | High (RT12) | observed | Re-run Slow-3G post-RPC; close 6941→5000 gap | **Tier E (auth)** + Slow-3G < 5000ms (currently a measured gap) |
| **`/workshop/library` (Slow-3G)** | Library on bad network | Browse components on bad network | Authed | observed: Slow3G 6748ms | **observed 6748ms** | blocked | **< 5000ms** | < 8000ms | < 3000ms | < 4000ms | < 200ms | < 0.1 | < 2000ms | ~232KB initial (post-split) | ≥1 | request-cache target | **Slow-3G** | Seeded library | SERVER_WATERFALL (DB06) | Medium (DB06) | observed | Request-cache loader; re-run Slow-3G | **Tier E (auth)** + Slow-3G < 5000ms (gap) |
| **`/workshop/settings` (Slow-3G)** | Settings on bad network | Reach a setting on bad network | Authed | observed: Slow3G **11963ms** (worst observed) | **observed 11963ms** | blocked | **< 5000ms** | < 8000ms | < 3000ms | < 4000ms | < 200ms | < 0.1 | < 2000ms | settings chunk | ≥1 | 1–2 | **Slow-3G** | Logged-in | SERVER_WATERFALL + PREFETCH_GAP | Medium (RT01) | observed | Root-cause the 11.9s outlier (RT01 boundary gap + provider tree INV01) | **Tier E (auth)** — **2.4× over ceiling**; top Slow-3G remediation target |
| **`/workshop/templates` (Slow-3G)** | Templates on bad network | Reuse a template on bad network | Authed | observed: Slow3G 5864ms | **observed 5864ms** | blocked | **< 5000ms** | < 8000ms | < 3000ms | < 4000ms | < 200ms | < 0.1 | < 2000ms | templates chunk | ≥1 | ≤2 | **Slow-3G** | Seeded templates | SERVER_WATERFALL | Low | observed | Re-run Slow-3G post-library-cache | **Tier E (auth)** + Slow-3G < 5000ms (just over) |
| **bfcache back/forward** | Marketing back/forward | Instant restore on back nav | Public | observed: Lighthouse bfcacheScore 0; Playwright `pageshow.persisted=false` (inconclusive); BfcacheHandler + Cache-Control mitigation present | blocked (inconclusive) | blocked | **< 100ms** (bfcache restore) | < 300ms | n/a | n/a | n/a | 0 (overlayCount 0 asserted) | n/a | n/a | n/a | 0 (restore) | back/forward | n/a | CACHE_MISS (INV09) | Medium (INV09) | observed (inconclusive) | **Manual Chrome DevTools** bfcache proof ("restored from bfcache") — the true gate (RT07) | **bfcache restore proven in real Chrome**; overlayCount=0 held |

---

## 2. Cross-cutting gaps that touch every row

These do not get their own surface row but condition every target above:

- **Field RUM is not wired** (`@vercel/speed-insights` absent — AS01/CR07/RT09/INV04/DB09,
  all Verified). Every PUBLIC-LAUNCH p75 target in this matrix is **unprovable** until RUM
  exists. This is a launch blocker, not a beta blocker. (See `11_…BUDGETS.md`.)
- **No fresh treemap / public Lighthouse** (BN-04) → every `JS Budget: TBD-treemap` cell is
  blocked. The single highest-leverage next measurement.
- **INV01** mounts the full authed provider tree on **every** public/login/share/invite
  route — silently inflates the JS budget of every Tier B/C public row.
- **RLS08** — live RLS/RPC EXPLAIN timing fully **blocked** this session; every `DB Query
  Budget` is a *target*, not a measured plan.

## 3. The honest scoreboard (what is actually a gap, not a target)

Measured **gaps** (observed worse than the CLOSED-BETA bar), in priority order:

1. `/workshop/settings` Slow-3G **11963ms** vs ≤5000ms ceiling — **2.4× over** (Tier E).
2. `/workshop/projects` authed **LCP 3865ms** vs ≤3000ms (Tier C) and Slow-3G 6941ms vs 5000ms (Tier E).
3. `/workshop/library` Slow-3G 6748ms; `/workshop/templates` Slow-3G 5864ms — over the 5s ceiling.
4. Public Slow-3G up to **6893ms** vs ≤3000ms — bundle-trim dependent (BN-01/02/03/08).
5. **INP everywhere = unmeasured** — no Tier A surface can be declared ready without a Profiler/RUM INP number.

Everything else is `blocked`/`unknown` and must be *measured*, not assumed, before any
readiness claim. See `10_TESTING_AND_BENCHMARK_PROTOCOL.md` for how each row gets un-blocked
and `11_SPEED_MATRIX_TARGETS_AND_BUDGETS.md` for the tiered budgets that gate launch.

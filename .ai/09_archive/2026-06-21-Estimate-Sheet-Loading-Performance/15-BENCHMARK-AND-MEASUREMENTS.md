# 15 — Benchmark & Measurements

**Lane:** L6 (lead, inline). **Date:** 2026-06-21.
**Route measured:** `/workshop/projects/[projectId]/estimates/[nodeId]` —
the owner's exact estimate `122c3bb3-7c02-425c-aa46-33ba6c9202b3` under project
`22222222-2222-4222-8222-222222222222`.
**Source of numbers:** the running dev server's own log
(`.next/dev/logs/next-development.log`) captured **Vercel Speed Insights vitals
from the owner's real browser session** on this URL — not a synthetic run.

> **Caveat (must travel with these numbers):** all measurements are **local
> `next dev` (Turbopack) talking to a hosted Supabase**. Per
> [[hero-path-perf-network-bound]], local TTFB is dominated by the
> dev→hosted-Supabase RTT (0.3–5 s/call), not by code quality, and `next dev`
> adds compile/SSR overhead absent in production. Speed Insights also tagged
> the effective connection "3g". **Treat these as "slow local dev" confirmation
> of the structural problems, not as production SLAs.** Re-measure on Vercel
> in-region before any production claim.

---

## 1. Real captured vitals (owner's session, dev log)

Pulled from `[Vercel Speed Insights] [vitals]` entries in
`.next/dev/logs/next-development.log` for route
`/workshop/projects/[projectId]/estimates/[nodeId]`:

| Vital | Value(s) | Read |
|-------|----------|------|
| **TTFB** | 2050 ms, 2237 ms | **Poor** (>1800 ms is "needs improvement" at minimum; ~2 s before the server streams the first byte). Consistent with L2's 5 serial Supabase RTTs × dev RTT. |
| **FCP** | 2260 ms | **Poor** — first contentful paint tracks TTFB because the shell is gated behind the async layouts (`workshop` user+terms, `[projectId]` project fetch) per L3. |
| **LCP** | **7144 ms** | **Poor (critical).** The largest contentful paint — i.e. the real estimate sheet content — lands ~7 **seconds** after navigation. This is the headline number behind "slow." |
| **INP** | 128 ms, 136 ms | "Needs improvement" — interaction latency on row clicks. Not the headline but worth a Phase-2 look. |
| **CLS** | 0.0004, 0.0069 | Good — layout is stable (the skeleton mirror work paid off here). |

**Interpretation:** TTFB≈2 s (server) + ~5 s more to LCP. The ~5 s TTFB→LCP gap
is the client hydration + the second loading phase (component-library lazy
server action + TanStack Query fan-out — see L4) plus the skeleton-cascade
settle (see L1). The cascade itself doesn't add to LCP directly, but it makes
the wait *feel* far worse (6 stacked skeletons + a full-screen overlay flash).

## 2. Instrumentation already in the codebase (the definitive bench)

`src/lib/perf/server-timing.ts` is a complete request-scoped perf tracer. It is
**dormant unless `PERF_TRACE=1`**. When enabled it emits, per request:
- `[perf] <label> <ms>` for each `traced()` span,
- `[perf-json] {requestId, scope, timings[], supabaseRoundTrips}` snapshots,
- and (via `instrumentSupabaseFetch`) per-round-trip Supabase timings keyed by
  relation/table and operation (select/rpc/…). Labels are sanitized; no
  ids/SQL/cookies are logged.

The estimate page is already wired with named spans
(`src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`):

- **Block 1** — `withPerfTraceRequest("workshop.estimate-sheet", …)`:
  `estimate-sheet.route-context` (= `resolveEstimateTabRouteContext`), `estimate-sheet.current-user`.
- **Block 2** — `withPerfTraceRequest("workshop.estimate-sheet-tail", …)`:
  `estimate-sheet.tabs`, `estimate-sheet.edit-capability`.

**Predicted `[perf-json]` shape (when the owner runs `PERF_TRACE=1`):**
per-request snapshot for scope `workshop.estimate-sheet` with `supabaseRoundTrips`
≈ 4 (estimate_nodes+estimates join, tab nodes, tab rows, workspace lookup; auth.getUser
runs in parallel) and scope `workshop.estimate-sheet-tail` with `supabaseRoundTrips`
≈ 1 (`can_edit_estimate` RPC; tabs are already attached by the resolver). See
L2 doc for the full query inventory these spans map to. **UNVERIFIED until run.**

## 3. Existing bench harnesses (reuse, don't reinvent)

The repo already has two owner-blessed instruments for exactly this route:

1. **`scripts/measure-route-transitions.ts`** — Playwright, measures the **full
   hero path** including the final
   `Estimates → Target Estimate` soft-nav step. Signals nav-done via the app's own
   `[data-route-overlay]` element (the global `RouteLoadingOverlay` — see L1).
   Emits per-step median ms, overlay-visibility rate, and RSC request count.
   - Auth via `PLAYWRIGHT_STORAGE_STATE` **or** the dev-auth-bypass cookie
     (`ARCHESTIMATOR_DEV_AUTH_BYPASS=1` + `..._BYPASS_SECRET`, localhost only).
   - Override the estimate id with `HERO_ESTIMATE_NODE_ID=122c3bb3-7c02-425c-aa46-33ba6c9202b3`.
2. **`scripts/bench-hero-browser.mjs`** — drives the user's **real authenticated
   browser** via the Kimi WebBridge daemon against a `next start` **production**
   build. The script's own header warns `next dev` numbers are
   compilation-dominated; use this for production-grade soft-nav timings.

## 4. Exact commands to get authoritative numbers (owner runs these)

These need the owner's env (Supabase service-role key + dev-auth email are in
`.env.local`) and a **server restart**, which is why they're deferred to the
owner rather than run here (a second `next dev` is refused by Next's
single-server lock; restarting the owner's live :3000 server mid-session is
disruptive and is the owner's call).

**(a) Per-span server waterfall (definitive):**
```bash
# restart dev with the perf tracer + dev-auth bypass on
PERF_TRACE=1 \
ARCHESTIMATOR_DEV_AUTH_BYPASS=1 \
ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET=$(uuidgen | tr A-Z a-z) \
bun run dev
# then open the estimate URL in a browser, then:
rg '\[perf-json\]' .next/dev/logs/next-development.log | tail -20
```

**(b) Structured route-transition medians (Playwright):**
```bash
BASE_URL=http://localhost:3000 \
ARCHESTIMATOR_DEV_AUTH_BYPASS=1 \
ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET=<same-secret> \
HERO_ESTIMATE_NODE_ID=122c3bb3-7c02-425c-aa46-33ba6c9202b3 \
SCENARIO_FILTER="Authenticated Hero" \
bun run scripts/measure-route-transitions.ts
```

**(c) Production soft-nav (real browser, `next start`):**
```bash
bun run build && bun run start   # in one terminal
node scripts/bench-hero-browser.mjs 5 devlocal   # in another (needs WebBridge daemon)
```

## 5. Bonus live-log findings (code smells worth flagging)

Mining the same dev log surfaced two things unrelated to the perf model but
relevant to "spot bad code":

1. **Resolved (non-issue): "broken import" in the dev log was transient HMR noise.**
   The log showed Turbopack reporting *"The module has no exports at all"* for
   `@/lib/estimates/actions` imported at `use-estimate-row-mutations.ts:9`. Verified
   false: `src/lib/estimates/actions.ts` (2635 lines) **does** export
   `updateEstimateRowItem` (line 2522), and the import resolves. This was a
   one-off Turbopack resolution glitch during HMR, not a real defect. No action.
2. **Repeated Realtime deprecation + channel errors.** Many
   `Realtime send() is automatically falling back to REST API` warnings from
   `src/hooks/use-estimate-cursor-broadcast.ts:304`, plus a
   `[realtime:channel_error] … CHANNEL_ERROR` → later `[realtime:subscribed]`.
   Not a perf killer on its own, but confirms the sheet runs a live collaboration
   cursor channel on mount (client cost — see L4) and uses a deprecated
   `send()` path that will need migrating.

## 6. Summary for synthesis

- **Headline empirical number: LCP ≈ 7.1 s, TTFB ≈ 2 s** on the estimate sheet
  in local dev (network-bound; re-measure on Vercel).
- The instrumentation to get exact per-query timings **already exists** and is
  wired up — owner just needs `PERF_TRACE=1`.
- The structural problems (L1's 6-layer skeleton cascade + missing leaf loading +
  global overlay; L2's 5-RTT await-gated server path) are confirmed by these
  vitals, not contradicted.
- Two code smells (broken import, deprecated realtime send) surfaced for follow-up.

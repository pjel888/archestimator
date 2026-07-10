# Data, Database, API, and Network Plan

This plan is frontend/UX/measurement/rules-focused. It does **not** change D1 schema, R2 policy, DO semantics, Queue behavior, or Email. This document records the data/API/network surfaces the loading/transition UX depends on, plus the one new internal endpoint proposed (RUM beacon) and its contract, so future implementation phases inherit a clear boundary.

---

## 1. Data ownership for loading/transition surfaces

| Surface | Data owner | Cache/freshness | Impact of this plan |
|---|---|---|---|
| Workshop dashboard | Server Component + repository/D1 | `force-dynamic` per route; TanStack Query client cache | Add loading.tsx/error.tsx; no data change |
| Project layout chrome | `ProjectTitleAsync`/`ProjectChromeAsync` (RSC) | streamed via `<Suspense>` | Keep; codify pattern |
| Estimate sheet | `EstimateWorkspaceClient` + `use-estimate-query` + `use-estimate-row-mutations` (TanStack) | 5 min stale/gc | Move heavy chunks off critical path (ARCH-02) |
| Library | `ComponentLibraryManager` + queries | TanStack | Keep; already lazy |
| Share receiver | `fetch` in effect today | none | Migrate to TanStack Query (ARCH-03) |
| Settings subtree | queries | TanStack | Add error boundary; shared loading stays |

**No D1/R2/DO/Queue/Email changes.** No migrations. No repository/adapter changes. The standing Cloudflare authorization applies but is **not exercised** by this planning pass.

## 2. API / network behavior relevant to loading UX

- **RSC navigation:** `rsc: 1` requests fetch the component payload only (no HTML). `staleTimes` controls warm-cache reuse.
- **TanStack Query:** client cache 5 min; `refetchOnWindowFocus:false`; mutations invalidate queries explicitly.
- **Hover prefetch:** `router.prefetch` + optional `queryClient.prefetchQuery` on `mouseEnter`/`focus`, debounced 150ms.
- **Route-loading overlay:** toggled by `navigation-ui-store.isNavigating` (set by `NavigationListener`).

## 3. Proposed new internal endpoint (PERF-02, owner-gated)

**`POST /api/internal/web-vitals`** (proposed; owner sink decision OPEN-PERF-01).

- **Request schema (PII-safe):**
  ```ts
  {
    metric: "LCP" | "INP" | "CLS" | "TTFB" | "FCP";
    value: number;          // metric value (ms or score)
    id: string;             // web-vitals metric id (opaque, non-PII)
    rating: "good" | "needs-improvement" | "poor";
    routePath: string;      // path only, query stripped, no hash/token
    deviceType?: "mobile" | "tablet" | "desktop";
    ts: number;             // client timestamp
  }
  ```
- **Response:** `204 No Content` (fire-and-forget via `sendBeacon`).
- **Auth:** none (anonymous RUM); same-origin enforced; rate-limited; POST-only; size-capped.
- **CSP:** add the endpoint origin to `connect-src` (same-origin), scoped.
- **Sampling:** client-side gated (e.g., 10% for LCP/CLS/TTFB, 100% INP) to respect free-tier Worker limits.
- **Storage:** written to Workers Observability as a custom log/metric (free-tier) or GA4 event (option b). No D1 write proposed (CWV are aggregate, high-volume; D1 is the wrong store). **No retention change.**
- **Validation:** redaction test (no PII fields), denial test (oversized/replay), rate-limit test.

**Cloudflare resource boundary:** stays inside Worker `archestimator-proof`, bound `EMAIL`/`ARCH_DB`/etc. untouched. No new binding required for the Workers Observability option.

## 4. Database change blueprint

**None.** This plan does not touch D1/R2/DO/Queue/Email. The PERF-02 beacon uses Workers Observability (logs/traces), not a new D1 table. If a future phase wants durable CWV aggregation, that is a separate, separately-approved migration with its own blueprint — out of scope here.

## 5. Shadow-path note for the beacon (PERF-02)

| Flow | Happy | Oversized | Malformed | Replay/dupe | Rate-limited | CSP-blocked | Offline |
|---|---|---|---|---|---|---|---|
| CWV beacon | 204 | 413 + drop | 400 + drop | idempotent (id dedupe optional) | 429, client backs off | beacon fails silently | `sendBeacon` queues on `pagehide` |

## 6. Backward compatibility

No API contract changes. The new endpoint is additive. Existing `/api/internal/client-error` unchanged.

## 7. Provider-proof boundary

This planning pass performs no provider mutation. The future PERF-02 implementation will need: Workers Observability dashboard readback (custom metric visible), hosted route probe (beacon returns 204), and CSP/headers verification. All inside bound resources.

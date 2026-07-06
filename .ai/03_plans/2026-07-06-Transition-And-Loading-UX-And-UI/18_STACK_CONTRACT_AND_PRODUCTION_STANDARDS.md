# Stack Contract and Production Standards

Consolidates the Next.js 16 / React 19 / Tailwind v4 / Cloudflare/OpenNext / D1/R2/DO/Queue/Email / Better Auth / TanStack Query / Zustand / TypeScript production decisions that cut across this plan. Numbers referenced, not duplicated, from `.ai/01_roadmap/27-*.md`.

---

## Next.js 16 (App Router)
- Cache Components **off** (current). `unstable_instant` is a future, owner-gated path (ARCH-05).
- `experimental.staleTimes: { dynamic: 60, static: 180 }` — deliberate; controls warm-nav re-suspend. Do not change without measurement.
- `experimental.optimizePackageImports: ["@phosphor-icons/react"]`.
- Streaming via `loading.tsx` + `<Suspense>`; fallback is **prefetched** (instant loading). LCP outside/above Suspense; LCP-image `preload`; skeletons match dimensions (CLS).
- `loading.tsx` does **not** wrap same-segment `layout.tsx`/`error.tsx`; layout-uncached-data blocks nav unless wrapped in Suspense.
- Token routes call `notFound()`/redirect **before** first `await`/Suspense for real HTTP status (REL-01).
- `viewport` export required in root layout (UX-05).
- `proxy.ts` is the active Next.js 16 middleware (per `27-*.md`); do not create `src/middleware.ts`.

## React 19
- Default Server Components; smallest `"use client"` boundary.
- Effects for synchronization only (cleanup). Derived state over mirrored state.
- `useTransition` for mutation feedback; `useDeferredValue` for expensive filtering.
- Memoization only for render-cost/referential-stability reasons.
- `use()` for promise unwrapping inside Suspense; no `React.lazy` (App Router uses `next/dynamic`).
- No hydration mismatches from unstable inputs.

## Tailwind v4 + design system
- `Skeleton` is canonical loading primitive; `Spinner` for indeterminate inline + debounced overlay.
- `lint:design-system` + `lint:design` (Impeccable) gates.
- `DESIGN.md` is alpha, not law.
- Reduced-motion (`motion-reduce`) on all loading animations.

## Cloudflare Workers / OpenNext
- Worker `archestimator-proof`, custom domain `archestimator.com`. `observability` on (logs 10% + traces 5% + invocation logs).
- Bound resources only: `ARCH_DB` (D1), `ARCH_UPLOADS_R2` (R2), `COLLAB_ROOMS` (DO), `UPLOAD_JOBS_QUEUE`, `EMAIL`, `IMAGES`, `ASSETS`.
- Free-tier posture: no paid add-ons without owner approval.
- Streaming pass-through to verify (ASSUMP-01); `X-Accel-Buffering`-style mitigation if needed.
- No D1/R2/DO/Queue/Email changes in this plan.

## Data (D1) — unchanged
- No migrations. No app-authz changes. Standing Cloudflare auth applies but is not exercised by this planning pass.

## TanStack Query (5.100.14)
- Defaults: `staleTime`/`gcTime` 5 min, `refetchOnWindowFocus:false`, `retry:1`, `mutations.retry:0`.
- No `useSuspenseQuery`/`HydrationBoundary` today — codify as options; introduce where SSR bridge pays off (share, estimate).
- No `fetch` in `useEffect` for server data (ARCH-03).

## Zustand (5.0.14)
- Colocated client UI state only (overlay, estimate UI, column widths, etc.). Never mirror server data.

## TypeScript
- Strict, no `any` without reason, exhaustive discriminated unions, typed boundaries. `tsc --noEmit` excludes tests (note: tests type-checked separately by vitest/bun).

## Security
- CSP per-route (Report-Only landing/workshop/invite; enforced `/share/:path*`). New beacon endpoint scoped narrowly in `connect-src`.
- PII scrub on client errors + RUM beacon (`27-*.md` Rule 8).
- Server Actions validate auth/authz/input/idempotency.
- Token material never logged/rendered/beaconed.

## Performance
- Budgets in `27-*.md` (3-tier). Evaluator contracts in `09_...md`.
- Heavy modules `ssr:false` dynamic (ExcelJS, D3, react-complex-tree, AI, PDF).
- Instrumentation idle-deferred.
- Bundle impact stated per change; >10KB main-bundle regression flagged.

## Reliability/ops
- Route error boundaries + global-error fallback.
- bfcache via `BfcacheHandler`; manual Chrome gate remains.
- Rollout: CI → Worker deploy → closed-beta RUM observation → production.

## Verification policy (AGENTS.md)
- Proportional. UI cosmetic → static/lint/unit; interaction/routing/auth/responsive/a11y-complex → browser proof. This pass: static review only (planning).

# 18 — Stack Contract And Production Standards — Production RUM And CWV Telemetry

Consolidates the cross-cutting stack decisions for this pack. Baseline: Next.js
16.2.10, React 19.2.7, Bun 1.3.14, TypeScript, Tailwind v4, OpenNext on
Cloudflare Workers, D1, R2, Durable Objects, Queues/Cron, Cloudflare Email,
Better Auth, TanStack Query, Zustand, repository boundaries (AGENTS.md).

## Next.js App Router / rendering

- The RUM client is a `"use client"` component mounted once in
  `src/app/providers.tsx` (the existing global client mount). Justification:
  it registers browser-only listeners (`visibilitychange`, `pagehide`,
  `web-vitals` callbacks) that cannot run in a Server Component.
- Smallest safe `"use client"` boundary: the `RumReporter` component itself.
  The heavy `web-vitals` import is inside it; the rest of `providers.tsx` is
  unaffected.
- The route handler `/api/internal/rum` is a standard Route Handler
  (`src/app/api/internal/rum/route.ts`), public, no Server Action, no auth.
- No change to `loading.tsx`/error boundaries/Suspense/metadata/navigation.
- No Server Component calls a Route Handler internally (the client POSTs directly).

## Cache / revalidation / freshness

- N/A. The RUM path is write-only from the client. No `use cache`, `cacheLife`,
  `cacheTag`, `revalidateTag`, TanStack Query, or Zustand involvement. The D1
  rollup table is the cache for long-window AE queries, refreshed by cron.

## Server Actions / forms / mutations

- None. The beacon is a `POST` to a Route Handler, not a Server Action. No form,
  no mutation, no optimistic UI, no progressive-enhancement concern (the beacon
  is enhancement-only; its absence is silent).

## React component quality

- `RumReporter` renders `null`; all work is in `useEffect` (listener
  registration + `web-vitals` callbacks) with cleanup on unmount.
- No derived/mirrored state; no effects for render derivation; no memoization
  needed (nothing re-renders).
- Stable: no list, no keys, no closures over stale props.
- Typed: no `any`; payload type is an allowlisted union.
- Reuse: models sender on `src/lib/observability/client-error-report.ts`.

## Tailwind v4 / design-system

- N/A. No visual surface. No new tokens, no design-lint impact. The privacy-
  notice edit uses existing typography.

## State management

- Module-local buffer in `rum-client` (pending metrics awaiting flush). Not
  React state, not Zustand, not URL state. Ephemeral, cleared on flush.

## TypeScript / validation / domain modeling

- Typed payload (`RumPayload`), typed AE data point, typed rollup row.
- Runtime validation at the trust boundary (route): allowlist schema
  (`zod`-style or hand-rolled allowlist — match the repo's prevailing pattern;
  the client-error route is the reference). No `any`, no unsafe casts.
- Domain types prevent impossible states (e.g. `rating` is a union, not string).
- D1 row model for `rum_rollup` added to `src/lib/types/database.ts` if that is
  the repo pattern (verify before implementing).
- Worker Env types regenerated via `bun run cf:typegen` after the `RUM` binding.

## Cloudflare D1 / R2 / DO / Queues / data integrity

- New D1 table `rum_rollup` in `ARCH_DB` (migration `0039`). Service/cron-only;
  no user-facing repository or app-authz path. Aggregate-only; no PII.
- No R2/DO/Queue change.
- Cron: extend `scheduled()` or add a cron entry (ASSUMP-5).
- Standing Cloudflare authorization (AGENTS.md) covers the binding + migration.

## Security / privacy / abuse

- Public endpoint, no auth (deliberate — SEC-04). Same-origin + Fetch-metadata
  gate + per-IP rate limit + 8KB cap + schema allowlist + value-range sanity +
  redacting logger. No IP persistence. No `request.cf`. No managed analytics on
  workshop. Full threat model in `08`.

## Performance / scalability / budgets

- Hot path (beacon POST) is AE-only — never D1 — so per-row-scan cost never
  hits a user request. Bundle budget ≤+3KB. bfcache preserved. Full evaluator
  in `09`.

## Reliability / observability / operations

- Best-effort, non-blocking, silent failures. Aggregate route logs. Daily budget
  alarm. Cron idempotent upsert. Rollout rings + flags + rollback in `13`.

## Accessibility / product UX

- No new interactive surface. Privacy-notice edit keeps semantics. Browser proof
  scoped to TEST-03/04 only (proportional).

## Testing for the stack

- Unit (`bun test` / `test:dom`), targeted E2E (`test:e2e` for beacon;
  `test:e2e:perf` for bfcache). Provider proof at deploy (`OPEN-EVID-01`).
  Matrix in `12`.

## Provider-boundary discipline

- Only bound resources (Worker `archestimator-proof`, D1 `ARCH_DB`, AE dataset
  under the same account). Never the historical Supabase project or other
  accounts. Free-tier only.

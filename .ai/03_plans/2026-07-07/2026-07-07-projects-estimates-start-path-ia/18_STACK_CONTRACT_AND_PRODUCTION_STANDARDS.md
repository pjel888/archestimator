# 18 — Stack Contract And Production Standards

Consolidates the cross-cutting production decisions for the active Archestimator stack. The start-path implementation must honor these.

## Stack baseline (verified from `package.json` + `wrangler.jsonc`)

- **Next.js 16.2.10** (App Router). Consult `node_modules/next/dist/docs/` before framework-sensitive claims.
- **React 19.2.7** / `react-dom` 19.2.7.
- **Bun 1.3.14** (`packageManager`); **TypeScript**; **Tailwind v4**.
- **OpenNext on Cloudflare Workers** (`@opennextjs/cloudflare` ^1.20.1); Worker `archestimator-proof`.
- **Cloudflare D1** `ARCH_DB`, **R2** `ARCH_UPLOADS_R2`, **Durable Object** `COLLAB_ROOMS`, **Queue** `UPLOAD_JOBS_QUEUE`, **Email** `EMAIL`, **Images** `IMAGES`. (Not touched by this plan.)
- **Better Auth 1.6.23** against D1.
- **TanStack Query** 5.100.14 (estimate tree/queries); **Zustand** 5.0.14 (estimate workspace UI + project estimates list).

## Next.js App Router & rendering (gates)

- Server Components by default; the new empty-state UI lives inside existing Client components (`ProjectsPageClient`, `ProjectDashboardClient`, `ProjectEstimatesClient`, `EstimateSheetContent`).
- No new `"use client"` boundary beyond those. No server-only data leaked to client (empty states use counts/arrays already in props).
- No Server Component calls an internal Route Handler (none exist here).
- Loading/error/not-found: existing per-route files suffice; no new route segments.

## Cache, revalidation, freshness

- Projects list: RSC prop + `router.refresh()` (no TanStack Query list cache).
- Estimates list: per-mount Zustand store + optimistic reconcile/rollback.
- Estimate editor: TanStack Query keys (`estimateQueryKeys`).
- Revalidation: `revalidatePath("/workshop/projects")`, `revalidateProjectEstimatePaths`.
- Read-your-own-writes: preserved by optimistic + reconcile. Empty states flip off once data is non-empty.

## Server Actions / mutations

- No new Server Actions. Existing: `createProjectRecord`, `createEstimateSheetDraft`, `insertEstimateTemplateIntoEstimate`, `insertEstimateRowItemFromLibrary`.
- Every action already does `requireAuth` + workspace scoping + validation + revalidation. UI gating (CTA disabled) is convenience; the action is the enforcement.

## React component quality

- New empty-state components: single responsibility, derived props, no effects, no mirrored state, typed props (no `any`), no nested card soup, reuse `EmptyState`.
- Stable keys (n/a for singletons). Memoization only if measured cost (default none).

## Tailwind v4 & design-system

- App-scale typography (`app-body` 10px, `app-label` 9px). Empty states use it.
- Reuse `src/components/ui/empty-state.tsx`.
- Pass `bun run lint:design-system`.
- `DESIGN.md` is alpha-stage — defer to owner on design conflicts; do not block/revert on design-system grounds.

## State management

- URL state: none added (DEC-04).
- Server props + `router.refresh()` for projects list.
- Zustand for estimates list; TanStack Query for editor; Durable Objects for realtime (unchanged).
- Empty-state visibility derived from the same props the optimistic layer mutates → stays consistent.

## TypeScript & domain modeling

- Typed props at every new component boundary. No `any`. No stringly-typed states. Existing `ProjectRow`/`EstimateRow` unchanged.

## Cloudflare D1 / R2 / DO / Queues

- Not touched. No migration (DATA-01). Workspace scoping preserved (DATA-02). Durable Object collab in the editor unchanged.

## Security & privacy

- No new trust boundaries/public surfaces. Server Actions enforce auth. Analytics redacted (SEC-02).

## Performance, reliability, operations

- Reuse perf evaluators (`projects-page-render-baseline`, `projects-page-rpc-contract`). No new server round-trips. Empty-state components trivial; lazy-load only if measured growth justifies.
- Closed beta, single branch; direct merge; revert-on-red.

## Accessibility

- Real buttons/links; focusable in DOM order; labeled regions; reduced-motion respected; non-color cues; responsive within existing shell. Browser proof deferred to implementation.

## Verification discipline

- `bun run type-check`, `bun run lint`, `bun run lint:design-system`, focused `bun run test:dom`, perf baselines. Targeted Playwright only for browser-only claims at implementation.
- Never claim hosted/provider/production proof from local checks.

## Framework-doc consultation note

This is a *planning* task; no framework-sensitive implementation claim is made. Implementation must consult `node_modules/next/dist/docs/` before editing Server Action / cache / rendering behavior (per AGENTS.md).

# 18 — Stack Contract and Production Standards

Cross-cutting production decisions for the in-scope stack layers. This pack touches only the **owner-side UI + surfacing**; backend/data/auth/email contracts are audited and intentionally unchanged.

---

## Next.js 16 App Router & rendering
- `PublisherPage` is a **Server Component** fetching the roster server-side in two Suspense boundaries. Unchanged.
- `"use client"` is scoped to `PublisherRosterClient`, `PublisherDrawer`, `RecipientEmailComposer` (the interactive boundary). This pack does not widen it.
- No Server Component calls an internal Route Handler instead of a data function (none here).
- `loading.tsx`/Suspense: `PublisherRosterSkeleton` covers initial load; drawer query has `staleTime 10s`. Unchanged.
- Metadata/navigation: unaffected.

## Cache, revalidation, freshness
- **Cache model (verified):** default (non-Cache-Components) — `next.config.ts` has no `cacheComponents` flag (Next.js 16.2.10). `fetch` defaults to no-store. Full per-route contract in `23_ROUTE_BOUNDARY_AND_CACHE_CONTRACT.md`; cited local doc `node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md`.
- **Revalidation primitive:** `revalidatePath` (`actions.ts:739,741`) after mutations. No `use cache`/`cacheLife`/`cacheTag`/`revalidateTag`/`unstable_cache` in scope.
- Drawer: TanStack Query (`publisherRosterQueryKeys.drawer(projectId)`), refetch-on-success via `refreshPublisherSurface` (`usePublisherDrawer.ts`). Cache owner = TanStack Query; key inputs = `projectId`; lifetime = `staleTime 10s`; revalidation trigger = mutation `onSuccess` + `router.refresh()` + `revalidatePath`.
- Roster: RSC + `router.refresh()` after mutations.
- Read-your-writes: satisfied by invalidation + refresh + `revalidatePath`.

## Server Actions, forms, mutations
- All sender actions already: enforce authz (`assertProjectPublicationManager`), validate input, handle idempotency (resend rate limit; revoke idempotent), return typed DTOs, batch-abort on unresolvable link.
- This pack **does not change action contracts** — only how their results/errors surface in the owner UI.
- Progressive enhancement: drawer actions are client-side (not form actions); the existing pattern is preserved.

## React component quality
- No new effect-driven render derivation; no new store; memoization only if measured cost appears (none anticipated).
- Stable keys for recipient chips (existing).
- No `any`; typed DTOs consumed.
- `RecipientEmailComposer` carries a `react-doctor/no-giant-component` annotation — this pack must not worsen it.

## Tailwind v4 & design system
- Reuse `src/components/ui/*` (`SheetDrawer`, `Modal`/`ConfirmDialog`, `DropdownSelect`, `Tabs`) and existing empty-state/chip patterns. No new primitives for Option B.
- `DESIGN.md` respected: alpha-stage guide, defer to Philip; no inner-content gradients (only `.publisher-canvas-wash`); `3px` radius for dense proposal surfaces.
- No new design tokens for Option B. (Option A would need responsive drawer sizing — flagged, not planned.)
- Storybook/visual QA: not mandated for Option B (proportional verification: DOM tests + targeted Playwright at 375px suffice per AGENTS.md).

## State management
- URL state (`status`,`project`,`q`,`page`,`pageSize`,`drawer`,`tab`) via Next router — shareable + reload-stable (deep-link `?drawer=&tab=` reproduces state).
- TanStack Query for drawer server-state.
- Local React state for interaction (copy chips, drawer open). No Zustand needed.
- No new synchronization boundary.

## TypeScript, validation, domain modeling
- Typed DTOs from action returns; runtime validation at trust boundaries already in `actions.ts`.
- No new `any`/unsafe casts.
- Discriminated unions for action results (existing pattern in `actions.ts` add-result union).

## Cloudflare D1 / R2 / DO / Queues / Email
- **D1:** audit-only; no migration (`07`). `ARCH_DB` binding unchanged.
- **R2 / DO / Queues / Cron:** explicitly unaffected.
- **Email:** `EMAIL` binding unchanged; send path audited (`transactional-email-client.ts` → `cloudflare-email-client.ts`). This pack asserts owner-side surfacing, not delivery.
- **No `cf:typegen`** (no binding change).

## Security, privacy, abuse
- Authz (`assertProjectPublicationManager`) unchanged and audited (`08`).
- Credential material (HMAC + AES-GCM + scrypt + cookies) unchanged and audited (`07`).
- New "copy URL" affordance copies the **page URL**, not raw tokens → no new secret exposure.
- Resend rate limit made visible (not weaker).

## Performance, reliability, ops
- Evaluator: PERF-01 (`09`) — build-chunk comparison + drawer-open Profiler median; ≤2% chunk / ≤50ms regression.
- Failure modes + recovery defined per action (`09`).
- No new telemetry sink mandated; optional structured logs must redact raw tokens/emails/IPs.

## Accessibility
- Keyboard/focus/live-region/semantics/responsive/reduced-motion/non-color-cues defined (`05`, REQ-A11Y-01/02).

## Testing
- Repository-native: `bun run type-check`, `bun run lint`, focused vitest, targeted Playwright @375px for browser-only viewport claims (`12`).

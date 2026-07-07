# 18 — Stack Contract and Production Standards

Consolidates the cross-cutting production decisions for the active Archestimator stack. (Numbered `18` per the exhaustive profile; `17` follows.)

## Active baseline (verified from `AGENTS.md` + repo)

Next.js 16, React 19, Bun, TypeScript, Tailwind v4, OpenNext on Cloudflare Workers, Cloudflare D1 (`ARCH_DB`), R2 (`ARCH_UPLOADS_R2`), Durable Objects (`COLLAB_ROOMS`), Queues/Cron, Cloudflare Email, Better Auth, TanStack Query, Zustand, repository boundaries. Supabase/Vercel/Resend are historical (reference/exit only).

## Next.js 16 / React 19

- **App Router:** library routes existing; no new route segments required (review actions are Server Actions within existing surfaces; import dialog is client component).
- **Server/Client boundary:** new actions are `"use server"` in `actions.ts`; new client surfaces (`LibraryImportDialog`, inspector toolbar) are `"use client"` inside already-client components. Smallest safe boundary preserved.
- **Data fetching:** repository layer (`component-library-repository.ts`) remains the read owner; Server Actions remain the mutation owner; TanStack Query for client cache; no Server Component calling an internal Route Handler.
- **Cache/revalidation:** `revalidateLibraryRoutes()` + TanStar invalidation; Cache Components not introduced by this plan (existing behavior preserved). If Cache Components are enabled repo-wide later, review actions must tag-invalidate library tags.
- **Server Actions:** treated as directly-reachable POST endpoints — authz inside each (`isCostLibraryGovernanceAdminInD1`); input validation; idempotency via `review_revision`; no `redirect()`/cookie mutation in new actions.
- **Streaming/Suspense:** existing library Suspense unchanged.

## React component quality (applies to new UI)

- Clear ownership of render/state/effects; derived state over mirrored; no effect-driven sync; stable callbacks only where protecting memoized children; cleanup for any subscription/listener (none expected here); stable keys; typed props (no `any`); sized for readability; design-system reuse first (`src/components/ui/`).

## Tailwind v4 / design-system

- No new tokens. Reuse chip tone classes. Import dialog uses existing table/dialog primitives. `DESIGN.md` is alpha — defer to owner.

## State management

- D1 = durable review/audit state; TanStar Query = client cache; Zustand only for existing `pendingLibraryCommitGate` local UI state; URL state for facets (existing). Synchronization: action returns updated row → `setQueryData` → read-your-own-writes.

## TypeScript / validation / domain modeling

- Typed action/repo/component boundaries; `ReviewStatus`/`CostEntryOrigin` discriminated enums prevent impossible states; runtime validation at trust boundary (action input) via existing `validateQuickAddComponentInput` shape; exhaustive handling of review-status variants in chips/gate/health; no `any`.

## Cloudflare D1 / R2 / data integrity

- D1 boundary: `ARCH_DB` only; additive migration `0038` (no new bindings; next free D1 slot after `0037_remove_preloaded_component_categories.sql`); repository helpers for new columns; app-authz (`isCostLibraryGovernanceAdminInD1`) — D1 has no RLS, so authz is app-enforced and denial-tested. **Migration-tree note:** D1 (`migrations/`, `00xx`) is the active runtime; Supabase (`supabase/migrations/`, timestamps) is reference/exit only.
- R2: attachments unchanged (existing `attachments/route.ts`).
- Transactions: accept/supersede use D1 transaction with `review_revision` optimistic guard; `cf:d1-rpc-transaction-proof.ts` template.
- Migration: ordered, additive, reversible-by-fix-forward, Mode A backfill.
- No KV source-of-truth; no new Queues/DO/Email (P4 stretch may add a Cron).

## Security/privacy

- Threat model in `08`; denial tests mandatory for every review/import action; input validation reused; no secrets/`NEXT_PUBLIC_`; tenant isolation via `workspace_id` predicate derived from entry row; CSV-injection neutralization.

## Performance/scalability

- Budgets + evaluators in `09`; computed-on-read stale propagation; indexed overview; per-workspace cap.

## Reliability/observability

- Error boundaries + reload banner; structured logs + telemetry + audit; flag-gated rollout; rollback procedures.

## Accessibility

- Keyboard/focus/ARIA per `05`; DOM tests + targeted browser proof.

## Testing

- Unit/DOM/integration/denial/perf/provider proof per `12`; lightest proof that proves the claim.

## Cloudflare-first (no hybrid default)

- All runtime work on Workers/D1/R2/Better Auth. Supabase reference-only.

## Legacy-provider boundary

- Supabase migration read-only; no runtime calls; `ebxxqidacheyapmmzavr` never mutated.

## Free-tier posture

- No paid add-ons without owner approval. Per-workspace cap + indexed queries keep within D1 free-tier read/row limits for closed beta.

## React/Next review gate (per directive §8A)

- Server/Client boundary justified: yes (above).
- `"use client"` scoped: yes.
- Server-only data/secrets out of client: yes.
- State colocated/derived: yes.
- TanStar/Zustand/URL/Server Action ownership correct: yes.
- Hooks deps/cleanup: yes.
- Memoization justified: yes (chips).
- Stable keys: yes.
- Semantic primitives: yes (existing ui/).
- Images/fonts/scripts/metadata: unaffected.

No `not-applicable` gates without reason; all relevant gates satisfied or addressed in `11`/`12`.

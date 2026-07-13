# 18 — Stack Contract and Production Standards

Consolidates the cross-cutting production decisions for the active Archestimator stack: Next.js 16, React 19, Bun, TypeScript, Tailwind v4, OpenNext on Cloudflare Workers, Cloudflare D1, R2, Durable Objects, Queues/Cron, Cloudflare Email, Better Auth, TanStack Query, Zustand, repository boundaries.

## Next.js 16 App Router / rendering

- **Route ownership.** No new routes. Manager Server Actions are the mutation surface; readiness is a server-only module consumed by existing actions.
- **Server vs Client.** Readiness computed server-side (Server Action + `readPublisherPublicationDrawerData` RSC data loader). Client receives only the redacted DTO. Smallest `"use client"` boundary preserved — only existing drawer/composer/dialog client components get new subcomponents.
- **Data fetching owner.** Drawer data (incl. readiness) via existing `readPublisherPublicationDrawerData` Server Action; recipient/message mutations via existing Server Actions; decision (`responded`) via existing public-repository path.
- **Suspense/loading.** Drawer skeleton extended to cover the readiness block (no new waterfall — parallel prefetch, PERF-02).
- **Progressive enhancement.** Send remains a Server Action form; readiness enforced server-side regardless of JS. The owner message fields are progressive — if JS is off, the form still sends with default copy (message fields are optional).
- **Prefetch/navigation.** No new routes; no prefetch changes.

## Cache, revalidation, freshness

- **Cache owner.** React Query (drawer key, 10s staleTime) for client; `React.cache` (existing) for public-repository per-request memoization.
- **Read-your-own-writes.** Existing `refreshPublisherSurface` invalidation covers readiness (same query key). After publish/republish the drawer refetches and readiness recomputes.
- **Staleness tolerance.** 10s (existing drawer staleTime) is acceptable for readiness — it's advisory; the hard gate (FR-04) re-checks at action time anyway.
- **Invalidation blast radius.** Scoped to publisher query keys (existing).
- **TanStack Query / Zustand split.** TanStack Query owns server state (drawer data incl. readiness); Zustand (`useEstimateHeaderActionsStore`) owns the header-action bridge (unchanged). No new Zustand store. URL state unchanged.
- **Cache Components / `use cache`.** Not introduced by this pack. Existing patterns preserved.

## Server Actions, forms, mutations

- **Invocation.** Existing Server Actions (`createProjectPublication`, `republishProjectPublication`, `addSharedLinkRecipients`, `resendSharedLinkRecipientEmail`, `submitSharedLinkDecision`).
- **Auth/authz inside mutation.** Reused: `assertProjectPublicationManager` (manager), token-hash + SEC-06 (recipient).
- **Validation.** zod for new message fields (120/1000); existing validation preserved.
- **Idempotency/duplicate-submit.** Existing (`replace_project_publication` revokes prior; recipient dedup; decision dedup; resend rate limit + optimistic lock).
- **UI states.** Pending (`publicationActionInFlightRef`), success (toast + status flip), validation-error (inline field errors for message), authorization-error (existing), conflict (optimistic lock), rollback (flag).
- **Cache invalidation.** Existing `refreshPublisherSurface`.

## React component quality

- No new effects for render derivation; readiness is passed as props.
- No memoization added unless a Profiler shows a hot path (RISK-08); default to computing once per drawer open.
- Stable keys preserved (recipient list, readiness check list keyed by `id`).
- Typed events/props; no `any`.
- Reuse alert/list primitives (DEC-07); no nested card soup; semantic roles for a11y.

## Tailwind v4 / design-system

- No new tokens; reuse existing alert/status/card/input/textarea variants.
- `lint:design-system` expected green (verify in implementation).
- `DESIGN.md` treated as alpha-stage; defer to existing patterns + Philip.

## State management

- TanStack Query (server state), Zustand (header bridge, unchanged), URL state (unchanged), local React state (composer message drafts).
- Synchronization: drawer refetch on publish (existing); readiness recomputes; no effect-driven mirror.

## TypeScript / validation / domain modeling

- `ProposalReadinessResult`, `ReadinessCheck`, `ReadinessCheckId` union (exhaustively handled in UI switch).
- zod at boundaries for message fields.
- No `any`, no unsafe casts, no stringly-typed statuses (reuse existing unions).

## Cloudflare D1 / R2 / Durable Objects / Queues / Email / data integrity

- **D1.** Additive nullable migration `0037` (under standing mandate). No new tables. `responded` uses existing CHECK value. All writes parameterized; `UPDATE` scoped.
- **R2.** Untouched.
- **Durable Objects.** Untouched.
- **Queues/Cron.** Untouched.
- **Email.** Cloudflare Email Service (unchanged provider); message content change only; existing circuit breaker + `recordEmailFail`.
- **Backup/recovery.** Existing daily D1 backups + `cf:d1-restore-rehearsal`; migration is nullable → trivial fix-forward.
- **Cost posture.** No paid add-ons; readiness adds negligible D1/query cost (0 new queries on critical path).

## Security / privacy / abuse

- Threat model in `08`. Reuse of `assertProjectPublicationManager`, token-hash, scrypt, HMAC cookies, CSRF. Plain-text owner message + escape. Server-only readiness. Workspace-scoped notifications. Rate limits reused.

## Performance / scalability / budgets

- Budgets + evaluator in `09`. Hot path = `buildProposalExportModel` (bounded by export caps). Drawer parallel prefetch. No client bundle increase. No new D1 queries on critical path.

## Reliability / observability / operations

- Failure modes in `09`. Structured logs (no PII). Flags + rollback in `13`. No new dashboards for v1 (closed beta).

## Accessibility / product UX

- a11y in `05`: keyboard, focus, live regions, contrast (reuse alert variants), reduced motion, responsive (drawer mobile-gating inherited).

## Testing for the stack

- Unit (readiness, redaction), action/integration (gate, responded, message, notifications), DOM (drawer/composer/dialog), bench (perf), broad `validate`+`build` for shared/auth/data. Playwright opt-in only if a browser-only claim arises.

## Production deployment (OpenNext/Cloudflare Workers)

- No Worker Env binding changes → no `cf:typegen` needed.
- No `wrangler.jsonc` changes.
- Migration applied via `cf:d1-apply-local` then `wrangler d1 migrations apply --remote`.
- No new route handlers → no proxy/middleware impact.
- Build green (`bun run build`) required before rollout.

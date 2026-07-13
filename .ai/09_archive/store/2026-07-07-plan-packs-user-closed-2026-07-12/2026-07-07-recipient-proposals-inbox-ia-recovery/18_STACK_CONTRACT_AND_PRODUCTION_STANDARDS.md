# 18 — Stack Contract and Production Standards

This consolidates the cross-cutting production decisions for the in-scope stack layers. It is the single reference for "what the implementation must obey" across Next.js, React, data, security, and design-system.

## Stack baseline (verified from repo)

- **Next.js 16** App Router (read `node_modules/next/dist/docs/` before framework-sensitive work).
- **React 19.**
- **Bun** (runtime + test runner).
- **TypeScript** strict.
- **Tailwind v4** (CSS-layer tokens).
- **OpenNext on Cloudflare Workers** (`archestimator-proof`).
- **Cloudflare D1** `ARCH_DB` (the active app + auth data store).
- **Cloudflare R2** `ARCH_UPLOADS_R2` (not touched by this pack).
- **Durable Objects** `COLLAB_ROOMS` (not touched).
- **Queues/Cron** (not touched).
- **Cloudflare Email** (outbound; delivery OFF by default — not wired by this pack).
- **Better Auth** (magic link + Google OAuth; D1-backed sessions; `session.cookieCache.enabled=false`).
- **TanStack Query** (recipient-proposals list; `share-decision`).
- **Zustand** (not used on this surface).
- Latest migration: `0039_project_status.sql`. Supabase/Postgres/Vercel/Resend are historical only.

## Next.js App Router and rendering (gates for this pack)

| Gate | Decision |
|---|---|
| Route segment ownership | `/workshop/proposals` (RSC + one client island), `/share/[token]` (RSC `force-dynamic` + client islands) — unchanged |
| Server vs Client composition | Inbox: single `"use client"` (`proposals-page-client.tsx`). Share: existing islands. **No new `"use client"` except the route `error.tsx`** |
| Smallest safe `"use client"` | Preserved; new CTAs are server-action forms or links |
| Data fetch owner | Inbox listing = RSC `page.tsx` → repository (SSR-seeded TanStack Query). Open action = Server Action. Decision = Route Handler. **Unchanged** |
| Request-time APIs | `cookies()` for session read; `headers()` for CSRF; `params`/`searchParams` for token/recipient — unchanged |
| Suspense/loading | `ProposalsListSkeleton` (inbox), share `loading.tsx` — unchanged |
| Prefetch | Default; no change |
| Metadata | `generateMetadata` on share (generic OG, no totals/client leak) — unchanged; terminal states render **no** metadata |

## Cache, revalidation, freshness

| Surface | Cache owner | Staleness | Revalidation | Read-your-writes |
|---|---|---|---|---|
| Inbox list | TanStack Query `["recipient-proposals", email]` | `staleTime: 30_000` | debounced focus/visibility + manual | after a share-page decision, navigating to inbox triggers a debounced refresh (FR-02) |
| Share decision | TanStack Query `["share-decision", token]` | `retry: false`, `enabled: isValid` | refetch on 409-already-submitted | lock-on-submit |
| Share page | none (`force-dynamic`) | n/a | n/a | n/a |

No `use cache`/`cacheLife`/`cacheTag` changes. No Next.js fetch-cache directives carried over.

## Server Actions, forms, mutations

| Mutation | Surface | Auth | Validation | Idempotency | UI states | Cache invalidation |
|---|---|---|---|---|---|---|
| `openRecipientProposalAction` | Server Action (form) | `requireCurrentUserContext` + authorize RPC | UUID | idempotent (cookie mint) | Review→Opening→disabled; error→CTA | TanStack refetch on action error |
| `loadRecipientProposals` | Server Action (query) | signed-in | email non-empty | read | soft/hard error | TanStack |
| Decision POST | Route Handler | CSRF + P5 session | enum + length + target-id | unique index → 409 | pending→recording→lock | refetch persisted decision |
| Sign-out (wrong-account CTA) | Better Auth sign-out | session | n/a | idempotent | redirect to `/login` | n/a |

Progressive enhancement: the open-action form works without JS (native form → Server Action → redirect). The decision flow requires JS (fetch + dialog) — existing, accepted for the share surface.

## React component quality

- No new effect-driven derivation. The `ProposalRow` `useEffect` (action-error forward) is existing and correct.
- No new memoization needed (copy-level changes).
- Stable keys preserved (`publicationId`).
- No `any`; typed props (`ProposalRowProps`, `DecisionUiState`).
- Reuse existing primitives (`Button`, `Card`, `<dialog>`, chips).

## Tailwind v4 + design system

- Reuse existing tokens. No new design tokens for V1.
- `DESIGN.md` is alpha-stage — defer to Philip; do not block.
- No design-lint regression expected (no new ad hoc primitives).

## State management

- TanStack Query for server state (inbox, decision).
- Local React state (`useActionState`, `useReducer`) for interaction.
- No Zustand. No URL state new. D1 authoritative.

## TypeScript, validation, domain modeling

- Typed boundaries preserved. No `any`. No unsafe casts.
- Runtime validation at trust boundaries (UUID, enum, length) — existing; no new surface.

## Cloudflare D1, R2, DO, data integrity

- D1 `ARCH_DB`: read-only listing (unchanged query); decision insert (unchanged). No migration.
- No R2/DO/Queue touch.
- App-authorization: `authorize_recipient_publication_for_current_user` (open action), `verifySharedLinkSessionCookieValue` (decision). Unchanged.
- Provider-proof boundary: D1 readback of listing + decision insert (deferred to implementation).

## Security, privacy, abuse resistance

- Token model: HMAC hash (lookup) + AES-GCM encrypted (recoverable) + signed cookies. **Unchanged.** See `08`.
- Authority separation: app session ≠ P5 share session. **Unchanged.**
- CSRF: `assertSameOriginPublicPost` on decision route. Server Actions have built-in origin checks.
- Anti-enumeration: terminal-state differentiation only after row resolution (SEC-05).
- Non-leaky wrong-account CTA (SEC-04).
- Credential-free DTO (DATA-02).

## Performance, scalability, budgets

- No new query/API/binding. Bundle ±0 (except route `error.tsx`).
- Listing LIMIT 50, index-backed.
- Gates in `09` + `13`.

## Reliability, observability, operations

- New share `error.tsx` (FR-10b). Existing traces/logs cover data paths. No new metric.
- Rollback = revert files. No migration.

## Accessibility

- Keyboard/focus/SR/non-color cues defined in `05`. DOM tests in `12`.

## Testing

- Primary gate: `bun run test:dom`. Build: `bun run build`. E2E opt-in.

## Production standards checklist (for the implementer)

- [ ] Re-read every touched file immediately before editing (6 sibling packs concurrent).
- [ ] No new `"use client"` except route `error.tsx`.
- [ ] No new query/migration/binding/cookie.
- [ ] Credential-free DTO assertion stays green.
- [ ] Terminal copy distinct (expired ≠ revoked ≠ unknown).
- [ ] Wrong-account CTA has no email in the DOM.
- [ ] Decision immutability preserved (409 reload+lock).
- [ ] `bun run type-check && bun run lint && bun run test:dom && bun run build` green.
- [ ] Update `current-state.md` after implementation (DOC-01).

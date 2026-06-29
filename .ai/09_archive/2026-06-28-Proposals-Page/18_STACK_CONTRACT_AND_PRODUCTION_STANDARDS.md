# 18 - Stack Contract and Production Standards

This document consolidates the cross-cutting implementation standards for the Proposals page.

## Next.js 16 / App Router

- `src/app/workshop/proposals/page.tsx` is a Server Component.
- `WorkshopPageShell` provides the workshop shell and sidebar.
- Suspense wraps the async data component; `loading.tsx` provides route fallback.
- Client components are limited to interactive list behavior, retry/refresh state, and Review form pending state.
- No new Route Handler is introduced for the inbox. The Review bridge is a Server Action.
- The Server Action must be treated as a directly reachable POST endpoint: validate `publicationId`, require auth, authorize target publication, recheck status, and return/redirect without leaking credential material.

## React 19

- Prefer simple function components.
- Use the existing form/action pattern for Review. If `useActionState` is used for failure paths, success must still be a server-side `redirect()`.
- Avoid local derived-state effects. TanStack Query owns refetch state.
- No Context/Zustand/localStorage for this surface.

## Client/server data ownership

| Data | Owner |
|---|---|
| Initial list | Server Component -> server-only repository |
| Client refetch | TanStack Query -> explicit `"use server"` loader in `src/lib/recipient-proposals/actions.ts` |
| Review mutation | `<form>` -> `openRecipientProposalAction` |
| Share session | Existing shared-link session cookies from publication security helpers |
| URL state | None for v1 |

No client component imports server-only repositories, service clients, or credential helpers.

## Credential material contract

| Material | Client-visible? | Rule |
|---|---|---|
| Raw publication token | Only as existing `/share/[token]` URL after successful authorization | Never store in list DTO/action state |
| `project_publications.token_hash` | No | HMAC lookup key only; never a URL token |
| `project_publications.encrypted_token` | No | Server-side recovery source for raw token |
| Raw recipient token | No | Existing emailed/session flow only; not part of inbox bridge |
| `shared_link_recipients.recipient_token_hash` | No | Credential lookup hash; never returned |
| Shared-link session cookie | HttpOnly | Set by existing helper; `_ok` marker is non-secret |

## Supabase/Postgres

- Project boundary: `ebxxqidacheyapmmzavr`.
- New migration is additive and idempotent.
- RPCs use `security definer`, `set search_path = public`, typed returns, `revoke execute from public, anon`, and `grant execute to authenticated`.
- List RPC returns summaries only.
- Authorization RPC returns only `publication_id` and `recipient_id`.
- Privileged read of `project_publications.encrypted_token` happens only in the Server Action after authorization.
- Run `bun run gen:types` after applying migration.

## UI and design

- Use existing workshop visual language and `src/components/ui/` primitives where practical.
- SF Pro, app font size max 12px, regular/medium weights, zero letter-spacing, restrained neutral palette.
- No nested card layouts or marketing-style hero.
- Proposals row is document/inbox-like: project, sender/workspace, published/last activity, status label, optional decision chip, Review action.
- Expired/revoked rows are visible but disabled.

## Accessibility

- Page has a clear heading and list semantics.
- Status is text + icon, not color-only.
- Review controls are keyboard reachable for active rows.
- Disabled rows expose disabled/unavailable state and reason.
- Browser smoke must include keyboard/focus sanity for the Review path.

## Performance

- No new dependency.
- Keep client boundary small.
- RPC budget: p95 <= 300ms for 50 fixture publications; rollback trigger above 500ms.
- Route TTFB budget: <= 500ms locally for authed fixture.
- Add pagination only if proof shows recipient volume requires it.

## Testing and proof

Required implementation proof:

- Provider SQL for list and authorization RPCs.
- Action tests for success and denial/unavailable paths.
- DOM tests for loading, empty, success, error, expired/revoked, status labels, and sidebar.
- Static credential leak checks.
- Browser smoke for real same-tab Review click/session/redirect.
- Type-check, lint/design-lint where applicable, and build.

Browser proof is not optional for the cookie/redirect claim because that behavior depends on a real browser navigation surface.

## Operations

- No feature flag required for v1.
- Rollback drops the two new functions and index, then reverts app code.
- No user data is added or mutated by the migration.
- Post-implementation docs should update `.ai/10_state/current-state.md` and `.ai/10_state/decisions.md`.

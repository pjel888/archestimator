# 06 — Architecture and Technical Design

## Current-state architecture

```
Anon / share token visitor
  -> /share/[raw-publication-token]
  -> token is hashed server-side
  -> project_publications.token_hash lookup
  -> snapshot render
  -> optional recipient session cookie from raw recipient token

Signed-in workshop user
  -> /workshop/*
  -> WorkshopPageShell (RSC)
  -> getCurrentUserContext()
  -> workspace-scoped app surfaces
```

There is no signed-in home for a user who is also a shared-link recipient. Their received proposals are reachable only from email/share URLs.

## Target-state architecture

```
Signed-in recipient
  -> /workshop/proposals
  -> WorkshopPageShell (RSC)
  -> requireCurrentUserContext()
  -> listRecipientProposals()
  -> createSupabaseServerClient()
  -> RPC list_recipient_publications_for_current_user(page_limit: 50)
       - auth.uid() -> auth.users.email
       - lower(email) match across shared_link_recipients
       - joins publication/project/workspace/sender rows
       - returns denormalized list fields only
       - does NOT return token_hash, encrypted_token, or recipient_token_hash
  -> ProposalsPageClient(initialResult)
```

```
Recipient clicks Review proposal
  -> openRecipientProposalAction(formData)
  -> requireCurrentUserContext()
  -> validate publicationId
  -> RPC authorize_recipient_publication_for_current_user(publicationId)
       - returns publication_id + recipient_id only if caller email is a recipient
  -> server-only publication admin/client reads encrypted_token/password_hash/status
  -> decrypt encrypted_token to raw publication token
  -> derive credentialVersion from password_hash
  -> getSharedLinkSessionCookieParts({ token, publicationId, credentialVersion, recipientId })
  -> set HttpOnly session cookie + non-secret _ok companion cookie
  -> redirect("/share/[raw-publication-token]")
```

## Component boundaries

| Layer | File | Type | Responsibility |
|---|---|---|---|
| Route | `src/app/workshop/proposals/page.tsx` | RSC | Auth gate, shell, Suspense, calls repository |
| Route | `src/app/workshop/proposals/loading.tsx` | RSC | Route loading skeleton |
| Data | `src/lib/repositories/recipient-proposals-repository.ts` | server-only | Calls list RPC, maps typed result, handles errors |
| Client read wrapper | `src/lib/recipient-proposals/actions.ts` | `"use server"` | Calls repository for TanStack focus refresh |
| Action | `src/lib/publication/actions.ts` | server | `openRecipientProposalAction` and server-only bridge |
| View | `src/components/workshop/proposals-page-client.tsx` | client | Renders page, owns focus refresh and action state |
| View | `src/components/workshop/proposals-page/*` | client/server | List, row, skeleton, empty, error states |
| Sidebar | `src/components/sidebar/MainSidebar.tsx` | client | Adds Proposals nav item above Publisher |

## State ownership

| State | Owner | Notes |
|---|---|---|
| Initial list data | Server Component fetch | Pre-rendered HTML; no blank page |
| Refreshed list data | TanStack Query calling `loadRecipientProposals()` | Query key `["recipient-proposals", userEmail]`, `staleTime: 30_000` |
| URL state | None in v1 | No filters or pagination |
| Review action state | Server Action / form state | Success redirects server-side; failures render inline/toast |
| Share session | Existing share-link cookies | Same shape as `/api/share/[token]/session` |

## Data flow

1. Route renders and calls `listRecipientProposals()`.
2. Repository calls `list_recipient_publications_for_current_user`.
3. RPC returns list DTO rows without credential material.
4. RSC passes the result into `ProposalsPageClient`.
5. Client renders populated, empty, error, disabled, and refresh states.
6. Focus refresh calls `loadRecipientProposals()` through TanStack Query; the client never imports the server-only repository.

On Review:

1. `<form action={openRecipientProposalAction}>` posts `publicationId`.
2. Action authorizes the signed-in recipient with the Security Definer RPC.
3. Action resolves raw publication token server-side from `encrypted_token`.
4. Action sets existing share-session cookies and redirects same-tab to `/share/[token]`.
5. Existing `/share/[token]` validates the session cookie on the next request.

## Architectural alternatives considered

### Alternative 1: Direct query with RLS

Rejected. Recipient self-reads are blocked by the manager-only publication RLS model.

### Alternative 2: Return `project_publications.token_hash` to the client

Rejected hard. `token_hash` is an HMAC lookup key, not the raw URL token. `/share/<token_hash>` will not resolve, and exposing it is unnecessary.

### Alternative 3: Return `recipient_token_hash` to the action/client

Rejected. The existing session cookie does not use `recipient_token_hash` directly; it needs raw publication token, publication id, credential version, and recipient id. Returning the recipient hash increases exposure without solving the bridge.

### Alternative 4: Add `claimed_user_id`

Rejected for v1. Email match is simpler and matches the requested behavior. Revisit if email-change handling becomes a real workflow.

### Alternative 5: New HTTP API route

Rejected. RSC handles initial reads, a Server Function handles focus refresh, and a Server Action handles Review. No new explicit `src/app/api/*` surface is needed.

## Architectural decisions

### ARCH-DEC-001: Security Definer RPC for recipient self-read

Use a Security Definer RPC with `auth.uid()` scoping. This bypasses manager-only RLS only for the bounded list and authorization paths.

### ARCH-DEC-002: Server-only token/session bridge

The Review action may use the existing publication admin/client pattern only after `authorize_recipient_publication_for_current_user` confirms the caller is a recipient for the publication. The action decrypts `encrypted_token` server-side, sets the existing cookie shape, and redirects. No hash is serialized.

### ARCH-DEC-003: Same-tab server redirect

Owner-delegated decision: Review uses same-tab `redirect()` after cookies are set. This preserves progressive enhancement and makes browser Back the return path.

### ARCH-DEC-004: TanStack Query with explicit Server Function wrapper

RSC owns first paint. TanStack Query may refresh on focus, but only through `loadRecipientProposals()` from a `"use server"` module. Client components must not import `server-only` code.

## Failure boundaries

| Boundary | Behavior |
|---|---|
| List RPC raises `42501` | Repository returns unauthorized; route/login behavior handles it |
| List RPC raises unknown error | Page renders inline error and retry |
| Focus refresh fails | Existing rows stay visible; error state/toast is shown |
| Authorization RPC returns no row | Action returns `not-a-recipient` |
| Publication missing/revoked/expired between list and click | Action returns `unavailable`; client refreshes list |
| Token decrypt fails | Action returns `unavailable` and logs generic error without token material |
| Migration fails | Implementation halts until provider/local SQL proof passes |

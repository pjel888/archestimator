# 15 — Decisions, Assumptions, and Alternatives

## Owner-delegated planning decisions

Philip granted owner authority for this planning-only improvement pass. The council findings in `20_OWNER_DELEGATED_DECISIONS_AND_COUNCIL_REVIEW.md` were used to resolve reversible product/technical choices inside the plan.

| ID | Decision | Choice | Status |
|---|---|---|---|
| ODD-001 | Review click behavior | Same-tab Server Action `redirect()` after cookies are set | Resolved |
| ODD-002 | Status taxonomy | `New`, `Opened`, `Decision submitted`, `Expired`, `Revoked`; detail chips for accepted/declined/revision | Resolved |
| ODD-003 | Sidebar shortcut | Proposals `⌘4`; Publisher `⌘5` | Resolved |
| ODD-004 | Expired/revoked rows | Visible but disabled; action returns `unavailable` | Resolved |
| ODD-005 | Token/session bridge | Server-only action decrypts `encrypted_token` after recipient authorization; no hashes to client | Resolved |
| ODD-006 | Focus refresh | TanStack Query may call explicit `"use server"` `loadRecipientProposals()` wrapper; client never imports server-only repository | Resolved |

There are no remaining owner decisions blocking implementation start.

## Architectural decisions

### DEC-001: Security Definer RPC for recipient self-reads

**Problem**: Recipients need to read their own recipient rows; manager-only RLS blocks direct access.

**Chosen**: Security Definer RPC with `auth.uid()` scoping.

**Rejected**:

- New broad RLS policy: wider attack surface.
- Service-role list repository: unnecessary for the list and easier to misuse.

### DEC-002: Email match over `claimed_user_id`

**Chosen**: Runtime match on `lower(shared_link_recipients.email) = lower(auth.users.email)`.

**Reason**: Matches user intent: all publications sent to the email across workspaces. Avoids adding account-claim lifecycle in v1.

**Revisit when**: email-change workflows become common enough to require historical account binding.

### DEC-003: Authorization RPC + server-only token resolver

**Chosen**: `authorize_recipient_publication_for_current_user(publicationId)` returns only `publication_id` and `recipient_id`. The Server Action then uses the existing publication admin/client pattern to read `encrypted_token`, decrypt the raw token, derive credential version, set cookies, and redirect.

**Rejected**:

- Returning `recipient_token_hash`: not needed for existing cookie helpers and increases exposure.
- Returning `project_publications.token_hash`: not a URL token and would create dead `/share/[token]` links.
- Reading `project_publications` with caller-auth client: recipient users are not publication managers and RLS would block it.

### DEC-004: Server Action over Route Handler

**Chosen**: Server Action for Review. RSC/Server Function for reads. No new explicit API route.

**Reason**: Fits App Router conventions and avoids a larger public API surface.

### DEC-005: Same-tab redirect

**Chosen**: Server Action calls `redirect()` after setting cookies.

**Reason**: Preserves no-JS form behavior and avoids a client-only navigation path.

### DEC-006: Top-level nav slot above Publisher

**Chosen**: Proposals above Publisher, with shortcuts shifted by order.

**Reason**: User explicitly requested top-level nav above Publisher.

## Assumptions

### ASSUMP-001: Supabase Auth email is verified

Signed-in `auth.users.email` is treated as verified by the current auth providers/gate. If a future auth provider does not guarantee verification, this feature needs a provider-onboarding security review.

### ASSUMP-002: Closed-beta allowlist includes intended recipients

Recipients who sign in are subject to the closed-beta gate. Operationally, recipient emails must be allowed before they can use `/workshop/proposals`.

### ASSUMP-003: Recipient inbox is small in v1

V1 returns top 50 rows, capped at 100. Cursor pagination is out of scope.

### ASSUMP-004: Sidebar branch conflicts are resolvable

If `MainSidebar.tsx` changes before implementation, rebaseline before Phase 5.

## Rejected alternatives summary

| Alternative | Rejection reason |
|---|---|
| Build `/share/[token]` from `project_publications.token_hash` | Hash is not the raw route token; URL would not resolve |
| Return `recipient_token_hash` to the client/action state | Credential material; existing session helper does not need it |
| Hide expired/revoked rows | Worse recipient comprehension; visible disabled rows are clearer |
| New `/api/proposals/*` route | Unnecessary surface; App Router Server Functions/Actions cover the flow |
| Add realtime inbox updates | V1 can use focus refresh |
| Add estimator Sent view here | Belongs in Publisher and is a separate plan |
| Google sign-in as password | Larger access-mode change; separate security/product work |

## Future decisions (out of v1 scope)

- Email-change handling and `claimed_user_id`.
- Realtime recipient inbox updates.
- Lite-account or claim-token flow for recipients who never sign in.
- Estimator-side Sent view in Publisher.
- Cross-workspace filters and pagination.

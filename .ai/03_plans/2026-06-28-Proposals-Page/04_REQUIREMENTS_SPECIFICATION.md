# 04 — Requirements Specification

Stable IDs throughout. Categories follow the planning prompt.

## Requirement index

| ID | Category | Title | Priority |
|---|---|---|---|
| FR-001 | Functional | Recipient-only authenticated route | P0 |
| FR-002 | Functional | Cross-workspace email match | P0 |
| FR-003 | Functional | List ordering and shape | P0 |
| FR-004 | Functional | Review-proposal bridge | P0 |
| FR-005 | Functional | Top-level sidebar nav item | P0 |
| UX-001 | UX | Loading state | P1 |
| UX-002 | UX | Empty state | P1 |
| UX-003 | UX | Error and retry state | P1 |
| UX-004 | UX | Row-level engagement signals | P1 |
| UX-005 | UX | Refresh on focus | P2 |
| A11Y-001 | Accessibility | Keyboard operability | P0 |
| A11Y-002 | Accessibility | Screen-reader semantics | P0 |
| A11Y-003 | Accessibility | Status non-color cues | P0 |
| ARCH-001 | Architecture | Server Component + Suspense shape | P0 |
| ARCH-002 | Architecture | Repository and Server Function boundaries | P0 |
| ARCH-003 | Architecture | No client-bundle credential exposure | P0 |
| DATA-001 | Data | Security Definer RPCs | P0 |
| DATA-002 | Data | Index on `lower(email)` | P0 |
| DATA-003 | Data | Cross-table join shape | P0 |
| DATA-004 | Data | Type generation | P0 |
| API-001 | API | No new explicit HTTP routes | P0 |
| SEC-001 | Security | Email-verified auth.uid() binding | P0 |
| SEC-002 | Security | Credential material never exposed | P0 |
| SEC-003 | Security | Cross-recipient isolation | P0 |
| SEC-004 | Security | RLS preservation | P0 |
| SEC-005 | Security | Server-only admin/client containment | P0 |
| PERF-001 | Performance | RPC p95 < 300ms with 50 publications | P1 |
| PERF-002 | Performance | Route TTFB < 500ms | P1 |
| PERF-003 | Performance | Bundle impact <= 5KB gzipped | P2 |
| REL-001 | Reliability | Graceful RPC failure | P1 |
| REL-002 | Reliability | Refresh-on-focus idempotent | P2 |
| OPS-001 | Operations | Focused local evidence sufficient for merge review | P0 |
| OPS-002 | Operations | Provider and browser proof required before implementation completion | P0 |
| TEST-001 | Testing | RPC/provider contract proof | P0 |
| TEST-002 | Testing | Repository and Server Function test | P0 |
| TEST-003 | Testing | Page DOM test | P0 |
| TEST-004 | Testing | Action bridge test | P0 |
| TEST-005 | Testing | Security denial test | P0 |

## Requirement details

### FR-001 — Recipient-only authenticated route

`/workshop/proposals` requires a signed-in user. Unauthenticated requests redirect to `/login`. Anonymous recipients continue using `/share/[token]`.

Acceptance:

- Unauthenticated GET redirects to `/login`.
- Authenticated GET renders the page shell and data state.
- Closed-beta denial is handled according to the existing auth gate.

### FR-002 — Cross-workspace email match

The list query matches every `shared_link_recipients` row where `lower(recipient.email) = lower(current_user.email)`, regardless of publication workspace.

Acceptance:

- Fixture recipient with publications from two distinct workspaces sees both.
- Fixture recipient who is not a member of the sender workspace still sees rows sent to their email.
- Mixed-case email fixtures match.
- Distinct-email user sees none of the first user's rows.

### FR-003 — List ordering and shape

Rows sort by `published_at desc, publication_id desc`. Each row exposes only list-rendering fields:

- publicationId
- projectId
- projectName
- projectCode
- workspaceId
- workspaceName
- senderDisplayName
- status: `published | expired | revoked`
- hasOpened
- decision
- lastActivityAt
- publishedAt
- expiresAt
- revokedAt
- snapshotVersion

No list row exposes `project_publications.token_hash`, `encrypted_token`, or `recipient_token_hash`.

### FR-004 — Review-proposal bridge

Each active row has a same-tab "Review proposal" form. Submitting it invokes `openRecipientProposalAction`, which:

1. Verifies the signed-in user.
2. Validates `publicationId`.
3. Authorizes `(publicationId, current_user.email)` via `authorize_recipient_publication_for_current_user`.
4. Reads `encrypted_token`, `password_hash`, and active publication state server-side only.
5. Decrypts the raw publication token.
6. Sets the existing shared-link session cookie and non-secret `_ok` companion cookie.
7. Redirects to `/share/[raw-publication-token]`.

Acceptance:

- Happy path redirects to `/share/[raw-token]` and the proposal renders.
- Redirect URL is not `project_publications.token_hash`.
- Network, DOM, props, logs, and action state contain no `recipient_token_hash`, `token_hash`, or `encrypted_token`.
- Wrong recipient gets `not-a-recipient`.
- Missing/revoked/expired publication gets `unavailable`.
- Existing anonymous `/share/[token]` flow still works.

### FR-005 — Top-level sidebar nav item

`MainSidebar.tsx` includes "Proposals" above "Publisher".

Owner-delegated shortcut decision:

- Proposals: `⌘4`
- Publisher: `⌘5`

Acceptance:

- "Proposals" appears between "Library" and "Publisher".
- It links to `/workshop/proposals`.
- Active state works for `/workshop/proposals` and children.
- Shortcut order matches the owner-delegated decision.

## UX requirements

### UX-001 — Loading state

Skeleton placeholder flushes before data resolves. It matches the eventual row geometry.

### UX-002 — Empty state

Zero rows renders an empty state with the verified user email and copy explaining which address senders should use.

### UX-003 — Error and retry state

List RPC or refresh failure renders inline error UI. "Try again" triggers the same client refresh path as focus refresh and preserves existing rows when stale data exists.

### UX-004 — Row-level engagement signals

Rows show:

- `New` when not opened and active.
- `Opened` when opened and no decision.
- `Decision submitted` when any decision exists.
- `Expired` for expired publication.
- `Revoked` for revoked publication.
- Optional detail chip for `Accepted`, `Declined`, or `Revision requested`.

### UX-005 — Refresh on focus

Client component refreshes on focus through TanStack Query calling `loadRecipientProposals()`. It is debounced/idempotent and does not stack concurrent refetches.

## Accessibility requirements

### A11Y-001 — Keyboard operability

Every interactive element is reachable via Tab and operable via Enter/Space. The Review form works without custom JS navigation because the action redirects server-side.

### A11Y-002 — Screen-reader semantics

Rows use semantic list markup. Each row's accessible name includes project name, sender/workspace, and status. Errors use accessible naming and focus moves to the retry affordance.

### A11Y-003 — Status non-color cues

Every status uses icon + label on desktop and mobile. A colored dot alone is not acceptable.

## Architecture/data/security requirements

### ARCH-001 — Server Component + Suspense shape

The route entry is a Server Component. It renders `WorkshopPageShell`, wraps async data in Suspense, and does not start with `"use client"`.

### ARCH-002 — Repository and Server Function boundaries

Data access lives in `src/lib/repositories/recipient-proposals-repository.ts` with `import "server-only"`. Client refresh uses `src/lib/recipient-proposals/actions.ts` with `"use server"` and does not import the repository directly.

### ARCH-003 — No client-bundle credential exposure

Client-facing types, props, action state, URLs, DOM, network payloads, and logs exclude `recipient_token_hash`, `project_publications.token_hash`, and `encrypted_token`.

### DATA-001 — Security Definer RPCs

Migration creates:

- `list_recipient_publications_for_current_user(integer)`
- `authorize_recipient_publication_for_current_user(uuid)`

Both are `security definer`, `stable`, `set search_path = public`, execute-granted only to `authenticated`, and scoped with `auth.uid()`.

### DATA-002 — Index on `lower(email)`

Migration adds `shared_link_recipients_lower_email_idx` and provider proof confirms the query plan uses it.

### DATA-003 — Cross-table join shape

List RPC joins recipients to publications, projects, workspaces, and sender profiles, plus engagement/decision aggregates, without returning credential material.

### DATA-004 — Type generation

`bun run gen:types` updates `src/lib/supabase/types.ts`; `bun run type-check` succeeds after migration.

### API-001 — No new explicit HTTP routes

No new files under `src/app/api/`. Server Functions/Actions are allowed App Router transport surfaces.

### SEC-001 — Email-verified auth.uid() binding

RPC reads `auth.users.email` for `auth.uid()` and treats it as verified per Supabase Auth/current auth gate assumptions.

### SEC-002 — Credential material never exposed

`recipient_token_hash`, `project_publications.token_hash`, and `encrypted_token` remain server-only. Only the existing raw `/share/[token]` URL is exposed after successful authorization.

### SEC-003 — Cross-recipient isolation

Authorization requires both publication id and caller email. A user cannot open or list rows sent to another email.

### SEC-004 — RLS preservation

No RLS disablement and no broad table grant. The bounded Security Definer RPCs are the only new bypasses.

### SEC-005 — Server-only admin/client containment

The list repository uses caller-auth Supabase only. The Review action may use the existing publication admin/client only after recipient authorization and must not return data from that read.

## Performance, reliability, operations, and testing

### PERF-001 — RPC p95 < 300ms with 50 publications

Provider `EXPLAIN ANALYZE` with fixture data confirms p95 <= 300ms and index usage.

### PERF-002 — Route TTFB < 500ms

Authenticated local route measurement confirms p95 <= 500ms.

### PERF-003 — Bundle impact <= 5KB gzipped

Build output confirms new client JS delta within budget or records review.

### REL-001 — Graceful RPC failure

Repository returns typed failure. Page renders error UI, not an unhandled 500.

### REL-002 — Refresh-on-focus idempotent

Focus events within the debounce window produce one refresh and preserve stale data on failure.

### OPS-001 — Focused local evidence sufficient for merge review

Implementation must pass focused tests, typecheck, lint/design lint as applicable, and build. Known-red broad validation may be replaced only with recorded narrower proof.

### OPS-002 — Provider and browser proof required before implementation completion

Provider SQL proof and a targeted browser smoke are not required for this planning-only task, but they are blocking for implementation completion.

### TEST-001 through TEST-005

See `12_TEST_AND_VALIDATION_STRATEGY.md`.

## Shadow-path coverage

| Flow | Happy | Negative/edge |
|---|---|---|
| Page render | rows appear | empty, RPC error, unauthenticated, slow RPC |
| Review click | sets cookies and redirects | invalid UUID, wrong recipient, expired/revoked, decrypt failure |
| Sidebar | item present and active | shortcut/order regression |
| RPC execution | multi-workspace rows | anon denied, distinct email denied, mixed case match |
| Focus refresh | one debounced refresh | stale data preserved on refresh failure |

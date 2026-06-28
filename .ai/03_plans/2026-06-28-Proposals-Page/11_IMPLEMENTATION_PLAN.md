# 11 — Implementation Plan

**Entrypoint for the implementation AI.** This plan is implementation-ready after the 2026-06-29 council repair pass, but the code, migrations, provider proof, and browser proof are still future implementation work.

## Phase order and dependency graph

```
Phase 1 (DB) ──┐
               ├─→ Phase 2 (Repository + Server Function)
               │        └─→ Phase 3 (Route + Page) ─→ Phase 5 (Sidebar)
               │                    │
               └─→ Phase 4 (Review Action Bridge)
                                    └─→ Phase 6 (Verify)
```

Phases 1 and 2 may start in parallel only after the implementer revalidates the current schema/source lines in `03_SOURCE_AND_CODEBASE_AUDIT.md`. Phase 4 depends on Phase 1 and the publication security helpers.

## Phase 1 — Database

**Objective**: Add the supporting index and two Security Definer RPCs.

**Requirements addressed**: DATA-001, DATA-002, DATA-003, SEC-001, SEC-002, SEC-004.

### Task 1.1 — Create migration

Create `supabase/migrations/20260629000000_recipient_proposals_rpc.sql` or a later unique timestamp. Use the SQL sketch in `07_DATA_DATABASE_API_NETWORK_PLAN.md`.

Must include:

- `shared_link_recipients_lower_email_idx`
- `list_recipient_publications_for_current_user(integer)`
- `authorize_recipient_publication_for_current_user(uuid)`
- `security definer`, `stable`, `set search_path = public`
- `revoke execute ... from public, anon`
- `grant execute ... to authenticated`
- No reference to any publication status outside `published`, `expired`, or `revoked`
- No return column for `token_hash`, `encrypted_token`, or `recipient_token_hash`

Validate locally with `npx supabase db reset`.

### Task 1.2 — Apply migration to linked provider

Apply only to Supabase project `ebxxqidacheyapmmzavr`.

```bash
npx supabase db push --linked
```

### Task 1.3 — Regenerate types

```bash
bun run gen:types
bun run type-check
```

Generated types must include both new functions.

### Task 1.4 — Provider-backed SQL proof

Capture the SQL evidence listed in `07_DATA_DATABASE_API_NETWORK_PLAN.md`:

- functions/signatures/grants
- email index
- non-manager direct credential-column denial
- cross-workspace positive fixture
- distinct-email negative fixture
- mixed-case email fixture
- expired/revoked list status behavior
- `EXPLAIN ANALYZE` using the email index
- no list return columns for `token_hash`, `encrypted_token`, or `recipient_token_hash`

Paste output into the implementation ledger.

## Phase 2 — Repository + Server Function

**Objective**: Create the typed server-only list repository and the client-callable refresh wrapper.

**Requirements addressed**: ARCH-002, ARCH-003, SEC-005, REL-001, REL-002.

### Task 2.1 — Create server-only repository

Create `src/lib/repositories/recipient-proposals-repository.ts`.

Public types:

```ts
export type RecipientProposalStatus = "published" | "expired" | "revoked";
export type RecipientProposalDecision = "accepted" | "declined" | "revision_requested" | null;

export type RecipientProposalRow = {
  publicationId: string;
  projectId: string;
  projectName: string;
  projectCode: string | null;
  workspaceId: string;
  workspaceName: string;
  senderDisplayName: string | null;
  status: RecipientProposalStatus;
  hasOpened: boolean;
  decision: RecipientProposalDecision;
  lastActivityAt: string | null;
  publishedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  snapshotVersion: number;
};

export type RecipientProposalsResult =
  | { ok: true; rows: RecipientProposalRow[] }
  | { ok: false; error: "unauthorized" | "unknown" };
```

Rules:

- First line imports `server-only`.
- Use `createSupabaseServerClient`, not service-role.
- Call `list_recipient_publications_for_current_user`.
- Do not expose or type any client link token, token hash, encrypted token, or recipient token hash field.
- Wrap with `traced("recipient-proposals.list", ...)`.

### Task 2.2 — Create client-callable Server Function

Create `src/lib/recipient-proposals/actions.ts`:

```ts
"use server";

import { listRecipientProposals } from "@/lib/repositories/recipient-proposals-repository";

export async function loadRecipientProposals() {
  return listRecipientProposals();
}
```

Client components use this wrapper for TanStack Query focus refresh. They must not import the repository directly.

### Task 2.3 — Repository and wrapper tests

Create `tests/vitest/recipient-proposals-repository.test.ts`.

Assert:

- RPC rows map to DTO rows.
- `token_hash`, `encrypted_token`, and `recipient_token_hash` are absent from returned DTOs.
- `42501` maps to `unauthorized`.
- Unknown RPC error maps to `unknown`.
- Status mapping covers `published`, `expired`, and `revoked`.

## Phase 3 — Route + Page

**Objective**: Create `/workshop/proposals` with Server Component first paint and a small client island.

**Requirements addressed**: FR-001, FR-003, UX-001 through UX-005, A11Y-001 through A11Y-003, ARCH-001.

### Task 3.1 — Route Server Component

Create `src/app/workshop/proposals/page.tsx`.

Mirror `src/app/workshop/projects/page.tsx` shape:

- `WorkshopPageShell title="Proposals"`
- `<Suspense fallback={<ProposalsListSkeleton />}>`
- async `ProposalsData`
- `requireCurrentUserContext()`
- `listRecipientProposals()`
- pass `user.email` and `initialResult` to `ProposalsPageClient`

### Task 3.2 — Route loading skeleton

Create `src/app/workshop/proposals/loading.tsx`.

### Task 3.3 — Client component

Create `src/components/workshop/proposals-page-client.tsx`.

Responsibilities:

- Seed TanStack Query with `initialResult`.
- Query key: `["recipient-proposals", userEmail]`.
- `queryFn`: `loadRecipientProposals`.
- `staleTime: 30_000`.
- Debounced/idempotent focus refresh.
- Render populated, empty, error, retry, and disabled states.

### Task 3.4 — Sub-components

Create:

- `src/components/workshop/proposals-page/ProposalsList.tsx`
- `src/components/workshop/proposals-page/ProposalRow.tsx`
- `src/components/workshop/proposals-page/ProposalsListSkeleton.tsx`
- `src/components/workshop/proposals-page/ProposalsEmptyState.tsx`
- `src/components/workshop/proposals-page/ProposalsErrorState.tsx`

Use icon + label for every status on desktop and mobile. Do not use color alone.

### Task 3.5 — Page DOM tests

Create `tests/vitest/recipient-proposals-page.test.tsx`.

Cover:

- loading skeleton
- empty state
- RPC error and retry button
- populated rows from two workspaces
- all status labels/icons: New, Opened, Decision submitted, Expired, Revoked
- decision chips: Accepted, Declined, Revision requested
- disabled Review for expired/revoked
- row accessible names
- keyboard submit path
- focus target on error

### Task 3.6 — Route gate test

Create `tests/vitest/recipient-proposals-route-gate.test.ts`.

Mock unauthenticated context and assert redirect to `/login`.

## Phase 4 — Review Action Bridge

**Objective**: Implement the same-tab bridge from a recipient inbox row to the existing `/share/[token]` review surface.

**Requirements addressed**: FR-004, SEC-002, SEC-003, ARCH-003.

### Task 4.1 — Append `openRecipientProposalAction`

Extend `src/lib/publication/actions.ts`.

Imports/uses:

- `cookies` from `next/headers`
- `redirect` from `next/navigation`
- `isUuid`
- `requireCurrentUserContext`
- `createSupabaseServerClient`
- existing publication admin/client helper used in this module
- `decryptPublicationToken`
- `readPublicationTokenEncryptionSecret`
- `deriveCredentialVersion`
- `getSharedLinkSessionCookieParts`

Flow:

1. Require signed-in user.
2. Validate `publicationId`.
3. Call `authorize_recipient_publication_for_current_user`.
4. If no row, return `not-a-recipient`.
5. Read `project_publications.id, encrypted_token, password_hash, status, revoked_at, expires_at` with server-only admin/client.
6. If missing/revoked/expired/not published, return `unavailable`.
7. Decrypt `encrypted_token` to raw publication token.
8. Build cookie parts with `{ token, publicationId, credentialVersion, recipientId }`.
9. Set the HttpOnly session cookie and `${parts.name}_ok` exactly like `src/app/api/share/[token]/session/route.ts`.
10. `redirect(`/share/${encodeURIComponent(token)}`)`.

Do not log or return any token/hash/encrypted token. Successful path returns no DTO because `redirect()` exits.

### Task 4.2 — Action tests

Create `tests/vitest/recipient-proposals-action.test.ts`.

Cover:

- happy path sets both cookies and redirects using the decrypted raw token
- redirect URL is not `token_hash`
- invalid UUID
- missing form field
- unauthenticated direct invocation
- wrong recipient
- revoked publication
- expired publication
- decrypt failure
- duplicate rapid submissions do not expose credential data

### Task 4.3 — Wire Review form

`ProposalRow.tsx` renders a form with hidden `publicationId` and same-tab submit.

Failure states:

- `not-a-recipient`: show inline/toast error and refresh list.
- `unavailable`: show "This proposal is no longer available." and refresh list.
- `unknown`: generic retry error.

## Phase 5 — Sidebar Nav

**Objective**: Insert Proposals above Publisher.

**Requirements addressed**: FR-005.

Owner-delegated shortcut decision: Proposals gets `⌘4`; Publisher shifts to `⌘5`.

Edit `src/components/sidebar/MainSidebar.tsx`:

```ts
import { Books, EnvelopeSimple, FileText, Folder, NewspaperClipping, SidebarSimple, SquaresFour, Star } from "@phosphor-icons/react/dist/ssr";

const sidebarNavItems: Array<SidebarNavItem & { icon: PhosphorIcon }> = [
  dashboardItem,
  { id: "projects", href: "/workshop/projects", label: "Projects", icon: Folder, shortcut: "⌘2" },
  { id: "library", href: "/workshop/library", label: "Library", icon: Books, shortcut: "⌘3" },
  { id: "proposals", href: "/workshop/proposals", label: "Proposals", icon: EnvelopeSimple, shortcut: "⌘4" },
  { id: "publisher", href: "/workshop/publisher", label: "Publisher", icon: NewspaperClipping, shortcut: "⌘5" },
];
```

Create `tests/vitest/main-sidebar-proposals-item.test.tsx` and assert ordering, href, active state, and shortcuts.

## Phase 6 — Verify

**Objective**: Prove the implementation with focused local, provider, and browser evidence.

### Task 6.1 — Static checks

```bash
bun run type-check
bun run lint
bun run lint:design-system
```

If broad checks fail for known-red unrelated reasons, record the failure excerpt and run the narrower replacement proof.

### Task 6.2 — Focused tests

```bash
bun run test:dom -- recipient-proposals
bun run test:dom -- main-sidebar-proposals-item
```

### Task 6.3 — Build

```bash
bun run build
```

### Task 6.4 — Provider-backed proof

Run and record the SQL proof from Phase 1.4.

### Task 6.5 — Mandatory browser smoke

Browser proof is mandatory for implementation completion because the core claim depends on auth, cookies, navigation, and `/share/[token]` rendering.

Prove:

- unauthenticated `/workshop/proposals` redirects to login
- authenticated recipient sees rows
- empty state renders for a recipient with zero rows
- expired/revoked rows are visible and disabled
- Review click sets session and redirects to real `/share/[raw-token]`
- network/DOM/URL contain no `recipient_token_hash`, `project_publications.token_hash`, or `encrypted_token`
- anonymous `/share/[token]` still works without signed-in session
- desktop and mobile layouts do not overflow

### Task 6.6 — Final evidence ledger

Record commands, SQL outputs, browser proof notes, skipped broad checks, and known residual risks in the implementation ledger before claiming done.

## Files created or modified — summary

### New files

| Path | Purpose |
|---|---|
| `supabase/migrations/20260629000000_recipient_proposals_rpc.sql` | DB migration |
| `src/lib/repositories/recipient-proposals-repository.ts` | Server-only list data access |
| `src/lib/recipient-proposals/actions.ts` | Client-callable Server Function wrapper |
| `src/app/workshop/proposals/page.tsx` | Route entry |
| `src/app/workshop/proposals/loading.tsx` | Loading fallback |
| `src/components/workshop/proposals-page-client.tsx` | Top client component |
| `src/components/workshop/proposals-page/ProposalsList.tsx` | List rendering |
| `src/components/workshop/proposals-page/ProposalRow.tsx` | Row rendering + Review form |
| `src/components/workshop/proposals-page/ProposalsListSkeleton.tsx` | Loading skeleton |
| `src/components/workshop/proposals-page/ProposalsEmptyState.tsx` | Empty state |
| `src/components/workshop/proposals-page/ProposalsErrorState.tsx` | Error state |

### Existing files modified

| Path | Change |
|---|---|
| `src/components/sidebar/MainSidebar.tsx` | Insert nav item, add icon import |
| `src/lib/publication/actions.ts` | Append `openRecipientProposalAction` |

### Generated files

| Path | Change |
|---|---|
| `src/lib/supabase/types.ts` | Regenerated; new RPC types added |

### New test files

| Path | Coverage |
|---|---|
| `tests/vitest/recipient-proposals-repository.test.ts` | Repository and Server Function wrapper |
| `tests/vitest/recipient-proposals-page.test.tsx` | Page DOM, states, a11y |
| `tests/vitest/recipient-proposals-route-gate.test.ts` | Auth gate |
| `tests/vitest/recipient-proposals-action.test.ts` | Server Action bridge |
| `tests/vitest/main-sidebar-proposals-item.test.tsx` | Sidebar nav |

## Rollback considerations

```sql
drop function if exists public.list_recipient_publications_for_current_user(int);
drop function if exists public.authorize_recipient_publication_for_current_user(uuid);
drop index if exists public.shared_link_recipients_lower_email_idx;
```

Application rollback is a normal `git revert`. No data loss is possible because the migration creates no tables and modifies no rows.

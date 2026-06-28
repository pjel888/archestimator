# 03 - Source and Codebase Audit

This audit records the repo evidence that controls implementation. Re-read these files before implementation because line numbers may drift.

## Sidebar navigation

**Source:** `src/components/sidebar/MainSidebar.tsx`

- Current top-level nav order is Workshop `⌘1`, Projects `⌘2`, Library `⌘3`, Publisher `⌘4`.
- `sidebarNavItems` is the insertion point.
- `sidebarPrefetchRoutes` derives from that array, so the new route prefetches automatically.
- `isActiveHref` checks exact match or nested path prefix, so `/workshop/proposals` and child paths will highlight.

**Plan decision:** insert Proposals between Library and Publisher; Proposals gets `⌘4`, Publisher shifts to `⌘5`.

## Workshop route pattern

**Sources:**

- `src/app/workshop/projects/page.tsx`
- `src/components/workshop/WorkshopPageShell.tsx`
- `src/components/workshop/projects-page-client.tsx`

**Findings:**

- Workshop list pages use a Server Component route, `WorkshopPageShell`, Suspense fallback, and a client component for interactive list behavior.
- The shell already handles authenticated sidebar context and workspace bootstrap.
- Existing client pages use TanStack Query with functions imported from `"use server"` modules; this is the approved pattern for client refetch without adding a new HTTP route.

**Plan decision:** `/workshop/proposals` mirrors this pattern and adds `src/lib/recipient-proposals/actions.ts` as the `"use server"` loader for TanStack Query.

## Auth and session identity

**Source:** `src/lib/auth/session.ts`

**Findings:**

- `getCurrentUserContext()` obtains the Supabase Auth user and lowercases `user.email`.
- `requireCurrentUserContext()` redirects unauthenticated users to `/login`.

**Plan decision:** both list and action paths require current user context. The RPCs derive recipient identity from `auth.uid()` and the caller's verified email; they do not accept a target email parameter.

## Publication token and credential model

**Sources:**

- `supabase/migrations/20260527120000_project_client_publication.sql`
- `src/lib/publication/actions.ts`
- `src/lib/publication/security.ts`
- `src/app/api/share/[token]/session/route.ts`
- `src/app/share/[token]/page.tsx`

**Findings:**

- `project_publications.status` enum values are `published`, `expired`, and `revoked`.
- Publishing creates a raw publication token used in `/share/[token]`.
- `project_publications.token_hash` is an HMAC lookup key, not the URL token.
- `project_publications.encrypted_token` stores the encrypted raw publication token for server-side recovery.
- Existing share-session cookies are built from raw publication token, publication id, credential version, and optional recipient id.
- Existing session route verifies recipient token separately, then sets HttpOnly shared-link session cookies and a non-secret `_ok` marker.

**Plan decision:** the Proposals page never builds a link from `token_hash`. The Server Action authorizes the recipient first, reads `encrypted_token` server-side, decrypts the raw token, derives credential version, sets the existing cookies, and redirects to `/share/[raw-token]`.

## Recipient rows, RLS, and grants

**Sources:**

- `supabase/migrations/20260528220000_project_shared_link_overhaul.sql`
- `supabase/migrations/20260601145000_lock_down_shared_link_recipient_credentials.sql`
- `src/lib/publication/public-repository.ts`

**Findings:**

- `shared_link_recipients` contains `email`, `publication_id`, `display_name`, `invited_by`, delivery/open metadata, and `recipient_token_hash`.
- Existing indexes cover `(publication_id, lower(email))`, `recipient_token_hash`, and `(publication_id, created_at desc)`.
- There is no standalone `lower(email)` index for a cross-publication recipient inbox.
- RLS and grants are manager-oriented. Authenticated recipients cannot directly read their own row by email, and `recipient_token_hash` is intentionally excluded from column grants.
- Existing public share flows resolve recipients by `recipient_token_hash`; no existing function implements a signed-in email-keyed recipient inbox.

**Plan decision:** add `shared_link_recipients_lower_email_idx`, a list RPC for email-keyed summaries, and an authorization-only RPC for the action bridge. Neither RPC returns credential material.

## RPC migration pattern

**Sources:**

- `supabase/migrations/20260628223000_project_activity_collaboration_audit_rpc.sql`
- `supabase/migrations/20260628153000_main_sidebar_favorite_projects.sql`

**Findings:**

- New bypass reads should use `security definer`, `set search_path = public`, explicit typed return tables, drop-first reapply statements, and revoke/grant execute statements.
- `security invoker` is appropriate only when caller RLS should apply; it is not enough for recipient self-read because `shared_link_recipients` RLS blocks direct recipient access.

**Plan decision:** both new RPCs use the established Security Definer pattern and are granted only to `authenticated`.

## Repository and type patterns

**Sources:**

- `src/lib/repositories/project-activity-feed-repository.ts`
- `src/lib/supabase/types.ts`
- `package.json`

**Findings:**

- Server-only repositories import `server-only`, use generated `Tables`/`Database` types, and wrap `supabase.rpc` calls in typed adapters.
- `bun run gen:types` writes Supabase generated types for project `ebxxqidacheyapmmzavr`.

**Plan decision:** implement a server-only recipient proposals repository, regenerate types after migration, and keep DTOs credential-free.

## Test inventory

**Source:** `tests/vitest/`

**Findings:**

- Publication tests use `project-publication-*.test.ts(x)` naming.
- The new feature should use `recipient-proposals-*.test.ts(x)` plus `main-sidebar-proposals-item.test.tsx`.
- Mocked tests alone cannot prove RLS/Security Definer behavior.

**Plan decision:** pair focused unit/DOM/action tests with provider-backed SQL proof and a browser smoke for cookie/redirect behavior.

## Commands

| Command | Purpose |
|---|---|
| `bun run gen:types` | Regenerate Supabase types after migration |
| `bun run type-check` | TypeScript validation |
| `bun run lint` | ESLint validation |
| `bun run lint:design-system` | Design-system validation |
| `bun run test` | Unit tests |
| `bun run test:dom` | DOM/component tests |
| `bun run build` | Production build |
| `bun run validate` | Broad gate; may be known-red from unrelated baseline state |

Use targeted tests first. Do not claim broad validation is green unless it actually passes in the implementation session.

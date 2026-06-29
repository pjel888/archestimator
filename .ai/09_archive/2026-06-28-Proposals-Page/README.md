# Plan Pack - Proposals Page (Recipient Inbox)

**Date:** 2026-06-29 (Asia/Manila)  
**Status:** `IMPLEMENTATION-READY` for planning handoff  
**Plan profile:** `exhaustive`  
**Verification mode:** `independent` - four native council lanes reviewed the package after the initial draft and their findings were integrated. See `20_OWNER_DELEGATED_DECISIONS_AND_COUNCIL_REVIEW.md` and `17_FINAL_READINESS_REVIEW.md`.

## What this plan delivers

A new top-level workshop route `/workshop/proposals` that serves as the **recipient inbox**: every publication sent to the signed-in user's verified email, across all workspaces.

Each active row bridges to the existing `/share/[token]` review surface through a same-tab Server Action. The action authorizes the signed-in recipient, reads publication credential material only on the server, decrypts `project_publications.encrypted_token` to recover the raw publication token, sets the existing share-session cookies, and redirects to `/share/[raw-token]`. The list RPC and UI never expose `project_publications.token_hash`, `encrypted_token`, or `shared_link_recipients.recipient_token_hash`.

This is the missing signed-in home for the Shared-Link Recipient access path defined in `.ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/10-access-path-and-persona-taxonomy.md`.

## Implementation entrypoint

`11_IMPLEMENTATION_PLAN.md` - six dependency-aware phases:

1. **Database** - inbox list RPC, authorization-only RPC, supporting index
2. **Repository + Server Function** - typed server-only data layer and client refetch wrapper
3. **Route + page** - Server Component + Suspense + Client Component
4. **Server Action bridge** - secure `openRecipientProposalAction`
5. **Sidebar nav** - top-level item above Publisher
6. **Verification** - targeted tests, provider SQL proof, browser smoke, build/type checks

## Owner-delegated decisions

The user granted owner authority for planning decisions. A council of LLM lanes reviewed the open issues, and the plan now records these owner-delegated decisions in `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md`:

| Decision | Choice |
|---|---|
| Review click UX | Same-tab form submit; Server Action calls `redirect()` after cookies are set |
| Status copy | `New`, `Opened`, `Decision submitted`, `Expired`, `Revoked` |
| Sidebar shortcuts | Proposals `⌘4`, Publisher `⌘5` |
| Expired/revoked rows | Visible but disabled; action returns unavailable if invoked |
| Token bridge | Authorization RPC returns only ids; action decrypts `encrypted_token` server-side |
| Client refetch | TanStack Query calls an explicit `"use server"` wrapper |

No owner/product decisions remain open before implementation starts.

## Phase order and dependency graph

```text
Phase 1 (DB) ──┐
               ├─→ Phase 3 (Route) ─→ Phase 5 (Sidebar)
Phase 2 (Repo + server function) ─┘     │
                                        └─→ Phase 4 (Action bridge)

Phase 6 verifies all phases and blocks implementation completion until provider SQL
proof and browser smoke are green.
```

## Files off-limits

- `src/app/share/[token]/page.tsx` and `src/components/share/*` - intentionally unchanged. The existing public share surface must continue working.
- `src/components/workshop/projects-page-client.tsx` - the Projects "Shared" tab rename is a separate future concern.
- `src/app/workshop/publisher/*` - the estimator-side sent control plane stays as-is.

## Files and systems intentionally unaffected

- Existing publication RPCs (`insert_client_comment`, `submit_client_response`, etc.)
- Existing `/share/[token]` rendering
- Project dashboard chrome
- Existing publication lifecycle, password, revocation, and expiry semantics

## Required implementation proof

Planning proof is document/source-level only. Implementation is not complete until these pass:

1. **Provider-backed SQL proof** - migration applies to Supabase project `ebxxqidacheyapmmzavr`; list RPC returns expected rows; authorization RPC returns only ids; non-recipient callers are denied; signatures expose no credential material.
2. **Action/security proof** - `openRecipientProposalAction` handles missing, invalid, unauthorized, expired, revoked, duplicate-click, and success paths without leaking `token_hash`, `encrypted_token`, or `recipient_token_hash`.
3. **Browser proof** - Playwright smoke covers sign-in redirect, empty state, list rendering, disabled expired/revoked row, and same-tab click-through to `/share/[raw-token]` with a valid recipient session.
4. **Cross-workspace proof** - fixture recipient with publications from two distinct workspaces sees both.

## Stale-plan revalidation checklist

Before starting implementation, verify:

- [ ] `supabase/migrations/` does not contain a conflicting recipient-proposals migration.
- [ ] `src/lib/repositories/recipient-proposals-repository.ts` does not already exist.
- [ ] `src/lib/recipient-proposals/actions.ts` does not already exist.
- [ ] `src/app/workshop/proposals/` does not already exist.
- [ ] `MainSidebar.tsx` `sidebarNavItems` still has Workshop `⌘1`, Projects `⌘2`, Library `⌘3`, Publisher `⌘4`.
- [ ] `project_publications` still stores `token_hash` and `encrypted_token`.
- [ ] `shared_link_recipients` still has `email`, `recipient_token_hash`, and manager-only RLS.
- [ ] `getSharedLinkSessionCookieParts`, `decryptPublicationToken`, and `deriveCredentialVersion` still exist with compatible signatures.
- [ ] `requireCurrentUserContext` still lives in `src/lib/auth/session.ts`.
- [ ] `bun run gen:types` still exists in `package.json`.

## Commands before first implementation edit

```bash
git status --short --branch
ls .ai/03_plans/2026-06-28-Proposals-Page/
bun run gen:types
```

## Archive policy

Archive to `.ai/09_archive/2026-06-28-Proposals-Page/` only after implementation proof is complete: local tests green, provider SQL proof green, browser proof green, cross-workspace proof green, and no open security findings.

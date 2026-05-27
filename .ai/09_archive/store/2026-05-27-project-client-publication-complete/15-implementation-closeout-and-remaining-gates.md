# Implementation Closeout And Remaining Gates

**Date:** 2026-05-27
**Status:** Archive-ready for V1 implementation. Public release/legal gates remain in the roadmap.

## Current Archive Decision

Archive `.ai/03_plans/project-client-publication` after this evidence is recorded.

The implementation has moved beyond planning and now has a working V1 code path, migration, linked-remote application, focused tests, full validation/build proof, authenticated manager browser proof, and receiver smoke evidence. Launch/legal blockers remain outside this V1 implementation archive and stay tracked in the roadmap.

## Implemented V1

- Project managers can create a public, view-only `/share/[token]` link from the project header.
- Public links are open by default for anyone with the URL.
- Managers can require a password, remove the password, copy the URL, open it, update the public page, create a new public link, and turn the link off.
- Receiver pages render outside `/workshop` and do not create Teamspaces membership.
- Password-protected receiver pages render a generic password gate before project snapshot data is loaded.
- Publication rows store keyed token hashes and encrypted recopy tokens; raw tokens and raw passwords are not schema fields.
- Event tracking is metadata-only and updates open counts through the publication RPC.
- The manager UI now uses `Public link`, `Public client link`, and `View-only project page` copy instead of confusing publication/snapshot jargon.
- Report-Only CSP now allows Supabase realtime websocket connections with `wss://*.supabase.co`.

## Linked Supabase State

- Project: `ebxxqidacheyapmmzavr`.
- Migration: `20260527120000_project_client_publication.sql`.
- Remote migration history repaired so the canonical local migration id is the applied remote id.
- Publication tables exist and RLS is enabled.
- Browser grants remain restricted: `project_publication_events` is service-owned, and management table access is authenticated policy-bound.
- Function execute grants are narrowed for `can_manage_project_publication(uuid)` and `increment_project_publication_open(uuid)`.

## Evidence Captured

- `bunx vitest run tests/vitest/project-publication-schema.test.ts tests/vitest/project-publication-security.test.ts tests/vitest/project-publication-public-repository.test.ts tests/vitest/project-publication-snapshot.test.ts tests/vitest/project-publication-actions.test.ts tests/vitest/project-publication-summary.test.ts tests/vitest/project-publication-header.test.tsx tests/vitest/teamspace-collaboration-header.test.tsx --maxWorkers=1`
- `bunx vitest run tests/vitest/project-publication-route.test.ts tests/vitest/project-publication-page.test.tsx tests/vitest/project-publication-security-headers.test.ts tests/vitest/auth-proxy.test.ts --maxWorkers=1`
- `bunx vitest run tests/vitest/project-publication-header.test.tsx tests/vitest/project-publication-actions.test.ts tests/vitest/project-publication-schema.test.ts --maxWorkers=1`
- `bunx vitest run tests/vitest/project-publication-schema.test.ts tests/vitest/project-publication-security.test.ts tests/vitest/project-publication-public-repository.test.ts tests/vitest/project-publication-snapshot.test.ts tests/vitest/project-publication-actions.test.ts tests/vitest/project-publication-summary.test.ts tests/vitest/project-publication-header.test.tsx tests/vitest/teamspace-collaboration-header.test.tsx tests/vitest/project-publication-route.test.ts tests/vitest/project-publication-page.test.tsx tests/vitest/project-publication-security-headers.test.ts tests/vitest/auth-proxy.test.ts --maxWorkers=1` passed: 12 files, 30 tests.
- `bun run validate` passed: typecheck, lint, design-system lint, unit tests, and 99 Vitest files with 605 passed / 2 skipped. The only lint note was the existing TanStack Table React Compiler warning in `ProjectEstimatesTable.tsx`.
- `bun run build` passed with `/share/[token]` and `/api/share/[token]` listed as dynamic routes.
- `git diff --check` passed.
- GitNexus `detect-changes --scope unstaged` reported critical risk across the broad dirty worktree: 92 files, 338 symbols, 214 affected processes. This is not publication-specific enough to approve archive by itself.
- Authenticated manager browser proof passed on localhost dev auth against the linked Supabase project: create/new link, password on, password unlock, password removed, turn off link, revoked receiver unavailable, generate final active public link, and signed-out receiver snapshot all completed with no 500 responses.
- Manager browser proof artifacts: `.omx/artifacts/visual-ralph/project-client-publication/manager-flow-20260527/`.
- Signed-out receiver smoke for a real Lewis Residence public link loaded the view-only project snapshot without browser console errors.
- Receiver screenshot: `.omx/artifacts/visual-ralph/project-client-publication/public-link-smoke-20260527/public-link-share-page.png`.

## Post-Archive Release Gates

- Reconcile or scope down broad dirty-worktree code-review/detect-change results before merge/release.
- Reviewed Privacy Notice and Terms remain required before public receiver/open-tracking launch claims.
- PDF/download is explicitly out of scope for this V1 archive; open a separate publication-aware PDF artifact plan before implementing it.

## Explicit Non-Goals For This V1

- No client/member account creation from public links.
- No direct anonymous table reads.
- No PDF/download artifact yet.
- No issued proposal claim.
- No legal review, approval, acceptance, or signature tracking claim.
- No automatic live-publication updates when internal estimate data changes.

## Archive Criteria

This folder is archive-ready because:

- all implemented V1 tests pass after the final patch;
- full validation/build/diff checks pass;
- linked Supabase state is verified after the final migration shape;
- manager and receiver browser evidence is recorded;
- roadmap, current state, decisions, and this closeout file agree;
- remaining launch blockers are explicitly future-gated outside this V1 implementation.

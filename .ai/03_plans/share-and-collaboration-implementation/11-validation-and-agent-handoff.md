# 11 - Validation and Agent Handoff

## Purpose

This is the execution handoff for future agents. It converts the combined planning folder into a low-error implementation protocol with explicit lanes, review gates, and evidence requirements.

## Required Pre-Work for Any Slice

1. Read `README.md`, `09-unified-implementation-flow.md`, and `10-source-map-and-conflict-resolution.md`.
2. Read only the lane docs for the slice being implemented.
3. Run graph/GitNexus/code-review-graph impact before editing symbols or shared files.
4. Record the exact files the slice owns.
5. Write or identify red tests before implementation unless the slice is pure external provider setup.
6. Confirm unrelated dirty-worktree changes and avoid reverting them.

## Agent Lanes

Use parallel agents only when write scopes are disjoint.

| Lane | Best role | Write scope | Can run in parallel with |
| --- | --- | --- | --- |
| Invite external setup evidence | verifier / researcher | no source writes except safe docs | receiver UX planning or manager visibility audit |
| Invite safety | executor + security reviewer | invite routes, collaboration actions, rate-limit migration | receiver no-API shell work only |
| Shared data layer | executor + test engineer | `workspace-repository`, shared project types, project cards | nothing that edits the same files |
| Shared-link manager UX | executor + designer | `ProjectPublicationHeader`, card badges | receiver UX if no shared files |
| Receiver UX | executor + designer | `src/app/share`, `src/components/share`, `src/lib/share` | invite setup/safety if no public API overlap |
| Email/compliance | executor + security reviewer | publication/collaboration email paths | after safety foundation, or as read-only prep |
| Final verification | verifier / code reviewer | read-only unless fixing review findings | after all implementation lanes |

## Baseline Commands

Use the narrowest command that proves the slice first, then broaden.

### Receiver UX Baseline

```bash
bunx vitest run \
  tests/vitest/project-publication-page.test.tsx \
  tests/vitest/project-publication-comments.test.tsx \
  tests/vitest/project-publication-decision.test.tsx \
  tests/vitest/share/reconstruct-share-tree.test.ts \
  --maxWorkers=1
```

### Shared Link Manager / Public API Baseline

```bash
bunx vitest run \
  tests/vitest/project-publication-page.test.tsx \
  tests/vitest/project-publication-route.test.ts \
  tests/vitest/project-publication-public-repository.test.ts \
  tests/vitest/project-publication-security.test.ts \
  tests/vitest/project-publication-comments.test.tsx \
  tests/vitest/project-publication-decision.test.tsx \
  --maxWorkers=1
```

### Collaboration Invite Baseline

```bash
bunx vitest run \
  tests/vitest/project-invite-feature-flag.test.ts \
  tests/vitest/project-invite-entry-schema.test.ts \
  tests/vitest/projects-page-shared-access.test.tsx \
  --maxWorkers=1
```

### Gated E2E

```bash
ARCHESTIMATOR_E2E_INVITE_ENTRY=1 \
PROJECT_INVITE_ENTRY_ENABLED=true \
ARCHESTIMATOR_INVITE_TOKEN_PEPPER=<pepper-value> \
bun run test:e2e -- e2e/project-invite-entry.spec.ts --project=chromium
```

```bash
ARCHESTIMATOR_E2E_SHARED_LINK=1 \
bun run test:e2e -- e2e/shared-link-receiver.spec.ts --project=chromium
```

### Standard Closeout

```bash
bun run type-check
bun run lint:design-system
git diff --check
```

Run `bun run validate` only when the slice is broad enough or near final closeout; if unrelated failures remain, document them with exact files/tests.

## Visual Evidence Requirements

Receiver UX visual slices need:

- 1440 x 1000 screenshot.
- 390 x 844 screenshot.
- Confirmation that sheet controls appear by `y <= 360px` on desktop.
- Confirmation that first row/tree content appears by `y <= 520px` on desktop.
- Confirmation that mobile row access is not blocked by an expanded chart.
- Confirmation of no horizontal overflow at 320px if layout changed.

Manager/project-list visual slices need:

- Project card with owned, shared project, sheet-only, pending invite, and published-link variants where applicable.
- Header rail with no link, live link, copied state, unseen activity state.
- Teamspaces modal with pending/opened/expired invite states where applicable.

## Security Evidence Requirements

Every public/share/invite mutation slice needs:

- Negative test for cross-origin or GET mutation if applicable.
- Test coverage that generated recipient email links use the same query parameter accepted by `/share/[token]` for session creation.
- No raw token in logs, audit metadata, rendered copy, or analytics.
- HttpOnly/Secure/SameSite cookie behavior preserved.
- Password-protected shared link does not load snapshot data before unlock.
- Invalid/expired/revoked invite or share tokens reveal no private project data.
- Rate-limit behavior documented, either implemented durably or explicitly deferred with scope-bound reason.

## Review Gates

### Spec Compliance Review

Before moving to the next wave/slice, verify:

- The slice maps to a Wave in `09-unified-implementation-flow.md`.
- The implementation did not pull in deferred Wave 8 features.
- Non-goals remain true.
- Acceptance criteria in `07` or receiver `15` are met.

### Code Quality Review

Verify:

- No duplicated feature-local primitives where shared UI primitives exist.
- App/workshop UI follows `DESIGN.md`: SF Pro, compact type, zero tracking, `rounded-xs`, shared buttons/search.
- No broad refactor unrelated to the slice.
- No N+1 query or shared data widening without tests.
- Rollback path is clear.

### Final Folder/Docs Review

If implementation changes project reality:

- Update `.ai/10_state/current-state.md`.
- Update `.ai/10_state/known-issues.md` if a blocker is resolved.
- Update roadmap goal cards/evidence index if a roadmap blocker changes state.
- Add evidence paths to this folder or an archive evidence pack.

## Stop Conditions

Stop the implementation branch and re-plan if:

- The next change touches both invite membership and public shared-link publication semantics.
- The receiver UX slice needs a schema or API change to succeed.
- A public endpoint's rate-limit/security behavior cannot be proven.
- External provider/env setup is required but unavailable.
- Validation failures cannot be separated from unrelated dirty-worktree failures.
- A subagent edits outside its assigned write scope.

## Completion Standard

The combined plan is implementation-ready only when:

- The canonical flow is followed.
- Every changed behavior has test or browser evidence.
- Security/session behavior is explicitly verified.
- Visual changes have screenshots.
- Known unrelated failures are named, not ignored.
- No old folder path remains as the active source of truth.

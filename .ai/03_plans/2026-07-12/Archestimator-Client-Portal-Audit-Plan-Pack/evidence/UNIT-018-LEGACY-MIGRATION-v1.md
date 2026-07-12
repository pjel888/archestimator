# UNIT-018 Legacy Migration Evidence v1

## Local implementation

- `legacy-migration-service.ts` maps each legacy publication to an immutable
  Client Portal issue, reuses a project portal only for a shared/empty audience,
  and creates a separately identified portal when established recipient
  audiences are disjoint. Newly created portals receive a new encrypted stable
  token; legacy tokens remain mapping-only routes to their own historic issue.
- Recipient identity is merged by normalized email. Existing recipients retain
  their stable identity, are promoted to required approvers when legacy
  decisions require it, and receive the legacy credential without storing a raw
  token.
- The apply path reads back the mapping, content hash, imported credential
  hashes, threads, messages, and decisions before promoting a mapping to
  `verified`.
- Public token resolution accepts a legacy token only through a
  `verified`/`cutover_complete` mapping and pins that token to its mapped issue;
  unverified imports remain on the legacy route.
- The public decision route preserves that same dual-read boundary: legacy
  tokens retain the legacy decision handler and Client Portal tokens dispatch
  to the v2 handler, so the existing legacy share review UI remains functional
  before cutover.
- Publisher managers can invoke the protected apply action from the existing
  publication drawer. The confirmation makes the side effect explicit, and the
  result reports verified recipient, discussion, and decision counts before the
  roster refreshes to expose the Client Portal control-center link.
- A manager can roll a verified or cutover-complete mapping back to the legacy
  route without deleting the imported portal, issue, recipients, discussions,
  or decisions. The mapping becomes `rejected`, which removes the public
  dual-read and Publisher bridge; a later migration action reuses the existing
  records and performs the same deterministic verification to fix forward.

## Fresh validation

```text
bunx eslint src/lib/client-portal/legacy-migration-service.ts src/lib/client-portal/public-repository.ts tests/vitest/client-portal-legacy-migration-service.test.ts tests/vitest/client-portal-legacy-token-resolution.test.ts
bunx vitest run tests/vitest/client-portal-legacy-migration-service.test.ts tests/vitest/client-portal-legacy-token-resolution.test.ts
bun run type-check
git diff --check
```

Result: local migration lint passed; focused migration/action/token/security
checks passed. The latest combined run covered 11 Vitest files / 73 tests,
workspace `type-check`, and `git diff --check`; all passed.

Latest dual-read decision validation passed targeted ESLint, six focused Vitest
files / 68 tests, workspace `type-check`, and `git diff --check`.

## Release boundary

No actual legacy publication was applied through the authenticated manager
action in a local or hosted cohort during this evidence run. Hosted public-header
proof, cohort cutover, rollback rehearsal, support ownership, and legacy-write
retirement remain release gates and are not claimed here.

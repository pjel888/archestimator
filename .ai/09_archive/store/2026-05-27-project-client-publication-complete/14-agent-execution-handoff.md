# Agent Execution Handoff

**Date:** 2026-05-27
**Status:** Implementation handoff updated after V1. Use this as the remaining hardening, verification, and archive-readiness backlog.

## Execution Rule

Future follow-up should use red-first development and isolated task ownership. Do not let multiple agents edit the same migration, same header component, same resolver, or same action module at the same time.

## Current V1 State

Implemented:

- publication migration and generated Supabase types;
- token hashing, encrypted recopy token, password hashing, signed access cookie, and same-origin public POST boundaries;
- snapshot builder and public receiver resolver;
- manager actions for generating a public link, updating the public page, creating a new public link, turning off a link, and setting/removing a password;
- manager header/modal UI using `Public link` and `Public client link` language;
- `/share/[token]` receiver route and `/api/share/[token]` public API routes;
- focused schema/security/header/action/route/snapshot/repository tests.

Still required before archive:

- full `bun run validate`, `bun run build`, and `git diff --check` after the final patch;
- fresh authenticated browser proof of manager action flow after the latest UI copy and new-link control changes;
- code-review/detect-change evidence;
- reviewed Privacy Notice/Terms or an explicit no-launch archive note that keeps public release blocked.

## Recommended Task Backlog

### Task 1: Lock Red Tests

Write failing tests for:

- project publication schema;
- publication actions;
- receiver resolver;
- snapshot builder;
- header placement;
- Teamspaces private-link rename;
- route/proxy/no-shell behavior;
- password gate;
- open tracking;
- CSRF or equivalent same-origin protection for public password/event POST paths;
- security headers and log redaction.

Verification:

```bash
bunx vitest run tests/vitest/project-publication-schema.test.ts --maxWorkers=1
bunx vitest run tests/vitest/project-publication-actions.test.ts --maxWorkers=1
bunx vitest run tests/vitest/publication-receiver-resolver.test.ts --maxWorkers=1
```

Expected before implementation: fail for missing behavior.

### Task 2: Schema And Types

Owns:

- new Supabase migration;
- generated types;
- schema/RLS tests.

Do not edit UI or receiver route.

Verification:

```bash
bunx vitest run tests/vitest/project-publication-schema.test.ts --maxWorkers=1
```

### Task 3: Security Helpers

Owns:

- token hashing;
- encrypted token envelope for owner/admin recopy, or disabling persistent recopy;
- password hashing wrapper;
- session signing/verification;
- rate-limit helpers;
- log redaction helpers.

Do not edit schema after Task 2 without coordination.

Verification:

```bash
bunx vitest run tests/vitest/publication-security-headers.test.ts tests/vitest/publication-log-redaction.test.ts --maxWorkers=1
```

### Task 4: Snapshot Builder

Owns:

- publication DTO types;
- safe field whitelist;
- total formula;
- snapshot creation logic.

Do not edit receiver route UI.

Verification:

```bash
bunx vitest run tests/vitest/publication-snapshot.test.ts tests/vitest/publication-receiver-resolver.test.ts --maxWorkers=1
```

### Task 5: Manager Actions And Repository

Owns:

- create publication;
- save settings;
- revoke;
- create a new public link;
- republish;
- load manager summary.

Do not edit Teamspaces collaboration action semantics.

Verification:

```bash
bunx vitest run tests/vitest/project-publication-actions.test.ts tests/vitest/project-collaboration-actions.test.ts --maxWorkers=1
```

### Task 6: Header And Modal UI

Owns:

- `ProjectPublicationHeader`;
- `ProjectPublicationSettingsDialog`;
- right-slot composition in `ProjectWorkspaceHeaderRow`;
- Teamspaces private-link copy rename.

Do not edit publication resolver internals except through typed action contracts.

Verification:

```bash
bunx vitest run tests/vitest/project-publication-header.test.tsx tests/vitest/teamspace-collaboration-header.test.tsx --maxWorkers=1
bun run lint:design-system
```

### Task 7: Receiver Route

Owns:

- `/share/[token]` route;
- password gate;
- generic unavailable state;
- receiver view rendering;
- noindex/no-store/referrer controls.

Do not render `WorkshopPageShell`.

Verification:

```bash
bunx vitest run tests/vitest/publication-receiver-route.test.tsx tests/vitest/auth-proxy.test.ts --maxWorkers=1
```

### Task 8: Open Tracking

Owns:

- event write path;
- dedupe/throttle;
- manager summary values;
- tracking unavailable behavior.

Verification:

```bash
bunx vitest run tests/vitest/publication-open-tracking.test.ts --maxWorkers=1
```

### Task 9: Browser QA And Release Evidence

Owns:

- browser smoke;
- screenshots/traces;
- release evidence file;
- linked remote proof if schema changed.

Verification:

```bash
bun run validate
bun run build
git diff --check
bun run test:e2e
```

Run `bun run test:e2e` when route/browser implementation exists.

## Parallelization Guidance

Safe parallel lanes after red tests:

- Schema/RLS and header UI tests can proceed in parallel.
- Snapshot builder and security helper tests can proceed in parallel if interfaces are agreed.
- Receiver route should wait for resolver contract.
- Open tracking should wait for publication table/event schema.
- Browser QA waits for route/UI integration.

Do not parallelize:

- two migrations;
- header composition edits in multiple agents;
- resolver and snapshot whitelist changes without a shared DTO contract;
- generated Supabase type edits while migration is still changing.

## Code Review Handoff

Final code review must check:

- no raw token/password storage;
- encrypted token envelope is not plaintext and is permission-gated for owner/admin recopy;
- no direct anon grants;
- receiver route does not render Workshop shell;
- no leaked private fields in DTO;
- Teamspaces semantics unchanged;
- no legal overclaim copy;
- revoke/expire/rotate behavior;
- no-store/noindex/referrer headers;
- CSRF or equivalent same-origin protection for public state-changing routes;
- tests cover red paths and success paths;
- linked remote state evidence is recorded if schema changed.

## Final Implementation Evidence

The final implementation report should include:

- changed files;
- V1 decisions used;
- tests run and results;
- browser QA results;
- Supabase local and remote evidence if applicable;
- known gaps;
- rollback readiness;
- code-review verdict.

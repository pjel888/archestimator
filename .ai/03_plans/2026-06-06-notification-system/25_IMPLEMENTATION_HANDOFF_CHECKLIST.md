# Implementation Handoff Checklist

## Start Gate

Before source edits:

- [ ] Confirm path: `/Users/philiplewis/.codex/worktrees/notification-system/archestimator`.
- [ ] Confirm branch: `codex/notification-system`.
- [ ] Run `git status --short --branch`.
- [ ] Run `git fetch --prune origin`.
- [ ] Run `git rev-list --left-right --count origin/main...HEAD`.
- [ ] Read every file in `.ai/03_plans/2026-06-06-notification-system/`.
- [ ] Read `AGENTS.md`, `.ai/README.md`, `.ai/00_system/DOCS_SOURCE_OF_TRUTH.md`, `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`, `.ai/00_system/VALIDATION_MATRIX.md`, `.ai/10_state/current-state.md`, `.ai/10_state/decisions.md`, `.ai/10_state/known-issues.md`, `DESIGN.md`, and `package.json`.
- [ ] Use graph/GitNexus impact tooling or record exact fallback evidence per `22_GITNEXUS_CODE_GRAPH_IMPACT_PLAN.md`.

## Phase Order

1. Database/RLS: `15_DATABASE_SCHEMA_RLS_PLAN.md`.
2. Server actions/contracts: `16_SERVER_ACTIONS_API_CONTRACT_PLAN.md`.
3. Query/cache state: `18_STATE_MANAGEMENT_AND_QUERY_CACHE_PLAN.md`.
4. Fixtures/seeds: `19_TEST_FIXTURES_AND_SEED_DATA_PLAN.md` using deterministic local/test fixtures first.
5. UI/shell: `17_FRONTEND_COMPONENT_AND_SHELL_INTEGRATION_PLAN.md`.
6. Accessibility/focus: `20_ACCESSIBILITY_FOCUS_MANAGEMENT_PLAN.md`.
7. Design-system pass: `21_DESIGN_SYSTEM_ALIGNMENT_PLAN.md`.
8. Optional Realtime only after durable path passes.
9. Provider/migration evidence: `23_SUPABASE_PROVIDER_AND_MIGRATION_EVIDENCE_PLAN.md`.
10. Release runbook proof: `24_RELEASE_OPERATOR_RUNBOOK.md`.

## Required Verification Before PR

Targeted:

```bash
bun run test:dom -- tests/vitest/notification-schema.test.ts
bun run test:dom -- tests/vitest/notifications-actions.test.ts
bun run test:dom -- tests/vitest/notifications-query.test.tsx
bun run test:dom -- tests/vitest/release-announcement-modal.test.tsx
bun run test:dom -- tests/vitest/notification-center.test.tsx
bun run test:dom -- tests/vitest/notification-provider.test.tsx
```

Regression:

```bash
bun run test:dom -- tests/vitest/toast.test.tsx
bun run test:dom -- tests/vitest/ui-modal-tooltip.test.tsx
bun run test:dom -- tests/vitest/project-collaboration-realtime.test.ts
bun run test:dom -- tests/vitest/project-publication-activity.test.tsx
bun run test:dom -- tests/vitest/project-publication-header.test.tsx
bun run test:dom -- tests/vitest/beta-feedback.test.ts
```

Broad:

```bash
bun run type-check
bun run lint
bun run lint:design-system
bun run test:dom
bun run validate
git diff --check
```

E2E when local server/test DB is available:

```bash
bun run test:e2e -- e2e/notifications-release-modal.spec.ts e2e/notifications-center.spec.ts
```

## Stop Conditions

Stop and create a bug plan under `.ai/15_Bugs` if:

- Cross-user RLS denial fails.
- Actual local or branch-safe RLS behavior proof is unavailable and the owner has not accepted the exact proof gap.
- Authenticated role can directly insert/update/delete notification rows.
- Notification UI appears on public share or signed-out routes.
- Modal focus return cannot be proven.
- Badge/modal state can stay stale for five minutes after user action.
- Typegen changes unexpected non-notification types.
- Typegen is generated from linked production before the notification migration is owner-approved and applied there.
- Provider target is not `ebxxqidacheyapmmzavr`.
- Linked/production migration is needed but owner approval is missing.
- Graph/GitNexus reports HIGH or CRITICAL risk for a shared primitive and mitigation is not approved.

## Commit And PR Evidence

Commit message must follow the repo Lore protocol and include:

- Constraint.
- Rejected.
- Confidence.
- Scope-risk.
- Directive.
- Tested.
- Not-tested.

Implementation PR/run log must include:

- Changed files.
- Graph/GitNexus evidence.
- Migration/typegen evidence.
- RLS proof.
- Test output summary.
- Manual QA summary.
- Provider proof boundary.
- Remaining risks.

## Recommended Execution Mode

Use `$ultragoal` as the durable leader-owned ledger. Use `$team` only after the start gate if parallel lanes are useful:

- Lane 1 executor: database/RLS.
- Lane 2 executor: server actions and query hooks.
- Lane 3 designer/executor: UI, accessibility, design-system alignment.
- Lane 4 test-engineer: fixtures, regression, e2e, verification evidence.

Do not run Team workers directly from a plain Codex App session unless OMX tmux runtime is intentionally launched. Native subagents can review bounded docs or code slices inside the current session.

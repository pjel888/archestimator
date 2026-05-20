# 05 — Rollout, Commit, and Review Plan

This document defines how to stage the future implementation safely. It also records what was done for this planning package.

## Current planning branch

Created branch:

```bash
git switch -c docs/estimate-tree-rct-dnd-plan
```

Reason: user requested staged/committed/pushed work. Even though this package is documentation/planning only, it should not be committed directly on `main`.

Pre-existing dirty files at branch creation:

- `AGENTS.md`
- `CLAUDE.md`

These were not created by this planning package and must not be staged unless explicitly approved.

## Planning package commit scope

Stage only:

- `.ai/03_plans/estimate-tree-dnd-reorganization/`
- `.ai/11_skills/payloads/react-complex-tree-dnd-archestimator.md`
- `.ai/10_state/current-state.md` and `.ai/10_state/decisions.md` only when this planning update records Philip's two-node tree decision

Do not stage:

- `AGENTS.md`
- `CLAUDE.md`
- any generated `.gitnexus` or unrelated local files
- `node_modules`

Suggested planning commit:

```bash
git add .ai/03_plans/estimate-tree-dnd-reorganization .ai/11_skills/payloads/react-complex-tree-dnd-archestimator.md .ai/10_state/current-state.md .ai/10_state/decisions.md
git commit -m "docs: plan two-kind estimate tree drag-drop"
git push -u origin docs/estimate-tree-rct-dnd-plan
```

## Future implementation commit sequence

Use small commits with verification after each phase.

### Commit 1 — target tests

Scope:

- Replace DnD-absence source-inspection tests.
- Add failing/pending pure helper tests.
- Add component test scaffolding.

Message:

```bash
git commit -m "test: add estimate tree drag-drop target coverage"
```

Verification:

```bash
bun run type-check
bun run test:dom -- tests/vitest/estimate-tree-reorder.test.ts tests/vitest/live-estimate-node-route.test.ts
```

Expected initially: new target tests may fail before implementation if using strict TDD. If committing failing tests is not acceptable for the branch, mark them `it.todo` first, then enable in implementation commits.

### Commit 2 — two-kind estimate tree domain

Scope:

- Collapse active TypeScript/domain node-kind unions to `group | area`.
- Introduce canonical `EstimateTreeNode`; remove stale `EstimateAreaNode` imports from touched feature paths.
- Convert sample/static tree data from legacy organizing kinds to `group` while preserving visible names.
- Fix `isDisplayNodeKind` to accept only `group` and `area`.
- Simplify the add-node form/action to exactly Group Node and Area Node; remove the `general -> group` form alias.
- Add/update migration to normalize legacy values, including estimate-node `assembly`, to `group` and enforce the two-kind hierarchy matrix with a check constraint.
- Regenerate/update Supabase types if the generated schema changes.
- Update tests that currently assert legacy compatibility kinds.

Message:

```bash
git commit -m "feat: simplify estimate tree node kinds"
```

Verification:

```bash
bun run type-check
bun run test:dom -- tests/vitest/estimate-tree-data.test.ts tests/vitest/live-estimate-node-route.test.ts tests/vitest/supabase-performance-migrations.test.ts
```

Risk review:

- Confirm SQL and TypeScript hierarchy matrices match exactly.
- Confirm Group Nodes render in the target route tree.
- Confirm no active code still creates or persists `lot`, `general`, `structure`, `level`, or `assembly` as estimate tree node kinds.

### Commit 3 — pure reorder planning helper

Scope:

- Add `src/lib/estimates/tree-reorder.ts`.
- Add `tests/vitest/estimate-tree-reorder.test.ts`.

Message:

```bash
git commit -m "feat: add estimate tree reorder planning helpers"
```

Verification:

```bash
bun run type-check
bun run test:dom -- tests/vitest/estimate-tree-reorder.test.ts
```

Review focus:

- Cycle prevention.
- Root/parent hierarchy matrix.
- Sort-order normalization.
- RCT target translation.

### Commit 4 — atomic persistence

Scope:

- Add new Supabase migration.
- Add Supabase type for new RPC.
- Add `reorderEstimateTreeNodes` server action.
- Add action/migration tests.

Message:

```bash
git commit -m "feat: add atomic estimate tree reorder persistence"
```

Verification:

```bash
bun run type-check
bun run test:dom -- tests/vitest/estimate-node-reorder-action.test.ts tests/vitest/supabase-performance-migrations.test.ts
```

If local Supabase integration is configured:

```bash
RUN_SUPABASE_INTEGRATION=1 bun run test:dom -- tests/vitest/estimate-node-reorder-db.test.ts
```

Review focus:

- One atomic RPC/function call, not independent row updates.
- Project/estimate/user scope validation in the server action.
- Database-level authorization is not bypassed by the RPC: use `SECURITY INVOKER` or an explicit `auth.uid()` workspace-membership check for any `SECURITY DEFINER` function.
- SQL validates duplicates, cycles, cross-estimate parents, and two-kind hierarchy.
- SQL rejects Area Node parents and Area Node root children.
- Historical removal migration remains intact; new migration is additive after it.

### Commit 5 — optimistic RCT integration

Scope:

- Enable RCT DnD props in `EstimateSheetTree`.
- Add optimistic state/rollback.
- Add drag indicator and status UI.
- Add/update component tests.

Message:

```bash
git commit -m "feat: enable optimistic estimate tree drag-drop"
```

Verification:

```bash
bun run type-check
bun run test:dom -- tests/vitest/estimate-sheet-tree-dnd.test.tsx tests/vitest/estimate-tree-modal.test.tsx
```

Review focus:

- No `router.refresh()` after drop.
- `router.push` only on primary action, not drop; drag/drop must not accidentally invoke `canInvokePrimaryActionOnItemContainer`.
- `expandedItems`, `selectedItems`, and `focusedItem` preserved.
- `canDropAt` blocks invalid targets.
- Saving/failure status accessible.

### Commit 6 — browser E2E and no-flicker proof

Scope:

- Add authenticated/dev-bypass Playwright setup.
- Add `e2e/estimate-tree-dnd.spec.ts`.
- Add instrumentation helpers if useful.

Message:

```bash
git commit -m "test: cover estimate tree drag-drop in browser"
```

Verification:

```bash
bun run test:e2e -- e2e/auth.spec.ts e2e/estimate-tree-dnd.spec.ts
```

Review focus:

- No document navigation after drop.
- No login redirect/flash while authenticated.
- No blank tree frames.
- Persistence survives reload.
- Mutating tests isolate or reset seed data and do not mutate the shared manual-QA estimate directly.

### Commit 7 — final cleanup/state docs

Scope:

- Update `.ai/10_state/current-state.md` if the feature is now implemented.
- Update `.ai/10_state/decisions.md` to record deliberate reintroduction of tree DnD and atomic RPC/function.
- Update this plan if implementation diverged.

Message:

```bash
git commit -m "docs: record estimate tree drag-drop implementation state"
```

Verification:

```bash
bun run validate
bun run test:e2e
```

## Review workflow

Use separate builder and reviewer when possible.

Recommended:

1. Builder: Codex implements phase commits.
2. Reviewer: Claude/OpenCode/Kimi reviews diff for architecture and edge cases.
3. Tester: run validation gates and browser QA.
4. Hermes: update `.ai` state and final summary.

Reviewer prompts should include:

- Read this plan folder first.
- Confirm the implementation uses RCT v2.6.1 correctly.
- Confirm no full-page refresh/reload path exists on drop.
- Confirm hierarchy rules are single-sourced.
- Confirm database persistence is atomic.
- Confirm tests prove no flicker and no accidental route navigation.

## Rollback strategy

If UI DnD is unstable but persistence is safe:

- Feature-flag DnD props off at component level.
- Keep pure helpers/server action if tests prove safe, or revert as a unit.
- Do not leave a public RPC enabled if the UI is disabled and product does not want external clients using it.

If database migration is unsafe:

- Add a new migration to drop the newly introduced function.
- Do not edit historical migrations after they have been applied/shared.
- Re-run migration tests.

If the two-kind simplification causes unintended tree changes:

- Do not revert blindly. First inspect whether old `lot`/`general`/`structure`/`level` values represented real product semantics or only labels.
- Preserve user-facing names and organization; only technical kinds should collapse.
- If product truly needs additional behavioral node classes later, that must be a new explicit domain decision and migration, not a silent reintroduction of legacy kinds.

## PR description template

```md
## What changed
- Simplified the estimate tree technical domain to Group Nodes and Area Nodes.
- Added optimistic drag/drop reorder/reparent support for estimate tree.
- Added atomic server persistence for tree node moves.
- Added browser coverage proving no reload/flicker.

## Why
- Users need seamless estimate hierarchy reorganization without reloading the workshop.

## Verification
- [ ] bun run type-check
- [ ] bun run lint
- [ ] bun run lint:font-size
- [ ] bun run test
- [ ] bun run test:dom
- [ ] bun run test:e2e
- [ ] Manual target route QA

## Risk
- Two-kind domain/SQL migration alignment.
- Database hierarchy/sort-order persistence.
- Selection/expansion state stability.
- Authenticated e2e setup.

## Rollback
- Disable RCT DnD props and/or drop newly introduced reorder RPC via migration.
```

## Final implementation acceptance gate

Do not mark the feature complete until all are true:

- [ ] Existing and new tests pass.
- [ ] Browser proves no document navigation on drop.
- [ ] Browser proves no blank/flicker frames on drop.
- [ ] Valid moves persist after reload.
- [ ] Invalid moves are blocked.
- [ ] Selected/expanded/focused state is preserved.
- [ ] `.ai/10_state` reflects the implemented reality.
- [ ] Reviewer has checked code and tests against this plan.

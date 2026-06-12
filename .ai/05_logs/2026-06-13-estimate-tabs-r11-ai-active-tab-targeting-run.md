# Estimate Tabs R11 Ask Flip Active-tab Targeting Run

Date: 2026-06-13 (Asia/Manila local runtime)
Branch/worktree: `feat/estimate-tabs-phase5-templates-panel` at `/Users/philiplewis/archestimator.omx-worktrees/launch-codex-projects-auto-added-to-templates`

## Change

- Preserved the existing project/estimate route regex shape in `EstimateCopilotFloatingButton`; added additive active-tab route context by reading the selected tab strip button's `data-estimate-tab-id`.
- `readPackageBuilderTools` now accepts `activeTabId`, scopes current-estimate nodes to `estimate_nodes.estimate_tab_id`, filters row summaries to the scoped nodes, and infers the selected node's tab when no active tab is provided.
- Fill-current-estimate draft targets now carry `activeTabId`.
- Package-builder Apply passes `target_tab_id` to `create_estimate_node_with_history` when creating missing Area Nodes, so AI-created nodes land in the active tab rather than the estimate default tab.

## Fresh Local Verification

```text
bun x vitest run tests/vitest/estimate-copilot-floating-button.test.tsx tests/vitest/ai-package-builder-read-tools.test.ts tests/vitest/ai-package-builder-draft.test.ts tests/vitest/ai-package-builder-schema.test.ts tests/vitest/ai-package-builder-apply.test.ts --maxWorkers=1
# Test Files  5 passed (5)
# Tests       109 passed (109)

bun run type-check
# tsc --noEmit
# passed

bunx eslint src/components/workshop/EstimateCopilotFloatingButton.tsx src/lib/ai/package-builder/read-tools.ts src/lib/ai/package-builder/draft.ts src/lib/ai/package-builder/schemas.ts src/lib/ai/package-builder/apply.ts tests/vitest/ai-package-builder-read-tools.test.ts tests/vitest/ai-package-builder-draft.test.ts tests/vitest/ai-package-builder-schema.test.ts tests/vitest/ai-package-builder-apply.test.ts
# passed
```

## Boundaries

- No hosted Ask Flip/manual browser proof, live provider call, linked Supabase proof, or production deploy was performed.
- R11.3 read-context tab grouping/audit attribution remains deferred by the matrix as an additive follow-up, not a core release dependency.

# Estimate Tabs R10.3 Presence Active-tab Attribution Run

Date: 2026-06-13 (Asia/Manila local runtime)
Branch/worktree: `feat/estimate-tabs-phase5-templates-panel` at `/Users/philiplewis/archestimator.omx-worktrees/launch-codex-projects-auto-added-to-templates`

## Change

- Added optional `activeTabId` to `useProjectPresence` input and tracked presence payloads.
- Kept slow presence state separate from high-frequency cursor broadcasts.
- Existing cursor broadcast contract already carries `tabId` and filters remote cursors by active tab; this slice completes the additive presence field part of R10.3 locally.

## Fresh Local Verification

```text
bun x vitest run tests/vitest/project-collaboration-realtime.test.ts tests/vitest/estimate-cursor-broadcast-throttle.test.ts --maxWorkers=1
# Test Files  2 passed (2)
# Tests       4 passed (4)

bun run type-check
# tsc --noEmit
# passed

bunx eslint src/hooks/use-project-presence.ts tests/vitest/project-collaboration-realtime.test.ts
# passed

git diff --check
# passed
```

## Boundaries

- No live Supabase realtime proof, hosted/manual 2-browser QA, linked provider proof, or production deploy was performed.

# GitNexus And Code Graph Impact Specialist Plan

## Goal

Keep future implementation grounded in structural impact evidence even when the graph index is unavailable or empty.

## Fresh Evidence From Refinement

Worktree: `/Users/philiplewis/.codex/worktrees/notification-system/archestimator`

Code-review graph results during this refinement:

- `get_architecture_overview`: `0 communities`, `0 community pairs`, `0 warnings`
- `get_hub_nodes`: no hub nodes
- `detect_changes` against `HEAD`: no changed files before refinement

Interpretation: the graph tool was callable but did not provide usable architecture coverage for this worktree at refinement time. The plan therefore requires a graph attempt plus documented fallback before source edits.

## Required Future Pre-Edit Steps

Before modifying any function, class, method, exported component, hook, or server action:

1. Try code-review graph impact analysis for changed file/symbol.
2. If GitNexus MCP tools are available, run the project-specific impact/context query required by `AGENTS.md`.
3. If graph/GitNexus returns empty, stale, or unavailable, record that exact result in the implementation log.
4. Fall back to targeted `rg`, `nl -ba`, and focused file reads.

## Symbol/Surface Impact Targets

Run impact or fallback analysis for:

- `AppProviders` in `src/app/providers.tsx`
- `Modal` in `src/components/ui/modal.tsx` if modified
- `ToastProvider` in `src/components/ui/toast.tsx` if modified
- `WorkshopPageShell` in `src/components/workshop/WorkshopPageShell.tsx`
- `WorkshopTitleHeader` in `src/components/workshop/WorkshopTitleHeader.tsx` if actions layout changes
- `requireCurrentUserContext` usage pattern in `src/lib/auth/session.ts`
- `useProjectPresence` and `useEstimateCursorCollaboration` only if Realtime helper policies/hooks are changed

## Blast Radius Report Template

Future implementation log must include:

```md
## Graph / Impact Evidence

- Tool attempted:
- Target:
- Result:
- Direct callers:
- Affected routes:
- Tests mapped:
- Risk level:
- Fallback used:
```

## Detect Changes Before Commit

Before committing implementation work, run:

- `mcp__code_review_graph.detect_changes_tool` if available.
- GitNexus detect changes if available through the current tool surface.
- `git diff --stat`
- `git diff --check`

If graph still reports no coverage, say so in the commit/run log rather than treating absence of evidence as low risk.

## Stop Gates

- Stop before modifying shared primitives if impact analysis reports HIGH or CRITICAL risk until the user is warned and the mitigation is documented.
- Stop before commit if detect-changes reveals unexpected source areas outside the notification plan.
- Create `.ai/15_Bugs/<date>-notification-system-graph-impact-gap.md` if graph/GitNexus is required by local policy and no fallback evidence can be collected.

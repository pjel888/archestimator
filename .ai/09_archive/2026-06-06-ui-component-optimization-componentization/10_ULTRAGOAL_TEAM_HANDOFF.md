# Ultragoal And Team Handoff

Date: 2026-06-06

## Current State

This folder is a refined docs-only plan pack. No `.omx/ultragoal` durable plan was created during this refinement because the requested write scope was `.ai` planning and state documentation. Ralplan was initially active from the prompt routing hook and was cancelled cleanly before `.ai` document edits.

Native subagents were not spawned because the available lazy-loaded multi-agent schema did not expose the required OMX `agent_type` field. Future OMX execution must use installed roles such as `executor`, `verifier`, `architect`, or `critic` and must not omit `agent_type`.

## Recommended Future Execution

Use a scoped future prompt for the MVP only:

```text
$ultragoal $team
Implement Phases 0-3 from .ai/03_plans/2026-06-06-ui-component-optimization-componentization.
Do not touch editable estimate tree or EstimateSheetContent behavior.
Start with tests for tree-core utilities and share-tree rendering.
Verify with targeted tests, `bun run type-check`, design-system lint, browser share-tree smoke, and git diff checks.
```

## Suggested Lanes

| Lane | Role | Scope |
| --- | --- | --- |
| Leader | `architect` or main Codex agent | Own phase boundaries, gates, and final evidence. |
| Tree utility implementation | `executor` | Pure utilities and tests only. |
| Share-tree implementation | `executor` | Read-only share surface wiring after utilities. |
| Verification | `verifier` | Test, visual smoke, diff, and rollback evidence. |
| Review | `code-reviewer` plus `architect` | Independent review before completion. |

## Future Checkpoint Requirements

- Record GitNexus/code-review graph impact before source edits.
- Checkpoint phase completion by commit.
- Keep Phases 5-8 out of MVP unless owner explicitly approves.
- Do not mark the aggregate goal complete until tests, docs, review, and rollback evidence are clean.

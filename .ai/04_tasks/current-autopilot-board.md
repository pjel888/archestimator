# Current Autopilot Board

**Status:** Superseded by reset cleanup on 2026-05-17; not an active feature board.

Use `.ai/10_state/current-state.md` for live project state. The repo now contains a small post-reset workshop route slice, but there is still no broad autopilot board for restoring the deleted prototype.

## Current baseline

- `/` landing page remains.
- A small post-reset workshop/projects/components route slice exists.
- Previous full workshop recovery work remains rejected as the default direction.

## Do not continue from this board

Do not use this board to continue tasks related to:

- broad project dashboard restoration;
- full estimate editor/workspace restoration;
- full component library/admin restoration;
- proposal snapshots;
- revision/versioning UI;
- broad app shell/project shell restoration;
- local-first data repositories;
- grid/dnd implementation;
- legacy route redirects.

## Next valid action

Use the current-state docs and a fresh/current narrow plan. If Philip reports degraded quality or stale behavior, run `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md` before creating or executing tasks.

---

## 2026-06-03 mass deletion task note

The superseded board remains inactive, but the current mass-deletion task closed repo-local implementation on `feat/mass-project-estimate-component-deletion`: preview/execute actions, SQL migration contract, UI multi-select/typed confirmation, component archive filtering, and tests/build validation are complete. Provider DB migration apply remains an explicit release gate.


---

## 2026-06-03 projects page access tabs task note

The superseded board remains inactive, but the current projects-page access-tabs task closed repo-local implementation on `feat/projects-page-access-tabs-plan`: two always-visible tabs, owned/shared partitioning by `accessKind`, active-tab search/selection, shared-only defaulting, and shared-favorite suppression are implemented and locally validated. Plan archive: `.ai/09_archive/store/2026-06-03-projects-page-access-tabs-complete/`. Hosted/manual shared-user browser proof remains release evidence.

# Agentic Development Protocol

**Date:** 2026-06-03

## ArchEstimator ADD principles

1. Human strategy, AI execution.
2. `.ai` canonical, Notion mirror.
3. Documentation before implementation.
4. Repo evidence before claims.
5. Contracts before boundaries.
6. Tests before completion.
7. Git traceability for every meaningful change.
8. Validation before merge.
9. Senior review for risky changes.
10. No source-of-truth drift.
11. No provider claims without provider evidence.
12. No secrets.
13. No broad refactors without explicit scope.

## Phase gates

| Phase | Entry criteria | Exit criteria | Required artifacts | Git actions | Validation |
|---|---|---|---|---|---|
| DEFINE | User goal known | Goal/non-goals/owners/scope accepted | Brief, requirements, stop conditions | none | requirements review |
| DISCOVER | DEFINE complete | Current repo/provider facts captured | Research log, graph/GitNexus evidence | none | commands recorded |
| DESIGN | DISCOVER complete | Architecture/contracts/risk/rollback defined | Design plan, contract map, risk table | optional branch | plan review |
| SETUP | DESIGN complete | Branch/tasks/log ready | Task packet, run log stub | create approved branch only | status clean |
| BUILD | SETUP complete | Implementation/docs complete | Diff, tests first for code, run log | commits in branch | targeted tests |
| VALIDATE | BUILD complete | Evidence proves scoped claim | Validation report, logs, screenshots/provider proof when relevant | no merge yet | required commands pass |
| RELEASE | VALIDATE complete | PR/merge/promotion/archive/mirror done | PR, release checklist, rollback proof, Notion mirror | merge/push only per policy | post-release smoke |

## Required `.ai` updates by phase

- DEFINE/DISCOVER/DESIGN: `.ai/03_plans` and `.ai/04_tasks`.
- BUILD/VALIDATE: `.ai/05_logs`, relevant specs, decisions if durable.
- Bugs/blockers: `.ai/15_Bugs`.
- Releases: `.ai/01_roadmap`, release plan, evidence index.

## Agent stop conditions

Stop and escalate only for destructive/provider/protected-branch actions, missing credentials/authority, unresolved material ambiguity, or failed validation with no safe recovery. Do not stop merely because work is long.

## Handling uncertainty

Record the uncertainty, classify it as repo-local/provider/GitHub/Notion/human, gather the smallest safe evidence, and if unresolved create a bug/blocker plan or owner-decision entry.

## Bug/blocker creation

Create `.ai/15_Bugs/YYYY-MM-DD-slug.md` with title, classification, evidence, reproduction or unavailable reason, suspected root cause, impact, severity, fix plan, verification plan, status, and link to current plan.

## Avoiding stale decisions

Every agent starts from `AGENTS.md` and `.ai` source-of-truth chain, not chat memory. If historical plans conflict with current-state/source files, current-state/source files win and the stale doc gets patched or logged as a bug.

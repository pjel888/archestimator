---
title: Express Components Implementation Goal
type: prompt
date: 2026-06-15
---

# Express Components Implementation Goal

Use this file as the codebase AI entrypoint for implementing the full Express Components plan pack. It is intentionally prompt-shaped so it can be pasted into Codex `/goal`, OMX `ultragoal`, or another agentic execution surface.

## Copy-Paste Goal

```text
/goal Implement Express Components end-to-end from `.ai/03_plans/2026-06-15-Express-Components/`.

You are the lead implementation agent for Archestimator. Execute the Express Components plan pack to completion while preserving the plan's scope gates, safety constraints, and verification standard.

Source of truth, in order:
1. `AGENTS.md`
2. `.ai/README.md`
3. `.ai/00_system/ai-folder-canonical-map.md`
4. `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
5. `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`
6. `.ai/10_state/current-state.md`
7. `.ai/10_state/decisions.md`
8. `DESIGN.md`
9. every file in `.ai/03_plans/2026-06-15-Express-Components/`, starting with `INDEX.md`
10. the active audit input in `.ai/02_audits/2026-06-15-Express-Components-claude-3rd-pass-audit/`

Workflow requirements:
- Use `$ultragoal` as the durable execution wrapper. Create story goals from this prompt and checkpoint after each completed story with real evidence.
- Use `$ultrawork` inside each story when independent lanes can run in parallel: repo mapping, implementation, test design, browser QA, SQL/provider evidence, docs/evidence updates, and review can split when their files do not conflict.
- Use `$ultraqa` as the final adversarial dynamic QA gate. Do not treat lint/typecheck/build alone as sufficient.
- Use `compound-engineering:ce-strategy` posture for product grounding: if `STRATEGY.md` exists, read it; otherwise use `.ai/10_state/current-state.md`, `.ai/10_state/decisions.md`, and `DESIGN.md` as the strategic anchor.
- Use `compound-engineering:ce-plan` posture for planning discipline: keep file references repo-relative, keep implementation units traceable, and separate planning-time decisions from execution-time discoveries.
- Use `compound-engineering:ce-work` posture for execution: make scoped changes, run targeted verification after each unit, preserve unrelated dirty work, and update evidence docs when implementation facts change.
- Use `compound-engineering:ce-frontend-design` posture for the visible editor and Components surfaces. Match `DESIGN.md`, existing workshop UI primitives, icon/button conventions, contrast requirements, and the mobile/touch/narrow viewport constraints in docs 03 and 09.
- Use `compound-engineering:lfg` only as a mental pipeline contract unless the actual OMX/Compound runtime is available: plan is already present, so execute work, review, test, commit/push/PR, watch CI, and fix failures until green or residuals are durable.

Mandatory orchestration:
- Start by reading the plan pack and building an execution ledger that maps U1-U9 to Q1-Q56.
- Spawn independent native subagents when useful, with role-appropriate `agent_type`: `explore` for repo mapping, `test-engineer` for regression design, `designer` for UI/a11y checks, `debugger` for failures, `executor` for isolated implementation slices, `architect` for high-risk schema/security boundaries, `code-reviewer` for review, and `verifier` for completion evidence.
- Keep shared-file implementation local to the lead unless the file scope can be split safely.
- Do not start U4 inline editor coding until `evidence/inline-vs-modal-spike-result.md` is completed with the spike result or the modal/popover fallback branch is selected.
- Do not claim U5 fixes a production duplicate-instance bug unless `evidence/u5-duplicate-instance-repro-note.md` contains the required real-project reproduction. If the real bug does not reproduce, scope U5 as verification plus normalization hardening.
- Do not start U7 promotion coding until provider evidence pins helper semantics, grants, policies, folder workspace binding, and negative member/editor/viewer cases.
- Keep all Supabase/Postgres work scoped to Archestimator project `ebxxqidacheyapmmzavr`; never mutate SlateCamp or unrelated provider projects.
- Do not read or print secrets. If provider access is needed, use configured tooling without echoing environment values.

Implementation sequence:
1. Read and reconcile plan pack docs `00` through `12`, `08-traceability-matrix.md`, and `05-readiness-qa-matrix.md`.
2. Build the day-0 slice first: U1, U2, U3, U4, and the minimum U9 gates.
3. Before U4 coding, run the inline-vs-modal spike:
   - estimate with at least 75 rows and one active express editor in the middle
   - if all-row mounting is visibly costly, repeat with 300-500 rows or implement a bounded non-virtual window
   - record the result in `evidence/inline-vs-modal-spike-result.md`
4. Implement U1 domain/read helpers:
   - classify express, legacy blank, linked, detached, linked-overridden, source-less edited rows
   - include `metadata.expressComponent` in the load-bearing estimate read path
   - prove source-less edited rows do not leak into Project projection as express rows
5. Implement U2 Add row express insert lifecycle:
   - express template, persisted row result reconciliation, row revision availability, buffered fast edit, insert retry/delete recovery
   - history migration so only true legacy blank placeholders produce `row_blank_added`
   - sort-order collision handling inside the insert RPC or same-correlation retry
6. Implement U3 row update widening:
   - typed patch fields for express material fields
   - canonical `unitCost` patch key
   - optimistic tree patch and stale revision recovery
   - JSON preservation by omission and server-merged complete JSON for intentional metadata/source snapshot writes
7. Implement U4 editor:
   - inline material-cell editor if the spike passes; otherwise compact quick-add modal/popover fallback from doc 03
   - `EditableRowValue` owns express text/edit state; do not create a parallel top-level draft map
   - keyboard/focus/a11y/mobile/touch rules from docs 03 and 09
   - virtualization disabled while `activeExpressEditorCount >= 1` unless a measured bounded-window approach replaces it
8. Implement U9 day-0 shipability:
   - feature flag and flag-off persisted express-row fallback render
   - viewer/read-only server-action blocks for insert/update/replace via `assertCanEditEstimate` or equivalent RPC edit checks
   - stale revision recovery, cursor suppression, reconnect/replay behavior, observability sink, rollback evidence
9. Implement U8 downstream release blockers before release:
   - history/activity, AI read-context/read-tools, AI package-builder replacement safety, export/proposal/charts/publication behavior
   - replace/move/clear/copy/reusable-source/template paths preserve, merge, rekey, or explicitly block express metadata/source snapshots
10. Implement U5 verification/normalization after day-0 unless a real bug repro changes priority.
11. Implement U6 Project folder projection as fast-follow:
   - explicit project context only
   - virtual Project node, no `library_folders` persistence
   - project/estimate access checks and unauthorized negative tests
12. Implement U7 promotion as fast-follow:
   - atomic `promote_express_row_to_library_component` RPC
   - estimate edit plus current library-write policy parity
   - idempotency/provenance, folder workspace boundary, default price option, row relink, cache invalidation
13. After every implementation story, update the relevant evidence docs and traceability if execution facts differ from the plan.

Required test/evidence matrix:
- Prove every Q row in `05-readiness-qa-matrix.md`, especially Q14, Q22, Q27, Q29, Q49, Q50, Q51, Q52, Q53, Q54, Q55, and Q56.
- Maintain an implementation evidence log under `.ai/03_plans/2026-06-15-Express-Components/evidence/`.
- Targeted tests start with:
  - `bun test tests/vitest/estimate-sheet-library-insert.test.tsx`
  - `bun test tests/vitest/estimate-sheet-cost-inputs.test.tsx`
  - `bun test tests/vitest/component-library-manager.test.tsx`
  - `bun test tests/vitest/library-folder-tree-selection.test.tsx`
  - `bun test tests/vitest/reusable-sources-actions.test.ts`
- Add or update focused SQL/action tests for insert history classification, authorization, copy rekey, replace/move preservation, promotion, and sort-order collision.
- Add or update browser proof for desktop workshop estimate editing, virtualized 75-row editing, 300-500 row fallback stress or bounded-window proof, narrow/touch viewport editing, Components Project projection, unauthorized project context, keyboard path, drag/drop path, row actions, publication image snapshot, and promotion cache invalidation.
- Run broader checks only after shared logic, DB/security, or release surface changes justify them:
  - `bun run type-check`
  - `bun run lint`
  - `bun run validate`
  - `bun run build` when release readiness or routing/runtime behavior changes

UltraQA final gate:
- Build an adversarial scenario matrix before declaring completion.
- Include viewer bypass, direct server-action writes, replace/move clobber after reload, copy rekey collision, no-realtime peer visibility, stale revision recovery, flag-off persisted render, source-less renamed-row projection leak, 300-500 row virtualization stress, malformed/oversized text input, retry after partial insert/promotion, misleading success output, dirty worktree, and hung/flaky command handling.
- Clean temporary harnesses and state, or intentionally commit evidence artifacts.

Completion contract:
- All planned U1-U9 work is either implemented and verified, or a plan-approved fast-follow/deferred gate remains explicitly unimplemented with durable evidence and owner.
- All third-pass audit P1/P2 findings in `08-traceability-matrix.md` are satisfied by code, tests, evidence, or an explicit blocked/deferred record.
- Q1-Q56 have evidence, not just intent.
- Feature flag rollback works.
- No known authorization, data-integrity, stale-revision, metadata-clobber, or copy-id collision gaps remain.
- Targeted tests and justified broader checks pass.
- UltraQA report is complete and stored in the evidence folder.
- Independent review has no unresolved request-changes/blocker findings.
- Commit using the repo Lore Commit Protocol, push the branch, open/update the PR if applicable, watch CI when available, and fix CI failures or durably record residuals.
```

## Entry Criteria

- The working tree has no unrelated edits in files the implementation will modify, or those edits are explicitly recognized and preserved.
- The implementer has read `INDEX.md`, `04-implementation-plan.md`, `05-readiness-qa-matrix.md`, `08-traceability-matrix.md`, `11-concurrency-and-permissions-spec.md`, and `12-rollout-migration-and-observability-runbook.md`.
- The implementer understands that day-0 authoring is narrower than the full pack, but this goal asks for the full pack through the fast-follow U6/U7 slices unless a later owner decision supersedes scope.

## Recommended Story Split

| Story | Scope | Primary evidence |
| --- | --- | --- |
| G001 | Repo mapping, implementation ledger, spike setup, and evidence-file scaffolding | U/Q ledger, spike result path, dirty-worktree snapshot |
| G002 | U1 read/classification helpers and source-less row tests | Q34, Q53 |
| G003 | U2 express insert template, persisted result reconciliation, retry/delete draft lifecycle, history migration | Q1, Q17, Q18, Q32, Q39, Q45 |
| G004 | U3 update widening, optimistic patching, stale revision recovery, JSON preservation | Q2, Q5, Q7, Q19, Q30 |
| G005 | U4 inline or modal editor, keyboard/focus/a11y/mobile/virtualization behavior | Q3, Q4, Q6, Q22-Q26, Q49, Q55 |
| G006 | U9 day-0 permissions, feature flag, rollback, no-realtime honesty, observability | Q27-Q31, Q47, Q52, Q54 |
| G007 | U8 downstream replace/copy/read/export/proposal/AI/publication safety | Q14-Q16, Q35-Q37, Q40, Q42, Q44, Q50, Q51 |
| G008 | U5 duplicate-instance verification or normalization hardening | Q8, Q9, Q43 |
| G009 | U6 Project folder projection | Q10-Q12, Q20, Q34, Q41, Q53 |
| G010 | U7 promotion RPC and cache invalidation | Q13, Q21, Q28, Q33, Q46, Q48, Q54 |
| G011 | Full UltraQA, independent review, docs/evidence finalization, commit/push/PR/CI | Q38, Q56, final review evidence |

## Non-Negotiable Safety Constraints

- Do not create a new express table unless a new explicit product decision approves reusable project-local components as a separate concept.
- Do not silently rely on current row RPC membership checks for write authorization; viewer direct action tests must fail before the fix and pass after it.
- Do not preserve `metadata.expressComponent.id` across project-source or template copy; copied rows need fresh ids.
- Do not claim realtime row sync exists unless a new row-sync workstream is implemented and tested.
- Do not let replace, move, AI package-builder replacement, project-source copy, or template copy clobber express metadata/source snapshots.
- Do not treat source-less rows as blank rows by source null alone.
- Do not ship promotion with a two-transaction create-then-relink app saga.
- Do not print secrets or provider tokens.

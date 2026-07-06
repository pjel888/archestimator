# Agent Coordination

## Master Goal

Make Estimate Sheet Tree branch reordering trustworthy and usable without regressing the rest of the tree state surface: non-empty branches can be reordered or reparented without losing descendants, the live "Estimate history event workspace could not be resolved" error is eliminated, confirmed server state cannot poison future sort-order calculations, pointer plus keyboard users get clear before/inside/after placement controls, and context-menu, rename, create, delete, bulk delete, restore, search/filter, lazy-load, active-tab, permission, and external-drop states remain protected.

## Scope

In scope:

- `src/components/workshop/EstimateSheetTree.tsx`
- `src/components/ui/tree.tsx`
- `src/lib/estimates/estimate-tree-reorder.ts`
- `src/lib/estimates/actions.ts` (reorder specifically, plus the `target_project_id` payload guardrail)
- `src/lib/estimates/d1-action-client.ts` (reorder adapter + insertHistoryEvent)
- `src/lib/repositories/workspace-repository.ts` (reorder readback)
- Existing Vitest DOM/unit/action tests for estimate tree reorder.
- Existing Vitest coverage for context menu, rename, delete, bulk delete, restore, search/filter, lazy hydration, active-tab, and external-drop behavior.

Out of scope unless a failing test proves it is required:

- New drag/drop dependencies.
- Schema migrations.
- Cross-provider or historical Supabase mutation work.
- Full visual redesign of the workshop sidebar.
- Browser automation as a default gate. Use it only if the implementation changes live drop-indicator geometry beyond what DOM tests can prove.

## Constraints

- Planning-only artifact creation in this package. No application code changed by this planning pass.
- Preserve the current single-node estimate model: any node may parent any node, subject to self/cycle, estimate ownership, and tab isolation rules.
- Do not reintroduce groups-before-areas sorting. Stored sibling `sort_order` is the display order.
- Prefer existing `Tree` primitive and estimate reorder utilities over a new DnD stack.
- Preserve row item cache during reorder settle.
- Phase 0 must land before any other phase; it unblocks the user.

## Agent Ledger

| Lane | Owner | Period | Evidence | Result |
| --- | --- | --- | --- | --- |
| Lead | Codex | Original pass | Source reads, plan package | Integrated plan and scope. |
| Lead | Sisyphus/OpenCode | Earlier 2026-07-06 audit pass | Direct grep + read of 2217-line component, actions.ts, d1-action-client.ts, migrations | Added RC0, Phase 0, R0, AC0, T-RC0, RISK-RC0, D0, and the prior verification label superseded by this revision. |
| Lead | Codex | 2026-07-06 state-matrix revision | Direct source reads, six live subagent artifacts, official docs spot-checks | Added `20_STATE_INVENTORY_AND_SHADOW_PATHS.md`, corrected stale test/provider claims, split action-wrapper vs D1 proof, expanded state matrix. |
| Source state map | `explorer` subagent `019f3507-935d-7531-a0c3-c5095e41f695` | 2026-07-06 state-matrix revision | Read-only source map of `EstimateSheetTree`, `Tree`, and tests | Identified 14 state surfaces and plan stale/gap notes. |
| Data/API | `architect` subagent `019f3507-9640-74f0-a01a-7e11c1ea49d4` | 2026-07-06 state-matrix revision | Read-only D1/action/repository audit | Confirmed RC0, D1 projected-validation gap, current readback baseline, and Move dialog inside-only scope. |
| UX/a11y | `designer` subagent `019f3507-afa2-7ba2-91c0-fa9e691d8add` | 2026-07-06 state-matrix revision | Read-only UX/a11y audit | Confirmed title-only disabled reasons, inside-only Move dialog, decorative grip, focus/selection collision, empty-state copy issue. |
| Test QA | `test-engineer` subagent `019f3507-b312-7b33-a3c1-7977fe04e3be` | 2026-07-06 state-matrix revision | Read-only test inventory | Split existing coverage from precise new gaps; flagged mocked action test limitations. |
| Official docs | `docs-researcher` subagent `019f3507-b836-7b72-a717-014f3185fddb` | 2026-07-06 state-matrix revision | React/Next/Cloudflare/WAI-ARIA docs | Added refactor, Server Action, D1, and a11y constraints. |
| Plan critic | `critic` subagent `019f3507-c168-7e61-92c2-8043564b2c9d` | 2026-07-06 state-matrix revision | Adversarial plan review | Rejected stale Phase 0 evidence mapping; required payload expectation updates and D1 proof split. |
| Test QA | `test-engineer` subagent | Original pass | Reported existing tests and gaps | Identified missing non-empty branch DOM/optimistic coverage and focused commands. |
| UX/UI | `designer` subagent | Original pass | Source-only audit | Identified keyboard parity, visible status, drop-target clarity, and a11y risks. |
| Repo exploration | `explorer` subagent | Original pass | Reorder execution path | Identified persistence and D1 adapter parity surfaces. |
| Historical plan accuracy audit | `explore` subagent (bg_9b43cc7c) | Earlier 2026-07-06 audit pass | Timed out after 30m, no artifact | Superseded by live subagent state-matrix revision. |
| Historical RC0 root cause | `explore` subagent (bg_2948354f) | Earlier 2026-07-06 audit pass | Timed out after 30m, no artifact | Superseded by direct trace plus live data/API lane. |
| Historical unexplored facets | `explore` subagent (bg_107ba09f) | Earlier 2026-07-06 audit pass | Timed out after 30m, no artifact | Superseded by source-state map lane. |
| Historical server-action + migration map | `explore` subagent (bg_47707c7e) | Earlier 2026-07-06 audit pass | Timed out after 30m, no artifact | Superseded by data/API lane and direct D1 reads. |

## Stop Condition

Implementation can stop only when:

- All acceptance criteria in `02_REQUIREMENTS_AND_ACCEPTANCE_CRITERIA.md` pass — including AC0 (Phase 0 hotfix).
- Focused tests in `11_TEST_STRATEGY_AND_QA_MATRIX.md` pass.
- `bun run type-check` passes after refactor.
- Known gaps are recorded if browser proof is intentionally skipped.
- The user-reported error string `"Estimate history event workspace could not be resolved."` never fires for any authorized reorder.
- The state inventory in `20_STATE_INVENTORY_AND_SHADOW_PATHS.md` is either preserved by tests or each exception is explicitly documented.

## Coordination Rules For Implementation

- Use maker/checker separation for the first implementation pass: one agent implements, another reviews correctness and test coverage.
- Keep write scopes disjoint if parallelizing:
  - Phase 0 lane (CRITICAL): `actions.ts:2252` + `estimate-node-reorder-action.test.ts`. Ship alone.
  - Correctness lane: `estimate-tree-reorder.ts`, action/client tests.
  - UI lane: `tree.tsx`, DOM tests.
  - Estimate component lane: `EstimateSheetTree.tsx`, context-menu and DnD tests.
- Do not edit shared `Tree` behavior without running `ui-tree.test.tsx`.
- Phase 0 must merge before Phase 1 work begins on the same branch.

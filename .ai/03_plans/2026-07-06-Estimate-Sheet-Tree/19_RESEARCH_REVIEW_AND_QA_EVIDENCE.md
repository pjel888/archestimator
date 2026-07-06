# Research Review And QA Evidence

## 2026-07-06 State-Matrix Revision

### Verification Mode

`verification_mode: source-audited-with-live-subagents`.

This was a planning-only revision. No application source, tests, migrations, provider resources, or browser sessions were changed. The evidence is source/test/docs review plus subagent critique, not implementation proof.

### Lead Investigator

Codex lead performed direct reads of the plan pack, `EstimateSheetTree.tsx`, `tree.tsx`, `actions.ts`, `d1-action-client.ts`, migrations, and relevant tests. The lead also verified the active D1 reorder payload omission and the active D1 restore throws.

### Live Subagent Ledger

| Lane | Agent | Status | Main result |
| --- | --- | --- | --- |
| Source state map | `explorer` `019f3507-935d-7531-a0c3-c5095e41f695` | Complete | Mapped 14 state surfaces and flagged plan gaps around context menu, rename, create, delete, restore, search/filter, active tab, permissions, external drops, and status. |
| Data/API | `architect` `019f3507-9640-74f0-a01a-7e11c1ea49d4` | Complete | Confirmed RC0, D1 projected-validation gap, current readback baseline, and Move dialog inside-only scope. |
| UX/a11y | `designer` `019f3507-afa2-7ba2-91c0-fa9e691d8add` | Complete | Confirmed title-only disabled reasons, disabled radio reachability issue, decorative drag grip, focus/selection cue collision, no drag narration, and no-match empty copy issue. |
| Test strategy | `test-engineer` `019f3507-b312-7b33-a3c1-7977fe04e3be` | Complete | Split existing coverage from precise new gaps and identified that mocked action tests cannot prove actual D1 history-row insertion. |
| Official docs | `docs-researcher` `019f3507-b836-7b72-a717-014f3185fddb` | Complete | Added React, Next.js, Cloudflare D1, and WAI-ARIA constraints for refactor, Server Actions, D1 prepared/batch behavior, limits, local/remote proof, and tree focus semantics. |
| Plan critic | `critic` `019f3507-c168-7e61-92c2-8043564b2c9d` | Complete / REJECT before revisions | Forced corrections to Phase 0 evidence mapping, impossible null-workspace audit, schema wording, stale missing-test claims, and action-wrapper vs D1 proof split. |

### Prior Timed-Out Audit Lanes

A previous 2026-07-06 audit pass launched four `explore` subagents that timed out after 30 minutes. Those timeouts are historical context only; this revision supersedes that earlier verification label with live subagent artifacts above.

## Source Evidence Verified

| Claim | Source |
| --- | --- |
| `EstimateSheetTree.tsx` is 2217 lines and owns reorder/create/rename/delete/bulk/context/search/lazy state | `src/components/workshop/EstimateSheetTree.tsx` |
| Reorder payload omits `target_project_id` | `src/lib/estimates/actions.ts:2252-2257` |
| Reorder error wraps D1 adapter error | `src/lib/estimates/actions.ts:2258-2259` |
| D1 reorder reads empty project id when payload omits `target_project_id` | `src/lib/estimates/d1-action-client.ts:1343-1359` |
| `insertHistoryEvent` throws when workspace cannot resolve | `src/lib/estimates/d1-action-client.ts:449-451` |
| `estimate_sheet_events.workspace_id` and `project_id` are NOT NULL | `migrations/0025_reusable_source_insert_support.sql:8-39` |
| Existing reorder action tests assert old payload shape | `tests/vitest/estimate-node-reorder-action.test.ts` |
| Restore action wrapper passes `target_project_id` | `src/lib/estimates/actions.ts:3667-3674` |
| Active D1 restore calls currently throw | `src/lib/estimates/d1-action-client.ts:2014-2019` |
| Move dialog validates and executes only `inside` | `src/components/workshop/EstimateSheetTree.tsx:1605`, `src/components/workshop/EstimateSheetTree.tsx:1640` |
| Shared Tree row bands support before/inside/after | `src/components/ui/tree.tsx:399-415` |
| Row owns draggable behavior and grip is decorative | `src/components/ui/tree.tsx:1282-1328` |
| Active route and focus share a left-border cue | `src/components/ui/tree.tsx:460` |
| Existing tests cover context menu, rename, delete, bulk delete, DnD, filter, lazy hydration, and repository readback | `tests/vitest/estimate-tree-context-menu.test.tsx`, `estimate-tree-bulk-selection.test.tsx`, `estimate-sheet-tree-dnd.test.tsx`, `estimate-tree-filter.test.tsx`, `estimate-tree-lazy-hydration-ui.test.tsx`, `workspace-repository-estimate-tree.test.ts` |

## Official Documentation Checked

Checked on July 6, 2026:

| Topic | Source | Planning implication |
| --- | --- | --- |
| React `useEffectEvent` | https://react.dev/reference/react/useEffectEvent | Do not pass Effect Events to children/extracted hooks as general handlers. |
| React memoization | React `useMemo`, `useCallback`, `memo` docs | Treat memoization as performance, not correctness. |
| Next.js Server Functions | https://nextjs.org/docs/app/getting-started/mutating-data | Server Functions are direct POST-reachable; auth/authz stays inside actions. |
| Next.js client/server components | https://nextjs.org/docs/app/getting-started/server-and-client-components | Keep helpers outside client module graph when practical and keep crossed props serializable. |
| Cloudflare D1 prepared statements | https://developers.cloudflare.com/d1/worker-api/prepared-statements/ | Dynamic SQL must use prepared/bound statements. |
| Cloudflare D1 database API | https://developers.cloudflare.com/d1/worker-api/d1-database/ | `batch()` is sequential and rolls back the sequence on failure; verify local `runBatch` mapping. |
| Cloudflare D1 limits | https://developers.cloudflare.com/d1/platform/limits/ | Watch bound parameters, subrequests, query duration, batch limits, and single-threaded DB throughput. |
| WAI-ARIA tree view/focus | https://www.w3.org/WAI/ARIA/apg/patterns/treeview/ and https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/ | Focus and selection/current route need distinct visual treatment; keyboard parity cannot rely on pointer DnD. |

## Skills And Workflow Evidence

Loaded and applied for this planning task:

- `autoresearch`
- `autoresearch-goal`
- `performance-goal`
- `vercel:react-best-practices`
- `react-doctor` as a planning diagnostic lens only; no React code changes were made.
- `product-design:audit` as a source-only audit lens; no screenshot/browser audit was run.
- `cloudflare`
- `cloudflare-one` loaded but not materially applicable because this plan does not change Zero Trust/Cloudflare One configuration.
- `systematic-debugging`
- `autopilot` loaded as a workflow reference; full runtime autopilot was not launched because this was a bounded planning-only revision.
- `ultrawork`, `ultragoal`, `ultraqa` loaded as workflow references; runtime execution was not launched.

Unavailable or constrained:

- `product-design:research` was not listed as an available skill.
- `/santa-loop`, `/ecc:frontend-patterns`, `/ecc:react-performance`, and exact `/debugging` were not available skills in this session.
- `ultrawork` referenced `docs/shared/agent-tiers.md`; that file was not present.
- Browser automation, screenshots, Storybook, and visual QA were intentionally skipped under the Codex App speed guardrail because this planning revision made no visual implementation claim.

## Findings Applied In This Revision

- Added `20_STATE_INVENTORY_AND_SHADOW_PATHS.md`.
- Updated readiness wording to split action-wrapper payload tests from D1 provider proof.
- Corrected Phase 0: existing reorder payload expectations must be updated, not only new tests added.
- Replaced impossible/low-value `workspace_id IS NULL` audit SQL with payload/static audit plus adapter proof.
- Added D1 restore caveat: UI/action-wrapper restore exists, but active D1 provider restore currently throws.
- Marked context-menu, rename, delete, bulk delete, DnD rollback, search/filter, and lazy hydration as existing coverage to preserve.
- Added precise new test gaps: disabled reasons, Move dialog parity, search/optimistic gates, permission UI, restore failure/provider proof, no-match empty copy, external-drop preservation, active-tab scoping.
- Added React/Next/Cloudflare/WAI-ARIA constraints to stack and refactor docs.
- Changed verification mode to `source-audited-with-live-subagents`.

## Remaining Validation Gap

No application tests were run during this planning pass. No browser proof was run. No Cloudflare D1 remote proof was run. The next implementation pass must produce the tests and provider evidence named in `11_TEST_STRATEGY_AND_QA_MATRIX.md` before claiming code completion.

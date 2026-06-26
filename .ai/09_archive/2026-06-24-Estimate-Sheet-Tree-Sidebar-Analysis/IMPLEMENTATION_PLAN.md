# Estimate Sheet Tree Sidebar Canonical Implementation Plan

Date: 2026-06-25
Planning folder: `.ai/03_plans/2026-06-24-Estimate-Sheet-Tree-Sidebar-Analysis`
Status: review-remediated implementation-ready plan, not an implementation

This document is the canonical executable plan for the estimate sheet tree/sidebar remediation work. It supersedes `10-IMPLEMENTATION-PLAN.md` as the handoff artifact, while preserving that file's phase structure where still accurate.

## 1. Executive Summary

The estimate sheet tree/sidebar is close enough to production to preserve, but it has five launch-blocking gaps:

- F-01: optimistic create can overwrite newer user selection/expansion state.
- F-02: sidebar reconciliation is driven by row-item content, causing unnecessary full-tree work.
- F-06: delete returns client-projected cascade data instead of server-authoritative deleted ids/fallback.
- F-11: drag-and-drop has no keyboard equivalent.
- F-19: five tree mutation actions skip the app-layer edit authorization check.

The target is a production-ready tree/sidebar that is secure, keyboard accessible, performant at the existing supported tree limits, resilient to async races, and safe to roll out behind flags. The work should be delivered in small, verifiable phases: preflight quick wins, rollout/test infrastructure, data/security hardening, signature/reorder performance, race reliability, row-level UX states, keyboard/mobile accessibility, polish, and final verification/docs.

Plan quality scores after this consolidation:

| Dimension | Score |
| --- | ---: |
| Strategic alignment | 92 |
| Requirements coverage | 94 |
| Technical specificity | 91 |
| Implementation sequencing | 90 |
| Risk management | 89 |
| Testability | 93 |
| Operational readiness | 86 |
| Overall implementation readiness | 90 |

Scores are below 100 because the source audit is still static, DB/RLS/RPC bodies require live/dry-run migration verification during implementation, mobile and keyboard flows need browser evidence, and the repo has known unrelated validation baseline issues called out in `.ai/10_state/current-state.md`.

## 2. Source References

Highest-authority inputs:

- `.ai/08_prompts/000_Planning Prompts/Create-Implementation-Prompt.md`: defines this planning-only output contract.
- `/Users/philiplewis/.codex/attachments/57fab707-09ce-40b9-b9e7-dd33a3b1c6ed/pasted-text-1.txt`: requires multi-agent goal, ledger, specialist workstreams, adversarial review, independent verification, and final reporting.
- `AGENTS.md`: project operating rules, stack, verification policy, database boundary, and no-default-browser-automation guardrail.
- `.ai/10_state/current-state.md`: current baseline, including known unrelated `bun run validate` reds/hangs.
- `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`: loop and validation contract for non-trivial work.

Plan-pack authorities:

- `00-README.md`: original audit boundary, static-only status, P1 launch blockers, and out-of-scope areas.
- `01-SYSTEM-MAP.md`: current component/data/action architecture, with stale line references treated as advisory.
- `02-BEHAVIOR-INVENTORY.md`: CRUD, selection, expansion, URL, loading, and error behavior inventory.
- `03-CRUD-AUDIT.md`: create, rename, delete, reorder/reparent lifecycle findings.
- `04-NON-CRUD-INTERACTION-AUDIT.md`: selection, expansion, keyboard, context menu, drag/drop, routing, mobile/read-only gaps.
- `05-UX-UI-ACCESSIBILITY-AUDIT.md`: visual consistency, keyboard, live-region, mobile, focus, and read-only gating findings.
- `06-STATE-NETWORK-DATA-AUDIT.md`: race, cache, network, retry/timeout, and edit-guard findings.
- `07-PERFORMANCE-AUDIT.md`: signature, payload, virtualization, and large/deep-tree budgets.
- `08-EDGE-CASE-AND-TEST-MATRIX.md`: 60 edge cases and top missing tests.
- `09-PRIORITIZED-FINDINGS.md`: canonical F-01 through F-27 finding list. Counts are P1=5, P2=14, P3=8.
- `10-IMPLEMENTATION-PLAN.md`: source phase plan to reconcile, not final output.
- `11-VALIDATION-PLAN.md`: validation authority.
- `12-OPEN-QUESTIONS-AND-DECISIONS.md`: decision defaults and deadlines.
- `13-PLAN-AUDIT-AND-SCORECARD.md`: latest synthesis and scorecard; supersedes stale parts of `18`.
- `14-THREAT-MODEL.md`: STRIDE threats, especially T-04 and T-13.
- `15-RISK-REGISTER.md`: severity/probability and owner-acceptance rules.
- `16-DATA-MIGRATION-PLAN.md`: migration work packages, with SQL treated as sketches.
- `17-ADVERSARIAL-REVIEW.md`: challenge findings, most Wave 3 blockers resolved but T-13/risk/monitoring cautions remain.
- `18-FINAL-VERIFICATION-AND-RESCORING.md`: independent verification, partly stale where it says `17` was absent.

Current-source anchors inspected:

- `src/components/workshop/EstimateSheetTree.tsx`
- `src/components/ui/tree.tsx`
- `src/components/workshop/ResizableSidePanel.tsx`
- `src/lib/estimates/actions.ts`
- `src/lib/estimates/estimate-tree-reorder.ts`
- `src/lib/estimates/tree-hierarchy.ts`
- `src/hooks/use-estimate-workspace-state.ts`
- `src/hooks/use-estimate-query.ts`
- `src/lib/workshop/virtualization-flags.ts`
- `src/lib/estimates/load-limits.ts`
- `src/proxy.ts`
- `src/lib/supabase/types.ts`
- `supabase/migrations/20260612094734_estimate_tabs_foundation.sql`
- `supabase/migrations/20260614003639_unify_estimate_node_kinds.sql`
- `supabase/migrations/20260621122125_estimate_sheet_bulk_delete_and_edit_rpc_hardening.sql`
- `package.json`
- local Next docs: `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-params.md`
- existing tests under `tests/vitest/*estimate*tree*`, `tests/vitest/estimate-sheet-actions-authz.test.ts`, and `e2e/estimate-tree-dnd.spec.ts`

## 3. Scope

In scope:

- Estimate tree/sidebar create, rename, delete, bulk delete, reorder/reparent, selection, expansion, search/filter, context menu, mobile access, public/read-only gating, and keyboard accessibility.
- Server actions and RPCs that directly mutate estimate tree nodes.
- `estimate_nodes.sort_order` persistence strategy as needed for reorder payload scaling.
- Sidebar state reconciliation, optimistic mutation handling, and cache cleanup.
- Share-route privacy header hardening only because T-13 is part of the plan-pack threat model and shares URL-token leakage risk with the sidebar/public-view boundary.
- Tests, flags, observability, rollback, and documentation needed to safely ship the above.

Out of scope:

- Estimate sheet center content behavior except where row-item edits currently trigger sidebar reconciliation.
- Right sidebar features except external-drop integration boundaries.
- Proposal package feature work.
- Public share product expansion beyond CRUD gating and Referrer-Policy/no-store privacy hardening.
- Realtime collaboration.
- New dependencies, unless the owner explicitly approves one during implementation.
- Agent/tool policy edits such as `AGENTS.md` unless implementation reveals a genuine policy change.

## 4. Current-State Analysis

Frontend ownership:

- `EstimateSheetTree.tsx` owns the tree/sidebar product composition: route sync, local nodes, optimistic create/rename/delete, selected node, expansion state, context menu actions, external drops, search/filter, delete modal, and empty state.
- `tree.tsx` is the reusable primitive for rendering, virtualization, row controls, drag/drop, arrow navigation, and drop-target resolution. Current keyboard behavior covers basic tree navigation but not F2 rename, context-menu key/Shift+F10, type-ahead, or keyboard DnD.
- `ResizableSidePanel.tsx` owns left-panel sizing/collapse. Current compact viewport behavior effectively hides the sidebar and the toggle lacks `aria-controls`.
- `use-estimate-workspace-state.ts` stores selection and expansion keyed by estimate/tab but lacks cleanup and current-tab validation.

Data/action ownership:

- `actions.ts` contains `assertCanEditEstimate` and tree mutation actions. `insertEstimateTemplateIntoEstimate` already calls the edit assertion; the five direct tree mutation actions need app-layer guards before RPC/write work: `reorderEstimateTreeNodes`, `createEstimateNode`, `renameEstimateNode`, `deleteEstimateNode`, and `deleteEstimateNodesBulk`.
- Generated Supabase types currently expose a tab-aware `create_estimate_node_with_history` argument shape with optional `target_tab_id`; do not plan against the old 8-argument signature.
- Live schema has tab-scoped sibling sort uniqueness (`estimate_nodes_tab_unique_sort`, `estimate_nodes_tab_unique_sort_with_root`), not only the legacy estimate-scoped uniqueness constraint.
- SECURITY DEFINER RPCs already use `assert_can_edit_estimate_for_history` in several migrations. App-layer authorization remains required for clean UX, early rejection, and defense in depth.

Performance/current behavior:

- Supported live read caps are 1,500 nodes and 5,000 row items.
- Tree virtualization is already available and defaults on at 150 visible rows.
- The main performance risk is repeated full-tree work and full-tree refreshes during ordinary mutations, especially row-item-only edits, delete, reorder, drag hover, and large supported trees.

Security/privacy current state:

- `/share/*` routes in `src/proxy.ts` receive sensitive cache-control headers, but current proxy code does not set `Referrer-Policy: no-referrer`.
- Public/share read-only variants can still expose editable-looking affordances unless gated by `disableRouteSync` and future `canEditEstimate`.

Validation current state:

- Existing coverage anchors include DOM tree tests, pure reorder/edit tests, action payload tests, authz tests, performance tests, and one mutating DnD e2e spec.
- The exact P1/P2 remediation tests listed below are not all present and should be created RED before implementation.
- Full `bun run validate` is known to have unrelated baseline issues; use targeted gates first, then broader validation after the baseline is healthy enough to support it.

## 5. Target-State Analysis

The target state is:

- All five P1 launch blockers closed with RED -> GREEN proof.
- Row-item-only edits do not trigger sidebar-wide tree reconciliation.
- Tree structural signature is based on `id`, `parent_id` or path, `kind`, `name`, and `sortOrder`.
- Server actions reject viewer users before RPC calls with a clean 403-style error.
- Delete uses server-authoritative cascade/fallback results, not a client projection.
- Reorder payloads scale sparsely: a move among 30 siblings sends no more than two logical updates except explicit rebalance paths.
- Keyboard-only users can select, expand/collapse, rename, open row actions, type-ahead, and move/reparent nodes.
- Mobile/tablet users can reach the tree through a drawer or equivalent surface at `<=1023px`.
- Public/read-only variants do not show editable controls or enable DnD.
- Mutations have row-level pending states, bounded timeouts, error recovery, focus restoration, and stale-scope protection.
- DB/RPC migrations include preflight probes, manual logical dump, generated types, grants/revokes, and rollback/fix-forward notes.

## 6. UX/UI Plan

Design posture:

- Keep the compact professional workshop UI. Do not add marketing-style cards, decorative gradients, or new visual systems.
- Reuse existing row rhythm, typography, Phosphor icon scale, design tokens, and primitive components.
- Preserve 28px tree-row rhythm, 10px app typography, and content-only indentation.

User journeys:

- Empty estimate: render a visible empty state with an actionable Add Branch flow instead of an `aria-hidden` placeholder.
- Create root or child: optimistic row appears, parent expands, row scrolls into view, selection follows the new node, rename input focuses with placeholder selected, and failure rolls back while announcing the error.
- Rename: F2 or context menu starts inline rename; Enter commits unless IME composition is active; Escape cancels; failed save reopens the editor with the attempted value and error.
- Delete: confirmation states target node, descendant area count, and row-item count. After delete, focus lands on a confirmed fallback node or empty CTA.
- Reorder: pointer drag supports auto-scroll and hover-to-expand; keyboard users get an equivalent move/reparent path.
- Read-only/public: hide or disable Add, Rename, Delete, bulk delete, and DnD when `disableRouteSync === true` or `canEditEstimate === false`.
- Mobile: expose the tree through a drawer/sheet trigger with focus trap, escape/close behavior, and responsive proof at `<=1023px`.

Accessibility acceptance:

- Keyboard: arrow navigation, Home/End, F2 rename, Shift+F10/context-menu key, type-ahead, keyboard move/reparent.
- Drag movements: WCAG 2.2.1/2.5.7 parity through keyboard move flow.
- Focus: preserved or restored after create, rename, delete, tab switch, drawer close, and empty-tree transitions.
- Name/Role/Value: side-panel toggle controls a real aside id; menu and row controls expose stable labels.
- Axe target: zero critical/serious violations for keyboard, drag movement parity, name/role/value, and focus order.

## 7. Technical Architecture Plan

Preserve these ownership boundaries:

- `EstimateSheetTree.tsx`: product behavior, local optimistic state, tree composition, mutation calls, focus/error UX.
- `tree.tsx`: generic tree primitive behavior, keyboard navigation, DnD mechanics, virtualization, row rendering contracts.
- `ResizableSidePanel.tsx`: size/collapse/drawer container and accessibility wiring, not estimate-specific state.
- `actions.ts`: server action auth, RPC payload shaping, error translation, refresh/fallback behavior.
- `estimate-tree-reorder.ts`: pure tree/drop/reorder/signature algorithms.
- `use-estimate-workspace-state.ts`: estimate/tab-scoped selection and expansion state with cleanup.
- Supabase migrations: persistence contracts, RPC return shapes, grants, constraints, and invariant enforcement.

Implementation principles:

- Prefer small phase PRs over one large tree rewrite.
- Keep the existing custom `Tree` primitive; do not introduce a new tree library.
- Add callback seams to `Tree` only where they remove estimate-specific logic from the primitive: rename request, context menu request, keyboard move/drop commit, and optional type-ahead hook.
- Use revision/scope checks or FIFO queues for async prop echoes; do not rely on a single pending prop slot.
- Treat DB sketches in `16-DATA-MIGRATION-PLAN.md` as design notes; implementation must write real migrations against current schema and generated types.
- Use local Next 16 guidance for route params: `useParams` from `next/navigation` is the supported Client Component hook for dynamic params.

## 8. Data And Database Plan

DB work packages:

1. Audit current RPCs before mutation:
   - Functions: `create_estimate_node_with_history`, `reorder_estimate_nodes_with_history`, `delete_estimate_node_with_history`, `delete_estimate_nodes_bulk_with_history`.
   - Invariants: self-parent rejection, cycle rejection, cross-tab rejection, orphan rejection, max-depth rejection, duplicate sort rejection.
   - Grants: revoke `PUBLIC`/`anon`; grant only intended authenticated/service roles.

2. Delete RPC authoritative return:
   - Redefine both `delete_estimate_node_with_history` and `delete_estimate_nodes_bulk_with_history` to return server-authoritative `deletedNodeIds` and a nullable `fallbackNodeId` or documented empty-tree sentinel.
   - This is not optional for Phase 1. If bulk delete is deferred, bulk delete must stay on the old guarded path with explicit UI/cache behavior and owner acceptance.
   - Client must use server-returned values or derive fallback only from confirmed refreshed tree.

3. Sort order migration:
   - Migrate `estimate_nodes.sort_order` from integer to numeric, preserving current tab-scoped uniqueness constraints.
   - Recommended target type: `numeric(20,4)` unless preflight data proves a different precision is needed.
   - Update JSON recordsets in RPCs from `sort_order integer` to numeric.
   - Do not copy constraint names from `16-DATA-MIGRATION-PLAN.md` without live introspection. Before writing M-02, query `pg_constraint`, `pg_index`, and the current remote schema for every `estimate_nodes` uniqueness/index object.
   - Preserve current tab-scoped constraints, including root/null-parent semantics, by name or equivalent definition. Do not recreate legacy estimate-scoped constraints unless the remote schema proves they still exist.
   - Include a touched-object checklist for every live function, view, action, and generated type that accepts, parses, casts, orders, or writes `estimate_nodes.sort_order`, including `reorder_estimate_nodes_with_history`, `create_estimate_node_with_history`, subtree/template insert paths, duplicate/copy paths, and generated types.
   - Exit criteria require before/after signatures for every touched object.
   - Update generated Supabase types with `bun run gen:types`.
   - Numeric-to-integer rollback is lossy after fractional writes; prefer rollback before writes or fix-forward after rollout.

4. Create sort scheme:
   - Current app action computes `maxSiblingSortOrder + 1`; target is `maxSiblingSortOrder + 10`.
   - Current create RPC is already tab-aware; do not apply or adapt old 8-argument sketches.
   - Update tests currently expecting old integer increments.

5. Sparse/fractional reorder:
   - Reorder within 30 siblings emits no more than two logical updates.
   - Define epsilon and rebalance trigger before coding sparse sort.
   - Add repeated-move exhaustion tests: repeatedly insert or move between the same two siblings until midpoint spacing crosses the configured epsilon, then assert rebalance occurs without duplicate `(estimate_tab_id, parent_id, sort_order)` values.
   - Accept `numeric(20,4)` only after repeated-move testing passes or precision is increased.
   - Keep old full-sibling reorder behind a rollback flag until sparse order is proven.

Pre-migration requirements:

- Manual logical dump for project `ebxxqidacheyapmmzavr`, covering `estimate_nodes`, `estimate_row_items`, `estimate_sheet_events`, and affected function definitions.
- Probe duplicate sibling sort groups by `estimate_tab_id`, `parent_id`, and `sort_order`.
- Probe max tree depth, orphan counts, cross-tab parent/child inconsistencies, and root counts.
- Confirm PITR is not assumed; current cost posture keeps PITR disabled.

## 9. Security And Privacy Plan

Authorization:

- Add `await assertCanEditEstimate(supabase, estimateId)` before work begins in all five direct tree mutation actions: reorder, create, rename, delete, bulk delete.
- Keep SECURITY DEFINER RPC checks; app-layer checks are defense in depth and UX hardening, not replacements.
- Tests must prove viewer-role rejection happens before RPC/write calls.

Input and invariant hardening:

- Enforce max depth 100 in client validation, server action validation, and DB/RPC invariant checks.
- Add a server-side node-name length cap of 200 characters. Character-count UI remains optional/post-launch unless the cap is user-visible enough to need it.
- Respect IME composition during rename; Enter must not commit mid-composition.
- Add bulk delete count/payload guard to prevent oversized recursive deletes.
- Translate raw RPC/RLS errors into user-safe messages while logging enough diagnostic context server-side.

Privacy:

- Add `Referrer-Policy: no-referrer` for `/share/*` responses in `src/proxy.ts`.
- Every route whose pathname contains `/share/[token]` or otherwise receives a raw publication/share token must set `Cache-Control: no-store` and `Referrer-Policy: no-referrer`, unless implementation records a route-specific reason the header is impossible or harmful.
- Tests must enumerate the full token-bearing route list and assert either headers present or explicit exclusion.
- Keep no-store/sensitive cache-control on public share tokens.
- Do not expose editable tree affordances in public/share read-only variants.

## 10. Performance And Reliability Plan

Budgets:

| Scenario | Target |
| --- | ---: |
| Initial live tree at 1,500 nodes / 5,000 rows | <2s |
| Selection, expand, collapse | no network, UI commit <16ms |
| Rename keystroke | <16ms, no sidebar-wide prop sync from row-only edits |
| Structure signature at 1,500 nodes / 5,000 rows | <5ms |
| Row-only edit | 0 sidebar tree syncs |
| Optimistic create/delete/reorder local commit | <16ms |
| Single delete | 1 RPC + 1 tree refresh, not pre-refresh + RPC + post-refresh |
| Drag hover at 1,000 nodes | <16ms |
| Synthetic deep/large drag safety check | <50ms at 10,000 synthetic nodes |
| Bundle impact | <5KB gzipped unless keyboard DnD/mobile drawer ships separately |

Reliability requirements:

- Replace single-slot `pendingPropNodesRef` with FIFO or revision-aware reconciliation.
- Capture selection/expansion snapshots at mutation start; only restore when still valid for the same scope.
- Add mutation timeout/abort wrappers: 10s write timeout, 15s read timeout unless implementation finds existing standardized values.
- Prevent cache writes after estimate/tab scope mismatch.
- Clean up estimate/tab Zustand records on unmount or scope switch.
- Cache descendant/ancestor lookups during drag where needed; reject depth >100 before recursive risk.

## 11. Blast Radius Analysis

High blast radius:

- Supabase migrations changing `estimate_nodes.sort_order` and RPC return/argument shapes.
- Server action authorization and error translation for tree mutations.
- Tree primitive keyboard/DnD behavior, because it may affect all consumers of `src/components/ui/tree.tsx`.

Moderate blast radius:

- `EstimateSheetTree.tsx` optimistic state and reconciliation.
- `use-estimate-workspace-state.ts` cleanup and selection validation.
- Read-only/public gating where the same component is reused across workspace and share surfaces.
- `/share/*` and `/api/share/[token]/*` security headers.

Low blast radius:

- Rename input sizing, empty CTA, `aria-controls`, scroll-into-view, docs, and focused tests.

Mitigation:

- Phase high-risk DB changes behind flags and with preflight dumps.
- Land primitive changes with focused DOM/unit tests before e2e.
- Keep center-content and right-sidebar behavior out of the write scope except for explicit integration tests.

## 12. Phased Implementation Plan

### Phase 0 - Preflight And Low-Risk UI Fixes

Objective: close cheap P3/P2 presentation and route correctness issues before riskier behavior work.

Requirements: F-09, F-21, F-22, F-23, F-24, F-25, F-26.

Files:

- `EstimateSheetTree.tsx`
- `ResizableSidePanel.tsx`
- local tests in `tests/vitest/estimate-sheet-tree-dom.test.tsx`, `estimate-tree-context-menu.test.tsx`, or new focused test files

Inputs: `09-PRIORITIZED-FINDINGS.md`, `05-UX-UI-ACCESSIBILITY-AUDIT.md`, `12-OPEN-QUESTIONS-AND-DECISIONS.md`, current `EstimateSheetTree.tsx`, `ResizableSidePanel.tsx`, and local Next `useParams` docs.

Dependencies: none beyond current component/test baseline.

Parallelizable work: DOM tests for empty CTA, `aria-controls`, rename in-flight state, and route params can be written independently from the UI patch.

Sequential work: route-param replacement should land before tests assert removal of naive pathname parsing; scroll/focus work should follow create/rename state cleanup.

Expected outputs: low-risk UI patch, focused DOM tests, and a recorded Q-22 UI decision that character-count display stays deferred unless Phase 1 cap needs a visible affordance.

Validation commands:

```bash
bun run type-check
bun run lint
bun run lint:design-system
bun run test:dom -- estimate-sheet-tree-dom estimate-tree-context-menu
git diff --check
```

Risks: small UI regressions in dense row layout, brittle route-param tests, and accidental expansion beyond tree/sidebar presentation.

Work:

- Replace hidden empty state with visible CTA wired to Add Branch.
- Align rename input/control sizing with row rhythm and design tokens.
- Keep edit state or visible saving affordance while rename is in flight.
- Scroll new node's rename input into view after create.
- Replace pathname parsing with `useParams` from `next/navigation`.
- Add stable aside id and `aria-controls` to the panel toggle.
- Record/confirm the "add area inside" placement decision and make behavior match it.

Tests:

- DOM tests for empty CTA, `aria-controls`, rename in-flight state, scroll-into-view call, and route-param node resolution.
- `bun run type-check`
- `bun run lint`
- `bun run lint:design-system`

Exit criteria:

- All listed tests pass.
- No app behavior beyond the tree/sidebar UI changes.

Rollback:

- Revert UI-only commits; no data rollback.

### Phase 0.5 - Release Infrastructure And Baselines

Objective: add flags, test scaffolding, telemetry hooks, and baselines before P1/P2 risky work.

Requirements: all P1/P2, T-13, M-01/M-02/M-03.

Files:

- workshop tree runtime flags near the existing workshop flag surface, plus a server-only flag module if mutation kill switches cannot live in client-safe code
- `tests/vitest/**`
- optional monitoring docs under `.ai` or implementation docs

Inputs: all P1/P2 findings, `11-VALIDATION-PLAN.md`, `14-THREAT-MODEL.md`, `15-RISK-REGISTER.md`, `16-DATA-MIGRATION-PLAN.md`, package scripts, existing workshop flag modules, and current telemetry/logging surfaces.

Dependencies: Phase 0 can run in parallel; Phase 1/2 may not start until flags, RED tests, DB dump checklist, and rollback measurement sources exist.

Parallelizable work: feature-flag scaffolding, RED test creation, DB dump runbook, and monitoring query/runbook drafting.

Sequential work: define flag ownership first. Public `NEXT_PUBLIC_*` flags belong in the workshop flag module; server-only mutation flags must live in a server-only module and must not be imported by Client Components.

Expected outputs: named flags, RED tests or skipped-test placeholders with reasons, DB dump checklist, rollout trigger measurement table, and baseline validation notes.

Validation commands:

```bash
bun run type-check
bun run lint
bun run test:dom -- estimate-tree-permission-gate estimate-tree-delete-cascade estimate-tree-content-signature
git diff --check
```

Risks: creating a new flag silo, adding tests that fail unrelated baseline behavior, and defining rollback triggers without an executable measurement source.

Work:

- Define server-side flags for authoritative delete/sparse sort and public flags for structure signature, keyboard DnD, read-only gating, and mobile drawer.
- Add RED tests for P1 behavior before implementation.
- Capture current targeted test baseline and note known unrelated global validation reds.
- Add telemetry/audit event schema for mutation kind, outcome, latency, payload size, auth rejection, and rollback.
- Prepare DB dump/runbook checklist.

Tests:

- Flag helper tests, if a helper is added.
- `git diff --check`

Exit criteria:

- Every risky phase has an off switch and a named validation command.
- For every rollback trigger in Section 15, define measurement source, query, sample window, baseline source, threshold, owner, and review cadence.
- If production telemetry does not exist, Phase 0.5 must create a minimal provider-backed or database-backed event path, or downgrade rollout to manual/internal only with explicit residual risk.
- `git diff --check` alone is insufficient for Phase 0.5 completion.

Rollback:

- Disable flags; leave tests as future coverage unless they block unrelated mainline work.

### Phase 1 - Security, Delete Authority, And DB Invariants

Objective: close P1 data/security blockers before UX/performance polish.

Requirements: F-06, F-10, F-19, Q-20, Q-22, T-04, T-13.

Files:

- `src/lib/estimates/actions.ts`
- Supabase migration files
- `src/lib/supabase/types.ts`
- `src/proxy.ts`
- `src/app/api/share/[token]/**/route.ts` where no-store header helper can be safely centralized
- tests for authz, cascade delete, RPC invariants, share headers

Inputs: `14-THREAT-MODEL.md`, `16-DATA-MIGRATION-PLAN.md`, generated Supabase types, current migrations, current action/RPC source, Phase 0.5 flag and dump runbooks.

Dependencies: Phase 0.5 must define flags, RED tests, DB dump checklist, share-token route list, and rollback measurement sources.

Parallelizable work: authz server-action tests, share header route inventory, RPC invariant audit, and delete return-shape migration draft can start separately.

Sequential work: run DB preflight/dump before migration; update RPCs before client consumes authoritative return; regenerate types before TypeScript action changes; add app-layer auth before widening rollout.

Expected outputs: app-layer auth in five actions, authoritative single/bulk delete return path or explicit bulk-delete deferral gate, max-depth/name-length enforcement, share no-referrer/no-store headers, migration proof, and generated types.

Validation commands:

```bash
bun run gen:types
bun run type-check
bun run lint
bun run test:dom -- estimate-tree-permission-gate estimate-tree-delete-cascade estimate-tree-rpc-invariants
git diff --check
```

Risks: breaking SECURITY DEFINER grants, returning incompatible RPC JSON, missing a token-bearing share route, leaking raw RPC errors, and confusing app-layer clean 403s with DB-layer authorization.

Work:

- Add app-layer `assertCanEditEstimate` to five tree mutation actions.
- Add clean error translation for auth/RLS/RPC failures.
- Redefine delete RPC return shape and update client handling.
- Audit/enforce RPC invariants and max depth 100.
- Add Referrer-Policy/no-store headers for every token-bearing share route unless a route-specific exclusion is recorded.
- Run `bun run gen:types` after migrations.

Tests:

- `tests/vitest/estimate-tree-permission-gate.test.ts`
- `tests/vitest/estimate-tree-delete-cascade.test.ts`
- `tests/vitest/estimate-tree-rpc-invariants.test.ts`
- share header tests enumerating every token-bearing share route
- targeted action tests plus `bun run type-check`

Exit criteria:

- Viewer users are rejected before RPC call in each action.
- Delete UI uses server-authoritative cascade/fallback.
- All token-bearing share responses include `Referrer-Policy: no-referrer` and `Cache-Control: no-store`, or have explicit reviewed exclusions.
- Migration probes and dump evidence are recorded.

Rollback:

- Disable authoritative delete flag.
- Revert server-action client usage first; DB return-shape additions should remain backward-compatible if extra JSON keys are additive.

### Phase 2 - Structure Signature, Sort Order, And Reorder Scaling

Objective: close the over-eager reconciliation and reorder-payload performance risks.

Requirements: F-02, F-03, F-04, F-05, F-18, F-27, M-02, M-03.

Files:

- `src/lib/estimates/estimate-tree-reorder.ts`
- `src/lib/estimates/actions.ts`
- `EstimateSheetTree.tsx`
- Supabase migrations and generated types
- reorder/signature/action tests

Inputs: Phase 1 security/delete outputs, current `estimate_tree` reorder helpers, generated types, live schema introspection for constraints/indexes/functions, and performance budgets.

Dependencies: Phase 1 authoritative delete and DB invariant audit must be complete before removing delete pre-refresh or changing persistence contracts.

Parallelizable work: signature tests, sparse-sort pure tests, live-schema introspection, touched-object checklist, and action payload tests can proceed independently.

Sequential work: introspect live schema before writing M-02; migrate numeric sort before sparse writes; regenerate types before action changes; define epsilon/rebalance before implementing sparse reorder; land behavioral sync-count seam before accepting F-02/F-27.

Expected outputs: structure-only signature, behavioral sync-count test seam, numeric sort migration, touched-object checklist, create +10 sort, sparse reorder with rebalance, and rollback/fix-forward runbook.

Validation commands:

```bash
bun run gen:types
bun run type-check
bun run lint
bun run test:dom -- estimate-tree-content-signature estimate-tree-reorder-payload estimate-tree-create-sort-scheme estimate-node-reorder-action estimate-tree-drag-over-perf
git diff --check
```

Risks: flags cannot roll back schema contracts, live constraints differ from sketches, midpoint exhaustion creates duplicate sort values, and source-only signature tests miss real reconciliation behavior.

Work:

- Replace content-driven signature with structure-only signature: `id`, `parent_id` or path, `kind`, `name`, `sortOrder`.
- Ensure reorder/name changes trigger reconciliation and row-only item edits do not.
- Remove pre-delete full refresh once Phase 1 server authority is present.
- Migrate `sort_order` to numeric and update RPC recordsets/types.
- Change create sort scheme to `maxSiblingSortOrder + 10`.
- Implement sparse/fractional reorder with <=2 logical updates for normal moves.
- Add rebalance policy and flag fallback to full-sibling reorder.
- For sync-count assertions, add an explicit test seam: spy on `syncLocalNodesFromProps` or expose a test-only counter from the reconciliation path. Source-string tests do not satisfy F-02/F-27 unless paired with a behavioral row-only prop-change test.

Tests:

- `tests/vitest/estimate-tree-content-signature.test.ts`
- `tests/vitest/estimate-tree-reorder-payload.test.ts`
- `tests/vitest/estimate-tree-create-sort-scheme.test.ts`
- `tests/vitest/estimate-node-reorder-action.test.ts`
- large-data budget tests
- repeated-move exhaustion tests for epsilon/rebalance and duplicate-sort avoidance
- `bun run gen:types`

Exit criteria:

- Row-only edit causes zero sidebar tree syncs.
- 30-sibling move emits <=2 update rows.
- Create uses +10 sort spacing.
- Numeric migration has dump, probes, generated types, grants, and rollback notes.
- Epsilon and rebalance trigger are defined before sparse sort ships.
- `numeric(20,4)` is accepted only after repeated-move testing passes or precision is increased.

Rollback:

- The sparse-sort feature flag only disables the application path; it does not undo schema/RPC/type changes.
- Before enabling writes that can create fractional `sort_order` values, verify the rollback window is still reversible: no fractional rows, old full-sibling reorder path still compiles, and old RPC callers still work.
- After any fractional write, numeric rollback is prohibited except from the logical dump in an emergency. The supported recovery path is fix-forward: disable sparse writes, run a rebalance migration to restore stable 10-step numeric values, keep the numeric column, and rerun reorder/create/delete targeted tests.
- Record the exact fix-forward SQL/runbook before broad enablement.

### Phase 3 - Async Race And Local State Reliability

Objective: prevent optimistic mutations and prop echoes from overwriting newer user state.

Requirements: F-01, F-07, F-08, F-16, F-17, Q-06, Q-14.

Files:

- `EstimateSheetTree.tsx`
- `use-estimate-workspace-state.ts`
- `use-estimate-query.ts`
- focused DOM/cache tests

Inputs: Phase 2 signature outputs, `06-STATE-NETWORK-DATA-AUDIT.md`, `08-EDGE-CASE-AND-TEST-MATRIX.md`, current Zustand/query hooks, and existing optimistic mutation tests.

Dependencies: Phase 2 should define reconciliation semantics before queue/revision logic is finalized.

Parallelizable work: create-race tests, rename-failure tests, store-cleanup tests, and tab-selection tests.

Sequential work: add revision/scope model before replacing pending prop slot; implement rollback/focus after create/rename state model is stable.

Expected outputs: race-safe create reconciliation, FIFO/revision prop echo handling, failed rename restoration, expansion persistence, and stale selection cleanup.

Validation commands:

```bash
bun run type-check
bun run lint
bun run test:dom -- estimate-sheet-tree-create-race estimate-tree-concurrent-prop-queue estimate-tree-rename-failure estimate-workspace-client-cache
git diff --check
```

Risks: overfitting tests to implementation details, clearing valid cross-tab state, and causing cache writes after scope changes.

Work:

- Capture create snapshots and restore only if still same scope/revision.
- Replace single pending prop slot with FIFO or revision-aware queue.
- Reopen rename editor with attempted value on failed rename.
- Cancel new unsaved row by rolling back the optimistic node per Q-06.
- Persist expansion per estimate/tab and clean it up on unmount/scope switch.
- Validate selected node exists in current tab or clear it.

Tests:

- `tests/vitest/estimate-sheet-tree-create-race.test.tsx`
- `tests/vitest/estimate-tree-concurrent-prop-queue.test.tsx`
- `tests/vitest/estimate-tree-rename-failure.test.tsx`
- `tests/vitest/estimate-workspace-client-cache.test.tsx`
- tab-switch selection tests

Exit criteria:

- Server echoes cannot overwrite a newer user selection/expansion.
- Failed rename restores draft and focus.
- Store entries do not grow unbounded across estimates/tabs.

Rollback:

- Revert client-state phase; no DB rollback.

### Phase 4 - Row-Level Loading, Error, And Mutation UX

Objective: make mutation state local, visible, and recoverable.

Requirements: F-15 and related UX findings.

Files:

- `EstimateSheetTree.tsx`
- toast/error helpers if existing patterns support it
- bulk toolbar integration tests

Inputs: Phase 1 error translation, Phase 3 mutation state model, current toast/bulk toolbar components, and a11y findings.

Dependencies: auth/error semantics from Phase 1 and mutation scoping from Phase 3.

Parallelizable work: pending-row tests, user-safe error tests, and bulk live-region tests.

Sequential work: centralize pending-node tracking before changing row controls; preserve bulk destructive global blocking after single-row behavior is proven.

Expected outputs: row-level pending state, sibling interactivity during single-row mutation, user-safe errors, and retained accessible announcements.

Validation commands:

```bash
bun run type-check
bun run lint
bun run test:dom -- estimate-sheet-tree-dom estimate-tree-mutation-telemetry
git diff --check
```

Risks: partial pending state can allow double-submit, hide errors, or break bulk destructive affordances.

Work:

- Replace sidebar-wide blocking for single-node mutations with `pendingNodeIds`.
- Keep sibling rows interactive while one row mutates.
- Preserve global blocking for bulk destructive actions where appropriate.
- Map technical errors to user-safe copy.
- Ensure mutation toasts and bulk count live-region behavior remain accessible.

Tests:

- DOM tests for pending row, sibling interactivity, user-safe errors, and bulk count announcement.

Exit criteria:

- Single-row mutation blocks only that row.
- Errors are announced without exposing raw SQL/RPC details.

Rollback:

- Revert pending state changes; no data rollback.

### Phase 5 - Keyboard Accessibility And Tree Primitive Enhancements

Objective: close keyboard and accessible DnD blockers.

Requirements: F-11, F-12, EC-038 through EC-041.

Files:

- `src/components/ui/tree.tsx`
- `EstimateSheetTree.tsx`
- a11y-focused tests and e2e spec

Inputs: `05-UX-UI-ACCESSIBILITY-AUDIT.md`, `08-EDGE-CASE-AND-TEST-MATRIX.md`, current `tree.tsx` keyboard handler, Phase 0 focus improvements, and Phase 0.5 keyboard flag.

Dependencies: choose keyboard DnD interaction model before implementation; Phase 4 pending states should be stable enough to avoid moving disabled rows.

Parallelizable work: DOM tests for F2/context/type-ahead, e2e keyboard DnD draft, and primitive API design review.

Sequential work: add callback seams before estimate-specific handlers; implement keyboard move flow behind flag; then prove pointer DnD still works.

Expected outputs: tree primitive keyboard callbacks, keyboard move/reparent flow, type-ahead, focus-visible treatment, and e2e keyboard proof.

Validation commands:

```bash
bun run type-check
bun run lint
bun run test:dom -- estimate-sheet-tree-dom estimate-tree-context-menu
bun run test:e2e -- estimate-tree-keyboard-dnd.spec.ts
git diff --check
```

Risks: primitive API churn affects other tree consumers, keyboard shortcut conflicts with browser/screen-reader conventions, and pointer DnD regressions.

Work:

- Add F2 rename callback.
- Add Shift+F10/context-menu key callback.
- Add type-ahead over visible rows.
- Add keyboard move/reparent flow. Preferred shape: explicit cut/paste style (`Ctrl+X`/`Ctrl+V`) or a documented Shift+Arrow model, selected before coding and kept consistent in tests.
- Keep pointer DnD behavior intact.
- Add focus-visible treatment for small caret/row controls.

Tests:

- DOM tests for shortcuts and type-ahead.
- `e2e/estimate-tree-keyboard-dnd.spec.ts` for real keyboard move/reparent.
- Axe checks for name/role/value and keyboard traps.

Exit criteria:

- Keyboard-only user can complete equivalent move/reparent task.
- No critical/serious axe violations for the tree/sidebar flow.

Rollback:

- Disable keyboard DnD flag; keep harmless keyboard shortcuts if tests prove no regressions.

### Phase 6 - Interaction Polish, Mobile, And Read-Only Variants

Objective: finish non-blocking but user-visible gaps that affect first-user confidence.

Requirements: F-13, F-14, F-20, Q-19, Q-11.

Files:

- `tree.tsx`
- `EstimateSheetTree.tsx`
- `ResizableSidePanel.tsx`
- public/share tree panel tests

Inputs: Phase 5 keyboard primitives, read-only decision Q-19, mobile findings, share panel tests, and Phase 0.5 flags.

Dependencies: read-only auth semantics from Phase 1 and keyboard/focus behavior from Phase 5.

Parallelizable work: read-only DOM tests, mobile drawer prototype/tests, drag auto-scroll test, and hover-to-expand test.

Sequential work: implement read-only gating before mobile drawer exposes actions; add auto-scroll/hover-expand after drag validation helpers are stable.

Expected outputs: mobile tree access, read-only/share CRUD gating, drag auto-scroll, hover-to-expand, and browser proof for responsive/interaction claims.

Validation commands:

```bash
bun run type-check
bun run lint
bun run test:dom -- estimate-tree-readonly-ui share-estimate-tree-panel-a11y share-estimate-tree-view-performance
bun run test:e2e -- estimate-tree-keyboard-dnd.spec.ts
git diff --check
```

Risks: mobile drawer focus traps, hidden CRUD still reachable by keyboard, and drag hover timers creating jank.

Work:

- Add drag auto-scroll near scroll-parent edges.
- Add 500ms hover-to-expand for collapsed inside targets.
- Add mobile drawer or equivalent sidebar access at `<=1023px`.
- Hide/disable CRUD and DnD for `disableRouteSync === true` or `canEditEstimate === false`.
- Defer undo to post-launch per Q-11; do not design a partial undo system in this phase.

Tests:

- DOM tests for read-only hidden CRUD.
- Browser proof for mobile drawer, keyboard focus trap, drag auto-scroll, and hover-to-expand because these are interaction/responsive claims.
- Existing share tree panel a11y/performance tests.

Exit criteria:

- Tree is reachable on mobile/tablet.
- Read-only/share variants cannot trigger editable actions.
- Auto-scroll and hover-expand are proven in browser or a reliable DOM harness.

Rollback:

- Disable mobile drawer and keyboard/drag enhancement flags independently.

### Phase 7 - Test Matrix Completion And Regression Hardening

Objective: close traceability gaps and prepare final verification.

Requirements: all F-*, EC-*, T-*, M-* tied to this plan.

Files:

- `tests/vitest/**`
- `e2e/**`
- scripts or SQL proof files if needed

Inputs: completed phases, Section 20 traceability matrix, `11-VALIDATION-PLAN.md`, and current-state validation baseline.

Dependencies: all implementation phases must have merged or been explicitly deferred before final hardening can close.

Parallelizable work: failure injection tests, large/deep fixtures, repeated-run stability, SQL proof scripts, and e2e smoke preparation.

Sequential work: map every requirement to evidence, run targeted matrix, then broad validation/build only when targeted checks are green and baseline is interpretable.

Expected outputs: complete evidence matrix, documented unrelated validation reds if any, and final go/no-go test report.

Validation commands:

```bash
bun run type-check
bun run lint
bun run lint:design-system
bun run test:dom -- estimate-tree-content-signature estimate-sheet-tree-create-race estimate-tree-delete-cascade estimate-tree-permission-gate estimate-tree-reorder-payload estimate-tree-create-sort-scheme estimate-tree-rpc-invariants estimate-tree-rename-failure estimate-tree-concurrent-prop-queue estimate-tree-unicode-ime estimate-tree-readonly-ui estimate-tree-mutation-telemetry
bun run build
git diff --check
```

Risks: broad validation may still report unrelated baseline failures; do not mask tree/sidebar failures as baseline noise.

Work:

- Fill any remaining tests in the matrix.
- Add failure injection for network errors, stale echoes, timeouts, scope changes, and concurrent mutations.
- Add large-tree and deep-tree fixtures.
- Confirm full targeted tree matrix passes repeatedly.
- Run broad validation only when the known baseline permits a useful signal.

Tests:

- See Section 14.

Exit criteria:

- Requirements traceability matrix has evidence for every in-scope requirement.
- Known unrelated baseline failures are documented separately and not confused with tree/sidebar work.

Rollback:

- Tests should remain even if a risky feature flag is disabled.

### Phase 8 - Documentation, Handoff, And Operational Readiness

Objective: make the delivered work maintainable and operable.

Requirements: rollout, risk, ops, and future-agent clarity.

Files:

- `.ai/06_specs/**` where relevant
- `DESIGN.md` if tree-row visual rules changed
- implementation notes in this planning folder or a follow-up completion report
- do not update `AGENTS.md` unless actual policy changed

Inputs: final implementation diff, migration/runbook evidence, flags, monitoring queries, test report, and changed design/state contracts.

Dependencies: Phase 7 evidence and release owner signoff.

Parallelizable work: design docs, state contract notes, migration rollback notes, and final current-state update.

Sequential work: record operational facts after tests and rollout decisions are known; update `.ai/10_state/current-state.md` only with durable shipped/recovery facts.

Expected outputs: updated specs/design docs, final verification summary, runbooks, flag retirement notes, and current-state entry if project reality changed.

Validation commands:

```bash
git diff --check
rg -n "TREE_|sort_order|Referrer-Policy|keyboard DnD" .ai DESIGN.md src tests
```

Risks: docs drift from actual implementation, over-editing policy files, and losing rollback caveats after handoff.

Work:

- Document event-bus/workspace-state contracts if changed.
- Document numeric sort/rebalance policy and rollback caveats.
- Document feature flags, dashboards/queries, thresholds, and owners.
- Record final verification evidence and residual risks.

Tests:

- `git diff --check`
- docs link/path checks where practical

Exit criteria:

- Future agents can identify changed contracts, tests, flags, rollback path, and residual risks without reading the whole audit pack.

Rollback:

- Docs-only revert if needed.

## 13. File-Level Change Map

| File / Area | Planned Change | Phase | Risk |
| --- | --- | --- | --- |
| `src/components/workshop/EstimateSheetTree.tsx` | Empty CTA, route params, create/rename/delete state, row pending, race snapshots, queue reconciliation, read-only gating, focus restoration, mobile integration | 0, 3, 4, 6 | High |
| `src/components/ui/tree.tsx` | Keyboard DnD, F2, Shift+F10/context menu, type-ahead, auto-scroll, hover-expand, focus treatment | 5, 6 | High |
| `src/components/workshop/ResizableSidePanel.tsx` | `aria-controls`, stable aside id, mobile drawer/container behavior | 0, 6 | Medium |
| `src/lib/estimates/actions.ts` | App-layer edit authorization, delete return usage, single refresh, create +10 sort, numeric/sparse reorder payload, error translation | 1, 2 | High |
| `src/lib/estimates/estimate-tree-reorder.ts` | Structure signature, sparse sort update builder, depth validation helpers, drag/reorder performance helpers | 2, 6 | High |
| `src/lib/estimates/tree-hierarchy.ts` | Depth/fallback helpers if current helpers need extension | 1, 3 | Medium |
| `src/hooks/use-estimate-workspace-state.ts` | Per estimate/tab cleanup, expansion persistence, selection validation | 3 | Medium |
| `src/hooks/use-estimate-query.ts` | Timeout/scope-safe cache update helpers if not already available | 3 | Medium |
| `src/proxy.ts` | `Referrer-Policy: no-referrer` for `/share/*` | 1 | Medium |
| `src/app/api/share/[token]/**/route.ts` | No-store + no-referrer header helper where practical | 1 | Medium |
| `src/lib/supabase/types.ts` | Generated after migrations | 1, 2 | Generated |
| `supabase/migrations/**` | Delete RPC return shape, numeric sort order, RPC recordsets, max-depth/invariant checks, grants/revokes | 1, 2 | High |
| `tests/vitest/**` | Targeted RED -> GREEN tests listed in Section 14 | all | Low |
| `e2e/**` | Keyboard DnD, mobile drawer, drag auto-scroll/hover-expand proof | 5, 6 | Medium |
| `.ai/06_specs/**`, `DESIGN.md` | Contract/design documentation if implementation changes those contracts | 8 | Low |

## 14. Testing Strategy

Testing order:

1. Write RED tests for each phase's acceptance criteria before implementation.
2. Implement the smallest phase slice.
3. Run targeted tests for the changed behavior.
4. Run type/lint/design lint for source changes.
5. Run browser/e2e only for claims that require browser proof: keyboard DnD, mobile drawer, focus trap, drag auto-scroll, hover-to-expand, and real responsive layout.
6. Run broader `bun run validate` and `bun run build` only when the unrelated baseline is healthy enough for a useful signal or at final release readiness.

Existing anchors to extend:

- `tests/vitest/estimate-sheet-tree-dom.test.tsx`
- `tests/vitest/estimate-sheet-tree-dnd.test.tsx`
- `tests/vitest/estimate-tree-reorder.test.ts`
- `tests/vitest/estimate-tree-edit.test.ts`
- `tests/vitest/estimate-node-reorder-action.test.ts`
- `tests/vitest/estimate-sheet-actions-authz.test.ts`
- `tests/vitest/estimate-tree-drag-over-perf.test.ts`
- `tests/vitest/estimate-workspace-client-cache.test.tsx`
- `tests/vitest/share-estimate-tree-panel-a11y.test.tsx`
- `e2e/estimate-tree-dnd.spec.ts`

New or extended tests:

- `tests/vitest/estimate-tree-content-signature.test.ts`
- `tests/vitest/estimate-sheet-tree-create-race.test.tsx`
- `tests/vitest/estimate-tree-delete-cascade.test.ts`
- `tests/vitest/estimate-tree-permission-gate.test.ts`
- `tests/vitest/estimate-tree-reorder-payload.test.ts`
- `tests/vitest/estimate-tree-create-sort-scheme.test.ts`
- `tests/vitest/estimate-tree-rpc-invariants.test.ts`
- `tests/vitest/estimate-tree-rename-failure.test.tsx`
- `tests/vitest/estimate-tree-concurrent-prop-queue.test.tsx`
- `tests/vitest/estimate-tree-unicode-ime.test.tsx`
- `tests/vitest/estimate-tree-readonly-ui.test.tsx`
- `tests/vitest/estimate-tree-mutation-telemetry.test.ts`
- share header tests for `/share/*` and selected `/api/share/[token]/*`
- `e2e/estimate-tree-keyboard-dnd.spec.ts`
- mobile drawer e2e or component-browser test

Core commands:

```bash
bun run type-check
bun run lint
bun run lint:design-system
bun run test:dom -- estimate-tree-content-signature estimate-sheet-tree-create-race estimate-tree-delete-cascade estimate-tree-permission-gate estimate-tree-reorder-payload estimate-tree-create-sort-scheme estimate-tree-rpc-invariants estimate-tree-rename-failure estimate-tree-concurrent-prop-queue estimate-tree-unicode-ime estimate-tree-readonly-ui estimate-tree-mutation-telemetry
```

DB/reorder phases:

```bash
bun run gen:types
bun run test:dom -- estimate-node-reorder-action estimate-tree-delete-cascade estimate-tree-permission-gate
```

Browser gates:

```bash
ARCHESTIMATOR_E2E_MUTATING_DND=1 bun run test:e2e -- estimate-tree-dnd.spec.ts
bun run test:e2e -- estimate-tree-keyboard-dnd.spec.ts
```

Final readiness, when baseline permits:

```bash
bun run validate
bun run build
git diff --check
```

## 15. Deployment And Rollout Plan

Flags:

- `TREE_SERVER_AUTHORITATIVE_DELETE_ENABLED`: server/client path for authoritative delete output.
- `TREE_SPARSE_SORT_ORDER_ENABLED`: sparse/fractional reorder behavior.
- `NEXT_PUBLIC_TREE_STRUCTURE_SIGNATURE_ENABLED`: structure-only sidebar reconciliation.
- `NEXT_PUBLIC_TREE_KEYBOARD_DND_ENABLED`: keyboard move/reparent behavior.
- `NEXT_PUBLIC_TREE_MOBILE_DRAWER_ENABLED`: mobile tree surface.
- `NEXT_PUBLIC_TREE_READONLY_GATING_ENABLED`: hide/disable CRUD in read-only/share variants if phased separately.

Rollout stages:

1. Local/dev only with flags off by default.
2. Internal dark launch with flags on for owner/test accounts.
3. Enable low-risk Phase 0 UI fixes broadly.
4. Enable Phase 1 server authorization/delete authority after DB proof and targeted tests.
5. Enable Phase 2 sparse/numeric reorder for a small internal cohort.
6. Enable keyboard/mobile features after e2e and accessibility gates.
7. Remove or consolidate flags only after stable monitoring and documented rollback confidence.

Rollback triggers:

- Tree mutation error rate >1%.
- Any credible data-loss or wrong-cascade report.
- Viewer/share user can mutate or sees active editable controls.
- Reorder payload or latency exceeds budget in monitored use.
- Critical/serious a11y regression in keyboard tree flow.
- Mobile drawer traps focus or makes the tree unreachable.

Rollback evidence:

- Flag disabled or migration rollback/fix-forward executed.
- Targeted tests rerun and passing.
- Monitoring confirms error/latency returns to baseline.
- `.ai/10_state/current-state.md` updated for meaningful release/recovery facts.

## 16. Observability And Operations Plan

Track:

- Tree mutation success/error rate by mutation kind.
- RPC P95 latency for create, rename, delete, bulk delete, reorder.
- Reorder payload update-row count.
- Delete cascade size and latency.
- Viewer/read-only rejected attempts.
- Client rollback count by reason.
- Structure signature recompute duration.
- Row-only edit sidebar sync count.
- Keyboard DnD e2e pass history.
- Mobile drawer open/close/focus errors if existing telemetry supports it.

Owners to assign during implementation:

- Frontend owner: UX state, keyboard, mobile, tests.
- Backend/data owner: actions, migrations, RPCs, generated types.
- QA owner: test matrix, e2e, a11y proof.
- Release owner: flags, rollout, rollback, monitoring review.

Operational runbooks:

- DB migration preflight and dump checklist.
- Sparse sort rollback/fix-forward checklist.
- Authoritative delete rollback checklist.
- Accessibility release checklist.
- Share Referrer-Policy header verification.

## 17. Risk Register

| Risk | Severity | Probability | Impact | Owner | Detection method | Mitigation | Contingency | Acceptance |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Numeric sort migration corrupts or blocks sibling ordering | High | Medium | High | Backend/data owner | Preflight probes, migration dry run, generated type diff, reorder payload tests | Dump, live schema introspection, tab-scoped constraints, touched-object checklist | Before fractional writes: rollback migration; after fractional writes: disable sparse writes and fix-forward with rebalance runbook | Requires explicit release review |
| Delete cascade removes or reports wrong nodes | High | Medium | High | Backend/data owner | Cascade tests, RPC return tests, mutation telemetry, user report triage | Server-authoritative single/bulk return, DB invariant tests, guarded rollout | Disable authoritative delete path and revert client usage; preserve DB additive return if backward-compatible | Non-waivable before launch |
| Viewer/share users mutate data or see editable controls | High | Low | High | Backend/data owner and frontend owner | Permission gate tests, share/read-only UI tests, rejected-attempt monitoring | App-layer auth, RPC auth, read-only gating, route tests | Disable CRUD/DnD flags, patch auth immediately, audit logs | Non-waivable |
| Keyboard DnD breaks pointer DnD or tree focus | High | Medium | High | Frontend/a11y owner | Keyboard e2e, pointer DnD e2e, axe/focus tests | Primitive-level tests, flag, interaction model chosen before coding | Disable keyboard DnD flag and keep pointer DnD path | Non-waivable a11y |
| Async race overwrites newer user state | High | Medium | High | Frontend owner | Create-race and concurrent-prop tests, rollback telemetry | Snapshots, FIFO/revision queue, stale-scope guards | Disable affected optimistic path or revert client-state phase | Non-waivable P1 |
| Sparse sort midpoint exhaustion | Medium | Medium | Medium | Backend/data owner | Repeated-move exhaustion test, duplicate-sort probes, payload telemetry | Epsilon/rebalance strategy before implementation | Disable sparse writes, run rebalance fix-forward, keep numeric column | Release owner accepts after proof |
| Mobile drawer causes focus trap/responsive regressions | High | Medium | High | Frontend/a11y owner | Mobile e2e, axe/focus tests, manual responsive smoke | Browser proof at `<=1023px`, flag, reuse existing patterns | Disable mobile drawer flag and keep desktop/sidebar behavior | Requires QA signoff |
| Raw SQL/RPC details leak to users | Medium | Medium | Medium | Backend/data owner | Error-path tests, log review, user-facing copy review | Error translation and logging boundary tests | Patch translation, redact logs, rerun auth/error matrix | Security review |
| Share URL token leaks via Referer header | High | Medium | High | Security/release owner | Header route inventory, token-bearing route tests | No-store and no-referrer on all token-bearing share routes | Block rollout; patch headers; verify full route list | Non-waivable |
| Full validation remains red from unrelated baseline | Medium | High | Medium | Release owner | `bun run validate`, targeted matrix, current-state comparison | Targeted proof first; broad gate only when signal is useful | Document unrelated baseline, get owner acceptance, do not mask tree failures | Documented validation gap |

## 18. Pros And Cons

Pros:

- Preserves the existing tree/sidebar architecture instead of replacing it.
- Prioritizes launch blockers before polish.
- Keeps data-risk work behind migrations, flags, and targeted tests.
- Improves accessibility and mobile reach without adding a new tree dependency.
- Gives future agents a single source of truth with traceability.

Cons:

- Several phases touch the same large component, so merge discipline matters.
- Numeric sort migration and sparse reorder are real data-contract changes.
- Keyboard DnD and mobile drawer require browser proof, which is slower than static tests.
- Feature flags add temporary complexity until retired.
- Static audit confidence cannot fully prove race/performance claims without implementation evidence.

## 19. SWOT Analysis

| Strengths | Weaknesses |
| --- | --- |
| Strong existing component/test foundation; clear findings; standing DB authorization; known stack and patterns | Large stateful component; stale plan-pack contradictions; partial current test gaps; broad validation baseline has unrelated issues |

| Opportunities | Threats |
| --- | --- |
| Ship a first-user-ready navigator; improve a11y beyond mouse-only DnD; reduce unnecessary tree work; harden share privacy | Data migration mistakes; unauthorized mutation path; mobile/responsive regressions; race bugs only reproduced under real timing; stale docs misleading implementers |

## 20. Requirements Traceability Matrix

| ID | Requirement | Source | Phase | Work package | Acceptance criterion | Test coverage | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F-01 | Optimistic create race preserves newer user state | `09`, `06`, `08` | 3 | Async race hardening | Server echo cannot overwrite newer selection/expansion | `estimate-sheet-tree-create-race.test.tsx` | Planned |
| F-02 | Structure signature excludes row items and includes `id`, `parent_id`, `kind`, `name`, `sortOrder` | `09`, `13`, performance review | 2 | Structure signature isolation | Row-only edit sync count is 0 through behavioral seam | `estimate-tree-content-signature.test.ts` | Planned |
| F-03 | Delete action uses one tree refresh | `09`, performance review | 2 | Delete refresh removal | No pre-delete full tree refresh remains | action/unit test | Planned |
| F-04 | Reorder does not rewrite all siblings | `09`, `16` | 2 | Sparse numeric reorder | 30-sibling move emits <=2 updates | `estimate-tree-reorder-payload.test.ts` | Planned |
| F-05 | Merge preserves server structure changes | `09` | 2 | Structure merge hardening | Server `kind`/name/sort changes propagate | pure merge test | Planned |
| F-06 | Delete uses server-authoritative ids/fallback | `09`, `16` | 1 | Delete RPC return migration | Client uses server-returned cascade/fallback | `estimate-tree-delete-cascade.test.ts` | Planned |
| F-07 | Pending prop updates are queued/revisioned | `09`, `06` | 3 | Prop echo queue | Multiple echoes apply in arrival/revision order | `estimate-tree-concurrent-prop-queue.test.tsx` | Planned |
| F-08 | Rename failure restores draft/editor | `09`, `03` | 3 | Rename failure recovery | Failed rename reopens attempted draft with focus | `estimate-tree-rename-failure.test.tsx` | Planned |
| F-09 | Rename input uses design tokens/row sizing | `09`, `05` | 0 | UI quick win | Design lint passes and row height aligns | design lint + DOM test | Planned |
| F-10 | DB/RPC tree invariants audited/enforced | `09`, `14`, `16` | 1 | RPC invariant audit | Self-parent, cycle, cross-tab, orphan, max-depth enforced | `estimate-tree-rpc-invariants.test.ts` | Planned |
| F-11 | Keyboard DnD alternative exists | `09`, `05`, `08` | 5 | Keyboard DnD | Keyboard-only user can move/reparent | `estimate-tree-keyboard-dnd.spec.ts` | Planned |
| F-12 | F2, Shift+F10, type-ahead exist | `09`, `05` | 5 | Tree keyboard shortcuts | Shortcuts invoke rename/menu/type-ahead | DOM keyboard tests | Planned |
| F-13 | Drag auto-scroll exists | `09`, UX review | 6 | Drag polish | Scroll parent moves near edge | browser or DOM scroll proof | Planned |
| F-14 | Hover-to-expand exists | `09`, UX review | 6 | Drag polish | 500ms inside-hover expands collapsed target | timer/browser test | Planned |
| F-15 | Loading is row-level for single mutations | `09`, `05` | 4 | Row pending state | Only mutating row is blocked | pending row DOM test | Planned |
| F-16 | Workspace store cleans up | `09`, `06` | 3 | Store cleanup | Estimate/tab store entries clear on scope exit | cache cleanup test | Planned |
| F-17 | Stale selection does not resurrect on tab switch | `09`, `06` | 3 | Selection validation | Selection exists in current tab or is null | tab switch test | Planned |
| F-18 | Create sort scheme uses +10 | `09`, `16` | 2 | Create sort spacing | Server/action create uses `max + 10` | create sort test | Planned |
| F-19 | Five tree actions call edit guard before RPC/write | `09`, `13`, `14` | 1 | App-layer authorization | Viewer rejected before RPC in each action | `estimate-tree-permission-gate.test.ts` | Planned |
| F-20 | Mobile/tablet tree surface exists | `09`, `05` | 6 | Mobile drawer | Tree reachable at `<=1023px` | mobile drawer e2e | Planned |
| F-21 | Empty state visible and actionable | `09`, UX review | 0 | Empty CTA | Visible CTA triggers Add Branch | empty CTA DOM test | Planned |
| F-22 | Panel toggle has `aria-controls` | `09`, `05` | 0 | Panel a11y | Toggle `aria-controls` matches aside id | DOM/a11y test | Planned |
| F-23 | Route node id uses `useParams` | `09`, Next docs | 0 | Route param cleanup | No naive pathname parsing remains | source + route test | Planned |
| F-24 | Rename keeps editing/saving affordance in flight | `09`, UX review | 0/4 | Rename state | In-flight rename keeps visible editing/saving state | rename DOM test | Planned |
| F-25 | New node scrolls into view | `09`, UX review | 0 | Create focus | New rename input scrolls visible | scrollIntoView test | Planned |
| F-26 | Add-child placement decision recorded and implemented | `09`, `12` | 0 | Context add-child | Placement matches decision | context menu add-child test | Planned |
| F-27 | Signature computation avoids row-item O(n x m) work | `09`, `07` | 2 | Signature performance | Row-item-only prop changes do not recompute structure | performance/signature test | Planned |
| T-04 | Authz escalation blocked | `14` | 1 | Authz hardening | App + RPC guards block viewer mutation | F-19 tests + grant review | Planned |
| T-13 | Share-token referrer leakage blocked | `14`, adversarial review | 1 | Share header hardening | All token-bearing share routes no-store/no-referrer or explicit exclusion | full route header tests | Planned |
| M-01 | Delete RPC return migration | `16` | 1 | Delete RPC migration | Single/bulk delete return authoritative ids/fallback | migration proof + cascade tests | Planned |
| M-02 | Numeric sort migration | `16`, data review | 2 | Numeric sort migration | Live constraints/functions preserved; generated types updated | migration proof + reorder tests | Planned |
| M-03 | Create sort/RPC update | `16`, data review | 2 | Create sort update | Current 9-arg create RPC respected and +10 used | create action/RPC tests | Planned |
| Q-06 | Escape on unsaved row cancels and rolls back | `12` | 3 | Create cancel behavior | Unsaved optimistic node is removed | create/rename cancel test | Planned |
| Q-11 | Undo deferred post-launch | `12` | 6 | Scope control | No partial undo shipped in v1 | scope review + delete modal test | Planned |
| Q-14 | Expansion persists per estimate/tab | `12` | 3 | Expansion persistence | Expansion keyed by estimate/tab and cleaned up | workspace state test | Planned |
| Q-19 | Read-only/share hides CRUD | `12` | 6 | Read-only gating | CRUD/DnD hidden or disabled in read-only/share | read-only UI test | Planned |
| Q-20 | Max depth is 100 | `12`, `14` | 1 | Depth guard | Depth 101 rejected in app and DB | app + DB depth tests | Planned |
| Q-22 | Character count only if max length is enforced; UI deferred | `12` | 1 | Name length cap | Server cap 200 enforced; UI count deferred unless needed | server length cap test | Planned |

## 21. Definition Of Done

Implementation is done only when:

- All five P1 findings have passing RED -> GREEN evidence.
- All P2 findings in this scope are either fixed or explicitly deferred with owner acceptance and no launch-blocking risk.
- P3 quick wins are complete unless a documented conflict makes one obsolete.
- All tree mutation actions reject viewers before RPC/write calls.
- DB migrations have preflight probes, logical dump evidence, generated types, grants/revokes, and rollback/fix-forward notes.
- Structure signature and reorder payload budgets pass targeted tests.
- Keyboard and mobile flows have browser evidence where static tests cannot prove the claim.
- Every token-bearing share route emits no-referrer/no-store privacy headers or has a reviewed explicit exclusion.
- Type-check, lint, design lint, targeted DOM/unit tests, and relevant e2e gates pass.
- Broad `bun run validate` and `bun run build` either pass or any remaining red is documented as unrelated baseline with owner acceptance.
- Observability thresholds, flags, rollback triggers, and release owner are recorded.
- `.ai/10_state/current-state.md` is updated for meaningful shipped/recovery facts.

## 22. Open Decisions

| Decision | Options | Recommendation | Consequence of delay | Owner | Blocks |
| --- | --- | --- | --- | --- | --- |
| Bulk delete defer path | Authoritative bulk return now; defer bulk on old guarded path with owner acceptance | Return authoritative full `deletedNodeIds` and nullable fallback in Phase 1 | Phase 1 cannot claim authoritative delete for all tree deletes | Backend/data owner | Phase 1 |
| Sparse sort precision | `numeric(20,4)`; higher precision; DB-side rebalance-only strategy | Start with `numeric(20,4)` only if repeated-move test passes | M-02 can ship with insufficient spacing and require emergency fix-forward | Backend/data owner | Phase 2 |
| Sparse sort rebalance | Client-planned rebalance; RPC-planned rebalance; scheduled maintenance rebalance | Define epsilon and RPC-aware rebalance before sparse writes | Sparse sort may pass simple tests but fail repeated midpoint moves | Backend/data owner | Phase 2 |
| Keyboard DnD interaction model | `Ctrl+X`/`Ctrl+V`; Shift+Arrow; explicit move dialog | Choose one before coding and align tests/copy | Keyboard DnD implementation/test churn | Frontend/a11y owner | Phase 5 |
| Mobile drawer implementation primitive | Existing drawer/sheet; minimal custom drawer; defer mobile tree | Reuse existing accessible drawer/sheet if present | Mobile work risks focus/layout regressions or misses first-user tablet needs | Frontend/a11y owner | Phase 6 |
| Monitoring ownership | Existing provider analytics; database-backed event table; manual/internal-only rollout | Assign release owner, query, threshold, and cadence in Phase 0.5 | Rollback triggers are not observable | Release owner | Phase 0.5 |
| Full validation baseline | Fix unrelated reds first; targeted proof plus owner acceptance; wait for baseline owner | Use targeted proof first, then broad validate/build when interpretable | Final gate can conflate tree failures with known unrelated baseline issues | Release owner | Phase 7 |

## Final Planning Validation Notes

- This pass created a plan artifact only; no app code, tests, migrations, provider settings, or production configuration were changed.
- Browser automation was intentionally skipped because this planning artifact can be validated by source and document inspection.
- The unrelated untracked file in the center-content plan folder was preserved untouched.
- Integration, adversarial, and independent verification reviewed the draft. Their blocking findings were remediated in this version: prompt-required fields, risk/open-decision/traceability columns, stricter DB rollback, live schema introspection, bulk-delete authority, token-bearing share headers, sparse-sort exhaustion proof, and measurable rollout triggers.

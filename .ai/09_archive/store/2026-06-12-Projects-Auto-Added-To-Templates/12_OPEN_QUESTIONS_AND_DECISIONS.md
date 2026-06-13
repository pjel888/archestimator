# 12 — Open Questions and Decisions

**Date:** 2026-06-12. Per the prompt's instruction, this pass makes reasonable product decisions where intent is clear and records only material items. Nothing below blocks Phase 1.

---

## A. Decisions made by this planning pass

| ID | Decision | Rationale / evidence |
|---|---|---|
| D-1 | **Schema Option A: first-class `estimate_tabs`** + `estimate_nodes.estimate_tab_id`; rows derive tab via node | prompt's favored direction; audit strengthens it (estimate is load-bearing for collaboration/publication/export/AI — [03](03_DATABASE_MIGRATION_PLAN.md) §2) |
| D-2 | **No `tab_code` column in v1** | YAGNI; Excel names derive from tab `name`; estimate keeps `sheet_code`; trivially additive later ([02](02_TARGET_ARCHITECTURE.md) §3) |
| D-3 | **Backfilled default tab named `Main`**, `is_default=true`, partial-unique enforced | neutral copy; surfaces as the single tab on every existing estimate ([03](03_DATABASE_MIGRATION_PLAN.md) §7) |
| D-4 | **Route shape unchanged** (`/estimates/[nodeId]` node-or-estimate); tab derived from node; no `/tabs/[tabId]` route in v1 | preserves every old URL, link builder, and the Ask Flip regex ([02](02_TARGET_ARCHITECTURE.md) §13) |
| D-5 | **Tab-level access deferred**; tabs inherit estimate access | no surface wants sub-estimate ACLs; additive later ([08](08_ACCESS_SECURITY_RLS_PLAN.md) §2) |
| D-6 | New tab/insert RPCs use **`can_edit_estimate`** (strict posture), not the older family's workspace-only check; ride-along hardening of touched RPCs flagged for owner visibility | closes — and never widens — the documented asymmetry ([08](08_ACCESS_SECURITY_RLS_PLAN.md) §1, §4) |
| D-7 | **Cross-tab node drag/drop not supported in v1** (toast + workarounds: duplicate tab, save-as-template) | needs new move RPC + ambiguous sort semantics; deferred to follow-up ([05](05_ESTIMATE_TABS_UI_UX_PLAN.md) §6). Local v1 rejection is implemented/proven; the move RPC remains out-of-scope. |
| D-8 | Project-derived sources **hidden in the template editor** in v1 (compose via save-as-template) | keeps editor template-only; existing composition path suffices ([06](06_TEMPLATES_PANEL_UNIFICATION_PLAN.md) §12) |
| D-9 | **No rewrite of persisted names** containing "Sheet" (`${sheetCode} Estimate Sheet` records) or stored `sheet_*` event types | data migrations for copy are all risk, no value; labels map in UI (01 §16–17) |
| D-10 | Export default = **all tabs** (Option C shape); `?tab=` for active-tab; single-tab estimates byte-shape-identical | least disruptive safe design after workbook inspection ([07](07_XLSX_EXPORT_TABS_PLAN.md) §2–3) |
| D-11 | Project-derived sources are **virtual/read-through**; persistence only via explicit "Save as template" | prompt's critical principle; storage stays template-tables-only for user templates ([06](06_TEMPLATES_PANEL_UNIFICATION_PLAN.md) §2) |
| D-12 | `sheet_code` relabels to **"Estimate code"** (it identifies the estimate, not a tab — audited meaning, 01 §16 Task 3) | copy table [05](05_ESTIMATE_TABS_UI_UX_PLAN.md) §10 |
| D-13 | Tab strip lives at the **top of the sheet center column**; left tree panel stays single-view ("Tabs" label) | primitive reuse + width constraints + repo precedents ([05](05_ESTIMATE_TABS_UI_UX_PLAN.md) §1) |
| D-14 | No feature flags; phase-by-phase rollout with wrappers; Vercel rollback as safety net | consistent with repo posture (`.ai/10_state/decisions.md` 2026-06-03 share-overhaul entries) |
| D-15 | **No user-visible multi-tab creation before tab-aware export support** | prevents a data-loss-looking release gap where beta users create tabs but export only the default tab; Phase 3 creation either ships in the same release train as Phase 6 or remains unavailable outside internal/dev QA ([07](07_XLSX_EXPORT_TABS_PLAN.md) §10) |

## B. Questions requiring product-owner input (none blocking Phase 1)

| ID | Question | Default if unanswered | Needed by |
|---|---|---|---|
| Q-1 | Marketing/landing copy: keep "quote sheets" wording on `/`, `/features`, `/pricing`, or align to "estimates/tabs"? | **answered 2026-06-13 by delegated owner/product review:** align public product/workspace copy to estimates/tabs; retain "Excel quote sheets" and "spreadsheet" only for external-file import/handoff contexts | Phase 4 |
| Q-2 | Default-tab display name `Main` acceptable, or prefer e.g. `Tab 1`/estimate-derived? | `Main` (D-3) | Phase 1 (cheap to change pre-backfill) |
| Q-3 | Should multi-tab Source Breakdown remain one global worksheet (with Tab column) vs per-tab breakdown sheets? | global + Tab column (D-10 shape) | Phase 6 |
| Q-4 | Save-as-template naming-conflict behavior: silent " (2)" suffix vs always-prompt? | prompt pre-filled with suffix ([06](06_TEMPLATES_PANEL_UNIFICATION_PLAN.md) §9) | Phase 5 |

## C. Questions the codebase answers during implementation (deferred discovery)

| ID | Question | Where answered |
|---|---|---|
| C-1 | Row query per tab: filter via `node_id IN` vs `estimate_id` + app filter — EXPLAIN decides | [04](04_DOMAIN_AND_REPOSITORY_PLAN.md) §3 `getEstimateTabTree` |
| C-2 | `validate_estimate_node_tree` evolution: per-estimate-iterating-tabs vs per-tab function | [03](03_DATABASE_MIGRATION_PLAN.md) §4.2 |
| C-3 | Tab-scoped events index necessity | [03](03_DATABASE_MIGRATION_PLAN.md) §6 (measure first) |
| C-4 | Bulk "Add selected" batching/partial-failure UX across mixed source types | [06](06_TEMPLATES_PANEL_UNIFICATION_PLAN.md) §10 |
| C-5 | M1 split (M1a/M1b) for reviewability | [03](03_DATABASE_MIGRATION_PLAN.md) §10 |
| C-6 | Reusable-sources staleTime + outline timing thresholds | [06](06_TEMPLATES_PANEL_UNIFICATION_PLAN.md) §6; [09](09_TEST_AND_VALIDATION_PLAN.md) §7 |
| C-7 | Hosted-export script optional `EXPECTED_WORKSHEETS` assertion | [07](07_XLSX_EXPORT_TABS_PLAN.md) §9 |

## D. Questions that should NOT block initial implementation

- Future `/tabs/[tabId]` deep-link route (D-4 revisit trigger: a concrete share-an-empty-tab need).
- Tab-level membership (D-5 revisit trigger: explicit customer demand).
- Cross-tab drag/move RPC (D-7 follow-up); the v1 tab-strip rejection/drop-message boundary is implemented locally.
- ExcelJS streaming writer (only if multi-tab benchmark regresses — [07](07_XLSX_EXPORT_TABS_PLAN.md) §8).
- Internal `EstimateSheet*` → `EstimateTab*` renames (Phase 8 only, with contract-test batches).
- AI read-context tab grouping + `ai_data_access_events` tab attribution was implemented locally on 2026-06-13; provider/live audit-table proof remains external.
- Awakening the named-versions feature with v3 snapshots (guarded, [03](03_DATABASE_MIGRATION_PLAN.md) §9).

## Evidence Used

Decisions trace to their cited plan documents; underlying repo evidence is in [01_CURRENT_STATE_AUDIT.md](01_CURRENT_STATE_AUDIT.md) (sections referenced per row) and the per-domain plans 03–09.

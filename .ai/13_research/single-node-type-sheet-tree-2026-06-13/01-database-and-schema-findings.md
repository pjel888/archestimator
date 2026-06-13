# Database & schema findings — node-type unification

**Scope:** What collapsing `group` + `area` into one node type costs/saves at the Postgres/Supabase layer.
**Bottom line:** Net schema *simplification* (fewer triggers/constraints), performance-neutral, low data-migration risk — but it removes the DB-level discipline that keeps cost rows at predictable leaves, pushing three new invariant problems up into the application layer.

---

## DB objects that enforce the group/area split

| Object | File | What it enforces |
|---|---|---|
| `estimate_node_kind` enum | [`20260518090000_archestimator_core_schema.sql:9`](../../../supabase/migrations/20260518090000_archestimator_core_schema.sql) | Still carries all 6 legacy values; unconstrained at enum level |
| `estimate_nodes_active_kind_check` | [`20260520222038`](../../../supabase/migrations/20260520222038_enforce_two_kind_estimate_nodes.sql) | `kind in ('group','area')` — the live gate |
| `estimate_template_nodes_active_kind_check` | [`20260522091621`](../../../supabase/migrations/20260522091621_component_library_templates.sql) | Same gate on the parallel template tree |
| `validate_estimate_node_tree(uuid)` | [`20260612094734_estimate_tabs_foundation.sql`](../../../supabase/migrations/20260612094734_estimate_tabs_foundation.sql) | Hierarchy rule (root=group, parent=group) + row-items-must-be-area + cycle + missing-parent |
| `enforce_estimate_node_tree()` trigger | same | Deferred constraint trigger calling the validator |
| `enforce_estimate_row_item_area_node()` trigger | [`20260520222038`](../../../supabase/migrations/20260520222038_enforce_two_kind_estimate_nodes.sql) | Direct `node.kind = 'area'` check on every row insert/move |
| `reorder_estimate_nodes(uuid,jsonb)` | [`20260612094734`](../../../supabase/migrations/20260612094734_estimate_tabs_foundation.sql) | Inline hierarchy pre-flight duplicating the validator's rule |
| `insert_estimate_row_item_with_history` | [`20260524033151`](../../../supabase/migrations/20260524033151_estimate_sheet_version_control.sql) | `node.kind = 'area'` guard before inserting a row |
| `insert_estimate_template_into_estimate` | [`20260522091621`](../../../supabase/migrations/20260522091621_component_library_templates.sql) / `20260612094734` | Target parent must be `kind = 'group'` |
| `create_project_estimate_package_with_history` (AI apply) | [`20260528003000_ai_package_builder_apply_rpc.sql`](../../../supabase/migrations/20260528003000_ai_package_builder_apply_rpc.sql) | Row targets must be `area`; first `area` becomes UI landing node |
| `validate_estimate_template_tree` + `enforce_estimate_template_row_item_area_node` | [`20260522091621`](../../../supabase/migrations/20260522091621_component_library_templates.sql) | Same rules on the template tree |

**Surviving invariants are already kind-agnostic:** cycle detection, missing-parent detection, and cross-tab parent consistency do not reference `kind` and would be untouched.

---

## Features that truly depend on area-vs-group vs. those that only need node identity

**Truly depend on the split:**
- `estimate_row_items` attachment (FK + trigger + every history RPC hardcode `kind = 'area'`) — the primary structural contract.
- Template insertion target (`= 'group'`) and AI package-builder row validation (`<> 'area'`) + landing-node selection.
- Client-side `aggregate-project-charts.ts` "by space" walk (`kind === "Area"` to find the row-bearing node, `=== "Group"` to roll up).

**Only need node identity (kind is incidental metadata):**
- Version-control snapshot/restore (snapshots `kind` as data, never branches on it).
- Activity history, project budget, sheet notes, estimate tabs, mass-deletion governance — none branch on kind.
- **RLS** — all policies are workspace-membership based; kind is invisible to security. Confirmed across the core schema and collaboration migrations.

---

## Concrete migration shape for full unification

~10 DROP/CREATE-OR-REPLACE operations, no structural table changes:
1. Rewrite `validate_estimate_node_tree` — drop the hierarchy + row-area sub-checks (~80 lines → ~30); keep cycle/missing-parent/cross-tab.
2. Drop `enforce_estimate_row_item_area_node` trigger.
3. Drop/relax `estimate_nodes_active_kind_check` (and the template twin).
4. Strip the inline hierarchy block from `reorder_estimate_nodes`.
5. Relax `insert_estimate_row_item_with_history` to an existence check.
6. Relax `insert_estimate_template_into_estimate` target to any node.
7. Rewrite `create_project_estimate_package_with_history` (drop the area maps, change landing-node logic).
8. Update the parallel template-tree validator/trigger.
9. (App, not DB) Re-base `aggregate-project-charts.ts` on "node has rows" instead of `kind === "Area"`.

**Complexity: medium.** No signatures change; risk is semantic, not mechanical SQL.

---

## Data migration & rollback risk — LOW (if you relax, not rewrite)

- Existing seed/production data (`lewis-residence`, `luna-heights`) stays structurally valid: groups and areas can coexist after you *remove restrictions*. No backfill required if you keep the `kind` values as-is and simply stop enforcing the rules.
- Removing enum values is a table rewrite (PG can't drop enum values in place) — avoidable by leaving the column and just dropping the CHECK.
- **Rollback caveat:** if any "mixed" node (children + direct rows) is created during the unified window, re-adding the old triggers will immediately fail validation. Rollback is only clean if no mixed nodes exist.

---

## Performance & indexes — effectively a WASH

- Indexes `(estimate_id, parent_id, sort_order)` and row-items `(estimate_id, node_id, sort_order)` don't include `kind`; nothing degrades.
- Removing `kind = 'area'` filters inside the row-insert RPC and triggers is a tiny win (PK-served existence check).
- New cost: rendering a unified node issues "children + rows" per node instead of branching on kind — one extra cheap, indexed read. Negligible.
- **Totals are unaffected:** `estimate_sheet_total` already sums flat over all rows regardless of kind ([`20260524033151:181`](../../../supabase/migrations/20260524033151_estimate_sheet_version_control.sql)).

---

## Three NEW invariant problems unification pushes into the app layer

1. **Mixed-content ordering.** `estimate_nodes.sort_order` (sibling order) and `estimate_row_items.sort_order` (within-node) are *separate* ordinals. A node with both children and rows has no shared sequence — interleaving requires a new shared sort namespace or a content discriminator.
2. **Chart roll-up semantics.** `estimate_sheet_total` is fine, but `aggregate-project-charts.ts` assumes groups have **no** direct rows. Mixed nodes violate that; the "by space" aggregation must be re-derived.
3. **Lost DB-enforced discriminator for templates + AI.** Today the DB guarantees "rows live on areas." Remove it and the application/AI prompt must carry that discipline itself, with no backstop.

**Verdict (schema lens):** pure-schema delta is a modest simplification with low migration risk and no performance change. The catch is entirely semantic: the two-kind model is a cheap DB-level guardrail that keeps structure (group) and cost-entry (area) from ever being the same node. Removing it is safe for Postgres but offloads real discipline to the app.

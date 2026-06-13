# 10 — Test Migration Map (P2.9)

Per-file inventory of which existing assertions break and how to replace them, plus the new test files. All paths under `tests/vitest/`. Verified against current source 2026-06-13. Legend: **invert** (a throw/absence flips to allowed) · **delete** · **agnostic** (rewrite to not branch on kind) · **keep**.

The golden-master oracle ([07](07_GOLDEN_MASTER_ORACLE.md)) is the regression spine; the rewrites below stop the brittle source-string suites from churning every phase.

---

## Existing files

### 1. `estimate-tree-data.test.ts` — heaviest; phase **P4/P6**
| Test (line) | Breaks because | Replacement |
|---|---|---|
| active kinds == ["group","area"] (29-33) | enumeration gone | delete / single-kind const |
| isEstimateGroupNodeKind split (35-40) | helper deleted | delete |
| normalizes legacy → "group" (42-46) | normalize target collapses | agnostic: normalize all → unified kind |
| roots are group (48-51) | roots carry no discriminator | agnostic: assert roots exist |
| **canNest matrix incl. (group,area)=false,(area,*)=false (69-76)** | **every nesting now allowed** | **invert: all combinations true** |
| **validateEstimateTreeHierarchy == [] only b/c rows on area (82-84)** | rule removed | **invert: rows-on-any-node validates clean** |
| sample kinds == ["area","group"] (78-80) | one kind | delete |

### 2. `estimate-tree-modal.test.tsx` — phase **P6**
| Test (line) | Breaks | Replacement |
|---|---|---|
| renders Add Group + Add Node (96-131) | one Add button | agnostic / drop second button |
| optimistic group/area labels (133-157) | single create kind | agnostic: unified optimistic node |
| group/area create + group-only parent (159-177) | one kind, any parent | delete/agnostic |
| **"you must select a group first…" at root (179-208, 210-222; strings :200,:214)** | gate removed | **invert: root Add now allowed, no gate** |

### 3. `estimate-template-drop-zones.test.tsx` — phase **P5/P6** (template lockstep)
| Test (line) | Breaks | Replacement |
|---|---|---|
| row-only-on-area copy (136-154) | any node takes rows+children | agnostic |
| template drop zones on groups only (156-202) | any node accepts drops | agnostic |
| **no insert zone "into Kitchen" (area) (204-216)** | area now gets a child zone | **invert: zone appears** |
| **auto-wrap area→group on drop (218-247, 249-273)** | wrap path deleted | **delete/invert: direct child insert, no wrapper** |

### 4. `estimate-tree-reorder.test.ts` — phase **P5/P6**; mostly **keep**
| Test (line) | Breaks | Replacement |
|---|---|---|
| **rejects Area at root, code invalid-parent (142-153)** | any node at root | **invert: ok** |
| **rejects Area as drop parent (155-166)** | any node parents | **invert: ok** |
| structural signature `…:group` (199-212, line 211) | `:group` suffix changes | agnostic: update signature format |
| cycle/self-drop/unknown/multi-drag (168-197) | kind-independent | **keep** |
| mixed-kind / before-drop ordering (214-292) | behavior unchanged | keep (retitle) |

### 5. `estimate-tree-context-menu.test.tsx` — phase **P4/P6**; mostly **keep**
| Test (line) | Breaks | Replacement |
|---|---|---|
| **CRUD menu: create items hidden on area (342-362, area branch 356-357)** | every node offers create | **invert: present on every node** |
| create area under group, parent assumption (364-384) | one kind, any parent | agnostic |
| delete copy "removes the area and its rows" (647-655, :652) | one delete copy | agnostic |
| **group delete warns "child groups, child areas, descendant rows" (657-662, :661)** | kind-split copy gone | agnostic: unified copy |
| all rename/delete optimistic-flow tests | kind-independent | **keep** |

### 6. `estimate-sheet-library-insert.test.tsx` — phase **P4**; **keep** (fixtures only)
No hard kind-dependent assertions. Fixtures use `kind:"area"/"group"` and two labels ("Add blank estimate row to Kitchen", group-targeted inserts) carry framing — update fixtures + labels; **no assertion breaks**.

### 7. `live-estimate-node-route.test.ts` — brittle source-string; **neutralize P0, final P5/P6**
| Substring assert (line) | Action |
|---|---|
| `toContain("isEstimateGroupNodeKind")` (26) | delete |
| `toContain("selectedGroupId")` (27) | delete/agnostic |
| `"you must select a group first…"` (28) | delete (gate removed) |
| `.eq("kind", "area")` (153) | delete (RPC relaxed) |
| `canNestEstimateNodeKind(kind, parentKind)` (165), `return "group"` (166), `kind: "group"` (167) | delete/agnostic |
| all other asserts (loaders, reconciliation, metadata) | keep |
**P0 action:** replace the 5 two-kind substring asserts with behavioral assertions deferred to the oracle; leave the rest.

### 8. `supabase-performance-migrations.test.ts` — brittle migration-text; **neutralize P0, final assertions P5**
| Substring assert (line) | Action |
|---|---|
| `create constraint trigger estimate_row_items_enforce_area_node` (45) | **keep but** the trigger is RELAXED not dropped (06 §E.2) → assert it now does existence-only (`Estimate row items must belong to a node in the same estimate`) |
| `"Estimate row items must belong to area nodes"` (47), `enforce_estimate_row_item_area_node()` (50) | update to the relaxed message |
| `"child.parent_id is null and child.kind in ('group')"` (58), `parent.kind in ('group')…` (59) | **delete** — hierarchy block removed |
| `kind::text in ('lot',…)` (71), `estimate_nodes_active_kind_check` (72), `check (kind in ('group','area'))` (73) | **keep** — the CHECK is retained (06 §E.1) |
| matrix derivation `rootChildKinds/folderParentKinds/folderChildKinds/canNest(...,"area")` (86-89), SQL nesting clauses (90-91) | **invert**: matrix collapses to all-allowed; nesting clauses removed |
**P0 action:** neutralize the two-kind *string* asserts (58-59, 86-91); re-assert the final one-kind positive form in P5 exactly when the migration text changes. **Update the keep-list above to match the relax-not-drop decision** (this corrects 04 §9 which implied the trigger is dropped).

---

## New test files

### `estimate-unification-oracle.test.ts` — **DONE (P0)** ([07](07_GOLDEN_MASTER_ORACLE.md))
5 green at P0 (totals, formula, row-sum, cache-keys, all-area snapshot); 7 `it.todo` enabled per phase (share P1, export/charts P2, snapshot-divergence tracked).

### `estimate-mixed-content.test.tsx` — phase **P4/P6**
- renders rows-first: own `EstimateRowItemsTable` directly under header, child branches below.
- caret hidden when `children.length === 0`, shown otherwise (shape, not color).
- one icon regardless of kind; no "Group"/"Node" string in rendered tree/menu/toolbar.
- unified empty state on an empty node (one line offering row + sub-area).
- sticky-offset cascade: a 20+-row node followed by children — child header does not collide with the row `thead` on deep scroll (assert computed `top` offsets differ).
- "Own items" affordance distinguishes a node's own rows from the first child's rows.

### `estimate-rows-at-any-depth-parity.test.ts` — phase **P1/P2**
- Drives the oracle MIXED fixture through share/export/charts; asserts grand total 200, every row once, no `non_area_rows_skipped`, no double-count, BuildingA own-row not orphaned. (These are the oracle O2/O3/O4 mixed `it.todo`s, promoted to acceptance tests.)

### `estimate-single-add.test.tsx` — phase **P6**
- one "Add Area" toolbar button; creates a child of the selected node, or a root if nothing selected; **no** "select a group first" error path.
- context menu: one unconditional "Add Area inside" on every node.
- drag a row onto a node that has children → no throw (`moveEstimateRowItem`).
- add a row to a node that has children → succeeds.

### `unify-migration-integrity` — **DONE (P0)** = [`scripts/prove-unify-estimate-node-kinds-postgres.mjs`](../../../scripts/prove-unify-estimate-node-kinds-postgres.mjs)
Doubles as the **cycle + cross-tab + missing-parent + orphan regression test** (plan 04 checklist). Already green. Wire as `prove:unify-kinds` in package.json at P5.

### `estimate-template-unification.test.tsx` — phase **P5**
- template editor: one Add path, rows render on any template node, drop zones on any node, no auto-wrap (mirror of the estimate-side tests; see [13](13_TEMPLATE_EDITOR_PARITY.md)).
- save-as-template of a subtree containing a (former-group) node with rows → succeeds against the relaxed `validate_estimate_template_tree` (the V4 lockstep regression).

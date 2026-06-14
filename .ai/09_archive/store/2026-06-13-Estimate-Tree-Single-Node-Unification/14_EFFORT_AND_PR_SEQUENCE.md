# 14 — Per-Phase Effort & PR Sequence (P2.15)

T-shirt sizing (1 experienced eng familiar with the codebase) and the suggested PR sequence with per-PR reviewer focus. Sizes assume the oracle + prove-harness exist (they do — P0 delivered). The route ([03](03_IMPLEMENTATION_ROUTE.md)) is the spine; one PR per phase except P0.

| Phase | Size | ~Effort | What ships | Reviewer focus |
|---|---|---|---|---|
| **P0** | M | 2–3 d (oracle skeleton exists, not complete) | Finish-wire oracle O2/O3/O4/O-DIV todos; neutralize the 2 brittle source-string suites (`live-estimate-node-route`, `supabase-performance-migrations`); add `prove:unify-kinds` to package.json; seed the prod integrity probe; create the [15](15_PREIMPLEMENTATION_AUDIT_AND_ACCEPTANCE_GATE.md) source-sweep allow-list/test artifact. | Oracle freezes all-area byte-for-byte across totals/share/export/charts/activity; every two-kind source match classified; brittle asserts replaced with behavioral ones; harness green. **No product behavior.** |
| **P1** | S | ~1 d | Share firewall: `reconstruct-share-tree.ts:297` gate → `rowsByNodeId.get(id) ?? []`; render gates in `ShareEstimateTreePanel/View`. | **Diff must be tiny + standalone.** Oracle share parity on all-area (byte-identical); mixed fixture proves rows survive. It's the live client-facing money path — highest scrutiny per PR-LOC. |
| **P2** | M | 2–3 d | Export (`build-proposal-export-model.ts:265` emit any node; delete `collectNonAreaRows`); charts (`aggregate-project-charts.ts` leaf-or-has-rows + own-bucket, fix `:256` raw sum); `branch.tsx:79` canReceiveRows→true. | **No double-count, no cross-provenance merge** (09 §C/§D). Oracle export+chart mixed green; BuildingA own-row not orphaned; consolidation node-agnostic + totals correct. |
| **P3** | M | ~2 d | Throw paths (`estimate-mutations.ts:12`, `estimate-tree-data.ts:409`); activity-scope stored choice (`estimate-ui-store` override, default desc; decouple `:421`/`:435`); verify row-event `estimate_node_id` stamping. | **Cache key stable across a child-add** (V3 B2); no throw on row-drag; default reproduces today's data (09 §A). Must land while all-area. |
| **P4** | L | 3–5 d | "Area" vocab (~40 strings) + onboarding step rename; mixed-content layout (rows-first, one icon, conditional caret, **sticky-offset cascade**, own-items affordance, unified empty state); build-breaker fixes (`activity-history.tsx`/`node-visuals.tsx`); adjacent display/read sweep from [15 §C](15_PREIMPLEMENTATION_AUDIT_AND_ACCEPTANCE_GATE.md#c-additional-surfaces-that-must-be-classified). | Visual parity on all-area; **sticky headers don't collide** on a 20+-row node + children; no "Group"/"Node" rendered copy in tree/editor/template browse/copilot-visible surfaces; a11y labels (11 §L7); state matrix complete; keyboard contract verified; row editing parity verified; DnD semantics verified; responsive constraints verified; form alignment verified; screen-reader/live-region copy verified; promise-gap copy held to P6. Pure presentation — fully reversible. |
| **P5** ⚠ | L | 3–4 d (migration **done+proven**) | Relax-only migration (validators+triggers+reorder, [08…P5.sql](08_unify_estimate_node_kinds.P5.sql)) **estimate+template lockstep**; template-editor UI parity ([13](13_TEMPLATE_EDITOR_PARITY.md)); final one-kind assertions in the 2 brittle suites; cycle+cross-tab regression (= the harness). Runbook [12](12_MIGRATION_RUNBOOK_WRITE_FREEZE_ROLLBACK.md). | Branch dry-run + restore-drill green; integrity NOTICE; `gen types` no-op; **save-as-template lockstep** works; template editor matches estimate side; **last clean abort point**. Migration is a **separate PR** from P6. |
| **P6** 🚨 | M | 2–3 d | Enable writes: relax the 3 RPC kind-guards (incl. 🆕 subtree RPC) **with** the single "Add Area" create flow; remove client guards (`canNestEstimateNodeKind`, "select a group first", area-row write guards); delete wrap machinery; update project-source subtree insertion and template insertion to target any node. | **Point of no return.** E2e create-mixed → share/export/chart/snapshot parity vs oracle (with intentional mixed deltas); project-source and template subtree insert into mixed-capable targets; cycle+cross-tab on rewritten validators; P6 is a **separate PR** from the migration; rollback = revert this PR (re-closes writes, no data loss). |
| **P7** | S | ~1 d | Delete dead code: wrap/nesting helpers, `correctKinds`, `collectNonAreaRows`, `EmptyGroupMessage`, vestigial branches; rename the vestigial `enforce_*_area_node` triggers (optional); optional later `kind`-column drop. | No orphan refs to deleted helpers; full vitest + e2e suite; pure hygiene. |

**Total: ~16–22 dev-days** across 8 phases (P0 partly pre-paid by this deepening pass). Heaviest: P4 (layout polish) and P5 (template-editor parity) — both have the most surface, neither is irreversible.

## PR sequence & gating

```
PR0  test infra + oracle wiring            (gate: validate + oracle green on all-area)        ── no behavior
PR1  share firewall (standalone)           (gate: oracle share parity + share e2e smoke)
PR2  export + charts + branch reads        (gate: oracle export/chart mixed + no double-count)
PR3  throw paths + activity scope          (gate: cache-key stable across child-add)
PR4  Area vocab + mixed layout             (gate: visual parity, sticky no-collide, a11y, no Group copy)
PR5  relax-only migration + template       (gate: branch dry-run + integrity + save-as-template)   ⚠ last clean abort
PR6  enable writes / Add Area flow         (gate: e2e create-mixed parity)                          🚨 point of no return
PR7  delete dead code                      (gate: full suite)
```

**Cross-cutting reviewer rules (every PR):** `bun run validate` green; the all-area oracle snapshot **unchanged** (any diff = regression, inspect the `.snap`); gated e2e smokes pass; no provider/production claims from local-only checks. **PR5 and PR6 MUST be separate** — merging them re-creates the merged-irreversible-step the route exists to avoid (mission non-negotiable #2).

**Script exposure:** PR0 adds package script `prove:unify-kinds`; PR5 runs it against the final P5 migration and adds/runs `prove:unify-kinds-rls-rpc` for access and RPC guard proof.

**Source-sweep reviewer rule:** every PR includes the current source-sweep diff from [15](15_PREIMPLEMENTATION_AUDIT_AND_ACCEPTANCE_GATE.md). A remaining two-kind match is acceptable only if the PR evidence classifies it as historical, dormant write-only, feature-gated, or intentionally vestigial display metadata. Unclassified matches block approval.

**Owner decisions before PR5/PR6** (see [09](09_P1_DESIGN_DECISIONS.md)): (1) node name "Area" vs "Section" (Q-1, blocks P4); (2) maintenance-window timing (Q-3). The §D5 RPC-guard P5→P6 split is now the adopted plan contract, not an open owner choice.

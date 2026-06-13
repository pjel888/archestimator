All three load-bearing claims verified in the actual code:
- `reconstruct-share-tree.ts:297` — confirmed `node.kind === "area" ? (rowsByNodeId.get(node.id) ?? []) : []` (silent drop on public share).
- `estimate-mutations.ts:12` — confirmed `if (!canNodeReceiveRows(targetNode.kind)) throw` (the THROW path).
- `EstimateSheetContent.tsx` — confirmed `includeDescendants: isGroup` and the `node.kind !== "area"` row-emission gate (constraint 6 bug + the row-emission gate).
- Template lockstep confirmed: foundation migration L830 `validate_estimate_template_tree(source_template_id)` inside the save-as-template copy path.
- Both brittle tests exist at `tests/vitest/`.

The research is sound. Route 3 wins all three judges (8.9 / 9.0 / 8.4). Here is the final synthesized route.

---

# FINAL RECOMMENDED ROUTE: Reads-First, Migration-Late ("Silent-Drop Firewall") + grafts

**Base:** Route 3. It is the only route that (1) isolates the highest-risk LIVE public share fix into its own reviewable PR, (2) splits the irreversible relax-only DDL from the first dangerous mixed write into *separate, independently-revertible* releases, and (3) keeps every read change monotonic (gate-removal only ever ADDS rows, never drops — fails safe). All three judges ranked it first decisively.

**Grafts from runners-up:**
- From **Route 2 (Big-Bang)**: its *cutover-runbook rigor* and *integrity-check checklist* become the Phase 5 apply procedure (frozen writes, fresh dump, dry-run-on-branch, post-apply integrity gate). The discipline is good; only the "all in one merge" packaging was wrong.
- From **Route 1 (Expand-Contract)**: its **cosmetic-first insight** — Route 1's own self-critique conceded layout+vocab carry zero data semantics and could ship early. Route 3 already does this (Phase 4 pre-migration), so this graft *validates* Route 3's ordering rather than changing it. We keep the user-visible win inside the reversible corridor.
- **Resolved disagreement:** Judge 1 capped Route 3's rollback at 9 (not 10) on the unproven "no prod node holds both" assumption. We resolve this by promoting that check to a **blocking HARD-GATE prod integrity pre-flight** (Phase 5 Step 1) AND running it again in Phase 0 as an early warning. No judge objected to Route 3's structure — only to an asserted-not-proven precondition, which we now prove.

---

## The invariant that orders everything

Rows vanish only when BOTH are true simultaneously: **(1) DB allows a row on a node with children**, AND **(2) a read path still gates on `kind==='area'`**. Today (1) is false. The plan drives (2) to false *everywhere* while (1) is still false — so every read fix is a **provable production no-op** (no mixed node exists for the deleted gate to affect) — *then* flips (1) relax-only with writes still withheld, and only *last* enables the writes that can create a mixed node. The window never opens.

---

## Phase 0 — Oracle + Brittle-Test Demolition + Pre-flight Probe
**Ships:** test infra only. No product behavior.
**Work components:** (g) partial, (h) partial.
- Neutralize the two brittle source-string contract tests so later phases don't churn them repeatedly: `tests/vitest/live-estimate-node-route.test.ts` (138 source-string asserts) and `tests/vitest/supabase-performance-migrations.test.ts`. Replace the two-kind *string* asserts with **behavioral** assertions deferred to the golden-master oracle below.
- Stand up the **golden-master numeric oracle**: for a representative all-area tree, snapshot totals + share-reconstruct output + proposal-export model + chart aggregates + activity-scope cache keys. Every later phase must reproduce these byte-for-byte (reads) or with documented monotonic deltas (post-migration). This oracle is the *proof mechanism* that no row or dollar is lost.
- Run the **prod integrity probe** (read-only, early warning): `SELECT count(*) FROM estimate_nodes n WHERE n.kind <> 'area' AND EXISTS (SELECT 1 FROM estimate_row_items r WHERE r.node_id = n.id)` and the equivalent for `estimate_template_nodes`. Must return 0. (Re-run as a *blocking gate* in Phase 5.)
- Provision the **Supabase verification branch** (MCP `create_branch`) for later dry-runs.

**Data-safety:** zero schema/read/write change. Window cannot open.
**Rollback:** trivial `git revert`; oracle is additive.
**Verification gate:** `bun run validate` + new oracle suite green on all-area data.
**User value:** none (infrastructure price of safety).

---

## Phase 1 — Public Share Firewall (HIGHEST RISK, STANDALONE)
**Ships:** kind-agnostic public share read path. Prod no-op.
**Work components:** (a) partial — the live public surface only.
- `src/lib/share/reconstruct-share-tree.ts:297` — delete the `node.kind === "area" ? … : []` gate; emit `rowsByNodeId.get(node.id) ?? []` for every node.
- `src/components/share/ShareEstimateTreePanel.tsx:85,148` + `ShareEstimateTreeView.tsx:87` — delete the render gates.

**Why standalone:** this is the LIVE public/publication path that understates client-facing money. It is the single most important PR in the effort; isolating it lets a reviewer verify it against the oracle with nothing else in the diff. Gate-removal is **monotonic** — it can only ever add rows, never drop — so it is safe to keep even if a later phase reverts.
**Data-safety:** DB still enforces two kinds ⇒ `rowsByNodeId.get(id)` is empty for any non-area node ⇒ byte-identical share output today. Window stays shut.
**Rollback:** clean `git revert`.
**Verification gate:** oracle share-reconstruct output unchanged; synthetic mixed-node fixture test proves rows now survive (forward proof).
**User value:** none visible yet (no mixed nodes exist) — but the firewall on client-facing totals is now permanent.

---

## Phase 2 — Remaining Silent-Drop Read Paths (export + charts + workshop render)
**Work components:** (a) partial.
- `src/lib/proposal-export/build-proposal-export-model.ts:265` — drop area gate on proposal rows.
- `src/lib/project-charts/aggregate-project-charts.ts:175/256/309` + `project-charts-repository.ts:213` — drop area gates (fix chart under/over-count).
- `src/components/workshop/estimate-sheet/rows/branch.tsx:79` — `canReceiveRows` render gate → always allow (substrate already renders a row table in every node).

**Data-safety:** same no-op logic; all silent-drop reads now kind-agnostic. Window shut.
**Rollback:** clean per-file `git revert`; monotonic.
**Verification gate:** oracle export + chart aggregates unchanged on all-area; mixed-node fixtures prove parity.
**User value:** none yet.

---

## Phase 3 — Throw Paths + Activity-Scope Stabilization (constraint 6)
**Work components:** (a) remainder, (d) partial — the *semantics* slice.
- `src/lib/domain/estimate-mutations.ts:12` — remove the `canNodeReceiveRows` THROW in `moveEstimateRowItem` (optimistic row-drag would crash on a non-area target).
- `src/components/workshop/estimate-tree-data.ts:409` — `validateEstimateTreeHierarchy` no longer ERRORs on rows-on-non-area.
- `src/components/workshop/EstimateSheetContent.tsx:413/427` — make `includeDescendants` a **stored, stable user choice**, NOT derived from `node.kind === "group"` / has-children; decouple row *emission* (:427) from kind. **Critical:** fix this *now*, while the tree is still all-area, so the activity cache key `node:{id}:{desc|direct}` (line ~1006) never becomes time-varying and no activity history is poisoned retroactively. This cannot be retrofitted cleanly after users accrue history.

**Why throw-paths are split from silent-drops:** a crash-on-drag is a worse failure mode than a silent miscount; isolating it makes a regression independently attributable.
**Data-safety:** still pre-migration, all-area; persisted-scope default reproduces today's behavior. Window shut.
**Rollback:** clean `git revert`; the persisted `includeDescendants` column is additive and back-compatible.
**Verification gate:** oracle activity cache keys stable across child-add; row-move no longer throws on fixture; `bun run validate`.
**User value:** none visible yet — but the scope-semantics landmine is defused.

---

## Phase 4 — Mixed-Content Layout + "Area" Vocabulary (THE USER WIN, fully reversible)
**Work components:** (d) presentation, (e).
- Layout (`branch.tsx`, estimate-sheet render): rows-first ordering, one icon, conditional caret, unified empty state, sticky-offset cascade, own-rows-vs-child-rows visual distinction.
- Vocabulary rename to **"Area"**; drop "Group"/"Node" from user-facing copy.

**Why here:** this is the earliest point the user *feels* the simplification, and it lands entirely on existing all-area trees **inside the clean-rollback corridor**, before any irreversible step. This is the graft that answers Route 1/2's "time-to-value" advantage without taking their irreversibility risk. **Mitigation for the Phase-4→Phase-6 promise gap:** hold suggestive empty-state copy ("Add a row or a sub-area") until Phase 6 enables creating mixed content — so users aren't shown an affordance that doesn't yet work.
**Data-safety:** pure presentation + copy; zero data semantics, zero schema. Window shut.
**Rollback:** clean `git revert`.
**Verification gate:** gated e2e smokes on the new layout; visual parity on all-area trees; `bun run validate`.
**User value:** **HIGH — the full Area/mixed-layout simplification ships, at zero data risk.**

---

## Phase 5 — The Relax-Only Migration (estimate + template LOCKSTEP). ⚠️ APPROACHES the line.
**Ships:** DDL that *permits* mixed content. Ships **zero write capability** (create/write flow withheld to Phase 6).
**Work components:** (b), (f), (h) final, (g) migration-integrity tests.

**Apply procedure (Route-2 runbook rigor grafted in):**
1. **HARD-GATE integrity pre-flight (BLOCKING):** re-run the Phase-0 probe against *current* prod — both `estimate_nodes` and `estimate_template_nodes` must return **0** mixed nodes. If non-zero, ABORT — the "reversible-until-first-write" guarantee is void.
2. **Dry-run the full migration on the Supabase verification branch** (MCP `apply_migration` on branch), restore-drill the dump on the branch, run the oracle against branch data.
3. **Freeze writes** for the cohort (brief maintenance window — acceptable per constraint 7).
4. **Take the fresh manual logical dump** immediately pre-apply (the ONLY rollback artifact; PITR is off).
5. **Apply the migration to prod.**

**The DDL — both trees move together (constraint 5, verified at foundation L208/L830):**
- `estimate_nodes`: drop active-kind check; rewrite `validate_estimate_node_tree` to keep ONLY missing-parent / cross-tab / cycle checks; drop the area-row trigger; relax `insert_estimate_row_item_with_history` and the reorder-hierarchy block.
- `estimate_template_nodes`: drop active-kind check; rewrite `validate_estimate_template_tree` identically; drop `enforce_estimate_template_row_item_area_node`; relax both template-insert group-target guards.
- **Template MUST move in this same migration** because `save-as-template` (`src/lib/component-library/actions.ts`, copy path hitting `validate_estimate_template_tree` at foundation L830) copies estimate subtrees into template tables. If the estimate side allowed rows-on-group while template triggers still rejected them, save-as-template would break the instant a relaxed estimate is templated. (f) template-editor UI parity ships in this same release so editor and schema never disagree.
- Rewrite the two brittle migration-contract tests to assert the **one-kind** contract (already neutralized in Phase 0; here they get their final positive assertions). Add migration data-integrity tests (row counts unchanged, orphan scan, function/trigger DDL matches expected).

**Why still data-safe — this is the subtle, decisive point:** the migration is **relax-only** and ships **no write path**. Every read is already kind-agnostic (Phases 1–3, oracle-proven). So at this instant: (1) becomes *true* but no code can *create* a mixed node, and (2) is already *false* everywhere. The window's conjunction is never satisfied. **And the DDL is still cleanly reversible** — re-adding the old constraints SUCCEEDS because no row violates them yet (no mixed node exists).
**Rollback:** abort = restore the fresh dump + revert app deploy; re-adding old constraints succeeds (no violating data). This is the **last clean abort point**.
**Verification gate:** branch dry-run + restore drill green; post-apply integrity check (row counts, orphans, DDL match); oracle reproduced with only documented monotonic deltas; `bun run validate` + targeted vitest + gated e2e.
**User value:** none new visible (writes still withheld) — deliberately value-less so the irreversible step carries the least surprise and is independently diagnosable.

---

## 🚨 PHASE 6 — Enable Writes / Create Flow. **THE SINGLE POINT OF NO RETURN.**
**Ships:** the ability to *create* a mixed-content node. This is the trapdoor.
**Work components:** (c).
- Remove `canNestEstimateNodeKind`, the "select a group first" guard, the area-row write guards.
- Single **"Add Area"** flow; delete the wrap-template machinery and now-dead helpers (`canNodeReceiveRows`, etc.).

**Point of no return:** the **first production save of a mixed-content node** — possible only after Phase 5 AND Phase 6 are both live. From this instant, constraint 2 bites: old constraints fail to re-apply on real mixed data, and the dump goes stale. Recovery becomes **forward-fix only**.
**Why this is the safest possible moment to cross it:** every read path is already kind-agnostic and oracle-proven (Phases 1–3), the layout/vocab is already shipped and validated (Phase 4), the schema is already relaxed and integrity-checked in *isolation* (Phase 5), templates are in lockstep, and the cohort is tiny. A failure here is attributable to the *write flow alone* — not entangled with migration or read regressions.
**Data-safety:** the conjunction (1)∧(2) can finally be created, but (2) is false everywhere, so a created mixed node meets only correct reads. The window is *defined out of existence*.
**Rollback:** revert the Phase-6 PR to **re-close write capability** (stops *new* mixed nodes immediately); any mixed nodes already created are read correctly by the shipped kind-agnostic paths, so no data loss even mid-rollback. Schema rollback is gone, but data integrity is intact.
**Verification gate:** end-to-end mixed-content create → share → export → chart → snapshot parity against the oracle (now with intentional mixed-content deltas); single-Add e2e; cycle + cross-tab regression on the rewritten validators; `bun run validate`.
**User value:** **the feature is fully live** — users create unified Areas holding both child Areas and cost rows.

---

## Brittle-test churn — how it's handled
Neutralized **once, up front (Phase 0)** by replacing 138 source-string asserts and the migration-text asserts with a behavioral golden-master oracle. The oracle becomes the regression spine every phase reproduces. Final positive one-kind assertions land in Phase 5 *exactly when the migration text changes* — so the contract tests are rewritten once, not churned across every phase.

## Template lockstep — how it moves
Template DB triggers (`validate_estimate_template_tree`, `enforce_estimate_template_row_item_area_node`, both insert group-target guards) relax in the **same migration** as the estimate side (Phase 5), and template-editor UI parity (f) ships in that same release. There is never a production instant where the estimate schema and template schema disagree — which is what keeps `save-as-template` (actions.ts copy path → foundation L830) from breaking.

## Pre-migration dump + Supabase-branch
Dump is the ONLY rollback artifact (PITR off). It is taken **fresh, immediately pre-apply, against frozen writes** (Phase 5 Step 4), gated behind a **branch dry-run + restore drill** (Step 2) and a **blocking prod integrity pre-flight** (Step 1). The branch (created in Phase 0) rehearses the entire irreversible DDL before prod ever sees it.

## Why this beats the alternatives
- **vs Route 1 (Expand-Contract):** Route 1 fuses migration + writes + layout + vocab + template + test-rewrites into ONE big-bang PR that *also crosses the no-return line* — the least-reviewable PR is the one you can never undo. This route splits the relax-only DDL (Phase 5, value-less, reversible-until-first-write) from the first mixed write (Phase 6, the trapdoor), so the irreversible step is small, isolated, and diagnosable.
- **vs Route 2 (Big-Bang):** Route 2's safety reduces to one high-pressure human reopen-gate with no automated interlock; a single ordering slip (e.g. reopening before confirming template guards relaxed) opens the window directly on the live public share path. This route makes reads-before-writes a *structural property of shipped, verified prior phases* — not a runbook step. The highest-risk share fix (Phase 1) gets dedicated isolated prod exposure before any mixed data can exist.
- **Net:** longest clean-rollback corridor (Phases 0–5), smallest blast radius per deploy, the irreversible step is value-less and separately revertible, the user win lands early and reversibly (Phase 4), and the proof that no row or dollar is lost is mechanized by the golden-master oracle from Phase 0 onward.

**Relevant files (absolute):**
- `/Users/philiplewis/Documents/archestimator/src/lib/share/reconstruct-share-tree.ts` (L297)
- `/Users/philiplewis/Documents/archestimator/src/components/share/ShareEstimateTreePanel.tsx`, `ShareEstimateTreeView.tsx`
- `/Users/philiplewis/Documents/archestimator/src/lib/proposal-export/build-proposal-export-model.ts` (L265)
- `/Users/philiplewis/Documents/archestimator/src/lib/project-charts/aggregate-project-charts.ts`, `project-charts-repository.ts`
- `/Users/philiplewis/Documents/archestimator/src/components/workshop/estimate-sheet/rows/branch.tsx` (L79)
- `/Users/philiplewis/Documents/archestimator/src/lib/domain/estimate-mutations.ts` (L12)
- `/Users/philiplewis/Documents/archestimator/src/components/workshop/estimate-tree-data.ts` (L409)
- `/Users/philiplewis/Documents/archestimator/src/components/workshop/EstimateSheetContent.tsx` (L413/427/~1006)
- `/Users/philiplewis/Documents/archestimator/src/lib/component-library/actions.ts` (save-as-template copy path)
- `/Users/philiplewis/Documents/archestimator/supabase/migrations/20260612094734_estimate_tabs_foundation.sql` (L208 `validate_estimate_node_tree`, L830 `validate_estimate_template_tree`)
- `/Users/philiplewis/Documents/archestimator/tests/vitest/live-estimate-node-route.test.ts`, `tests/vitest/supabase-performance-migrations.test.ts`
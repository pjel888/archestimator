# Handoff prompt — deepen the unification plan

Paste the block below into a codebase-aware AI (it has live repo access; use that to ground-truth everything). It is written to be copy-pasteable and self-contained.

---

````text
# MISSION

You are deepening an existing, well-researched implementation plan for a large refactor in the Archestimator codebase (Next.js + Bun + Supabase/Postgres at /Users/philiplewis/Documents/archestimator). The committed decision is FINAL and not up for debate: collapse the estimate sheet tree's two node kinds (`group` + `area`) into ONE node type, where every node may hold BOTH child nodes AND cost line items (`estimate_row_items`). User-facing name: "Area". AI/package-builder surfaces are OUT OF SCOPE (dormant in beta). Your job is to make the plan implementation-ready by closing concrete gaps — NOT to re-litigate the approach.

You have something the planning AI did not: direct access to run code, grep, read exact lines, apply migrations to a Supabase branch, and run the test suite. USE IT. The biggest value you add is ground-truthing claims and producing concrete artifacts.

# READ FIRST (in this order)

Plan (the deliverable you're improving):
- .ai/03_plans/2026-06-13-Estimate-Tree-Single-Node-Unification/00_INDEX.md
- .../01_PROBLEM_GOALS_AND_INVARIANTS.md
- .../02_BLAST_RADIUS_AND_DESIGN.md
- .../03_IMPLEMENTATION_ROUTE.md   <- the route is the spine; respect it
- .../04_DIMENSIONS_RISKS_ROLLOUT.md

Backing research (do not duplicate; cite/extend it):
- .ai/13_research/single-node-type-sheet-tree-2026-06-13/implementation-research/00-README.md (index)
- 01-migration-and-data-safety.md, 02-export-and-charts-rework.md, 03-mixed-content-layout.md,
  04-blast-radius-file-by-file.md, 05-naming-and-create-flow.md, 06-cross-cutting-testing-a11y-rollout.md
- V1..V4 (adversarial verifications — these caught real bugs; honor them)
- R0-final-recommended-route.md (the chosen sequencing) + R-scorecards.md

Repo context: AGENTS.md, .ai/10_state/decisions.md (esp. the 2026-05-20 two-kind entry being superseded, and the 2026-05-24 RPC-owned-history rule), DESIGN.md, PRODUCT.md (WCAG 2.1 AA, 3px radius, ≤12px type, no orange, spreadsheet-like).

# WHAT IS ALREADY SOLID — DO NOT REDO

- The sequencing route ("Reads-First, Migration-Late", Phases 0–7) — chosen via a scored 3-route judge panel. Keep it.
- The migration shape and the kind-column / enum decisions (keep `kind` vestigial; freeze the enum; relax-only DDL).
- The file-by-file blast-radius inventory and the DELETE/SIMPLIFY/CHANGE tally.
- The naming decision ("Area") and the ~40-string vocabulary table.
- The adversarial findings (V1 share data-loss, V2 totals double-count/merge, V3 activity-scope cache bug + sticky collision, V4 unlisted guards). These are correct; build on them.

# NON-NEGOTIABLE INVARIANTS — DO NOT "IMPROVE" THESE AWAY

1. The data-loss window logic: rows vanish only when (DB-allows-rows-on-children) AND (a read path still gates on kind==='area'). Read paths MUST be made kind-agnostic and verified as prod no-ops BEFORE the migration. Never propose shipping the migration before the read-path fixes.
2. The migration is FORWARD-ONLY (Supabase PITR is disabled per AGENTS.md). Keep the relax-only-migration (Phase 5) SEPARATE from enable-writes (Phase 6). Do not merge them.
3. Preserved invariants: cycle prevention, cross-tab isolation, missing-parent, RPC-owned `_with_history` mutations, RLS / SECURITY DEFINER grants, the canonical cost formula. Don't drop any of these.
4. Template tree (estimate_template_nodes + validate_estimate_template_tree + triggers + editor UI) must unify in LOCKSTEP with the estimate side in the same migration/release (save-as-template breaks otherwise).
5. Do NOT touch the dormant snapshot/version-control v2 stack or the AI package-builder (out of scope; re-defining the dormant stack risks awakening it).

# GAPS TO CLOSE — PRIORITIZED

## P0 — Ground-truth + the proof artifact (highest leverage)
1. Re-anchor EVERY file:line reference in the plan/research against the CURRENT code. A verifier already warned some navigation line numbers drift even when the code content matches. For each cited site, confirm the symbol exists and update the anchor. Produce a corrected anchor table. Pay special attention to: src/lib/share/reconstruct-share-tree.ts (the area row gate), src/lib/domain/estimate-mutations.ts (moveEstimateRowItem throw), src/components/workshop/estimate-tree-data.ts (validateEstimateTreeHierarchy), src/components/workshop/EstimateSheetContent.tsx (includeDescendants + the row-emission gate + the activity cache key), src/lib/project-charts/aggregate-project-charts.ts (the raw row.kind sum), supabase/migrations/20260612094734_estimate_tabs_foundation.sql (validate_estimate_node_tree + validate_estimate_template_tree).
2. DESIGN THE GOLDEN-MASTER ORACLE concretely (it is the proof mechanism of the whole route, currently only described). Specify: the exact fixture trees (incl. a synthetic mixed-content node), the serialized outputs captured (estimate_sheet_total, reconstruct-share-tree output, proposal-export model, chart aggregates, activity-scope cache keys), where the snapshots live, and how byte-parity is asserted in vitest. Write the oracle test file skeleton.
3. WRITE THE FULL MIGRATION SQL. Research 01 gives the structure but elides function bodies as "...identical to..."; produce the complete `create or replace` bodies by copying the current authoritative definitions and removing exactly the marked blocks. Then APPLY it on a Supabase branch (MCP create_branch / apply_migration), regenerate types, and report whether `bun run validate` passes. Capture the actual integrity-assertion-block results on branch data.

## P1 — Unresolved design decisions (need a concrete answer, not prose)
4. activity-scope `includeDescendants` "stable stored user choice": decide and specify the EXACT storage mechanism (Zustand scoped store? a persisted user/estimate preference? localStorage?), the default value, and how it stays back-compatible with the existing `node:{id}:{desc|direct}` cache key. This is currently hand-waved as "additive".
5. Five-totals-surface reconciliation: V2 found the snapshot RPC (estimate_sheet_total / version-control) DROPS contingency, so it already disagrees with export/charts/in-app for contingency rows. Decide explicitly: in-scope to fix in this change-set, or formally deferred with a tracked issue? Don't leave it ambiguous.
6. "By space" chart semantics for a node that has BOTH children and own rows: define the exact bucketing/aggregation rule and what the chart renders (the research proposed "own rows form an implicit bucket" — make it concrete, with a worked example, and confirm it can't double-count).
7. Proposal export DOCUMENT structure for a mixed node (a node that is both a section heading and has its own line items): design what the exported PDF/XLSX actually looks like, and how consolidation marks container-level vs leaf-level provenance (V2 CE2). Tie to the canonical formula.
8. Generated-types reconciliation: `kind` is a required enum in src/lib/supabase/types.ts. The plan widens the TS domain type to optional string while keeping the DB enum. Audit every consumer of the generated `kind` type and confirm the widening doesn't break type-checking; specify the exact type changes.

## P2 — Missing concrete artifacts
9. Test migration map: for EACH affected vitest/e2e file (estimate-tree-data, estimate-tree-modal, estimate-template-drop-zones, estimate-tree-reorder, estimate-tree-context-menu, estimate-sheet-library-insert, live-estimate-node-route, supabase-performance-migrations), list the specific assertions that break and the exact replacement, plus the NEW test files (mixed-content, rows-at-any-depth parity, single-Add, migration integrity, cycle+cross-tab regression) with their assertion outlines.
10. Mixed-content layout component spec: turn the verbal design into a concrete spec — the sticky-offset cascade implementation, the "own items" vs child-rows visual affordance, the one-icon + conditional-caret rendering, the unified empty state copy/markup. Screenshots/wireframes welcome (a dev server runs via `bun run dev`; the route is /workshop/projects/22222222-2222-4222-8222-222222222222/estimates/5918520a-cf63-4605-a1e1-ac0277daccaa with ARCHESTIMATOR_DEV_AUTH_EMAIL dev auth).
11. a11y spec for the mixed node: how a screen reader announces "this node has rows AND N sub-areas", focus order in rows-first layout, the single-Add aria-label.
12. The write-freeze mechanism for the Phase-5 maintenance window: how is it actually enforced (maintenance page? app flag? RLS revoke?). Specify.
13. Rollback runbook: write the actual pre-migration `pg_dump` command (flags, tables), the restore procedure, and the decision tree for "Phase 6 failed after a real mixed node exists" (forward-fix steps).
14. Template-editor UI parity: detail the editor-side changes (TemplateStructureTree, use-template-editor, template-editor-model, TemplateEditorSheet/Client) to the same depth as the estimate side.
15. Per-phase effort sizing (rough t-shirt or hours) and a suggested PR sequence with reviewer notes.

# HOW TO WORK

- Verify before asserting. Run grep/read against the actual files; if a plan claim is wrong, correct it and note the correction.
- Prefer producing concrete artifacts (SQL, test files, oracle, component spec, runbook) over more prose.
- Keep the route's data-safety property intact (reads-agnostic before writes; relax-only migration before enable-writes). If you think the sequencing can be improved, argue it explicitly against R0 — don't silently change it.
- Use the code-review-graph / gitnexus MCP tools (per CLAUDE.md) and run `bun run validate` to prove claims.
- Edit the plan docs in place (.ai/03_plans/2026-06-13-Estimate-Tree-Single-Node-Unification/) and add new artifacts as numbered files; keep research under .ai/13_research/... .

# DELIVERABLES

1. A corrected file:line anchor table (P0.1).
2. The golden-master oracle test file + fixtures (P0.2).
3. The complete migration SQL, applied and validated on a Supabase branch, with results (P0.3).
4. Concrete answers (with rationale) to the P1 design decisions, folded into the plan docs.
5. The P2 artifacts (test map, layout/a11y spec, runbook, template-editor detail, effort sizing).
6. A short "what changed and why" changelog at the top of 00_INDEX.md.

Confirm you've read the plan + V1–V4 before starting, then begin with P0.
````

---

## Notes for Philip (not part of the prompt)

- The single biggest missing artifact is the **golden-master oracle** — it's the thing that *proves* no row/dollar is lost, and right now it's only described. Whoever builds that de-risks the most.
- The other AI's real advantage is **running things** (apply the migration on a branch, run `bun run validate`, screenshot the layout). The plan was built by agents reading code; live execution will catch anything stale.
- Don't let it re-open the **sequencing** or the **two-vs-one** decision — those are settled and the prompt says so. If it proposes merging Phase 5 and 6, that's a red flag (it breaks the forward-only safety).

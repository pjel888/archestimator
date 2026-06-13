# Research: One node type vs. two (group + area) for the estimate sheet tree

**Created:** 2026-06-13
**Question:** Should we combine `group` and `area` into a single estimate-node type? Is that good for UX/UI, performance, codebase, and database schema?
**Verdict:** **No — keep two kinds.** Fix the real friction (auto-wrap, premature classification) with interaction-level changes, not a data-model rewrite. Full unification is a modest, partly-illusory code win that is performance-neutral but reverses a deliberate domain decision and introduces an unsolved mixed-content-node UX problem.

## Contents

| Doc | What it covers |
|---|---|
| [`00-recommendation.md`](00-recommendation.md) | **Start here.** Executive summary, per-dimension scorecard, the 4-option spectrum (status quo → friction-fix → relax-one-rule → full unification), final call, and the conditions that would flip it |
| [`01-database-and-schema-findings.md`](01-database-and-schema-findings.md) | Postgres/Supabase blast radius: triggers, constraints, RPCs, migration shape, data/rollback risk, performance, the 3 new invariant problems |
| [`02-codebase-blast-radius.md`](02-codebase-blast-radius.md) | ~221 branch points across ~38 files; what deletes cleanly vs. what converts type-checks into murkier data-checks; AI-builder regression risk |
| [`03-ux-ui-findings.md`](03-ux-ui-findings.md) | Group-vs-area UX model, the friction it causes, the mixed-content layout crux, domain-fit vs. Notion/file-system/typed-hierarchy models |
| [`04-product-history-and-rationale.md`](04-product-history-and-rationale.md) | The 6→2 consolidation history, the owner-approved ADR, the BOQ domain meaning of `area`, and that one-type was never proposed |

## Method

Four parallel codebase deep-dives (one per facet) plus direct reads of the core schema, triggers, tree-building, render layer, and `.ai/` decision records. Key code anchors: [`supabase/migrations/20260520222038_enforce_two_kind_estimate_nodes.sql`](../../../supabase/migrations/20260520222038_enforce_two_kind_estimate_nodes.sql), [`src/lib/estimates/tree-hierarchy.ts`](../../../src/lib/estimates/tree-hierarchy.ts), [`src/lib/estimates/actions.ts`](../../../src/lib/estimates/actions.ts), [`src/components/workshop/estimate-sheet/rows/branch.tsx`](../../../src/components/workshop/estimate-sheet/rows/branch.tsx).

## One-line answer for each dimension asked

- **Database schema:** mildly *simpler* (fewer guards), but offloads discipline to the app — neutral-to-slightly-positive, not a reason to do it.
- **Performance:** a *wash* — totals already sum flat, render already attaches rows to any node, indexes unaffected.
- **Codebase:** ~300–400 lines out (mostly auto-wrap), but ~35 type-checks become ambiguous data-checks + AI regression risk — *mild* win.
- **UX/UI:** removes friction but introduces the mixed-content layout problem and erodes BOQ-fit clarity — *leans negative*.
- **Product/domain:** reverses a deliberate, recent, owner-approved decision; `area` is a real QS concept — *argues against*.

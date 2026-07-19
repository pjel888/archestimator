# Plan 030 (Direction Spike): Cost intelligence layer — aggregate the price-history + estimate-row + AI-memory data

> **Executor instructions**: This is a **design/spike plan**. Investigate,
> produce the first-slice design + repository query contract + open questions.
> Do NOT build the full surface. When done, update the status row in `README.md`.

## Status

- **Priority**: P2 (direction — differentiator)
- **Effort**: L (full surface); M for a first useful slice
- **Risk**: MED
- **Depends on**: none (but pairs with 032 AEC taxonomy and 033 Ask Flip)
- **Category**: direction
- **Planned at**: commit `0a2667db9`, 2026-07-17

## Why this matters (the grounded signal)

This is the product's stated reason to exist, and every input is already
populated but never aggregated:

- `README.md:331` — "Surfacing accumulated cost intelligence by client, project type, and supplier | Planned."
- `README.md:3-4` (headline brand promise) — "The more you estimate, the more it knows your clients, your project types, and your prices, so every new proposal starts ahead."

Data infrastructure already built and populated:
- `cost_library_item_price_history` table — migration `0028_component_library_action_support.sql:92`, indexed `(item_id, created_at DESC)`.
- Per-item price history surfaced at `src/components/workshop/library/ComponentInspectorDock.tsx:121-122`.
- Estimate-health evaluator computes per-row price freshness + provenance ratios — `src/lib/estimate-health/evaluate-estimate-health.ts:53-57`.
- AI package-builder records accept/reject signals per component/room — `src/lib/ai/package-builder/memory.ts` (`PackageBuilderComponentMemorySignal`).
- AI read tools already search `search_historical_estimate_rows` + `search_comparable_estimate_packages` — `src/lib/ai/package-builder/read-tools.ts`.

**Impact:** No surface answers "what do I typically charge Client X for kitchens" or "which supplier is trending up." The component-level history view is the only tip exposed. This is the differentiator vs spreadsheets and the moat for the AI package-builder (which otherwise drifts toward generic LLM output).

## Scope

**In scope** (first-slice design deliverables):
1. **One read-only repository function** — given a workspace + grouping axis (client | supplier | category | room), return median / last-n unit costs with sample counts + freshness, reusing `cost_library_item_price_history` + the estimate-row tables.
2. **A prototype view** — where the first slice surfaces (recommend: a tab on the existing project-charts surface `src/lib/project-charts/`, which already has comparison/insight machinery at `build-insight-sentence.ts`).
3. **Authz** — workspace-scoped aggregation (the app has no RLS per `README.md:270`; the workspace boundary must be enforced in the query).
4. **Pagination / index verification** — confirm the aggregation query is indexed for the grouping axes; flag any missing index as a follow-up migration.
5. **Open questions** (below).

**Out of scope**:
- The full dashboard (multi-axis drill-down, charts, exports) — that's L effort, follow-on.
- The AI consumer (that's plan 033 / Ask Flip).

## Questions to answer in the design

1. Which axis is the highest-value first slice? (Recommend: supplier — "which supplier is cheapest/trending," directly actionable.) Client is second (commercially sensitive — needs the workspace boundary airtight).
2. Does this live behind a Pro tier gate? (`README.md` says AI/cost-intelligence enters at Pro and up — confirm the gating mechanism.)
3. What's the freshness window for "trending" computations (last 30/90 days)?
4. Are medians computed in D1 (SQL) or in TS after a bounded fetch? (D1 for large workspaces; TS is fine for small.)
5. Does the aggregation reuse the AI read-tools' historical-search helpers, or is it a parallel path?

## Deliverable shape

A design doc with the repository function signature, the SQL sketch (with index
verification against `migrations/`), the prototype view placement, the authz
boundary, and the open questions with recommendations. Plus a clearly-marked
throwaway prototype of the repository function to validate the query plan
(allowed — it's investigation, not production code).

## Done criteria

- [ ] The design doc exists with the function contract, SQL sketch, view placement, authz.
- [ ] Index coverage is verified against `migrations/` (cite the migration that
      covers each grouping axis, or flag a missing-index follow-up).
- [ ] The Pro-tier gating question is answered (or explicitly flagged for the maintainer).
- [ ] The throwaway prototype validates the query is bounded (no unbounded scans).
- [ ] Open questions are explicit with recommendations.
- [ ] `README.md` status row updated to DONE (spike).

## STOP conditions

- The aggregation can't be expressed without a full-table scan over a large
  estimate-row table — document the missing index and recommend the migration as
  a prerequisite before any implementation.
- The workspace-scoping authz can't be enforced cleanly in the aggregation query
  (would leak cross-workspace aggregates) — STOP; this is a security gate.

## Maintenance notes

- This spike + 032 (taxonomy) + 033 (Ask Flip) form the "cost intelligence" cluster
  the README's headline promise depends on. Recommend sequencing this first.
- The implementation of the full surface is a feature plan-pack (L effort, UX
  design needed); this spike de-risks the data + authz layer.
- Reviewer: confirm the authz boundary is airtight and the query is indexed.

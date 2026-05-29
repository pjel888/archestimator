# 11 — Test Data & Fixture Specification (Post-Audit Addition)
**Date:** 2026-05-29 (added during comprehensive audit; directly driven by independent general-purpose testing subagent ID 019e71a3-285f-7cc3-a76f-3af11f1df406)
**Status:** New additive high-priority document.
**Trigger:** The testing strategy subagent identified a critical gap in data quality for the highest-risk assumption (designation-based tree reconstruction). Lewis Residence seed populates tree nodes only; many publication snapshots will have null/empty/inconsistent `designation` values. The original 07 and 04 assume populated data for hierarchy tests but provide no canonical fixtures or guarantees.

This document defines the required test data strategy that **must** be in place before P3 (Tree View) and strongly recommended before P1 (extraction) and P2 (sub-tabs).

**Relationship to other new docs:** Directly supports `10-fidelity-audit-and-tree-reconstruction-spec.md` (fidelity comparison requires reliable fixtures) and the new "Pre-Implementation Graph-Driven Test Audit" section recommended for 07-validation-and-testing-plan.md.

---

## 1. Problem Statement

- `reconstructTreeFromRows` (and the discipline fallback) in the plan's proposed `src/lib/share/reconstruct-share-tree.ts` is **entirely dependent** on the quality and structure of `designation` values in `PublicationSnapshotRow[]`.
- Real data sources (per `current-state.md`, `decisions.md`, snapshot.ts:54, estimates/actions.ts, AI package apply):
  - Lewis Residence migration intentionally populates *tree nodes only* (no row items initially).
  - Later seeds (chart demo) and AI Apply often produce rows with `designation = ""`, `"AI allowance"`, or simple room names without " > " hierarchy delimiters.
  - Manual workshop entry may produce consistent Area names, but not guaranteed "Group > Area" strings.
- Without controlled, reproducible fixtures that cover the full range of designation patterns (rich hierarchy, partial, flat, null, inconsistent delimiters), unit tests for reconstruction, fidelity comparisons, and integration tests in enhanced `SharePageTabs` will be weak or misleading.

---

## 2. Required Fixture Categories

All fixtures must be plain TypeScript objects (no DB dependency for unit tests) exportable from a central location (e.g., `tests/fixtures/publication-snapshots.ts` or inside the new share lib test utils).

**Core Categories (minimum):**

1. **Rich Hierarchical** — Multiple "Group > Area" patterns with realistic row distribution. Example:
   ```ts
   designation: "House > Living Room"
   designation: "House > Kitchen"
   designation: "Site Works > Site Preparation"
   ```

2. **Flat / Area-Only** — Simple room names without delimiters (common real-world case).

3. **Null / Empty / Unassigned** — Mix of `null`, `""`, and whitespace-only for testing "Unassigned" + discipline fallback logic.

4. **Inconsistent Delimiters** — Mix of " > ", ">", " - ", " / " to force normalization decisions or explicit test coverage.

5. **Lewis-Representative** — Snapshot shape that mirrors what a real published Lewis Residence estimate would produce today (tree nodes exist, but row designations may be minimal or absent).

6. **Large / Stress** — 300–500 rows (for perf + graceful degradation in tree rendering and aggregation).

7. **Single-Discipline / Edge Totals** — All rows in one discipline, zero-cost rows, negative contingency edge cases (for chart + tree total rollups).

Each fixture must include:
- The raw `rows: PublicationSnapshotRow[]`
- Expected `aggregateRowsByDiscipline` output (for chart tests)
- Expected `reconstructTreeFromRows` (or fallback) output shape (node count, structure, rolled-up totals, row preservation)
- A human-readable description + source scenario

---

## 3. Usage Requirements

- **Unit tests** for `reconstruct*` and `aggregate*` must import and assert against these fixtures (not ad-hoc inline data).
- **Fidelity audit** (see new 10-) must use at least categories 1, 5, and 6.
- **Integration tests** in enhanced `SharePageTabs` (per-sheet view switching, empty states, totals) must exercise multiple fixture categories.
- **Manual QA** (M6 empty, M7 single discipline, tree navigation) should reference the fixture names for reproducibility.
- When real Lewis row data with better designation becomes available, the "Lewis-Representative" fixture must be updated (or a new snapshot-based fixture added) and the fidelity report re-run.

---

## 4. Recommended File Placement

- `tests/fixtures/publication-snapshots.ts` (or `src/lib/share/__tests__/fixtures.ts` if kept co-located).
- Update any existing publication test factories to import from this central source.
- Document the fixture module in the new "Pre-Implementation Graph-Driven Test Audit" section of 07.

---

## 5. Success Criteria

Before P3 code begins:
- Fixture module exists with all 7 categories.
- At least the reconstruction unit tests and the new fidelity comparison tests (from 10-) are passing against these fixtures.
- The fixture file is referenced from 07, 10, and the updated 04/05 reconstruction logic comments.

This directly mitigates the data quality risk flagged by the testing subagent and supports the highest-risk assumption (virtual tree reconstruction) identified across the entire audit swarm.

---

**This document is additive and now a required input for high-quality testing of the Tree View and reconstruction logic.** All original plan content remains unchanged. Cross-references: new `10-fidelity-audit-and-tree-reconstruction-spec.md`, recommended updates to `07-validation-and-testing-plan.md`, `12-assumptions-decisions-log.md` (A3/A8), and the master `00-POST-AUDIT...md`.
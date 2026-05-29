# 10 — Fidelity Audit & Tree Reconstruction Specification (Post-Audit Addition)
**Date:** 2026-05-29 (added during comprehensive audit; informed by independent `plan` subagent strategic review)
**Status:** New additive high-priority document. Highest-risk assumption identified across multiple independent audits.
**Trigger:** The core assumption in the original plan pack ("designation-based reconstruction from flat `PublicationSnapshotRow[]` produces useful client hierarchy") was flagged as the **highest risk assumption** by the dedicated strategy/roadmap subagent (ID 019e71a3-3fce-71e1-9fb9-6237a8272e92). It creates a parallel "virtual tree" distinct from the canonical workshop `estimate_nodes` (Group/Area) hierarchy maintained via React Complex Tree + history RPCs.

This document defines the required pre-implementation fidelity audit that **must** complete before P3 (Tree View component) work begins.

**Relationship to other new docs:** Complements `09-ui-primitive-reuse-audit-and-extension-plan.md` (reuse vs duplication) and `08-security-threat-model-for-receiver-ui.md`. All are additive to the original 8-document pack.

---

## 1. Problem Statement (Grounded in Source + Graph Data)

**Current Reality (from `src/lib/publication/types.ts`, `src/app/share/[token]/page.tsx`, workshop tree code, and fresh GitNexus 9,106-node index):**
- `PublicationSnapshotEstimate.rows` is a **flat array** (`schemaVersion: 1`).
- Fields available for reconstruction: `designation` (nullable), `discipline`, `description`, `rowTotal`.
- Live workshop estimate tree: Exactly two technical node kinds (`group` | `area`) in `estimate_nodes`, managed via `EstimateSheetTree.tsx` + `workshop-tree.tsx` (WorkshopTreeRow primitives) + `reorder_estimate_nodes` RPC + history wrappers (`create_estimate_node_with_history`, etc.).
- Workshop-estimate community (per code-review-graph architecture overview): 37 nodes, **low cohesion (0.3137)** — the tree + chart + visual styling logic lives in a loosely coupled but semantically related cluster. Introducing a second independent tree renderer increases maintenance surface.

**Plan Pack Assumption (04 §2, 03 §4.6, 05 §2.2, README):**
> Group rows by `designation` (split on " > " for nesting). Fallback to discipline/"Unassigned". Virtual `ShareTreeNode` with totals. Label as "grouped by designation (not live tree structure)".

**Risk (subagent + main audit consensus):** High likelihood of misleading hierarchy, incorrect ordering (alpha vs user-defined tree order), missing Group-level organization, "Unassigned" artifacts, and long-term drift when proposal-package snapshots or richer snapshot metadata arrive. No evidence (fidelity comparison) exists in the pack that this produces client value better than a well-labeled flat list or discipline-grouped view.

---

## 2. Fidelity Audit Objectives

The audit must answer, with reproducible evidence on real seeded data (Lewis Residence + any other workspace snapshots):

1. **Accuracy**: How closely does `reconstructTreeFromRows` (designation-based) match the actual live `estimate_nodes` hierarchy for the same estimate at publish time?
2. **Ordering Fidelity**: Does alpha sort + virtual grouping preserve the user's intended presentation order (or the order that would appear in a proposal BOQ)?
3. **Coverage**: What % of real Area/Group structure is lost or invented by the reconstruction?
4. **Client Value**: Does the resulting "virtual tree" measurably improve client understanding vs the existing flat Grid Preview (or a simple discipline-grouped list)?
5. **Edge Robustness**: Behavior on missing `designation`, inconsistent delimiters, mixed data, empty sheets, very large sheets (>300 rows).
6. **Future Compatibility**: How brittle is the reconstruction if/when `PublicationSnapshotRow` gains optional tree metadata (e.g., `nodeId`, `parentId`, `kind`, `sortOrder`) for proposal snapshots?

---

## 3. Required Test Vectors & Data

**Primary Dataset (must use):**
- Lewis Residence seeded estimate(s) (ES-001 / ES-002 from migration `20260519173857_populate_lewis_residence_estimate_tree.sql` and later chart demo seed).
- At least one additional real workspace estimate with mixed Group/Area depth and some rows lacking `designation`.

**Test Cases (minimum):**

| ID | Scenario | Expected Observation | Pass Criteria |
|----|----------|----------------------|---------------|
| F1 | Full Lewis tree (known Group → Area structure) | Reconstructed tree vs actual node tree | Quantified diff in depth, node count, parent-child relationships, total ordering. |
| F2 | Rows with `designation = "House > Living Room"` | Correct virtual Group + Area nesting | Visual + data match on structure + rolled-up totals. |
| F3 | Rows with null/empty `designation` | Graceful "Unassigned" or discipline fallback | No crash; clear labeling; totals correct. |
| F4 | Inconsistent delimiter usage (" > " vs ">" vs " - ") | Documented behavior + recommended normalization | Consistent output or explicit warning. |
| F5 | Alpha sort vs user-defined tree order | Side-by-side comparison | Quantify how often order diverges (critical for proposal BOQ feel). |
| F6 | Large sheet simulation (duplicate rows to 400+) | Performance + visual degradation | No OOM, usable on desktop/mobile, graceful fallback option. |
| F7 | Snapshot published before vs after node renames/reorders | Reconstruction stability | Note any staleness vs live tree (inherent limitation). |

**Metrics to Capture:**
- Structural match % (exact parent-child, depth).
- Ordering correlation (Kendall tau or similar on leaf order).
- Rolled-up total accuracy (should be 100% by construction).
- Client comprehension proxy (if any manual testing or expert review).

---

## 4. Audit Deliverables (Mandatory Before P3)

1. **Fidelity Report** (new file or appendix to this doc): Numbers + screenshots + recommendation ("Good enough with labeling", "Needs snapshot enhancement", "Flat + discipline grouping is clearer").
2. **Updated reconstruction utility** (if any normalization or improved heuristics emerge).
3. **UX Copy & Disclaimer Matrix**: Exact text for "Reconstructed from estimate data (may differ from internal workspace view)", empty states, "Unassigned" handling.
4. **Test Fixtures / Snapshot Snapshots**: Reproducible test data (anonymized if necessary) added to the test suite.
5. **Decision Record**: Logged in `12-assumptions-decisions-log.md` (A3 / A8 updates) with owner sign-off.

---

## 5. Recommended Implementation Path (Additive to Original 06-Phased Plan)

Insert as **P0.5 "Fidelity Audit Gate"** (or parallel to late P1 / early P2):

- Before any `ShareEstimateTreeView.tsx` or `reconstruct-share-tree.ts` finalization.
- Use existing publication test infrastructure + snapshot factories.
- Can be executed by implementer or dedicated QA/analyst subagent.
- Exit criteria for P3: Fidelity report approved + disclaimers + labeling implemented in the Tree View component.

This adds minimal calendar time (1–3 days depending on data access) but dramatically reduces the highest identified strategic risk.

---

## 6. Long-Term Recommendation (Strategic)

The subagent report and main audit both note that a **better long-term path** (once proposal-package work advances) is one of:
- Enhance the publication snapshot (additive) with optional tree metadata at publish time (preserves `schemaVersion: 1` for old links).
- Or, for the receiver, adapt/reuse the existing `WorkshopTreeRow` visual primitives + read-only mode rather than a fully separate recursive implementation.

The current plan's fast client-side reconstruction is defensible for V1 speed **only if** paired with the rigorous fidelity audit defined here and honest labeling.

---

**This document is now a blocking prerequisite for any Tree View implementation.** It operationalizes the highest-risk assumption flagged by independent strategic review.

**Additional Evidence from Swarm (2026-05-29)**: The dedicated `explore` subagent (ID 019e71a3-0380-7822-aa0f-0474767a077d) tasked specifically with tracing snapshot construction, designation provenance, and tree fidelity ran for 687.3 seconds and made 336 tool calls before being terminated for "exploratory stagnation" (doom loop). This outcome empirically demonstrates that even extended automated exploration struggles to produce clear answers in this area of the codebase. It significantly raises the priority and justification for the structured, human-guided fidelity audit defined in this document.

Cross-references: `00-POST-AUDIT-STRATEGY-ASSESSMENT-AND-IMPROVEMENT-PLAN.md` (full swarm results including this failure), `09-ui-primitive-reuse-audit-and-extension-plan.md`, `11-test-data-fixture-spec.md`, `12-assumptions-decisions-log.md` (must be updated with audit outcome), original 04-data-model-and-chart-aggregation-plan.md §2, and the V2 predecessor's depth on schema/API assumptions.

All original plan content remains unchanged.
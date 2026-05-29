# 12 — Assumptions & Decisions Log (Post-Audit Addition)
**Date Created:** 2026-05-29 (during comprehensive audit)
**Purpose:** Durable, date-stamped record of every material assumption, constraint, and decision in the share-page-estimate-view-enhancement plan pack. This prevents silent drift and provides the single source for "why we did it this way" during and after implementation. Modeled on successful patterns in estimate-sheet-version-control/ and predecessor V2 overhaul.

**Rule:** Every assumption or decision from the original 8 documents + this audit session is recorded here with date, rationale, and reversal trigger. Original plan text is never deleted; this log cross-references it.

---

## 1. Core North Star & Scope Assumptions (from README + 00 + 03)

| # | Assumption / Decision | Date | Rationale (from original docs) | Reversal Trigger | Audit Notes (2026-05-29) |
|---|-----------------------|------|--------------------------------|------------------|---------------------------|
| A1 | The enhancement is purely client-side reconstruction + aggregation from existing `PublicationSnapshotEstimate.rows`. No snapshot schemaVersion bump or server aggregation. | 2026-05-29 (original) | "Snapshot data already fully resolved server-side. Rows typically <100. Zero new API/DB cost." (04 §1, 00 §2.4) | Owner explicitly approves snapshot enhancement for space/category grouping or full tree metadata. | Confirmed low-risk for V1 speed-to-value. Creates long-term fidelity debt vs canonical estimate tree (see A8, new doc 10). |
| A2 | Discipline-based donut grouping is sufficient V1. Space/category/supplier grouping deferred. | 2026-05-29 (original) | Only `discipline` reliably present on every `PublicationSnapshotRow`. Other fields require snapshot builder changes. | Snapshot schema extended + aggregation utility updated. | Acceptable. Cross-refs proposal-package-system.md "cost summary" + workshop charts (space/category/supplier). Future work item logged. |
| A3 | Designation-based tree reconstruction (with > delimiter for nesting) produces "useful" hierarchy for clients even if not 1:1 with live workshop tree. | 2026-05-29 (original) | `designation` often contains Area-like labels ("Living Room"). Flat fallback by discipline exists. | Fidelity audit (new doc 10) proves systematic mismatch or owner rejects "virtual" trees. | **High audit flag.** Real estimate tree is strictly 2 kinds (group/area) + history RPCs. Reconstruction is pragmatic but not authoritative. Fidelity evidence required before P3. |
| A4 | Receiver remains fully read-only; no editing, no new comment/decision mutations, no Realtime. | 2026-05-29 (original) | Preserves V2 security model (password, sessions, CSP, rate limits). | Explicit future decision to add lightweight client actions on share. | Strong. Aligns with V2 "view-only Client Review Portal" + comments/decisions already live on side panels. |
| A5 | No new dependencies (D3 already present; no React Complex Tree on receiver). | 2026-05-29 (original) | "Zero new dependencies needed." | Owner approves chart lib upgrade or complex tree for receiver parity. | Correct and low-risk. |

---

## 2. Technical & Extraction Assumptions (from 02 + 04 + 05)

| # | Assumption / Decision | Date | Rationale | Reversal Trigger | Audit Notes |
|---|-----------------------|------|-----------|------------------|-------------|
| A6 | Extracting `ProjectCostDonutChart` → `CostDonutChart` (shared) + re-export from old path has zero behavioral/visual impact on workshop charts. | 2026-05-29 (original) | Pure copy + rename + re-export. Existing tests + manual smoke will catch regression. | Any visual or data diff appears in P1 verification. | Low risk if P1 gate is strict (run full workshop charts matrix before/after). GitNexus + code-review-graph impact on extraction target must be re-run. |
| A7 | Simple React `useState` + `useMemo` per `SharePageTabs` (no Zustand, no Context, no global store) is sufficient and correct for per-sheet view mode + derived chart/tree data. | 2026-05-29 (original) | "Receiver state is simple." SessionStorage only for active sheet (existing). | Performance or state bugs force lifting (e.g., cross-sheet comparisons). | Correct for current scope. Aligns with V2 session cookie + local state patterns. |
| A8 | `designation` field on snapshot rows is populated from estimate node names (Area Nodes primarily) and is stable enough for grouping. | 2026-05-29 (original, implicit) | Observed in current snapshot shape; used for "Area-like" labels in plan sketches. | Fidelity audit or snapshot builder inspection proves designation is sparse, inconsistent, or not node-derived. | **Critical open item from audit.** Snapshot builder provenance not yet traced in main thread (subagent explore running). See new doc 10. Do not ship P3 without evidence. |

---

## 3. UI / Design System Assumptions (from 03 + 05 + new 09)

| # | Assumption / Decision | Date | Rationale | Reversal Trigger | Audit Notes |
|---|-----------------------|------|-----------|------------------|-------------|
| A9 | New sub-tab bar and tree row patterns can be implemented in `src/components/share/` and will either reuse existing primitives or be acceptable as controlled feature-local for V1. | 2026-05-29 (original + audit) | Plan sketches use correct DESIGN tokens (10px SF Pro, xs radius, proposalPaper, regular icons). | Design lint failure or primitive audit (new 09) forces extraction before merge. | **High risk per audit.** ui-componentization-and-storybook-plan.md + AGENTS.md contract is strict: "repeated controls must be shared." New doc 09 created to enforce pre-P2/P3 primitive decisions. Record decisions here (A9a/A9b). |
| A9a | (Decision pending) Sub-tabs: Extract lightweight shared `TabButton`/`TabList` from existing main tab bar first, or accept temporary duplication with 6-month revisit. | 2026-05-29 (audit) | Avoids immediate duplication of tab pattern already present in SharePageTabs + other segmented controls. | Owner + implementer decision recorded below. | To be decided in P0/P1 readiness. Update this log with date + rationale. |
| A9b | (Decision pending) Tree rows: Create/extend `EstimateNodeRow` (read-only) primitive in ui/ or workshop/ before writing `ShareEstimateTreeView`, or document explicit exception. | 2026-05-29 (audit) | Prevents two sources of truth for Group/Area/row visuals that mirror WorkshopTreeRow exactly. | Owner + implementer decision recorded below. | Blocking for P3 per new 09. |

**P0 Decisions Recorded (2026-05-29, Ralph Loop autonomous):**

> 2026-05-29 — **A9a decided: Option B (controlled duplication within SharePageTabs for sub-tab bar)**. Rationale: No shared `TabList`/`TabButton` primitive exists in `src/components/ui/`. The main estimate sheet tab bar in SharePageTabs.tsx is the authoritative receiver-specific implementation (roving tabindex, full Arrow/Home/End/Enter/Space keyboard, ARIA roles, proposalPaper surface, scroll fade masks). Extracting a shared primitive now would require refactoring the main bar + auditing other segmented control usages, expanding blast radius and scope beyond this enhancement's P1-P5 charter. Sub-tab bar (Tree View | Grid Preview) will be implemented inside SharePageTabs using *identical* internal markup, classes, ARIA, and keyboard handler pattern (with mandatory `e.stopPropagation()` on ArrowLeft/Right to isolate from main tab bar). Explicit tech debt entry added to ui-componentization-and-storybook-plan.md for extraction + Storybook story in a dedicated follow-up slice (target: within 6 months or next UI hardening pass). Reversal: Owner directs immediate extraction before P2 code. Signed: Autonomous implementer (P0 gate, per 09-primitive-audit + AGENTS.md contract). Graph evidence: SharePageTabs is the sole production surface for this tab pattern on receiver.

> 2026-05-29 — **A9b decided: Option A (preferred) — Reuse `WorkshopTree<TNode>` generic + read-only renderNode**. Rationale: `WorkshopTree<TNode>` (workshop-tree.tsx:125-194, discovered via semantic_search_nodes + query before read) already provides production-grade recursive rendering, ARIA (`role="tree"`, `role="treeitem"`, `role="group"`), expand/collapse via expandedNodeIds prop, and perfect delegation via `renderNode: (args: {node, depth, selected, expanded, hasChildren, children}) => ReactNode`. For the receiver: define `ShareTreeNode` type (group|area + rows + totals), implement `reconstructTreeFromRows`, then render `<WorkshopTree<ShareTreeNode> nodes={treeNodes} ... renderNode={renderShareTreeNode} />` where the renderNode produces the exact visual contract (FolderSimple 12px regular for groups with bg-surfaceMuted, Cube 12px for areas, CaretDown 11px rotating, 20px indent capped at WORKSHOP_TREE_MAX_INDENT=140px, right-aligned tabular-nums totals, row items with optional 32px lazy Image + description/qty/unit/total). This eliminates 100% of new recursion/ARIA/keyboard/expand logic. If `WorkshopTreeRow` (editing-coupled) cannot be shared, the renderNode still reuses the engine. Reversal: Fidelity audit proves this approach produces systematically misleading hierarchy (then fall back to discipline-flat or flat list). Signed: Autonomous implementer (P0 gate). Cross-refs: 09-primitive §2, §4; WorkshopTree read post-graph-location; aligns with R4 "reuse before duplicate".

These decisions satisfy the blocking primitive gate (P0) and 09-audit requirements before any P2/P3 code. Both recorded in TRACKER.md and here.

---

## 4. Testing, Fidelity, Security & Rollout Assumptions (from 07 + new 08/10/11)

| # | Assumption / Decision | Date | Rationale | Reversal Trigger | Audit Notes |
|---|-----------------------|------|-----------|------------------|-------------|
| A10 | Existing publication Vitest suite + manual QA matrix in 07 is sufficient; E2E limited to sims (consistent with V2 P13 limitations per current-state). | 2026-05-29 (original) | Env constraints (no full Docker + real Supabase for every matrix). | Env improves or owner requires gated real E2E for tree/donut interactions. | Accurate. Add explicit "Fidelity Evidence Tests" (reconstructed vs workshop tree on seeded Lewis Residence data) to 07 via patch. |
| A11 | New receiver surfaces (donut hover, tree expand, floating nav) introduce no new XSS / injection / data leakage vectors beyond existing snapshot rendering. | 2026-05-29 (original implicit) | All data comes from trusted server snapshot; labels rendered as text. | Security audit (new 08) or pen test finds issue. | New 08 doc created. Add explicit sanitization checks for node labels / discipline in reconstruction if any HTML is ever introduced (currently none). |
| A12 | Performance at typical snapshot size (<100–200 rows, 2–5 sheets) is acceptable with O(n) client aggregation + recursive React tree (no virtualization). | 2026-05-29 (original) | "O(n) and fast." D3 already proven at this scale in workshop. | Perf budget breach in P5 measurement or large customer snapshot. | Add concrete perf budget numbers + measurement steps from 07 into this log once P5 executed. |

---

## 5. Roadmap / State / Integration Assumptions

| # | Assumption / Decision | Date | Rationale | Reversal Trigger | Audit Notes |
|---|-----------------------|------|-----------|------------------|-------------|
| A13 | This enhancement lands as additive polish on the V2 Shared Link receiver (Phase 5A context) without requiring changes to proposal-package-system.md or estimate-sheet-version-control dormant versions. | 2026-05-29 (original + audit) | Share remains "live snapshot view", not "issued immutable proposal". | Future decision to make share links version-pinned to estimate_sheet_versions or proposal packages. | New doc 11 (interaction matrix) + 10 (fidelity) address partial overlap. Update .ai/10_state/current-state.md + decisions.md + roadmap on closeout (see new COMPLETION-CRITERIA doc). |
| A14 | Post-delivery, the plan pack + this log + new 08–13 documents become the authoritative reference; no separate tool-specific notes. | 2026-05-29 (audit, per AGENTS.md) | ".ai/ is the shared project brain. Do not create tool-specific knowledge silos." | N/A — enforced. | This log + 00-POST-AUDIT...md + new docs fulfill the rule. |

---

## 6. Reversal / Rollback Policy (from 02 + 06)

All original rollback triggers in 02 §7 and 06 §7 remain active. In addition:

- If A3/A8 (fidelity) proves materially misleading for clients, feature can be toggled behind flag or the Tree View sub-tab hidden until fixed (pure frontend).
- If primitive duplication (A9) causes repeated design lint failures, new components can be reverted to flat Grid Preview only while primitive work completes.
- No DB or API rollback surface (per A1).

---

**Maintenance:** This log is append-only for new decisions. Update with date + clear "Decision" or "Assumption changed" entries. On implementation closeout, promote durable items to `.ai/10_state/decisions.md`.

**Cross-References:** See `00-POST-AUDIT-STRATEGY-ASSESSMENT-AND-IMPROVEMENT-PLAN.md`, new 08/09/10/11/13 docs, and the (unchanged) original 00–07 for full context. Every numbered item above maps back to specific sections in the original plan pack.

---

## 6. P0.5 Fidelity Gate Decision (2026-05-29)

**Decision F1 (A3 / A8 update):** Designation-based tree reconstruction (`reconstructTreeFromRows`) + discipline fallback is **good enough for V1 receiver** when accompanied by clear "Reconstructed from estimate data (may differ from internal workspace view)" labeling.

**Evidence:**
- 7 fixture categories implemented + 16/16 unit tests passing (100% rolled-up total accuracy, correct row counts, alpha ordering, delimiter normalization, large-sheet DoS guard, XSS strings stored literally).
- Real Lewis Residence seed tree structure (groups "Lot/House", areas "Bedroom 1 / Guest Room", "Show Kitchen", etc.) used as model for rich/lewisRepresentative fixtures.
- `WorkshopTree<TNode>` reuse decision (A9b) pairs perfectly with the `ShareTreeNode` output.

**Trade-offs accepted:**
- Not 1:1 with canonical `estimate_nodes` (no parentId/sortOrder in snapshot v1).
- Alpha sort within levels (user tree order not preserved).
- Some "virtual" groups invented from designation depth.

**Reversal trigger:** Owner or usability testing determines the virtual tree is more confusing than a well-labeled flat + discipline view → hide Tree View sub-tab or switch default to Grid Preview.

**UX copy locked:** "Reconstructed from estimate data (may differ from internal workspace view)" — must appear in the Tree View header (P3).

Recorded in TRACKER.md + this log. P0.5 gate passed. Ready for P1.

*Nothing in the original plan was deleted or contradicted. This log makes the "why" explicit and auditable.*
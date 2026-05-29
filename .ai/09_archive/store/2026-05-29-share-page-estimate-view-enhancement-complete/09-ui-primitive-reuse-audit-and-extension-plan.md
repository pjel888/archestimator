# 09 — UI Primitive Reuse Audit & Extension Plan (Post-Audit Addition)
**Date:** 2026-05-29 (added during comprehensive 2026-05-29 audit)
**Status:** New additive document — does not replace or delete any prior content in 03-ux-ui-spec.md or 05-component-architecture-plan.md.
**Trigger:** High-risk gap identified in post-audit review against `DESIGN.md`, `.ai/03_plans/ui-componentization-and-storybook-plan.md`, and `AGENTS.md` "UI implementation contract".
**Scope:** All new or modified UI in the share estimate view enhancement (CostDonutChart extraction, sub-tab bar, ShareEstimateTreeView, ShareFloatingTreeNav, any hover/focus states in SharePageTabs).

---

## 1. Why This Document Exists (Audit Finding)

The original plan pack (particularly 03 §3 Sub-Tab System, 05 §2.2–2.3 new components, and proposed code sketches) proposes:
- Custom sub-tab bar markup and styling (28px height, specific bg/border classes).
- Full recursive `ShareEstimateTreeView` + `ShareTreeNodeRow` with custom indentation, icons (FolderSimple/Cube/CaretDown), row layouts, expand/collapse state.
- `ShareFloatingTreeNav` with its own compact list + IntersectionObserver active highlighting.
- Extraction + reuse of CostDonutChart (good) but without explicit primitive extension checklist for any repeated patterns it introduces.

Per `ui-componentization-and-storybook-plan.md` Core Rule (mandatory):
> 1. Check `src/components/ui/` and existing feature-shared components first.
> 2. Reuse the existing primitive if it fits.
> 3. Extend the shared primitive if one repeated use case is missing.
> 4. Create a new shared primitive if no reusable primitive exists and the pattern will repeat.
> 5. Only use feature-local markup for genuinely unique layout composition, not for reusable controls.

Per AGENTS.md UI contract (enforced by `bun run lint:design-system`):
- Repeated tabs, tree rows, chips, panels, empty states **must** be extracted or reused as shared.
- "A visible duplicated button/search/input/icon-button implementation is a blocking design-system defect".

**Risk Rating (Post-Audit):** **HIGH** for duplication debt and design lint failures if implemented exactly as sketched in 05 without prior primitive audit/extension.

This document provides the required pre-implementation audit + extension plan. It is additive evidence, not a replacement for the original UX/arch plans.

---

## 2. Existing Relevant Primitives & Workshop Patterns (Graph + Inventory)

(From code-review-graph semantic_search + architecture communities + known inventory in ui-componentization plan; verified against DESIGN.md tokens.)

**Shared UI (src/components/ui/ — must be first stop):**
- `button.tsx` — all buttons, icon buttons, toolbar (use/extend before raw <button> or div[role=button]).
- `search-input.tsx` — search (not directly relevant here).
- `badge.tsx`, `chip.tsx`, `control-select.tsx`, `control-input.tsx` — recent additions.
- No shared `TabList`/`TabButton` primitive yet (original plan 00 noted "Partial"; SharePageTabs implements its own — this is pre-existing technical debt, not new).
- No shared tree-row primitive (WorkshopTreeRow lives in workshop/ and is editing-coupled).

**Workshop / Feature-Shared Patterns (high duplication risk):**
- `src/components/workshop/workshop-tree.tsx` (WorkshopTreeRow, WorkshopTreeTabs) — exact visual language the plan wants to mirror (FolderSimple 12px regular, Cube, CaretDown rotation, 20px indent via `workshopTreeIndentStyle`, bg-surfaceMuted + border-l-2 for groups, text-[10px] font-medium, totals right-aligned tabular-nums).
- **`WorkshopTree<TNode>` generic component** (same file, lines 116–195) — a fully generic recursive tree renderer that takes `nodes`, `expandedNodeIds`, `getNodeId`, `getChildren`, `renderNode` as props. This component already handles tree accessibility (`role="tree"`, `role="group"`, `role="treeitem"`), expand/collapse state, and recursive rendering. **This is a high-value reuse candidate** that the original plan pack did not reference.
- `EstimateSheetTree.tsx` + `EstimateSheetContent.tsx` — use React Complex Tree + the above rows.
- `src/components/workshop/project-charts/ProjectCostDonutChart.tsx` (being extracted — good).
- Tab patterns in SharePageTabs (pre-V2) and other places (ProjectChartsClient segmented controls, etc.).

**communities surfaced by graph (workshop-estimate 37 nodes, component-library-component 18 nodes):** These are the exact surfaces whose patterns the new share tree/sub-tabs would duplicate if not routed through shared primitives.

---

## 3. Specific Violations / Risks in Proposed Implementation

| Proposed in Plan Pack | Primitive Contract Violation | Risk if Ignored | Required Action (Before P2/P3 Code) |
|-----------------------|------------------------------|-----------------|-------------------------------------|
| Sub-tab bar (Tree View \| Grid Preview) custom markup + 28px/9px uppercase styling | No shared Tab primitive; duplicates SharePageTabs main tab bar pattern + other segmented controls | High — design lint failure, visual drift, maintenance (future tab changes must touch share + workshop) | Audit existing tabs; either (a) extract `TabList`/`TabButton` primitive from SharePageTabs main bar first, or (b) make sub-tabs use the same internal pattern with explicit "not-yet-shared" comment + story in ui plan. |
| `ShareEstimateTreeView` + `ShareTreeNodeRow` full recursive implementation (indent, icons, bg, hover, totals, row items with 24px thumbs) | Directly duplicates WorkshopTreeRow visual contract (same tokens, same icons, same 10px SF Pro) AND duplicates WorkshopTree<TNode> recursive rendering logic | Critical — two sources of truth for "what a Group/Area/row looks like" AND how tree recursion/expand-collapse works. Design lint + future changes (e.g., new node kinds, contingency display) break in one place only. | 1. Extract or extend `WorkshopTree<TNode>` + `WorkshopTreeRow` as shared primitives in `src/components/ui/`. 2. ShareEstimateTreeView becomes a thin wrapper using `WorkshopTree<ShareTreeNode>` with a read-only `renderNode`. 3. If extraction is blocked for V1, document explicit exception in ui plan with owner sign-off and technical debt ticket. |
| `ShareFloatingTreeNav` custom sticky list + IntersectionObserver active state | No shared "floating nav" or "scrollspy nav" primitive | Medium — one-off pattern unlikely to repeat immediately but still violates "repeated controls" spirit if similar nav appears elsewhere. | Treat as feature-local for V1 (acceptable per rule 5 if genuinely unique), but document in ui plan + add to Storybook category matrix as "candidate for future extraction". |
| CostDonutChart extraction (good) | Extraction itself is correct reuse, but any new hover states, callout tweaks, or "Estimate Cost" vs "Project Cost" labeling must not fork the primitive. | Low if extraction is pure copy + re-export. | Enforce in P1 exit gate: "CostDonutChart used by both workshop charts and share; any divergence requires primitive extension + ui plan update." |

**Design System Token Compliance (Proposed Code Sketches):** The 05 sketches correctly use `text-[10px]`, `bg-surfaceMuted`, `border-hairline`, `rounded-xs`, SF Pro via classes, regular Phosphor icons. This is compliant on paper. The risk is **duplication of the implementation**, not the tokens.

---

## 4. Required Pre-Implementation Steps (Additive Gates for 06-Phased-Plan)

Insert these as **mandatory exit gates** before any P2 (sub-tabs) or P3 (Tree View) code is written. These are **non-negotiable** per AGENTS.md UI contract and will be enforced in `13-implementation-readiness-and-owner-review-gate.md`.

1. **Primitive Inventory Pass (P0+):** Run `grep` or graph semantic search for all tab/tree/row patterns in `src/components/`. Produce 1-page matrix: "Pattern | Current Owner | Shared? | Notes".
2. **Tab Primitive Decision:** Decide (and record in 12-assumptions-log + ui-componentization plan update): Extract lightweight `TabButton`/`TabList` from existing SharePageTabs main bar as shared primitive (preferred), or explicitly accept controlled duplication for receiver sub-tabs with 6-month revisit.
3. **Tree Row Primitive Decision (Blocking):** Before writing `ShareEstimateTreeView`, either:
   - **Preferred:** Extract `WorkshopTree<TNode>` + `WorkshopTreeRow` to `src/components/ui/` as shared primitives, then use `WorkshopTree<ShareTreeNode>` with a read-only `renderNode` in the receiver.
   - **Alternative:** Create `src/components/ui/estimate-tree-node-row.tsx` (or equivalent) as read-only variant that WorkshopTreeRow can later adopt, **or**
   - Document explicit exception in ui plan with owner sign-off and technical debt ticket.
   
   **Key insight:** `WorkshopTree<TNode>` already provides the recursive rendering, expand/collapse, accessibility, and `renderNode` delegation pattern. The receiver tree does NOT need a new recursive component — it needs a read-only `renderNode` function + either reusing or extracting the existing `WorkshopTree` generic.
4. **CostDonutChart Extraction Review:** During P1, the extraction PR/diff must be reviewed against "no behavioral or visual divergence" + update any chart color palette to shared constant if not already.
5. **Design Lint + Storybook Matrix Update:** Every new component (even internal) must pass `bun run lint:design-system` with 0 violations. New stories or "candidate" entries added to `.ai/03_plans/ui-componentization-and-storybook-plan.md` matrix before merge.
6. **Code Review Gate:** Any reviewer (human or agent) must call out "primitive reuse" as first checklist item on any share/ or chart/ diff in this feature.

These steps add <1 day to the 9–14h estimate but prevent years of drift.

---

## 5. Updated File Placement (Additive to 05 §6)

New shared primitives (if created):
- `src/components/ui/estimate-tree-node-row.tsx` (or `workshop/estimate-tree-node-row.tsx` if workshop-owned)
- `src/components/ui/tab-button.tsx` / `tab-list.tsx` (lightweight, or extend existing patterns)

Receiver-specific orchestrators remain in `src/components/share/` as thin consumers.

---

## 6. Success Criteria for This Audit Item

- [ ] No new feature-local tab or tree-row markup ships without explicit primitive decision + ui plan update recorded in 12-assumptions-log.
- [ ] `bun run lint:design-system` passes on all changed + new files with 0 violations attributable to this feature.
- [ ] Workshop estimate tree and share receiver tree share the same row primitive (or documented planned convergence).
- [ ] Future similar nav (e.g., in proposal preview) has a clear extraction path because the candidate was logged.

---

**This document is additive evidence and implementation guardrail. Original 03-ux-ui-spec.md and 05-component-architecture-plan.md remain the visual and component specs. Implementers must satisfy both the original plans *and* this primitive contract before writing the new tree/sub-tab code.**

Cross-references: See also new `12-assumptions-decisions-log.md` (record the tab/tree primitive decisions here), `13-implementation-readiness...md` (include these gates), and the main `00-POST-AUDIT...md`.

---

## 7. Validation from Specialized Subagent (2026-05-29)

During the audit session, a dedicated `feature-dev:code-reviewer` subagent was dispatched with a focused prompt on design-system compliance and primitive reuse for exactly this plan pack (03-ux-ui-spec, 05-component-architecture-plan, proposed ShareEstimateTreeView / sub-tab / floating nav sketches).

**Subagent Outcome (ID 019e71a3-16ac-7150-b87a-21339068eef4, 30.1s run):**
- Independently reached the **identical core conclusion**: the proposed new components carry **HIGH risk** of creating feature-local duplicated controls (especially the recursive tree row implementation mirroring `WorkshopTreeRow` and the custom sub-tab bar) unless the shared primitive contract in `ui-componentization-and-storybook-plan.md` + `DESIGN.md` + AGENTS.md is enforced first.
- Explicitly listed the same high-priority duplication risks (tree rows, tab patterns, chart extraction discipline, typography hierarchy where labels must never exceed paired body text).
- Stressed the mandatory order: check `src/components/ui/`, reuse/extend, only then feature-local for unique layout composition.
- Confirmed that `CostDonutChart` extraction is the correct direction but still requires guardrails against future divergence.
- The subagent's reasoning aligned 1:1 with the findings and required pre-P2/P3 gates documented in sections 3–6 above, increasing confidence in the mitigation plan.

The subagent run was short (primarily planning its own investigation and confirming the protocol-level risks from the prompt context). Its output did not include completed deep GitNexus symbol traces on `WorkshopTreeRow` / tab patterns (0 processed tool calls in the returned trace), but the high-level architectural judgment it rendered independently validates the necessity of this 09- document.

**Action:** Any future deeper run of this subagent (via `resume_from`) or human implementer review should start from the concrete extension recommendations in §4–5 and record outcomes in `12-assumptions-decisions-log.md` (A9a / A9b).

This subagent validation is recorded here as additive evidence only. It does not alter any original plan text or the risk rating (still HIGH without the primitive work).
# 07 — UX/UI Readiness Audit

**Date:** 2026-06-14
**Scope:** Planning/readiness review only. No implementation edits.
**Verdict:** Ready for a coding agent to implement **Phase 1A only** after reading `01`–`06`. Phase 1B remains conditional and must not be defaulted on without the visual checkpoint and viewport-width proof described below.

## Workflow mapping

The user requested frontend-design, Impeccable, Visual Ralph, Ultragoal, UltraQA, Ultrawork, Autopilot, Ralplan, Ralph, and LFG surfaces, but also explicitly said this is **not** a coding or implementation task. From this Codex App surface, the OMX runtime loops that need attached tmux are not launched. Their useful requirements are mapped into this plan pack instead:

| Requested surface | Applied to this planning task |
|---|---|
| `compound-engineering:ce-frontend-design` | Existing-system mode: preserve `DESIGN.md`, product register, compact app UI, no new visual system. |
| `impeccable` | Product-register audit: task-first UI, no AI slop, regular/medium app weights, subtle hierarchy, visual states. |
| `visual-ralph` | Converted into screenshot/verdict gates for the future implementation; no reference-image approval is needed for this subtle in-system change. |
| `ralplan` / `autopilot` | Plan consensus principles applied: evidence-backed plan, explicit acceptance criteria, no direct execution. |
| `ultrawork` | Independent read-only review lanes are appropriate; implementation parallelism is deferred to the coding phase. |
| `ultragoal` / `ralph` | Durable stop condition captured in `06`: do not mark implementation complete from tests alone; require UX evidence. |
| `ultraqa` | Adversarial QA translated into visual/semantic no-go gates: color-only failure, false-positive test pass, overflow, and over-strong chrome. |
| `compound-engineering:lfg` | Not executed because LFG is a software delivery pipeline and would proceed to code/PR; only its plan-first discipline is relevant here. |

## Readiness defects found and fixed in Rev 3

### P1 — Weight cue violated the app design system

**Finding:** Rev 2 used `font-semibold` for the root name. `DESIGN.md` and `PRODUCT.md` require regular/medium weights only in app/workshop UI. Semibold would make the root landmark louder than the product register permits.

**Fix in this pack:** U1 now maps the external "bold summary row" precedent into Archestimator's allowed scale: root `font-medium text-ink uppercase tracking-normal`; descendants `font-normal text-secondary`. This preserves the hierarchy cue while obeying the design system.

### P1 — Sibling rule was implementation-ambiguous before block indent

**Finding:** Rev 2 described `nodeShellClasses(depth, isFirstSibling)` adding `border-t border-divider-sibling`. That would make the Phase 1A rule full-width because current indentation is header-only. It would not satisfy the "inset sibling divider" UX.

**Fix in this pack:** U2 now requires a decorative inset divider element or pseudo-element in `branch.tsx` while U5 remains off. The divider must align to the current header indent and must not appear above the first child.

### P2 — Handoff over-weighted code tests for a visual task

**Finding:** The plan had good test coverage, but the handoff could still let a coding agent report completion from typecheck/Vitest alone.

**Fix in this pack:** `06` now has an explicit UX/UI readiness stop condition: shallow fixture gate, deep fixture gate, ownership gate, design-system gate, and visual proof gate.

### P1 — Shared helper blast radius was hidden

**Finding:** `nodeNameClasses()` is not private to the middle estimate sheet. `TemplateEditorSheet.tsx` also calls it with no depth argument. A naive depth-aware helper could accidentally make template/library names inherit estimate-sheet root styling (`uppercase text-ink`), creating a cross-surface regression.

**Fix in this pack:** `02`, `05`, and `06` now name `TemplateEditorSheet.tsx` as a shared-helper consumer. U1 requires either a backward-compatible default or a new estimate-sheet-specific helper, plus a template-editor guard test if no existing coverage exercises that path.

### P1 — Level semantics targeted the wrong element

**Finding:** Rev 2 said to add `aria-level` to the node section. `aria-level` is meaningful only on roles/elements that support a level concept, so adding it to a plain `<section>` would be fragile and could pass DOM assertions without improving the accessibility tree.

**Fix in this pack:** U4 now targets the visible node name with supported heading semantics, such as `role="heading" aria-level={Math.min(depth + 1, 6)}`, while preserving the section label, caret `aria-expanded`, and sr-only count text.

### P1 — Phase 1B width gate was not executable enough

**Finding:** Rev 2 correctly identified the 714px row-grid floor, but the U5 handoff did not specify the measurement formula or viewport states. A coding agent could pick an indent cap that works in a stress fixture but fails when the right dock is open on a laptop.

**Fix in this pack:** U5 now requires `availableGridWidth = centerWorkSurfaceWidth - horizontalContainerPadding - blockIndent` and a viewport/state matrix: desktop 1440 dock open, laptop 1280 dock open, laptop 1280 dock collapsed, and any supported tablet/narrow editing fallback.

## UX/UI acceptance criteria

1. **Subtle hierarchy:** depth reads through text contrast/weight, outline code, spacing, and sibling dividers; the UI must not look like a file explorer.
2. **Design-system fidelity:** SF Pro app scale, `10px` names, `8–9px` meta/code, regular/medium weights, 3px radius, neutral tokens, no new orange usage.
3. **Sibling recognition:** second and later siblings at the same parent level have one visible, inset divider; first children do not.
4. **Row ownership:** Phase 1A may leave row ownership as a known risk; Phase 1B is accepted only when table/header left edges align without double-indented breadcrumbs.
5. **Accessibility:** names never use `tertiary`; visible node names expose heading levels; color/tone is never the sole depth cue.
6. **Density preservation:** common depth 0–1 estimates remain compact; deep estimates do not create horizontal overflow or crush the 714px row-grid floor.

## Visual QA matrix for the future coding agent

| Scenario | Required proof | Failure signal |
|---|---|---|
| Common shallow estimate, depth 0–1 | Screenshot at laptop width with root + at least two child siblings. | Root/child distinction is invisible, sibling rule reads as a heavy section break, or the sheet looks like a file tree. |
| Deep stress estimate, depth ≥3 | Screenshot at same width with node code visible and no horizontal scroll. | Any name uses `tertiary`, outline code wraps, or row grid falls below its floor. |
| Phase 1B enabled | Screenshot or DOM measurement proving row table and header/block frames share the block origin, plus the `availableGridWidth >= 714px` matrix. | Breadcrumb double-indents, sticky root header shifts, table/header ownership remains ambiguous, or any required viewport state fails the grid floor. |
| Keyboard/screen-reader sanity | Expand/collapse still exposes `aria-expanded`; visible node names expose heading levels. | Decorative divider is announced, or existing count announcement regresses. |

## Final planning verdict

The plan's product direction is sound: **Ledger, not file tree**. It is grounded in the current code, current tokens, prior iteration history, external accessibility rules, and Archestimator's product register.

The coding handoff should execute in two decision points:

1. **Implement Phase 1A only:** medium/regular name ramp, inset sibling rule, 9px code, node heading levels, tests, and visual proof.
2. **Decide Phase 1B after seeing the real UI:** enable block indent only if row ownership is still unclear after Phase 1A, and only if the 714px width gate passes.

Do not collapse those decision points into one implementation pass unless the owner explicitly approves the louder structural change.

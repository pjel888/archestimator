# 06 — Handoff to the Coding Agent

## What you are picking up

A **completed, re-grounded audit + planning pack** for improving the hierarchy UX/UI of the estimate sheet's middle panel. **No app code has been changed by this pack.** Your job is to implement **Phase 1A only** unless the owner explicitly authorizes the Phase 1B checkpoint after seeing the real UI.

This is **Revision 3**. Revision 1 recommended file-tree **guide lines + accent bars** (Option E). That was **rejected** after verifying it against the real code, tokens, tests, brand, and git history. Revision 3 hardens the handoff for shared-helper blast radius, heading semantics, and Phase 1B width proof. Read "Why the direction changed" before doing anything — it will save you from re-proposing a dead end.

## TL;DR of the recommendation

Carry hierarchy with **text + structure, not chrome**:

1. **Header ink ramp:** root name `text-ink font-medium uppercase tracking-normal`; depth ≥ 1 `text-secondary font-normal`. **Never `tertiary` for names** (fails AA), and never use semibold/bold weights in this app surface. (U1)
2. **Sibling rule:** a visible 1px `border-divider-sibling` divider (new token ~`#d9d9d9`) on each child where `childIndex > 0`; never above the first child; inset to the content column; rides the top of the existing `groupGap`. In Phase 1A this must be an explicit inset divider element or pseudo-element, not a full-width nested-section border. (U2)
3. **Elevate the outline code** `8px → 9px tabular-nums` as the AA-safe hierarchy backbone. (U3)
4. **Add supported heading-level semantics** to the visible node name, e.g. `role="heading" aria-level={Math.min(depth+1, 6)}`. (U4)
5. **Indent the whole node block to 20px/level** so each row table aligns under its own header (fixes Gap B), **gated** by the 714px grid floor. (U5)

Keep all surface fills flat. No guide lines, no concentric borders, no tonal bands. Full specs in `05`.

## Read first (in order)

1. `01-brief-and-intent.md` — goal, refined intent, resolved open questions, constraints.
2. `02-audit-current-state.md` — **verified** current code, the **token reality**, the **prior-iteration history**, and the **four tests that lock the design**.
3. `03-research-findings.md` — why tone can't carry depth, what pro tools do, the sibling-divider grammar.
4. `04-design-options.md` — the live options + the **rejected** ones (with reasons) + ASCII mockups.
5. `05-recommendation-and-plan.md` — phased implementation units, **test-impact map**, **no-go gates**, a11y + perf plans.

## Why the direction changed (Rev 1 → Rev 2) — context for you

Four independently verified facts killed Rev 1's guide-line recommendation:

1. **No precedent.** The left tree (`src/components/ui/tree.tsx`, ~lines 462–492) renders only an **indent spacer + caret — no connector lines**. Rev 1 claimed it "has guide lines"; it does not. Adding guide lines would *introduce* a file-tree metaphor that exists nowhere in the product.
2. **Against brand.** `PRODUCT.md` / `DESIGN.md`: "precise, architectural… not toy-like", "avoid nested card-on-card clutter", document/BOQ framing. Rev 1 even distilled "feel like a precise BOQ, not a file explorer" and then recommended the file-explorer mechanism.
3. **Against a shipped decision.** `node-visuals.tsx` and `branch.tsx` comments record `UX-4 / OD-7`: "share the same surface tone, **not a darker child fill**", "ONE frame, not concentric borders." Recent commits (`6a8af01d`, `55613ca1`, `3fe78bf4`) and an uncommitted `/30 → /20` fill reduction all move **toward flatness**. Rev 1's Phase-2 accent bands / per-area backgrounds relitigated that.
4. **Against user intent.** The user asked for subtle **tone / spacing / dividers**; guide lines are none of those.

The honest reframe: "darker parent / lighter child" via background is impossible (the neutral palette is a ~4% luminance window, sub-JND, and fails WCAG 1.4.1 as a sole cue), so it moves to the **text-ink ramp** (which has real AA range), paired with the user's literal **sibling rule** and the existing spacing — and we fix the real bug (Gap B: header indented, table full-width) by indenting the whole block.

## Entry points in the codebase

```
src/components/workshop/EstimateSheetContent.tsx        # orchestrator (no expected changes)
src/components/workshop/estimate-sheet/rows/branch.tsx  # recursive renderer — PRIMARY FILE
src/components/workshop/estimate-sheet/rows/node-visuals.tsx  # helper classes (nodeNameClasses, nodeShellClasses, groupGap)
src/components/workshop/estimate-sheet/rows/row-table.tsx     # 9-col grid; ROW_COLUMNS sums to 714px (the width floor)
src/components/workshop/library/template-editor/TemplateEditorSheet.tsx  # shared nodeNameClasses() consumer; guard against accidental restyling
src/app/globals.css                                     # add --divider-sibling token here
```

## Recommended implementation order

1. **Add the feature-flag config** (`ESTIMATE_SHEET_HIERARCHY_UI` in `node-visuals.tsx`, see `05`) so each cue is reversible/A-B-able.
2. **Phase 1A (typographic baseline — ship & validate first):** U1 (depth name ramp) → U2 (sibling rule + `--divider-sibling` token) → U3 (9px code) → U4 (node heading levels). These are surface-fill-free and near-zero risk. **Checkpoint with the user** that tone/typography + the rule satisfy the need before structural work.
3. **Phase 1B (structural — CONDITIONAL, the loudest change):** U5 (block indent 20px, gated by the 714px floor). Its flag defaults **off**. Do U5 **only after** the 1A checkpoint shows the typographic cues don't resolve row ownership on their own, and only after measuring the viewport/state matrix in `05`. Recalibrate the breadcrumb offset (drop the `leftIndent` term — see `05` U5) and re-verify the sticky depth-0 header's left origin.
4. **Phase 2 (only if 1A/1B test under-powered in-app):** U6 root anchor accent, U7 heavier root rule, U8 weight-stepped code.
5. **Validate** per `05`: type-check, ESLint + `lint:design-system`, the four vitest suites, render probes, and the visual + no-go checks.

## Test-impact (do not skip)

Four suites lock the current flat look. The plan keeps header **surface** fills and `groupGap` untouched to minimise churn, but **these will change**:
- `estimate-sheet-spacing.test.tsx`: `groupGap` and `nodeShellClasses(depth)` assertions stay unchanged in Phase 1A. Add or update tests only if U5 changes block indentation.
- `estimate-sheet-branch-header-ui.test.tsx`: header surface/border assertions stay; **add** name-ramp assertions (root `text-ink`/`font-medium`/`uppercase`; depth-1 & depth-2 `text-secondary`, **not** tertiary; descendants `font-normal`); node-name heading-role/level assertions. Add or create a focused sibling-divider assertion: first child has no divider, second child has one inset divider.
- `estimate-sheet-tree-dom.test.tsx` (covers the **left-panel** `tree.tsx`, not the middle sheet), `estimate-mixed-content.test.tsx`: re-run to confirm still green.
- Template editor coverage/focused guard: prove the shared `nodeNameClasses()` change did not apply estimate-sheet root uppercase/ink styling to `TemplateEditorSheet`.

Update assertions to the new ground truth; don't weaken them. Full mapping in `05` → "Test-impact map".

## Critical constraints to respect

- Names ≥ `secondary` (AA). **No `tertiary` names.**
- App font ≤ `12px`; app weights regular/medium only; radius `xs` (`3px`); orange reserved (occupancy dot + Add buttons).
- One new token only: `--divider-sibling`. No other palette additions.
- **No** guide lines, concentric borders, or per-depth background fills.
- Preserve `aria-expanded`, sr-only counts, memoization, render-probe counts. Pass only primitive `depth`/`childIndex` props (no inline objects in the recursive `map`).
- Gate block indent against the 714px grid floor using the viewport/state matrix in `05` — this is the hardest constraint and U5 is not part of the default Phase 1A pickup.
- Do not change the data model, mutation layer, collapse/expand semantics, or drag-and-drop.

## If anything is unclear — pause and ask

Good reasons to ask the user before coding:
- They want a different option than the Ledger spine (e.g. the literal header-tone "Quiet-Tone", which needs a new `--surface-landmark` token and breaks the header test — see `04`).
- They want the depth-2+ name step kept visible and accept the AA trade-off (the plan refuses; `secondary` floor).
- They want guide lines anyway despite the brand/precedent findings.
- New design-system guidance conflicts with this plan.

## Evidence to report when done

1. Which flags are enabled and why.
2. Screenshot (or precise description) of a ≥3-level estimate showing the ink ramp, sibling rules, and aligned tables.
3. Type-check / ESLint / `lint:design-system` results.
4. The four vitest suites green, with the updated assertions called out.
5. Render-probe counts before/after (no regression).
6. The no-go gates checked (especially the 714px width gate at the chosen indent cap depth).
7. Any deviations from the plan and the rationale.

## UX/UI readiness stop condition

Do **not** treat "tests pass" as the full design success condition. The implementation is ready only when these UX/UI gates are evidenced:

1. **Shallow fixture gate:** a common depth-0/1 estimate shows the root as the landmark, children as subordinate, and sibling boundaries as visible without looking like a file tree.
2. **Deep fixture gate:** a 3-level estimate keeps all names AA-safe (`text-secondary` floor), keeps the outline code readable, and shows no horizontal overflow at the chosen viewport.
3. **Ownership gate:** if U5 is enabled, each row table's outer frame aligns to its node block/header frame, breadcrumb indent is not double-applied, and the matrix proves `availableGridWidth >= 714px`.
4. **Design-system gate:** no `font-semibold`, `font-bold`, `rounded-*` beyond `rounded-xs`, orange expansion, guide lines, tonal header bands, nested cards, or raw new colour literals except the documented `--divider-sibling` token.
5. **Visual proof gate:** capture desktop/laptop screenshots for both fixtures. If Browser/Playwright is unavailable, record the exact reason and provide a DOM/class-level substitute; do not claim visual proof from unit tests alone.

---

## Context from the agents who built and revised this pack

**Rev 1 agent (original):** produced the disciplined brief → audit → research → options → recommendation → handoff structure, an accurate component map + render pseudocode, and a sharp Gap A–G inventory. Its weakness was external-pattern bias (it scored file-tree guide lines highly on generic prior art) and an un-verified premise about the left tree.

**Rev 2 agents (this pack):** re-grounded everything against the working tree. Verified all eight core facts in `02` against real files (incl. exact rendered hexes and WCAG ratios), surfaced the prior-iteration history and the four locked tests, ran external research on tonal-subtlety/a11y + sibling dividers + BOQ precedent, generated and scored three design variants, and adversarially reviewed the Rev 1 direction (which scored 31/100 vs the Ledger's 88).

**Rev 3 readiness review:** did not change app code. It tightened the coding handoff around four implementation-readiness issues: regular/medium typography only, inset sibling divider while U5 is off, shared `nodeNameClasses()` impact on `TemplateEditorSheet`, supported node-name heading semantics, and objective U5 viewport-width proof.

**What a future agent should re-verify if time has passed:**
- The token values in `globals.css` (especially whether `--ink` is still `#3D3D3D` and whether `DESIGN.md` was corrected).
- Whether the four locked tests still exist and still assert the flat look (files may have been refactored).
- Whether `branch.tsx`'s indent is still header-only (`Math.min(depth*16, 96)` on `paddingLeft`) — if someone already started U5, the Gap B framing changes.
- The `ROW_COLUMNS` sum in `row-table.tsx` (still 714px?) — it sets the indent cap.
- Whether the Templates panel still uses `indentStep={20}` (the precedent for the 20px step).

If you change any of these files, update this handoff so the *next* agent inherits accurate context.

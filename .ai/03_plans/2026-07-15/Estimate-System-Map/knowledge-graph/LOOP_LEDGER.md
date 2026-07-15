# Estimate System Wiki Knowledge Graph — Loop Ledger

Append-only execution record. The achieved parent pack remains unchanged.

## 2026-07-15 — LOOP-001 — Discover and decide

Status: COMPLETE

- Confirmed the current page is a clean Product / Features / Pages / UX guide with no typed CRUD/effect ontology and no infinite canvas.
- Confirmed the parent UX Brain pack is terminal `COMPLETE` / `ACHIEVED`; this work is a nested successor pack so historical proof remains truthful.
- GitNexus impact for `EstimateSystemMap`, `EstimateSystemGraph`, and `defineEstimateSystemDocumentation` is LOW with no indexed execution processes. The index is two commits stale, so current source remains decisive.
- Guarded GitNexus reindex correctly refused a registry-resolved latest runner and was not bypassed.
- Corrected the motivating assumption: live row deletion does not rewrite already-issued legacy or Client Portal content.
- Defined the explicit operation inventory, truth boundaries, graph stages, first scenario presets, accessibility fallback, and acceptance criteria.

Next: UNIT-001 through UNIT-006 as one coherent documentation-only implementation slice, then focused static and browser verification.

## 2026-07-15 — LOOP-002 — Implement typed graph and knowledge workspace

Status: COMPLETE

- Owner: primary Codex agent.
- Scope: admin estimate-system documentation types/data/components only plus this nested successor pack.
- Shared mutation source remains read-only.
- Stop condition: typed graph loads, Knowledge tab renders a focused CRUD/effect scenario, deterministic canvas controls work, and a complete linear equivalent is present.

- Added the fifth `Knowledge` view while preserving `Product` as the reload default.
- Added fail-closed typed stages, nodes, relations, effect guides, sources, confidence, statuses, and a canonical 54-item CRUD/lifecycle inventory.
- Implemented 27 entities, 75 source-grounded relationships, 52 effect guides, and 54/54 classified inventory items across nine domains.
- Implemented focused and whole-system views, search, deterministic SVG layout, D3 pan/zoom/fit/reset, keyboard-selectable nodes, direct-neighborhood highlighting, human status labels, and the complete semantic relationship list.
- Kept live estimate state, legacy publication snapshots, immutable Portal issues, Portal access state, and partial cross-editor refresh as distinct concepts.

Next: adversarial truth/UI review, focused UltraQA, static diagnostics, change-impact review, and package closeout.

## 2026-07-15 — LOOP-003 — Adversarial repair, UltraQA, and closeout

Status: COMPLETE

- Closed all first-pass coverage findings by adding the exact 54-item required inventory, first-class `legacy` and `not-applicable` states, confidence, read-only effects, and reciprocal-reference validation.
- Closed truth-review findings for Portal access state versus immutable issue content, Library variant replacement/remapping, estimate/proposal total rollup, and guarded template fallback confirmation.
- Closed UX-review findings for neighborhood dimming, human status labels, entity `What can change` / `What stays the same`, compact linear-first behavior, and DOM/focus order.
- Focused browser UltraQA passed Product-default reload, Knowledge selection, delete-row truth, search, focused/whole-system disclosure, 27-node/75-relation whole-system scope, zoom, pan, fit, reset, keyboard node selection, responsive 1280px compact layout, zero page-level horizontal overflow, and a clean fresh-tab console.
- Typed runtime loading passed with map integrity `ok: true` and Knowledge counts `27 / 75 / 52 / 54`.
- Focused ESLint and `git diff --check` passed. Fresh repository TypeScript diagnostics remain non-clean only in concurrent `LibraryPageClient.tsx` work (`onLoadAll` is not present in `ComponentRowsLoadState`); no diagnostic points at the Knowledge implementation.
- GitNexus reported no affected execution process for the scoped admin map symbols; its aggregate medium result includes concurrent workshop changes. The code-review graph likewise reported zero affected flows for the seven scoped admin files while surfacing shared-worktree noise.
- Independent model-truth review passed AC-003/AC-004 with 19/19 cited source files present. Independent UI review passed REQ-005/REQ-006/REQ-007 with no remaining actionable finding.
- Fresh evidence is recorded in `IMPLEMENTATION_EVIDENCE.md`; the final manifest is `COMPLETE` / `ACHIEVED` after validator refresh.

Stop condition: satisfied. The parent pack remains unchanged and this successor closes locally without deployment, commit, or product-test-suite execution.

## 2026-07-15 — LOOP-004 — Whole-page scroll and usability repair

Status: COMPLETE

- Reproduced the reported failure across the live Product, Features, Pages, UX, and Knowledge tabs. `AdminShell` correctly owned page scrolling, but nested guide `ScrollArea` viewports inherited `overscroll-contain`; viewports without a local scroll range trapped wheel input instead of chaining to the workspace.
- Kept the shared scroll primitive and admin shell unchanged. The seven guide-local viewports now use `overscroll-auto`, so compact indexes scroll locally and then hand wheel input back to the page at their boundary.
- Made the view tabs sticky and returned cross-tab/cross-record navigation to the guide top. Feature and Page search now select a matching record or show a truthful empty state instead of leaving unrelated stale details visible.
- Added compact-layout focus/scroll handoffs from Knowledge actions to relationship content and from relationship nodes to the inspector. Replaced nested `main` landmarks, clarified two-finger canvas panning, added visible search boundaries, raised small controls to at least 24px, and scoped the guide's 8/9/10px text to readable 11/12/13px sizes.
- A final independent source check caught four edge cases and all were repaired: Knowledge search now derives its active guide from matching results (or shows a truthful empty state), SVG node focus remains on the node until Enter/Space activation, programmatic destinations have visible focus rings, and Product/Feature/Page local index viewports remount only for tab/cross-link navigation so compact layouts do not inherit the previous index scroll offset. Important 8/9px button utilities are also overridden to 13px inside this guide.
- Live browser review exercised every tab, search empty states, Product/Page/Feature cross-links, UX personas and both modes, Knowledge action/entity/inventory navigation, canvas scope and controls, and keyboard tab navigation. Real wheel proof moved Product's workspace from `8` to `240`; the Knowledge action index moved from `0` to its `2812` maximum while the workspace stayed at `8`, then the next boundary wheel moved the workspace to `608`.
- Final live state had one `main` landmark, Product selected at the top, and zero browser warnings/errors. A focused SVG node retained keyboard focus with a visible 2px outline, then Enter opened a visibly focused inspector. Knowledge impossible-search proof showed `No matching operation`, zero relationships, and no stale record. Focused ESLint, repository TypeScript diagnostics, and `git diff --check` passed. No product test suite, build, deployment, commit, or unrelated shared-worktree mutation was performed.

Stop condition: satisfied. The complete guide is scrollable and the repaired interactions are usable on the live 1280×720 compact layout.

## 2026-07-15 — LOOP-005 — Single-scroll workbench redesign

Status: IMPLEMENTED — FRESH LIVE VISUAL PROOF PENDING

- A later design pass found that the guide still contained fixed-height index rails with `overscroll-contain`. Those rails could again trap wheel/touch input at their boundary, so LOOP-004's local-viewport model is no longer the current implementation.
- Removed every guide-local vertical scroll owner and oversized sticky index. The existing Admin workspace is now the only vertical scroll owner across Product, Features, Pages, UX, and Knowledge.
- Added scroll/focus handoffs for direct Feature, Page, persona, path, related-path, Knowledge action, and Knowledge entity selections so replaced content starts at its record rather than midway through the previous one.
- Restored tab-to-panel relationships, changed compact Product/persona indexes to one-dimensional lists, brought body explanations to the 10px scale, and kept record headings within the 12px/medium repository ceiling.
- Made the Knowledge impact path permanently visible and the canvas optional. Search now includes target entities; entity records aggregate all explicit effects and relation-endpoint actions; intentional alias actions remain separately selectable; validation now rejects orphan effect guides.
- A 37-scenario DOM UltraQA pass covered every tab, searches, empty states, selection focus, Knowledge entity/alias behavior, canvas mount/scope, and the absence of nested vertical scroll classes. It passed with nine outer-scroll calls and zero runtime exceptions.
- Focused ESLint, full TypeScript diagnostics, server rendering, runtime data integrity, and `git diff --check` passed. Independent post-repair reviewers found no remaining P0/P1/P2 source defect.
- Current evidence is recorded in `../visual-redesign/DESIGN_QA.md`. Earlier live browser receipts remain historical evidence for their prior UI state only.

Stop condition: not yet satisfied for LOOP-005. Reload and exercise the current five-tab route in the user's visible browser before claiming fresh live visual/scroll completion.

## 2026-07-15 — LOOP-006 — Final source and interaction hardening

Status: IMPLEMENTED — FRESH LIVE VISUAL PROOF PENDING

- Raised the rendered guide typography to a compact readable floor: 10px metadata, 11px body copy, 12px section labels, and 14px primary record titles. The rule is scoped to `.estimate-system-guide` and does not affect the rest of the product.
- Feature and Page empty-state reset buttons now use the same search-clear focus recovery as the inline clear controls.
- The Knowledge action index starts collapsed on narrow layouts and now closes after either an action or matching entity is selected, before focus moves to the destination record.
- Kept every SVG label at 11px or larger and medium weight or lighter.
- A fresh 45-scenario DOM UltraQA pass covered all five views, tab semantics, selection/focus handoffs, four search-clear paths, narrow-screen Knowledge disclosure, entity and alias behavior, optional canvas mounting, SVG typography, heading order, and the absence of nested vertical scroll classes. It passed with nine outer-page scroll calls, 45 SVG labels, and zero runtime exceptions.
- Fresh focused ESLint, full TypeScript diagnostics, server rendering, graph integrity, and `git diff --check` passed. Server rendering produced 19,398 bytes with five tabs, five tabpanels, and five control relationships. Graph integrity remained 27 / 75 / 52 / 54 with zero orphan guides.
- Final independent source review found no remaining P0, P1, or P2 issue.

Stop condition remains open only for a current visible-browser wheel/touch, responsive visual, and console pass. Earlier browser receipts remain historical and are not reused as proof of this layout.

## 2026-07-15 — LOOP-007 — Responsive shell and readable canvas

Status: IMPLEMENTED — FRESH LIVE VISUAL PROOF PENDING

- A final independent responsive review found two P1 usability gaps after LOOP-006: whole-system Fit could transform 11px SVG labels to roughly 3–5px, and the shared 188px Admin sidebar left only about 116px of content width at a 320px viewport.
- Kept the Knowledge canvas text-bearing view at 1x readable scale. The full-system control is now an explicit Overview: below 0.92 scale it hides all labels and shows a visible explanation, while Readable or zoom-in restores them. This preserves full-graph orientation without presenting unreadable microtext.
- Changed the shared Admin sidebar to a 54px accessible icon rail below 640px while retaining the 188px expanded desktop state. Its labels remain available to assistive technology, links retain titles, and the navigation itself can scroll vertically on short screens.
- Replaced raw SVG tertiary fills with the guide's accessible tertiary token and made the touch instruction accurately require a two-finger drag.
- A final DOM UltraQA rerun executed 186 assertions across the complete five-view interaction set, responsive shell source, canvas readable/Overview transitions, 45 SVG labels, contrast-token usage, touch copy, focus handoffs, and scroll ownership. It passed with nine outer-page scroll calls and zero runtime exceptions.
- Focused ESLint, full TypeScript diagnostics, and `git diff --check` passed after these repairs. GitNexus rated the Admin sidebar change LOW risk with one direct consumer (`AdminShell`) and no affected execution process; the new untracked Knowledge canvas remains absent from the current index.

Stop condition remains open only for fresh proof in the user's visible browser. No historical browser result is promoted to current proof.

## 2026-07-15 — LOOP-008 — Horizontal containment and final usability audit

Status: IMPLEMENTED — FRESH LIVE VISUAL PROOF PENDING

- Made the Admin workspace explicitly vertical-only with `overflow-y-auto` and `overflow-x-clip`, while both document roots clip accidental horizontal overflow.
- Added a guide-scoped `overflow-wrap: anywhere` safeguard for long source labels and human-readable paths without introducing a second scroll owner.
- Made the Knowledge Focused / Whole system switch a full-width two-column control on narrow screens with non-wrapping labels, returning to intrinsic width at `sm`.
- Fresh focused ESLint, full repository TypeScript diagnostics, `git diff --check`, and exact source assertions passed after the containment repair.
- The final independent read-only usability audit passed with 0 P0, 0 P1, and 0 P2 findings. It confirmed one vertical scroll owner, a 54px mobile Admin rail, correct five-tab semantics, readable canvas modes, accurate touch guidance, accessible tertiary SVG text, and no nested vertical-scroll trap.
- A final in-app browser attempt successfully bound the existing Estimate System tab, but the browser URL policy rejected reloading the localhost route. The route was left open for handoff; no direct Playwright, raw browser protocol, alternate browser, or policy workaround was attempted.

Stop condition remains open only for a fresh screenshot, real wheel/touch exercise, responsive visual comparison, and console check in the user's visible browser. Static and DOM evidence is current; historical browser receipts are not reused.

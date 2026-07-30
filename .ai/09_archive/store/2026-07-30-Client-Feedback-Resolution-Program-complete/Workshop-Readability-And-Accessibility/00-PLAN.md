# Workshop Readability and Accessibility

## Plan Identity

- Package: `PLAN-2026-07-28-workshop-readability-and-accessibility`
- Assignment: `PP-A-R / A1`
- Parent: `.ai/03_plans/2026-07-28/Client-Feedback-Resolution-Program/00-PLAN.md` (`FB-01`, parent `UNIT-009`)
- Action ceiling: local implementation and local evidence only
- Package status: conditionally ready; `UNIT-001` captures the pre-program
  readability baseline now, while `UNIT-002` onward wait for the sibling
  Workshop packs listed under Dependencies
- Implementation quality profile: `Q2_CRITICAL_CHANGE_GATE`
- Current state: plan complete, implementation not started, no release evaluation

### Current-source refresh — 2026-07-30

The documented 8–10px hotspots remain. `ProjectEstimatesTable.tsx`,
`EstimateHeaderActions.tsx`, `rows/row-table.tsx`, timeline surfaces, and several
estimate performance tests now contain unfamiliar active edits and must be
reread immediately before modification. No focused readability contract or
browser accessibility proof exists yet.

## Target Result

Make the authenticated Workshop feel approximately as readable at native browser scale as the client finds it at 110% zoom, without applying a root-level 110% transform or indiscriminately enlarging every pixel value. Establish semantic typography roles, usable control targets, and resilient table/tree/dialog behavior while preserving the Workshop's compact information density. Completion requires deterministic browser and accessibility evidence through `GATE-UX`, plus the repository's Q2 verification evidence.

## Authority and Inputs

1. The sanitized raw feedback in
   `.ai/03_plans/2026-07-28/Client-Feedback-Resolution-Program/evidence/client-feedback.md`
   is the governing product input: native text feels about 10% too small and
   110% browser zoom feels ideal.
2. The parent program fixes the solution boundary: a scoped Workshop pass, not a global root scale.
3. `AGENTS.md`, `.ai/AGENTS.md`, `.ai/00_system/PLAN_PACK_EXECUTION_POLICY.md`, `.ai/00_system/BETA_QUALITY_ENGINEERING_PROTOCOL.md`, and `.ai/00_system/VALIDATION_MATRIX.md` govern execution and evidence.
4. `DESIGN.md:349` and `scripts/enforce-app-design-system.mjs` describe the current authenticated compact scale. They are alpha guidance, not authority over this client-directed adjustment; keep the existing 12px hierarchy ceiling unless browser evidence proves a named role needs an exception.
5. Source was inspected at Git `214fd2af3564c6c90d6bb46a7f2f7bd19faa811d` in a shared dirty worktree. Every execution unit must reread its owned files and preserve unrelated edits.

## Scope

### In scope

- Authenticated Workshop shell descendants rooted at `src/components/workshop/WorkshopShell.tsx:117`, including the main sidebar rendered inside that shell.
- Semantic typography roles for titles, primary body/control text, supporting text, and metadata/labels.
- Standalone button, icon-button, row action, variant selector, tree disclosure, table, dialog, tooltip, toast, and form-control hit areas.
- Estimate sheet, tree, project estimates table, component-library add dialog, and main sidebar as representative density-critical surfaces.
- Desktop, laptop, reflow/zoom-equivalent, mobile fallback, and portal-rendered dialog behavior.
- Focus visibility, keyboard order, dialog focus containment/restoration, target size, contrast, text-spacing resilience, truncation, and overflow.
- Machine-readable local evidence, Q2 quality verification, and independent read-only quality review.

### Out of scope

- A root `font-size`, `zoom`, `transform: scale`, or universal remap that makes the entire application 110% larger.
- Public routes, emails, exported documents, generated PDFs, and unauthenticated share/client-portal presentation.
- Rebranding, wholesale layout redesign, new dependencies, product feature flags, compatibility styling, or deployment.
- Functional changes owned by sibling feedback packs; this pack tunes their integrated controls only after those units finish.
- Replacing the Workshop's desktop-density model with a mobile-first estimate editor. Existing mobile fallback behavior remains truthful and usable.

## Current-State Inventory

| Surface | Exact anchor | Observed contract |
| --- | --- | --- |
| Workshop scope root | `src/components/workshop/WorkshopShell.tsx:117` | Stable `data-workshop-page-shell-root` anchor encloses the authenticated shell and sidebar. |
| Workshop height/overflow | `src/app/globals.css:554` | `html` and `body` are already scoped with `:has([data-workshop-page-shell-root])`; this is a precedent for Workshop-only CSS, not a license to change root scale. |
| Existing scoped type precedent | `src/app/globals.css:3918` | `.estimate-system-guide` locally remaps 8-12px utilities, demonstrating scoping but also why a blind utility remap must not be copied to the whole Workshop. |
| Shared buttons | `src/components/ui/button.tsx:49`, `src/components/ui/button.tsx:61`, `src/components/ui/button.tsx:74` | Buttons expose `data-slot="button"`; text is 10px and compact sizes start at a 28px box. |
| Toolbar actions | `src/components/ui/toolbar-icon-button.tsx:134` | Visible-label and icon-only variants use 24px height/size, with 9px labels. |
| Shared tables | `src/components/ui/table.tsx:11`, `src/components/ui/table.tsx:52`, `src/components/ui/table.tsx:65` | Stable slots exist; headers are 9px and cells are 10px with compact row geometry. |
| Shared tree | `src/components/ui/tree.tsx:546`, `src/components/ui/tree.tsx:641` | Tree rows are 10px/min-height 28px; disclosure controls are 24px. |
| Shared dialogs | `src/components/ui/overlays/dialog.tsx:394`, `src/components/ui/overlays/dialog.tsx:404`, `src/components/ui/overlays/dialog.tsx:422`, `src/components/ui/overlays/dialog.tsx:466` | Portal content has compact 10-11px copy and a 24px close action; semantic slot hooks are incomplete. |
| Variant selector | `src/components/workshop/estimate-sheet/rows/cells.tsx:382` | The selector is 8px and only 14px high, the clearest readability/target hotspot. |
| Estimate tree metadata | `src/components/workshop/EstimateSheetTree.tsx:1040`, `src/components/workshop/EstimateSheetTree.tsx:1053` | Status and metadata text use 8px inside a dense tree. |
| Estimate sheet/dialog labels | `src/components/workshop/EstimateSheetContent.tsx:3160`, `src/components/workshop/EstimateSheetContent.tsx:3418`, `src/components/workshop/EstimateSheetContent.tsx:3596` | Multiple 8px labels coexist with a dense center-column viewport and save status. |
| Component modal | `src/components/workshop/component-library-manager/AddComponentModal.tsx:1842` | Large modal uses 9-10px copy and many compact controls; it must be tested as a portal and at reduced viewport widths. |
| Project list | `src/components/workshop/ProjectEstimatesTable.tsx:1024` | Dense table is a representative row/column preservation surface and now has active content edits; preserve and integrate them rather than treating the file as metadata-only. |
| Main navigation | `src/components/sidebar/MainSidebar.tsx:287`, `src/components/sidebar/MainSidebar.tsx:363`, `src/components/sidebar/MainSidebar.tsx:439` | Labels and supporting counts use 9-10px inside the Workshop root. |

The planning-time current-source command reported 1,213 explicit `text-[8px]` through `text-[12px]` matches in 128 of 336 TS/TSX/CSS files under `src/app/workshop` and `src/components/workshop`. Those values are an observation, not a checked-in acceptance threshold: `UNIT-001` reruns the command below and stores its machine-readable output as the authoritative baseline. The sidebar remains a separate targeted audit because it renders inside the Workshop shell. High-frequency files include activity history, copilot, estimate sheet content, component-library dialogs, publisher dialogs, project timeline, and row/cell renderers. Current unrelated edits exist in project timeline, publisher, project-chart, and test files; this pack does not overwrite them and executes after sibling integration.

## Requirements

### `REQ-001` — Scoped semantic readability

At native 100% browser scale, Workshop typography must apply an explicit role map rather than a global zoom approximation. Default mapping is 8px metadata/label to 9px, 9px supporting text to 10px, 10px primary body/control/table text to 11px, 11px subtitle/dialog title to 12px, and existing 12px titles remaining 12px. A component may retain a smaller visual annotation only when it is nonessential, has accessible text, and passes the browser review; no primary control label or editable value may remain 8px.

### `UX-001` — Accessible interaction geometry

Standalone interactive targets must be at least 24 by 24 CSS pixels, expose an unambiguous focus indicator, and remain operable by keyboard. Coarse-pointer layouts should expand frequently used targets to at least 32 by 32 CSS pixels where that does not break table semantics. Inline text links and controls covered by a documented WCAG target-size exception must still have non-overlapping activation regions and visible focus. Visual glyphs may stay compact while padding enlarges the activation box.

### `UX-002` — Density and responsive preservation

At deterministic 1440x900 and 1280x800 fixtures, the estimate table and tree must retain all previously visible required columns and at least 90% of the baseline visible data rows/nodes. Intentional internal scrolling is allowed; page-level horizontal overflow, clipped dialog actions, hidden focus, or undiscoverable truncation is not. At a 640-CSS-pixel reflow viewport and representative mobile devices, shell navigation, notices, drawers, dialogs, and error states must remain complete and keyboard reachable. The existing estimate mobile fallback may remain instead of exposing an unsupported editor.

### `OPS-001` — Evidence and quality closure

The final change must produce fresh machine-readable focused evidence, cross-browser screenshots/traces, accessibility assertions, bundle evidence, Q2 aggregate evidence, and an independent read-only review. Skipped authentication, absent fixtures, stale screenshots, or a manually asserted visual opinion cannot prove completion.

## Decisions

1. **No global 110% scaling.** Root-scale changes also enlarge panels, fixed chrome, and responsive breakpoints and would destroy density without expressing typography intent.
2. **Role-based 8/9/10/11/12 adjustment.** The role map approximates the client's preferred change while preserving the existing 12px hierarchy ceiling and avoiding a mass utility replacement.
3. **Workshop-only selectors.** Use the existing shell root plus stable semantic `data-slot`/role hooks. Shared primitives may add neutral slot attributes, but their default presentation must not change outside the Workshop root.
4. **Portal ownership is explicit.** Dialog surfaces opened from Workshop receive semantic slots and are styled through Workshop-active body scope; no global dialog enlargement.
5. **Information density is a budget.** Baseline and post-change row/node/column visibility are measured from the same seeded data and viewport, not judged from screenshots alone.
6. **Sibling UI work lands first.** This pack follows `Material-Image-Upload-Consistency`, `Material-Variants-And-Value-Engineering`, `Commercial-Remarks-Quotations-And-VAT`, `Material-Assemblies-And-Accessories`, `Estimate-Tree-Live-Subtotals`, and the Wave-0 `Estimate-Loading-Performance` measurements so final controls are tuned once.
7. **No new dependency or compatibility API.** Existing Tailwind/CSS, React components, Vitest, Playwright, and axe tooling are sufficient.
8. **Q2 classification.** Shared authenticated primitives, estimate editing, dense responsive behavior, and broad visual blast radius require Q2 evidence and an independent quality review.

## Acceptance Criteria

### `AC-001` — Typography contract

Pass only when computed styles at native scale match the semantic role map on shell navigation, estimate table/tree, editable cells, status text, and dialog content; primary labels/values are not 8px; text-spacing overrides do not lose content or controls; and no root/global scaling rule exists.

### `AC-002` — Interaction and focus contract

Pass only when standalone controls meet the target-size rule, the variant selector and tree disclosures are keyboard reachable, focus is never clipped, dialogs trap and restore focus, icon-only controls retain accessible names, and automated axe checks report no serious or critical violations introduced by the change.

### `AC-003` — Density, tables, trees, dialogs, and reflow

Pass only when same-fixture before/after evidence satisfies the visible-row/node density budget, required columns remain available, truncation exposes the full value through an existing accessible mechanism, dialog actions remain visible, the 640px reflow case has no page-level horizontal overflow, and mobile fallbacks remain complete.

### `AC-004` — Q2 closure

Pass only when focused tests, the Chromium/Firefox/WebKit browser matrix, design checks, type checking, production build, bundle budget, Q2 aggregate, GitNexus change detection, and independent review all produce fresh PASS evidence with no relevant skip or malformed artifact.

## Dependency and Ownership Rules

- External execution dependencies are the six sibling packs named in Decision
  6. They gate `UNIT-002` onward. `UNIT-001` writes evidence only and records
  the siblings' current status without waiting for them to finish.
- One writer owns a file at a time. Files carrying unfamiliar modifications are frozen until their owner finishes; then this pack rereads and applies only the readability delta.
- The plan owns no public-route files and no sibling Plan Pack files.
- Before editing any function/component symbol, refresh the GitNexus index if stale with `node .gitnexus/run.cjs analyze` as the sole heavy process, then run upstream `impact` for that symbol. HIGH or CRITICAL output must be reported and reflected in the unit's test surface before editing.

## Execution Units

### `UNIT-001` — Reconcile dependencies and capture baseline

**Depends on:** no internal or external implementation unit. This is the
pre-program baseline and does not edit product source.

**Owned paths:** `artifacts/quality/workshop-readability-baseline.json`, `artifacts/playwright/workshop-readability-baseline/`.

1. Record sibling implementation/review status and inspect current
   `git status --short --branch` without modifying the index; unfinished
   siblings are expected and do not block baseline capture.
2. Rerun the exact tiny-text inventory command, store total files/matched files/matches plus the matched-path list, and classify each occurrence by role and interaction importance; do not treat count reduction as success.
3. Capture deterministic authenticated fixtures for 1440x900, 1280x800, 640px reflow, iPhone SE, and iPad. Record viewport, browser, seeded IDs in redacted form, visible rows/nodes/columns, computed role sizes, target boxes, overflow, and screenshots.
4. Record current unrelated diffs for every future owned source path. Do not
   edit or wait on any path that a sibling still owns.
5. Emit machine-readable baseline evidence. Missing auth or fixture data is a failed precondition, not a skipped success.

**Exit:** the pre-program baseline artifact is complete. `UNIT-002` becomes
ready only after the named sibling implementation units release their shared
paths and the baseline inventory is reconciled with any newly added controls.

### `UNIT-002` — Establish scoped semantic primitives

**Depends on:** `UNIT-001` plus completion of the sibling implementation units
named in Decision 6.

**Owned paths:** `src/app/globals.css`, `src/components/workshop/WorkshopShell.tsx`, `src/components/ui/button.tsx`, `src/components/ui/toolbar-icon-button.tsx`, `src/components/ui/table.tsx`, `src/components/ui/tree.tsx`, `src/components/ui/overlays/dialog.tsx`.

1. Define Workshop-scoped semantic text variables/selectors under the existing shell root; do not remap arbitrary Tailwind utility classes wholesale.
2. Reuse existing `data-slot` hooks and add neutral hooks only where needed for toolbar, tree, and dialog roles. Neutral hooks must not alter non-Workshop presentation.
3. Apply the semantic role map, line-height/text-spacing resilience, focus ring containment, and 24px target floor under Workshop scope.
4. Keep visual row/panel dimensions unchanged unless the baseline proves text clips; when geometry changes, use the smallest coherent adjustment and carry it into the density comparison.
5. Verify no selector affects public routes, exports, email, or unauthenticated surfaces.

**Exit:** representative primitive stories/tests show the scoped contract without cross-surface leakage; `UNIT-003` becomes ready.

### `UNIT-003` — Tune density-critical Workshop surfaces

**Depends on:** `UNIT-002`.

**Owned paths:** `src/components/workshop/estimate-sheet/rows/cells.tsx`, `src/components/workshop/EstimateSheetTree.tsx`, `src/components/workshop/EstimateSheetContent.tsx`, `src/components/workshop/ProjectEstimatesTable.tsx`, `src/components/workshop/component-library-manager/AddComponentModal.tsx`, `src/components/sidebar/MainSidebar.tsx`.

1. Replace the 8px/14px variant selector geometry with the semantic control role and a compliant activation box while keeping the cell compact.
2. Promote essential tree status, sheet save/error text, table values, dialog instructions, and sidebar labels to their roles. Preserve tertiary hierarchy through color/weight, not illegible size.
3. Resolve clipping and truncation at the source component; do not widen every column or row globally.
4. Exercise table column resize, tree expand/drag, modal scrolling, sticky headers, drawers, save status, and error banners at every baseline viewport.
5. Compare visible rows/nodes/columns to `UNIT-001`; fix forward until `AC-003` is met.

**Exit:** all representative surfaces satisfy typography, target, density, and responsive contracts; `UNIT-004` becomes ready.

### `UNIT-004` — Add deterministic browser and accessibility proof

**Depends on:** `UNIT-003`.

**Owned paths:** `tests/vitest/workshop-readability-contract.test.ts`, `e2e/workshop-readability-accessibility.spec.ts`, `artifacts/quality/workshop-readability-accessibility.json`, `artifacts/playwright/workshop-readability-accessibility/`.

1. Add a focused contract test that rejects root scaling, asserts required semantic hooks, and checks the role map remains Workshop-scoped.
2. Add Playwright coverage for computed styles, bounding boxes, keyboard order, focus visibility, dialog trap/restore, axe, text-spacing override, internal versus page overflow, visible density counts, and screenshot attachments.
3. Run Chromium, Firefox, WebKit, mobile Safari, iPhone SE, and iPad projects serially against the same authenticated fixture. Cross-browser differences must be explained by platform behavior, not silently skipped.
4. Perform a human GATE-UX comparison at actual browser 100% and 110% zoom as corroborating evidence; automated native-scale and reflow assertions remain the decisive evidence.

**Exit:** `AC-001` through `AC-003` and `GATE-UX` have fresh machine-readable evidence; `UNIT-005` becomes ready.

### `UNIT-005` — Run Q2 verification and independent review

**Depends on:** `UNIT-004`.

**Owned paths:** `artifacts/quality/`, `artifacts/playwright/` generated evidence only; source changes are fix-forward edits returned to their owning unit.

1. Run focused checks, design checks, type checking, production build, bundle budget, and Q2 verification one heavy command at a time.
2. Run `detect_changes(scope="compare", base_ref="main")`; reconcile every changed symbol/flow to this pack and the preserved sibling work.
3. Obtain an independent read-only quality review covering requirement traceability, accessibility, browser evidence, shared primitive leakage, density, and performance/mount regressions.
4. Repair findings in the owning unit and rerun invalidated evidence; never convert a skip, stale artifact, or unavailable browser into PASS.

**Exit:** all criteria and gates pass locally, review findings are closed, and implementation may be marked complete without any hosted claim.

## Exact Evidence Commands

Run serially from the repository root after setting a valid local authenticated Playwright state.

```powershell
git status --short --branch
node .gitnexus/run.cjs analyze
$inventoryRoots=@('src/app/workshop','src/components/workshop')
$inventoryFiles=@(rg --files $inventoryRoots -g '*.ts' -g '*.tsx' -g '*.css')
$inventoryMatchedFiles=@(rg -l 'text-\[(8|9|10|11|12)px\]' $inventoryRoots -g '*.ts' -g '*.tsx' -g '*.css')
$inventoryMatches=@(rg -o --no-filename 'text-\[(8|9|10|11|12)px\]' $inventoryRoots -g '*.ts' -g '*.tsx' -g '*.css')
[ordered]@{source_revision=(git rev-parse HEAD);total_files=$inventoryFiles.Count;matched_files=$inventoryMatchedFiles.Count;matches=$inventoryMatches.Count;paths=$inventoryMatchedFiles} | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath artifacts/quality/workshop-readability-baseline.json -Encoding utf8
rg -n 'text-\[(8|9|10|11|12)px\]' src/components/sidebar
bun x eslint src/app/globals.css src/components/workshop/WorkshopShell.tsx src/components/ui/button.tsx src/components/ui/toolbar-icon-button.tsx src/components/ui/table.tsx src/components/ui/tree.tsx src/components/ui/overlays/dialog.tsx src/components/workshop/estimate-sheet/rows/cells.tsx src/components/workshop/EstimateSheetTree.tsx src/components/workshop/EstimateSheetContent.tsx src/components/workshop/ProjectEstimatesTable.tsx src/components/workshop/component-library-manager/AddComponentModal.tsx src/components/sidebar/MainSidebar.tsx tests/vitest/workshop-readability-contract.test.ts e2e/workshop-readability-accessibility.spec.ts
bun x vitest run tests/vitest/workshop-readability-contract.test.ts tests/vitest/activity-accessibility.test.tsx tests/vitest/library-add-component-modal-a11y.test.tsx tests/vitest/estimate-sheet-column-resize-a11y.test.tsx tests/vitest/resizable-side-panel-a11y.test.tsx --maxWorkers=1
$env:ARCHESTIMATOR_E2E_LIBRARY_BROWSER_MATRIX='1'
bun scripts/quality/run-evidence-command.ts --artifact artifacts/quality/workshop-readability-accessibility.json --evidence-id workshop-readability-accessibility -- playwright test e2e/workshop-readability-accessibility.spec.ts --project=chromium --project=firefox --project=webkit --project=mobile-safari --project=iphone-se --project=ipad --workers=1
bun run lint:design-system
bun run lint:design
bun run type-check
bun run build
bun run quality:bundle-budget
bun run quality:critical
```

Expected signals:

- Inventory emits a revision-bound JSON count/path baseline plus explicit sidebar locations; the final audit classifies every remaining 8px essential role as a failure.
- Focused Vitest reports all listed files passed with zero failed or skipped critical assertions.
- Browser evidence JSON reports all requested projects, viewports, density comparisons, target boxes, axe results, and screenshot/trace paths; authentication redirect or absent fixture exits nonzero.
- Design checks report no authenticated-system violation or accidental public-surface scope.
- Type check and build exit zero; bundle budget emits `artifacts/quality/bundle-budget.json` with PASS.
- `quality:critical` emits a valid Q2 manifest/report with overall PASS. Local evidence does not prove deployment or production behavior.

## Gates

- `GATE-UX`: semantic role map, contrast, target size, keyboard/focus, axe, density, reflow, dialog, screenshots, and actual 100%/110% human comparison all reconciled.
- `GATE-NEXT`: server/client boundaries and mount behavior are unchanged except for intentional presentation hooks; build passes.
- `GATE-PERF`: bundle budget passes and the change does not add mount work, a dependency, or a global selector that expands rendering scope.
- `GATE-VERIFY`: Q2 aggregate and independent read-only review pass with no relevant skip, stale artifact, or unowned diff.

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Blind scaling destroys density or breakpoints | Semantic role map, shell scoping, fixed baseline comparison, explicit ban on root scale. |
| Text grows but rows/columns clip | Same-fixture density measurements, targeted geometry adjustments, table/tree/dialog browser matrix. |
| Tiny controls remain unusable | Bounding-box assertions, keyboard coverage, coarse-pointer project, variant-selector hotspot. |
| Shared primitive edits leak outside Workshop | Neutral slots only, Workshop-root selectors, public-route scope checks, independent review. |
| Concurrent sibling edits are overwritten | Parent dependency order, file reread, one-writer ownership, no reset/stash/clean. |
| Browser run skips for missing auth | Fail-closed precondition and evidence wrapper; a skip cannot satisfy a criterion. |

## Recovery and Resume

1. On interruption, inspect `git status --short --branch`, the last valid evidence artifact, and the current unit; do not reset, clean, stash, or replace unfamiliar work.
2. If an owned source changed since its baseline capture, invalidate screenshots/density measurements and restart from `UNIT-001` for that surface.
3. If only a focused assertion fails, fix forward in its owning unit and rerun that assertion before broader Q2 commands.
4. If a sibling resumes overlapping work, stop writes to that file, preserve both diffs, and resume after parent ownership reconciliation.
5. If browser/auth infrastructure is unavailable, retain implementation status as incomplete and `GATE-UX`/`GATE-VERIFY` as failed; local source inspection is not substitute evidence.

## Stale Triggers

Replan or refresh affected evidence when the Workshop shell root, shared typography/design enforcement, shared button/table/tree/dialog primitives, estimate sheet/tree/table composition, sibling feedback controls, Playwright project matrix, accessibility policy, Q2 matrix, or Git baseline changes before implementation.

## Stop Condition

Stop when `AC-001` through `AC-004`, `GATE-UX`, `GATE-NEXT`, `GATE-PERF`, and `GATE-VERIFY` have fresh local PASS evidence; the independent review has no open finding; the final diff contains only reconciled readability changes plus generated evidence; and no global scale, compatibility layer, feature flag, deployment, or production claim has been introduced.

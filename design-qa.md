## 2026-07-11 publisher workspace remake QA

source visual truth path:
- Current user evidence for `http://localhost:3000/workshop/publisher`: the stacked status controls made the page unusable, and the first remake rendered out of scale beside the rest of Workshop.
- Repo-native references: `DESIGN.md`, `PRODUCT.md`, the current Workshop shell, Projects collection density, shared controls, and the user's correction that Publisher must use the app's compact scale.
- Current authenticated Chrome captures at desktop, tablet, and mobile widths are the rendered source of truth for the final comparison.

implementation screenshot path:
- `.ai/99_scratch/publisher-visual-qa/desktop-active.png`
- `.ai/99_scratch/publisher-visual-qa/tablet-active-list.png`
- `.ai/99_scratch/publisher-visual-qa/tablet-active-detail.png`
- `.ai/99_scratch/publisher-visual-qa/mobile-active-list-final.png`
- `.ai/99_scratch/publisher-visual-qa/mobile-active-detail.png`
- `.ai/99_scratch/publisher-visual-qa/desktop-project-picker.png`
- `.ai/99_scratch/publisher-visual-qa/desktop-edit-wizard.png`
- `.ai/99_scratch/publisher-visual-qa/mobile-edit-wizard.png`

viewport: `1440x900`, `768x900`, and `390x844` authenticated Chrome captures.

state: `/workshop/publisher?status=active`, horizontal command bar, compact project roster, persistent detail pane, searchable create-link picker, link editor, loading/error/empty/success states, and mobile URL-backed detail navigation.

full-view comparison evidence:
- Publisher no longer mounts the collection tab wrapper that forced status filters into a vertical column. Search, status, project, and create actions share one horizontal command bar at desktop widths.
- The final density pass follows the app contract: `12px` maximum titles, `11px` secondary headings, `10px` controls/body, `8-9px` metadata, 32px controls, 64px roster rows, and an `18-23rem` master pane.
- The workspace uses one master-detail model instead of competing cards/table modes, with no dashboard card grid or oversized marketing treatment.
- Desktop capture confirms the command bar stays horizontal and the roster/detail split fits inside the Workshop shell without overflow or oversized type.
- Tablet and mobile captures confirm list-to-detail navigation, full-width detail states, and stable action placement. The final mobile pass places status and project filters side-by-side to reduce toolbar height without truncating their labels.

focused region comparison evidence:
- The create picker shows only manageable projects from the live roster result, includes client/link/estimate readiness, and routes estimate-empty projects to recovery instead of a dead end.
- Mobile project selection writes a `drawer` URL entry, so browser Back returns to the roster; filtering no longer silently substitutes the first row.
- The link editor confirms dirty dismissal and does not show completion until the saved link is successfully refetched and verified.
- The estimate picker preserves code and name on separate lines and removes nested scrolling on narrow layouts.

findings:
- Source-level density review found no remaining Publisher typography above the app's `12px` maximum.
- Rendered desktop, tablet, and mobile comparisons found no remaining P0/P1/P2 layout, scale, cropping, overflow, or hierarchy defects.
- The bottom-left rendering indicator visible in some captures is Next.js development chrome, not Publisher UI.

patches made:
- Rebuilt Publisher as a compact master-detail client-link workspace with a single horizontal command bar.
- Consolidated link creation and editing into one guarded task surface with explicit recovery states.
- Added searchable project readiness, mobile wayfinding, dirty-state protection, verified post-save completion, and app-native density.
- Removed repeated tiny eyebrow labels and side-stripe callouts from the Publisher surface.
- Tightened the mobile command bar after rendered review by pairing the status and project filters on one row.

verification:
- Focused ESLint passed for the changed Publisher source with zero errors; one pre-existing unused local helper warning remains in `sheet-drawer.tsx`.
- `bun run type-check` passed.
- Scoped `git diff --check` passed.
- Authenticated Chrome/Playwright visual captures passed at desktop, tablet, and mobile widths for roster, detail, project picker, and link editor states.
- No test suite was run; the task is a UX/UI remake and the repo policy defaults tests to not required.

final result: pass

## 2026-07-04 projects no-search-results empty state QA

source visual truth path:
- User brief from `http://localhost:3000/workshop/projects`: when a user searches and there are no project results, show a nice main-area message/modal reading "No search results for".
- Existing source state: the Projects page search dropdown is now a seamless liquid-glass disclosure; this empty state should not reintroduce input focus/background changes.

implementation screenshot path:
- blocked: the authenticated browser is the Codex in-app browser, and Computer Use cannot capture `com.openai.codex`. I did not switch the user to a different browser session.

viewport: in-app browser desktop route `/workshop/projects`.

state: project search disclosure open, search query `zzzz-project`, owned project results empty.

full-view comparison evidence:
- Code evidence: `ProjectsPageClient` now renders a centered modal-like empty state inside the `Live projects` section only when a non-empty search produces zero displayed projects.
- The empty state uses a centered white plate with reduced shadow, a compact search icon, "No search results for \"...\"", a short recovery hint, and a clear-search action.

focused region comparison evidence:
- DOM regression evidence asserts the search disclosure still keeps the frosted parent shell while the input remains transparent.
- DOM regression evidence asserts the empty state appears as a named main-content region, contains the query, uses the white plate styling instead of the green-tinted create-modal class, and clears back to the project card when `Clear search` is clicked.
- Live screenshot comparison remains unavailable from this tool context.

findings:
- No source-level P0/P1/P2 findings remain for the requested empty-search state.
- [P2] Rendered visual proof is blocked by the in-app browser capture limitation.
  Location: authenticated `/workshop/projects` in-app browser state.
  Impact: QA cannot honestly claim a screenshot comparison pass.
  Fix: reload the in-app browser manually, or run an approved browser capture path with the authenticated session if screenshot proof is required.

patches made:
- Added the main Projects empty-search state.
- Refined the empty state to center within the Projects container, remove the green-tinted modal material, and use a lighter white plate shadow.
- Updated the focused Projects-page regression to lock empty-state copy, styling hook, and clear-search behavior.

verification:
- `bunx vitest run tests/vitest/projects-page-view-mode.test.tsx --maxWorkers=1` passed: 1 file / 7 tests.
- `bunx vitest run tests/vitest/app-css-regressions.test.ts tests/vitest/projects-page-view-mode.test.tsx --maxWorkers=1` passed: 2 files / 11 tests.
- `node .agents/skills/impeccable/scripts/detect.mjs --strict src/components/workshop/projects-page-client.tsx tests/vitest/projects-page-view-mode.test.tsx` passed.

final result: blocked

## 2026-07-04 workshop collection search disclosure QA

source visual truth path:
- Browser Comment 1 inline screenshot from `http://localhost:3000/workshop/projects`, where the `Show projects search` toolbar icon opens the projects search disclosure.
- User brief: the opened dropdown search input should not have a different background than its parent; it should read as a seamless liquid-glass control.
- Follow-up user brief: the focus UI is still too visible; the search input should not gain an outline/halo or change background color when focused.

implementation screenshot path:
- blocked: the chosen authenticated in-app browser is inside the Codex desktop app, and Computer Use returned `Computer Use is not allowed to use the app 'com.openai.codex' for safety reasons.` I did not switch to Chrome or Playwright because the user is working in the in-app browser.

viewport: in-app browser desktop viewport from the user's comment, `2318x1324`.

state: `/workshop/projects`, project toolbar visible, `Show projects search` disclosure opened.

full-view comparison evidence:
- Source/user evidence identifies the toolbar search trigger and describes the visual mismatch once opened.
- Code evidence after patch: `TreePanelHeader` renders the opened search panel as a frosted liquid-glass shell (`bg-white/70`, `backdrop-blur-xl`, rounded bottom edge) and passes a transparent `SearchInput` wrapper/input inside it without focus-ring styling.

focused region comparison evidence:
- Focused target: shared `TreePanelHeader` search disclosure used by `WorkshopCollectionLayout`.
- Regression evidence asserts the projects search panel keeps its frosted modal background while the searchbox/root stay transparent (`appearance-none`, `bg-transparent`, `shadow-none`, `background-color: transparent`).
- CSS regression evidence asserts the app no longer defines `--editable-focus-bg` or applies the global `background-color: var(--editable-focus-bg)` focus fill.
- Component evidence switches the control from native `type="search"` to `type="text"` with explicit `role="searchbox"` to avoid browser-native searchfield background painting while preserving searchbox semantics.
- Live focused screenshot comparison is blocked by the in-app browser capture limitation above.

findings:
- No source-level P0/P1/P2 findings remain for the requested reusable search-disclosure polish.
- [P2] Browser screenshot comparison remains unavailable.
  Location: authenticated `/workshop/projects` in-app browser state.
  Evidence: Computer Use cannot access the Codex app window, and the user-selected browser is the in-app browser.
  Impact: QA cannot honestly claim a rendered screenshot pass from this tool context.
  Fix: reload the in-app browser manually, or run an approved browser capture path with the authenticated session if screenshot proof is required.

patches made since previous QA pass:
- Restyled the shared `TreePanelHeader` opened search panel as one frosted liquid-glass shell with the focus ring on the parent surface.
- Reset the shared `SearchInput` native search control so the actual input stays transparent instead of creating a separate field background.
- Added focused DOM regression coverage for the projects search disclosure and updated existing TreePanelHeader caller assertions.
- Follow-up patch removed the focus-within ring/transition treatment from the shared search input root and opened search panel, so focus does not create a halo or background-change feel on the field.
- Follow-up patch added a narrow global CSS override for `data-search-input-control="true"` because the app-wide editable-field focus rule was applying the grey `--editable-focus-bg` fill with `!important`.
- Follow-up owner correction removed the grey focus-fill rule itself, deleted `--editable-focus-bg`, and removed the temporary search-only CSS workaround.
- Follow-up correction restored the search disclosure modal fill (`bg-white/70`, blur, rounded panel styling) and kept the field itself transparent; native search input rendering remains removed by using `type="text"` plus `role="searchbox"`.

verification:
- `bunx vitest run tests/vitest/app-css-regressions.test.ts tests/vitest/projects-page-view-mode.test.tsx --maxWorkers=1` passed: 2 files / 11 tests.
- Earlier in this pass, before the final global CSS override, `bunx vitest run tests/vitest/projects-page-view-mode.test.tsx tests/vitest/estimate-tree-modal.test.tsx tests/vitest/estimate-sheet-cost-inputs.test.tsx --maxWorkers=1` failed in two unrelated dialog-opening assertions (`Create project` and `Row item details`), not in the search styling assertions.
- `node .agents/skills/impeccable/scripts/detect.mjs --strict src/components/ui/search-input.tsx src/components/ui/tree-panel-header.tsx` passed.
- `NODE_OPTIONS=--max-old-space-size=8192 bun run type-check` was started for this follow-up and manually interrupted after several quiet minutes with no diagnostics; risk is low because the final fix is CSS plus focused test assertions, and the focused Vitest import/type transform passed.
- `git diff --check -- src/app/globals.css src/components/ui/search-input.tsx src/components/ui/tree-panel-header.tsx tests/vitest/app-css-regressions.test.ts tests/vitest/projects-page-view-mode.test.tsx design-qa.md` passed.

final result: blocked

## 2026-07-04 projects toolbar add-affordance QA

source visual truth path:
- Browser Comment 1 inline screenshot from `http://localhost:3000/workshop/projects`, where the `Manage groups` toolbar trigger should use the same orange add/create affordance as `Add projects`.
- Repo-native reference: `src/components/ui/toolbar-icon-button.tsx` exports `ADD_BUTTON_CLASSNAME` for orange add toolbar controls.

implementation screenshot path:
- blocked: the chosen authenticated in-app browser is inside the Codex desktop app, and Computer Use returned `Computer Use is not allowed to use the app 'com.openai.codex' for safety reasons.` I did not switch to Chrome or a separate browser because the user is working in the in-app browser.

viewport: in-app browser desktop viewport from the user's comment, `2318x1324`.

state: `/workshop/projects`, grouped project view, toolbar `Manage groups` and `Add projects` controls visible.

full-view comparison evidence:
- The source screenshot shows `Manage groups` as the selected toolbar control in the same trailing action region where the add/create controls live.
- Code evidence after patch: `ManageGroupsPopover` uses `ADD_BUTTON_CLASSNAME` on its `ToolbarIconButton` trigger, and `ProjectsPageClient` now uses the same class for `Add projects`.

focused region comparison evidence:
- Focused target: trailing `Project tools` action cluster.
- DOM regression evidence asserts both `Manage groups` and `Add projects` have `bg-orange-100`, `text-orange-700`, and `cursor-pointer`.
- Live focused screenshot comparison is blocked by the in-app browser capture limitation above.

findings:
- No source-level P0/P1/P2 findings remain for the requested orange add-affordance alignment.
- [P2] Browser screenshot comparison remains unavailable.
  Location: authenticated `/workshop/projects` in-app browser state.
  Evidence: Computer Use cannot access the Codex app window, and the user-selected browser is the in-app browser.
  Impact: QA cannot honestly claim a rendered screenshot pass from this tool context.
  Fix: reload the in-app browser manually, or run an approved browser capture path with the authenticated session if screenshot proof is required.

patches made since previous QA pass:
- Applied `ADD_BUTTON_CLASSNAME` to the `Manage groups` popover trigger.
- Replaced the Projects-page one-off `Add projects` orange class with the shared `ADD_BUTTON_CLASSNAME`.
- Added a focused DOM regression assertion that both controls use the orange add affordance.

verification:
- `bunx vitest run tests/vitest/projects-page-group-mode.test.tsx tests/vitest/project-creation-ui.test.ts tests/vitest/add-button-style.test.ts --maxWorkers=1` passed: 3 files / 47 tests.
- `NODE_OPTIONS=--max-old-space-size=4096 bun run type-check` passed.
- `git diff --check -- src/components/workshop/ManageGroupsPopover.tsx src/components/workshop/projects-page-client.tsx tests/vitest/projects-page-group-mode.test.tsx` passed.

final result: blocked

## 2026-07-04 workshop dashboard Doto display font QA

source visual truth path:
- Browser Comment 2 inline screenshot from `http://localhost:3000/workshop`, where the destination-card title `PROJECTS` should use the robotic/pixelized Doto display treatment.

implementation screenshot path:
- blocked: the chosen authenticated in-app browser is inside the Codex desktop app, and Computer Use returned `Computer Use is not allowed to use the app 'com.openai.codex' for safety reasons.` Earlier OS-level screenshot capture landed on another visible app, not the in-app browser.
- supporting artifact: `/Users/philiplewis/Documents/archestimator/.omx/artifacts/visual-ralph/workshop-doto-font/os-screen.png` documents the failed OS-level capture state.

viewport: in-app browser desktop viewport from the user's comment, `1645x1324` page capture.

state: `/workshop` dashboard, four destination-card titles (`Projects`, `Components`, `Templates`, `Library`) visible.

full-view comparison evidence:
- Source/user evidence shows the destination title region but the rendered titles still read as the smooth Doto/default display cut, not the dotted robotic/pixel display cut.
- Source inspection found the first patch loaded Google Doto, but it self-hosted the default `ROND@0` asset. Google Fonts serves a distinct larger asset for `Doto:ROND@100`, which is the dotted/robotic cut Philip was expecting.
- After this patch, `http://localhost:3000/fonts/doto/doto-rond-100-400.ttf` returns HTTP `200 OK` with `Content-Type: font/ttf`, `Content-Length: 173416`.

focused region comparison evidence:
- Focused CSS target: `.dashboard-destination-card-title`.
- The selector now explicitly applies `font-family: var(--font-display)`, `font-variation-settings: "ROND" 100`, `font-weight: 400`, `letter-spacing: 0`, and `text-transform: uppercase`.
- `@font-face` now binds `"Doto"` to the self-hosted Google Doto `ROND@100` asset at `/fonts/doto/doto-rond-100-400.ttf`, so the display token resolves to the intended pixel/robotic face without relying on Vercel/`next/font` behavior or a client-side Google Fonts request.

findings:
- [P1] Doto was loaded from the wrong Google Fonts cut.
  Location: `src/app/globals.css`, dashboard destination-card titles.
  Evidence: the rendered titles looked smooth after the first font patch, and Google Fonts returns different files for default Doto/`ROND@0` (`140332` bytes) versus `Doto:ROND@100` (`173416` bytes).
  Impact: users see a blocky but non-pixel display face instead of the robotic/pixel display style.
  Fix: self-host the Google Doto `ROND@100` file under `public/fonts/doto/doto-rond-100-400.ttf` and set the dashboard title variation to `"ROND" 100`.
- [P2] Browser screenshot comparison remains unavailable.
  Location: authenticated `/workshop` in-app browser state.
  Evidence: app screenshot tooling is blocked from Codex; OS screenshot captured another app.
  Impact: QA cannot honestly claim a final visual pass from side-by-side screenshot evidence in this tool context.
  Fix: reload the in-app browser manually, or run an approved browser capture path with the authenticated session if visual proof is required.

patches made since previous QA pass:
- Replaced the default Doto `ROND@0` asset with `public/fonts/doto/doto-rond-100-400.ttf` from Google Fonts.
- Updated the global `@font-face` for `"Doto"` to point at the self-hosted `ROND@100` asset.
- Hardened `.dashboard-destination-card-title` to explicitly apply the display family, uppercase display settings, and `"ROND" 100`.
- Added regression assertions that `globals.css` references the self-hosted Doto `ROND@100` asset and variation setting.

verification:
- `bunx vitest run tests/vitest/public-font-lcp-audit.test.ts tests/vitest/workshop-dashboard-recent-favorites.test.tsx --maxWorkers=1` passed: 2 files / 16 tests.
- `bun run type-check` hit Node's default heap limit; `NODE_OPTIONS=--max-old-space-size=4096 bun run type-check` passed.
- `curl -I http://localhost:3000/fonts/doto/doto-rond-100-400.ttf` returned HTTP `200 OK`.
- `git diff --check -- src/app/globals.css tests/vitest/public-font-lcp-audit.test.ts tests/vitest/workshop-dashboard-recent-favorites.test.tsx src/components/workshop/dashboard/lib.ts design-qa.md` passed.

final result: blocked

## 2026-06-29 add component modal OpenDesign QA

source visual truth path:
- Open Design project: `/Users/philiplewis/Library/Application Support/Open Design/namespaces/release-stable/data/projects/48c33336-06b3-4b4a-be58-e0bb3014cbfc/add-component-modal.html`
- Reference screenshot: `.omx/artifacts/visual-ralph/add-component-modal/opendesign-rendered-open-v1.png`

implementation screenshot path:
- `.omx/artifacts/visual-ralph/add-component-modal/current-after-12-closed-drawer.png`
- `.omx/artifacts/visual-ralph/add-component-modal/current-after-12-open-drawer.png`
- Metrics: `.omx/artifacts/visual-ralph/add-component-modal/current-after-12-metrics.json`

viewport: local Chromium, 1920x1040 CSS pixels, actual `AddComponentModal` rendered through a temporary proof harness and then removed.

state: Add Component modal open, variant drawer opened to V1, upload thumbnail region visible.

full-view comparison evidence:
- Backdrop overlay computes `backdrop-filter: blur(12px)` while staying transparent, matching the requested background blur behavior.
- Main modal position and size do not move when the drawer opens: x/y/width/height deltas are all `0`.
- Modal shadow includes OpenDesign layers `rgba(23, 29, 40, 0.32)` and `rgba(23, 29, 40, 0.24)` plus the white inset highlight.
- Drawer shadow includes the OpenDesign `rgba(23, 29, 40, 0.56)` right-drawer layer plus inset highlights.
- Drawer opens to the right of the modal with the OpenDesign seam overlap and 533px drawer width.
- Drawer is layered below the modal surface: drawer `z-index: 10`, component panel `z-index: 20`.
- A modal seam shadow is visible above the drawer: seam shadow `z-index: 30`, opacity `1`, covering the drawer's left edge by 37px.

focused region comparison evidence:
- Component group measured `height: 176px`, `bottom: 311px`.
- Variant upload thumbnail block measured `height: 99px`, `bottom: 311px`.
- Thumbnail-to-component bottom delta is `0px`.

findings:
- No actionable P0/P1/P2 findings remain for the requested OpenDesign modal/drawer/shadow/alignment changes.
- Residual note: the full drawer/rail composition follows the wide OpenDesign desktop canvas; the 1920px proof is the reliable comparison viewport.

patches made since previous QA pass:
- Enabled modal backdrop blur while keeping the transparent overlay.
- Removed the conditional modal slide transform when the variant drawer opens.
- Moved modal, drawer, and rail shadows to named OpenDesign shadow constants.
- Changed the drawer closed transform to the OpenDesign hidden state and kept open state as `translate-x-0`.
- Moved the drawer under the modal surface and added the OpenDesign right-edge seam shadow above it.
- Changed drawer animation to explicit `transform, opacity` easing with OpenDesign-style cubic bezier.
- Locked the main Component group to 176px and the variant upload thumbnail block to 99px with an 83px image column.
- Adjusted drawer body top inset to align the variant thumbnail block bottom exactly with the main Component group bottom.

verification:
- `ADD_COMPONENT_VISUAL_BASE_URL=http://127.0.0.1:3000 node .omx/tmp/add-component-modal-visual-proof.mjs` passed.
- `bun run test:dom -- tests/vitest/library-add-component-modal-a11y.test.tsx tests/vitest/component-library-manager-ui.test.tsx` passed: 30 tests.
- `bunx eslint src/components/workshop/component-library-manager/AddComponentModal.tsx tests/vitest/component-library-manager-ui.test.tsx tests/vitest/library-add-component-modal-a11y.test.tsx` passed.
- `node .agents/skills/impeccable/scripts/detect.mjs --strict src/components/workshop/component-library-manager/AddComponentModal.tsx` passed.
- `git diff --check` passed.
- `bun run type-check` is blocked by unrelated worktree file `src/lib/observability/with-action-errors.ts` with TS2352.

final result: passed

## 2026-06-28 dashboard shell continuity QA

source visual truth path:
- User reference: /Users/philiplewis/.codex/attachments/1036cb6f-cb40-4df0-af63-e6ed5d5b86f2/image-1.png
- Live projects reference after reload: /Users/philiplewis/Documents/archestimator/.omx/artifacts/dashboard-continuity/projects-reference-live.png

implementation screenshot path:
- /Users/philiplewis/Documents/archestimator/.omx/artifacts/dashboard-continuity/dashboard-after.png

viewport: authenticated desktop Chrome window, cropped to the app surface, approximately 2294x1352 screen pixels.

state: `/workshop` dashboard compared against `/workshop/projects`; left workshop sidebar, top title/header row, dashboard/projects body, and bottom feedback footer visible.

full-view comparison evidence:
- The projects page reference paints the route wash at the shared workshop shell level, so the header, content, and footer sit on one continuous plane.
- The dashboard previously painted `dashboard-canvas-wash` only inside `WorkshopDashboard`, leaving the shell header and footer on a different material.
- After the patch, `/workshop` passes `canvasClassName="dashboard-canvas-wash"` into `WorkshopPageShell`; the dashboard scroller no longer paints its own route-level background.

focused region comparison evidence:
- Header seam: the dashboard greeting/header row now shares the same warm dashboard wash as the body instead of starting above a separate body-only wash.
- Body transition: dashboard tiles remain unchanged, but their surrounding canvas now continues behind the chrome rows like projects.
- Footer seam: the footer sits on the same route-level wash instead of an isolated bottom strip.
- The macOS screen-recording notification appears in the saved screenshots; it is outside the app surface and not an app visual defect.

findings:
- No actionable P0/P1/P2 findings remain for the requested dashboard header/body/footer continuity.

patches made since previous QA pass:
- Added `canvasClassName="dashboard-canvas-wash"` to the `/workshop` `WorkshopPageShell`.
- Removed the duplicate `dashboard-canvas-wash` class from the inner dashboard overflow container.
- Left dashboard card layout, content hierarchy, interactions, and projects page styling untouched.

verification:
- `bunx eslint src/app/workshop/page.tsx src/components/workshop/dashboard/WorkshopDashboard.tsx` passed.
- `bun run type-check` passed.
- `git diff --check` passed.
- Live authenticated Chrome visual check passed for `/workshop` and `/workshop/projects`; screenshots saved under `.omx/artifacts/dashboard-continuity/`.

final result: passed

## 2026-06-27 estimate sheet header/footer continuity QA

source visual truth path:
- Reference target: `/workshop/projects` in-app browser screenshot from the user's previous reference, where header, canvas, and footer read as one continuous shell.
- Failure evidence: /var/folders/xg/_lqq86w138vctk9_ll6g8h840000gn/T/codex-clipboard-4ca32bf3-7b9a-4b56-a099-98248918d6ea.png

implementation screenshot path:
- blocked: current authenticated `http://localhost:3000/workshop/projects/0139e1e5-951d-4f2f-9081-6c953d288d8a/estimates/8080f04c-fe18-4314-a1d8-9222e62d1eed` cannot be captured from a fresh system Chrome context because it redirects to `/login`.

viewport: desktop in-app browser screenshot, approximately 2048px wide.

state: Estimate sheet with left estimate tree, center estimate grid, right Project library tab, and bottom running-total footer visible.

full-view comparison evidence:
- The failure screenshot shows a distinct top header strip, a separately painted center estimate well, and a distinct bottom totals footer strip.
- Projects reference behavior is a single continuous shell material behind header/content/footer, without the header and footer reading as independent cards or bands.
- Code evidence after patch: the estimate route marker `[data-workshop-page-shell-canvas][data-estimate-sheet-route="true"]` now paints `--estimate-glass-well-bg` once on `.workshop-workspace-glass-surface`, while `.estimate-glass-well` is transparent with no inset shadow.

focused region comparison evidence:
- Top seam: the prior header area used shell chrome over a different background than the estimate content well.
- Bottom seam: the prior totals footer used shell chrome over a different background than the estimate content well.
- Center estimate name: the prior estimate-name chip had its own `bg-white/70`, shadow, and backdrop blur; it now uses transparent background and no shadow.
- A fresh focused screenshot comparison is blocked by authenticated in-app session access.

findings:
- [P1] Header and footer still read as separate bands in the supplied estimate-sheet screenshot.
  Location: `WorkshopPageShell` estimate route shell, `.workshop-workspace-glass-surface`, `.estimate-glass-well`, and `ProjectEstimateMetadataStrip`.
  Evidence: the user screenshot shows three background planes: header strip, estimate workspace well, footer strip.
  Impact: the estimate sheet feels assembled from disconnected layers instead of matching the seamless projects-page shell.
  Fix: paint the estimate well material once at the shared shell level for estimate routes, make the inner estimate well transparent, and remove the center header chip fill/shadow.

patches made since previous QA pass:
- Added `--estimate-glass-well-bg` token to `src/app/globals.css`.
- Scoped estimate routes so `.workshop-workspace-glass-surface` uses `--estimate-glass-well-bg`.
- Changed `.estimate-glass-well` to `background: transparent` and removed its inset shadow so it no longer creates a second plane.
- Removed the estimate-name metadata chip's white background, shadow, and backdrop blur in `src/components/workshop/ProjectEstimateMetadataStrip.tsx`.

verification:
- `git diff --check -- src/app/globals.css src/components/workshop/ProjectEstimateMetadataStrip.tsx` passed.
- `bunx tsc --noEmit --pretty false` is blocked by pre-existing schema/type errors around `adjustment_percentage` in estimate/publication repositories; these errors are unrelated to the touched CSS/header files.

final result: blocked

## 2026-06-25 library toolbar background QA

source visual truth path:
- /Users/philiplewis/.codex/attachments/c9a8ee93-3c18-4739-9f13-aba35dcab00d/image-1.png
- /Users/philiplewis/.codex/attachments/c9a8ee93-3c18-4739-9f13-aba35dcab00d/image-2.png

implementation screenshot path:
- blocked: current `http://localhost:3000/workshop/library` requires the user's authenticated in-app session; a fresh system Chrome context redirects to `/login?next=%2Fworkshop%2Flibrary`.

viewport: desktop in-app browser reference viewport.

state: `/workshop/library` page-level search header icon toolbar and tabs toolbar compared against `/workshop/projects`.

full-view comparison evidence:
- Source Library screenshot shows a pale rectangular slab behind the search icon row and library tab row.
- Source Projects screenshot shows the toolbar and tab controls blending into the same washed canvas surface, without a distinct header slab.
- Code evidence after patch: `LibraryTabsLayoutClient` now uses `dashboard-canvas-wash estimate-glass-divider shrink-0 bg-transparent` for the Library toolbar/tabs wrapper instead of `estimate-glass-chrome estimate-glass-divider shrink-0`.

focused region comparison evidence:
- Focused visual issue is confined to the page-level Library toolbar/tabs wrapper.
- `HeaderIconToolbar` remains explicitly `bg-transparent`.
- `TabStrip` remains `variant="glass"` with `className="border-b-0 bg-transparent"`.
- Live focused screenshot comparison is blocked by auth/session access as noted above; no broader layout or content regions were changed.

findings:
- No source-level P0/P1/P2 findings remain for the requested toolbar background mismatch.
- Browser-rendered visual QA remains blocked by authenticated session access.

patches made since previous QA pass:
- Replaced the Library page-level toolbar/tabs wrapper's frosted glass chrome background with the shared dashboard canvas wash used by the Projects page family.
- Preserved the existing soft divider, search behavior, add action, tab ids, and tab active-state behavior.

verification:
- `bun run type-check --pretty false` passed.
- `bun run lint -- src/components/workshop/library/LibraryTabsLayoutClient.tsx` passed.
- `git diff --check -- src/components/workshop/library/LibraryTabsLayoutClient.tsx` passed.

final result: blocked

## 2026-06-25 workshop project card comment 1 QA

source visual truth path: Browser Comment 1 inline screenshot from `http://localhost:3000/workshop/projects` (chat attachment; no filesystem path exposed)
implementation screenshot path: /Users/philiplewis/Documents/archestimator/.omx/artifacts/visual-ralph/project-card-comment-1/implementation-card.png
viewport: in-app browser desktop viewport, focused card crop
state: `/workshop/projects`, Lewis Residence project card visible after local dev-server reload

full-view comparison evidence:
- The map/thumbnail now runs to the inner card's visible top/side edges, separated only by the 1px hairline border.
- The information area below the thumbnail has a translucent frosted background instead of a flat white block.
- The project information retains padding inside the lower panel.
- The previous `1 favorite` metadata pill is no longer rendered on the tile.

focused region comparison evidence:
- DOM measurement after reload: thumbnail edge deltas versus the inner card were left `1px`, right `1px`, top `1px`.
- Computed info-panel padding was `8px` on all sides.
- Computed info-panel background was a layered translucent white/cool-white gradient over `rgba(255,255,255,0.34)`.
- DOM check for the project-card vitals text returned `hasFavoriteVital: false`.

findings:
- No actionable P0/P1/P2 findings remain for the requested card changes.

patches made since previous QA pass:
- Removed the favorite-count metadata vital from project tiles while leaving the actual favorite toggle control intact.
- Made the tile thumbnail flush with the inner card edges.
- Added `.workshop-project-card-content` as a reusable frosted lower information panel.
- Kept the lower information area padded and constrained to the existing project-card glass system.

final result: passed

## 2026-06-25 hero mount motion QA

route: http://localhost:3000/
viewport/state: 1920x1080 public landing page, no-preference motion, cookie consent pre-set to essential for unobstructed screenshots.

implementation screenshot paths:
- /tmp/archestimator-hero-motion-clean-pre-mockup.png
- /tmp/archestimator-hero-motion-clean-emerging.png
- /tmp/archestimator-hero-motion-clean-final.png
- /tmp/archestimator-hero-motion-clean-reduced.png

focused motion evidence:
- At 1800ms, title opacity is 1, hero illustration opacity is 1, metric card opacities are 0.9955 / 0.9774 / 0.9284, and the product mockup is still opacity 0 with translateY 56px.
- At 2200ms, the metric cards are fully visible and the product mockup has just started: opacity 0.0889, translateY 51.0194px, blur 12.7548px, clip-path inset 10.9327%.
- At 2600ms, the product mockup has faded/risen into place: opacity 0.9623, translateY 2.1111px, blur 0.5278px.
- At 3300ms, the product mockup is settled: opacity 1, transform none, filter none, clip-path none.
- Reduced motion at 250ms shows title, illustration, metric cards, and product mockup all visible with transform none.

patches verified:
- Product mockup is registered as `data-hero-motion="mockup"` and sequenced by the existing GSAP hero mount timeline.
- Independent CSS keyframe mount animations were removed from the mockup shell/body/dots so the mockup no longer races the hero timeline.
- Mockup starts hidden and lower, then fades upward as the last hero beat after the title, hero image, CTAs, and metric cards.
- Reduced-motion CSS and GSAP fallback keep the mockup visible immediately without transform/filter animation.

verification:
- `bunx eslint src/components/landing-v3/HeroMountMotion.tsx src/components/landing-v3/ArchestimatorLandingPage.tsx --max-warnings=0` passed.
- `git diff --check -- src/components/landing-v3/HeroMountMotion.tsx src/components/landing-v3/ArchestimatorLandingPage.tsx src/components/landing-v3/landing-v3.module.css` passed.
- `PLAYWRIGHT_PORT=3000 bun run test:e2e -- e2e/frontdoor-landing-visual.spec.ts --project=chromium` passed: 3 tests.

final result: passed

## 2026-06-24 responsive landing hero QA

source visual truth path: /Users/philiplewis/.codex/attachments/6c5166d4-c743-4a98-8eb3-55f777b30755/image-1.png

implementation screenshot paths:
- /tmp/archestimator-product-phase-2048.png
- /tmp/archestimator-product-phase-2560.png
- /tmp/archestimator-intro-fix-1440.png
- /tmp/archestimator-intro-fix-390.png
- /tmp/archestimator-intro-fix-320.png

viewport/state coverage:
- 2048x1200 and 2560x1200, public landing page, cookie settings collapsed, hero mockup waited to `drag-fauxwood` so the estimate rows and right library sidebar are visible.
- 1440x1200, product mockup visible with the mid-desktop left inset adjustment.
- 1439px and below, product mockup hidden before it can collide with the copy/CTA; metric/photo surface remains visible.
- 820px, 390px, and 320px, compact stacked metric cards with no text collision.

focused evidence:
- 2048 mockup measured at x 537, y 257, width 1467, height 439, right 2004, matching the reference composition.
- 2560 mockup measured at x 666, y 257, width 1848, height 499, right 2514; large-screen metric cards are capped at 502px tall instead of ballooning.
- 1440 mockup measured at x 416, y 251, width 988, height 439; no overlap with heading, intro, primary CTA, or secondary CTA.
- 390 and 320 have no horizontal overflow and no internal metric label collisions.
- Product-phase screenshots confirm visible faucet/ceramic estimate rows, visible `600x600 ceramic tiles`, and visible highlighted `200x1200 faux wood tiles` in the right sidebar.

patches verified:
- Capped large-screen metric grid row height with `min(var(--hero-grid-cell), 15.45rem)`.
- Increased mockup height only above 2048px so very wide screens preserve the product surface proportion.
- Hid the product mockup in the narrow desktop handoff range where it cannot fit without colliding.
- Shifted the 1440-1535px mockup start inward so the product stays visible without covering CTAs.
- Tightened hero intro measure to keep longer copy out of the mockup.
- Added compact metric card layout below 820px so phone/tablet widths do not squeeze desktop cards into unreadable columns.

verification:
- `git diff --check -- src/components/landing-v3/landing-v3.module.css` passed.
- `bunx eslint src/components/landing-v3/ArchestimatorLandingPage.tsx src/components/landing-v3/HeroEstimateWorkspaceMockup.tsx e2e/frontdoor-landing-visual.spec.ts --max-warnings=0` passed.
- `PLAYWRIGHT_PORT=3000 bun run test:e2e -- e2e/frontdoor-landing-visual.spec.ts --project=chromium` passed: 3 tests.

final result: passed

source visual truth path: /var/folders/xg/_lqq86w138vctk9_ll6g8h840000gn/T/codex-clipboard-7b4a9b80-646d-4cd3-9f60-a66426700d3a.png
implementation screenshot path: /tmp/archestimator-hero-corrected-drag-faucet.png
animation screenshots:
- /tmp/archestimator-hero-corrected-drag-faucet.png
- /tmp/archestimator-hero-corrected-drag-ceramic.png
- /tmp/archestimator-hero-corrected-drag-fauxwood.png
- /tmp/archestimator-hero-corrected-fauxwood-replaced.png
viewport: 2048x1200 CSS px
state: public landing page at http://localhost:3000/ with the hero mockup using the real estimate workspace components.

full-view comparison evidence:
- The hero mockup now renders `EstimateWorkspaceClient` with sanitized data, so the visible panes are the actual sheet tree, estimate sheet, and right library sidebar components rather than a hand-drawn clone.
- The complete right sidebar fits within the mockup body at desktop width.
- The expand/collapse sidebar controls and expand/collapse tree/tab controls are hidden only in the decorative hero mockup.

focused region comparison evidence:
- Measured headline bottom: y 257.
- Measured mockup parent: x 537, y 257, width 1467, height 439, right 2004.
- Measured mockup body: x 541, y 295, width 1458, height 397, right 1999.
- Measured left pane: x 545, y 298, width 308, right 853.
- Measured estimate sheet: x 856, y 298, width 678, right 1534.
- Measured right sidebar: x 1537, y 298, width 459, right 1996.
- Top alignment result: mockup parent top aligns to the headline bottom with 0px delta.
- Resulting visible gutters after scaling: 3px left padding, 3px tree-to-sheet gap, 3px sheet-to-sidebar gap, 3px right padding.
- Decorative resize handles are hidden in the hero mockup so the sidebar-to-sheet gap is not doubled.
- Required structure labels present: Estimate Tree, Lot 24A, Ground Floor, Living Room, Kitchen, Dining Room, Powder Room, Second Floor, Master Bedroom, Bedroom A, Bedroom B, Library, Project, Templates.
- Per-node tree disclosure controls are visible for the expandable nodes: Lot 24A, Ground Floor, and Second Floor.
- Kitchen is the active selected node: the center estimate sheet starts with Kitchen and the tree row carries the selected left-border treatment.
- The selected Kitchen tree row no longer uses the white glass lift background; only the left selection rail remains.
- The Kitchen sheet section has 6px of top breathing room before its header.
- Kitchen sheet header and add-row band continue to use the existing glass system: `.estimate-glass-headchrome`, `border-hairline`, and the standard glass add-row surface.
- The shared estimate sheet pointer surface now uses `pt-1`; computed top padding is 4px.
- Direct unauthenticated browser verification of the requested real estimate URL redirects to `/login`, but the changed selectors and source are shared by that route.
- The right Library sidebar is populated with Fixture > Faucet and Finishes > Floor; the Furniture folder has been removed.
- Library components present: Single-lever kitchen faucet, 600x600 ceramic tiles, and 200x1200 faux wood tiles.
- Corrected animation follows the real component flow: hover reveals the library row drag rail, drag publishes the real library-item drag state, and the Kitchen sheet renders the actual dashed "Drag and drop estimate component into Kitchen" drop zone.
- Faucet drag evidence: the Single-lever kitchen faucet source row shows a visible 16px drag rail with opacity 1, the Kitchen drop zone is present, and the arrow cursor plus drag ghost sit over the drop zone.
- Ceramic drag evidence: the 600x600 ceramic tiles source row shows a visible drag rail with opacity 1, the Kitchen drop zone is present below the faucet row, and the inserted row displays 24 sqm with a ₱18,720 subtotal.
- Replacement evidence: the 200x1200 faux wood tiles source row shows a visible drag rail with opacity 1, the faux-wood drag highlights the existing 600x600 ceramic tile material cell, and the final same row id displays 200x1200 faux wood tiles with quantity value 24.
- Computer Use note: direct Computer Use against the Codex in-app browser is blocked for `com.openai.codex`; real interaction study used the workspace source for drag/drop rules and system Chrome for non-auth visual proof.

findings:
- No actionable P0/P1/P2 findings remain for the requested hero estimate-workspace mockup composition.

required fidelity surfaces:
- Fonts and typography: inherited from the real estimate workspace components.
- Spacing and layout rhythm: outer decorative inset is reduced; inner pane padding and gaps are tightened inside the hero only so the scaled panes fit the small mockup without excessive side gutters.
- Colors and visual tokens: shell keeps the landing frosted chrome; internal surfaces use the actual glass estimate workspace styling.
- Copy and content: sanitized data only, matching the requested top-of-sheet structure.

patches made:
- Added `HeroEstimateWorkspaceMockup` to render `EstimateWorkspaceClient` with sanitized project, sheet tree, tab, library, and template data.
- Replaced the sparse placeholder tree with a realistic `Lot 24A` hierarchy containing floor and room areas.
- Set the mockup's selected node to Kitchen on the active Page 001 tab.
- Removed the selected tree row's white background and added top padding to the Kitchen sheet branch with hero-scoped CSS.
- Promoted selected glass tree-row background removal to the shared estimate glass styles so real estimate pages use the same treatment.
- Added shared top padding to the estimate sheet pointer surface below the tab strip.
- Added sanitized library folders and reusable component items to the hero workspace mockup.
- Removed the Furniture library folder from the sanitized hero mockup.
- Added a slower hero animation with a triangular arrow cursor, source hover phases, drag-image style ghosts, real component-drop-zone state for insert drags, and row replacement targeting for the final faux-wood swap.
- Placed that component inside the landing hero mockup frame.
- Removed the decorative expand/minimize controls from the hero mockup via scoped CSS.
- Removed the decorative resize handles from the hero mockup via scoped CSS.
- Reduced the mockup body inset and scoped workspace padding/gap to keep the right sidebar visible and avoid oversized gutters.
- Increased the mockup parent height and moved its top edge upward to align with the top line of the hero headline.
- Shifted the full hero visual stage downward so the mockup parent top aligns with the CTA row while preserving mockup and hero image sizes.
- Increased the mockup parent height upward again so its top edge aligns with the bottom of the hero headline while preserving the lower edge.

final result: passed

---
version: alpha
name: Archestimator Product Design System
description: SF Pro, crisp-xs, neutral product UI for every non-landing Archestimator surface; landing pages may stay more experimental.
colors:
  primary: "#292929"
  ink: "#292929"
  secondary: "#5D5D5D"
  tertiary: "#7F7F7F"
  muted: "#7F7F7F"
  hairline: "#F2F2F2"
  divider: "#F2F2F2"
  background: "#FFFFFF"
  canvas: "#F5F5F5"
  warmCanvas: "#F5F5F5"
  surface: "#FFFFFF"
  surfaceMuted: "#F5F5F5"
  surfaceWarm: "#F5F5F5"
  accent: "#292929"
  accentSoft: "#F5F5F5"
  focus: "#292929"
  success: "#15803D"
  successSoft: "#DCFCE7"
  warning: "#B45309"
  warningSoft: "#FEF3C7"
  danger: "#B91C1C"
  dangerSoft: "#FEE2E2"
  proposalPaper: "#FFFDF8"
typography:
  # Landing/marketing-only scale. Do not use these tokens inside /workshop or product/app surfaces.
  display:
    fontFamily: "Inter"
    fontSize: 4rem
    fontWeight: 400
    lineHeight: 1.04
    letterSpacing: "-0.055em"
    scope: "landing-only"
  headline-lg:
    fontFamily: "Inter"
    fontSize: 2.8125rem
    fontWeight: 400
    lineHeight: 1.08
    letterSpacing: "-0.045em"
    scope: "landing-only"
  h1:
    fontFamily: "Inter"
    fontSize: 2.25rem
    fontWeight: 430
    lineHeight: 1.1
    letterSpacing: "-0.04em"
    scope: "landing-only"
  h2:
    fontFamily: "Inter"
    fontSize: 1.75rem
    fontWeight: 430
    lineHeight: 1.16
    letterSpacing: "-0.035em"
    scope: "landing-only"
  h3:
    fontFamily: "Inter"
    fontSize: 1.4375rem
    fontWeight: 450
    lineHeight: 1.22
    letterSpacing: "-0.025em"
    scope: "landing-only"
  body-lg:
    fontFamily: "Inter"
    fontSize: 1.125rem
    fontWeight: 350
    lineHeight: 1.45
    letterSpacing: "-0.015em"
    scope: "landing-only"
  body:
    fontFamily: "Inter"
    fontSize: 1rem
    fontWeight: 350
    lineHeight: 1.45
    letterSpacing: "-0.01em"
    scope: "landing-only"
  proposal-body:
    fontFamily: "Source Serif 4"
    fontSize: 0.9375rem
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "0em"
    scope: "proposal/export-only"

  # Product/workshop/app scale. This is the default outside the landing page.
  app-title:
    fontFamily: "SF Pro"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 16px
    letterSpacing: "0em"
  app-subtitle:
    fontFamily: "SF Pro"
    fontSize: 11px
    fontWeight: 500
    lineHeight: 14px
    letterSpacing: "0em"
  app-body:
    fontFamily: "SF Pro"
    fontSize: 10px
    fontWeight: 400
    lineHeight: 14px
    letterSpacing: "0em"
  app-body-muted:
    fontFamily: "SF Pro"
    fontSize: 10px
    fontWeight: 400
    lineHeight: 14px
    letterSpacing: "0em"
  app-label:
    fontFamily: "SF Pro"
    fontSize: 9px
    fontWeight: 500
    lineHeight: 12px
    letterSpacing: "0em"
  app-label-sm:
    fontFamily: "SF Pro"
    fontSize: 8px
    fontWeight: 400
    lineHeight: 10px
    letterSpacing: "0em"
  app-button:
    fontFamily: "SF Pro"
    fontSize: 10px
    fontWeight: 500
    lineHeight: 12px
    letterSpacing: "0em"
  app-table-cell:
    fontFamily: "SF Pro"
    fontSize: 10px
    fontWeight: 400
    lineHeight: 14px
    letterSpacing: "0em"
  app-numeric:
    fontFamily: "SF Pro"
    fontSize: 10px
    fontWeight: 500
    lineHeight: 13px
    letterSpacing: "0em"
    fontFeature: "tnum"

  # Legacy aliases retained only for landing/proposal compatibility. Product UI must use app-* tokens above.
  body-sm:
    fontFamily: "SF Pro"
    fontSize: 10px
    fontWeight: 400
    lineHeight: 14px
    letterSpacing: "0em"
  label:
    fontFamily: "SF Pro"
    fontSize: 9px
    fontWeight: 500
    lineHeight: 12px
    letterSpacing: "0em"
  label-sm:
    fontFamily: "SF Pro"
    fontSize: 8px
    fontWeight: 400
    lineHeight: 10px
    letterSpacing: "0em"
  nav-link:
    fontFamily: "SF Pro"
    fontSize: 10px
    fontWeight: 400
    lineHeight: 12px
    letterSpacing: "0em"
  button-text:
    fontFamily: "SF Pro"
    fontSize: 10px
    fontWeight: 500
    lineHeight: 12px
    letterSpacing: "0em"
  table-cell:
    fontFamily: "SF Pro"
    fontSize: 10px
    fontWeight: 400
    lineHeight: 14px
    letterSpacing: "0em"
  numeric:
    fontFamily: "SF Pro"
    fontSize: 10px
    fontWeight: 500
    lineHeight: 13px
    letterSpacing: "0em"
    fontFeature: "tnum"
rounded:
  none: 0px
  xs: 3px
  sm: 3px
  md: 3px
  lg: 3px
  xl: 3px
  full: 3px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 20px
  xl: 48px
  xxl: 64px
  section: 112px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    typography: "{typography.button-text}"
    rounded: "{rounded.xs}"
    padding: 10px
    height: 40px
  button-primary-hover:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.surface}"
    typography: "{typography.button-text}"
    rounded: "{rounded.xs}"
    padding: 10px
    height: 40px
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.button-text}"
    rounded: "{rounded.xs}"
    padding: 10px
    height: 40px
  button-link:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.nav-link}"
    rounded: "{rounded.xs}"
    padding: 0px
  app-sidebar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.nav-link}"
    rounded: "{rounded.xs}"
    width: 248px
  app-sidebar-collapsed:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.nav-link}"
    rounded: "{rounded.xs}"
    width: 56px
  workspace-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.xs}"
    padding: 16px
  product-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.xs}"
    padding: 16px
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.xs}"
    padding: 12px
    height: 40px
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.xs}"
    padding: 6px
  estimate-cell:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.table-cell}"
    padding: 8px
    height: 36px
  estimate-cell-selected:
    backgroundColor: "{colors.accentSoft}"
    textColor: "{colors.ink}"
    typography: "{typography.table-cell}"
    padding: 8px
    height: 36px
  financial-total-card:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    typography: "{typography.numeric}"
    rounded: "{rounded.xs}"
    padding: 16px
  library-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.xs}"
    padding: 16px
  proposal-page:
    backgroundColor: "{colors.proposalPaper}"
    textColor: "{colors.ink}"
    typography: "{typography.proposal-body}"
    rounded: "{rounded.xs}"
    padding: 32px
  status-approved:
    backgroundColor: "{colors.successSoft}"
    textColor: "{colors.success}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.xs}"
    padding: 6px
  status-review:
    backgroundColor: "{colors.warningSoft}"
    textColor: "{colors.warning}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.xs}"
    padding: 6px
  status-danger:
    backgroundColor: "{colors.dangerSoft}"
    textColor: "{colors.danger}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.xs}"
    padding: 6px
---

## Overview

Archestimator uses a strict **SF Pro product design system** outside the landing page: regular/medium typography, neutral colors, 1px-outline-style icons, and xs-only radius. The landing page may remain more experimental and can keep larger editorial rhythms, but app/workshop UI must stay enforceable and product-like.

The result should not be a generic construction dashboard. It should feel like premium SaaS for contractors and design-build teams: editorial on public/landing pages, efficient and full-browser in the authenticated app, and document-like in proposal output.

Primary product surfaces:

- public landing and dashboard entry pages;
- full-browser project/estimate workspaces;
- spreadsheet-like estimate sheets with location hierarchy;
- reusable material/cost/assembly libraries;
- row inspector, revision history, and proposal settings panels;
- client-ready proposal packages.

## Colors

- **Strong (`#292929`)** anchors headings, active actions, totals, and high-emphasis UI.
- **Default (`#5D5D5D`)** is the normal app/workshop text color for body copy and controls.
- **Subtle (`#7F7F7F`)** supports navigation, metadata, descriptions, empty states, labels, and passive states. Do not use subtle text for financial totals or critical risk indicators.
- **Selected background (`#F5F5F5`)** is the only neutral selected/hover surface outside semantic success/warning/danger states.
- **Surface (`#FFFFFF`)** is the dominant canvas for landing, cards, grid cells, forms, panels, and modals.
- **Border (`#F2F2F2`)** replaces heavy shadows. Use thin borders and whitespace for separation.
- **Functional colors** retain meaning only: success for approved/current/safe, warning for provisional/source-review/cost-risk, danger for destructive/error/excluded/cost increase.
- **Proposal paper (`#FFFDF8`)** distinguishes client-facing documents from app dashboards.

Color discipline is mandatory outside the landing page: use strong/default/subtle text, selected background, and border tokens first. Orange is landing/brand expression only unless Philip explicitly approves a named app exception.

## Typography

Use the attached product-reference model outside the landing page for font family, weights, colors, icon style, and radius, while preserving Archestimator's compact app font-size density.

- **App/workshop font:** SF Pro via the system stack: `"SF Pro Text", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.
- **App/workshop weights:** regular (`400`) and medium (`500`) only. No bold, semibold, mono, serif, or Poppins in app UI.
- **App/workshop sizes:** `12px` maximum. Use `12px` for strongest titles only, `11px` for subtitles/secondary headings, `10px` for body, nav, controls, inputs, tabs, chips, buttons, table cells, and numeric values, and `8-9px` for meta/eyebrow labels.
- **Hierarchy invariant:** labels, eyebrows, metadata, helper copy, and muted subheaders must never render larger than the input/control/body text they describe. Use `8-9px` for labels/meta and keep muted supporting text at `10px` or below.
- **App/workshop letter spacing:** `0`. Do not use negative tracking, wide uppercase tracking, or arbitrary tracking utilities.
- **App/workshop icons:** regular 1px-outline-style iconography. Current Phosphor icons must use regular weight until/unless a dedicated 1px icon library is approved.
- **Display / headline:** light-to-regular weight, very tight tracking, intentional line breaks, generous surrounding whitespace. Use for landing hero, dashboard hero, major product statements, and empty-state moments.
- **Body copy:** compact, calm, and short. Public pages should avoid dense paragraphs. App panels should use `body-sm` where useful but stay readable for long estimating sessions.
- **Labels/navigation/buttons:** small sans-serif, high clarity, not over-bold. CTAs are compact and precise, not oversized marketing pills.
- **Numeric:** SF Pro with tabular numbers for quantities, unit costs, subtotals, totals, deltas, percentages, and version comparison values.
- **Proposal body:** Source Serif 4 remains for formal client-facing proposal paragraphs, terms, assumptions, and signature blocks.

Target text rhythm:

- Landing H1: 64px desktop / 42–48px tablet / 34–38px mobile.
- Landing section H2: 45px desktop / 34px tablet / 28px mobile.
- Outside the public landing page, **12px is the hard maximum** unless Philip explicitly approves a named exception.
- App/workshop/card titles: `12px` maximum.
- App subtitles and secondary headings: around `11px`.
- App body, nav, controls, tables, inputs, tabs, chips, toolbar labels, and button text: normally `10px`.
- App meta/eyebrow/helper labels: `8-9px`; these must be visually smaller than paired inputs, controls, values, and body text.
- Estimate cells: normally `10px` with strong contrast, tabular numbers, and enough row height for scanning.

## Component reuse contract

All app/workshop UI must be built from shared primitives and reusable product components. Before adding local markup, agents must check `src/components/ui/` and the relevant `src/components/workshop/` shared components, then reuse or extend them.

Mandatory rules:

- Do not create feature-local raw button class strings. Use and extend `src/components/ui/button.tsx` for buttons, icon buttons, toolbar buttons, ghost buttons, destructive buttons, and overlay/scrim buttons.
- Do not create new one-off search inputs. Use and extend the shared search/input primitive, currently `src/components/ui/search-input.tsx` when present, or create it once under `src/components/ui/` and reuse it.
- Do not create one-off icon-button patterns. Add a variant/size to the shared button primitive instead.
- Do not create one-off dropdowns or native `<select>` controls in app/workshop surfaces. `src/components/ui/dropdown-select.tsx` (`DropdownSelect`) is the canonical value picker and `src/components/ui/dropdown-menu.tsx` (`DropdownMenu`) the canonical action menu — both ride the shared portal popup core (`dropdown-popup.tsx`). Tree right-click/kebab menus stay on `ActionMenu`; the landing page keeps native selects.
- Do not duplicate card, chip, tab, filter, dropdown, field, toolbar, panel, empty-state, or inspector patterns inside route files. Extract a shared primitive or workshop component when the pattern appears more than once.
- New UI primitives must encode this design scale internally: SF Pro stack, regular/medium weights, allowed sizes only, xs radius only, zero tracking, compact padding, accessible states, and token-aligned colors.
- Form-control font resets must live inside Tailwind `@layer base`; an unlayered `button { font: inherit; }` after `@import "tailwindcss"` can override app button text utilities and create anchor/button typography drift.
- A visible duplicated button/search/input/icon-button implementation is a blocking design-system defect, not harmless polish.

## Layout

### Public landing

Landing pages are exempt from the strict app/workshop system and may use the more experimental editorial direction:

1. thin announcement/product-update bar when relevant;
2. compact global nav with logo left, navigation center, CTAs right;
3. editorial split hero with orange primary CTA, outlined secondary CTA, and warm halftone product framing;
4. large product mockup/illustration panel below the hero;
5. logo/proof band when real proof exists;
6. alternating feature chapters: intro copy, product visual, supporting cards, testimonial/proof;
7. final CTA and dense footer.

Use wide responsive containers, strong vertical rhythm, and short copy blocks. Landing pages should feel spacious, editorial, and confident.

### Authenticated app and estimate workspace

The current app must move away from centered page/form composition. It should become a true full-browser workspace:

- **Shell:** `height: 100dvh`, no centered max-width cap for workspace routes.
- **Left global sidebar:** persistent dashboard navigation inspired by legacy frontend v4 `PrivateNavBar`: collapsed width around 56px, expanded width around 248px; routes for Dashboard, Projects, Cost Library, Proposals, Clients, Templates, Settings.
- **Top workspace bar:** project name, estimate/version status, saved state, grand total summary, issue/export actions.
- **Secondary project/area rail:** project tree / floor-room-area navigator inspired by legacy frontend v4 `ProjectEstimateTreeNavigator`; collapsible around 240px expanded and 40–56px collapsed.
- **Center work surface:** estimate grid owns the majority of width and height. It must not be squeezed by decorative cards or permanent forms.
- **Right dock:** context-sensitive panel for Library, Selected Row, Versions, Proposal Settings. It should be collapsible/resizable and default to the user’s current task.
- **Bottom/inline controls:** avoid long vertical stacking below the grid. Selected-row controls belong in the right dock or inline grid editing.

Desktop target proportions:

- global sidebar: 56–248px;
- project tree: 240px when open;
- right dock: 360–420px when open;
- grid: flexible remaining width, never less than the dominant surface;
- app gutters: 16–24px, not large centered margins.

### Responsiveness

- Large desktop: full multi-panel workspace.
- Laptop: collapsed global sidebar by default, project tree collapsible, right dock may overlay or resize.
- Tablet: left nav becomes drawer, right dock becomes drawer/sheet, grid remains primary.
- Mobile: prioritize dashboard/project list/proposal preview; dense estimate editing can become simplified task flows, not a squeezed table.

## Elevation & Depth

Intercom’s flat system is the baseline. Prefer:

- thin borders;
- warm background bands;
- product mockup wells;
- crop marks / tiny corner markers;
- selection/focus backgrounds;
- whitespace.

Avoid heavy drop shadows, glass effects, gradients, glossy cards, and generic dashboard depth. Use subtle elevation only for drawers, popovers, command palette, modals, and floating inspectors.

## Shapes

Shapes are crisp and restrained outside the landing page:

- `xs` (`3px`) is the only app/workshop border radius.
- Do not use `rounded`, `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-full`, arbitrary radius utilities, or CSS radius values other than `3px` outside landing-approved surfaces.
- Use no radius only when there is no border radius class/value at all; do not encode `rounded-none` as an app surface style.

Do not over-round estimating, financial, or proposal surfaces. The product should feel precise and architectural, not toy-like.

## Components

### Buttons and CTAs

- Public landing primary CTA: landing-approved experimental styling.
- Secondary CTA: white/outlined button with dark text and thin border.
- Tertiary CTA: text link, often underlined or arrowed.
- App primary actions use strong neutral (`#292929`) for Create, Add selected item, Duplicate revision, Issue proposal, and Export while preserving clear text/ink hierarchy.
- Destructive actions use danger styling and confirmation.

### Navigation

- Use Intercom-like compact top nav on public pages.
- Use v4-inspired left app sidebar inside the dashboard/authenticated app.
- Navigation labels must be explicit; avoid hiding primary product areas behind unlabeled icons unless the sidebar is collapsed and tooltips/accessible labels exist.

### Product mockups and illustrations

- Public pages should use large neutral product panels, screenshot-like UI compositions, and hand-drawn black line illustrations where useful.
- Illustration style: monochrome, botanical/architectural/sketch-like, precise, light, and editorial. Avoid cartoon construction workers, blueprint clichés, heavy gradients, or stocky 3D mascots.
- Product visuals should show real Archestimator surfaces: estimate grid, project tree, revision diff, proposal preview, and library dock.
- Use small orange asterisk markers and sparse halftone/dot fields sparingly to create a premium technical feel.

### Cards and panels

- Cards are flat, white, thin-bordered, and content-first.
- Avoid nested card-on-card clutter in the app. One surface should own each work zone.
- Dashboard cards can use Intercom whitespace, but estimate workspace panels must be compact and efficient.

### Estimate sheet cells

Estimate cells should be compact, readable, keyboard-friendly, and spreadsheet-familiar.

Rules:

- numeric fields use tabular numeric typography;
- selected rows/cells use accent-soft background or clear outline, not decorative color;
- changed values in revision comparison use warning/danger/success depending on commercial meaning;
- sticky headers and useful frozen columns should be preferred over repeated controls;
- inline editing is preferred for quantity/unit/rate fields;
- selected row details move to the right dock, not below the grid.

### Library cards

Library cards must expose trust-building fields:

- item name;
- category/type;
- unit;
- default cost;
- pricing date;
- supplier/source when available;
- linked/overridden/detached/source-changed state when inserted.

Default right dock library mode should prioritize search, filter, and insertion. Create/edit library item should open a drawer/modal/editor state, not permanently consume the entire dock.

### Financial total cards

Financial totals should have strong numeric hierarchy and minimal decoration:

1. grand total;
2. material/labor split;
3. markup/contingency/tax;
4. prior version delta;
5. assumptions/source status.

### Proposal pages

Proposal previews remain document-like:

- paper-like background;
- clear title/date/client/project metadata;
- formal proposal letter typography;
- summary table before detailed BOQ when appropriate;
- explicit exclusions, owner-supplied items, validity, duration, warranty, payment terms, and signature/conforme blocks.

Do not make client-facing proposal pages look like raw admin dashboards or Intercom marketing pages.

## Do's and Don'ts

### Do

- Use the attached SF Pro neutral product reference for app/workshop UI.
- Use Intercom/editorial references only for public landing, typography scale, CTA rhythm, art direction, and section rhythm.
- Use legacy Archestimator frontend v4 as the layout benchmark for the authenticated app shell: full-height workspace, left nav, project tree, central estimate sheet, docked right panel.
- Maximize the whole browser for app workflows; remove centered max-width caps from workspace routes.
- Make the estimate grid the primary surface on estimate routes.
- Keep public pages spacious, editorial, and proof-led.
- Keep app pages compact, aligned, and efficient for long work sessions.
- Use strong neutral primary CTAs and outlined secondary CTAs in app/workshop UI.
- Use the neutral selected background and border tokens for app focus/selection unless a semantic state requires success/warning/danger.
- Use real product UI mockups and monochrome sketch-style illustrations.
- Keep controls accessible with semantic buttons/links, visible focus rings, and full labels.
- Update this DESIGN.md before introducing new visual language.

### Don't

- Do not keep dashboard/workspace content cramped in a centered card if the task needs a full-browser canvas.
- Do not let the right library panel permanently steal width from the estimate grid.
- Do not stack selected-row controls below the grid as a long form; move them into a contextual dock or inline grid editing.
- Do not use construction-orange as the brand accent.
- Do not use heavy shadows, gradients, glassmorphism, blueprint clichés, or decorative dashboard clutter.
- Do not make buttons overly rounded, oversized, or visually loud.
- Do not use any app/workshop radius except `xs`.
- Do not use app/workshop font weights beyond regular/medium or font sizes above `12px`.
- Do not invent one-off button, badge, table, panel, or card styles outside this system.
- Do not hide financial risk, source confidence, proposal state, or revision changes behind vague icons.
- Do not imitate Intercom’s support/helpdesk content; only adapt its design standards to Archestimator’s estimating domain.

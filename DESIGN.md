---
version: alpha
name: Archestimator Intercom-Inspired Workspace
description: Intercom-grade editorial SaaS design adapted to full-browser construction estimating workspaces.
colors:
  primary: "#FF7A1A"
  ink: "#111111"
  secondary: "#313130"
  tertiary: "#626260"
  muted: "#6B7280"
  hairline: "#E5E7EB"
  divider: "#CECFCB"
  background: "#FFFFFF"
  canvas: "#F4F7FA"
  warmCanvas: "#F4F7FA"
  surface: "#FFFFFF"
  surfaceMuted: "#F4F7FA"
  surfaceWarm: "#F4F7FA"
  accent: "#FF7A1A"
  accentSoft: "#FFF0E5"
  focus: "#FF7A1A"
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
    fontFamily: "Inter"
    fontSize: 12px
    fontWeight: 700
    lineHeight: 16px
    letterSpacing: "-0.01em"
    maxOutsideLanding: true
  app-subtitle:
    fontFamily: "Inter"
    fontSize: 11px
    fontWeight: 700
    lineHeight: 14px
    letterSpacing: "-0.01em"
  app-body:
    fontFamily: "Inter"
    fontSize: 10px
    fontWeight: 500
    lineHeight: 14px
    letterSpacing: "-0.005em"
  app-body-muted:
    fontFamily: "Inter"
    fontSize: 10px
    fontWeight: 500
    lineHeight: 14px
    letterSpacing: "-0.005em"
  app-label:
    fontFamily: "Inter"
    fontSize: 9px
    fontWeight: 700
    lineHeight: 12px
    letterSpacing: "0.08em"
  app-label-sm:
    fontFamily: "Inter"
    fontSize: 8px
    fontWeight: 700
    lineHeight: 10px
    letterSpacing: "0.08em"
  app-button:
    fontFamily: "Inter"
    fontSize: 10px
    fontWeight: 700
    lineHeight: 12px
    letterSpacing: "-0.005em"
  app-table-cell:
    fontFamily: "Inter"
    fontSize: 10px
    fontWeight: 500
    lineHeight: 14px
    letterSpacing: "-0.005em"
  app-numeric:
    fontFamily: "Roboto Mono"
    fontSize: 10px
    fontWeight: 700
    lineHeight: 13px
    letterSpacing: "-0.02em"
    fontFeature: "tnum"

  # Legacy aliases retained only for landing/proposal compatibility. Product UI must use app-* tokens above.
  body-sm:
    fontFamily: "Inter"
    fontSize: 10px
    fontWeight: 500
    lineHeight: 14px
    letterSpacing: "-0.005em"
  label:
    fontFamily: "Inter"
    fontSize: 10px
    fontWeight: 700
    lineHeight: 12px
    letterSpacing: "-0.005em"
  label-sm:
    fontFamily: "Inter"
    fontSize: 9px
    fontWeight: 700
    lineHeight: 12px
    letterSpacing: "0.08em"
  nav-link:
    fontFamily: "Inter"
    fontSize: 10px
    fontWeight: 700
    lineHeight: 12px
    letterSpacing: "-0.005em"
  button-text:
    fontFamily: "Inter"
    fontSize: 10px
    fontWeight: 700
    lineHeight: 12px
    letterSpacing: "-0.005em"
  table-cell:
    fontFamily: "Inter"
    fontSize: 10px
    fontWeight: 500
    lineHeight: 14px
    letterSpacing: "-0.005em"
  numeric:
    fontFamily: "Roboto Mono"
    fontSize: 10px
    fontWeight: 700
    lineHeight: 13px
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
rounded:
  none: 0px
  xs: 3px
  sm: 4px
  md: 6px
  lg: 8px
  xl: 12px
  full: 9999px
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
    rounded: "{rounded.md}"
    padding: 10px
    height: 40px
  button-primary-hover:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.surface}"
    typography: "{typography.button-text}"
    rounded: "{rounded.md}"
    padding: 10px
    height: 40px
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.button-text}"
    rounded: "{rounded.sm}"
    padding: 10px
    height: 40px
  button-link:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.nav-link}"
    rounded: "{rounded.none}"
    padding: 0px
  app-sidebar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.nav-link}"
    rounded: "{rounded.none}"
    width: 248px
  app-sidebar-collapsed:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.nav-link}"
    rounded: "{rounded.none}"
    width: 56px
  workspace-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: 16px
  product-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: 16px
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    padding: 12px
    height: 40px
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
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
    rounded: "{rounded.lg}"
    padding: 16px
  library-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: 16px
  proposal-page:
    backgroundColor: "{colors.proposalPaper}"
    textColor: "{colors.ink}"
    typography: "{typography.proposal-body}"
    rounded: "{rounded.sm}"
    padding: 32px
  status-approved:
    backgroundColor: "{colors.successSoft}"
    textColor: "{colors.success}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: 6px
  status-review:
    backgroundColor: "{colors.warningSoft}"
    textColor: "{colors.warning}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: 6px
  status-danger:
    backgroundColor: "{colors.dangerSoft}"
    textColor: "{colors.danger}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: 6px
---

## Overview

Archestimator adopts an **Intercom-grade editorial SaaS design language**: calm, high-contrast, spacious, precise, and product-led. Intercom is the external reference for marketing rhythm, typography scale, CTA hierarchy, monochrome restraint, product mockup treatment, and polished illustration style. Legacy Archestimator frontend v4 is the internal reference for the application shell: full-height workspace, persistent left navigation, project/area tree, central estimate sheet, and docked contextual panels.

The result should not be a generic construction dashboard. It should feel like premium SaaS for contractors and design-build teams: editorial on public/landing pages, efficient and full-browser in the authenticated app, and document-like in proposal output.

Primary product surfaces:

- public landing and dashboard entry pages;
- full-browser project/estimate workspaces;
- spreadsheet-like estimate sheets with location hierarchy;
- reusable material/cost/assembly libraries;
- row inspector, revision history, and proposal settings panels;
- client-ready proposal packages.

## Colors

- **Primary / ink (`#000000`, `#111111`)** anchor the brand, headings, decisive actions, totals, and high-emphasis UI. Public and dashboard chrome should be mostly monochrome.
- **Tertiary / muted (`#626260`, `#6B7280`)** support navigation, metadata, descriptions, empty states, labels, and passive states. Do not use muted text for financial totals or critical risk indicators.
- **Canvas / cool muted surfaces (`#F4F7FA`)** create subtle blue-leaning gray chapter backgrounds, dashboard bands, product mockup wells, and low-noise secondary surfaces. Avoid older warm gray families inside app/workshop surfaces.
- **Surface (`#FFFFFF`)** is the dominant canvas for landing, cards, grid cells, forms, panels, and modals.
- **Hairline / divider (`#E5E7EB`, `#CECFCB`)** replace heavy shadows. Use thin borders, crop marks, and whitespace for separation.
- **Primary orange (`#FF7A1A`)** is the precise Intercom-inspired Archestimator highlight. Use it for primary CTAs, focus rings, orange asterisk markers, selected-cell affordances, links, and technical emphasis.
- **Functional colors** retain meaning only: success for approved/current/safe, warning for provisional/source-review/cost-risk, danger for destructive/error/excluded/cost increase.
- **Proposal paper (`#FFFDF8`)** distinguishes client-facing documents from app dashboards.

Color discipline is mandatory: black/white/off-white remain the visual system; orange is the primary Archestimator accent and should appear as deliberate asterisks, active states, CTAs, and precision marks rather than broad decoration.

## Typography

Use the Intercom model: large editorial sans headlines, compact body copy, restrained labels, and clear numeric scanning.

- **Preferred implementation font:** Inter for now, with future option to evaluate Saans/MediumLL-like licensed fonts. Do not block implementation on paid fonts.
- **Display / headline:** light-to-regular weight, very tight tracking, intentional line breaks, generous surrounding whitespace. Use for landing hero, dashboard hero, major product statements, and empty-state moments.
- **Body copy:** compact, calm, and short. Public pages should avoid dense paragraphs. App panels should use `body-sm` where useful but stay readable for long estimating sessions.
- **Labels/navigation/buttons:** small sans-serif, high clarity, not over-bold. CTAs are compact and precise, not oversized marketing pills.
- **Numeric:** Roboto Mono with tabular numbers for quantities, unit costs, subtotals, totals, deltas, percentages, and version comparison values.
- **Proposal body:** Source Serif 4 remains for formal client-facing proposal paragraphs, terms, assumptions, and signature blocks.

Target text rhythm:

- Landing H1: 64px desktop / 42–48px tablet / 34–38px mobile.
- Section H2: 45px desktop / 34px tablet / 28px mobile.
- Dashboard H1: 36px desktop, regular/medium weight.
- App panel titles: 23–28px only when they define a work mode; otherwise 14–16px labels.
- Estimate cells: 13px minimum with strong contrast; never tiny low-contrast spreadsheet text.

## Layout

### Public landing and dashboard entry

Follow Intercom’s long-form product narrative:

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

Shapes are crisp and restrained:

- `none`/`xs`: table lines, grid cells, dense controls;
- `sm`/`md`: buttons, inputs, tabs;
- `lg`: product cards, library cards, panels;
- `xl`: marketing mockup blocks and major empty states only;
- `full`: chips/status pills only.

Do not over-round estimating, financial, or proposal surfaces. The product should feel precise and architectural, not toy-like.

## Components

### Buttons and CTAs

- Public and dashboard primary CTA: orange filled button, 40px height, compact padding.
- Secondary CTA: white/outlined button with dark text and thin border.
- Tertiary CTA: text link, often underlined or arrowed.
- App primary actions use orange for Create, Add selected item, Duplicate revision, Issue proposal, and Export while preserving black for text/ink hierarchy.
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

- Use Intercom as the design-language benchmark for public landing, dashboard polish, typography scale, monochrome restraint, CTAs, art direction, and section rhythm.
- Use legacy Archestimator frontend v4 as the layout benchmark for the authenticated app shell: full-height workspace, left nav, project tree, central estimate sheet, docked right panel.
- Maximize the whole browser for app workflows; remove centered max-width caps from workspace routes.
- Make the estimate grid the primary surface on estimate routes.
- Keep public pages spacious, editorial, and proof-led.
- Keep app pages compact, aligned, and efficient for long work sessions.
- Use orange primary CTAs and outlined secondary CTAs.
- Use orange as the precise focus/link/technical accent.
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
- Do not invent one-off button, badge, table, panel, or card styles outside this system.
- Do not hide financial risk, source confidence, proposal state, or revision changes behind vague icons.
- Do not imitate Intercom’s support/helpdesk content; only adapt its design standards to Archestimator’s estimating domain.

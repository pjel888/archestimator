---
version: alpha
name: Archestimator
description: Precise, calm construction estimating software for contractors, architects, and design-build teams.
colors:
  primary: "#171717"
  ink: "#171717"
  slate: "#334155"
  muted: "#64748B"
  hairline: "#E2E8F0"
  canvas: "#FAFAF7"
  surface: "#FFFFFF"
  surfaceMuted: "#F4F1EA"
  accent: "#92400E"
  accentDark: "#78350F"
  accentSoft: "#FEF3C7"
  info: "#2563EB"
  infoSoft: "#DBEAFE"
  success: "#15803D"
  successSoft: "#DCFCE7"
  warning: "#B45309"
  warningSoft: "#FEF3C7"
  danger: "#B91C1C"
  dangerSoft: "#FEE2E2"
  proposalPaper: "#FFFDF8"
typography:
  display:
    fontFamily: Inter
    fontSize: 4rem
    fontWeight: 760
    lineHeight: 1.02
    letterSpacing: "-0.055em"
  h1:
    fontFamily: Inter
    fontSize: 2.5rem
    fontWeight: 720
    lineHeight: 1.08
    letterSpacing: "-0.04em"
  h2:
    fontFamily: Inter
    fontSize: 1.75rem
    fontWeight: 680
    lineHeight: 1.16
    letterSpacing: "-0.025em"
  body:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "-0.01em"
  label:
    fontFamily: Inter
    fontSize: 0.8125rem
    fontWeight: 620
    lineHeight: 1.25
    letterSpacing: "-0.005em"
  table-cell:
    fontFamily: Inter
    fontSize: 0.8125rem
    fontWeight: 450
    lineHeight: 1.35
    letterSpacing: "-0.005em"
  numeric:
    fontFamily: "Roboto Mono"
    fontSize: 0.8125rem
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  proposal-body:
    fontFamily: "Source Serif 4"
    fontSize: 0.9375rem
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "0em"
rounded:
  xs: 3px
  sm: 6px
  md: 10px
  lg: 16px
  xl: 24px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  xxl: 32px
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "#FFFFFF"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 12px
    height: 40px
  button-primary-hover:
    backgroundColor: "{colors.accentDark}"
    textColor: "#FFFFFF"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 12px
    height: 40px
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 12px
    height: 40px
  estimate-cell:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.table-cell}"
    padding: 8px
    height: 36px
  estimate-cell-selected:
    backgroundColor: "{colors.infoSoft}"
    textColor: "{colors.ink}"
    typography: "{typography.table-cell}"
    padding: 8px
    height: 36px
  financial-total-card:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    typography: "{typography.numeric}"
    rounded: "{rounded.lg}"
    padding: 16px
  library-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
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
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: 6px
  status-review:
    backgroundColor: "{colors.warningSoft}"
    textColor: "{colors.warning}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: 6px
  status-danger:
    backgroundColor: "{colors.dangerSoft}"
    textColor: "{colors.danger}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: 6px
---

## Overview

Archestimator is precise, calm construction estimating software for contractors, architects, and design-build teams. The interface should feel professional enough for architect/client review and direct enough for contractors who need to produce estimates quickly.

The design language is **architectural utility**: measured, legible, disciplined, and trustworthy. It should not feel like generic construction software, a playful startup dashboard, or a decorative blueprint mockup.

Primary product surfaces:

- estimate sheets with spreadsheet familiarity;
- reusable material/cost/assembly libraries;
- project and estimate version history;
- revision delta views;
- client-ready proposal packages;
- controlled sharing views for clients, architects, trades, and internal users.

Design for long work sessions. The UI must reduce fatigue, support dense financial scanning, and make risk/status distinctions obvious without visual noise.

## Colors

- **Ink (`#171717`)** is the main text and high-emphasis surface color. Use it for totals, headings, and decisive actions where gravity is needed.
- **Slate (`#334155`)** supports secondary headings and dense interface copy.
- **Muted (`#64748B`)** is for metadata, descriptions, pricing dates, and secondary labels. Do not use it for critical quantities or totals.
- **Canvas (`#FAFAF7`)** is the warm neutral app background. It should feel like a quiet studio/workbench, not a cold enterprise admin panel.
- **Surface (`#FFFFFF`)** is for cards, grid cells, library panels, and dialogs.
- **Surface muted (`#F4F1EA`)** supports grouped panels and subtle section separation.
- **Accent (`#92400E`)** is the sole primary-action color. Use it for create/start/generate actions. Do not flood the UI with construction orange.
- **Info blue (`#2563EB`)** means linked/source/reference information, not success.
- **Success green (`#15803D`)** means approved, accepted, safe, or current.
- **Warning amber (`#B45309`)** means provisional, allowance, review required, or source changed.
- **Danger red (`#B91C1C`)** means excluded, error, destructive action, risk, or cost increase requiring attention.
- **Proposal paper (`#FFFDF8`)** is for client-facing proposal previews. It should distinguish formal documents from app dashboards.

Use color sparingly. In estimating software, color should clarify financial risk, status, source linkage, and proposal state—not decorate.

## Typography

Archestimator uses a practical sans-serif for the app and a document serif for proposal previews.

- **Display / H1 / H2:** Inter, strong weight, tight tracking. Use for marketing, major app page titles, and proposal package section headers.
- **Body / Label / Table cell:** Inter. Keep labels crisp and compact.
- **Numeric:** Roboto Mono with tabular numbers. Use for quantities, unit costs, subtotals, totals, variance deltas, percentages, and version comparison values.
- **Proposal body:** Source Serif 4. Use in client-facing proposal letters, terms, assumptions, and formal document paragraphs.

Do not use tiny low-contrast spreadsheet text. The estimate sheet can be dense, but it must stay readable during long sessions.

## Layout

The app should use a disciplined grid with clear surface ownership.

Core layout principles:

- Estimate sheet is the primary work surface. Do not shrink it unnecessarily for decorative sidebars.
- Library and version panels should be docked or floating secondary surfaces, not separate dead-end pages.
- Proposal previews should use document-like margins and rhythm, not dashboard-card clutter.
- Keep primary actions visible: create estimate, add from library, duplicate as revision, compare versions, issue proposal, export.
- Prefer compact, aligned controls over large padded marketing-style cards inside the app.
- Preserve enough density to make professional estimating efficient.

Recommended app shell rhythm:

- left: project/navigation context when needed;
- center: estimate/proposal/version work surface;
- right: library, row detail, assumptions, version history, or proposal settings depending on mode;
- top bar: project, estimate version, status, last saved, issue/export actions.

## Elevation & Depth

Depth should clarify layering, not create visual drama.

Use subtle elevation for:

- floating library panel;
- row detail drawer;
- proposal preview sheet;
- command/search palette;
- modal confirmations for destructive or commercial actions.

Avoid heavy shadows on dense estimating grids. In tables, use borders, selected-row background, and sticky headers more than card shadows.

## Shapes

Use modest radius for work surfaces and slightly larger radius for cards.

- `xs`/`sm`: cells, badges, small pills, proposal document edges.
- `md`: buttons, inputs, compact controls.
- `lg`: cards, library items, total cards, panels.
- `xl`: marketing surfaces or major empty-state containers only.

Do not over-round financial/proposal UI. The product should feel precise, not toy-like.

## Components

### Buttons

Primary buttons use the accent color and should be reserved for decisive actions:

- Create estimate
- Add selected item
- Generate proposal
- Issue proposal
- Export PDF/XLSX

Secondary buttons are neutral. Destructive actions must use danger styling and usually require confirmation.

### Estimate sheet cells

Estimate cells should be compact, readable, and keyboard-friendly.

Rules:

- numeric fields use tabular numeric typography;
- selected rows/cells use info-soft background, not accent orange;
- changed values in revision comparison use warning/danger/success depending on change direction and meaning;
- hidden internal margin/client-facing totals must be visually distinct.

### Library cards

Library cards must expose the fields that build trust:

- item name;
- category/type;
- unit;
- default cost;
- pricing date;
- supplier/source when available;
- linked/overridden/detached/source-changed state when inserted.

Search failures should reveal an obvious “Add custom item” path.

### Financial total cards

Financial totals should have the strongest numeric hierarchy on estimating/proposal screens. Totals must not compete with decorative charts.

Recommended hierarchy:

1. grand total;
2. material/labor split;
3. markup/contingency/tax;
4. prior version delta;
5. assumptions/source status.

### Proposal pages

Proposal previews should feel like professional contractor documents:

- paper-like background;
- clear title/date/client/project metadata;
- formal proposal letter typography;
- summary table before detailed BOQ when appropriate;
- explicit exclusions, owner-supplied items, validity, duration, warranty, payment terms, and signature/conforme blocks.

Do not make client-facing proposal pages look like raw admin dashboards.

### Status badges

Use status badges for meaningful workflow states only.

Examples:

- Draft
- Current
- Issued
- Superseded
- Approved
- Source changed
- Linked
- Overridden
- Detached
- Provisional
- Excluded
- OSCI

Do not create badges that merely restate that a calculation happened.

## Do's and Don'ts

### Do

- Keep the estimate sheet familiar to Excel users while making it safer and richer.
- Use tabular numbers everywhere financial comparison matters.
- Make linked library state visible: linked, overridden, detached, source changed.
- Preserve issued proposal snapshots as visually locked/official.
- Make draft estimates visibly different from issued proposals.
- Show assumptions, exclusions, owner-supplied items, and pricing dates clearly.
- Use calm spacing and consistent controls for long estimating sessions.
- Use one primary accent color and reserve it for decisive actions.
- Treat proposal output as a first-class product surface, not a print afterthought.
- Use DESIGN.md as the source of truth for agentic UI work before writing screen specs or code.

### Don't

- Do not use generic construction-orange branding everywhere.
- Do not use playful gradients or decorative blueprint clichés as the core product language.
- Do not hide primary estimating, versioning, or proposal actions behind ambiguous icons.
- Do not silently mutate issued proposals or old estimates because a library item changed.
- Do not make client-facing views expose internal margin, markup, or cost assumptions by accident.
- Do not let a dashboard card style overwhelm dense estimating workflows.
- Do not invent one-off button, badge, table, or card styles outside this system without updating DESIGN.md first.
- Do not treat AI-generated quantities, costs, or proposal wording as final without human review and visible source/confidence cues.

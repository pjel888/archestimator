---
version: alpha
name: Archestimator Product Design System
description: Alpha visual guidance for authenticated Archestimator product routes only. Public and otherwise unauthenticated routes, including / and /new, are outside this document's authority.
colors:
  primary: "#3D3D3D"
  ink: "#3D3D3D"
  secondary: "#5D5D5D"
  tertiary: "#666666"
  muted: "#7F7F7F"
  hairline: "#F2F2F2"
  divider: "#F2F2F2"
  dividerSibling: "#D9D9D9"
  background: "#FFFFFF"
  canvas: "#F5F5F5"
  warmCanvas: "#F5F5F5"
  surface: "#FFFFFF"
  surfaceMuted: "#F5F5F5"
  surfaceWarm: "#F5F5F5"
  accent: "#3D3D3D"
  accentSoft: "#F5F5F5"
  sourceBoundary: "#E8D8CF"
  focus: "#3D3D3D"
  success: "#15803D"
  successSoft: "#DCFCE7"
  warning: "#B45309"
  warningSoft: "#FEF3C7"
  danger: "#B91C1C"
  dangerSoft: "#FEE2E2"
  proposalPaper: "#FFFDF8"
typography:
  proposal-body:
    fontFamily: "Source Serif 4"
    fontSize: 0.9375rem
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "0em"
    scope: "authenticated-proposal-preview-or-export-only"

  # Product/workshop/app scale. This applies only to authenticated product routes.
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

  # Legacy aliases retained for authenticated product compatibility. New authenticated product UI should use app-* tokens above.
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

## Scope: Authenticated Routes Only

> **This document has zero authority over public design.** It applies only to
> pages and components owned by routes that require a valid authenticated
> session. `/`, `/new`, marketing pages, auth entry pages, legal/trust/security
> pages, invite routes, public share/client-portal pages, and every other route
> that renders without a session are completely exempt.
>
> Do not use this file, its frontmatter, its named exceptions, brand specs,
> landing plans, shared app primitives, design skills, reference sites,
> screenshots, or design lint to constrain a public surface. Public-page agents
> may choose or replace any visual language, typography, scale, palette, spacing,
> radius, layout, imagery, motion, component strategy, or responsive treatment.
> They do not need to update this file or preserve visual continuity with the
> authenticated app.
>
> **Within authenticated routes, this design system is still being developed.**
> Treat it as a living guide and shared reference, not an enforceable contract.
> The tokens and rules below are alpha defaults, not fixed law to be policed.
>
> **Philip's direction always wins.** During alpha, the coding AI agent must
> defer to Philip on every design decision. When Philip asks for something that
> diverges from a rule here, do it — do not refuse, block, revert, or lecture on
> design grounds, and do not gate work on the design-system lint. Surface a
> rule's intent if it's genuinely useful ("heads up, this departs from the
> current default of X"), then follow Philip's call.
>
> The absolutist wording throughout this file ("strict", "must", "mandatory",
> "never", "required") records the *current default intent* and is **subordinate
> to this banner**. Until Philip declares the system stable, read those words as
> "by default / unless Philip says otherwise", not as gates. When the visual
> language settles, we'll re-tighten this into a real contract.

## Overview

Archestimator is *exploring* an **SF Pro product design system** for authenticated product routes: regular/medium typography, neutral colors, 1px-outline-style icons, and xs-only radius. These are alpha defaults, not fixed requirements — see the scope banner above.

Authenticated product UI should feel efficient and full-browser, with document-like proposal previews and exports where applicable.

Primary product surfaces:

- full-browser project/estimate workspaces;
- spreadsheet-like estimate sheets with location hierarchy;
- reusable material/cost/assembly libraries;
- row inspector, revision history, and proposal settings panels;
- client-ready proposal packages.

## Colors

- **Strong (`#3D3D3D`)** anchors headings, active actions, totals, and high-emphasis UI.
- **Default (`#5D5D5D`)** is the normal app/workshop text color for body copy and controls.
- **Subtle (`#7F7F7F`)** supports navigation, metadata, descriptions, empty states, labels, and passive states. Do not use subtle text for financial totals or critical risk indicators.
- **Selected background (`#F5F5F5`)** is the only neutral selected/hover surface outside semantic success/warning/danger states.
- **Surface (`#FFFFFF`)** is the dominant authenticated-app canvas for cards, grid cells, forms, panels, and modals.
- **Border (`#F2F2F2`)** replaces heavy shadows. Use thin borders and whitespace for separation.
- **Sibling divider (`#D9D9D9`)** is reserved for inset estimate-sheet sibling rules where `#F2F2F2` is too quiet to show hierarchy.
- **Functional colors** retain meaning only: success for approved/current/safe, warning for provisional/source-review/cost-risk, danger for destructive/error/excluded/cost increase.
- **Proposal paper (`#FFFDF8`)** distinguishes client-facing documents from app dashboards.

On authenticated routes, use strong/default/subtle text, selected background, and border tokens first. Orange is not a default authenticated-app accent unless Philip explicitly approves a named exception.

## Typography

Use the attached product-reference model on authenticated routes for font family, weights, colors, icon style, and radius, while preserving Archestimator's compact app font-size density.

- **App/workshop font:** SF Pro via the system stack: `"SF Pro Text", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.
- **App/workshop weights:** regular (`400`) and medium (`500`) only. No bold, semibold, mono, serif, or Poppins in app UI.
- **App/workshop sizes:** `12px` maximum. Use `12px` for strongest titles only, `11px` for subtitles/secondary headings, `10px` for body, nav, controls, inputs, tabs, chips, buttons, table cells, and numeric values, and `8-9px` for meta/eyebrow labels.
- **Hierarchy invariant:** labels, eyebrows, metadata, helper copy, and muted subheaders must never render larger than the input/control/body text they describe. Use `8-9px` for labels/meta and keep muted supporting text at `10px` or below.
- **App/workshop letter spacing:** `0`. Do not use negative tracking, wide uppercase tracking, or arbitrary tracking utilities.
- **App/workshop icons:** regular 1px-outline-style iconography. Current Phosphor icons must use regular weight until/unless a dedicated 1px icon library is approved.
- **Display / headline:** use only inside named authenticated-route exceptions such as the Workshop dashboard.
- **Body copy:** app panels should use `body-sm` where useful but stay readable for long estimating sessions.
- **Labels/navigation/buttons:** use small sans-serif text with clear hierarchy inside authenticated product UI.
- **Numeric:** SF Pro with tabular numbers for quantities, unit costs, subtotals, totals, deltas, percentages, and version comparison values.
- **Proposal body:** Source Serif 4 remains for formal client-facing proposal paragraphs, terms, assumptions, and signature blocks.

Target text rhythm:

- On authenticated routes, **12px is the default maximum** unless Philip explicitly approves a named exception.
- App/workshop/card titles: `12px` maximum.
- App subtitles and secondary headings: around `11px`.
- App body, nav, controls, tables, inputs, tabs, chips, toolbar labels, and button text: normally `10px`.
- App meta/eyebrow/helper labels: `8-9px`; these must be visually smaller than paired inputs, controls, values, and body text.
- Estimate cells: normally `10px` with strong contrast, tabular numbers, and enough row height for scanning.

#### Named app exception: Workshop Dashboard (2026-06-17; broadened 2026-06-18 — EXPLORATORY)

The Workshop dashboard ("command center" homebase, `src/components/workshop/dashboard/`)
is the app's own exploratory design language. As of the 2026-06-18 bento redesign the
whole dashboard directory is **fully exempt** from `enforce-app-design-system.mjs`
(owner directive: "don't be constrained by DESIGN.md" for this surface) — it may use
display type, the Roboto Mono voice, color-blocking, complex gradients, larger card
radii, and reversed-out type. Path-scoped to the dashboard directory only, never
app-wide. **This direction is NOT finalized** — it is pending the owner's live visual
review, so do not treat the values below as locked tokens of record yet. Highlights:

- **Display family:** `--font-doto` feeds `--font-display` (utility
  `font-display`). In Cloudflare Worker builds this is a CSS-only local/system-family
  token to avoid bundling `next/font` metrics. Used for the Improve-ROI-inspired
  editorial headline and first-run headline only. Body UI keeps the SF Pro system stack.
- **Numeric family:** `--font-roboto-mono` is exposed as `--font-numeric`
  (utility `font-numeric`) for codes, dates, counts, and totals — a distinct utility so
  the dashboard never needs the banned monospace class.
- **Type scale:** Roboto Mono (`font-numeric`) is the greeting-kicker/label/numeric voice;
  Doto (`font-display`) is the uppercase hero headline (~28–45px depending on viewport) and
  first-run headline (~24px). Larger display sizes are allowed dashboard-wide under the full
  exemption above.
- **Bento + glass:** the v2 dashboard is a full-bleed Improve-ROI-inspired machinery board
  (`.dashboard-root/-masthead/-imageband/-desk`) with tight seams instead of roomy gutters.
  Destination cards use the `public/Cards/*-Card.jpg` triptych (`.image-card` + tonal
  `--scrim-*`); Library is a Signal-bloom gradient hub (`.library-hub`, `--brand-orange`). Warm-glass hero
  cells (`.dashboard-glass-warm` + `--grad-hero-*`) over a whisper-quiet
  `--grad-canvas-wash`; dense data stays plain white for legibility; ≤4 simultaneous
  backdrop-blur panels. Reduced-transparency / no-backdrop fallbacks degrade.
- **Sidebar wash (shipped, reversible):** `.sidebar-glass` uses an opaque-leaning
  cool-white `--sidebar-glass-wash` over the dashboard canvas: still lightly frosted, but solid
  enough that project cards do not show through the expanded rail. It remains blur-free for
  performance; square 48×48 logo slab.

## Data visualization

Charts (cost comparison, distribution, variance) follow the compact scale but carry
a small, deliberate amendment because SVG `<text>` does **not** reflow on browser
zoom — it only scales with the viewBox, so a sub-minimum chart label defeats resize
(WCAG 1.4.4/1.4.10).

- **SVG chart text floor: `11px`.** Axis ticks, dot/bar labels, and any value drawn
  inside an `<svg>` render at `≥ 11px`. Numeric `fontSize` attributes (not Tailwind
  classes) are used for SVG text so the value is explicit.
- **HTML control/value floor: `10px`** (unchanged). Chart controls, legends, and
  data-table cells stay within the standard `10px` body / `8–9px` label scale.
- **The data table is the zoom-safe text alternative.** Every chart renders an
  associated data table carrying the same figures and points at it via
  `aria-describedby`. The table — not the SVG — is the keyboard/screen-reader
  surface and the resize/zoom compliance path. Charts may be `role="img"`.
- **Hero figures** (a totals number, a donut center) may use `12px / 500`.

### Data-viz categorical palette exception (named app exception)

Categorical chart series use the **Okabe–Ito 8-color CVD-safe palette** (7 hues +
a neutral "Other" grey), assigned by a stable bucket key so the same category is
the same color in every series. Okabe–Ito includes orange; this is the named
exception to the authenticated-app orange rule (`Colors`):

- Okabe–Ito hues may appear **only** in chart marks, legends, and data-table
  swatches.
- They must **never** appear in controls, chrome, navigation, buttons, headers, or
  any non-chart surface, and are applied as inline `fill` / `backgroundColor` values
  from `src/lib/project-charts/bucket-color.ts`, never as Tailwind utility classes,
  so they cannot leak into the app design system.
- Direction (cheaper/more expensive) uses semantic `success` / `danger` and is
  always reinforced by a non-color cue (bar direction, arrow, sign) so meaning is
  never carried by color alone (WCAG 1.4.1).

## Component reuse contract

All app/workshop UI must be built from shared primitives and reusable product components. Before adding local markup, agents must check `src/components/ui/` and the relevant `src/components/workshop/` shared components, then reuse or extend them.

Mandatory rules:

- Do not create feature-local raw button class strings. Use and extend `src/components/ui/button.tsx` for buttons, icon buttons, toolbar buttons, ghost buttons, destructive buttons, and overlay/scrim buttons.
- Do not create new one-off search inputs. Use and extend the shared search/input primitive, currently `src/components/ui/search-input.tsx` when present, or create it once under `src/components/ui/` and reuse it.
- Do not create one-off icon-button patterns. Add a variant/size to the shared button primitive instead.
- Do not create one-off dropdowns or native `<select>` controls in app/workshop surfaces. `src/components/ui/dropdown-select.tsx` (`DropdownSelect`) is the canonical value picker and `src/components/ui/dropdown-menu.tsx` (`DropdownMenu`) the canonical action menu — both ride the shared portal popup core (`dropdown-popup.tsx`). Tree right-click/kebab menus stay on `ActionMenu`.
- Do not duplicate card, chip, tab, filter, dropdown, field, toolbar, panel, empty-state, or inspector patterns inside route files. Extract a shared primitive or workshop component when the pattern appears more than once.
- New UI primitives must encode this design scale internally: SF Pro stack, regular/medium weights, allowed sizes only, xs radius only, zero tracking, compact padding, accessible states, and token-aligned colors.
- Form-control font resets must live inside Tailwind `@layer base`; an unlayered `button { font: inherit; }` after `@import "tailwindcss"` can override app button text utilities and create anchor/button typography drift.
- A visible duplicated button/search/input/icon-button implementation is a blocking design-system defect, not harmless polish.

## Layout

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

The app builds depth by **floating surfaces on a calm grey canvas** (`#eef0f3` in the workshop), not by decorating flat boxes. The canvas is the quiet field; primary surfaces float on it with a gutter of canvas around them. Two surface materials:

- **Paper** — solid white panels (the workspace card, content tiles, modals, inspectors): thin `--hairline` border + one soft floating shadow + a canvas gutter.
- **Liquid glass** — frosted translucent *chrome* (navigation rails, overlays that sit over content): see [Surfaces & liquid glass](#surfaces--liquid-glass).

### Workshop area canvas map

The workshop shell uses one route-level backmost canvas wash. The wash belongs to
`WorkshopGlassBackdrop` / `WorkshopPageShell` through `--workshop-page-canvas-wash`
while `--workshop-shell-chrome-bg` stays a neutral frosted surface tint. Inner
components, tabs, cards, toolbars, and footers stay translucent above it instead
of carrying their own page gradients or route-specific background washes.

- `/workshop` — default dashboard/homebase wash: southeast peach, via
  `--grad-canvas-wash`.
- `/workshop/projects` — northwest desaturated navy blue, via
  `.projects-canvas-wash`.
- `/workshop/library` — northeast desaturated yellow/white, via
  `.library-canvas-wash`.
- `/workshop/publisher` — southwest desaturated olive green, via
  `.publisher-canvas-wash`.

These washes are orientation cues only: low-chroma, page-scale, and subordinate
to the dark-ink/frosted-white product shell. Do not add page-specific gradients
to inner content wrappers, sticky headers, tabs, or footers.

Collection headers, icon toolbars, tabs, and footers inside the workshop shell
must align as transparent rows over the parent-most glass surface. Do not add
independent row background fills; use spacing and a single soft divider only
where the content plane needs an edge.

Depth belongs to the **surface edge** (one soft shadow + a hairline), never to elements *inside* it. Inside a surface stay flat: thin borders, whitespace, selection/focus backgrounds, warm bands — no nested shadows, no glossy or neon depth, no stacked cards. One surface, one shadow.

## Shapes

Radius is a small, deliberate **scale** — crisp for dense data, softer for floating surfaces:

- `xs` (`3px`) — the default for everything *inside* a surface: table cells, inputs, chips, dense controls, buttons, content tiles.
- `8px` (`--glass-nav-radius`) — pills and controls in glass chrome (nav items, the collapse toggle, segmented controls).
- `12px` (`--glass-radius`) — floating **surface** panels themselves (the sidebar slab, the workspace card, large overlays).

Do not invent other radii: no `rounded-sm/md/lg/xl/full` and no arbitrary radius values — use one of the three tokens above. Don't over-round dense estimating, financial, or proposal surfaces; those stay `3px`. The product should feel precise and architectural, not toy-like. (The enforcer currently allows `3px`, `--glass-radius`, and `--glass-nav-radius`; extend the allow-list as the floating language rolls out.)

## Surfaces & liquid glass

Archestimator has **two surface materials** floating on the grey canvas. Reach for the right one:

- **Paper (solid white)** — anything that *holds content*: the workspace card, project/estimate tiles, tables, modals, proposal surfaces. White fill, `--hairline` border, soft floating shadow, `12px` radius for the panel itself (`3px` for dense things inside it).
- **Liquid glass (frosted)** — *chrome* that frames or floats over content: the navigation rail today; later, command palette, floating inspectors, and over-content overlays. Frosted translucency that reads brighter than the canvas, so it floats.
- **Workshop project index cards (2026-06-19)** are the first content-card rollout into liquid glass. Keep the existing compact card structure and `3px` radius, but use a frosted card shell (`.workshop-project-card-glass`) with one soft shadow, one deferred backdrop blur on the shell only. The inset panel and content pane may use translucent cool-white fills and inset highlights so the route canvas lightly shows through; child controls still fake glass with translucent fills/inset highlights rather than their own blur. Selected project cards use a deeper shell shadow, not a black border/ring.

Glass is a **skin, never a behaviour change**. The reference implementation is the workshop navigation rail (`MainSidebar`), authorized 2026-06-17. Rules for any glass surface:

- **One blurred surface.** Exactly one `backdrop-filter` per glass panel (e.g. `.sidebar-glass`). Children (header chips, nav pills, badges) fake glass with plain translucent fills + borders + inset highlights — never their own blur. Stacked blurs kill mobile GPU.
- **Frosted-white, dark ink text.** The frost (`--glass-bg`) is a translucent white that floats above the grey canvas while labels stay dark (`--ink`/`--secondary`/`--tertiary`) and clear WCAG AA trivially. Paper surfaces are solid white; glass is frosted — the tonal difference is intentional, not a bug. No dark-theme glass; the accent stays brand-orange.
- **Floating edge.** Inset on the canvas, `--glass-radius` corners, one soft outer shadow, and a soft 1px specular top edge. The brand logo slab is the one orange glass surface (white mark).
- **Active/hover state.** Active = brand-orange *gradient* glass fill (stronger at the top edge) + inset specular hairline, wired to existing route detection, keeping a weight/brightness cue (state never by colour alone). Hover = faint neutral gradient pill + subtle icon scale; press scales the row — all transform/opacity, reduced-motion safe.
- **Performance + fallbacks.** Blur capped 16–20px; never animate blur. Solid `--glass-bg-fallback` panel under `@supports not (backdrop-filter)` and `prefers-reduced-transparency: reduce`. The Apple-style SVG edge refraction is desktop-Chromium-only progressive enhancement, gated off touch/mobile/Safari/Firefox/reduced-motion/reduced-transparency.
- **Tokens only.** All values live in the `--glass-*` layer in `globals.css`; no magic numbers in JSX. The grey canvas is `WorkshopGlassBackdrop` (static, GPU-cheap, no animation).

App-wide rollout (header bars, panels, modals, command palette across every route) is a follow-up; the workshop shell sets the pattern.

## Components

### Buttons and CTAs

- Secondary CTA: white/outlined button with dark text and thin border.
- Tertiary CTA: text link, often underlined or arrowed.
- App primary actions use strong neutral (`#292929`) for Create, Add selected item, Duplicate revision, Issue proposal, and Export while preserving clear text/ink hierarchy.
- Destructive actions use danger styling and confirmation.

#### Named app exception: estimate-sheet orange affordances (approved 2026-06-14)

The Estimate Sheet page carries the only app-chrome orange exception, in two
tightly-scoped places that reuse the Tailwind `orange-*` scale already used at
`projects-page-client.tsx:371`:

**1. "Add" icon buttons** — Add Area (left tree), Add tab (middle), Add
Component / Add Template (right sidebar), and the Create Estimate button on the
project estimates list — use a light-orange affordance instead of strong neutral:

- resting:  `bg-orange-100` `text-orange-700`
- hover:    `bg-orange-200` `text-orange-800`  (+ focus-visible mirror)
- cursor:   pointer (explicit — Tailwind v4 has no default)

Centralized as `ADD_BUTTON_CLASSNAME` (`src/components/ui/toolbar-icon-button.tsx`).
Does NOT apply to in-row "Add row" (`QuietAddRowButton` stays low-emphasis).

**2. Occupied node glyph** — a left-tree node that directly holds estimate items
renders its `Circle` glyph in `text-orange-600` (empty nodes stay
`text-tertiary`), so occupancy is scannable at a glance.

**3. Source-family divider** — the Templates panel may use the muted
`sourceBoundary` token (`#E8D8CF`, exposed as `border-t-source-boundary`) as a
single 1px rule between Custom Templates and project-derived sources. This is
lower-chroma than Tailwind orange and must stay a grouping boundary, not a
general accent.

Rationale: the estimate sheet has many co-located neutral toolbar icons; the
orange tint disambiguates the primary "add" action and flags where work lives.

### Navigation

- Use v4-inspired left app sidebar inside the dashboard/authenticated app.
- Navigation labels must be explicit; avoid hiding primary product areas behind unlabeled icons unless the sidebar is collapsed and tooltips/accessible labels exist.
- Main sidebar active links are a named app navigation exception: the selected
  icon tile uses `bg-orange-50`, while the icon and 1px inset border use the same
  orange (`text-orange-700` / `rgb(194,65,12)`). Expanded labels stay neutral
  primary text; inactive and hover states remain neutral unless selected.

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

### Authenticated proposal previews and exports

Proposal previews remain document-like:

- paper-like background;
- clear title/date/client/project metadata;
- formal proposal letter typography;
- summary table before detailed BOQ when appropriate;
- explicit exclusions, owner-supplied items, validity, duration, warranty, payment terms, and signature/conforme blocks.

Do not make authenticated proposal previews or generated export artifacts look like raw admin dashboards.

## Do's and Don'ts

### Do

- Use the attached SF Pro neutral product reference for app/workshop UI.
- Use legacy Archestimator frontend v4 as the layout benchmark for the authenticated app shell: full-height workspace, left nav, project tree, central estimate sheet, docked right panel.
- Maximize the whole browser for app workflows; remove centered max-width caps from workspace routes.
- Make the estimate grid the primary surface on estimate routes.
- Keep app pages compact, aligned, and efficient for long work sessions.
- Use strong neutral primary CTAs and outlined secondary CTAs in app/workshop UI.
- Use the neutral selected background and border tokens for app focus/selection unless a semantic state requires success/warning/danger.
- Keep controls accessible with semantic buttons/links, visible focus rings, and full labels.
- Update this `DESIGN.md` before introducing a new authenticated-app visual language.

### Don't

- Do not keep dashboard/workspace content cramped in a centered card if the task needs a full-browser canvas.
- Do not let the right library panel permanently steal width from the estimate grid.
- Do not stack selected-row controls below the grid as a long form; move them into a contextual dock or inline grid editing.
- Do not use construction-orange as the default authenticated-app accent.
- Do not use **heavy/glossy** shadows, neon glows, blueprint clichés, or decorative dashboard clutter. Soft floating shadows and frosted glass are now part of the system — see [Surfaces & liquid glass](#surfaces--liquid-glass) — but keep them singular and quiet (one soft shadow per surface, not depth on every element).
- Do not make buttons overly rounded, oversized, or visually loud.
- Do not use app/workshop radii outside the scale (`3px` inner, `8px` glass pills, `12px` floating panels).
- Do not use app/workshop font weights beyond regular/medium or font sizes above `12px`.
- Do not invent one-off button, badge, table, panel, or card styles outside this system.
- Do not hide financial risk, source confidence, proposal state, or revision changes behind vague icons.
- Do not imitate Intercom’s support/helpdesk content; only adapt its design standards to Archestimator’s estimating domain.

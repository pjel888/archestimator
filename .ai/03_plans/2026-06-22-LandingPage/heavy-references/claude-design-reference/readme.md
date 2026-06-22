# Archestimator Design System

A precise professional instrument for AEC cost estimating — **"documents you would trust, not dashboards that perform."** This design system captures the real Archestimator product surfaces: dense, calm, document-like, with compact SF Pro typography, a restrained neutral palette, thin borders, and color reserved for status and meaning. Brand orange (clay terracotta) is landing / brand / glass-accent only.

> **Archestimator is your cost intelligence layer.** A cost estimating & proposal workspace where estimates are built from a reusable component library, organized in a hierarchical Group/Area tree, tracked through Activity and version history, and handed off as proposal-ready output (shared link or .xlsx). The more you estimate, the more your work compounds.

---

## Sources

This system was synthesized from the read-only product codebase and brand canon provided. None of these are bundled — they are recorded so a reader who has access can cross-check.

| Source | What it gave us |
|---|---|
| `archestimator/` (Next.js 16 / React 19 codebase) | The canonical tokens, components, and product structure |
| `archestimator/DESIGN.md` | The authoritative product design system (colors, type, radius, glass, layout, component contract) |
| `archestimator/src/app/globals.css` | Exact CSS custom-property values + the liquid-glass token layer |
| `archestimator/src/components/ui/*` | The real primitive implementations recreated here (button, badge, chip, input, switch, segmented-control, card, estimate-cell, financial-total-card, …) |
| `archestimator/archestimator_pitch deck/` | Brand voice, orange editorial deck style, real product screenshots |
| Master File v3.0 (brand canon, pasted) | Positioning, voice, claims discipline, copy pack |
| `uploads/archestimator_logo.svg` + moodboard JPGs | The clay terracotta `#AA412A` logo mark (with `#8C3623` dark); warm-orange editorial mood. Campaign/marketing surfaces step up to the louder, more saturated Signal `#F24405`, which never enters product chrome |

**Stack (for reference):** Next.js 16 App Router + React 19 RSC, Tailwind v4 (CSS-first), strict TypeScript, Supabase/PostgreSQL 17, D3 + React Complex Tree. Currency in product examples is the Philippine peso (₱).

---

## CONTENT FUNDAMENTALS

**Voice: "Controlled Confidence."** Direct, sharp, technically credible, quietly competitive — *earned* superiority, never empty. It should read like leverage, not hype. Five principles:

1. **Lead with the change, not the mechanism.** Say what shifts for the reader first; the feature is the credibility clause. Mechanic nouns (library, sheets, rows) belong on `/features`, never a hero.
2. **Plain words, one intriguing idea.** Surround the one unfamiliar phrase ("cost intelligence layer") with sentences a tired estimator gets in three seconds.
3. **Calm conviction, never hype.** State things; don't sell them. "This is what changes for you" beats "revolutionary."
4. **Attack the workflow, never the user.** The villain is the spreadsheet rebuild loop and the dead file — never the reader.
5. **Earn every claim.** Live / Partial / Planned discipline; never imply "only we do this."

**Person & address.** Speak to the reader as **you**; the company is **we**. In-app, speak the user's workflow vocabulary: *estimate* (builder), *proposal* (client output), *quote* (supplier flows), *approval / decline / comment / revision* (decision flow), *Activity / version history* (trust layer).

**Casing.** Sentence case for UI labels and headings. Eyebrows and metadata use UPPERCASE with letter-spacing (mono). Product titles are compact, not shouty. The wordmark is lowercase: *archestimator*.

**Numbers.** Always tabular. Currency with the ₱ symbol and two decimals (`₱ 3,964,714.00`). Codes and dates in monospace (`ES-001`, `02.01.01`, `2026-05-24`).

**Emoji: never** in product UI. The only decorative glyph is a sparse **orange asterisk `✳ / *`** marker on landing/brand surfaces (a premium technical accent, used sparingly).

**Approved lines:** "The teams that win do not guess their numbers." · "When every revision matters, spreadsheets are not enough." · "You never start from zero again. Your numbers hold up." · "From cost proposal to client approval."

**Banned:** "Your competitors are winning because…" · "Stop being left behind." · "the only tool that makes estimates reusable" · "aggregator / database of estimates" · "immutable / legally binding record" (current exports are working documents). Avoid: enterprise-grade, fully automated estimating, ERP/procurement claims, guaranteed accuracy/ROI before measurement.

---

## VISUAL FOUNDATIONS

**Two worlds, one system.** App/workshop UI is strict and enforceable; the public landing is editorial and confident; proposals are document-like. They share tokens but differ in scale and font.

**Color.** A restrained neutral palette: ink `#3D3D3D` (strong) → `#5D5D5D` (default body) → `#7F7F7F` (subtle). Surfaces are white `#FFFFFF` paper floating on a calm grey canvas `#F5F5F5`; client docs use warm proposal paper `#FFFDF8`. Borders are thin hairlines `#F2F2F2` (sibling rules `#D9D9D9`). **Functional color carries meaning only** — success `#15803D`, warning `#B45309`, danger `#B91C1C`, each with a soft tint background. **Brand orange is clay terracotta `#AA412A`** (with `#8C3623` dark, amber/peach bloom stops) and is restricted to landing, brand, and the liquid-glass accent — plus two named app exceptions: the light-orange "Add" affordance and the orange occupied-node glyph on the estimate tree. Never use construction-orange as general app chrome.

**Type.** App = **SF Pro** via system stack, regular(400)/medium(500) only, **12px hard maximum**, zero tracking (12 titles · 11 subtitles · 10 body/controls/cells · 8–9 labels). Hierarchy invariant: labels/meta never render larger than the body they describe. Landing = **Inter**, editorial, tight negative tracking (display 64 → body-lg 18). Proposals = **Source Serif 4**. Dashboard hero = **Zilla Slab**. Numerics/codes/eyebrows = **Roboto Mono** (tabular). SVG chart text has an 11px floor (zoom safety). *SF Pro is Apple-proprietary and intentionally a system stack — no webfont is shipped; non-Apple platforms fall back gracefully.*

**Backgrounds.** App surfaces are flat white paper on a grey canvas — never gradients or textures inside content. The workshop canvas carries a single warm radial **bloom** (clay → amber → peach → transparent) in the bottom-right corner, GPU-cheap and static. Landing may use warm, slightly-blurred construction imagery framed as a product panel. No blueprint clichés, no 3D mascots.

**Elevation & depth.** Depth lives on the **surface edge**, never inside it. Two materials float on the grey canvas: **Paper** (solid white panel: hairline border + one soft float shadow + 12px radius) and **Liquid glass** (frosted translucent chrome: one `backdrop-filter`, frosted-white frost, dark ink text, 12px radius, soft specular top edge). One surface, one shadow. Inside a surface stay flat — thin borders, whitespace, selection backgrounds. No nested shadows, no neon, no glossy depth.

**Radius.** Exactly three values: **3px** inside surfaces (cells, inputs, chips, buttons — the default), **8px** for glass-chrome pills, **12px** for floating panels. Architectural, not toy-like — dense financial/estimate surfaces stay at 3px.

**Spacing.** Fixed scale 4 / 8 / 12 / 20 / 48 / 64 / 112. App gutters 16–24px, never large centered margins; workspace routes fill the full browser height.

**Borders over shadows.** Thin 1px hairlines and whitespace do the separation work in the app. Cards are flat, white, thin-bordered, content-first. Avoid card-on-card nesting — one surface owns each work zone.

**Animation & states.** Quiet and functional. Transitions ~0.15s ease on background/color/border; reduced-motion safe. Hover = muted-surface fill (neutral) or a faint top-lit gradient pill (glass). Active nav = brand-orange gradient glass pill. Press = subtle scale (transform/opacity only). Interactive cards lift 2px with one soft shadow on hover. No bounces, no infinite decorative loops.

**Layout (authenticated app).** Full-browser workspace: glass nav rail (56 collapsed / 248 expanded) · project tree rail (240) · center estimate grid (the dominant surface, never squeezed) · right context dock (360–420) · top workspace bar · bottom budget/Ask bar. The grid owns the majority of width and height.

**Editorial / marketing register (campaign surfaces only — never the product UI).** This is the loud, "exciting + angsty" side of the brand: big flat color fields, near-black ink `#232120`, and a hero set in **Doto** — the robotic dot-matrix pixel display, always UPPERCASE, weight 700–900, tight `+0.01em` tracking. It carries hero headlines, posters, social, and deck dividers; it is **never** product/workshop chrome and **never** the wordmark. The campaign orange is **Signal `#F24405`** — a louder, more saturated step beyond the clay `#AA412A` logo mark — with `--signal-dark`, `--signal-tint`, and a hot `--signal-glow #FF5A1F` for wireframe ink and dither peaks. Supporting grounds: mustard `#F2C20D`, sage `#B5C7B8`, stone `#D4CFC3`. Three recurring motifs: (1) **dither / X-halftone** density fields (`assets/brand-dither*.png`) bled off edges with `multiply`; (2) **isometric construction wireframe** line-art (`assets/brand-wireframe.svg`, recolor via `currentColor` — signal on ink, ink on sage); (3) **big-number stat blocks** — pixel numerals on hairline-ruled grids with mono labels. See the `Brand` cards: marketing posters (signal + wireframe variants), stat blocks, dither, and wireframe.

---

## ICONOGRAPHY

- **System:** [Phosphor](https://phosphoricons.com/) at **regular weight** (1px outline) is the product icon set — `@phosphor-icons/react` in the app. In this design system's HTML cards and kits it's loaded from CDN (`@phosphor-icons/web` regular). **Lucide** at 1px stroke is the documented close substitute.
- **Rendering:** icons take ink / secondary / tertiary color like text. The one colored exception is the **orange occupied-node glyph** (`Circle` in `--occupied-glyph`) marking estimate-tree nodes that hold line items, and the light-orange "Add" affordance buttons.
- **No emoji** in product UI. The only decorative mark is the sparse **orange asterisk** (`✳`/`*`) on landing/brand surfaces.
- **Logo:** `assets/archestimator_logo.svg` (clay `#AA412A` mark, transparent) for light surfaces; `assets/archestimator_logo_white.svg` (white mark) for the orange glass logo slab and dark surfaces. `assets/archestimator_logo.png` is a raster fallback (white background — prefer the SVG). Favicon at `assets/favicon.png`.
- Never hand-draw icons as SVG, and never represent iconography with emoji or unicode art.

---

## Index — what's in this system

**Foundations** (root): `styles.css` is the single entry point consumers link; it `@import`s the token files in `tokens/`:
- `tokens/colors.css` · `tokens/typography.css` (+ `.ae-*` helper classes) · `tokens/spacing.css` (spacing/radius/shadow/dimensions) · `tokens/glass.css` (liquid-glass layer + `.ae-glass`) · `tokens/fonts.css` (Google Fonts import + family vars) · `tokens/base.css` (resets, scrollbars).

**Components** (`components/`, namespace `window.ArchestimatorDesignSystem_3fbb6f`):
- `buttons/` — **Button**, **IconButton**
- `data-display/` — **Badge**, **StatusBadge**, **Chip**, **Avatar**
- `forms/` — **Input** + **Field**, **Switch**, **Checkbox**, **SegmentedControl**
- `surfaces/` — **Card**, **FinancialTotalCard**, **EstimateCell**

Each directory has `<Name>.jsx`, `<Name>.d.ts`, `<Name>.prompt.md`, and a `*.card.html` specimen.

**UI kits** (`ui_kits/`):
- `dashboard/` — the Workshop "command center" homebase (greeting · editorial destination bento · white-paper ledgers). The screen you land on after sign-in.
- `workshop/` — the estimate workspace (tree · sheet · library dock · budget bar). The heart of the product.
- `proposal/` — the client-facing cost proposal document (proposal paper, Source Serif, approve/comment/decline review chrome).
- `landing/` — the editorial marketing hero.

**Design System tab cards** (`guidelines/`): Colors (ink, surfaces, borders, brand, status), Type (app scale, numeric, landing, serif/slab), Spacing (scale, radius, elevation), Brand (logo, glass, iconography).

**Assets** (`assets/`): logos (clay + white SVG, PNG), favicon, frosted construction hero image, sidebar bloom background.

---

## Using it

Consumers link the one stylesheet and read components off the namespace:

```html
<link rel="stylesheet" href="styles.css" />
<script src="_ds_bundle.js"></script>
<script>
  const { Button, EstimateCell, FinancialTotalCard } = window.ArchestimatorDesignSystem_3fbb6f;
</script>
```

Reach for token CSS variables (`var(--ink)`, `var(--surface-muted)`, `var(--radius-xs)`) and the `.ae-*` type helpers rather than hard-coding values. Keep app UI inside the strict scale; let landing breathe.

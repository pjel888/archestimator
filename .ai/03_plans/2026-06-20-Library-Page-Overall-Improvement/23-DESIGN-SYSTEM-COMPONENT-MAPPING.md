# 23 - Design-System Component & Token Mapping

> **Status:** token/primitive mapping reference for the Library trust + overlay +
> density UI, verified against `globals.css`, `helpers.ts`, and the keystone 19.
> The **glass material + slot layer** (which class each Library region renders in)
> is in `35-LIQUID-GLASS-LIBRARY-UX-SPEC.md` — §"Glass Slot & Token Mapping (doc
> 35)" below is the one-stop cross-reference; read 35 for the full slot system,
> grids, overlays, motion, and AA-on-glass contract.
>
> **Terminology (C-002):** the trust/freshness/status element is a **chip**,
> never "badge". The phrase "freshness badge" in older prose below means the
> freshness **chip**. The only place "Badge" appears as a literal is the doc-22
> section *title* "Trust Badge Labels And Tooltips" (a copy-deck section name we
> do not rename) — the element itself is a chip.
>
> **Relaxed per-row scope (C-018):** the mapping tables here are decision tables
> (Reuse / Build / Not-built), not 12-dimension execution rows; Owner/Rollback/
> Telemetry/etc. live in the owning spec docs (27/17/20/24) and in 35 §12 for the
> glass rows.

## Purpose

Docs 10/11/12 specify new visual elements (trust chips, freshness chips near
price, applied-filter chips, dense rows, target-disclosure strip) but never map
them to real primitives or real tokens, and doc 03 forbids local z-index/overlay
invention. This doc closes that gap: every new surface element maps to an
existing primitive or carries an explicit "new primitive justified" note, every
trust/freshness/confidence/lifecycle cue maps to a real app design-system token
that passes WCAG AA, and every glass Library region maps to its surface-variant
slot (35 §2) + `--glass-*` token. Names here are verified against the live code
and defer to 19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md as canon.

DESIGN.md is an alpha guide, not law: this doc follows its token discipline
loosely and defers visual judgment to the owner. It is binding on **names**
(tokens, primitives, utilities, slots), not on aesthetic detail.

## Token Source Of Truth

Tokens live in `src/app/globals.css` and are enforced by
`scripts/enforce-app-design-system.mjs` (`lint:design-system`). There is no
`--app-*` prefix; semantic tokens are unprefixed (`--ink`, `--secondary`) and
exposed to Tailwind v4 as `--color-*` aliases. The relevant trust/state tokens
and their exact values:

| Token | Hex | Tailwind utility | Role |
| --- | --- | --- | --- |
| `--ink` | `#3D3D3D` | `text-ink` | Primary text. |
| `--secondary` | `#5d5d5d` | `text-secondary` | AA-safe load-bearing meta. |
| `--tertiary` | `#7f7f7f` | `text-tertiary` | Decorative meta only (fails AA on small text). |
| `--success` | `#15803d` | `text-success` | Healthy/current/high state. |
| `--success-soft` | `#dcfce7` | `bg-successSoft` `border-successSoft` | Success chip fill/border. |
| `--warning` | `#b45309` | `text-warning` | Stale / low-confidence / discontinued. |
| `--warning-soft` | `#fef3c7` | `bg-warningSoft` `border-warningSoft` | Warning chip fill/border. |
| `--danger` | `#b91c1c` | `text-danger` | Very stale / missing source / blocked. |
| `--danger-soft` | `#fee2e2` | `bg-dangerSoft` `border-dangerSoft` | Danger chip fill/border. |
| `--surface` | `#ffffff` | `bg-white` | Default chip/row background. |
| `--surface-muted` | `#f5f5f5` | `bg-surfaceMuted` | Hover / dense zebra. |
| `--hairline` | `#f2f2f2` | `border-hairline` | Row/chip dividers. |
| `--focus` | `#3D3D3D` | `ring-focus` | Focus ring color. |

Do not introduce new color tokens for trust cues. If a state genuinely needs a
tone the four semantic families cannot express, escalate to the owner and update
`globals.css` + `enforce-app-design-system.mjs` together — never inline a hex.

## AA-Safe Foreground Mapping

The canonical staleness model already returns a three-value tone:
`getStalenessTone()` -> `success | warning | danger | undefined`
(`src/components/workshop/component-library/helpers.ts:667`). The existing
in-code mapping (`ComponentCard.tsx:69`, `CommandPalette.tsx:28`) is the pattern
to reuse, with ONE correction for load-bearing text.

**Two backdrops (paper + glass):** the ratios below are on solid `#ffffff`
(paper). On the glass card the effective backdrop is frosted white
(`--glass-bg rgba(255,255,255,0.72)` over the cool canvas ≈ white), so the same
ratios hold — but the chip adds its own soft fill, so verify the soft-fill +
foreground pair on glass too (see "Chips on glass" above and 35 §4.3/§10). If any
tone drops below AA on the measured glass backdrop, add a `1px`
`border-[color:var(--hairline)]` to the chip to lift separation (per 31 §4).

| `getStalenessTone()` | Foreground token | Hex | Contrast on `#ffffff` | AA |
| --- | --- | --- | --- | --- |
| `success` | `text-success` | `#15803d` | ~4.9:1 | Pass. |
| `warning` | `text-warning` | `#b45309` | ~5.0:1 | Pass. |
| `danger` | `text-danger` | `#b91c1c` | ~5.9:1 | Pass. |
| `undefined` (unknown/missing) | `text-secondary` | `#5d5d5d` | ~7.0:1 | Pass. |

Correction vs current code: the `undefined`/fallback branch currently returns
`text-tertiary` (`#7f7f7f`, ~4.0:1 — borderline and below the AA threshold for
the 8-9px label sizes this system uses). For any load-bearing trust/meta label,
the fallback MUST be `text-secondary`, not `text-tertiary`. Reserve
`text-tertiary` for purely decorative meta that is not the only carrier of the
state. This is consistent with the recorded rule that `#7F7F7F` meta-grey fails
AA on load-bearing text.

Soft-fill chips keep the same family: `bg-warningSoft` behind `text-warning`,
`bg-dangerSoft` behind `text-danger`, `bg-successSoft` behind `text-success`.
These pale fills are background-only — never use a `-soft` token as foreground.

## Tailwind v4 Arbitrary-Var Guard

When a token must be referenced as an arbitrary value (rare here — prefer the
named utilities above), use the color-hinted form:

- Correct: `bg-[color:var(--warning-soft)]`, `text-[color:var(--secondary)]`,
  `border-[color:var(--hairline)]`.
- Broken: `bg-[var(--warning-soft)]` silently emits no color in this Tailwind v4
  setup (it produced all-white budget bars on 2026-06-20).

Default to the semantic utilities (`text-warning`, `bg-warningSoft`); only reach
for `[color:var(--x)]` when no utility exists, and always include the `color:`
hint.

## New Surface Element -> Primitive Mapping

Overlay primitives are real exports under `src/components/ui/overlays/` and
`src/components/ui/`; z-index tiers are fixed (`z-[1000]` modal, `z-[1050]`
menu/popover, `z-[1100]` tooltip). Per doc 03, do not invent local z-index or
overlay surfaces.

| New element (source doc) | Existing primitive | Verdict | Note |
| --- | --- | --- | --- |
| Folder create / rename input (10 Folder Management) | text-prompt dialog = `ConfirmDialog` + child `<input>` + local `textPrompt` state (pattern at `templates-browse/TemplatesBrowseManager.tsx:531-883`) | Reuse pattern | No standalone `PromptDialog`/`InputDialog` exists. Either reuse the inline pattern or scope extracting a shared primitive as separate work; do not assume one exists. |
| Folder delete confirm (10) | `ConfirmDialog` + `ConfirmDialogMessage` (`overlays/confirm-dialog.tsx`) | Reuse | Destructive variant; names folder + component count. |
| Add-component dirty discard (10 Quick Add) | `ConfirmDialog` | Reuse | Replaces native `window.confirm` at `AddComponentModal.tsx:963`. |
| Quick Add Component (10 Quick Add) | `Modal` / `AppModal` (`overlays/modal.tsx`) | Reuse | Short modal; required = name/category/unit/unit_cost per canon. Advanced fields go to drawer/editor, not nested modals. |
| Trust chip (11) | none — inline element | New, justified | A chip is a styled `<span>` with an accessible name, not an overlay. No primitive needed; token-only (see chip spec below). Not a Badge primitive — none is exported. |
| Freshness chip near price (10 Component Card, 11; C-002 — "chip", not "badge") | none — inline element | New, justified | Same as trust chip; positioned adjacent to price per doc 10. |
| Applied-filter chip + reset (12 Toolbar) | none — inline element | New, justified | Dismissible `<button>` chips in a strip above results; the popover itself stays `dropdown-popup.tsx` / `Popover`. |
| Result-count / scope strip (10, 12) | none — inline element | New, justified | Static text region with a live-region announcement (doc 12). |
| Dense component row / table (10 Dense Row, 12 Table vs Grid) | native `<table>` (doc 12 default) | New markup, no primitive | Use native table semantics; ARIA grid only if cells become editable (doc 12). Reuse `src/lib/workshop/virtualization-flags.ts` for the virtualized fallback — do not add a new virtualization lib. |
| Component inspector dock (10 Inspector) | `ComponentInspectorDock.tsx` (desktop) / `InspectorDrawer` (narrow) | Reuse | Existing dock is canonical; narrow screens use `InspectorDrawer` (`overlays/sheet-drawer.tsx`; there is no `SheetDrawer` export — the file exports `Sheet`/`Drawer`/`SidePanel`/`InspectorDrawer`) per doc 12. Call it "inspector dock". |
| Template move (P4) | `CreatableCombobox` (`ui/creatable-combobox.tsx`) | Reuse | Replaces the move `window.prompt`; canon names this primitive explicitly. |
| Template insert target disclosure (10 Template Insert, P4) | `InsertIntoEstimatePicker.tsx` (a `Modal`) + `resolveEstimateTemplateInsertTarget` | Reuse | Add explicit target row/disclosure inside the existing Modal; target re-resolved before mutation. No new overlay. |
| Facet filter applied-state surface (12) | `dropdown-popup.tsx` / `Popover` | Reuse | Popover unchanged; applied state moves OUT to the chip strip (above), not a new overlay. |

Result: zero new overlay primitives are required. The only "new" elements are
inline, token-styled spans/buttons (chips, count strip) and a native table —
none of which is an overlay or needs a z-index tier.

## Glass Slot & Token Mapping (doc 35)

The liquid-glass material is a first-class Library skin (35 §0): the Library
speaks the same language as the sidebar, dashboard, and estimate sheet. The
mechanism is a per-region **surface-variant slot system** mirroring
`estimateSurfaceClass` in `src/components/workshop/estimate-surface-variant.tsx:21`
— a single `librarySurfaceClass(variant, slot)` maps `(paper | glass, slot)` to an
**existing** class (no new CSS recipes). This table binds every Library surface
element to its slot, its glass class, the `--glass-*` tokens it draws on, and the
build/verify phase. The full slot system, grids, overlays, and motion live in
`35-LIQUID-GLASS-LIBRARY-UX-SPEC.md` §2; the 12-dimension execution rows for
glass live in 35 §12 (EV-G-* IDs).

| Library surface element | Slot (35 §2) | glass className | Tokens used | Phase | Binding (real file / 35 §) |
| --- | --- | --- | --- | --- | --- | --- |
| Route root workspace canvas | `workspaceWell` | `estimate-glass-well` | warm bloom `--brand-peach`/`--brand-amber` | 1 | `ComponentLibraryManager.tsx`; 35 §4.2 |
| Folder tree rail (left) | `treeRail` | `estimate-glass-rail rounded-[8px]` | `--glass-blur`, `--glass-border` | 1 | tree `:762`; 35 §4.2 |
| Inspector dock (right, ≥lg) | `inspectorDock` | `estimate-glass-rail rounded-[8px]` | `--glass-blur`, `--glass-border` | 1 | `ComponentInspectorDock.tsx`; 35 §4.6 |
| Catalogue / gallery centre | `centerColumn` | `estimate-glass-paper rounded-[8px]` | `--glass-bg`, `--glass-divider` | 1 | `:927`; 35 §4.2 |
| Sticky catalogue/gallery header | `sheetHeader` | `estimate-glass-chrome estimate-glass-divider` | `--glass-divider` | 1 | `:931`; 35 §4.2 |
| Dense-table sticky `<thead>` (P5) | `stickyHead` | `estimate-glass-headchrome` | `--glass-bg` | 5 | net-new; 35 §2 |
| Icon toolbar row (sticky header) | `chromeToolbar` | `bg-transparent` | (strip baked `bg-white`) | 1 | 35 §2 |
| Non-sticky toolbar row inside a rail | `railToolbar` | `estimate-glass-divider` | `--glass-divider` | 1 | 35 §2 |
| **Component card shell** | `catalogueCard` | paper P1 → `.workshop-project-card-glass` P2 | `--glass-bg`, `--glass-shadow`, `--glass-border-top` | 1 (paper) / **2 (glass)** | `ComponentCatalogueCard` `:323-480`; `globals.css:1336`; 35 §4.2, §12.6 |
| **Template gallery row shell** | `galleryRow` | paper P1-4 → `.workshop-project-card-glass` P5 | `--glass-bg`, `--glass-shadow` | 1-4 (paper) / **5 (glass)** | `TemplateGallery.tsx:61`; `globals.css:1336`; 35 §4.4, §12.7 |
| **Primary CTA tile** (Quick Add, New Template) | `ctaTile` | `.dashboard-glass-warm` | `--brand-orange` tint base, `--glass-blur` | 1 | `globals.css:1753`; 35 §12.9 |
| Result-count / scope strip | `countStrip` | `bg-transparent` | (text on glass) | 1 | `ComponentLibraryManager.tsx` centre; 35 §2 |
| Catalogue inner card fills | `gridSurface` | `""` (transparent) | (one glass paper reads through) | 1 | 35 §3.2 |
| Edit drawer / narrow inspector | (drawer glass) | `InspectorDrawer` / `Sheet`/`Drawer` glass panel | `--glass-bg`, `--glass-blur` | 1 / 0B | `ui/overlays/sheet-drawer.tsx`; 35 §5, §12.8 |
| Modal content panel | (modal paper) | `Modal`/`AppModal` paper panel | (no blur on panel) | 0B/3/4 | `ui/overlays/modal.tsx`; 35 §5 |
| Primary action button | (button) | `.workshop-liquid-button` | translucent fill + bright edge | 1 | `globals.css:1271`; 35 §12.9 |

Glass-primitive reuse map (confirms the audit's missing rows):

| Glass element | Verdict | Real name / class |
| --- | --- | --- |
| Glass card shell | Reuse | `.workshop-project-card-glass` (`globals.css:1336`, already used by dashboard `ProjectCard.tsx:21`) |
| Warm-glass CTA tile | Reuse | `.dashboard-glass-warm` (`globals.css:1753`) |
| Glass drawer panel | Reuse | `InspectorDrawer` / `Sheet`/`Drawer` (`ui/overlays/sheet-drawer.tsx`) |
| Glass modal (optional) | Reuse sparingly | `BlurModal` (`ui/overlays/modal.tsx`) — one blur only; default Modal stays paper |
| Floating glass rail | Reuse | `.estimate-glass-rail` (`globals.css:1568`) |
| Glass paper | Reuse | `.estimate-glass-paper` (`globals.css:1589`) |
| Per-region variant context | Reuse (model) | `EstimateSurfaceVariantProvider` (`estimate-surface-variant.tsx:25`) — mirrored by the net-new `LibrarySurfaceVariantProvider` |
| Liquid chrome button | Reuse | `.workshop-liquid-button` (`globals.css:1271`) |

`--glass-*` token layer (author against these; `src/app/globals.css:108-146`):

| Token | Value | Use |
| --- | --- | --- |
| `--glass-bg` | `rgba(255,255,255,0.72)` | Panel fill for glass shells |
| `--glass-bg-fallback` | `#fbfbfc` | `@supports not (backdrop-filter)` + `prefers-reduced-transparency` |
| `--glass-blur` | `18px` | One blur per region; never animate |
| `--glass-saturate` | `145%` | Saturation boost on the blur |
| `--glass-border` | `rgba(38,44,58,0.10)` | Panel hairline (cool neutral) |
| `--glass-border-top` | `rgba(255,255,255,0.5)` | Specular top edge |
| `--glass-shadow` | `0 8px 28px rgba(30,35,50,0.12), …` | Floating shadow |
| `--glass-divider` | `linear-gradient(90deg, transparent, rgba(38,44,58,0.14), transparent)` | Centre-faded hairline |
| `--glass-radius` | `12px` | Outer glass shell only |
| `--glass-nav-radius` | `8px` | Floating rails + nav pills |
| `--radius-xs` | `3px` | Everything inside a panel (cards, chips, inputs, rows) |
| `--brand-orange` | `#F24405` | Primary presence; warm-glass tint base |

Radius rule (35 §6): `12px` outermost shell · `8px` rails + nav pills · `3px`
everything inside a panel. Do NOT use `rounded-sm/md/lg/xl/full`. (See also the
[archestimator-design-system-sync] and [tailwind-arbitrary-var-needs-color-hint]
memories: `bg-[var(--x)]` silently emits no color in this TW v4 setup — use
`bg-[color:var(--x)]`.)

### Chips on glass — contrast on the actual backdrop (35 §4.3, §10)

The §AA-Safe Foreground Mapping ratios above are computed on solid `#ffffff`. On
the glass card (`--glass-bg rgba(255,255,255,0.72)` blended over the cool grey
canvas) the effective backdrop is frosted white (rgba ~0.58–0.9 ≈ white), so the
same ratios hold — but the chip itself adds a soft fill, so verify the pair:

- Chip = soft fill (`bg-*Soft`) + semantic foreground (`text-*`); AA fallback
  `text-secondary` (`#5d5d5d` ~7.0:1). **Never `text-tertiary` `#7f7f7f`** on a
  chip at any size (~4.0:1, fails AA for the 8-9px small text chips use).
- 9px chip text is **small text** under WCAG (no large-text 3:1 relaxation), so
  all four tone foregrounds must clear 4.5:1 at 9px — verified: `success #15803d`
  ~4.9:1, `warning #b45309` ~5.0:1, `danger #b91c1c` ~5.9:1, fallback
  `--secondary #5d5d5d` ~7.0:1.
- **No `backdrop-filter` on any chip** — chips are flat soft-fill spans. Nested
  glass is forbidden (35 §0, §11). If a chip-on-glass pair is below AA, add a
  `1px` hairline `border-[color:var(--hairline)]` to lift separation (verify per
  31 §4).

## Trust / Freshness / Confidence / Lifecycle Chip Spec

All chips share one structure: a compact inline element with a soft fill, a
semantic foreground, an accessible name, and an optional 1px-outline icon. Bind
state to the real columns/helpers (doc 13/19), never invent client state.

| Cue | Source binding | Tone driver | Fill / foreground | Label (see 22) |
| --- | --- | --- | --- | --- |
| Freshness | `pricing_date` via `getComponentPricingFreshness()` (`component-facet-filter.tsx`) + `getStalenessTone()` | `success`/`warning`/`danger`/`undefined` | matching `bg-*Soft` + `text-*`; fallback `text-secondary` | "Price stale" / "Price recent" / "No price date". |
| Very stale | `pricing_date` > 180d (4-tier beta scope, C-021; the 180 tier is NEW and must extend the existing 3-source 90-day lockstep in lockstep, not diverge) | `danger` | `bg-dangerSoft` + `text-danger` | "Price very stale". |

**Adding the 180-day `very stale` tier in lockstep (Phase 2, no schema change):**
all four edits must ship in one commit or the freshness source-of-truth
fragments:

1. `component-facet-filter.tsx:12` — keep `COMPONENT_FACET_STALE_DAYS = 90`; add
   `COMPONENT_FACET_VERY_STALE_DAYS = 180`.
2. `component-facet-filter.tsx:61` — extend `getComponentPricingFreshness` to
   return a 4th value `"very-stale"` for `ageDays > 180`; extend the
   `ComponentPricingFreshness` union (:17) and `FRESHNESS_OPTIONS` (:161) to
   match.
3. `component-library/helpers.ts:667`/`:675` — `getStalenessTone`/`getStalenessLabel`
   already return `danger` for `>180`; confirm the threshold reads the NEW
   constant (`COMPONENT_FACET_VERY_STALE_DAYS`), do not hardcode `180` in two
   places.
4. `LibraryOverview.tsx:114` — update the hardcoded "90 days" UI string to the
   4-tier framing, and `component-library-repository.ts:827`
   (`LIBRARY_OVERVIEW_STALE_PRICING_DAYS`) if it derives a second tier.

This is a **Phase-2** helper-layer extension; C-021 confirms it is beta scope and
needs no schema change.
| Confidence | `confidence` (FREE-TEXT `string \| null`) -> derived label | low/uncertain -> `warning`; missing -> `undefined` -> `text-secondary` | `bg-warningSoft` + `text-warning` (low) | "Low confidence" / "No confidence". |
| Lifecycle | `lifecycle_state` enum: `draft \| in_production \| available \| discontinued \| archived` | `available`/`in_production` -> neutral `text-secondary`; `draft` -> `text-secondary`; `discontinued` -> `warning`; `archived` -> `danger` | soft fill per tone | "Discontinued" / "Archived" / "Draft". |
| Link/snapshot | `link_state` enum: `unlinked \| linked-clean \| linked-overridden \| detached \| source-changed`; missing-source is DERIVED | `source-changed`/`detached` -> `warning`; missing source -> `danger` | soft fill per tone | "Source changed" / "Detached" / "Source missing". |

Notes that override stale doc text:
- "stale" is PRICING freshness only. Link/snapshot drift is "source-changed",
  never "stale" (canon glossary).
- Doc 11 lifecycle labels "Active/Deleted" are wrong: "Active" -> `available`,
  add `in_production`, and "Deleted" is row-removal/not-listed recovery UI, not
  an enum tone. Map all five real enum values.
- Confidence has no enum/CHECK today; the chip derives a label over free text. A
  controlled vocabulary is deferred (canon) — do not gate on an enum.
- No `last_reviewed`/`reviewed_at` column exists. Trust cues that doc 10/11 tie
  to "last reviewed" must rebind to `updated_at` or be gated behind the Data
  Migration Gate; do not render a review date the schema cannot supply.

## Applied-Filter Chip + Dense-Row Density

There is no library-row density TOKEN set (the dashboard `--dashboard-row`
tokens are dashboard-scoped and out of scope). Density in the Library is
expressed with the existing compact-system Tailwind utilities under the
`lint:design-system` cap (text <= 12px, weight regular/medium, `rounded-xs`,
`tracking-normal`):

| Element | Density utilities | Constraint source |
| --- | --- | --- |
| Applied-filter chip | `inline-flex items-center gap-1 rounded-xs border border-hairline bg-surfaceMuted px-2 py-0.5 text-[10px] leading-4 font-medium text-secondary` + dismiss `<button>` | enforce-app-design-system (<=12px, rounded-xs, tracking-0). |
| Dense row cell | `px-2 py-1 text-[10px] leading-4 text-secondary` (meta) / `text-ink` (name/price) | same. |
| Trust/freshness chip | `inline-flex items-center gap-1 rounded-xs px-1.5 py-0.5 text-[9px] leading-3 font-medium` + tone fill/foreground | label-like 8-9px floor (`labelLikeTextSizeLimitPx`). |
| Dense zebra/hover | `hover:bg-surfaceMuted` | reuse `--surface-muted`. |

The existing `viewMode` preference (`"compact" | "detailed" | "grid"` in
`helpers.ts:664`) is the persistence key, but the doc-12 card/dense toggle and
the native dense TABLE are net-new (canon: the density toggle does not exist
yet, Phase 5). Reuse the `viewMode` storage shape rather than adding a new pref
key. Density toggles, chips, and count strips must not change selected
row/card height unexpectedly (doc 12 No-Overlap).

## Focus Ring + Reduced Motion

Consistent with doc 12:

- Focus: every interactive chip/row/button/combobox option uses
  `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus`
  (the existing pattern in `creatable-combobox.tsx:210`). `ring-focus` resolves
  to `--focus: #3D3D3D`. Do not introduce a per-feature focus color.
- Focus is returned to the trigger after overlay close/cancel; destructive
  confirmation keeps focus inside the dialog until closed (doc 12).
- Reduced motion: drawer/inspector/overlay transitions honor
  `prefers-reduced-motion`; trust/freshness state must be readable without
  animation (doc 12). Chips are static — no entrance animation is required, and
  none may be load-bearing for comprehension.

## Reuse Confirmation: Exists vs Must Be Built

| Capability | Status | Real name |
| --- | --- | --- |
| Confirm / destructive dialog | Exists | `ConfirmDialog`, `ConfirmDialogMessage` (`overlays/confirm-dialog.tsx`). |
| Modal | Exists | `Modal` / `AppModal` / `BlurModal` (`overlays/modal.tsx`). |
| Sheet drawer (narrow inspector) | Exists | `InspectorDrawer` (`overlays/sheet-drawer.tsx`; the file exports `Sheet`/`Drawer`/`SidePanel`/`InspectorDrawer` — there is no `SheetDrawer` export). |
| Inspector dock | Exists | `ComponentInspectorDock.tsx`. |
| Popover / dropdown popup | Exists | `Popover`, `dropdown-popup.tsx`. |
| Creatable combobox (template move) | Exists | `CreatableCombobox` (`ui/creatable-combobox.tsx`). |
| Insert picker modal | Exists | `InsertIntoEstimatePicker.tsx` (Modal). |
| Insert target resolver | Exists | `resolveEstimateTemplateInsertTarget` (server action). |
| Tone -> class mapping | Exists | `ComponentCard.tsx:69` / `CommandPalette.tsx:28` (reuse; fix `undefined` fallback to `text-secondary`). |
| Freshness/staleness helpers | Exists | `getComponentPricingFreshness`, `getStalenessTone`, `getStalenessLabel`. |
| Virtualization | Exists | `src/lib/workshop/virtualization-flags.ts` (`@tanstack/react-virtual`). |
| Trust / freshness chip element | Build (inline, token-only) | net-new span; no overlay, no z-index. |
| Applied-filter chip strip + reset | Build (inline) | net-new buttons; popover unchanged. |
| Result-count / scope strip | Build (inline) | net-new text + live region. |
| Dense component table | Build (native `<table>`) | net-new markup; reuse virtualization flag. |
| Card/dense density toggle | Build | net-new; reuse `viewMode` pref shape. |
| Standalone text-prompt primitive | Not built (do not assume) | reuse inline `ConfirmDialog`+input pattern, or scope extraction separately. |

## Responsive Breakpoint Matrix (chips + dense row + glass shells)

Density and chip layout change by breakpoint. Glass shells keep
`--glass-radius:12px` across all breakpoints; inner cards stay `3px` (do NOT
enlarge radii on mobile — 35 §9). The chip strip is the surface most likely to
overflow a narrow card; the priority-collapse rule below keeps the highest-value
trust cues visible.

| Breakpoint | Workspace grid (35 §3.1) | Glass treatment (35 §9) | Chips on a card | Dense row |
| --- | --- | --- | --- | --- |
| Desktop ≥1280 (`xl`) | tree \| centre \| dock (3 tracks) | glass well + rails + paper; dock = floating glass rail | full chip set (freshness, lifecycle, confidence, source) | table, sticky `stickyHead`, full columns |
| Laptop 1024–1279 (`lg`) | tree \| centre (dock off) | same; dock → `InspectorDrawer` | full chip set | table, slightly fewer meta columns |
| Tablet 768–1023 (`md`) | single column; tree → collapsible drawer; dock → drawer | drawers are the single glass panels; well stays | **≤2 highest-priority chips** (danger-tone first, then warning-tone, then neutral); rest move to inspector | card list (no table) |
| Mobile <768 | single column; tree + dock both drawers | one glass panel on screen; no nested glass in drawers | ≤2 chips; long names truncate with `text-ellipsis` | card list |

Chip priority-collapse rule (35 §4.3 binding): at `<lg`, show at most the 2
highest-priority chips on a card — `danger`-tone first, then `warning`-tone, then
neutral `text-secondary`; the full set is always available in the inspector dock.
`freshness` outranks `lifecycle` within the same tone (pricing freshness is the
primary cost-trust signal). All trust state must remain readable without color
alone (border + tone + label) — see 31 §4.

## RTL / i18n for chip layout

Chip layout must be mirror-correct for RTL locales (28 §RTL). Rules:

- The chip strip uses `flex-row-reverse` under `[dir="rtl"]` so the dismiss `×`
  on an applied-filter chip sits at the **reading-start** edge (right in RTL),
  matching the icon-then-text order users expect. Trust chips (no dismiss) simply
  mirror their left-to-right order.
- Chip `gap-1` and `px-1.5` padding are direction-agnostic (logical properties);
  do not use `ml-*`/`mr-*` for chip spacing — use `gap`/`ms-*`/`me-*` so the
  strip mirrors correctly.
- Tone tokens are locale-neutral (color is not text); only the chip LABEL string
  is translated, via the doc-22 state-name row (do not translate the tone).
- Pluralization for the result-count strip (`countStrip`) follows 28 §pluralization
  (one/few/many/other); the count live-region announcement must use the
  pluralized form.
- The warm-glass CTA `ctaTile` and `.workshop-liquid-button` keep their internal
  icon/text order under RTL via `flex-row-reverse` (same as the dashboard CTA —
  reuse, do not re-derive).

## Unsupported-browser fallback

Glass is progressive enhancement, not a hard dependency. Fallbacks (35 §6, §8,
§10):

| Condition | Fallback | Token / mechanism |
| --- | --- | --- |
| `@supports not (backdrop-filter)` | opaque panel (`--glass-bg-fallback #fbfbfc`) | `globals.css` `@supports` block |
| `prefers-reduced-transparency: reduce` | opaque panel (same fallback) | `globals.css` reduced-transparency block |
| `prefers-reduced-motion: reduce` | glass `clip-path`/`width`/`transform` transitions neutralized; trust chips + state readable without animation | `globals.css:309,1042,1097,1327` |
| Safari/Firefox/mobile (no SVG refraction) | CSS `backdrop-filter` blur path (refraction is desktop-Chromium-only) | `useLiquidGlassRefraction.ts` |
| Blur not yet armed | glass surfaces paint `backdrop-filter: none` first; armed via `<html data-glass="ready">` after first paint + idle | `LiquidGlassReady.tsx:25` + animatable `@property --glass-blur-amount` ramp |

On the fallback, **all text contrast + selection + focus states must be
preserved** — verify per 31 §4. The fallback must never drop a trust chip or a
selection state. Do NOT gate glass arming on `no-preference` (it strands older
Chrome — [deferred-liquid-glass] memory); keep the `requestAnimationFrame`
backstop.

## Visual-Regression Checklist (cross-ref doc 29)

Every glass + chip surface below must have a screenshot in
`29-BROWSER-PROOF-AND-VISUAL-QA-MATRIX.md` at the listed breakpoint(s). Chips are
verified for tone + label + AA on BOTH paper and glass backdrops. This checklist
is the doc-29 capture list for the surfaces this doc owns.

| Surface | Capture at | Pass criteria |
| --- | --- | --- |
| Overview bento on glass well | `xl`, `md` | warm CTA tile, glass tiles, plain counts tile; no nested glass |
| Components tab 3-pane (tree \| paper \| dock) | `xl`, `lg`, `md`, mobile | one blur per region; dock→drawer at `<lg` |
| Catalogue card — paper (P1) | `xl`, `md` | chip set reads; AA on white |
| Catalogue card — glass (P2) | `xl`, `md` | chip set reads on glass; no chip `backdrop-filter`; selected ring visible |
| Trust chip set (fresh/stale/very-stale/missing + lifecycle + confidence) | close-up, paper + glass | 4 tones + fallback; `text-tertiary` absent |
| Applied-filter chip strip + count | `xl`, `md` | clear-all + per-chip dismiss; RTL mirror |
| Dense row / table (P5) | `xl`, `lg` | sticky `stickyHead`; selection wires to `BulkActionToolbar` |
| Inspector dock (glass rail) + drawer | `xl` (dock), `md`/mobile (drawer) | one blur; focus trap + return in drawer |
| Quick Add Modal (paper) + warm CTA tile | `xl`, `md` | paper interior; warm tile distinct from neutral |
| Edit drawer (glass panel) | `md`, mobile | editable fields stay paper inside; one blur |
| Reduced-transparency / reduced-motion fallback | emulated media query | opaque panel; states preserved; no animation |
| Template gallery row — paper (P1-4) + glass (P5) | `xl`, `md` | link-health chip; same family as component cards |

Capture commands and the screenshot harness live in 29 §capture; the verification
commands for the slot system + tokens live in 35 §14.

## Cross-References

- 03-MODALS-POPOVERS-AND-OVERLAYS.md — overlay inventory, z-index tiers, no
  local-invention rule this doc implements.
- 10-LIBRARY-SURFACE-SPECS.md — surfaces (card, dense row, inspector, quick add)
  these primitives/tokens serve.
- 11-SOURCE-TRUST-STATE-MATRIX.md — freshness/confidence/lifecycle/link states
  the chip tones bind to (corrected against real enums here).
- 12-RESPONSIVE-ACCESSIBILITY-INTERACTION-CONTRACT.md — focus ring, reduced
  motion, table-vs-grid, applied-filter chip, no-overlap rules.
- 13-DATA-CONTRACTS-ROUTE-CACHE.md — real columns/enums the chip bindings read.
- 19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md — canonical names, enums,
  helpers, and phase map (0A -> 0B -> 1 -> 2 -> 3 -> 4 -> 5) this doc obeys.
- 22-COPY-DECK-AND-MICROCOPY.md — exact chip/label strings paired with the tones
  above.
- 28-I18N-RTL-AND-LOCALIZATION-CONTRACT.md — RTL mirror + pluralization rules the
  chip strip + count strip obey.
- 29-BROWSER-PROOF-AND-VISUAL-QA-MATRIX.md — the visual-regression checklist
  above is its capture list.
- 30-PERF-BUDGET-AND-REGRESSION-GATES.md — perf budgets (PROVISIONAL until Phase
  0A baseline per C-015) the glass guardrails measure against.
- 31-A11Y-ACCEPTANCE-CRITERIA-MATRIX.md — contrast/focus/reduced-motion acceptance
  the chips-on-glass AA rule verifies against.
- 35-LIQUID-GLASS-LIBRARY-UX-SPEC.md — the material + grid + slot layer; §"Glass
  Slot & Token Mapping (doc 35)" above is the one-stop index into it. The 12-dim
  execution rows for glass live in 35 §12.

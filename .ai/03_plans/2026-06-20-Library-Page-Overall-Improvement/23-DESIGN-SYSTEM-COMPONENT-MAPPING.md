# 23 - Design-System Component & Token Mapping

## Purpose

Docs 10/11/12 specify new visual elements (trust chips, freshness badges near
price, applied-filter chips, dense rows, target-disclosure strip) but never map
them to real primitives or real tokens, and doc 03 forbids local z-index/overlay
invention. This doc closes that gap: every new surface element maps to an
existing primitive or carries an explicit "new primitive justified" note, and
every trust/freshness/confidence/lifecycle cue maps to a real app design-system
token that passes WCAG AA. Names here are verified against the live code and
defer to 19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md as canon.

DESIGN.md is an alpha guide, not law: this doc follows its token discipline
loosely and defers visual judgment to the owner. It is binding on **names**
(tokens, primitives, utilities), not on aesthetic detail.

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
| Freshness badge near price (10 Component Card, 11) | none — inline element | New, justified | Same as trust chip; positioned adjacent to price per doc 10. |
| Applied-filter chip + reset (12 Toolbar) | none — inline element | New, justified | Dismissible `<button>` chips in a strip above results; the popover itself stays `dropdown-popup.tsx` / `Popover`. |
| Result-count / scope strip (10, 12) | none — inline element | New, justified | Static text region with a live-region announcement (doc 12). |
| Dense component row / table (10 Dense Row, 12 Table vs Grid) | native `<table>` (doc 12 default) | New markup, no primitive | Use native table semantics; ARIA grid only if cells become editable (doc 12). Reuse `src/lib/workshop/virtualization-flags.ts` for the virtualized fallback — do not add a new virtualization lib. |
| Component inspector dock (10 Inspector) | `ComponentInspectorDock.tsx` (desktop) / `InspectorDrawer` (narrow) | Reuse | Existing dock is canonical; narrow screens use `InspectorDrawer` (`overlays/sheet-drawer.tsx`; there is no `SheetDrawer` export — the file exports `Sheet`/`Drawer`/`SidePanel`/`InspectorDrawer`) per doc 12. Call it "inspector dock". |
| Template move (P4) | `CreatableCombobox` (`ui/creatable-combobox.tsx`) | Reuse | Replaces the move `window.prompt`; canon names this primitive explicitly. |
| Template insert target disclosure (10 Template Insert, P4) | `InsertIntoEstimatePicker.tsx` (a `Modal`) + `resolveEstimateTemplateInsertTarget` | Reuse | Add explicit target row/disclosure inside the existing Modal; target re-resolved before mutation. No new overlay. |
| Facet filter applied-state surface (12) | `dropdown-popup.tsx` / `Popover` | Reuse | Popover unchanged; applied state moves OUT to the chip strip (above), not a new overlay. |

Result: zero new overlay primitives are required. The only "new" elements are
inline, token-styled spans/buttons (chips, badges, count strip) and a native
table — none of which is an overlay or needs a z-index tier.

## Trust / Freshness / Confidence / Lifecycle Chip Spec

All chips share one structure: a compact inline element with a soft fill, a
semantic foreground, an accessible name, and an optional 1px-outline icon. Bind
state to the real columns/helpers (doc 13/19), never invent client state.

| Cue | Source binding | Tone driver | Fill / foreground | Label (see 22) |
| --- | --- | --- | --- | --- |
| Freshness | `pricing_date` via `getComponentPricingFreshness()` (`component-facet-filter.tsx`) + `getStalenessTone()` | `success`/`warning`/`danger`/`undefined` | matching `bg-*Soft` + `text-*`; fallback `text-secondary` | "Price stale" / "Price recent" / "No price date". |
| Very stale | `pricing_date` > 180d (extends the 90d model; canon: 180 tier is NEW and must extend, not diverge) | `danger` | `bg-dangerSoft` + `text-danger` | "Price very stale". |
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

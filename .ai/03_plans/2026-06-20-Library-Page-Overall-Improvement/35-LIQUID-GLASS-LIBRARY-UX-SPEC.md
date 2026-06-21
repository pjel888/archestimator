# 35 — Liquid Glass Library UX/UI Specification

> **Status:** Implementation-ready specification, **v2 (2026-06-21)**. This revision
> **reframes** the Library glass work from the prior conservative posture ("frost the
> workspace shell only; keep all cards paper until Phase 5") to a **full liquid-glass
> redesign** that brings the Library to visual parity with the workshop shell
> (sidebar, dashboard, estimate sheet). DESIGN.md is an alpha guide, not law: visual
> judgment is deferred to the owner; this doc is binding on **names** (tokens,
> classes, primitives, slots) and on the **one-blur-per-region** / AA / reduced-motion
> contracts, not on aesthetic detail.
>
> **Scope:** Defines the liquid-glass material, the per-region **surface-variant slot
> system** (mirroring the estimate sheet's proven pattern), the **grid system** for
> every Library surface, the **glass overlay** treatment, and the per-surface
> acceptance criteria — so the Library reads as one continuous member of the
> workshop's glass family without duplicate blurs, magic numbers, or per-component
> motion guards.
>
> **Companion docs:** [04-UX-RESEARCH-SYNTHESIS.md](04-UX-RESEARCH-SYNTHESIS.md),
> [10-LIBRARY-SURFACE-SPECS.md](10-LIBRARY-SURFACE-SPECS.md),
> [12-RESPONSIVE-ACCESSIBILITY-INTERACTION-CONTRACT.md](12-RESPONSIVE-ACCESSIBILITY-INTERACTION-CONTRACT.md),
> [23-DESIGN-SYSTEM-COMPONENT-MAPPING.md](23-DESIGN-SYSTEM-COMPONENT-MAPPING.md),
> [31-A11Y-ACCEPTANCE-CRITERIA-MATRIX.md](31-A11Y-ACCEPTANCE-CRITERIA-MATRIX.md),
> [19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md),
> [30-PERF-BUDGET-AND-REGRESSION-GATES.md](30-PERF-BUDGET-AND-REGRESSION-GATES.md),
> [29-BROWSER-PROOF-AND-VISUAL-QA-MATRIX.md](29-BROWSER-PROOF-AND-VISUAL-QA-MATRIX.md).

---

## 0. Design thesis — what "liquid glass Library" means here

The workshop already speaks a coherent liquid-glass language: the **sidebar** is a
frosted rail, the **dashboard** is a single frosted workspace shell with content-grade
glass project cards floating on a warm-bloomed canvas, and the **estimate sheet** is a
"well + floating rails + near-opaque paper + frosted chrome" workspace driven by a
per-region surface-variant slot system. The Library today is the one major workshop
surface that does **not** speak this language — it is 100 % paper/flat (`bg-white`
everywhere, zero glass tokens, zero `backdrop-filter`; verified across all four routes).

This spec closes that gap by adopting the **same material as a first-class skin**, not a
token map. Concretely the Library becomes:

1. A **glass workspace well** (the cool grey canvas with the signature warm bottom-right
   bloom) behind every Library route — mirroring `.estimate-glass-well` /
   `.dashboard-root`'s canvas.
2. **Floating frosted rails** (folder tree left, inspector dock right) and a **floating
   near-opaque paper centre** — the exact `.estimate-glass-rail` / `.estimate-glass-paper`
   family, driven by a `librarySurfaceClass(variant, slot)` slot system that mirrors
   `estimateSurfaceClass` (§2).
3. **Content-grade glass cards/rows** in the catalogue and gallery — mirroring
   `.workshop-project-card-glass` (the dashboard's project cards are already glass, so
   glass cards here are **matching committed language, not decorative glassmorphism**).
4. **Warm-glass CTA tiles** (`.dashboard-glass-warm`) and **liquid chrome buttons**
   (`.workshop-liquid-button`) for primary actions.
5. **Glass-aware overlays** (drawers as single-blur glass panels; modals keep a crisp
   paper interior — §5).

**Two postures, one variant system.** A `LibrarySurfaceVariantProvider` (React context,
mirroring `EstimateSurfaceVariantProvider`) selects `paper | glass`. **Phase 1** ships the
glass well + rails + paper + chrome + liquid buttons + warm CTAs (the chrome/skeleton
goes glass; catalogue/gallery **cards stay paper** so density + trust-chip contrast is
proven first). **Phase 2** (components tab) and **Phase 5** (templates tab + dense mode)
promote the catalogue/gallery **cards/rows to content-grade glass**. This sequencing is
the only thing the prior conservative framing got right; everything else (grids, slot
system, glass cards, overlays, motion) is specified here as build-ready.

**Why this is on-brand, not slop.** `impeccable` bans glassmorphism *as a default* and
nested glass *always*. Neither is happening here: glass is the workshop's **established**
material (sidebar/dashboard/estimate all ship it), and this doc enforces **one
`backdrop-filter` per region** with children using only translucent fills — never stacked
blurs (§11). Cards are glass because the reference cards are glass; the soft-fill trust
chips sit *on* glass without their own blur (§4.3).

---

## 1. Reference surfaces already using liquid glass (the patterns to copy)

These shipped surfaces are canonical. Library surfaces must reuse the same token layer,
the same "one blur per region" rule, and — for the slot mechanism — the estimate sheet's
`estimateSurfaceClass` model.

| Surface | File:line | Glass class / mechanism | What to copy |
|---|---|---|---|
| Main sidebar (nav rail) | `src/components/sidebar/MainSidebar.tsx:284` | `.sidebar-glass` | Single `backdrop-filter` on the panel; children translucent, never child blurs. |
| Sidebar refraction | `src/components/sidebar/SidebarGlassFilter.tsx:23` + `useLiquidGlassRefraction.ts:8` | SVG filter `sc-sidebar-glass`, armed via `<html data-glass="ready">` | Desktop-Chromium progressive enhancement only; Safari/Firefox/mobile/reduced-motion/reduced-transparency fall back to the CSS blur path. |
| Dashboard workspace shell | `src/components/workshop/ProjectDashboardClient.tsx:838` | `.dashboard-glass` (+ `.workshop-workspace-glass-surface`) | One frost behind route chrome; children transparent so the material reads as one sheet. |
| Dashboard surface primitive | `src/components/workshop/dashboard/DashboardGlassPanel.tsx` | `surface: glass \| warm \| plain` | The 3-variant primitive — `glass`/`warm` frost chrome, `plain` crisp white for dense data. **Reuse for Library tiles.** |
| Dashboard bento board | `src/app/globals.css:2310` (`.dashboard-root`) | `repeat(7,minmax(0,1fr)) × repeat(4,minmax(0,--dashboard-row)) minmax(0,1fr)`, gap 8px, `height:100%` | The grid discipline (definite height, `minmax(0,…)` cols, square-unit rows). **Reuse for the overview.** |
| Workshop project cards | `src/components/workshop/ProjectCard.tsx:21`, `LiveProjectCard.tsx` | `.workshop-project-card-glass` + `.workshop-project-card-control` | Content-grade glass shell; nested controls translucent fills only. **Reuse for component cards (Phase 2).** |
| **Estimate slot system (THE model)** | `src/components/workshop/estimate-surface-variant.tsx` | `estimateSurfaceClass(variant, slot)` → `estimate-glass-well / -rail / -paper / -chrome / -headchrome` | The per-region variant→class slot map. **Mirror this exactly for the Library (§2).** |
| Estimate glass recipes | `src/app/globals.css:1545-1710` | `.estimate-glass-well/-rail/-paper/-chrome/-headchrome`, `--glass-divider` | The tiered-opacity family + centre-faded divider + "brighter = active" interactive ladder. **Reuse as-is.** |
| Warm-glass CTA | `src/app/globals.css:1753` | `.dashboard-glass-warm` | Brand-orange-tinted frost for primary CTA tiles. |
| Liquid chrome button | `src/app/globals.css:1271` | `.workshop-liquid-button` | Translucent fill + bright edge relief; active `translateY(1px) scale(0.985)`. |
| Glass readiness gate | `src/components/system/LiquidGlassReady.tsx:25` | sets `data-glass="ready"` on `<html>` | Library glass surfaces **defer** their `backdrop-filter` the same way; never blur before readiness. |

All glass values live in the `--glass-*` token layer in `src/app/globals.css:108-146`
(see §6 for the exact table). **Brand color:** `--brand-orange: #F24405` is the live
primary (presence/fills/logo, `globals.css:37`); the warm bloom uses `--brand-peach` /
`--brand-amber`. (Drift note for the owner: an older project memory recorded clay
`#AA412A` as "in-product"; the live tokens treat `#F24405` as primary — author against
the live tokens and reconcile the memory.)

---

## 2. The Library surface-variant slot system (the core mechanism)

The cleanest, lowest-risk way to bring glass to the Library is to mirror the estimate
sheet's proven slot system rather than hand-frosting each component. A single function
maps a `(variant, slot)` pair to a className; call sites keep their stable layout classes
and merge the surface string via `cn(...)`.

**Build (net-new), mirroring `src/components/workshop/estimate-surface-variant.tsx`:**

- `src/components/workshop/library/library-surface-variant.tsx` — exports
  `LibrarySurfaceVariant` (`"paper" | "glass"`), `LibrarySurfaceVariantProvider`,
  `useLibrarySurfaceVariant()`, `LibrarySurfaceSlot`, and `librarySurfaceClass(variant, slot)`.
- Default context value `"paper"` so any subtree rendered outside a provider falls back
  to today's un-frosted look (no visual shift until a provider wraps the route).

**Slot catalogue** (Library-specific; each maps to an **existing** class — no new CSS recipes):

| Slot | Used by | `glass` className | `paper` className (today) | Rationale |
|---|---|---|---|---|
| `workspaceWell` | route root `<section>` | `estimate-glass-well` | `bg-white` | The cool canvas with warm bloom that the panes float on (matches estimate root). |
| `treeRail` | folder-tree `ResizableSidePanel` container (left) | `estimate-glass-rail rounded-[8px]` | `border-r border-hairline bg-white` | Floating frosted rail, recessed relative to the paper. |
| `inspectorDock` | `ComponentInspectorDock.tsx` container (right, ≥lg) | `estimate-glass-rail rounded-[8px]` | (paper today) | Same floating-rail family as the tree; one material for both rails. |
| `centerColumn` | catalogue / gallery centre `<section>` | `estimate-glass-paper rounded-[8px]` | `bg-white` | Brighter near-opaque paper so trust chips + dense rows stay legible. |
| `railToolbar` | non-sticky toolbar row inside a rail | `estimate-glass-divider` | `border-b border-hairline bg-white` | No masking wash; frost reads through with a soft centre-faded hairline. |
| `chromeToolbar` | icon toolbar row inside a sticky header | `bg-transparent` | `bg-white` | Strip baked-in `bg-white` so the frosted chrome wash reads, not a solid bar. |
| `sheetHeader` | sticky catalogue/gallery header | `estimate-glass-chrome estimate-glass-divider` | `bg-white/95 backdrop-blur` | Frosted wash that masks scrolling rows without going stark. |
| `stickyHead` | dense-table sticky `<thead>` (Phase 5) | `estimate-glass-headchrome` | `bg-white` | Near-opaque cool frost to mask rows scrolling under the head. |
| `catalogueCard` | `ComponentCatalogueCard` shell (Phase 2) | `workshop-project-card-glass` | `rounded-xs border border-hairline bg-white` | Content-grade glass card (matches dashboard project cards). Phase 1 = paper. |
| `galleryRow` | `TemplateGalleryRow` shell (Phase 5) | `workshop-project-card-glass` | `bg-white border-hairline` | Same content-grade glass family for template rows. Phase 1–4 = paper. |
| `ctaTile` | primary CTA tiles (Quick Add, New Template) | `dashboard-glass-warm` | `rounded-xs border border-hairline bg-white` | Brand-orange-tinted warm glass for the single primary action. |
| `countStrip` | result-count / scope strip | `bg-transparent` (text on glass) | `bg-surfaceMuted` | Static live region; no fill so it reads on the paper/glass beneath. |
| `gridSurface` | catalogue/gallery inner cards-rows on the glass paper | `""` (transparent) | `bg-white` | Transparent so the one glass paper reads through (no stacked white boxes). |

**Rule (one blur per region):** only `workspaceWell`, `treeRail`, `inspectorDock`,
`centerColumn`, and the Phase-2/5 `catalogueCard`/`galleryRow` carry a frosted surface;
every other slot is either a translucent fill (`ctaTile`, chrome) or transparent
(`chromeToolbar`, `countStrip`, `gridSurface`). No slot adds its own `backdrop-filter`;
the shell's single deferred blur (armed via `data-glass="ready"`) is the only one. This
mirrors the estimate sheet's contract exactly.

---

## 3. Grid system (the "use grids / divide into divs" directive, made concrete)

The Library is a data workspace, so it is **grid-first** at two scales: the **workspace
track grid** (3-pane layout) and the **catalogue/gallery content grid** (cards/rows).
Both reuse the dashboard's grid discipline (`minmax(0,…)`, definite `height:100%` not
`min-height`, 8 px gaps) — the `min-height:100%` → phantom-scroll trap is a recorded
regression ([workshop-dashboard-no-scroll-fix memory]); do not reintroduce it.

### 3.1 Workspace track grid (Components tab, Templates tab, Template editor)

A single CSS grid expresses the three-pane workspace so the rails and centre are real
grid children (not flimsy flex siblings) and collapse cleanly at breakpoints.

```css
/* library-workspace-root — reuse this shape on the three browse/edit routes */
.library-workspace-root {
  --library-gap: 8px;
  height: 100%;                 /* definite, NOT min-height (no-scroll-fix) */
  display: grid;
  /* xl: tree | centre | dock ;  the dock hides <lg and reappears as a drawer */
  grid-template-columns: minmax(220px, var(--library-tree-w, 280px))
                         minmax(0, 1fr)
                         minmax(320px, var(--library-dock-w, 420px));
  grid-template-rows: minmax(0, 1fr);
  gap: var(--library-gap);
}
@media (max-width: 1279px) {            /* lg: dock off, centre grows */
  .library-workspace-root { grid-template-columns: minmax(220px, 280px) minmax(0, 1fr); }
}
@media (max-width: 1023px) {            /* md/mobile: single column; dock = drawer */
  .library-workspace-root { grid-template-columns: minmax(0, 1fr); }
}
```

- The **tree rail** and **inspector dock** are resizable via the existing
  `ResizableSidePanel` (`src/components/workshop/ResizableSidePanel.tsx`); their widths
  are CSS custom properties (`--library-tree-w`, `--library-dock-w`) so the grid honours
  the user's resize without JS reflow.
- **`<lg` the dock is removed from the grid** and rendered as `InspectorDrawer`
  (`ui/overlays/sheet-drawer.tsx`, z-[1000]); the centre column spans full width.
- **`<768px`** the tree rail collapses to a drawer too (single-column browse) — see §9.

### 3.2 Catalogue content grid (Components tab centre)

The centre column is itself a **nested grid** of explicit regions, each its own cell —
"divide the space into as many divs as needed" made concrete and AA-safe:

```
centre column (estimate-glass-paper)
└─ grid-rows: [chrome header] [count+filter strip] [catalogue] [empty/error overlay]
   ├─ sheetHeader        (sticky)   — search · sort · density · add
   ├─ countStrip         (live region) — "N components · K filters" · clear-all chips
   ├─ catalogue          (scroll) — responsive card grid:
   │     grid-template-columns: repeat(auto-fill, minmax(0, <cell>));
   │     <cell> = clamp(200px, calc((100% - 2*gap)/3), 280px)  → 3-up desktop,
   │              collapsing to 2-up (lg) and 1-up (mobile) automatically.
   └─ empty/error        (overlay cell) — paper panel centred on the glass paper.
```

- Use `repeat(auto-fill, minmax(0, <cell>))` (not a fixed count) so the grid is
  responsive **without breakpoint churn** — only the cell clamp changes by breakpoint.
- Cards are `catalogueCard` slot (paper in Phase 1, `.workshop-project-card-glass` in
  Phase 2). On the glass paper, inner card fills go transparent (`gridSurface` slot) so
  the single glass paper reads through (no stacked white boxes).
- **Vary spacing for rhythm** (`impeccable`): the count strip uses a tighter pad than the
  catalogue; the catalogue gap is 8 px to match the workspace gap. Do **not** ship an
  identical icon-heading-text card grid ad infinitum — cards carry a real photo
  (`thumbnail_path`), price+unit, and a trust-chip cluster, so each card is information
  dense, not a templated placeholder.

### 3.3 Gallery content grid (Templates tab centre)

Same nested-region grid (§3.2) with `galleryRow` slot rows instead of cards: each row is
a horizontal template card (name · description · line/group count · link-health chip ·
primary action). Rows use `repeat(auto-fill, minmax(0, 100%))` (single-column row list)
at ≥lg, or a 2-up card grid on xl if the owner prefers cards. Default to rows
(templates are fewer and benefit from horizontal density).

### 3.4 Overview hub grid (`/workshop/library`)

Reuse the **dashboard bento discipline** (`.dashboard-root`, `globals.css:2310`):
a full-bleed square-unit board with `repeat(7,minmax(0,1fr))` columns and
`repeat(4,minmax(0,--dashboard-row))` fixed rows + a trailing `minmax(0,1fr)` slack row,
8 px gap, `height:100%`. Library tiles sit on it as `DashboardGlassPanel` with
`surface` chosen per tile:

| Tile | `surface` | Content |
|---|---|---|
| Search + primary actions (Quick Add / New Template) | `warm` | The single warm-glass CTA band. |
| Recent components lane | `glass` | Frosted chrome holding paper recent-cards. |
| Recent templates lane | `glass` | Frosted chrome holding paper template rows. |
| Maintenance signals (stale-pricing, incomplete-metadata, archived counts) | `plain` | Crisp white for legible counts (no blur on data). |

(The existing `LibraryOverview.tsx:268` grid is `grid-cols-2 sm:grid-cols-3
lg:grid-cols-6`; migrating it onto the bento board is a Phase-1 visual task — keep the
same content lanes, change the container to the bento root + `DashboardGlassPanel`
tiles.)

### 3.5 Grid guardrails (binding)

- `minmax(0, …)` on **every** track that holds scrollable/nested content, so a wide
  child cannot blow the grid out (the `1fr` blow-out trap).
- `height:100%` (definite) on workspace roots; **never** `min-height:100%`.
- One 8 px gap scale (`--library-gap` = `--dashboard-gap` = 8 px) across the Library for
  a consistent rhythm; inner card padding varies for hierarchy.
- No `rounded-sm/md/lg/xl` — radius discipline is `12px` (outer glass shell) / `8px`
  (floating rails + nav pills) / `3px` (everything inside a panel) (§6).

---

## 4. Per-surface material treatment

Every Library surface has a material decision across the two postures. File:line binds
to the real component that changes.

### 4.1 Overview hub (`/workshop/library`)
| Aspect | Phase 1 (glass skeleton) | Phase 5 (full glass) | Binding |
|---|---|---|---|
| Root | bento board on `estimate-glass-well` canvas | same | `src/components/workshop/library/overview/LibraryOverview.tsx` |
| Tiles | `DashboardGlassPanel` {warm/glass/plain} per §3.4 | same | `src/components/workshop/dashboard/DashboardGlassPanel.tsx` |
| Recent cards/rows | paper (`plain`) | optional glass | `overview/RecentComponentCard.tsx` |
| Search/toolbar | `.workshop-liquid-button` chrome on the warm tile | same | `overview/LibraryOverviewSearch.tsx` |

### 4.2 Components tab (`/workshop/library/components`)
| Aspect | Phase 1 | Phase 2 (card glass) | Binding |
|---|---|---|---|
| Workspace well | `estimate-glass-well` | same | `ComponentLibraryManager.tsx` (root `:1579`) |
| Tree rail | `estimate-glass-rail` floating | same | tree `:762` via `ResizableSidePanel` `:753` |
| Centre paper | `estimate-glass-paper` floating | same | `:927` |
| Sticky header | `estimate-glass-chrome` + divider | same | `:931` (strip baked `bg-white/95`) |
| Catalogue cards | **paper** (`rounded-xs border-hairline bg-white`) | `.workshop-project-card-glass` | `ComponentCatalogueCard` `:323-480` |
| Selected card | `border-accent ring-1 ring-accent` (paper) | `data-project-card-selected="true"` (glass) | `globals.css:1367` |
| Inspector dock | `estimate-glass-rail` floating | same | `ComponentInspectorDock.tsx` `:1631` |
| CTA (Quick Add) | `.dashboard-glass-warm` tile / `.workshop-liquid-button` | same | toolbar add action |

### 4.3 Trust chips on glass (binding — Phase 2)
Trust/freshness/confidence/lifecycle chips (specs in [23](23-DESIGN-SYSTEM-COMPONENT-MAPPING.md)
§"Chip Spec") render **on** the glass card/paper without their own blur:
- Soft fills (`bg-successSoft` / `bg-warningSoft` / `bg-dangerSoft`) + semantic foreground
  (`text-success`/`text-warning`/`text-danger`; AA fallback `text-secondary`). These pass
  AA on the frosted white card (rgba 0.58–0.9 ≈ white) exactly as they do on paper.
- **No `backdrop-filter` on any chip** — chips are flat soft-fill spans. Nested glass is
  forbidden (§0, §11).
- On the glass paper, the chip's soft fill is the only fill; the paper's frost reads
  around it.

### 4.4 Templates tab (`/workshop/library/templates`)
| Aspect | Phase 1–4 | Phase 5 (row glass) | Binding |
|---|---|---|---|
| Well / rails / paper / header | same glass family as Components (§4.2) | same | `TemplatesBrowseManager.tsx` root `:779`, section `:784`, tree `:431` |
| Gallery rows | paper | `.workshop-project-card-glass` | `TemplateGallery.tsx` `TemplateGalleryRow :61` |
| Centre column | `estimate-glass-paper` | same | `#template-gallery-center-column :211` |
| Chips | paper/muted (no blur) | same | `:99-108` |

### 4.5 Template editor (`/workshop/library/templates/[templateId]`)
| Aspect | Treatment | Binding |
|---|---|---|
| Editor work surface | `estimate-glass-well` + floating `estimate-glass-paper` centre; sticky header `estimate-glass-chrome` | `TemplateEditorSheet.tsx :474/:556-561` |
| Editable rows / fields | **stay paper** (`bg-white`) inside the glass paper so text editing stays crisp; do not frost editable fields | `:422` |
| Drop zones | translucent `bg-surfaceMuted/50`; no extra blur | `:334`, `:437-452` |

### 4.6 Inspector dock / drawer
| Aspect | Treatment | Binding |
|---|---|---|
| Desktop (≥lg) | `inspectorDock` slot → `estimate-glass-rail` floating (one material with the tree rail) | `ComponentInspectorDock.tsx`; `10` §Inspector |
| Narrow (<lg) | `InspectorDrawer` from `ui/overlays/sheet-drawer.tsx`; the drawer panel is the **single** glass panel (one blur); children transparent | `12` §Tablet |
| Rule | One material per panel. If glass, the whole dock/drawer is one blur; children translucent. | `DESIGN.md` §Surfaces |

### 4.7 Empty / error / loading states
All render as **paper** panels centred on the glass well/paper — never nested glass
cards (`EmptyState` from `src/components/ui/empty-state.tsx`). Loading uses the existing
skeleton on the glass paper (skeleton fills translucent so the paper reads through).

---

## 5. Glass overlays (modals, drawers, dialogs)

Overlays are the user's explicit ask ("don't forget the modal components"). The rule:
**the scrim + a drawer panel may be glass; a modal's content panel stays paper** so forms
stay crisp and focus order is unambiguous. One blur per overlay, always.

| Overlay | Material | z-tier | Binding | Notes |
|---|---|---|---|---|
| `Modal` / `AppModal` | **paper** content panel; scrim = translucent dark wash (no blur on the panel) | z-[1000] | `ui/overlays/modal.tsx` | Forms/tables inside stay crisp. `BlurModal` exists if a frosted panel is genuinely wanted — use sparingly, one blur. |
| `ConfirmDialog` / `ConfirmDialogMessage` | paper panel; destructive variant keeps `danger` tokens | z-[1000] | `ui/overlays/confirm-dialog.tsx` | Reused for folder delete, Add-discard, bulk-archive. |
| Text-prompt dialog (folder create/rename) | paper `ConfirmDialog` + child `<input>` (inline pattern) | z-[1000] | `TemplatesBrowseManager.tsx:531-883` | No standalone `PromptDialog` primitive exists — reuse the inline pattern. |
| `InspectorDrawer` (narrow inspector) | **glass** panel (single blur); children translucent | z-[1000] | `ui/overlays/sheet-drawer.tsx` | The one overlay that is genuinely a glass panel (it IS a rail, moved to a drawer). |
| `Sheet` / `Drawer` / `SidePanel` (Edit Component drawer) | glass panel (one blur); editable fields stay paper inside | z-[1000] | `ui/overlays/sheet-drawer.tsx` | `EditComponentDrawer.tsx` renders into this. |
| `InsertIntoEstimatePicker` (Modal) | paper panel; creatable-combobox + target disclosure inside | z-[1000] | `InsertIntoEstimatePicker.tsx` | Reuse; add the insert-target disclosure row (Phase 4). |
| `BulkDestructivePreviewModal` | paper panel; `confirmationHint` unchanged | z-[1000] | `BulkDestructivePreviewModal.tsx:107` | Bulk-archive preview. |
| Popover / dropdown / menu | paper (no blur); they sit above glass via z-tier, not frost | z-[1050] | `ui/dropdown-popup.tsx`, `ui/*.tsx` | Facet popovers, row action menus. |
| Tooltip | paper | z-[1100] | `ui/overlays/*.tsx` | Above everything. |

**Focus + motion for overlays:** focus trap inside every dialog/drawer; focus returns to
the trigger on close (destructive confirms hold focus until closed); slide transitions
honour `prefers-reduced-motion`. Drawer open/close never animates the **blur** value
(§8).

---

## 6. Token & radius contract

All Library glass surfaces MUST use these tokens (`src/app/globals.css:108-146`). No
magic numbers in JSX.

| Token / constant | Value | Usage |
|---|---|---|
| `--glass-bg` | `rgba(255,255,255,0.72)` | Panel fill for glass shells. |
| `--glass-bg-fallback` | `#fbfbfc` | `@supports not (backdrop-filter)` + `prefers-reduced-transparency: reduce`. |
| `--glass-blur` | `18px` | One blur per region; never animate. |
| `--glass-saturate` | `145%` | Saturation boost on the blur. |
| `--glass-border` | `rgba(38,44,58,0.10)` | Panel hairline (cool neutral). |
| `--glass-border-top` | `rgba(255,255,255,0.5)` | Specular top edge. |
| `--glass-inset-hi` | `inset 0 1px 0 0 rgba(255,255,255,0.45)` | Top-edge relief. |
| `--glass-shadow` | `0 8px 28px rgba(30,35,50,0.12), 0 2px 8px rgba(30,35,50,0.07)` | Floating shadow. |
| `--glass-divider` | `linear-gradient(90deg, transparent, rgba(38,44,58,0.14), transparent)` | Centre-faded hairline (replaces hard `border-hairline` on glass). |
| `--glass-radius` | `12px` | Outer workspace/glass shell only. |
| `--glass-nav-radius` | `8px` | Floating rails + nav pills inside glass chrome. |
| `--radius-xs` | `3px` | Everything **inside** a panel: cards, chips, inputs, rows, buttons. |
| `--brand-orange` | `#F24405` | Primary presence; warm-glass tint base. |
| `--brand-peach` / `--brand-amber` | (warm bloom) | The well's bottom-right bloom. |

**Radius rule (binding):** `12px` outermost glass shell only · `8px` floating rails + nav
pills · `3px` everything else. Do **not** use `rounded-sm/md/lg/xl/full` or arbitrary
radii. (`impeccable`: cards top out at 12–16 px; we cap the shell at 12 and keep inner at
3 — no over-rounding.)

**Tailwind v4 arbitrary-var guard** (from [23](23-DESIGN-SYSTEM-COMPONENT-MAPPING.md)):
when a token must be an arbitrary value, use the color-hinted form
`bg-[color:var(--x)]` — bare `bg-[var(--x)]` silently emits no color in this setup.

---

## 7. Interaction states

Reuse the **"brighter = active" glass ladder** proven on the estimate sheet
(`globals.css:1630-1689`) — flat `#f5f5f5` paper-grey reads heavy on frost; frosted lifts
read correctly.

| State | Glass treatment | Token / class |
|---|---|---|
| Hover (row/tree on glass) | `rgba(255,255,255,0.45)` lift | `estimate-glass-rail/paper [class~=…]:hover` |
| Keyboard focus (tree row) | `rgba(255,255,255,0.6)` lift + accent rail | `estimate-glass-rail … :focus-within` |
| Selected (`aria-current`/`aria-selected`) | `rgba(255,255,255,0.82)` brightest | `estimate-glass-rail [aria-current]` |
| Active estimate/insert row | frosted lift + `inset 2px 0 0 var(--brand-orange)` | `estimate-glass-paper [data-*-active]` |
| Card hover (glass) | `translateY(-1px)` + brand-orange border mix | `.workshop-project-card-glass:hover` (`globals.css:1354`) |
| Card selected (glass) | ink border mix + ring | `data-project-card-selected="true"` (`globals.css:1367`) |
| Liquid button hover/active | `rgba(255,255,255,0.96)` / `translateY(1px) scale(0.985)` | `.workshop-liquid-button` (`globals.css:1301-1320`) |
| Focus (all interactive) | `focus-visible:ring-2 focus-visible:ring-focus` (`--focus:#3D3D3D`) | [23](23-DESIGN-SYSTEM-COMPONENT-MAPPING.md) §Focus |

---

## 8. Motion & deferred blur

- **Defer the blur** exactly like the shell: glass surfaces paint `backdrop-filter: none`
  first, then arm via `<html data-glass="ready">` (set by
  `src/components/system/LiquidGlassReady.tsx:25`) using the animatable
  `@property --glass-blur-amount` ramp (`globals.css:287-313`). **Do not** re-arm per
  feature or gate arming on `no-preference` (it strands older Chrome — recorded lesson
  [deferred-liquid-glass memory]); keep the `requestAnimationFrame` backstop.
- **Never animate the blur value.** `--glass-blur`/`--glass-blur-amount` transitions are
  the one allowed blur motion (the ramp-in) and only on desktop (`min-width:1024px` and
  `pointer:fine`); everything else animates `transform`/`opacity`/`color` only.
- **Reduced motion:** reuse the existing `@media (prefers-reduced-motion: reduce)`
  blocks (`globals.css:309,1042,1097,1327`); glass `clip-path`/`width`/`transform`
  transitions are neutralized. Trust chips + state must be readable without animation
  (`impeccable`: motion enhances, never gates comprehension).
- **No per-feature motion guards.** One reduced-motion contract for the whole Library.

---

## 9. Responsive behavior

| Breakpoint | Workspace grid | Glass treatment |
|---|---|---|
| Desktop ≥1280 (`xl`) | tree \| centre \| dock (3 tracks) | glass well + rails + paper; dock = floating glass rail |
| Laptop 1024–1279 (`lg`) | tree \| centre (dock off) | same; less internal padding; dock → `InspectorDrawer` |
| Tablet 768–1023 (`md`) | single column; tree → collapsible drawer; dock → drawer | drawers are the single glass panels; well stays |
| Mobile <768 | single column; tree + dock both drawers | one glass panel on screen at a time; no nested glass in drawers |

Density rule: glass shells stay `--glass-radius:12px` across breakpoints; inner cards
stay `3px`. Do **not** enlarge radii on mobile. Inspector dock as drawer uses
`InspectorDrawer` (`ui/overlays/sheet-drawer.tsx`) at z-[1000].

---

## 10. A11y / contrast for glass

| Requirement | Rule | Verification |
|---|---|---|
| Text contrast | `--ink:#3D3D3D` / `--secondary:#5d5d5d` on frosted white (rgba 0.58–0.9 ≈ white) passes WCAG 2.1 AA (4.5:1). Load-bearing meta uses `--secondary`, never `--tertiary:#7f7f7f` (fails AA — recorded). | [31](31-A11Y-ACCEPTANCE-CRITERIA-MATRIX.md) §4 |
| Focus contrast | `--focus:#3D3D3D` ring ≥2px, ≥3:1 against adjacent colors. | [23](23-DESIGN-SYSTEM-COMPONENT-MAPPING.md) §Focus |
| Color not sole carrier | Selected/active combine border + ring + weight/brightness — never color alone. | `DESIGN.md` §Surfaces |
| Reduced transparency | `--glass-bg-fallback` opaque panel preserves all text/selection states without blur. | manual + `prefers-reduced-transparency` test |
| Reduced motion | transitions disabled; state readable without animation. | `globals.css` reduced-motion blocks |
| Touch target | glass chrome buttons ≥44×44 on touch. | [31](31-A11Y-ACCEPTANCE-CRITERIA-MATRIX.md) §4 |

---

## 11. Performance guardrails

| Guardrail | Rule | Binding |
|---|---|---|
| One blur per region | never stack `backdrop-filter` inside `backdrop-filter`. | §2 slot contract |
| Blur cap | `18px` max (`--glass-blur`). | `globals.css:110` |
| No animated blur | blur value never transitions (except the one readiness ramp). | §8 |
| Deferred blur | armed only after `data-glass="ready"`. | `LiquidGlassReady.tsx:25` |
| Refraction scope | SVG edge refraction is desktop-Chromium-only; others use CSS blur. | `useLiquidGlassRefraction.ts` |
| GPU budget | simultaneous glass panels ≤ workspace shell + one drawer/modal. Do not frost every card in Phase 1; Phase-2 card glass reuses the shell's blur discipline (cards are translucent fills, not extra blurs, unless perf budget allows — measure in Phase 0A, [30](30-PERF-BUDGET-AND-REGRESSION-GATES.md)). | §0, §4 |
| Virtualization reuse | dense lists reuse `src/lib/workshop/virtualization-flags.ts`; no second virtualizer. | [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) Performance Reality |

---

## 12. Per-surface acceptance criteria (12-dimension rows)

Implementation tasks — all 12 dimensions required ([34](34-ROW-LEVEL-COMPLETENESS-MATRIX.md)).
Rows supersede the prior §8 set; EV-* IDs are pre-registered in
[24](24-EXECUTION-EVIDENCE-LEDGER.md).

### 12.1 Library surface-variant slot system + provider
Owner: Frontend lead · Phase: 1 · Flag: `library_glass_shell` · Rollback: remove provider (default `paper`) · Evidence: EV-G-008 · Telemetry: `library.surface.rendered{variant}` · Copy: n/a · A11y: AA contrast on both variants · Perf: one blur per region · Browser-proof: Playwright paper+glass at `xl`/`md` · i18n: no text change; RTL preserved · Binding: NEW `src/components/workshop/library/library-surface-variant.tsx` mirroring `src/components/workshop/estimate-surface-variant.tsx`.

### 12.2 Workspace track grid (3-pane) — Components & Templates
Owner: Frontend lead · Phase: 1 · Flag: `library_glass_shell` · Rollback: revert to flex layout · Evidence: EV-G-009 · Telemetry: `library.surface.rendered` · Copy: n/a · A11y: dock→drawer focus return; keyboard reachable · Perf: `height:100%` definite (no phantom scroll) · Browser-proof: Playwright `xl`/`lg`/`md`/mobile · i18n: RTL rail order preserved · Binding: `ComponentLibraryManager.tsx:1579`, `TemplatesBrowseManager.tsx:779`.

### 12.3 Glass workspace well + rails + paper + chrome
Owner: Frontend lead · Phase: 1 · Flag: `library_glass_shell` · Rollback: revert to `bg-white` · Evidence: EV-G-001/002/003 · Telemetry: `library.surface.rendered` · Copy: n/a · A11y: AA; focus ring; reduced-motion · Perf: one blur per shell; LCP regression <100 ms vs baseline ([30](30-PERF-BUDGET-AND-REGRESSION-GATES.md)) · Browser-proof: Playwright overview/components/templates at `xl`+`md` · i18n: no text change · Binding: `librarySurfaceClass` slots `workspaceWell/treeRail/centerColumn/sheetHeader`.

### 12.4 Overview bento board
Owner: Frontend lead · Phase: 1 · Flag: `library_glass_shell` · Rollback: revert `LibraryOverview` grid · Evidence: EV-G-010 · Telemetry: `library.surface.rendered` · Copy: n/a · A11y: tile landmarks + AA · Perf: reuse `.dashboard-root` discipline · Browser-proof: Playwright overview `xl`/`md` · i18n: RTL preserved · Binding: `LibraryOverview.tsx:268`, `DashboardGlassPanel.tsx`, `globals.css:2310`.

### 12.5 Catalogue content grid + count strip + applied-filter chips
Owner: Frontend lead · Phase: 1 (grid) / 1 (chips per [04](04-UX-RESEARCH-SYNTHESIS.md) §3) · Flag: `library_glass_shell` · Rollback: revert to current catalogue · Evidence: EV-G-011 · Telemetry: `library.filter.applied` · Copy: `filter.*` ([22](22-COPY-DECK-AND-MICROCOPY.md)) · A11y: live region for count; chip dismiss reachable · Perf: `auto-fill minmax(0,…)` · Browser-proof: Playwright chip strip · i18n: count pluralization ([28](28-I18N-RTL-AND-LOCALIZATION-CONTRACT.md)) · Binding: `ComponentLibraryManager.tsx` centre.

### 12.6 Component cards → content-grade glass (Phase 2)
Owner: Design lead · Phase: 2 · Flag: `library_card_glass` · Rollback: `bg-white border-hairline` · Evidence: EV-G-005 · Telemetry: `library.card.hover` · Copy: n/a · A11y: selected visible without color alone; focus ≥2px; AA · Perf: cards translucent fills, not extra blurs (measure in 0A) · Browser-proof: Playwright hover/selected `xl`+`md` · i18n: no text change · Binding: `ComponentCatalogueCard` `:323-480`, `globals.css:1336`.

### 12.7 Template gallery rows → content-grade glass (Phase 5)
Owner: Design lead · Phase: 5 · Flag: `library_card_glass` · Rollback: paper rows · Evidence: EV-G-012 · Telemetry: `library.template.row` · Copy: n/a · A11y: as 12.6 · Perf: as 12.6 · Browser-proof: Playwright templates `xl`+`md` · i18n: no text change · Binding: `TemplateGallery.tsx:61`, `globals.css:1336`.

### 12.8 Glass overlays (drawer glass; modal paper)
Owner: Frontend lead · Phase: 1 (drawer) / 0B (dialogs) · Flag: `library_glass_drawer` · Rollback: paper drawer · Evidence: EV-G-006 · Telemetry: `library.inspector.opened` · Copy: n/a · A11y: focus trap; focus return; reduced-motion slide · Perf: one blur per drawer; no animated blur · Browser-proof: Playwright drawer open/close `md`+mobile · i18n: RTL drawer direction · Binding: `ui/overlays/sheet-drawer.tsx`, [03](03-MODALS-POPOVERS-AND-OVERLAYS.md).

### 12.9 Warm-glass CTA + liquid buttons
Owner: Design lead · Phase: 1 · Flag: `library_glass_shell` · Rollback: paper buttons · Evidence: EV-G-013 · Telemetry: `library.cta.clicked` · Copy: `action.*` ([22](22-COPY-DECK-AND-MICROCOPY.md)) · A11y: AA on warm fill; ≥44px touch · Perf: no blur on buttons (translucent fill) · Browser-proof: Playwright CTA · i18n: label RTL · Binding: `globals.css:1753`, `globals.css:1271`.

### 12.10 Reduced-transparency / reduced-motion fallback
Owner: A11y lead · Phase: 1 · Flag: n/a (system) · Rollback: n/a · Evidence: EV-G-007 · Telemetry: n/a · Copy: n/a · A11y: all states readable without blur/motion · Perf: fallback cheaper · Browser-proof: Playwright emulated media queries · i18n: n/a · Binding: `globals.css:1769`, `LiquidGlassReady.tsx:25`.

---

## 13. Cross-references

- [04](04-UX-RESEARCH-SYNTHESIS.md) §8 — trust chips sit inside glass/paper cards; glass is a skin, not a behavior change.
- [10](10-LIBRARY-SURFACE-SPECS.md) — per-surface layout/state; this doc adds the glass material + grid layers.
- [12](12-RESPONSIVE-ACCESSIBILITY-INTERACTION-CONTRACT.md) — focus, reduced-motion, drawer/table-vs-grid rules.
- [23](23-DESIGN-SYSTEM-COMPONENT-MAPPING.md) — token/primitive mapping for chips/buttons/focus; this doc supplies the glass slot + grid contract.
- [31](31-A11Y-ACCEPTANCE-CRITERIA-MATRIX.md) — contrast/focus/reduced-motion/screen-reader acceptance.
- [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) — canonical phase map (0A→5) + file paths.
- [30](30-PERF-BUDGET-AND-REGRESSION-GATES.md) — final perf budgets after Phase 0A baseline.
- [29](29-BROWSER-PROOF-AND-VISUAL-QA-MATRIX.md) — screenshot evidence requirements.

---

## 14. Verification commands

```bash
# Token layer + radius (expected values present)
rg -n "^\s*--(glass-bg|glass-blur|glass-radius|glass-nav-radius|radius-xs|brand-orange|glass-divider):" src/app/globals.css

# Reference glass surfaces + slot-system model exist
rg -n "sidebar-glass|dashboard-glass|workshop-project-card-glass|estimate-glass-well|estimate-glass-rail|estimate-glass-paper|estimate-glass-chrome|dashboard-glass-warm|workshop-liquid-button" src/app/globals.css
rg -n "estimateSurfaceClass|EstimateSurfaceVariantProvider" src/components/workshop/estimate-surface-variant.tsx
rg -n "dashboard-root|--dashboard-row" src/app/globals.css
rg -n "data-glass=\"ready\"" src/components/system/LiquidGlassReady.tsx

# After build: the Library slot system + provider exist
rg -n "librarySurfaceClass|LibrarySurfaceVariantProvider|useLibrarySurfaceVariant" src/components/workshop/library/library-surface-variant.tsx

# No Library file invents a local blur token or per-feature motion guard (spot check)
rg -n "backdrop-filter|@property --glass" src/components/workshop/library/ --type tsx

# Radius discipline: no sm/md/lg/xl/full radii introduced on Library glass
rg -n "rounded-(sm|md|lg|xl|full)" src/components/workshop/library/
```

---

## 15. Sign-off

| Reviewer | Verdict | Date | Notes |
|---|---|---|---|
| Design lead | pending | — | Glass material rollout + grid system approved per DESIGN.md (alpha-guide; owner defers on aesthetic detail). |
| Frontend lead | pending | — | Slot system mirrors estimate-surface-variant; one-blur-per-region accepted. |
| A11y lead | pending | — | Contrast AA on both variants; reduced-motion/transparency fallback accepted. |
| Perf lead | pending | — | One blur per region; deferred arming; Phase-2 card glass measured in 0A. |

This spec is complete when:
1. Every Library surface in §4 has a material decision across both postures.
2. The slot system (§2) + grid system (§3) + overlay treatment (§5) are specified build-ready.
3. Every implementation row in §12 satisfies all 12 dimensions.
4. Verification commands in §14 pass.
5. All four reviewers sign off above.

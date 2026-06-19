# Workshop dashboard — UI kit

A static recreation of the **LIVE Archestimator Workshop Dashboard** (the "v2
editorial bento" command-center homebase), synced from the product code as the
source of truth. Target viewport **1440×900**.

> This is a code→design-system sync. The structure, class names, and tokens are
> copied from the live implementation so the kit reads as the same system.

## What this is

- `index.html` — head (DS `styles.css` + Phosphor web font **regular + fill** +
  React 18.3.1 UMD + Babel standalone), the inlined v2 bento CSS, and the app
  shell (glass rail + floating white surface with header / scroll region /
  footer). First line is the `@dsCard` marker.
- `Dashboard.jsx` — Babel-standalone JSX (no TypeScript, no `import`/`export`,
  no Next.js). DS components read off `window.ArchestimatorDesignSystem_3fbb6f`;
  `React` / `ReactDOM` are globals. Mounts into `#root`.
- `README.md` — this file.

## Live sources mirrored

| Live source | Mirrored here |
|---|---|
| `WorkshopDashboard.tsx` | The `.dashboard-root` bento DOM order: imageband (Projects, Components, Templates, Library) → desk (board + continue). The masthead greeting was removed from the bento. |
| `WorkshopHeaderGreeting.tsx` (rendered by `WorkshopPageShell` as the header `titleSlot`, `hideTitle`) | `HeaderGreeting` in the workspace header bar — a compact sun/moon strip: a period icon box, a mono "Good morning" eyebrow, and a 14px Zilla-slab display name. |
| `ImageDestinationCard.tsx` | `SimpleTile` (Templates) + the Library link tile — index plate, arrow, display title corners. |
| `LibraryHubCard.tsx` / `ContinueCard.tsx` | `LibraryHub` — `.iband-library` grid: the **bare** (transparent) Continue cell (`.iband-library-continue-slot`) + the new-project / new-component / new-sheet action stack. |
| `FavoritesTree.tsx` | `FavoritesTree` — expandable favorite projects with nested favorite sheets, caret toggles, a **neutral** (tertiary) filled-star header, sheet children indented `64px` (`pl-16`). |
| `RecentProjectsList.tsx` / `RecentSheetsList.tsx` | `RecentProjects` / `RecentSheets` — re-skinned rows: a filled header icon (Folder / FileText), then per-row `[type-icon over favorite-star] · [name over meta] · [date]`. Stars are neutral, shown on every row. |
| `src/app/globals.css` (≈1477–2160) | The inlined `.dashboard-*`, `.iband-*`, `.desk-*`, `.destcard-*` rules + `--grad-*` tokens, grain overlay, card-hover, canvas wash. |

## Layout (live grid, desktop)

The board is a 7-column grid (`repeat(7, 1fr)`), **4 fixed square rows + a fluid
tail** (`repeat(4, minmax(0,row)) minmax(0,1fr)`), at definite `height: 100%`
(the post-"no-scroll" fix — the trailing flex row absorbs slack into the desk
instead of inflating a phantom scroll band):

- **Projects** content tile — `grid-column 1 / span 2`, `grid-row 1 / span 3`
  (the tall editorial emphasis tile). Big numeral count column over a
  white-paper "Published Projects" ledger; the display title sits at the tile
  bottom.
- **Components** content tile — `grid-column 3 / span 3`, `grid-row 1 / span 2`.
  Numeral count over a "Recently Added Components" ledger.
- **Library hub** — `grid-column 3 / span 2`, `grid-row 3` (top half): Continue
  cell + action stack.
- **Templates** — `grid-column 5`, `grid-row 3`.
- **Library link cell** (`.desk-continue`) — `grid-column 3 / span 2`,
  `grid-row 3` (bottom half).
- **Desk board** — `grid-column 6 / span 2`, `grid-row 1 / -1`: Favorites tree
  over the two-column Recent projects / Recent sheets ledger.

The old masthead greeting occupied `grid-row 4` (cols 1–2); now that the
greeting lives in the header, that slot is intentionally slack (the live
`.dashboard-masthead` rule is retained but unused), so the bottom-left of the
board reads as quiet canvas — faithful to the current live screen.

The destination tiles are **transparent blurred glass** (blur + shadow + edge
relief only — no fill color and no photo). Hover ink/borders shift to clay
**`#AA412A`**.

## Sample data

Realistic Philippine-peso AEC content: projects like *San Juan Townhouse
Renovation* (PRJ-014), *Tagaytay Hillside Villa* (PRJ-011); estimate sheets
*Structural Works* (ES-021), *Architectural Finishes* (ES-022); components like
*CHB 150mm Load-Bearing Wall*. Currency shown as `₱ 3,964,714.00`.

## Approximations & deviations (and why)

- **Greeting lives in the header, not the bento.** Mirrors the live move
  (`WorkshopHeaderGreeting` in the page-shell title bar). The kit pins
  "Good morning" + the sun-horizon icon; the live component picks
  morning/afternoon/night by clock.
- **No destination photos.** The live v2 tiles are transparent glass with no
  imagery, so the kit uses the same tone-block glass treatment. The
  `assets/cards/*.jpg` photos referenced by older kits are intentionally unused.
- **Neutral favorite stars.** Live recents/favorites render the favorite star in
  tertiary/secondary (filled when favorited), never brand orange — the kit
  matches. Brand orange stays reserved for hover ink and the estimate-tree
  exceptions.
- **Continue cell is bare (transparent).** `LibraryHubCard` renders
  `<ContinueCard … bare />`, so the kit's Continue cell uses the transparent
  `.dashboard-destination-card` treatment (the warm `dashboard-hero-continue`
  gradient is not exercised by the current bento).
- **Phosphor webfont vs. react icons.** Live uses `@phosphor-icons/react`; the
  kit uses the Phosphor **web** CDN (`<i className="ph ph-…" />` / `ph-fill` for
  filled), the kit convention.
- **DS `Button`** is destructured from the namespace per kit mechanics but the
  live dashboard chrome is bespoke glass, so the visible chrome uses the live
  `.dashboard-*` classes directly (the dashboard dir is DS-exempt).
- **Trees/lists drop full keyboard nav.** The expand/collapse caret interaction
  is kept; the live roving-tabindex tree nav and the favorite-toggle server
  actions are out of scope for a static specimen.

## Brand discipline

Brand orange is clay **`#AA412A`** (dark `#8C3623`), hardcoded for dashboard
hover ink/borders exactly as the live `globals.css` does. The campaign signal
**`#F24405`** never appears in this product chrome.

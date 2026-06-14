# Projects Page — Results & Before/After

**Companion to:** `01-AUDIT.md`, `02-IMPROVEMENT-PLAN.md`
**Date:** 2026-06-14
**Status:** Implemented + verified on the live authenticated app (desktop, 1147px) across all four view modes and the selection/favorite/hover/navigation flows.

---

## What changed (files)

| File | Change |
|------|--------|
| `src/components/workshop/LiveProjectCard.tsx` | Full rewrite — removed all DESIGN.md violations; real per-mode density ladder; hover/focus-reveal actions; monogram placeholder; ink favorite; whole-row/tile navigation. |
| `src/components/workshop/projects-page-client.tsx` | New ladder grid classes; `selectionActive` prop; sample grid now tracks view mode; removed dead `getProjectDeletionDisabledReason` helper. **Header search/toolbar untouched.** |
| `src/components/workshop/ProjectCard.tsx` | Sample card re-skinned to the shared shell (no shadow/dashed/gradient; monogram). |
| `src/app/workshop/projects/loading.tsx` | Skeleton rebuilt to mirror the new large card (no more load-in layout jump for the default mode). |

**Untouched (per directive):** the search input and every header action icon (view-mode toggles, filter, add). The orange "Add projects" button lives in that header chrome and was left as-is.

---

## Violations removed (audit V1–V6, all verified gone)

| ID | Was | Now |
|----|-----|-----|
| V1 heavy drop shadow | `shadow-[0_16px_38px…]` + heavier on hover | thin `border-hairline`; hover darkens border (`tertiary/30`); zero shadow |
| V2 colored side-stripe | `border-l-2 border-l-orange/emerald/sky-500` | gone — access shown by neutral text chip (tabs already split owned/shared) |
| V3 glassmorphism | `bg-white/86 backdrop-blur` buttons | solid `bg-white border-hairline`, hover/focus-revealed |
| V4 in-app orange | star, badges, warm gradient | favorite → solid ink; access chips neutral; pending → `warning`; no orange |
| V5 decorative gradient | `linear-gradient(135deg,#fff0e5…)` | per-project monogram on `surfaceMuted` |
| V6 hover-lift | `hover:-translate-y-0.5` | gone — feedback via border + subtle image scale + arrow nudge |

Static grep across the three component files confirms: **zero** `shadow-*`, `backdrop-blur`, `border-l-2`, `linear-gradient`, `*-orange-*`, or non-3px radius.

---

## The density ladder (now real)

| Mode | Grid | Tile content | Distinct because |
|------|------|--------------|------------------|
| **List** | bordered container, hairline dividers | 48px thumb │ title + client + chip │ location │ updated │ code │ actions │ Open | aligned table rows, whole row clickable |
| **Small** | `auto-fill minmax(132px,1fr)` | square image + title + client (shared/pending/published also keep their access chip) | true compact tile, ~6–9/row, whole tile clickable |
| **Medium** | `auto-fill minmax(200px,1fr)` | 4:3 image + client + title + location + footer (code + Open) | balanced; drops updated/open-count |
| **Large** | `auto-fill minmax(248px,1fr)` | 4:3 image + chips + client + title + open-count/role/invites + location + updated + footer | full showcase |

Before, "small" was a cramped "large" (same tall card, image squished). Now each mode is a genuine information-density step.

---

## Interaction & a11y improvements

- **Actions reveal on intent.** Select / expand / favorite rest hidden (`opacity-0` + `pointer-events-none`, so they never intercept clicks meant for the tile), and reveal on hover **and** keyboard focus (`group-focus-within`), and stay visible on touch (`@media(hover:none)`). Verified: focusing an action sets opacity→1 / pointer-events→auto.
- **Favorited without color.** The favorited star is a solid **ink** button (`aria-pressed` + persistent), legible on photos and on the muted monogram thumb alike — passes WCAG 1.4.1 (state not by hue).
- **Selection is unmistakable.** Selected tile → `border-ink`; selected list row → `ring-ink` inset (since `accentSoft` == `surfaceMuted`, a bg change alone would read as hover). Activating any selection reveals every checkbox so multi-select is discoverable. Bulk-delete flow verified intact.
- **Navigation.** Whole tile (small) and whole row (list) are stretched links; the decorative "Open" indicator is `pointer-events-none` so clicking it falls through to the row link. Verified end-to-end (row click → `/workshop/projects/{id}`).
- **Reduced motion.** Every transform/opacity animation (reveal fade, image scale, arrow nudge) has a `motion-reduce` reset.
- **Long-name safety.** Tile titles use `[overflow-wrap:anywhere]` + `line-clamp-2`; list titles `truncate`.

---

## Heuristic re-score (honest)

| # | Heuristic | Before | After | Why moved |
|---|-----------|:--:|:--:|-----------|
| 1 | System status | 3 | 3 | skeleton now matches default card; non-default modes still hydrate-jump (inherent) |
| 2 | Match real world | 3 | 3 | unchanged (already good) |
| 3 | User control | 3 | 3 | unchanged (strong delete gate kept) |
| 4 | Consistency | 2 | 4 | live card / sample / skeleton now one shell; consistent chips, buttons, motif |
| 5 | Error prevention | 4 | 4 | destructive flow preserved |
| 6 | Recognition | 3 | 4 | distinct monograms, clear states, labeled chips |
| 7 | Flexibility/efficiency | 3 | 4 | real 4-density ladder, whole-row click, less persistent chrome |
| 8 | Aesthetic/minimalist | 2 | 4 | all decorative violations removed; restrained, on-brand |
| 9 | Error recovery | 3 | 3 | unchanged |
| 10 | Help/docs | 3 | 3 | unchanged |
| **Total** | | **29/40** | **35/40** | "Good"→ top of "Good", on-brand |

Remaining gaps are inherent or out-of-scope: skeleton can't read the localStorage view mode server-side; no post-delete undo (a typed-confirm gate compensates); no contextual help on this surface.

---

## Verification performed

- ESLint (4 files): clean.
- `enforce-app-design-system.mjs`: clean for all four files.
- `tsc --noEmit`: 0 errors.
- Impeccable `detect.mjs`: `[]`.
- Live browser (real authenticated app, 1147px): all four modes, selection state, favorite ink state, hover/focus reveal, and whole-row navigation captured and confirmed (`screenshots/10–23`).
- One adversarial reviewer pass (8 findings) — all fixed. One exhaustive multi-agent review + adversarial-verification workflow — see `04-FINAL-REVIEW.md` for the confirmed-findings outcome.

---

## Acceptance criteria

- [x] Zero `shadow-*`, `backdrop-blur`, `border-l-2`, `linear-gradient`, `*-orange-*`, non-3px radius in the four files.
- [x] All four view modes render a visibly distinct density; "small" fits many per row with minimal chrome.
- [x] Tile/row actions hidden at rest (except favorited star), revealed on hover AND keyboard focus, visible on touch.
- [x] Image-absent tiles show a per-project monogram, not a CTA gradient.
- [x] Favorite on/off distinguishable without color.
- [x] Skeleton matches the real (default large) card.
- [x] Live card, sample card, skeleton share one visual shell.
- [x] Destructive bulk-delete flow unchanged and verified working.
- [x] Heuristic re-score ≥ 34/40 (achieved 35).

---

## Screenshot index (`./screenshots/`)

- `00–05` baseline (before): default, large, medium, small, list, shared-empty.
- `10–18` mid-iteration: large/medium/small/list, selection, hover-reveal, favorited-ink, list-selected.
- `20–23` final: large, medium, small, list.

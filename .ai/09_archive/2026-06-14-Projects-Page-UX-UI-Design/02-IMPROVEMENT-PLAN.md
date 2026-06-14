# Projects Page — Improvement Plan

**Companion to:** `01-AUDIT.md`
**Date:** 2026-06-14
**Confirmed directions (from Philip, 2026-06-14):**
1. **True density ladder** — each view mode changes information density, not just image size.
2. **Hover/focus-reveal tile actions** — select + expand appear on hover/focus; favorite stays quietly visible only when favorited.
3. **Per-project monochrome motif** for image-absent thumbnails — neutral `surfaceMuted` + project code/initials; "Add image" is an owner hover affordance (routes through the existing details/expand flow).
4. **Light restyle of access tabs** allowed (cohere spacing/badge tone only; no structural/behavioral change).

**Hard boundary (unchanged):** do not touch the search input or the header action icons (view-mode toggles, filter, add). All header chrome in `WorkshopCollectionLayout` + `HeaderIconToolbar` is off-limits. The orange "Add projects" button lives there and stays.

---

## 1. Design north star

DESIGN.md is prescriptive, so the target is largely determined: **precise, architectural, understated.** Elevation through thin borders + whitespace, never shadow. Neutral palette; semantic color only where it carries meaning; **zero orange in-app.** SF Pro, ≤12px, weights 400/500, tracking 0, radius 3px. The card grid should read like a precise tool (Linear/Notion-grade), where the project image and name do the work and chrome recedes.

Success = a contractor scanning their projects trusts every component, the four view modes each earn their place, and nothing on the surface contradicts the stated brand.

---

## 2. Token contract (what the new components may use)

| Role | Token | Hex |
|------|-------|-----|
| Primary text / favorited / selection outline | `ink` / `accent` | `#292929` |
| Body text | `secondary` | `#5D5D5D` |
| Meta / muted / placeholder | `tertiary` | `#7F7F7F` |
| Hairline border / divider | `hairline` / `divider` | `#F2F2F2` |
| Card / canvas | `surface` | `#FFFFFF` |
| Muted surface / hover / selected bg / placeholder field | `surfaceMuted` / `accentSoft` | `#F5F5F5` |
| Pending-invite chip (only sanctioned color cue) | `warning` / `warningSoft` | `#B45309` / `#FEF3C7` |
| Destructive (delete affordances) | `danger` | `#B91C1C` |

Radius: `rounded-xs` (3px) only. Motion: 150ms, ease-out; transform/opacity only; `prefers-reduced-motion` honored. **Banned in these files:** `shadow-[…]`/`shadow-sm`/`shadow-md`, `backdrop-blur`, `border-l-2…`, any `linear-gradient`, any `*-orange-*` utility, any radius other than 3px.

---

## 3. Violation remediation map (from audit)

| ID | Was | Becomes |
|----|-----|---------|
| V1 heavy shadow | `shadow-[0_16px_38px…]` + hover heavier | `border border-hairline`; hover darkens border to `#E3E3E3` + 150ms; no shadow |
| V2 side-stripe | `border-l-2 border-l-orange/emerald/sky` | Removed. Access kind shown by neutral text chip (already labeled). Tabs already separate owned vs shared. |
| V3 glass buttons | `bg-white/86 backdrop-blur` | Solid `bg-white border border-hairline`, hover-revealed |
| V4 in-app orange | star, badges, gradient | Favorite → `ink` fill star; access/link chips → neutral; pending-invite → `warning`; expired → muted |
| V5 gradient placeholder | `linear-gradient(135deg,#fff0e5…)` | `surfaceMuted` field + muted project-code/initials motif |
| V6 hover lift | `hover:-translate-y-0.5` | Removed; interactive feedback = border + image `scale-[1.02]` + arrow nudge |

---

## 4. The density ladder (per-mode spec)

Standardized image rhythm: **large/medium = `aspect-[4/3]`**, **small = `aspect-square`**, **list = 56px square thumb**.

### LIST — one horizontal scan-line
- Container: single `rounded-xs border border-hairline divide-y divide-hairline overflow-hidden` wrapper; rows have no own border.
- Row (~56–60px): `thumb(56²) │ title(11px) + client(9px muted under it) │ location │ updated │ code(tnum) │ [hover actions] │ Open →`. Columns aligned across rows. Hover row bg `surfaceMuted`. Actions (select/expand) reveal on row hover/focus; favorite shows if favorited.

### SMALL — compact tile, many per row
- Grid: `repeat(auto-fill, minmax(132px, 1fr))`, `gap-2`.
- Tile: `aspect-square` image, then **title (10px, clamp-1)** + **client (8px muted, clamp-1)**. No location, no updated, no code, no footer.
- Whole tile navigates (stretched-link pattern: anchor wraps image+text; action buttons are higher-z siblings over the image). Select/expand reveal on hover/focus; favorited star shows quietly.

### MEDIUM — balanced tile
- Grid: `repeat(auto-fill, minmax(200px, 1fr))`, `gap-3`.
- Tile: `aspect-[4/3]` image; **client (8px)** + **title (11px, clamp-2)**; **one** meta line (location); footer: **code + Open →**. Access chip only in the shared context. No updated row, no open-count.

### LARGE — full showcase (current richness, cleaned)
- Grid: `repeat(auto-fill, minmax(248px, 1fr))`, `gap-3`.
- Tile: `aspect-[4/3]` image; client + access/status chips; **title (12px, clamp-2)**; meta: location + updated (+ open-count/role/invite rows where relevant); footer: code + Open/Accept.

> Every mode draws from one shared `LiveProjectCard` with mode branches; the *frame* (border, hover, radius, placeholder, action-reveal) is identical across modes — only content density changes.

---

## 5. Tile action behavior (hover/focus reveal)

- Action cluster sits over the image well. **Resting:** hidden (`opacity-0`), except a **filled `ink` star** if the project is favorited.
- **Reveal triggers:** `group-hover`, `group-focus-within` (keyboard reach), `selectedForDeletion`, or any active selection (so multi-select stays discoverable). Touch (`@media (hover:none)`) keeps actions visible.
- Buttons: shared `Button variant="secondary" size="icon-sm"`, solid `bg-white border-hairline`, **no glass, no shadow**. 28px visual; acceptable for desktop-first app (noted as a known mobile tradeoff).
- Favorite: `weight="fill"` + `ink` when on; `weight="regular"` + `tertiary` when off (fixes color-only WCAG 1.4.1).
- Selection checkbox keeps `accent-danger` semantics (it gates deletion) — this is sanctioned danger usage, not decoration.

---

## 6. Image-absent placeholder

- `surfaceMuted` field, hairline frame, centered **project code** (or initials from name if no code) in SF Pro `tertiary`, sized per mode (≤12px). Quiet, architectural, distinguishable per project.
- Owned + no image: on hover, a small `＋ Add image` text-button (neutral) appears, calling `onExpand` (existing details/image flow). Non-owners and resting state: motif only.

---

## 7. Consistency fixes

- **Sample `ProjectCard`:** same shell as `LiveProjectCard` (neutral border, no shadow, no dashed border, motif placeholder, same footer). May keep its 3 reference metrics *inside* the shared frame. Only renders in first-run empty state.
- **`loading.tsx` skeleton:** rebuild to mirror the new **large** card (image `aspect-[4/3]` + title + 2 meta lines + footer), matching the server-default view mode. Remove the metrics-grid skeleton that mirrored the old sample card.
- **Open affordance:** unify padding (`Open` and `Accept` same horizontal padding).

---

## 8. Files & change surface

| File | Change |
|------|--------|
| `src/components/workshop/LiveProjectCard.tsx` | Primary rewrite: frame, per-mode density, hover-reveal actions, motif placeholder, de-orange, fix favorite weight |
| `src/components/workshop/projects-page-client.tsx` | `getProjectGridClassName` (new ladder grids); sample grid wrapper; light access-tab badge tone. **Do NOT touch** `projectViewModeActions`, `projectToolbarActions` (header). |
| `src/components/workshop/ProjectCard.tsx` | Re-skin sample to shared shell |
| `src/app/workshop/projects/loading.tsx` | Rebuild skeleton to match new large card |

No data, repository, server-action, or routing changes. Pure presentation.

---

## 9. Phased execution

1. **Frame + tokens** — strip V1–V6 from `LiveProjectCard` (border/hover/placeholder/colors), verify nothing orange/glassy/shadowed remains.
2. **Density ladder** — implement per-mode content branches + new grid classes; screenshot all 4 modes.
3. **Action reveal** — hover/focus reveal, favorite weight, touch fallback; verify keyboard reachability.
4. **Placeholder motif** — code/initials field + owner add-image affordance.
5. **Consistency** — sample card + skeleton re-skin.
6. **Iterate** — screenshot every mode + shared/empty + a narrow width; adversarial review vs DESIGN.md + a11y; fix; repeat until production-ready.
7. **Verify** — typecheck/lint clean; `detect.mjs` clean; final before/after screenshots saved.

---

## 10. Acceptance criteria (production-ready bar)

- [ ] Zero `shadow-*`, `backdrop-blur`, `border-l-2`, `linear-gradient`, `*-orange-*`, non-3px radius in the four files.
- [ ] All four view modes render a visibly distinct density; "small" fits ≥6 per row at ~1100px and carries minimal chrome.
- [ ] Tile actions hidden at rest (except favorited star), revealed on hover AND keyboard focus, visible on touch.
- [ ] Image-absent tiles show a per-project monochrome motif, not a CTA gradient.
- [ ] Favorite on/off distinguishable without color (fill weight).
- [ ] Skeleton matches the real large card (no load-in layout jump).
- [ ] Live card, sample card, skeleton share one visual shell.
- [ ] Destructive-delete flow unchanged and still works.
- [ ] Heuristic re-score ≥ 34/40; screenshots confirm on-brand result at every mode.

# Projects Page — UX / UI Audit

**Surface:** `http://localhost:3000/workshop/projects`
**Date:** 2026-06-14
**Scope:** How projects are *presented* — the card/grid system, the small→large thumbnails, thumbnail rendering, empty states, the loading skeleton. **Out of scope (per directive):** the search input and the header action icons (view-mode toggles, filter, add).
**Method:** Full source review of every in-scope component + 6 live screenshots (all 4 view modes, shared tab, empty state) captured from the authenticated app. Impeccable deterministic detector run on the card files.

---

## TL;DR

The page **works** and has one genuinely excellent trait (destructive-action safety). But the presentation layer **violates the project's own DESIGN.md in five concrete, visible ways** — heavy drop shadows, `border-l-2` colored side-stripes, `backdrop-blur` glass buttons, in-app orange, and decorative warm gradients. These are not subjective: each is an explicit *anti-reference* in DESIGN.md or an *absolute ban* in the Impeccable skill. On top of that, the four view modes don't form a real density ladder ("small" is just a cramped "large"), every thumbnail carries three persistent floating icons that fight the image, and the live card, the sample card, and the loading skeleton are three different layouts.

**Design Health Score: 29 / 40 — "Good" band, dragged down by self-inflicted design-system incoherence.** The work to reach production isn't a rebuild; it's disciplined subtraction plus a clear per-mode hierarchy.

---

## Design Health Score (Nielsen's 10 Heuristics)

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Loading skeleton exists but mirrors a *different* layout than the real card → load-in jump. Favorite has a busy state; delete has rich progress. |
| 2 | Match System / Real World | 3 | Domain language is good ("Owned", "Estimate-only", "Open access", project code, client). Natural ordering. |
| 3 | User Control and Freedom | 3 | Tab switch, search clear, favorite toggle, bulk select/clear, delete preview gate. No post-delete undo, but a typed-confirm gate compensates. |
| 4 | Consistency and Standards | 2 | **Three divergent presentations of "a project": live card, sample card, and skeleton are structurally different.** Inconsistent button padding; orange applied against the system's own rules. |
| 5 | Error Prevention | 4 | Genuinely strong: typed-phrase confirmation (`DELETE 3 PROJECTS`), dependency preview, disabled-with-reason selection, optimistic-with-rollback favorites. |
| 6 | Recognition Rather Than Recall | 3 | Access states are text-labeled (not color-only at the badge level). Actions visible. |
| 7 | Flexibility and Efficiency | 3 | 4 view modes + persisted preference, bulk delete, route prefetch-on-hover, roving-tabindex tabs. But "small" mode isn't actually more efficient, and there are no create/search keyboard accelerators. |
| 8 | Aesthetic and Minimalist Design | 2 | **Weakest axis.** Heavy shadows + glass + orange + gradients + 3 persistent overlay icons on every tile contradict the stated "precision over decoration / elevation through thin borders" identity. |
| 9 | Error Recovery | 3 | Delete surfaces blocked/issue reasons; favorite rolls back on failure. |
| 10 | Help and Documentation | 3 | Empty states teach ("When someone invites you as a viewer…"). Adequate for this surface. |
| **Total** | | **29 / 40** | **Good — solid bones, incoherent skin.** |

Honest read: most real interfaces land 20–32. A 29 here means nothing is *broken*, but the surface is actively fighting its own brand. Target after redesign: **34–36**.

---

## Anti-Patterns Verdict — does this look "AI/template-made"?

**Product slop test** (the right test for app UI): *would a user fluent in Linear / Notion / Stripe trust this, or pause at subtly-off components?* They'd pause. Not because it's ugly — because the **lift-on-hover marketing shadow, the frosted-glass floating buttons, and orange accents on a declared-neutral surface** are the exact "subtly off" tells that signal a template skin laid over a precise tool. The incoherence (a tool that says "understated, architectural, no decorative depth" while shipping decorative depth) is more damaging than plain flatness would be.

**Deterministic scan:** Impeccable's `detect.mjs` returned `[]` (clean) on all four files. This is a **false-negative, reported honestly**: the detector is markup-pattern based and does not flag arbitrary inline `shadow-[…]` values or `border-l-2` utility side-stripes. The real violations below were found by source + visual review, not the scanner.

### Verified DESIGN.md / Impeccable violations (each is an explicit rule, not a preference)

| # | Violation | Location | Rule broken |
|---|-----------|----------|-------------|
| V1 | **Heavy drop shadow** `shadow-[0_16px_38px_-34px_…]` + heavier on hover | `LiveProjectCard.tsx:137`; `ProjectCard.tsx:16` | DESIGN.md "Avoid heavy drop shadows… elevation through thin borders & whitespace"; anti-ref "No decorative depth" |
| V2 | **Colored side-stripe** `border-l-2 border-l-orange/emerald/sky-500` | `LiveProjectCard.tsx:138–140` | Impeccable **Absolute Ban: side-stripe borders**; DESIGN.md anti-ref "no caution-stripe borders" |
| V3 | **Glassmorphism** `bg-white/86 backdrop-blur` on 3 overlay buttons | `LiveProjectCard.tsx:178,198,219` | DESIGN.md anti-ref "no glassmorphism"; Impeccable ban "Glassmorphism as default" |
| V4 | **Orange in app UI** — favorite star `text-orange-600`, access/link/invite badges, warm gradient | `LiveProjectCard.tsx:163,200,248-252,259,305,319`; `ProjectCard.tsx:18` | DESIGN.md "No orange brand accent… never in app/workshop UI" |
| V5 | **Decorative gradient** `linear-gradient(135deg,#fff0e5…)` placeholder | `LiveProjectCard.tsx:163`; `ProjectCard.tsx:18` | DESIGN.md anti-ref "no gradients"; "monochrome" placeholder guidance |
| V6 | **Decorative motion** `hover:-translate-y-0.5` lift | `LiveProjectCard.tsx:137`; `ProjectCard.tsx:16` | Product register "motion conveys state, not decoration"; "no animation that slows repeat actions" |

> Note on V4: the **"Add projects" toolbar button** is also orange (`projects-page-client.tsx:377`) but it lives in the header toolbar — **off-limits per directive**, flagged for awareness only, not changed.

---

## Overall Impression

The strongest thing here is invisible in a screenshot: the delete flow (typed phrase + dependency preview + disabled-with-reason) is the kind of safety a contractor deleting a live bid actually needs. Keep that untouched.

The single biggest opportunity: **make the surface obey its own design system, and make the four view modes mean something.** Right now the difference between "small," "medium," and "large" is mostly the image aspect ratio and a few hidden rows — not a real information-density tradeoff. A contractor with 60 projects gains nothing from "small" because it still renders a tall, fully-chromed card. The view-mode toggle (which I'm told to leave alone) is writing a promise the cards don't keep.

---

## What's Working (keep these)

1. **Destructive-action safety (Heuristic 5 = 4/4).** Typed confirmation, dependency preview, per-item disabled reasons, optimistic favorites with rollback. Do not regress this.
2. **Accessible scaffolding.** Roving-tabindex on the access tabs, `aria-label`s on every icon action, `role="tabpanel"` wiring, semantic `<article>` per project. The bones are right.
3. **Domain-correct metadata.** Client, project code, location, updated date, access role, open-count — the right fields for someone deciding which estimate to open.

---

## Priority Issues (P0–P3)

### [P1] The four view modes are not a density ladder — "small" is a cramped "large"
- **What:** `small` (`minmax(128px,156px)`) still renders aspect-square image + client + badge + title + location + project-code + "Open" at `min-h-[108px]`. It's ~156×260px — barely denser than `medium`, and noisier per pixel. `getProjectGridClassName` + `LiveProjectCard` only vary the image aspect and hide one row (`Clock`).
- **Why it matters:** The toggle the user is told to keep promises four meaningfully different densities. Today it delivers ~two. A power user (Alex) scanning many projects gets no payoff for choosing "small."
- **Fix:** Define a real ladder. **List** = one horizontal scan-line row. **Small** = compact tile, image + title + one meta line, minimal chrome, many per row. **Medium** = balanced tile. **Large** = showcase tile (current richness, fixed). Each mode subtracts/adds *content and chrome*, not just image ratio.
- **Command:** `/impeccable layout` + `shape`

### [P1] Self-inflicted design-system violations (V1–V6) make a "precise, understated" tool look decorative
- **What:** Heavy shadows, glass buttons, orange accents, warm gradients, hover-lift — see the violations table.
- **Why it matters:** DESIGN.md is explicit and enforceable; these are the first things a design reviewer (or Philip) will reject. They also undercut the brand promise ("the tool disappears into the work").
- **Fix:** Replace shadow elevation with the system's thin-border + whitespace + `surfaceMuted` hover. Replace glass overlay buttons with solid surface buttons (or remove from the tile entirely — see P2). Swap every in-app orange for the neutral/semantic tokens (favorite → ink/accent fill-weight; access state → neutral chip + 1px full border, not a stripe). Replace the gradient placeholder with a neutral monochrome motif.
- **Command:** `/impeccable quieter` + `colorize` (semantic-only)

### [P2] Every thumbnail carries three persistent floating icons that fight the image
- **What:** Checkbox (top-left), favorite (next to it), expand (top-right) are **always rendered** over the image with glass + shadow. On `small`/`list` they're cramped; on every mode they compete with the actual project photo — the thing users scan.
- **Why it matters:** The image *is* the recognition cue (Heuristic 6). Burying it under permanent admin chrome raises cognitive load and looks busy. Bulk-select especially is a rare action that shouldn't be always-on.
- **Fix:** Reveal selection + expand on hover/focus (and when any selection is active, so multi-select stays discoverable); keep favorite if it's a primary action but render it quietly. Provide a keyboard-reachable equivalent. Reduce default tile chrome to: image, title, client, one meta line, open affordance.
- **Command:** `/impeccable distill`

### [P2] Three different "project" layouts: live card vs sample card vs skeleton
- **What:** `LiveProjectCard` (location/updated/code/Open) and `ProjectCard` sample (3-col metrics grid: areas/items/revision + estimate total + dashed border + "Open sample") are structurally unrelated. `loading.tsx` renders yet a third structure (mirrors the *sample's* metrics grid), so the skeleton→content swap is a layout jump.
- **Why it matters:** Consistency (Heuristic 4). The skeleton mismatch is a visible jank on every cold load; the sample/live divergence makes first-run feel like a different app than the populated state.
- **Fix:** One card skeleton that mirrors the real `LiveProjectCard` per view mode. Re-skin the sample card to the same shell (it can keep richer reference metrics inside the shared frame). Drop `border-dashed`.
- **Command:** `/impeccable polish`

### [P2] List view is a shrunk card, not a real list row
- **What:** In `list` mode the row is `min-h-[92px]` with title+meta at top, a vertical gap, then project-code + "Open" pinned to the bottom — and the three overlay icons sit awkwardly on the small thumbnail.
- **Why it matters:** A list is for fast vertical scanning across aligned columns; this row wastes height and misaligns fields between rows.
- **Fix:** True row grammar: `thumb │ name + client │ location │ updated │ code │ actions`, single baseline, ~56–64px tall, columns aligned across rows, actions on hover/focus.
- **Command:** `/impeccable layout`

### [P3] Image-absent placeholder is off-brand and repetitive
- **What:** ~half the projects have no image, so the **warm orange gradient + generic `ImageSquare` + "ADD PROJECT IMAGE"** placeholder becomes a dominant, identical, off-palette visual repeated across the grid.
- **Why it matters:** It's the most-seen element and it's the most off-brand one (V4/V5). Identical placeholders also kill at-a-glance differentiation between projects.
- **Fix:** Neutral monochrome placeholder using the system palette; derive a quiet per-project motif (e.g. initials / project-code mark on `surfaceMuted` with a hairline) so cards stay distinguishable. Reserve the "add image" CTA for the owner's hover/affordance, not the resting state.
- **Command:** `/impeccable delight` (restrained)

### [P3] Favorite on/off is signaled by color alone (orange vs grey), both `weight="regular"`
- **What:** `LiveProjectCard.tsx:200,212` — favorited differs from un-favorited only by hue. WCAG 1.4.1.
- **Fix:** Use `weight="fill"` (or a filled star) for the active state in addition to the (de-oranged) color.
- **Command:** `/impeccable harden`

---

## Persona Red Flags

**Alex (Power User / contractor with many projects):**
- "Small" view gives no real density payoff — same tall, chromed card. No keyboard shortcut to create or jump-to-search. Bulk-select requires hunting the always-on checkbox rather than shift-click range or a select-mode. Scanning 60 projects is slower than it should be.

**Sam (Accessibility / keyboard + screen reader):**
- Favorite state is color-only (P3). Overlay action buttons are 28px (below 44px touch). Image `alt=""` discards a meaningful recognition cue. Focus order otherwise sound; access tabs are correctly roving-tabindex.

**Riley (Stress tester / edge cases):**
- Long project names: `line-clamp` handles it, good. But "No client yet" / "No location" / "—" code all stack as muted rows, so a brand-new image-less project is a near-empty card dominated by the off-brand placeholder — the *first* card a new user ever sees is the weakest one. First-run impression risk.

---

## Minor Observations

- `shadow-sm` lingers on overlay buttons and the active view-toggle (decorative depth, minor).
- "Open" link padding `px-4` vs Accept button `px-2` — inconsistent affordance width.
- Skeleton count is fixed at 6 in a grid sized for up to 5 cols — fine, but it assumes "large" structure regardless of the persisted view mode.
- `aspect-square` for both `small` and `large` but `aspect-[4/3]` only for `medium` — inconsistent image rhythm across the ladder.

---

## Questions to Consider

- If the view-mode toggle is sacred, shouldn't each mode earn its place by actually changing *information density*, not just image size?
- What's the resting state of a thumbnail when there's no image — and is that the impression we want a new contractor's empty workspace to make?
- Do three admin icons need to live on top of every project photo, or can the photo just be the photo until you reach for it?
- Is the favorite star a primary action worth permanent real estate, or a hover-level one?

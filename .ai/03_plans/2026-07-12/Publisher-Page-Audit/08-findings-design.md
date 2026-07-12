# 08 — Findings: Design / UX / Accessibility (improve-stage pass)

Produced by a design audit against `DESIGN.md` (alpha-stage — token violations
flagged as **consistency** issues, not law). Severity **P1/P2/P3**.
Evidence = `file:line` vs current `main`. IDs: `D-*`.

## Reference baseline (from DESIGN.md)

- Type scale: app-title 12px / app-subtitle 11px / app-body & app-button & app-numeric 10px / app-label 9px / app-label-sm 8px. Hard max 12px outside landing. Regular/medium weights only.
- Color: `primary #3D3D3D`, `surface #FFF`, `surfaceMuted/canvas #F5F5F5`, `hairline/divider #F2F2F2`, `warning #B45309 / warningSoft #FEF3C7`, `danger #B91C1C`, `success #15803D`. **Orange is landing/brand only** (except named estimate-sheet exception). Amber is a Dashboard-only warm-bloom family.
- Reuse contract: `src/components/ui/` primitives (button, search-input, dropdown-select, drawer, checkbox, empty-state, skeleton). "A visible duplicated button/search/input implementation is a blocking design-system defect."
- Radius 3px (`rounded-xs`); spacing scale xs 4 / sm 8 / md 12 / lg 20 / xl 48.

## D-1 — Amber palette hardcoded in `ClientPreviewBanner` [P1]

**Evidence:** `ClientPreviewBanner.tsx:5-7` `border-amber-200 bg-amber-50 text-amber-950`. Tailwind `amber-*` is not part of the app design system; every other warning surface on the page correctly uses `bg-warningSoft text-warning` (`PublisherDrawer.tsx:252,271`, `ShareWizard.tsx:297,301`). This is the only `amber-*` under `publisher/`.

**Fix (UNIT-7):** swap to `border-warning/30 bg-warningSoft text-warning` (matches the drawer's stale-snapshot banner semantics — "manager preview" is a provisional/review tone).

## D-2 — Banner uses 12px body + `<strong>` (bold weight) outside type scale [P2]

**Evidence:** `ClientPreviewBanner.tsx:6-7` `text-[12px]` is the hard app max (reserved for titles) on a *body sentence*; `<strong>` renders `font-weight:700`, violating the regular/medium-only rule.

**Fix (UNIT-7):** drop to `text-[10px] font-medium`; replace `<strong>` with `<span class="font-medium">`.

## D-3 — Pervasive `!text-[Npx]` with `!important` overrides [P3]

**Evidence:** `text-[10px]` ×57, `text-[9px]` ×20, `text-[8px]` ×3 across the directory, most `!`-prefixed to force-override primitive defaults (e.g. `PublisherRosterClient.tsx:287,296,305`, `PublisherDrawer.tsx:203,221`). The type scale exists in DESIGN.md as named tokens but is never referenced as a utility, so every site re-derives it and the `!` chains make the cascade fragile.

**Fix (defer / DESIGN.md evolution):** expose the app type scale as real utilities (`text-app-body`, `text-app-label`) or component props; drop the `!important` re-assertions on primitives that already encode the size.

## D-4 — Duplicated grid templates across client + skeleton [P3]

**Evidence:** `PublisherRosterClient.tsx:278` and `PublisherRosterSkeleton.tsx:9` both literally duplicate `xl:grid-cols-[minmax(14rem,1fr)_9rem_12rem_auto]`; master/detail split duplicated at `:322`/skeleton `:15`. If the layout changes the skeleton desyncs (already slightly different: skeleton uses `md:grid-cols-2`).

**Fix (UNIT-7):** extract a shared layout class/constant.

## D-5 — Link styled as a secondary button in 4 places (duplicated, drifted class string) [P2]

**Evidence:** `PublisherDrawer.tsx:240-247` (Preview), `:335-340` (Team access), `ShareLinkDisplay.tsx:66-70` (Preview), `PublisherEmptyState.tsx:37-39` (View projects). Each re-applies the long hand-rolled button string; they've already drifted (`ring-offset-1` on some, `bg-surface` vs `bg-white`, `gap-1.5` varies). DESIGN.md reuse contract calls duplicated button implementations a blocking defect.

**Fix (UNIT-7):** render `<Button variant="secondary" asChild><Link…/></Button>` or factor one `linkButtonClass` constant.

## D-6 — Native `<input type="checkbox">` instead of `Checkbox` primitive [P2]

**Evidence:** `ShareWizard.tsx:309-318` raw `<input type="checkbox" class="size-3.5 accent-ink">` while `src/components/ui/checkbox.tsx` exists. `accent-ink` is a token bypass; no focus-visible ring / consistent checked state.

**Fix (UNIT-9):** use `<Checkbox>` from `@/components/ui/checkbox`.

## D-7 — Read-only client link rendered as raw `<input>` twice [P3]

**Evidence:** `PublisherDrawer.tsx:301-307` and `ShareLinkDisplay.tsx:54-60` hand-build read-only inputs with slightly different styling. `ControlField` + `CONTROL_INPUT_SURFACE_CLASS` is the canonical pattern.

**Fix (defer):** factor a `ReadOnlyLinkField` component.

## D-8 — `PublisherProjectPicker` re-implements `AppModal` chrome [P3]

**Evidence:** `PublisherProjectPicker.tsx:64-171` manually assembles `Dialog`/`DialogPortal`/.../`z-[1000]`, duplicating `AppModal` (`overlays/modal.tsx:85`). `PublisherDrawer` and `ShareWizard` correctly use `Drawer`/modal primitives, so this is the odd one out and won't participate in the modal stack `inert`/z-index management.

**Fix (UNIT-9):** use `<AppModal size="md" initialFocus="first" …>`.

## D-9 — Mobile/desktop split decided by `matchMedia` at click time (see A-BUG-3) [P1]

**Evidence:** `PublisherRosterClient.tsx:190` (also tracked as A-BUG-3). No reactive media-query hook; desktop-selected rows don't transition to mobile detail on resize. `PublisherEmptyState.tsx:19-22` has a `variant="mobile"` ("Sharing needs more width") that is **never rendered anywhere** — dead code signaling the mobile path was planned but not wired.

**Fix (UNIT-8):** reactive `useSyncExternalStore` media query; wire the `mobile` empty-state variant for no-JS/narrow fallback.

## D-10 — Fixed toolbar column widths can overflow on narrow viewports [P2]

**Evidence:** `PublisherRosterClient.tsx:278` `9rem` + `12rem` fixed status/project columns; boxed project select truncates without a tooltip (`dropdown-select.tsx:397` has `truncate` but no `title`).

**Fix (UNIT-7):** add `title={label}` on boxed project selects, or switch to `minmax(0,…)` flex columns.

## D-11 — 8–9px meta text at the readability floor; inconsistent recipient-count copy [P2]

**Evidence:** `PublisherRosterCard.tsx:52,58,62,65` packs five text sizes into ~64px (`min-h-16`). `#7F7F7F tertiary` on white = 4.0:1 (AA threshold for normal text; sub-normal at 9px/400w). `formatPublisherRecipientCount` (`PublisherRosterRow.tsx:39`) returns "No recipients" for unpublished but the card shows it for all rows; the drawer uses `readRecipientScope` → "Anyone with the link" for 0. **Same concept labelled three ways.**

**Fix (UNIT-7):** unify recipient-count copy helper; lift meta timestamp to `text-secondary`.

## D-12 — Copy-button "Copied" feedback never resets [P1]

**Evidence:** `PublisherRosterClient.tsx:253-262` sets `copyStateByPublicationId[id]="copied"` and never clears (no `setTimeout`). Same in `PublisherDrawer.tsx:184` and `ShareLinkDisplay.tsx:31`. Once copied, the card stays "Copied" forever (or until a failed copy).

**Fix (UNIT-7):** add `setTimeout(() => set…("idle"), 2000)` in each copy handler (clear on unmount).

## D-13 — `aria-live` region announces a raw `"publicationId:copied"` string [P2]

**Evidence:** `PublisherRosterClient.tsx:405-407` `.join(": ")` on `[publicationId, "copied"]` → SR users hear the publication UUID, not "Link copied".

**Fix (UNIT-7):** map to a human message (`"Client link copied"` / `"Copy failed"`).

## D-14 — No in-flight feedback; destructive actions block silently [P2]

**Evidence:** `PublisherDrawer.tsx:155-157` + `usePublisherDrawer.ts:36-40`. During rotate/revoke the buttons disable via `!publicationBusy` but there's no spinner/skeleton — a slow network leaves the user staring at a static drawer.

**Fix (UNIT-5):** show an inline "Replacing link…" status while `publicationBusy`.

## D-15 — Roster list has no listbox semantics / arrow-key nav / type-ahead [P1]

**Evidence:** `PublisherRosterClient.tsx:342-358` — list of `<article>` cards each a `<button>`. No `role="list"`/`listbox`, no `aria-label` on the container, no arrow-up/down/Home/End, no `aria-activedescendant`. Only keyboard model is native Tab through every card + copy button. SR users hear "button, project, button, copy…" with no list grouping. Compare the canonical `DropdownSelect` (`dropdown-select.tsx:253-335`) which implements full APG combobox nav.

**Fix (UNIT-10 — new, a11y):** wrap rows in `<div role="listbox" aria-label="Client links">` + roving `tabIndex` + ArrowUp/Down/Home/End, or at minimum `role="list"`/`role="listitem"` for grouping.

## D-16 — Selected row uses color-only cue + brand-orange ring [P2]

**Evidence:** `PublisherRosterCard.tsx:38` `ring-1 ring-inset ring-brand-orange/40` is the only selection signal beyond `bg-surfaceMuted/75` (also the hover bg at `:39`). `aria-current="true"` exists (`:46`, good) but visually selected-vs-hover is a subtle ring + slightly darker grey. The orange ring also reintroduces brand-orange into app chrome (DESIGN.md restricts orange).

**Fix (UNIT-10):** add a non-color cue (left-edge `border-l-2 border-ink` or checkmark); use the neutral selected background token.

## D-17 — Warning text contrast borderline; `#B45309` on `#FEF3C7` = 4.51:1 [P2]

**Evidence:** `PublisherDrawer.tsx:252,271`, `ShareWizard.tsx:297,301` — `text-warning` at `text-[10px] leading-4` over `warningSoft`. 4.51:1 just passes AA for normal text but fails enhanced (7:1) and is at the edge for small/bold. `#B45309` on white = 5.02:1 (safer).

**Fix (UNIT-7):** darken the warning text token for small UI text (e.g. `#8C3F06`), or render banners with `text-ink` + warning icon + `border-warning`.

## D-18 — Embedded drawer tabpanel has `tabIndex={0}` (extra tab stop) [P2]

**Evidence:** `PublisherDrawer.tsx:289-294` `role="tabpanel" tabIndex={0}` makes the whole scroll container an extra Tab stop. With `controlsPanels={false}` (`:282`) the APG focus-management this enables isn't used.

**Fix (UNIT-7):** `tabIndex={-1}` or remove it.

## D-19 — `CheckCircle weight="fill"` violates regular-weight rule [P3]

**Evidence:** `ShareWizard.tsx:212` — the **one** design-enforcer failure in the directory (bans `bold|fill|duotone`). Inconsistent with every other Phosphor icon (all `regular`).

**Fix (UNIT-7):** named exception for success-state fill, or switch to `weight="regular"`.

## D-20 — `StatusBadge` contract defeated everywhere it's used [P3]

**Evidence:** `PublisherRosterCard.tsx:56`, `PublisherDrawer.tsx:203`, `PublisherProjectPicker.tsx:115` all override the canonical `StatusBadge` (`status-badge.tsx:45` `min-w-[96px]`) with `min-w-0 shrink-0 px-1.5 py-1 !text-[8px]`. The primitive's minimum width is silently defeated at every call site.

**Fix (defer):** either fix the primitive default once, or stop overriding it.

## Severity rollup (design/UX/a11y)

**P1 (5):** D-1 (amber), D-9 (mobile matchMedia + dead mobile empty-state), D-12 (copy feedback never resets), D-15 (no listbox/keyboard model), D-17 borderline → kept P2.
**P2 (10):** D-2, D-5, D-6, D-10, D-11, D-13, D-14, D-16, D-17, D-18.
**P3 (5):** D-3, D-4, D-7, D-8, D-19, D-20.

Highest-impact quick wins: D-12 + D-13 together (copy feedback + aria-live message), D-1 (amber), D-15 (decide listbox vs plain list).

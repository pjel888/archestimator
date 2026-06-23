# 04 — TARGET UI & LAYOUT · Shared-Link Modal

**Source:** Phase C `target-ui` design agent. Resolves **PROB-02/03/14/15/20/28/29** (RC-04 density-over-hierarchy, RC-10 nested-surface pile). Principle: **the link URL + status must dominate**; density was the wrong choice — promote the link, demote the rest, one Paper surface.

---

## 1. Shell & layout structure

Drop **`max-w-5xl`** + **`min-h-[600px]`** (`:684`). Size to content: `max-w-[720px]` single-surface (link-centric) by default; the wider `max-w-[920px]` two-column form is only for owner **Option B** (kept sidebar). Height = auto with the existing `max-h-[calc(100dvh-32px)]`; internal scroll on the tabpanel only when content overflows.

**Adopt the `Modal` primitive's real slots** instead of hardcoding the skeleton in `children` (today `footer`/`location` are unused):
- `title="Shared link"` + `description="View-only project page for <project>"` via `DialogTitle`/`DialogDescription` (bumped to the new scale).
- **Action bar → `footer` slot** (`modal.tsx:130` `DialogFooter`) — it's semantically a footer, currently mislaid in the body at `:1056`.
- **actionFeedback → `location` slot** (`modal.tsx:135`, today an empty `min-h-4` spacer) — the primitive's dedicated status band; retire the in-body feedback block (`:1173-1189`).

**Single-surface body:** one white Paper region with `--hairline` `border-t` section dividers — **no nested bordered tiles, no grey sidebar columns, no side-stripe (`border-l`) metric lists.** Grouping is vertical rhythm (`SectionLabel` + 16–20px gap) + hairline rules, never nested surfaces. The 5-col overview `<dl>` (`:749`) is **removed**.

**Where the link lives:** published → a `LinkPanel` at the top of the body (URL at 15px + status pill, dominant); first-publish → a `GeneratePanel` (headline + dominant Generate + inline estimate selection).

## 2. Typographic scale (the link dominates)

| Role | Size | Weight | Color | Usage |
|------|------|--------|-------|-------|
| **Link URL** (dominant) | **15px** | 600 | `text-ink #3D3D3D` | The read-only `ControlInput` value (`:845`) — the reason the modal exists. Tallest type on screen; the eye's first stop. |
| Link status / password pills | 11px | 600 | ink / `text-warning` / secondary (all AA) | Pills flanking the URL (`:880`, `:744`). Bumped from 8px (PROB-29). |
| Modal title (`DialogTitle`) | 13px | 600 | `text-ink` | "Shared link" (`dialog.tsx:279`, today 11px) — bump globally so every modal benefits. |
| Modal subtitle (`DialogDescription`) | 12px | 400 | **`text-secondary #5D5D5D`** — **fixes PROB-02 AA** | "View-only project page" (`dialog.tsx:289`, today `text-tertiary` ~4.48:1 < AA). |
| **`SectionLabel`** (replaces 16 eyebrows) | 11px | 600 | `text-secondary #5D5D5D` | Section headers — **sentence case, NOT tiny tracked uppercase** (that is the banned AI-slop tell). One primitive. |
| Body / form labels / radio-card text | 13px | 400 | ink (values) / secondary (helper) | `ControlField` helperText, radio-card labels, picker rows, recipient instructions. Cap ~65–75ch. |
| Meta / status facts | 12px | 400 | secondary; ink for the numeric span | opened-count, last-opened, published, expires. **One source of truth** (PROB-14). Relative expiry. |
| Action buttons (footer) | 13px | 600 | ink (primary) / secondary (ghost) / danger (revoke) | Generate/Update/New-link/Turn-off — moved into footer slot. |
| actionFeedback (location slot) | 12px | 400 | secondary (success) / danger (error) | Post-action status line. AA-passing, `role=status/alert` preserved. |

## 3. Surface treatment — flatten the nested-surface pile

Remove: (a) the grey `bg-surfaceMuted` sidebar (`:686`) — see owner A/B; (b) the side-striped `<dl>` (`border-l border-hairline`, `:750-770`) — removed, facts deduped; (c) bordered tiles inside bordered tiles (`:749-1001`) — radio cards stay as 3px-radius selectable *rows* but lose the nested wrapper; (d) `bg-surfaceMuted/60` dashed empty cards (`:811`,`:825`) → flat hairline-topped status lines. **Grouping without nested borders:** vertical spacing (16px sections / 8px within), one `border-t` under each `SectionLabel` row, and weight/size contrast. No side-stripes, no gradient text, no glass-as-decoration (glass is chrome-only), no ghost cards.

### Owner decision — grey sidebar (PROB-13, deferred to Philip per DESIGN.md alpha)
- **Option A (RECOMMENDED for v1):** Flat white. Remove the grey sidebar; status/meta move into a compact "Link status" `SectionLabel` row under the `LinkPanel` and/or into the `location` status slot. Purest to the one-Paper-surface contract; smallest modal; the link dominates unambiguously.
- **Option B (keep a muted column):** Convert the nested grey panel into a **hairline-divided column** — same white bg, single `border-r border-hairline`, status meta at the new scale (not 8px). Wider modal (`max-w-[920px]`, 240px + 1fr). One-token swap from A if the owner misses the column.

Both keep `proposalPaper #FFFDF8` **off** this modal (that's for client-facing docs only).

## 4. Spacing rhythm

Real variance, not uniform density: **section gap 20px**, **within-section 12px**, **inline-row gap 8px**, tab-strip→tabpanel 0px (active-tab underline bridges them). `border-t` only under `SectionLabel` rows and above the footer. Body padding `px-5 py-4 sm:px-6 sm:py-5` (was flat `p-6`). Footer/location use the primitive's `px-3 py-2`. `LinkPanel` gets `py-4` so the dominant URL has breathing room. Cap Access/Estimates form blocks at `max-w-[60ch]` so helper copy reads as prose. **This variance (20/12/8 + the dominant URL block) is what lets the eye find the link first** — the current uniform 8–10px flattens everything to equal importance (RC-04).

## 5. Responsive behavior

- `min-h-[600px]`/`max-w-5xl` dropped (PROB-15). Default single-column `max-w-[720px]` (A) or `max-w-[920px]` two-col at `lg` (B); height auto, tabpanel scrolls on overflow.
- Under `lg` (≈1023px) Option B collapses to single column (keep the `grid-cols-1 lg:grid-cols-[260px_1fr]` breakpoint, drop the grey fill + min-h).
- Under `sm` (≈640px): `LinkPanel` URL + Copy/Open stack to 2 rows (URL full-width, then a Copy|Open row) so the 15px URL never truncates; Access radio grid → 1-col (add `grid-cols-1` base to `sm:grid-cols-3`).
- Action footer wraps: primary stays left/full-width-on-mobile; New-link + Turn-off wrap to row 2.
- Empty/null-summary state sized to content (~4 lines), no cavern.
- First-publish `GeneratePanel`: estimate list scrolls internally (`max-h-[240px] overflow-auto`) so the dominant Generate CTA stays pinned in the footer.
- `prefers-reduced-motion`: `transition-none`/0ms on hover border, focus ring, tab underline (see doc 05).

## 6. ASCII wireframes

**PUBLISHED STATE (Option A — flat white, link-centric, ~720px, size-to-content):**
```
┌─────────────────────────────────────────────────────────────┐
│  Shared link                                              [X]│
│  View-only project page for 108 Maple St. renovation         │
├─────────────────────────────────────────────────────────────┤
│  SHARED LINK                              [● Live] [🔑 Pwd]  │ ← SectionLabel + status
│  ┌──────────────────────────────────────────┬──────┬─────┐  │
│  │ archestimator.app/p/9f3a…c2b1  (15px)    │ Copy │ Open│  │ ← URL DOMINATES
│  └──────────────────────────────────────────┴──────┴─────┘  │
│  Anyone with this link can view this project page.           │ ← helper, 13px secondary
│ ─────────────────────────────────────────────────────────── │
│  STATUS                                                      │
│  Opened 14 times · last by jane@studio.co · 2h ago           │ ← ONE source, 13px
│  Published Jun 4 · expires in 3 days                         │ ← relative expiry
│  [Your client is seeing the proposal from 4 days ago. Update]│ ← amber band if stale
│ ─────────────────────────────────────────────────────────── │
│  [ Content ][ Recipients ][ Activity ]                       │ ← modal tab variant, ink underline
│ ─────────────────────────────────────────────────────────── │
│  (active tab body — single white surface, hairline rhythm)   │
├─────────────────────────────────────────────────────────────┤ ← footer slot
│  [↻ Update shared page]   [⤳ New link]   [⊘ Turn off link]   │ ← primary + secondary
├─────────────────────────────────────────────────────────────┤ ← location slot
│  ✓ Shared page updated — recipients keep the same link.      │ ← actionFeedback status band
└─────────────────────────────────────────────────────────────┘
```

**FIRST-PUBLISH STATE (`summary` null/unpublished) — `GeneratePanel` replaces `LinkPanel`:**
```
┌─────────────────────────────────────────────────────────────┐
│  Shared link                                              [X]│
│  View-only project page for 108 Maple St. renovation         │
├─────────────────────────────────────────────────────────────┤
│  Share this project                              [○ Not shared]│
│  Generate a view-only link your client can open without an   │ ← receiver-consequence copy
│  account. You choose which estimate sheets they can see.     │
│  ESTIMATES THE CLIENT WILL SEE                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ ☑ Kitchen renovation — base estimate      (scrolls)    │ │ ← SheetPickerList, max-h-240
│  │ ☑ Bathroom — fixture upgrade                            │ │
│  │ ☐ Living room — lighting plan                           │ │
│  └────────────────────────────────────────────────────────┘ │
│  2 of 3 sheets selected. Only checked sheets reach the client│
│  (Optional: Access & privacy for password, location, expiry.)│
├─────────────────────────────────────────────────────────────┤ ← footer slot
│  [↻ Generate shared link]              (single dominant CTA) │
├─────────────────────────────────────────────────────────────┤ ← location slot
│  (empty until action)                                        │
└─────────────────────────────────────────────────────────────┘
```

## 7. Component inventory (new/changed — target files)

| Component | Purpose | File |
|-----------|---------|------|
| **`SectionLabel`** | Replaces all 16 hand-typed `text-[9px]` uppercase eyebrows. Flex row: optional icon + label (11px/600/secondary) + trailing slot (dirty warning, pending pill). `border-t` above so it doubles as the section divider. The ONLY section-header style. | `src/components/ui/section-label.tsx` (new) |
| **`LinkPanel`** | Dominant published block: `SectionLabel` "Shared link" + URL `ControlInput` at 15px + Copy/Open + status/password pills at 11px. Replaces inline `:836-885`. Single surface. | `src/components/workshop/publication/LinkPanel.tsx` (new) |
| **`GeneratePanel`** | First-publish focal block (PROB-01): headline + receiver consequence + inline `SheetPickerList` (`max-h-[240px]`) + single dominant Generate in footer. What the modal opens to when `summary` is null. | `src/components/workshop/publication/GeneratePanel.tsx` (new) |
| **`ContentTab` / `EstimatesTab` / `AccessTab`** | Extract the inlined tab JSX (`:799-1037`) so each tab is independently redesignable/testable (PROB-17). Single surface, `SectionLabel` + rhythm, no nested tiles. | `src/components/workshop/publication/*.tsx` (new) |
| **`SharedLinkModalTabs`** | Modal-appropriate active affordance (PROB-28): 2px ink underline + ink label, inactive in secondary (not the file-folder grey that merges with the tabpanel). Preserves the correct ARIA tablist contract. | `src/components/workshop/publication/SharedLinkModalTabs.tsx` (new, wraps/forks tab-strip) |
| **`DestructiveActionConfirm`** | Extract the inlined 2nd `<Modal>` (`:1194-1229`) into `action`/`onConfirm` props (PROB-16). Uses footer slot, `alertdialog` role, Cancel `initialFocus`. | `src/components/workshop/publication/DestructiveActionConfirm.tsx` (new) |
| **Primitive token bump** (edits, not new) | `DialogTitle` 11→13px; `DialogDescription` `text-tertiary→text-secondary` (PROB-02); `ControlField` label/helper `text-tertiary→text-secondary` + 9→10px; `ControlInput` base `!text-[10px]→!text-[12px]`. Token-level lifts for the whole modal/app. | `dialog.tsx`, `control-input.tsx` |

## 8. Resolves
`PROB-02`, `PROB-03`, `PROB-14`, `PROB-15`, `PROB-20`, `PROB-28`, `PROB-29` (+ `PROB-13` as an owner decision). RC-04, RC-10.

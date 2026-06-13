# 17 — Frontend Build Spec: Templates Surfaces

**What this is:** An implementable UX/visual build spec (decisions + concrete design direction, no code) for the two Templates surfaces, grounded in `DESIGN.md`, [02_UX_UI_AUDIT.md](02_UX_UI_AUDIT.md) (UX-1..UX-11 + the 3 DS violations), and the live browser observations. Every item is tied to the component file it touches; sizes/radii/weights are stated so they're verifiable against the tokens.

**Written for the post-D-C target** ([08](08_SOLUTIONS_AND_OPTIMIZATIONS.md) U3): the library route shows **template-class sources only** (custom now, suppliers later); the in-estimate panel keeps custom + project sources. As of HEAD the library route still renders the inert Projects section — Part C assumes U3 has removed it.

**Token vocabulary** (from `DESIGN.md`, all in `globals.css`): text `ink`/`secondary`/`tertiary`; surfaces `surface`(#FFF)/`surfaceMuted`(#F5F5F5)/`canvas`; `hairline`/`divider`(#F2F2F2); functional `success`/`warning`/`danger`(+`*Soft`); radius `rounded-xs`(3px) only; SF Pro, weights 400/500, sizes ≤12px, zero tracking, Phosphor regular.

---

## Part A — Shared decisions (bind both surfaces)

### A1. Section model (how "Suppliers" slots in)
Both surfaces use one primitive: a **collapsible section header** (label + count + optional action) over a tree/gallery body — the seam future Suppliers drops into with no structural change.
- **Library route** sections: `Custom Templates` → (future) `Supplier Templates`. **No Projects** (D-C/U3).
- **In-estimate panel** sections: `Custom Templates` → `Projects` → (future) `Suppliers`.
- Header spec: 28px row (`h-7`); label 9px medium `text-tertiary`; trailing count 8px `text-tertiary` tabular-nums; caret = Phosphor `CaretRight`/`CaretDown` 12px regular. The header is a `role="treeitem"` row (already true), so keyboard nav + the future section inherit behavior.
- **Data-driven sections:** model as `sections: { id, label, count, render }[]` so Suppliers is a config entry, not a new branch. Do **not** render an empty Supplier header — gate on `supplierTemplates.length > 0 || supplierFeatureEnabled` (no dead affordance).

### A2. Design-system corrections (both surfaces)
| Issue | File:line | Decision |
|---|---|---|
| `info` badge tone off-palette (no `--info` token — verified zero in `globals.css`) | `component-library/index.tsx:437`; `ui/badge.tsx:4,19` | **Delete the `info` tone**; "Live source" → neutral chip `border-hairline bg-surfaceMuted text-secondary` + a 6px `success` dot (A3). Remove `info` from `BadgeTone` so it can't regress. |
| Accent well on project-source preview | `index.tsx:416` | `bg-accent-soft text-accent` → `bg-surfaceMuted text-tertiary`; keep `StackSimple` 18px. |
| Unicode `⋯` | `TemplateGallery.tsx:138` | Phosphor `DotsThree` 12px. |
| Unicode `×` | `TemplatePreviewDock.tsx:111` | Phosphor `X` 11px (matches `index.tsx:178`). |
| `Badge min-w-[96px]` | `ui/badge.tsx:31` | Drop the fixed min-width (stretches chips in the 360px panel); size to content (verify no consumer relies on it). |

### A3. Freshness signal (read-through "Live source" + Refresh) — unified semantics
Read-through = no cached copy, so true "stale" can't happen mid-session, but a source can change between loads. Signal set:
- **Live chip:** neutral chip "Live source" + 6px `success` dot — "reads through to the current project."
- **Read-through chip:** second neutral chip "Read-through" (no dot).
- **Refresh:** rename the bare button to icon+text `ArrowsClockwise` 12px + "Refresh" (`Button variant="outline" size="xs"`). On click: spin the icon, dim the live dot to `tertiary` in-flight, restore `success` on success (no toast needed).
- **Last-checked line:** under the chips, 8px `text-tertiary` "Checked 2:14 PM" (via existing `formatPreviewDate`) — the only honest staleness cue in a read-through model.

### A4. Transient feedback = the existing toast system (never a layout-shifting banner)

The app already ships a first-party toast — `useToast()` / `ToastProvider` (`src/components/ui/toast.tsx`, mounted in `app/providers.tsx`, already used by `EstimateTabStrip.tsx:85` and `EstimateSheetTree.tsx:233`). **Reuse it — do not build a new toaster and do not add a toast dependency.** Decision for both surfaces:
- **Errors** (outline / source / search load failures, mutation failures) → `toast.error(safeMessage)` — **never** an inline banner (the current `index.tsx:1068-1128` banners push the tree down). Safe message via the `toUserError` mapper ([08](08_SOLUTIONS_AND_OPTIMIZATIONS.md) U1b); never the raw `{code…}`.
- **Action confirmations** (added / saved / removed) → `toast.success(...)`, replacing the inline `lastActionMessage` div (`index.tsx:755`); keep one `role="status"` live region for a11y parity.
- **Loading is NOT a toast** — it's in-place skeleton (B3/B5/U23), so the tree never jumps.

Net: transient feedback overlays; the layout stays put.

---

## Part B — Surface 1: In-estimate Templates panel
Files: `component-library/index.tsx` (`EstimateRightSidebar:656`, `ProjectSourcePreviewPanel:382`, `PreviewPanel:122`), `tree/TemplatesTree.tsx`.

### B1. Information hierarchy (top→bottom)
1. Tab bar `[Components | Templates]` (`TreePanelHeader`) — unchanged.
2. Source filter `[All sources | Custom templates | Project sources]` (`:1187`) — render only when both classes exist (gated `:1190`); add `Suppliers` pill when supplier data lands.
3. Scope filter `[All projects | Current project only]` (`:1134`).
4. Refresh (`:1165`) — **relocate inline** next to the scope filter on one 28px row (they currently stack as two `mb-2` blocks, eating vertical space at 360px).
5. Tree (Custom Templates w/ ₱ totals → Projects lazy).
6. Preview dock (bottom, `border-t border-hairline`).

**Density fix:** the stacked status/filter/scope/refresh blocks (`:1960-1964`) consume ~120px before the tree. Collapse to ≤2 rows; move transient status into an overlay strip on the tree top (B4) rather than pushing the tree down.

### B2. Preview dock (the live-source spec) — `ProjectSourcePreviewPanel:382`
Keep the `detailRows` model (`:401-410`) — it's the parity target for the route. Refinements:
- Header: 56px well (`bg-surfaceMuted text-tertiary`), `StackSimple` 18px; title 11px medium `text-ink`; type 9px `text-tertiary`; close = `X` 11px.
- Chips row: neutral "Live source" (+success dot) + "Read-through" (A3) + "Checked HH:MM".
- Spec `dl` (`grid-cols-[72px_1fr]`, 9px, `dt text-tertiary`/`dd text-ink font-medium truncate`), field order: **Project · Estimate · Estimate code · Tab · Node path · Last updated · Rows · Total** (rows/total tabular-nums).
- Source outline: keep the `bg-surfaceMuted/20` block; **fix the `uppercase tracking-normal` "Source outline" label** (DESIGN mandates zero tracking/no uppercase micro-labels) → plain 9px `text-tertiary` medium.
- Insert CTA: full-width 24px; disabled copy "Select group". For non-insertable kinds use a single `border-hairline` dashed hint (not the double-decorated `border-dashed … bg-surfaceMuted/30`).

### B3. States — complete set
| State | Treatment | Anchor |
|---|---|---|
| Empty (no project sources) | `EmptyState`, `StackSimple` 18px, "No project sources" + body | extend `:1064` (currently loading/error only) |
| Loading — initial dataset (3–6s) | structural skeleton, see B5 | tree body |
| Loading — lazy (estimates/outline) | **no spinner**: prefetch-on-hover (U23) makes the common path instant; on a cold expand, render **skeleton rows in place** sized to the expected child count (no `ArrowsClockwise` spin, no overlay), behind a 150ms gate → **zero layout shift** | `:1081`; U6/U23 |
| Partial | show estimate rows immediately; outline rows stream under a per-node 16px skeleton line | `handleTemplatesToggle:1714` |
| Error (UX-6) | **never render `error.message`/`{code…}`**; surface via the existing **`toast.error(safeMessage)`** (A4) — **not** an inline banner that shifts the tree; safe copy via `toUserError`; keep a `role="status"` live region for a11y; raw error → `console.error` only | `:1107-1113`, `:1091-1097`, `:1072-1078`; A4/U1b |
| Stale/freshness | A3 chips + "Checked HH:MM" + Refresh | dock + filter row |

**UX-6 concrete rule:** one helper `toUserSourceError(scope: "dataset"|"estimates"|"outline"|"search"): string`; all five error branches call it → no DB shape ever reaches the DOM, copy centralized.

### B4. Drag-drop, keyboard, SR announcements — `TemplatesTree.tsx` + `ui/tree.tsx`
The shared `Tree` already has keyboard nav (`tree.tsx:935-1001`) + ARIA (`role="treeitem"`, `aria-level/setsize/posinset/expanded/selected/current` `:1033`). Missing (UX-4/UX-5):
- **Non-drag insert path:** every draggable row (template, template-node, project tab/node, category) exposes a focusable "Add to estimate" action reachable by Tab/Enter, not only the drag handle; categories get a context-menu "Add all to estimate".
- **`aria-grabbed`/`aria-dropeffect`:** set `aria-grabbed=true` on drag start (`handleProjectSourceDragStart:1843`, `handleTemplateDragStart:1807`), clear on dragend; `aria-dropeffect="copy"` on valid targets while dragging (these are copy-inserts).
- **Live region:** reuse the existing `lastActionMessage` `aria-live` region (`index.tsx:2162`); announce "Grabbed {name}…" on drag start and "Added {name} to {group}." on drop (the `setLastActionMessage` calls at `:1336,:1374` already write success copy).
- **Drag ghost:** drop the `shadow-lg` (`:1800` etc.) → `border border-hairline bg-white`, no shadow (flat-elevation discipline).

### B5. Perceived-performance — the 3–6s skeleton
(Visual treatment; the data fix is U5/U6 / lane-4 findings.)
1. **Structural skeleton, not a spinner:** render real chrome immediately (header, tabs, search, filter pills); skeleton only the tree body — 8–10 `Skeleton` rows at the real 28px height + real indent so no reflow when data lands (reuse the `TemplatesBrowseFallback` skeleton).
2. **Progressive reveal:** custom templates (server props, `:669`) render instantly; only the **Projects** section skeletons while `listReusableProjectSources` resolves — the two sections must not block each other (today the whole tab waits).
3. **Stable headers during load:** show "Projects" header with an inline spinner immediately.
4. **Crossfade** skeleton→content 120ms, no layout shift.
5. **150ms delay-gate:** never flash a skeleton on warm loads (<200ms resolution).

### B6. Component preview parity — `PreviewPanel:122`
On-brand. Nits: the qty `<input>` (`:210`) at 9px is below the 10px control floor — verify it's a deliberate compact stepper not smaller than its label; replace `text-secondary/70` description alpha (`:194`) with `text-tertiary` (a real token).

---

## Part C — Surface 2: Templates library route (post D-C/U3)
Files: `TemplatesBrowseManager.tsx`, `TemplateGallery.tsx`, `TemplatePreviewDock.tsx`, `TemplatesBrowsePageClient.tsx`, `page.tsx`, `project-source-browse-tree.tsx` (delete).

### C1. Hierarchy & section model
Three-pane: left tree (sections) · center gallery · right preview dock.
- **Left tree:** `All Templates` → categories → templates. **Remove the Projects branch** — drop `...buildProjectSourceBrowseTreeNodes(projectSources)` (`:130`), the `projectSources` prop/state/loaders (`:602-704`), delete `project-source-browse-tree.tsx`; `page.tsx` stops fetching `listReusableProjectSources` (`:13-16`).
- **Future Suppliers:** a sibling top-level tree root "Supplier Templates" beside "All Templates" (each with its own category subtree). `buildBrowseTreeNodes` already returns an array of roots — Suppliers is one more root, gated on data. This is the seam U3 preserves.
- **Gallery scope label** reflects the selected tree node.

### C2. Preview dock parity (UX-3) — `TemplatePreviewDock.tsx`
Bring to parity with the in-estimate spec list (custom templates only here): add a metadata `dl` above the structure outline — **Category · Last updated · Groups · Areas · Rows · Total** (reuse `summarizeEstimateTemplate` + a template `updatedAt`), same `grid-cols-[72px_1fr]` 9px pattern. Title 11px medium (demote from 12px to match the in-estimate dock; keep the financial total at 12px). Close `×` → Phosphor `X`.

### C3. The misleading caret (UX-7) — `TemplateGallery.tsx:128`, `TemplatePreviewDock.tsx:160`
"Insert into estimate" carries `CaretDown` but opens a modal picker. **Drop the caret** (carets are reserved for true popover menus); keep the label; the modal is the correct pattern.

### C4. States
| State | Treatment | Anchor |
|---|---|---|
| Empty (zero templates) | simplify the tree empty-state guard to `templates.length === 0` (`:502`); gallery `EmptyState` + "New template" CTA already exists (`TemplateGallery.tsx:284`) — keep consistent (same icon/copy) |
| Loading (route) | `TemplatesBrowseFallback` (`TemplatesBrowsePageClient.tsx:16`) — **remove the project-source skeleton rows** with U3; keep tree+gallery skeletons; apply the 150ms gate + crossfade |
| Partial | N/A after U3 (route is fully server-rendered from `getCurrentWorkspaceEstimateTemplates`) |
| Error | **remove** the project-estimate/outline error banners (`:534,544`) with U3; remaining surface = gallery status strip (`TemplateGallery.tsx:253`, already `role="status"`); route mutation-error fallbacks (`:769` etc.) through a `toUserTemplateError()` helper (no raw server text) |
| Stale | N/A (no read-through here after U3; `router.refresh()` is the freshness mechanism) |

### C5. Drag / keyboard / SR — route tree
Route drag = move template between category folders; the non-drag path exists (context-menu "Move to group…" `:407`). Refinements:
- **Replace `window.prompt`** (`moveTemplatePrompt:819`, `renameTemplate:753`, `renameCategory:832`) — native prompt is a DS escape hatch (no SF Pro/tokens/focus mgmt). Use a small in-DS modal (reuse `index.tsx:2189` / `ui/overlays`).
- `aria-grabbed`/`aria-dropeffect` + a live region "Moved {template} to {group}." (shared `ui/tree.tsx` fix serves both surfaces; add a live region near the gallery).
- After U3, remove the now-dead `project-section`/`project-source` guards in `contextMenuGroups` (`:343`). Keep `handleCanDrag` (template-only `:314`) and `handleCanDrop` (`:319`).

### C6. Gallery polish — `TemplateGallery.tsx`
`⋯`→`DotsThree` (A2); keep `border-ink` selected (`:64`) and the compliant 8px chips (`:102`).

---

## Part D — Motion (both surfaces)
Restrained, token-aligned, no decorative depth.
- Skeleton→content: 120ms opacity, no transform/shift.
- Refresh icon: rotate 360°/600ms linear in-flight; live-dot `success`↔`tertiary` 150ms.
- Tree expand/collapse: ≤120ms height/opacity, no spring.
- Drag: keep the existing 2px `bg-primary` drop rail (`tree.tsx:922`) + 24px root-edge `bg-surfaceMuted` zone (`:916`) — on-brand.
- Preview dock open: ≤150ms slide/opacity; respect `prefers-reduced-motion` (instant).
- **No** hover shadows, scale-on-hover, or glow. Selection = border/`surfaceMuted` only.

---

## Part E — Responsive
**Library route (three-pane):** `≥lg` left tree (216–432, default 272) · gallery (flex) · dock (360–560, default 380) on selection. `md`: dock **overlays** as a right sheet (gallery stays primary); tree collapsible. `<md`: tree → drawer (toggle in `TreePanelHeader`), dock → bottom sheet, gallery full-width. The fallback already hides the tree `<lg` (`TemplatesBrowsePageClient.tsx:25`) — promote to a real drawer toggle (the audit flagged narrow behavior as unverified).
**In-estimate panel:** itself the right dock (`ResizableSidePanel` 360–560). Internally cap the preview dock at `max-h-[45%]` with internal scroll so the tree never collapses. At ≤320px width the source-filter pills wrap gracefully (`flex-1 min-w-0`); verify Refresh drops below scope rather than overflowing.

---

## Part F — Design-system compliance checklist (verifiable by grep/inspection)
**Typography:** no app size >12px (12px only: route dock title + total; in-estimate dock titles 11px) · weights 400/500 only (`font-semibold|font-bold` → 0) · zero tracking (remove `uppercase tracking-normal` at `ProjectSourcePreviewPanel:459`) · no `text-secondary/70` alpha (`PreviewPanel:194`).
**Color:** `info` tone deleted (`border-info|bg-info|text-info` → 0) · "Live source" = neutral chip + `success` dot · no `bg-accent-soft text-accent` wells (`index.tsx:416`) · functional colors carry meaning only.
**Shape:** `rounded-xs` only (`rounded-(sm|md|lg|xl|full)|rounded\b` → 0).
**Icons:** no literal Unicode UI glyphs (`⋯|×|✕|⌄` → 0) · all Phosphor `weight="regular"`.
**Elevation:** no `shadow-lg/xl` on persistent chrome or drag ghosts (`index.tsx:1800,1814` ghosts); modals/overlays may keep subtle elevation.
**A11y:** every drag has a focusable non-drag equivalent (B4/C5) · `aria-grabbed`/`aria-dropeffect` on shared `Tree` rows · one `aria-live="polite"` region per surface · all error banners `role="alert"` with **no** raw server text (`toUser*Error`) · `window.prompt` replaced by in-DS modals (C5).

**Highest-leverage single fix:** the shared `ui/tree.tsx` — adding `aria-grabbed`/`aria-dropeffect` + a grab-announcement hook closes the drag-a11y gap (UX-5) for **both** surfaces at once.

---

## Evidence used
`DESIGN.md`; `src/components/workshop/component-library/index.tsx` + `tree/TemplatesTree.tsx`; `templates-browse/{TemplatesBrowseManager,TemplateGallery,TemplatePreviewDock,TemplatesBrowsePageClient}.tsx` + `project-source-browse-tree.tsx`; `src/app/workshop/library/templates/page.tsx`; `ui/badge.tsx`, `ui/tree.tsx`; `src/app/globals.css` (verified no `--info` token); live authenticated browser session (the 3–6s skeleton, the raw-error banner, the panel structure).

## Truth & integrity
- **VERIFIED:** the DS violations (no `--info` token confirmed by grep; Unicode glyphs; accent well; `min-w-[96px]`), the `detailRows` parity model, the shared-`Tree` a11y gap, and that the library route **still renders project sources at HEAD** (U3/D-C not yet implemented — this spec targets the post-U3 state).
- **ASSUMPTION / manual-proof-pending:** the responsive breakpoints below `lg` were reasoned from `DESIGN.md` + the fallback's `lg` gate, not exercised live; exact motion timings are design direction to validate in-browser.

# 02 — UX / UI Audit

**Lens:** Information architecture, surface consistency, state coverage, accessibility, design-system compliance, copy. Evidence is `file:line`; live observations are from the authenticated browser session. Findings are labelled VERIFIED (read in source / seen live) or ASSUMPTION.

**Headline:** The two surfaces that show project-derived sources behave **very differently** — the in-estimate panel gives them rich preview + (disabled) actions, while the route-level browse renders them **completely inert**. Combined with the live outline 500 ([07](07_FUNCTIONAL_DEFECTS_AND_COMPLETENESS.md)), the feature's promised "browse projects as templates" value is not deliverable to users today.

---

## Surface inventory

| Surface | Owner (file:line) |
|---|---|
| Route browse data load | `src/app/workshop/library/templates/page.tsx:10` |
| Browse client + dynamic import + skeleton | `templates-browse/TemplatesBrowsePageClient.tsx:9` |
| Browse manager (state, tree, modals, lazy loads) | `templates-browse/TemplatesBrowseManager.tsx:181` (tree), `:589` (manager) |
| Center gallery (rows, search, empty states) | `templates-browse/TemplateGallery.tsx:173` |
| Right preview dock (custom templates only) | `templates-browse/TemplatePreviewDock.tsx:71` |
| Project-source tree builder (route browse) | `templates-browse/project-source-browse-tree.tsx:197` |
| Insert-into-estimate picker (modal) | `templates-browse/InsertIntoEstimatePicker.tsx:35` |
| Template editor / center sheet / structure tree | `template-editor/TemplateEditorClient.tsx:49`, `TemplateEditorSheet.tsx:555`, `TemplateStructureTree.tsx:75` |
| In-estimate dock + Templates tree | `component-library/index.tsx:656` (`EstimateRightSidebar`), `tree/TemplatesTree.tsx:601` |
| In-estimate project-source preview | `component-library/index.tsx:382` (`ProjectSourcePreviewPanel`) |
| New-template modal | `component-library/NewTemplateModal.tsx:56` |

---

## Findings

| ID | Sev | Surface | Finding | Evidence | Impact | Fix |
|---|---|---|---|---|---|---|
| UX-1 | **P1** | Route browse | Project-derived sources are **inert**: clicking a project/estimate/tab/node only toggles expansion — no select, no preview, no context menu, no drag. **Confirmed live** (clicking "Lewis Residence" left the gallery unchanged; right-click produced no menu). | `TemplatesBrowseManager.tsx:288-290` (`handleRowClick` ignores `project-source`), `:343` (context menu returns `[]`), `:933` (preview dock only for `selectedTemplate`); `project-source-browse-tree.tsx:227,237,247,257` (`draggable:false`) | The feature's core promise is non-functional on the dedicated route — users see projects but can do nothing with them. | Per **D-C** (decided 2026-06-13), **remove** project sources from the library route entirely (see [08](08_SOLUTIONS_AND_OPTIMIZATIONS.md) U3) — the library shows template-class sources only (custom + future supplier). |
| UX-2 | **P1** | Cross-surface | The two Templates surfaces **diverge sharply** for project sources: in-estimate gives rich preview, (disabled) "Add to estimate", "Save as template", drag, scope/refresh; route browse gives **none**. | in-estimate `index.tsx:382-484, :1416, :1843`; route browse `TemplatesBrowseManager.tsx:343` | Users who learn one surface find the other silently does less — erodes trust in the "unification". | Per **D-C**, the surfaces are **intentionally different**: remove project sources from the library route (U3); keep the full project-source experience in the in-estimate panel. |
| UX-3 | P2 | Preview dock | `TemplatePreviewDock` shows **no** live-source metadata for project sources (never renders for them) and, even for custom templates, omits updated-date / row-count. The in-estimate panel already computes project/estimate/tab/node path + updated + rows + total. | `TemplatePreviewDock.tsx:115-139`; contrast `index.tsx:401-410` | Origin-plan requirement (preview shows path/updated/rows/total) unmet on the route. | Reuse the in-estimate `detailRows` model in the dock. |
| UX-4 | P2 | Editor structure tree | Drag-to-reorder nodes has **no keyboard/menu equivalent** — the structure-tree context menu offers only Add/Rename/Delete. | `TemplateStructureTree.tsx:164-235` (no reorder item); drag at `:257-260`; contrast browse non-drag move `TemplatesBrowseManager.tsx:405-411` | Keyboard-only users cannot reorder template structure — violates the project's "every drag has a non-drag path" rule. | Add "Move up/down" / "Move to group…" items calling `onMoveNode`. |
| UX-5 | P2 | All trees | **No screen-reader announcements** for drag operations; the shared `Tree` has keyboard nav but no `aria-grabbed`/`aria-dropeffect` and no live-region narration of drops/moves. | `src/components/ui/tree.tsx:933-1001` | Assistive-tech users get no feedback on moves. | Add a polite live region announcing "Moved X to Y". |
| UX-6 | P2 | Error surface | The project-source outline error renders the **raw DB error object** to the user (*"Couldn't load estimate outline. {code: …, details: Null, hint: …, message: …}"*) — confirmed live. The banner is also a plain `div` (no `role="alert"`). | `component-library/index.tsx` outline-error render (`[source.estimateId]: error instanceof Error ? error.message : …`); `TemplatesBrowseManager.tsx:534,544`; **observed live** | Leaks internal schema/error shape; unhelpful and unfriendly; not announced to AT. | Surface via the **existing toast** (`useToast()`, `ui/toast.tsx`), **not** an inline banner that shifts the tree; map to a user-safe message; never surface raw `{code,hint,message}`; keep a `role="status"` live region for AT. (Owner directive — [17](17_FRONTEND_BUILD_SPEC.md) A4; pairs with the [07](07_FUNCTIONAL_DEFECTS_AND_COMPLETENESS.md) root-cause fix.) |
| UX-7 | P3 | Gallery / dock | "Insert into estimate" buttons carry a `CaretDown` implying a dropdown, but open a full modal picker. | `TemplateGallery.tsx:128`, `TemplatePreviewDock.tsx:160` | Misleading affordance. | Drop the caret or make it a real dropdown. |
| UX-8 | P3 | New-template modal | Pluralization bug: always "groups · areas · rows" even at count 1; the gallery already fixed this with `formatCount`. | `NewTemplateModal.tsx:177`; correct impl `TemplateGallery.tsx:24-30` | Polish gap / inconsistency. | Reuse `formatCount`. |
| UX-9 | P3 | Helpers | Dead code `buildTemplateNavigationTree` / `getTemplatesForTreeNode` (never imported), carrying the same plural bug. | `templates.ts:184,205,213` (zero importers) | Maintenance noise + latent bug. | Delete both. |
| UX-10 | P3 | Modal | "Group" label/placeholder over the template **category** field collides with the structural "group" concept. | `NewTemplateModal.tsx:200-213` | Term collision raises cognitive load. | Relabel to "Category" consistently. |
| UX-11 | P3 | Insert picker | "No group to insert under" error only appears on submit, after project+estimate are chosen. | `InsertIntoEstimatePicker.tsx:103-105` | Late failure. | Surface group availability on estimate selection. |

Action affordances are otherwise **correct**: project sources never expose rename/delete/category ops; custom templates expose the full set (`TemplatesBrowseManager.tsx:383-438`, `tree/TemplatesTree.tsx:807-836`).

---

## Design-system violations (DESIGN.md)

| File:line | Violation | Rule | Fix |
|---|---|---|---|
| `component-library/index.tsx:437` (+ `ui/badge.tsx:4,19`) | `<Badge tone="info">Live source</Badge>` resolves to `border-info`/`bg-info/10`/`text-info`, but **no `--info` token exists** in `src/app/globals.css` (zero matches). | Color discipline — palette is neutral + success/warning/danger only; `info` is off-palette. | Use a neutral chip (`border-hairline`/`bg-surfaceMuted`/`text-secondary`) or define `info` as an approved token. |
| `component-library/index.tsx:416` | Project-source preview icon well uses `bg-accent-soft text-accent` where a neutral well (`bg-surfaceMuted`) is the documented norm. | Avoid decorative accent fills. | Use `bg-surfaceMuted`. |
| `TemplateGallery.tsx:138`, `TemplatePreviewDock.tsx:111` | Close/overflow glyphs use literal Unicode `⋯` / `×` instead of Phosphor `DotsThree` / `X`. | App icons must be Phosphor regular. | Swap to Phosphor icons. |

No font-size (>12px), radius (non-`rounded-xs`), letter-spacing, or bold-weight violations were found in the template surfaces (verified by grep).

---

## State coverage

Empty, loading (route `loading.tsx` + dynamic skeleton + gallery empty states), and error states exist and are mostly on-brand. Gaps: the raw-error leak (UX-6), missing AT announcements (UX-5, UX-11), and **no "stale/last-refreshed" signal** on project sources beyond the "Live source / Read-through" badge on the in-estimate panel (none on the route). The manual **"Refresh project sources"** control (seen live) is the only freshness affordance — consistent with the read-through design but undiscoverable as the *only* way to pick up source changes.

---

## Top 5 UX wins (impact / effort)

1. **Remove project sources from the library route** (UX-1/UX-2, per **D-C**) — the cleaner resolution: the library curates template-class assets only (custom + future supplier); projects live in the in-estimate panel. Low-risk deletion ([08](08_SOLUTIONS_AND_OPTIMIZATIONS.md) U3) that also erases the inert-rows problem.
2. **User-safe errors via the existing toast** (UX-6) — stop leaking raw DB errors *and* stop the inline banners from shifting the layout; route through `useToast()` ([17](17_FRONTEND_BUILD_SPEC.md) A4). Pairs with the U1 root-cause fix.
3. **Surface-parity preview dock** (UX-3, UX-2) — reuse the in-estimate `detailRows` model on the route.
4. **Keyboard reorder in the editor structure tree** (UX-4) — small menu addition closes a drag-only a11y hole.
5. **Cleanups** (UX-7/8/9/10) — drop caret, fix plural, delete dead code, relabel "Group" → "Category".

---

## Evidence used

`src/components/workshop/library/templates-browse/*`, `template-editor/*`, `component-library/index.tsx` + `tree/TemplatesTree.tsx`, `ui/badge.tsx`, `ui/tree.tsx`, `src/app/globals.css`, `DESIGN.md`; live authenticated browser session (estimate page + `/workshop/library/templates`).

## Truth & integrity

- **VERIFIED:** UX-1 (also live), UX-2/3/4/5/7/8/9/10/11, UX-6 (also live), all three DS violations.
- **ASSUMPTION:** responsive collapse below `lg` (skeleton hides the tree below `lg` in `TemplatesBrowsePageClient.tsx:25`, but the live manager's narrow-viewport behaviour was not exercised); rendered appearance of the off-palette `info` badge.

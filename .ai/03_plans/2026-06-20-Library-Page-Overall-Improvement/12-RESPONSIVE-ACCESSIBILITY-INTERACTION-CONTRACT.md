# 12 - Responsive Accessibility Interaction Contract

## Responsive Model

Boundaries bind to this project's Tailwind v4 breakpoints (defaults — no custom
`@theme` `--breakpoint-*` override exists). The breakpoints below are the
responsive-contract TARGETS for the library surfaces, not a verified-current
inventory: library surfaces already use `sm:` today (e.g.
`src/components/workshop/library/overview/LibraryOverview.tsx:268` =
`grid-cols-2 sm:grid-cols-3 lg:grid-cols-6`) alongside `md:` and `lg:`. The named
classes below map to: `sm` 640px / `md` 768px / `lg` 1024px / `xl` 1280px / `2xl`
1536px.

| Width Class | Range (min-width) | Tailwind prefix | Layout |
| --- | --- | --- | --- |
| Desktop/wide | >= 1280px | `xl` / `2xl` | Overview plus full component/template surfaces; inspector dock as right-side panel (`ComponentInspectorDock.tsx`). |
| Laptop | 1024px - 1279px | `lg` | Dense toolbar wraps; inspector dock may reduce content density but remains a side panel. |
| Tablet | 768px - 1023px | `md` | Primary list/card area with inspector dock as a drawer (`InspectorDrawer` from `ui/overlays/sheet-drawer.tsx`); toolbar filters collapse progressively. |
| Mobile | < 768px | base (below `md`) | Single-column browse; drawers for inspector dock/preview; sticky primary actions only when non-overlapping. |

Use `inspector dock` for the right-side surface in all widths; the only thing
that changes across breakpoints is whether it renders inline (>= 1024px) or as an
`InspectorDrawer` overlay (< 1024px). See 23-DESIGN-SYSTEM-COMPONENT-MAPPING.md for
the component mapping and 10-LIBRARY-SURFACE-SPECS.md for per-surface layout.

## Toolbar And Filter Behavior

- Search remains visible before secondary filters.
- Applied filters show as chips or compact summary (Phase 1 — Findability &
  Applied Filters). Filter on `category` (free-text taxonomy, required axis) and
  on `folder` (`libraryFolderId`, optional org axis) are DISTINCT chips; never
  conflate the two.
- Reset filters remains reachable without opening every filter control.
- Bulk actions appear only when rows are selected and permission allows them.
  The Library bulk toolbar is `src/components/workshop/BulkActionToolbar.tsx`;
  `src/components/ui/bulk-action-toolbar.tsx` is a SEPARATE shared primitive (a
  different file, not the same component). Permission = `is_workspace_editor`
  (owner/admin/member); viewer sees no write actions.
- Long labels wrap or truncate with accessible names; they do not overflow
  buttons.

## Keyboard Contract

Required keyboard paths (each path names the DS pattern + primitive it runs on,
so the key map below is unambiguous):

- search overview and open a result — keyboard owner is the bespoke combobox in `LibraryOverviewSearch.tsx` (its own `role=combobox`/`listbox`/`option` markup + `handleKeyDown`), which fetches via the `searchLibraryOverview` action; it does NOT reuse `ui/creatable-combobox.tsx` — Phase 1
- move through component cards or rows (browse list/grid) — Phase 1/5
- open and close the inspector dock (`ComponentInspectorDock.tsx` inline panel, or `InspectorDrawer` overlay below `lg`) — Phase 0B route state via `?component=<id>`
- switch card/dense mode (density toggle) — Phase 5, see net-new note below
- reset filters (applied-filter chips + reset control) — Phase 1
- create/rename/delete a folder (text-prompt dialog = inline `ConfirmDialog` + `<input>`, replacing the native `window.prompt`/`window.confirm` in `ComponentLibraryManager.tsx:1493/1515/1534`) — Phase 0B
- quick-add a valid component (Quick Add form in `AddComponentModal.tsx`) — Phase 3
- preview and insert a template (`resolveEstimateTemplateInsertTarget`; move uses `ui/creatable-combobox.tsx`) — Phase 4

Per-pattern key map (W3C ARIA Authoring Practices Guide — APG). Each library
pattern below maps to a concrete keyboard contract; implementers reuse the
matching DS primitive in 23-DESIGN-SYSTEM-COMPONENT-MAPPING.md rather than
re-deriving these keys:

| Pattern | Primitive | Keys |
| --- | --- | --- |
| Tabs (Components / Templates / Overview nav) | `ui/tabs.tsx` | `ArrowLeft`/`ArrowRight` move between tabs (automatic activation), `Home`/`End` first/last tab, `Tab` moves into the active tabpanel. |
| Combobox (overview search) | bespoke listbox in `LibraryOverviewSearch.tsx` (`role=combobox`/`listbox`/`option`) | `ArrowDown`/`ArrowUp` move through options (opens popup if closed), `Enter` selects, `Escape` closes — IMPLEMENTED today (`LibraryOverviewSearch.tsx:191-278`). NET-NEW for Phase 1 IF full APG parity is required: `Home`/`End` first/last option and `Tab`-accepts-focused-option are NOT in this handler yet (`handleKeyDown` at `LibraryOverviewSearch.tsx:182-215` covers only Arrow/Enter/Escape); the v1 contract above is the shipped subset. |
| Combobox (template-move) | `ui/creatable-combobox.tsx` | `Escape` closes, `Enter` selects first / creates — IMPLEMENTED today (`creatable-combobox.tsx:119-138`). NET-NEW for Phase 4: `ArrowDown`/`ArrowUp` option navigation, `Home`/`End`, and `Tab`-accepts-focused-option are NOT yet in `creatable-combobox.tsx` and must be added before this row's full APG contract holds (the input also drives `aria-activedescendant` only from `selectedId`, not arrow movement — see `creatable-combobox.tsx:93-96`). |
| Menu button (row/bulk action menus) | `ui/action-menu.tsx` / `ui/dropdown-menu.tsx` | `Enter`/`Space`/`ArrowDown` open the menu and focus first item, `ArrowUp`/`ArrowDown` move between items, `Home`/`End` first/last, `Escape` closes and returns focus to the button, `Tab` closes the menu. |
| Tree view (folder tree) | `ui/tree.tsx` (the shared `Tree` primitive; `LibraryFolderTree.tsx` / `library-folder-tree-shared.ts` CONSUME it — `LibraryFolderTree.tsx:17` imports `Tree`) | `ArrowUp`/`ArrowDown` move between visible nodes, `ArrowRight` expand (or move to first child), `ArrowLeft` collapse (or move to parent), `Home`/`End` first/last node, `Enter` activates the node, `*` (optional) expands all siblings. Single tab stop into the tree; roving `tabindex` inside. Keyboard is owned by `ui/tree.tsx` `handleKeyDown` (`:1018-1085`, the Arrow/`Home`/`End`/`ArrowRight`/`ArrowLeft` switch), with roving `tabIndex` 0/-1 (`:1136`), `role="tree"` (`:1275`), and `aria-expanded` (`:1132`) — the folder tree reuses this; do NOT re-implement these keys in `LibraryFolderTree.tsx` (whose only `keydown` listener, `:958`, is an Escape close for the view-mode menu, and whose `role="tree"` wrappers at `:1012`/`:1061` are the static supplier/brand lists, not the navigable folder tree). |
| Dialog / drawer (overlays, text-prompt dialog) | `ui/overlays/confirm-dialog.tsx`, `modal.tsx`, `sheet-drawer.tsx` | `Tab`/`Shift+Tab` cycle focusable controls WITH a focus trap, `Escape` closes/cancels when safe, `Enter` submits the default action from a non-textarea control. |

Rules:

- Tab order follows visual order.
- Escape closes the active overlay/drawer/inspector dock when safe (an
  unsubmitted dirty form first asks for the discard confirmation — see
  `AddComponentModal.tsx:963`, which Phase 0B re-points from native
  `window.confirm` to the inline `ConfirmDialog`).
- Enter/Space activates focused buttons and checkboxes.
- Focus is returned to the trigger after close or cancel (overlay primitives in
  `ui/overlays/` manage focus return). The exact test file + command + pass
  criterion + owner/phase for each keyboard and focus-return path is
  pre-registered per path in 24-EXECUTION-EVIDENCE-LEDGER.md (and mirrored in
  06-QA-AND-VALIDATION-PLAN.md) — see the keyboard-path evidence table there;
  do not invent the mapping. Representative pre-registered rows: folder-tree
  roving-tabindex + Arrow nav -> `vitest run tests/vitest/library-folder-tree-keyboard.test.tsx`
  (criterion: ArrowDown moves focus to next visible node; only one node has
  `tabindex=0`; primitive `ui/tree.tsx`; owner Phase 0B); ConfirmDialog focus
  trap + return -> `vitest run tests/vitest/library-folder-prompt-dialog.test.tsx`
  (criterion: Tab cycles within the dialog; on close focus returns to the
  trigger via the opener restore; owner Phase 0B); overview-search combobox
  arrow nav -> `vitest run tests/vitest/library-overview-search.test.tsx`
  (criterion: ArrowDown sets `aria-activedescendant` to the first option per
  `LibraryOverviewSearch.tsx:265`; owner Phase 1).
- Destructive confirmation keeps focus inside the dialog (focus trap) until closed.

> Net-new dependency (Phase 5): the "switch card/dense mode" keyboard path
> depends on a density toggle that DOES NOT EXIST in the codebase yet. It is
> net-new Phase 5 work (Dense Maintenance Mode & Browser-Proven Polish) — see
> the CANONICAL PHASE MAP in 19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md.
> Until that toggle ships, this path is a forward contract, not a current
> requirement; do not gate Phase 0B-4 keyboard QA on it.

## Screen Reader Contract

Accessible names must include:

- component name (`cost_library_items.name`)
- price/unit when a row/card action depends on it (`unit_cost` + `unit`)
- freshness/confidence/lifecycle labels — derived, NOT literal columns: freshness
  from `getComponentPricingFreshness` (component-facet-filter.tsx) over
  `pricing_date`, "stale" = PRICING only past `COMPONENT_FACET_STALE_DAYS=90`;
  confidence is the free-text `confidence` column rendered as a derived badge;
  lifecycle from `lifecycle_state` (one of draft / in_production / available /
  discontinued / archived). See 11-SOURCE-TRUST-STATE-MATRIX.md.
- selected state
- destructive consequences (e.g. the archive confirmation hint; the copy fix
  branches the `BulkDestructivePreviewModal.tsx:107-108` `confirmationHint` on
  `actionCopy.verb` so archive does not show the irreversible-delete copy)
- target estimate/project for insert (`resolveEstimateTemplateInsertTarget`)

Live-region announcements (each gets an explicit `aria-live` politeness; the
default for status text is `polite` / `role="status"`, reserved `assertive` /
`role="alert"` only for errors and destructive results that must interrupt):

| Announcement | Politeness | `aria-live` / role |
| --- | --- | --- |
| Result count + scope after filter/search change | polite | `aria-live="polite"` / `role="status"` |
| Selected component/template opened from route (`?component=<id>`) or search | polite | `aria-live="polite"` / `role="status"` |
| Inspector dock / drawer closed | polite | `aria-live="polite"` / `role="status"` |
| Destructive action completed (bulk archive succeeded) | assertive | `aria-live="assertive"` / `role="alert"` |
| Insert success | polite | `aria-live="polite"` / `role="status"` |
| Insert failure / write error | assertive | `aria-live="assertive"` / `role="alert"` |
| Retry failure while context is preserved | assertive | `aria-live="assertive"` / `role="alert"` |

Whether each announcement above REUSES an existing live region or needs a
NET-NEW one, plus the test asserting its text and politeness, is pre-registered
one row per announcement in 24-EXECUTION-EVIDENCE-LEDGER.md. Reuse vs net-new is
already scouted: "Result count + scope after filter/search change" reuses an
existing `aria-live="polite"` region (the result-count `<p>` in
`component-facet-filter.tsx`; a `polite` region also exists at
`ComponentInspectorDock.tsx:271` for dock state), asserted by
`vitest run tests/vitest/library-facet-filter-announce.test.tsx` (criterion: a
filter change updates a `role="status"` node with the new count text; owner
Phase 1); "Destructive action completed (bulk archive succeeded)" is NET-NEW —
no `role="alert"` region exists in `BulkActionToolbar.tsx` today — its test
asserts an assertive announcement (owner Phase 0B/2). Do not announce every
badge update as a live event. Badges (freshness / confidence / lifecycle) carry
no `aria-live`; they should be readable as part of the row/card/inspector-dock
accessible name when the user reaches that content.

## Table Versus Grid Decision

This decision is Phase 5 work (Dense Maintenance Mode & Browser-Proven Polish,
per the CANONICAL PHASE MAP in 19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) —
it ships with the net-new density toggle, NOT before. The dense-row visual /
column spec it implements lives in 10-LIBRARY-SURFACE-SPECS.md; this section only
fixes the accessibility/interaction model, not the layout.

Default: use a native `<table>` when dense mode is read-mostly and row actions
are normal buttons/links. This is the expected Phase 5 default.

Use ARIA grid only if:

- cells become directly editable
- keyboard navigation inside rows/cells is essential
- the team accepts the additional focus-management and testing burden

If ARIA grid is used, implementation must follow the WAI-ARIA APG grid pattern:
one focusable composite in the page tab sequence (single tab stop), roving
`tabindex` inside, and managed focus movement (`ArrowUp`/`ArrowDown`/`ArrowLeft`/
`ArrowRight` move between cells, `Home`/`End` row start/end, `Ctrl+Home`/
`Ctrl+End` grid first/last cell).

Whichever is chosen, the dense card/table fallback REUSES the existing
virtualization infra — `WORKSHOP_VIRTUALIZATION_FLAGS` +
`@tanstack/react-virtual` in `src/lib/workshop/virtualization-flags.ts` — rather
than adding a parallel virtualizer (see 19, Performance Reality / 16).

Decision owner and gate: Philip (design lead) resolves the table-vs-grid branch
at Phase 5 entry. The default is the native `<table>` above; switching to ARIA
grid requires BOTH (a) a committed dense-edit requirement landed in
10-LIBRARY-SURFACE-SPECS.md (cells become directly editable) AND (b) explicit
owner sign-off, recorded in the Phase 5 `LOOP_LEDGER.md`. Absent both, ship the
`<table>` default — the ARIA-grid branch is the non-default option and must NOT
block Phase 5. The "the team accepts the additional focus-management and testing
burden" criterion above is satisfied only by Philip's recorded sign-off, not by
implementer judgment.

## Overlay Focus Rules

Overlays in scope use the real `ui/overlays/` primitives (no new overlay
primitive is introduced by this plan): `ConfirmDialog`/`ConfirmDialogMessage`
(`confirm-dialog.tsx`), `Modal`/`AppModal`/`BlurModal` (`modal.tsx`), and the
`Sheet`/`Drawer`/`SidePanel`/`InspectorDrawer` family (`sheet-drawer.tsx`). The
text-prompt dialog (folder create/rename)
is the inline `ConfirmDialog` + child `<input>` pattern from
`TemplatesBrowseManager.tsx:531-883` — there is NO standalone PromptDialog
primitive. Z-index tiers are the exact Tailwind classes `z-[1000]` (modal) /
`z-[1050]` (menu/popover) / `z-[1100]` (tooltip).

Every overlay must document:

- trigger
- initial focus
- close/cancel behavior
- submit behavior
- error focus
- focus return
- permission-denied handling (writes guard via `is_workspace_editor` RPC /
  `is_workspace_editor` RLS — role in owner/admin/member; viewer is read-only)
- concurrent-change handling

These are jsdom-asserted manually (ARIA roles, focus order, focus return,
`aria-live` regions) via Testing Library in `tests/vitest/*.test.tsx`, run with
`bun run test:dom` (all) or `vitest run tests/vitest/<file>` (one). The exact
per-overlay test file, command, and pass criterion for each of the eight
documented properties (trigger / initial focus / close-cancel / submit / error
focus / focus return / permission-denied / concurrent-change) are pre-registered
per overlay in 24-EXECUTION-EVIDENCE-LEDGER.md (mirrored in
06-QA-AND-VALIDATION-PLAN.md) — `<file>` above is a per-overlay slot resolved by
that ledger, not a value the implementer invents. There is NO axe/jest-axe
harness in this repo; if automated a11y assertions are wanted, adding jest-axe is
an explicit prerequisite, not assumed.

## No-Overlap Rules

- Sticky toolbars and bottom actions must not cover rows, cards, drawers, or
  validation messages.
- Drawer width/height must keep close and primary action controls visible
  (applies to the inspector dock when rendered as an `InspectorDrawer` below `lg`).
- Text inside buttons and badges must fit at mobile (< 768px) and laptop
  (1024px - 1279px) widths.
- The density toggle (net-new, Phase 5), filter chips, and result counts must
  not reflow in a way that changes the selected row/card height unexpectedly.

## Reduced Motion

Reuse the existing app mechanism — do NOT introduce a per-feature motion guard:

- The CSS source of truth is the `@media (prefers-reduced-motion: reduce)` blocks
  in `src/app/globals.css` (e.g. lines 309, 1042, 1097). Any new drawer/overlay
  or density-toggle animation MUST be neutralized inside one of these blocks (or
  a new one at the same query), not gated by ad-hoc JS.
- The deferred liquid-glass infra in
  `src/components/system/LiquidGlassReady.tsx` already short-circuits the
  blur/refraction ramp for reduced-transparency users; the library surfaces that
  sit on the glass canvas inherit this and must not re-arm motion behind it.
- State changes must not depend on animation timing to be understandable: the
  inspector dock open/close, filter-chip add/remove, and selection state must be
  conveyed by the route/DOM state and the `aria-live` announcements above, never
  by the transition alone.

Focus rings are owned by the design system, not this feature: use
`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus`
(token `--focus: #3D3D3D`) per 23-DESIGN-SYSTEM-COMPONENT-MAPPING.md. Do not
introduce a per-feature focus color.

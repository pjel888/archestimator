# 05 — UX, UI, and Accessibility Plan

`DESIGN.md` is alpha-stage guidance, not law — defer to Philip on visual decisions. Reuse existing primitives in `src/components/ui/` and existing chip/drawer/facet patterns (`SRC-UI`). No new design system.

## Primary user journeys

### J1 — Reviewer accepts a pending cost
1. Reviewer opens Library → filter by "Needs review" facet (extends `component-facet-filter`).
2. Selects entry → inspector dock shows review-state chip, assignee, due date, source.
3. Chooses Accept (or Reject with note) → optimistic-revision conflict guard → success toast + chip flips to "Accepted".
4. On conflict: toast "Someone else just updated this. Refresh." → re-read.

### J2 — Estimator inserts a cost with warnings
1. Estimate sheet → sidebar library → search.
2. Picks a `needs_review` item → commit gate modal (warn) lists reasons.
3. Confirms → row inserted; telemetry `trust_insert_gate_confirmed`.
4. Picks a `rejected`/`superseded` item → gate blocks with reason → cannot insert (must restore or use manual row).

### J3 — Owner imports a supplier CSV
1. Library → Import → upload CSV → dry-run preview (row count, errors per row, formula warnings).
2. Reviews preview → confirm → rows created as `proposed` + `origin='imported'`.
3. Export button → CSV/JSON with provenance + review state.

### J4 — Stale cost surfaced in estimate
1. Open estimate whose row references a since-updated library cost.
2. Row shows "Source changed" chip → inspector shows old vs new + reviewer.
3. Estimator can re-link (replace) or detach.

## Information hierarchy & states (per surface)

| Surface | Loading | Empty | Success | Error | Disabled | Permission-denied | Conflict | Offline/degraded |
|---|---|---|---|---|---|---|---|---|
| Library list | skeleton | "No components" + CTA | normal list | error boundary + retry | n/a | 403 page | "Refresh" banner | stale-cache notice |
| Inspector dock | skeleton | "Select a component" | chips render | inline error | review actions disabled for non-admin | "You need admin rights to review" | revision toast | last-known values |
| Commit gate modal | n/a | n/a | confirm/cancel | validation errors | block reasons listed | n/a | n/a | n/a |
| Import dry-run | spinner | "Upload a CSV" | per-row table | per-row errors | confirm disabled if errors | 403 | n/a | "Import needs network" |
| Facet filter | skeleton | "No matches" | filtered list | n/a | n/a | n/a | n/a | n/a |

## Component states to add/extend

| Component | Change | Reuse |
|---|---|---|
| `SourceTrustChips` | Add review-state chip variants | existing chip tone system |
| `ComponentInspectorDock` | Add review-action toolbar (Accept/Reject/Lock/Supersede/Assign) for admins; read-only for editors | existing drawer/toolbar primitives |
| `ComponentFacetFilter` | Add "Review state" facet; region/version facets when present | existing facet component |
| `EditComponentDrawer` | Add review fields (read-only provenance for editors; editable origin for admins) | existing form fields |
| New: `LibraryImportDialog` | Upload + dry-run + confirm | existing dialog + table primitives |
| New: `LibraryExportMenu` | Format picker | existing menu |
| `LibraryOverview` | Add "Needs review" / "Stale" / "Overdue assignments" widgets | existing overview card pattern |
| `getLibraryCommitTrustGate` modal | Already exists; extend reasons | existing modal |

## Accessibility (per `REQ-*`, WCAG-aligned, proven by DOM/keyboard tests)

- **Keyboard path:** every review action, import confirm, facet, and chip reachable via Tab; Esc closes modals/drawers; Enter/Space activates buttons (not div-buttons — `SRC-UI` already uses primitives).
- **Focus order & restoration:** modal/drawer open → focus first actionable element; close → restore to trigger. Existing `AddComponentModal` a11y test (`library-add-component-modal-a11y.test.tsx`) is the pattern.
- **Screen-reader semantics:** review-state chips use `role="status"`/`aria-label` (e.g., "Needs review, pricing stale"); gate modal uses `aria-describedby` for reasons list; review actions are `<button>` with accessible names.
- **Headings/titles:** inspector sections headed; dialog titles via existing Dialog primitive.
- **States announced:** live-region for accept/reject result toast; `aria-live="polite"`.
- **Responsive:** inspector and import dialog stack on narrow viewports; chips wrap.
- **Reduced motion:** chip tone changes do not rely on animation; respect `prefers-reduced-motion`.
- **Color + non-color cues:** review tones pair color with icon + text label (e.g., ⚠ "Needs review") so colorblind users see severity.
- **Copy & hierarchy:** consistent labels ("Accepted", "Needs review", "Rejected", "Superseded", "Locked", "Proposed") across chips, gate, inspector, export.
- **Undo/confirmation:** supersede and bulk reject require explicit confirm; lock has unlock path.

## Action-level accessibility proof matrix (per Improve-Plan directive §3)

For every new user-facing action: keyboard path, focus target/restoration, accessible name/live-region behavior, and proof type. WCAG 2.2 AA-aligned.

| Action | Keyboard path | Focus target / restoration | Accessible name / live-region | Proof type |
|---|---|---|---|---|
| Open inspector review toolbar | Tab to entry → Enter opens dock | focus → first toolbar button; Esc → restore to entry row | dock labelled `aria-labelledby`; review-state announced via chip `aria-label` | DOM test |
| Accept cost entry | Tab to "Accept" button → Enter/Space | focus stays on button → on success moves to next needs-review entry; on conflict focus stays + toast announced | button `aria-label="Accept cost entry"`; toast `aria-live="polite"` announces "Accepted" or "Conflict, refresh" | DOM test + targeted Playwright (focus restoration across dock) |
| Reject cost entry (requires note) | Tab to "Reject" → Enter → focus moves to note field → Tab to confirm | focus → note field; cancel → restore to Reject button | field `aria-label="Rejection note"`; required-state announced | DOM test |
| Lock / Unlock | Tab to "Lock" → Enter | focus stays; toggle announced | `aria-pressed` for toggle; live-region announces state | DOM test |
| Supersede (confirm dialog) | Tab to "Supersede" → Enter → dialog opens → Tab through create-new fields → confirm | dialog focus → first field; Esc/cancel → restore to Supersede button | dialog `aria-labelledby`; confirm button name | DOM test + Playwright (dialog focus) |
| Assign reviewer (combobox) | existing creatable-combobox pattern (`src/components/ui/creatable-combobox.tsx`) | combobox focus management reused | labelled combobox; selection announced | DOM test (existing pattern) |
| Set origin = owner-accepted (admin only) | Tab to origin select → choose → confirm | focus stays; change announced | `aria-label`; admin-only affordance hidden from non-admin | DOM test + denial test |
| Import: upload CSV | Tab to "Upload" → Enter → native file dialog → Tab to dry-run table → confirm | after upload, focus → dry-run table first row; confirm → toast | table caption + per-row errors `aria-label`; toast live-region | DOM test + Playwright (drag-drop) |
| Export (format menu) | Tab to menu → Enter → choose format | menu focus management (existing menu primitive) | menu items labelled | DOM test |
| Facet: filter by review state | existing facet keyboard pattern | facet focus reused | checkbox/toggle labelled | DOM test (existing `library-applied-filters.test.tsx`) |
| Gate modal: confirm insert with warnings | existing gate; new reasons appended | existing focus to confirm/cancel | reasons list `aria-describedby`; tone + icon + text | DOM test (existing handler test extended) |

**Responsive / touch / large-data notes:** inspector toolbar wraps on narrow widths; import dry-run table virtualizes/paginates beyond ~500 rows; chips wrap with `flex-wrap`; no hover-only affordances; tap targets ≥44px (existing primitives).

**Reduced motion / contrast / reflow:** chip tone changes are color + icon + text (no animation dependency); review tones meet AA contrast against backgrounds (verify in `TASK-029` with `lint:design-system` + visual spot-check); inspector reflows at 320px width without horizontal scroll (verify in `TASK-029`/`TASK-031` DOM + targeted browser proof).

## UX regressions to guard

- Existing chip density must not get noisier than today (≤ +1 chip typical).
- Existing commit-gate copy remains; new reasons append.
- Facet filter performance with new facets (perf in `09`).
- Import dialog must not block other library actions (non-modal where possible, else clear overlay).

## Localization implications

- Free-text confidence note is user language; chip labels are English for now (consistent with existing `COMPONENT_LIFECYCLE_FACET_LABELS`). Region/version free text. No i18n framework change.

## Design-system reuse (no new primitives)

- Chips: extend `SourceTrustChips` spec, no new component.
- Dialog/Drawer/Button/Table/Menu: reuse `src/components/ui/`.
- Tones: existing neutral/success/warning/danger.
- Forms: existing `EditComponentDrawer` field patterns.

## User-facing documentation implications

- Update component-library spec/help copy to describe review states, import/export, and stale warnings. (`DOC-*` in `11`.)

## Browser/visual proof decision (proportional per AGENTS.md)

- **Static/unit/DOM proof** for: chip rendering, gate reasons, facet filtering, inspector states, import dry-run table — these prove the claims without a browser.
- **Browser proof required for:** modal/drawer focus restoration across the new review-action toolbar, keyboard activation of accept/reject in inspector, import drag-drop interaction. Named in `12` as targeted Playwright only for these.

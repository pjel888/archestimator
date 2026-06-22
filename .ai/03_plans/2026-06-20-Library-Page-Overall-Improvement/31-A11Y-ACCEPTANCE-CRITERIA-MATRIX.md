# 31 — Accessibility Acceptance Criteria Matrix

> **Status:** axe gate is Phase 0A — **pre-0A a11y is manual only; this matrix
> defines the post-0A target state AND the per-surface manual floor that holds
> today.** Resolves C-014 from
> [26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md](26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md).
> Per [19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md)
> §Test Commands, there is **no** axe / jest-axe a11y harness configured today
> (verified 2026-06-21: `rg "jest-axe|@axe-core|axe-core" package.json` → 0
> hits), and no standalone `FocusTrap` primitive in `src/components/ui/`
> (verified: `rg -l "FocusTrap|focus-trap" src/components/ui/` → 0 hits).
> a11y tests are manual ARIA/focus assertions in Testing Library until 0A
> installs `jest-axe` + `@axe-core/playwright` (evidence: `EV-0A-AXE-HARNESS`,
> owned by A11y lead; seq: add to
> [05-IMPLEMENTATION-ROADMAP.md](05-IMPLEMENTATION-ROADMAP.md) 0A scope; EV rows
> in [24-EXECUTION-EVIDENCE-LEDGER.md](24-EXECUTION-EVIDENCE-LEDGER.md)).
> Until those EV rows are green, the pre-merge axe gate in §3 is INACTIVE.
> Living document, initialized 2026-06-21 by the Ultrawork audit loop. Defines
> the a11y acceptance criteria for every Library surface. Every actionable row
> must declare its a11y pass condition.
>
> **2026-06-21 hardening pass.** Verified every file:line and aria-live
> binding via `rg`: the 6 `aria-live="polite"`/`role="status"` regions cited
> in §4 are CONFIRMED present
> (`TemplatesBrowsePageClient.tsx:27`,
> `LibraryFolderTree.tsx:1146-1147`, `ComponentLibraryManager.tsx:968/978-979`,
> `AddComponentModal.tsx:2204`, `TemplateGallery.tsx:247/255-256`,
> `ComponentInspectorDock.tsx:271`, `LibraryOverviewSearch.tsx:305`,
> `InsertIntoEstimatePicker.tsx:142`, `component-library/index.tsx:1260/2403`).
> `ComponentInspectorDock.tsx:271` confirmed (the "Used in" usage-count
> paragraph). Reduced-motion blocks confirmed at `globals.css:309/1042/1097/
> 1128/1327/1741/2279/2436/2501` (9 blocks).
>
> **Scope:** Keyboard, screen reader, focus, contrast, motion, ARIA, live
> regions, and per-surface a11y acceptance criteria.
>
> **Companion docs:** [12-RESPONSIVE-ACCESSIBILITY-INTERACTION-CONTRACT.md](12-RESPONSIVE-ACCESSIBILITY-INTERACTION-CONTRACT.md),
> [06-QA-AND-VALIDATION-PLAN.md](06-QA-AND-VALIDATION-PLAN.md),
> [18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md](18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md),
> [27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md](27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md),
> [28-I18N-RTL-AND-LOCALIZATION-CONTRACT.md](28-I18N-RTL-AND-LOCALIZATION-CONTRACT.md),
> [35-LIQUID-GLASS-LIBRARY-UX-SPEC.md](35-LIQUID-GLASS-LIBRARY-UX-SPEC.md) (§10 — glass text/focus/reduced-transparency contrast).

---

## 1. Purpose

Accessibility is a first-class contract, not a post-hoc check. This doc:

1. **Defines the a11y standard** — WCAG 2.1 AA + Library-specific requirements.
2. **Defines the testing matrix** — manual, axe, screen reader, keyboard.
3. **Defines per-surface acceptance criteria** — pass conditions for each surface, bound to real `file:line`.
4. **Resolves C-014** from [26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md](26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md) — axe harness is Phase 0A deliverable.
5. **Defines verification** — how to confirm a11y compliance.

> **Doc-type note.** Under the relaxed scope of
> [34-ROW-LEVEL-COMPLETENESS-MATRIX.md](34-ROW-LEVEL-COMPLETENESS-MATRIX.md)
> §3, this is a **dimension-defining contract**: it owns the **A11y**
> dimension (#8) for the pack. Its rows are informational and delegate the
> other 11 dimensions. Gate rows in *consumer* docs (05, 06, 17, 18, surface
> specs in 10, contract rows in 13/14/15) cite this doc's section pointers to
> satisfy their A11y field. The two owned canonical names from this doc —
> **WCAG 2.1 AA per-surface criteria** and **aria-live live-region contract**
> — are registered in `LOOP_LEDGER.md` §2 so docs 03/06/10/22/35 adopt them.

---

## 2. A11y standard

### WCAG 2.1 AA (baseline — target; beta floor is manual until §3 axe lands)

| Principle | Requirement | How to verify (pre-0A) | How to verify (post-0A) |
|---|---|---|---|
| Perceivable | All content is programmatically determinable | manual review of ARIA/roles | axe + manual review |
| Operable | All functionality is keyboard accessible | Keyboard test (Tab, Enter, Space, Esc, Arrow) | same |
| Understandable | Content is readable and predictable | manual review + copy review (doc 22) | same |
| Robust | Compatible with assistive technologies | Screen reader test (VoiceOver macOS; NVDA Win at the final release gate, historical Phase 6 alias) | same |

### Library-specific requirements

| Requirement | Standard | How to verify (pre-0A) | How to verify (post-0A) |
|---|---|---|---|
| Focus visible | Focus indicator ≥ 2px, contrast ≥ 3:1 | manual review (screenshot focus state) | axe + manual review |
| Touch target | ≥ 44×44px (mobile < 768px) | Playwright measurement | same |
| Color contrast (text) | AA: 4.5:1 (normal), 3:1 (large ≥18pt/14pt bold) | manual review against doc 22 §2 WCAG note | axe + manual |
| Color contrast (UI) | AA: 3:1 for UI components / graphical objects | manual review | axe (UI-component rule) |
| Motion | `prefers-reduced-motion: reduce` respected | manual review (9 blocks in `globals.css` today) | manual + axe (motion-rule where supported) |
| Live regions | State changes announced via `aria-live` | manual screen-reader test | same + axe (aria-roles rule) |
| Focus trap | Overlays trap focus, return on close | manual keyboard test | Playwright focus-trap test (post-0B `EV-0B-FOCUS-TRAP`) |
| Skip link | Skip-to-main-content link present | manual review | axe (skip-link rule) |
| Heading hierarchy | H1 → H2 → H3, no skipped levels | manual review | axe (heading-order rule) |
| ARIA roles | Correct role per element | manual review against APG | axe (aria-roles rule) |
| Label association | Every input has associated `<label>` (or `aria-label`) | manual review | axe (label rule) |
| Color not sole carrier | Selection / state combine shape + text + color | manual review (critical on glass where tint shifts) | manual |
| Reduced transparency | `--glass-bg-fallback` opaque panel preserves text/selection without blur; honor `prefers-reduced-transparency` | manual review + `prefers-reduced-transparency` test | manual |

### Glass-surface contrast acceptance (cross-ref [35](35-LIQUID-GLASS-LIBRARY-UX-SPEC.md) §10)

The liquid-glass surfaces (well/rails/paper/chrome/drawers/warm CTA) add contrast
constraints on top of the baseline. Bind every glass surface to these rules:

| Requirement | Rule | How to verify |
|---|---|---|
| Text on frosted white | `--ink:#3D3D3D` / `--secondary:#5d5d5d` on frosted white (rgba 0.58–0.9 ≈ white) passes WCAG 2.1 AA (4.5:1). Load-bearing meta uses `--secondary`, **never** `--tertiary:#7f7f7f` (fails AA — recorded lesson `designmd-tertiary-fails-aa`; also doc 22 §2 WCAG note). | manual + axe (post-0A) + Playwright over the glass variant |
| Focus ring on glass | `--focus:#3D3D3D` ring ≥2px, ≥3:1 against adjacent frosted/transparent neighbors (`focus-visible:ring-2 focus-visible:ring-focus` per [23](23-DESIGN-SYSTEM-COMPONENT-MAPPING.md) §Focus) | manual + Playwright focus screenshot ([29](29-BROWSER-PROOF-AND-VISUAL-QA-MATRIX.md)) |
| Color not sole carrier | Selected/active combine border + ring + weight/brightness — never color alone (matters on glass where tint shifts) | manual review |
| Reduced transparency | `--glass-bg-fallback` opaque panel preserves all text/selection states without blur; honor `prefers-reduced-transparency` | manual + `prefers-reduced-transparency` test |
| Reduced motion | glass transitions disabled; state readable without the readiness ramp | `globals.css` reduced-motion blocks (9 today: `:309/1042/1097/1128/1327/1741/2279/2436/2501`) + the `LiquidGlassReady.tsx` short-circuit |
| Touch target | glass chrome buttons ≥44×44 on touch | Playwright measurement |

Binding: these mirror [35-LIQUID-GLASS-LIBRARY-UX-SPEC.md](35-LIQUID-GLASS-LIBRARY-UX-SPEC.md) §10 exactly; do not relax them. Glass is visual-only and introduces no new ARIA roles or live regions.

---

## 3. Testing matrix

### Test types

| Test type | Tool | Phase | Gate status |
|---|---|---|---|
| Manual keyboard | Keyboard + DevTools | 0A–5 | Pre-merge (active today) |
| Manual screen reader | VoiceOver (macOS); NVDA (Windows) | 1, Phase 5 dense-mode subtrack (formerly 5b), final release gate alias (formerly Phase 6) | Phase exit |
| axe automated | axe-core (`jest-axe` for jsdom + `@axe-core/playwright` for Playwright) | 0A (config) → 5 | **INACTIVE pre-0A**; Pre-merge post-0A |
| Playwright a11y | Playwright + axe | Phase 5 dense-mode subtrack (formerly 5b), final release gate alias (formerly Phase 6) | Phase exit |
| Visual focus review | Screenshot focus state | 1, Phase 5 dense-mode subtrack (formerly 5b), final release gate alias (formerly Phase 6) | Phase exit |

### axe harness (Phase 0A deliverable — resolves C-014)

Per [26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md](26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md) C-014:

- **Pre-0A (TODAY):** axe is NOT configured (verified: `rg "jest-axe|@axe-core|axe-core" package.json` → 0 hits). a11y is manual only.
- **0A:** configure axe-core via `jest-axe` for jsdom tests + `@axe-core/playwright` for Playwright.
- **Post-0A:** axe is a pre-merge gate. All Library components must pass `expect(await axe(page)).toHaveNoViolations()`.

**Ownership / scheduling (the gap C-014 leaves open):**

| Task | Owner | Phase | Evidence | Seq |
|---|---|---|---|---|
| Install `jest-axe` + `@axe-core/playwright`; add axe setup to vitest config; add first axe test per Library surface (overview, components, inspector, quick-add, overlays, trust chip, folder tree, template gallery, template editor) | A11y lead | 0A | `EV-0A-AXE-HARNESS` | add to [05](05-IMPLEMENTATION-ROADMAP.md) 0A scope; EV rows in [24](24-EXECUTION-EVIDENCE-LEDGER.md) |
| Standalone `FocusTrap` primitive (none in `src/components/ui/` today — verified `rg -l "FocusTrap\|focus-trap" src/components/ui/` → 0 hits; overlay inventory is `Modal`/`AppModal`/`BlurModal`, `ConfirmDialog`, `Sheet`/`Drawer`/`SidePanel`/`InspectorDrawer`, `Popover`, `Combobox`) | Frontend lead | 0B | `EV-0B-FOCUS-TRAP` | add to [05](05-IMPLEMENTATION-ROADMAP.md) 0B scope |

Until `EV-0A-AXE-HARNESS` is green, the "axe automated ... Gate: Pre-merge (post-0A)" row above is **INACTIVE** and §8's `rg "jest-axe|@axe-core/playwright" package.json` is expected to find nothing.

### Screen reader testing

| Screen reader | Browser | Phase | Surfaces |
|---|---|---|---|
| VoiceOver | Safari (macOS) | 1, Phase 5 dense-mode subtrack (formerly 5b), final release gate alias (formerly Phase 6) | All Library surfaces |
| VoiceOver | Safari iOS | final release gate alias (formerly Phase 6) | Mobile surfaces |
| NVDA | Firefox (Windows) | final release gate alias (formerly Phase 6) | All Library surfaces |
| TalkBack | Chrome (Android) | final release gate alias (formerly Phase 6) | Mobile surfaces |

---

## 4. Per-surface acceptance criteria (binding — every Library surface)

Every surface in [10-LIBRARY-SURFACE-SPECS.md](10-LIBRARY-SURFACE-SPECS.md)
must pass the criteria below. **The aria-live "Present today?" column is
verified 2026-06-21** — the regions this matrix depends on are real.

| Surface | Real binding (file:line) | Keyboard | Screen reader | Focus | ARIA | Live region (aria-live) | Motion | Contrast | aria-live present today? |
|---|---|---|---|---|---|---|---|---|---|
| Library overview | `src/components/workshop/library/overview/LibraryOverview.tsx` (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-6` at `:268`; stale string `:114`) | Tab through grid, Enter opens inspector | H1 "Library"; cards as list items | Focus visible on cards | card `aria-label` = name + trust state | n/a | n/a | AA (ink/secondary on white) | n/a |
| Overview search | `src/components/workshop/library/overview/LibraryOverviewSearch.tsx` (`SearchInput :258`; `aria-live :305`) | Tab to input, ArrowDown opens options, Enter selects, Escape closes (keystroke handler per keystone `:182-215`/`:191-278`) | `role="combobox"` + `listbox`/`option`; results announced | Focus visible; `aria-activedescendant` set on ArrowDown (`:265`) | `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant` | Results count via `<p aria-live="polite">` at `:305` → `search.result_announcement` ICU plural | n/a | AA | YES — `:305` |
| Components tab | `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx` (`<input> :383`; `<p aria-live="polite"> :968`, `role="status" :978` + `aria-live="polite" :979`) | Tab through cards/rows, Arrow nav, Enter opens inspector, Shift+Tab reverse | cards as `role="gridcell"` w/ name + trust state | Focus visible | `aria-selected` on selection | Result count via `role="status"`/`aria-live="polite"` at `:978-979` → `search.result_announcement` ICU plural; `<p aria-live="polite">` at `:968` | n/a | AA (tertiary text MUST upgrade to secondary per doc 22 §2) | YES — `:968`, `:978-979` |
| Component inspector dock | `src/components/workshop/library/ComponentInspectorDock.tsx` (`aria-live :271`; inline ≥ 1024px; `InspectorDrawer` below `lg`) | Tab through fields, Esc closes | `role="region"`, `aria-label="Component inspector"`; "Used in" section at `:268-272` | Focus trap inside (NET-NEW `EV-0B-FOCUS-TRAP`); return to trigger on close | `aria-labelledby` for fields; usage counts in `<p aria-live="polite">` at `:271` | Usage error/counts via `<p aria-live="polite">` at `:271` → ICU plural | Slide-in respects `prefers-reduced-motion` (`globals.css` 9 blocks) | AA | YES — `:271` |
| Facet filter | `src/components/workshop/library/component-facet-filter.tsx` (exports `COMPONENT_FACET_STALE_DAYS=90 :12`; `getComponentPricingFreshness :61`; result-count region per keystone) | Tab to input + chips; chips removable with Delete/Backspace | `role="search"`; chips with `aria-label="filter: {label}"` | Focus visible on chips; chip removal returns focus to next chip or input | `role="search"`, `aria-label`; chip `aria-label` | Results count via `aria-live="polite"` region → `search.result_announcement`; filter-applied via `filter.applied_announcement` | n/a | AA | YES (keystone-cited) |
| Folder tree | `src/components/workshop/component-library-manager/LibraryFolderTree.tsx` (`role="status" :1146`, `aria-live="polite" :1147`; imports `Tree :17`) | Tab enters tree (single stop); ArrowUp/Down move visible nodes; ArrowRight expand / first child; ArrowLeft collapse / parent; Home/End first/last; Enter activate; `*` expand siblings — all owned by `ui/tree.tsx:1018-1085` w/ roving `tabIndex :1136` | `role="tree"` (on `ui/tree.tsx:1275`), `role="treeitem"`, `aria-expanded :1132`, `aria-level`, `aria-selected` | Focus visible; roving `tabindex` | per APG tree pattern (owned by `ui/tree.tsx`) | Item count via `<p role="status" aria-live="polite">` at `:1146-1147` → `folder.item_count` ICU plural | n/a | AA | YES — `:1146-1147` |
| Folder create/rename (text-prompt dialog) | inline `ConfirmDialog` + `<input>` pattern from `src/components/workshop/library/templates-browse/TemplatesBrowseManager.tsx:855/870` (NO standalone PromptDialog — per doc 03); replaces `ComponentLibraryManager.tsx:1493/1515` native `window.prompt` | Tab cycles within dialog; Enter submits default; Escape cancels | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` for title | Focus first field on open; focus trap (NET-NEW `EV-0B-FOCUS-TRAP`); return to trigger on close | `role="dialog"`, `aria-modal`, `aria-labelledby`; field `aria-required`, `aria-invalid`, `aria-describedby` for error | Open/close via `overlay.opened_announcement`/`closed_announcement` (NET-NEW); validation error via field `aria-describedby` | Fade respects reduced-motion | AA | NET-NEW open/close |
| Folder delete (destructive dialog) | destructive `ConfirmDialog` (`role="alertdialog"`); replaces `ComponentLibraryManager.tsx:1534` native `window.confirm` | Tab cycles; Enter on Cancel (default); Delete is explicit click or `Shift+Tab` reach | `role="alertdialog"`, `aria-modal="true"`, `aria-labelledby` title, `aria-describedby` body | Focus on Cancel (safe default); focus trap; return to trigger on close | `role="alertdialog"`, `aria-modal`, `aria-labelledby`, `aria-describedby` | Delete confirmation (after action) via `component.archived_announcement`-equivalent assertive region (NET-NEW per doc 12) | Fade respects reduced-motion | AA | NET-NEW |
| Bulk toolbar + archive modal | `src/components/workshop/BulkActionToolbar.tsx` + `src/components/workshop/BulkDestructivePreviewModal.tsx` (`confirmationHint :107-108`) | Tab to toolbar; Enter/Space to open archive modal; Tab cycles in modal; Escape cancels | toolbar `role="toolbar"`; modal `role="alertdialog"`, `aria-labelledby` | Focus trap in modal (NET-NEW); return to trigger | `aria-labelledby`, hint gated on `actionCopy.verb` per doc 22 §7 (archive ≠ delete copy) | Archive success via NET-NEW `role="alert"` region → `component.archived_announcement` (no `role="alert"` in `BulkActionToolbar.tsx` today per doc 12) | Fade respects reduced-motion | AA | NET-NEW `role="alert"` |
| Quick add form (AddComponentModal) | `src/components/workshop/component-library-manager/AddComponentModal.tsx` (`window.confirm :963` debt; `<div aria-live="polite"> :2204`) | Tab through fields, Enter submits, Esc cancels (dirty-discard dialog re-uses `ConfirmDialog`, Phase 0B) | `role="form"`, `aria-label="Quick add component"`; fields w/ `aria-label` | Focus first field on open; focus trap (NET-NEW `EV-0B-FOCUS-TRAP`); return to trigger on close | `aria-required`, `aria-invalid`, `aria-describedby` for validation errors | Validation errors via `<div aria-live="polite">` at `:2204`; component-added via `component.added_announcement` (NET-NEW); dirty-discard via `component.dirty_discard.*` keys | Fade respects reduced-motion | AA | YES — `:2204` |
| Component card | `src/components/workshop/component-library/ComponentCard.tsx` + `helpers.ts:667/675` (`getStalenessTone`/`Label`) | Tab to card, Enter opens inspector, Shift+Tab reverse | `role="gridcell"` (or listitem); `aria-label` = "{name}, {trust state}, {unit_cost} {unit}" | Focus visible | `aria-selected` on select; chips carry no aria-live (C-002 chip, not badge) | n/a (chip, not live region) | n/a | AA (chip tone tokens per doc 22 §3) | n/a (chip) |
| Template gallery | `src/components/workshop/library/templates-browse/TemplateGallery.tsx` (`aria-live :247`, `role="status" :255`, `aria-live :256`); `InsertIntoEstimatePicker.tsx:142` | Tab through template cards; Enter opens preview | cards w/ name + insert-target disclosure; picker `role="dialog"` | Focus visible; preview modal focus trap (NET-NEW) | `aria-labelledby`; picker disclosure via `aria-describedby` | Result count via `<p aria-live="polite">` at `:247` + `role="status"`/`aria-live` at `:255-256`; insert target via `<p role="status">` at `:142` (`InsertIntoEstimatePicker.tsx`) → `insert_target.*` keys | n/a | AA | YES — `:247`, `:255-256`, `InsertIntoEstimatePicker.tsx:142` |
| Template editor | `src/components/workshop/library/template-editor/TemplateEditorClient.tsx` + `TemplateStructureTree.tsx` | Tab through structure tree; Arrow nav; Enter activates node | tree per APG (same primitive as folder tree, `ui/tree.tsx`); structure node `aria-label` | Focus visible; roving tabindex | `role="tree"`, `role="treeitem"`, `aria-expanded`, `aria-level` | Insert success/failure via NET-NEW region → `templates.insert_success_*` / `templates.insert_partial_failure` | n/a | AA | NET-NEW insert result |
| Templates browse (TemplatesBrowseManager) | `src/components/workshop/library/templates-browse/TemplatesBrowseManager.tsx` (`ConfirmDialog :855/870`; `TemplatesBrowsePageClient.tsx:27 role="status"`) | Tab through browse UI; Enter opens template; text-prompt dialog keyboard per "Folder create/rename" row above | `role="region"`; dialog per APG | Focus visible; dialog focus trap (NET-NEW) | `aria-labelledby`; dialog `role="dialog"` | Browse status via `<роль="status">` at `TemplatesBrowsePageClient.tsx:27` | n/a | AA | YES — `TemplatesBrowsePageClient.tsx:27` |
| Template preview / insert picker | `src/components/workshop/library/templates-browse/TemplatePreviewDock.tsx` + `InsertIntoEstimatePicker.tsx:142` | Tab through preview; Enter inserts; Tab cycles in picker | `role="region"`, `aria-label="Template preview"`; picker `role="dialog"` | Focus trap in preview modal (NET-NEW) | `aria-labelledby`; picker disclosure `aria-describedby` | Insert target disclosure via `<p role="status">` at `:142` → `insert_target.*` keys | n/a | AA | YES — `:142` |
| Overlay/modal (generic) | `ui/overlays/confirm-dialog.tsx`, `modal.tsx`, `sheet-drawer.tsx` | Tab/Shift+Tab cycle WITH focus trap; Escape closes; Enter submits default from non-textarea | `role="dialog"` (or `alertdialog` for destructive); `aria-modal="true"`; `aria-labelledby` | Focus first focusable on open; trap; return to trigger on close | `aria-modal`, `aria-labelledby` (and `aria-describedby` for alertdialog) | Open/close via NET-NEW `overlay.opened_announcement`/`closed_announcement` | Fade respects reduced-motion | AA | NET-NEW open/close |
| Trust chip | `src/components/workshop/component-library/helpers.ts:667/675` + `component-facet-filter.tsx:61` | Tab to chip's host row/card; Enter shows tooltip (or opens inspector) | chip `aria-label` = full trust text (e.g., "Stale price. Priced more than 90 days ago. Review before reuse.") | Focus visible on host row (chip itself is not focusable when carried by row/card) | chip = `<span>` with `aria-label`; tooltip `role="tooltip"` | Very-stale insert-gate confirm via NET-NEW `aria-live="assertive"` region → `trust.very_stale.announcement` | n/a | AA (semantic tone tokens success/warning/danger/secondary per doc 22 §3; NEVER brand orange #F24405 or clay #AA412A for chip fills) | NET-NEW assertive region |
| Dense mode row | `src/components/workshop/component-library/` (Phase 5 only, `library_dense_mode`) | Tab to row, ArrowUp/Down navigate cells, Enter activates, Tab exits | row `role="row"`, cell `role="gridcell"`; row `aria-label` = summary | Focus visible; roving tabindex (one stop per grid) | per APG grid pattern IF grid chosen; native `<table>` per doc 12 default | n/a | n/a | AA | n/a (Phase 5) |
| Public snapshot | snapshot rendering path (frozen view of library) | Tab through frozen view (read-only) | `role="region"`, `aria-label="Public snapshot"` | Focus visible | `aria-label` w/ snapshot date | n/a | n/a | AA | n/a |
| Component library index.tsx (Phase-later residual — per C-003) | `src/components/workshop/component-library/index.tsx` (`window.confirm :939`; `window.prompt :1428`; `<div role="status" aria-label="Loading project sources"> :1260`; `<div aria-live="polite" aria-atomic="true" class="sr-only"> :2403`) | Tab through; Enter activates; native dialog debt migrated Phase-later | `role="status"` loading at `:1260`; sr-only `aria-live` at `:2403` | Focus visible | loading `aria-label`; sr-only live region | Loading via `:1260`; announcements via sr-only `:2403` | n/a | AA | YES — `:1260`, `:2403` |

### Acceptance template (for every actionable row in consumer docs)

```
A11y: <criterion> | <test type> | <pass condition> | Binding: <file:line>
```

Examples:
```
A11y: focus-trap | Playwright | Tab cycles within overlay, Esc closes, focus returns to trigger | Binding: ui/overlays/confirm-dialog.tsx (consumer: TemplatesBrowseManager.tsx:855)
A11y: aria-live | Screen reader | State change announced by VoiceOver (polite for status, assertive for errors/destructive) | Binding: ComponentInspectorDock.tsx:271
A11y: contrast | axe (post-0A) / manual (pre-0A) | 4.5:1 minimum for text on background; secondary #5D5D5D never tertiary #7F7F7F for load-bearing meta
A11y: keyboard-nav | Keyboard test | All actions reachable via Tab + Enter + Esc + Arrow per APG pattern
A11y: n/a (non-interactive display only)
```

---

## 5. ARIA live region contract (canonical — registered in `LOOP_LEDGER.md` §2)

State changes must be announced via `aria-live`. Doc 22 §12A is the
authoritative copy source; this section binds each announcement to a real
DOM target (the "Present today?" column in §4) and the right politeness.

> **Copy keys below are REGISTERED in
> [22-COPY-DECK-AND-MICROCOPY.md](22-COPY-DECK-AND-MICROCOPY.md) §12A** but
> are PROPOSED as live DOM strings: the codebase is not keyed (see
> [19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md)
> and [28-I18N-RTL-AND-LOCALIZATION-CONTRACT.md](28-I18N-RTL-AND-LOCALIZATION-CONTRACT.md)
> §3.1). The `aria-live` REGIONS exist today (§4 verified column); the copy
> INSIDE them is English hardcoded until the runtime lands. Until registered,
> live-region announcements are manual-test-only.

| State change | Politeness | `aria-live` / role | Copy key (doc 22 §12A) | Real DOM target (verified 2026-06-21) |
|---|---|---|---|---|
| Search results loaded | polite | `aria-live="polite"` / `role="status"` | `search.result_announcement` | REUSED: `<p aria-live="polite">` at `LibraryOverviewSearch.tsx:305`, `ComponentLibraryManager.tsx:978-979`, facet-filter (keystone), `TemplateGallery.tsx:247/255-256` |
| Filter applied | polite | `aria-live="polite"` / `role="status"` | `filter.applied_announcement` | REUSED (one of the above regions per host surface) |
| Selected component opened from route (`?component=<id>`) or search | polite | `aria-live="polite"` / `role="status"` | `trust.state_change_announcement` + `overlay.opened_announcement` | REUSED: `<p aria-live="polite">` at `ComponentInspectorDock.tsx:271` for dock state |
| Inspector dock / drawer opened | polite | `aria-live="polite"` / `role="status"` | `overlay.opened_announcement` | NET-NEW (no open-announcement region in `ComponentInspectorDock.tsx` today — Phase 0B/1 work, doc 12) |
| Inspector dock / drawer closed | polite | `aria-live="polite"` / `role="status"` | `overlay.closed_announcement` | NET-NEW (same) |
| Destructive action completed (bulk archive succeeded) | polite | `aria-live="polite"` / `role="status"` | `component.archived_announcement` | NET-NEW — no `role="alert"` region in `BulkActionToolbar.tsx` today (doc 12) |
| Insert success | polite | `aria-live="polite"` / `role="status"` | `templates.insert_success_*` (doc 22 §10) | NET-NEW (template editor — no insert-result region today) |
| Insert target disclosure | polite | `aria-live="polite"` / `role="status"` | `insert_target.*` (doc 22 §9) | REUSED: `<p role="status">` at `InsertIntoEstimatePicker.tsx:142` |
| Trust very-stale (insert-gate confirm) | assertive | `aria-live="assertive"` / `role="alert"` | `trust.very_stale.announcement` | NET-NEW — no assertive region on host surface today (Phase 2 work, doc 12) |
| Insert failure / write error | assertive | `aria-live="assertive"` / `role="alert"` | `error.announcement` | NET-NEW per host surface |
| Permission denied (viewer attempts a write) | assertive | `aria-live="assertive"` / `role="alert"` | `permission.denied_announcement` | NET-NEW per host surface |
| Folder item count | polite | `aria-live="polite"` / `role="status"` | `folder.item_count` (ICU plural, doc 22 §12) | REUSED: `<p role="status" aria-live="polite">` at `LibraryFolderTree.tsx:1146-1147` |
| Component-card count (Components tab) | polite | `aria-live="polite"` / `role="status"` | `component_card.count` (ICU plural, doc 22 §12) | REUSED: `<p aria-live="polite">` at `ComponentLibraryManager.tsx:968` |
| Template-row / estimate-row usage count | polite | `aria-live="polite"` | (plural inside `Used in` aria-live) | REUSED: `<p aria-live="polite">` at `ComponentInspectorDock.tsx:271` |

### Rules

1. **Use `polite` for non-urgent updates** — results, filters, state changes, open/close, item counts.
2. **Use `assertive` for urgent updates** — errors, destructive-action results, permission denied, very-stale insert gate.
3. **Never use `off`** — if it doesn't need announcement, don't add aria-live.
4. **Test with real screen reader** — aria-live behavior varies across browsers; VoiceOver macOS is the Phase-1 exit target, NVDA Firefox is the final release-gate target (historical Phase 6 alias).
5. **Keep announcements short** — 1-3 words ideal, max 1 sentence.
6. **Chips (C-002 chip, not badge) carry no aria-live** — freshness/confidence/lifecycle chips are read as part of the host row/card accessible name; only the very-stale insert-gate confirm uses an assertive region.
7. **REUSE first, NET-NEW second** — the §4 "Present today?" column distinguishes the two. REUSE means the region exists and only needs the keyed copy wired in (Phase 1, low-risk); NET-NEW means a new region must be added (Phase 0B/1/2, sequenced in doc 12 and tracked in [24](24-EXECUTION-EVIDENCE-LEDGER.md)).

---

## 6. Focus management contract

### Overlay/modal (binding: `ui/overlays/`)

1. **On open:** focus moves to first focusable element inside overlay (or the overlay itself).
2. **While open:** Tab cycles within overlay (focus trap), Shift+Tab cycles in reverse.
3. **On close:** focus returns to the element that triggered the overlay.
4. **Esc:** closes the overlay (same as cancel button); an unsubmitted dirty form first asks for discard confirmation (e.g., `AddComponentModal.tsx:963` re-pointed to inline `ConfirmDialog` in Phase 0B).

> The standalone `FocusTrap` primitive does NOT exist today (verified 2026-06-21:
> `rg -l "FocusTrap|focus-trap" src/components/ui/` → 0 hits). Focus-cycle
> behavior is verified manually + via Playwright in
> [29](29-BROWSER-PROOF-AND-VISUAL-QA-MATRIX.md) until `EV-0B-FOCUS-TRAP`
> lands. The overlay primitives (`Modal`/`AppModal`/`BlurModal`,
> `ConfirmDialog`, `Sheet`/`Drawer`/`SidePanel`/`InspectorDrawer`) currently
> rely on Radix / headlessui focus behaviors inherited from the underlying
> primitives — confirm before assuming trap + return.

### Route transition

1. **On route change:** focus moves to page H1 (or main content).
2. **On back:** focus returns to the element that triggered the navigation.
3. **`?component=<id>` deep-link (Phase 0B):** focus moves to the inspector dock title; Esc closes and returns focus to the triggering card (route state owned by `LibraryPageClient.tsx` per keystone).

### List/grid navigation (binding: `ui/tree.tsx` APG)

1. **Tab:** enters the grid/tree, focuses first item (single tab stop via roving `tabindex`).
2. **Arrow keys:** navigate within grid/tree (up/down/left/right).
3. **Enter:** activates the focused item (opens inspector / activates node).
4. **Tab:** exits the grid/tree to next focusable element.
5. **Home/End:** first/last visible node. **Ctrl+Home/Ctrl+End:** (grid only) first/last cell.
6. **`*` (tree only):** expand all siblings (optional per APG).

### Form navigation (binding: Quick Add `AddComponentModal.tsx`, folder dialogs)

1. **Tab:** moves to next field.
2. **Shift+Tab:** moves to previous field.
3. **Enter:** submits the form (or activates focused button) — unless focus is in a `<textarea>` (Enter inserts newline).
4. **Esc:** cancels the form (dirty-discard dialog if unsaved changes).

---

## 7. Reduced motion contract (binding: `src/app/globals.css`)

1. **Respect `prefers-reduced-motion: reduce`** — disable non-essential animations. **Verified:** 9 reduced-motion blocks in `globals.css` today (lines `309`, `1042`, `1097`, `1128`, `1327`, `1741`, `2279`, `2436`, `2501`).
2. **Overlay fade:** instant (0ms) when reduced motion is set.
3. **Panel slide (inspector dock, drawers):** instant (0ms) when reduced motion is set.
4. **Chip transitions:** instant (0ms) when reduced motion is set.
5. **Skeleton shimmer:** static (no animation) when reduced motion is set.
6. **Glass readiness ramp:** short-circuited by `LiquidGlassReady.tsx` for reduced-transparency users (per doc 35 §7) — library surfaces inherit this and must NOT re-arm motion behind it.
7. **Essential motion:** allowed (e.g., progress bar) but minimal.

### Implementation (canonical CSS — do not duplicate per-feature)

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

> The library surfaces MUST NOT introduce a per-feature motion guard. Any new
> drawer/overlay/glass animation is neutralized inside one of the 9 existing
> reduced-motion blocks (or a new one at the same `@media` query), not gated
> by ad-hoc JS (doc 12 "Reduced Motion").

---

## 8. Verification

Paths below use the real Library roots per
[19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md)
§Verified File Paths. There is **no** `src/components/library/` — earlier
drafts cited it; those commands returned "No such directory" (verified
2026-06-21: `ls -d src/components/library/` → "No such file or directory").
The real roots are `src/components/workshop/library/`,
`src/components/workshop/component-library/`, and
`src/components/workshop/component-library-manager/`.

```bash
# axe harness configured (post-0A only — pre-0A expect 0 matches; verified 2026-06-21)
rg "jest-axe|@axe-core|axe-core" package.json
# Expected pre-0A: 0 matches (harness is a Phase 0A deliverable, EV-0A-AXE-HARNESS — see §3).
# Expected post-0A: axe-core dependency present.

# Every Library component has an axe test (post-0A only)
rg "toHaveNoViolations" \
   src/components/workshop/library/ \
   src/components/workshop/component-library/ \
   src/components/workshop/component-library-manager/ \
   --type ts --type tsx
# Expected pre-0A: 0 matches (no harness). Expected post-0A: every component has an axe test.

# aria-live regions present for state changes (6 surfaces confirmed today — §4)
rg "aria-live|role=\"status\"" \
   src/components/workshop/library/ \
   src/components/workshop/component-library/ \
   src/components/workshop/component-library-manager/ \
   --type tsx
# Expected: at least the 6 verified regions (LibraryOverviewSearch.tsx:305, ComponentLibraryManager.tsx:968/978-979, LibraryFolderTree.tsx:1146-1147, AddComponentModal.tsx:2204, ComponentInspectorDock.tsx:271, TemplateGallery.tsx:247/255-256, InsertIntoEstimatePicker.tsx:142, TemplatesBrowsePageClient.tsx:27, component-library/index.tsx:1260/2403).

# Focus management in overlays — check whether a focus-trap primitive exists today
rg -i "focus.?trap|FocusTrap" src/components/ui/
# Expected pre-0A: 0 matches — verified 2026-06-21. NO standalone FocusTrap primitive in the overlay inventory (Modal/AppModal/BlurModal, ConfirmDialog, Sheet/Drawer/SidePanel/InspectorDrawer, Popover, Combobox). Focus trapping is a Phase 0B prerequisite (EV-0B-FOCUS-TRAP, see §3) until then focus-cycle behavior is verified manually + via Playwright in [29](29-BROWSER-PROOF-AND-VISUAL-QA-MATRIX.md).

# Reduced motion blocks in globals.css (9 verified today)
rg -n "@media.*prefers-reduced-motion" src/app/globals.css
# Expected: at least 9 hits at :309, :1042, :1097, :1128, :1327, :1741, :2279, :2436, :2501.

# No tertiary (#7F7F7F) for chip labels (WCAG AA — doc 22 §2)
rg "text-tertiary|color:.*#7F7F7F|color:.*#7f7f7f" \
   src/components/workshop/library/ \
   src/components/workshop/component-library/ \
   src/components/workshop/component-library-manager/ \
   --type tsx
# Expected: 0 matches for chip-label usage (tertiary allowed only for non-load-bearing decoration — doc 22 §2).

# No "badge" for trust/freshness/status labels (C-002: canonical term is chip)
rg -i "\bbadge\b" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/ -g "*.md" | rg -i "trust|freshness|stale|status"
# Expected: 0 matches.
```

---

## 9. A11y acceptance gate (Phase 0A exit)

This is the **gate** the A11y lead satisfies at Phase 0A exit. It is the
single acceptance gate this doc owns.

| # | Criterion | Verification command | Pass condition | Owner | Phase | Evidence |
|---|---|---|---|---|---|---|
| A1 | axe harness installed (`jest-axe` + `@axe-core/playwright`) | `rg "jest-axe\|@axe-core" package.json` | both deps present | A11y lead | 0A | EV-0A-AXE-HARNESS |
| A2 | First axe test per Library surface (overview, components, inspector, quick-add, overlays, trust chip, folder tree, template gallery, template editor) | `rg "toHaveNoViolations" src/components/workshop/library/ src/components/workshop/component-library/ src/components/workshop/component-library-manager/ --type tsx` | 9+ test files (one per surface) | A11y lead | 0A | EV-0A-AXE-HARNESS |
| A3 | `FocusTrap` primitive shipped in `src/components/ui/` | `rg -l "FocusTrap\|focus-trap" src/components/ui/` | ≥1 hit (the new primitive) | Frontend lead | 0B | EV-0B-FOCUS-TRAP |
| A4 | 6 existing aria-live regions carry keyed copy (not hardcoded English) | `rg "older than 90 days\|Loading your library\|Loading components" src/components/workshop/library/ src/components/workshop/component-library/ src/components/workshop/component-library-manager/ --type tsx` | 0 hits (all keyed) | i18n lead + Copy lead | 1 | EV-A11Y-LIVE-KEYS |
| A5 | 2 NET-NEW aria-live categories landed (overlay open/close + very-stale assertive) | manual + axe (post-0A) | VoiceOver announces open/close + very-stale confirm | A11y lead | 0B/2 | EV-A11Y-LIVE-NETNEW |
| A6 | No `text-tertiary` (#7F7F7F) for chip labels | `rg "text-tertiary" src/components/workshop/library/ src/components/workshop/component-library/ src/components/workshop/component-library-manager/ --type tsx \| rg -i "chip\|trust\|stale\|label"` | 0 hits | A11y lead + Frontend lead | 2 | EV-A11Y-CONTRAST |
| A7 | VoiceOver macOS pass on all Library surfaces (Phase 1 exit subset) | manual VoiceOver walkthrough | no orphan controls, no unlabeled regions, focus order matches visual order | A11y lead | 1 | EV-A11Y-VOICEOVER-P1 |

This gate is the **single Phase 0A/0B/1 exit condition this doc owns**. The
broader Phase 0A exit (i18n runtime, perf baseline) is owned by docs 28/30.

---

## 10. Gap closure

### Current state (verified 2026-06-21)

- Doc 12 defines responsive/a11y contract; this doc tabulates per-surface ✓
- Doc 06 warns axe harness is missing ✓ (confirmed: 0 hits in `package.json`)
- Doc 18 has a11y-related ADV rows ✓
- **Per-surface a11y acceptance criteria** bound to real file:line — FILLED by §4 (was the gap).
- **Live region copy table** — FILLED by §5, bound to real DOM targets (was the gap).
- **Focus management contract per surface** — FILLED by §6, with `FocusTrap` absence verified (was the gap).
- **Reduced motion contract** bound to 9 verified `globals.css` blocks — FILLED by §7.
- **Phase 0A exit gate** as 7 evidence rows (A1–A7) — FILLED by §9 (was the gap).
- **Glass-surface contrast acceptance** bound to doc 35 §10 + the `--tertiary:#7F7F7F` AA failure lesson — FILLED by §2.

### Required updates to other docs

- [12-RESPONSIVE-ACCESSIBILITY-INTERACTION-CONTRACT.md](12-RESPONSIVE-ACCESSIBILITY-INTERACTION-CONTRACT.md): add per-surface a11y criteria references to this doc (§4) — **DONE in this hardening pass (see doc 12 §"A11y test matrix")**.
- [06-QA-AND-VALIDATION-PLAN.md](06-QA-AND-VALIDATION-PLAN.md): add axe test matrix references to this doc (§3 + §9 A1–A7).
- [22-COPY-DECK-AND-MICROCOPY.md](22-COPY-DECK-AND-MICROCOPY.md): add live region copy keys from §5 — **DONE (doc 22 §12A)**.
- [10-LIBRARY-SURFACE-SPECS.md](10-LIBRARY-SURFACE-SPECS.md): add `A11y:` field per surface row using the §4 acceptance template.
- Every doc with actionable rows: add `A11y:` field per row (delegate to §4 or §5 here).

---

## 11. Sign-off

| Reviewer | Verdict | Date | Notes |
|---|---|---|---|
| A11y lead | pending | — | Gates on §9 (A1–A7) |
| Frontend lead | pending | — | Gates on A3 (`FocusTrap` primitive, Phase 0B) |
| Design lead | pending | — | Gates on §2 glass-surface contrast acceptance |
| Reviewer gate (Oracle) | pending | — | — |

The a11y matrix is complete (as a planning-achievable contract) when:
1. Every surface in §4 has a pass condition for each a11y dimension, bound to real file:line.
2. Every live region copy key from §5 is in [22](22-COPY-DECK-AND-MICROCOPY.md) §12A and bound to a real DOM target (or flagged NET-NEW w/ phase).
3. The §9 gate (A1–A7) defines the Phase 0A/0B/1 exit in pre-registered evidence rows.
4. All four reviewers sign off above.

Execution (A1–A7 green) is tracked in
[24-EXECUTION-EVIDENCE-LEDGER.md](24-EXECUTION-EVIDENCE-LEDGER.md); this doc
is **planning-complete** when §1–§10 are internally consistent and bound to
real code, regardless of whether A1–A7 have shipped.

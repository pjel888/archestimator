# 29 — Browser-Proof and Visual QA Matrix

> **Status:** DRAFT framework, not build-ready proof obligations. Path
> bindings corrected to the real `src/components/workshop/library/`,
> `src/components/workshop/component-library/`, and
> `src/components/workshop/component-library-manager/` roots per
> [19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md).
> The `evidence/screenshots/` directory does **not** exist yet — it is created
> in Phase 0A as part of the baseline measurement task (owner: QA lead; see
> [30-PERF-BUDGET-AND-REGRESSION-GATES.md](30-PERF-BUDGET-AND-REGRESSION-GATES.md) §2 and the EV rows in
> [24-EXECUTION-EVIDENCE-LEDGER.md](24-EXECUTION-EVIDENCE-LEDGER.md)). Sign-offs in §9 are pending; treat this as a
> template until they land. Living document, initialized 2026-06-21 by the
> Ultrawork audit loop.
>
> **Scope:** jsdom vs Playwright boundary, visual QA matrix, browser matrix,
> screenshot artifacts, evidence naming convention, and per-surface proof
> requirements.
>
> **Companion docs:** [06-QA-AND-VALIDATION-PLAN.md](06-QA-AND-VALIDATION-PLAN.md),
> [18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md](18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md),
> [24-EXECUTION-EVIDENCE-LEDGER.md](24-EXECUTION-EVIDENCE-LEDGER.md),
> [27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md](27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md),
> [35-LIQUID-GLASS-LIBRARY-UX-SPEC.md](35-LIQUID-GLASS-LIBRARY-UX-SPEC.md) (glass blur/contrast = Playwright; logic = jsdom).

---

## 1. Purpose

Not every claim needs a browser. Some claims can be proven by jsdom (unit
tests), others require a real browser (Playwright). This doc defines:

1. **The jsdom vs Playwright boundary** — which claims need which proof.
2. **The browser matrix** — which browsers/devices must be tested.
3. **Screenshot artifact convention** — how to name and store visual evidence.
4. **Per-surface proof requirements** — what each Library surface must prove.
5. **Verification** — how to confirm browser-proof compliance.

---

## 2. The jsdom vs Playwright boundary

### jsdom (vitest, `bun run test:dom`)

jsdom is sufficient for:

- **Logic tests** — state transitions, pure functions, data transformations
- **DOM structure tests** — component renders expected elements/attributes
- **Event handler tests** — click/keydown triggers expected callback
- **Form validation tests** — invalid input shows error, valid input submits
- **Query/mutation tests** — cache invalidation, query key scoping
- **Unit-level a11y tests** — ARIA attributes, role, tabindex, focus management (jsdom)
- **Copy/key tests** — correct key is rendered, pluralization selects correct form
- **Telemetry emission tests** — event is emitted with correct payload

### Playwright (`bun run test:e2e`)

Playwright is required for:

- **Visual rendering** — layout, spacing, color, typography, responsive breakpoints
- **Glass blur / surface treatment** — `backdrop-filter` rendering, the one-blur-per-region rule, deferred arming via `<html data-glass="ready">`, and AA contrast over frosted white are all paint-time concerns invisible to jsdom. Logic (which variant renders) is jsdom; the *look* is Playwright. See [35-LIQUID-GLASS-LIBRARY-UX-SPEC.md](35-LIQUID-GLASS-LIBRARY-UX-SPEC.md) §10–§11.
- **Focus management (real browser)** — focus trap in overlay, focus return on close
- **Keyboard navigation (real browser)** — tab order, arrow keys, Enter/Space/Esc
- **Screen reader (real browser)** — live region announcements, ARIA label reading
- **Cross-browser behavior** — Chrome, Firefox, Safari differences
- **Mobile/touch behavior** — tap targets, swipe gestures, viewport-based layout
- **Scroll/viewport behavior** — sticky headers, infinite scroll, viewport intersection
- **Network behavior** — real fetch, real cache, real service worker
- **Concurrency/race conditions** — real async timing, real paint cycles
- **Geometry-sensitive rendering** — dense mode rows, chip wrapping, text truncation
- **Overlay/stacking** — z-index, pointer-events, scroll-lock

### Decision rubric

| Claim type | jsdom OK? | Playwright required? |
|---|---|---|
| "Function returns X for input Y" | ✓ | — |
| "Component renders element with role R" | ✓ | — |
| "Click triggers callback" | ✓ | — |
| "Form validates input" | ✓ | — |
| "Cache key is workspace-scoped" | ✓ | — |
| "Event is emitted with payload P" | ✓ | — |
| "Layout looks correct at breakpoint B" | — | ✓ |
| "Focus trap works in overlay" | partial (jsdom: Testing Library assertions against `ui/overlays/modal.tsx` `AppModal`/`BlurModal` and `ui/overlays/sheet-drawer.tsx` `Sheet`/`Drawer`) | ✓ (real browser focus-cycle order) |
| "Screen reader announces state change" | — | ✓ |
| "Tab order is correct" | partial | ✓ (real browser) |
| "Dense mode row doesn't overflow" | — | ✓ |
| "Chip wraps correctly on mobile" | — | ✓ |
| "Works in Safari" | — | ✓ |
| "Touch target is ≥44px" | — | ✓ |
| "Scroll-lock prevents background scroll" | — | ✓ |

> **Harness reality (per keystone §Test Commands):** there is **no** axe /
> jest-axe a11y harness today, and no standalone `FocusTrap` primitive in the
> overlay inventory (`Modal`/`AppModal`/`BlurModal`, `ConfirmDialog`,
> `Sheet`/`Drawer`/`SidePanel`/`InspectorDrawer`, `Popover`, `Combobox`).
> axe automation is a Phase 0A net-new per
> [31-A11Y-ACCEPTANCE-CRITERIA-MATRIX.md](31-A11Y-ACCEPTANCE-CRITERIA-MATRIX.md) §3;
> pre-0A a11y is manual ARIA/focus assertions in Testing Library only. jsdom
> focus-trap coverage is therefore partial until the harness exists.

---

## 3. Browser matrix

### Beta requirement

| Browser | Version | Devices | Priority |
|---|---|---|---|
| Chrome | latest 2 | Desktop (macOS, Windows) | P0 |
| Safari | latest 2 | Desktop (macOS), iOS | P0 |
| Firefox | latest 2 | Desktop (macOS, Windows, Linux) | P1 |
| Edge | latest 2 | Desktop (Windows) | P2 |

### Mobile matrix

| Device | Viewport | Browser | Priority |
|---|---|---|---|
| iPhone 15 | 393×852 | Safari iOS | P0 |
| iPhone SE | 375×667 | Safari iOS | P1 |
| iPad | 810×1080 | Safari iPadOS | P1 |
| Pixel 8 | 412×915 | Chrome Android | P1 |
| Galaxy S23 | 360×780 | Chrome Android | P2 |

### Visual QA breakpoints

| Breakpoint | Width | Target |
|---|---|---|
| `sm` | 640px | Mobile (portrait) |
| `md` | 768px | Tablet (portrait) |
| `lg` | 1024px | Tablet (landscape) / small laptop |
| `xl` | 1280px | Desktop |
| `2xl` | 1536px | Large desktop |

---

## 4. Screenshot artifact convention

### Naming

```
<phase>/<surface>/<state>-<browser>-<viewport>.png
```

Examples:
```
phase-1/library-overview/default-chrome-1280.png
phase-1/library-overview/empty-safari-iphone15.png
phase-1/library-overview/loading-firefox-1024.png
phase-1/library-overview/error-chrome-1280.png
phase-3/component-card/trust-stale-chrome-1280.png
phase-3/component-card/trust-very-stale-chrome-1280.png
phase-5b/dense-mode/row-default-chrome-1280.png
phase-5b/dense-mode/row-overflow-safari-iphone15.png
```

### Storage

```
.ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/evidence/screenshots/
```

> **Prerequisite (0A):** this directory does **not** exist today — the pack has
> no `evidence/` dir at all. It must be created in Phase 0A as part of the
> baseline measurement task (owner: QA lead; evidence: `EV-HARNESS-SCREENSHOTS`;
> binding: [24-EXECUTION-EVIDENCE-LEDGER.md](24-EXECUTION-EVIDENCE-LEDGER.md)
> §screenshot harness; seq: add to
> [05-IMPLEMENTATION-ROADMAP.md](05-IMPLEMENTATION-ROADMAP.md) 0A scope). Until
> 0A, do not assume the path exists and do not let any §7 `ls` check pass.

### Metadata

Each screenshot must have a companion `.json` file:

```json
{
  "screenshot": "phase-1/library-overview/default-chrome-1280.png",
  "phase": "1",
  "surface": "library-overview",
  "state": "default",
  "browser": "chrome",
  "viewport": "1280",
  "captured_at": "2026-06-21T12:00:00Z",
  "evidence_id": "EV-001",
  "captured_by": "QA lead",
  "git_commit": "abc1234",
  "pass_condition": "Layout renders correctly at 1280px with no overflow",
  "verdict": "pass"
}
```

---

## 5. Per-surface proof requirements

Every surface in [10-LIBRARY-SURFACE-SPECS.md](10-LIBRARY-SURFACE-SPECS.md) must declare:

> **Binding column** sourced from [19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Verified File Paths. The "Dense mode row" surface has no spec row in doc 10 today — it is Phase 5 (the density toggle is net-new per the keystone §Canonical Phase Map); add a spec row to doc 10 or mark it "no spec yet — Phase 5".

| Surface | Binding (real file:line) | jsdom tests | Playwright tests | Browser matrix | Viewports | States |
|---|---|---|---|---|---|---|
| Library overview | `src/components/workshop/library/overview/LibraryOverview.tsx`; search input `LibraryOverviewSearch.tsx` | state transitions, cache key scoping | layout at each breakpoint, responsive grid | Chrome, Safari | sm, md, lg, xl | default, loading, empty, error, permission-denied |
| Component card / grid | `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx` (client-side synchronous search/filter at `:876-882`, tree in `ResizableSidePanel`); card helpers in `src/components/workshop/component-library/` | state rendering, chip logic | chip layout, text truncation, wrap behavior | Chrome, Safari, Firefox | sm, md, lg | default, loading, error, stale, very-stale, missing |
| Component inspector | `src/components/workshop/library/ComponentInspectorDock.tsx` (315 lines) | field rendering, validation | panel slide, field layout, scroll behavior | Chrome, Safari | md, lg, xl | default, loading, error, permission-denied |
| Quick add form | `src/components/workshop/component-library-manager/AddComponentModal.tsx` (dirty-discard confirm at `:963`) | validation logic, submit | form layout, field focus, error display | Chrome, Safari, Firefox | sm, md, lg | default, validation-error, submit-success, submit-error |
| Folder management | `ComponentLibraryManager.tsx:1493-1534` (native prompt debt to migrate — create `:1493`, rename `:1515`, delete `:1534`); inline pattern to copy at `src/components/workshop/library/templates-browse/TemplatesBrowseManager.tsx:531-883` | tree logic, CRUD | tree layout, drag-drop, context menu | Chrome, Safari | md, lg, xl | default, empty, error, archive-confirm, delete-confirm |
| Template preview / insert | `src/components/workshop/library/template-editor/`; insert resolver `resolveEstimateTemplateInsertTarget`; picker `InsertIntoEstimatePicker.tsx:99-118` | preview logic | preview layout, insert flow, route transition (`/workshop/library/templates/[templateId]`) | Chrome, Safari | md, lg, xl | default, loading, error, not-found |
| Overlay/modal | `ui/overlays/modal.tsx` (`AppModal`/`BlurModal`), `ui/overlays/confirm-dialog.tsx` (`ConfirmDialog`), `ui/overlays/sheet-drawer.tsx` (`Sheet`/`Drawer`/`InspectorDrawer`) | open/close logic, focus trap (jsdom, partial) | focus trap (real), scroll-lock, stacking, z-index (`z-[1000]`/`z-[1050]`/`z-[1100]`) | Chrome, Safari, Firefox | sm, md, lg | default, open, close, error, esc-to-close |
| Trust chip | `src/components/workshop/library/component-facet-filter.tsx:12,61` (`COMPONENT_FACET_STALE_DAYS`, `getComponentPricingFreshness`); helpers `src/components/workshop/component-library/helpers.ts:667,675` | state logic, copy key | chip rendering, icon + text layout, tooltip | Chrome, Safari | sm, md, lg | fresh, stale, very-stale, missing, public-snapshot |
| Search/filter | components-tab search at `ComponentLibraryManager.tsx:876-882` (client-side synchronous); overview search at `LibraryOverviewSearch.tsx` | debounce logic, filter state | search input, filter chips, results layout | Chrome, Safari, Firefox | sm, md, lg | default, typing, results, no-results, filter-applied |
| Dense mode row | (no spec row in doc 10 — Phase 5; density toggle is net-new per keystone) | row logic | row layout, column widths, overflow, virtualization (reuse `src/lib/workshop/virtualization-flags.ts`) | Chrome, Safari | lg, xl | default, hover, selected, overflow |
| Public snapshot | `src/app/share/[token]` + `src/app/api/share/[token]/route.ts` (frozen snapshot from `project_publications.snapshot_json`) | redaction logic | snapshot layout, frozen trust label | Chrome, Safari | sm, md, lg, xl | default, redacted, expired |

### Acceptance template (for every actionable row)

```
Browser-proof: jsdom | Playwright | both | n/a
```

---

## 6. Evidence ledger integration

Every Playwright proof must have an evidence row in
[24-EXECUTION-EVIDENCE-LEDGER.md](24-EXECUTION-EVIDENCE-LEDGER.md):

```
| EV-<n> | <surface> <state> <browser> <viewport> | Playwright screenshot | <pass condition> | QA lead | <phase> | <screenshot path> |
```

---

## 7. Verification

Paths below use the real Library roots per
[19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md)
§Verified File Paths. There is **no** `src/components/library/` — earlier
drafts cited it; those commands returned "No such directory".

```bash
# Library surface roots exist (expect all four)
ls -d src/components/workshop/library/ \
      src/components/workshop/component-library/ \
      src/components/workshop/component-library-manager/ \
      src/app/workshop/library/

# Every actionable row in every doc has a Browser-proof: field
rg "Browser-proof:" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/ -g "*.md" --count
# Expected: measured baseline is ~1 pack-wide today (only this doc + doc 16-adjacent rows declare it); the "26+ files" target is aspirational until Wave 2 adds the field per doc.

# Screenshot artifacts exist for every Playwright-required surface (Phase 0A onward only)
ls .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/evidence/screenshots/ 2>&1
# Expected pre-0A: "No such file or directory" — the dir is created in Phase 0A (see §4 prerequisite).
# Expected post-0A: directory with screenshots matching the naming convention in §4.

# Every screenshot has a companion .json metadata file (Phase 0A onward only)
find .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/evidence/screenshots/ -name "*.png" 2>/dev/null | while read f; do
  json="${f%.png}.json"
  if [ ! -f "$json" ]; then echo "MISSING: $json"; fi
done
# Expected: 0 missing .json files (once the directory exists).
```

---

## 8. Gap closure

### Current state

- Doc 06 defines the jsdom vs Playwright boundary but doesn't tabulate per-surface ✓
- Doc 18 defines adversarial scenarios but doesn't specify browser per row ✓
- Doc 24 has evidence rows but doesn't define screenshot naming/storage ✓
- No per-surface proof matrix (this doc fills that gap)

### Required updates to other docs

- [06-QA-AND-VALIDATION-PLAN.md](06-QA-AND-VALIDATION-PLAN.md): add per-surface browser-proof boundary references to this doc
- [18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md](18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md): add `Browser-proof:` field per ADV row
- [24-EXECUTION-EVIDENCE-LEDGER.md](24-EXECUTION-EVIDENCE-LEDGER.md): add screenshot artifact path + naming convention (§4)
- [10-LIBRARY-SURFACE-SPECS.md](10-LIBRARY-SURFACE-SPECS.md): add `Browser-proof:` field per surface row
- Every doc with actionable rows: add `Browser-proof:` field per row

---

## 9. Sign-off

| Reviewer | Verdict | Date | Notes |
|---|---|---|---|
| QA lead | pending | — | — |
| Design lead | pending | — | — |
| Planning lead | pending | — | — |
| Reviewer gate (Oracle) | pending | — | — |

The browser-proof matrix is complete when:
1. Every surface in §5 has jsdom + Playwright tests declared.
2. Every screenshot follows the naming convention in §4.
3. Every evidence row in 24 has a screenshot path.
4. All four reviewers sign off above.

# 10 — Test & QA Plan

Consolidated test matrix anchored to the existing
`tests/vitest/estimate-tab-strip.test.tsx` (9 tests today). The per-unit
scenarios in [07](07_IMPLEMENTATION_PLAN.md) remain authoritative for detail;
this doc gives the single view the audit found missing — **which existing tests
break under U2, which survive as regression guards, and what is net-new** — so
the implementer doesn't change behavior blindly.

> **Posture:** test-first. For each behavioral change, write/adjust the failing
> assertion before touching the component.

---

## 1. Existing tests — break vs. survive

| # | Test (line) | Fate | Why |
|---|---|---|---|
| 1 | renders WAI-ARIA tablist ([:59](tests/vitest/estimate-tab-strip.test.tsx#L59)) | ✅ **survive** | tablist semantics unchanged |
| 2 | roving keyboard + Enter ([:67](tests/vitest/estimate-tab-strip.test.tsx#L67)) | ✅ **survive** | keyboard nav unchanged |
| 3 | "keeps create/duplicate/rename controls hidden until lifecycle gate" ([:83](tests/vitest/estimate-tab-strip.test.tsx#L83)) | ⚠️ **REWRITE** | asserts the *toolbar-button* model U2 removes (queries "Duplicate tab" / "Rename active tab" buttons that will no longer exist). Replace with the new gating model: gate off (`canEditEstimate=false`) → no "+", no context menu, no double-click rename. |
| 4 | spring-load on drag hover ([:91](tests/vitest/estimate-tab-strip.test.tsx#L91)) | ✅ **survive** (re-verify) | must still pass with the single-`ContextMenu` wrapper — `dragOver` must reach the tab |
| 5 | cancel spring-load on drag leave ([:105](tests/vitest/estimate-tab-strip.test.tsx#L105)) | ✅ **survive** (re-verify) | same wrapper caveat |
| 6 | reject cross-tab tree-node drop ([:117](tests/vitest/estimate-tab-strip.test.tsx#L117)) | ✅ **survive** (re-verify) | `drop` + toast must still fire through the wrapper |
| 7 | rename via gated lifecycle path ([:134](tests/vitest/estimate-tab-strip.test.tsx#L134)) | ⚠️ **REWRITE** | clicks the "Rename active tab" pencil button U2 removes. Re-point to rename via **context menu → Rename** and/or **double-click**. |
| 8 | keyboard reorder + focus ([:158](tests/vitest/estimate-tab-strip.test.tsx#L158)) | ✅ **survive** | `Ctrl/Cmd+Shift+Arrow` reorder unchanged |
| 9 | focus nearest tab after delete ([:186](tests/vitest/estimate-tab-strip.test.tsx#L186)) | ⚠️ **REWRITE** | clicks the "Delete active tab" toolbar button U2 removes. Re-point to **context menu → Delete** on the target tab. |

**Net: 3 rewrites (3, 7, 9), 6 survive (3 of which need a wrapper re-verify).**
The breakage in tests 3/7/9 is the concrete signal that U2 is a real refactor,
not a flag flip — do not delete these tests, port their intent to the new model.

---

## 2. Net-new automated tests (Vitest)

Grouped by unit. Mirror the existing fixture/mock setup (`actionMocks`,
`fixtureTabs`, `renderStrip`).

**U1 / U3 — gating**
- `canEditEstimate=true` → "+" renders; double-click rename works; context menu attaches.
- `canEditEstimate=false` (or omitted) → no "+", no context menu, double-click is inert.
- `estimateTabs.length === 0` → strip not rendered (fail-closed).

**U2 — context menu + target-tab semantics**
- Right-click tab B while A active → menu opens; Delete removes **B**; active stays A.
- Menu → Rename targets the right-clicked tab (not active).
- **Focus contract:** menu → Rename leaves the input focused with the name intact;
  the menu-close focus event does **not** fire an empty/early commit.
- **Background-tab rename:** right-click a non-active/overflowed tab → Rename →
  that tab scrolls into view + input focused, without activating it.
- Menu → Duplicate → copy created and activated.
- Delete disabled with reason when `orderedTabs.length === 1`.
- No "Duplicate tab" / "Rename active tab" / "Delete active tab" / Archive
  toolbar buttons exist even when `enableLifecycleActions` is true.
- Double-click rename still works (ported from test 7).
- Cross-tab drag rejection still fires (ported / re-verified from test 6).

**U4 — optimistic create**
- Create updates the tabs list from the returned array without a second fetch.
- Optimistic temp tab appears, reconciles on success, rolls back + shows error on failure.
- `optimistic-`-prefixed id is never passed to a server action.

**U5 — polish**
- Many tabs → "+" stays present/visible (not scrolled away).
- Create / activate / rename-target → `scrollIntoView` invoked.
- `prefers-reduced-motion` → no enter transition, instant scroll.
- "+" has an accessible tooltip ("New tab").

**U6 — empty state**
- "+"-created empty tab renders "This tab is empty" + Add Group + Browse templates.
- Add Group from the empty state creates a root group in the **new** tab.
- Viewer → empty-state action buttons absent/disabled.

---

## 3. Manual / integration smoke checklist

Run as an editor in the live editor; capture evidence in `.ai/05_logs/`.
Pass criteria detailed in [06 §3a](06_BLAST_RADIUS.md).

- [ ] Create → switch → inline rename armed → name commits.
- [ ] Right-click each of: active tab, background tab, last remaining tab.
- [ ] Delete a background tab; confirm active tab unchanged.
- [ ] Delete down to one tab; Delete now disabled.
- [ ] Export with an empty "+"-created tab → valid workbook, one empty worksheet, scope chip shows the name.
- [ ] Activity feed shows "created {Tab}".
- [ ] Cross-tab node drag → rejection toast.
- [ ] Viewer (if reachable, OQ1) → read-only switcher only.
- [ ] 375px width: strip scrolls, "+" reachable, menu usable; touch long-press opens menu (or documented fallback).
- [ ] `prefers-reduced-motion` on → no motion.
- [ ] Screenshots: default / overflow / menu-open / empty-state / 375px.

---

## 4. Gate

`bun run validate` (type-check, ESLint, design-system, unit, DOM Vitest) +
`bun run build` + `lint:design-system` green; `gitnexus_detect_changes()` shows
only expected symbols/flows; screenshot proof attached.

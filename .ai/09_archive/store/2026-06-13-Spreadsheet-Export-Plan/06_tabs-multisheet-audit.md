# 06 — Tabs → Multi-Worksheet Audit

> **What this is:** a focused, cross-cutting deep-dive on how the estimate **tabs** feature maps to **worksheets** in the exported workbook — the user's explicit concern ("we have tabs now which should create different tabs in the spreadsheet"). Draws on all five research lenses; evidence in [`_research/01-architecture-blast-radius.md`](_research/01-architecture-blast-radius.md) §4.

---

## TL;DR — it already works, but the preview lies and a few edges are sharp

**Multi-tab export is implemented and tested.** When an estimate has more than one tab, the download produces **one Bid Form worksheet per tab** plus a combined Summary, Commercial Terms, and a tab-aware Source Breakdown. Worksheet names are sanitized for Excel's rules and de-duplicated. This is genuinely good. The problems are: (1) the **preview shows only the active tab** while the default download is all tabs (the [03](03_ux-ui-audit.md) UX-2 truth gap); (2) the all-tabs path is a **redundant DB fan-out** ([04](04_performance-reliability-audit.md) PR-3); and (3) a handful of **edge cases** (combined limit, archived-tab race, legacy estimates) are real but mostly handled or low-frequency.

---

## 1. How a tab becomes a worksheet

### Storage & identity
- Table **`estimate_tabs`** (`id, estimate_id, name, sort_order, is_default, archived_at, metadata, …`). `EstimateTabSummary = { id, name, sortOrder, isDefault }` (`estimates/types.ts:143-151`).
- A synthetic **`legacy-main`** tab `{ id:"legacy-main", name:"Main", isDefault:true }` is injected **client-side** when an estimate has no real tabs (`EstimateWorkspaceClient.tsx:81`). `EstimateSheetContent` filters it out of "persisted" tabs (`:753-754`), so the export scope UI and `?tab=` href never reference it; such downloads fall through to the server's no-`?tab` path.

### Dispatch (server) — `route.ts:207-216`
```
?tab=<id>      → buildSingleTabResponse(tabId)   → getEstimateTabTree(tabId)        → 1 Bid Form ("Bid Form")
no ?tab, ≤1 tab→ buildSingleTabResponse(null)    → getProjectEstimateTreeByEstimate → 1 Bid Form ("Bid Form")
no ?tab, >1 tab→ buildAllTabsResponse(tabs)      → Promise.all(getEstimateTabTree)  → 1 Bid Form PER TAB + combined Summary
```

### Worksheet naming — `worksheet-name.ts` (solid, tested)
- One Bid Form sheet per tab, named from the **sanitized tab name** (`buildUniqueWorksheetNames`, `route.ts:180`).
- Rules: NFKD-normalize, strip combining marks, replace Excel-invalid `[ ] : * ? / \` and control chars with space, collapse whitespace, **truncate to 31 chars**, empty → `"Tab"`.
- **Uniqueness:** duplicate names get ` (2)`, ` (3)` suffixes kept inside the 31-char limit.
- **Reserved names:** `"history"` + the global sheets `Summary`, `Commercial Terms`, `Source Breakdown` are pre-seeded, so a tab literally named "Summary" becomes "Summary (2)" and never collides with the global Summary sheet.
- Cross-sheet formulas escape apostrophes: `'Owner''s Scope'!H20`.

### Workbook assembly — `create-proposal-workbook.ts:521-534`
Tabbed model → `Summary` (first) → one Bid Form-style sheet per tab → `Commercial Terms` → `Source Breakdown` (with a leading `TAB` column). The combined Summary lists each tab's sections under a tab header row and reduces the grand total across all tabs; empty tabs render a "No exportable rows" placeholder.

---

## 2. What's good

- ✅ **The core requirement is met:** tabs → separate worksheets, automatically, with a roll-up Summary.
- ✅ **Excel-safe naming** with truncation, de-duplication, reserved-name protection, and apostrophe-escaped cross-sheet references — all unit-tested (`proposal-worksheet-name.test.ts`).
- ✅ **Combined size limit is summed correctly across tabs** (not 1200/tab) — a 5-tab estimate shares one 1200-node / 3000-row budget (`route.ts:166-176`).
- ✅ **Real round-trip integration test** builds a 2-tab workbook and asserts sheet names, cross-sheet formulas, and the TAB column (`proposal-export-route-workbook.test.ts`).
- ✅ Empty-tab and empty-estimate cases produce valid workbooks.

---

## 3. Issues specific to tabs (carried into the findings register)

| ID | Sev | Issue | Evidence | Lens |
|---|---|---|---|---|
| TAB-1 | **CRITICAL** | **Preview ≠ all-tabs download.** Default scope is "all-tabs" but the preview renders only the active tab and shows the active tab's grand total; the file contains every tab with a much larger total. | `EstimateSheetContent.tsx:1064-1074` vs `route.ts:154-205` | UX |
| TAB-2 | **HIGH** | **All-tabs DB fan-out.** `Promise.all` over tabs re-fetches workspace/project/estimate once per tab (~5 queries/tab, ~50 round-trips for 10 tabs); no `allSettled`, so one failing tab fails the whole export. | `route.ts:155-160`; `workspace-repository.ts:1737-1749` | Perf/Reliability |
| TAB-3 | **MEDIUM** | **Archived/deleted-tab race (TOCTOU).** If a tab is archived between `getEstimateTabs` and the `Promise.all` fetch, `throw new Error("Estimate tab export mapping failed.")` → uncaught 500. | `route.ts:188` | Reliability |
| TAB-4 | **MEDIUM** | **All-tabs over-fetch on 413.** Each tab fetches up to its full cap before the summed cap is checked; a giant 10-tab estimate reads ~30k rows only to reject. | `route.ts:166-176` | Perf |
| TAB-5 | **MEDIUM** | **Single-tab Summary fragility not shared.** The per-tab/all-tabs Summary computes totals dynamically (correct); the **single-tab** Summary uses fixed cells A27–B32 and corrupts past ~11 sections — inconsistent behavior between the two paths. | `create-…:297-311` vs `:395-420` | Correctness |
| TAB-6 | **LOW** | **`legacy-main` coupling.** The magic string lives in two client files + AI context; a legacy estimate (no real tabs) silently uses the no-`?tab` server path. If `estimate_tab_id` is unpopulated for legacy estimates, an all-tabs export could yield empty trees (unverified — DB channel unavailable). | `EstimateWorkspaceClient.tsx:81`; `read-context.ts:1257` | Architecture |
| TAB-7 | **LOW** | **No "split by division" option.** Per-tab sheets are a reasonable analog to the industry "one sheet per trade/division," but trade-organized single-tab estimates can't be split into per-division sheets. | — | Format |

> **Alias note:** TAB-1/2/3/4/5 map to register IDs **F-04 / F-14 / F-25 / F-24 / F-16**. **TAB-6** (`legacy-main` coupling) and **TAB-7** are not assigned defect F-numbers — TAB-6 is a LOW architecture note and TAB-7 is a P3 *enhancement* carried in §4 below, not a defect. ([07](07_findings-register.md) records this reconciliation.)

---

## 4. Recommendations (tab-specific)

1. **Fix TAB-1 (P0):** when scope = all-tabs, either build the preview across all persisted tabs (note: other tabs aren't loaded client-side, so this needs a fetch) **or** replace the single-tab grand total with the true combined total / hide it with "All N tabs — total in the downloaded Summary," and promote the disclaimer to a visible inline warning.
2. **Fix TAB-2 (P1):** fetch workspace/project/estimate **once**, then per-tab nodes+rows (or two bulk `estimate_id`-scoped queries grouped by `estimate_tab_id`). Use `Promise.allSettled` and degrade gracefully (skip + warn on a failed tab) instead of failing the whole export.
3. **Fix TAB-3 / TAB-5 (P1):** wrap the tab-mapping/throw in try/catch (route-level, see [04](04_performance-reliability-audit.md) #2); unify the single-tab Summary onto the dynamic-totals path used by the tabbed Summary.
4. **TAB-4 (P2):** accumulate node/row counts as tabs resolve and short-circuit to 413 before building.
5. **TAB-6 (P2):** centralize the `legacy-main` constant; add a regression test that a legacy/no-tab estimate downloads via the no-`?tab` path; confirm `estimate_tab_id` population for legacy estimates when the DB channel is available.
6. **TAB-7 (P3):** optionally offer "split sheets by division/section" for trade-organized estimates (ties to the canonical division taxonomy in [02](02_boq-format-benchmark.md) G7/G13).
7. **Naming polish:** consider prefixing per-tab Bid Form sheets with an order index (e.g. `01 ARCH`) so sheet tab order is unambiguous and matches the Summary order; keep the 31-char budget in mind.

---

## 5. Verdict

The tabs→worksheets capability is the **most complete part of the feature** and needs *no rebuild* — it needs the **preview reconciled to it (TAB-1)**, the **DB fan-out tightened (TAB-2)**, and a few **edge cases hardened (TAB-3/4/5)**. None of these block beta; TAB-1 is the only client-facing correctness risk and should ship with the P0 UX fixes.

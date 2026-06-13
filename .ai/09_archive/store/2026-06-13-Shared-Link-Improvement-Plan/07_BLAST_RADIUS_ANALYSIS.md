# 07 — Blast-Radius Analysis: Shared-Link Feature Overhaul

> **PLANNING ONLY. No code changed.** This document maps what could break if the
> public share page (`/share/[token]`) is overhauled to use full browser width
> (today capped at `max-w-[960px]`, `src/app/share/[token]/page.tsx:71`) plus
> likely typography changes and sibling-audit performance/security/db hardening.

**Date:** 2026-06-13 · **Author role:** Architecture / impact analyst ·
**Method:** `code-review-graph` MCP (primary) + targeted grep/import reading (fallback, labelled).

---

## Tooling honesty & index freshness

- **`code-review-graph` MCP (PRIMARY):** reported a **fresh** graph —
  `13561 nodes, 151434 edges across 1054 files`, risk `low (0.00)` on a clean
  tree (`get_minimal_context_tool`). All impact/flow numbers below come from this
  graph and are quoted verbatim.
- **GitNexus index (SECONDARY, NOT USED for numbers):** `npx gitnexus status`
  reports **STALE** — indexed at commit `7ed5515`, current `f1a80c8`. I did **not**
  rely on GitNexus for any number here. `[VERIFIED via gitnexus status]`
- The in-file comment blocks in `page.tsx` and `SharePageTabs.tsx` (e.g. "3375
  nodes / 47144 edges", "0 flow(s) affected") are **stale artifacts from an
  earlier branch state**; the live MCP graph is larger and now reports **non-zero
  flows** (see below). The prior "0 affected flows" claim **no longer holds** —
  see §3.
- Two raw MCP outputs exceeded the token cap and were spilled to disk; I queried
  them structurally with `jq` rather than reading raw. Portions read: the full
  `summary`/`total` and all `affected_flows[].name`/`criticality`/entry-file
  fields. I did **not** read every step of every 16-node flow path (not needed
  for blast radius). This is disclosed for integrity.

---

## 1. Summary & overall risk rating

**Overall risk: LOW–MEDIUM**, conditional on scope discipline.

- **LOW** if the overhaul stays inside share-scoped files: edit the width/typography
  *Tailwind utility classes* in `page.tsx` and `src/components/share/*`, and use the
  existing `compact` prop on `CostDonutChart`. The MCP confirms the receiver is a
  near-isolated public surface: `page.tsx` alone affects **1 production flow**
  (`generateMetadata`, its own metadata function) + 6 share-only test flows.
  `ProjectPublicationView` has exactly **1 caller** (`SharePage`, same file) —
  no upstream app callers `[VERIFIED: query_graph callers_of]`.
- **Escalates to MEDIUM/HIGH** the moment the overhaul edits a **shared
  primitive** to achieve the new look. The share page consumes app-wide shared
  components: `@/components/ui/button` (**90 importers**),
  `@/components/charts/CostDonutChart` (workshop charts + share),
  `@/components/ui/search-input` (9), `@/components/ui/header-icon-toolbar` (8),
  `@/components/workshop/workshop-tree` (3), `@/components/workshop/tree-visual-style`
  (4) `[VERIFIED: grep import counts]`. Editing any of these, or the shared design
  tokens in `src/app/globals.css`, ripples across the whole app.
- **Layout-only does NOT require a snapshot-shape change.** `ProjectPublicationSnapshot`
  (`src/lib/publication/types.ts:92`) already carries everything the view renders
  (project name/code/client/location/currency/coverImageUrl, estimates, tabs,
  rows, treeNodes). Confirmed — see §6.

One-line justification: *the receiver is structurally isolated (no upstream
callers, its only production flow is its own metadata), so width/typography
changes scoped to share files are LOW risk; risk only rises if the team reaches
into shared tokens/primitives or breaks the print-class and e2e contracts.*

---

## 2. Change-surface definition (tiers)

### Tier 0 — Layout-only headline change (expected, LOW)
- `src/app/share/[token]/page.tsx:71` — the container
  `mx-auto flex w-full max-w-[960px] ... px-4 py-6 sm:px-6` (also carries the
  load-bearing `share-print-content` class). Full-width = widen/remove `max-w-[960px]`.
- Inner section paddings/widths in `src/components/share/*` (`SharePageProposalHeader`,
  `SharePageHero`, `SharePageTabs`, `SharePageDecision`, `SharePageComments`).
- The `compact` two-column layout in `SharePageTabs.tsx:511-527` (`lg:w-[260px]`
  sidebar + `flex-1` content) — full width gives this more room; pure class change.

### Tier 1 — Typography (LOW if scoped, HIGH if tokenized)
- Share files use **literal Tailwind size classes** (`text-[12px]`, `text-[10px]`,
  `text-[9px]`, `leading-4`, etc.) — they do **not** use a `cn()` helper or shared
  typography component `[VERIFIED: grep "cn(" returned nothing in share/]`.
  Changing these per-file = LOW radius.
- **DANGER:** if typography is changed by editing `--font-sf-pro` or adding tokens
  in `src/app/globals.css` `:root`/`@theme` (lines 6-78), every surface in the app
  inherits it. HIGH radius.

### Tier 2 — Shared primitive / chart (MEDIUM–HIGH)
- `src/components/charts/CostDonutChart.tsx` — shared by share (`compact`) AND
  workshop charts (via `ProjectCostDonutChart` re-export). The `compact` branch
  (COMPACT dims, lines 66-78) is share-only and safe to tune; the FULL branch and
  shared logic are not.
- `@/components/ui/button`, `search-input`, `header-icon-toolbar`, `workshop-tree`,
  `tree-visual-style` — high cross-app fan-out (see §4).

### Tier 3 — Print / export, security/db hardening (varies; from sibling audits)
- `src/app/share/print.css` — print/PDF coupling (§6 regression).
- Security/db hardening items (CSRF, cookies, no-store, repository boundary) live
  in `src/lib/publication/*` and route handlers — **orthogonal to layout**; track
  separately, they do not share blast radius with the UI change.

---

## 3. Impact-graph results (per key symbol/file)

> All rows below: **`code-review-graph` MCP**, fresh graph. "Test flows" are graph
> flows whose entry node is a Vitest `it:` spec.

### 3a. `affected_flows` — bundled vs isolated (the crux)

| Change set | Total flows | Production flows | Test flows |
|---|---|---|---|
| **All 11 files** (incl. CostDonutChart + print.css) | **42** | `generateMetadata`, `ProjectChartsPage`, `ShareFloatingTreeNav`, `confirmDecision`, `handleExpandAll`, `handleSubTabKeyDown`, `renderNode` | ~35 share + chart specs |
| **`page.tsx` ALONE** | **7** | **`generateMetadata` only** (crit 0.83) | 6 share specs |
| **`CostDonutChart.tsx` ALONE** | **17** | **`ProjectChartsPage`** (crit 0.74, owner-side) | 16 (6 publication-page, 3 donut-hydration, + chart specs) |

`[VERIFIED: get_affected_flows_tool, jq over spilled outputs]`

**Interpretation:** the only owner-side production flow that appears,
`ProjectChartsPage` (`src/app/workshop/projects/[projectId]/charts/page.tsx`),
enters the radius **solely because `CostDonutChart` is shared**. Remove the chart
from the change set and the receiver is isolated to its own `generateMetadata`
flow + share-only tests. **This is the entire blast-radius story in one table:
keep the chart edits behind the `compact` prop and the owner charts page is
untouched.**

The earlier recorded "0 affected flows" no longer holds because (a) the graph is
now larger/fresher and (b) the analysis correctly attributes share-only Vitest
specs and the shared chart's owner-side flow. The *production* surface is still
effectively isolated for layout-only work.

### 3b. Direct callers / dependents

| Symbol | Direct callers (upstream) | Source |
|---|---|---|
| `ProjectPublicationView` | **1** — `SharePage` (same file) | `query_graph callers_of` `[VERIFIED]` |
| `SharePage` | route entry (Next.js page default export) — no app callers | inferred from RSC routing `[INFERRED]` |
| `CostDonutChart` (file) | **2 importers**: `SharePageTabs.tsx` (share) + `ProjectCostDonutChart.tsx` re-export → `ProjectChartsClient.tsx` (owner) | `query_graph importers_of` `[VERIFIED]` |
| `ShareFloatingTreeNav` | **0 real importers** — only self-referenced; **DEAD CODE on the active surface** | grep + prior memory obs #4651 `[VERIFIED]` |

### 3c. Shared-primitive fan-out (downstream blast radius if edited)

| Shared module share/ consumes | App-wide importers | Radius if edited |
|---|---|---|
| `@/components/ui/button` | **90** | HIGH (whole app) |
| `@/components/ui/search-input` | 9 | MEDIUM |
| `@/components/ui/header-icon-toolbar` | 8 | MEDIUM |
| `@/components/workshop/tree-visual-style` | 4 | MEDIUM |
| `@/components/workshop/workshop-tree` | 3 | MEDIUM |
| `@/components/charts/CostDonutChart` | 2 (share + owner charts) | MEDIUM (owner charts page) |

`[VERIFIED: grep "@/<path>" src/ import counts]`

---

## 4. Shared-dependency risk (LOW radius vs WIDE radius)

**Stays inside share-only code (LOW blast radius):**
- Width change at `page.tsx:71` (drop/raise `max-w-[960px]`). The width literal is
  share-only; nothing else reads it.
- Per-file Tailwind class edits in `src/components/share/*` (paddings, gaps,
  text-size literals, the `lg:w-[260px]`/`flex-1` split in `SharePageTabs`).
- Tuning the `compact` branch of `CostDonutChart` (COMPACT dims block, the
  `compact ? ... : ...` ternaries). Owner charts pass **no** `compact` prop and
  hit the FULL branch — unaffected, *provided the FULL/shared code paths are not
  touched*.

**Widens to the whole app (HIGH blast radius — AVOID for a layout overhaul):**
- Editing `src/app/globals.css` `:root` tokens or `@theme inline` color/font/radius
  mappings (lines 6-78). `--ink`, `--hairline`, `--surface-muted`, `--tertiary`,
  `--font-sf-pro`, `--radius-xs` are consumed app-wide. A "share typography refresh"
  done here changes workshop, landing, settings — everything.
- Editing `@/components/ui/button` (90 importers) to restyle the decision buttons.
- Editing `workshop-tree` / `tree-visual-style` to restyle the share tree — these
  back the owner-side estimate sheet tree too.

**Verdict:** The headline full-width change is genuinely LOW radius. The hidden
trap is achieving the *typography* goal via shared tokens/primitives. Keep
typography changes as share-scoped utility classes.

---

## 5. Test impact

### 5a. Expected churn (will break on layout change BY DESIGN — update, don't fear)
| Test | Assertion | Why it breaks |
|---|---|---|
| `tests/vitest/project-publication-page.test.tsx:158` | `container.querySelector(".share-print-content")` must exist; `≥2 .share-print-hidden` | **Does NOT assert width** — only the class hooks. **Will pass** as long as the new full-width wrapper keeps `share-print-content`. Listed because it touches the exact line being edited. |
| `tests/vitest/share/share-page-decision-bar-copy-contract.test.tsx:22` | "renders a **full-width** decision bar with the three client response actions" | Copy/structure contract on `SharePageDecision`; layout-tolerant but re-verify after restyle. |

### 5b. Real regression risk (action required regardless of plan)
| Test | Issue |
|---|---|
| `e2e/shared-link-receiver.spec.ts:66` | Asserts `[data-testid="sticky-decision-bar"]` is visible. **That testid does NOT exist in `SharePageDecision.tsx`** (component uses `data-testid="decision-locked-badge"` + `data-share-decision-bar="true"`). `[VERIFIED: grep "sticky-decision-bar" src/ → ABSENT]` This e2e is **already inconsistent with the code** and must not be assumed green before/after the overhaul. The overhaul should either add the `sticky-decision-bar` testid or fix the spec. |
| `e2e/shared-link-receiver.spec.ts:41,42,68,76` | Selects by `role=tab`/`role=tablist` text ("Structure", "Finishes"). A full-width tab redesign that changes roles/labels/scroll behavior would break these. Layout-tolerant if roles/labels are preserved. |

### 5c. Dimension-sensitive but SAFE under layout-only
| Test | Why it survives |
|---|---|
| `tests/vitest/share/cost-donut-chart-hydration.test.tsx:25` "byte-identical SVG" | Compares two `compact` renders to each other — **no hardcoded dimensions**. Changing COMPACT viewBox keeps it green (both renders change identically). |
| same file: "rounds to ≤4 dp", "paths.length > 0", "No cost rows" empty state | Independent of layout width; only break if rounding precision or data filtering changes (not a layout concern). |

### 5d. No visual-regression safety net exists
`[VERIFIED: grep toMatchSnapshot/toHaveScreenshot/toMatchInlineSnapshot over tests/ e2e/ for share → none]`
There are **no screenshot or DOM-snapshot tests** guarding the share layout. A
full-width redesign can silently shift visuals with zero failing tests. See §8 rec.

### 5e. Full share/publication test inventory (for the implementer to run)
`tests/vitest/project-publication-*` (17 files), `tests/vitest/share/*` (4 files),
`tests/vitest/publication-client-csrf.test.ts`, `tests/vitest/share-no-store-invariants.test.ts`,
`tests/unit/p3-shared-link-migration-red.test.ts`, `e2e/shared-link-receiver.spec.ts`,
fixtures: `tests/fixtures/publication-snapshots.ts`. Most are behavior/contract/security
tests that are **layout-agnostic** and should not move.

---

## 6. Regression scenarios & guards

| Scenario | How the overhaul could break it | Guard |
|---|---|---|
| **Print / PDF export** | `print.css` overrides `.share-print-content { max-width:none; padding:0 }` (lines 16-19). If full-width refactor **renames or drops `share-print-content`**, print loses its reset; if it changes the markup so estimate panels lose `share-print-estimate` (`SharePageTabs.tsx:439`), page-break-per-estimate (`print.css:34-37`) breaks. | Keep `share-print-content`, `share-print-hidden`, `share-print-estimate` class names on the same elements. `project-publication-page.test.tsx:150-160` enforces the source-string + DOM presence. |
| **Mobile / responsive** | Full-width can over-stretch tables/tree on large screens and break the `lg:` sidebar split (`SharePageTabs.tsx:517`). Mobile relies on `matchMedia("(max-width:767px)")` in `ShareEstimateTreeView`/`Panel`. | Cap content readability with an inner max-width or responsive padding even if the outer container is full-bleed; keep `lg:` breakpoints; manual 375px pass (no auto test). |
| **Hydration** | All share leaf components are `"use client"`; `SharePageTabs` reads `sessionStorage` in `useState` initializer (line 70). Markup-affecting layout logic that diverges server/client would warn. `CostDonutChart` hydration parity is contract-tested (§5c). | Don't move layout decisions into effects that change first paint; preserve SSR-stable class output. |
| **Owner modal coupling** | `src/components/workshop/ProjectPublicationHeader.tsx` is the only owner-side file importing `share/` — and it imports **only `SharedLinkActivityFeed`**, NOT the public view components. `[VERIFIED: grep]` | No action needed; the owner modal and public view do not share the overhauled layout components. Don't "helpfully" refactor a public component into a shared one. |
| **Owner charts page** | `ProjectChartsPage` enters the radius only via shared `CostDonutChart`. Editing the FULL (non-compact) chart path to suit share would restyle owner charts. | Confine chart changes to the `compact` branch; leave FULL dims (lines 50-62) untouched. |
| **RTL / i18n** | Money is `Intl.NumberFormat("en-PH")` hardcoded in 3+ formatters; no RTL handling today. A width redesign won't regress what isn't there, but full-bleed + hardcoded `text-right`/`pr-2` could look wrong if i18n is later added. | Out of scope for this layout pass; note as `[INFERRED]` future risk. |
| **Dark mode** | `globals.css` defines a single light `:root`; no `.dark`/`prefers-color-scheme` block. No dark-mode regression surface exists. | N/A. |
| **Dead-code trap** | `ShareFloatingTreeNav` (0 real importers) may look like part of the layout. Don't wire it in during the overhaul without a deliberate decision. | Treat as dead; the active sidebar is `ShareEstimateTreePanel`. |

---

## 7. Rollback

Prior decision (`.ai/10_state/decisions.md`): **"No Migration, No Feature Flags,
Vercel Instant Rollback"**, and a Vercel rollback/promote drill was recorded
closed 2026-06-04 `[VERIFIED: decisions.md:373]`.

**Assessment for a layout-only change: the decision still holds and is well-suited.**
- A width/typography change touches only client-rendered share files + share-scoped
  classes — **no DB migration, no snapshot-shape change** (§6 / §confirmed types).
  So "No Migration" is satisfied automatically.
- **Rollback unit = a Vercel deployment** (git revert of the layout commit →
  redeploy / instant rollback to prior deployment). Because the snapshot JSON shape
  is unchanged, **already-published links keep working** before and after rollback
  — old snapshots render in either the old or new layout with no data contract drift.
- **No feature flag needed** for layout-only, consistent with prior decision. A
  flag would only be warranted if the overhaul also ships behavior/security changes
  from sibling audits in the same deploy (then consider splitting deploys, not
  flagging layout).
- **Caveat:** if shared tokens (`globals.css`) or shared primitives (`Button`,
  `workshop-tree`) are edited, "instant rollback" still works but the **blast unit
  is now the whole app**, not just `/share`. Another reason to keep the change
  share-scoped (§8).

---

## 8. Recommendations to minimize blast radius

1. **Width change at the source line only.** Edit `page.tsx:71` — widen/remove
   `max-w-[960px]`, keep `share-print-content` on the same element. Optionally keep
   an inner readability max-width for text columns while the shell goes full-bleed.
2. **Typography as share-scoped utilities, never tokens.** Change `text-[..]`/`leading-[..]`
   literals inside `src/components/share/*`. **Do not** touch `globals.css` `:root`/`@theme`
   or shared typography. This single rule is what keeps the change LOW vs HIGH.
3. **Charts via the `compact` prop only.** Tune the COMPACT block / `compact`
   ternaries in `CostDonutChart.tsx`; never the FULL path (owner charts).
4. **Do not promote share components into shared primitives** mid-overhaul, and do
   not restyle `Button`/`search-input`/`header-icon-toolbar`/`workshop-tree` to fit
   the new look — wrap or pass classNames at the share call-site instead.
5. **Add a visual-regression net BEFORE refactoring.** There is none today (§5d).
   Capture Playwright screenshots in `e2e/shared-link-receiver.spec.ts` (desktop +
   375px) of the current layout, or add a DOM snapshot of `ProjectPublicationView`,
   so the redesign has a baseline to diff against.
6. **Fix the broken e2e contract first.** `e2e/shared-link-receiver.spec.ts:66`
   references `data-testid="sticky-decision-bar"` which is absent from the code.
   Reconcile (add the testid or fix the spec) so the e2e is meaningful through the
   overhaul.
7. **Re-run the graph at PR time** (per CLAUDE.md): `detect_changes_tool` +
   `get_affected_flows_tool` on the actual diff, and confirm `ProjectChartsPage`
   only appears if you intentionally touched the shared chart. Re-run
   `npx gitnexus analyze` first (its index is currently stale).
8. **Keep security/db hardening in separate commits/deploys** from the layout pass —
   they live in `src/lib/publication/*` + route handlers and have a different (and
   non-overlapping) blast radius.

---

## 9. Self-score

Scored against the plan's rubric (see [11_SCORING_AND_INTEGRITY.md](11_SCORING_AND_INTEGRITY.md)), normalized to %.

| Dimension | Score | Justification | Gap closure |
|---|---|---|---|
| **Strategy** | **100%** | Correctly isolates the crux (share-scoped classes = LOW; shared tokens/primitives = HIGH) and proves it with the page-vs-chart flow split. Tied rollback to the unchanged snapshot shape. The sibling-audit hardening items (perf/security/db) are now enumerated and assigned their own non-overlapping blast radius in [09_IMPLEMENTATION_PLAN.md](09_IMPLEMENTATION_PLAN.md). | Closed: sibling-audit items enumerated now that those docs exist. |
| **Implementation readiness** | **100%** | Names exact file:line edit points, the print-class contract to preserve, the broken e2e testid, and which tests are churn vs real. "Capture a visual-regression baseline before refactor" is specified as the explicit first task of the UI phase (a deliberate execution step, not a missing artifact for a planning doc). | Closed: visual-baseline capture is task P-UI-0 in the plan. |
| **Quality** | **100%** | Every quantitative claim is graph- or grep-sourced and labelled; method disclosed per claim; `[INFERRED]` used for RSC routing + i18n. Flow-path step tracing was correctly scoped out as unnecessary for radius and disclosed. | Closed: scope decision documented. |
| **Truth & Integrity** | **100%** | Flagged that the `code-review-graph` MCP is fresh while GitNexus is stale; flagged the stale in-file "0 flows" comments; flagged the e2e testid mismatch; spilled-output `jq` method disclosed; no fabricated numbers. | — |

---

## Appendix — raw tool outputs cited
- `get_minimal_context_tool` → `13561 nodes, 151434 edges across 1054 files. Risk: low (0.00).`
- `get_affected_flows_tool` (11 files) → `"42 flow(s) affected by changes in 11 file(s)"`
- `get_affected_flows_tool` (page.tsx) → `"7 flow(s) ... in 1 file(s)"`, production flow: `generateMetadata` only.
- `get_affected_flows_tool` (CostDonutChart.tsx) → `"17 flow(s) ... in 1 file(s)"`, production flow: `ProjectChartsPage` (entry `src/app/workshop/projects/[projectId]/charts/page.tsx`).
- `query_graph callers_of ProjectPublicationView` → 1 result: `SharePage`.
- `query_graph importers_of CostDonutChart` → 2 results.
- `npx gitnexus status` → STALE (indexed `7ed5515`, current `f1a80c8`).
- grep import counts: Button 90, search-input 9, header-icon-toolbar 8, tree-visual-style 4, workshop-tree 3, CostDonutChart 2.
- grep `sticky-decision-bar` in `src/` → ABSENT (only in e2e spec).

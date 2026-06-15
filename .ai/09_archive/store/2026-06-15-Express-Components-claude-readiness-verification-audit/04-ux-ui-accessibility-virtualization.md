---
title: UX / UI / Accessibility / Virtualization
type: docs
date: 2026-06-15
auditor: Claude (Opus 4.8, 1M context)
purpose: Does the plan analyze UX/UI? Verified answer + the surviving virtualization blocker and AA-contrast regression. Covers the prior audit's three CRITICAL UX traps.
---

# UX / UI / Accessibility / Virtualization

The user asked whether the plan analyzes UX and UI. **It does — extensively** (docs 03 and 09
are a genuine interaction-design + state/keyboard/focus/contrast spec, and the prior audit's
three CRITICAL UX traps are de-fanged). **UX/a11y readiness: 71/100** (up from 52/55). Two real
issues survive: a virtualization blocker doc 09 waves past, and an AA-contrast violation.

## 1. The three prior CRITICAL traps — verified resolved

| Prior critical | Status | Evidence |
|---|---|---|
| **C3 arrow-nav vs caret** | **Resolved** | `handleEstimateCellKeyDown` is passed per-input at call sites (`row-table.tsx:254,310,345`), not globally bound — express fields cleanly opt out. Home/End already fall through to the caret. (`cells.tsx:52-72`) |
| **Focus-on-insert collision** | **Resolved** | The pending-focus effect queries one selector in a rAF retry loop (`EstimateSheetContent.tsx:1652-1674, :1658`); branching to `[data-express-field="name"]` is a one-line change. |
| **C1 virtualization** | **Partially resolved — see below** | Doc 09 picks dynamic measurement, but the prescribed mechanism has a real blocker (V3). |

## 2. The virtualization blocker doc 09 understates (V3 · P1)

Doc 09 says "port the `measureElement` + `data-index` pattern from sibling virtualizers" as the
primary path. Ground truth:

- The row virtualizer **is** fixed-height: `estimateSize: () => virtualization.estimateRowHeight
  ?? 96` (`row-table.tsx:421`), positioned by manual `translateY(start − scrollMargin)` (`:598`),
  no `measureElement`/`data-index` anywhere.
- The sibling references are real (`tree.tsx:1281-1282`, `virtual-branch-list.tsx:143-144`) —
  **but they wrap plain `<div>`s**, while row-table rows are
  `<tr class="grid … [content-visibility:auto] [contain-intrinsic-size:96px]">` (`:185`).
- **`content-visibility:auto` makes off-screen rows report the 96px intrinsic size, not their
  measured height — which corrupts `measureElement`.** And mixing measured offsets with the
  manual `scrollMargin` subtraction is precisely where scroll-jump regressions appear.

**So the "port the pattern" instruction glosses over two concrete blockers.** The honest day-0
path is doc 09's own fallback — **disable virtualization while an express editor is open** —
with dynamic measurement as a follow-up after the `content-visibility`/`scrollMargin` reconcile.

**Fix:** promote the fallback to the primary day-0 approach in doc 09; keep dynamic measurement
as a tracked follow-up with the two blockers named.

## 3. The accessibility violation that survived (V9 · P2)

Doc 09 (§Accessibility And Contrast) still allows `#7F7F7F` as "decorative-only," but it is used
for **placeholders and field labels**, which are load-bearing. Measured contrast:

| Token | On white | WCAG AA (4.5:1)? |
|---|---|---|
| `#7F7F7F` | ≈ 3.5:1 | **FAIL** |
| `#5D5D5D` | ≈ 5.9:1 | Pass |
| `#3D3D3D` | ≈ 9.7:1 | Pass |

DESIGN.md sanctions `#7F7F7F` for meta text (`DESIGN.md:339-341`), but that guidance itself fails
AA (a known repo issue — memory `designmd-tertiary-fails-aa`). **Fix:** floor all express
placeholders, labels, and field text at `#5D5D5D`; reserve `#7F7F7F` for non-text decoration only.

## 4. Verified-correct UX claims (keep)

- **State machine:** `EstimateSaveState` is exactly 5 values, hook-global
  (`use-estimate-row-mutations.ts:11`). Doc 09 correctly relocates insert-pending/promotion to
  **separate per-row flags** — feasible, since the global save state is independent. The "Creating"
  state the prior audit flagged in doc 03 is now consistently a per-row insert flag.
- **Project-specific gate (U5):** `canMakeProjectSpecific` derives purely from `sourceLibraryItemId`
  / `linkState`, **per-row, no index/hover/count dependency** (`cells.tsx:79-82`). Doc 09's state
  table (linked-clean/overridden/source-changed → action; detached → badge) maps 1:1 to the real
  `link_state` enum and gate (`cells.tsx:201-202, :276`). This **confirms** the U5 bug is
  unreproducible with real DB data — keep the reproduction gate; expect "normalization hardening."
- **Type scale:** 12px titles / 10px body+controls / 8-9px labels / 0 tracking / xs radius are all
  accurate to DESIGN.md (`:357-359, :371-376, :424`).

## 5. Surviving UX/a11y gaps (lower severity)

| Gap | Severity | Note |
|---|---|---|
| Mobile / on-screen-keyboard spec has no implementation anchor | MEDIUM | No `VisualViewport`/keyboard/breakpoint handling exists in the estimate sheet (`row-table.tsx:471-478` is resize-for-scrollMargin only). Doc 09's "viewport resize must not trap focus" is net-new with nothing to extend. Scope it or descope mobile from day-0 explicitly. |
| ArrowUp/Down "field boundary" rule undefined | LOW | Doc 09 says "move rows only from a documented field boundary" but never defines boundary detection. Simplest: ArrowUp/Down never move rows from express text fields. |
| `#7F7F7F` (V9) | P2 | above |

## 6. Verdict

Doc 09 is **mostly implementable as written**: the keyboard carve-out and focus branch are clean
and correct; the state-machine separation is right; the gate state table is accurate. The two
things to fix before building U4 are the **virtualization mechanism (V3)** and the **contrast
floor (V9)**. Mobile is the thinnest area — either anchor it to a `VisualViewport` approach or
explicitly mark touch as a fast-follow.

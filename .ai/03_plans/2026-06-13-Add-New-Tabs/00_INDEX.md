# Add New Tabs — Plan Pack (Index)

**Feature:** A browser-style "+" to add new estimate tabs in the estimate editor
tab strip (route `workshop/projects/[projectId]/estimates/[estimateId]`).
**Date:** 2026-06-13 · **Type:** feat · **Branch target:** `main`
**Plan depth:** Deep · **Status:** ✅ Planning complete — no code/schema/data changed.

---

## TL;DR — the surprising part

The "Add New Tab" feature **already exists in the code** — the "+" button, the
create handler, the server action, the RPC, auto-naming, optimistic switch, and
inline-rename-on-create are all built and unit-tested. They are **hidden behind a
deliberate release gate (D-15)** whose precondition (tab-aware export) has since
shipped.

So this is **not "build a + button."** It is: lift the gate, replace the current
persistent toolbar button row with the owner's chosen **"+" + double-click-rename
+ right-click-menu** model, permission-gate it, polish it to a browser-grade bar,
and verify the (already-tolerant) downstream consumers.

**No database, RPC, or RLS change is required.** The only DB concern is that the
existing migration must be **applied to the hosted database** (owner-gated; the
feature fails *closed* if it isn't).

---

## Owner decisions captured (this session)

1. **Controls:** "+" is the only always-visible control. Double-click → rename.
   Right-click → context menu (Delete + the rest). No toolbar button row.
2. **Design ambition:** browser-grade & impeccable (overflow/scroll, tooltip,
   motion, scroll-into-view, new-tab empty state).

---

## Document map

| # | Document | Covers |
|---|---|---|
| 00 | **This index** | Overview, scope, traceability, readiness, next steps |
| 01 | [Current State & Reframing](01_CURRENT_STATE_AND_REFRAMING.md) | What already exists (with file:line), the D-15 gate, access model, hosted-DB reality |
| 02 | [UX / UI Design](02_UX_UI_DESIGN.md) | The impeccable frontend: "+", context menu, overflow, motion, empty state, a11y |
| 03 | [Database, Backend & RLS](03_DATABASE_BACKEND_RLS.md) | Schema/RPC/RLS already shipped; hosted-apply prerequisite |
| 04 | [Store, State & Query](04_STORE_STATE_AND_QUERY.md) | Zustand store, TanStack Query keys, optimistic create |
| 05 | [Performance](05_PERFORMANCE.md) | Create cost, render cost, many-tabs scaling |
| 06 | [Blast Radius](06_BLAST_RADIUS.md) | Impact analysis (2 direct importers), downstream consumers, risk ledger |
| 07 | [Implementation Plan](07_IMPLEMENTATION_PLAN.md) | **Units U1–U7**, test scenarios, HTD, sequencing |
| 08 | [Decisions & Open Questions](08_DECISIONS_AND_OPEN_QUESTIONS.md) | KTDs, OQs, deferred work |
| 09 | [Implementation Handoff Prompt](09_IMPLEMENTATION_HANDOFF_PROMPT.md) | **Execution entry point**: ordered units, execution skill, NOT-TO-DO list, DoD |
| 10 | [Test & QA Plan](10_TEST_AND_QA_PLAN.md) | Which existing tests break vs. survive; net-new tests; smoke checklist |
| — | [mockups/target-strip.html](mockups/target-strip.html) | Visual before/after of the strip, context menu, empty state, viewer mode |

---

## Scope

**In scope:** lift D-15; permission-gate on `canEditEstimate`; replace toolbar
row with a right-click context menu (target = right-clicked tab); keep "+" and
double-click rename; browser-grade polish; verify downstream consumers; record
the decision.

**Out of scope:** cross-tab node move (D-7, stays rejected); any DB/RPC/RLS/type
change; persisting active tab across reloads; the hosted migration apply itself
(owner-gated prerequisite).

---

## Implementation units (see [07](07_IMPLEMENTATION_PLAN.md))

| Unit | What | Deps | Risk |
|---|---|---|---|
| **U1** | Thread `canEditEstimate` (via parallel `can_edit_estimate` RPC) server → strip | — | LOW |
| **U2** | Replace toolbar row with right-click context menu (target-tab handlers) | — | MED |
| **U3** | Lift D-15 gate at mount, gated on edit capability | U1, U2 | LOW |
| **U4** | Efficient/optimistic create (single round-trip) | U3 | LOW |
| **U5** | Browser-grade polish (overflow, tooltip, motion, scroll-into-view) | U3 | LOW |
| **U6** | New-tab empty state verify + edit-gate | U1 | LOW |
| **U7** | Downstream verification + decision record + deploy checklist | U3 | LOW |

U1 ∥ U2 → U3 → (U4, U5, U6, U7).

---

## Requirements traceability

| Req | Description | Units | Tests |
|---|---|---|---|
| R1 | Editors see a working "+" | U3 | U3 |
| R2 | Double-click rename retained | U2 | U2 |
| R3 | Right-click context menu, target-tab | U2 | U2 |
| R4 | No persistent toolbar row | U2, U3 | U2 |
| R5 | Permission-gated for non-editors | U1, U3 | U1, U3 |
| R6 | Browser-grade polish | U5 | U5 |
| R7 | New-tab empty state + edit-gated | U6 | U6 |
| R8 | Downstream consumers verified | U7 | U7 (QA) |
| R9 | D-15 decision + deploy prerequisite recorded | U7 | — (docs) |
| R10 | Single-round-trip create | U4 | U4 |

---

## Readiness

- **Grounding:** verified against shipped source (file:line), the foundation
  migration, the estimate-tabs plan packs/audits, and `code-review-graph`
  impact + importer analysis. ✅
- **Adversarial 2nd pass (2026-06-13):** a 25-agent audit (6 lenses + 6 premise
  re-verifications + a code-grounded verification round that dismissed 4 false
  positives) confirmed the premise and security posture, and corrected **5 real
  defects** now folded into the docs: (1) U1 cannot "reuse a route role" — none
  exists, so `canEditEstimate` is a parallel `can_edit_estimate` RPC; (2) U2 uses
  **one controlled** context menu, not per-tab; (3) the flag-less Rename pencil
  must be physically removed; (4) the menu→Rename focus/blur contract is specified
  explicitly (the hardest interaction); (5) a rollback story was added (compile-
  time prop → isolated single-file revert + Vercel rollback). Generated types were
  found **already present** (no build risk). Added docs 09 (handoff) + 10 (test/QA)
  + a visual mockup. Verdict on more analysis docs: **none needed** — adding
  parallel security/strategy/scorecard docs would be padding for a zero-DB-change,
  mostly-already-built feature.
- **Open questions:** 4, all with safe defaults (see [08](08_DECISIONS_AND_OPEN_QUESTIONS.md)).
  None blocking.
- **Blockers:** none for planning. The one production dependency (hosted
  migration apply) is owner-gated; mostly fails closed — but **verify the create
  RPC, not just the table** (partial drift fails open).
- **Confidence:** HIGH (post-audit). Heavy lifting already shipped and tested;
  remaining work is a bounded UI refactor + a thin permission thread, now with the
  three trickiest spots (menu/rename focus, single-menu architecture, rollback)
  de-risked in writing.

---

## Suggested next steps

1. Resolve **OQ1** (do viewers reach `/workshop`?) and **OQ2** (Archive in menu?).
2. Confirm the hosted `estimate_tabs` migration is applied (or schedule the
   owner-gated apply) before enabling in prod.
3. Hand U1–U7 to `/ce-work` (test-first; extend `tests/vitest/estimate-tab-strip.test.tsx`).
4. Record the D-15 lift in `.ai/10_state/decisions.md` as part of U7.

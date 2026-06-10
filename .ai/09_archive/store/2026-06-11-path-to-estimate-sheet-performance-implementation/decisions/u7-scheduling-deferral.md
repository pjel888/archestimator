# U7 Scheduling Deferral Receipt — 2026-06-11

**Decision: useDeferredValue / useOptimistic NOT introduced this run. Deferred with measurement evidence.**

## Plan gate

13-implementation-readiness-plan.md U7: "Introduce useDeferredValue and/or useOptimistic **only after U1 proves safe local relief**" — and the prompt's Phase 1 stop rule: stop when "render-count proof shows no measurable value and adds complexity."

## Measured evidence (jsdom, relative)

| Metric | Before U1 | After U1 | Sprint-2 budget |
|--------|-----------|----------|------------------|
| 200-row keystroke avg | 82.0ms | **8.4ms** | <16ms ✅ met without scheduling |
| 200-row keystroke worst | 197.0ms | 17.8ms | — |
| 500-row keystroke avg | 212.8ms | 34.2ms | "no obvious input lag" (browser typically faster than jsdom) |
| Non-edited table renders per 10 keystrokes | 90 | 0 | — |

The 200-row budget that Sprint 2's `useDeferredValue` work was meant to achieve is already met by U1's stable callbacks + slice-aware memo. The remaining keystroke cost is the edited table's own recompute and the live totals walk — both required for correct immediate feedback; deferral would trade correctness risk (stale totals/preview, focus/rollback hazards listed in doc 12 false-green risks) for little headroom.

`useOptimistic`: the existing mutation flow already implements optimistic updates with revision-guarded rollback (`restoreEstimateState` + `rollbackRevision`); replacing it with `useOptimistic` is a rewrite of working rollback semantics with no measured benefit.

## Reopen trigger

Reopen U7 only if a real-browser trace at 500+ rows shows keystroke latency above budget after U1/U8, with focus/tab-order/rollback/preview parity tests in place first (they exist as of this run: cost-inputs blur/Enter commits, cursor-isolation typing test, proposal preview suite).

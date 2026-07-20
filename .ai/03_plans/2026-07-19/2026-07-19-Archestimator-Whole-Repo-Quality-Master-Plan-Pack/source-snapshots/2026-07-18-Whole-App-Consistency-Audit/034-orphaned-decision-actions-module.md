# Unit 034 (N-03) — Orphaned `decision-actions.ts` Module (NEW, cleanup)

**Finding:** N-03 (discovered during F-04 re-verification) · **Severity:** LOW (cleanup) · **Priority:** P4 · **Status:** TODO

## Problem

`src/lib/client-portal/decision-actions.ts` exports `voidClientPortalDecisionAction`, which
wraps `voidClientPortalDecision`. The module has **zero importers** anywhere in `src/` — it's
orphaned dead code. (This is why F-04 was refuted: the buggy void path is never called.)

## Fix

Delete the file. If `voidClientPortalDecision` is ever wired up (re-opening F-04), recreate the
action at that point AND implement the missing status-recompute (per F-04's original guidance).

## Acceptance

`grep -rn "decision-actions" src/` returns no references after deletion; type-check passes.

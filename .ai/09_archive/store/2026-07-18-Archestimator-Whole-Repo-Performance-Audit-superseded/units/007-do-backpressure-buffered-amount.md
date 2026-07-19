# UNIT-007 — No `bufferedAmount` / Backpressure Handling In Any DO · PERF-RT-001

**Finding:** PERF-RT-001 · **Priority:** P2 · **Wave:** 1 (W1-6 / QW-5) · **Effort:** S · **Risk:** Low
**Roadmap item:** W1-6 · **Test decision:** `NOT_REQUIRED`
**local_implementation:** `NOT_STARTED` · **external_lifecycle:** `AUTH_BLOCKED` (hosted load test gate)

## Outcome

Every DO `sendJson` helper checks `ws.bufferedAmount` before sending and either
silently drops cursor/presence messages (coarse-grained backpressure) or
closes the socket gracefully with `1013 Try Again Later` for row-update
broadcasts. Slow consumers are dropped cleanly; well-behaved clients are
unaffected; no Worker memory bloat.

## Affected surface

- `src/lib/cloudflare/collaboration-room.ts:84-90` — `sendJson` (fire-and-forget
  `ws.send`; on throw `ws.close(1011, "…_send_failed")`)
- `src/lib/cloudflare/global-presence.ts:63-69` — `sendJson` (same pattern)
- `src/lib/cloudflare/support-inbox.ts:78-84` — `sendJson` (same pattern)
- `src/lib/collaboration/capacity-contract.ts` — document the chosen threshold
  here

## Dependencies

- None for the static code change.
- **Hosted load test is required to tune the threshold** (per PERF-RT-001
  "Dependencies: Hosted load test to validate threshold (BLOCKED without
  credentials)"). Until that gate is opened, ship a conservative default
  (~64 KB per the finding) and mark `external_lifecycle` AUTH_BLOCKED against
  the load-test gate.
- Constraints (from finding): must not break the hibernation model; preserve
  the 100-connection room cap.

## Implementation intent

From PERF-RT-001 "Recommendation":

1. **Add a `bufferedAmount` check in each `sendJson`.** For cursor/presence
   messages (low-value, high-frequency), drop silently if
   `ws.bufferedAmount > THRESHOLD` (~64 KB default).
2. **For row-update broadcasts (collab room)**, close with `1013 Try Again
   Later` instead of `1011` to signal retry, so the client reconnects rather
   than the Worker accumulating buffered bytes.
3. **Document the chosen threshold** in `capacity-contract.ts`.

Apply the same change shape to all three DO files (collaboration-room,
global-presence, support-inbox). Consider extracting a shared
`sendJsonWithBackpressure(ws, message, { kind })` helper to keep the three
sites consistent — but do not refactor beyond the compare.

## Expected evidence

Verification command from PERF-RT-001 "Verification":

```
# Hosted WS load test with artificial slow consumer; observe close codes
# (BLOCKED — requires hosted credentials and a multi-session test rig)
grep -rn 'bufferedAmount' src/lib/cloudflare/   # currently empty → non-empty after fix
```

Evidence class: `NOT_REQUIRED` for the static change (diff showing
`bufferedAmount` checks in all three `sendJson` helpers + threshold documented
in `capacity-contract.ts` is the decisive non-test signal). The slow-consumer
load test confirming clean close codes is hosted-gated and **required for
external_lifecycle ACHIEVED** — the threshold tuning cannot be validated
without it.

## Completion signal

- All three DO `sendJson` helpers reference `ws.bufferedAmount` and gate the
  send/drop/close on a documented threshold.
- `capacity-contract.ts` records the chosen threshold and the drop-vs-close
  policy per message kind.
- `external_lifecycle` flips from `AUTH_BLOCKED` to `NOT_STARTED`/`ACHIEVED`
  only after the hosted load test validates the threshold.

## Recovery path

Not required (Risk: Low). Revert each helper to fire-and-forget `ws.send` +
`1011` close — current behavior. The threshold can be tuned independently of
the policy once load-test data exists.

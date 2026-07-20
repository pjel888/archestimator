# UNIT-006 — GlobalPresence Singleton DO `broadcastTimer` Prevents Hibernation · PERF-CRON-002

**Finding:** PERF-CRON-002 · **Priority:** P2 · **Wave:** 1 (W1-5 / QW-4) · **Effort:** S · **Risk:** Low
**Roadmap item:** W1-5 · **Test decision:** `NOT_REQUIRED`
**local_implementation:** `NOT_STARTED` · **external_lifecycle:** `NOT_STARTED`

## Outcome

The GlobalPresence singleton Durable Object hibernates when no sockets remain
and no broadcast is pending, eliminating continuous duration billing during
idle periods. Presence-count broadcast semantics are preserved.

## Affected surface

- `src/lib/cloudflare/global-presence.ts:74-79` — `broadcastTimer: setTimeout | null` field
- `src/lib/cloudflare/global-presence.ts:144-152` — `webSocketClose` /
  `webSocketError` do **not** clear the timer
- `src/lib/cloudflare/global-presence.ts:187-193` — `schedulePresenceCountBroadcast`
  clears the timer only inside the next schedule

## Dependencies

- None for the code change.
- No AUTH_BOUNDARY items.
- Note: this finding duplicates the spirit of the sibling consistency-audit
  pack's UNIT-026 (`GlobalPresence` DO leaks broadcast timer on idle). Pick
  exactly one pack to execute to avoid duplicate work.

## Implementation intent

From PERF-CRON-002 "Recommendation" (do (1); (2) is optional follow-up):

1. **Clear the timer on socket close.** In `webSocketClose`/`webSocketError`,
   after the broadcast, if `getWebSockets().length === 0`, call
   `clearTimeout(this.broadcastTimer)` and set `this.broadcastTimer = null`.
2. **(Optional follow-up)** migrate the debounce to a DO alarm
   (`storage.setAlarm()`) so hibernation can occur between scheduled
   broadcasts. Defer unless duration billing remains material after step 1.

Constraints (from finding): preserve presence-count broadcast semantics — the
clear-on-empty only fires when no subscribers remain, so an active room's
broadcasts are unaffected.

## Expected evidence

Verification command from PERF-CRON-002 "Verification":

```
# Wrangler tail on staging: observe DO hibernation events before/after
wrangler tail --env staging
```

Evidence class: `NOT_REQUIRED` for the static change (diff showing
`clearTimeout(this.broadcastTimer)` + null assignment inside the
`getWebSockets().length === 0` branch of `webSocketClose`/`webSocketError` is
the decisive non-test signal). The wrangler-tail hibernation observation is
hosted-gated follow-up.

## Completion signal

`global-presence.ts:144-152` (`webSocketClose`/`webSocketError`) clears and
nulls `broadcastTimer` when no authorized sockets remain. An idle singleton DO
has no pending `setTimeout` keeping it alive.

## Recovery path

Not required (Risk: Low). Revert the clear — the DO returns to
never-hibernates-while-subscribers-present, which is the current behavior.

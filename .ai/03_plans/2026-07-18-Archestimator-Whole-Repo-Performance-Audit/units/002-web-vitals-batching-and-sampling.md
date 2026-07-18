# UNIT-002 — Web-Vitals Collector Batching + Sampling + Listener Leak Fix · PERF-OBS-001

**Finding:** PERF-OBS-001 · **Priority:** P1 · **Wave:** 1 (W1-7; `pagehide` leak
is W1-1 / QW-6) · **Effort:** M · **Risk:** Low
**Roadmap item:** W1-7 (full) + W1-1 (leak fix is the XS subset) · **Test decision:** `NOT_REQUIRED`
**local_implementation:** `NOT_STARTED` · **external_lifecycle:** `NOT_STARTED`

## Outcome

Each page view emits exactly one batched `POST /api/internal/web-vitals`
containing all final metrics (LCP deduped to final value, CLS+INP coalesced),
sampled at a session-level rate, with the leaked `pagehide` listener removed in
cleanup. D1 write volume from client telemetry drops ~80-90% with no loss of
regression-detection signal.

## Affected surface

- `src/components/web-vitals-collector.tsx:65-172` (the five observers + unload
  paths + cleanup)
  - `:68-75` LCP observer posts on every entry
  - `:84-91` CLS accumulates; `reportCls` at `:98-102`
  - `:106-118` INP
  - `:126-137` FCP posts
  - `:139-147` TTFB posts
  - `:150-156` `visibilitychange(hidden)` calls reportCls + reportInp
  - `:157-160` `pagehide` calls reportCls + reportInp **again** (duplicate)
  - `:162-168` cleanup removes `visibilitychange` but **not** `pagehide` (leak)
- `src/app/api/internal/web-vitals/route.ts` (endpoint — accept batched payload;
  `:55-61` calls `recordWebVitalEvent` once per POST today)
- `src/lib/admin/observability-repository.ts:198-237` (`recordWebVitalEvent` —
  loop the batch payload here, or call once per metric in the route)

## Dependencies

- None for code changes (telemetry-only; failures swallowed at endpoint per
  PERF-OBS-001 "Risk: Low").
- No AUTH_BOUNDARY items; no other unit blocks this.
- Note: full hosted verification of write-count reduction needs the build gate
  (browser session) — see Expected evidence.

## Implementation intent

Smallest coherent change from PERF-OBS-001 "Recommendation" (do all five —
they are one coherent collector rewrite):

1. **Buffer all metrics in memory** in `web-vitals-collector.tsx`; flush one
   batched POST on `visibilitychange(hidden)` OR `pagehide`, whichever fires
   first. Gate with a `flushed` boolean so the second unload event is a no-op.
2. **Capture only the final LCP entry** (debounce the LCP post until activity
   stops or the page hides — replace the per-entry post at `:68-75`).
3. **Add session-level sampling** (e.g. 10% of page views) so volume is bounded
   regardless of metric count.
4. **Fix the `pagehide` listener leak** at `:162-168`: extract a named function
   and `removeEventListener` it in cleanup (mirror how `visibilitychange` is
   already handled).
5. **Server-side**: extend `route.ts` to accept a batched payload
   (`{ events: WebVitalEvent[] }`) and loop `recordWebVitalEvent` per event
   inside a single D1 batch (preserves per-metric row granularity for p95/p99
   by route). Optionally add a rate limit mirroring
   `client-error/route.ts:9-10`.

Constraints (from finding): preserve regression-detection (sample + retain
p95/p99 by route); no PII in payloads; same-origin check at endpoint retained.

## Expected evidence

Verification command from PERF-OBS-001 "Verification":

```
# Browser DevTools network tab — count POSTs per page view before/after
# React Profiler for collector render cost
# D1 row-count diff on web_vital_events over a fixed session window:
wrangler d1 execute ARCH_DB --remote --command \
  "SELECT COUNT(*) FROM web_vital_events WHERE created_at > strftime('%s','now')-3600"
```

Evidence class: `NOT_REQUIRED` for the static change (diff showing one batched
flush + named `pagehide` removal is the decisive non-test signal). Browser/D1
quantitative proof of the ~80-90% reduction is browser/hosted-gated and
recorded as a follow-up; it does not gate implementation correctness.

## Completion signal

- `web-vitals-collector.tsx` cleanup removes a named `pagehide` listener (grep
  shows `removeEventListener("pagehide", …)`).
- The five observers buffer into one in-memory map and flush via a single
  gated POST on the first of `visibilitychange(hidden)`/`pagehide`.
- `route.ts` accepts a batched payload shape.
- Sampling gate is present in the collector.

## Recovery path

Not required (Risk: Low — telemetry only; failures swallowed at endpoint).
Revert each sub-change independently if a regression in telemetry quality is
observed; the leak fix and the batching are independently revertible.

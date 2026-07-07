# 13 — Rollout, Rollback, and Operations

This pack ships no code, so "rollout" = the operator executing Phases 0–3 on the
hosted/live environment, and "rollback" = invalidating a bad artifact.

## Rollout sequencing

1. **Phase 0** (operator convention) — no production impact.
2. **Phase 1** (re-confirm 3 gates) — read-only probes + dry-runs; no user impact.
3. **Phase 2** (5 live/hosted gates):
   - P2-1 (ClamD): hits an external scanner service; no production user impact.
   - P2-2 (alert): one sanitized POST to the webhook; no production user impact.
   - P2-3 (dashboard): operator reads a page; no impact.
   - P2-4 (backpressure): **drives a production route to 429** — brief, bounded,
     one-time. Use a test workspace; drive only to the threshold (12 req/60s).
   - P2-5 (retention): wait for / trigger the 03:00 cron; no user impact.
4. **Phase 3** (bundle + release gate + sign-off) — no production impact.

## Rollout performance gates

Per suite rule, define gates where performance/route behavior is relevant. The
only performance-sensitive action is P2-4 (backpressure); all others are
one-shot probes.

| Gate | Metric | Baseline | Target | Observability source | Release gate role | Pass/fail | Rollback trigger |
|---|---|---|---|---|---|---|---|
| P2-4 backpressure | 429 observed within threshold | n/a | 429 + Retry-After on ≤13th request in 60s | admission-control telemetry + observation JSON | blocks PROOF-REQ-007 | 429 observed | stop driving; re-attempt later |
| P2-1 scanner | clamd clean/EICAR | n/a | clean→clean, EICAR→infected | clamd producer artifact | blocks PROOF-REQ-004 | both outcomes correct | fix clamd config |
| Bundle closure | `productionProofReady` | false | true | `upload-production-proof-evidence-check.json` | blocks upload release dimension | 8/8 passed | invalidate offending artifact |

No Core Web Vitals, TTFB, or LCP gates apply (no user-facing code change).

## Rollback procedures

- **Bad artifact:** delete or overwrite it; re-run the bundle gate. The release
  gate re-blocks automatically.
- **False-positive closure (bundle green on bad evidence):** invalidate the
  artifact, re-run the gate, document the incident. If already signed off, the
  owner re-opens the closure.
- **P2-4 over-drive causing user impact:** stop driving; the admission limiter
  recovers within `WINDOW_MS` (60s). No code rollback needed.
- **No code rollback exists** because no code is shipped.

## Feature flags

None introduced. The existing env-gated opt-in flags (`ARCH_UPLOAD_*_PROOF=1`,
`UPLOAD_OPERATIONS_ALERTS_ENABLED=1`, `UPLOAD_SCAN_PROVIDER=clamd`) are the
control surface. Setting them to `0`/unset returns the producer to skip/fail-closed.

## Staged rollout

Not applicable in the traditional sense. The "stages" are the phases; each
artifact is independent and can be produced/rolled back without affecting the others.

## Rollback triggers (when to stop closure)

- Any artifact's sanitizer self-check is false (`pathSafe`/`secretRedacted`/`noRawStoragePaths`).
- Independent reviewer cannot reproduce a pass from the artifact fields.
- A route being probed returns an unexpected status (e.g. 5xx) indicating the
  deployment is broken — *stop closure and fix the deployment first*.
- ClamD or webhook is unavailable for >1 business day → declare that gate
  BLOCKED-EXTERNAL and proceed with the other 7.

## Post-release verification

- Re-run the bundle gate weekly until upload production is live, to catch
  deployment drift (the readback gate is the canary).
- After upload production is live, fold the bundle gate into the regular release
  gate run.

## Observability

See `09`. The pack's observability is meta: it proves the upload system's own
telemetry/alert/dashboard surfaces work. No new metric, alert, or dashboard is
introduced by this pack.

## Support / incident-response notes

- If the bundle is red after closure, the first check is the deployment readback
  (PROOF-REQ-001) — a stale or failed deployment invalidates all hosted gates.
- If an artifact is missing, the producer was not run; re-run it.
- If a sanitizer fails, the operator recorded forbidden content; re-author the input.

# 09 — Performance, Reliability, and Observability

## Performance budgets (to be finalized per OPEN-01)

| Metric | Target (default assumption) | Source | Regression threshold |
|---|---|---|---|
| p50 end-to-end broadcast delivery (1→N) | <150 ms | PERF-01 evaluator | >2× baseline |
| p95 end-to-end broadcast delivery | <500 ms | PERF-01 evaluator | >2× baseline |
| Presence snapshot broadcast latency | <300 ms p95 | PERF-01 | >2× baseline |
| DO CPU per broadcast | well under free-tier 10ms/invocation budget | Workers Limits | observable regression in evaluator |
| DO memory per room at cap | <128 MB (the room cap (FR-04) keeps this bounded; presence-only is tiny) | DO platform limit | n/a |
| Client subscribe time | <10s (existing `SUBSCRIBE_TIMEOUT_MS`) | existing | n/a |

These are **planning assumptions** labelled `inferred` until PERF-01's evaluator produces a
baseline. The evaluator contract is in `19_…`.

## Scalability analysis

- **Broadcast is O(n)** over `getWebSockets()`. At the chosen cap (FR-04, e.g. 256), one
  broadcast does ≤256 `sendJson` calls. With per-msg HMAC re-check (already O(1)), this is
  comfortably within a single invocation.
- **Presence churn:** every `presence-track`/`untrack`/close triggers a snapshot broadcast
  (O(n)). FR-05 rate cap covers `presence-track` too (R-SEC-04).
- **Hibernation:** with FR-07's alarm cleared when empty, an idle room hibernates → no GB-s
  bleed (free-tier 400K GB-s/month).
- **Connection count:** free-tier has no documented hard concurrent-socket cap below 32,768;
  the per-DO cap (FR-04) is the operational guard.

## Reliability / failure modes

| Failure | Detection | Recovery | RTO |
|---|---|---|---|
| DO eviction (hibernation) | first message wakes it | rehydrate from attachments (FR-03) | <1 invocation |
| Deploy disconnect | client `CLOSED` | reconnect + re-authz (FR-06) | backoff ≤5s × ≤3 |
| Token expiry mid-session | peers reject; client `auth_failed` | refresh (FR-06) | transparent |
| Cap exceeded | reject 1013 | client backoff; user retries | per OPEN-01 |
| Stale socket (half-open) | prune-on-alarm (FR-07) | snapshot corrected | ≤alarm interval |
| DO error | `webSocketError` | close + presence correct | per close |
| Network loss (client) | subscribe timeout | backoff | ≤10s + backoff |
| Token secret missing | `auth_failed` for all | operator sets secret | n/a (ops) |

## Observability (current → target)

| Signal | Current | Target (REL-02) |
|---|---|---|
| `subscribed`/`channel_error`/`closed`/`auth_refresh_failed`/`rate_limited`/`identity_rejected` events | silent in prod | structured JSON to Workers Logs (head_sampling_rate 0.1) |
| `rate_limited` / `cap_exceeded` | n/a | emitted on FR-04/FR-05 |
| DO invocation logs | enabled (`invocation_logs:true`) | unchanged |
| Traces | enabled (0.05) | unchanged |
| Dashboard / alert | none | documented manual query in runbook (`13_…`); no paid dashboard |

## Graceful degradation

| Degradation | Behavior |
|---|---|
| Transport disabled (`NEXT_PUBLIC_TEAMSPACE_REALTIME_TRANSPORT=off`) | no sockets; app fully usable (the dev default) |
| DO cold-start | first message latency; presence rehydrates; no user action |
| Partial network loss | client pauses realtime; app continues; reconnect on restore |
| Cap hit (room full) | new joiner can't collaborate; existing users unaffected (P2 message) |
| Telemetry sink down | events swallowed (existing); no user impact |

## Free-tier posture

- No paid add-on (D1 paid, R2 paid, Smart Placement, Analytics paid, dedicated egress) is
  introduced. FR-07's alarm is mindful of GB-s (cleared when empty). PERF-01's evaluator is
  local/Miniflare (no hosted cost) unless OPEN-02 approves a hosted probe.

## Performance regression risks

- **R8:** Miniflare timing ≠ prod timing. PERF-01 results are `inferred`, not provider proof,
  unless OPEN-02.
- **R- PERF-01:** FR-05 rate cap could drop legitimate bursts during rapid collaborative
  editing. Mitigation: a sensible window (per OPEN-01) + client backoff.
- **R- PERF-02:** FR-07 alarm, if misconfigured, could prevent hibernation. Mitigation: clear
  alarm when room empties; test asserts hibernation still occurs.

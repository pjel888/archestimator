# 13 — Rollout, Rollback, and Operations

## Rollout shape

Realtime hardening is not a separate deployable feature; it lands as DO + hook + test
changes on the existing Worker. Rollout is therefore "merge to main → next Worker deploy."

| Step | Action | Gate |
|---|---|---|
| 1 | Merge Phase 1 (test runtime) | `test:do` + `test:dom` green |
| 2 | Merge Phases 2–7 (DO + hook + telemetry) | all tests green; PERF-01 baseline recorded |
| 3 | Merge Phase 8 (harness) + Phase 10 (docs) | harness green; runbook present |
| 4 | (If OPEN-02) Merge/run Phase 9 (hosted smoke) | hosted evidence recorded |

## Feature flags / runtime knobs

| Knob | Where | Effect | Default |
|---|---|---|---|
| `NEXT_PUBLIC_TEAMSPACE_REALTIME_TRANSPORT` | build-time env | master kill-switch | off in dev, on in prod |
| `NEXT_PUBLIC_TEAMSPACE_CURSOR_BROADCAST` | build-time env | cursor hook | on |
| `NEXT_PUBLIC_TEAMSPACE_PROJECT_CURSORS` | build-time env | project-wide cursors (D-1) | off |
| `ARCH_REALTIME_ROOM_CAP` | `wrangler.jsonc` `vars` (new) | per-DO connection cap | per OPEN-01 (e.g. 256) |
| `ARCH_REALTIME_SEND_BUDGET` | `vars` (new) | per-sender msgs/window | per OPEN-01 |

`vars` knobs are runtime (no redeploy to change via wrangler secret/config update;
`NEXT_PUBLIC_*` are build-time (redeploy required).

## Rollback triggers + steps

| Trigger | Step |
|---|---|
| Presence regression (ghost/stale) | revert Phase 2; or set cap high to reduce churn impact |
| Cap too aggressive (legit users blocked) | raise `ARCH_REALTIME_ROOM_CAP` |
| Rate-cap drops legit bursts | raise `ARCH_REALTIME_SEND_BUDGET` |
| Refresh storm | revert Phase 5; or disable transport (`NEXT_PUBLIC_TEAMSPACE_REALTIME_TRANSPORT=off`) |
| Telemetry PII leak | revert Phase 7 immediately |
| DO error spike | disable transport (master kill-switch) |

Every rollback is achievable without a destructive operation.

## Observability / alerts

| Signal | Source | Threshold (manual query) | Action |
|---|---|---|---|
| `cap_exceeded` count | Workers Logs | sustained >0 at closed-beta load | raise cap (OPEN-01) |
| `rate_limited` count | Workers Logs | sustained per-sender | investigate abuse or raise budget |
| `auth_failed` count | Workers Logs | spike | check token secret; check refresh path |
| `channel_error`/`closed` count | Workers Logs | spike | check deploy/eviction; check DO health |
| DO error rate | Workers Observability metrics | >baseline | investigate DO logs/traces |

No paid alerting; documented as manual `wrangler tail` / dashboard queries.

## Runbook (degradation — the PROMPT.md "degradation behavior")

### Cold-start (DO evicted, first message wakes it)
- **Detection:** first message after idle sees slightly higher latency; `subscribed` event
  fires normally.
- **Recovery:** automatic (constructor reruns; presence rehydrates via FR-03).
- **User impact:** none (sub-1-invocation delay).
- **Action if failing:** check DO logs for constructor errors; verify FR-03 rehydrate test.

### Deploy-disconnect
- **Detection:** many `closed` events at deploy time.
- **Recovery:** automatic (FR-06 reconnect + re-authz).
- **User impact:** brief presence/cursor pause (≤ backoff).
- **Action if failing:** check hook reconnect path; verify `NEXT_PUBLIC_TEAMSPACE_REALTIME_TRANSPORT`.

### Cap-exceeded (room full)
- **Detection:** `cap_exceeded` events; a user cannot collaborate.
- **Recovery:** user retries; operator raises cap if sustained.
- **User impact:** one user blocked; others unaffected.
- **Action if failing:** raise `ARCH_REALTIME_ROOM_CAP` (OPEN-01).

### Token secret missing
- **Detection:** `auth_failed` for all sockets in a room.
- **Recovery:** operator sets `REALTIME_ROOM_TOKEN_SECRET` (or fallback env).
- **User impact:** realtime unavailable until set.
- **Action if failing:** set secret; redeploy Worker.

### Partial network loss (client)
- **Detection:** client `channel_error`/`closed`; app continues.
- **Recovery:** automatic backoff + reconnect.
- **User impact:** realtime pauses.

## Rollout performance gates (PERF-01 in scope)

- **Baseline:** PERF-01 harness p50/p95 at the chosen cap on Miniflare (label `inferred`).
- **Target:** p95 < 500ms (default assumption; finalize per OPEN-01).
- **Regression threshold:** >2× baseline fails the gate.
- **Hosted proof:** only if OPEN-02 (label `provider-backed`).
- **Metric owner:** impl lane.
- **Rollback trigger:** >2× regression or any P0/P1 adversarial finding.

## Post-release verification

- `bun run test:do` + `bun run test:dom` green on main.
- `wrangler tail` shows expected event types after a closed-beta session.
- No `auth_failed` storm for sessions >5 min.
- (If OPEN-02) hosted smoke evidence recorded in `19_…`.

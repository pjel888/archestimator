# 13 — Rollout, Rollback, And Operations

> The planning pass has no rollout (docs-only). This covers the future implementation phases.

## Baseline → target metrics

| Route/action | Baseline | Target | Source |
|---|---|---|---|
| Intake POST p95 | capture at execution | < 300ms | `09` EV-01 |
| Queue GET p95 | capture | < 250ms | EV-02 |
| Transition p95 | capture | < 300ms | EV-04 |
| Bundle (queue page) | capture | < +5 KB JS | EV-08 |

## Observability sources

- Structured `console.error` logs (existing pattern).
- `privacy_request_events` (new) + `data_retention_events` (existing) D1 audit rows.
- Cloudflare Workers Observability (free tier) for runtime errors.
- No hosted/production metrics at planning time.

## Release gates

| Gate | Blocks |
|---|---|
| Focused tests green (PC-01…PC-18 for the phase) | Merge |
| No >2x evaluator regression | Merge |
| Local D1 apply + EXPLAIN for `0037` | P0 merge |
| Operator denial tests green (PC-07, PC-13) | Closed-beta rollout |
| R2 + Email provider proof recorded | Production rollout (P2/P1) |
| `OPEN-ERASE-01` resolved + dry-run/confirm denial tests green | P3 production |
| `OPEN-LEGAL-02` resolved + alert/runbook named | P4 production |

## Rollout rings

1. **Local** (developer): focused tests + local D1 + R2 mock.
2. **Closed-beta** (operator only): the workflow is operator-facing; no end-user exposure beyond the existing intake (which only gains a response field + confirmation email).
3. **Production**: after provider proof (D1/R2/Email) recorded.

## Rollback steps

- P0: drop new columns/tables via a down-migration (additive; safe) OR leave in place (defaults are no-ops). Intake reverts to anonymous-only by removing the session branch.
- P1: operator UI is additive; remove routes/actions to revert. Emails can be disabled via `ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED=false`.
- P2: remove export action; R2 objects cleaned by retention/lifecycle.
- P3: erasure confirm requires explicit operator action; to abort, set `legal_hold=1` on remaining rows and disable the confirm action.
- P4: breach flag is read-only; remove the cron slice / alert.

## Feature flags

- `ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED` (existing) gates confirmation/status email.
- No new flag required for closed-beta (the workflow is gated by role, not flag).
- Optional: a `PRIVACY_REQUEST_ERASURE_ENABLED` flag to disable `P3` confirm independently (recommended given destructiveness).

## Backward compatibility

- Intake response adds `identityVerified` (additive; old clients ignore).
- Retention cron unchanged.
- No API version bump.

## Known gaps

- No Turnstile (closed-beta; revisit on first abuse signal).
- No KBA/SMS identity assurance (chosen level: hashed-token email loop).
- SLA target is an owner-delegated 30-day default until `OPEN-LEGAL-02`.
- Erasure scope is an owner-delegated minimal list until `OPEN-ERASE-01`.
- No hosted/production metrics at planning time (free-tier posture).

## Runbook (operator)

1. Open queue (`workshop/settings/privacy-requests`).
2. For each `submitted` request: confirm identity (check verify event or send/re-send verification) → transition to `in_triage` (sets SLA clock).
3. Once verified → `in_progress`.
4. Fulfill: export (`access`/`portability`) or erasure dry-run→confirm (`erasure`).
5. Transition to `completed`/`rejected`; status email sent if opt-in.
6. Evidence (event row + R2 pointer / retention event) recorded automatically.

## Support / incident notes

- If intake floods: tighten rate limit; consider Turnstile (`ABUSE-2`).
- If erasure mis-scoped: set `legal_hold=1`, restore from daily D1 backup, record incident.
- If email down: circuit breaker degrades; confirmation best-effort; intake unaffected.

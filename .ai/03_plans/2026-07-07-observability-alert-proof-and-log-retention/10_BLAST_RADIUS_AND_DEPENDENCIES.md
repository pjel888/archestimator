# 10 — Blast Radius and Dependencies

## Impact classification key
`R`equired change · `P`robable change · `V`erification only · `X` explicitly unaffected

## Direct and transitive impact

| Area | Impact | Class | Evidence / note |
|---|---|---|---|
| `scripts/check-support-monitoring-readiness.ts` | rewritten to artifact-driven | R | GATE-01; backward-compatible flag fallback deprecated |
| `scripts/verify-upload-alert-delivery.ts` | extended (log outcome, not swallow) | R | S-03; OPS-02 |
| `scripts/verify-*-alert-delivery.ts` (6 new) | new proof scripts | R | FR-04 |
| `src/lib/observability/alert-scenarios.ts` (new) | catalog | R | FR-01 |
| `src/lib/observability/alert-proof-schema.ts` (new) | receipt schema | R | FR-03 |
| `src/lib/observability/alert-events.ts` (new) | event builders | R | OPS-02 |
| `src/lib/observability/incident-record.ts` (new) | incident row builder + redact | R | FR-05 |
| `src/lib/uploads/operational-telemetry.ts` | extend: log outcome instead of swallow | R | OPS-02; keep fire-and-forget *behavior* |
| `src/lib/compliance/retention-core.ts` | +7 rules | R | DATA-02 |
| `migrations/0040_operational_incidents.sql` (new) | incident tables | R | DATA-01 |
| `.ai/10_state/compliance/retention-schedule.md` | correct logs TTL + add incident/evidence classes | R | DATA-03/DATA-04 |
| `.gitignore` | confirm `.ai/99_scratch/alert-proof/` excluded | R | DATA-04 |
| `worker.ts` cron-failure alert hook | depends on sibling FR-02/FR-03 | P | only if sibling lands first; else S-05 degrades |
| `wrangler.jsonc` | no new binding by default | X | unless R2 proof store chosen (`OPEN-EVID-01`) |
| `src/lib/observability/redact.ts` | **NOT edited by this plan** | X | gaps owned by sibling SEC-01 (inventory only) |
| ~88 `console.*` bypass calls | **NOT migrated by this plan** | X | owned by sibling SEC-01 |
| Better Auth session/cookie logic | unaffected | X | retention reads `session` table; no auth change |
| R2 object policies | unaffected | X | no lifecycle change |
| Durable Object `CollaborationRoom` | unaffected | X | sibling REL-03 owns DO fan-out |
| Estimate/auth/publication business logic | unaffected | X | operational plan only |
| End-user UI / routes | unaffected | X | no new public routes |
| `notification_definitions`/`notification_deliveries` | unaffected | X | in-app only; operational alerts use email/webhook not in-app |
| `beta_feedback_submissions` schema | unaffected (here) | X | feedback SLA columns owned by beta-feedback pack; feedback purge `DATA-02` there couples to `OPEN-DEC-004` |
| D1 backup automation | unaffected | X | backup pack owns; retention ≠ backup noted |

## Dependencies (cross-pack)

| Dependency | Type | On whom | Impact if not met |
|---|---|---|---|
| Request-id (FR-03 correlation) | sequencing | sibling observability pack FR-01 | receipts correlate by timestamp only (R-04) |
| Error taxonomy (S-02 signal) | sequencing | sibling FR-05 | S-02 signal less precise |
| GraphQL query defs (S-02 poller) | sequencing | sibling OBS-03 | poller query shape自行; re-validate |
| Retention time/row budget options | sequencing | sibling REL-02 | DATA-02 rules unbounded until sibling lands (use local defaults) |
| Redaction enforcement (gaps G-1..G-9) | non-blocking | sibling SEC-01 | logs the alerts reference remain partially unredacted; runbook states honestly |
| Feedback purge `DATA-02` | non-blocking | beta-feedback pack | feedback retention couples to `OPEN-DEC-004`; not blocking here |
| Migration `0039` (feedback SLA) | coordination | beta-feedback pack | `0040` is next slot after; `LOOP_LEDGER` |

## Backward compatibility

- The readiness script rewrite keeps the old `*_CONFIRMED` flags as a **deprecated fallback** so a
  half-migrated state does not silently pass; the output marks `mode:
  "support-monitoring-readiness-v2-artifact"` vs legacy.
- New retention rules are additive (no existing rule changed).
- Migration `0040` is purely additive (new tables).
- No public API/route contract changes.

## Documentation impact

- `retention-schedule.md` updated (DATA-03/DATA-04).
- `current-state.md` gets a planning entry when implementation lands (not in this planning task).
- Runbook (`13_…`) is new.
- No `README.md`/`DESIGN.md` change required.

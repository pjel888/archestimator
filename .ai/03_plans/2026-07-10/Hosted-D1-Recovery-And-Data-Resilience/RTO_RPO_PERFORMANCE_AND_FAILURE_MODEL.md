# RTO, RPO, Performance, And Failure Model

## Authority And Scope

This performance/reliability artifact expands `REQ-002`, `REQ-006`, `REQ-007`,
`AC-002`, `AC-006`, `AC-007`, `TEST-002`, `TEST-006`, `TEST-007`,
`DEC-AUTO-006`, `RISK-002`, `RISK-003`, `UNIT-002`, `UNIT-005`, and
`UNIT-006`. It defines evaluators and failure responses; provider limits or this
plan are not measured recovery evidence.

## Definitions And Milestones

| Measure | Start | End | Meaning |
| --- | --- | --- | --- |
| Export interruption | Provider export command accepted | Export complete/aborted and source accepts normal work | Observed source-impact window, not RTO. |
| Technical restore duration | Export start | Import plus offline integrity/session checks complete | Time to a validated isolated data state. |
| Application verification duration | Offline checks complete | App/authz/session/write proof complete | Time to verified application behavior. |
| Cleanup duration | Proof complete or first failure | Every run resource/data/key absence readback passes | Time to eliminate rehearsal exposure. |
| Rehearsal RTO | Export start | App/authz/session checks pass and a traffic-ready decision could be made | Measured rehearsal recovery time; no production traffic is shifted. |
| Rehearsal RPO | Export/bookmark timestamp | Controlled recovery decision time/data checkpoint | Observed data age/gap, not the provider retention headline. |

All timestamps use one monotonic duration source plus UTC wall-clock milestones.
The receipt records definitions, raw milestone times, computed values, fixture/
source size, provider/backend/plan, and any excluded wait time.

## Evaluation Matrix

| Dimension | Baseline/fixture | Evaluator | Regression/stop trigger |
| --- | --- | --- | --- |
| Export/import | Current authorized source plus measured export bytes | Provider timings and size readback | Approved window exceeded, size/limit uncertainty, non-Free fallback. |
| Integrity | Full active migration/schema plus critical-table aggregates | Per-check duration and stable result label | Any skipped/timed-out required check or unexplained 2x prior duration. |
| App/authz | Representative reads, denials, session and controlled write | End-to-end probe durations plus repository source marker | Timeout, target misbinding, denial failure, or persistent write. |
| Proof ingress | At most 32 successes; five failed attempts/minute | Concurrent boundary fixtures and pre-dispatch counters | More than cap, replay race, body cap bypass, unbounded state. |
| Cleanup | Inventory of every run-created surface | Delete plus independent list/read/URL/file/key absence | Any residue or inability to query a surface. |
| Scale reasoning | Current source plus 10x row-count dry-run fixture where local mechanics permit | Query/check complexity, output size, memory/temp usage | Unbounded row materialization, raw export in evidence, memory/disk risk. |

Numeric Beta thresholds for a go/no-go run are set in the exact `AUTH-001`
packet from the current source size and approved maintenance window. The plan
does not invent an operational SLA. A missed packet threshold fails the run and
feeds the incident/replanning path even when integrity eventually passes.

## Failure And Recovery Model

- **Preflight failure:** no provider mutation; record safe label and repair
  prerequisites.
- **Export/source impact:** abort on window or health threshold; activate the
  Operating incident path and clean protected artifacts.
- **Create/import/integrity failure:** never deploy ingress; destroy target and
  data/key lifecycle, then independently verify absence.
- **Session/app/authz failure:** disable/delete ingress immediately, preserve only
  redacted diagnostics, and destroy target after approved inspection.
- **Cleanup failure:** open P0 incident/blocker, keep release red, restrict access
  to the residue, and retry scoped cleanup with independent verification.
- **Receipt/consumer mismatch:** producer reruns or reissues after new proof; a
  consumer never edits or accepts the stale receipt.

## Observability And Handback

Signals include phase/state, elapsed duration, redacted identity, data size,
check label/result, retry count, cleanup inventory/result, and correlation/run
ID. No signal contains row data, tokens, proof headers, nonces, key material, or
private paths. `UNIT-005` defines receipt fields and consumers; `UNIT-006`
measures them under authorization; the Program/Release packs decide whether the
current measured result satisfies their release window.

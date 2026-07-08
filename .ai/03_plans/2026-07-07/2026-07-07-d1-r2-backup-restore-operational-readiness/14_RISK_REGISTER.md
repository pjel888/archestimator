# 14 — Risk Register

| ID | Description | Trigger | Probability | Impact | Severity | Affected areas | Detection | Prevention | Mitigation | Contingency | Owner | Residual risk | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RISK-01 | Destructive restore/import against production `database_id` | operator passes wrong dest id | Low (tool asserts) | **Critical** (data loss/overwrite) | **Critical** | D1 prod, all data | target-isolation assertion (TASK-101) + test | hard script assertion dest≠prod; runbook gate | assertion aborts; runbook says never bypass | if it happens: Time Travel restore from pre-incident bookmark (≤7d free) | owner + impl | operator bypasses assertion manually | open (controlled by TASK-101) |
| RISK-02 | Hosted D1 restore unproven (local-only rehearsal) | OPEN-01 not approved | High (currently open) | High (false readiness confidence) | High | D1 readiness | readiness cap in `17_…` | honest `providerBacked: false` in report | label `CONDITIONALLY READY`; pursue OPEN-01 | owner approves drill; provider evidence recorded | owner | hosted behavior unknown until drilled | open |
| RISK-03 | R2 user-error data loss (no versioning) | accidental delete/overwrite | Medium | High (irrecoverable asset loss) | High | R2 prod bucket, upload assets | inventory reconcile shows dangling | sampled-object drill proves get→put; durability covers infra | OPEN-03 second bucket or app-level soft-delete | restore from local-export drill copy if sampled; else lost | owner | no native undelete | open (mitigated by durability for infra failure) |
| RISK-04 | Free-tier quota exhaustion by drill | drill burns > 5M rows-read/day or > 1M Class A ops/month | Low at launch; rises with scale | Medium (app throttle) | Medium | D1/R2 quotas, app perf | cost model `20_…` + drill headroom check | cap inventory pagination; check headroom pre-flight | abort on quota warning | OPEN-02 cadence decision; switch to sampled inventory | impl + owner | scale-out unmodeled | open (low at launch) |
| RISK-05 | DSAR/privacy rows resurrected by restore | restore brings back erased data | Medium (if restore used for real recovery) | High (compliance violation) | High | privacy_request_register, data_retention_events, account_security_events | post-restore re-erasure check (runbook) | runbook step mandatory | re-run privacy/retention cleanup | owner incident response | owner + operator | operator skips runbook step | open (controlled by runbook) |
| RISK-06 | Partial D1 import resumes incorrectly | operator retries `execute --remote --file` into same target after a drop | Medium | Medium (duplicate/partial data) | Medium | isolated target DB | FK/row-count gate FAIL | runbook says drop + restart, never resume | drop target + re-import into fresh | n/a | impl + operator | operator resumes manually | open (controlled by runbook) |
| RISK-07 | Secret/PII leak in evidence artifact | account id / object bytes committed | Low (tools redact) | High (secret leak) | High | Git history, evidence folder | redaction unit tests | redact ids to prefixes; sample keys; no byte persistence | pre-commit review of evidence | rotate leaked token; purge history (owner-approved) | impl + owner | bytes leak via object dump | open (controlled by REQ-SEC-01) |
| RISK-08 | `AGENTS.md` "daily D1 backups" misread as a current fact | operator assumes daily export exists | Medium | Low (false confidence) | Low | docs, operator mental model | this pack documents the truth | this pack flags OPEN-02 | fix `AGENTS.md` wording (separate change) | n/a | owner | none after docs fix | open (docs) |
| RISK-09 | R2 inventory returns stale list (eventual consistency) | recent puts/deletes lag | Low | Low (drift in reconcile) | Low | inventory report | reconcile is point-in-time; re-run | document as snapshot | n/a | impl | none | open (acceptable) |
| RISK-10 | Time Travel 7-day window too short for slow-detected corruption | corruption found after 7 days | Low (pre-launch) | High (unrecoverable via Time Travel) | Medium | D1 prod | n/a | OPEN-02 daily export extends window | export-to-R2 retention beyond 7 days | owner | data older than 7d lost without OPEN-02 | open (OPEN-02) |
| RISK-11 | Worker-based inventory variant introduces a new runtime surface (authz risk) | future decision to run inventory on a schedule via a Worker | Low | Medium (new authz surface) | Medium | Worker route, authz | n/a | keep CLI+REST default; Worker only if scheduled | authorize the Worker route; scope the binding | n/a | impl + owner | none if CLI-first | open (future option) |
| RISK-12 | Concurrent agent edits the rehearsal script during Phase 1 | shared worktree collision | Medium | Low (merge conflict) | Low | scripts/ | coordination ledger + re-git-status | file-scope ownership; small diffs | rebase/merge | n/a | impl | none | open (shared-worktree baseline) |

## Severity legend
**Critical** = catastrophic/irreversible (prod data loss). **High** = serious
false-readiness or compliance/secret risk. **Medium** = operational/quota/
docs. **Low** = minor drift/collision.

## Top risks to close before production cutover
1. **RISK-01** (TASK-101 assertion) — controls the catastrophic path.
2. **RISK-02** (OPEN-01 provider drill) — closes hosted-readiness uncertainty.
3. **RISK-05** (DSAR re-erasure runbook step) — controls compliance.

Everything else is medium/low and acceptable for a pre-launch, free-tier
posture, with the documented mitigations.

# 14 — Risk Register

| ID | Description | Trigger | Probability | Impact | Severity | Affected areas | Detection | Prevention | Mitigation | Contingency | Owner | Residual risk | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RISK-01 | Isolate OOM under concurrent uploads | ≥3 concurrent large uploads buffer whole bodies | High (today) | High (dropped requests) | **Critical** | all upload routes | Workers Observability eviction logs; memory harness | FR-01 stream + FR-02 cap + admission | stream + env cap | lower `…CONCURRENT_UPLOADS` | impl lane | low after FR-01/02 | Open (drives P0) |
| RISK-02 | Image cap 12→4 MiB breaks user flow | FR-02 enforces 4 MiB | Medium | Medium | Medium | image routes | user 413 reports | OPEN-01 ack + clear copy + client pre-check | raise cap via env (owner) | owner raises `…BODY_LIMIT_BYTES` | owner | medium until ack | Open (OPEN-01) |
| RISK-03 | Multipart op-count blows free quota | DEC-03 enabled, many parts | Medium | Medium | Medium | R2 Class A budget | dashboard op count | operation budget (`20`); cap parts | throttle uploads | defer DEC-03 | owner | low if budget held | Open (DEC-03) |
| RISK-04 | Multipart partial-upload orphans | client abort mid-multipart | Medium | Low | Low | R2 storage | reconcile job | abort on failure + retention reconcile | manual cleanup via `list` | owner cleanup | impl lane | low | Open (DEC-03) |
| RISK-05 | ClamAV unreachable from Worker | network egress blocked | Medium | Medium | Medium | scan path | `failed_transient` storm | OPEN-02 confirm reachability before enable | keep policy floor as fallback | defer OPEN-02 | owner | medium until confirmed | Open (OPEN-02) |
| RISK-06 | Policy scanner false sense of security | team assumes default = AV | Medium | High | High | trust posture | review | FR-07 honest doc | doc + runbook | owner enables ClamAV | owner | low after doc | Open (FR-07 doc) |
| RISK-07 | Images free-quota exhaustion (5,000/mo) | DEC-07 + high image volume | Medium | Medium | Medium | image processing | quota monitor | monitor + alert | cap/upgrade (paid decision) | revert to sharp | owner | medium | Open (DEC-07) |
| RISK-08 | sharp Workers-incompat / bundle bloat | DEC-07 keeps sharp | Medium | Medium | Medium | bundle size | `cf:build` >3 MiB | prefer Images binding | remove sharp | flip DEC-07 to binding | owner | medium | Open (DEC-07) |
| RISK-09 | D1/R2 drift orphans objects | retention/cleanup misses | Medium (today, FR-06 gap) | Medium | Medium | R2 storage | reconcile job | FR-05/FR-06 | reconcile dry-run→delete | manual `list` cleanup | impl lane | low after FR-05/06 | Open (FR-05/06) |
| RISK-10 | Streaming bypasses magic-byte sniff | impl skips sniff to stream | Low | High | Medium | content validation | SEC-02 test | sniff first bytes then stream rest | enforce sniff test | revert to buffer-sniff | impl lane | low | Open (SEC-02) |
| RISK-11 | `formData()` consumes body → stream fails | impl streams `request.body` after `formData()` | Medium | Medium | Medium | routes | route test | stream `file.stream()` from FormData, not `request.body` | test disturbed-stream case | buffer fallback for that route | impl lane | low | Open (FR-01) |
| RISK-12 | CSRF on upload POST | cross-site form POST | Low | Medium | Low | routes | T-10 verify | Better Auth same-site cookies | verify during impl | add CSRF token | impl lane | low | Open (T-10 verify) |
| RISK-13 | Admission not distributed → cap bypass under multi-isolate | many isolates | Medium | Low | Low | admission | backpressure logs | durable direct-upload capacity (D1) is hard limit | document advisory nature | per-workspace D1 caps | impl lane | low | Accepted (documented) |
| RISK-14 | Hosted memory-pressure proof gap | no eviction harness | Medium | Medium | Medium | verification | n/a | T-21 extends body-probe; record gap | document residual | post-impl hosted N-concurrent proof | impl lane | medium until post-impl | Open (proof gap) |
| RISK-15 | R2 `list` cost on large buckets | daily reconcile | Low | Low | Low | R2 Class B | dashboard | cap frequency + page size | throttle reconcile | reduce frequency | impl lane | low | Open (FR-05) |

No unmitigated **Critical** risk remains after FR-01/02. RISK-01 is Critical today and is the
primary driver of the P0 streaming work.

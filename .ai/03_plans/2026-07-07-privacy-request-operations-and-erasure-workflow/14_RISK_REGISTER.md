# 14 — Risk Register

| ID | Description | Trigger | Probability | Impact | Severity | Affected | Detection | Prevention | Mitigation | Contingency | Owner | Residual | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RISK-01 | Erasure fires on unverified request | identity gate bypass | Low | Critical | Critical | erasure, user data | PC-04, PC-12 | server-side `identity_verified` gate in `transitionStatus` + confirm | gate tested; dry-run+confirm | restore from backup; `legal_hold` | owner/legal | low | open (P3 gated) |
| RISK-02 | Erasure scope drift | scope list mis-edited | Medium | Critical | High | erasure | PC-12 scope assertion | counsel-approved list; assertable | fix-forward via retention cron | restore backup | legal | medium | open (P3 gated) |
| RISK-03 | Anonymous intake abuse/flood | bot or targeted | Medium | Medium | Medium | intake | rate-limit metrics | ABUSE-1 sliding window | tighten limit; Turnstile (ABUSE-2) | fail-open logged | ops | low | open |
| RISK-04 | Verification token theft | email intercept/link share | Low | High | Medium | verify | reuse detection | single-use + 24h TTL + hash-only | consume on use | re-verify flow | security | low | open |
| RISK-05 | Operator privilege misuse | malicious/compromised admin | Low | High | Medium | operator actions | audit events | platform-admin role; audit every action | revoke role; incident | event trail | owner | low | open |
| RISK-06 | Retention cron double-deletes after erasure | erasure + cron overlap | Low | Low | Low | data | retention event rows | erasure writes `data_retention_events` | cron idempotent (DELETE no-op) | none needed | ops | minimal | open |
| RISK-07 | Email deliverability failure | provider issue | Medium | Medium | Medium | confirmation/status | circuit breaker | breaker + opaque log | retry; degrade | intake unaffected | ops | medium | open |
| RISK-08 | Rate-limit D1 failure | D1 unavailable | Low | Medium | Low | intake | logs | fail-open (closed-beta) | monitor | switch fail-closed post-beta | ops | low | open |
| RISK-09 | Concurrent transition race | two operators | Low | Low | Low | lifecycle | PC-06 | CAS on status | second → 409/no-op | none | engineering | minimal | open |
| RISK-10 | Raw personal data leaks into logs | coding error | Low | High | Medium | all | PC-13 invariant | HMAC hash discipline; redacted logs | invariant test | rotate pepper | security | low | open |
| RISK-11 | SLA clock definition wrong | `OPEN-LEGAL-02` unresolved | Medium | Medium | Medium | P4 | breach false pos/neg | owner-delegated 30d default | confirm with counsel | adjust compute | legal | medium | open (P4 gated) |
| RISK-12 | Migration CHECK rejects valid rows | bad JSON evidence | Low | Medium | Low | DB | apply log | json_valid CHECK | fix forward | down-migrate | engineering | low | open |
| RISK-13 | R2 export cross-user leak | scoping bug | Low | Critical | High | export | PC-10 | scope by `requester_user_id` | leak test | revoke access; audit | engineering | low | open |
| RISK-14 | Public-form copy misleads requester | `OPEN-LEGAL-01` unresolved | Medium | Low | Low | docs | review | generic copy until sign-off | ledger note | update on sign-off | legal | low | open |
| RISK-15 | Bundle bloat from queue UI | heavy client island | Low | Low | Low | perf | EV-08 | smallest `"use client"` | bundle analysis | trim | engineering | minimal | open |
| RISK-16 | Token enumeration via status lookup | id+token brute force | Very Low | Medium | Low | lookup | rate limit + 404 | 128-bit token; per-ip limit | 404 uniform | tighten limit | security | minimal | open |

**Residual risk statement.** The highest residual risks are `RISK-01`/`RISK-02` (erasure), both contained by gating `P3` on `OPEN-ERASE-01` and requiring dry-run+confirm+scope assertion. With `P0`–`P2` shipping first, no destructive path is reachable until the owner/legal decisions are made. All other residuals are low/minimal at closed-beta volume.

# 14 — Risk Register

| ID | Description | Trigger | Probability | Impact | Severity | Affected areas | Detection | Prevention | Mitigation | Contingency | Owner | Residual risk | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RISK-001 | Wrongful erasure destroys user data | compromised admin / no identity verification | Low | Critical | High | DSAR, user data | audit; user complaint | typed phrase + `OPEN-DEC-007` threshold + 30d R2 window | recover R2 within 30d; breach runbook | counsel notification | Philip + counsel | Medium (D1 anonymization irreversible) | Mitigated pending `OPEN-DEC-007` |
| RISK-002 | Retention purge deletes legal-hold data | cron purges held data | Low | High | High | retention, legal | `skipped_legal_hold` audit | `legal_hold` column (DB-04) + `skipped_legal_hold` action | restore from daily backup | counsel | counsel | Low after DB-04 | Blocked on `OPEN-DEC-006` |
| RISK-003 | DSAR export cross-workspace leak | builder bug includes other user data | Medium | Critical | High | DSAR, privacy | fixture test; audit | strict `target_user_id` filter; two-fixture test | rotate URLs; audit | counsel notification | impl + security | Low after test | Open until test passes |
| RISK-004 | Cron silent failure (error-skip) | D1 error mid-pass | Medium | Medium | Medium | retention | dashboard alert | error → audit row; 30-day gate | fix forward; next run | manual trigger | ops | Low | Open until 30-day gate |
| RISK-005 | TTL set wrong (purges too early/late) | code bug or counsel mismatch | Medium | High | High | retention, data | audit row counts; counsel review | draft marker; single source of truth; `OPEN-DEC-004` | adjust TTL; restore from backup (early purge) | counsel | counsel + impl | Medium until `OPEN-DEC-004` | Open |
| RISK-006 | Better Auth revocation incomplete | API gap or misuse | Low | High | Medium | DSAR erasure | post-erasure session check | DISCOVERY (T-4.2) + proof | re-run revoke | manual session purge | impl | Low after DISCOVERY | Open |
| RISK-007 | `data_retention_events` rebuild (DB-05) loses rows | migration bug | Low | Medium | Medium | audit trail | row count before/after | copy-all rebuild; daily backup | restore from backup | re-apply | impl | Low | Open |
| RISK-008 | Pepper rotation breaks legacy audit reads | operator rotates `AUTH_AUDIT_HASH_PEPPER` | Low | Medium | Low | audit | read errors post-rotate | rotation runbook; rehash backlog | keep old pepper for read path during transition | — | ops | Low | Documented |
| RISK-009 | R2 purge backlog grows unbounded | cron failure / R2 errors | Medium | Medium | Medium | R2, cost | dashboard; backlog query | retry + DLQ-style | manual purge | — | ops | Low | Open |
| RISK-010 | Admin console XSS via request description | requester submits script payload | Low | High | Medium | admin UI | DOM test | render as text (React default escape); test | patch render | — | impl | Low after test | Open |
| RISK-011 | Export package too large (timeout) | very active user | Medium | Medium | Medium | DSAR export | timeout | size cap + truncate; Queue handoff (Phase 3 decision) | Queue handoff | partial package + warning | impl | Low | Open |
| RISK-012 | Intake queue flooding | attacker | Medium | Low | Low | intake | rate-limit metrics | per-email + per-IP limit (existing) | tune limits | — | ops | Low | Mitigated |
| RISK-013 | DSAR SLA missed | ops capacity | Medium | Medium | Medium | DSAR | queue age | `OPEN-DEC-007` SLA; dashboard | prioritize | communicate to requester | ops + counsel | Medium until SLA set | Open |
| RISK-014 | Stale plan (impl delayed) | repo drift | Medium | Medium | Medium | whole pack | re-validation checklist (README) | re-read files before edit | re-validate | — | impl | Low | Documented |
| RISK-015 | Legal/compliance misclaim | overstatement | Low | High | Medium | docs, comms | review gate | "draft/conditional" language; no compliance claim | correct language | counsel | lead + counsel | Low | Documented |
| RISK-016 | Concurrent-agent file conflict during impl | shared worktree | Medium | Low | Low | impl | git status; ledger | file-scope ownership | coordinate | — | impl | Low | Documented |

Technical + non-technical risks covered. Critical risks (001, 002, 003, 005) all have mitigations and named owners; none remain unmitigated at High severity after their gates.

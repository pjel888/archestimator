# Risk Register

| ID | Description | Trigger | Probability | Impact | Severity | Affected areas | Detection | Prevention | Mitigation | Contingency | Owner | Residual risk | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RISK-01 | Facts allow-list drops a currently-shown benign fact | WP-1.3 tightening without enumerating current keys | Medium | Low | Medium | activity-composer, recipient UI | composer test; visual diff | Discovery step in WP-1.3 | Add the key to the allow-list with a comment | Owner decides whether to restore | executor | Low after discovery | Open until WP-1.3 discovery |
| RISK-02 | Owner-gated hardening deferred (secrets, Turnstile, session revocation) leaves residual P1 risk | Owner defers OPEN-SEC-02/03/04 | High | Medium | Medium-High | share auth surface | threat model (T-05/06/07) | Documented as owner-gated | Phase 3/6/7 runbooks ready | Owner acceptance of residual risk | Philip | Medium until phases land | Open (owner-gated) |
| RISK-03 | Retention TTL too aggressive deletes in-use data | WP-5.1 TTL mis-set | Low | High | High | share content | retention dry-run; `data_retention_events` | Dry-run on staging; owner sign-off | Restore from daily D1 backup | `cf:d1-restore-rehearsal` | Philip | Medium (data-loss irreversibility) | Open until OPEN-RET-01 |
| RISK-04 | Concurrent-agent edit collision on shared component (`SharePageComments.tsx`) | Transition-UX plan edits the same component concurrently | Low | Low | Low | SharePageComments | coordination ledger | file-ownership declaration | Re-read before edit; `git diff --check` | serialize the two edits | executor | Low | Open (coordination) |
| RISK-05 | String-contract test breaks on route text change | WP-1.x changes route.ts text that `security-findings-publication-contracts.test.ts` matches | Medium | Low | Low | test | CI | Update assertions in WP-8.3 | Update assertion | n/a | executor | Low | Open |
| RISK-06 | Recipient-proposals view breaks if email is hashed | (Not in plan; flagged) someone hashes recipient email | Very Low | High | Medium | proposals view | test | DATA-03 documents the invariant | Revert | n/a | Philip | Low | Mitigated by DATA-03 |
| RISK-07 | D1 partial failure leaks partial response | one of three queries fails mid-response | Low | Medium | Medium | activity route | REL-01 test | fail-fast to 500 uniform | REL-01 | revert | executor | Low after TEST | Open until WP-2.1 |
| RISK-08 | Performance regression from benchmark fixture drift | fixture doesn't match real volume | Low | Low | Low | benchmark | p95 trend | Phase 0 baseline | re-baseline | n/a | executor | Low | Open |
| RISK-09 | Turnstile adds UX friction that owners reject | Phase 6 adopted | Medium | Low | Low | share UX | owner feedback | make flag-gated; password links bypass | disable flag | n/a | Philip | Low | Owner-gated |
| RISK-10 | Secret-split rotation invalidates active sessions/tokens en masse | Phase 3 changes cookie/telemetry binding | Medium | Medium | Medium | share auth | session failures post-deploy | staged deploy; monitoring | Restore fallbacks temporarily | owner comms | Philip | Medium | Open (Phase 3) |
| RISK-11 | Retention cron error silently skips a table | bug in new rule | Low | Medium | Medium | retention | `data_retention_events` audit | TEST-03 dry-run | next run resumes | manual purge | executor | Low after TEST | Open until WP-5.2 |
| RISK-12 | Public DTO change breaks an untracked consumer | an unlogged component reads `meta` | Low | Low | Low | consumers | type-check + grep | verify no `meta` reads | restore field | n/a | executor | Low | Open (verified none) |
| RISK-13 (accepted) | `recipientSession: boolean` in activity response is a low-severity oracle (tells anonymous caller whether a valid session cookie was accepted) | observed by auditor | Low | Very Low | Very Low | activity route | audit observation | by design — supports client feature detection | remove the flag only if a future threat model elevates it | n/a | Philip | Very Low (accepted) | Accepted — no remediation planned |

## Technical and non-technical risks

- Technical: RISK-01, 03, 04, 05, 07, 08, 10, 11, 12.
- Non-technical: RISK-02 (owner decisions), RISK-06 (policy invariant), RISK-09 (UX acceptance).

## Unmitigated critical risks

None. RISK-02 and RISK-03 are the highest residual and both have owner-gated paths + backups.

# Requirements Traceability Matrix

| Requirement ID | Source | User outcome | Implementation phase | Task IDs | Code areas | Acceptance criteria | Test coverage | Rollout check | Status |
|---|---|---|---|---|---|---|---|---|---|
| FR-01 | brief + repo | tight public DTO | Phase 1 | WP-1.4 | activity/route.ts | AC-FR-01a/b | TEST-01 (route) | provider readback | Ready |
| FR-02 | brief + repo | comments w/o session | Phase 2 (test) | WP-2.1 | activity/route.ts | AC-FR-02a | TEST-01 | CI | Ready |
| FR-03 | brief + repo | decisions/events recipient-scoped | Phase 2 (test) | WP-2.1 | activity/route.ts, d1-store.ts | AC-FR-03a | TEST-01 | CI | Ready |
| FR-04 | brief + repo | internal excluded | Phase 2 (test) | WP-2.1 | d1-store.ts, route.ts | AC-FR-04a | TEST-01 | CI | Ready |
| FR-05 | brief + repo | stable cursor pagination | Phase 2 (test) | WP-2.1 | route.ts, activity-helpers.ts | AC-FR-05a | TEST-01 | CI | Ready |
| FR-06 | brief + repo | revoked/expired 404 + no-store | Phase 4 + WP-2.1 | WP-4.1/4.2 | route.ts | AC-FR-06a | TEST-01 + no-store test | CI + readback | Ready |
| FR-07 | brief + repo | password 423 | Phase 2 (test) | WP-2.1 | route.ts | AC-FR-07a | TEST-01 | CI | Ready |
| SEC-01 | repo | no author_email over-fetch | Phase 1 | WP-1.1 | d1-store.ts | AC-SEC-01a | repo unit test | EXPLAIN readback | Ready |
| SEC-02 | repo | no recipient email over-fetch | Phase 1 | WP-1.2 | d1-store.ts | AC-SEC-02a | repo unit test | EXPLAIN readback | Ready |
| SEC-03 | brief + repo | allow-list facts | Phase 1 | WP-1.3 | activity-composer.ts | AC-SEC-03a | activity-security.test.ts | CI | Ready |
| SEC-04 | repo | redactor routing | Phase 1+2 | WP-1.5, WP-2.4 | share routes | AC-SEC-04a | logging test | grep + test | Ready |
| SEC-05 | repo | IDs re-hashed | Phase 2 (test) | WP-2.1 | route.ts | AC-SEC-05a | TEST-01 | CI | Ready |
| SEC-06 | repo | cross-pub scoping | Phase 2 (verify) | WP-2.1 | public-repository.ts | AC-SEC-06a | existing repo test | CI | Ready (preserve) |
| SEC-07 | repo (P1-3) | split secrets | Phase 3 (owner) | WP-3.1..3.3 | security.ts, public-repository.ts | AC-SEC-07a | config test | owner confirm | Conditionally Ready |
| SEC-08 | repo (P1-1/2) | Turnstile/WAF | Phase 6 (owner) | WP-6.1..6.3 | route.ts, page.tsx | AC-SEC-08a | browser + dashboard | owner proof | Conditionally Ready |
| SEC-09 | repo (P2-6) | session revocation | Phase 7 (owner) | WP-7.1..7.4 | migration, security.ts, actions.ts | AC-SEC-09a | route + readback | migration readback | Conditionally Ready |
| SEC-10 | brief + repo | rate limit 429 | Phase 2 (test) | WP-2.1 | route.ts | AC-SEC-10a | TEST-01 | CI | Ready |
| SEC-11 | repo (P2-3) | drop Resend UUID tags | (low priority) | (future) | actions.ts | AC-SEC-11a | unit test | n/a | Deferred |
| DATA-01 | brief + repo | retention covers share content | Phase 5 | WP-5.1..5.3 | retention-core.ts | AC-DATA-01a | retention test | dry-run + owner | Ready (mech)/Cond (TTL) |
| DATA-02 | repo | no-soft-delete invariant doc | Phase 1 | WP-1.6 | d1-store.ts | AC-DATA-02a | static | n/a | Ready |
| DATA-03 | repo | recipient email plaintext (documented) | n/a (decision) | n/a | n/a | AC-DATA-03a | decision record | n/a | Ready |
| API-01 | repo | no-store | Phase 4 | WP-4.1 | route.ts | AC-API-01a | no-store test | CI | Ready |
| API-02 | repo | uniform error contract | Phase 2 (test) | WP-2.1 | route.ts | AC-API-02a | TEST-01 | CI | Ready |
| TEST-01 | brief | route-level activity test | Phase 2 | WP-2.1 | new test file | AC-TEST-01a | itself | CI | Ready |
| TEST-02 | brief | facts allow-list test | Phase 2 | WP-2.2 | activity-security.test.ts | AC-TEST-02a | itself | CI | Ready |
| TEST-03 | DATA-01 | retention-rule test | Phase 5 | WP-5.2 | retention test | AC-TEST-03a | itself | CI | Ready (mech) |
| TEST-04 | SEC-04 | redactor test | Phase 2 | WP-2.4 | logging test | AC-TEST-04a | itself | CI | Ready |
| PERF-01 | brief+repo | p95 budget | Phase 0+monitor | WP-0.1 | benchmark | AC-PERF-01a | benchmark | p95 trend | Ready |
| REL-01 | brief+repo | D1 failure → 500 uniform | Phase 2 (test) | WP-2.1 | route.ts | AC-REL-01a | TEST-01 | CI | Ready |
| DOC-01 | brief | data contract doc | Phase 8 | WP-8.1 | this plan / .ai/06_specs | AC-DOC-01a | doc review | n/a | Ready |
| DOC-02 | ops | runbooks | Phase 8 | WP-8.2 | 13_…md | AC-DOC-02a | doc review | n/a | Ready |

## Performance-sensitive requirements mapping

| Requirement | Baseline | Target | Measurement source | Regression threshold | Rollback trigger |
|---|---|---|---|---|---|
| PERF-01 | Phase 0 capture | ≤300ms p95 (std) / ≤500ms (1000-fixture) | `shared-link-activity-benchmark.test.ts` + Workers Obs | +20% p95 | p95 > 600/800ms |

## No requirement untraced

Every requirement (FR-01..07, SEC-01..11, DATA-01..03, API-01..02, TEST-01..04, PERF-01, REL-01, DOC-01..02) maps to source + task + AC + test + rollout check. SEC-11 is explicitly deferred with rationale.

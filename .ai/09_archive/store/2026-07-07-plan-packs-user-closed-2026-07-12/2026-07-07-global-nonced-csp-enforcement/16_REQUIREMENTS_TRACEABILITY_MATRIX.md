# 16 — Requirements Traceability Matrix

Maps every requirement through the lifecycle. No requirement untraced; every task maps
to ≥1 requirement.

| Requirement ID | Source | User outcome | Implementation phase | Task IDs | Code areas | Acceptance criteria | Test coverage | Rollout check | Status |
|---|---|---|---|---|---|---|---|---|---|
| SEC-01 | brief+docs | nonce per request blocks injected scripts | P1 | WP-1.1, WP-1.5 | `src/lib/csp/nonce.ts`, `request-proxy.ts` | AC-SEC-01a/b/c | `csp-nonce-proxy.test.ts`, `csp-nonce.test.ts` | P1 browser smoke | pending |
| SEC-02 | docs | first-party scripts run under enforcement | P1 | WP-1.6, WP-1.7 | `layout.tsx`, 8 script components | AC-SEC-02a/b/c/d | `csp-inline-script-nonce.test.tsx`, Playwright | P3–P5 browser proof | pending |
| SEC-03 | brief | no unsafe-inline on enforced script-src | P3–P5 | WP-3.1, WP-4.1, WP-5.2 | `csp/policy.ts` | AC-SEC-03a | `csp-policy-builder.test.ts` | per-phase | pending |
| SEC-04 | docs | unsafe-eval dev-only | P1 | WP-1.3 | `csp/policy.ts` | AC-SEC-04a/b | `csp-policy-builder.test.ts` | n/a | pending |
| SEC-05 | DEC-08 | style-src unsafe-inline documented | P1 | (decision) | docs | AC-SEC-05a | n/a | n/a | decision recorded |
| SEC-06 | repo | collaboration WebSocket works | P2 | WP-2.1 | `csp/policy.ts` | AC-SEC-06a | `csp-policy-builder.test.ts`, Playwright P4 | P4 | pending |
| SEC-07 | repo | avatars render on landing | P2 | WP-2.2 | `csp/policy.ts` | AC-SEC-07a | `csp-policy-builder.test.ts`, Playwright | P2 | pending |
| SEC-08 | decision | violation reporting + telemetry | P1 | WP-1.4 | `api/csp-report/route.ts` | AC-SEC-08a/b/c/d | `csp-report-endpoint.test.ts` | observation window | pending |
| SEC-09 | repo+decision | no double CSP header | P1–P5 | WP-1.5, WP-3.2/3.3, WP-4.2, WP-5.3 | `next.config.ts` | AC-SEC-09a | `csp-nonce-proxy.test.ts`, DevTools | per-phase | pending |
| ARCH-01 | docs+decision | CSP moves to proxy | P1–P5 | WP-1.5, WP-3/4/5 | `request-proxy.ts`, `next.config.ts` | AC-ARCH-01a/b | proxy tests | per-phase | pending |
| ARCH-02 | derived | route-class policy selector | P1 | WP-1.2, WP-1.3 | `csp/route-class.ts`, `csp/policy.ts` | AC-ARCH-02a | `csp-route-class.test.ts` | n/a | pending |
| ARCH-03 | docs | matcher excludes prefetch | P1 | WP-1.5 | `proxy.ts` matcher | AC-ARCH-03a | `csp-nonce-proxy.test.ts` | n/a | pending |
| PERF-01 | docs | TTFB measured for marketing | P5 | WP-5.1, WP-5.6 | TTFB probe | AC-PERF-01a/b | TTFB artifacts | P5 gate | pending |
| REL-01 | docs | Report-Only never breaks page | P1–P2 | (mode) | policy mode | AC-REL-01a | smoke | n/a | pending |
| OPS-01 | brief | per-phase rollback | P1–P5 | env flags, config | `13` | AC-OPS-01a | rollback drill | per-phase | pending |
| OPS-02 | decision | telemetry observation gate | P1→P3 | WP-1.4 + window | report logs | AC-OPS-02a | log query | before P3 | pending |
| TEST-01 | repo | existing tests rewritten | P1 | WP-1.8 | 4 test files | AC-TEST-01a | vitest | CI green | pending |
| TEST-02 | derived | new proxy/nonce tests | P1 | WP-1.5/1.8 | new test files | (per ACs) | vitest | CI green | pending |
| TEST-03 | brief | browser proof per phase | P3–P5 | WP-3.4/3.5, WP-4.3, WP-5.5 | Playwright | (per proofs) | Playwright | per-phase gate | pending |
| DOC-01 | repo | .ai decisions updated | P1–P5 | doc updates | `.ai/10_state/*` | n/a | review | per-phase | pending |

## Performance-sensitive requirements (PERF detail)

| Requirement | Baseline | Target | Measurement source | Regression threshold | Rollback trigger |
|---|---|---|---|---|---|
| PERF-01 landing TTFB p95 | `09-ttfb-baseline.md` | < baseline + DEC-11 threshold | hosted TTFB probe | > threshold | flip landing to Report-Only (DEC-11 B) |

## Task → requirement reverse mapping (every task traces)

| Task | Requirement(s) |
|---|---|
| WP-1.1 | SEC-01 |
| WP-1.2 | ARCH-02 |
| WP-1.3 | SEC-03/04/05/06/07, ARCH-02 |
| WP-1.4 | SEC-08, OPS-02 |
| WP-1.5 | SEC-01, SEC-09, ARCH-01, ARCH-03, OPS-01 |
| WP-1.6 | SEC-02 |
| WP-1.7 | SEC-02 |
| WP-1.8 | TEST-01 |
| WP-2.1 | SEC-06 |
| WP-2.2 | SEC-07 |
| WP-2.3 | DEC-12 |
| WP-3.1/3.2/3.3 | SEC-03, ARCH-01, SEC-09 |
| WP-3.4/3.5 | TEST-03 |
| WP-4.1/4.2 | SEC-03, ARCH-01, SEC-09 |
| WP-4.3 | TEST-03 |
| WP-5.1/5.6 | PERF-01, DEC-11 |
| WP-5.2/5.3/5.4 | SEC-03, ARCH-01, SEC-09 |
| WP-5.5 | TEST-03 |

No requirement is untraced. No task lacks a requirement mapping.

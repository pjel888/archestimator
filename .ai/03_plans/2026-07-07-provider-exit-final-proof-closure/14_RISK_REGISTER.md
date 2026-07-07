# 14 — Risk Register

| ID | Description | Trigger | Probability | Impact | Severity | Affected areas | Detection | Prevention | Mitigation | Contingency | Owner | Residual risk | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RISK-PE-01 | Proxy-signal acceptance (local evidence treated as provider proof) | agent edits pack md to claim closure while JSON says OPEN | Low | High | High | closure claim honesty | TEST-PE-01 (JSON is truth); `17_…` audit | evidence-class taxonomy | require JSON match | re-open closure | lead | none | mitigated |
| RISK-PE-02 | `accepted-loss` without sole-runtime proof | owner picks loss under pressure, evidenceSource empty | Low | High | High | data-loss exposure | DEC-PE-03 rule; `07_…` §7.4 | data-loss acceptance rule | block closure until proof cited | revert to retention | Philip | none | mitigated |
| RISK-PE-03 | Secret leakage into operator record | operator pastes a token into evidenceSource | Low | High | High | repo secret hygiene | SEC-PE-01 review | sanitization boundary | review gate | edit record, rotate secret if leaked | operator | low (review gate) | mitigated |
| RISK-PE-04 | Stale upstream artifact trusted | artifact weeks old, runtime changed since | Medium | Medium | Medium | false PASS on gates 1-6 | stale-revalidation checklist | re-run generator scripts | regenerate artifact | re-run `cf:*` script | operator | low | mitigated |
| RISK-PE-05 | Out-of-bounds provider mutation | agent/operator mutates Supabase/Resend/Vercel | Low | High | High | provider boundary | DEC-PE-02 no-mutation; `08_…` §8.5 | boundary enforcement | procedure is read-only | n/a | lead | none | mitigated |
| RISK-PE-06 | Operator-record concurrent edit (lost update) | two agents edit JSON simultaneously | Medium | Low | Low | record integrity | LOOP_LEDGER lease | file-ownership lease | first-writer-wins | restore from git | operator | low | mitigated |
| RISK-PE-07 | Generator scan-path drift (`src/proxy.ts` vs `src/middleware.ts`) | scan paths edited, scan misses runtime middleware | Low | Medium | Medium | source-scan accuracy | `03_…` §3.7 gap note | review scan paths on each run | align scan paths | fix generator scan list | lead | low (blockers=0 regardless) | recorded |
| RISK-PE-08 | Orphaned `node_modules/@supabase/*` dirs | fresh eyes mistakes them for runtime coupling | Low | Low | Low | none (not imported) | `rg -i supabase src/`=0 | `03_…` §3.5 evidence | document | `bun install` clears | — | none | recorded |
| RISK-PE-09 | Persona/mailbox proof captures sensitive material | operator records cookies/private email content | Low | High | High | privacy | SEC-PE-02 booleans required | required flags enforce | use deferral if risky | edit record, purge | operator | low (booleans enforce) | mitigated |
| RISK-PE-10 | Closure claimed before smoke run | agent skips Phase 2 | Low | Medium | Medium | closure honesty | REL-PE-01 sequencing | Phase order | gate 10 enforces | re-run smoke | operator | none | mitigated |
| RISK-PE-11 | Independent review not obtained | pack merged without independent verifier | Medium | Medium | Medium | readiness claim | OPEN-PE-05 | recommend independent review | emulated cap applies | owner accepts | Philip | moderate (caps status) | open |
| RISK-PE-12 | Downstream "launch ready" claim before closure | launch pack cites provider-exit as done while OPEN | Medium | High | High | launch honesty | `17_…` external-proof list | cross-ref launch pack | block launch claim | re-open launch gate | lead | low | mitigated |

No unmitigated critical (High-severity-uncontrolled) risk remains. RISK-PE-11
is intentionally open (it caps status at CONDITIONALLY READY, which is the
honest posture).

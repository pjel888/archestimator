# 12 — Test and Validation Strategy

## 12.1 Testing philosophy

The closure verifier is the provider-exit pack generator itself:
`bun run cf:provider-exit-pack` → `providerExitReady=true`. There is no new
code to unit-test. Validation is therefore:

1. **Pack regeneration** proves all 12 gates pass (the derived closure signal).
2. **Existing generator tests** must stay green (no generator change).
3. **Smoke commands** (read-only) prove the Cloudflare runtime is healthy.
4. **Static review** of the operator record confirms sanitization.

## 12.2 Test execution matrix

| Requirement | Test file path | Test type | Existing/new | Fixture/data setup | Command | Expected evidence | Known pre-existing reds | Owner |
|---|---|---|---|---|---|---|---|---|
| TEST-PE-01 (closure verifier) | n/a (CLI) | CLI/regeneration | existing | filled operator record | `bun run cf:provider-exit-pack` | JSON `providerExitReady===true`, md status PASS, `blockerCount=0` | none | operator |
| TEST-PE-02 (generator unchanged) | `tests/vitest/provider-exit-pack-script.test.ts` | unit (vitest) | existing | none | `bun run test:dom --run tests/vitest/provider-exit-pack-script.test.ts` (or `bunx vitest run …`) | all tests green | none known | — |
| FR-PE-03 (smoke) | n/a (CLI) | CLI/read-only probe | existing (scripts exist) | wrangler authed | `13_…` §13.3 commands | each exit 0 + ready=true | none | operator |
| SEC-PE-01 (sanitization) | n/a (static review) | static | new (review) | filled operator record | manual review of JSON fields | no secret/token/cookie/private-path values present | none | operator |
| ARCH-PE-01 (evidence classes) | n/a (doc review) | static | new (review) | this pack | review `03_…` §3.7 Class column | every gate classified | none | — |

Note on test runner: the repo uses **two** test layers — `bun test tests/unit`
(`test` script) and `vitest run` (`test:dom` script). The generator test is a
**vitest** file (`tests/vitest/…`), so it runs under `test:dom` (or direct
`bunx vitest run`). This matches the P0 guard pattern documented in sibling
pack `2026-07-07-cloudflare-worker-production-observability-and-budgets`.

## 12.3 Adversarial scenario matrix (closure procedure)

| ID | User/attacker model | Scenario | Setup | Command/harness | Expected signal | Actual result | Status | Evidence | Cleanup |
|---|---|---|---|---|---|---|---|---|---|
| AQ-1 | careless agent | secret value pasted into operator record `evidenceSource` | operator record with a raw token | `cf:provider-exit-pack` + manual review | detection: review must catch it; generator does not echo values but does not block secrets either | — | mitigated by SEC-PE-01 review gate | `08_…` §8.3 | edit record to remove |
| AQ-2 | careless agent | local evidence claimed as hosted/provider proof | pack md edited to say "provider proven" while `providerExitReady=false` | review of pack md vs JSON | JSON `providerExitReady` is the only truth; md status must match JSON | — | mitigated by TEST-PE-01 (JSON is source) | `03_…` §3.7 | — |
| AQ-3 | owner under time pressure | `accepted-loss` chosen without sole-runtime proof | operator record §1 decision=accepted-loss, evidenceSource empty | `cf:provider-exit-pack` → generator may still flag missing field | DEC-PE-03 rule requires sole-runtime proof citation; review must enforce | — | mitigated by DEC-PE-03 + `17_…` audit | `07_…` §7.4 | — |
| AQ-4 | two concurrent agents | both edit operator record JSON | two agents, same file | git diff check | LOOP_LEDGER lease + first-writer-wins; second agent must re-read | — | mitigated by LOOP_LEDGER §"File-ownership lease" | `LOOP_LEDGER.md` | restore if needed |
| AQ-5 | stale artifact | upstream JSON artifact no longer reflects reality | artifact from weeks ago | `cf:provider-exit-pack` | gate may falsely PASS; re-run generator scripts first | — | mitigated by stale-revalidation checklist (README) + RISK-PE-04 | README checklist | regenerate artifact |
| AQ-6 | smoke partial failure | one smoke command fails, others pass | mixed smoke results | smoke commands | `cloudflareSmokePassed=false`; closure not claimed | — | mitigated by REL-PE-01 (all must pass) | `13_…` §13.3 | diagnose + re-run |
| AQ-7 | generator scan-path drift | `src/proxy.ts` vs `src/middleware.ts` mismatch (§3.7) | generator scan paths edited | review scan paths | source scan may miss/over-scan; re-validate scan paths match runtime middleware | — | recorded as generator gap; not closure-blocking | `03_…` §3.7 | align scan paths if needed |
| AQ-8 | orphaned node_modules | `node_modules/@supabase/*` mistaken for runtime coupling | fresh eyes sees supabase dir | `rg -i supabase src/` | 0 hits in src confirms not coupled | — | mitigated by `03_…` §3.5 evidence | `14_…` RISK-PE-08 | `bun install` clears |

## 12.4 Validation gates (closure)

| Gate | Command | Pass signal | Run when |
|---|---|---|---|
| G1 source-scan clean | (implicit in `cf:provider-exit-pack`) | `activeLegacyProviderRuntimeBlockers=0` | Phase 5 |
| G2 operator record complete | `cf:provider-exit-pack` diagnostics | no missing-field rows | Phase 5 |
| G3 closure signal | `cf:provider-exit-pack` | `providerExitReady=true`, `blockerCount=0` | Phase 5 |
| G4 generator tests green | `test:dom` on the generator test file | all pass | (no generator change → n/a) |
| G5 sanitization review | manual JSON review | no secret/private values | Phase 5 |

## 12.5 Skipped validations + residual risk

| Skipped | Why | Residual risk | Substitute |
|---|---|---|---|
| Browser/DOM QA | closure is CLI+JSON, no UI | none | static review |
| Performance evaluator | no runtime change | none | n/a |
| Hosted provider mutation proof | out of scope (no mutation) | legacy provider state unverified beyond attestation | operator attestation (honest) |
| Independent native verifier | unavailable in-session | readiness capped at 97 / CONDITIONALLY READY | emulated passes; OPEN-PE-05 recommends independent review |

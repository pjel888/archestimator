# 12 — Test and Validation Strategy

> **Docs-only planning task.** Dynamic adversarial QA is *not applicable to the
> planning task itself* (this pack produces only markdown). The matrices below
> specify the validation required for **future implementation** (the artifact
> content + bundle closure), which is where adversarial edge cases matter.

## Test execution matrix (requirement → command → evidence)

| Requirement | Test file path / script | Test type | Existing/new | Fixture/data setup | Command | Expected evidence | Known pre-existing reds | Owner |
|---|---|---|---|---|---|---|---|---|
| PROOF-REQ-001 | `scripts/check-upload-production-proof-evidence.ts` (readback validator) + readback producer | bundle gate (local) | existing | deployment state | `UPLOAD_PRODUCTION_PROOF_EVIDENCE_DIR=… bun run scripts/check-upload-production-proof-evidence.ts` | `requirements[deploymentReadback].status="passed"` | none | executor |
| PROOF-REQ-002 | `scripts/verify-hosted-upload-operations.ts` | hosted dry-run | existing | cleanup+scan secrets | see `11` P1-2 | `authenticatedDryRunKinds=[cleanup,scan]` | none | executor |
| PROOF-REQ-003 | `scripts/verify-hosted-upload-runtime.ts` | hosted dry-run | existing | runtime secret | see `11` P1-3 | body+concurrency probes, limit facts | none | executor |
| PROOF-REQ-004 | `scripts/prove-upload-clamd-live.ts` | live service | existing | clamd service + opt-in | see `11` P2-1 | `clean→clean, eicar→infected` | skipped if no clamd (expected) | executor |
| PROOF-REQ-005 | `scripts/verify-upload-alert-delivery.ts` | hosted webhook | existing | webhook+token+opt-in | see `11` P2-2 | `delivered=true, 2xx, redacted` | skipped if no webhook (expected) | executor |
| PROOF-REQ-006 | `scripts/verify-upload-production-observations.ts` | operator observation | existing | sanitized JSON input | see `11` P2-3 | `dashboard.*` all true, pathSafe | skipped if no input (expected) | operator |
| PROOF-REQ-007 | `scripts/verify-upload-production-observations.ts` | operator observation | existing | sanitized JSON input | see `11` P2-4 | `exercise.rejectionStatus=429` | skipped if not exercised (expected) | operator |
| PROOF-REQ-008 | `scripts/verify-upload-production-observations.ts` | operator observation | existing | sanitized JSON input | see `11` P2-5 | `runbook.*` all true, noRawStoragePaths | skipped if not exercised (expected) | operator |
| OPS-REQ-001/002/003 | Phase 0 commands | operator convention | new (this pack) | real evidence dir | see `11` Phase 0 | bundle gate finds 8 candidates | dir drift is the red being fixed | lead |
| OPS-REQ-004 | `scripts/check-cloudflare-release-gates.ts` | release gate | existing | bundle verdict | `bun run cf:release-gates` | upload dimension clear | fail-closed if bundle not green | lead |

## Repository-native commands used

- `bun run scripts/check-upload-production-proof-evidence.ts` (direct; not aliased — H2)
- `bun run scripts/verify-upload-production-observations.ts` (direct; not aliased — H2)
- `bun run scripts/prove-upload-clamd-live.ts` (direct; not aliased)
- `bun run scripts/verify-upload-alert-delivery.ts` (direct; not aliased)
- `bun run cf:verify-hosted-upload-operations`
- `bun run cf:verify-hosted-upload-runtime`
- `bun run cf:verify-hosted-upload-lifecycle` (adjacent)
- `bun run cf:verify-hosted-upload-ui` (adjacent)
- `bun run cf:release-gates`

No `bun run validate`/`build` is required by this pack (no code change). The
verification is the producer runs + the bundle gate.

## Adversarial scenario matrix (for the artifacts, not the planning task)

| ID | User/attacker model | Scenario | Setup | Command/harness | Expected signal | Actual result | Status | Evidence | Cleanup |
|---|---|---|---|---|---|---|---|---|---|
| AQ-1 | malicious executor | point hosted producer at staging origin | set `*_BASE_URL` to non-prod | producer + bundle | bundle `baseUrl` check fails for ops/runtime | (post-exec) | planned | artifact `baseUrl` field | unset env |
| AQ-2 | careless operator | record a real R2 path in observation JSON | put `component-attachments/x` in input | observations producer | `pathSafe=false`, bundle fails dashboard/backpressure/retention | (post-exec) | planned | artifact `pathSafe` field | re-author input |
| AQ-3 | careless operator | record a URL in observation JSON | put `https://...` in input | observations producer | sanitizer rejects, `pathSafe=false` | (post-exec) | planned | artifact field | re-author input |
| AQ-4 | attacker with secret | leak webhook token into alert artifact | (producer bug) | alert producer | `secretRedacted=false`, bundle fails | (post-exec) | planned | artifact `secretRedacted` | fix producer (DEC) |
| AQ-5 | stale evidence | reuse old readback after new deploy | don't re-run P1-1 | bundle | `deploymentGap.productionDeploymentRequired` may be stale → re-run | (post-exec) | planned | readback artifact | re-run readback |
| AQ-6 | wrong scanner provider | `UPLOAD_SCAN_PROVIDER!=clamd` | set wrong env | clamd producer | `proofBoundary="live-clamd-proof-refused"` | (post-exec) | planned | artifact boundary | fix env |
| AQ-7 | over-driven backpressure | executor sends 1000 reqs | flood a route | (manual) | 429 expected; route stays up | (post-exec) | planned | observation JSON | stop at threshold |
| AQ-8 | concurrent producer writes | two lanes write same artifact | run P2-3 twice | file write | last-write-wins; no corruption (small JSON) | (post-exec) | planned | artifact mtime | serialize tracks C |

## Performance evaluator

Declared in `09` (producer + bundle wall-time). The evaluator is the timed
`bun run scripts/check-upload-production-proof-evidence.ts` run; regression
threshold >5s.

## What a requirement is *not* ready with

A requirement is not ready if its validation method is only "manual QA" without
exact steps. This pack avoids that: every Phase 2 task names the operator action,
the observation schema, the producer command, and the passing field set.

## Validation gaps to flag honestly

- **Hosted/live proof not collected in this planning session.** This is the
  fundamental gap: 5/8 gates need real hosted action. It is why the pack is
  `CONDITIONALLY READY`, not `IMPLEMENTATION-READY`.
- **ClamD service availability (`ASSUMP-004`) and webhook availability
  (`ASSUMP-005`) are unvalidated.** If either is absent, the corresponding gate
  stays fail-closed and the bundle cannot close. This is an honest blocker, not
  a defect.
- **`emulated` verification.** No independent native verifier was available;
  readiness is capped at 97 and status at `CONDITIONALLY READY` until a reviewer
  or owner signs off (`17`).

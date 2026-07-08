# 12 — Test and Validation Strategy

## Approach

Choose the lightest proof that proves the claim (repo verification policy). For upload/R2/Images
work: vitest (unit/provider/route) for streaming/metadata/list/multipart/scanner; DOM tests for
any upload-UI interaction change; hosted proof scripts for runtime body/memory/cap/lifecycle;
provider proof for R2/Images binding reality. Browser proof only for new interactive states
(multipart progress, scan-blocked UI).

## Test Execution Matrix

| Requirement | Test file path | Test type | Existing/new | Fixture/data setup | Command | Expected evidence | Known pre-existing reds | Owner |
|---|---|---|---|---|---|---|---|---|
| FR-01 (stream) | `tests/vitest/cloudflare-r2-storage-provider.test.ts` (extend) | unit/provider | extend | mock R2 bucket | `bunx vitest run tests/vitest/cloudflare-r2-storage-provider.test.ts --maxWorkers=1` | stream put writes object; no whole-body buffer | none | G-P2 |
| FR-01 (stream routes) | `tests/vitest/<route>-upload-stream.test.ts` (new per route) | route/integration | new | fixture file 1/4/8 MiB | `bunx vitest run tests/vitest/projects-images-route.test.ts … --maxWorkers=1` | routes stream; 8 MiB→413 | none | G-P3 |
| FR-01 (deny buffer) | `tests/vitest/upload-streaming-deny-buffer.test.ts` (new) | static/behavior | new | n/a | `bunx vitest run tests/vitest/upload-streaming-deny-buffer.test.ts --maxWorkers=1` | no `arrayBuffer()` on request body in streaming paths | none | G-P3 |
| FR-02 (env cap) | `tests/vitest/upload-env-cap.test.ts` (new) | unit/integration | new | env override | `bunx vitest run tests/vitest/upload-env-cap.test.ts --maxWorkers=1` | changing env changes enforced cap | none | G-P3 |
| FR-03 (multipart) | `tests/vitest/upload-multipart.test.ts` (new, DEC-03) | integration | new | mock R2 multipart | `bunx vitest run tests/vitest/upload-multipart.test.ts --maxWorkers=1` | create/uploadPart/complete; abort; resume | none | G-P6 |
| FR-04 (customMetadata) | `tests/vitest/cloudflare-r2-storage-provider.test.ts` (extend) | provider | extend | mock R2 | as above | customMetadata present on written object | none | G-P2 |
| FR-05 (list reconcile) | `tests/vitest/upload-cleanup-job.test.ts` (extend) | unit | extend | D1 fixture + mock R2 list | `bunx vitest run tests/vitest/upload-cleanup-job.test.ts --maxWorkers=1` | orphan R2 flagged dry-run; delete on enable | none | G-P4 |
| FR-06 (retention R2) | `tests/vitest/cloudflare-scheduled-upload-jobs.test.ts` (extend) | unit | extend | D1 fixture + mock provider | `bunx vitest run tests/vitest/cloudflare-scheduled-upload-jobs.test.ts --maxWorkers=1` | 30 3 deletes R2 + records event | none | G-P4 |
| FR-07 (scanner posture) | `tests/vitest/uploads-policy-scanner-eicar.test.ts`, `upload-attachment-scan-freeze.test.ts` (existing) | unit | existing | EICAR fixture | `bunx vitest run tests/vitest/uploads-policy-scanner-eicar.test.ts tests/vitest/upload-attachment-scan-freeze.test.ts --maxWorkers=1` | floor detects EICAR; freeze blocks download | none | G-P5 |
| FR-08 (Images) | `tests/vitest/server-image-processing.test.ts` (extend/new) | unit/provider | extend | fixture image ≤/>20 MiB | `bunx vitest run tests/vitest/server-image-processing.test.ts --maxWorkers=1` | binding output streamed; >20 MiB rejected | none | G-P7 |
| ARCH-01 (boundary) | static review (grep `"use client"` in upload server code) | static | new | n/a | `rg -n "\"use client\"" src/app/api/**/route.ts src/lib/uploads/` | no matches | none | G-P3 |
| ARCH-02 (single port) | `tests/vitest/upload-provider-portability.test.ts` (existing) | unit | existing | n/a | `bunx vitest run tests/vitest/upload-provider-portability.test.ts --maxWorkers=1` | single interface; R2 implements | none | G-P1 |
| SEC-01 (authz denial) | `tests/vitest/<route>-authz.test.ts` (extend) | unit/integration | extend | cross-workspace fixture | per route | cross-workspace upload 403; session hijack 403 | none | G-P3 |
| SEC-02 (scan gate) | `upload-attachment-scan-freeze.test.ts` (existing) | unit | existing | pending asset | as above | 409 until clean | none | G-P3 |
| SEC-03 (path safety) | `cloudflare-r2-storage-provider.test.ts` (existing unsafe-identifier) | unit | existing | unsafe paths | as above | unsafe rejected | none | G-P2 |
| API-01 (error DTOs) | `tests/vitest/<route>-errors.test.ts` (extend) | route | extend | oversize/bad-type | per route | stable codes 413/415/409/503 | none | G-P3 |
| PERF-01 (memory) | `upload-streaming-deny-buffer.test.ts` + hosted `verify-hosted-upload-runtime.ts` (extend) | unit + hosted | new/extend | 1/4/8 MiB | vitest + `cf:verify-hosted-upload-runtime` | peak ≤ env cap | none | G-P8 |
| PERF-02 (latency) | `scripts/verify-cloudflare-hosted-performance.ts` (existing) | hosted | existing | hosted env | `cf:verify-hosted-performance` | R2 put P95 ≤ 250 ms | hosted-only | G-P8 |
| REL-01 (idempotency) | `tests/vitest/upload-signed-route.test.ts` (extend), `cloudflare-upload-job-queue.test.ts` (existing) | unit | extend | duplicate finalize | as above | duplicate finalize → same asset; DLQ on poison | none | G-P4 |

## Adversarial scenario matrix (ultraqa-style)

| ID | User/attacker model | Scenario | Setup | Command/harness | Expected signal | Status | Evidence | Cleanup |
|---|---|---|---|---|---|---|---|---|
| AQ-01 | Anonymous | POST upload no auth | curl no cookie | route test | 401/403 | planned | TEST-SEC-01 | none |
| AQ-02 | Workspace A member | Upload to workspace B project | cross-ws fixture | route test | 403 | planned | TEST-SEC-01 | none |
| AQ-03 | Attacker | Oversize body (8 MiB) | 8 MiB fixture | route test | 413 pre-buffer | planned | TEST-FR-02 | none |
| AQ-04 | Attacker | Content-type spoof (declared png, bytes exe) | crafted file | route test | 415 magic-byte | planned | TEST-SEC-02 | none |
| AQ-05 | Attacker | Path-traversal fileName (`../../etc/x`) | crafted name | provider test | rejected | planned | TEST-SEC-03 | none |
| AQ-06 | Attacker | 5 concurrent 64 MiB direct PUTs | concurrency harness | route test | no OOM after FR-01; 429/503 admission | planned | TEST-PERF-01 | none |
| AQ-07 | Attacker | EICAR attachment | EICAR fixture | scan test | infected/blocked | existing | TEST-FR-07 | none |
| AQ-08 | Attacker | Direct-upload session hijack (guess id) | other-user session | route test | 403 | planned | TEST-SEC-01 | none |
| AQ-09 | User | Client abort mid-multipart | abort after part 2 | multipart test | abort cleans parts | planned (DEC-03) | TEST-FR-03 | R2 mock |
| AQ-10 | User | Duplicate finalize | re-POST finalize | route test | same asset, no dup R2 | planned | TEST-REL-01 | none |
| AQ-11 | System | Scan job clamd unreachable | mock clamd down | scan test | failed_transient + DLQ | existing | TEST-REL-01 | none |
| AQ-12 | System | R2 put fail mid-stream | mock R2 error | provider test | 503; atomic (no partial obj) | planned | TEST-FR-01 | none |
| AQ-13 | System | D1/R2 drift (row purged, obj remains) | fixture drift | cleanup test | reconcile flags/deletes | planned | TEST-FR-05 | none |
| AQ-14 | Attacker | Image >20 MiB to Images binding | 21 MiB image | processing test | 413 before binding | planned (DEC-07) | TEST-FR-08 | none |
| AQ-15 | System | Images transform quota near 5,000 | mock counter | processing test | alert fires | planned (DEC-07) | TEST-FR-08 | none |

## Hosted proof gaps (honest)

- **Memory-pressure hosted proof:** no existing script drives isolate to eviction. T-21 extends the
  body-probe to report peak memory; a true N-concurrent-eviction proof is a recommended post-impl
  gate, recorded in `17`.
- **Workers CPU/ms:** no local equivalent; relies on Workers Observability (free) post-deploy.
- **R2 latency P95:** hosted perf script / Workers Observability, not local.
- **Multipart hosted proof:** only after DEC-03; extend `verify-cloudflare-hosted-upload-lifecycle-proof`.
- **Images hosted proof:** `cf:provider-proof` Images path covers the binding; hosted end-to-end
  image upload parity is post-DEC-07.

## Commands (verified against `package.json`)

- `bun run type-check` (tsc --noEmit)
- `bun run lint` (eslint)
- `bun run test:dom` (vitest, maxWorkers=1) — upload tests live here
- `bunx vitest run <path> --maxWorkers=1` — focused
- `cf:verify-hosted-upload-runtime`, `cf:verify-hosted-upload-operations`,
  `cf:verify-hosted-upload-lifecycle`, `cf:verify-hosted-upload-ui` — hosted
- `cf:provider-proof` — R2 + Images binding
- `cf:verify-hosted-performance` — hosted perf
- `bun run cf:typegen` — if Worker Env types change
- Targeted Playwright only for new interactive upload-UI states (multipart progress, scan-blocked)

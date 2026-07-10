# 20 - Performance Evaluator Spec

This is the strict evaluator contract for canonical `UNIT-001` through `UNIT-011`. `IMPLEMENTATION_PLAN.md` owns the final paths, budgets, and dependencies.

## Schema And Commands

Schema ID: `estimate-sheet-performance-report.v1`.

Exact planned implementation:

- `evidence/source-fingerprint-v1.mjs` (planning-time reference implementation; `UNIT-001` ports it into the typed runtime tool below)
- `tests/fixtures/estimate-sheet-performance.ts`
- `scripts/lib/estimate-sheet-performance-contract.ts`
- `scripts/lib/estimate-sheet-performance-test-receipt.ts`
- `scripts/lib/estimate-sheet-vitest-reporter.ts`
- `scripts/compute-estimate-sheet-source-fingerprint.ts`
- `scripts/prepare-estimate-sheet-performance-run.ts`
- `scripts/validate-estimate-sheet-performance-run.ts`
- `scripts/cleanup-estimate-sheet-performance-run.ts`
- `scripts/run-estimate-sheet-performance-gate.ts`
- `scripts/measure-estimate-sheet-performance.ts`
- `scripts/measure-estimate-sheet-d1.ts`
- `scripts/start-estimate-sheet-benchmark-server.ts`
- `scripts/run-estimate-sheet-mode-proof.ts`
- `scripts/update-estimate-sheet-performance-evidence-index.ts`
- `scripts/verify-estimate-sheet-hosted-d1-performance-proof.ts`
- `scripts/write-estimate-sheet-release-evaluation.ts`
- `scripts/write-estimate-sheet-bottleneck-decision.ts`
- `playwright.estimate-performance.config.ts`
- `e2e/estimate-sheet-performance.spec.ts`
- `e2e/estimate-sheet-component-interop.spec.ts`
- `e2e/helpers/estimate-sheet-performance.ts`
- `e2e/helpers/estimate-sheet-performance-reporter.ts`
- `tests/vitest/estimate-sheet-performance-contract.test.ts`
- `tests/vitest/estimate-sheet-performance-fixtures.test.ts`
- `tests/vitest/estimate-sheet-source-fingerprint.test.ts`
- `tests/vitest/estimate-performance-run-lifecycle.test.ts`
- `tests/vitest/estimate-performance-modes.test.ts`
- `tests/vitest/estimate-performance-evidence-index.test.ts`
- `tests/vitest/estimate-sheet-d1-performance.test.ts`
- `tests/vitest/estimate-sheet-bottleneck-decision.test.ts`
- `tests/vitest/estimate-sheet-hosted-d1-performance-proof-script.test.ts`
- `tests/vitest/estimate-sheet-release-evaluation.test.ts`

`UNIT-001` creates and tests this entire shared evaluator producer surface plus every package command below before the first measurement. Later units execute it and never alter these files or package entries. An activated `UNIT-005` through `UNIT-009` may add only product regression tests explicitly owned by its packet; that broad producer-fingerprint delta is recorded in the predecessor lineage. A shared tool defect reopens `UNIT-001` and invalidates the affected baseline chain.

Exact planned package scripts:

```json
{
  "perf:estimate:fingerprint": "bun run scripts/compute-estimate-sheet-source-fingerprint.ts",
  "perf:estimate:prepare": "bun run scripts/prepare-estimate-sheet-performance-run.ts",
  "perf:estimate:validate-run": "bun run scripts/validate-estimate-sheet-performance-run.ts",
  "perf:estimate:cleanup": "bun run scripts/cleanup-estimate-sheet-performance-run.ts",
  "perf:estimate:gate": "bun run scripts/run-estimate-sheet-performance-gate.ts",
  "perf:estimate:measure": "bun run scripts/measure-estimate-sheet-performance.ts",
  "perf:estimate:d1": "bun run scripts/measure-estimate-sheet-d1.ts",
  "perf:estimate:d1:hosted": "bun run scripts/verify-estimate-sheet-hosted-d1-performance-proof.ts",
  "perf:estimate:server": "bun run scripts/start-estimate-sheet-benchmark-server.ts",
  "perf:estimate:modes": "bun run scripts/run-estimate-sheet-mode-proof.ts",
  "perf:estimate:check": "bun run scripts/measure-estimate-sheet-performance.ts --check",
  "perf:estimate:decide": "bun run scripts/write-estimate-sheet-bottleneck-decision.ts",
  "perf:estimate:index": "bun run scripts/update-estimate-sheet-performance-evidence-index.ts",
  "perf:estimate:release": "bun run scripts/write-estimate-sheet-release-evaluation.ts"
}
```

## Fixture Contract

| Profile | Rows | Purpose |
|---|---:|---|
| `small` | 50 | Fast functional characterization |
| `medium` | 500 | Preserve current performance-suite coverage |
| `large` | 1,000 | Intermediate regression |
| `stress` | 2,500 | Long interaction and fan-out behavior |
| `limit` | 5,000 | Supported row ceiling with up to 1,500 nodes |
| `over-limit` | 5,001 | Truncation/fail-safe behavior |
| `realistic-skew` | 5,000 | Deep/shallow mixed branches, uneven row kinds, long-tail attachments, mixed component identities |

Every fixture uses `estimate-sheet-performance-fixture.v1` and records trace IDs, seed/profile, node/row/depth/branch/component-match/revision distributions, expected totals, application/producer fingerprints, generator/tool hashes, generatedAt, run UUID, and linkage. The generator is deterministic and contains no customer data. For the UNIT-001 pair, canonical JSON recursively byte-sorts object keys and omits `linkage`; the producer computes each payload SHA-256, then `SHA256("estimate-sheet-unit001-bundle.v1\\0" + fixturePayloadSha256 + "\\0" + reportPayloadSha256)`. Each final file stores the counterpart payload digest and shared bundle digest, while the evidence index stores final-file hashes. This is constructible reciprocal payload linkage, not impossible mutual whole-file hashing.

## Environment And Provenance

Measurement artifacts use the complete-report union `estimate-sheet-performance-report.v1`, discriminated by `evidenceClass`. Every member requires durable trace IDs, Git HEAD, `estimate-sheet-application-fingerprint.v1`, `estimate-sheet-producer-fingerprint.v1`, measured fixture/build/auth/tool hashes, timestamp, run UUID, warmup/sample method, retry/failure counts, and overall `PASS|FAIL`. Metric-level `SKIPPED` is allowed only for a nonessential metric with reason/residual risk; a missing hard metric fails the report. Interrupted/incomplete collection writes `estimate-sheet-performance-attempt.v1` only in the immutable run directory and can never be projected or indexed. Every durable ID resolves reciprocally in `plan-pack.json` and doc 16.

`overall` is the measured budget outcome, not the evidence-lifecycle status. Complete `UNIT-001` through `UNIT-003` baseline reports may and normally will be overall `FAIL`; their failed hard metrics are required inputs to `UNIT-004`. A baseline checker runs only with `--budget-policy=record-only`: it exits zero when collection, schema, provenance, dependency, and required functional/auth/accessibility integrity pass while preserving the report's measured `overall`. Plan-pack/index status `VERIFIED` means that complete current evidence was durably validated and indexed; it never rewrites `overall` and does not mean the baseline budgets passed. `--budget-policy=enforce` is the default and is mandatory for optimization, integration, unit-proof, and release checks; it rejects any required child report whose `overall` is `FAIL`. The index accepts `record-only` only for the declared `UNIT-001` through `UNIT-003` baseline projections.

| `evidenceClass` | Required variant fields | Forbidden variant fields |
|---|---|---|
| `jsdom` | `buildMode="not-applicable"`, `buildHash=null`; Bun/Node/jsdom versions; fixture distribution; raw render/derivation/fan-out/graph samples; ownership census; min/median/p75/p95/max | browser/device/throttle/cache, server/base URL, auth session/cookie, deployment-mode snapshots, D1/provider/query fields, cleanup receipt |
| `local-browser` | `buildMode="opennext-preview"`, nonempty OpenNext `buildHash`; UUID lease; server command/base URL/readiness/starting PID; redacted auth-fixture metadata; browser/OS/viewport/DPR/CPU/network/cache; the server-resolved five-key mode snapshot used by the run; route/interaction/render/bundle/RSC/heap samples | server exit/signal/closed-port fields, cleanup receipt, raw secrets/IDs, Wrangler credentials, top-level D1 statement/query-plan records |
| `local-d1` | `buildMode="not-applicable"`, `buildHash=null`; UUID persistence root; generated schema/migration/seed/authz hashes; D1 version; statement/query/bind/rows/duration/plan/index records | browser/device/throttle/cache, preview server/base URL, auth cookie, mode snapshots, route/UI/Event-Timing fields |
| `hosted-d1` | `buildMode="not-applicable"`, `buildHash=null`; UUID lease; exact binding/database preflight; Wrangler/D1 versions; free-tier projection; statement/query/bind/rows/duration/plan/index records; durable hosted cleanup receipt | browser/device/throttle/cache, app server/base URL/session cookie, mode snapshots, route/UI/Event-Timing fields |

An irrelevant field is absent, not `null`, `"not-applicable"`, or an empty placeholder; only the three declared non-build variants use `buildHash=null`. Unknown, missing, duplicate, multiply owned, cross-class, and hybrid fields fail validation. Local reports finalize before cleanup. Every prepared run declares `cleanupRequirement=REQUIRED|NOT_APPLICABLE`. `NOT_APPLICABLE` is permitted only for the explicitly declared artifact-only `UNIT-001`, `UNIT-004`, and decision-backed supersession runs; prepare must record empty preview-process, port, D1 namespace, credential, raw-ID, mutable-fixture, and cleanup-resource declarations plus an empty mutation journal. `perf:estimate:index -- --cleanup-not-applicable` reopens that manifest and authorizes the transition only while every resource/mutation field is still empty. It is a validated state, never a general cleanup bypass. All other runs declare `REQUIRED`. Their separate fsynced `estimate-sheet-cleanup-receipt.v1` uses `cleanupClass=local-preview|local-d1|hosted-d1`: only `local-preview` admits and requires the leased port plus a complete ordered `previewProcesses` array with role/phase/ordinal/PID/snapshot/readiness, exclusive exit-code/signal outcome, and `closedPort=true` for every launched preview; the other two forbid process/port fields. Local variants carry seeded/deleted/remaining counts by fixture role and table, while `hosted-d1` requires exact eleven-table counts plus binding/database proof. A required-cleanup run reaches `VERIFIED` only with uninterrupted `CLEANUP_VERIFIED` and `invalidatedProducer=false`. A successful hosted report embeds that receipt; interrupted `--cleanup-only --run-id=<uuid>` writes only `estimate-sheet-hosted-cleanup-recovery.v1` under the ignored UUID root.

When `ESTIMATE_PERF_TEST_OUTPUT_ROLE` is set, the UNIT-001-installed conditional Vitest or Playwright reporter writes one no-overwrite `estimate-sheet-test-receipt.v1` into the prepared run. It records test class, exact normalized argv and file list, unit/run IDs, equal pre/post application and producer fingerprints, applicable fixture/build hash, worker/retry settings, pass/fail/skip counts, duration, overall `PASS|FAIL`, and redacted failure identifiers. When `ESTIMATE_PERF_FIXTURE_ROLE` is set, it also requires `fixtureMutation:{fixtureRole,namespaceIdSha256,preStateSha256,postStateSha256,declaredMutationSha256,commandId}`; the block is forbidden otherwise. It forbids raw stdout, secrets, credential-bearing URLs, and arbitrary stack/request data. An incomplete runner writes only a non-indexable attempt; checker/envelope/index consumers accept only a same-run `PASS` receipt whose role matches its `--tests=auto:<role>` input and whose fixture block matches the prepared checkpoint, mutation journal, and non-reused namespace.

`perf:estimate:gate` wraps required non-test exit-status gates and writes no-overwrite `estimate-sheet-command-receipt.v1`: role, normalized argv, unit/run IDs, equal pre/post application and producer fingerprints, timestamps/duration, exclusive exit-code/signal, `PASS|FAIL`, redacted-output hash, bounded redacted diagnostic counts, and relevant build/artifact hash. Only declared non-secret path environment keys are accepted. Interrupted commands write attempts; any source/producer mutation, stale/failed/duplicate/wrong command, wrong build, cross-run, or cross-fingerprint gate receipt fails.

`perf:estimate:modes -- --output=auto:mode-proof` writes `estimate-sheet-mode-proof.v1`, containing the same unit/run and fingerprint pair plus applicable fixture/build/auth hashes, the target or matrix, requested and server-returned versioned snapshots for every requested phase, parity/side-effect counters, scope-required measurements, durable outcomes for every stopped intermediate preview, one verified active final-preview descriptor, and overall `PASS|FAIL`. After rollback/all-off proof, `--final-state=on|all-activated` starts the only live preview used by later browser/check work. It is a child envelope and cannot satisfy a complete local-browser budget by itself.

`UNIT-005` and `UNIT-010` use `estimate-sheet-performance-integration.v1` with one identical application digest plus one identical broad producer digest across every child. `integrationScope=route-d1` requires a complete route-scoped mode proof and complete local-D1 report. `integrationScope=full-local` requires a complete mode-matrix proof, complete local-browser report, and complete local-D1 report. `UNIT-006` through `UNIT-009` use `estimate-sheet-performance-unit-proof.v1`, discriminated by `proofScope=graph|derived-state|render-a11y|mutations`, with required mode/test/command children and scope-specific fields; `render-a11y` additionally requires a complete local-browser child, while `mutations` requires a fixture-bound browser test receipt whose `fixtureMutation` block revalidates against the prepared browser namespace. Every child reference is `{role,schemaId,immutablePath,sha256}` and is independently reopened, hashed, schema/input validated, and required to share the same run/fingerprint pair and overall `PASS`.

Prepare allocates distinct `mode`, `browser`, and/or `d1` fixture namespaces from one canonical logical checkpoint. Each mutating command selects one role and records namespace-ID hash, common `preStateSha256`, observed post-state, declared mutation digest, and command ID. Co-produced artifacts may share a command/namespace; sequential mutating commands may not. Envelopes reject dirty/missing checkpoints, undeclared mutations, namespace reuse, or unequal logical pre-state, and cleanup reconciles every role/table ID set. The evidence index recursively revalidates all primary and dependency bytes after cleanup and stores ordered `dependencySources[]` path/hash records in registry history. Decision, supersession, release, and index files use their own `.v1` schemas. Negative tests also delete/mutate a child between check/index, omit a process outcome, substitute a gate role, and mutate without an isolated checkpoint.

`estimate-sheet-release-evaluation.v1` is deterministic UTF-8/LF Markdown, not JSON stored under a Markdown extension. Its exact bytes are `<!-- estimate-sheet-release-evaluation.v1 sha256=<payload-sha256> -->\n\n`, one fenced `json` block containing the single-line canonical JSON payload and a terminal newline, then a deterministic human-readable rendering with fixed headings, field order, whitespace, and one terminal newline. Canonical JSON recursively byte-sorts object keys, uses exact JSON numeric serialization, and omits no schema-required field. Validation extracts and strictly parses the sole payload block, recomputes the payload SHA-256, renders the entire document from that payload, and requires byte-for-byte equality; extra prose, reordered sections, alternate whitespace, or a second fence fails. The evidence index hashes and projects those already validated immutable Markdown bytes unchanged to `release-evaluation.md`.

The planning fingerprint is a pre-edit `UNIT-001` admission gate only. After the full tooling bootstrap, the reference and typed helper must byte-match current `estimate-sheet-source-fingerprint.v2` output. Units 001-004 share one application digest and producer digest; the decision freezes that baseline. Units 005-009 form an explicit predecessor chain over both before/after digests. Admission requires both current digests to equal the predecessor outputs. An activated unit may change application inputs and its explicitly owned product tests, but it must record both deltas; a shared evaluator/config/package-command change reopens UNIT-001. A superseded unit changes neither scope. UNIT-010 produces fresh final local children on one application and producer digest without editing either scope. UNIT-011 may change neither scope and must match UNIT-010. These runtime identities, never the historical pre-edit snapshot alone, establish comparability.

The evaluator fails before measurement when the built OpenNext preview server, per-unit current pointer, UUID lease, shared run-scoped Wrangler persistence directory, authenticated storage state, selected route IDs, seed, mandatory CDP profile, or required observer is unavailable. It also fails when source/build/fixture/auth hashes differ within a series. Dev-server measurements are diagnostic only and cannot satisfy a budget.

Mandatory browser profile: `perf:estimate:prepare` atomically allocates a UUID root and free port in `3101..3199`, compiles current per-run Better Auth D1 DDL through the exported `generateLocalBetterAuthD1SchemaSqlProof` helper, validates that it contains exactly `user`, `session`, `account`, `verification`, and `rateLimit`, and applies it first to the empty `--local --persist-to <run>/wrangler-state` database. Active app migrations run second in that same state; migration `0041_better_auth_rate_limit.sql` must converge through `CREATE TABLE IF NOT EXISTS` rather than collide with the generated table. The tracked June four-table SQL is stale evidence and must never be reused. Preparation validates the final five-table definitions and migration head, then seeds a Better Auth user/session, `closed_beta_allowed_emails`, the current `legal_terms_acceptances` record, the matching profile, workspace/project/estimate membership and access rows, and the estimate route hierarchy. Project and estimate route IDs are valid UUIDs. It signs the storage-state cookie with installed `better-auth/crypto` and validates the DDL hash, five-table set, allowlist, accepted legal terms, session, profile, membership/access chain, route hierarchy, and cookie before measurement. It writes a mode-`0600`, hash-bound `<run>/runtime.env` containing only the Better Auth provider/secret/base/trusted-origin values plus the five declared server mode keys. Then run `bun run cf:build`; `perf:estimate:server` validates that file and expands to `bunx opennextjs-cloudflare preview -- --ip 127.0.0.1 --port <leased-port> --persist-to <run>/wrangler-state --env-file <run>/runtime.env --show-interactive-dev-session=false`. `ARCH_DB` remains the Wrangler binding, secrets are supplied only to the child process, and phase-specific mode files are atomically replaced and revalidated before each fresh preview. `UNIT-002` alone launches the server nonblocking with `--phase=baseline-all-off --final-state=all-off --fixture-role=browser --background`; all five returned keys must be `off`, the active descriptor is fsynced, and the process stays live for Playwright/cleanup. Activated mode units instead consume the sole final preview left by their mode proof. Playwright-lockfile Chromium; one worker; zero retries; desktop 1440x900/DPR 1; 4x CPU slowdown; 20 ms added latency; 10 Mbps down/5 Mbps up. Cold samples use a new context plus cleared HTTP/cache storage; warm samples reuse a primed context; hover samples start at the warmed project route and await the prefetch signal. Tablet 1024x768 and mobile 390x844 are functional/a11y profiles, not budget substitutes.

For this profile, the `bun run cf:build` wording above is executable only through `perf:estimate:gate -- --role=opennext-build`; the server rejects a missing/mismatched receipt. Prepare seeds distinct unit-declared `mode`, `browser`, and/or `d1` namespaces from one canonical logical checkpoint. Every preview launch is fsynced to the process journal before readiness, every stopped preview has an exclusive exit/signal plus closed-port outcome before port reuse, and the mode runner leaves exactly one verified final `on|all-activated` preview for later browser/check work. The baseline launcher and mode runner write the same exclusive active-preview descriptor; Playwright rejects zero, multiple, stale, wrong-build, wrong-fixture, or nonmatching snapshots and never starts an implicit server.

## Browser Measurement Method

- Run with one Playwright worker and zero retries for budget evaluation.
- Use 3 warmups plus 20 route samples and 3 warmups plus 30 interaction samples.
- Store raw measured samples, then compute min/median/p75/p95/max with nearest-rank percentiles.
- Use `PerformanceObserver` Event Timing (`event` plus `interactionId`) for lab interaction timing where supported.
- Use Long Animation Frame (`long-animation-frame`) and long-task entries for main-thread diagnosis. Record dropped/unsupported entries.
- Playwright action duration is a diagnostic wall-clock metric only. It is never called INP or field-equivalent.
- Field INP <=200 ms p75 remains the production target; local Event Timing is a lab proxy.
- Tracing retains browser/network evidence on failure, but a trace duration is not a standalone performance metric.

## Route And UI Metrics

Required route fields:

- cold, warm, and hover samples
- route start, skeleton visible, sheet visible, tree ready, first row table mounted
- parent fallback count and sheet skeleton episode count
- response/RSC payload bytes and estimate-route client bundle gzip bytes

Required interaction fields:

- edit, search/facet, expand/collapse, move placement, modal open, inline component edit, and scroll samples
- Event Timing duration, LoAF/long-task duration, frame gap, failure count
- mounted row/branch counts, render-probe counts, total-recompute count
- retained heap delta when supported
- all 19 component-interop scenario results

Required graph-activation fields in the `UNIT-001` jsdom artifact:

- `M-GRAPH-ANCESTOR-LOOKUP-P95`: `ms`, measured against the deepest seeded path of the deterministic `limit` fixture with one worker, 3 warmups, 30 serial samples, `performance.now()`, and nearest-rank p95; hard threshold <=5 ms.
- `M-GRAPH-COMPONENT-LOOKUP-P95`: `ms`, measured by resolving every row ID for one identity with exactly 1,000 matches under the same sampling method; hard threshold <=5 ms.
- `M-GRAPH-DUPLICATE-BYTES`: canonical UTF-8 bytes in the second and later independently owned complete node+row representations retained after hydration; hard threshold 0. Test-only ownership roots are canonicalized by stable ID/order/content. Shared references and selector views count 0; an unclassifiable root fails closed.

After `perf:estimate:prepare -- --unit=UNIT-001 --profile=limit --artifact-only --cleanup-not-applicable`, `perf:estimate:measure -- --unit=UNIT-001 --profile=limit --evidence-class=jsdom --budget-policy=record-only --fixture-output=auto:fixture --output=auto:jsdom --no-build --no-browser --no-local-run` is the sole producer for the linked immutable pair. It writes/fsyncs temporary siblings in the run root, validates both schemas and reciprocal payload linkage, atomically renames without overwriting, and fsyncs the run directory. Only `perf:estimate:index` may project them to the two fixed current paths.

## D1 Measurement Method

Required surfaces: route context, tab tree, lazy subtree at depths 1/5/10, row update, move, bulk delete at 100, and project-component fan-out at 1/100/1000 matches.

Every D1 record includes statement name, normalized SQL hash, bind count, statement/query count, batch size, available duration/rows-read/rows-written values, `EXPLAIN QUERY PLAN`, selected index, seeded/cleaned counts, and evidence class.

Local proof uses freshly compiled Better Auth DDL first and active `migrations/` second in one UUID `--persist-to` directory; its fixture also includes the allowlist, current legal acceptance, signed session, matching profile, UUID route IDs, and complete membership/access chain. The lifecycle test and `tests/vitest/cloudflare-better-auth-proof-script.test.ts` must agree on eight generated statements and the exact current five-table set. Hosted proof targets only bound `ARCH_DB` through `wrangler d1 execute ARCH_DB --remote --file ... --json`; it adds no Worker route or deploy. Each run generates exact IDs per table; hosted inventory includes profile, workspace/project/sheet membership/access rows and the six estimate hierarchy tables. Cleanup deletes those exact IDs and reconciles all eleven tables independently. A metadata-prefix cleanup is invalid for this schema and is forbidden.

## Strict Budgets

| Metric | Threshold |
|---|---:|
| Field INP target | <=200 ms p75 |
| Lab Event Timing diagnostic target | <=200 ms p75 |
| Edit duration | <=75 ms p95 |
| Scroll frame gap | <=50 ms p95 |
| LoAF/long task | maximum <=50 ms and `over_50_ms_count=0` |
| Scalar-edit derived-state CPU | <=25 ms p95 |
| Scalar-edit full-tree recomputes | 0 |
| Scalar-mutation whole-tree snapshots | 0 |
| Project-component client fan-out at 1,000 matches | <=75 ms p95 |
| Ancestor-chain lookup at the limit fixture | <=5 ms p95 |
| Component identity lookup at exactly 1,000 matches | <=5 ms p95 |
| Second/later independently owned complete tree bytes | 0 |
| Mounted rows per active 5,000-row table window | <=120 |
| Mounted branches at 1,500 nodes | <=150 |
| Cold route | <=3,500 ms median |
| Warm/hover route | <=500 ms median |
| Warm sheet visible | <=1,000 ms |
| Parent fallback | 0 |
| Sheet skeleton episodes | <=1 |
| Route context statements | <=4 |
| Tab tree statements | <=3 |
| Row update statements | <=3 |
| Estimate-route first-load client JS | <=350 KiB gzip |
| Stress RSC payload | <=500 KiB |
| Graph retained heap delta | <=20 MiB |

Subtree query count after an activated D1 optimization must be O(1) in requested depth. D1 cost projection must remain below 50% of current official free-tier daily read/write allowances at the recorded MVP traffic model.

There are no "documented exceptions allowed" pass paths. A threshold changes only through a new evidence-backed `DEC-AUTO-*` decision and a manifest refresh.

## Reliability Semantics

- Any failed navigation/action/sample makes the scenario fail.
- Retries and Playwright's flaky classification cannot turn a failed performance scenario green.
- Arbitrary sleeps are forbidden; wait on explicit route/DOM/application signals.
- Ten runs are smoke evidence only. A <=2% observed failure-rate claim requires at least 100 independent repetitions.
- Missing metrics, non-finite values, stale input hashes, unsupported required observers, seed mismatch, or cleanup mismatch fail closed.
- Metric-level `SKIPPED` is allowed only for an unavailable nonessential metric and must include reason and residual risk. It cannot satisfy a hard budget; the complete report remains `PASS|FAIL`.

## Decision Output

`perf:estimate:decide` evaluates one explicit predicate per `UNIT-005` through `UNIT-009`. `UNIT-005` owns route/D1 failures; `UNIT-007` owns derivation/search/totals failures; `UNIT-008` owns mounted-DOM/scroll/LoAF/focus/virtualization failures after baseline regression repair; `UNIT-009` owns snapshot/mutation/fan-out/revision/rollback/concurrency failures. `UNIT-006` uses exactly `UNIT-007.activate OR M-MUTATE-CLIENT-FANOUT-P95.fail OR M-GRAPH-ANCESTOR-LOOKUP-P95.fail OR M-GRAPH-COMPONENT-LOOKUP-P95.fail OR M-GRAPH-DUPLICATE-BYTES.fail`; each `.fail` is mechanically `observed > hard threshold` from the current `jsdom-baseline.json`, except duplicate bytes where any value >0 fails. Missing, non-finite, wrong-unit, stale-fixture, or unclassifiable inputs fail the decision command. No prose inference is permitted.

It then ranks only activated branches using:

1. count of failed hard thresholds;
2. normalized threshold overage;
3. count of affected required scenarios.

A branch is activated only when its explicit predicate is true. Ranking cannot activate a passing branch. Every nonactivated unit writes a hashed supersession receipt. Missing, stale, unmapped, or multiply mapped evidence makes the decision command fail.

## Canonical Outputs

The first 13 paths in `IMPLEMENTATION_PLAN.md` are index-owned current evidence projections; `evidence-index.json` is the fourteenth stable name and current registry. Producers write once under `evidence/runtime/runs/<unit>/<run-id>-<application-short>-<input-short>/`; `--output=auto:<role>` resolves the per-unit pointer and rejects collisions. Each transition also writes an immutable registry snapshot. That registry maps the 13 evidence projection path/hash values to immutable source path/hash/history and has no cyclic self-entry; the journal and committed manifest carry its external path/hash. Starting from durable `evidence/`, every newly created directory is child-fsynced then parent-fsynced before descent.

The transition journal stores immutable evidence/registry sources plus every evidence/registry projection target and `oldProjection:{exists,sha256,bytesBase64}`, newly created directory components, and old/new manifest/index metadata. Before the `plan-pack.json` commit point, recovery restores old bytes or unlinks a projection that was formerly absent and fsyncs the parent; it prunes only journal-created empty directories deepest-first with parent fsync. After commit, it may recopy only already verified immutable bytes and rebuild manifest projection records; it never invents or mutates immutable bytes. First-transition fault tests cover mkdir, directory/parent fsync, temp-file fsync, rename, and post-rename fsync, including the first registry transition. Local cleanup receipt precedes indexing; response-loss recovery invalidates producer evidence. An unresolved journal blocks all transitions except `--recover`.

# 20 - Performance Evaluator Spec

This is the strict evaluator contract for canonical `UNIT-001` through `UNIT-011`. `IMPLEMENTATION_PLAN.md` owns the final paths, budgets, and dependencies.

## Schema And Commands

Schema ID: `estimate-sheet-performance-report.v1`.

Frozen planning-only inputs, registered as `ART-036` and `ART-037`, frozen at exact review-candidate hash capture, and byte-identical through the orchestrator-separated review lanes, atomic promotion, UNIT-001 admission, and implementation:

- `evidence/source-fingerprint-v1.mjs` (planning-time reference implementation)
- `evidence/record-unit001-planning-admission.mjs` (write-once planning-admission recorder)

The recorder has exactly three CLI surfaces: deterministic `--review-candidate`; `--record-review=<architect|critic|fingerprint-verifier> --reviewer-id=<lane-id> --candidate-sha256=<sha256> --verdict=CLEAN`; and the fixed UNIT-001 `--output=...` admission path. Review receipts are fixed beneath `.ai/99_scratch/estimate-sheet-performance/reviews/<candidate-sha256>/<role>.json`, are exact-schema/canonically serialized owner-written mode-`0600` one-link files, and require distinct reviewer IDs. They are procedural same-UID attestations: they bind candidate, role, path, and bytes, while the orchestrator separately records that three actual lanes performed the reviews. They do not authenticate mutually distrusting principals. `EVID-012` is a procedural review-gate record, not a future receipt bundle: its `source_revision` is a deterministic `review-binding:v1:<sha256>` over the candidate's immutable artifact/runtime registry and readiness artifact identity, and promotion preserves that binding while the recorder validates the three candidate-namespaced receipts. The candidate binds the exact pre-promotion and predicted promoted manifest bytes, ART-031/034/036/037, the complete ART-001..052 registry, validator bytes, the initial `runtime_evidence` declaration, and full source fingerprint. Admission reverses the promoted manifest, reconstructs that candidate, and rejects any change outside the documented 130-value transform; `updated_at`, evidence revisions, artifact/evidence hashes and paths, baseline, `runtime_evidence`, ordering, and plan/helper bytes do not change during promotion, while only `manifest_sha256` is recomputed after the other 129 values change. Both helpers reject Node/Bun/native startup-injection controls and Node interpreter flags, require the root-owned non-group/world-writable `/usr/bin/git`, and use a minimal fixed child environment. The fingerprint helper also rejects command-bearing local/worktree Git config and nonempty `.git/info/attributes`; excludes only three exact untracked/ignored `.impeccable` machine files while rejecting tracked matches; and leaves every other ignored/untracked path identity-sensitive. The recorder rechecks live pack/artifact bytes and validator descriptors before and after live source verification, also bracketing review receipt identities during admission; durable publication runs this barrier before writing and after linking.

Exact `UNIT-001` runtime implementation (the two planning-only inputs above are not writable unit scope):

- `src/lib/estimates/estimate-performance-modes.ts`
- `src/lib/estimates/estimate-performance-modes.server.ts`
- `src/components/workshop/estimate-performance-mode-context.tsx`
- inert snapshot propagation in `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx` and `src/components/workshop/EstimateWorkspaceClient.tsx`
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
- `scripts/run-estimate-sheet-activated-tests.ts`
- `scripts/write-estimate-sheet-supersession.ts`
- `scripts/update-estimate-sheet-performance-evidence-index.ts`
- `scripts/verify-estimate-sheet-hosted-d1-performance-proof.ts`
- `scripts/write-estimate-sheet-release-evaluation.ts`
- `scripts/write-estimate-sheet-bottleneck-decision.ts`
- the optional `estimate-sheet-runtime-manifest-state.v1` extension in `scripts/lib/plan-pack-validator.mjs`
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
- `tests/vitest/estimate-performance-mode-route-contract.test.ts`
- `tests/vitest/estimate-performance-mode-context.test.tsx`
- `tests/vitest/estimate-performance-evidence-index.test.ts`
- `tests/vitest/estimate-sheet-d1-performance.test.ts`
- `tests/vitest/estimate-sheet-bottleneck-decision.test.ts`
- `tests/vitest/estimate-sheet-hosted-d1-performance-proof-script.test.ts`
- `tests/vitest/estimate-sheet-release-evaluation.test.ts`

`UNIT-001` creates and tests this entire shared evaluator producer surface plus the client-safe/server-only mode modules, mode context, inert route/client propagation, and every package command below before the first measurement. Later units execute the evaluator and never alter its files or package entries. `UNIT-002` is the sole pre-decision exception for receipt-gated declared product/test repairs; an activated `UNIT-005` through `UNIT-009` may add only product regression tests explicitly owned by its packet. Each allowed producer-fingerprint delta is recorded in predecessor/refreeze lineage. A shared tool defect reopens `UNIT-001` and invalidates the affected baseline chain.

Exact planned package scripts:

```json
{
  "perf:estimate:fingerprint": "bun run scripts/compute-estimate-sheet-source-fingerprint.ts",
  "perf:estimate:prepare": "bun run scripts/prepare-estimate-sheet-performance-run.ts",
  "perf:estimate:validate-run": "bun run scripts/validate-estimate-sheet-performance-run.ts",
  "perf:estimate:cleanup": "bun run scripts/cleanup-estimate-sheet-performance-run.ts",
  "perf:estimate:gate": "bun run scripts/run-estimate-sheet-performance-gate.ts",
  "perf:estimate:activated-tests": "bun run scripts/run-estimate-sheet-activated-tests.ts",
  "perf:estimate:measure": "bun run scripts/measure-estimate-sheet-performance.ts",
  "perf:estimate:d1": "bun run scripts/measure-estimate-sheet-d1.ts",
  "perf:estimate:d1:hosted": "bun run scripts/verify-estimate-sheet-hosted-d1-performance-proof.ts",
  "perf:estimate:server": "bun run scripts/start-estimate-sheet-benchmark-server.ts",
  "perf:estimate:modes": "bun run scripts/run-estimate-sheet-mode-proof.ts",
  "perf:estimate:check": "bun run scripts/measure-estimate-sheet-performance.ts --check",
  "perf:estimate:decide": "bun run scripts/write-estimate-sheet-bottleneck-decision.ts",
  "perf:estimate:supersede": "bun run scripts/write-estimate-sheet-supersession.ts",
  "perf:estimate:index": "bun run scripts/update-estimate-sheet-performance-evidence-index.ts",
  "perf:estimate:release": "bun run scripts/write-estimate-sheet-release-evaluation.ts"
}
```

### Runtime Manifest Transition Contract

`30_RUNTIME_EVIDENCE_AND_MANIFEST_TRANSITIONS.md` is the closed authority for the initial ART-038..052 projection registry and every runtime `plan-pack.json` mutation. The planning recorder validates sequence zero, null run identity, exact ordered primary/secondary mappings, artifact/evidence hash reciprocity, and the initial reciprocal ownership of `REQ-014`/`DATA-004`. UNIT-001 ports those checks into the index and optional plan-specific validator before the first runtime transition. `perf:estimate:prepare` alone commits ordinary starts; `perf:estimate:index` alone commits projections, terminal/superseded states, journaled UNIT-001 refreeze reopen, technical block, release mapping, and final closeout. Superseded units remain in dependency-closed `SLICE-001` as satisfied transitive members and can never be `next_unit`. For `REQ-014`/`DATA-004`, UNIT-010 proves graph parity/state only when UNIT-006 activates. A superseded UNIT-006 instead causes the UNIT-004 index transition to set both requirements `DEFERRED` and requires the immutable decision, supersession receipt, unchanged application/producer pair, and base recursive-tree integrity proof; no graph-state claim is made.

`scripts/write-estimate-sheet-supersession.ts` is the sole `estimate-sheet-supersession-receipt.v1` producer. After prepare, `perf:estimate:supersede -- --unit=<UNIT-005..009> --decision=evidence/runtime/bottleneck-decision.json --output=auto:supersession` validates the immutable decision, predecessor pair, empty resource/mutation declarations, and unchanged application/producer scopes before a no-overwrite write. The index consumes that exact role and may not synthesize the receipt.

### Activated-Test Runner Contract

The runner's registry is closed and ordered. Its exported value is exact:

```ts
export const ACTIVATED_ESTIMATE_TEST_REGISTRY = {
  base: [
    "tests/vitest/estimate-node-route-context-rpc-contract.test.ts",
    "tests/vitest/estimate-route-server-concurrency.test.ts",
    "tests/vitest/estimate-sheet-large-data-budgets.test.ts",
    "tests/vitest/estimate-row-table-virtualization.test.tsx",
    "tests/vitest/estimate-branch-virtualization.test.tsx",
    "tests/vitest/perf/estimate-sheet-render-baseline.test.tsx",
    "tests/vitest/perf/estimate-sheet-render-relief.test.tsx",
    "tests/vitest/perf/estimate-sheet-memoization.test.tsx",
    "tests/vitest/perf/estimate-sheet-cursor-isolation.test.tsx",
    "tests/vitest/estimate-sheet-performance-contract.test.ts",
    "tests/vitest/estimate-sheet-d1-performance.test.ts",
    "tests/vitest/estimate-mutations.test.ts",
    "tests/vitest/estimate-row-mutation-coordinator.test.tsx",
    "tests/vitest/estimate-sheet-bulk-row-delete-partial-failure.test.tsx",
    "tests/vitest/estimate-row-update-broadcast.test.ts",
    "tests/vitest/estimate-component-fan-out.test.ts",
    "tests/vitest/perf/estimate-sheet-fan-out-budget.test.tsx",
    "tests/vitest/estimate-link-state-transitions.test.ts",
    "tests/vitest/estimate-component-identity.test.ts",
    "tests/vitest/estimate-three-edit-surfaces.test.ts",
    "tests/vitest/estimate-sheet-derived-work-characterization.test.tsx",
    "tests/vitest/estimate-sheet-sidebar-render-isolation.test.tsx",
    "tests/vitest/estimate-mutation-revision-concurrency.test.ts",
    "tests/vitest/estimate-sheet-d1-bind-budget.test.ts",
  ],
  "UNIT-005": [
    "tests/vitest/estimate-sheet-route-large-data-contract.test.ts",
  ],
  "UNIT-006": [
    "tests/vitest/estimate-graph-parity.test.ts",
    "tests/vitest/estimate-graph-property.test.ts",
    "tests/vitest/estimate-graph-selectors.test.ts",
  ],
  "UNIT-007": [
    "tests/vitest/estimate-graph-totals.test.ts",
    "tests/vitest/estimate-sheet-derived-state-property.test.ts",
    "tests/vitest/perf/estimate-sheet-large-edit-budget.test.tsx",
  ],
  "UNIT-008": [
    "tests/vitest/perf/estimate-sheet-large-virtualization.test.tsx",
  ],
  "UNIT-009": [
    "tests/vitest/estimate-row-tree-patch.test.ts",
  ],
} as const;
```

`scripts/run-estimate-sheet-activated-tests.ts` exports `resolveActivatedEstimateTests()` for contract tests and invokes the CLI only under `import.meta.main`. The CLI accepts only the canonical `--unit=UNIT-010`, `--decision=evidence/runtime/bottleneck-decision.json`, and `--output-role=dom-tests` arguments, requires matching `ESTIMATE_PERF_UNIT=UNIT-010` and `ESTIMATE_PERF_TEST_OUTPUT_ROLE=dom-tests`, and accepts no caller-supplied test path. It resolves the current decision projection through `evidence/runtime/evidence-index.json`, reopens and hashes the indexed immutable UNIT-004 decision bytes, requires exactly one `activate|supersede` result for each UNIT-005 through UNIT-009, enforces `UNIT-007.activate => UNIT-006.activate`, and requires the current application and producer fingerprints to equal the indexed UNIT-009 output pair.

Registry resolution rejects an escaping, non-regular, duplicate, unordered, or unknown path. Every base path and every activated conditional path must exist; a superseded conditional path is never statted. For UNIT-006, activation requires the three graph test paths; supersession instead requires the indexed immutable decision/supersession receipt, unchanged application/producer lineage, and the base recursive-tree integrity tests already in the registry. The decision/index transition also changes `REQ-014` and `DATA-004` to `DEFERRED`, so the runner makes no graph-state or parity claim on the superseded branch and UNIT-010 cannot satisfy those requirements by owner metadata alone. It spawns exactly one `bun run test:dom -- <resolved-files> --maxWorkers=1` child with an argv array and `shell=false`. The conditional reporter is the sole receipt writer. After the child exits, the runner reopens the no-overwrite receipt and requires the exact normalized argv/file list, UNIT-010/run identity, unchanged application/producer fingerprints, one worker, zero retries, pass/fail/skip counts, overall result, and no `fixtureMutation`. Contract coverage is added only to `tests/vitest/estimate-sheet-bottleneck-decision.test.ts` and `tests/vitest/estimate-performance-run-lifecycle.test.ts`; no separate runner test file or dependency is introduced.

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

`overall` is the measured budget outcome, not the evidence-lifecycle status. Complete `UNIT-001` through `UNIT-003` baseline reports may and normally will be overall `FAIL`; their failed hard metrics are required inputs to `UNIT-004`. A baseline checker runs only with `--budget-policy=record-only`: it exits zero when collection, schema, provenance, dependency, and required functional/auth/accessibility integrity pass while preserving the report's measured `overall`. Record-only never admits a known functional failure: before browser collection, `UNIT-002` must repair D1 row restore and its focused test receipt must include direct `EstimateActionsD1Client` proof for native single/bulk and historical compatibility reconstruction, first-call subset behavior, scope/type/parent/collision/zero-match denial, authoritative revisions, one-event atomicity, same-correlation replay, fresh-correlation source-event idempotency without stale resurrection, bulk-event alias normalization, and preserved node restore. A mocked server-action client alone is insufficient. Every functional/auth/accessibility scenario must pass. Plan-pack/index status `VERIFIED` means that complete current evidence was durably validated and indexed; it never rewrites `overall` and does not mean the baseline budgets passed. `--budget-policy=enforce` is the default and is mandatory for optimization, integration, unit-proof, and release checks; it rejects any required child report whose `overall` is `FAIL`. The index accepts `record-only` only for the declared `UNIT-001` through `UNIT-003` baseline projections.

| `evidenceClass` | Required variant fields | Forbidden variant fields |
|---|---|---|
| `jsdom` | `buildMode="not-applicable"`, `buildHash=null`; Bun/Node/jsdom versions; fixture distribution; raw render/derivation/fan-out/graph samples; ownership census; min/median/p75/p95/max | browser/device/throttle/cache, server/base URL, auth session/cookie, deployment-mode snapshots, D1/provider/query fields, cleanup receipt |
| `local-browser` | `buildMode="opennext-preview"`, nonempty OpenNext `buildHash`; fixed `browserScope=baseline|route|derived-state|render-a11y|mutations|full-local` bound to the prepared unit; UUID lease; server command/base URL/readiness/starting PID; redacted auth-fixture metadata; browser/OS/viewport/DPR/CPU/network/cache; the server-resolved five-key mode snapshot used by the run; scope-required route/interaction/render/bundle/RSC/heap samples | server exit/signal/closed-port fields, cleanup receipt, raw secrets/IDs, Wrangler credentials, top-level D1 statement/query-plan records, metrics outside the fixed scope presented as pass evidence |
| `local-d1` | `buildMode="not-applicable"`, `buildHash=null`; UUID persistence root; generated schema/migration/seed/authz hashes; D1 version; statement/query/bind/rows/duration/plan/index records | browser/device/throttle/cache, preview server/base URL, auth cookie, mode snapshots, route/UI/Event-Timing fields |
| `hosted-d1` | `buildMode="not-applicable"`, `buildHash=null`; UUID lease; exact binding/database preflight; Wrangler/D1 versions; free-tier projection; statement/query/bind/rows/duration/plan/index records; durable hosted cleanup receipt | browser/device/throttle/cache, app server/base URL/session cookie, mode snapshots, route/UI/Event-Timing fields |

An irrelevant field is absent, not `null`, `"not-applicable"`, or an empty placeholder; only the three declared non-build variants use `buildHash=null`. Unknown, missing, duplicate, multiply owned, cross-class, and hybrid fields fail validation. Local reports finalize before cleanup. Every prepared run declares `cleanupRequirement=REQUIRED|NOT_APPLICABLE`. `NOT_APPLICABLE` is permitted only for the explicitly declared artifact-only `UNIT-001`, `UNIT-004`, and decision-backed supersession runs; prepare must record empty preview-process, port, D1 namespace, credential, raw-ID, mutable-fixture, and cleanup-resource declarations plus an empty mutation journal. `perf:estimate:index -- --cleanup-not-applicable` reopens that manifest and authorizes the transition only while every resource/mutation field is still empty. It is a validated state, never a general cleanup bypass. All other runs declare `REQUIRED`. Their separate fsynced `estimate-sheet-cleanup-receipt.v1` uses `cleanupClass=local-preview|local-d1|hosted-d1`: only `local-preview` admits and requires the leased port plus a complete ordered `previewProcesses` array with role/phase/ordinal/PID/snapshot/readiness, exclusive exit-code/signal outcome, and `closedPort=true` for every launched preview. `local-d1` forbids port, `runtime.env`, browser storage-state, preview-process, and preview-cleanup fields; it carries only D1 namespace/schema/seed/exact-ID cleanup state. `hosted-d1` likewise forbids local preview/process/port fields. Local variants carry seeded/deleted/remaining counts by fixture role and table, while `hosted-d1` requires exact eleven-table counts plus binding/database proof. A required-cleanup run reaches `VERIFIED` only with uninterrupted `CLEANUP_VERIFIED` and `invalidatedProducer=false`. A successful hosted report embeds that receipt; interrupted `--cleanup-only --run-id=<uuid>` writes only `estimate-sheet-hosted-cleanup-recovery.v1` under the ignored UUID root.

When `ESTIMATE_PERF_TEST_OUTPUT_ROLE` is set, the UNIT-001-installed conditional Vitest or Playwright reporter writes one no-overwrite `estimate-sheet-test-receipt.v1` into the prepared run. It records test class, exact normalized argv and file list, unit/run IDs, equal pre/post application and producer fingerprints, applicable fixture/build hash, worker/retry settings, pass/fail/skip counts, duration, overall `PASS|FAIL`, and redacted failure identifiers. When `ESTIMATE_PERF_FIXTURE_ROLE` is set, it also requires `fixtureMutation:{fixtureRole,namespaceIdSha256,preStateSha256,postStateSha256,declaredMutationSha256,commandId}`; the block is forbidden otherwise. It forbids raw stdout, secrets, credential-bearing URLs, and arbitrary stack/request data. An incomplete runner writes only a non-indexable attempt; checker/envelope/index consumers accept only a same-run `PASS` receipt whose role matches its `--tests=auto:<role>` input and whose fixture block matches the prepared checkpoint, mutation journal, and non-reused namespace.

`perf:estimate:gate` wraps required non-test exit-status gates and writes no-overwrite `estimate-sheet-command-receipt.v1`: role, normalized argv, unit/run IDs, equal pre/post application and producer fingerprints, timestamps/duration, exclusive exit-code/signal, `PASS|FAIL`, redacted-output hash, bounded redacted diagnostic counts, and relevant build/artifact hash. Only declared non-secret path environment keys are accepted. For the UNIT-011 release gate, fixed `--child-output=OUTPUT_FILE:auto:release-gates-json` and `--child-output=MARKDOWN_FILE:auto:release-gates-md` resolve absent contained destinations inside the prepared immutable run; the receipt binds both child schemas, paths, and hashes. Shared fixed scratch destinations and caller-selected child roles are rejected. Interrupted commands write attempts; any source/producer mutation, stale/failed/duplicate/wrong command, wrong build, cross-run, or cross-fingerprint gate receipt fails.

`perf:estimate:fingerprint -- --record-refreeze-admission=<ignored-path>` creates the only pre-decision repair lane. It binds the current immutable UNIT-001 index entry, input application/producer hashes, repair reason, and exact application/producer path allowlists before editing. The conditional test reporter writes the focused receipt into that repair run when `ESTIMATE_PERF_REFREEZE_ADMISSION` is set. `--finalize-refreeze-admission` rejects undeclared or missing deltas and writes immutable `estimate-sheet-refreeze-receipt.v1` containing the predecessor index path/hash, input/output dual hashes, declared/actual path sets, focused `PASS` receipt path/hash, replacement-unit identity, and invalidated downstream IDs. Before replacement production, `perf:estimate:index -- --reopen-unit=UNIT-001 --refreeze-admission=<ignored-path>` journal-commits the exact reopen tuple from doc 30. Replacement prepare then consumes that admission; the replacement terminal index retains old immutable history and recursively records the refreeze receipt. A pre-repair browser manifest cannot resume after a source change.

`perf:estimate:modes -- --output=auto:mode-proof` writes `estimate-sheet-mode-proof.v1`, containing the same unit/run and fingerprint pair plus applicable fixture/build/auth hashes, the target or matrix, requested and server-returned versioned snapshots for every requested phase, parity/side-effect counters, scope-required measurements, durable outcomes for every stopped intermediate preview, one verified active final-preview descriptor, and overall `PASS|FAIL`. After rollback/all-off proof, `--final-state=on|all-activated` starts the only live preview used by later browser/check work. It is a child envelope and cannot satisfy a complete local-browser budget by itself.

`UNIT-005` and `UNIT-010` use `estimate-sheet-performance-integration.v1` with one identical application digest plus one identical broad producer digest across every child. `integrationScope=route-d1` requires a complete route-scoped mode proof, `browserScope=route` local-browser report, and complete local-D1 report. `integrationScope=full-local` requires a complete mode-matrix proof, `browserScope=full-local` report, and complete local-D1 report. `UNIT-006` through `UNIT-009` use `estimate-sheet-performance-unit-proof.v1`, discriminated by `proofScope=graph|derived-state|render-a11y|mutations`, with required mode/test/command children and scope-specific fields. `derived-state`, `render-a11y`, and `mutations` require matching scoped local-browser children; `graph` forbids one. Every child reference is `{role,schemaId,immutablePath,sha256}` and is independently reopened, hashed, schema/input validated, and required to share the same run/fingerprint pair, fixed unit/scope pair, and overall `PASS`. Final-snapshot equality applies only to the mode proof, browser/active-preview participants, current pointer, and cleanup receipt; local-D1 and non-preview test/command children forbid that field. Missing, failed, wrong-scope, cross-run, a wrong final snapshot on an applicable participant, or reused-browser-namespace children fail.

Prepare allocates distinct `mode`, `browser`, and/or `d1` fixture namespaces from one canonical logical checkpoint. UNIT-005 allocates all three; UNIT-007 through UNIT-009 allocate `mode` plus `browser`; UNIT-010 allocates all three. Each mutating command selects one role and records namespace-ID hash, common `preStateSha256`, observed post-state, declared mutation digest, and command ID. One fixture-bound Playwright command may co-produce its local-browser artifact and E2E test receipt from one browser namespace/command ID; a second mutating browser command may not reuse it. Envelopes reject dirty/missing checkpoints, undeclared mutations, namespace reuse, or unequal logical pre-state, and cleanup reconciles every role/table ID set. The evidence index recursively revalidates all primary and dependency bytes after cleanup and stores the browser report and E2E receipt as distinct ordered `dependencySources[]` entries. Decision, supersession, refreeze, release, and index files use their own `.v1` schemas. Negative tests also delete/mutate a child between check/index, omit a process outcome, substitute a gate role, use the wrong browser scope/final snapshot, and mutate without an isolated checkpoint.

`estimate-sheet-release-evaluation.v1` is deterministic UTF-8/LF Markdown, not JSON stored under a Markdown extension. Its exact bytes are `<!-- estimate-sheet-release-evaluation.v1 sha256=<payload-sha256> -->\n\n`, one fenced `json` block containing the single-line canonical JSON payload and a terminal newline, then a deterministic human-readable rendering with fixed headings, field order, whitespace, and one terminal newline. Canonical JSON recursively byte-sorts object keys, uses exact JSON numeric serialization, and omits no schema-required field. The payload requires separate residual-proof fields for `fieldInp` and `manualScreenReader`, each fixed to `NOT_EVALUATED` with a machine-readable reason in this no-deploy pack; neither may be inferred from lab Event Timing or automated accessibility evidence. Validation extracts and strictly parses the sole payload block, recomputes the payload SHA-256, renders the entire document from that payload, and requires byte-for-byte equality; extra prose, reordered sections, alternate whitespace, or a second fence fails. The evidence index hashes and projects those already validated immutable Markdown bytes unchanged to `release-evaluation.md`.

`perf:estimate:release` resolves `--global=auto:release-gates-json` only through the same-run `auto:release-gates` command receipt and revalidates both bound release-gate child outputs. Evaluator `READY` maps to manifest `release_status=READY`; evaluator `NOT_READY|BLOCKED` maps to manifest `release_status=NOT_READY` while retaining all reasons in ART-051. Missing executable hosted proof is not evaluator `BLOCKED`; after recovery is exhausted it uses doc 30's `UNIT-011=BLOCKED`, `implementation_status=INCOMPLETE`, and `terminal_status=TECH_BLOCKED` transition.

The planning fingerprint is a pre-edit `UNIT-001` admission gate only. Before any edit, the candidate-hash-frozen recorder requires the exact atomic 130-value transform with no subset or extra edit admitted: preserve `profile=high-blast-radius`, `package_action_ceiling=EXTERNAL_ACTIONS`, `last_observed_run_scope=PLAN_ONLY`, `implementation_status=NOT_STARTED`, `release_status=NOT_EVALUATED`, `plan_lifecycle=ACTIVE`, `terminal_status=ACTIVE`, every risk `OPEN`, `authorization_boundaries=[]`, `updated_at`, every evidence revision, every artifact/evidence hash and path, the baseline, the complete initial `runtime_evidence` declaration, ordering, all plan/helper bytes, and every exact registered ID set; set all sources `CURRENT`, requirements `ACCEPTED`, assumptions `VALIDATED`, decisions `ACTIVE`, criteria/gates `PASS`, and all eleven units `READY`; set `TEST-001`/`TEST-007=PASS` with `TEST-002..006=PLANNED`; set `EVID-001`/`EVID-012=PASS` with `EVID-002..011`/`EVID-013=STALE`; publish exactly ordered dependency-closed `SLICE-001`, `next_unit=UNIT-001`, and `package_status=IMPLEMENTATION_READY`; then recompute only `manifest_sha256`. It validates the manifest self-hash, every registered artifact, and initial ART-038..052/evidence reciprocity; reconstructs the reviewed candidate; requires the three candidate-namespaced procedural review attestations; runs the reference in verify mode; and atomically writes a mode-`0600` ignored `estimate-sheet-planning-admission.v1` receipt. The receipt includes both exact plan-pack identities, key artifacts and registry hash, validators, the deterministic EVID-012 review binding, procedural review metadata, full fingerprint, and canonical payload hash. `perf:estimate:prepare` requires that exact receipt, copies it into the immutable UNIT-001 run, revalidates it against the still-current plan/helper bytes, and exposes it as a required index dependency; wrong status/unit, replacement, hash drift, missing scratch input, or dependency omission fails closed. After the full tooling bootstrap, the unchanged reference and typed helper must byte-match current `estimate-sheet-source-fingerprint.v2` output. The mandatory `UNIT-002` row-restore source/test repair first records an exact refreeze admission against the immutable UNIT-001 entry, then emits a focused receipt whose direct D1 cases prove the complete reconstruction/replay/denial contract rather than only the already-mocked server-action seam, journal-reopens UNIT-001, and completes the UNIT-001 producer/test/index rerun. Any later functional/auth/accessibility baseline repair uses the same one-source/one-test closed-map protocol after cleaning and invalidating the pre-repair browser attempt. That final replacement application/producer pair and refreeze lineage are the sole cohort shared by Units 001-004 and frozen by the decision. No UNIT-002 browser collection may precede it. Units 005-009 form an explicit predecessor chain over both before/after digests. Admission requires both current digests to equal the predecessor outputs. An activated unit may change application inputs and its explicitly owned product tests, but it must record both deltas; a shared evaluator/config/package-command change reopens UNIT-001. A superseded unit changes neither scope. UNIT-010 produces fresh final local children on one application and producer digest without editing either scope; it owns the graph requirements only when UNIT-006 activates, while a superseded UNIT-006 defers those requirements and relies on the base recursive-tree proof. UNIT-011 may change neither scope and must match UNIT-010. These runtime identities, never the historical pre-edit snapshot alone, establish comparability.

The evaluator fails before measurement when any resource declared by the selected profile is unavailable or mismatched. Browser/mode profiles require the built OpenNext preview server, leased port, authenticated storage state, selected route IDs, mandatory CDP profile, and required observers. Pure local-D1 requires the per-unit pointer, UUID lease, run-scoped Wrangler persistence directory, generated schema/migration/seed/access state, and selected route IDs, but rejects any port, `runtime.env`, browser storage state, or preview process. Every profile rejects source/build/fixture/auth hash drift within its applicable series. Dev-server measurements are diagnostic only and cannot satisfy a budget.

Mandatory browser/mode profile: `perf:estimate:prepare -- --port=auto` atomically allocates a UUID root and free port in `3101..3199`, compiles current per-run Better Auth D1 DDL through the exported `generateLocalBetterAuthD1SchemaSqlProof` helper, validates that it contains exactly `user`, `session`, `account`, `verification`, and `rateLimit`, and applies it first to the empty `--local --persist-to <run>/wrangler-state` database. Active app migrations run second in that same state; migration `0041_better_auth_rate_limit.sql` must converge through `CREATE TABLE IF NOT EXISTS` rather than collide with the generated table. The tracked June four-table SQL is stale evidence and must never be reused. Preparation validates the final five-table definitions and migration head, then seeds a Better Auth user/session, `closed_beta_allowed_emails`, the current `legal_terms_acceptances` record, the matching profile, workspace/project/estimate membership and access rows, and the estimate route hierarchy. Project and estimate route IDs are valid UUIDs. It signs the storage-state cookie with installed `better-auth/crypto` and validates the DDL hash, five-table set, allowlist, accepted legal terms, session, profile, membership/access chain, route hierarchy, and cookie before measurement. It writes a mode-`0600`, hash-bound `<run>/runtime.env` containing only the Better Auth provider/secret/base/trusted-origin values plus the five declared server mode keys. Then run `bun run cf:build`; `perf:estimate:server` validates that file and expands to `bunx opennextjs-cloudflare preview -- --ip 127.0.0.1 --port <leased-port> --persist-to <run>/wrangler-state --env-file <run>/runtime.env --show-interactive-dev-session=false`. `ARCH_DB` remains the Wrangler binding, secrets are supplied only to the child process, and phase-specific mode files are atomically replaced and revalidated before each fresh preview. UNIT-001's route/client bridge exposes the one server-resolved snapshot as deterministic non-secret workspace metadata. `UNIT-002` alone launches the server nonblocking with `--phase=baseline-all-off --final-state=all-off --fixture-role=browser --background`; all five returned keys and observable workspace metadata must be `off`, the active descriptor is fsynced, and the process stays live for Playwright/cleanup. Activated mode units instead consume the sole final preview left by their mode proof. Playwright-lockfile Chromium; one worker; zero retries; desktop 1440x900/DPR 1; 4x CPU slowdown; 20 ms added latency; 10 Mbps down/5 Mbps up. Cold samples use a new context plus cleared HTTP/cache storage; warm samples reuse a primed context; hover samples start from the warmed project route and await the prefetch signal. Tablet 1023x768 and mobile 390x844 are functional/a11y profiles, not budget substitutes.

For this profile, the `bun run cf:build` wording above is executable only through `perf:estimate:gate -- --role=opennext-build`; the server rejects a missing/mismatched receipt. Prepare seeds distinct unit-declared `mode`, `browser`, and/or `d1` namespaces from one canonical logical checkpoint. Every preview launch is fsynced to the process journal before readiness, every stopped preview has an exclusive exit/signal plus closed-port outcome before port reuse, and the mode runner leaves exactly one verified final `on|all-activated` preview for later browser/check work. The baseline launcher and mode runner write the same exclusive active-preview descriptor; Playwright rejects zero, multiple, stale, wrong-build, wrong-fixture, or nonmatching snapshots and never starts an implicit server.

Pure local-D1 profile: `UNIT-003` runs `perf:estimate:prepare -- --port=none`. It compiles and validates the same current Better Auth DDL, active migrations, route/access hierarchy, and D1 authorization fixture, but allocates no port, `runtime.env`, browser storage state, preview process, active-preview descriptor, or browser cleanup resource. Its manifest and cleanup receipt fail validation if any such field is present.

## Browser Measurement Method

- Run with one Playwright worker and zero retries for budget evaluation.
- Use 3 warmups plus 20 route samples and 3 warmups plus 30 interaction samples.
- Store raw measured samples, then compute min/median/p75/p95/max with nearest-rank percentiles.
- Use `PerformanceObserver` Event Timing (`event` plus `interactionId`) for lab interaction timing where supported.
- Use Long Animation Frame (`long-animation-frame`) and long-task entries for main-thread diagnosis. Record dropped/unsupported entries.
- Playwright action duration is a diagnostic wall-clock metric only. It is never called INP or field-equivalent.
- Field INP <=200 ms p75 remains the production target; local Event Timing is a lab proxy.
- Tracing retains browser/network evidence on failure, but a trace duration is not a standalone performance metric.

`browserScope` is closed and fixed by unit: `UNIT-002=baseline`, `UNIT-005=route`, `UNIT-007=derived-state`, `UNIT-008=render-a11y`, `UNIT-009=mutations`, and `UNIT-010=full-local`. Baseline/full-local collect the complete applicable registry. Route requires the seven UNIT-005 route/RSC operands; derived-state requires browser search/facet plus functional real-render/derivation parity while its DOM child supplies the other five operands; render-a11y requires the complete UNIT-008 browser operand set; mutations requires edit p95, whole-tree snapshot, client fan-out p95/nonmatch inspections, duplicate-save patch count, and functional mutation/interop integrity while its other children supply server/revision/rollback/concurrency predicates. A post-baseline report's `overall=PASS` evaluates its scope-owned metrics plus all required functional/auth/accessibility integrity. Metrics outside the fixed scope are absent and cannot be presented as passing evidence. Scope substitution or a report that does not match its prepared unit fails.

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

Required derivation/mutation decision fields in the same artifact and linked browser/D1 baselines:

- `M-DERIVE-CLOSED-MOVE-OPTION-WORK`: move-option collector invocations or visited-node count after a tree-identity change while the dialog is closed; hard threshold 0.
- `M-DERIVE-SIDEBAR-UNRELATED-RENDER-COUNT`: component-library/right-sidebar renders after an unrelated tree edit; hard threshold 0.
- `M-MUTATE-CLIENT-FANOUT-NONMATCH-INSPECTIONS`: nonmatching rows inspected while applying a project-component update with exactly 1,000 matches; hard threshold 0, proving O(matches) lookup rather than a full-tree scan.
- `M-MUTATE-DUPLICATE-SAVE-PATCH-COUNT`: authoritative tree patch/rebuild applications for one successful save; required exactly 1.

The decision writer consumes the complete closed operand registry in the canonical plan. In addition to the four fields above, its exact route/D1, scalar CPU, search/facet, full-tree recompute, unaffected-row render, DOM/window, scroll/long-frame, responsive/a11y, cursor-isolation, whole-tree snapshot, edit p95, client/server fan-out, revision, rollback, optimistic-ID, and concurrency IDs and thresholds must be present. Maximum metrics fail on `observed > threshold`; zero-count metrics fail on `observed != 0`; duplicate-save count fails on `observed != 1`; functional predicates fail unless `PASS`; missing/non-finite/unclassifiable values fail closed.

After `ESTIMATE_PERF_PLANNING_ADMISSION=.ai/99_scratch/estimate-sheet-performance/admissions/UNIT-001-planning.json bun run perf:estimate:prepare -- --unit=UNIT-001 --profile=limit --artifact-only --cleanup-not-applicable`, the run contains a validated immutable copy of `estimate-sheet-planning-admission.v1`. `perf:estimate:measure -- --unit=UNIT-001 --profile=limit --evidence-class=jsdom --budget-policy=record-only --tests=auto:dom-tests --gates=auto:fingerprint-reference,auto:typecheck,auto:error-handling --fixture-output=auto:fixture --output=auto:jsdom --no-build --no-browser --no-local-run` is the sole producer for the linked immutable pair. It writes/fsyncs temporary siblings in the run root, validates both schemas and reciprocal payload linkage, atomically renames without overwriting, and fsyncs the run directory. Only `perf:estimate:index` may project them to the two fixed current paths, and it rejects UNIT-001 unless the immutable planning-admission child is recursively validated and listed in `dependencySources[]`.

## D1 Measurement Method

Required surfaces: route context, tab tree, limit-tree row loading with exactly 1,500 node IDs, lazy subtree at depths 1/5/10, row update, move, bulk delete at 100, and project-component fan-out at 1/100/1000 matches.

Every D1 record includes statement name, normalized SQL hash, bind count, installed/provider bind-ceiling outcome, statement/query count, batch size, available duration/rows-read/rows-written values, `EXPLAIN QUERY PLAN`, selected index, seeded/cleaned counts, and evidence class. The 1,500-node row-load shape fails closed when one statement exceeds the proven ceiling; an activated `UNIT-005` may replace it only with deterministic bounded chunks whose total statement count is reported.

Local proof uses freshly compiled Better Auth DDL first and active `migrations/` second in one UUID `--persist-to` directory; its fixture also includes the allowlist, current legal acceptance, signed session, matching profile, UUID route IDs, and complete membership/access chain. The lifecycle test and `tests/vitest/cloudflare-better-auth-proof-script.test.ts` must agree on eight generated statements and the exact current five-table set. Hosted proof targets only bound `ARCH_DB` through `wrangler d1 execute ARCH_DB --remote --file ... --json`; it adds no Worker route or deploy. Each run generates exact IDs per table; hosted inventory includes profile, workspace/project/sheet membership/access rows and the six estimate hierarchy tables. Cleanup deletes those exact IDs and reconciles all eleven tables independently. A metadata-prefix cleanup is invalid for this schema and is forbidden.

## Strict Budgets

| Metric | Threshold |
|---|---:|
| Field INP production target (post-deploy RUM; pack outcome `NOT_EVALUATED`) | <=200 ms p75 |
| Lab Event Timing diagnostic target | <=200 ms p75 |
| Edit duration | <=75 ms p95 |
| Scroll frame gap | <=50 ms p95 |
| LoAF/long task | maximum <=50 ms and `over_50_ms_count=0` |
| Scalar-edit derived-state CPU | <=25 ms p95 |
| Scalar-edit full-tree recomputes | 0 |
| Closed-dialog move-option work | 0 |
| Unrelated sidebar renders after tree edit | 0 |
| Scalar-mutation whole-tree snapshots | 0 |
| Project-component client fan-out at 1,000 matches | <=75 ms p95 |
| Project-component nonmatching row inspections | 0 |
| Successful-save authoritative patch/rebuild count | exactly 1 |
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

`perf:estimate:decide` evaluates one explicit predicate per `UNIT-005` through `UNIT-009`. `UNIT-005` owns route/D1/bind-ceiling failures; `UNIT-007` owns derivation/search/totals/closed-dialog move-option/sidebar-render failures; `UNIT-008` owns mounted-DOM/scroll/LoAF/focus/virtualization failures after baseline regression repair; `UNIT-009` owns snapshot/mutation/duplicate-save-fan-out/revision/rollback/concurrency failures. `UNIT-006` uses exactly `UNIT-007.activate OR M-MUTATE-CLIENT-FANOUT-P95.fail OR M-MUTATE-CLIENT-FANOUT-NONMATCH-INSPECTIONS.fail OR M-GRAPH-ANCESTOR-LOOKUP-P95.fail OR M-GRAPH-COMPONENT-LOOKUP-P95.fail OR M-GRAPH-DUPLICATE-BYTES.fail`. Maximum metrics fail when observed > threshold; required-zero metrics fail when observed !=0; duplicate-save count fails when observed !=1; required functional predicates fail unless `PASS`; missing, non-finite, wrong-unit, stale-fixture, or unclassifiable inputs fail closed. No prose inference is permitted.

It then ranks only activated branches using:

1. count of failed hard thresholds;
2. normalized threshold overage;
3. count of affected required scenarios.

A branch is activated only when its explicit predicate is true. Ranking cannot activate a passing branch. Every nonactivated unit writes a hashed supersession receipt. Missing, stale, unmapped, or multiply mapped evidence makes the decision command fail.

## Canonical Outputs

The first 13 paths in `IMPLEMENTATION_PLAN.md` are index-owned current evidence projections; `evidence-index.json` is the fourteenth stable name and current registry. Before execution they are hashed `STALE` placeholders registered as ART-039..052, with ART-038 registering doc 30. Producers write once under `evidence/runtime/runs/<unit>/<run-id>-<application-short>-<input-short>/`; `--output=auto:<role>` resolves the per-unit pointer and rejects collisions. Each transition also writes an immutable registry snapshot. That registry maps the 13 evidence projection path/hash values to immutable source path/hash/history and has no cyclic self-entry; the journal and committed manifest carry its external path/hash. Starting from durable `evidence/`, every newly created directory is child-fsynced then parent-fsynced before descent.

The transition journal stores immutable evidence/registry sources plus every evidence/registry projection target and `oldProjection:{exists,sha256,bytesBase64}`, newly created directory components, and old/new manifest/index metadata. Before the `plan-pack.json` commit point, recovery restores old bytes or unlinks a projection that was formerly absent and fsyncs the parent; it prunes only journal-created empty directories deepest-first with parent fsync. After commit, it may recopy only already verified immutable bytes and rebuild manifest projection records; it never invents or mutates immutable bytes. First-transition fault tests cover mkdir, directory/parent fsync, temp-file fsync, rename, and post-rename fsync, including the first registry transition. Local cleanup receipt precedes indexing; response-loss recovery invalidates producer evidence. An unresolved journal blocks all transitions except `--recover`.

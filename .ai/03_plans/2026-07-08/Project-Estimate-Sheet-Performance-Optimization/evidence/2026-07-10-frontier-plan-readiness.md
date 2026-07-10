# Frontier Plan-Readiness Evidence - 2026-07-10

## Claim

This artifact proves the planning claim that the pack is executable without invention. It does not prove the product implementation, browser budgets, hosted D1 behavior, or release readiness.

## Baseline

- Initial Git HEAD before target-folder edits: `a9ba86c0ffa39a9dcb91625861edde9603d7869c` (historical planning-start provenance only).
- Target-folder status/diff before edits: empty; SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- Shared worktree: dirty outside the target folder; no unrelated file was reverted.
- Current re-admission source snapshot uses `estimate-sheet-source-fingerprint.v2` from hashed helper `evidence/source-fingerprint-v1.mjs` (SHA-256 `55b0e4a94f773d97b80fa49a29fe2d77189e081de47b28aa0cc4bdab17b787ea`). Git HEAD is `081a0757a9d7f34e75342a18e353f3014403de1e`; the 1,997-path planning-admission list SHA-256 is `8d15b41d4bb5434685064eb6ae250d4c80de520cd469576e1405e1e9d57b3aa9`; scoped status SHA-256 is `e50b78d85091a2d5757ac0662be48b57584d9f0cce1e890439edaa3701dad79b`; scoped diff/untracked-record SHA-256 is `ed825bd793c211fdb248653718edf88f1218dc274a5ea921843bcf966cc34494`. Its application fingerprint covers 1,173 actual filesystem files with path-list SHA-256 `6e367b36f4cf00f40ae7c952324243222816c516c1600082a241c67df51e4903` and content SHA-256 `a02622ea6a6b82eb8791ded4cc7b449541f80285689d84b61d61868b1eb4e14c`; its producer fingerprint covers 836 files with path-list SHA-256 `61c52ca48c207accb9b67a40fba82862bec136156bd54ab47c30c78f231a91db` and content SHA-256 `7ae18e3b8583f0df8e39cd8276c8d70cb4d8e5cd2cc14f1608f486d5eb5384c3`. Five byte-identical readings from 2026-07-10 17:45:02 through 17:46:07 +08:00 established the quiet window after the Estimate Sheet Tree lease release, and the exact 192-test tree suite, typecheck, scoped diff hygiene, and post-test fingerprint all passed. The helper strips inherited `GIT_*` controls, fixes locale/config/diff semantics, separately hashes Git admission state, and hashes actual application/producer filesystem contents and executable modes; the package application projection excludes scripts. The plan folder is outside every source scope.
- Baseline plan validation: failed because `plan-pack.json` was absent.
- Baseline independent architect verdict: `NOT_READY`.
- Baseline independent critic verdict: `NOT_READY`.

## Current Source Evidence

Read-only exploration refreshed the route, client, repository, mutation, virtualization, and test surfaces. The findings that materially changed the plan were:

1. `readEstimateNodeRouteContextD1FastPath` is still a null stub.
2. The sheet has full-tree derivation/snapshot work beyond the DOM virtualizers.
3. Express editing disables row virtualization.
4. Client project-component fan-out is O(N); server fan-out uses JSON identity filtering plus per-match batched writes and is not assumed O(1).
5. Existing direct tests cover bulk-delete partial failure, broadcast filtering, and tree DnD.
6. Three focused contract tests contain stale expectations for the current Better Auth five-table DDL, route fast-path authorization, and protected workshop layout; they are the first repair/classification work in `UNIT-001`.
7. Existing jsdom scale evidence reaches 500 rows, not the 5,000-row supported ceiling.
8. Historical route/generic D1 artifacts are stale for current Cloudflare/D1 pass claims.
9. The concurrent tree plan now provides D1 node restore and released its leases after 192 focused tests; D1 row restore still throws while row Undo is exposed, so `UNIT-009` owns the remaining provider/UI contract repair.

The detailed file/symbol map is in `IMPLEMENTATION_PLAN.md` and `28_INVENTORY_SOURCE_MAP.md`.

## Research Validation

| Source | Current planning impact |
|---|---|
| [web.dev: Optimize Interaction to Next Paint](https://web.dev/articles/optimize-inp) | A <=200 ms p75 target is a field INP target. Lab interaction timing is diagnostic and must not be labeled field-equivalent. |
| [Chrome: Long Animation Frames API](https://developer.chrome.com/docs/web-platform/long-animation-frames) | Browser proof records LoAF/long-task entries to diagnose slow interaction frames. |
| [MDN: PerformanceEventTiming](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceEventTiming) | Lab interaction records use Event Timing/interaction IDs where supported. |
| [Cloudflare D1 metrics and analytics](https://developers.cloudflare.com/d1/observability/metrics-analytics/) | D1 proof records available query duration, rows read/written, and evidence class; hosted claims require hosted evidence. |
| [Cloudflare D1 index guidance](https://developers.cloudflare.com/d1/best-practices/use-indexes/) | Indexes require exact query-shape and query-plan proof; speculative indexes are rejected. |
| [Cloudflare D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/) | Hosted proof rechecks current free-tier allowances and fails before seeding if the run breaches the pack's safety threshold. |
| [Playwright retries](https://playwright.dev/docs/test-retries) | Retry/flaky classification cannot turn a failed performance budget green. |
| [Playwright tracing](https://playwright.dev/docs/api/class-tracing) | Traces are failure diagnostics, not standalone performance metrics. |
| Installed Next.js environment-variable guide | `NEXT_PUBLIC_*` values are build-time inlined/frozen; rollout was changed to server-resolved deployment modes. |
| Installed Next.js loading/lazy-loading guides | The plan preserves Suspense/loading boundaries and measures the route/RSC/client split before changing it. |

Official limits and API behavior must be rechecked in the implementation run before hosted proof because provider guidance can change.

## Baseline Defect Closure

| Baseline defect | Repair |
|---|---|
| Missing manifest | Added schema-versioned `plan-pack.json`. |
| Competing execution guides | Added sole canonical `IMPLEMENTATION_PLAN.md`; docs 11/21 are superseded for execution. |
| Owner decisions `OPEN-01..07` | Replaced with reversible `DEC-AUTO-*` records and evidence-based reopen triggers. |
| Contradictory phase gates | Replaced by one `UNIT-001..011` DAG and ready slice. |
| Unstable Phase 0 artifact lists | Replaced by immutable no-overwrite run artifacts plus 13 index-owned current evidence projections and one current registry whose own immutable hash is stored externally. |
| Non-runnable unit prose | Every canonical unit now has ownership, paths, symbols/behavior, commands, evidence, exit, failure, cleanup, and resume state. |
| Interop count 17 | Reconciled 19 unique IDs and seven direct-test gaps. |
| Stale test inventory | Corrected bulk-delete, broadcast, and tree-DnD test paths; stale contract tests assigned to `UNIT-001`. |
| Conflicting graph names | Standardized on `componentInstanceRowIdsByIdentity`. |
| Unsupported O(1) server fan-out claim | Replaced with measured JSON-filter/batched-write contract. |
| Incomplete evaluator | Added fixtures, auth/server provenance, raw samples, percentile method, Event Timing/LoAF, query metrics, strict fail semantics, and deterministic decision output. |
| Invalid <=2%/10-run flake claim | Ten runs are smoke only; <=2% observed failure rate requires at least 100 repetitions. |
| Build-frozen live rollback flags | Replaced with five deployment-scoped server `off|shadow|on` modes plus explicit old-client/in-flight rollback proof; no per-estimate instant-toggle claim. |
| Non-reproducible local auth/state | Added per-unit UUID roots, shared `--persist-to` state across migration/seed/server/proof, generated Better Auth state, leased ports, validation, and exact cleanup commands. |
| Undeployable hosted proof route | Removed the route. `UNIT-011` uses direct `wrangler d1 execute ARCH_DB --remote` with binding/database preflight and no deploy. |
| Unsafe hosted metadata cleanup | Replaced with a run UUID lease, exact eleven-table keys, dependency-order deletion, per-table reconciliation, zero-count verification, and unambiguous cleanup-only recovery. |
| Implicit optimized-path proof | Added fresh build plus explicit `off,shadow,on,rollback` producer/check commands for every active unit and the integrated mode matrix. |
| Incomplete runtime traceability | Added durable package/unit/evidence/requirement/criterion/test/scenario IDs and a lock-protected journaled evidence-index/status transition command with `plan-pack.json` as the commit point. |
| Undefined graph activation operands | Defined exact units, deterministic limit-fixture collectors, 3+30 sampling, <=5 ms lookup thresholds, zero duplicate-byte threshold, raw `UNIT-001` producer output, and mechanical fail calculation. |
| `UNIT-001` indexed absent durable files | Added one exact immutable dual-output producer, constructible fixture/report payload linkage, schema/hash checks, fsync ordering, then projection/index ordering. |
| Unsafe build/source parallelism | Serialized every maker unit. `UNIT-001` bootstraps the shared producer/package-command surface before measurement; Units 001-004 freeze one cohort; Units 005-009 carry continuous application/producer lineage; Units 010-011 share the final pair. |
| Cleanup and evidence journals were not power-loss/response-loss closed | Added durable-ancestor directory-chain fsync, absent-old-projection restoration, stop/drain-before-delete, explicit cleanup states, uncertain-commit exact-zero recovery with producer invalidation, complete projection-record recovery plus existing immutable-byte verification, and first-transition boundary fault tests. |
| Source fingerprint was prose-only, environment-sensitive, and omitted build inputs | Added executable `estimate-sheet-source-fingerprint.v2`, deterministic Git environment/config semantics, actual filesystem application/producer scopes including `public/`, package projection, mode/content records, and exact nested manifest verification. |
| Runtime report shape admitted hybrid or incomplete canonical evidence | Added strict complete-report variants, non-indexable attempt records, explicit fixture/cleanup/hosted-recovery schemas, route-D1/full-local integration envelopes, and negative forbidden-field/fingerprint/linkage tests. |
| Hosted manifest could be undiscoverable or ambiguous after the first seed | Made one `cleanup.json` both lease and exact-ID journal, durable from the known `.ai/` ancestor before seed; explicit UUID cleanup recovery handles multiple unresolved runs and never writes canonical proof. |
| Journal wording overclaimed artifact-byte reconstruction | Producers now write immutable run artifacts; mutable paths are projections only. Pre-commit recovery restores bytes or true absence, while post-commit recovery rebuilds projection records and verifies existing immutable bytes. |
| Fixed output names contradicted append-only evidence | Defined immutable source paths, collision rejection, current-pointer allocation, 13 index-owned evidence projections plus a non-self-hashing current registry, preserved history, and exact `auto:<role>` command semantics. |
| Fingerprint lifecycle self-invalidated its own baseline | Limited plan admission to pre-edit UNIT-001, froze Units 001-004 after shared bootstrap, and defined dual-digest predecessor admissions plus owned active-unit deltas and final UNIT-010/011 equality. |
| Preview lifecycle ended before optimized browser proof and cleanup covered only one process | Required rollback/all-off evidence followed by one sole active final preview, and journaled every intermediate/final preview in ordered `previewProcesses[]` for drain/exit/closed-port cleanup. |
| Child evidence could disappear or mutate after envelope validation | Restricted durable child references and added recursive dependency-byte revalidation plus persisted `dependencySources[]` at index commit and recovery. |
| Exit-status-only gates were not durable same-run proof | Added command receipts and an allowlisted gate wrapper with exact argv/output/build hashes, dual-fingerprint equality, same-run validation, and explicit consumer dependencies. |
| Mutating measurement children could share fixture state | Allocated isolated `mode`, `browser`, and `d1` namespaces from one logical pre-state, with role-bound mutation/command identity and complete cleanup reconciliation. |
| UNIT-002 browser producer and checker collided on one immutable role | Split the producer to `auto:browser` and the checker receipt to `auto:browser-check`; the index requires both without overwriting either. |
| UNIT-002 had no baseline preview producer | Added an explicit nonblocking, process-journaled all-five-modes-off server launch whose active descriptor is consumed by Playwright and terminated only by cleanup. |
| Three auto-output producers did not identify their per-unit current pointer | Added exact `--unit` selectors to UNIT-004 decision and UNIT-011 hosted/release commands, with missing/ambiguous selector refusal tests. |
| UNIT-009's mutating Playwright receipt lacked fixture-state provenance | Added a discriminated fixture-mutation block to fixture-bound test receipts and required mutation-proof/index revalidation against the prepared namespace and command journal. |
| Validation strategy UNIT-003 commands bypassed canonical receipts/checker joins | Replaced the excerpt with the exact validate/test/D1/check/cleanup/index sequence and removed or gate-wrapped standalone evidence shortcuts. |
| Orphan a11y behaviors | Removed invented partial-fan-out/offline/cancellable-write/session-modal contracts; keyboard move uses the semantic move decision. |
| Same-agent/browser readiness caps | Removed; provenance is metadata and runtime proof controls implementation/release status instead. |

## Planning Acceptance Evidence

The re-admission candidate proves `AC-001` through `AC-011` and `TEST-001`. `AC-012`, `TEST-007`, `GATE-VERIFY-001`, `GATE-CLEAN-001`, and `EVID-012` remain failed or stale until independent architect and critic reviews accept the same exact candidate hashes. Runtime tests `TEST-002` through `TEST-006` remain `PLANNED` in the manifest.

Pre-promotion readiness sequence:

1. Planning prompt suite validation passes.
2. Plan-pack validation passes with current hashes.
3. Adversarial copies fail for missing manifest, stale artifact hash, orphan link, DAG cycle, and inconsistent status/next-unit cases.
4. `git diff --check` passes for the target folder.
5. Marker/path/source scans find no unresolved owner decision, stale active execution authority, missing referenced path, or P0/P1 contradiction.
6. Independent architect and critic reviews must return `CLEAN` for the same exact pre-promotion candidate; a separate fingerprint verifier must also return `CLEAN`.

## Final Verification Receipt

Five semantic review candidates were rejected. The first three drove the canonical decision/risk/command/evaluator/Better-Auth/env/traceability/cleanup repairs. The fourth exposed the prose-only fingerprint, missing build inputs, universal hybrid report shape, hosted directory-durability gap, and projection-recovery overclaim. The fifth exposed environment-sensitive Git identity, a self-invalidating baseline lifecycle, illegal UNIT-005 hybrid evidence, impossible local exit timing, incomplete/cyclic fixture and cleanup schemas, first-transition absence recovery, ambiguous hosted cleanup, and fixed-path/immutable-evidence contradictions. Its repair pass added the deterministic v2 dual fingerprint, full UNIT-001 shared-tool bootstrap, continuous dual-digest lineage, explicit complete/attempt/fixture/cleanup/integration/recovery schemas, immutable runs with indexed projections, and durable exact-run cleanup. A final pre-freeze audit then closed multi-preview cleanup, optimized final-state proof, recursive child dependency durability, command-receipt ordering, role-isolated fixture namespaces, and the UNIT-002 browser/checker output collision; those repairs are recorded in `LOOP_LEDGER.md`.

Two historical exact-review attempts were invalidated without verdict when concurrent shared-worktree edits changed the scoped/application fingerprints; no concurrent source was reverted or excluded. A later candidate was promoted after clean same-hash reviews, but the Estimate Sheet Tree implementation subsequently invalidated that source baseline and withdrew admission. The current re-admission candidate is intentionally `NOT_READY` until its exact plan-pack, internal manifest, canonical-plan, helper, and clean/hostile fingerprint hashes are frozen below and accepted by fresh architect, critic, and fingerprint reviews. Only then may the mechanical authoritative transition set `AC-012=PASS`, `TEST-007=PASS`, all units `READY`, `package_status=IMPLEMENTATION_READY`, `next_unit=UNIT-001`, and publish dependency-closed `SLICE-001`.

## Validation Gap

Browser automation was intentionally skipped for this planning-only run because it would prove runtime behavior, not whether the plan packets are executable. Browser proof is mandatory in `UNIT-002` and `UNIT-010`.

Supermemory health passed during this repair. Its targeted search returned no relevant plan-pack memory, so current source plus canonical `.ai` documents remain the authority and no Supermemory result is used as readiness evidence.

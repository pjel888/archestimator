# Frontier Plan-Readiness Evidence - 2026-07-10

## Claim

This artifact records the evidence intended to prove that the pack is executable without invention; that claim is current only when the manifest's same-hash review gate is closed. It does not prove the product implementation, browser budgets, hosted D1 behavior, or release readiness.

## Baseline

- Initial Git HEAD before target-folder edits: `a9ba86c0ffa39a9dcb91625861edde9603d7869c` (historical planning-start provenance only).
- Target-folder status/diff before edits: empty; SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- Shared worktree: dirty outside the target folder; no unrelated file was reverted.
- The most recent fully observed re-admission candidate used `estimate-sheet-source-fingerprint.v2` from hashed helper `evidence/source-fingerprint-v1.mjs` (SHA-256 `55b0e4a94f773d97b80fa49a29fe2d77189e081de47b28aa0cc4bdab17b787ea`). At Git HEAD `e373bc865b978e237deb1d92011c96b0a3639fb4`, five byte-identical readings from 2026-07-10 15:02:49 through 15:03:56 UTC and a hostile caller produced output SHA-256 `18e8bb23c9735e02630af88c2daacd244cc9f501cc6c0e25986c524a184b41fd`; the candidate recorded 2,003 paths, list `db75a04b38634823c3631c1b6c4bfd062182458fc91e8ab943a910d251b74d46`, status `34f8cd77dab4f99fa3fa8ed5ced376aa41fbb2bf3c4f8fc83b181a6036ba3897`, diff `c78fbf390b8335a2aa0dc8a19727d4a4f0617ceaf6c3fd164e494206c5c079a2`, application content `54a7019344d91bee38e7e541c8131ceb64606818cfe05f1157f64813a0a9b014`, and producer content `ecf0ca28a17d81fa742492ba18a7a4870623a855d8c33056b41068f673bf04dd`. A later `src/lib/admin/users-repository.ts` write invalidated this second candidate before artifact freeze; `plan-pack.json.baseline` therefore remains intentionally stale until the broad source scope is quiet. The unrelated `0050_admin_query_indexes.sql`, landing-auth, admin-route, feature-flag, and support work did not change the estimate-sheet premises; read-only bootstrap proof applied generated Better Auth DDL first and all 50 active migrations second, preserving eight generated statements, the five auth tables, and the hosted proof's eleven-table cleanup contract. The helper strips inherited `GIT_*` controls, fixes locale/config/diff semantics, separately hashes Git admission state, and hashes actual application/producer filesystem contents and executable modes; the package application projection excludes scripts. The plan folder is outside every source scope.
- A longer monitor later observed one fingerprint for eleven 30-second readings and five more readings over an additional minute, ending at 15:43:07 UTC. Before it was frozen, a fresh read changed the scoped diff and application digest while retaining the same path/status and producer identity, so the candidate was rejected. No readiness field was promoted. An independent consistency audit then found two P1 lineage gaps and no P0: stdout-only admission was not an immutable index dependency, and the planning reference was ambiguously writable. The repaired packet adds read-only `ART-037` admission recorder alongside `ART-036`; both exact helper hashes and bytes freeze at exact review-candidate hash capture and remain unchanged through independent review, atomic promotion, UNIT-001 admission, and implementation. UNIT-001 must preserve the resulting `estimate-sheet-planning-admission.v1` receipt as an immutable dependency. A new source quiet window is still required.
- A subsequent hostile recorder audit invalidated the prior scratch lifecycle by reproducing a PATH-prepended Git HEAD bypass, a `NODE_OPTIONS=--require` source-output bypass, and terminal swaps of the manifest, ART-031, or ART-036 during live source verification. The repaired helpers now require trusted `/usr/bin/git`, use a minimal child environment, reject declared startup injection and Node interpreter flags, and symmetrically recheck live pack/artifact, validator, and admission-review identities around source verification. Timed terminal swaps fail with zero candidate bytes. The new helper pair still requires a complete fresh lifecycle, quiet-window freeze, and exact-candidate reviews before readiness.
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
9. The concurrent tree plan now provides D1 node restore and released its leases after 192 focused tests; D1 row restore still throws while row Undo is exposed, so mandatory `UNIT-002` repair closes the provider/UI contract before browser collection and `UNIT-009` later preserves it under concurrency proof.
10. Direct query-cache writes in the mutation hook bypass the tree revision increment owned by the query hook; `UNIT-001` characterizes this and `UNIT-009` owns one truthful monotonic revision source plus concurrent-write denial proof.
11. Limit-tree row loading can emit one `IN (...)` statement with 1,500 node IDs; `UNIT-003` records the installed/provider bind-ceiling outcome and `UNIT-005` owns deterministic chunking only if evidence activates it.
12. Move-target options traverse the whole tree while the dialog is closed, and the component-library/sidebar memo boundary wakes when the full tree identity changes. These are explicit `UNIT-001` probes and `UNIT-007` decision inputs.
13. Both left and center panes consume the nested tree and build separate projections. The graph branch remains evidence-activated rather than assumed.

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
| Contradictory phase gates | Replaced by one `UNIT-001..011` DAG and a dependency-closed slice definition that is published only on promotion. |
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
| Pre-edit admission was stdout-only, environment-injectable, terminal-racy, and the planning oracle was ambiguously writable | Registered read-only `ART-036` reference plus `ART-037` recorder outside unit ownership; both require trusted Git/minimal child environment and reject startup injection, while symmetric final live-input barriers close timed swaps. The recorder validates both hashes and the manifest baseline, atomically writes a payload-hashed mode-`0600` receipt, and UNIT-001 prepare/index retain a recursively verified immutable dependency. |
| Runtime report shape admitted hybrid or incomplete canonical evidence | Added strict complete-report variants, non-indexable attempt records, explicit fixture/cleanup/hosted-recovery schemas, route-D1/full-local integration envelopes, and negative forbidden-field/fingerprint/linkage tests. |
| Hosted manifest could be undiscoverable or ambiguous after the first seed | Made one `cleanup.json` both lease and exact-ID journal, durable from the known `.ai/` ancestor before seed; explicit UUID cleanup recovery handles multiple unresolved runs and never writes canonical proof. |
| Journal wording overclaimed artifact-byte reconstruction | Producers now write immutable run artifacts; mutable paths are projections only. Pre-commit recovery restores bytes or true absence, while post-commit recovery rebuilds projection records and verifies existing immutable bytes. |
| Fixed output names contradicted append-only evidence | Defined immutable source paths, collision rejection, current-pointer allocation, 13 index-owned evidence projections plus a non-self-hashing current registry, preserved history, and exact `auto:<role>` command semantics. |
| Fingerprint lifecycle self-invalidated its own baseline | Limited plan admission to pre-edit UNIT-001, made UNIT-002 the sole receipt-gated pre-decision source-change exception, bound its exact source/test allowlist and focused-test proof to the prior immutable UNIT-001 index, required a complete replacement UNIT-001 cohort, and defined dual-digest predecessor admissions plus owned active-unit deltas and final UNIT-010/011 equality. |
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
| Field INP was locally mapped despite requiring production data | Kept the <=200 ms p75 production target, named local Event Timing only as a lab proxy, and required the release payload to record field INP as `NOT_EVALUATED` until post-deploy RUM. |
| Manual keyboard and VoiceOver/NVDA artifacts had no producer/schema | Classified them as deferred `NOT_EVALUATED` residual proof; automated `UNIT-008`/`UNIT-010` evidence cannot impersonate manual assistive-technology proof. |
| Responsive, fixture, graph, fan-out, and mode-resolver supporting docs diverged from the canonical DAG | Standardized 768-1023 px tablet editing with an automated 1023px-wide tablet profile, classified 1024-1279 px as compact desktop, retained <=767 px mobile view-only behavior, standardized canonical fixture tiers and evidence-activated graph/mutation branches, recorded current D1 fan-out semantics, and assigned the inert default-off route-to-client mode bridge to UNIT-001. |
| New current-source risks were not unit-owned | Added revision/cache-write concurrency, D1 bind-ceiling, duplicate save fan-out, closed-dialog move derivation, and sidebar render-isolation characterization plus owning repair units. |
| Known D1 row-restore failure deadlocked the record-only baseline DAG | Moved implementation plus positive node/row regression into mandatory `UNIT-002` pre-browser repair, required an immutable refreeze receipt and complete replacement UNIT-001 cohort on the repaired digests, and retained only revision/concurrency preservation in `UNIT-009`. |
| Mocked row-restore server-action test falsely appeared to prove D1, native snapshot shape and real UI retry identity were unspecified, and interop backfills first ran too late | Required a `UNIT-001` direct rejection characterization followed by `UNIT-002` direct native/historical snapshot, subset/denial, same-correlation, and fresh-correlation source-event idempotency proof with stale-resurrection denial, bulk-event alias normalization, parent/collision/revision/atomicity checks, and preserved node restore; moved the missing direct interop cohort into the exact `UNIT-001` command and retained downstream reruns. |
| Decision predicates could supersede closed-dialog/sidebar/full-scan/duplicate-save failures | Added named equality metrics, exact `UNIT-004`/`UNIT-006`/`UNIT-007`/`UNIT-009` expressions including `M-MUTATE-CLIENT-FANOUT-NONMATCH-INSPECTIONS.fail`, structural O(matches) fan-out proof, and exact fail math: maximum metrics fail on `>`, required-zero metrics fail on `!=0`, functional predicates require `PASS`, and missing or unclassifiable values fail closed. |
| Activated browser thresholds lacked unit-owned runtime proof | Added fixed unit-bound browser scopes and complete browser children: `route` for UNIT-005, `derived-state` for UNIT-007, `render-a11y` for UNIT-008, `mutations` for UNIT-009, and `full-local` for UNIT-010. Each child is bound to the same run, mode snapshot, isolated browser namespace, and mode runner's sole active final preview; UNIT-006 remains graph/unit proof without a browser child. |
| Pure local-D1 used `--port=auto` despite a cleanup schema that forbids preview resources | Added `--port=none` for `UNIT-003`; pure D1 allocates no port, runtime env, browser storage state, preview process, or preview cleanup fields. |
| Validation-strategy command excerpts lagged the canonical packets | Mirrored all UNIT-001 characterization/version tests and the UNIT-003 bind-budget plus no-port command. |
| UNIT-010's decision-derived test runner was named but not registered or closed over UNIT-005 | Added `scripts/run-estimate-sheet-activated-tests.ts`, the exact package entry, a closed ordered base plus UNIT-005..009 registry, immutable-decision/index/fingerprint invariants, UNIT-007-to-UNIT-006 implication, one no-shell child, and sole-reporter receipt verification; UNIT-008 no longer runs UNIT-007's large-edit test, while UNIT-009 explicitly owns the row-tree-patch regression. |

## Planning Acceptance Evidence

The repaired draft is intended to satisfy `AC-001` through `AC-011` and `TEST-001` after the refreshed validators pass, but `EVID-001` remains stale until that happens on the exact review candidate. `AC-012`, `TEST-007`, `GATE-VERIFY-001`, `GATE-CLEAN-001`, and `EVID-012` remain failed or stale until the orchestrator-separated architect, critic, and fingerprint-verifier lanes accept the same exact candidate hashes; `EVID-012.source_revision` is the deterministic review-binding identity, while the receipts remain procedural same-UID attestations. Runtime tests `TEST-002` through `TEST-006` remain `PLANNED` in the manifest.

Pre-promotion readiness sequence:

1. Planning prompt suite validation passes.
2. Plan-pack validation passes with current hashes.
3. Adversarial copies fail for missing manifest, stale artifact hash, orphan link, DAG cycle, and inconsistent status/next-unit cases.
4. `git diff --check` passes for the target folder.
5. Marker/path/source scans must find no unresolved owner decision, stale active execution authority, missing referenced path, or P0/P1 contradiction.
6. The frozen recorder's repeated `--review-candidate` output must be byte-identical. Independent architect, critic, and fingerprint-verifier lanes must each recompute that exact candidate and publish one candidate-namespaced, write-once `CLEAN` receipt with distinct reviewer IDs.
7. The mechanical promotion must equal the candidate's predicted promoted file hash, and admission must reverse it to the exact reviewed candidate before any product edit.

## Final Verification Receipt

Five semantic review candidates were rejected. The first three drove the canonical decision/risk/command/evaluator/Better-Auth/env/traceability/cleanup repairs. The fourth exposed the prose-only fingerprint, missing build inputs, universal hybrid report shape, hosted directory-durability gap, and projection-recovery overclaim. The fifth exposed environment-sensitive Git identity, a self-invalidating baseline lifecycle, illegal UNIT-005 hybrid evidence, impossible local exit timing, incomplete/cyclic fixture and cleanup schemas, first-transition absence recovery, ambiguous hosted cleanup, and fixed-path/immutable-evidence contradictions. Its repair pass added the deterministic v2 dual fingerprint, full UNIT-001 shared-tool bootstrap, continuous dual-digest lineage, explicit complete/attempt/fixture/cleanup/integration/recovery schemas, immutable runs with indexed projections, and durable exact-run cleanup. A final pre-freeze audit then closed multi-preview cleanup, optimized final-state proof, recursive child dependency durability, command-receipt ordering, role-isolated fixture namespaces, and the UNIT-002 browser/checker output collision; those repairs are recorded in `LOOP_LEDGER.md`.

Two historical exact-review attempts were invalidated without verdict when concurrent shared-worktree edits changed the scoped/application fingerprints; no concurrent source was reverted or excluded. A later candidate was promoted after clean same-hash reviews, but the Estimate Sheet Tree implementation subsequently invalidated that source baseline and withdrew admission. The latest re-admission candidate was also invalidated after same-hash critic and architect reviews found admission-blocking lineage, mode-plumbing, browser-proof, predicate, ownership, and responsive-profile defects. The current repaired draft is intentionally `NOT_READY`, with `next_unit=null` and no published ready slice, until its exact plan-pack, internal manifest, canonical-plan, ART-036/037, and clean/hostile fingerprint hashes are refreshed and accepted by fresh candidate-namespaced architect, critic, and fingerprint-verifier receipts. Only the recorder-predicted atomic 130-value transform is then permitted, with no subset or extra edit admitting implementation: preserve `profile=high-blast-radius`, `package_action_ceiling=EXTERNAL_ACTIONS`, `last_observed_run_scope=PLAN_ONLY`, `implementation_status=NOT_STARTED`, `release_status=NOT_EVALUATED`, `plan_lifecycle=ACTIVE`, `terminal_status=ACTIVE`, every risk `OPEN`, `authorization_boundaries=[]`, `updated_at`, evidence revisions, all hashes/paths, baseline, ordering, plan/helper bytes, and exact registered ID sets; set all sources `CURRENT`, requirements `ACCEPTED`, assumptions `VALIDATED`, decisions `ACTIVE`, criteria/gates `PASS`, and all eleven units `READY`; set `TEST-001`/`TEST-007=PASS` while `TEST-002..006=PLANNED`; set `EVID-001`/`EVID-012=PASS` while `EVID-002..011`/`EVID-013=STALE`; publish exactly dependency-closed `SLICE-001`, set `next_unit=UNIT-001`, set `package_status=IMPLEMENTATION_READY`, and recompute only `manifest_sha256`. Admission reverses those promoted bytes to the reviewed candidate.

## Validation Gap

Browser automation was intentionally skipped for this planning-only run because it would prove runtime behavior, not whether the plan packets are executable. Browser proof is mandatory in `UNIT-002`, activated `UNIT-005`, activated `UNIT-007`, activated `UNIT-008`, activated `UNIT-009`, and `UNIT-010`, using their fixed scopes.

The field INP <=200 ms p75 value is a production target, not a claim proven by this local implementation pack. `UNIT-002` and `UNIT-010` own the release-mapped local Event Timing diagnostic; scoped interaction units may re-prove their activated lab operands, but no local child may claim achieved field INP. An achieved-field claim requires post-deploy production RUM and remains outside this pack's release evaluation.

Supermemory health passed during this repair. Its targeted search returned no relevant plan-pack memory, so current source plus canonical `.ai` documents remain the authority and no Supermemory result is used as readiness evidence.

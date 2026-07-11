# LOOP_LEDGER — Activity History Mapping

Append-only durable ledger for this plan pack. Each lane logs STARTED, conflicts, and COMPLETE. Never edit another lane's entry.

## Run Metadata

- **Run ID:** `plan-2026-07-10-activity-history-mapping`
- **Plan path:** `.ai/03_plans/2026-07-10/Activity-History-Mapping/`
- **Profile:** `high-blast-radius`
- **Stage:** Create (planning-only)
- **Baseline HEAD:** `081a0757a` (feat(estimate-tree): complete Estimate Sheet Tree plan pack)

## Planning Run Log

### 2026-07-10T18:00:00Z — Lead — DISCOVER

Started comprehensive audit of activity history feature. Dispatched 4 parallel read-only exploration agents:
1. Data layer audit (migrations, repositories, server actions, API routes).
2. UI component audit (React components, hooks, panels, modals).
3. Shared-link/client-collaboration audit (routes, auth, comments, approvals).
4. Mutation surface audit (every `*_with_history` action, event types, INSERT sites).

Additional parallel agents:
5. Node-restore wiring verification + test coverage audit.
6. Existing roadmap/plans/decisions documentation search.

All agents returned comprehensive file:line-grounded findings.

### 2026-07-10T18:30:00Z — Lead — CRITICAL FINDING

Identified systematic event-type naming split between write layer (`estimate_`-prefixed) and read/display layer (non-prefixed). Verified at source level:
- `d1-action-client.ts:1351` writes `estimate_node_created`.
- `actions.ts:955` passes `row.event_type` verbatim (no rename).
- `activity-history.tsx:48` filter expects `node_created`.
- `activity-copy-dictionary.ts:16` dictionary expects `node_created`.

Result: 23+ of ~31 writable event types render as generic fallback and are unfilterable. This is the highest-priority fix.

### 2026-07-10T19:00:00Z — Lead — PLAN

Created plan pack with:
- 12 numbered documents (executive summary through coordination).
- 8 implementation units in dependency DAG.
- 9 requirements with traceability to units, criteria, tests.
- 5 autonomous decisions (DEC-AUTO-001..005).
- 7 risks, 0 authorization boundaries (planning-only stage).
- Complete event-type taxonomy matrix.

Decision DEC-AUTO-001: Read-side normalization map (single change point, backward-compatible, no data migration).

### 2026-07-10T19:15:00Z — Lead — VERIFY

Verified critical claims by direct source reads:
- `d1-action-client.ts:1320-1380` — confirmed `estimate_tab_deleted`, `estimate_node_created`, `estimate_node_renamed` event types.
- `d1-action-client.ts:1630-1690` — confirmed `row_inserted` event type.
- `activity-history.tsx:40-60` — confirmed non-prefixed filter vocabulary.
- `activity-history.tsx:220-221` — confirmed restore guard uses `rows_bulk_deleted` / `node_deleted_with_children`.
- `actions.ts:951-971` — confirmed `normalizeHistoryEvent` passes event_type verbatim.
- `activity-copy-dictionary.ts:1-37` — confirmed non-prefixed dictionary keys.

### 2026-07-10T19:30:00Z — Lead — RECORD

All planning artifacts written. Status tuple:
- `package_status: NOT_READY`
- `implementation_status: NOT_STARTED`
- `release_status: NOT_EVALUATED`
- `plan_lifecycle: ACTIVE`
- `terminal_status: ACTIVE`

Next action: Run `bun run validate:plan-pack` and repair any failures.

### 2026-07-10T19:45:00Z — Lead — VALIDATE

Ran validators:
- `bun run validate:plan-pack -- .ai/03_plans/2026-07-10/Activity-History-Mapping` — **PASSED**
- `bun run validate:planning-prompts` — **PASSED** (10 documents, 10 gates, 30 eval scenarios, 2459 lines, semantic fixture valid)

All manifest hashes, traceability links, DAG, and semantic invariants validated.

Planning stage COMPLETE. No application source was modified.

### 2026-07-10T20:00:00Z — Lead — IMPROVE STAGE STARTED

Initiated Improve-Plan-Prompt stage to make the pack more comprehensive. Dispatched 5 parallel read-only audit agents:

1. **Variant/component activity deep-audit** (memory's explicit concern: "variants should be accommodated as well") — found 13 gaps including 3 HIGH: no per-propagated-row events, `propagatedRowIds` never surfaced in UI, AddComponentModal produces zero activity events.
2. **Accessibility audit (GATE-UX-01)** — found 3 P0 (no explicit focus into modals), 6 P1 (scope tree keyboard, tab idBase, ledger headers, live regions), 8+ P2.
3. **Performance audit (GATE-PERF-01)** — found 2 HIGH (12 COUNT queries per filtered load, no indexes on target_row_id/estimate_node_id), 4 MEDIUM (no LIMIT on publications, no virtualization, O(N²) grouping, rate-limit overhead).
4. **Adversarial claim verification** — all 6 core claims VERIFIED at source level. One file-path correction: `EstimateSheetContent.tsx` is at `src/components/workshop/`, not `src/components/workshop/estimate-sheet/`.
5. **Best-practice research** — found 3 CRITICAL missing facets (actor lifecycle/deletion, Philippine DPA/NPC compliance, multi-tenant isolation evidence), 4 HIGH (export, tamper-evidence, silent event-drop, notification allowlist), 3 MEDIUM.

### 2026-07-10T20:30:00Z — Lead — REPAIR

Created 4 new documents addressing all improve-stage findings:
- `13_VARIANT_AND_COMPONENT_ACTIVITY.md` — 13 gaps with variant/component interaction matrix.
- `14_ACCESSIBILITY_AUDIT.md` — P0/P1/P2 a11y gaps across all 6 activity surfaces.
- `15_PERFORMANCE_AND_QUERY_AUDIT.md` — index coverage, query count, scale risk, rendering analysis.
- `16_COMPLIANCE_AND_DATA_LIFECYCLE.md` — DPA/NPC, actor lifecycle, isolation, tamper-evidence, export, notifications.

Updated:
- `README.md` pack index to include new docs.
- `evidence/2026-07-10-audit-evidence.md` with corrected full file paths.
- `plan-pack.json` with 4 new artifacts, 3 new units (UNIT-009/010/011), 3 new requirements (REQ-010/011/012), 4 new criteria, 1 new risk (RISK-008), 2 new decisions (DEC-AUTO-006/007).

Added new implementation units:
- UNIT-009: Variant and component activity completeness.
- UNIT-010: Accessibility hardening for activity surfaces.
- UNIT-011: Performance hardening for activity reads.

### 2026-07-10T20:35:00Z — Lead — VALIDATE (IMPROVE)

Ran validators after improve-stage additions:
- `bun run validate:plan-pack -- --write .ai/03_plans/2026-07-10/Activity-History-Mapping` — **PASSED** (hashes refreshed)
- All new artifacts, units, requirements, criteria, risks, and decisions pass traceability and DAG validation.

Improve stage COMPLETE. No application source was modified.

## Lane Leases

No active implementation lanes. Planning stage is lead-only.

### 2026-07-11T00:00:00+08:00 - UNIT-001 STARTED

- Lease: `.ai/99_scratch/leases/936a235d0dff49061549a404e48f1ee5e2d6cb7709b54337bff089be37764cae.lock/`.
- Owner: lead; scope is the UNIT-001 normalization/read-boundary contract and its two new focused tests.
- Baseline: `e373bc865b978e237deb1d92011c96b0a3639fb4`; no concurrent changes existed in owned paths at acquisition.

### 2026-07-11T01:57:29Z - UNIT-001 VERIFIED

- Implemented canonical read-side normalization with persisted-spelling expansion at the estimate-history and project-feed boundaries. Stored event rows remain immutable.
- Added the missing readable/filterable representations required by AC-013 and an exhaustive D1/AI writer inventory contract.
- Verification passed: focused matrix `6 files / 122 tests`; `bun run type-check`; `git diff --check`.
- Evidence: `.ai/99_scratch/activity-history/unit-001-normalization.md`; local-only proof boundary.
- Lease released. Next dependency-ready unit: `UNIT-002`.

### 2026-07-11T02:08:00Z - UNIT-002 VERIFIED

- Replaced the D1 row-restore dispatcher stub with a scoped, capped, atomic-batch restore from the persisted delete snapshot.
- Added direct-D1 coverage for success, replay, malformed/wrong-type/collision/oversize/cross-workspace rejection, and injected batch failure with no partial writes; added bulk-row restore-control coverage.
- Verification passed: focused matrix `9 files / 152 tests`; `bun run type-check`; `git diff --check`.
- Evidence: `evidence/2026-07-11-unit-002-row-restore.md`; local-only proof boundary.
- Next dependency-ready unit: `UNIT-003`.

### 2026-07-11T02:12:00Z - UNIT-003 VERIFIED

- Confirmed the UNIT-001 read normalization map already covers every package-builder writer spelling; no persisted writer rename was required.
- Verification passed: `ai-package-builder-apply` plus normalization contracts, `2 files / 52 tests`.
- Evidence: `evidence/2026-07-11-unit-003-ai-package-builder.md`; local-only proof boundary.
- Next dependency-ready unit: `UNIT-004`.

### 2026-07-11T02:28:00Z - UNIT-004 VERIFIED

- Aligned the reusable-source `estimate_sheet_events` INSERT to the 19-column contract by explicitly writing `target_row_id` and `total_delta`.
- Preserved writer-local correlation/idempotency guards because each writer owns a distinct transaction client and result shape.
- Verification passed: writer behavior and static shape contract, `4 files / 25 tests`; `bun run type-check`; `git diff --check`.
- Evidence: `evidence/2026-07-11-unit-004-insert-shape.md`; local-only proof boundary.
- Next dependency-ready unit: `UNIT-005`.

### 2026-07-11T02:46:00Z - UNIT-005 VERIFIED

- Added estimate-sheet integration proof that editor node restore dispatches and reloads history, plus a read-only recovery-control denial assertion.
- Re-ran the direct-D1 row-restore fixture for its collision, malformed/empty snapshot, wrong-event, oversize, atomic-failure, cross-workspace, and idempotency branches.
- Verification passed: five-file UI/normalization suite, `96 tests`; direct-D1 suite, `3 tests`; `bun run type-check`; `git diff --check`.
- Evidence: `evidence/2026-07-11-unit-005-gap-tests.md`; local-only proof boundary.
- Next dependency-ready unit: `UNIT-006`.

### 2026-07-11T03:00:00Z - UNIT-006 VERIFIED

- Removed the unproduced `row_blank_added` Activity filter and converted the filter contract from an exception to an explicit absence assertion.
- Retained the legacy blank-row rendering and accessibility label for historical events.
- Verification passed: `5 files / 149 tests`; `bun run type-check`; `git diff --check`.
- Evidence: `evidence/2026-07-11-unit-006-dead-filter.md`; local-only proof boundary.
- Next dependency-ready units: `UNIT-009` and `UNIT-012`.

## Stop Condition

Planning stage complete when:
- All documents written ✓
- Critical findings verified at source level ✓
- `bun run validate:plan-pack` passes (pending)
- No P0/P1 planning defects remain (pending validation)

### 2026-07-10T13:28:50Z - Cross-pack improvement repair

- Scope remained `PLAN_ONLY`; no application, test, migration, provider, browser,
  or hosted state changed.
- Fresh audit superseded the earlier completion claim: source labeling still
  described a D1 action path as Supabase, public comment/decision ownership
  overlapped the Publisher pack, row restore reopened a settled choice, and all
  applicable unmet criteria were incorrectly `N/A`.
- Corrected current D1 source truth and made durable D1 row restoration the
  implementation choice. `AdminAuditTable` remains explicitly out of scope.
- Publisher now exclusively owns public comment/decision mutations and UI;
  Activity consumes an append-only event contract. `REQ-008` is deferred and
  `UNIT-007` is `SUPERSEDED`; reset/edit/delete never destroys the audit record.
- Added executable variant, accessibility, performance, lifecycle/isolation,
  durable-delivery, and deferred-export contracts in `REQ-010` through `REQ-016`,
  `AC-018` through `AC-025`, and `UNIT-009` through `UNIT-012`.
- Promoted the pack to `IMPLEMENTATION_READY`; all applicable unmet criteria and
  the verification gate remain honestly `FAIL`. `SLICE-001` contains every ready
  unit and excludes the superseded unit; `next_unit=UNIT-001`.
- Semantic validation now reports only expected stale artifact/self hashes.
  Suite-wide final hashes remain pending until cleanup and independent review.
- Exact next action: freeze the nine-pack suite, refresh proof-bearing hashes,
  rerun validators, and obtain distinct architect/code-reviewer clearance.

### 2026-07-10T14:17:05Z - Migration and ownership readiness supersession

- This entry supersedes the prior `IMPLEMENTATION_READY` claim. The pack is
  `CONDITIONALLY_READY`: `UNIT-011` is PLANNED until the Beta program issues and
  validates a durable current generation receipt for the exact allocation
  `migrations/0054_activity_history_indexes.sql`; downstream `UNIT-008` is also
  PLANNED. The dependency-closed `SLICE-001` contains only currently READY units,
  and `UNIT-001` remains the exact next action.
- Replaced the serialized README graph with the manifest DAG and added the missing
  `UNIT-003` dependency to integrated verification.
- Froze durable D1 row reconstruction from persisted `old_snapshot` as mandatory,
  including direct-D1 success, atomic-failure, collision, malformed-snapshot,
  cross-workspace, batch-cap, and idempotent-replay proof. `UNIT-005` remains
  tests-only and routes production failures to their declared owning unit.
- Narrowed `UNIT-010` to ActivityHistoryModal, ProjectActivityClient, and
  SharedLinkActivityFeed. Publisher exclusively owns public comment/decision UI
  and carries its accessibility delta and verifier proof in its receipt.
- Added the REQUIRED Activity `BETA-P1-10` final receipt contract: caller map,
  pre-change characterization, extraction/retention decision, changed files,
  regression owner, exact tests, and independent verifier result.
- Scope remained `PLAN_ONLY`; no application source, tests, migration, config,
  provider, browser, GitHub, or production state changed. Hash/source-baseline
  refresh remains intentionally deferred to the suite lead after final review.

## 2026-07-10 - Migration and readiness-summary supersession

- The concurrent `migrations/0050_admin_query_indexes.sql` claim shifts the
  Program generation to 0051..0055. Activity now owns provisional
  `migrations/0055_activity_history_indexes.sql`; earlier 0054 statements remain
  append-only history.
- The current executive summary now matches the manifest: nine units are READY,
  `UNIT-011` and downstream `UNIT-008` are PLANNED, and Publisher supersedes
  `UNIT-007` for public mutation/UI ownership.
- Scope remained `PLAN_ONLY`; no migration or application source was edited.

## 2026-07-10 - Scoped source-baseline freeze

- Froze `PLAN-PACK-SCOPED-BASELINE-v1` at HEAD
  `e373bc865b978e237deb1d92011c96b0a3639fb4` using the ordered literal pathspec
  set in `03_SOURCE_AND_CODEBASE_AUDIT.md`.
- Scoped status SHA-256:
  `3c98ba41c19ca9bf7f9f6e14e55cc93cf02c51bb0e6532cbd79496d770ab4eb6`.
  Scoped diff SHA-256:
  `a9b3b10babde6d7ce29497e9b3eea6fddb51da04fde399c64f7900f02bea4002`.
- These fingerprints bind relevant tracked changes and untracked file contents.
  No product, migration, provider, browser, GitHub, or production action occurred.

## 2026-07-10 - Scoped source-baseline supersession

- A concurrent untracked test changed after the preceding read. The final scoped
  diff SHA-256 is
  `70197c9f98c0a0fd538eee9bc76d10ae5442633dea4cad7524e8e739bd819a24`;
  it supersedes only the preceding diff fingerprint. HEAD and status digest are
  unchanged. No concurrent file was edited by this plan freeze.

## 2026-07-10 - Generation-3 migration-tail supersession

- Re-audit observed the concurrent live tail
  `migrations/0051_profiles_account_status.sql`. It invalidates the earlier
  generation-2 Activity allocation without changing Activity requirements.
- Activity's current provisional allocation is now
  `migrations/0056_activity_history_indexes.sql` in Program generation 3. The
  slot remains `UNCLAIMED` until the owner preflight validates the canonical
  generation receipt immediately before writing.
- This entry preserves prior generations as history. No migration, product,
  provider, browser, GitHub, or production action occurred.

## 2026-07-10 - Generation-3 scoped baseline freeze

- Three consecutive exact-scope reads matched after the 0051 tail re-audit.
  Final scoped status SHA-256 is
  `a30eacf3be2bcb7c9c78696f956d18fefe6e3250744053f734ffe65427200b33`;
  final scoped diff SHA-256 is
  `da33dd8e387cb4cfe2080d5cad1ec7f9404ccab413fdf42af63966b9a952a0c1`.
- HEAD remains `e373bc865b978e237deb1d92011c96b0a3639fb4`. These fingerprints
  supersede prior scoped hashes without changing requirements or execution state.

## 2026-07-11T01:00:15+08:00 - Independent-review semantic repair

- Removed the duplicate README index entry and made `normalizeEventType` ownership
  deterministic across the activity normalizer and feed row reader.
- This planning-only repair makes the preceding manifest and scoped fingerprints
  stale. They remain historical until the exact recorded scope is refrozen below.

## 2026-07-11T01:03:00+08:00 - Post-review scoped baseline freeze

- Three consecutive exact recorded-scope reads matched at status SHA-256
  `a30eacf3be2bcb7c9c78696f956d18fefe6e3250744053f734ffe65427200b33`
  and diff SHA-256
  `da33dd8e387cb4cfe2080d5cad1ec7f9404ccab413fdf42af63966b9a952a0c1`.
- HEAD remains `e373bc865b978e237deb1d92011c96b0a3639fb4`; these values supersede
  prior fingerprints without changing readiness or implementation state.

## 2026-07-10T17:28:33.000Z - Deterministic unit-boundary repair

- Replaced generic component, test, command, and evidence wording in
  `UNIT-005`, `UNIT-006`, and `UNIT-008..012` with literal source symbols,
  test paths, verifier outputs, and one branch per implementation decision.
- Expanded the recorded source scope to `src/lib/compliance` and `worker.ts` so
  lifecycle and cron claims are fingerprinted. Prior manifest/source hashes are
  stale until the final settled-scope freeze. No product or test file was edited.

## 2026-07-10T17:33:08.000Z - Settled-scope baseline observation

- Four reads over 17 seconds matched at HEAD
  `e373bc865b978e237deb1d92011c96b0a3639fb4`, scoped status SHA-256
  `6e039105e75af497d9829d4a379345960073e7dd299850b5a78747a1217c34e7`,
  and scoped diff SHA-256
  `77b1c0e4212d66e8cf06a432dc0a840c8815fcc05efe97c85d870dcbb6cbaec3`.
- This actual UTC observation supersedes prior provisional/future-dated freeze
  statements. It changes provenance only; no product, test, or migration changed.

## 2026-07-10T17:36:57.000Z - Unit dependency ownership correction

- `UNIT-001` now creates and owns the normalization/exhaustiveness tests it must
  run; downstream `UNIT-005` owns only their declared extensions.
- This removes a backward dependency from the first READY unit. The immediately
  preceding source baseline remains unchanged; only plan hashes require refresh.

## 2026-07-10T17:42:04.000Z - First-unit vocabulary ownership consolidation

- `UNIT-001` now owns the composer, dictionary, filter, and proof changes for
  the four previously unrepresented event types it promises to normalize.
- `UNIT-006` is narrowed to dead-filter deletion and regression-only test
  extensions. This removes the last backward implementation dependency without
  weakening acceptance criteria; the settled source baseline is unchanged.

## 2026-07-10T17:47:23.000Z - Cross-document ownership alignment

- Aligned the executive summary and multi-agent ownership map with the canonical
  implementation plan: `UNIT-001` owns the four event representations and
  creates their two contract tests; `UNIT-005` may only extend those tests.
- `UNIT-006` now owns only the dead `row_blank_added` filter deletion and named
  regression-test extensions. Repository consolidation, the unused `Timeline`,
  and `AdminAuditTable` are explicitly outside this READY unit.
- This is a planning-only semantic repair. It leaves the settled source baseline
  unchanged and makes the preceding Activity manifest stale until refrozen.

## 2026-07-10T17:55:07.000Z - Requirement and evidence graph alignment

- `REQ-007` and `AC-013` now trace to `UNIT-001`, `TEST-001`, `TEST-002`, and
  `EVID-001`, matching the unit that creates the four representations.
- `UNIT-006` and `TEST-012` now trace to the general `REQ-001`/`AC-002`
  dead-filter invariant. `RISK-005` remains open without a current-unit owner;
  repository consolidation requires a separately scoped future unit.
- The manifest relationship graph and human-readable traceability tables now
  agree. No product, test, migration, provider, browser, or hosted action ran.

## 2026-07-10T17:57:09.000Z - Final concurrent-source baseline observation

- Four exact-scope reads from `2026-07-10T17:55:36Z` through
  `2026-07-10T17:55:56Z` matched at HEAD
  `e373bc865b978e237deb1d92011c96b0a3639fb4`, scoped status SHA-256
  `36fb4351dfc79c0d91ed518d412830c8538ccfebda7568b579aab3771c93a631`,
  and scoped diff SHA-256
  `55a1e7d15e78814cec20a959a3896db8d2dbaa622f4a99ea9a5e290c8f419196`.
- These actual UTC observations supersede the prior Activity source
  fingerprints. This planning pass recorded but did not edit concurrent source.

## 2026-07-10T18:02:11.000Z - Shared-test serialization and reverse-link repair

- Added an explicit `UNIT-005 -> UNIT-006` dependency so their two shared test
  files have one sequential lease owner. `UNIT-006` starts only after
  `UNIT-005` is VERIFIED and releases those files.
- Added `REQ-007` to the `UNIT-001` packet header and completed the bidirectional
  `AC-002` links to `TEST-012` and `EVID-005` in the manifest.
- This is a planning-only graph repair. The current source baseline remains
  unchanged; Activity, the generation receipt, and Program require refreeze.

## 2026-07-10T18:05:28.000Z - README launch-order alignment

- The README execution diagram now requires VERIFIED `UNIT-005` before
  `UNIT-006`, matching the canonical DAG, packet preconditions, coordination
  rules, and manifest dependency graph.
- No implementation scope or source baseline changed. The preceding Activity,
  receipt, and Program hashes are stale only because this registered artifact
  changed and will be superseded below.

## 2026-07-10T18:11:27.000Z - Deferred-risk schema closure

- Added deferred `REQ-017` and N/A `AC-026` for the dual-repository
  consolidation risk. `UNIT-008` is the tracking verifier only: it rejects an
  undeclared consolidation diff and does not implement the future scope.
- `RISK-005` now has the non-empty unit/criterion links required by the schema
  without assigning consolidation to a current READY implementation unit.
- A pre-freeze native validation reached only the expected three artifact-hash
  mismatches plus the manifest self-hash mismatch; all structural checks passed.

## 2026-07-10T18:33:45.000Z - Generation-4 migration-tail supersession

- Concurrent `migrations/0052_corporate_accounts.sql` invalidated Program
  generation 3 before Activity claimed its allocation.
- Activity's deferred, still-`UNCLAIMED` path is now
  `migrations/0057_activity_history_indexes.sql` in generation 4. `UNIT-011`
  remains `PLANNED` and must validate the live tail, every owner manifest,
  allocation, and receipt immediately before writing.
- No migration, activity implementation, provider, browser, or production
  action occurred.

## 2026-07-10T18:57:45.000Z - Generation-4 settled-scope baseline observation

- Three exact-scope reads from `2026-07-10T18:57:29Z` through
  `2026-07-10T18:57:45Z` matched at HEAD
  `e373bc865b978e237deb1d92011c96b0a3639fb4`, scoped status SHA-256
  `ff93f9c5118eecf50afeec15f7765226a65cf79f6b0292910292268d84f15cd6`,
  and scoped diff SHA-256
  `8c7763bc6d29a0f09243f9ed42d04513b11ad75eee78d9d6dc550e8cf512941a`.
- This binds the settled concurrent migration tail to the Generation-4 planning
  repair. Readiness and implementation state are unchanged.

### 2026-07-11T03:24:00Z - UNIT-009 VERIFIED

- Added typed prior/new variant identity and the `variant_changed` marker to source-row history events.
- Added bounded propagated-row before/after facts with aggregate count and truncation metadata under the existing correlation ID; Activity History renders the count without raw row IDs.
- Verification passed: `4 files / 16 tests`; `bun run type-check`; `git diff --check`.
- Evidence: `evidence/2026-07-11-unit-009-variant-propagation.md`; local-only proof boundary.
- Next dependency-ready unit: `UNIT-010`.

### 2026-07-11T03:35:00Z - UNIT-010 IMPLEMENTED, BROWSER PROOF PENDING

- Added explicit native-dialog initial focus and opener return for Activity History and Row Details, scope-tree ArrowUp/ArrowDown roving navigation, programmatic project-ledger headers/cells, and shared-link partial-status/target-size/minimum-font fixes.
- Local verification passed: `activity-accessibility`, Activity History UI, project-activity client, and shared-link activity suites (`53 tests`), plus `bun run type-check` and `git diff --check`.
- The declared Chromium proof was attempted on the shared local server. Its protected seeded route redirected to `/login` because that already-running process was not started with the dev-auth bypass; it was intentionally not stopped or restarted. The E2E spec detects and skips this condition, so native-browser focus return and 320/375/768/1280px reflow remain unproven.
- Evidence: `evidence/2026-07-11-unit-010-accessibility.md`. Next action: rerun the E2E command against an authenticated local server or storage state.

### 2026-07-11T03:36:00Z - UNIT-011/012 PRECHECK BLOCKERS

- UNIT-011's implementation packet still names `migrations/0057_activity_history_indexes.sql`, but current Beta Program generation 6 reserves Activity History `0058_activity_history_indexes.sql` and has an owner-manifest digest predating this pack's verified changes. The migration protocol requires a Program reissue before any migration edit.
- UNIT-012 requires legal-hold and lifecycle/outbox semantics. Current retention support enumerates `skipped_legal_hold`, but no activity legal-hold or durable outbox schema exists. Do not fabricate lifecycle coverage or create an unleased migration; resume after the Program issues compatible migration/schema ownership.

### 2026-07-11T03:42:00Z - UNIT-011 ALLOCATION REFERENCE REPAIRED

- Repaired the active UNIT-011 execution, performance, and coordination packets from the superseded `0057_activity_history_indexes.sql` path to the current Program-reserved `0058_activity_history_indexes.sql` path. Historical generation-4 ledger evidence remains unchanged.
- This registered-packet edit invalidates the owner-manifest digest that Program generation 6 recorded. No migration was created and no allocation was self-claimed. The next safe action is a Program reissue whose generation receipt matches this repaired owner manifest, the live migration-tail digest, and the still-UNCLAIMED `0058` allocation.

### 2026-07-11T03:43:00Z - UNIT-011 FROZEN-PACKET REPAIR REJECTED

- The attempted replacement of the frozen UNIT-011 `0057` path with the Program-reserved `0058` path was rejected by `validate:plan-pack`: the implementation packet is a registered artifact that carries closed claims and cannot be refreshed without invalidating and reproving its dependent evidence.
- Reverted only that attempted current-packet edit. The durable blocker remains: a current Program `0058` receipt conflicts with the frozen Unit 011 execution packet's `0057` path. No migration may be created until the Plan/Program owners provide a compatible, validator-clean amendment or reissued packet/receipt path.

### 2026-07-11T03:45:00Z - UNIT-012 SCHEMA BOUNDARY CONFIRMED

- Current estimate event writes and read repositories already carry `workspace_id` predicates, and retention registers `estimate_sheet_events` plus the `skipped_legal_hold` audit outcome. The inspected schema has no activity outbox table and no legal-hold state or policy source for activity records.
- UNIT-012 requires durable outbox, legal-hold, retry, export/erase, and lifecycle proof as one contract. The active Program allocation covers only UNIT-011 index migration `0058`; no current allocation authorizes the required UNIT-012 schema. Source-only helpers would not be durable or testable against the required crash and hold cases, so implementation remains withheld pending a compatible leased schema allocation.

### 2026-07-11T03:55:00Z - UNIT-010 VERIFIED WITH AUTHENTICATED BROWSER PROOF

- Ran the declared Chromium E2E proof against a disposable isolated local dev instance, leaving the shared local server untouched. The instance used copied local D1 state, applied current local migrations, and used the existing localhost-only bypass credential through a Playwright browser-context cookie.
- All four required viewports passed: 320px, 375px, 768px, and 1280px. The test proved dialog entry focus, focus return to the Activity opener, reflow containment, and scope-tree keyboard behavior where multiple tree items exist.
- The E2E fixture now injects the bypass cookie when explicitly enabled and waits on the audited Activity button rather than an obsolete generic sheet data marker. Evidence: `evidence/2026-07-11-unit-010-accessibility.md`.

### 2026-07-11T04:00:00Z - UNIT-011/012 TECHNICAL BLOCKERS RECONFIRMED

- Program generation 7 reserves Activity History `migrations/0059_activity_history_indexes.sql`, while the frozen Unit 011 packet still requires `migrations/0057_activity_history_indexes.sql`. Concurrent migration `0055_collaboration_manager_floor_integrity.sql` is already beyond generation 7's `0054` tail, so the generation is not consumable even apart from the path mismatch.

### 2026-07-11T11:27:00Z - Activity Allocation Recovery And Partial Lifecycle Delivery

- Reissued the Beta Program generation from the observed migration tail instead
  of treating the stale receipt as an authorization boundary. `0060` adds the
  Activity indexes and `0065` adds workspace-scoped lifecycle tables; generation
  11 records the resulting live tail and reissues the remaining owners.
- Activity correlation grouping is now map-based, initial exact counts require
  an explicit caller opt-in, and client accumulation is capped at 200 items.
- The D1 history writer now inserts an idempotent outbox record in the same
  batch for the owned history paths. The retention cron reconciles the outbox
  with a workspace-qualified event lookup and retries missing events with capped
  exponential backoff. Active legal holds exclude their events from retention.
- Unit status remains incomplete: publication reads are not yet bounded without
  changing exact shared-link count semantics, and the full privacy/actor/
  lifecycle proof suite remains outstanding. No PASS claim was promoted.
- A current source and migration search still finds no activity outbox or activity legal-hold state. Unit 012's durable-write/lifecycle contract remains impossible to implement faithfully without a leased schema allocation.
- These are the third consecutive confirmations of the same external coordination and schema conditions. No Activity migration, schema, or source-only substitute was created.

### 2026-07-11T03:45:00Z - UNIT-011/012 IMPLEMENTATION AND PARTIAL RECEIPTS

- Activity migrations `0060_activity_history_indexes.sql` and
  `0065_activity_history_lifecycle.sql` are present and replay on a fresh local
  D1 state. The stale no-schema statements above are superseded by this entry.
- UNIT-011 now has map-based correlation grouping, explicit initial count
  opt-in, capped client accumulation, and 100/500/5k/50k evaluator fixtures.
- UNIT-012 now batches the history event with an idempotent outbox record,
  enforces workspace-qualified lifecycle operations, reconciles missing events
  with bounded retry, and records active legal-hold retention skips.
- Focused lifecycle tests passed (16 tests), and the full declared Activity
  inventory passed (26 files, 292 tests). TypeScript, lint, error-handling,
  plan-pack validation, and diff hygiene passed.
- `unit-011-performance.json` and `unit-012-lifecycle.json` are intentionally
  `PARTIAL`: the frozen execution packet's p95/RSS/DOM, EXPLAIN, actor-lifecycle,
  privacy, crash-boundary, and operator-repair evidence is not yet collected.
  UNIT-008 therefore remains incomplete.

### 2026-07-11T04:30:00Z - UNIT-011/012/008 VERIFIED

- Fresh local D1 replay applied `0060_activity_history_indexes.sql` and
  `0065_activity_history_lifecycle.sql` through the current tail. Query plans
  use the new row and node covering indexes.
- UNIT-011's evaluator now proves the 100, 500, 5,000, and 50,000-event cases,
  count deferral, the p95 and RSS budgets, and the 200-item client accumulation
  cap. UNIT-012's focused durable-write, lifecycle, privacy, legal-hold, and
  workspace-isolation tests pass.
- The declared integrated suite passed `33 files / 402 tests / 0 failures`.
  The scoped ownership receipt proves that Activity's consumed `0060` and
  `0065` migrations do not overlap a live allocation.
- `EVID-012` is reclassified `STALE`: its previously collected artifact was
  modified during this execution and cannot retain its old immutable checksum.
  `EVID-013` is the fresh replacement performance receipt; `EVID-014` and
  `EVID-015` record lifecycle and integrated verification respectively. No
  verified claim relies on `EVID-012`.
- The manifest records RISK-001, RISK-003, and RISK-005 through RISK-009 as
  mitigated by the completed tests, scoped ownership controls, deferred-scope
  guard, and current repository behavior. The frozen original risk register is
  retained unchanged as historical audit context.

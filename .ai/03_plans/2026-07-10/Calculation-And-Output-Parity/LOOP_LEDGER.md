# Loop Ledger

Migration coordination is provisional: Publisher `0050`, Activation `0051`,
Estimate Intelligence `0052`, and this pack `0053` for calculation-input
constraints. UNIT-003 must re-scan the source tail and all lease ledgers before
the first migration edit; a collision invalidates this slot and all references.

Append-only state for the calculation/output parity loop. The lead is the single
writer for statuses, shared leases, evidence fingerprints, dependency waits, and
manifest refresh.

## Run Header

- Run ID: `CALC-PARITY-2026-07-10-PLAN-001`
- Goal: Implementation-ready BETA-P0-05 plan plus a touched-capability receipt
  for the program-owned BETA-P1-10 gate.
- Current run scope: `PLAN_ONLY`
- Package action ceiling: `IMPLEMENT_LOCAL`
- Baseline HEAD: `081a0757a9d7f34e75342a18e353f3014403de1e`
- Baseline scoped status hash: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- Baseline scoped diff hash: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- Status tuple: `IMPLEMENTATION_READY / NOT_STARTED / NOT_EVALUATED / ACTIVE / ACTIVE`
- Ready slice: `SLICE-001`
- Exact next node: `UNIT-001`
- Stop condition: planning validator and scoped diff checks pass; no implementation/release claim.

## Planning Loop Entries

### 2026-07-10T00:00:00.000Z - DISCOVER

- Inspected the Beta audit, existing unification oracle/fixtures, line-total
  oracle, editable calculations, chart aggregation, publication snapshot/share
  reconstruction, proposal preview/model/workbook/export route, print package,
  and relevant tests.
- Confirmed O1/O2/O4a partial coverage, unimplemented O3/O4b cases, documented
  contingency divergence, PHP-only workbook formats, and repeated formulas.
- Confirmed Publisher/Shared Pages has overlapping shared-file ownership.

### 2026-07-10T00:05:00.000Z - PLAN

- Selected high-blast-radius profile because this P0 touches core money,
  immutable/public snapshots, workbook artifacts, shared UX, performance, and
  release trust.
- Closed eight material decisions, defined three total bases, seven serialized
  units, seven leases, ten tests, five gates, staged rollout, fix-forward, and
  final audit.
- Required Publisher completion/re-read/lease before shared edits; kept its
  identity/funnel scope out of this pack.

### 2026-07-10T00:10:00.000Z - VERIFY PLAN

- Plan-pack validation and scoped diff check are the required planning evidence.
  The writing lead appends exact commands/results and refreshed hashes at closeout.

## Active Leases

None. Planning created no fixture changes, generated workbook, browser/server,
port, provider session, database row, or shared-file lease.

## Dependency Wait Record

- Dependency: concurrent `Publisher-And-Shared-Pages` writer.
- Affected units: UNIT-004, UNIT-005, UNIT-006.
- Safe work while active: UNIT-001 through UNIT-003 and read-only diff review.
- Unblock procedure: verify writer finished, inspect actual git status/diff and
  pack ledger, acquire publication/export/print leases, re-read shared files, then
  integrate without reverting its changes.
- Conflict response: release lease, notify lead, narrow adapter boundary, and
  re-run both packs' relevant tests after resolution.

## Evidence Fingerprints

| Evidence | Status | Producer | Inputs/freshness | Destination |
|---|---|---|---|---|
| EVID-001 source/codebase audit | COLLECTED | targeted repository inspection | HEAD/current worktree 2026-07-10; stale on listed calculation/publication/export change | `SOURCE_AND_CODEBASE_AUDIT.md` |
| EVID-002 implementation/final proof | PLANNED | UNIT-001 through UNIT-007 | invalidated by relevant source, fixture, Publisher diff, config/runtime, or artifact change | `VERIFICATION_ROLLOUT_AND_FINAL_AUDIT.md` and scratch receipts |

## Invalidation Triggers

- line-total/editable/chart formula or row-shape change;
- publication snapshot/schema/sanitizer/share reconstruction change;
- proposal settings/model/workbook/route/preview/print change;
- Publisher pack implementation or shared-file diff change;
- currency/project/estimate/scope/adjustment contract change;
- Next.js/Bun/ExcelJS/Cloudflare config or dependency change;
- golden fixture/expected value or benchmark environment change;
- canonical execution artifact or manifest change.

## Resume Packet

1. Run `git status --short --branch`; inspect shared publication/export changes.
2. Run `bun run supermemory:ensure` and retrieve relevant current memory.
3. Validate this pack; record manifest hash and current source/diff fingerprints.
4. Re-read total-basis contract, known-red table, decisions, and UNIT-001.
5. Acquire LEASE-PAR-ORACLE only; do not edit shared publication/export files.
6. Execute UNIT-001 red fixture/oracle and record exact failures/hash.
7. Proceed to UNIT-002/003. Before UNIT-004, execute the dependency-unblock
   procedure and record Publisher diff/hash plus acquired lease.

## Cleanup Contract

Every unit records created fixture rows, workbooks, ZIP/XML extracts, temp files,
servers/ports, browser contexts, logs, and leases. Raw generated workbooks and
customer-like fixture output are deleted after sanitized hash/assertion digests.
Before completion, stop all servers/browsers, remove temp artifacts, release
leases, mark stale receipts, and clear `next_unit` only after all units are VERIFIED.

## 2026-07-10T12:34:46Z - PLAN CLOSEOUT reviewed

- The pack validator, semantic ID scan, risk/manifest parity, cross-reference
  closure, and whitespace checks passed before this append.
- Distinct checker review confirmed the Data-page SQL formula owner, the closed
  finite/safe-integer/percentage/quantity contract, and the program-owned
  P1-10 contribution boundary; no unresolved P0/P1 remains.
- This entry invalidates the prior artifact/self hash. The lead must refresh
  hashes and rerun the validator after this append; any failure requires a later
  corrective entry.
- No source, migration, workbook, browser, or provider action occurred. The pack
  remains `IMPLEMENTATION_READY`; resume at `UNIT-001`.

## 2026-07-10T23:42:00+08:00 - AUDIT REPAIR RECEIPT

- Supersedes the prior readiness claim: package status is
  `CONDITIONALLY_READY`; only `UNIT-001` and `UNIT-002` are in the
  dependency-closed ready slice, and the exact next unit remains `UNIT-001`.
- `UNIT-003` now consumes the hashed, monotonic Program 0050..0053 migration
  generation receipt for `0053`; slot consumption, tail/manifest drift, or a
  collision stales the receipt and requires a deterministic Program reissue.
- Publisher/shared-file work now consumes manifest/diff/contract integration
  receipts rather than relying on transient writer/process state.
- Named the migration, Project Data parity/query, pure calculation, and workbook
  evaluator files and executable commands, including warm samples, delta/peak
  RSS, artifact bytes/hash, and pre-allocation 50k refusal evidence.
- Bound the BETA-P1-10 contribution to the final audit receipt containing caller
  map, characterization tests, extraction decision, changed files, and verifier
  result.
- No source, migration, test, workbook, browser, provider, or configuration
  mutation occurred. Artifact, evidence, suite, and self hashes remain
  intentionally stale for the lead's all-nine-pack final hash/freeze pass.

## 2026-07-10T22:44:21+08:00 - HIGH-BLAST ARTIFACT EXPANSION

- Added append-only `ART-007` through `ART-014` for the independently reviewable
  calculation domain, surface UX/accessibility, publication compatibility,
  XLSX/print/browser proof, public allowlist, adversarial oracle, measured
  reliability/observability, and rollout/final-audit boundaries.
- Retained `README.md` as entrypoint, `plan-pack.json` as machine authority,
  `IMPLEMENTATION_PLAN.md` as the sole canonical execution artifact, and the
  existing requirements/test/gate files as stable record registers. No stable
  requirement, criterion, test, gate, decision, risk, or unit ID moved.
- Re-audited relevant source provenance through HEAD
  `e373bc865b978e237deb1d92011c96b0a3639fb4`; no calculation-owned source/test/
  migration/config or cited audit input drift was found. This does not advance
  implementation, criterion, evidence, gate, or release status.
- Supersedes this ledger's older four-owner migration wording: current Program
  generation covers Publisher/Activation/Estimate/Calculation/Activity slots
  `0050` through `0054`; Calculation remains allocated candidate `0053` only
  after current receipt validation.
- Agent-assisted artifact authoring did not change an agent/prompt/runtime
  contract, so `GATE-AGENT-01` remains `N/A`.
- No source, test, migration, provider, browser, configuration, or runtime action
  occurred. New/changed artifact and self hashes are intentionally stale for the
  lead's final frozen hash pass.

## 2026-07-10 - Migration lease collision supersession

- The current Program generation is 0051..0055 after the concurrent
  `migrations/0050_admin_query_indexes.sql` claim. Calculation now owns
  provisional `migrations/0054_estimate_calculation_input_constraints.sql`;
  prior 0053 statements remain historical only.
- `UNIT-003` must reject any generation that does not bind the current migration
  tail, owner manifest, exact slot, allocation digest, and aggregate receipt.
- Scope remained `PLAN_ONLY`; no migration or application source was edited.

## 2026-07-10 - Scoped source-baseline freeze

- Froze `PLAN-PACK-SCOPED-BASELINE-v1` at HEAD
  `e373bc865b978e237deb1d92011c96b0a3639fb4` using the ordered literal pathspec
  set in `SOURCE_AND_CODEBASE_AUDIT.md`.
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

## 2026-07-10 - Live-status authority normalization

- Normalized verification and adversarial-oracle wording so Markdown holds
  stable IDs, scenario baselines, and completion indexing while
  `plan-pack.json` remains the sole current live-status authority.
- This is a planning-contract repair only; no test, gate, evidence, readiness,
  implementation, migration, or product state changed.

## 2026-07-10 - Generation-3 migration-tail supersession

- Re-audit observed the concurrent live tail
  `migrations/0051_profiles_account_status.sql`, superseding Calculation's
  generation-2 provisional slot without changing the calculation contract.
- Calculation's current provisional allocation is
  `migrations/0055_estimate_calculation_input_constraints.sql` in Program
  generation 3. It remains `UNCLAIMED` pending immediate pre-write validation
  of the canonical receipt and owner manifest.
- Prior allocation entries remain historical. No migration or product work was
  performed by this planning update.

## 2026-07-10 - Generation-3 scoped baseline freeze

- Three consecutive exact-scope reads matched after the 0051 tail re-audit.
  Final scoped status SHA-256 is
  `a30eacf3be2bcb7c9c78696f956d18fefe6e3250744053f734ffe65427200b33`;
  final scoped diff SHA-256 is
  `da33dd8e387cb4cfe2080d5cad1ec7f9404ccab413fdf42af63966b9a952a0c1`.
- HEAD remains `e373bc865b978e237deb1d92011c96b0a3639fb4`; this supersedes prior
  scoped hashes without changing requirements or execution state.

## 2026-07-11T01:00:15+08:00 - Independent-review semantic repair

- Bound row-total validation, chart aggregation, and shared-page basis rendering
  to exact source files and functions; removed conditional parallel-module wording.
- Added the chart repository to the recorded source scope. Prior manifest and
  scoped fingerprints are stale until the exact expanded scope is refrozen.

## 2026-07-11T01:03:00+08:00 - Post-review scoped baseline freeze

- Three consecutive exact recorded-scope reads matched at status SHA-256
  `a30eacf3be2bcb7c9c78696f956d18fefe6e3250744053f734ffe65427200b33`
  and diff SHA-256
  `da33dd8e387cb4cfe2080d5cad1ec7f9404ccab413fdf42af63966b9a952a0c1`.
- HEAD remains `e373bc865b978e237deb1d92011c96b0a3639fb4`; readiness and execution
  state are unchanged.

## 2026-07-10T17:28:33.000Z - Deterministic oracle-test split

- `UNIT-001` now always creates
  `tests/vitest/calculation-output-parity.test.ts`; the conditional parallel-test
  branch was removed while O3, O4b, and O-DIV-1 remain in the named oracle.
- This planning-only repair makes prior artifact/manifest hashes stale. It does
  not change readiness, implementation state, product code, or tests.

## 2026-07-10T17:33:08.000Z - Settled-scope baseline observation

- Four reads over 17 seconds matched at HEAD
  `e373bc865b978e237deb1d92011c96b0a3639fb4`, scoped status SHA-256
  `a30eacf3be2bcb7c9c78696f956d18fefe6e3250744053f734ffe65427200b33`,
  and scoped diff SHA-256
  `da33dd8e387cb4cfe2080d5cad1ec7f9404ccab413fdf42af63966b9a952a0c1`.
- This actual UTC observation supersedes prior provisional/future-dated freeze
  statements without promoting readiness or implementation state.

## 2026-07-10T18:33:45.000Z - Generation-4 migration-tail supersession

- Concurrent `migrations/0052_corporate_accounts.sql` invalidated Program
  generation 3 before Calculation Parity claimed its allocation.
- The pack's still-`UNCLAIMED` path is now
  `migrations/0056_estimate_calculation_input_constraints.sql` in generation 4.
  `UNIT-003` must validate the live tail, every owner manifest, allocation,
  receipt, and legacy scan immediately before writing.
- No migration, calculation, provider, browser, or production action occurred.

## 2026-07-10T18:57:45.000Z - Generation-4 settled-scope baseline observation

- Three exact-scope reads from `2026-07-10T18:57:29Z` through
  `2026-07-10T18:57:45Z` matched at HEAD
  `e373bc865b978e237deb1d92011c96b0a3639fb4`, scoped status SHA-256
  `32ab186503e591ed55166e492d900487088e6370ea03ffbca75fa52660378f56`,
  and scoped diff SHA-256
  `bd80a006b2a30dfba2880c0ec1e4881b399b100200a1849e3130e1ed26144edf`.
- The observed migration tail invalidated only the old lease; readiness and
  implementation state remain unchanged.

## 2026-07-11T12:00:00.000Z - Improve-stage baseline refresh and re-audit

- Supersedes the generation-4 baseline fingerprints above. Current `main` HEAD is
  `6069d87c271dc1509e97d1155da4d62c78d771cd`; scoped status SHA-256 is
  `25704e03c3dc112a0284d3b7ade000ce7665c09e3bb8dff56df3ed2020d53042`;
  scoped diff SHA-256 is
  `a0f675269811698024885eccd3728d0c30107bcc9bbbf0244081e9f0cfccfb7a`.
- Driven by improve-stage source-drift handling, not implementation. Re-audit
  confirmed all 16 cited formula-owner files (line oracle, editable model, chart
  aggregation, both summary SQL owners, publication snapshot/share,
  proposal-export model/workbook/settings/types, and the unification oracle
  test/fixtures) are byte-identical between `e373bc86..6069d87c` via an empty
  `git diff` over the cited paths. `SRC-001` through `SRC-005` and `EVID-001`
  remain `CURRENT`; no requirement, decision, risk, unit, test, gate, or
  criterion claim changed.
- Scoped drift is structural only: `main` advanced through estimate-sheet,
  performance-evidence, admin/corporate-account, and project-collaboration test
  churn; an untracked `migrations/0053_corporate_account_owner_integrity.sql`;
  and untracked estimate-sheet identity/fan-out/perf tests. None are the parity
  oracle or a cited calculation row-formula owner.
- Readiness and execution state are unchanged: `CONDITIONALLY_READY`,
  `NOT_STARTED`, `NOT_EVALUATED`, `ACTIVE`, `ACTIVE`; `SLICE-001` =
  `UNIT-001, UNIT-002`; exact next node `UNIT-001`.

## 2026-07-11T12:00:00.000Z - Generation-5 migration-slot hazard (advisory)

- The untracked `migrations/0053_corporate_account_owner_integrity.sql` does not
  match the generation-4 receipt's Publisher-allocated
  `migrations/0053_publication_foreign_keys.sql` slot. While `0053` remains
  untracked, the generation-4 receipt (tail `0052`) is internally consistent and
  Calculation's `0056` allocation stays `UNCLAIMED`.
- When `0053_corporate_account_owner_integrity.sql` is tracked (or any other
  pack claims a lower number), the migration tail advances and the Program must
  emit generation 5 with reissued unconsumed slots. `UNIT-003` must reject any
  receipt whose tail, allocations, owner manifests, or digests do not bind the
  then-current live tail before writing `migrations/<n>_estimate_calculation_input_constraints.sql`.
  This is advisory; no migration or product action occurred.

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

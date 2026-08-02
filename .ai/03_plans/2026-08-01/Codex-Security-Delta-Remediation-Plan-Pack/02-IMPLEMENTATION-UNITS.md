# Implementation Units

## DAG

`UNIT-001 -> UNIT-002`
`UNIT-001 -> UNIT-003`
`UNIT-001 -> UNIT-004`
`UNIT-001 -> UNIT-005`
`UNIT-001 -> UNIT-006`
`UNIT-002..UNIT-006 -> UNIT-007 -> UNIT-008`

All units remain planned until the July 31 authority reconciles this supplement
and assigns an exact delta.

This DAG is a candidate decomposition, not a second runnable queue. The July 31
`Code-Improvement` `UNIT-024` owns early admission and absorption. It maps
accepted work into July 31 units before source work and leaves this pack
non-runnable. July 31 `UNIT-020` later verifies the mapped evidence and performs
the terminal transition for all eight units here.

## UNIT-001 — Seal Finding, PR, And Owner Reconciliation

- Status: `PLANNED`
- Owner capability: security triage and integration lead
- Write scope: this Plan Pack and reconciliation evidence only
- Dependencies: none

### Work

1. Refresh cloud, local-scan, GitHub, July 31, and worktree fingerprints.
2. Verify exactly 200 unique cloud rows and all 21 PR records.
3. Assign each record one disposition, one owner, and one reopen trigger.
4. Map exact July 31 unit ownership before assigning any delta path.
5. Recalibrate severity using current exploitability and current controls.
6. Map only evidence-backed delta clusters to exact July 31 target units; never
   promote this supplement into a second runnable queue.
7. For every candidate unit, record one absorption outcome: mapped target work,
   active target work, evidence-backed no current delta, or hosted boundary.

### Acceptance

- No missing or duplicate `CSF-*` ID.
- Every `STILL_PRESENT` or `REGRESSED` row has one unit owner.
- Every `ACTIVE_EXISTING_UNIT` row names the existing pack/unit or PR owner.
- Every refuted row has reproducible counter-evidence.
- Every hosted-evidence row names the exact external proof still required.
- Every admitted target unit has exact one-writer paths, failure classification,
  fix-forward and cleanup steps, a last-good candidate/evidence fingerprint,
  and exact resume command/context before source work begins.
- A candidate cluster with no implementation delta receives a `VERIFIED`
  no-change evidence mapping at final absorption; it never stays `PLANNED` or
  becomes an invalid ready-slice dependency.
- No product file changes.

### Recovery

Fix reconciliation forward in this pack. Do not edit July 31 ownership until a
contradiction is proved and the owning pack is updated deliberately.
No unit status changes here before the July 31 `UNIT-024` admission receipt. The
only terminal status transition is performed by July 31 `UNIT-020` after every
mapped implementation or no-change outcome has final evidence.

## UNIT-002 — Identity, Authorization, Sessions, And Realtime

- Status: `PLANNED`
- Owner capability: auth/realtime security owner
- Dependencies: `UNIT-001`
- Candidate write scope:
  - `src/lib/auth/**`
  - `src/lib/authz/**`
  - `src/lib/commercial-terms/**`
  - exact component/estimate mutation boundaries assigned by UNIT-001
  - `src/lib/collaboration/**` and collaboration-room authorization
  - focused tests

### Invariants

- Estimate restrictions override project inheritance when disabled.
- Deleted/suspended accounts fail closed.
- Revocation blocks new and reconnecting capabilities.
- Every mutation performs current server-side resource authorization.
- Timing, session, and compatibility behavior remain explicit.

### Acceptance

Denial and success matrices cover restricted/inherited/direct grants, stale
sessions, deleted/suspended accounts, reconnects, viewer roles, concurrent
changes, and audit attribution.

### Recovery And Resume

Stop new auth/session edits at the first matrix regression, preserve the exact
failing role/resource case and last-good candidate hash, remove any duplicate
authorization path by fix-forward repair, and resume from the focused denial
command recorded in the unit receipt.

## UNIT-003 — Public, Privacy, API, Browser, And Worker Edge

- Status: `PLANNED`
- Owner capability: public/edge security owner
- Dependencies: `UNIT-001`
- Candidate write scope:
  - public share and client-portal routes/repositories
  - `src/lib/publication/**` and public activity projection
  - `src/middleware.ts`, `src/lib/auth/request-proxy.ts`, `worker.ts`
  - public Durable Object routers
  - browser cache/session handling and focused route/browser tests

### Invariants

- Bearer possession grants only the published view.
- Anonymous or cross-recipient views do not reveal recipient identity.
- Terms, maintenance, and session gates cover state/data APIs.
- Request bodies are bounded after cheap admission and before expensive parse.
- Named infrastructure objects cannot be fanned out before authenticated
  admission.

### Acceptance

Route, Worker-runtime, and browser tests cover anonymous, wrong-recipient,
expired, revoked, stale-cache, oversized-body, forged-origin, and rate-limit
paths without weakening valid public sharing.

### Recovery And Resume

Preserve the failing request/identity fixture and last-good browser/runtime
fingerprint, keep public data minimized while repairing forward, clean only
unit-owned local fixtures, and resume from the exact focused route/browser
command in the unit receipt.

## UNIT-004 — Upload, R2, Queue, Email, And External Effects

- Status: `PLANNED`
- Owner capability: upload/async-boundary security owner
- Dependencies: `UNIT-001`
- Candidate write scope:
  - `src/lib/uploads/**` and upload/brand-asset routes
  - exact R2 and queue producers/consumers
  - support inbox/email boundaries
  - Worker queue/cron integration through the integration owner
  - focused tests

### Invariants

- Type, size, checksum, tenant, and auth checks occur before expensive work.
- Only authoritative scanner state can make protected content usable.
- Queue messages are authenticated, deduplicated, idempotent, and recoverable.
- Email input and evidence are redacted and injection-safe.
- Failure never silently converts unknown to clean or complete.

### Acceptance

Tests cover clean/infected/unavailable scanners, malformed and duplicate
messages, poison retries, partial failures, cross-tenant claims, oversized
uploads, removal races, and recovery.

### Recovery And Resume

Do not replay or duplicate external effects. Quarantine unit-owned local test
objects/messages, preserve idempotency keys and partial-state evidence, record
the last-good candidate, repair forward, and resume from the exact failing
queue/upload/email command.

## UNIT-005 — D1 Privacy, Retention, Audit, And Tenant Data

- Status: `PLANNED`
- Owner capability: D1/privacy data owner
- Dependencies: `UNIT-001`
- Candidate write scope:
  - current `migrations/**` only when required
  - retention/compliance/audit repositories
  - current D1 tenant and lifecycle paths assigned by UNIT-001
  - focused data and migration tests

### Invariants

- No current tenant query, backfill, or relation crosses workspace scope.
- Pagination completes; fixed caps do not silently omit eligible rows.
- Audit actors and retained metadata remain accurate and minimal.
- Migrations have deterministic rehearsal, parity checks, and fix-forward repair.
- Supabase-only artifacts are never modified as current remediation.

### Acceptance

Tenant isolation, pagination, retention, erasure/export, legal hold, corrupted
row, migration, rollback/fix-forward, concurrency, and idempotency evidence
passes.

### Recovery And Resume

Never apply an unproved migration beyond the local rehearsal. Preserve the
failing database and evidence fingerprint, create a deterministic forward
repair rather than destructive rollback, document cleanup of unit-owned local
fixtures, and resume from the exact migration/data command.

## UNIT-006 — Supply Chain, CI, Configuration, And Local Tooling

- Status: `PLANNED`
- Owner capability: repository security and operations owner
- Dependencies: `UNIT-001`
- Candidate write scope:
  - `.github/**`
  - exact `scripts/**` and agent/MCP tooling assigned by UNIT-001
  - `package.json` and lockfile only for confirmed dependency findings
  - task-required config and observability tests

### Invariants

- Actions, CLIs, MCP servers, and bootstrap installers are immutable or
  integrity-verified.
- Release evidence proves trusted revision ancestry and least privilege.
- Local servers never disclose capabilities or files across untrusted origins.
- Cookie/token evidence is scoped to an attested loopback peer and safe target.
- Path joins enforce containment after decoding and normalization.
- Synchronized tool copies share one tested implementation.

### Acceptance

Workflow permission/provenance checks, dependency review, origin/CORS tests,
token-redaction tests, path-containment tests, safe-cookie-target tests, and
developer workflow regressions pass. Hosted GitHub enforcement remains AUTH-001.

### Recovery And Resume

Preserve observed tool versions, integrity records, failing command, and
last-good developer-workflow fingerprint. Repair forward with pinned artifacts,
redact or revoke any exposed test capability, clean only unit-owned temporary
state, and resume from the exact focused tooling command.

## UNIT-007 — Cross-Cluster Q2 Integration And Independent Review

- Status: `PLANNED`
- Owner capability: integration and verification lead
- Evidence dependencies: `UNIT-002` through `UNIT-006`; each is ultimately
  `VERIFIED` by mapped July 31 implementation evidence or a no-change receipt.
- Write scope: integration tests and evidence; product repair only after
  explicit ownership reassignment

### Acceptance

- Focused and broader tests pass at one sealed candidate.
- Denial, abuse, failure, recovery, concurrency, idempotency, and fault cases
  cover every changed security boundary.
- Changed and critical mutation pass with no high-risk survivor.
- Critical changed branches have 100% coverage.
- Browser proof runs for changed browser/public behavior.
- Workers-runtime integration runs for Worker/DO/queue changes.
- Independent quality and separate independent security reviews both approve.

## UNIT-008 — Final Reconciliation And Closeout

- Status: `PLANNED`
- Owner capability: lead verifier and manifest integrator
- Dependencies: `UNIT-007`
- Write scope: reconciliation, evidence, manifest, and durable state only

### Acceptance

- All 200 cloud occurrences and all current local findings have terminal
  evidence-backed dispositions.
- All 21 PR records are refreshed against final head SHA and merge state.
- Supported standard/path, working-tree, and nonempty change scans complete and
  export; deep, match, and compare either complete or use the documented
  repeated-tool-failure fallback.
- Deep/history operations get one fresh retry. On the repeated deterministic
  artifact/history failure, hashed private logs plus deterministic path and
  working-tree scans and artifact-level root-cause correlation replace only the
  unavailable operation; no deep or history-comparison coverage is claimed.
- No unresolved High/Critical issue or high-risk mutant remains.
- Q2 aggregate and both reviews pass.
- Hosted claims are either proved externally under exact authorization or remain
  explicit boundaries.
- The July 31 `UNIT-024` admission receipt and `UNIT-020` closeout receipt bind
  this manifest, all mappings, and the final candidate.
- The closeout receipt contains exactly 221 mapping results. Each result repeats
  its admitted owner/outcome, records the actual terminal owner status, and
  binds outcome-compatible candidate evidence; implementation owners are
  `VERIFIED`, while no-change and hosted-boundary decisions carry explicit
  mapping-specific decision evidence.
- Every mapping leaf and decision file is repository-contained, non-ignored,
  Git-tracked, free of reparse traversal, and present by identical hash in the
  frozen integrated candidate before final browser or reviewer evidence.
- All eight units become `VERIFIED`; implementation becomes `COMPLETE`, package
  becomes `IMPLEMENTATION_READY`, terminal becomes `ACHIEVED`, lifecycle becomes
  `ARCHIVE_READY`, and no next unit or ready slice remains. Release is `BOUNDARY`
  only while the exact GitHub authorization or boundary record remains active;
  otherwise it is `READY`.
- `validate:plan-pack` passes twice, including after hash refresh.

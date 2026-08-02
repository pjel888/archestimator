# Codex Security Delta Remediation Plan

## 1. Task Contract

### Target result

Reconcile every current Codex Security concern against the current Archestimator
source, remove duplicate ownership, implement only the still-valid delta, and
finish with fresh `Q2_CRITICAL_CHANGE_GATE` evidence plus repeat Codex Security
proof showing no unresolved High or Critical finding.

### Inputs

- Private Codex cloud export: 200 findings, all initially `new`.
- Cloud severity distribution: 14 High, 80 Medium, 33 Low, 73 Informational.
- Local standard scan: complete coverage, 9 reportable findings.
- Local working-tree scan: complete coverage, 0 reportable findings for its
  sealed starting snapshot.
- GitHub inventory: 19 open security-relevant PRs plus closed supersessions
  `#147` and `#148`, refreshed read-only on 2026-08-01 with no selected PR
  merged.
- Two focused validations:
  - commercial-terms authorization bypass: suppressed after the canonical
    downstream intent guard was traced;
  - anonymous publication activity recipient-name exposure: confirmed Medium.
- Supplemental AgentShield configuration scan: grade B (89), 6 findings, no
  tainted flows, 70/70 injection payloads blocked, and no repository mutation.
- Current-source successor:
  `.ai/03_plans/2026-07-31/Code-Improvement/`.

### Scope

- Current D1, Better Auth, Worker, Durable Object, R2, queue, email, public-link,
  client-portal, upload, commercial, admin, and repository-tooling boundaries.
- Exact reconciliation of `CSF-001` through `CSF-200`.
- Exact reconciliation of `#124`-`#129`, `#138`, `#140`-`#153`, including the
  two closed supersessions.
- Delta implementation only after `UNIT-001` proves one owner per finding.
- Local Q2 evidence, independent quality review, independent security review,
  rerun/export plus match/compare or documented artifact-correlation fallback,
  and final requirement audit.

### Non-goals

- Do not reactivate or copy the cancelled July 19 InfoSec pack.
- Do not duplicate July 31 units or implement an open PR a second time.
- Do not mutate legacy `supabase/migrations/` or the retired Supabase project.
- Do not deploy, merge PRs, alter GitHub hosted controls, mark cloud findings
  false positive, apply generated patches, or create paid services.
- Do not infer hosted or production truth from local source or local tests.

### Stop condition

Stop only when all 200 cloud occurrences, all current local findings, and all
21 PR records have terminal reconciliations; accepted delta units are verified;
Q2 aggregation and both independent reviews pass; supported repeat scans and
root-cause correlation complete under the tool-failure rule; no unresolved
High/Critical finding remains; and the Plan Pack validator passes with fresh
hashes. Absorption by the July 31 authority is the only execution path:
`UNIT-024` maps every record before source work, and `UNIT-020` later transitions
this supplement to validator-valid `ACHIEVED` / `ARCHIVE_READY` state.

## 2. Authority And Baseline

- Baseline HEAD: `3e9a2d1e0bc529ac89d98d16233c603886b7b038`.
- The shared dirty worktree is inherited, excluded from this pack's baseline
  hashes, and must remain preserved.
- The July 31 Code Improvement pack remains the sole whole-repository execution
  authority. This pack owns only Codex Security reconciliation and proven delta
  work not already assigned there.
- `wrangler.jsonc` remains provider truth. Supabase-only findings are historical
  provider findings unless a current D1 analogue is independently demonstrated.

## 3. Current Evidence Verdict

- The cloud export is complete at 200 rows and is held outside the repository.
  The committed evidence stores only sanitized metadata, synthetic IDs,
  dispositions, and source references.
- The whole-repository standard scan statically reviewed 13,379 paths and
  reported complete coverage. It produced 9 findings, but its saved-history
  ingestion failed after artifact generation because a Codex session event
  exceeded the CLI's 1 MiB safety limit.
- The working-tree scan sealed successfully with complete coverage and 0
  findings. Its warning that the worktree changed during execution means the
  sealed starting snapshot, not the later worktree, is authoritative.
- The committed `origin/main..HEAD` diff contains zero files. The CLI retained
  partial evidence but could not seal the empty diff because
  `scan.target.snapshotDigest` was empty.
- The standard scan's 9 current findings are independent delta inputs even when
  no cloud title matches them exactly.
- AgentShield npm package 1.4.0 (CLI 1.5.0) scanned the project `.claude`
  configuration without fixes.
  It reported 3 High, 2 Medium, and 1 Low configuration findings. Its advanced
  checks found 0 tainted flows, blocked all 70 injection payloads, executed no
  eligible hooks in the sandbox, and found 0 risky packages among 0 detected
  MCP npm packages. These are repository-tooling inputs for `UNIT-006`, not
  application-runtime clearance.
- The refreshed GitHub APIs report 0 open Dependabot alerts. Secret-scanning
  returned 404, while code-scanning alerts, branch protection, and rulesets
  returned 403 under the current private-repository entitlement. These results
  are boundaries, not proof that a hosted control is absent or configured.

## 4. Requirements

### REQ-001 — One reconciled authority

Every `CSF-001` through `CSF-200` occurrence and every relevant PR record has
one disposition, one current owner, current evidence, and an explicit reopen
trigger. No finding may be silently dropped because a scan did not repeat it.

### REQ-002 — Identity and authorization integrity

Restricted estimates, accounts, sessions, component propagation, commercial
terms, and realtime capabilities enforce current server-side authorization and
revocation.

### REQ-003 — Public and privacy boundaries

Public shares, client portals, publisher surfaces, browser caches, APIs, Worker
routers, and activity feeds disclose only policy-authorized data and fail
closed.

### REQ-004 — Upload and asynchronous integrity

Uploads, scanning, R2, queues, Durable Objects, email, cron, and external
effects enforce bounded admission, tenant isolation, authoritative state,
idempotency, and recovery.

### REQ-005 — D1 data, retention, and audit integrity

Current D1 data paths preserve tenant boundaries, deletion/retention semantics,
audit attribution, migration safety, and fix-forward recovery.

### REQ-006 — Supply-chain and tooling integrity

Workflows, dependencies, MCP/agent tooling, local servers, evidence collectors,
configuration, and security observability remove mutable execution, credential
exposure, unsafe path/origin handling, and provenance ambiguity.

### REQ-007 — Q2 completion evidence

Every implemented delta passes focused denial and abuse tests, affected
integration/runtime tests, changed/critical mutation, critical branch coverage,
static/build checks, browser proof where the boundary crosses a browser, and
independent quality and security reviews.

### REQ-008 — Security closeout

Fresh supported Codex Security scans are exported and correlated; `match` and
`compare` run when two completed history records exist. A repeated deterministic
deep/history tool failure uses the documented path-scan and artifact-correlation
fallback without claiming deep coverage. All findings receive final
dispositions; no High/Critical issue or high-risk mutant remains; hosted-only
claims remain explicit boundaries; and the pack validates.

## 5. Decisions

- `DEC-AUTO-001`: Use one delta pack, not multiple finding packs.
- `DEC-AUTO-002`: Keep July 31 as whole-repository authority; overlaps use
  `ACTIVE_EXISTING_UNIT` and never create a second implementation.
- `DEC-AUTO-003`: Treat cloud absence from a local scan as unknown, not proof of
  remediation.
- `DEC-AUTO-004`: Use the conservative disposition vocabulary in
  `01-FINDINGS-AND-OVERLAP-RECONCILIATION.md`.
- `DEC-AUTO-005`: Confirmed vulnerabilities are implemented through central
  security boundaries, not per-call-site patches.
- `DEC-AUTO-006`: Hosted controls, deployments, PR merges, and finding-state
  mutations remain outside the local implementation ceiling.
- `DEC-AUTO-007`: The July 31 `Code-Improvement` pack remains the sole runnable
  authority. Its current `UNIT-024` owns early admission and absorption of this
  supplement; its final `UNIT-020` owns the receipt-driven terminal transition.
  This pack never becomes an independent runnable authority.

## 6. Authorization Boundary

`AUTH-001` is limited to obtaining and, if separately specified, changing hosted
GitHub security-control state for this repository when current entitlement or
access returns 403/404. Completed safe prerequisites are the read-only PR and
Dependabot inventory, hashed endpoint responses, local workflow review, and
local scan evidence. Continuation begins by rerunning the read-only GitHub API
queries recorded in the scan summary; any mutation must create a new exact
action record naming one setting, desired value, actor, and verification step.
Deployment, destructive production data, paid services, PR merge/close, Codex
cloud mutations, patches, and unbound providers remain non-goals rather than
prerequisites for local closeout.

## 7. Assumptions

- `ASSUMP-001`: The private 200-row export and current read-only GitHub inventory
  are the complete starting ledgers for `UNIT-001`; any later cloud or PR drift
  invalidates their affected dispositions.
- `ASSUMP-002`: Units 002 through 006 receive exact one-writer path ownership
  only after `UNIT-001`; their present path examples are discovery evidence, not
  advance ownership.
- `ASSUMP-003`: Local evidence cannot prove deployed Cloudflare, GitHub, DNS,
  WAF, branch-protection, or secret-scanning state. Cloudflare, DNS, and WAF
  remain unproven non-goals; only GitHub hosted security-control state is under
  `AUTH-001` until separately authorized and observed.

## 8. Material Risks

- `RISK-001`: A second active authority creates duplicate or conflicting fixes.
- `RISK-002`: Authorization repairs may preserve project access while missing
  estimate-level restrictions or revocation.
- `RISK-003`: Async fixes may trade security for availability or orphan state.
- `RISK-004`: Tooling fixes may break developer workflows or leave synchronized
  copies vulnerable.
- `RISK-005`: Shared-worktree drift can stale scan, PR, path, and evidence
  fingerprints.

## 9. Execution

The exact unit contracts and DAG are in
[02-IMPLEMENTATION-UNITS.md](./02-IMPLEMENTATION-UNITS.md). No unit may start
from this manifest while it is `NOT_READY`. The July 31 `Code-Improvement`
`UNIT-024` is the exact admission/absorption owner: it executes the `UNIT-001`
checklist as an intake step, writes
`evidence/unit-024-codex-security-supplement-disposition.json` in its own pack,
and maps every accepted delta into a July 31 unit before product-source work.
This pack never becomes independently runnable. After the mapped July 31 work
and Q2 evidence finish, July 31 `UNIT-020` writes
`evidence/unit-020-codex-security-supplement-closeout.json` and transitions all
eight units here to `VERIFIED`, all records to terminal evidence states,
implementation to `COMPLETE`, package to `IMPLEMENTATION_READY`, terminal to
`ACHIEVED`, lifecycle to `ARCHIVE_READY`, and no next unit or ready slice.

The evidence and review contract is in
[03-VERIFICATION-AND-REVIEWS.md](./03-VERIFICATION-AND-REVIEWS.md).

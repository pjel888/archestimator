# Implementation Unit Catalog

Initial package state: `CONDITIONALLY_READY`. `UNIT-000` is the sole ready unit.
Product units remain `PLANNED` until predecessor authority is reconciled and this
manifest is refreshed. Every unit starts with current-source reconciliation and
GitNexus upstream impact for each symbol to be edited.

Tests are part of the owning unit. Exact commands, report paths, and thresholds
are in `03-VERIFICATION-MATRIX.md`.

## Dependency Graph

```text
UNIT-000 -> all product, decision, and closeout units
UNIT-002 -> UNIT-004 -> UNIT-012
UNIT-007 -> UNIT-008
UNIT-007 + UNIT-011 -> UNIT-010
UNIT-024 -> UNIT-009 -> UNIT-025
UNIT-013 -> UNIT-026
UNIT-015 -> UNIT-016 + UNIT-017
UNIT-018 -> UNIT-019
UNIT-006 -> UNIT-021
UNIT-001..UNIT-019 + UNIT-021..UNIT-024 + UNIT-027 -> UNIT-028
UNIT-028 -> UNIT-020
```

`UNIT-025` and `UNIT-026` are conditional implementation branches. Their
decision units must emit a machine-readable decision receipt with
`decision_id`, `candidate_revision`, `outcome`, `evidence_paths`,
`fallbacks`, `unit_transitions`, `requirement_transitions`,
`criterion_transitions`, and `terminal_effect`. A conditional `PLANNED` unit
never satisfies a dependency.

- Activation transitions the branch `PLANNED -> READY`; it must then reach
  `VERIFIED` before `UNIT-020`.
- A prohibited external/provider action transitions the branch
  `PLANNED -> SUPERSEDED`, the affected criterion to `BOUNDARY`, and preserves
  `AUTH-001`. After every safe local unit and review passes, the only truthful
  terminal state is `AUTH_BLOCKED`, not `ACHIEVED`.
- Exhausting at least two materially different local designs transitions the
  branch `PLANNED -> BLOCKED` and its exact linked core requirement to
  `BLOCKED`: scanner viability owns `REQ-006`; session compatibility owns
  `REQ-002`. The pack remains active with a `QUALITY_BLOCKED` result while
  other work is runnable and may become `TECH_BLOCKED` only through the
  separate exact-candidate terminal gate when no runnable unit remains.
- `ACHIEVED` permits only `VERIFIED` activated branches or decision-backed
  `SUPERSEDED` branches proven genuinely not applicable; it never converts an
  authorization or technical failure into completion.

The conditional branches are deliberately absent from `UNIT-020`'s static DAG
because the validator rejects general `SUPERSEDED` dependencies in ready
slices. Manifest `GATE-020` plus the executable closeout promotion guard in
`03-VERIFICATION-MATRIX.md` keeps `UNIT-020=PLANNED` until each branch is either
`VERIFIED` or authorization-backed `SUPERSEDED`; a `BLOCKED` branch prevents
closeout and follows the `TECH_BLOCKED` path.

---

## `UNIT-000` - Execution authority and quality-baseline reconciliation

Status: `READY`  
Profile: `Q2_CRITICAL_CHANGE_GATE`  
Findings: `QA-001`  
Depends on: none

### Target

Restore executable component-baseline lineage, then make this pack the single
runnable whole-repository authority without deleting historical evidence or
falsely marking predecessor implementation achieved.

### Primary files

Every path below is an explicit `UNIT-000` input; no discovery glob substitutes
for this inventory.

Quality contract:

- `scripts/quality/component-core.ts`
- `tests/vitest/quality/component-baseline-integrity.test.ts`
- `quality/baseline.json`
- `quality/baselines/component/admission.json`
- `quality/baselines/component/inventory.json`

Current successor controls:

- `.ai/03_plans/2026-07-31/Code-Improvement/00-PLAN.md`
- `.ai/03_plans/2026-07-31/Code-Improvement/README.md`
- `.ai/03_plans/2026-07-31/Code-Improvement/01-AUDIT-REGISTER.md`
- `.ai/03_plans/2026-07-31/Code-Improvement/02-UNIT-CATALOG.md`
- `.ai/03_plans/2026-07-31/Code-Improvement/03-VERIFICATION-MATRIX.md`
- `.ai/03_plans/2026-07-31/Code-Improvement/plan-pack.json`
- `.ai/03_plans/2026-07-31/Code-Improvement/evidence/initial-plan-authors.json`

July 19 whole-repository predecessor controls:

- `.ai/03_plans/2026-07-19/2026-07-19-Archestimator-Whole-Repo-Quality-Master-Plan-Pack/plan-pack.json`
- `.ai/03_plans/2026-07-19/2026-07-19-Archestimator-Whole-Repo-Quality-Master-Plan-Pack/README.md`
- `.ai/03_plans/2026-07-19/2026-07-19-Archestimator-Whole-Repo-Quality-Master-Plan-Pack/IMPLEMENTATION_PLAN.md`
- `.ai/03_plans/2026-07-19/2026-07-19-Archestimator-Whole-Repo-Quality-Master-Plan-Pack/LOOP_LEDGER.md`
- `.ai/03_plans/2026-07-19/2026-07-19-Archestimator-Whole-Repo-Quality-Master-Plan-Pack/UNIT-CATALOG.md`
- `.ai/03_plans/2026-07-19/2026-07-19-Archestimator-Whole-Repo-Infosec-OWASP-Audit-Plan-Pack/plan-pack.json`
- `.ai/03_plans/2026-07-19/2026-07-19-Archestimator-Whole-Repo-Infosec-OWASP-Audit-Plan-Pack/README.md`
- `.ai/03_plans/2026-07-19/2026-07-19-Archestimator-Whole-Repo-Infosec-OWASP-Audit-Plan-Pack/00-PLAN.md`
- `.ai/03_plans/2026-07-19/2026-07-19-Archestimator-Whole-Repo-Infosec-OWASP-Audit-Plan-Pack/PACK-MANIFEST.md`
- `.ai/03_plans/2026-07-19/2026-07-19-Archestimator-Whole-Repo-Infosec-OWASP-Audit-Plan-Pack/03-HISTORICAL-AND-ACTIVE-PLAN-RECONCILIATION.md`
- `.ai/03_plans/2026-07-19/2026-07-19-Archestimator-Whole-Repo-Infosec-OWASP-Audit-Plan-Pack/units/README.md`

July 20 targeted predecessor controls:

- `.ai/03_plans/2026-07-20/README.md`
- `.ai/03_plans/2026-07-20/Quick-Correctness-And-Security-Wins/plan-pack.json`
- `.ai/03_plans/2026-07-20/Quick-Correctness-And-Security-Wins/00-PLAN.md`
- `.ai/03_plans/2026-07-20/Quick-Correctness-And-Security-Wins/README.md`
- `.ai/03_plans/2026-07-20/Test-Characterization-Baselines/plan-pack.json`
- `.ai/03_plans/2026-07-20/Test-Characterization-Baselines/00-PLAN.md`
- `.ai/03_plans/2026-07-20/Test-Characterization-Baselines/README.md`
- `.ai/03_plans/2026-07-20/D1-Runtime-Consolidation/plan-pack.json`
- `.ai/03_plans/2026-07-20/D1-Runtime-Consolidation/00-PLAN.md`
- `.ai/03_plans/2026-07-20/D1-Runtime-Consolidation/README.md`
- `.ai/03_plans/2026-07-20/Estimate-Mutation-Integrity-Unification/plan-pack.json`
- `.ai/03_plans/2026-07-20/Estimate-Mutation-Integrity-Unification/00-PLAN.md`
- `.ai/03_plans/2026-07-20/Estimate-Mutation-Integrity-Unification/README.md`
- `.ai/03_plans/2026-07-20/Money-Math-Domain-Module/plan-pack.json`
- `.ai/03_plans/2026-07-20/Money-Math-Domain-Module/00-PLAN.md`
- `.ai/03_plans/2026-07-20/Money-Math-Domain-Module/README.md`

Current inbound ownership/index references:

- `.ai/03_plans/README.md`
- `.ai/03_plans/2026-07-18-MVP-Startup-Readiness-Audit/00-PLAN.md`
- `.ai/03_plans/2026-07-18-MVP-Startup-Readiness-Audit/README.md`
- `.ai/03_plans/2026-07-18-MVP-Startup-Readiness-Audit/013-external-row-total-divergence.md`
- `.ai/03_plans/2026-07-19/2026-07-19-Archestimator-Cloudflare-Hosted-Release-Recovery-Operations-Audit-Plan-Pack/00-PLAN.md`
- `.ai/03_plans/2026-07-19/2026-07-19-Archestimator-Cloudflare-Hosted-Release-Recovery-Operations-Audit-Plan-Pack/04-FINDINGS-REGISTER.md`
- `.ai/03_plans/2026-07-19/2026-07-19-Archestimator-Cloudflare-Hosted-Release-Recovery-Operations-Audit-Plan-Pack/LOOP_LEDGER.md`
- `.ai/03_plans/2026-07-19/2026-07-19-Archestimator-Cloudflare-Hosted-Release-Recovery-Operations-Audit-Plan-Pack/README.md`
- `.ai/03_plans/2026-07-19/2026-07-19-Archestimator-Cloudflare-Hosted-Release-Recovery-Operations-Audit-Plan-Pack/plan-pack.json`
- `.ai/03_plans/2026-07-19/2026-07-19-Archestimator-Cloudflare-Hosted-Release-Recovery-Operations-Audit-Plan-Pack/units/UNIT-002-observability-alert-delivery.md`
- `.ai/03_plans/2026-07-19/2026-07-19-Archestimator-Cloudflare-Hosted-Release-Recovery-Operations-Audit-Plan-Pack/units/UNIT-003-hosted-oauth-roundtrip.md`
- `.ai/03_plans/2026-07-19/2026-07-19-Archestimator-Cloudflare-Hosted-Release-Recovery-Operations-Audit-Plan-Pack/units/UNIT-004-email-dns-topology.md`
- `.ai/03_plans/2026-07-19/2026-07-19-Archestimator-Cloudflare-Hosted-Release-Recovery-Operations-Audit-Plan-Pack/units/UNIT-005-hosted-queue-do-r2-ops.md`
- `.ai/03_plans/2026-07-19/2026-07-19-Archestimator-Cloudflare-Hosted-Release-Recovery-Operations-Audit-Plan-Pack/units/UNIT-006-release-gate-ritual.md`
- `.ai/03_plans/2026-07-19/2026-07-19-Archestimator-Cloudflare-Hosted-Release-Recovery-Operations-Audit-Plan-Pack/units/UNIT-007-d1-parity-retention.md`
- `.ai/03_plans/2026-07-19/2026-07-19-Archestimator-Live-Design-Partner-Journey-UX-Audit-Plan-Pack/00-PLAN.md`
- `.ai/03_plans/2026-07-19/2026-07-19-Archestimator-Live-Design-Partner-Journey-UX-Audit-Plan-Pack/LOOP_LEDGER.md`
- `.ai/03_plans/2026-07-19/2026-07-19-Archestimator-Live-Design-Partner-Journey-UX-Audit-Plan-Pack/README.md`
- `.ai/03_plans/2026-07-19/2026-07-19-Archestimator-Live-Design-Partner-Journey-UX-Audit-Plan-Pack/units/001-action-inbox-async-server-actions.md`
- `.ai/03_plans/2026-07-19/2026-07-19-Archestimator-Live-Design-Partner-Journey-UX-Audit-Plan-Pack/units/008-magic-link-and-session-expiry-copy.md`
- `.ai/03_plans/2026-07-19/2026-07-19-Archestimator-Live-Design-Partner-Journey-UX-Audit-Plan-Pack/units/011-share-password-ux.md`
- `.ai/03_plans/2026-07-19/2026-07-19-ASIA-MANILA-Archestimator-Commercial-Estimate-Truth-Data-Integrity-Audit-Plan-Pack/00-PLAN.md`
- `.ai/03_plans/2026-07-19/2026-07-19-ASIA-MANILA-Archestimator-Commercial-Estimate-Truth-Data-Integrity-Audit-Plan-Pack/README.md`
- `.ai/03_plans/2026-07-19/2026-07-19-ASIA-MANILA-Archestimator-Commercial-Estimate-Truth-Data-Integrity-Audit-Plan-Pack/UNIT-CATALOG.md`
- `.ai/03_plans/2026-07-19/2026-07-19-ASIA-MANILA-Archestimator-Commercial-Estimate-Truth-Data-Integrity-Audit-Plan-Pack/plan-pack.json`

Historical `source-snapshots/`, raw evidence, and audit observations that do not
assign current execution ownership remain byte-preserved.

### Work and acceptance

1. Repair bootstrap-lineage validation so the byte-identical first admitted
   baseline remains valid after its introduction when the immutable comparison
   base has no predecessor. Reject modified bootstrap content,
   deletion/reintroduction, comparison-base rollback, and a second bootstrap
   after established history; leave established predecessor/hash/ratchet
   validation unchanged and do not rewrite the admitted baseline to appease the
   faulty validator.
2. Extend `tests/vitest/quality/component-baseline-integrity.test.ts` with
   repository-history fixtures proving both sides of that contract, then require
   `bun run quality:contracts` to return zero findings.
3. Create
   `.ai/03_plans/2026-07-31/Code-Improvement/evidence/unit-000-predecessor-dispositions.json`
   with exactly one row for every unit in both July 19 manifests and all five
   July 20 manifests. Each row contains `predecessor_manifest`,
   `predecessor_unit_id`, one of `ABSORBED_CURRENT_UNIT`,
   `LANDED_CURRENT_SOURCE`, `REFUTED_CURRENT_SOURCE`, or `AUTH_BOUNDARY`, plus
   the current unit/decision/evidence IDs required by that disposition.
   `evidence_paths` is a nonempty array of closed objects with repository-relative
   `path`, current-file `sha256`, and the disposition document's 40-character
   `source_revision`; nonexistent, escaping, `.tmp`, or mismatched evidence is
   invalid. A still-current predecessor unit missing from this catalog must be
   added here before its predecessor becomes non-runnable.
4. Make absorbed predecessor manifests validator-valid but non-runnable:
   `package_status=NOT_READY`, `plan_lifecycle=N/A`, `next_unit=null`, empty
   `ready_slices`, and zero `READY`/`IN_PROGRESS` units. Preserve truthful
   `NOT_STARTED`/`INCOMPLETE` implementation state; use decision-backed
   `SUPERSEDED` per unit rather than claiming implementation.
5. Rewrite every listed prose ownership/index reference to this exact path,
   `.ai/03_plans/2026-07-31/Code-Improvement/`, or label it historical.
6. Revalidate every touched manifest and this pack.
7. Before the final freeze, atomically stage this pack's post-unit state:
   `UNIT-000=VERIFIED`, `implementation_status=IN_PROGRESS`,
   `last_observed_run_scope=IMPLEMENT_LOCAL`, a dependency-ready `next_unit`,
   and ready slices containing only dependency-ready units; then reseal.
8. Freeze that post-transition candidate. Activate product work only after the
   normalized authority receipt proves an exact predecessor-unit disposition
   set, `PASS` for every touched pack validator, this pack as the only runnable
   whole-repository authority, every targeted July 20 manifest as non-runnable,
   candidate-bound focused evidence, independent Q2 quality/security approvals,
   and an exact-candidate Q2/Q3 verifier receipt. No tracked write follows the
   passing receipt; failure reopens this unit rather than preserving an
   unsupported `VERIFIED` state.

---

## `UNIT-001` - Commercial and proposal truth integrity

Status: `PLANNED`  
Profile: `Q2_CRITICAL_CHANGE_GATE`  
Findings: `COR-001`, `COR-002`, `COR-008`  
Depends on: `UNIT-000`

### Target

Use canonical inherited workspace authorization for commercial mutations, bind
the guarded actor exactly once, and include both quantity sidecars in proposal
identity.

### Primary files

- `src/lib/commercial-terms/repository.ts`
- `src/lib/estimates/mutation-receipts.ts`
- `src/lib/authz/d1-access.ts` only to expose an existing helper
- `src/components/workshop/estimate-sheet/proposal-preview-model.ts`

### Acceptance

- legitimate inherited member succeeds and cross-workspace actor fails;
- placeholder and value counts match in success and stale-revision paths;
- changing only `quantityBase` or `quantityContingencyAmount` changes identity;
- CAS, tenant qualification, and mutation receipts remain intact.

---

## `UNIT-002` - Portal credential re-verification

Status: `PLANNED`  
Profile: `Q2_CRITICAL_CHANGE_GATE`  
Findings: `COR-003`  
Depends on: `UNIT-000`

### Target

Treat a fresh credential claim as success when recipient-level verification is
already complete, without weakening one-time, expiry, revocation, or portal
scope.

### Primary files

- `src/lib/client-portal/public-repository.ts`
- `src/lib/client-portal/public-session-handler.ts`

### Acceptance

First and fresh second credentials verify; replay, expired, revoked, consumed,
wrong-portal, and cross-recipient credentials fail; browser resend then open
reaches the intended portal.

---

## `UNIT-003` - Notification keyset traversal and UI paging

Status: `PLANNED`  
Profile: `Q2_CRITICAL_CHANGE_GATE`  
Findings: `COR-004`  
Depends on: `UNIT-000`

### Target

Return every notification exactly once under stable `(delivered_at,id)` keyset
ordering and make older pages reachable.

### Primary files

- `src/lib/notifications/repository.ts`
- `src/features/notifications/hooks/useNotificationsQuery.ts`
- `src/features/notifications/components/NotificationCenter.tsx`

### Acceptance

The cursor comes from the last returned row, equal timestamps are deterministic,
page concatenation has no gap/duplicate, load-more is accessible, and
read/dismiss/ack reconciles every cached page.

---

## `UNIT-004` - Truthful and durable publication delivery

Status: `PLANNED`  
Profile: `Q2_CRITICAL_CHANGE_GATE`  
Findings: `COR-005`, `PERF-006`  
Depends on: `UNIT-002`

### Target

Never return `sent` without durable state and converge legacy recipient delivery
on an explicit recoverable path.

### Primary files

- `src/lib/publication/actions.ts`
- `src/lib/publication/admin-d1-client.ts`
- legacy publication recipient helpers
- existing Client Portal notification queue adapter
- active D1 migrations only if a legacy delivery intent remains required

### Acceptance

Provider success plus D1 failure returns truthful pending/uncertain state;
provider delay does not block the durable request; retry, supersession,
dead-letter, and replay are idempotent; prior valid links survive resend failure.

Delete legacy authoring if no current caller/user requirement exists. Otherwise
use a versioned explicit adapter, not implicit Client Portal payload reuse.

---

## `UNIT-005` - Support and portal thread boundary integrity

Status: `PLANNED`  
Profile: `Q2_CRITICAL_CHANGE_GATE`  
Findings: `COR-006`, `COR-009`, `SEC-012`  
Depends on: `UNIT-000`

### Target

Make losing support replays side-effect-free, bind repository access to an
explicit actor, and prevent post-query visibility filters from stranding pages.

### Primary files

- `src/lib/repositories/support-conversations-d1.ts`
- support action/service callers
- `src/lib/client-portal/thread-repository.ts`
- `src/components/client-portal/ClientPortalDiscussionSection.tsx`

### Acceptance

One concurrent insertion yields one side-effect set; a losing replay cannot
reassert unread; low-level cross-tenant/user calls fail; sparse/all-hidden pages
make bounded progress without leaking rows.

---

## `UNIT-006` - Component/template referential integrity

Status: `PLANNED`  
Profile: `Q2_CRITICAL_CHANGE_GATE`  
Findings: `COR-007`  
Depends on: `UNIT-000`

### Target

Keep estimate rows and component-template selections valid when variants are
replaced, archived, or removed.

### Primary files

- `src/lib/component-library/component-mutation-d1.ts`
- `src/lib/component-library/template-propagation-d1.ts`
- template-selection schema and active migrations

### Acceptance

Every persisted variant reference is inventoried; legal repoints happen in the
same transaction; no-target removal fails before writes; propagation never reads
an inactive/missing selection; replay and stale revision remain idempotent.

---

## `UNIT-007` - Durable realtime revocation

Status: `PLANNED`  
Profile: `Q2_CRITICAL_CHANGE_GATE`  
Findings: `SEC-001`  
Depends on: `UNIT-000`

### Target

Persist a per-room subject revocation watermark and reject reconnects made with
tokens issued at or before it.

### Primary files

- `src/lib/collaboration/realtime-room-token.ts`
- `src/lib/cloudflare/collaboration-room.ts`
- realtime control callers

### Acceptance

Revocation closes current sockets; the same unexpired token cannot reconnect
after DO restart; a newly authorized post-watermark token follows current access
policy; no revocation state exists only in memory.

Collaboration secret separation is already landed and must not be reimplemented.

---

## `UNIT-008` - Realtime admission and remaining secret boundary

Status: `PLANNED`  
Profile: `Q2_CRITICAL_CHANGE_GATE`  
Findings: `SEC-002`, narrowed `SEC-003`  
Depends on: `UNIT-007`

### Target

Authenticate and origin-check before capacity allocation, enforce bounded
subject/room admission, use timing-safe control authentication, and remove
invite/identity secret fallback from support/global-presence channels.

### Primary files

- `src/lib/cloudflare/collaboration-room-router.ts`
- `src/lib/cloudflare/collaboration-room.ts`
- `src/lib/cloudflare/support-inbox.ts`
- `src/lib/cloudflare/support-inbox-fanout.ts`
- `src/lib/cloudflare/global-presence.ts`
- `src/lib/collaboration/realtime-identity-actions.ts`
- `src/lib/collaboration/realtime-room-token.ts`

### Acceptance

Unauthorized/wrong-origin/over-limit upgrades consume zero sessions; valid
refresh/reconnect remains usable; subject and room ceilings hold; control
comparison is timing-safe; active support/global-presence callers require
dedicated realtime material.

---

## `UNIT-009` - Upload admission and stored-byte fail-closed integrity

Status: `PLANNED`  
Profile: `Q2_CRITICAL_CHANGE_GATE`  
Findings: `SEC-004`, `SEC-005`, `SEC-007`  
Depends on: `UNIT-024`

### Target

Reject pending/unverified bindings, verify stored-byte checksum/type with bounded
streaming, and represent unavailable/non-authoritative scanning as
inconclusive—not clean.

### Primary files

- `src/app/api/component-library/attachments/direct-upload/route.ts`
- `src/lib/uploads/provider-portability.ts`
- `src/lib/uploads/direct-upload-records.ts`
- `src/lib/uploads/scan-job.ts`
- `src/lib/uploads/policy-scanner.ts`
- product attachment binding repositories

### Acceptance

Checksum/type mismatch, oversized, pending, inconclusive, expired, and
cross-tenant objects cannot bind; ETag is never content identity; bytes read are
bounded by the configured object ceiling; clean state cannot originate from
policy-only checks.

This unit may leave scan-required uploads unusable until `UNIT-025` is activated
and verified; it must not fake usability by marking policy results clean.

---

## `UNIT-010` - Operational endpoint and secondary-origin isolation

Status: `PLANNED`  
Profile: `Q2_CRITICAL_CHANGE_GATE`  
Findings: `SEC-008`  
Depends on: `UNIT-007`, `UNIT-011`

### Target

Remove unnecessary public operational surfaces, set `workers_dev` false, and
give retained control paths dedicated least-privilege credentials.

### Primary files

- `wrangler.jsonc`
- internal/proof route modules under `src/lib/cloudflare/`
- `worker.ts`
- operational bearer/auth helpers

### Acceptance

Unneeded proof/internal routers are deleted; required work uses bound
scheduled/queue/DO/service paths; wrong/missing subsystem credentials fail
closed; local config drift checks pass. Hosted reachability and rotation remain
`AUTH-001`.

---

## `UNIT-011` - Authenticated queue envelope and dedupe identity

Status: `PLANNED`  
Profile: `Q2_CRITICAL_CHANGE_GATE`  
Findings: `SEC-009`  
Depends on: `UNIT-000`

### Target

Authenticate a versioned upload-job envelope and recompute dedupe identity from
validated immutable fields.

### Primary files

- `src/lib/cloudflare/upload-job-queue.ts`
- queue producer callers
- `worker.ts` consumer

### Acceptance

Payload/version/signature/idempotency tampering fails before work; producer and
consumer change atomically; retry processes once; distinct same-batch jobs cannot
suppress one another; poison rejection/dead-letter telemetry is redacted.

---

## `UNIT-012` - Browser token, share-state, CSP, and cache boundary

Status: `PLANNED`  
Profile: `Q2_CRITICAL_CHANGE_GATE`  
Findings: `SEC-010`  
Depends on: `UNIT-002`, `UNIT-004`

### Target

Apply no-store to bearer routes, derive Secure cookies from validated request
context, reduce share-state enumeration, and make Worker caching explicitly
bounded and non-personalized.

### Primary files

- `next.config.ts`
- applicable Next 16 request/proxy/header modules
- `src/lib/publication/security.ts`
- `src/app/api/share/[token]/route.ts`
- invite/public portal routes
- `src/lib/cloudflare/worker-route-optimizations.ts`

### Acceptance

Token pages are `private, no-store`; HTTPS cookies are Secure while approved
local HTTP remains usable; unavailable share states expose no unnecessary
distinction; personalized responses never use shared isolate cache.

Nonce CSP proceeds only after local Next 16 documentation and browser
characterization prove a viable route. Otherwise the branch remains explicitly
open; mechanical fixes still land.

---

## `UNIT-013` - Session-token compatibility decision

Status: `PLANNED`  
Profile: `Q2_CRITICAL_CHANGE_GATE`  
Findings: `SEC-011` decision gate  
Depends on: `UNIT-000`

### Target

Determine from installed Better Auth 1.6.23 source and every direct table reader
whether raw session tokens can be replaced without breaking lookup, rotation,
revocation, recovery, or active sessions.

### Outputs and acceptance

- durable decision receipt:
  `.ai/03_plans/2026-07-31/Code-Improvement/evidence/unit-013-session-compatibility-decision.json`;
- complete create/read/update/revoke/rotate and direct-reader call map;
- at least one tested prototype or a documented no-viable-design result;
- forward migration, interruption recovery, and plaintext deletion strategy;
- `COMPATIBLE_DESIGN` makes this decision `VERIFIED` and transitions
  `UNIT-026` from `PLANNED` to `READY`;
- `NO_SAFE_COMPATIBLE_DESIGN` makes this decision `VERIFIED`, transitions
  `UNIT-026` to `BLOCKED`, transitions `REQ-002` from `ACCEPTED` to `BLOCKED`,
  records at least two materially distinct `NOT_VIABLE` fallback rows with
  sealed evidence, and permits `TECH_BLOCKED` only after no other runnable unit
  remains.

No digest-lookup success or accepted-risk completion is presupposed in this
decision unit.

---

## `UNIT-014` - Operational redaction, minimization, and retention

Status: `PLANNED`  
Profile: `Q2_CRITICAL_CHANGE_GATE`  
Findings: `SEC-013`  
Depends on: `UNIT-000`

### Target

Make security/operational collection structured, redacted, minimal, and covered
by one retention/legal-hold registry.

### Primary files

- `worker.ts`
- `src/lib/admin/audit-repository.ts`
- `src/lib/admin/observability-repository.ts`
- `src/lib/compliance/retention-core.ts`

### Acceptance

Logs contain no raw error/token/email/user-agent fixtures; attribution and
correlation remain usable; every relevant table/data class has retention and
legal-hold policy; export/erasure and immutable-event behavior remain explicit.

---

## `UNIT-015` - Workspace context and onboarding seam

Status: `PLANNED`  
Profile: `Q2_CRITICAL_CHANGE_GATE`  
Findings: `PERF-001`, `ARCH-001`  
Depends on: `UNIT-000`

### Target

Make workspace lookup a pure read interface and starter installation an explicit
provisioning/onboarding operation.

### Primary files

- `src/lib/repositories/workspace-repository.ts`
- proposed focused workspace-context repository
- `src/lib/onboarding/starter-pack-actions.ts`
- `src/components/onboarding/AuthenticatedOnboardingHost.tsx`
- direct importers of `ensureDefaultWorkspace`

### Acceptance

Ready creator lookup uses one workspace read; ready member adds at most one
membership read; ordinary lookup performs zero starter-state queries/writes;
installation remains exactly-once; direct imports allow deletion of the old
hidden-side-effect contract.

---

## `UNIT-016` - Access-qualified paged project catalogue

Status: `PLANNED`  
Profile: `Q2_CRITICAL_CHANGE_GATE`  
Findings: `PERF-002`, `ARCH-001`  
Depends on: `UNIT-015`

### Target

Bound Projects work by page size while preserving tenant access, invite
visibility, groups, favorites, filters, sorting, and compact summaries.

### Primary files

- `src/lib/repositories/workspace-repository.ts`
- proposed project-catalogue repository
- `src/app/workshop/projects/page.tsx`
- `src/components/workshop/projects-page-client.tsx`
- compact project selector consumers

### Acceptance

Access qualifies before paging; stable compound cursor traverses 100/500/1,000
fixtures once; at most 50 cards are returned; statement count and serialized
payload stay bounded as total projects grow; direct imports delete the Projects
use of the omniscient aggregate.

---

## `UNIT-017` - AI evidence snapshot and parallel reads

Status: `PLANNED`  
Profile: `Q2_CRITICAL_CHANGE_GATE`  
Findings: `PERF-003`  
Depends on: `UNIT-015`

### Target

Read one access-qualified bounded prior-estimate snapshot and parallelize
independent package-builder evidence branches without changing prompt inputs,
audit truth, counts, limits, or deterministic order.

### Primary files

- `src/lib/ai/package-builder/read-tools.ts`
- proposed package-builder evidence repository

### Acceptance

Prior-estimate query executes once; delayed-query proof removes at least three
avoidable serial awaits; result order/content and audit events equal
characterization fixtures; no broader tenant/workspace read is introduced.

---

## `UNIT-018` - Estimate restore replay batch read

Status: `PLANNED`  
Profile: `Q2_CRITICAL_CHANGE_GATE`  
Findings: `PERF-004`  
Depends on: `UNIT-000`

### Target

Reuse the fresh restore path's bounded batch-read/map/order contract for
idempotent replay.

### Primary files

- `src/lib/estimates/d1-intents/rows.ts`
- restore replay/history tests

### Acceptance

A 100-row replay performs one authoritative select and zero writes, preserves
requested order and response shape, and fails truthfully on a missing row.

---

## `UNIT-019` - Estimate sheet display projection model

Status: `PLANNED`  
Profile: `Q2_CRITICAL_CHANGE_GATE`  
Findings: `ARCH-002`  
Depends on: `UNIT-018`

### Target

Move search, facets, grouping, visible IDs, and derived totals behind one pure
memoizable interface while preserving `EditableRowStore` as sole mutation owner.

### Primary files

- `src/components/workshop/EstimateSheetContent.tsx`
- proposed `estimate-sheet-view-model.ts`
- existing derived-work, row-store, focus, keyboard, render, and browser tests

### Acceptance

One root projection traversal produces current ordering/totals; reference
stability and 1,000-row budgets do not regress; focus, keyboard, history, totals,
export, and mutation behavior remain intact; moved helpers are deleted without a
forwarding facade.

---

## `UNIT-020` - Final ledger and terminal-state closeout

Status: `PLANNED`  
Profile: `Q2_CRITICAL_CHANGE_GATE`  
Findings: terminal reconciliation only  
Depends on: `UNIT-001` through `UNIT-019`, plus `UNIT-021` through `UNIT-024`
and `UNIT-027` through `UNIT-028`

### Target

Reconcile every finding/unit/decision/evidence row and prove the exact integrated
terminal candidate. This unit performs no independently safe source deletion or
documentation repair; `UNIT-028` owns and verifies that work first.

### Primary files

- this pack's manifest and terminal evidence
- conditional and lifecycle decision receipts
- `tests/vitest/code-improvement/unit-020-closeout-contract.test.ts`

### Acceptance

`UNIT-028` is `VERIFIED`. Every activated conditional branch is `VERIFIED`;
every authorization-bounded branch is decision-backed `SUPERSEDED` with a
`BOUNDARY` criterion and `AUTH-001`; a `BLOCKED` branch prevents this unit and
leads only to the separate `TECH_BLOCKED` exact-candidate gate. Validators,
active-policy scan, GitNexus detection, the candidate-bound closeout-contract
test, integrated Q2 gate, and independent reviews pass. The closeout test
recomputes decision-receipt schema, candidate evidence hashes, immutable
baseline, lifecycle-activated dependency closure, and terminal effects against
the exact post-`UNIT-020` candidate.

---

## `UNIT-021` - Component editor domain model

Status: `PLANNED`  
Profile: `Q2_CRITICAL_CHANGE_GATE`  
Findings: `ARCH-003`  
Depends on: `UNIT-006`

### Target

Centralize draft, hydration, validation, dirty comparison, pending scopes, and
create/update projection in one pure model after variant integrity is proven.

### Primary files

- `src/components/workshop/component-library-manager/AddComponentModal.tsx`
- proposed component editor model beside the modal

### Acceptance

Variant order/default, supplier/brand, attachment/image, pending-scope, dirty,
and create/update parity fixtures are deterministic; effects/actions stay in the
modal; duplicate mappings are deleted; accessibility and browser behavior hold.

---

## `UNIT-022` - Set-wise activity outbox reconciliation

Status: `PLANNED`  
Profile: `Q2_CRITICAL_CHANGE_GATE`  
Findings: `PERF-005`  
Depends on: `UNIT-000`

### Target

Replace 1+2N reconciliation with a bounded join and set-wise delivered/failed
updates while preserving per-row retry semantics and tenant scope.

### Primary files

- `src/lib/activity/activity-outbox.ts`
- daily worker invocation and activity-outbox tests

### Acceptance

A 500-row mixed fixture uses fewer than ten statements with exact delivered,
failed, retry-at, attempt-count, and tenant-isolation results.

---

## `UNIT-023` - Scoped TanStack Query subscriptions

Status: `PLANNED`  
Profile: `Q2_CRITICAL_CHANGE_GATE`  
Findings: `PERF-007`  
Depends on: `UNIT-000`

### Target

Replace whole-query object dependencies with only used data/status/error/refetch
values on the four confirmed React surfaces.

### Primary files

- `src/components/share/SharePageComments.tsx`
- `src/components/share/SharedLinkActivityFeed.tsx`
- `src/components/workshop/library/template-editor/TemplateEditorClient.tsx`
- `src/components/workshop/proposals-page-client.tsx`

### Acceptance

Behavior remains identical; measured commits/effect executions are no greater
than characterization baseline; React Doctor adds no finding; browser smoke
covers each changed surface.

---

## `UNIT-024` - Malware-scanner viability decision

Status: `PLANNED`  
Profile: `Q2_CRITICAL_CHANGE_GATE`  
Findings: scanner/provider decision gate for `SEC-006`  
Depends on: `UNIT-000`

### Target

Determine whether current ClamD infrastructure can provide authoritative clean
classification inside the bound runtime, or whether a new external/provider
boundary is required.

### Outputs and acceptance

- durable decision receipt:
  `.ai/03_plans/2026-07-31/Code-Improvement/evidence/unit-024-scanner-viability-decision.json`;
- current scanner binding/network/deployment topology and failure modes;
- EICAR, clean fixture, unavailable, timeout, and oversize proof;
- `AUTHORITATIVE_PROVIDER_VIABLE` makes this decision `VERIFIED` and transitions
  `UNIT-025` from `PLANNED` to `READY`;
- `EXTERNAL_PROVIDER_AUTH_REQUIRED` makes this decision `VERIFIED`, transitions
  `UNIT-025` to decision-backed `SUPERSEDED`, sets the affected criterion to
  `BOUNDARY`, preserves `AUTH-001`, and records fail-closed product impact;
- `NO_TECHNICALLY_VIABLE_PROVIDER` transitions `UNIT-025` to `BLOCKED` and
  transitions `REQ-006` from `ACCEPTED` to `BLOCKED`, records at least two
  materially distinct `NOT_VIABLE` fallback rows with sealed evidence, and
  permits `TECH_BLOCKED` only after no runnable local work remains;
- no policy-only result is accepted as malware-clean.

No paid scanner or new unbound resource is authorized by this decision unit.

---

## `UNIT-025` - Authoritative scanner state and clean usability

Status: `PLANNED`  
Profile: `Q2_CRITICAL_CHANGE_GATE`  
Findings: `SEC-006` conditional implementation  
Depends on: `UNIT-009`, `UNIT-024`

### Target

Implement the scanner design selected by `UNIT-024`, with clean, infected, and
inconclusive/error states plus bounded retry/quarantine/permanent-failure
semantics.

### Acceptance

Known clean binds once; EICAR never binds; unavailable/timeout stays
inconclusive; retry/override/expiry are audited and bounded; scanner provisioning
or hosted readback remains `AUTH-001` until explicitly authorized.

This unit may enter `READY` only through
`UNIT-024=AUTHORITATIVE_PROVIDER_VIABLE`. The authorization-bounded outcome
supersedes it; the technical-failure outcome blocks it.

---

## `UNIT-026` - Session-token-at-rest migration

Status: `PLANNED`  
Profile: `Q2_CRITICAL_CHANGE_GATE`  
Findings: `SEC-011` conditional implementation  
Depends on: `UNIT-013`

### Target

Implement only the Better Auth-compatible design selected by `UNIT-013`, using a
forward-only resumable D1 lifecycle with recovery and a plaintext deletion step.

### Acceptance

Existing cookies remain valid through the supported lookup; new and backfilled
rows expose no raw reusable token after cutover; interrupted backfill resumes;
revocation/rotation/cross-user denial hold; temporary dual state is deleted on
the recorded condition.

This unit may enter `READY` only through `UNIT-013=COMPATIBLE_DESIGN`.
`NO_SAFE_COMPATIBLE_DESIGN` transitions it to `BLOCKED`; it is never silently
skipped, marked `SUPERSEDED`, or treated as accepted risk.

---

## `UNIT-027` - Archive lifecycle policy decision

Status: `PLANNED`  
Profile: `Q2_CRITICAL_CHANGE_GATE`  
Findings: investigation-only component, native portal, and tab archive states  
Depends on: `UNIT-000`

### Target

Decide from current product behavior whether each state is terminal archive,
requires restore, or represents a dead/misleading transition.

### Acceptance

The durable receipt
`.ai/03_plans/2026-07-31/Code-Improvement/evidence/unit-027-lifecycle.json`
records all three domains. Each domain has one evidence-backed disposition,
credential/access/data semantics are explicit, and any newly required Q2
implementation is added and verified before `UNIT-020`. The receipt includes
`candidate_revision`, `activated_unit_ids`, and exact evidence leaves (`path`,
`sha256`, `source_revision`). Every activated ID must
exist in the manifest, be included in closeout dependency closure, and reach
`VERIFIED`; an empty array is explicit when no implementation is activated.
The closed domain IDs, disposition vocabulary, row keys, and union rules are in
`03-VERIFICATION-MATRIX.md`; `terminal_effect` is exactly `NONE`, so this local
product-policy decision cannot manufacture `AUTH_BLOCKED`; no executor invents
a fourth lifecycle state. Symmetry alone is not a product requirement.

---

## `UNIT-028` - Safe cleanup, documentation, and authority reconciliation

Status: `PLANNED`  
Profile: `Q2_CRITICAL_CHANGE_GATE`  
Findings: `CLEAN-001`, `DOC-001`  
Depends on: `UNIT-001` through `UNIT-019`, plus `UNIT-021` through `UNIT-024`
and `UNIT-027`

### Target

Complete every safe deletion, maintained-architecture correction, and
predecessor-status reconciliation before either successful closeout or a
technical terminal. This work never waits on `UNIT-025`, `UNIT-026`, or
`GATE-020`.

### Primary files

- orphaned Client Portal decision action/service
- any helper proven unused by source/test import scans
- `.ai/06_specs/deep/architecture-overview.md`
- predecessor status ledgers and their inbound active-policy references
- `tests/vitest/code-improvement/unit-028-safe-cleanup-docs.test.ts`

### Acceptance

Dead production importers are zero; architecture guidance matches
`wrangler.jsonc`, current routes, and active migrations; every predecessor
finding is current, superseded, refuted, boundary-only, or absorbed; no
contradictory active authority remains. The focused test, current-pack and
touched-predecessor validators, explicit policy scan, GitNexus change detection,
and candidate-bound Q2+ reviews pass. `TECH_BLOCKED` is forbidden unless this
unit is `VERIFIED`.

## Handoff Receipt

Every unit records baseline commit, scoped pre-edit status, impacted symbols and
risk, owned files, decisions and rejected alternatives, exact evidence receipts,
remaining risk/`AUTH-001`, and the next dependency-unblocked unit. One writer
owns each file; workers never revert unfamiliar changes.

# Source And Codebase Audit

This file is the canonical current-source and integration-delta ledger. Detailed
coordination protocols are split into the domain artifacts listed in
`README.md`; those artifacts do not replace this source authority.

## Baseline and evidence policy

Observed repository baseline: `e373bc865b978e237deb1d92011c96b0a3639fb4`.
The shared worktree is dirty and concurrently edited, so line anchors are
observations, not leases. Every execution iteration must re-read the named file
and record its current hash before relying on it.

Evidence hierarchy:

1. current source/config/provider readback;
2. deterministic local or hosted proof receipt at the matching surface;
3. current owner-pack manifest and ledger;
4. the Beta audit as scope and acceptance intent;
5. summaries and chat as navigation only.

Manifest source `SRC-001` denotes this combined current-source and Beta-audit
baseline. It supports the program requirements only as planning evidence; every
hosted, legal, provider, and implementation claim still requires its matching
fresh receipt.

The Beta audit itself records a source limitation at
`.ai/02_audits/archestimator_beta_readiness_audit_2026-07-10.md:60-68`.
Nothing in this umbrella converts local inspection into hosted or legal proof.

### Scoped baseline fingerprint

Apply `PLAN-PACK-SCOPED-BASELINE-v1` from `Plan-Pack-Schema.md` to these ordered
literal repo-relative pathspecs after all eight owner manifests are frozen:

1. `.ai/02_audits/archestimator_beta_readiness_audit_2026-07-10.md`
2. `.ai/03_plans/2026-07-10/Activity-History-Mapping/plan-pack.json`
3. `.ai/03_plans/2026-07-10/Beta-Operating-Contract/plan-pack.json`
4. `.ai/03_plans/2026-07-10/Calculation-And-Output-Parity/plan-pack.json`
5. `.ai/03_plans/2026-07-10/Estimate-Intelligence-And-Price-Governance/plan-pack.json`
6. `.ai/03_plans/2026-07-10/First-User-Activation-And-Cohort-Operations/plan-pack.json`
7. `.ai/03_plans/2026-07-10/Hosted-D1-Recovery-And-Data-Resilience/plan-pack.json`
8. `.ai/03_plans/2026-07-10/Publisher-And-Shared-Pages/plan-pack.json`
9. `.ai/03_plans/2026-07-10/Release-Integrity-And-Golden-Path/plan-pack.json`
10. `migrations`
11. `.github`
12. `package.json`
13. `bun.lock`
14. `next.config.ts`
15. `wrangler.jsonc`
16. `playwright.config.ts`
17. `scripts`

The Program fingerprint binds owner-manifest integration state plus the shared
audit/config/migration/control surfaces, including matching untracked files. It
excludes this Program manifest to avoid a self-referential baseline and is not
hosted, legal, implementation, or release proof.

## Current versus target

| Area | Current evidence | Target owned elsewhere | Program responsibility |
|---|---|---|---|
| Merge safety | Audit `:190-223` says active CI/required checks are absent | Release `UNIT-007` emits read-only discovery/boundary packets; Release `AUTH-001`/`UNIT-008` owns GitHub mutation and readback | Verify the read-only receipt and Program `AUTH-001` only from the distinct Release `UNIT-008` GitHub receipt with passed-SHA provenance |
| Golden path | Audit `:227-276` lists a 20-step path and missing default browser proof | Release `UNIT-007` prepares the packet; Release `AUTH-002`/`UNIT-009` owns isolated staging seed, Chromium/WebKit execution, cleanup, and artifacts | Ensure all product-pack milestones are represented and require the staging receipt independently of GitHub and production receipts |
| Activation | Audit `:280-329`; `projects-page-client.tsx:1947-1956` only recognizes search/status empties | Activation pack owns true zero state, first-value checklist, cohort production | Consume activation milestone receipt; no UI implementation |
| Calculation parity | Audit `:333-470` describes output-trust gaps | `Calculation-And-Output-Parity` owns screen/share/XLSX parity fixtures | Check parity receipt before release |
| Estimate intelligence | Audit `:333-470` describes health, drill-through, revisions, and freshness gaps | `Estimate-Intelligence-And-Price-Governance` owns P1 intelligence and price governance | Check milestone and freshness receipts before release |
| Publisher | Audit `:474-604`; existing pack explicitly records missing versioning/analytics | Existing Publisher pack plus serialized audit deltas | Pin a validator-clean manifest/diff receipt, issue exact delta, and accept only updated hashed evidence |
| Activity | Existing Activity pack owns history/restore and event contracts; public interactions are deferred to Publisher | Activity implements its executable units; Publisher owns public mutations/UI | Consume Activity only for event contracts; never treat superseded `UNIT-007` as runnable |
| Restore/provider | Audit `:608-639` says real recovery remains unproven | `Hosted-D1-Recovery-And-Data-Resilience` owns disposable D1 restore rehearsal | Require provider-backed, non-production-destructive receipt |
| Operator data | `src/app/admin/page.tsx:21-43,58-120` now reads signups, incidents, and health probes, but has no activation-cohort stages and retains an unavailable Active Teams metric plus an approximate one-point trend | Activation produces privacy-safe cohort rows; `Beta-Operating-Contract` presents and governs dashboard truth | Check producer/consumer compatibility without assigning UI to Activation or treating the partial Overview as complete operating proof |
| Migration coordination | The settled workspace tail is now the concurrent `migrations/0054_collaboration_pending_invitation_uniqueness.sql` (created by a concurrent collaboration lane); it was created after generation 6 had reserved `0054` for Publisher, so generation 6 and every dependent baseline are stale | Migration-owning packs retain their existing requirements under shifted, still-`UNCLAIMED` paths; the collaboration uniqueness migration is observed source, not a consumed plan allocation | Supersede generation 6 monotonically; issue generation 7 against tail 0054 with provisional allocations 0055..0059 and require the canonical receipt before any owner writes |
| Release truth | Audit `:681-711` and `:1000-1040` require generated current truth | Release `UNIT-006` generates truth, `UNIT-007` prepares read-only boundary packets, and Release `AUTH-003`/`UNIT-010` records production or a fail-closed no-release decision after `UNIT-008/009` | Aggregate the local/read-only, GitHub, staging, production-or-no-release, provider, operator, and legal receipts without authority substitution |

The Release boundary chain is deliberately non-omnibus: `UNIT-007` is read-only;
Release `AUTH-001` authorizes only `UNIT-008` GitHub controls; Release `AUTH-002`
authorizes only `UNIT-009` isolated staging; and Release `AUTH-003` authorizes only
`UNIT-010` production deployment, smoke, rollback rehearsal, and release/no-release
receipt. Program `AUTH-001` consumes the `UNIT-008` GitHub receipt, while Program
`AUTH-002` strictly consumes the Beta Operating `AUTH-003`/`UNIT-009`
`LIMITED-COHORT-LEGAL-DECISION-RECEIPT-v1`; it produces no legal approval and
must never be confused with Release `AUTH-002`.

## Existing pack state and protected ownership

### Publisher-And-Shared-Pages

- `.ai/03_plans/2026-07-10/Publisher-And-Shared-Pages/README.md` now declares
  `CONDITIONALLY_READY/NOT_STARTED/NOT_EVALUATED`, a dependency-closed five-unit
  ready slice, and `UNIT-001` as its exact resume point; the remaining units are
  intentionally `PLANNED` behind named integration-delta and lease receipts.
- Its audit records `NEW-04` proposal versioning and `NEW-05` recipient
  analytics as absent at `03_SOURCE_AND_CODEBASE_AUDIT.md:346-355`.
- Its proof boundary separates local/browser proof from hosted/provider proof at
  `02_FEATURE_BRIEF_AND_SCOPE.md:130-139`.
- Therefore the program must never claim `BETA-P1-04/05/06/09` implemented from
  the current pack. An integration delta is issued only from a validator-clean
  receipt whose manifest, artifact-set, scoped-diff, and contract hashes recheck.

### Activity-History-Mapping

- `.ai/03_plans/2026-07-10/Activity-History-Mapping/README.md` now declares
  `CONDITIONALLY_READY/NOT_STARTED/NOT_EVALUATED`, a dependency-closed
  nine-unit ready slice, and Publisher ownership of public mutations.
- `09_REQUIREMENTS_AND_TRACEABILITY.md:95-105` defers `REQ-008` to Publisher.
- `11_IMPLEMENTATION_PLAN.md:205-210` supersedes `UNIT-007` while preserving
  Activity's event-contract ownership.
- The integration receipt must retain that split: Publisher owns the
  `BETA-P1-05` mutation/UI outcome and Activity supplies event contracts only.

## Exact Integration Delta Packets

### PUB-DELTA-01 - `BETA-P1-04` Publisher funnel

Apply against a current Publisher integration receipt. Add snapshot-versioned
funnel definitions for
`published`, `recipient_opened`, `recipient_engaged`, and `recipient_decided`;
separate unique human recipients from anonymous requests and bot/duplicate
traffic; define time windows, late events, retention, and zero/unknown states.
The Publisher pack remains owner. `Beta-Operating-Contract` owns telemetry
governance and operator presentation; Release Integrity only consumes their
receipts in the release decision.

### PUB-DELTA-02 - `BETA-P1-05` recipient matrix and follow-up

Apply after both Publisher and Activity integration receipts validate. Add
per-recipient last-event, decision, unresolved-comment, expiry, and next-action
rows. Publisher owns owner reply, author delete, decision reset, reminder,
republish, authorization, and denial behavior; link Activity's append-only event
contract only for audit/history projection.

### PUB-DELTA-03 - `BETA-P1-06` proposal issue identity

Apply against a current Publisher integration receipt. Add immutable issue
number/version, issued-at,
valid-through, sender identity, selected-sheet scope, assumptions/exclusions,
superseded marker, and snapshot rendering. A reissue creates a new immutable
snapshot; it never rewrites what a recipient previously reviewed.

### PUB-DELTA-04 - Publisher contribution to `BETA-P1-09`

Apply against a current Publisher integration receipt. Preserve its existing
responsive/a11y scope, then
add audit-specific acceptance for public review, password/session recovery,
comment, and decision on WebKit mobile. Static/DOM evidence proves semantics.
The Publisher pack supplies this contribution; `Release-Integrity-And-Golden-Path`
is the exact-once integration owner and owns cross-browser/recovery orchestration.

### ACT-DELTA-01 - Activity dependency reconciliation

Apply only against a current Activity integration receipt. Confirm `REQ-008` is
deferred to Publisher, `UNIT-007` is superseded, and Activity retains event
contracts only. Add a Publisher consumer contract and proof receipt without
claiming Activity implementation complete.

### ACT-DELTA-02 - activation milestone compatibility

After Activity integration receipt validation, document that activation
milestone producers use the Activation pack's typed server-side API and do not
reuse estimate activity rows as cohort analytics. Activity events remain an
audit/history domain; activation events remain a privacy-minimized funnel domain.

## Contradiction register

| Conflict | Decision |
|---|---|
| Audit P1 recipient workflow versus Activity P2 label | Beta priority wins for the required subset; Publisher exclusively owns public comment/decision mutation and UI, while Activity owns append-only event/tombstone production and history projection |
| Existing Publisher pack excludes analytics/versioning | Extend through serialized deltas; never fork a second Publisher pack |
| Audit asks for admin visibility; Activation excludes dashboard presentation | Activation owns cohort production/query contract; `Beta-Operating-Contract` owns governed presentation and metric truth |
| Local proof can be deep while hosted proof is absent | Keep release `BOUNDARY`; record evidence by surface |
| Large-component extraction spans domains | Program owns the policy/evidence gate; implementation remains inside each capability pack |

## Source freshness triggers

Re-audit when the Beta audit, any owner-pack manifest, `.github/workflows*`,
`next.config.ts`, `package.json`, `wrangler.jsonc`, active D1 migration list,
Publisher/Activity owned paths, release-gate scripts, or any Release `UNIT-007`,
`UNIT-008`, `UNIT-009`, or `UNIT-010` receipt changes. A pack self-hash change
invalidates its dependency receipt until revalidated.

# Source And Codebase Audit

## Baseline and evidence policy

Observed repository baseline: `081a0757a9d7f34e75342a18e353f3014403de1e`.
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

## Current versus target

| Area | Current evidence | Target owned elsewhere | Program responsibility |
|---|---|---|---|
| Merge safety | Audit `:190-223` says active CI/required checks are absent | `Release-Integrity-And-Golden-Path` restores and proves required checks | Verify receipt, passed-SHA provenance, and hosted control authorization |
| Golden path | Audit `:227-276` lists a 20-step path and missing default browser proof | `Release-Integrity-And-Golden-Path` owns deterministic seed, cleanup, staging, artifacts | Ensure all product-pack milestones are represented in the path |
| Activation | Audit `:280-329`; `projects-page-client.tsx:1955-1964` only recognizes search/status empties | Activation pack owns true zero state, first-value checklist, cohort production | Consume activation milestone receipt; no UI implementation |
| Calculation parity | Audit `:333-470` describes output-trust gaps | `Calculation-And-Output-Parity` owns screen/share/XLSX parity fixtures | Check parity receipt before release |
| Estimate intelligence | Audit `:333-470` describes health, drill-through, revisions, and freshness gaps | `Estimate-Intelligence-And-Price-Governance` owns P1 intelligence and price governance | Check milestone and freshness receipts before release |
| Publisher | Audit `:474-604`; existing pack explicitly records missing versioning/analytics | Existing Publisher pack plus serialized audit deltas | Freeze, issue exact delta, and accept only updated evidence |
| Activity | Existing Activity pack owns history/restore and P2 share interactions | Existing Activity pack remains implementation owner | Treat `REQ-008`/`UNIT-007` as Publisher follow-up dependency |
| Restore/provider | Audit `:608-639` says real recovery remains unproven | `Hosted-D1-Recovery-And-Data-Resilience` owns disposable D1 restore rehearsal | Require provider-backed, non-production-destructive receipt |
| Operator data | `src/app/admin/page.tsx:12-25,40-43,62,80-87` is placeholder data | Activation produces privacy-safe cohort rows; `Beta-Operating-Contract` presents and governs dashboard truth | Check producer/consumer compatibility without assigning UI to Activation |
| Release truth | Audit `:681-711` and `:1000-1040` require generated current truth | `Release-Integrity-And-Golden-Path` owns generator and release checks | Aggregate owner-pack evidence and authorization decisions |

## Existing pack state and protected ownership

### Publisher-And-Shared-Pages

- `.ai/03_plans/2026-07-10/Publisher-And-Shared-Pages/01_EXECUTIVE_SUMMARY.md:65-68`
  declares `NOT_READY/NOT_STARTED/NOT_EVALUATED`.
- Its audit records `NEW-04` proposal versioning and `NEW-05` recipient
  analytics as absent at `03_SOURCE_AND_CODEBASE_AUDIT.md:346-355`.
- Its proof boundary separates local/browser proof from hosted/provider proof at
  `02_FEATURE_BRIEF_AND_SCOPE.md:130-139`.
- Therefore the program must never claim `BETA-P1-04/05/06/09` implemented from
  the current pack. The circle-back packet is issued only after the current
  Publisher planning agent has frozen its files and handed off a manifest hash.

### Activity-History-Mapping

- `.ai/03_plans/2026-07-10/Activity-History-Mapping/01_EXECUTIVE_SUMMARY.md:89-95`
  declares `NOT_READY/NOT_STARTED/NOT_EVALUATED`.
- `09_REQUIREMENTS_AND_TRACEABILITY.md:95-105,134-136` maps owner reply,
  comment deletion, and decision reset to `REQ-008`.
- `11_IMPLEMENTATION_PLAN.md:195-219` assigns those paths to `UNIT-007` and
  marks the feature P2/deferable.
- The Beta audit elevates the business outcome to P1 through
  `BETA-P1-05`. The correct repair is priority/acceptance reconciliation in the
  Activity pack plus a dependency link in Publisher, not duplicate route work.

## Exact circle-back delta packets

### PUB-DELTA-01 - `BETA-P1-04` Publisher funnel

Apply after Publisher freeze. Add snapshot-versioned funnel definitions for
`published`, `recipient_opened`, `recipient_engaged`, and `recipient_decided`;
separate unique human recipients from anonymous requests and bot/duplicate
traffic; define time windows, late events, retention, and zero/unknown states.
The Publisher pack remains owner. `Beta-Operating-Contract` owns telemetry
governance and operator presentation; Release Integrity only consumes their
receipts in the release decision.

### PUB-DELTA-02 - `BETA-P1-05` recipient matrix and follow-up

Apply after both Publisher and Activity freeze. Add per-recipient last-event,
decision, unresolved-comment, expiry, and next-action rows. Link, do not copy,
Activity `REQ-008`/`UNIT-007` for owner reply, author delete, and decision reset.
Specify reminder/republish/action authorization and denial tests.

### PUB-DELTA-03 - `BETA-P1-06` proposal issue identity

Apply after Publisher freeze. Add immutable issue number/version, issued-at,
valid-through, sender identity, selected-sheet scope, assumptions/exclusions,
superseded marker, and snapshot rendering. A reissue creates a new immutable
snapshot; it never rewrites what a recipient previously reviewed.

### PUB-DELTA-04 - Publisher contribution to `BETA-P1-09`

Apply after Publisher freeze. Preserve its existing responsive/a11y scope, then
add audit-specific acceptance for public review, password/session recovery,
comment, and decision on WebKit mobile. Static/DOM evidence proves semantics.
The Publisher pack supplies this contribution; `Release-Integrity-And-Golden-Path`
is the exact-once integration owner and owns cross-browser/recovery orchestration.

### ACT-DELTA-01 - Activity dependency reconciliation

Apply only after the Activity agent freezes. Change priority language for the
subset needed by Publisher from post-MVP/deferable to a Beta dependency; retain
Activity ownership of its exact routes/components; add a Publisher consumer
contract and proof receipt; do not claim the rest of Activity implemented.

### ACT-DELTA-02 - activation milestone compatibility

After Activity freeze, document that activation milestone producers use the
Activation pack's typed server-side API and do not reuse estimate activity rows
as cohort analytics. Activity events remain an audit/history domain; activation
events remain a privacy-minimized funnel domain.

## Contradiction register

| Conflict | Decision |
|---|---|
| Audit P1 recipient workflow versus Activity P2 label | Beta priority wins for required subset; ownership remains Activity |
| Existing Publisher pack excludes analytics/versioning | Extend through serialized deltas; never fork a second Publisher pack |
| Audit asks for admin visibility; Activation excludes dashboard presentation | Activation owns cohort production/query contract; `Beta-Operating-Contract` owns governed presentation and metric truth |
| Local proof can be deep while hosted proof is absent | Keep release `BOUNDARY`; record evidence by surface |
| Large-component extraction spans domains | Program owns the policy/evidence gate; implementation remains inside each capability pack |

## Source freshness triggers

Re-audit when the Beta audit, any owner-pack manifest, `.github/workflows*`,
`next.config.ts`, `package.json`, `wrangler.jsonc`, active D1 migration list,
Publisher/Activity owned paths, or release-gate scripts change. A pack self-hash
change invalidates its dependency receipt until revalidated.

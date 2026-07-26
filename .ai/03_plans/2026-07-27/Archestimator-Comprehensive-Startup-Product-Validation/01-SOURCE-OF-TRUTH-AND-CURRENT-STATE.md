# Source of Truth and Current State

**Research status:** `DESK_AUDIT_COMPLETE / MARKET_VALIDATION_PENDING`<br>
**Repository snapshot:** local `main` at committed HEAD `efa25a00413185aed6de64ad040d8b473c81a6ac`, observed 2026-07-27 in a dirty shared worktree<br>
**Product-stage finding:** `WORKING_PRELAUNCH_PRODUCT / CUSTOMER_VALIDATION_NOT_ESTABLISHED`

## Source Hierarchy Used

This audit separates product meaning, implementation truth, planned behavior, historical context, and market evidence.

| Precedence | Source class | Governs | Does not prove |
|---:|---|---|---|
| 1 | Current local repository source and `AGENTS.md` | Implementation truth, task boundary, repository safety, delivery rules | Deployment, user adoption, or market value |
| 2 | Current GitHub state | Committed history, branch/remote context, and current repository provenance | Local uncommitted behavior or product demand |
| 3 | Ratified Product Canon (`SRC-I01`) | Intended product meaning, invariants, vocabulary, and declared strategic direction | Customer recognition, willingness to pay, or PMF |
| 4 | Active Project Ledger/Timeline plan pack (`SRC-I08`) | Intended future architecture and implementation sequence | Implemented behavior or validated customer behavior |
| 5 | Primary customer evidence | Actual incidents, behavior, consequences, commitment, and retention | None was supplied; future evidence outranks market inference |
| 6 | Current external primary sources | Frameworks, market context, professional practice, and competitor facts | Archestimator-specific demand |
| 7 | Shared discovery conversation (`SRC-I03`) | Historical founder reasoning and plan provenance | Current implementation or customer validation |
| 8 | Older Notion pages, archived plans/code, README, and marketing surfaces | Historical evidence, claims, and drift detection | Current implementation or market truth |

When sources conflict, current code determines capability, the Canon determines intended meaning, and customer evidence would determine market truth.

## Git and History Snapshot

- `[CODEBASE_FACT | HIGH]` The audit stayed on `main`, tracking `origin/main`, at committed HEAD `efa25a00`.
- `[HISTORICAL_FACT | HIGH]` Commit `4d88a60b` on 2026-07-26 added the Project Ledger/Commitment Timeline plan pack as documentation/planning work.
- `[HISTORICAL_FACT | HIGH]` The subsequent committed history through `efa25a00` primarily records onboarding, quality-gate, configuration, and button-architecture work rather than a completed ledger runtime.
- `[CODEBASE_FACT | HIGH]` The worktree contained extensive concurrent modified/untracked Timeline migrations, routes, components, contracts, and tests. Those files were audited as local point-in-time evidence but not treated as committed, deployed, integrated, or release-ready.
- `[CODEBASE_FACT | MEDIUM]` GitNexus was stale and its full-text indexes were unavailable, so capability findings used current source, direct call-site inspection, migrations, tests, and plan contracts instead of rebuilding the graph during concurrent work.

## What Archestimator Is Today

`[EVIDENCE_BACKED_INFERENCE | HIGH]` Archestimator is a substantial pre-launch construction estimating and client-facing commercial-workflow product. It is not merely a concept, but it is also not a customer-validated “living contractual ledger.”

The most accurate current description is:

> A working construction estimating workspace with reusable cost/scope sources, proposal-oriented issue publication, and partial client-portal discussion/decision capabilities, while a broader Project Ledger and Commitment Timeline is under active local development.

### What this description deliberately excludes

- It does not call the product product-market fit.
- It does not imply paid customers, retention, or a validated ICP.
- It does not call locally present dirty/untracked work deployed or release-ready.
- It does not imply legal enforceability or contract compliance.
- It does not treat planned Timeline objects as complete product behavior.
- It does not claim native PDF export when only browser print/save is live.

## Current Capability Matrix

Statuses use only the required enum. `PARTIAL` means meaningful local behavior exists but the stated whole capability is incomplete. Local dirty-worktree code is not deployment proof.

| Capability | Status | User-facing behavior | Current source path | Authoritative data source | Canon relationship | Active Timeline relationship | Evidence quality | Known semantic mismatch | Product-validation implication |
|---|---|---|---|---|---|---|---|---|---|
| Estimate authoring | `LIVE` | Build/edit estimate hierarchy, rows, totals, duplicate/delete/restore, insert sources | `src/lib/estimates/actions.ts:1788`; `src/components/workshop/EstimateSheetContent.tsx:3419` | D1 estimate tables | Creates the financial truth that later records should preserve | Required upstream source | `[CODEBASE_FACT | HIGH]` current committed runtime | Mutable working estimate is not an issued or accepted state | Entry-wedge feasibility is strong; value/retention remain unproven |
| Components | `PARTIAL` | Reuse versioned cost items with price history, linked rows, usage, detach | `src/lib/estimates/actions.ts:2700`; `src/lib/estimates/express-components.ts:88` | D1 component/version/usage tables | Supports reusable cost knowledge | Upstream input only | `[CODEBASE_FACT | HIGH]` | Promotion/lifecycle and price-update trust are incomplete | Test real reuse and propagation expectations before expansion |
| Templates | `PARTIAL` | Create reusable tab/area structures; copy/link insert; archive/restore; propagate | `src/components/workshop/library/templates-browse/InsertIntoEstimatePicker.tsx`; `migrations/0092_linked_estimate_template_instances.sql` | D1 template/version/instance tables | Supports reusable structured knowledge | Upstream input only | `[CODEBASE_FACT | HIGH]` | No general version browser/rollback; overlaps “Assembly” | Best current home for reusable multi-row packages |
| Project Sources | `PARTIAL` | Copy prior estimate/tab/area into current estimate as a snapshot | `src/lib/reusable-sources/actions.ts:609`; `src/components/workshop/library/LibraryComponentSourceShell.tsx:98` | D1 project/estimate source records | Reuses accumulated project knowledge | Upstream input only | `[CODEBASE_FACT | HIGH]` | Copy semantics are clear; preferred customer workflow is unknown | Strong low-maintenance alternative to a curated Assembly library |
| Separate Assembly object | `SUPERSEDED` | No current first-class save/manage Assembly workflow | `src/lib/estimates/tree-hierarchy.ts:21`; `tests/vitest/component-library-ui.test.tsx:1219` | Legacy node residue; current Template/Component/Source tables | Historical term, not current settled ontology | No required Timeline role | `[CODEBASE_FACT | HIGH]` | Public/archived copy still implies live assemblies | Do not revive without natural-language and behavior proof |
| Estimate activity/history | `PARTIAL` | View activity and row revisions; restore selected changes | `src/components/workshop/estimate-sheet/activity-history.tsx:1687`; `src/lib/estimates/actions.ts:1014` | D1 activity/revision records | Preserves internal change context | Distinct from official issue history | `[CODEBASE_FACT | HIGH]` | Mutable `versionLabel` is not an immutable named estimate version | Users may confuse internal revision history with official commitments |
| XLSX proposal export | `LIVE` | Download native spreadsheet proposal output | `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts:17` | Current estimate snapshot transformed at request | Supports portability | Can be an issued artifact only after explicit publication | `[CODEBASE_FACT | HIGH]` | Export alone does not freeze an official issue | Useful whole-product capability, not market proof |
| Native PDF export | `NOT_PRESENT` | Browser print/save only | `src/components/share/SharePrintButton.tsx:7`; `src/components/client-portal/ClientPortalShell.tsx:316` | Browser-rendered page | Portable human-readable output is desirable | Minimum issue/receipt may require exact PDF | `[CODEBASE_FACT | HIGH]` | Public/proposal expectations may imply native export | Validate whether browser save is an adoption blocker |
| Estimates-only Issue publication | `LIVE` | Publish immutable hashed estimate issue/sections, supersede prior mutable issue | `src/lib/client-portal/publish-service.ts:366`; `src/lib/client-portal/issue-builder.ts:378` | D1 portal issue/section/current-issue records | Implements exact issued representation | Existing foundation for the narrow Timeline test | `[CODEBASE_FACT | HIGH]` | Latest published Issue is not yet an accepted baseline | Enough to test publish → review → decision behavior now |
| Multi-artifact Issue package | `PARTIAL` | Public artifact read route and package schema exist; publication does not populate complete package | `migrations/0109_client_portal_issue_packages.sql`; `src/app/api/share/[token]/artifacts/[publicArtifactId]/_route-core.ts` | D1 issue package relationships plus artifact versions | Intended exact multi-artifact commitment package | Central planned expansion | `[CODEBASE_FACT | HIGH]` current local source | Tables/read paths can be mistaken for end-to-end publication | Do not test or market the full package until writers connect it |
| Change requests | `PARTIAL` | Create/amend/acknowledge/assess/reject/withdraw and expose recipient-visible requests | `src/lib/change-requests/service.ts:461`; `src/lib/change-requests/public-handlers.ts:359` | D1 change request/version/event/exposure tables | Supplies causal request context | Planned origin for issue/change events | `[CODEBASE_FACT | HIGH]` local uncommitted runtime | Internal UI/whole orchestration and customer vocabulary remain incomplete | Feasibility advanced during audit; behavior and terminology unvalidated |
| Recipient evidence upload | `PARTIAL` | Upload validated bytes for a visible owned request and receive `201 pending_scan` | `src/app/api/share/[token]/requests/[publicRequestId]/evidence/_route-core.ts:284`; `migrations/0115_project_change_request_evidence_uploads.sql` | R2 upload object + D1 upload/evidence relationship | Adds attributable supporting evidence | Planned request/evidence → issue input | `[CODEBASE_FACT | HIGH]` plus focused 12/12 verifier test | Pending-scan relation has no discovered post-scan status finalizer | Test only upload/capture; do not claim complete evidence lifecycle |
| Internal artifact versions | `PARTIAL` | Upload, scan-gate, version, browse, and deliver project PDFs/files | `src/app/api/projects/[projectId]/artifacts/_upload.ts:44`; `src/components/workshop/project-timeline/ProjectArtifactsWorkspace.tsx:103` | R2 bytes + D1 artifact/version/upload records | Supports exact evidence/artifact versions | Planned issue package input | `[CODEBASE_FACT | MEDIUM]` moving local worktree | Preview/route and publication linkage need current integration proof | Only minimum decision-relevant artifacts should block pilots |
| Portal access and roles | `PARTIAL` | Stable/mapped tokens, passwords, recipient credentials, grants, fail-closed policy | `src/lib/client-portal/public-repository.ts:68`; `src/lib/client-portal/policy.ts:229` | D1 portal/recipient/grant records | Supports attributable external access | Expanded role/authority model in plan | `[CODEBASE_FACT | HIGH]` | Stored role does not prove real contractual authority | Test comprehension; never infer enforceability |
| Discussion | `PARTIAL` | Create/reply/read/resolve threads with visibility, audit, and notifications | `src/lib/client-portal/thread-repository.ts:255`; `src/lib/client-portal/issued-target-resolver.ts:112` | D1 thread/message/audit records | Preserves discussion around issued truth | Plan adds richer commitment targets | `[CODEBASE_FACT | HIGH]` | Declared target vocabulary exceeds resolver coverage | Basic discussion is testable; rich object discussion is not |
| Decision capture | `PARTIAL` | Verify current issue/hash/intent/idempotency/recipient and record actor/status/audit | `src/lib/client-portal/decision-service.ts:53` | D1 decision, issue state, audit/notification records | Preserves attributable product decision | Intended trigger for baseline/event projection | `[CODEBASE_FACT | HIGH]` | Product actor checks do not establish legal authority | Test exact decision behavior with explicit authority boundary |
| Decision receipt | `PARTIAL` | Show decision result in portal | `src/components/client-portal/ClientPortalDecisionSection.tsx:9` | D1 decision data projected into UI | Should make the recorded outcome inspectable | Minimum Timeline evidence packet | `[CODEBASE_FACT | HIGH]` | UI omits ID/hash/signer/note/export present or derivable in data | Improve only enough for fair receipt/comprehension test |
| Accepted baseline | `PARTIAL` | Schema/contracts can represent baseline; no discovered decision-batch writer establishes it | `migrations/0110_client_portal_baselines.sql`; `src/lib/client-portal/decision-service.ts:108` | D1 baseline tables, currently unpopulated by decision flow | Core current-accepted-state concept | Central plan projection | `[CODEBASE_FACT | HIGH]` | Accepted Issue status can be mistaken for integrated baseline | Minimum missing link for testing accepted-versus-pending state |
| Commitment event ledger | `PARTIAL` | Record idempotent commitment events and optional client-safe exposure in one batch | `src/lib/project-ledger/event-service.ts:888`; `tests/vitest/project-commitment-event-service.test.ts:204` | D1 `project_commitment_events` and exposures | Implements append-only official-event foundation | Core Timeline source | `[CODEBASE_FACT | HIGH]` plus focused 5/5 verifier test | Writer exists, but event producers/projection/human Timeline are incomplete; not hash-chained | Infrastructure exists; central-product value remains untestable |
| Human-readable Commitment Timeline | `NOT_PRESENT` | No complete internal/public current-state + chronology route/UI discovered | Active plan pack; current route/component scan | Intended projection from D1 official events/baselines | Core Canon expression | Planned product surface | `[CODEBASE_FACT | HIGH]` negative source finding | Artifact workspace naming can be mistaken for commitment Timeline | Validate with a narrow prototype/current-state surface before broad build |
| Legacy share continuity | `PARTIAL` | Route modern/legacy shares and map historical tokens/data | `src/app/share/[token]/page.tsx:190`; `src/lib/client-portal/legacy-migration-service.ts:274` | D1 legacy and modern portal mapping records | Preserves prior issued access/history | Cutover workstream | `[CODEBASE_FACT | HIGH]` | Rollout/write-freeze defaults off; migration completeness unproven | Do not make broad cutover a Problem Proof prerequisite |
| Guided onboarding | `LIVE` | Getting-started/onboarding routes and meaningful first-estimate checklist | `src/components/onboarding/GettingStartedProgress.tsx:47`; `src/lib/onboarding/first-estimate-checklist.ts:19` | D1 onboarding/progress records | Supports reaching first estimating value | Not Timeline-specific | `[CODEBASE_FACT | HIGH]` | README/stage language lags current source | Use real-user time-to-first-value, not existence, as evidence |
| Activation telemetry | `PARTIAL` | Record flow/milestone events with synthetic-origin controls | `src/lib/onboarding/flow-repository.ts:579`; `src/lib/onboarding/activation-repository.ts:308` | D1 activation/flow events | Can measure early behavior | Needs connected-loop milestones | `[CODEBASE_FACT | HIGH]` | Storage retention is not behavioral retention; rich cohort report is not fully surfaced | Instrument EBPRA and second cycle before growth metrics |
| Public acquisition analytics | `PARTIAL` | Conditionally load analytics; limited CTA exposure/conversion integrity | `src/components/landing/LandingAnalyticsLoader.tsx:9`; `src/app/new/_components/new-landing-page.tsx:96` | Provider events when configured | Outside core Canon | Not Timeline-specific | `[CODEBASE_FACT | HIGH]` | Separate `/new` URL is not randomized A/B evidence | Do not use page traffic/signup as validation |
| Completed primary customer research | `NOT_PRESENT` | No attributable completed interviews/artifact studies in supplied corpus | `.ai/01_roadmap/21-usability-research-and-beta-learning-plan.md:24`; `.ai/01_roadmap/30-design-partner-beta-recruiting-plan.md:53` | Customer transcripts/artifacts would be authoritative; none supplied | Canon explicitly acknowledges gap | Must govern plan expansion | `[RESEARCH_GAP | HIGH]` | Founder discovery and synthetic demos can look like research | Market verdict must remain conditional |
| Non-founder use, retention, and WTP | `UNKNOWN` | No attributable cohort, second natural cycle, payment, or dated commitment in supplied evidence | Founder seed; beta terms; admin financial placeholder | Account-level behavioral and economic records would be authoritative | Required to validate the thesis | Required expansion gate | `[RESEARCH_GAP | HIGH]` | Data-retention settings and historical price concepts are not customer retention/WTP | Overall startup validation remains low |

## Canon Versus Market Truth

### Ratified internal thesis

`[RATIFIED_CANON | HIGH]`

> Archestimator manages the living record of contractual financial commitments in construction, from the first estimate through every issued revision, discussion, and decision.

Internal descriptor:

> A living contractual ledger for construction financial commitments.

### Desk-audit interpretation

`[EVIDENCE_BACKED_INFERENCE | MEDIUM]` The thesis is a strong internal design principle and a plausible future product direction. It is not yet customer-recognized category language or commercially validated scope.

`[OPEN_DECISION | HIGH]` The first public wedge should remain familiar—estimating/proposal workflow—while interviews test customer language around revisions, approval, accepted scope, and proof of change.

## Material Source Contradictions

| Contradiction | Evidence | Resolution for this audit |
|---|---|---|
| Root public copy speaks to contractors, estimators, architects, QSs, builders, and DIY while legal terms restrict use to professional/business contexts | `src/app/kimi3d/_content.ts:53`; `src/lib/legal/terms-content.ts:48` | ICP is unresolved; do not infer broad validated demand. |
| Stage labels include alpha, MVP, closed beta, and design-partner beta | `src/app/kimi3d/_content.ts:33`; `README.md:409` | Use “working pre-launch product; market validation pending.” |
| README says the product knows clients/projects/prices while long-term intelligence is separately planned | `README.md:3`; `README.md:331` | Treat intelligence language as aspiration unless a live specific behavior is cited. |
| README contains a ₱239/month Solo concept while the pricing page withholds final pricing and beta has no payment provider | `README.md:347`; `src/app/pricing/page.tsx:83`; `src/app/admin/financials/page.tsx:8` | WTP is unknown; historical price is a hypothesis only. |
| Public/legacy copy still references assemblies while current product removed the separate Assembly behavior | `src/components/landing-v3/landing-content.ts:34`; `tests/vitest/component-library-ui.test.tsx:1219` | Current domain model is Components + Templates + Project Sources; public-copy change is outside this research task. |
| Active Timeline README said “Not started” while local implementation was in progress | active plan `README.md:7` plus dirty worktree | Plan narrative is stale; capability is determined file by file and remains incomplete. |
| Plan requires baseline creation in the decision transaction, but current decision service does not create it | active plan database design; `src/lib/client-portal/decision-service.ts:108` | Baseline is planned/partial, not live. |
| Product exposes modern “last viewed” semantics while view deduplication preserves only the first view | `src/lib/client-portal/activity-service.ts:106` | Do not use current field as repeat-engagement evidence. |

## Notion, GitHub, and Historical-Conversation Reconciliation

- The Notion Canon (`SRC-I01`) is the clearest expression of intended product meaning and openly records missing interviews, ICP, buyer, quantified problem, and WTP.
- The historical Notion archive and shared ChatGPT conversation (`SRC-I02`, `SRC-I03`) explain how the ledger/portal model evolved; they are founder discovery artifacts, not customer research.
- GitHub/current local source (`SRC-I04`, `SRC-I10`) shows much more implementation than customer proof and is authoritative for current capability.
- The active Timeline pack (`SRC-I08`) is a future-state engineering plan under concurrent implementation. It must not be read as current market validation or release status.

### Reconciliation ledger

| Topic | Canon (`SRC-I01`) | Historical discovery (`SRC-I02`, `SRC-I03`) | Active plan (`SRC-I08`) | Current repository (`SRC-I04`, `SRC-I10`) | Reconciled finding |
|---|---|---|---|---|---|
| Deep product thesis | Ratifies a living record of construction financial commitments | Develops the Project Ledger/portal idea and causal history | Converts thesis into event, baseline, issue, request, artifact, role, and projection architecture | Estimate/issue/decision primitives are real; full loop is incomplete | Ratified internal meaning; commercially unvalidated scope |
| Estimate versus official issue | Working estimate must not silently become official truth | Explores publication as the boundary between internal work and recipient record | Requires immutable multi-artifact Issues and supersession | Estimates-only immutable hashed issue publication is `LIVE` | Existing source supports a narrow issue test; multi-artifact promise remains `PARTIAL` |
| Accepted baseline | Accepted state should be explicit and separate from pending proposals | Uses accepted prior state as the anchor for later change explanation | Requires atomic decision → baseline projection | Baseline schema exists; no decision-batch writer was discovered | Concept coherent, product behavior `PARTIAL`, customer comprehension unknown |
| Requests and evidence | Causal context should remain connected to commercial change | Motivates preserving source request/evidence rather than later narration | Defines first-class requests, evidence, assessment, issue selection, and exposure | Request services and recipient upload now exist locally; post-scan/package orchestration incomplete | Implementation advanced during audit but does not prove capture behavior or value |
| Commitment Timeline | Current truth and why it exists should be understandable | Frames the ledger as a chronological/causal product experience | Plans internal/public Timeline and current-state projection | Event writer exists; human-readable commitment Timeline does not | Infrastructure `PARTIAL`; central product bet untestable end-to-end |
| Assembly/reuse | Reusable knowledge is strategic but terminology/model must be correct | Historical experiments explored assemblies/bundles/components | Timeline plan consumes estimate truth but does not require separate Assembly | Current ontology is Components, Templates, Project Sources; legacy Assembly is `SUPERSEDED` | Merge behavior with Templates unless primary language/use proves separation |
| Evidence stage | Explicitly records missing problem/ICP/buyer/WTP proof | Founder reasoning supplies hypotheses, not interviews | Assumes a product outcome and implements toward it | No attributable non-founder paid-repeat dataset was found | Market truth remains `MARKET_VALIDATION_PENDING` regardless of implementation depth |

This ledger is the reproducible conflict map: each source retains its proper authority instead of being blended into one favorable narrative.

## Evidence Gaps Blocking Market Claims

1. No attributable recent customer incident set.
2. No source artifacts supplied by target customers.
3. No measured frequency or economic consequence.
4. No validated first ICP, buyer, authority map, or acquisition channel.
5. No external-recipient comprehension or portal-adoption observation.
6. No paid commitment or budget displacement.
7. No second natural project/revision cycle.
8. No win/loss, churn, or comparative switching evidence.

## Current-State Decision

- **Product truth:** substantial working estimating/reuse product; partial issue/portal workflow; broader ledger/Timeline incomplete.
- **Market truth:** unvalidated.
- **Stage:** Problem Proof, not PMF optimization.
- **Permitted conclusion:** proceed with a narrower validation wedge.
- **Prohibited conclusion:** the full Canon thesis, Timeline, ICP, WTP, or category has been validated.

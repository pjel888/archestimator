# Connected Workflow Validation

**Research status:** `DESK_AUDIT_COMPLETE / MARKET_VALIDATION_PENDING`<br>
**Connected-loop capability status:** `PARTIAL`<br>
**Market-validation status:** `UNVALIDATED`<br>
**Strongest hypothesis:** `HYPOTHESIS_C`<br>
**Confidence:** `MEDIUM`

## Executive Finding

The proposed loop is strategically coherent:

```text
Reusable cost knowledge
→ estimate construction
→ exact Issue publication
→ recipient review and discussion
→ attributable decision
→ accepted baseline
→ later revision
→ deterministic explanation
→ future reuse
```

`[CODEBASE_FACT | HIGH]` Archestimator can already support meaningful portions of this loop, especially estimate creation, reusable sources, estimates-only issue publication, basic recipient discussion, and decision capture.

`[CODEBASE_FACT | HIGH]` The locally evolving Project Ledger implementation does not yet connect the whole loop. Change-request services, recipient evidence byte upload, and a commitment-event writer now exist, but multi-artifact package writers, post-scan evidence lifecycle, accepted-baseline orchestration, event producers/projection, public history navigation, and the human-readable Timeline remain missing or partial.

`[RESEARCH_GAP | HIGH]` No observed customer has completed the loop, returned for a second natural cycle, or paid for the outcome. Product coherence is ahead of market proof.

## Point-in-Time Audit Boundary

- Snapshot observed on 2026-07-27 in a dirty shared `main` worktree.
- `LIVE` below means reachable local runtime source, not deployed or beta-user proof.
- `PARTIAL` means connected behavior exists with material product gaps.
- `PLANNED` means schema, contracts, or plan-pack intent without complete runtime orchestration.
- New Timeline files were appearing during the audit; this is a moving implementation snapshot, not a release certification.
- No product files, migrations, runtime configuration, or active plan-pack files were changed by this research run.

## Loop Capability Map

| Loop stage | Status | Current product truth | Validation consequence |
|---|---|---|---|
| Reusable cost knowledge | `PARTIAL` | Components, Templates, and Project Sources can populate estimates; lifecycle and terminology overlap remains. | A real estimate can begin from prior knowledge now. |
| Estimate construction | `LIVE` | D1-backed estimate trees, areas/groups/tabs, rows, calculations, duplication, deletion/restore, and library insertion exist. | A first-ICP user can perform the entry job. |
| Estimates-only Issue publication | `LIVE` | Source revision fencing, sanitization, content hashing, immutable issues/sections, supersession, and current-issue update are connected (`src/lib/client-portal/publish-service.ts:366`, `src/lib/client-portal/issue-builder.ts:378`). | A narrow publish → review test is possible. |
| Multi-artifact Issue package | `PARTIAL` | Draft/artifact/request/snapshot/change-set tables exist, but publication writers do not populate the package; public artifact access is read-only (`migrations/0109_client_portal_issue_packages.sql:20`). | The proposed differentiator cannot yet be tested end-to-end. |
| Change request and recipient evidence | `PARTIAL` | Request create/amend/state transitions and recipient-owned byte upload to `pending_scan` exist; complete evidence finalization/issue linkage does not. | Request/capture behavior is testable in isolation, not as a complete official loop. |
| Recipient access and roles | `PARTIAL` | Stable/mapped tokens, passwords, recipient credentials, grants, and fail-closed policy exist; expanded roles rely on local untracked migration work. | Existing recipient testing is possible; expanded authority claims are premature. |
| Discussion | `PARTIAL` | Threads, replies, unread/read state, resolution, visibility, audit, and notifications exist; many advertised target kinds are not resolvable. | Basic discussion can be tested; rich object-specific conversation cannot. |
| Decision | `PARTIAL` | Current-issue checks, expected content hash, intent hash, idempotency, recipient authority, signer snapshots, audit, and issue state update exist (`src/lib/client-portal/decision-service.ts:53`). | Attributable decision behavior is testable, but visible receipt quality is weak. |
| Decision receipt | `PARTIAL` | UI omits decision ID, issue hash, signer details, note, and export (`src/components/client-portal/ClientPortalDecisionSection.tsx:9`). | Dispute-resolution and evidence-packet value cannot be fairly tested yet. |
| Accepted baseline | `PARTIAL` | Baseline tables/contracts exist, but the decision transaction does not create the required baseline. | “Accepted current state” is not yet an integrated product truth. |
| Commitment Timeline | `PARTIAL` | An idempotent event/exposure writer exists, but complete event producers, projection, and Timeline route/UI do not. | Infrastructure can support a prototype; the central product promise remains untestable as designed. |
| Later revision and delta | `PARTIAL` | Issue supersession exists; package-level deterministic change sets and baseline-derived revision explanation are not connected. | Users cannot yet validate the complete “what changed and why” promise. |
| Reuse after accepted work | `PARTIAL` | Reusable estimate sources exist, but no observed loop turns accepted commercial history into future retained behavior. | Compounding value is a hypothesis, not measured retention. |

## Current Integrity and Evidence Boundaries

### What is credible now

- `[CODEBASE_FACT | HIGH]` Existing issue publication creates immutable, hashed issue/section records and supersedes mutable prior issues atomically.
- `[CODEBASE_FACT | HIGH]` Decision capture verifies current issue state and expected content/intent hashes and preserves signer snapshots.
- `[CODEBASE_FACT | HIGH]` Legacy token mapping can preserve old share entry points while routing to a modern portal.
- `[CODEBASE_FACT | MEDIUM]` Internal artifact upload and scan-gated immutable versions exist locally with R2-backed delivery paths.
- `[CODEBASE_FACT | HIGH]` Change-request create/amend/state services and recipient-visible public handlers exist in the local worktree.
- `[CODEBASE_FACT | HIGH]` Recipient-owned evidence bytes can be validated, stored, related to the request, and returned as `201 pending_scan`.
- `[CODEBASE_FACT | HIGH]` `recordProjectCommitmentEvent` can write an idempotent event and optional client-safe exposure in one D1 batch.

### What is not yet credible

- `[CODEBASE_FACT | HIGH]` Multi-artifact issue-package rows have schema but no complete publication writer.
- `[CODEBASE_FACT | HIGH]` No post-scan writer was discovered that advances `project_change_request_evidence_uploads` from `pending_scan` and connects the evidence into a complete Issue package.
- `[CODEBASE_FACT | HIGH]` Baseline creation is not in the current decision write batch despite the plan requiring it.
- `[CODEBASE_FACT | HIGH]` Commitment event recording exists, but complete event producers, projection, current-state composition, and human-readable Timeline do not; events are not hash-chained.
- `[CODEBASE_FACT | HIGH]` Public issue history can be addressed by API parameters, but the portal shell presents only the current manifest.
- `[CODEBASE_FACT | HIGH]` Modern view events are first-view deduplicated while code reports both first and last view, so repeat-engagement claims would be invalid.
- `[CODEBASE_FACT | HIGH]` The internal PDF preview path in the local Files UI does not match the implemented content route.
- `[RESEARCH_GAP | HIGH]` No fresh machine-readable proof establishes the local Timeline work as integrated or release-ready.

## Multi-Artifact Issue Validation

### Product-model judgment

`[EVIDENCE_BACKED_INFERENCE | MEDIUM]` A multi-artifact Issue is useful only when the included material is necessary for a specific decision. “Issue” should not become a folder that accumulates every project file.

The smallest package should answer, without founder narration:

1. What exact decision is requested?
2. What accepted state is currently in force inside the product?
3. What is merely proposed?
4. What changed in scope, cost, and—when known—time?
5. Why did it change, with attributable request or evidence?
6. What is included and excluded?
7. What remains unresolved?
8. Which exact estimate/document versions apply?
9. Who is acting, and what authority does the product know versus not know?
10. What product state will follow acceptance or requested changes?

If a six-person comprehension test cannot answer these items, adding more artifact types is counterproductive.

### Recommended minimum object set

- exact issued estimate snapshot;
- concise deterministic change set from the accepted product baseline;
- selected supporting attachments only;
- relevant assumptions and exclusions;
- unresolved scope/cost/time consequences;
- requested action and named recipient;
- attributable decision record.

Defer broad document-management behavior, full correspondence ingestion, general drawing management, and arbitrary artifact bundles.

## Accepted-Baseline Model

`[EXTERNAL_PRIMARY_EVIDENCE | HIGH]` AEC guidance supports distinguishing a proposed change from an agreed change or directive and recording scope, cost, time, documents, and authorized actions (`SRC-A01`–`SRC-A03`).

`[EVIDENCE_BACKED_INFERENCE | MEDIUM]` A single active product baseline per commitment scope is understandable if it means “the latest state accepted through this product workflow,” not “the legally controlling contract state in every circumstance.”

The model must preserve:

- prior accepted baselines as immutable history;
- pending proposals without mutating the accepted state;
- directives or external decisions that are not equivalent to bilateral acceptance;
- superseded issues without erasing discussion or evidence;
- scope, cost, time, document, and authority uncertainty;
- external contract terms that may override the product workflow.

### Baseline terminology risk

“Accepted baseline” may be legible internally but should be tested against customer terms such as “approved quote,” “current approved scope,” “latest agreed amount,” “variation,” “change order,” or “revised contract sum.” Do not teach the term before testing comprehension.

## Legal and Authority Boundary

The product must distinguish these layers:

| Layer | Safe meaning |
|---|---|
| Product event | The application recorded an action at a time. |
| Audit trail | The application preserves attributable event history and metadata. |
| Attributable record | A record connects content, actor identity, and event context according to product controls. |
| Evidentiary usefulness | The record may help reconstruct facts; usefulness depends on context and law. |
| Electronic signature | A specific legal/technical mechanism not established merely by clicking approve. |
| Contractual acceptance | Depends on authority, offer, acceptance, contract terms, and applicable law. |
| Legal proof / enforceability | A legal conclusion the product and this research do not establish. |

`[EVIDENCE_BACKED_INFERENCE | HIGH]` Archestimator may truthfully describe exact issues, attributable decisions, immutable snapshots, and audit history when implemented. It must not claim legal enforceability, contract compliance, or authority beyond what it actually verifies.

## Recipient Adoption Risk

The recipient is the highest-friction actor because they receive less recurring value and can default to familiar channels.

### Main risks

- portal/account fatigue;
- reply-by-chat/email habit;
- unclear requested action;
- authority ambiguity;
- desire for a downloadable PDF;
- fear that clicking “accept” has unintended legal effect;
- mobile usability and connectivity;
- external users asked to encode information the proposer already has.

### Design implication

`[EVIDENCE_BACKED_INFERENCE | MEDIUM]` The workflow should notify through existing channels, open to the exact decision with minimal authentication appropriate to risk, provide a portable snapshot/receipt, and treat off-platform replies as a capture problem rather than blaming the recipient.

## Capture-Burden Analysis

| Capture action | Expected frequency | Burden risk | Information availability | Recommendation |
|---|---|---|---|---|
| Select exact estimate/version | Every issue | Low–medium | Usually known | Automate from current workspace; require explicit confirmation. |
| State requested decision | Every issue | Low | Known by sender if issue is real | Required; offer concise structured choices. |
| Explain reason for change | Every revision | Medium | Often spread across messages/calls | Require a short attributable reason; allow source attachment/link. |
| Quantify scope/cost delta | Every revision | Medium | Derivable when estimate is structured | Compute deterministically; do not re-encode. |
| Quantify time impact | Some revisions | High | Often unresolved | Allow unknown/unresolved; never force false precision. |
| Attach evidence | Some revisions | Medium–high | May exist in phone/chat/email | Select only decision-relevant evidence; support later capture without weakening issue immutability. |
| Assign authority | Per recipient/project | High | Often ambiguous | Record known role and explicit limitations; do not infer authority. |
| Maintain a broad project log | Continuous | Very high | Fragmented | Do not require during Problem Proof. Capture events as by-products of core actions. |

**Principle:** the Timeline must be generated primarily from work users already need to perform. If it requires a second administrative narration of the project, adoption is unlikely.

## Activation and Retention

### Candidate activation ladder

1. **Little Hire:** create a valid estimate total using one real reusable source.
2. Publish an exact client-facing issue.
3. Receive a verified external open or response.
4. Record an attributable decision.
5. Establish the first accepted product baseline.
6. Complete one later revision with a correct deterministic explanation.
7. **Big Hire / retained value:** return for a second natural project or revision without founder prompting.

`[CODEBASE_FACT | HIGH]` Current onboarding and telemetry can measure several early estimate milestones and distinguish synthetic origins. `[RESEARCH_GAP | HIGH]` no behavioral cohort proves the ladder, and current modern portal view deduplication cannot measure repeat opens correctly.

### Current one metric that matters

Use `EBPRA` from `09-METRICS-EXPERIMENTS-AND-DECISION-GATES.md`: Evidence-Backed Paid Repeat Accounts. It deliberately requires an incident, artifact, real loop, second natural cycle, and economic commitment.

## What Can Be Tested Before the Full Timeline Exists

`[EVIDENCE_BACKED_INFERENCE | HIGH]` The existing estimates-only flow is enough for a narrow beta experiment:

1. Import or build one real estimate.
2. Publish one exact estimates-only issue.
3. Send it to a real recipient.
4. Observe open, comprehension, discussion, and decision behavior.
5. Manually facilitate a later revision while measuring what information is missing.
6. Produce a prototype “what changed” explanation from the two exact snapshots.

This tests whether users value the connected job before finishing broad artifacts, requests, role taxonomies, and Timeline UI.

## Connected-Loop Decision

- **Strongest hypothesis:** `HYPOTHESIS_C`.
- **Confidence:** `MEDIUM`.
- **Decisive evidence:** live estimating/reuse and estimates-only issue/decision paths; coherent AEC change-control model; material gaps in the full product loop; zero observed paid repeat behavior.
- **Missing evidence:** real recipient comprehension, capture burden, authority handling, baseline utility, second-cycle retention, and WTP.
- **Immediate action:** run the narrow estimates-only publish → review → decision → revision test with real artifacts while completing only the minimum technical gaps that block that test.
- **Stop doing:** expanding artifact kinds, role taxonomies, broad document management, and Timeline visualization before the narrow loop earns use.
- **Next gate:** at least two of three paid pilots complete a full loop and return for a second natural cycle; otherwise separate or reduce the ledger behavior.

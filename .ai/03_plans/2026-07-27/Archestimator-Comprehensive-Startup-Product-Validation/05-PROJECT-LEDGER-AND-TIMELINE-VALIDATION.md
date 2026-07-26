# Project Ledger and Commitment Timeline Validation

**Research status:** `DESK_AUDIT_COMPLETE / MARKET_VALIDATION_PENDING`<br>
**Timeline verdict:** `TIMELINE_PROCEED_BUT_NARROW`<br>
**Confidence:** `MEDIUM`

## Executive Verdict

`[ACTIVE_PLAN | HIGH]` The Project Ledger and Commitment Timeline plan pack is technically serious and internally coherent. It distinguishes internal work from official issues, proposed state from accepted state, evidence from assertions, and immutable history from current projections.

`[RESEARCH_GAP | HIGH]` Its central behavioral premise is unproven: users will consistently capture official project moments before a dispute, external recipients will act in the portal, and that behavior will produce enough immediate value to retain and monetize.

`[EVIDENCE_BACKED_INFERENCE | HIGH]` The plan currently combines too many products for Problem Proof: artifact/document management, change requests, multi-artifact publication, discussion, decisions, baseline projection, exposure management, role expansion, internal/public Timeline, command center, legacy migration, and AI explanation. The right response is not to discard the model; it is to expose the smallest complete commercial-change loop and stop expanding until behavior is observed.

## Independent Assessment of the Bet

### Where the Timeline could create value

| Moment | Potential value | Evidence status | Assessment |
|---|---|---|---|
| Before a dispute | Clarifies exact issued scope, requested decision, assumptions, and pending versus accepted state | `WORKING_HYPOTHESIS` | Highest strategic value, but requires proactive capture and recipient comprehension. |
| During active work | Gives the team a compact current-state view and prevents work against an obsolete commercial position | `WORKING_HYPOTHESIS` | Could become operational habit if generated from estimate/issue actions rather than extra admin. |
| During a disagreement | Reconstructs issue, discussion, decision, evidence, and supersession | `EVIDENCE_BACKED_INFERENCE` | Intuitively valuable and supported by records/change-control logic; may be too episodic to drive retention alone. |
| At handoff or collection | Supplies an attributable evidence packet and explanation of the current amount | `WORKING_HYPOTHESIS` | Economically promising if it shortens collection or prevents write-offs; no measured consequences exist. |
| Across future projects | Converts accepted work into reusable commercial knowledge | `WORKING_HYPOTHESIS` | Potential compounding value, but this linkage is not yet implemented or observed. |

### Strongest negative hypothesis

> Users will admire the Timeline after a disagreement but will not maintain it during ordinary project work. It becomes an incomplete audit archive rather than a living operating record.

This hypothesis remains fully alive because:

- `[RESEARCH_GAP | HIGH]` no natural capture behavior has been observed;
- `[EVIDENCE_BACKED_INFERENCE | MEDIUM]` immediate benefit often accrues to an owner, collector, or future reviewer while encoding burden falls on the estimator/project lead now;
- `[EVIDENCE_BACKED_INFERENCE | HIGH]` chat, calls, and email remain faster for external recipients;
- `[ACTIVE_PLAN | HIGH]` the full model asks users to manage requests, evidence, consequences, recipients, artifacts, issues, discussion, decisions, baselines, and corrections;
- `[CODEBASE_FACT | HIGH]` the current runtime cannot yet complete the proposed loop, so internal enthusiasm has not been behaviorally tested.

## Active Plan-Pack Audit

### Strengths

- Preserves append-only official history and rebuildable projections.
- Separates internal drafts from issued external records.
- Treats issue acceptance as a state transition rather than mutable document status.
- Recognizes role/authority, evidence, retention, security, and legacy-cutover boundaries.
- Uses deterministic delta as the truth layer and places AI summaries downstream.
- Defines a target outcome—resolve one disputed change in minutes—that can become measurable.

### Scope and evidence problems

- `[ACTIVE_PLAN | HIGH]` Fourteen implementation units and multiple cross-cutting systems substantially exceed the minimum needed to test customer demand.
- `[ACTIVE_PLAN | HIGH]` The target outcome “one disputed change resolved in minutes” is a plan hypothesis, not an observed customer baseline.
- `[CODEBASE_FACT | HIGH]` The plan README reported “Not started” while migrations, routes, UI, tests, and evidence were actively appearing in the dirty worktree.
- `[ACTIVE_PLAN | HIGH]` The manifest observed during the audit marked implementation in progress, next work at Unit 001, all acceptance criteria failing, and evidence stale.
- `[CODEBASE_FACT | HIGH]` Baseline, event, artifact, and request schemas are ahead of connected runtime writers.
- `[RESEARCH_GAP | HIGH]` No primary evidence selects which object types, roles, or artifacts the first ICP actually needs.

**Conclusion:** plan quality cannot substitute for sequence discipline. Preserve the architecture as reference, but gate implementation by observed customer behavior.

## Smallest Valuable Timeline Release

The minimum release should support one narrow change to one previously issued estimate:

1. **Accepted current state:** the exact product issue previously accepted, with a clear disclaimer about the product’s authority boundary.
2. **Pending proposal:** one new exact estimate snapshot derived from the accepted state.
3. **Deterministic delta:** concise changes to scope, quantities, rates, assumptions, exclusions, and totals.
4. **Reason and evidence:** a short attributable change reason plus only decision-relevant attachments.
5. **Unresolved consequences:** explicit unknown or unresolved scope/cost/time items; no forced certainty.
6. **Requested decision:** approve/accept, request changes, or decline using language tested with the segment.
7. **Attributable outcome:** actor, time, exact issue, decision, and immutable prior history.
8. **Current-state summary:** show the accepted state and pending state without requiring the user to read the entire chronology.

This can be presented as a compact commercial-change view. It does not require a general project Timeline, DMS, command center, or comprehensive change-request lifecycle.

## What Must Not Be Built Yet

- General-purpose document management and drawing registers.
- Broad artifact type taxonomies beyond what one decision requires.
- Page/region-level PDF comments or full redlining.
- Deep request → assessment → directive → exposure orchestration for every contract model.
- Complex organization, project, domain, and delegated-authority role matrices.
- General project feed, command center, exposure dashboards, and portfolio analytics.
- Procurement, submittals, RFIs, payments, contract execution, or ERP expansion.
- Broad integrations and correspondence ingestion.
- AI-generated contractual interpretation, downstream impact prediction, or autonomous action.
- Network, marketplace, or enterprise-administration features.
- Full legacy cutover work that is not required to test the narrow loop with selected pilots.

## Capture-Burden Map

Estimates are qualitative until observed in the Capture Gate.

| Action | Primary actor | Frequency in narrow loop | Burden | Already required today? | Automation without weakening truth | Main failure mode |
|---|---|---:|---:|---|---|---|
| Create request | Recipient or project lead | Sometimes | Medium | Often happens informally | Capture a source message or short structured request; do not require formal creation | User skips it and starts revising. |
| Acknowledge request | Project lead | Sometimes | Low | Often implicit | Notification/action can create event | Added ceremony with no immediate value. |
| Attach evidence | Requester/proposer | As needed | Medium–high | Evidence often exists elsewhere | Preselect/upload exact files; preserve attribution | Missing phone/chat artifacts; oversized folder behavior. |
| Assess request | Estimator/project lead | Each material change | High | Yes, mentally or in spreadsheet | Derive cost delta; allow unresolved time/scope | False precision or duplicate analysis. |
| Select estimate | Proposer | Every issue | Low | Yes | Default to active estimate; explicit confirmation | Wrong source estimate. |
| Select artifact versions | Proposer | As needed | Medium | Sometimes | Show current exact versions and differences | Stale or excessive attachments. |
| Write revision note | Proposer | Every revision | Medium | Usually, but informal | Prompt from changed fields; human confirms | Generic narrative with no causal value. |
| State assumptions | Proposer | Every material issue | Medium | Often omitted | Carry forward and highlight changed items | Boilerplate or omission. |
| State exclusions | Proposer | Every material issue | Medium | Often required in proposal | Carry forward and highlight changed items | Hidden exclusions or accidental removal. |
| Record unresolved consequences | Proposer + approver | As needed | High | Frequently deferred | Allow explicit unknown; reminders only | Forced answer creates false truth. |
| Configure recipients | Proposer/admin | Per project/change | Medium | Yes, via message addressing | Reuse verified project recipients | Wrong person or unclear authority. |
| Request decision | Proposer | Every issue | Low | Yes | Required concise action | Recipient cannot tell what action means. |
| Publish | Proposer | Every issue | Low | Yes | One explicit publish transaction | Draft sent as official or wrong snapshot. |
| Discuss | Both sides | Variable | Medium | Yes, in existing channels | Deep links/notifications; capture relevant outcome | Conversation escapes to chat and is lost. |
| Decide | Authorized recipient | Every resolved issue | Low action / high consequence | Yes | Keep action simple; never infer authority | Fear of legal effect or wrong actor. |
| Establish baseline | System after qualifying outcome | Each accepted issue | Low user burden | Usually tracked manually | Atomic projection from immutable issue/decision | Baseline drifts from decision. |
| Create next revision | Proposer | Variable | Medium | Yes | Fork accepted structure and compute delta | User duplicates an unrelated file instead. |
| Preserve corrections | System + admin | Rare | Medium–high | Often ad hoc | Append correction; never rewrite history | History becomes confusing or mutable. |

### Time, cognition, information, and task displacement

`L/M/H` are desk estimates to be measured, not observed user data.

| Action | Net-new time risk | Cognitive cost | Information availability at action time | Existing task it must replace or consolidate |
|---|---:|---:|---|---|
| Create request | M | M | Often in a message/call; structured facts may be incomplete | Separate change-register entry or later message reconstruction |
| Acknowledge request | L | L | Actor and request usually known | Manual acknowledgment message/status update |
| Attach evidence | M–H | M | Files may be on phone, chat, email, or another party | Separate folder upload and resend |
| Assess request | H | H | Scope/cost may be available; time/authority often unresolved | Spreadsheet analysis, PM/QS assessment, and summary memo |
| Select estimates | L | L | Available if current workspace is reliable | Finding/exporting the correct workbook/version |
| Select artifact versions | M | M | Available only if version discipline exists | File collection, renaming, and attachment preparation |
| Write revision note | M | M | Cause may be spread across actors/channels | Cover email, change-register narrative, or proposal note |
| State assumptions | M | H | Known to estimator but often implicit | Rewriting proposal assumptions or explaining them later |
| State exclusions | M | H | Known if commercial scope is disciplined | Rewriting exclusions and checking carry-forward |
| Record unresolved consequences | M | H | Frequently not yet known | Follow-up list, risk note, or hidden mental reminder |
| Configure recipients | L–M | M | Contact known; actual authority may not be | Addressing email, managing links, and later access correction |
| Request a decision | L | M | Intended action known; contract language may vary | Drafting the call-to-action in email/message |
| Publish | L | M | Exact content should be available | PDF export, file naming, attachment, and send step |
| Discuss | Variable | M | Emerges over time, often in external channels | Parallel email/chat thread only if capture remains natural |
| Decide | L action | H consequence | Decision known; authority may not be | Separate approval email/message/e-sign step |
| Establish baseline | Near-zero | L | Derivable from qualifying issue/decision | Manual “approved/current” filename/register update |
| Create next revision | M | M | Accepted structure and new request should be available | Save-As, copy/paste, comparison, and manual carry-forward |
| Preserve corrections | M | H | Correction reason/evidence must be supplied | Silent file replacement or explanatory email |

An action that does not remove or consolidate an existing step is presumed net-new burden and must justify itself through measured consequence or comprehension improvement.

### Capture-burden principle

`[EVIDENCE_BACKED_INFERENCE | HIGH]` The proposer must not manually narrate a second record of work already represented in the estimate, issue, attachment, and decision. The Timeline should be a projection of required actions plus a few explicit truths the system cannot infer.

## Behavioral Tests

### Primary user test

Give six qualified proposers a realistic accepted estimate, a client change message, supporting document, and incomplete time consequence. Without teaching the model, ask each to produce the next official change record.

Passing evidence:

- at least five create a complete issue with the correct prior baseline and exact new snapshot;
- at least five correctly represent changed scope/cost and preserve relevant assumptions/exclusions;
- no participant invents a time impact to satisfy the UI;
- median net-new capture time is ten minutes or less, excluding estimate editing;
- at least five say which steps replace existing work rather than add a second record.

### Primary recipient test

Send five real issues to real counterparties without founder explanation.

Passing evidence:

- at least four open the exact issue;
- at least three take the requested action in the product;
- at most one falls back because the issue is unclear;
- no participant mistakes pending proposal for accepted state or mistakes product identity for verified legal authority.

### Primary economic test

Present the unchanged Offer V1 to five qualified firms: ₱5,000 for 30 days, one workspace/up to three internal users/unlimited external recipients/one real loop/up to three founder hours, followed by ₱2,500/month. Pass with at least two payments or detailed signed/datable commitments from named economic buyers; refunded pilots do not pass.

## Timeline Kill Criterion

Stop expanding the Timeline as a central product if, after a focused test with at least three qualified live pilots:

- fewer than two complete one real issue → decision → later revision loop;
- fewer than two return for a second natural cycle without founder prompting;
- capture exceeds ten minutes of net-new administration for routine changes or is routinely backfilled only after conflict;
- recipients consistently decide outside the product and reject capture of the outcome;
- or fewer than two economic buyers accept the unchanged Offer V1 after five comparable offers.

If estimating/proposal use retains while Timeline behavior fails, keep the ledger as supporting infrastructure or a compact issue-history feature rather than the lead product.

## Timeline Verdict

### `TIMELINE_PROCEED_BUT_NARROW`

- **Confidence:** `MEDIUM`.
- **Decisive evidence:** the information model matches real AEC distinctions; estimates-only publication/discussion/decision primitives exist; the complete loop is not connected; no customer behavior justifies the full plan scope.
- **Smallest valuable release:** accepted product state + pending estimate revision + deterministic delta + selected evidence/assumptions/exclusions/unresolved items + attributable decision.
- **Highest-risk assumption:** users will proactively maintain the record during ordinary work because immediate value exceeds capture burden.
- **Primary user test:** six-person realistic capture and comprehension test, passing at five of six with median net-new capture no more than ten minutes.
- **Primary economic test:** two meaningful commitments to Offer V1 from five comparable qualified buyers tied to a live change loop.
- **Missing evidence:** incident frequency/severity, natural capture, recipient adoption, authority comprehension, second-cycle retention, and WTP.
- **Immediate action:** use the current estimates-only flow plus the minimum baseline/delta/receipt gap to test one real change loop.
- **Stop doing:** broadening artifact, request, role, DMS, Timeline, command-center, legacy-cutover, and AI scope before the gate.
- **Next decision gate:** two of three paid pilots complete and repeat the loop.
- **Kill criterion:** failure of repeat behavior, capture burden, recipient action, or paid commitment under the precommitted thresholds above.

# Beta Product Thesis And Prioritization

Date: 2026-06-22

This document turns the full-app UX audit into a beta strategy. It defines what matters first, which fixes can ship as lightweight proof, and which fixes are larger product bets that require decision gates before implementation.

## Beta Thesis

Archestimator's closed beta should prove that a contractor, estimator, or project manager can create a trustworthy project estimate, package it for review, get a recipient response, and recover from operational problems without founder intervention for ordinary cases.

The first beta does not need every future workflow as a first-class surface. It needs evidence that the core estimating and proposal-review loop is understandable, trustworthy, recoverable, and operable.

## Outcome Ladder

| Rank | Outcome | Success signal | Blocking dimensions |
|---:|---|---|---|
| 1 | First successful project-to-estimate path | Beta user creates or opens a project, reaches an estimate sheet, edits data, and understands save/error state. | Auth, terms, project shell, estimate sheet, validation, performance, recovery. |
| 2 | Trustworthy proposal/share path | Owner packages or shares scope, recipient understands what they received, and recipient action is recorded or recoverable. | Publication, share link security, recipient copy, export, no-store/cache, email/provider proof. |
| 3 | Supportable beta operations | Operators can diagnose access, invite, provider, feedback, legal/privacy, and monitoring issues with an assigned owner and proof artifact. | Beta admin, support repair, provider readiness, monitoring, legal, audit trails. |
| 4 | Cost/library trust | Estimator can tell whether library/cost/source data is current, stale, reviewed, or risky before using it. | Supplier metadata, stale-source states, attachments, accepted-cost governance. |
| 5 | Access-path-specific workflow depth | Contractor/builder, field, supplier, campaign, legal/privacy, and advanced owner-governance flows are explicit but gated. | Access-path choices, migrations only if needed, RLS, workflow surfaces, support overhead. |

## Golden Path

The canonical beta path is:

1. Visitor or invited beta user signs in.
2. User passes closed-beta and terms gates.
3. User creates or opens a project.
4. User creates or opens an estimate.
5. User edits estimate rows, costs, library inserts, versions, and attachments with clear pending/saved/failed state.
6. User reviews project readiness and proposal/share package.
7. Owner shares or exports.
8. Recipient opens the package, understands decision language, comments or decides, and can recover from link/session/asset failure.
9. Owner/support can inspect outcome, repair blocked cases, and record provider/manual proof.

Any P0 fix must protect this path. Any fix outside this path must either be cheap and isolated or explicitly deferred behind a decision gate.

## Persona Priority

| Priority | Persona group | Beta role | Implementation posture |
|---|---|---|---|
| Primary | Estimator / PM / contractor-builder user | Daily Primary App User who creates estimates and proposals. | Build/verify first. |
| Primary | Client / recipient / stakeholder | Person who receives share/export and decides whether to trust it. | Build/verify first for share comprehension and recovery. |
| Primary | Admin / support / operator | Keeps beta users unblocked and provider claims honest. | Build lightweight owner/proof workflow first. |
| Secondary | Business owner / PM governance | Needs readiness, margin/risk, approval, and lifecycle trust. | Add lightweight readiness and audit signals before rich governance surfaces. |
| Secondary | Supplier / vendor / cost-source | Improves cost-library trust. | Start with curator-owned internal states; external supplier workflow is later unless beta explicitly tests it. |
| Later | Legal/privacy operator, campaign operator, deep field workflows | Important for scale and operations. | Document acceptance and proof needs; implement only when core beta evidence demands it. |

## Priority Tiers

| Tier | Meaning | Ship-without rule |
|---|---|---|
| P0 | Blocks golden path trust, safety, access, or beta operations. | Do not widen beta without either fixing or explicitly accepting the risk with owner sign-off. |
| P1 | Important user confidence, workflow clarity, or operator efficiency. | Can ship with a documented workaround, evidence gap, and owner. |
| P2 | Useful polish, future workflow depth, or scale preparation. | Defer unless cheap, isolated, and not conflicting with P0/P1 work. |
| Decision-gated | Requires product, data-model, security, permission-model, or access-path choice. | Do not implement until `09-decision-ledger.md` shows an accepted decision and required guardrails. |

## Issue Priority Table

| Tier | Issues | Rationale |
|---|---|---|
| P0 | `UX-002`, `UX-003`, `UX-004`, `UX-007`, `UX-011`, `UX-019`, `UX-020`, `UX-022`, `UX-025`, `UX-028`, `UX-029`, `UX-035`, `UX-036`, `UX-038`, `UX-040`, `UX-041`, `UX-043`, `UX-044` | These protect access, recovery, provider honesty, recipient trust, data-entry confidence, support repair, and proof integrity. |
| P1 | `UX-001`, `UX-006`, `UX-008`, `UX-009`, `UX-010`, `UX-012`, `UX-013`, `UX-016`, `UX-017`, `UX-018`, `UX-021`, `UX-024`, `UX-026`, `UX-027`, `UX-030`, `UX-032`, `UX-033`, `UX-034`, `UX-037`, `UX-039`, `UX-042` | These materially improve beta confidence, but can be sequenced after core path safety if a workaround exists. |
| P2 | `UX-005`, `UX-014`, `UX-015`, `UX-023`, `UX-031` | These are valuable but either low risk, dormant, or a larger workflow decision. `UX-031` is not low-value; it is P2 until the field workflow/access-path slice is chosen. |

## Proposed Fix Review

| Issue area | Original fix posture | 100% planning-ready posture |
|---|---|---|
| Contractor/builder and field handoff (`UX-031`) | Define contractor/builder and field-operator handoff workflows. | Decision-gated. Start with access-path-specific package labeling, allowed actions, and acceptance criteria. Add new persisted roles only if existing Primary App User, Project Collaborator, and Shared-Link Recipient paths cannot support the required isolation. |
| Supplier/vendor intake (`UX-033`) | Add supplier contribution intake and governance workflow. | Decision-gated. MVP should use curator-owned stale queue, accepted-cost notes, and source-review states before external supplier submission. |
| Attachment approval (`UX-034`) | Add approve/reject lifecycle. | Phase as current/archived/reviewed metadata first; full approval workflow requires migration/RLS plan. |
| Release campaign operation (`UX-039`) | Add authoring/preview/targeting/delivery rows. | Closed beta can use seeded/manual campaigns with CTA validation and delivery inspection before a rich campaign composer. |
| Versions panel (`UX-015`) | Create dedicated Versions panel. | Keep as dormant roadmap unless named versions become a beta learning objective. |
| Feedback pagination (`UX-026`) | Add pagination/search. | P1 if feedback volume exceeds latest-50 risk; otherwise manual export/query can be temporary. |

## Outcome Metrics

| Outcome | Metric | Evidence source |
|---|---|---|
| First estimate | Time from sign-in to editable estimate; failed save rate; user-visible recovery count. | Targeted `TV-AUTH`, `TV-PROJECT-DASHBOARD`, `TV-ESTIMATE-SHEET` proof. |
| Proposal/share trust | Share open success, recipient action success, expired/locked recovery success, print/export readability. | `TV-SHARE-RECIPIENT`, proposal/export tests, recipient browser proof. |
| Supportability | Denied-access repairs resolved, invite repair time, feedback older than latest 50 reachable, provider checks marked pass/fail/blocked. | `TV-OPS-SUPPORT`, provider proof runbook, support/admin repair evidence. |
| Cost confidence | Stale/conflicted cost surfaced before insert, accepted source visible, attachment currentness clear. | `TV-LIBRARY-SOURCING`, `TV-ESTIMATE-SHEET`. |
| Proof honesty | No row marked proven without matching evidence artifact. | CSV schema validation plus `06-verification-matrix-and-proof-runbook.md`. |

## Non-Goals For This Packet

- It does not authorize production deploys.
- It does not implement code.
- It does not claim browser/provider proof was run.
- It does not require full supplier, field, legal, campaign, or DSAR product surfaces before closed beta unless those become explicit beta goals.
- It does not let any agent update canonical status without evidence.

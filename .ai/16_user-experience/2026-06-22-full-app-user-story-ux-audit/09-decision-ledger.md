# Decision Ledger

Date: 2026-06-22

This ledger records product, data, role, security, and provider decisions that block implementation of decision-gated UX issues. It is not a product roadmap. It is the minimum handoff surface that lets future coding agents know whether they may implement, prototype, or stop.

## Decision States

| State | Meaning | Coding posture |
|---|---|---|
| `Accepted for MVP` | The beta direction is chosen and can be implemented with the listed guardrails. | Implement only inside the named unit and proof gate. |
| `Accepted as lightweight first step` | A narrow, reversible version is approved before the larger workflow. | Implement the lightweight path only; do not build the full workflow. |
| `Decision required before code` | Multiple valid product/data/security directions remain. | Stop and report; do not create persistent roles, schemas, or surfaces. |
| `Later / not MVP` | Useful but outside the current beta execution slice. | Do not implement unless a newer decision supersedes this row. |

## Open Decision Register

| Decision ID | Blocks | Current decision | MVP posture | Required guardrails before code | Proof gate |
|---|---|---|---|---|---|
| `DEC-UX-015-VERSIONS` | `UX-015`, IU-07 | `Accepted as lightweight first step` | Keep named versions dormant unless beta explicitly tests version recovery. If touched, expose activity/history discoverability and restore-as-copy explanation before a full Versions panel. | No new version schema without migration/RLS plan; copy must explain unavailable restore states. | `TV-ESTIMATE-SHEET`; focused version UI/action tests. |
| `DEC-UX-031-FIELD-WORKFLOWS` | `UX-031`, IU-15 | `Accepted for MVP` | Beta should include first-class contractor/builder and field-operator workflows across existing access paths first: Primary App User, Project Collaborator, and Shared-Link Recipient. Product personas are canonical; new database/RLS permission roles are not assumed. | Use `10-access-path-and-persona-taxonomy.md` and `11-access-path-rbac-ux-review.md`; choose the first beta slice before implementation; define package scope, allowed actions, recipient/collaborator permissions, audit trail, and rollback path. Add new permission roles only if current access paths cannot support required isolation. | `TV-FIELD-HANDOFF`; access-path contract/component tests after slice decision. |
| `DEC-UX-032-OWNER-READINESS` | `UX-032`, IU-16 | `Accepted as lightweight first step` | Start with project readiness checklist/notes and owner-visible gaps, not a full approval workflow. | Source of truth for readiness fields, permissions, lifecycle audit, and fallback for incomplete data. | `TV-PROJECT-DASHBOARD`; share-recipient proof if readiness appears in published output. |
| `DEC-UX-033-SUPPLIER-INTAKE` | `UX-033`, IU-17 | `Accepted as lightweight first step` | Use curator-owned stale queue/source-review states. External supplier submission is later. | Data ownership, supplier identity, RLS, spam/abuse handling, attachment rules, and moderation owner before external intake. | `TV-LIBRARY-SOURCING`; storage/provider proof for attachments. |
| `DEC-UX-034-ATTACHMENT-APPROVAL` | `UX-034`, IU-17 | `Accepted as lightweight first step` | Add reviewed/current metadata before approve/reject lifecycle. | Storage metadata model, file version scope, RLS, audit trail, and stale-attachment rollback. | `TV-LIBRARY-SOURCING`; `TV-ASSET-API` when hosted files are claimed. |
| `DEC-UX-039-CAMPAIGNS` | `UX-039`, IU-18 | `Accepted as lightweight first step` | Use seeded/manual release campaign rows plus CTA validation and delivery inspection. Rich campaign composer is later. | Operator owner, target audience rules, unsubscribe/consent implications, rate limits, provider proof, and rollback message. | `TV-OPS-SUPPORT`; notification/provider proof. |

## Decision Update Rule

Only the lead integration lane updates this ledger. A row may move out of `Decision required before code` only when the update names:

1. The selected product direction.
2. The rejected alternative and why it is rejected.
3. The data/RLS/provider/security guardrail if the work touches those boundaries.
4. The implementation unit and conflict group that own the change.
5. The proof gate and artifact path required before CSV status can move.

## Current Stop Conditions

- Do not introduce contractor/builder or field-operator permission roles, RLS changes, or invite-role changes for `UX-031` just because the persona exists. First map the workflow to Primary App User, Project Collaborator, or Shared-Link Recipient; add new roles only after an explicit RBAC/RLS plan proves the current paths are insufficient.
- Do not build external supplier intake for `UX-033`; build curator-owned source review first.
- Do not build a rich campaign composer for `UX-039`; start with seeded/manual release campaigns.
- Do not promote any decision-gated row in `canonical-feature-status.csv` without linking the decision row and proof artifact.

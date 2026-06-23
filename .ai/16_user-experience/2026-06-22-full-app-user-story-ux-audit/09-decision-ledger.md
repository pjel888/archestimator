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
| `DEC-UX-031-FIELD-WORKFLOWS` | `UX-031`, IU-15 | `Later / not MVP` | Selected first field slice: shared-link field package. Rejected for Wave 1: first-class contractor/builder cohort and new field/operator roles, because `DEC-UX-BETA-COHORT` limits Wave 1 to estimator/PM users. | `UX-031` stays P2/deferred for Wave 1. Preserve the future-slice sketch, but do not implement field package code, new permission roles, invite-role changes, RLS changes, or shared-link field workflows until a newer cohort-expansion decision authorizes them. Any later implementation must define package contents, allowed actions, recipient/collaborator permissions, audit trail, rollback, and RBAC/RLS proof before code. | `TV-FIELD-HANDOFF` remains future/deferred; `TV-ACCESS-PATH-CONTRACT` applies only when cohort expansion reactivates the slice. |
| `DEC-UX-032-OWNER-READINESS` | `UX-032`, IU-16 | `Accepted as lightweight first step` | Start with project readiness checklist/notes and owner-visible gaps, not a full approval workflow. | Source of truth for checklist fields, permissions, and fallback for incomplete data; approval workflow, margin/risk governance, and lifecycle audit remain deferred. | `TV-PROJECT-DASHBOARD`; share-recipient proof if readiness appears in published output. |
| `DEC-UX-033-SUPPLIER-INTAKE` | `UX-033`, IU-17 | `Accepted as lightweight first step` | Use curator-owned stale queue/source-review states. External supplier submission is later. | Data ownership, supplier identity, RLS, spam/abuse handling, attachment rules, and moderation owner before external intake. | `TV-LIBRARY-SOURCING`; storage/provider proof for attachments. |
| `DEC-UX-034-ATTACHMENT-APPROVAL` | `UX-034`, IU-17 | `Accepted as lightweight first step` | Add reviewed/current metadata before approve/reject lifecycle. | Storage metadata model, file version scope, RLS, audit trail, and stale-attachment rollback. | `TV-LIBRARY-SOURCING`; `TV-ASSET-API` when hosted files are claimed. |
| `DEC-UX-039-CAMPAIGNS` | `UX-039`, IU-18 | `Accepted as lightweight first step` | Use seeded/manual release campaign rows plus CTA validation and delivery inspection. Rich campaign composer is later. | Operator owner, target audience rules, unsubscribe/consent implications, rate limits, provider proof, and rollback message. | `TV-OPS-SUPPORT`; notification/provider proof. |
| `DEC-UX-BETA-COHORT` | `UX-031` tiering, golden-path scope | `Accepted for MVP` | Wave 1 closed beta is estimator/PM only. Contractor/builder and field recipients are not first-class beta cohort members in Wave 1. Rejected alternative: include contractor/builder recipients immediately, because that would force field workflow, access-path, and authz/RLS proof before the estimating/proposal core is proven. | Treat `UX-031` as P2/deferred for Wave 1. Golden path remains estimator/PM creating estimates, packaging proposals, and share recipients reviewing through existing paths. | Resolves `UX-031` priority tier and golden-path cohort scope. |
| `DEC-UX-ANALYTICS` | Outcome metrics (`01`), `13-performance-engagement-and-observability.md` | `Accepted for MVP` | Use Vercel Web Analytics + Vercel Speed Insights now. Use minimal Postgres event rows only for core product/operator events that need queryable support/audit. Rejected alternatives: a broad product-analytics provider now, or pretending behavior tests produce metric values. | All analytics must pass through the existing redaction seam before dispatch. Do not send tokens, emails, addresses, user IDs, project IDs, raw entity IDs, proposal contents, or free text. Metric VALUES require live beta traffic and remain runtime residuals. | `TV-*` behavior proof (path exists) plus the instrumentation plan in `13`; metric values deferred to runtime. |
| `DEC-UX-RL-QUOTAS` | `05-security-data-and-provider-blast-radius.md`, `14-security-primitive-and-rls-binding.md`, `UX-022`, `UX-036` | `Accepted for MVP` | Policy B accepted: share comments and decisions first. Current source has already drifted beyond the old packet and includes broader Postgres durable limiters on share/invite/landing paths; docs must preserve and reconcile that coverage rather than claiming only AI ask is limited or removing existing limiters. | Rate limiting remains Postgres-native, not Redis. Before changing quotas, inspect current source scopes and tests. Do not weaken existing comment/decision/session/invite/landing limiter coverage. Any remaining beta-access or provider-edge gaps must be named as residuals rather than blocking the accepted Policy B posture. | Updated Rate-Limit Truth Table in `14-security-primitive-and-rls-binding.md`; `TV-SHARE-RECIPIENT` for recipient proof. |
| `DEC-UX-I18N` | i18n / localization dimension | `Accepted as lightweight first step` (deferred) | Added 2026-06-22 (re-audit). The packet previously omitted i18n entirely with no deferral, which made the "every dimension planned" claim dishonest. Decision: closed beta is English-only. | Copy, recipient-facing proposal text, dates/currency formatting, and error/recovery copy are English-only for closed beta. Localization is a later decision gated on cohort geography and recipient language needs. No `hreflang`, no translation pipeline, in closed beta. | None in closed beta; revisit before widening beta beyond English-speaking cohorts. |
| `DEC-UX-DATA-CLASSIFICATION` | `05-security-data-and-provider-blast-radius.md` data taxonomy | `Accepted as lightweight first step` (advisory) | Added 2026-06-22 (re-audit). The 8-class data taxonomy in doc 05 is documented but NOT enforced anywhere in code (no enum, guard, or middleware; the only concrete redaction today is `hashAiAuditValue` in `src/lib/ai/audit.ts`). The packet previously presented classification as a control; it is currently an advisory target posture. | Treat the data classification as advisory for closed beta. Redaction must be designed (see `13` telemetry plan) BEFORE any outcome-metric instrumentation ships, so tokens/emails/addresses/proposal contents are not leaked to logs/provider errors/analytics. A real classification guard is a later implementation unit, not assumed here. | `14-security-primitive-and-rls-binding.md` redaction surface; `13` instrumentation plan. |

## Decision Update Rule

Only the lead integration lane updates this ledger. A row may move out of `Decision required before code` only when the update names:

1. The selected product direction.
2. The rejected alternative and why it is rejected.
3. The data/RLS/provider/security guardrail if the work touches those boundaries.
4. The implementation unit and conflict group that own the change.
5. The proof gate and artifact path required before CSV status can move.

## Current Stop Conditions

- Do not introduce contractor/builder or field-operator permission roles, RLS changes, invite-role changes, or field package code for `UX-031` in Wave 1. The later slice is shared-link field package, but implementation waits for a cohort-expansion decision and RBAC/RLS proof.
- Do not build external supplier intake for `UX-033`; build curator-owned source review first.
- Do not build a full Versions panel for `UX-015` in Wave 1; keep named versions dormant unless a newer beta recovery objective explicitly supersedes this row.
- Do not build actor approvals, owner margin alerts, or final-package lifecycle audit for `UX-032`; start with checklist/notes/owner-visible gaps.
- Do not build a rich campaign composer for `UX-039`; start with seeded/manual release campaigns.
- Do not promote any decision-gated row in `canonical-feature-status.csv` without linking the decision row and proof artifact.

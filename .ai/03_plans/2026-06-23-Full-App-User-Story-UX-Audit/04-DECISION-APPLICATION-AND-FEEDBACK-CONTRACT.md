# Decision Application And Feedback Contract

Date: 2026-06-23

This addendum applies Philip's resolved strategy decisions to the executable UX
plan pack. It supersedes stale per-issue language that still says a resolved
decision is open, asks for inline/reflowing transient errors, or scopes a
lightweight first slice as a full product workflow.

## Binding Decision Table

| Decision | Applied posture | Implementation boundary |
|---|---|---|
| `DEC-UX-BETA-COHORT` | Accepted: Wave 1 closed beta is estimator/PM only. | Do not treat contractor/builder or field recipients as first-class Wave 1 cohort members. |
| `DEC-UX-031-FIELD-WORKFLOWS` | Accepted later slice: shared-link field package. | `UX-031` remains P2/deferred for Wave 1. No field package code, new roles, invite-role changes, or RLS changes until cohort expansion is accepted. |
| `DEC-UX-RL-QUOTAS` | Accepted Policy B: share comments and decisions first. | Current source already has broader Postgres durable limiters on share/invite/landing paths. Preserve them, reconcile quotas against source, and do not weaken existing limiter coverage. |
| `DEC-UX-ANALYTICS` | Accepted: Vercel Web Analytics + Speed Insights now; minimal Postgres only for core product/operator events that need queryable support or audit. | Use the existing redaction seam before analytics. Do not add a broad product-analytics provider or per-issue metric suite for Wave 1. Metric values require live beta traffic. |
| `DEC-UX-015-VERSIONS` | Accepted dormant posture. | Keep named versions dormant for Wave 1. If recovery is explicitly tested later, limit work to activity/history discoverability and restore-as-copy explanation; no full Versions panel. |
| `DEC-UX-032-OWNER-READINESS` | Accepted lightweight first step. | Implement only readiness checklist, notes, and owner-visible gaps. Defer actor approvals, margin/risk governance, and final-package lifecycle audit. |
| `DEC-UX-039-CAMPAIGNS` | Accepted lightweight first step. | Use seeded/manual release campaign rows, safe CTA validation, and delivery inspection. Defer rich campaign authoring/composer/targeting product surface. |
| `DEC-UX-033-SUPPLIER-INTAKE` | Accepted lightweight first step. | Curator-owned stale/source-review queue first; external supplier intake later. |
| `DEC-UX-034-ATTACHMENT-APPROVAL` | Accepted lightweight first step. | Reviewed/current metadata first; full approve/reject lifecycle later. |
| `DEC-UX-I18N` | Accepted deferral. | Closed beta is English-only. |
| `DEC-UX-DATA-CLASSIFICATION` | Accepted advisory posture. | Classification is a planning target until a real guard/redaction pipeline exists. |

## No-Shift Toast Feedback Contract

All transient feedback must use the fixed toast system:

- Missing required field values, validation failures, save failures, retryable
  provider failures, quota/rate-limit failures, recovery failures, async
  action failures, and success confirmations are fixed toast notifications.
- Toasts must use scoped IDs where repeated actions can overwrite each other.
- Transient feedback must not insert, remove, expand, or collapse layout
  elements. No inline transient error rows, reflowing banners, or focus jumps to
  newly inserted error text.
- A field, row, or control may use non-shifting visual state such as border,
  icon, `aria-invalid`, stable helper slot, or focus retention when the space is
  already reserved or the style change does not resize the layout.
- Destructive confirmations still use modal `alertdialog` semantics.
- Persistent structural states may use visible panels only when the reserved
  area is always present for that surface and does not appear/disappear as a
  transient validation mechanism.

Acceptance criteria for any touched issue must include this invariant when the
issue changes feedback behavior: transient feedback is toast-only and layout
position is stable before, during, and after the toast.

## Wave 1 Scope Locks

| Issue | Wave 1 status | Lock |
|---|---|---|
| `UX-015` | P2 dormant | Do not build a Versions panel unless a newer beta recovery objective explicitly supersedes this addendum. |
| `UX-031` | P2 deferred | Shared-link field package is selected as the later slice, but no Wave 1 implementation starts while the cohort is estimator/PM-only. |
| `UX-032` | P1 lightweight | Checklist/notes/gaps only. No approvals, margin alerts, lifecycle timeline, or actor-state workflow. |
| `UX-039` | P1 lightweight | Seeded/manual release rows, CTA validation, delivery inspection. No rich composer or nonexistent notification route. |
| `UX-027` | P1 local feedback hardening | Issue-local toast IDs and no-shift feedback. No global caller sweep unless a caller is directly in the failing story. |

## Observability And Redaction Contract

- Vercel Web Analytics and Speed Insights are the default client/performance
  surfaces already wired in the app.
- Analytics events must pass through the existing redaction seam. Do not send
  share/invite tokens, emails, user IDs, project IDs, raw entity IDs, addresses,
  proposal contents, or free text to client analytics.
- Postgres event rows are reserved for core product/operator events that need
  support or audit queries, such as publication/share events or operator proof
  records.
- Per-issue docs must not invent bespoke counters, histograms, traces, gauges,
  or alerts unless a later implementation plan names a concrete sink, redaction
  rule, owner, and proof gate.

## Planning Readiness Rating

For the known decision surface in this pack:

| Dimension | Rating | Meaning |
|---|---:|---|
| Strategy | 100% | Owner decisions are recorded and scope locks are explicit. |
| Quality | 100% | Contradictions found by the review lanes have a parent contract and target issue corrections. |
| Implementation readiness | 100% | Coding agents have stop/go scope, guardrails, and proof boundaries for the known decisions. Runtime metric values and provider proof remain execution residuals, not planning gaps. |

# Beta Strategy And Cohort Gates

Date: 2026-06-20. Scope: strategy readiness for the consolidated launch-readiness audit.

## Purpose

This file defines what "wider beta" means before implementation starts. A gate can be
technically clear but still strategically wrong if the wrong users, workflows, support
promise, or success metric are used.

## Cohort ladder

| Tier | Audience | Allowed scope | Gates before entry | Stop/rollback trigger |
|---|---|---|---|---|
| Owner-only closed beta | Philip and directly supervised trusted users. | Current production posture with manual oversight. | Existing owner acceptance and fail-closed auth posture. | New auth/data leak, untriaged production error, or provider misconfiguration. |
| Named design-partner beta | 3-5 invited external operators/design partners. No self-serve. | Project setup, estimating, cost-library reuse, export/share preview, direct feedback. | B1-B5, B7, B9, V1, V2 closed or owner-accepted; B6/B8 exception must be written with known limits. | Any DSAR request cannot be fulfilled, CI is dark again, support owner unavailable, or monitoring has no signal. |
| Collaborator/client-recipient beta | External collaborators or client recipients can receive invites/share links. | Invite, share, recipient comment, email notification, revoke/expire states. | Named design-partner gates plus share/email abuse controls, privacy-safe metadata, support copy, and recipient UX proof. | Token/share leak, email abuse/spend anomaly, recipient confusion that exposes confidential estimate data. |
| Public/self-serve launch | Anonymous acquisition and self-serve onboarding. | Public signup, public marketing, broader legal/provider posture. | Out of scope for this audit. Requires reviewed legal copy, provider proof, support coverage, CI enforcement, and owner go/no-go. | Any unresolved B/V/C gate or legal/provider owner decision. |

## Product scope for the next beta

Recommended next target: **named design-partner beta**, not public self-serve.

In scope:
- Create a project and estimate sheet.
- Add or reuse cost-library items.
- Produce a proposal/export/shareable review surface.
- Invite a collaborator or recipient only after share/email hardening gates are closed.
- Collect direct qualitative feedback from each beta participant.

Out of scope unless a later plan explicitly adds it:
- Public self-serve signup.
- Paid billing.
- Immutable issued-proposal legal workflow.
- AI package-builder while C1 is open.
- Large unbounded file/storage use.
- SLA claims beyond the owner-approved support/DSAR runbook.

## Activation metric

A beta participant is activated only when all are true:

1. They create or open a project.
2. They create an estimate sheet with at least one costed row.
3. They produce a proposal/export/share artifact or explicitly report why they could not.
4. They submit feedback without a support-blocking error.

Do not count page views, sign-ins, or invite accepts alone as activation.

## Operational limits

| Limit | Default for named design-partner beta | Owner decision needed to change |
|---|---:|---|
| External workspaces | 3-5 | Yes |
| Users per workspace | 1-3 | Yes |
| Client/share recipients | 0 until share/email gates close; then 1-3 per workspace | Yes |
| Support channel | Owner-managed email or named channel in the ops runbook | Yes |
| Response promise | Match `15-OPERATIONS-RUNBOOK.md` and DSAR copy; no stronger promise in UI | Yes |
| AI package-builder | Off while C1 is open | Yes |

## Strategic abort criteria

Pause widening and return to owner-only if any of these occur:

- CI is disabled or `validate` cannot be interpreted.
- Error monitoring has no durable sink or no named watcher.
- A privacy, DSAR, consent, or share-state promise is false in production.
- A beta user cannot recover from a root error, invite error, share denial, or account support state.
- Provider spend, storage growth, email sends, or AI calls exceed the thresholds in the ops runbook.
- The implementation lead cannot identify the canonical owner for a launch gate within five minutes.

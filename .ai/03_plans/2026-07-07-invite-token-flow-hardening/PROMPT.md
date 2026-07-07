# GLM5.2 Plan Pack Prompt: Invite Token Flow Hardening

Date: 2026-07-07
Target folder: `.ai/03_plans/2026-07-07-invite-token-flow-hardening`
Mode: planning only. Create the plan pack in this folder; do not change application code.

## Goal

Create a plan pack for hardening invite token creation, lookup, pending-cookie continuation, origin validation, expiry, and abuse resistance.

## Evidence To Start From

- Invite continuation routes set pending invite cookies and resolve invite metadata.
- Origin/referer validation appears permissive when headers are missing.
- Invite flows intersect auth onboarding, public-to-beta continuity, email delivery, and workspace membership.
- CSP and OWASP/API authz plans will cover adjacent route security, but invite token lifecycle needs its own end-to-end treatment.

## Required Plan Pack

Include invite threat model, token storage and expiry expectations, pending-cookie rules, origin/CSRF policy, resend/revoke behavior, wrong-account handling, tests, monitoring, and user-facing recovery states.

## Constraints

Preserve intended first-user beta invite flow. Do not expose token values in logs, evidence, or prompt-derived docs.

## Stop Condition

The pack is ready when a future executor can implement and prove invite token lifecycle hardening without breaking onboarding.

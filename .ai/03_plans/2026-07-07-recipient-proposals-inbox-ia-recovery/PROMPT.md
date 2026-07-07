# GLM5.2 Plan Pack Prompt: Recipient Proposals Inbox IA And Recovery

Date: 2026-07-07
Target folder: `.ai/03_plans/2026-07-07-recipient-proposals-inbox-ia-recovery`
Mode: planning only. Create the plan pack in this folder; do not change application code.

## Goal

Create a plan pack for recipient proposal inbox IA, email-link continuity, wrong-account recovery, expired/revoked links, and review decision states.

## Evidence To Start From

- `src/components/workshop/proposals-page/ProposalsEmptyState.tsx`, `ProposalRow.tsx`, and `proposals-page-client.tsx` define the signed-in proposal inbox.
- `src/components/share/SharePageDecision.tsx` handles recipient decisions on shared links.
- `e2e/shared-link-receiver.spec.ts` covers some browser proof but not all recovery states.
- Public share activity and proposal package plans overlap but do not replace recipient IA work.

## Required Plan Pack

Map recipient personas, email matching, wrong-account states, no-proposal empty state, expired/revoked/error pages, decision history, notifications, tests, and privacy boundaries.

## Constraints

Avoid exposing owner/internal estimate data to recipients. Treat link token behavior as security-sensitive and coordinate with invite/share security plans.

## Stop Condition

The pack is complete when recipient review and recovery can be implemented without product ambiguity.

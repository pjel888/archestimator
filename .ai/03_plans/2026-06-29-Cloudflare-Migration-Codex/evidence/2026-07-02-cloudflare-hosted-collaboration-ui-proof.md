# Cloudflare Hosted Collaboration UI Proof

Status: **PASSED**

Generated: `2026-07-02T09:54:21.246Z`

Base URL: `https://archestimator.com`

D1 database: `archestimator-proof-db`

Seeds an exact synthetic Cloudflare D1 workspace/project/estimate with two Better Auth users, drives the hosted Publisher access roster and two authenticated estimate-sheet browser sessions on archestimator.com, verifies a Cloudflare Durable Object cursor broadcast renders remotely, then deletes the exact D1 fixture rows. Session tokens, signatures, cookies, and provider tokens are never written to evidence.

## Summary

| Gate | Ready |
| --- | --- |
| syntheticBetterAuthSessionsReady | yes |
| d1ProjectFixtureReady | yes |
| projectRouteReady | yes |
| publisherAccessRosterReady | yes |
| twoClientEstimateRoutesReady | yes |
| durableObjectChannelsSubscribed | yes |
| cursorBroadcastSent | yes |
| remoteCursorRendered | yes |
| exactD1CleanupReady | yes |
| hostedCollaborationUiReady | yes |
| productionCutoverReady | no |

## Sanitized Browser Proof

- Project route: `/workshop/projects/ee8751b1-6f30-4725-ae8a-c8d600b05098`
- Publisher access route: `/workshop/publisher?project=ee8751b1-6f30-4725-ae8a-c8d600b05098&drawer=ee8751b1-6f30-4725-ae8a-c8d600b05098&tab=access`
- Estimate sheet route: `/workshop/projects/ee8751b1-6f30-4725-ae8a-c8d600b05098/estimates/b4416d1d-bf41-4eb4-ab5e-6f43862c4c13`
- Project route status: `200`
- Publisher access route status: `200`
- Estimate route statuses: `200 / 200`
- Cursor channel statuses: `subscribed / subscribed`
- Cursor send status: `ok`
- Remote cursor user matched: `yes`
- Remote cursor label: `Codex Collab Bruno`
- Cleanup counts after proof: `{"users":0,"sessions":0,"profiles":0,"memberships":0,"closedBetaRows":0,"legalTermsRows":0,"workspaces":0,"projects":0,"projectMembers":0,"estimates":0,"estimateTabs":0,"estimateNodes":0,"estimateRows":0,"estimateSheetMembers":0,"estimateSheetAccessSettings":0,"estimateSheetPreferences":0}`

## Blockers

- (none)

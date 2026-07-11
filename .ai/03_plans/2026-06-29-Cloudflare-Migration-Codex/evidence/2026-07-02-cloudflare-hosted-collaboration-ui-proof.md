# Cloudflare Hosted Collaboration UI Proof

Status: **PASSED**

Generated: `2026-07-11T09:58:38.841Z`

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

- Project route: `/workshop/projects/27d69d35-5191-46d5-a975-45f6e3bd81f6`
- Publisher access route: `/workshop/publisher?project=27d69d35-5191-46d5-a975-45f6e3bd81f6&drawer=27d69d35-5191-46d5-a975-45f6e3bd81f6&tab=access`
- Estimate sheet route: `/workshop/projects/27d69d35-5191-46d5-a975-45f6e3bd81f6/estimates/36980d69-28e0-4180-af8c-28bdc9a5b8c7`
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

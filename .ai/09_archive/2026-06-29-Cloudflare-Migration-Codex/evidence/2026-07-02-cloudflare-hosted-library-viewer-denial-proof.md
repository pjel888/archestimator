# Hosted Library Viewer-Denial Proof

Date: 2026-07-02 06:10 UTC

This proof used a separate headless Chromium context authenticated with a signed Better Auth session sourced from Cloudflare D1. It exercised the production Cloudflare Worker UI at `https://archestimator.com` and did not use the user's foreground browser.

## Scope

- Project: `bd9a8e68-4e24-49d8-aeed-e4651b7cab0b`
- Estimate: `985f6690-741e-4136-9fa1-a4896cd364e4`
- Target area node: `e4b71a81-47fc-4f5a-bead-35e4e8050eae`
- Workspace: `258b50ee-3fde-4f6a-a9d9-c360ec44cd0b`
- Synthetic viewer: `bcc66c5e-3ae5-40a2-85b6-05820f27c416`
- Synthetic email: `codex-viewer-20260702t060945z@example.invalid`
- D1 database: `archestimator-proof-db`
- Session cookie values: redacted

## Result

Pass.

A synthetic viewer was seeded into Cloudflare D1 with viewer workspace/project/estimate memberships, a Better Auth session, closed-beta access, and the current terms acceptance values. A structured throwaway estimate template was seeded into the same workspace, then the hosted estimate page was opened as the viewer. The browser found the proof template in the Templates panel, opened its context menu, and clicked the real `Add to ...` action.

Remote D1 readback showed the viewer could access the hosted estimate route but could not edit it: no estimate nodes, estimate rows, or `template_inserted` audit events were created. All synthetic viewer, membership, terms/session, source template, and attempted insert artifacts were cleaned up to zero.

## Seeded Source Template

- Template id: `fe6f6314-c9c0-48ff-8b90-413fdf9f667a`
- Name: `Codex CF Viewer Denial Template 20260702T060945Z`
- Category: `Codex CF Viewer Denial 20260702T060945Z`
- Template node id: `be23db48-d511-44da-8ebb-f91b842b432e`
- Template node name: `Codex CF Viewer Denial Area 20260702T060945Z`
- Template row id: `f6fb5dec-3e84-4ea6-8ae9-79407eb2e371`
- Template row material: `Codex CF Viewer Denial Row 20260702T060945Z`

## Hosted Browser Proof

- Session endpoint status: `200`
- Session matched synthetic email: `true`
- Route status: `200`
- Final URL: `https://archestimator.com/workshop/projects/bd9a8e68-4e24-49d8-aeed-e4651b7cab0b/estimates/e4b71a81-47fc-4f5a-bead-35e4e8050eae`
- Redirected to terms: `false`
- Redirected to login: `false`
- New tab buttons visible: `0`
- Add area buttons visible: `0`
- Add row buttons visible: `0`
- Templates tab visible: `true`
- Templates search visible: `true`
- Context-menu attempt mode: `context-menu`
- Context-menu source label: `Codex CF Viewer Denial Template 20260702T060945Z`
- Context-menu visible: `true`
- Context-menu clicked: `true`
- Context-menu disabled: `false`

Marker visibility:

- Template: `true`
- Category: `true`
- Area: `true`
- Row: `true`

## D1 Readback

Pre-attempt:

- Source templates: `1`
- Source template nodes: `1`
- Source template rows: `1`
- Pre-existing inserted estimate nodes: `0`
- Pre-existing inserted estimate rows: `0`
- Synthetic actor can edit estimate: `0`

Post-attempt:

- Inserted estimate nodes: `0`
- Inserted estimate rows: `0`
- Actor audit events: `0`
- Actor `template_inserted` events: `0`
- Actor telemetry rows: `0`

Cleanup readback:

- Synthetic users: `0`
- Profiles: `0`
- Sessions: `0`
- Workspace memberships: `0`
- Project memberships: `0`
- Estimate memberships: `0`
- Terms acceptances: `0`
- Closed-beta rows: `0`
- Source templates: `0`
- Source template nodes: `0`
- Source template rows: `0`
- Inserted estimate nodes: `0`
- Inserted estimate rows: `0`
- Actor events: `0`
- Actor telemetry: `0`

## Boundary

This proves hosted production viewer denial for the estimate template insert path through the real Cloudflare UI and remote D1 readback. It does not replace the broader hosted auth cookie matrix or estimate cross-workspace denial matrix, which remain tracked separately.

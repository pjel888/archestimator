# 24 - Phase 3 Authz Matrix And Role Taxonomy Plan

**Date:** 2026-07-04
**Status:** WP1-WP6 locally implemented and verified.

## Objective

Turn the Phase 3 authz gate in `11_IMPLEMENTATION_PLAN.md` into a concrete, source-grounded work plan: fill the current actor x object x role x check-location matrix, document the role taxonomy, identify missing fail-closed tests, and choose whether Better Auth's organization/access-control plugin belongs in this phase.

## Non-Goals

- No source edits are authorized by this document alone.
- No hosted Cloudflare/D1/Durable Object, Google provider, or browser proof is claimed here.
- No Better Auth organization plugin migration is part of this phase unless a later implementation plan proves a smaller migration surface than the local D1 helpers.

## Revalidation Evidence

| Evidence | Result |
|---|---|
| `bun scripts/generate-cloudflare-d1-authz-access-matrix.ts` | Static matrix generated `32` protected access paths, `32` positive tests, `32` denial tests, `30` cross-workspace denial tests, `allProtectedAccessPathsCovered: true`, and no static blockers. |
| `src/lib/authz/d1-access.ts` | D1 helper contract covers project, estimate, and workspace read/edit checks; WP2 local implementation now fails closed on D1 read errors. |
| `src/lib/auth/profile-d1-store.ts` | Active app roles are `ceo`, `admin`, and `member`; unknown persisted values fail soft to `member`. |
| `src/lib/auth/roles.ts` | Central role contracts now define app platform, workspace account, project/estimate collaboration, and public-share recipient authority as separate domains. |
| `src/lib/types/database.ts` | `ProfileRow.role` now uses the active `AppPlatformRole` domain instead of the stale wider `owner/admin/member/client/ceo` union. |
| `src/lib/auth/account-data.ts` | Workspace account roles are `owner`, `admin`, `member`, and `viewer`. |
| `src/lib/collaboration/types.ts` | Collaboration roles are `owner`, `admin`, `editor`, and `viewer`. |
| `src/lib/collaboration/realtime-identity-actions.ts` | WP1 local implementation now checks `canAccessProjectInD1` / `canAccessEstimateInD1` before signing a topic envelope and fails closed when D1 is unavailable or throws. |
| `src/lib/cloudflare/collaboration-room.ts` and `src/lib/cloudflare/collaboration-room-client.ts` | WP1 local implementation now requires a short-lived HMAC room token handshake before the Durable Object accepts broadcast/presence traffic or sends presence snapshots to a socket. |
| `tests/vitest/project-activity-page/route-contract.test.ts`, `tests/vitest/project-location-actions.test.ts`, `tests/vitest/project-publication-actions.test.ts` | WP3 local tests now lock route/action denial behavior, no-write/no-revalidate location denial, denied activity page empty data, and project-editor publication manager denial. |
| `tests/vitest/workspace-repository-authz-behavior.test.ts` | WP4 local tests now exercise the real workspace repository functions for allowed, outsider/cross-workspace denied, and D1-error fail-closed behavior. |
| `tests/vitest/beta-admin-action-boundaries.test.ts` | WP5 local tests now prove non-admin app roles cannot create/update beta allowlist entries or update beta feedback review status, while `ceo/admin` remain allowed. |
| `tests/vitest/auth-role-contracts.test.ts` | WP6 local tests now lock role-domain values, stale app-role normalization, workspace member content-edit semantics, collaboration editor non-manager semantics, and the public share recipient separation marker. |
| Better Auth Organization docs | Useful reference for organization roles and dynamic access control, but not adopted in this phase because the local model spans app, workspace, project, estimate, publication token, and Durable Object room authority. |

## Role Taxonomy

| Role domain | Source of truth | Values | Current meaning |
|---|---|---|---|
| App/platform | `src/lib/auth/profile-d1-store.ts`, beta-admin helpers | `ceo`, `admin`, `member` | `ceo` and `admin` can perform beta-admin tasks; platform admins bypass some D1 object checks. |
| Database profile app type | `src/lib/types/database.ts`, `src/lib/auth/roles.ts` | `ceo`, `admin`, `member` | Narrowed to the active app platform role domain so stale values do not look like active app authority. |
| Workspace account | `src/lib/auth/account-data.ts` | `owner`, `admin`, `member`, `viewer` | `owner/admin/member` can edit workspace-owned project data; `viewer` is read-oriented and must be denied edit paths. |
| Project/estimate collaboration | `src/lib/collaboration/types.ts`, `src/lib/authz/d1-access.ts` | `owner`, `admin`, `editor`, `viewer` | `owner/admin/editor` can edit scoped project/estimate content; only manager-ranked roles can manage collaboration/publication surfaces. |
| Collaboration manager rank | `src/lib/collaboration/actions.ts` | rank >= `admin` | `owner/admin` can manage access/publication; workspace `member` maps to editor-style content authority, not manager authority. |
| Public share recipient | Publication repository and share routes | token, optional password/session cookie | Authority is not app-authenticated; it is token/password/session-cookie scoped to the published object. |
| Realtime room participant | Realtime identity actions and DO room | topic-bound envelope plus room handshake | Locally gated by object access plus a short-lived topic-bound room token; hosted two-client/Worker proof is still not claimed. |

## Current Authorization Matrix

| Surface | Actor | Object | Allow roles/state | Check location | Current test posture | Phase 3 action |
|---|---|---|---|---|---|---|
| Project read | Signed-in user | Project | platform admin, project creator, workspace member, project member, inherited estimate sheet member | `canAccessProjectInD1` | WP2 helper and WP4 repository behavior tests added | WP2/WP4 locally complete for direct helper and listed repository boundaries. |
| Project edit | Signed-in user | Project | platform admin, project creator, workspace `owner/admin/member`, project `owner/admin/editor` | `canEditProjectInD1` | WP2 helper boundary tests and WP3 route/action denial tests added | WP2-WP3 locally complete for direct helper and named route/action denials. |
| Estimate read | Signed-in user | Estimate | platform admin, estimate creator, sheet member, inherited project access | `canAccessEstimateInD1` | WP2 helper and WP4 repository behavior tests added | WP2/WP4 locally complete for direct helper and listed repository boundaries. |
| Estimate edit | Signed-in user | Estimate | platform admin, estimate creator, sheet `owner/admin/editor`, inherited project edit | `canEditEstimateInD1` | WP2 helper boundary tests added | WP2 locally complete for direct helper boundaries; WP6 role contracts complete separately. |
| Workspace write | Signed-in user | Workspace | platform admin or workspace `owner/admin/member` | `isWorkspaceEditorInD1` | WP2 helper boundary tests and WP3 action-denial tests added | Direct helper and named action denials covered. |
| Workspace membership | Signed-in user | Workspace | workspace `owner/admin/member` only | `isWorkspaceMemberInD1` | WP2 D1-error fail-closed test and WP4 repository default-workspace fallback behavior added | Listed repository behavior covered. |
| Collaboration management | Signed-in user | Project/estimate collaboration | manager rank `owner/admin` | collaboration actions manager checks | WP3 publication manager editor-denied test added; invitation/publication tests cover some paths | Keep deeper collaboration repository behavior for future scoped tests if needed. |
| Realtime envelope | Signed-in user | `project:<id>` or `estimate:<id>` room | must have object read/access for topic | `issueRealtimeIdentity` plus D1 object helpers | Local negative/positive tests added | WP1 locally complete; keep hosted proof separate. |
| Realtime room broadcast | WebSocket client | Durable Object room | verified authorized room participant | room token handshake in `CollaborationRoom` | Local protocol tests added | WP1 locally complete; keep hosted two-client proof separate. |
| Public share read | Anonymous or recipient | Published project/estimate/proposal | valid share token plus password/session when required | public share route/repository | Phase 2 password tests cover lockout; route tests cover public contract | Keep modeled separately from app authz; add Phase 4 privacy tests later. |
| Beta admin | Signed-in user | Allowlist/admin controls | app role `ceo/admin` | beta allowlist admin helpers/actions | WP5 negative/positive action tests added | WP5 locally complete; keep hosted/browser proof separate. |

## Work Packages

### WP1 - Realtime Topic Authorization And Room Admission

**Risk covered:** RISK-002, RISK-005, realtime broken access control.

**Local status:** Implemented on 2026-07-04.

**Files to inspect/edit:**
- `src/lib/collaboration/realtime-identity-actions.ts`
- `src/lib/collaboration/realtime-identity.ts`
- `src/lib/collaboration/realtime-identity-server.ts`
- `src/lib/cloudflare/collaboration-room-router.ts`
- `src/lib/cloudflare/collaboration-room.ts`
- `src/lib/cloudflare/collaboration-room-client.ts`
- Related tests under `tests/vitest/*collaboration*` or a new focused realtime authz test file.

**Red tests first:**
- A signed-in, terms-accepted outsider requesting `project:<victimProjectId>` receives `null` and `issueRealtimeIdentityEnvelope` is not called.
- A signed-in, terms-accepted outsider requesting `estimate:<victimEstimateId>` receives `null` and no envelope is signed.
- A room client that connects without a verified topic-bound authorization handshake cannot broadcast or update presence.
- A stale/wrong-topic envelope cannot authorize a different room.

**Implementation notes:**
- Gate topic envelope issuance through `canAccessProjectInD1` or `canAccessEstimateInD1`.
- Keep topic parsing strict and fail closed for unknown prefixes.
- Do not import Node-only `server-only` signing code directly into the Durable Object unless runtime compatibility is proven.
- Prefer a small, explicit room handshake contract over broad implicit trust in the URL path.

**Implemented approach:**
- `issueRealtimeIdentity` now requires D1 object access before signing and returns a short-lived `roomToken`.
- `src/lib/collaboration/realtime-room-token.ts` issues/verifies topic-bound HMAC room tokens using `REALTIME_ROOM_TOKEN_SECRET` with fallbacks to existing realtime/invite secrets.
- `CollaborationRoom` requires an `authorize` message with a valid topic-bound room token before accepting broadcast/presence messages or sending presence snapshots to a socket.
- Presence, cursor, and row-update clients authorize the room before sending their existing payloads.

### WP2 - Direct D1 Helper Role Boundary Tests

**Local status:** Implemented on 2026-07-04.

Add `tests/vitest/d1-access-role-boundaries.test.ts` or equivalent focused coverage for:
- outsider false for project and estimate reads.
- workspace/project/estimate viewer denied for edit.
- project/estimate editor allowed only on scoped edit authority.
- inherited project access true/false for estimate helpers.
- D1 query errors return fail-closed false rather than granting access.

**Implemented approach:**
- `tests/vitest/d1-access-role-boundaries.test.ts` covers outsider read denial, workspace/project/estimate viewer edit denial, scoped project/estimate editor authority, inherited estimate access, and D1 read-error fail-closed outcomes.
- `src/lib/authz/d1-access.ts` routes D1 boolean probes through a shared fail-closed wrapper while preserving the existing platform-admin short-circuit.

### WP3 - Route And Action Denial Tests

**Local status:** Implemented on 2026-07-04.

Extend existing suites for:
- `src/app/api/projects/[projectId]/activity/route.ts`: `canEdit=false` and D1 throws return a denial/no-write path.
- `src/app/workshop/projects/[projectId]/activity/page.tsx`: denial renders empty/blocked activity state without leaking data.
- `src/lib/projects/location-actions.ts`: `save` and `clear` deny writes and skip revalidation when `canEdit=false`.
- Collaboration/publication manager paths: `editor` can edit content where intended but cannot manage access/publication.

**Implemented approach:**
- `tests/vitest/project-activity-page/route-contract.test.ts` covers API `canEdit=false`, D1-error denial, no feed read, no-store response, and denied page render with empty feed/dropdown props.
- `tests/vitest/project-location-actions.test.ts` covers save/clear denial before D1 writes and without `revalidatePath`.
- `tests/vitest/project-publication-actions.test.ts` adds project `editor` to the existing exhaustive non-manager publication mutation denial matrix.

### WP4 - Repository Behavior Tests For Static-Contract Rows

**Local status:** Implemented on 2026-07-04.

Convert source-string-only rows in `workspace-repository-authz-contract.test.ts` into behavior tests where practical:
- `getCurrentWorkspaceProject`
- `listProjectEstimates`
- `listProjectEstimateSheets`

The behavior tests should prove allowed, outsider denied, cross-workspace denied, and D1-error fail-closed outcomes.

**Implemented approach:**
- `tests/vitest/workspace-repository-authz-behavior.test.ts` exercises the real repository functions with a fake D1 database and real D1 authz helpers.
- Coverage includes shared project allowed, cross-workspace outsider fallback, throwing project access probe fail-closed, estimate list filtering, inaccessible-project empty lists, throwing estimate access probes, and lightweight sheet-list filtering.

### WP5 - Beta Admin Action Negative Tests

**Local status:** Implemented on 2026-07-04.

Extend beta allowlist/admin coverage so non-admin app roles cannot create, update, or otherwise mutate allowlist/admin-controlled state. Keep `ceo/admin` as the only beta-admin authority unless product requirements change.

**Implemented approach:**
- `tests/vitest/beta-admin-action-boundaries.test.ts` covers `member`, `owner`, `client`, and missing-role denial for closed-beta allowlist create/update and beta-feedback review-status update actions.
- The same suite verifies allowed `admin`/`ceo` paths normalize data, call the intended D1 mutation helper, revalidate the correct settings path, and redirect to the expected status URL.

### WP6 - Central Role Contracts

**Local status:** Implemented on 2026-07-04.

After WP1-WP5 behavior is locked:
- Narrow or split `AppRole` so stale values in `src/lib/types/database.ts` cannot be confused with active app roles.
- Add explicit scoped types for workspace account role, project/estimate collaboration role, and app platform role.
- Keep public share recipient authority separate from signed-in app roles.
- Document why workspace `member` is content-editor authority, while collaboration `editor` is not manager authority.

**Implemented approach:**
- `src/lib/auth/roles.ts` centralizes `AppPlatformRole`, `WorkspaceAccountRole`, `ProjectEstimateCollaborationRole`, platform-admin helpers, workspace content/manage helpers, project/estimate content/manage helpers, and a public-share recipient authority marker type.
- `src/lib/types/database.ts`, `src/lib/auth/profile-d1-store.ts`, `src/lib/auth/account-data.ts`, and `src/lib/collaboration/types.ts` now use or re-export the scoped role contracts.
- Beta-admin, beta-feedback review, upload scan override, D1 access, settings, project delete, and workspace repository paths use the shared platform-admin predicate where this slice touched role checks.
- `tests/vitest/auth-role-contracts.test.ts` locks the role domains and documents the workspace-member vs collaboration-editor authority split.

## Better Auth Organization Plugin Decision

Do not adopt the Better Auth Organization plugin for Phase 3.

Reasoning:
- The existing authorization model is already D1-backed and object-scoped across workspaces, projects, estimates, collaboration records, publication links, and Durable Object rooms.
- Better Auth's plugin is useful for organization membership and permission modeling, but adopting it now would require migration design across existing workspace/project/estimate authority and does not directly solve public share tokens or room admission.
- The immediate P1 risk is a local broken-access-control gap in realtime topic/room authorization; adding a plugin before that fix increases surface area.

Revisit the plugin after WP1-WP6 if the centralized role contracts still duplicate organization membership checks in a way the plugin can replace without weakening object-level D1 checks.

## Validation Plan

Run the smallest checks that prove each work package:

```bash
bun scripts/generate-cloudflare-d1-authz-access-matrix.ts
bunx vitest run --maxWorkers=1 tests/vitest/d1-access-role-boundaries.test.ts
bunx vitest run --maxWorkers=1 <changed-authz-route-action-tests>
git diff --check
NODE_OPTIONS=--max-old-space-size=8192 bun run type-check
```

For WP1, add a focused Durable Object or protocol-level test if the handshake contract is implemented outside ordinary server-action tests. Browser proof is not required unless the client handshake behavior cannot be proven by unit/protocol tests.

## Exit Criteria

- No protected mutation in the matrix lacks a planned server-side object-role check.
- Representative read and mutation paths have allowed, denied, cross-object/cross-workspace, and fail-closed tests.
- `editor` is accepted only for scoped project/estimate content edits and rejected for manager-only operations.
- App/platform, workspace, project/estimate, beta-admin, public-share-recipient, and realtime-room authority are typed or explicitly documented as separate role domains.
- Better Auth organization plugin is either deferred with this rationale or adopted only under a later migration plan with tests.

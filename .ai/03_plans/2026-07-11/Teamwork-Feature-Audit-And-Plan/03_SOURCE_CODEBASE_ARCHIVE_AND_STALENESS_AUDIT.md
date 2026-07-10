# Source, Codebase, Archive, and Staleness Audit

## Evidence Hierarchy

1. Current active source, active D1 migrations, focused runtime tests, and current configuration.
2. Current `.ai/10_state` facts that agree with source.
3. Validated current plan-pack receipts.
4. Historical docs and archived Supabase artifacts, labeled as archaeology.
5. Stale graph/index output only as directional blast-radius evidence.

## Current Source Map

| Surface | Current anchors | Audit result |
| --- | --- | --- |
| role vocabulary | `src/lib/auth/roles.ts` | Platform roles `ceo`/`admin`/`member` (`:1`), with `isPlatformAdminRole` true for both `ceo` and `admin` (`:26-28`). Workspace `owner`/`admin` manage; `member` edits; project/sheet `owner`/`admin` manage; `editor` edits; `viewer` reads (`:5`, `:8`, `:77-84`, `:104-111`). |
| project/sheet authorization | `src/lib/authz/d1-access.ts` | Distinct exported predicates: `canAccessProjectInD1` (`:99`, includes sheet-member branch at `:125-131`), `canAccessWholeProjectInD1` (`:140`), `canEditProjectInD1` (`:175`), `canAccessEstimateInD1` (`:212`), `canEditEstimateInD1` (`:261`, inheritance clause), `isWorkspaceEditorInD1` (`:313`), `isWorkspaceMemberInD1` (`:336`, excludes viewer). Shared and high blast radius. |
| collaboration mutations | `src/lib/collaboration/actions.ts` | Extensive actions exist, but scope checks, target dominance, atomicity, and UI callers are inconsistent. Project-level invite/role/remove actions are dead code at runtime; only sheet-level actions are wired into `PublisherProjectMembersPanel.tsx`. |
| invite token security | `src/lib/collaboration/invite-entry.ts` | Feature/pepper fail-closed, random raw tokens (`:66-76`), peppered SHA-256 hashes (`:54-64`), 64-hex pepper validated (`:15`,`:33`); durable rate-limit primitives. Raw token never persisted (`actions.ts:548-575` stores hash/hint only). |
| invite acceptance | `src/lib/collaboration/invitation-d1-store.ts`, `src/app/invite/[token]/accept/route.ts` | Primary `/accept` requires same-origin POST + origin check (`accept/route.ts:77,87`) and its GET only redirects (`:77-81`). But the post-auth bridge `src/app/workshop/pending-invite/route.ts:70` accepts membership on a GET via the signed `PENDING_INVITE_COOKIE` (`acceptPendingInviteBridge` -> `acceptInvitationTokenForUser`), which is the second-path GET acceptance. Acceptance itself spans read-then-write without one encompassing transaction (`invitation-d1-store.ts:453-583`, membership grant at `:506-508` outside the trailing `runStatements` batch at `:513-573`). |
| membership/invite schema | `migrations/0007_collaboration_invitations.sql` | Active D1 tables exist; last-manager and unique-pending invariants are missing. Verified absent across all 52 active migrations (0031-0052 add neither). |
| inheritance schema | `migrations/0008_estimate_sheet_user_preferences.sql` | One global `inherit_project_access` flag per estimate (`:1-9`) plus additive per-user UI preferences (`:11-31`); no negative per-user ACL. |
| collaboration summary | `src/lib/repositories/workspace-repository.ts` | Merges roles and emits capabilities, pending invites, emails, access modes, and placeholder online state. Sheet `canManageAccess` is true for direct sheet owner/admin (`:2886` via `canManageCollaborationRole` at `:632-634`). |
| project estimate listing | `src/lib/repositories/project-estimate-sheets-repository.ts` | `assertCanAccessProjectEstimateSheets` (`:62-69`) gates on `canAccessProjectInD1` only; `listProjectEstimateSheetsForProject` (`:88-115`), `countProjectEstimateSheetsForProject` (`:117-126`), and `listRecentProjectEstimateSheets` (`:128-202`) return all estimates by `WHERE project_id = ?` with no per-sheet membership filter. |
| access UI | `src/components/workshop/publisher/PublisherProjectMembersPanel.tsx` | Project roster read-only; sheet invite/restrict/remove wired (`:19-22`,`:209`,`:229`,`:242`,`:255`); pending invitations produced by the repository but rendered by zero components. |
| realtime identity | `src/lib/collaboration/realtime-identity-actions.ts`, `realtime-room-token.ts` | Topic access checked at token issuance (`realtime-identity-actions.ts:79-82`) and tokens HMAC-signed; but room token carries no capability field (`realtime-room-token.ts:11-17`), the identity envelope `role` is hardcoded `"member"` for everyone (`realtime-identity-actions.ts:92`) and never checked by any receiver, and the signing secret falls back through `REALTIME_ROOM_TOKEN_SECRET` -> `REALTIME_IDENTITY_SIGNING_KEY` -> invite peppers (`realtime-room-token.ts:4-9`). No membership-version/revocation discriminator exists. |
| realtime server | `src/lib/cloudflare/collaboration-room.ts` | Authorization checked before broadcast (`:124-127`,`:172`) and topic bound to room name (`:230`), but event names are only format-validated not registry-checked (`:53-55`,`:130-133`), payloads pass through untouched (`:134-138`), there is no per-connection auth deadline or unauthorized-socket eviction, no rate limiting, and the DO is display-label-agnostic. The router (`collaboration-room-router.ts:29-43`) performs zero auth/scope checks; topic access is enforced only at token issuance plus DO topic binding. No revocation path closes a socket on membership removal. |
| cursor client | `src/hooks/use-estimate-cursor-broadcast.ts` | Estimates cursors render and verify the signed envelope (`:207-231`); outbound send is gated on `envelopeRef` (`:316`). But the wire `displayName` is stored verbatim as a self-reported label (`:241-242`), there is no reconnect logic and no refresh before the 300s token expiry, and the client treats socket-open as subscribed without waiting for the server `authorized` ack (`collaboration-room-client.ts:87-90`; the `authorized` message is received at `:158-160` and does nothing). |
| project presence/cursors | `use-project-presence.ts`, `ProjectCursorLayer.tsx`, feature flags | `useProjectPresence` has zero call sites in product UI; `ProjectCursorLayer` is mounted in `ProjectChromeAsync.tsx:135-141` but gated behind `projectPageCursorsEnabled` which defaults off (`feature-flags.ts:51-53`). `GlobalPresence` DO (`global-presence.ts:71`) exists but is admin-restricted and unmounted (`realtime-identity-actions.ts:123-125`). |

## Confirmed Policy/Behavior Defects

### Authorization and privacy

- Sheet-only access can authorize a project shell and then list all estimate metadata.
- Direct sheet owner/admin can be reported as a manager while sheet actions deny them for lacking project-manager authority.
- Copy/resend can authorize at project scope rather than the invitation's exact estimate scope.
- Generic role/remove paths perform no actor-over-target rank comparison anywhere in `actions.ts`; only last-manager preservation guards exist (`updateProjectCollaboratorRole:1317-1324`, `removeProjectCollaborator:1401-1404`). An admin can remove or demote an owner or peer admin subject only to the manager floor.
- Re-inviting an existing member overwrites the stored role outside the explicit role-change path, in two places: pending-invite collision updates role on re-send (`upsertInvitation:421-440`) and `upsertProjectMemberInD1` uses `ON CONFLICT DO UPDATE SET role = excluded.role` with no dominance check (`inviteProjectCollaborator:971-973`).
- Project membership removal leaves explicit sheet membership untouched without an explicit product choice.
- Viewer and sheet-only roster/email/pending-invite visibility lacks a written privacy contract.

### Data integrity

- Active D1 has one-active-token uniqueness, but no one-active-pending-invite uniqueness for a scope.
- Last workspace owner, last project manager, and restricted-sheet manager floors are guarded with read-then-write application checks.
- Token reissue, sheet restriction, direct grant, and invitation acceptance cross multiple statements without one encompassing transaction.
- Restricting a sheet can silently upsert the actor as owner before changing inheritance.

### Realtime

- An authorized client can send arbitrary event names/payloads and self-reported display labels.
- Viewer restrictions are browser behavior, not server capability enforcement.
- Unauthenticated sockets have no short authorization deadline.
- The client treats socket-open as subscribed before receiving an authorization acknowledgement.
- A five-minute room token expires without a complete refresh/re-authentication loop.
- Project presence is not a mounted production fact; row-update broadcast has no production receiver.

## Known-Red Test Baseline

The lead's focused collaboration run executed 16 files: 14 passed and 2 failed; 85 of 87 tests passed.

1. `project-collaboration-summary.test.ts` asserts a retired inline role union after role types moved to a shared helper.
2. `workspace-collaboration-summary-authz.test.ts` uses a fake D1 implementation that recognizes an old per-estimate access query but not the current batched query, and it masks the production whole-project summary gate.

A separate repository-authz run passed 3 files and 30 tests. These failures are treated as fixture/assertion drift until `UNIT-001` rewrites them around the intended sheet-only policy. They are not accepted as proof that production behavior is correct.

## Graph Evidence

GitNexus was 53 commits stale. Directional upstream results:

- `canAccessEstimateInD1`: CRITICAL, 97 impacted, 15 direct, 4 processes.
- `getProjectCollaborationSummary`: HIGH, 6 impacted, 3 direct.
- `assertProjectAccessManager`: MEDIUM, 13 impacted, 6 direct, 1 process.
- `CollaborationRoom`: LOW, 3 direct.

The stale index missed known current imports for realtime identity. Implementation must use fresh targeted caller/import inspection and optionally reindex only through the repo safe runner.

## Archive and Existing-Pack Audit

- `.ai/06_specs/teamspaces-collaboration-spec.md` still describes Supabase Presence/Broadcast/RLS and a fuller modal than the active implementation. It must be superseded or rewritten during `UNIT-019`.
- Historical Supabase triggers and RLS tests do not prove active D1 invariants.
- The Publisher pack currently fails its validator on eight stale artifact hashes; any Team access DTO/component change also requires an owner-refreshed Publisher manifest and `TEAMWORK-PUBLISHER-ACCESS-v1`.
- The Activity pack currently fails its validator on five stale artifact hashes. `UNIT-009` and `UNIT-014` must treat both overlap manifests as inadmissible until their owners refresh and revalidate them; even a later general PASS will not substitute for `TEAMWORK-ACTIVITY-CONTRACT-v1` or `TEAMWORK-PUBLISHER-ACCESS-v1`.
- Existing hosted invitation and cursor evidence proves bounded scenarios but explicitly does not prove production cutover or the complete two-client in-app roster journey.

## Official Cloudflare Sources

Retrieved 2026-07-11:

- `https://www.cloudflare.com/solutions/platforms/`
- `https://developers.cloudflare.com/cloudflare-for-platforms/`
- `https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/get-started/`
- `https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/reference/pricing/`

These sources describe multi-tenant platform primitives, including customer-deployed isolated Workers, dispatch namespaces, per-customer bindings, per-tenant D1/R2 patterns, custom hostnames/domains, limits, and monetization. Current pricing makes Workers for Platforms a paid dependency. The current Teamwork feature needs none of those capabilities, and datastore-per-tenant partitioning would add provisioning and operational complexity without closing the audited RBAC or atomicity gaps.

## Scoped Baseline Pathspecs

The ordered, duplicate-free literal repo-relative pathspec list is:

```text
AGENTS.md
.ai/00_system/AGENT_OPERATING_PROTOCOL.md
.ai/08_prompts/000_Planning Prompts
.ai/10_state/current-state.md
.ai/10_state/decisions.md
.ai/03_plans/2026-07-10/Publisher-And-Shared-Pages
.ai/03_plans/2026-07-10/Activity-History-Mapping
.ai/06_specs/teamspaces-collaboration-spec.md
.ai/09_archive/2026-06-14-Teamspace-Improvement-Plan
.ai/09_archive/share-and-collaboration-implementation
.ai/05_logs/2026-06-14-teamspace-baseline.md
.ai/05_logs/2026-06-14-teamspace-implementation-ledger.md
.ai/05_logs/2026-06-14-teamspace-rollout-ledger.md
migrations/0007_collaboration_invitations.sql
migrations/0008_estimate_sheet_user_preferences.sql
migrations/0013_collaboration_management_sidecars.sql
migrations/0030_workspace_owner_membership_backfill.sql
src/lib/auth/roles.ts
src/lib/authz/d1-access.ts
src/lib/collaboration
src/lib/cloudflare/collaboration-room.ts
src/lib/cloudflare/collaboration-room-router.ts
src/lib/cloudflare/collaboration-room-client.ts
src/lib/repositories/workspace-repository.ts
src/lib/repositories/project-estimate-sheets-repository.ts
src/hooks/use-project-presence.ts
src/hooks/use-estimate-cursor-broadcast.ts
src/components/workshop/ProjectChromeAsync.tsx
src/components/workshop/ProjectCursorLayer.tsx
src/components/workshop/EstimateSheetContent.tsx
src/components/workshop/EstimateWorkspaceClient.tsx
src/components/workshop/publisher/PublisherProjectMembersPanel.tsx
src/app/invite
src/app/workshop/pending-invite/route.ts
src/app/workshop/projects/[projectId]
scripts/generate-cloudflare-d1-collaboration-invitation-proof.ts
scripts/verify-cloudflare-hosted-collaboration-invitation-proof.ts
tests/vitest/project-collaboration-summary.test.ts
tests/vitest/workspace-collaboration-summary-authz.test.ts
tests/vitest/workspace-repository-batched-authz.test.ts
tests/vitest/workspace-repository-authz-behavior.test.ts
tests/vitest/workspace-repository-authz-contract.test.ts
tests/vitest/collaboration-actions.test.ts
tests/vitest/collaboration-invitation-d1-store.test.ts
tests/vitest/collaboration-room.test.ts
tests/vitest/collaboration-room-client.test.ts
tests/vitest/project-presence.test.ts
tests/vitest/estimate-cursor-broadcast.test.ts
```

`PLAN-PACK-SCOPED-BASELINE-v1` at planning freeze:

```text
head=e373bc865b978e237deb1d92011c96b0a3639fb4
scoped_status_sha256=8762cf893208095118f595db91b86ff33577613c365d8d89dc1ddc7b917183d0
scoped_diff_sha256=d1174d75ebed8ad48ad49caedf4ad04d0b2abdeb64bba696dd9813875662e6ef
```

The scoped status includes concurrent edits to both overlap packs, the planning-prompt suite, and current state. After those writes became stable, the independent verifier recomputed the exact ordered 48-path baseline: 3,320 status bytes, 392,568 tracked-diff bytes, and zero untracked files. The re-audit found five Activity and eight Publisher artifact-hash mismatches, so this pack records both overlap manifests as stale rather than claiming a PASS. Any implementation-time mismatch requires another ledger observation, targeted re-audit, and baseline refresh. Do not silently change pathspecs.

## Stale Triggers

- Any scoped baseline mismatch.
- Any change to role vocabulary, access predicates, membership/invite migrations, collaboration actions, summary DTOs, realtime protocol, or feature flags.
- A new D1 migration allocation.
- Reconciliation or new drift in the Activity or Publisher pack.
- A change to Cloudflare Workers for Platforms capabilities or pricing.
- A new Next.js server-action/origin/route contract relevant to invite acceptance.
- A new hosted proof artifact or a failed recurrence of an existing proof.

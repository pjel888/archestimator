# Actor, Resource, and Action RBAC Matrix

## Canonical Policy

Authorization is a function of `{actor, resource, action, context}`. Role strings are inputs, not authorization answers. One policy module must return both `allowed` and a stable reason/capability source used by repositories, server actions, realtime token issuance, DTOs, UI controls, and tests.

### Effective authority order

1. Platform `admin` receives full internal Teamwork authority, but public-recipient authority remains token/session scoped.
2. Workspace authority applies to descendant projects and estimates while inheritance is enabled.
3. Project authority applies to descendant estimates while inheritance is enabled.
4. Direct estimate authority always applies to that estimate.
5. A restricted estimate disables workspace/project inheritance for estimate content and estimate-management actions; direct estimate authority is required.
6. Multiple applicable grants combine by highest rank. A lower direct grant does not demote higher inherited authority.
7. There is no negative per-user ACL in v1. Restriction is inheritance-off for the whole estimate plus direct allowlist grants.

### Role meanings

| Scope | owner | admin | member/editor | viewer |
| --- | --- | --- | --- | --- |
| workspace | manage members/settings; edit/read | manage members; edit/read | edit/read descendant content | read descendant content |
| project | manage members; edit/read | manage members; edit/read | editor: edit/read | read |
| estimate direct | manage direct members/access mode; edit/read | manage direct members/access mode; edit/read | editor: edit/read | read |

Workspace `member` is intentionally the project/estimate editor equivalent. Workspace `viewer` counts as a readable workspace membership and must not be misclassified as an external client merely because it cannot edit.

## Resource Visibility

| Actor path | project identity | project sheet list | roster identity | member email | pending invites | estimate content |
| --- | --- | --- | --- | --- | --- | --- |
| platform admin | all | all | all | all | all | all |
| workspace owner/admin | full | all | full | yes | yes | inherited unless restricted |
| workspace member | full | all | full names/roles | no | no | inherited edit unless restricted |
| workspace viewer | full | all | scoped names/roles | no | no | inherited read unless restricted |
| project owner/admin | full | all | full | yes | yes | inherited unless restricted |
| project editor | full | all | scoped names/roles | no | no | inherited edit unless restricted |
| project viewer | full | all | scoped names/roles | no | no | inherited read unless restricted |
| sheet-only owner/admin | minimal shell | accessible sheets only | that sheet only | managers only | that sheet only | direct read/edit/manage |
| sheet-only editor | minimal shell | accessible sheets only | that sheet only | no | no | direct edit |
| sheet-only viewer | minimal shell | accessible sheets only | that sheet only | no | no | direct read |
| public recipient | none | none | none | none | none | only published public snapshot |

The minimal sheet-only shell may expose project name/code needed for orientation and URLs. It must not enumerate inaccessible estimate names, codes, timestamps, project roster, workspace roster, project invites, or Publisher recipients.

## Action Matrix

Legend: `Y` allowed, `N` denied, `S` allowed only for the directly managed restricted sheet, `R` receive only.

| Action | workspace owner | workspace admin | workspace member | workspace viewer | project owner | project admin | project editor | project viewer | sheet owner | sheet admin | sheet editor | sheet viewer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| read project metadata/list | Y | Y | Y | Y | Y | Y | Y | Y | S | S | S | S |
| edit project | Y | Y | Y | N | Y | Y | Y | N | N | N | N | N |
| read inherited estimate | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| edit inherited estimate | Y | Y | Y | N | Y | Y | Y | N | Y | Y | Y | N |
| read restricted estimate | direct grant only | direct grant only | direct grant only | direct grant only | direct grant only | direct grant only | direct grant only | direct grant only | Y | Y | Y | Y |
| edit restricted estimate | direct editor+ | direct editor+ | direct editor+ | direct editor+ | direct editor+ | direct editor+ | direct editor+ | direct editor+ | Y | Y | Y | N |
| manage project members | Y | Y | N | N | Y | Y | N | N | N | N | N | N |
| manage direct sheet members | Y* | Y* | N | N | Y* | Y* | N | N | Y | Y | N | N |
| change sheet inheritance | Y* | Y* | N | N | Y* | Y* | N | N | Y | Y | N | N |
| see manager email/pending invite | Y | Y | N | N | Y | Y | N | N | S | S | N | N |
| publish coarse presence | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| publish estimate cursor | Y | Y | Y | N | Y | Y | Y | N | Y | Y | Y | N |
| receive estimate cursors | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| broadcast content event | Y | Y | Y | N | Y | Y | Y | N | Y | Y | Y | N |
| public publish/share | separate Publisher capability | separate Publisher capability | separate Publisher capability | N | separate Publisher capability | separate Publisher capability | separate Publisher capability | N | N | N | N | N |

`Y*` applies to inherited sheets only while the actor has whole-project manager authority; restricted sheets require a direct sheet manager grant. The policy must not allow a project manager to reissue or revoke a restricted-sheet invitation without that direct capability.

## Target-Dominance Rules

- An actor may assign only roles strictly below their own effective management rank.
- Generic admin flows cannot assign, demote, remove, or replace an owner.
- An admin cannot mutate an equal-ranked admin through generic role/remove controls.
- Self-demotion and self-removal use explicit, separate flows and may not violate the manager floor.
- Ownership transfer is outside this slice and cannot be approximated by inviting/updating `owner`.
- Every target profile must exist before a membership is created.
- Adding/inviting an existing member is idempotent; it never silently lowers an existing role.
- A role change is an explicit mutation with before/after values and target-dominance checks.
- UI role menus are generated from the same assignable-role capability, not a hard-coded four-role array.

## Manager Floors

- Every workspace has at least one owner.
- Every project with explicit project membership has at least one project owner/admin or a workspace owner/admin capable of recovery; the exact invariant is enforced atomically using effective recovery authority.
- Every restricted estimate has at least one direct owner/admin.
- Restricting a sheet is atomic with establishing a valid direct manager; it never silently promotes the actor to owner.
- Last-manager checks must hold under concurrent transactions, not only single-threaded preflight reads.

## Canonical Policy API Shape

```ts
type TeamworkAction =
  | "project.read"
  | "project.edit"
  | "project.members.manage"
  | "estimate.read"
  | "estimate.edit"
  | "estimate.members.manage"
  | "estimate.inheritance.manage"
  | "invitation.reissue"
  | "invitation.revoke"
  | "roster.email.read"
  | "presence.publish"
  | "cursor.publish"
  | "realtime.event.publish";

type CapabilityDecision = {
  allowed: boolean;
  reason: string;
  effectiveRole: string | null;
  source: "platform" | "workspace" | "project" | "estimate" | null;
  scopeId: string;
};
```

The implementation may use a richer internal shape, but stable `reason` and `source` values are required for tests, UI explanations, audit facts, and debugging.

## Required Denial Proof

- A sheet-only viewer cannot enumerate another estimate.
- A project viewer cannot read manager emails or pending invites.
- A direct sheet admin can manage that restricted sheet without project membership.
- A project admin cannot manage a restricted sheet without a direct sheet-manager grant.
- An admin cannot demote/remove owner or equal-ranked admin.
- A viewer cannot issue or use a cursor/content-event capability.
- A public recipient cannot cross into any internal Teamwork predicate.

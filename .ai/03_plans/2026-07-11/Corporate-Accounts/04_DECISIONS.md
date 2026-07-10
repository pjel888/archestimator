# 04 — Decisions

## DEC-AUTO-001: Corporate account as a new top-level entity (not a workspace flag)

**Question:** Should corporate accounts be a new entity above workspaces, or a flag/tag on existing workspaces?

**Decision:** New top-level entity (`corporate_accounts` table).

**Why:** A corporate account groups MULTIPLE workspaces and users. Putting it on workspace would mean N workspaces each carry a redundant copy, and membership/roles would be workspace-scoped (wrong — org roles transcend workspaces). A separate entity cleanly models the org → workspaces → users hierarchy.

**Rejected:** Workspace flag — doesn't model org-level membership or roles.

## DEC-AUTO-002: Org roles are separate from workspace/platform roles

**Question:** Should org roles reuse the existing workspace role vocabulary (owner/admin/member/viewer) or define their own?

**Decision:** Separate vocabulary including `team_leader`: owner, team_leader, member, viewer.

**Why:** The user explicitly requested "team leaders." Reusing workspace roles would conflate two scopes (org-level vs workspace-level). A user can be a `team_leader` at the org level but a `viewer` in a specific workspace. Keeping them separate preserves the existing three-role-system pattern (platform/workspace/project) and adds a fourth (org).

## DEC-AUTO-003: Manual assignment only (no email-domain auto-discovery)

**Question:** Should corporate accounts auto-group users by email domain?

**Decision:** Manual assignment only. Auto-discovery is a non-goal.

**Why:** Email-domain matching is error-prone (gmail.com, shared hosting, consulting firms with different domains). Manual assignment gives the admin full control. Auto-discovery can be added later as an optional convenience feature.

## DEC-AUTO-004: Workspace link is optional and nullable

**Question:** Should all workspaces be forced into a corporate account?

**Decision:** Optional. `workspaces.corporate_account_id` is nullable. Existing solo workspaces remain unlinked.

**Why:** Forcing every workspace into an org would break the solo-practitioner flow (auto-provisioned workspace on signup). Solo users should not see org-management UI. The link is additive — admins can link workspaces to accounts when needed.

## DEC-AUTO-005: ON DELETE SET NULL for workspace link, ON DELETE CASCADE for membership

**Question:** What happens to workspaces/members when a corporate account is deleted?

**Decision:**
- `workspaces.corporate_account_id` → `ON DELETE SET NULL` (workspaces survive, become unlinked)
- `corporate_account_members` → `ON DELETE CASCADE` (membership rows deleted)

**Why:** Workspaces contain real project/estimate data — they must survive account deletion. Membership is purely relational metadata — deleting it is clean and reversible (re-add the user).

## DEC-AUTO-006: Team leaders can view but not manage members

**Question:** What can a team_leader do that a member cannot?

**Decision:** Team leaders can view all members and workspaces in their account. They cannot add/remove members or link/unlink workspaces (that's owner-only). They also cannot delete the account.

**Why:** The user's use case is "assigning email addresses under team leaders" — a team leader needs to see who's on their team but shouldn't have full admin powers. This matches typical enterprise hierarchies where team leads have visibility but not org-management authority.

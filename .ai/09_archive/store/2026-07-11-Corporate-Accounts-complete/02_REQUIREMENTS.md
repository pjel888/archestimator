# 02 — Requirements

## REQ-001: Corporate account entity
Admin can create a corporate account (organization) with a name and optional
description. Each account has a unique ID and tracks who created it.

**AC-001:** `POST /admin` (server action `createCorporateAccount`) creates a row in `corporate_accounts`.
**AC-002:** The account appears in the admin accounts list.
**Evidence:** automated test + browser.

## REQ-002: Org-level membership with roles
Users can be assigned to a corporate account with an org-level role. Supported
roles: `owner`, `team_leader`, `member`, `viewer`.

**AC-003:** `assignUserToCorporateAccount` adds a membership row.
**AC-004:** Each membership has a role from the allowed set.
**AC-005:** Removing a membership deletes the row.
**Evidence:** automated test.

## REQ-006: Team leader assignment
A `team_leader` role can be assigned, enabling the "assigning email addresses
under team leaders" use case. Team leaders can view (but not manage) members
in their account.

**AC-006:** The `team_leader` role is persisted and displayed in the UI.
**Evidence:** browser.

## REQ-003: Link workspaces to corporate accounts
Workspaces can be linked to a corporate account (optional — existing solo
workspaces remain unlinked).

**AC-007:** `linkWorkspaceToCorporateAccount` sets `workspaces.corporate_account_id`.
**AC-008:** Unlinked workspaces show "No corporate account" in the admin.
**Evidence:** automated test.

## REQ-004: Admin accounts page
A new `/admin/accounts` page shows:
- All corporate accounts with member count and workspace count
- Click-through to account detail showing members, roles, and linked workspaces
- Create-account form
- Assign-user-to-account form

**AC-009:** `/admin/accounts` renders the accounts list.
**AC-010:** Account detail shows members with roles.
**AC-011:** Account detail shows linked workspaces.
**Evidence:** browser.

## REQ-005: Admin sidebar entry
"Accounts" appears in the admin sidebar navigation.

**AC-012:** Sidebar nav item exists and links to `/admin/accounts`.
**Evidence:** browser.

## REQ-007: User detail shows corporate membership
The existing `/admin/users/[userId]` page shows which corporate account(s) the
user belongs to and their role.

**AC-013:** User detail page includes a "Corporate membership" section.
**Evidence:** browser.

## REQ-008: Suspend / archive corporate accounts
Admin can change a corporate account's status to `suspended` or `archived`.
Suspended accounts are visible but flagged. Archived accounts are hidden from
the default list. Both are reversible (set back to `active`).

**AC-014:** `updateCorporateAccountStatusAction` transitions status.
**AC-015:** Suspended accounts show a warning badge in the list and detail.
**AC-016:** Archived accounts are excluded from the default list query.
**Evidence:** browser + automated test.

## REQ-009: Last-owner guard
Removing or demoting the last `owner` of a corporate account is blocked with a
clear error message. An account must always have at least one owner.

**AC-017:** `removeCorporateAccountMember` returns an error if the user is the
last owner.
**AC-018:** `updateCorporateAccountMemberRole` returns an error if demoting the
last owner.
**Evidence:** automated test.

## REQ-010: Server-side workspace re-parent guard
Linking a workspace that is already linked to a different corporate account
must either be blocked or treated as an explicit move (with audit of the old
account). Silent re-parenting is not allowed.

**AC-019:** `linkWorkspaceAction` detects when the workspace is already linked
to a different account and either rejects or records the old-account audit.
**Evidence:** automated test.

## REQ-011: Client-side refresh after mutations
After create/assign/remove/link/unlink actions, the UI refreshes the visible
data without requiring a manual page reload.

**AC-020:** After creating an account, the list refreshes to show it.
**AC-021:** After adding/removing a member, the members table refreshes.
**AC-022:** After linking/unlinking a workspace, the workspaces table refreshes.
**Evidence:** browser.

## REQ-012: Efficient member-count query
The accounts list page uses a single `GROUP BY` query for member counts, not
N+1 per-account queries.

**AC-023:** `listCorporateAccounts` includes a `member_count` column via a
single aggregated subquery or separate `GROUP BY` query.
**Evidence:** code inspection.

## Non-goals

- Email-domain auto-discovery (manual assignment only for now)
- Self-service org creation (admin-only)
- Billing/plan tiers (future)
- SSO/SAML integration (future)
- Cross-workspace data sharing (each workspace remains isolated)
- Modifying the existing `ensureDefaultWorkspace` auto-provisioning flow

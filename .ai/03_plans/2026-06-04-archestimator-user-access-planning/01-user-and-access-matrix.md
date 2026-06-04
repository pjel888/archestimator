# 01 — Archestimator User & Access Matrix

**Status:** Planning  
**Last updated:** 2026-06-04

---

## 1. The Core Correction: User Type ≠ Role

The previous mental model treated User Types as a flat list (owner, collaborator, client, public viewer). This conflates three independent axes that must be modeled separately:

### Axis A: Identity
_Who is this person?_

| Identity State | How Established | Examples |
|---------------|-----------------|----------|
| **Anonymous** | No auth, no session | Public visitor, share-link viewer before password |
| **Session-bound recipient** | Token/password-gated session cookie | Share-link viewer after password unlock |
| **Identified recipient** | Email-verified shared-link recipient | Client who received a proposal email |
| **Authenticated user** | Supabase Auth (OAuth/email link) | App user with profile |
| **Platform admin** | `app_role = 'ceo'` or `'admin'` | Philip, future admins |

### Axis B: Permission
_What can this person do?_

| Permission Level | Scope | Current Implementation |
|-----------------|-------|----------------------|
| **Platform admin** | All workspaces/projects | `is_platform_admin()`, CEO email check |
| **Workspace owner** | Own workspace | `workspace_role = 'owner'` |
| **Workspace admin** | Own workspace | `workspace_role = 'admin'` |
| **Workspace member/editor** | Own workspace | `workspace_role = 'member'` |
| **Workspace viewer** | Own workspace | `workspace_role = 'viewer'` |
| **Project owner** | Specific project | `collaboration_role = 'owner'` via `project_members` |
| **Project admin** | Specific project | `collaboration_role = 'admin'` |
| **Project editor** | Specific project | `collaboration_role = 'editor'` |
| **Project viewer** | Specific project | `collaboration_role = 'viewer'` |
| **Sheet member** | Specific estimate sheet | `estimate_sheet_members` with role |
| **Share recipient** | Specific publication | Token/password-gated, recipient session |
| **Public viewer** | Specific publication | Password-gated, view-only |

### Axis C: Entitlement
_What has this person paid for or been granted?_

| Entitlement | Monetized? | Current Implementation |
|------------|-----------|----------------------|
| **Workspace membership** | Free (closed beta) | `workspace_members` — granted by workspace admin |
| **Project collaboration** | Free | `project_members` — granted by project admin |
| **Public share access** | Free | Token/password URL — granted by project owner |
| **Client archive subscription** | **Paid** (monthly) | **Missing** — this is Type 3 |
| **Platform admin** | Free (CEO) | Hardcoded email check |

---

## 2. The Four User Types (Corrected Model)

### Type 1 — Project Owner (Internal App User)

| Axis | Value |
|------|-------|
| **Segment** | AEC professional: contractor, architect, QS, engineer |
| **Identity** | Authenticated (Supabase Auth) |
| **Auth state** | Signed in |
| **Primary surface** | `/workshop` — full app |
| **Permissions** | Create/manage/delete projects, estimates, cost library, publications. Grant/revoke collaborator access. Full CRUD. |
| **Entitlement** | Free (workspace owner/admin/member) |
| **Deletion-independent access** | No — if they delete their project, it's gone |
| **Repo status** | ✅ **Exists** — `workspace_members`, `projects`, RLS policies, all CRUD server actions |
| **Risk** | Must not be able to delete projects that have active paid client archive subscriptions |

**Current implementation:**
- `workspace_members.role` ∈ {owner, admin, member, viewer}
- `project_members.role` ∈ {owner, admin, editor, viewer}
- Full workspace-scoped RLS policies
- `preview_bulk_delete_projects()` + `execute_bulk_delete_projects()` via mass deletion governance
- Blocked from deleting projects with active publications

---

### Type 2 — Granted Collaborator / CRUD User (Internal App User)

| Axis | Value |
|------|-------|
| **Segment** | Team members, subcontractors, internal staff |
| **Identity** | Authenticated (Supabase Auth) |
| **Auth state** | Signed in, invited via email |
| **Primary surface** | `/workshop` — scoped to invited project/sheet |
| **Permissions** | Role-scoped: viewer (read), editor (CRUD rows), admin (manage access), owner (full) |
| **Entitlement** | Free (invited by Type 1) |
| **Deletion-independent access** | No |
| **Repo status** | ✅ **Exists** — `project_members`, `estimate_sheet_members`, `collaboration_invitations`, pending invite flow |
| **Risk** | Must not inherit access to deleted projects or escalate beyond their role |

**Current implementation:**
- `collaboration_invitations` — scope: project or estimate, with email, role, expiry
- Invite entry flow: `/invite/[token]` → accept/continue → pending invite bridge
- `project_members` — project-level collaboration with role
- `estimate_sheet_members` — sheet-level collaboration
- `estimate_sheet_access_settings.inherit_project_access` — controls whether sheet inherits project access
- `current_project_access_rank()` — computes effective access rank
- `can_access_project()`, `can_edit_project()`, `can_manage_project_access()`
- `can_access_estimate()`, `can_edit_estimate()`, `can_manage_estimate_access()`
- Self-demotion guard: `can_assign_project_role()` prevents lowering own rank
- Invite revocation: `revoked_at` timestamp, hardened against metadata leaks

---

### Type 3 — Paid Client / Buyer Archive Subscriber

| Axis | Value |
|------|-------|
| **Segment** | Clients, property owners, developers who receive estimates/proposals |
| **Identity** | Authenticated (own account) or identified (email-verified recipient) |
| **Auth state** | Signed in OR strong recipient session |
| **Primary surface** | Client archive portal (new route, e.g., `/client/archive`) |
| **Permissions** | Read-only access to archived estimate sheets and activity history. Comment, approve, deny, request revisions on active publications. |
| **Entitlement** | **Paid monthly subscription** (Stripe) |
| **Deletion-independent access** | ✅ **Yes** — survives source project/estimate deletion |
| **Repo status** | ❌ **Missing entirely** — no billing, no archive tables, no deletion tombstones |
| **Risk** | Highest priority gap. Without this, Archestimator cannot monetize the client side. |

**What must exist that doesn't:**

1. **Billing/subscription infrastructure**
   - Stripe integration (or equivalent)
   - `client_archive_subscriptions` table
   - Monthly/annual pricing tiers
   - Subscription lifecycle: trial → active → past_due → cancelled → expired

2. **Deletion-independent archive repository**
   - `client_archive_snapshots` table — immutable, NOT cascade-deleted
   - Separate from `project_publications.snapshot_json` (which IS cascade-deleted)
   - Stores: project metadata, estimate sheet data, row items, totals, activity history
   - Referenced by subscription, not by live project FK

3. **Deletion tombstone system**
   - `deletion_tombstones` table — records what was deleted, when, and by whom
   - When a Type 1 deletes a project, if Type 3 subscribers exist:
     - Soft-delete or tombstone the project (mark as deleted but preserve archive data)
     - Notify subscribers that the source was removed but their archive remains
     - Prevent hard cascade until all subscriptions expire/are resolved

4. **Recipient identity upgrade path**
   - Type 4 → Type 3: anonymous viewer → identified client → paid subscriber
   - Upgrade triggers: comment, approve, deny, revision request, subscribe
   - Email verification + optional password set
   - Session upgrade from recipient cookie to full auth session

5. **Archive access portal**
   - New route: `/client/archive` or `/archive`
   - Lists all subscribed archives (across multiple projects/contractors)
   - Read-only estimate sheet viewer with activity history
   - Comment/decision history preserved
   - Export capability (PDF, XLSX of archived snapshots)

6. **Security boundary**
   - Archive data must be physically separate from live project data
   - No live-project FK dependencies in archive tables
   - Archive read must NOT go through live-project RLS policies
   - Separate archive-specific RLS policies: "subscriber can read own archives"

---

### Type 4 — Public Share Link Viewer

| Axis | Value |
|------|-------|
| **Segment** | Anyone with the share link |
| **Identity** | Anonymous or session-bound recipient |
| **Auth state** | No account required |
| **Primary surface** | `/share/[token]` — public share page |
| **Permissions** | View proposal (password-gated). View-only unless recipient session exists. |
| **Entitlement** | None (free, time-limited by publication expiry) |
| **Deletion-independent access** | No — if source project is deleted, share link breaks |
| **Repo status** | ⚠️ **Partial** — share page exists with comments/decisions/activity, but no Type 3 upgrade path |

**Current implementation:**
- `project_publications` — token, password_hash, status, snapshot_version, selected_estimate_ids, snapshot_json
- `shared_link_recipients` — email, display_name, recipient_token_hash, delivery_status
- `shared_link_comments` — publication_id, recipient_id, estimate_id, row_id, body, is_internal
- `shared_link_responses` — decision (accepted/declined/revision_requested), note, snapshot_version_at_decision
- `shared_link_events` — event_type (open, comment_add, accept_decision, decline_decision, password_attempt)
- Share page: `/share/[token]` with password gate, tabs, comments, decisions, activity feed
- Security: metadata hiding for password-protected publications, rate-limited comments/decisions, snapshot-version locking

**What's missing for Type 4:**
- Durable identity upgrade path (Type 4 → Type 3 bridge)
- Type 4 cannot "save" or "subscribe to" a proposal after viewing
- If the share link expires or is revoked, the viewer loses access completely
- No way to retain archive access after publication lifecycle ends

---

## 3. The Type 4 → Type 3 Bridge

This is the critical transition point. The rule:

> **Type 4 becomes Type 3 when the person needs durable identity** — commenting, approving, denying, requesting revisions, or subscribing to archive access.

### Current bridge support (exists):

- Share page hides comment/decision UI unless there is a valid `shared_link_recipients` session
- `recipient_token_hash` provides a form of identified-but-not-authenticated access
- Comments and responses are tied to `recipient_id` (not auth user)

### Bridge gaps:

| Action | Current behavior | Needed behavior |
|--------|-----------------|-----------------|
| Comment | Requires recipient session cookie | Triggers identity capture: email verification → optional account creation |
| Approve/Deny | Requires recipient session cookie | Triggers identity capture + prompts archive subscription offer |
| Revision request | Requires recipient session cookie | Triggers identity capture + prompts archive subscription offer |
| "Save this proposal" | Not implemented | New CTA: "Subscribe to archive" → Stripe checkout |
| "View my archives" | Not implemented | New route: `/client/archive` with all subscribed archives |

---

## 4. Permission Inheritance Map

```
Platform Admin (CEO)
  └── All workspaces, all projects, all data

Workspace Owner/Admin
  └── Workspace
      ├── Projects (CRUD + manage access)
      │   ├── Estimates (CRUD)
      │   │   ├── Estimate Nodes (CRUD)
      │   │   └── Estimate Row Items (CRUD)
      │   ├── Publications (create/manage/revoke)
      │   │   └── Share Link → Type 4 viewers
      │   └── Project Members (manage)
      │       └── Type 2 collaborators (role-scoped)
      └── Cost Library (CRUD)

Project Collaborator (Type 2)
  └── Scoped to project or estimate sheet
      ├── Role determines CRUD level
      └── Inherits sheet access unless overridden

Paid Client Subscriber (Type 3)
  └── Own archive repository (independent)
      ├── Read-only archived estimate snapshots
      ├── Preserved activity/comment/decision history
      ├── Survives source project deletion
      └── Export capability

Public Share Viewer (Type 4)
  └── Specific publication (token-gated)
      ├── Password-gated view
      ├── Comments/decisions only with recipient session
      └── No durable access
```

---

## 5. Risk Matrix

| Risk | Severity | Affected Types | Mitigation |
|------|----------|---------------|------------|
| Cascade deletion destroys paid archives | **Critical** | Type 3 | Deletion tombstones + independent archive tables |
| Active publication blocks deletion but doesn't protect archive | **High** | Type 3 | Archive snapshots must be created at publication time, not at deletion time |
| Type 4 can comment without identity capture | **Medium** | Type 3, 4 | Identity capture gate before first stateful action |
| Shared link expires → client loses access | **Medium** | Type 4 | Archive subscription offer before expiry |
| Self-demotion/escalation via collaboration roles | **Low** | Type 1, 2 | Already hardened: `prevent_profile_role_self_update`, `can_assign_project_role` guard |
| Revoked invite metadata leakage | **Low** | Type 2 | Already hardened: `resolve_collaboration_invitation` returns null metadata for revoked tokens |

---

## 6. Notion Database Alignment

The Notion database "Archestimator User and Access Matrix" should contain these four rows with the following fields:

| Field | Type 1 | Type 2 | Type 3 | Type 4 |
|-------|--------|--------|--------|--------|
| Segment | AEC professional | Team/subcontractors | Client/buyer/developer | Anyone with link |
| Auth state | Signed in | Signed in | Signed in OR identified | Anonymous/session |
| Primary surface | `/workshop` | `/workshop` (scoped) | `/client/archive` | `/share/[token]` |
| Edit rights | Full CRUD | Role-scoped CRUD | None (read-only) | None |
| Comment/decision rights | Full | Role-scoped | Yes (on active pubs) | Yes (with recipient session) |
| Paid entitlement | No | No | **Yes** (monthly) | No |
| Deletion-independent access | No | No | **Yes** | No |
| Risk | Accidental paid-archive deletion | Role escalation | Missing infrastructure | Identity capture gap |
| Repo status | ✅ Exists | ✅ Exists | ❌ Missing | ⚠️ Partial |

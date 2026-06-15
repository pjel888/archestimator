# 02 — Repo Audit: Archestimator User & Access Architecture

**Status:** Planning  
**Audit date:** 2026-06-04  
**Repo head:** `main` branch, `/Users/philiplewis/archestimator`

---

## 1. Audit Scope

This audit covers all database tables, RLS policies, server actions, API routes, and client-side code related to:

- User identity and authentication
- Workspace/project/estimate access control
- Collaboration and invitation flows
- Publication and shared link architecture
- Deletion and data lifecycle management
- Any existing billing, subscription, or archive infrastructure

**Source of truth:** Live repo files + Supabase migration history + `.ai/` documentation.

---

## 2. What Exists (by User Type)

### Type 1 — Project Owner: ✅ COMPLETE

#### Database Tables
| Table | Purpose | Status |
|-------|---------|--------|
| `workspaces` | Multi-tenant workspace container | ✅ |
| `workspace_members` | Maps users → workspaces with role | ✅ |
| `profiles` | User profile with `app_role` (ceo/admin/member) | ✅ |
| `projects` | Project with workspace FK | ✅ |
| `estimates` | Estimate sheet with project FK | ✅ |
| `estimate_nodes` | Hierarchical estimate tree | ✅ |
| `estimate_row_items` | Line items with cost data | ✅ |
| `cost_library_items` | Reusable cost components | ✅ |

#### RLS Policies
- `members can view workspaces` — workspace-scoped
- `authenticated users can create owned workspaces` — creator = owner
- `workspace admins can update workspaces`
- `members can manage projects` — full CRUD for workspace members
- `members can manage estimates` — via project → workspace check
- `members can manage cost library items` — workspace-scoped
- `members can manage estimate nodes` — via estimate → project → workspace
- `members can manage estimate row items` — via estimate → project → workspace
- Platform admin bypass policies on all tables

#### Access Control Functions
| Function | Purpose |
|----------|---------|
| `is_workspace_member(id)` | Membership check |
| `is_workspace_admin(id)` | Admin/owner check |
| `is_workspace_editor(id)` | Editor+ check (owner/admin/member) |
| `is_platform_admin()` | CEO/admin global bypass |
| `current_user_profile()` | Returns authenticated user's profile |
| `handle_new_auth_user()` | Auto-creates profile on sign-up |
| `resolve_app_role_for_email()` | CEO email → ceo role |
| `prevent_profile_role_self_update()` | Blocks self-promotion |

#### Server Actions & Routes
- `src/lib/projects/actions.ts` — project CRUD
- `src/lib/estimates/actions.ts` — estimate/row CRUD
- `src/lib/component-library/` — cost library CRUD
- `/api/projects/images/route.ts` — project image upload
- `/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts` — XLSX export

---

### Type 2 — Granted Collaborator: ✅ COMPLETE

#### Database Tables
| Table | Purpose | Status |
|-------|---------|--------|
| `project_members` | Project-level collaboration with role | ✅ |
| `estimate_sheet_access_settings` | Inheritance control per estimate | ✅ |
| `estimate_sheet_members` | Sheet-level collaboration | ✅ |
| `collaboration_invitations` | Pending/active/revoked invitations | ✅ |

#### Collaboration Roles
- `collaboration_role` enum: `owner`, `admin`, `editor`, `viewer`
- `collaboration_role_rank()` — numeric rank for comparison

#### Access Control Functions
| Function | Purpose |
|----------|---------|
| `current_project_access_rank(id)` | Computes effective access (workspace + project member) |
| `can_access_project(id)` | Any access check |
| `can_edit_project(id)` | Edit check (owner/admin/editor) |
| `can_manage_project_access(id)` | Admin+ check |
| `can_assign_project_role(...)` | Role assignment with self-demotion guard |
| `has_other_project_access_manager(...)` | Prevents last-admin removal |
| `can_manage_project_member(...)` | Member management guard |
| `current_estimate_access_rank(id)` | Effective estimate access |
| `can_access_estimate(id)` | Any estimate access |
| `can_edit_estimate(id)` | Edit check with inheritance |
| `can_manage_estimate_access(id)` | Admin+ check |
| `can_assign_estimate_role(...)` | Role assignment guard |
| `estimate_inherits_project_access(id)` | Inheritance check |

#### Invite Flow
- `collaboration_invitations` — scope (project/estimate), email, role, expiry, revocation
- `src/lib/collaboration/invite-entry.ts` — token-based invite resolution
- `src/lib/collaboration/pending-invite.ts` — pending invite bridge
- `/invite/[token]/page.tsx` — invite landing page
- `/invite/[token]/accept/route.ts` — accept handler
- `/invite/[token]/continue/route.ts` — continue handler
- `/workshop/pending-invite/route.ts` — pending invite resolution
- `resolve_collaboration_invitation(text)` — RPC with revoked-null hardening
- Realtime presence: `src/hooks/use-project-presence.ts`
- Cursor broadcast: `src/hooks/use-estimate-cursor-broadcast.ts`

---

### Type 3 — Paid Client Archive Subscriber: ❌ MISSING

#### What must exist but doesn't:

**Billing/Subscription:**
- ❌ Stripe integration
- ❌ `client_archive_subscriptions` table
- ❌ Subscription lifecycle management
- ❌ Pricing tiers
- ❌ Payment webhook handling
- ❌ Invoice history

**Archive Repository:**
- ❌ `client_archive_snapshots` table (deletion-independent)
- ❌ Archive snapshot creation at publication time
- ❌ Archive read API routes
- ❌ Archive export capability

**Deletion Tombstones:**
- ❌ `deletion_tombstones` table
- ❌ Soft-delete or tombstone mechanism for projects with active subscribers
- ❌ Subscriber notification on source deletion

**Client Portal:**
- ❌ `/client/archive` route
- ❌ Client-facing archive list view
- ❌ Archive estimate sheet viewer
- ❌ Archive activity/comment/decision history view

**Identity Upgrade Path:**
- ❌ Type 4 → Type 3 transition flow
- ❌ Email verification for share-link viewers
- ❌ Optional password/account creation from share page
- ❌ Subscription prompt after stateful action

#### Current Barriers:

1. **CASCADE DELETION:** `project_publications` references `projects` with `ON DELETE CASCADE`. When a Type 1 deletes a project, all publications, snapshots, comments, responses, and events are destroyed. There is no "soft landing" for client data.

2. **SNAPSHOT IS INLINE:** `project_publications.snapshot_json` is a JSONB column on the publication row. It's not a separate table with its own lifecycle. It dies with the publication.

3. **NO TOMBSTONE PATTERN:** `mass_deletion_events` records that a deletion happened, but does not preserve the data. It's an audit log, not an archive.

4. **NO BILLING INFRASTRUCTURE:** The entire codebase has zero billing, Stripe, or subscription code. No payment tables, no webhook handlers, no entitlement checks.

---

### Type 4 — Public Share Link Viewer: ⚠️ PARTIAL

#### What Exists

**Publication Infrastructure:**
| Component | Status |
|-----------|--------|
| `project_publications` table | ✅ |
| `project_publication_events` table | ✅ |
| `shared_link_recipients` table | ✅ |
| `shared_link_comments` table | ✅ |
| `shared_link_responses` table | ✅ |
| `shared_link_events` table | ✅ |
| Publication manager UI | ✅ (`ProjectPublicationHeader.tsx`) |
| Share receiver page | ✅ (`/share/[token]/page.tsx`) |
| Password protection | ✅ (`/api/share/[token]/password/route.ts`) |
| Comment posting (recipient) | ✅ (`insert_client_comment` RPC) |
| Decision submission | ✅ (`submit_client_response` RPC) |
| Activity feed | ✅ |
| Recipient email composer | ✅ |
| Share estimate tree view | ✅ |
| Security headers | ✅ |

**Security Hardening (completed):**
- Password-protected share metadata hidden from OG tags
- Comment/decision snapshot-version locking (prevents stale decisions)
- Stale recipient session comment blocking
- Public rate breakdown stripping (unit costs hidden from public)
- Share tree designation DoS protection
- Malformed UUID DoS protection for comments
- Revoked invite metadata leak hardening
- Share image URL validation (no client tracking)

#### What's Missing for Type 4

1. **No "Save/Subscribe" CTA** — viewers can view and comment, but cannot retain access
2. **No expiry warning with upgrade prompt** — when publication is about to expire, viewer gets no offer to subscribe
3. **No identity persistence** — recipient session is cookie-bound, not account-bound
4. **No cross-publication view** — each share link is isolated; no dashboard of "all proposals I've received"

---

## 3. Deletion Architecture Analysis

### Current Deletion Flow (Project)

```
1. User triggers delete in UI
2. Frontend calls preview_bulk_delete_projects(ids, acting_user_id)
   → RPC checks: can_manage_project_access + active publications
   → Returns: eligibleIds, blocked, previewHash
3. If ok, frontend calls execute_bulk_delete_projects(ids, previewHash, acting_user_id, correlation_id)
   → RPC validates preview hash matches
   → DELETE FROM projects WHERE id = ANY(eligible)
   → CASCADE deletes: estimates → estimate_nodes → estimate_row_items
   → CASCADE deletes: project_publications → shared_link_* tables
   → CASCADE deletes: project_members
   → INSERT INTO mass_deletion_events (audit log only)
4. Storage cleanup: project images removed from Supabase Storage
```

### Critical Cascade Path

```
projects (DELETE)
  ├── estimates (CASCADE)
  │   ├── estimate_nodes (CASCADE)
  │   │   └── estimate_row_items (CASCADE)
  │   ├── estimate_sheet_access_settings (CASCADE)
  │   └── estimate_sheet_members (CASCADE)
  ├── project_publications (CASCADE) ← THE PROBLEM
  │   ├── shared_link_recipients (CASCADE)
  │   ├── shared_link_comments (CASCADE)
  │   ├── shared_link_responses (CASCADE)
  │   └── shared_link_events (CASCADE)
  ├── project_members (CASCADE)
  └── collaboration_invitations (CASCADE)
```

**Impact:** Once a project is deleted, ALL client-facing data is gone. Forever. This includes:
- Proposal snapshots sent to clients
- Client comments and approval decisions
- Activity history
- Recipient email records

### What Must Change

The `project_publications` cascade must be broken OR a parallel archive table must be populated BEFORE deletion. The archive must survive independently.

---

## 4. Active Publication Block Analysis

### Current Block Behavior

`preview_bulk_delete_projects` classifies each project as:
- `eligible` — can be deleted
- `blocked` — has an active published shared link
- `forbidden` — user lacks permission
- `not_found` — not in workspace

### Block Criteria

A publication blocks deletion when:
```sql
pp.status = 'published'
AND pp.revoked_at IS NULL
AND (pp.expires_at IS NULL OR pp.expires_at > now())
```

### Gaps in Block Logic

1. **No "has subscribers" check** — deletion is only blocked by active publications, not by the existence of paid subscribers
2. **No "subscribers need archive" check** — if all publications are expired/revoked, deletion proceeds even if clients paid for archive access
3. **Revoke-then-delete bypass** — a Type 1 could revoke all publications, wait, then delete the project
4. **No tombstone fallback** — once `execute_bulk_delete_projects` runs, data is physically gone

---

## 5. Summary: Implementation Gap Matrix

| System | Type 1 | Type 2 | Type 3 | Type 4 |
|--------|--------|--------|--------|--------|
| Auth/identity | ✅ | ✅ | ❌ | ⚠️ (session only) |
| Permissions/RLS | ✅ | ✅ | ❌ | ⚠️ (token-gated) |
| CRUD operations | ✅ | ✅ (role-scoped) | ❌ | ❌ |
| Invite flow | ✅ | ✅ | ❌ | N/A |
| Publication/sharing | ✅ | ✅ | ❌ | ⚠️ (partial) |
| Comments/decisions | ✅ | ✅ | ❌ | ✅ (recipient) |
| Billing/subscription | N/A | N/A | ❌ | N/A |
| Archive repository | N/A | N/A | ❌ | N/A |
| Deletion tombstone | N/A | N/A | ❌ | N/A |
| Client portal | N/A | N/A | ❌ | N/A |
| Identity upgrade | N/A | N/A | ❌ | ❌ |
| Export for clients | ✅ (XLSX) | ✅ | ❌ | ❌ |

---

## 6. Files Referenced in This Audit

### Migration Files
- `supabase/migrations/20260518090000_archestimator_core_schema.sql` — core schema + RLS
- `supabase/migrations/20260518100000_auth_profiles_ceo_access.sql` — profiles, CEO access
- `supabase/migrations/20260526142913_project_sheet_collaboration_access.sql` — collaboration tables + RPCs
- `supabase/migrations/20260527120000_project_client_publication.sql` — publication tables
- `supabase/migrations/20260528220000_project_shared_link_overhaul.sql` — V2 shared link overhaul
- `supabase/migrations/20260603160000_mass_deletion_governance.sql` — mass deletion preview/execute

### Source Files
- `src/lib/auth/` — auth utilities
- `src/lib/collaboration/` — collaboration logic
- `src/lib/share/` — share page reconstruction
- `src/lib/publication/` — publication actions, snapshots, security
- `src/hooks/use-shared-link-session.ts` — recipient session
- `src/app/share/[token]/` — public share page
- `src/app/invite/[token]/` — invite entry flow

### Documentation
- `.ai/06_specs/feature-inventory.md` — feature ↔ spec cross-reference
- `.ai/10_state/current-state.md` — current state narrative
- `.ai/06_specs/teamspaces-collaboration-spec.md` — collaboration spec
- `.ai/03_plans/project-shared-link-overhaul/` — shared link plan

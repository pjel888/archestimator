# UX Signifiers, Project Listing, and Visibility Study

**Date:** 2026-05-30
**Purpose:** Document every place collaboration invite status is (and isn't) shown in the UI — what the inviter sees when an invite is pending, what the invitee sees after acceptance, what happens on removal, and where signifiers are missing.

---

## Current State Audit: Where Invite Status Is Shown

| Location | Component | Shows pending invites? | Shows shared/role context? | Shows removal risk? |
|---|---|---|---|---|
| Workshop homebase | `InviteResolutionBanner` | ✅ During active accept flow only | ❌ | ❌ |
| Workshop homebase | `ProjectList` / `EstimateList` (favorites) | ❌ | ❌ | ❌ |
| Project list page | `LiveProjectCard` | ❌ | ✅ (badges, role, borders, "Shared by") | ❌ |
| Project list page | Filter tabs (All/Owned/Shared) | ❌ | ✅ | ❌ |
| Project header rail | `ProjectTeamspaceHeader` avatars | ❌ | ✅ (accepted only) | ❌ |
| Teamspaces modal | `ProjectTeamspaceHeader` modal | ✅ "Pending {Role}" list | ✅ Full team overview | ❌ |
| Project dashboard | `ProjectDashboardClient` | ❌ | ❌ | ❌ |
| Main sidebar | `MainSidebar` | ❌ | ❌ | ❌ |
| Invite landing | `invite/[token]/page.tsx` | ✅ Preview/accept/errors | ❌ | ❌ |

**Finding:** Pending invite status is only visible inside the Teamspaces modal on a specific project page. There is zero indication anywhere else — not on project cards, not on the home screen, not in the sidebar.

---

## UX Path 1: Inviter's View — "I invited someone, are they pending?"

### Current state

The manager invites `alice@example.com` to a project. What they see:

| Surface | What they see | What's missing |
|---|---|---|
| **Right after sending** | Green status text: "Invite email sent." or "Existing user added." | No visual confirmation that it actually went through |
| **Teamspaces modal** | Alice appears under "Pending Editor" with "Copy invite link" button | No status indicator for "sent" vs "delivered" vs "opened" |
| **Project cards (list page)** | The project card shows normal "Owned" state — no indication there are pending invites | No "2 pending invites" badge/chip on the card |
| **Workshop homebase** | Favorites show normal project entry — no collaboration context at all | No indicator on the favorited project tile |
| **Days later** | No reminder that Alice never accepted. The pending invite stays in the modal until it expires (14 days) or the manager revokes it | No "Alice hasn't accepted — 10 days remaining" nudge |

### What should exist

**Pending-invite signifier on project cards:**
```
┌──────────────────────────────────────────┐
│ ★ Lewis Residence                  ↗    │
│ Lewis Family                         🟢  │
│ Sucat, Muntinlupa                         │
│                      PROJ-001    Open →   │
│ ┌──────────────────────────────────────┐ │
│ │ 2 pending invites                    │ │
│ └──────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

**Pending-invite chip/badge (compact variant for card footers or header rails):**
```
[👤 2 pending]
```

**States to surface:**
- `sent` — email was dispatched (or attempted)
- `delivered` — email provider confirmed delivery
- `opened` — invitee clicked the link (via `last_opened_at` on the token/invitation row)
- `stale` — >7 days without acceptance, approaching expiry

---

## UX Path 2: Invitee's View — "I was invited, now what?"

### Path A: Invitee hasn't accepted yet

**Email arrives → clicks link → invite landing page.** This is the only place the invitee sees the invite context before acceptance.

**What the invitee does NOT see:**
- No badge/dot on the main sidebar (e.g., "🔴 1" on Projects)
- No "You have a pending invite" banner on the workshop homebase (unless mid-flow from the bridge cookie)
- The project does NOT appear in the project list page at all — `listCurrentWorkspaceProjects()` only queries `project_members` and `estimate_sheet_members`, not `collaboration_invitations`

### Path B: Invitee has accepted

After acceptance, the project appears in the project list with the appropriate access badge:

```
┌──────────────────────────────────────────┐
│ ★ Lewis Residence                  ↗    │
│ Lewis Family                    Shared   │
│ Sucat, Muntinlupa              project   │
│                               Editor     │
│ Shared by Studio Partner                 │
│                      PROJ-001    Open →   │
└──────────────────────────────────────────┘
```

The card shows:
- **Emerald left border** (project-member) or **sky blue left border** (sheet-member)
- **"Shared project"** emerald badge or **"Sheet-only"** sky blue badge
- **Role label** (Editor, Viewer, etc.)
- **"Shared by {workspace}"** or **"N shared sheets"**

**What the invitee does NOT see anywhere:**
- No "You were added to {project} by {inviter}" notification/banner after acceptance
- No distinction on the workshop homebase favorites — shared projects look identical to owned projects
- No reminder that they're a member of someone else's project (and can be removed at any time)

### Path C: Invitee is removed

When the project manager removes the invitee:
- The `project_members` row is deleted
- `revalidatePath("/workshop/projects")` triggers a re-fetch
- The project **silently disappears** from the invitee's project list
- If the invitee had the project favorited, the favorite persists but the project is gone — potentially showing a broken state
- **No notification. No "You were removed from {project}" banner. No email.**

---

## UX Path 3: Project List — "Which of these are mine vs. shared?"

### Current state (what exists)

The `/workshop/projects` page has filter tabs when shared projects exist:

```
[ All ] [ Owned ] [ Shared ]
```

Shared projects get visual treatment on `LiveProjectCard`:
- Colored left border (emerald = project-member, sky blue = sheet-member)
- Access badge chip
- Role + ownership context text

### What's missing

| Gap | Detail |
|---|---|
| **No pending-invite signifier** | Cards don't show "2 pending invites" for projects the current user owns |
| **No "invited but not accepted" projects in the list** | Projects the user was invited to but hasn't accepted don't appear at all — they're invisible until accepted |
| **No removal risk indicator** | Shared projects don't show "You can be removed by the owner" or any ownership context that clarifies this isn't their project |
| **No "last active" or "member since"** | Cards show `updated_at` (project-level) but no collaboration-specific timestamps |
| **No owner/creator distinction on shared cards** | It shows workspace name but not the specific owner's name |
| **No bulk-actions context** | Can't filter by "projects I can leave" or "projects where I'm viewer only" |

### What shared cards should show

**Accepted shared project (current — good):**
```
[emerald border] Shared project | Editor | Shared by Studio Partner
```

**Invited but not accepted (missing):**
```
[amber/yellow border] Pending invite | Editor | Invited by Philip Lewis | [Accept →]
```

**Removal risk context (missing):**
```
[emerald border] Shared project | Viewer | Owned by Studio Partner
"You have viewer access. The project owner can change or remove your access."
```

---

## UX Path 4: Workshop Homebase Favorites — "Which favorites are mine?"

### Current state

The Workshop homebase shows favorited projects in a sidebar panel:

```
[📁] Lewis Residence
     PROJ-001 · Lewis Family · May 28    [★]
```

**No collaboration context whatsoever.** Owned, shared, sheet-only — all rendered identically.

### What's missing

| Gap | Detail |
|---|---|
| **No access badge** | Can't tell owned vs shared at a glance |
| **No role indicator** | Can't tell if you're owner, editor, or viewer |
| **No pending-invite indicator** | Can't see which favorite has pending invites |
| **No removal risk indicator** | A shared project that you're only a viewer on looks the same as one you own |
| **No "shared with" context** | No owner workspace or inviter name |

### Recommended treatment

```
Owned favorite:
  [📁] Lewis Residence
       PROJ-001 · Lewis Family · May 28    [★]

Shared favorite (project-member):
  [📁] Clinic Fit-Out                    [Shared]
       Editor · Shared by Studio Partner      [★]

Shared favorite (sheet-only):
  [📁] Office Tower                      [Sheet]
       Viewer · 2 shared sheets              [★]

Favorite with pending invites (owner's view):
  [📁] Lewis Residence                [2 pending]
       PROJ-001 · Lewis Family · May 28    [★]
```

---

## UX Path 5: Sidebar Navigation — "Do I have pending invites?"

### Current state

The `MainSidebar` has no badges, dots, or counters of any kind:

```
  Workshop
  Projects
  Components
  Templates
  Settings
```

### What should exist

```
  Workshop
  Projects            🔴 1
  Components
  Templates
  Settings
```

Or alternatively, a dedicated notification center or bell icon in the top bar that surfaces:
- Pending invites received
- Invites you sent that haven't been accepted
- Collaborator role changes
- Removal notifications

---

## UX Path 6: Removal Flow — "What happens when I'm removed?"

### Inviter's view (the remover)

```
1. Opens Teamspaces modal
2. Finds collaborator in the list
3. Clicks trash icon → confirmation? (currently: no confirmation, immediate removal)
4. runAccessAction() → removeProjectCollaborator()
5. Collaborator disappears from the modal sidebar
6. Status: "Project-specific access removed."
```

**Issues:**
- No confirmation dialog before removal
- No "Are you sure? {name} will lose access to this project." warning
- No "Notify {name} of removal" option
- No audit trail visible to the inviter (the `collaboration_audit_events` table records it, but there's no UI to view it)

### Invitee's view (the removed person)

```
1. No notification received — no email, no in-app banner
2. Project silently disappears from project list on next page load
3. If they were on the project page when removed, they get an auth error on next action
4. Their favorites persist but the project may be inaccessible
```

**Issues:**
- Complete absence of notification
- No "You were removed from {project}" state
- If favorited, the favorite entry may show a broken/removed project
- No explanation — the user wonders "where did that project go?"

### What should exist

**For the inviter (confirmation):**
```
┌─────────────────────────────────────┐
│ Remove Alice Chen?                  │
│                                     │
│ Alice will lose editor access to    │
│ Lewis Residence and all its         │
│ estimate sheets.                    │
│                                     │
│ [ ] Notify Alice of removal         │
│                                     │
│      [ Cancel ]  [ Remove ]         │
└─────────────────────────────────────┘
```

**For the invitee (notification):**
```
┌─────────────────────────────────────┐
│ Access removed                      │
│                                     │
│ You no longer have access to        │
│ Lewis Residence.                    │
│                                     │
│ If you believe this was a mistake,  │
│ contact Philip Lewis.               │
│                              [ OK ] │
└─────────────────────────────────────┘
```

**For the removed person visiting a favorited project:**
```
┌─────────────────────────────────────┐
│ Unavailable                         │
│                                     │
│ Lewis Residence is no longer        │
│ shared with you. The project        │
│ owner may have changed your access. │
│                                     │
│            [ Remove from favorites ] │
└─────────────────────────────────────┘
```

---

## Cross-Surface Signifier Placement Map

### Signifier: "You have pending invites" (for invitee)

| Surface | Priority | Treatment |
|---|---|---|
| Main sidebar (Projects nav item) | **P0** | Red dot with count: `Projects 🔴 1` |
| Workshop homebase (banner) | **P0** | Persistent banner: "You have 1 pending project invite" with link to accept |
| Project list page (banner) | **P1** | Banner at top: "You have pending invites" with inline accept buttons |
| Email | **P0** | Already exists (Supabase invite email) but needs invite-link enablement |

### Signifier: "This project has pending invites" (for inviter/owner)

| Surface | Priority | Treatment |
|---|---|---|
| Project card (list page) | **P0** | Chip: "2 pending" in amber/muted, below the project info |
| Workshop homebase (favorites) | **P1** | Compact badge: `[2]` on the favorited project row |
| Project header rail | **P1** | Small dot/badge on the Teamspaces gear icon |
| Teamspaces modal | **P0** | Already exists — "Pending {Role}" section with email + role |

### Signifier: "This is a shared project" (for invitee)

| Surface | Priority | Treatment |
|---|---|---|
| Project card (list page) | **P0** | Already exists — emerald/sky border, access badge, role + owner |
| Workshop homebase (favorites) | **P1** | Compact badge: `Shared` or `Sheet` chip on favorited project row |
| Project header | **P1** | Already exists — Teamspaces rail shows collaborator avatars |
| Project dashboard | **P2** | Subtle "Shared project · Editor" label below project name |

### Signifier: "Your access was removed" (for removed invitee)

| Surface | Priority | Treatment |
|---|---|---|
| Workshop homebase (banner) | **P0** | "Access removed" banner with project name and "Remove from favorites" action |
| Project list page | **P1** | The project disappears (current behavior) — but should also clear from favorites |
| Project page (if still open) | **P1** | Error state: "You no longer have access to this project" |
| Email | **P2** | Optional: removal notification email (opt-in by remover) |

---

## Data Layer: What's Needed That Doesn't Exist

The repository layer (`workspace-repository.ts`) needs these additional queries to support the signifiers above:

### 1. Pending invites received by current user
```sql
SELECT i.*, p.name, p.project_code
FROM collaboration_invitations i
JOIN projects p ON p.id = i.project_id
WHERE i.email = currentUserEmail
  AND i.lifecycle_state = 'pending'
  AND i.expires_at > now()
```

### 2. Pending invites sent for projects the current user owns
```sql
SELECT i.*, count(*) as pending_count
FROM collaboration_invitations i
JOIN projects p ON p.id = i.project_id
WHERE p.workspace_id = currentWorkspaceId
  AND i.lifecycle_state = 'pending'
  AND i.expires_at > now()
GROUP BY i.project_id
```

### 3. Favorites cleanup on removal
When a user is removed from a project, any `project_favorites` rows for that user+project should be cleaned up (or the favorite should be checked against current access before rendering).

### 4. `collaboration_invitations` join in `listCurrentWorkspaceProjects()`
To show "pending invite" projects in the invitee's project list, the query needs to include invitations where `email = currentUserEmail AND lifecycle_state = 'pending'`.

---

## Summary of Missing UX States

| # | State | Current visibility | Recommended visibility |
|---|-------|-------------------|----------------------|
| 1 | Invite sent, not yet accepted (inviter's view) | Only in Teamspaces modal | Project card badge, homebase favorites badge, header dot |
| 2 | Invite received, not yet accepted (invitee's view) | Only via email link | Sidebar dot, workshop banner, project list entry (pending state) |
| 3 | Invite accepted successfully | Silently redirected, no confirmation | Success banner on next page load |
| 4 | Invite expired | Only on invite landing page | Notification to inviter: "Alice's invite expired" |
| 5 | Shared project (accepted, active) | On project cards only | Also on workshop homebase favorites, project header context |
| 6 | Removed from shared project | Nothing — project disappears | Banner notification, email (optional), favorites cleanup |
| 7 | Role changed on shared project | Nothing | Banner: "Your role on {project} changed to {role}" |
| 8 | Removed collaborator (inviter confirmation) | No confirmation dialog | Confirmation modal with optional email notification |

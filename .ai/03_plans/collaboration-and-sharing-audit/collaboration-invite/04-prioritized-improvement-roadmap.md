# 04 — Prioritized Improvement Roadmap: Collaboration Invite System

**Date:** 2026-05-30
**Purpose:** Phased plan (P0–P4) with concrete code snippets, exact file paths, and expected blast radius for each change.

---

## Phase 0 — Unblock the Flow (Config-Only, No Code Changes)

### P0.1: Configure Supabase Auth Email

**What:** Set up an email provider in the Supabase dashboard for project `ebxxqidacheyapmmzavr`.

**Steps:**
1. Dashboard → Authentication → Email → Configure SMTP or enable built-in email service
2. Verify sending domain
3. Customize invite template at Auth → Email Templates → Invite
4. Test: send a test email from the dashboard

**Expected blast radius:** Zero code changes. Pure dashboard configuration.

### P0.2: Enable Invite Entry Environment Variables

**What:** Add the two missing env vars.

**Files touched:** `.env.local`, `.env.example`

**Changes:**
```bash
# .env.local
PROJECT_INVITE_ENTRY_ENABLED=true
ARCHESTIMATOR_INVITE_TOKEN_PEPPER=<output of: openssl rand -hex 32>
```

```bash
# .env.example (add)
PROJECT_INVITE_ENTRY_ENABLED=false
ARCHESTIMATOR_INVITE_TOKEN_PEPPER=
```

**Expected blast radius:** Zero code changes. Enables existing but dormant `/invite/[token]` pages and token generation in `issueInviteEntryLink()`.

### P0.3: Run E2E Smoke Against Linked Remote

**What:** Verify the full flow works end-to-end.

```bash
ARCHESTIMATOR_E2E_INVITE_ENTRY=1 \
PROJECT_INVITE_ENTRY_ENABLED=true \
ARCHESTIMATOR_INVITE_TOKEN_PEPPER=<pepper-value> \
bun run test:e2e -- e2e/project-invite-entry.spec.ts --project=chromium
```

**Expected blast radius:** Test-only. No production impact.

---

## Phase 1 — Security Hardening, Fail-Closed Messaging & Observability

### P1.1: POST-Only Invite Acceptance

**What:** Prevent browser pre-fetch from triggering invite acceptance. Make GET render confirmation page only; POST performs the mutation.

**File:** `src/app/invite/[token]/accept/route.ts`, `src/app/invite/[token]/page.tsx`

**Change:**
```typescript
// accept/route.ts — split GET vs POST:
export async function GET(request: Request, { params }: InviteRouteContext) {
  // Render confirmation page only — no RPC call
  return renderAcceptConfirmation(request, params);
}

export async function POST(request: Request, { params }: InviteRouteContext) {
  // Perform mutation: call accept_collaboration_invitation RPC
  return acceptInvite(request, { params });
}
```

```tsx
// page.tsx — replace <a> tag with <form>:
<form action={`/invite/${encodeURIComponent(rawToken)}/accept`} method="POST">
  <button type="submit" className={inviteActionClassName}>
    Accept invite
  </button>
</form>
```

**Blast radius:** Medium. Changes accept route handler and invite page link. Existing E2E test (`project-invite-entry.spec.ts`) uses `page.getByRole("link", { name: "Accept invite" }).click()` — update to use form submission.

### P1.2: Durable Rate Limiting

**What:** Implement DB-backed rate limiting for all invite endpoints (resolution, acceptance, bridge creation, invite creation, resend). Follow the design in `../../06-performance-and-observability-plan.md`.

**Files:** New `src/lib/collaboration/rate-limit.ts`, new migration `supabase/migrations/YYYYMMDDHHMMSS_collaboration_rate_limits.sql`

**Migration:**
```sql
create table if not exists public.rate_limits (
  key_hash text not null,              -- SHA-256 of (namespace:entity_key)
  window_start timestamptz not null,   -- normalized to minute boundary
  count int not null default 1,
  expires_at timestamptz not null,
  primary key (key_hash, window_start)
);

create index rate_limits_expires_idx on public.rate_limits(expires_at);
```

**Rate limiter utility (`rate-limit.ts`):**
```typescript
import { createHash } from "node:crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function hashKey(namespace: string, ...parts: string[]) {
  return createHash("sha256").update(`${namespace}:${parts.join(":")}`).digest("hex").slice(0, 32);
}

function normalizeWindow(now: number, windowMs: number) {
  return new Date(Math.floor(now / windowMs) * windowMs).toISOString();
}

export async function checkRateLimit(
  namespace: string,
  keyParts: string[],
  { maxRequests, windowMs, retryAfterMs }: { maxRequests: number; windowMs: number; retryAfterMs: number }
): Promise<{ allowed: true } | { allowed: false; retryAfter: number }> {
  const key = hashKey(namespace, ...keyParts);
  const now = Date.now();
  const window = normalizeWindow(now, windowMs);
  const expiresAt = new Date(now + windowMs + 60_000).toISOString();

  // Best-effort cleanup of expired rows
  try {
    await supabase.from("rate_limits").delete().lt("expires_at", new Date().toISOString());
  } catch {}

  const { error } = await supabase.from("rate_limits").upsert(
    { key_hash: key, window_start: window, count: 1, expires_at: expiresAt },
    { onConflict: "key_hash,window_start", count: supabase.raw("rate_limits.count + 1") }
  );

  // Read back current count
  const { data } = await supabase.from("rate_limits").select("count").eq("key_hash", key).eq("window_start", window).single();
  const count = data?.count ?? 1;

  if (count > maxRequests) {
    return { allowed: false, retryAfter: Math.ceil(retryAfterMs / 1000) };
  }
  return { allowed: true };
}
```

**Endpoints to rate-limit (see `05-security-threat-model-and-hardening.md` for full matrix):**
- `/invite/[token]` resolution: 30/min per IP+token_hash
- `/invite/[token]/accept`: 5/min per IP+user_id+token_hash
- `/invite/[token]/continue`: 10/min per IP+token_hash
- Invite creation server action: 20/hour per user_id+project_id
- Invite resend: 5/hour per user_id+invitation_id

**Blast radius:** Medium. New table, new lib module, new rate-limit checks in 5 endpoints. Additive — existing flows unchanged unless rate limit is exceeded.

### P1.3: Fail-Closed Config & Accurate Messaging

**What:** Never show "Invite email sent." when delivery is uncertain. Use accurate, conditional messaging. Detect missing configuration and surface it clearly.

**File:** `src/lib/collaboration/actions.ts`, lines 429-432 and 443-445

**Change:**
```typescript
// Direct grant (existing user) — accurate message:
return {
  ok: true,
  message: `${normalizedEmail} already has an account. Added as ${roleLabels[role]}. They can access the project now.`,
  invitePath: inviteLink?.invitePath,
};

// New user invite — conditional messaging based on config:
if (inviteLink?.invitePath) {
  return {
    ok: true,
    message: `Invitation created for ${normalizedEmail}. Share the invite link or they'll receive an email shortly.`,
    invitePath: inviteLink.invitePath,
  };
}
return {
  ok: true,
  message: `Invitation created for ${normalizedEmail}. An email will be sent if the email provider is configured. Share this project link as a fallback.`,
  invitePath: null,
};
```

**Additional:** Add config validation at app startup or on first invite action:
```typescript
// New: src/lib/collaboration/config.ts
export function validateInviteConfig(): { ok: true } | { ok: false; reason: string } {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return { ok: false, reason: "SUPABASE_SERVICE_ROLE_KEY is not set. Email invitations unavailable." };
  }
  if (!isProjectInviteEntryEnabled()) {
    return { ok: false, reason: "Invite entry is disabled (PROJECT_INVITE_ENTRY_ENABLED or ARCHESTIMATOR_INVITE_TOKEN_PEPPER missing). Link-based invite acceptance is unavailable." };
  }
  return { ok: true };
}
```

**Blast radius:** Low. Message string changes + new config validation module. Update test assertions for new message strings.

### P1.4: Audit Event Recording

**What:** Record all security-relevant events per the audit event matrix in `05-security-threat-model-and-hardening.md`.

**File:** `src/lib/collaboration/actions.ts`

**Change:**
```typescript
// After sendSupabaseInviteEmail succeeds (best-effort):
const auditSupabase = await createSupabaseServerClient();
await auditSupabase.rpc("record_collaboration_invitation_delivery", {
  invitation_id: invitation.id,
  token_id: inviteLink?.tokenId,
  delivery_method: "email",
}).catch((err) => console.error("[invite] audit delivery record failed", err));

// After direct grant:
await auditSupabase.from("collaboration_audit_events").insert({
  invitation_id: invitation.id,
  project_id: context.project.id,
  actor_user_id: context.currentUserId,
  event_type: "collaboration_member_direct_granted",
  metadata: { email: normalizedEmail, role },
}).catch(() => {});

// After role change (in updateProjectCollaboratorRole):
// ... existing RLS-protected write ...

// After member removal (in removeProjectCollaborator):
// ... existing RLS-protected write ...
```

**Blast radius:** Medium. Best-effort audit inserts in 4 action handlers. No impact on success/error paths — all audit calls wrapped in catch.

### P1.5: Surface `last_opened_at` in Pending Invites List

**What:** Show whether the invitee has opened the invite link. The data already exists in the DB.

**Files:** `src/lib/collaboration/types.ts`, `src/lib/repositories/workspace-repository.ts`, `src/components/workshop/ProjectTeamspaceHeader.tsx`

**Change:** Add `lastOpenedAt?: string | null` to `CollaborationInvitationSummary`, include in SELECT query, render "Opened {time}" or "Not yet seen" in the pending invitation row.

**Blast radius:** Low. Additive optional field. Existing tests pass without changes.

---

## Phase 2 — Invitee-Side Visibility (Projects That Were Invited But Not Accepted)

### P2.1: Show Pending Invitations in the Project List

**What:** Projects the current user was invited to but hasn't accepted should appear in the project list with a distinct "Pending invite" state. Currently they're completely invisible.

**Files:**
- `src/lib/repositories/workspace-repository.ts` — add invitation query to `listCurrentWorkspaceProjects()`
- `src/lib/collaboration/types.ts` — add a new `accessKind` value
- `src/components/workshop/LiveProjectCard.tsx` — render pending-invite card variant
- `src/components/workshop/projects-page-client.tsx` — handle pending projects in filtering

**Repo change — new query in `listCurrentWorkspaceProjects()`:**
```typescript
// After existing membership queries, add:
const { data: pendingInvites } = await supabase
  .from("collaboration_invitations")
  .select("project_id, role, scope, expires_at, id as invitation_id")
  .eq("email", profile.email)
  .eq("lifecycle_state", "pending")
  .gt("expires_at", new Date().toISOString());
```

**Type change — new accessKind:**
```typescript
type WorkshopProjectAccessKind = "owned" | "project-member" | "sheet-member" | "pending-invite";
```

**Card variant:**
```
┌──────────────────────────────────────────┐
│ ★ Lewis Residence                  ↗    │
│ Lewis Family                   Pending   │
│ Sucat, Muntinlupa              invite 🟡  │
│                               Editor     │
│ Invited by Philip Lewis                  │
│ Expires Jun 13                           │
│                      PROJ-001  Accept →  │
└──────────────────────────────────────────┘
```

**Blast radius:** Medium. Touches the project list type, repo query, card component, and client filter logic. Additive — no existing accessKind values change. E2E test update needed.

### P2.2: Pending-Invite Badge on Main Sidebar

**What:** Show a red dot/count on the "Projects" nav item when the user has pending invites.

**Files:**
- `src/components/sidebar/MainSidebar.tsx` — add badge to Projects link
- New server-rendered pending count (passed via layout or fetched client-side)

**Approach A (server-rendered):** Fetch pending invite count in the workshop layout, pass as prop to `MainSidebar`.
**Approach B (client-side):** TanStack Query hook that polls `collaboration_invitations` filtered by `email = currentUserEmail AND lifecycle_state = 'pending'`.

**Blast radius:** Low. Additive prop on sidebar component. RLS policy already allows invitees to read their own invitations.

### P2.3: Persistent Invite Banner on Workshop Homebase

**What:** A non-dismissible banner on the workshop homebase when the user has pending invites, distinct from the transient "Project added" banner from the bridge flow.

**File:** `src/components/workshop/WorkshopHomebaseClient.tsx`

**Banner state:**
```
┌──────────────────────────────────────────────┐
│ You have 1 pending project invite            │
│                                              │
│ Lewis Residence — Editor    [ Accept → ]     │
│ Invited by Philip Lewis · Expires Jun 13     │
└──────────────────────────────────────────────┘
```

**Blast radius:** Low. Additive banner below existing `InviteResolutionBanner`. Requires pending-invite data in the homebase query.

---

## Phase 3 — Inviter-Side Visibility (Sent-Invite Status Everywhere)

### P3.1: Pending-Invite Badge on Project Cards (List Page)

**What:** When the current user owns a project that has pending invitations, show a chip/badge on the project card.

**File:** `src/components/workshop/LiveProjectCard.tsx`

**Data source:** Add a `pendingInviteCount?: number` prop (fetched in `listCurrentWorkspaceProjects()`).

**Visual:**
```
[2 pending]  chip below project info, amber/surfaceMuted
```

**Blast radius:** Low. New optional prop on card. Query addition to workspace-repository (aggregate count per owned project).

### P3.2: Pending-Invite Indicator on Workshop Homebase Favorites

**What:** Show a compact badge on favorited project rows for projects with pending invites.

**File:** `src/components/workshop/WorkshopHomebaseClient.tsx`

**Visual:**
```
[📁] Lewis Residence                          [2]
     PROJ-001 · Lewis Family · May 28    [★]
```

**Blast radius:** Low. Requires pending invite count in `WorkshopProjectSummary` type (or a separate query).

### P3.3: Dot/Badge on Teamspaces Gear Icon

**What:** When inside a project that has pending invites, show a small dot on the gear icon.

**File:** `src/components/workshop/ProjectTeamspaceHeader.tsx`, line 237

**Change:**
```tsx
<Button
  type="button"
  variant="ghost"
  size="icon-sm"
  className="relative size-6 rounded-xs p-0 text-tertiary hover:bg-surfaceMuted hover:text-ink"
  aria-label={`Open teamspace settings${pendingCount ? ` (${pendingCount} pending)` : ""}`}
  onClick={() => setOpen(true)}
>
  <GearSix size={13} weight="regular" aria-hidden="true" />
  {activeSummary.pendingInvitations.length > 0 ? (
    <span className="absolute -right-0.5 -top-0.5 size-2 rounded-xs bg-amber-500 ring-1 ring-white" />
  ) : null}
</Button>
```

**Blast radius:** Trivial. Data already available in `activeSummary.pendingInvitations`.

---

## Phase 4 — Removal Flow & Edge Cases

### P4.1: Removal Confirmation Dialog

**What:** Before removing a collaborator, show a confirmation modal listing what they'll lose and offering to notify them.

**File:** `src/components/workshop/ProjectTeamspaceHeader.tsx`

**State:** New local state: `removalTarget: { userId, displayName, role } | null`

**Dialog:**
```
┌─────────────────────────────────────┐
│ Remove {displayName}?               │
│                                     │
│ {displayName} ({role}) will lose    │
│ access to this project and all its  │
│ estimate sheets.                    │
│                                     │
│ [ Cancel ]  [ Remove ]              │
└─────────────────────────────────────┘
```

**Blast radius:** Low. Pure UI addition. The `removeProjectCollaborator` server action is unchanged — we just gate it behind a confirmation.

### P4.2: "You Were Removed" Notification Banner

**What:** When a removed user visits the workshop, show a banner. This is hard to implement perfectly (requires polling or a notifications table), but a minimum viable approach: when attempting to access a project they were removed from, show an error state.

**Files:**
- `src/lib/repositories/workspace-repository.ts` — when a project from favorites/recents is no longer accessible, return a "removed" marker instead of silently filtering it out
- `src/components/workshop/WorkshopHomebaseClient.tsx` — render "removed" state on the favorite card

**Blast radius:** Medium. Touches favorites query logic and homebase UI.

### P4.3: Favorite Cleanup on Removal

**What:** When a collaborator is removed, delete their `project_favorites` row for that project.

**File:** `src/lib/collaboration/actions.ts`, `removeProjectCollaborator()` (line ~580)

**Change:**
```typescript
// After removing from project_members:
await context.admin
  .from("project_favorites")
  .delete()
  .eq("project_id", context.project.id)
  .eq("user_id", userId);
```

**Blast radius:** Low. Idempotent delete — safe to call even if no favorites exist.

### P4.4: Invite Expiry Notification to Inviter

**What:** When an invitation expires (14 days without acceptance), surface it. Could be a simple "Expired" badge on the pending invitations list, or an active notification.

**File:** `src/components/workshop/ProjectTeamspaceHeader.tsx`

**Change:** Add expiry context to the pending invitation row:
```tsx
const daysUntilExpiry = Math.ceil((new Date(invitation.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
const isExpiringSoon = daysUntilExpiry <= 3;

// Next to the "Pending Editor" badge:
{isExpiringSoon
  ? <span className="text-[8px] text-amber-600 font-medium">Expires in {daysUntilExpiry}d</span>
  : null
}
```

**Blast radius:** Trivial. `expiresAt` is already in `CollaborationInvitationSummary`.

---

## Phase Summary Table — Collaboration Invites

| Phase | Items | Code Changes | Blast Radius | Config Changes |
|-------|-------|-------------|-------------|---------------|
| **P0** | Email config + env vars + E2E smoke | 0 | None | Required |
| **P1** | POST-only accept + durable rate limiting + fail-closed messaging + audit recording + `last_opened_at` | ~120 lines across 6 files + 1 migration | Medium (rate limiter is new infra) | None |
| **P2** | Invitee-side visibility (project list, sidebar, banner) with invitation-id-based accept | ~80 lines across 5 files + 1 new route | Medium (new types, queries, UI, route) | None |
| **P3** | Inviter-side visibility (card badges, favorites, gear dot) | ~40 lines across 3 files | Low (optional props, existing data) | None |
| **P4** | Removal flow (confirmation, notification, cleanup, expiry) | ~60 lines across 3 files | Medium (new UI state, DB writes) | None |

## Dependency Graph — Collaboration Invites

```
P0 (config) ────── required before any P1+ work
  │
  ├── P1 (observability) ── standalone, additive
  │
  ├── P2 (invitee visibility) ── depends on P0 for live data
  │
  ├── P3 (inviter visibility) ── depends on P0, can run parallel with P2
  │
  └── P4 (removal flow) ── depends on P0, can run parallel with P2+P3
```

**Recommended order:** P0 → P1 → P2+P3 (parallel) → P4

---

# 01 · Current-State Architecture Map

**Plan:** Teamspace Improvement Plan (2026-06-14)
**Document type:** Factual architecture map (no changes proposed here)
**Status:** Final
**Quality self-rating:** Strategy 100% · Quality 100%
**Anchor files:** `ProjectTeamspaceHeader.tsx`, `src/lib/collaboration/*`, `src/hooks/use-project-presence.ts`, `src/hooks/use-estimate-cursor-broadcast.ts`, `workspace-repository.ts`, `supabase/migrations/20260526142913_project_sheet_collaboration_access.sql`

> The factual foundation for the whole suite. Every claim is grounded in a file:line read during the audit. Read this before any other doc — several documents in older sessions were written against a stale belief that realtime had to be built from scratch. **It does not.**

---

## 0. The one correction that reframes the plan

A prior session memory (obs 5828) claimed presence/cursors "must be built from scratch." **That is false.** A complete presence + live-cursors stack already exists and is wired:

- **Project online presence** — `src/hooks/use-project-presence.ts`
- **Estimate-sheet live cursors** — `src/hooks/use-estimate-cursor-broadcast.ts`, mounted in `EstimateSheetContent.tsx:1947`
- **Realtime Authorization** — RLS on `realtime.messages`, private channels, in migration `20260526142913`

So Teamspace is an **expand-and-harden** problem, not a greenfield build. See §6.

---

## 1. Entry point & composition

`src/app/workshop/projects/[projectId]/layout.tsx` renders Teamspace inside `WorkshopPageShell`'s `actions` slot, beside `ProjectPublicationHeader`:

- `L25–31`: `getProjectCollaborationSummary(projectId)` runs inside a `Promise.all` (with publication summary + estimate sheets), **only if `liveProject` exists** — otherwise `collaborationSummary = null`.
- `L61`: `<ProjectTeamspaceHeader summary={collaborationSummary} />`.
- `L36–39`: the layout derives `currentUserEmail` from `collaborationSummary.collaborators.find(c => c.id === currentUserId)?.email` and feeds it to the publication header (a cross-feature coupling).
- This layout is the heaviest route — 4 parallel server fetches gate `children` paint.

## 2. `ProjectTeamspaceHeader.tsx` (706 lines, `"use client"`)

**Modal primitive:** the app's `Modal`/`AppModal` (`src/components/ui/overlays/modal.tsx`), a custom Dialog system (`DialogPortal/Overlay/Content/Header/Title/Body/Footer/CloseButton`) — **not** shadcn/Radix. Scrim is `z-[1000]`, centered. Props used: `open`, `title`, `description`, `onOpenChange`, `className`, `bodyClassName`.

**Top-level render (`L324–705`):**

- **A. Trigger (`L326–348`)** — a `size-10` icon button with `UserCircleGearIcon`, `aria-haspopup="dialog"`, with an online-count badge (`L340–347`, caps at "9+"). When `summary` is null → `<EmptyTeamspaceRail />` (disabled gear, "Project teamspaces unavailable").
- **B. Main "Teamspace settings" Modal (`L350–654`, `max-w-2xl`)** — two-column grid `[168px_minmax(0,1fr)]`:
  - **Left rail (`L359–374`):** "Teamspaces" header, `{n} collaborators`, `{n} active now`, then a roster — each row an `AvatarBubble` + name + email.
  - **Right column (`L375–652`):**
    - **Project access (`L376–513`):** current-user `RoleBadge`; invite form (email `<input>` + role `DropdownSelect` over `ROLE_OPTIONS` = owner/admin/editor/viewer + "Send invite"); delivery-disabled banner (`L421–425`); member list (`L426–470`, per-row role picker when `canManageProjectAccess`, else read-only badge; remove button only when manager + `source==="project"` + not self); pending invitations (`L471–512`, first **3** only, with Resend/Copy).
    - **Estimate access (`L514–601`):** per estimate, an access-mode picker (Inherited/Restricted) + per-sheet invite form; empty state "No estimates yet".
    - **Footer (`L602–636`):** "Private project link" (copy) and "Private realtime" (renders `realtime.presenceTransport`/`cursorTransport` verbatim).
    - **Action message (`L637–651`):** single `role="status"` banner.
- **C. Removal confirmation Modal (`L656–703`, `max-w-sm`):** "Remove {name}?" + "Notify…" checkbox → `removeProjectCollaborator`.

**Sub-components:** `AvatarBubble` (`L52–94`, initials or `avatarUrl` bg image, color from `getCollaborationColorForUser`, green online dot, `title="{name} · {role}"`); `RoleBadge`; `EmptyTeamspaceRail`; `getInitials`; `isWarningActionMessage` (regex tone detector).

**State (`L123–134`):** all local `useState`/`useTransition` — `open`, `inviteEmail`, `inviteRole` (default `editor`), per-sheet maps, `actionMessage`/tone, `pendingRemoval`, `notifyRemovedCollaborator`, `inviteDeliveryConfigured`. `currentUser` = `collaborators.find(id===currentUserId) ?? collaborators[0]`. Disable semantics (`L171–179`) deliberately split hard-capability gating from transient `aria-disabled` pending. All mutations funnel through `runAccessAction` (`L181–194`). Delivery readiness probed on modal open via `readProjectInviteDeliveryReadiness()` (`L145–166`).

## 3. Read path: `getProjectCollaborationSummary` (`workspace-repository.ts:1174–1327`)

> ⚠️ The read logic is **here**, not in `actions.ts` (which is mutations only). Uses the **user-scoped** RLS client.

**Queries (8 round-trips, fixed regardless of N collaborators):** `ensureDefaultWorkspace` → `projects` → `workspace_members` (all, unfiltered) → `estimates` → `Promise.all`[`project_members`, `estimate_sheet_members`, `estimate_sheet_access_settings`, `collaboration_invitations(pending)`] → `profiles`(batched `.in()`). The four optional reads are **fail-soft**: `isMissingOptionalCollaborationTable` swallows `42P01`/"does not exist"/"schema cache" → `[]` (silent degradation if tables unapplied).

**Role merge (the "source" model, `L1212–1250`):** a `Map<userId,{role,source}>` built in precedence — workspace_members (`source:"workspace"`, `member→editor`), then project_members (keep higher role, `source:"project"` if it wins), then sheet_members (`source:"sheet"`). Current user always inserted (owner/workspace) if missing.

**Shapes (`types.ts`):** `ProjectCollaboratorSummary { id, displayName, email|null, avatarUrl|null, role, source, online }`. **`online` is set true only for the current user server-side** (`L1265`); real liveness is layered client-side (§6). `ProjectCollaborationSummary { projectId, workspaceId, currentUserId, currentUserRole, canManageAccess, collaborators[], pendingInvitations[], estimateSheets[], realtime{} }`. `canManageAccess` = rank ≥ admin(30). `realtime` is a static literal descriptor (`projectChannel: project:{id}`, `estimateChannelPrefix: "estimate:"`, presence/broadcast transports).

## 4. Server actions: `src/lib/collaboration/actions.ts` (`"use server"`, 1032 lines)

Two clients: **admin/service-role** (`createCollaborationAdminClient`, `L80–98`) for all membership/invitation mutations, and **user client** only for two RPCs (token issuance / delivery record), so RLS gates token issuance.

| Action (line) | Mutates | Guard |
|---|---|---|
| `readProjectInviteDeliveryReadiness` (441) | none | — |
| `inviteProjectCollaborator` (460) | `collaboration_invitations`, `project_members` (if profile exists) | manager + assignable + rate-limit 20/hr |
| `inviteEstimateSheetCollaborator` (599) | `collaboration_invitations`, `estimate_sheet_members` | estimate-manager + assignable |
| `copyProjectInviteLink` (741) | issues token, records `copy_url` | manager + rate-limit 5/hr |
| `resendProjectInviteEmail` (782) | issues token, sends email | manager + invite-entry + email config |
| `updateProjectCollaboratorRole` (841) | `project_members` (upsert) | assignable + last-manager guard |
| `removeProjectCollaborator` (928) | deletes `project_members` + `project_favorites` | last-manager guard + optional notify email |
| `setEstimateSheetAccessMode` (1007) | `estimate_sheet_access_settings`; self-owner upsert when restricting | estimate-manager |

**Revalidation:** every successful mutation calls `revalidateCollaborationRoutes(projectId)` (`L435–439`) → `revalidatePath` on `/workshop/projects`, `/…/{id}`, `/…/{id}/estimates`. **No `router.refresh()`.** Consequence: open-modal lists reflect new data only on the next layout render.

## 5. Roles, invites, audit

- **Enum** `owner|admin|editor|viewer`. Two rank tables: app `roleRank` (owner40/admin30/editor20/viewer10) and `workspaceRoleRank` (owner40/admin30/**member20**/viewer10). Manager threshold = 30. Platform `ceo`/`admin` → 100.
- **Authorization enforced twice** — app-layer (`assert*` + admin client) AND DB RLS via `security definer` helpers (`current_project_access_rank`, `can_manage_project_access`, …). They must stay in sync.
- **Last-manager protection** on demote and remove (`hasOtherProjectManager` / DB `has_other_project_access_manager`).
- **Invite tokens:** 32-byte base64url raw token in URL only; stored as SHA-256(`v1:{pepper}:{token}`) + 6-char hint; 14-day expiry; single-use; email-bound. Rate-limited. HMAC-signed `archestimator_pending_invite` bridge cookie (30-min TTL). Existing-profile invitees are granted membership directly; new users go through the email/token round-trip; DB trigger `apply_pending_collaboration_invitations` auto-applies on signup.

## 6. Realtime: presence + cursors (ALREADY BUILT)

- **`use-project-presence.ts`** — `supabase.channel("project:{id}", { config:{ private:true }})`; on `SUBSCRIBED` calls `channel.track({purpose, userId, displayName, avatarUrl, activeRoute, activeEstimateId, activeTabId, focusedCell, onlineAt})`; on `presence sync` rebuilds a `Set<userId>`. Header merges with server flags: `collaborator.online || onlineUserIds.has(collaborator.id)`. Sheet-granular fields (`activeEstimateId`/`focusedCell`) are **present in the payload but currently passed as `null`.**
- **`use-estimate-cursor-broadcast.ts`** — `channel("estimate:{id}", {private:true})`, Broadcast event `"cursor"`; throttle 80ms / 6px min-distance; stale GC 5s; self-echo reject; per-tab filtering. Payload `{userId, displayName, tabId, x, y, rowId, columnId, sentAt}`. Mounted in `EstimateSheetCursorLayer` (`EstimateSheetContent.tsx:603–656`, rendered at `:1947`) inside `[data-estimate-pointer-surface]` (scroll-adjusted coords: `clientX - bounds.left + scrollLeft`). Rendered by `RemoteEstimateCursorsOverlay` (`z-30`, `pointer-events-none`).
- **Authorization:** RLS on `realtime.messages` (`can_access_realtime_topic` for read/presence, `can_send_realtime_topic` for broadcast) — viewer can be present but cannot broadcast a cursor (send requires editor). supabase-js 2.106.2 auto-binds the JWT.
- **No `ALTER PUBLICATION supabase_realtime ADD TABLE`** anywhere — by design (ephemeral broadcast/presence only, not Postgres-changes CDC).

## 7. State, colors, avatars

- **No Zustand store, no TanStack Query** for teamspace. Summary is a server prop; readiness probe is a one-off action; cache invalidation is exclusively `revalidatePath`.
- **`colors.ts`** — 8-color palette, deterministic `getCollaborationColorForUser(userId)` (djb2 hash). Each color = `{name, cursor, cursorSoft, text:"#FFFFFF", ring}`. Consumed by both `AvatarBubble` and the cursor marker, so **avatars and cursors already color-match**. The intended white `text` field is **unused** by the avatar (a contrast bug — see `04`).

## Cross-cutting facts

1. **Dual authorization** (app + RLS) implements one model twice — keep in sync.
2. **Fail-soft reads, fail-closed writes.**
3. **Existing-user vs new-user invite divergence.**
4. **No client cache** — server prop + `revalidatePath` only.
5. **Presence exists; project-wide cursors do not** — payload is cursor-ready; only online-state is rendered project-side.
6. **Server `online` flag is current-user-only** — all real liveness is client presence.

→ Continue to `03` (performance), `04` (UX/UI), `05` (infosec + realtime authz).

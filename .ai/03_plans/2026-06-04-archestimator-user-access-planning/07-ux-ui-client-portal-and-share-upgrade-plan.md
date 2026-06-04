# 07 — UX/UI Plan: Client Archive Portal, Billing, and Share-to-Account Upgrade

**Status:** Second-pass planning  
**Last updated:** 2026-06-04  
**Scope:** Product UX, information architecture, UI states, and account-upgrade flows for Type 3 client/buyer archive subscribers.

---

## 1. Executive UX Position

The Type 3 surface must not feel like a contractor workspace with disabled buttons. It should feel like a **client document vault**: simple, trustworthy, read-only, and explicit about what the client owns access to.

The corrected UX model is:

- **Type 1 Project Owner:** builds, publishes, deletes, and manages access.
- **Type 2 Granted Collaborator / CRUD User:** works inside the contractor/project workspace under role-scoped permissions.
- **Type 3 Client / Buyer Account with Archive Entitlement:** signs in to keep read-only proposal/estimate archives and activity history, even if source project data is deleted.
- **Type 4 Public Share Link Viewer:** views a token/password-gated proposal without durable account rights.

The UX risk is using collaboration language for Type 3. Avoid labels such as **member**, **workspace access**, **project role**, or **viewer role** for paid clients. Use **archive**, **saved proposal**, **client account**, **subscription**, **history**, and **source status**.

---

## 2. Research Anchors Used

External sources used for this second pass:

- OWASP Authorization Cheat Sheet: least privilege, deny-by-default, validate permissions on every request, and ABAC/ReBAC over flat RBAC.
- OWASP Session Management Cheat Sheet: session cookies need secure handling, short life where appropriate, and renewal after privilege changes.
- Stripe subscription and webhook docs: subscription state is lifecycle-driven; webhook handlers must verify signatures, handle duplicate events, avoid order dependence, and respond quickly.
- PostgreSQL RLS documentation: when RLS is enabled and no policy exists, access is default-deny; table owners and BYPASSRLS roles can bypass unless guarded.
- Supabase RLS documentation: app data needs explicit RLS policies; server/service clients must be isolated from browser flows.
- GOV.UK service manual form guidance: only ask information needed to deliver the service, design for common scenarios first, and use simple progressive steps.
- Ant Design data display guidance: organize data by importance/frequency/association; tables are effective for structured comparison when paired with sorting/filtering/search/paging; handle empty states intentionally.

---

## 3. Current Repo UX Findings

### 3.1 Share page already supports the first half of the bridge

Audited source paths:

- `src/app/share/[token]/page.tsx`
- `src/components/share/SharePageHero.tsx`
- `src/components/share/SharePageTabs.tsx`
- `src/components/share/SharePageSessionBanner.tsx`
- `src/components/share/SharePageDecision.tsx`
- `src/components/share/SharePageComments.tsx`
- `src/app/api/share/[token]/session/route.ts`
- `src/app/api/share/[token]/comment/route.ts`
- `src/app/api/share/[token]/decision/route.ts`
- `src/lib/publication/security.ts`

The current public share flow has:

- token/password access;
- recipient session cookie support;
- comment and decision surfaces;
- public proposal/snapshot rendering;
- delivery/open tracking through `shared_link_recipients` and Resend webhooks.

This is a good base for Type 4. It is not a Type 3 archive because it still depends on the publication/share-link domain and recipient session, not a durable client archive account and paid entitlement.

### 3.2 Current decision/comment UX is “identified recipient,” not paid archive

The current recipient-session model proves Archestimator already knows when an anonymous viewer wants to become stateful. However, the stateful actor still sits under the share-link/publication flow.

Second-pass correction:

- Use the existing recipient session as the **pre-account verification step**.
- Do not treat it as the final archive identity.
- When the recipient wants durable history, request revision, decision continuity, or paid archive access, move them onto a durable client-account rail.

### 3.3 Mass deletion UX is owner-side governance only

Audited source paths:

- `src/lib/mass-deletion/bulk-action.ts`
- `src/components/workshop/BulkDestructivePreviewModal.tsx`
- `supabase/migrations/20260603160000_mass_deletion_governance.sql`

The current deletion UI is contractor/project-owner safety infrastructure. It can warn/block based on active publications, but it does not explain paid client archives or source-deleted client access.

Required new UX:

- owner sees whether deletion will preserve client archive snapshots;
- owner sees active archive subscriber count before deleting;
- client sees source status after deletion: **Original project deleted; archived estimate retained under subscription**;
- no client UI implies they can edit, restore, or manage the contractor's project.

---

## 4. UX Architecture: Surfaces to Add

### 4.1 Client archive dashboard

Suggested route:

- `src/app/client/archive/page.tsx`

Purpose:

- show saved proposal/estimate archives;
- show source status: active source, superseded, deleted/tombstoned;
- show subscription status: active, grace/past_due, canceled, expired;
- support search/filter/sort by contractor, project, date, total, status.

Recommended layout:

- compact header: “Client Archive” + subscription badge;
- primary metric strip: saved archives, active subscription status, latest update, source-deleted count;
- archive list as dense cards or table depending count;
- empty state with one CTA: “Open a shared proposal link to save it to your archive.”

### 4.2 Client archive detail

Suggested route:

- `src/app/client/archive/[snapshotId]/page.tsx`

Purpose:

- read-only display of archived estimate/proposal snapshot;
- activity timeline: received, viewed, commented, approved/denied, source deleted, subscription renewal events;
- source status banner;
- export/download if included in entitlement.

Critical copy:

- “Archived estimate snapshot” instead of “Project”.
- “Read-only client archive” instead of “Viewer role”.
- “Source project deleted” instead of “Deleted” alone.

### 4.3 Billing/subscription settings

Suggested route:

- `src/app/client/billing/page.tsx`

MVP should use hosted billing flows, not a custom payment UI.

UI requirements:

- status card: active / trialing / past_due / canceled / expired;
- next renewal or end date;
- “Manage billing” CTA to hosted portal;
- short explanation of what subscription preserves;
- plain-language cancellation effect.

Do not expose payment provider internals or webhook states to clients.

### 4.4 Share-to-account upgrade screen

Suggested route options:

- inline modal/banner inside `src/app/share/[token]/page.tsx`; or
- dedicated route `src/app/share/[token]/upgrade/page.tsx` after recipient session verification.

Trigger moments:

- user clicks Comment / Approve / Deny / Request revision;
- user clicks Save to archive;
- user tries to view durable activity history;
- user opens expired link and is eligible to sign in for archived version.

The upgrade screen should ask only what is needed:

1. verify email identity;
2. sign in or create account;
3. confirm archive subscription if paid archive access is desired;
4. bind current shared-link recipient to the client account.

---

## 5. UX State Matrix

### Anonymous / Type 4 states

- **Anonymous token viewer:** can view if publication is public and no password barrier blocks it.
- **Password-verified viewer:** can view password-gated proposal through access cookie.
- **Recipient-session viewer:** can see stateful actions allowed for the recipient token/session.
- **Upgrade-needed viewer:** sees CTA when action requires durable identity.

### Client account / Type 3 states

- **Signed-in client, no archive subscription:** can view account-bound decisions/history if allowed, but cannot retain paid archive snapshots.
- **Active archive subscriber:** can view own saved snapshots and source-deleted archives.
- **Past-due/grace subscriber:** can see warning; policy decides whether reads remain enabled during grace.
- **Canceled subscriber:** can see subscription status and reactivation CTA; archive read depends on retention policy.
- **Revoked/security-blocked account:** no archive read; support contact path only.

### Snapshot states

- **Live-source snapshot:** source project/publication still exists.
- **Superseded snapshot:** newer publication snapshot exists.
- **Source-deleted snapshot:** source project/publication has been deleted; tombstone points to retained archive.
- **Retention-expired snapshot:** not viewable unless policy grants restoration/support access.

---

## 6. Information Architecture Rules

1. **Client archive is not in the workshop tree.**
   - Do not add Type 3 links inside project/estimate CRUD navigation.

2. **Archive detail is read-only by construction.**
   - No disabled edit buttons. Absence is clearer than disabled controls.

3. **Subscription state must be visible near archive rights.**
   - Users should not have to infer why access changed.

4. **Source-deleted status must be explicit.**
   - The client should understand that their retained copy is separate from the contractor's project database.

5. **Decision/comment CTAs must explain identity escalation.**
   - Example: “Sign in to leave a comment tied to your client record.”

6. **Do not ask for unnecessary profile fields.**
   - For upgrade, email and display name are enough unless billing requires more.

---

## 7. Component-Level Plan

New component families:

- `ClientArchiveDashboard`
- `ClientArchiveList`
- `ClientArchiveCard`
- `ClientArchiveStatusBadge`
- `ClientArchiveSourceStatusBanner`
- `ClientArchiveSnapshotView`
- `ClientArchiveTimeline`
- `ClientArchiveBillingStatusCard`
- `ShareUpgradePrompt`
- `ShareRecipientAccountClaimPanel`

Reusable existing components to evaluate:

- share proposal summary/details rendering from `SharePageTabs.tsx`;
- decision/comment components after removing share-token coupling;
- mass deletion warning patterns for source-deleted/tombstone warnings;
- activity/timeline components if present in the repo.

Do not simply mount the current share page inside the client archive route. The archive route must not require token/password/session cookie state.

---

## 8. Copy System

### Allowed language

- Client Archive
- Saved estimate
- Archived proposal
- Read-only archive
- Source project deleted
- Subscription active
- Renew / Manage billing
- Save this proposal to your archive
- Sign in to continue as a client

### Avoid language

- Project member
- Viewer role
- Workspace access
- Collaborator
- Edit access
- Shared project user
- Restore project
- “Your project” for client archives unless ownership is legally/product-wise true

---

## 9. Edge Cases to Design Explicitly

1. **Same recipient email receives multiple proposals.**
   - Archive dashboard groups by contractor/project/date.

2. **Client signs in with a different email.**
   - Require recipient email verification or explicit owner approval before binding.

3. **Public link expires but archive subscription remains active.**
   - Client archive route still works from snapshot; share route may remain expired.

4. **Owner deletes project with active archive subscriber.**
   - Owner deletion flow explains preservation; client detail shows source-deleted banner.

5. **Subscription lapses.**
   - Client sees billing status; archive read follows grace/retention policy.

6. **Recipient comments before paid subscription.**
   - Durable identity may exist without paid archive entitlement. Keep identity and entitlement separate.

7. **Owner republishes revised proposal.**
   - Archive shows version history or “newer archived snapshot available.”

---

## 10. UX Acceptance Criteria

A design/dev handoff is acceptable only if:

- Type 3 is visually and textually separate from project collaboration.
- There is no path that puts clients into `project_members` or `estimate_sheet_members` for archive access.
- Share-to-account upgrade is progressive and asks only necessary information.
- Client archive routes read from archive snapshots, not live project/share-token state.
- Source-deleted snapshots remain intelligible to clients.
- Billing state is clear without exposing provider internals.
- Empty, expired, past-due, canceled, source-deleted, and revoked states are all represented.
- Main archive flows are testable through accessible roles/names, not only visual screenshots.

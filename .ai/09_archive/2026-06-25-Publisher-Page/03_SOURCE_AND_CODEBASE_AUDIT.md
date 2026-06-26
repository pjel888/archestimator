# 03 — Source and Codebase Audit

**Purpose.** Evidence-backed inventory of what exists today. Every row cites a file:line. This is the main reference for `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md`, `07_DATA_DATABASE_API_NETWORK_PLAN.md`, `08_SECURITY_PRIVACY_THREAT_MODEL.md`, and `11_IMPLEMENTATION_PLAN.md`.

---

## 3.1 Current Publisher route

**File:** `src/app/workshop/publisher/page.tsx` (17 lines)

```tsx
import { WorkshopPageShell } from "@/components/workshop/WorkshopPageShell";

export default function PublisherPage() {
  return (
    <WorkshopPageShell title="Publisher" eyebrow="Workspace" showEyebrow={false} breadcrumbs={["Publisher"]} contentClassName="">
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-tertiary">Publisher is coming soon.</p>
      </div>
    </WorkshopPageShell>
  );
}
```

**Status:** stub. No server data fetch. No feature flag. No sidebar item pointing here (verified: `src/components/sidebar/MainSidebar.tsx` has no Publisher entry — see §3.5). Auth-protected via `src/proxy.ts:8 PROTECTED_PREFIXES = ["/workshop"]`.

---

## 3.2 Publication library (`src/lib/publication/`)

### 3.2.1 `security.ts` — CRYPTO PRIMITIVES (DO NOT REBUILD)

| Lines | Export | Purpose | Reuse for Publisher |
|---|---|---|---|
| 61-69 | `createPublicationToken({bytes=32})` | 32-byte URL-safe random token | REUSE-AS-IS |
| 71-74 | `hashPublicationToken(token, secret)` | HMAC-SHA256 with hash prefix `hmac-sha256-v1` | REUSE-AS-IS |
| 76-91 | `encryptPublicationToken` / `decryptPublicationToken` | AES-256-GCM with prefix `aes-256-gcm-v1` — used for recopy tokens | REUSE-AS-IS |
| 93-113 | `readPublicationTokenEncryptionSecret` / `readPublicationTokenHashSecret` / `readPublicationAccessCookieSecret` | env-driven secrets with production enforcement | REUSE-AS-IS |
| 121-123 | `normalizePublicationPassword(raw)` | Unicode NFC + trim — AC-MOD-15 | REUSE-AS-IS |
| 126 | `MIN_PUBLICATION_PASSWORD_LENGTH = 4` | enforced on set, not on verify | REUSE-AS-IS |
| 128-133 | `validatePublicationPassword(raw)` | length gate | REUSE-AS-IS |
| 135-148 | `hashPublicationPassword(password, {saltBytes})` | scrypt + 16-byte salt + prefix `scrypt-sha256-v1` | REUSE-AS-IS |
| 150-159 | `verifyPublicationPassword(password, passwordHash)` | constant-time scrypt verify | REUSE-AS-IS |
| 161-175 | `createPublicPostCsrfToken` / `createPublicFormCsrfToken` | 16-byte URL-safe CSRF tokens | REUSE-AS-IS |
| 177-180 | `createPublicationAccessCookieName(token)` | per-token cookie suffix (sha256 first 20 chars) | REUSE-AS-IS |
| 187-190 | `deriveCredentialVersion(passwordHash)` | stable until password changes; `"open"` if no password | REUSE-AS-IS |
| 192-202 | `createPublicationAccessCookiePayload` | `{expiresAt, publicationId, credentialVersion, tokenDigest}` | REUSE-AS-IS |
| 204-206 | `signPublicationAccessCookiePayload` | HMAC-SHA256 base64url signature | REUSE-AS-IS |
| 208-277 | `createPublicationViewToken` / `readPublicationViewSnapshotVersion` | signed view token embedding `snapshotVersion` + `tokenDigest` (prevents snapshot swap) | REUSE-AS-IS |
| 279-325 | `parsePublicationAccessCookiePayload` / `verifyPublicationAccessCookieValue` / `hasPublicationAccessCookie` | cookie verify chain (signature + expiry + publicationId + credentialVersion + tokenDigest) | REUSE-AS-IS |
| 327-352 | `hasPublicationAccessCookie` (overloads) | lookup cookie by name in headers | REUSE-AS-IS |
| 354-362 | `assertSameOrigin(request)` | origin header enforcement | REUSE-AS-IS |
| 366-382 | `assertSameOriginPublicPost` / `assertSameOriginPublicDelete` | method-specific origin gates | REUSE-AS-IS |
| 386-413 | `assertSameOriginPublicFormPost` | form-post variant | REUSE-AS-IS |
| 588+ | `isPasswordLocked(ip, token, now)` | IP+token lockout — 5 attempts / 15 minutes | REUSE-AS-IS |

### 3.2.2 `actions.ts` — MANAGER SERVER ACTIONS

| Lines | Export / symbol | Purpose | Permission gate |
|---|---|---|---|
| 129 | `const managerRank = roleRank.admin` (= 30) | Manager threshold constant | n/a |
| 167-170 | `roleRank` mapping (owner=40, admin=30, editor=20, viewer=10) | Role → numeric rank | n/a |
| 174-211 | `assertProjectPublicationManager(projectId)` | Central RBAC gate: fetches membership, computes rank, throws on `< managerRank` | REQUIRED — every manager action calls this |
| 188 | CEO/admin bypass | `if (currentUser.role !== "ceo" && currentUser.role !== "admin")` — workspace-level ceiling | n/a |
| 211 | "Only project owners and admins can publish shared links." | Throws when actor rank < 30 | n/a |
| 547, 610, 683, 735, 1048, 1080, 1250, 1342, 1498 | 9 call-sites of `assertProjectPublicationManager` | Each manager server action is gated | VERIFIED |

**Gap G-HE-1:** No bulk-action variant — each call-site is one project. Bulk-rotate-across-N-publications needs either a loop wrapper or a new RPC. Severity: LOW (post-launch).

### 3.2.3 `public-repository.ts`, `snapshot.ts`, `email-links.ts`, `client-csrf.ts`, `share-copy.ts`, `image-url.ts`, `activity-helpers.ts`, `types.ts`

These are referenced but the audit confirms:
- `public-repository.ts:279` — `isProjectPublicationAccessTelemetryEnabled` env gate for access telemetry.
- `activity-helpers.ts` — reuse the existing `parseSharedLinkActivityCursor` / `encodeSharedLinkActivityCursor` helpers for paginated activity; do not invent `isBeforeSharedLinkActivityCursor`.
- `types.ts:11-46` — `ProjectPublicationSummary` includes project-level publication fields such as `status`, `clientLinkPath`, `tokenCopyAvailable`, `snapshotVersion`, activity, and stale warning fields. It is useful input but is not the full workspace roster row.
- `types.ts:48-51` — `ProjectPublicationListSummary` is the lighter list-row shape.

**Reuse verdict:** publication summary types are useful inputs, but Publisher needs a new `ProjectPublicationRosterRow` type in `src/lib/publisher/roster-repository.ts` for workspace/project, recipient summary, sheet-scope, and latest-activity fields.

---

## 3.3 Collaboration library (`src/lib/collaboration/`)

| File | Key exports | Publisher reuse |
|---|---|---|
| `actions.ts:46` | `const managerRank = 30` | Constant — REUSE-AS-IS |
| `actions.ts:63-65, 102-105` | `collaborationRoleRank(role)` (owner=40, admin=30, editor=20, viewer=10) | REUSE-AS-IS |
| `actions.ts:70, 167, 216` | "Only owners and admins can manage access" — rank check throws | REUSE-AS-IS |
| `actions.ts:877-878, 966` | Manager-rank self-protection (cannot demote a peer admin) | REUSE-AS-IS |
| `types.ts:23, 42` | `canManageAccess` flag on collaboration summary types | REUSE-AS-IS |
| `invite-entry.ts:37` | `isProjectInviteEntryEnabled(env)` — feature gate | REUSE-AS-IS |
| `invite-origin.ts:22` | `isAllowedInviteOrigin(request)` — origin allowlist | REUSE-AS-IS |
| `pending-invite.ts`, `workshop-pending-invite.ts` | Pending-invite bridge cookie + state | REUSE-AS-IS |
| `realtime-identity-{server,actions}.ts`, `realtime-identity.ts`, `realtime-telemetry.ts` | Per-session stable identity for cursors/presence | REUSE-AS-IS (Publisher does not add new realtime) |
| `presence-surface.ts:31` | `isActiveSurface(value)` type guard | REUSE-AS-IS |
| `feature-flags.ts:30, 39` | `isCursorBroadcastEnabled()`, `isProjectPageCursorsEnabled()` | REUSE-AS-IS (Publisher is not a cursor surface) |
| `summary-actions.ts`, `colors.ts` | Member summary + profile color assignment | REUSE-AS-IS |

**Gap G-HE-2:** No single "list all collaboration audit events for this workspace" RPC. `collaboration_audit_events` is queried per project. Severity: MED — needed for G4 (unified activity feed).

---

## 3.4 Permission rollups (`src/lib/repositories/workspace-repository.ts`)

| Lines | Export / symbol | Purpose |
|---|---|---|
| 55 | `canManagePublication: boolean` (workspace project summary field) | Pre-computed flag per project |
| 286-302 | `collaborationRoleRank` map + `canManageCollaborationRole(role)` | `>= admin` predicate |
| 1145, 1573, 1704, 1917 | `canManageCollaborationRole(resolveProjectAccess(project).currentUserRole)` | Used in 4 rollup queries |
| 1737-1738, 1961-1962, 2301 | `canManagePublication = profile.role === "ceo" || profile.role === "admin" || canManageCollaborationRole(access.currentUserRole)` | The canonical publication-permission rollup — **3 call-sites, identical formula** |
| 2219, 2235, 2254 | `canManageAccess` per estimate sheet | REUSE-AS-IS |
| 2307-2309 | `readLatestSharedLinkRecipientOpen`, `readLatestSharedLinkCommentAt`, `readLatestSharedLinkResponseAt` | Activity-rollup helpers — **only called when `canManagePublication`** (avoids leaking activity to viewers) |
| 2314 | `latestActivityAt = max(comments, responses, opens)` | The unified-activity timestamp — already computed per publication |

**Reuse verdict:** the data layer already computes everything Publisher needs. The new work is **presentation only**.

---

## 3.5 Sidebar (`src/components/sidebar/`)

| File | Purpose |
|---|---|
| `MainSidebar.tsx` | Top-level workshop sidebar — nav items array lives here |
| `SidebarNavItemRow.tsx` | Single nav row (active-link logic, icon, label) |
| `SidebarHeader.tsx` | Brand + workspace switcher |
| `SidebarGlassFilter.tsx`, `glass-grain.ts`, `useLiquidGlassRefraction.ts` | Liquid-glass aesthetic (active branch: `feat/sidebar-redesign`) |
| `sidebar-types.ts` | `SidebarNavItem` type |

**Gap G-UI-1 (mapped to G5):** `MainSidebar.tsx` does NOT currently include a Publisher item. Adding one is a 1-line change to the nav-items array, but the sidebar is on an active feature branch — coordinate.

---

## 3.6 Workshop shell + UI primitives

| File | Purpose | Publisher reuse |
|---|---|---|
| `src/components/workshop/WorkshopPageShell.tsx` | `title`, `eyebrow`, `breadcrumbs`, `contentClassName`, children slot — used by every workshop route | **DIRECT REUSE** — current stub already uses it |
| `src/components/workshop/ProjectPublicationHeader.tsx` | Publication manager trigger UI in project header | CONSUME — Publisher will reuse the modal trigger logic, surface at workspace scope |
| `src/components/workshop/ProjectTeamspaceHeader.tsx` | Teamspaces modal trigger UI in project header | CONSUME — Publisher will surface membership at workspace scope |
| `src/components/workshop/publication/RecipientEmailComposer.tsx` | Recipient email input + add/remove | DIRECT REUSE — extract from modal into Publisher roster |
| `src/components/workshop/publication/SheetPickerList.tsx` | Estimate-sheet multi-select for publication | DIRECT REUSE |
| `src/components/workshop/publication/publication-optimistic.ts` | Optimistic mutation helpers | DIRECT REUSE |
| `src/components/workshop/WorkshopCollectionLayout.tsx` | Standard list page layout | DIRECT REUSE |
| `src/components/workshop/BulkActionToolbar.tsx` + `BulkDestructivePreviewModal.tsx` | Bulk-action surface | DIRECT REUSE for G7 |

### 3.6.1 UI primitives (`src/components/ui/` — 60+ components)

Direct reuse for Publisher, no new primitives needed:

`data-table`, `modal`, `toast`, `accordion`, `dropdown-menu` (full suite), `segmented-control`, `tabs`, `tab-strip`, `empty-state`, `badge`, `status-badge`, `chip`, `search-input`, `skeleton`, `spinner`, `pagination`, `bulk-action-toolbar`, `switch`, `checkbox`, `radio-group`, `date-picker`, `currency-input`, `number-input`, `control-input`, `control-textarea`, `creatable-combobox`, `dropdown-select`, `file-upload`, `progress`, `confidence-indicator`, `delta-badge`, `financial-total-card`, `alert`, `banner`, `breadcrumbs`, `button`, `button-group`, `card`, `avatar`, `context-menu`, `tree` (React Complex Tree wrapper), `tree-panel-header`, `tree-utils`, `tree-row-affordances`, `header-icon-toolbar`, `icon-button`, `toolbar-icon-button`, `toolbar-tooltip`, `panel`, `scroll-area`, `section-label`, `selection-checkbox`, `separator`, `timeline`, `page-header`, `route-loading-overlay`, `estimate-cell`, `tab-strip-utils`, `dropdown-popup`, `dropdown-popup-utils`, `dropdown-menu-group`, `dropdown-menu-item`, `dropdown-menu-renderer-*`.

**Reuse verdict:** Zero new UI primitives needed for Publisher. The design system covers every surface.

---

## 3.7 Receiver-side components (`src/components/share/`)

| File | Purpose | Publisher reuse |
|---|---|---|
| `ShareContainer.tsx` | Top-level client container for `/share/[token]` | REFERENCE-ONLY (different surface) |
| `SharePageHero.tsx`, `SharePageProposalHeader.tsx`, `SharePageSummaryCard.tsx`, `SharePageTabs.tsx` | Public receiver hero / header / summary / tabs | REFERENCE-ONLY |
| `ShareEstimateTreeView.tsx`, `ShareEstimateTreePanel.tsx` | Read-only estimate tree | REFERENCE-ONLY |
| `SharePageComments.tsx`, `SharePageDecision.tsx`, `SharePageDecisionConfirmDialog.tsx` | Comment + decision UI | REFERENCE-ONLY |
| `SharedLinkActivityFeed.tsx` | **Activity feed component** — adaptable for Publisher workspace feed | EXTEND for Publisher workspace activity |
| `SharePageSessionBanner.tsx` | Recipient session info | REFERENCE-ONLY |
| `ProjectPublicationPasswordForm.tsx` | Password gate | REFERENCE-ONLY |
| `share-review-target.ts` | Type definitions | REFERENCE-ONLY |

**Key insight.** `SharedLinkActivityFeed.tsx` already implements the activity-feed UX. Publisher can adapt it (parameterize the data source: per-publication → per-workspace).

---

## 3.8 Publication API surface (`src/app/api/share/[token]/`)

7 endpoints — all receiver-side, all RLS-enforced, all CSRF/origin-checked. Publisher does not add to this list in Phase 1.

| Endpoint | Purpose | Reuse |
|---|---|---|
| `password/route.ts` | Password verify → set HttpOnly access cookie | REUSE-AS-IS |
| `session/route.ts` | Session bootstrap for an authenticated recipient | REUSE-AS-IS |
| `activity/route.ts` | Paginated activity feed for a recipient | REUSE-AS-IS — pattern for Publisher workspace feed |
| `comment/route.ts` | Submit comment (rate-limited 5/min, 20/hr, HTML-stripped, 1000 chars) | REUSE-AS-IS |
| `decision/route.ts` | Submit decision (Accept/Decline/Request Revision) with optimistic snapshot-version check | REUSE-AS-IS |
| `events/route.ts` | Server-sent events stream (publication view, open) | REUSE-AS-IS |
| `unsubscribe/route.ts` | One-click recipient unsubscribe | REUSE-AS-IS |

---

## 3.9 Database / RLS / RPCs

### 3.9.1 Tables touched by Publisher

(from `supabase/migrations/`)

| Table | Purpose | RLS | Key migrations |
|---|---|---|---|
| `project_publications` | Publication record (token_hash, optional password_hash, snapshot JSON, status, expiry) | YES | `20260527120000_project_client_publication.sql`, `20260528220000_project_shared_link_overhaul.sql`, `20260616094500_shared_link_rotation_and_viewed_snapshot_rpc.sql`, `20260621133000_shared_link_atomic_publish_and_digest_slot.sql` |
| `shared_link_recipients` | Recipient email roster per publication | YES | `20260528220000_*`, `20260531175141_shared_link_recipient_unsubscribe.sql`, `20260601151500_lock_down_shared_link_recipient_credentials.sql` |
| `shared_link_comments` | Comments on rows / nodes | YES | `20260528220000_*`, `20260603214151_lock_shared_link_comment_snapshot_version.sql` |
| `shared_link_responses` | Decision (Accept/Decline/Request Revision) | YES | `20260528220000_*`, `20260603210653_lock_shared_link_response_snapshot_version.sql` |
| `shared_link_events` | View / open events | YES | `20260601011500_resend_shared_link_delivery_webhooks.sql`, `20260621042221_shared_link_event_context.sql`, `20260621051701_shared_link_event_context_backfill_repair.sql` |
| `project_members` | Project-scoped role assignments | YES | `20260526142913_project_sheet_collaboration_access.sql`, `20260613192255_teamspace_membership_atomic_guards.sql` |
| `estimate_sheet_access_settings` | Per-sheet access mode (inherits-project / sheet-overrides / restricted) | YES | `20260526142913_*`, `20260601151500_restrict_sheet_collaborator_estimate_inheritance.sql` |
| `estimate_sheet_members` | Per-sheet member overrides | YES | `20260526142913_*` |
| `collaboration_invitations` | Pending invitations | YES | `20260527120000_*`, `20260531164227_collaboration_invitation_accept_by_id.sql`, `20260603195154_harden_revoked_invite_resolution.sql` |
| `collaboration_invitation_tokens` | Pepper-hashed invite tokens | YES | `20260527115342_project_invite_entry_tokens.sql` |
| `collaboration_audit_events` | Per-project audit timeline | YES | `20260601023000_collaboration_invitation_open_audit.sql`, `20260601033000_collaboration_invitation_sender_contact.sql` |
| `account_security_events` | Workspace-wide security events | YES | `20260527072220_auth_account_data.sql`, `20260614140923_harden_security_advisor_findings.sql` |
| `estimate_sheet_events` | Estimate mutation history (Activity) | YES | `20260615150229_harden_estimate_metadata_history_edit_access.sql`, `20260614170000_harden_row_insert_history_edit_access.sql` |

### 3.9.2 Critical RLS predicates

| Migration:line | Predicate | Purpose |
|---|---|---|
| `20260526142913_project_sheet_collaboration_access.sql:279` | `public.current_project_access_rank(target_project_id) >= 30` | Manager threshold for project RBAC |
| `20260526142913_project_sheet_collaboration_access.sql:445` | `public.current_estimate_access_rank(target_estimate_id) >= 30` | Manager threshold for sheet RBAC |
| `20260613192344_teamspace_rls_authuid_perf.sql` | RLS initplan perf optimization for `auth.uid()` | Workspace-membership proof |
| `20260614144712_narrow_private_rls_policies_to_authenticated.sql` | Narrowed private policies to `authenticated` role | Defense in depth |
| `20260621120000_shared_link_d1_d11_hardening.sql` | Shared-link D1–D11 hardening | Lock down recipient credentials + snapshot locking |

### 3.9.3 RPC functions

| Migration | RPC | Purpose |
|---|---|---|
| `20260526142913_*` | `current_project_access_rank(project_id)`, `current_estimate_access_rank(estimate_id)` | Rank computation in RLS |
| `20260616094500_shared_link_rotation_and_viewed_snapshot_rpc.sql` | `rotate_shared_link_token`, `mark_shared_link_viewed` | Token rotation + view tracking |
| `20260621133000_shared_link_atomic_publish_and_digest_slot.sql` | atomic publish + digest slot | Race-free publish + digest throttling |
| `20260618184856_workspace_homebase_summary.sql` | `workspace_homebase_summary` | Homebase dashboard rollup — **pattern reference** for Publisher roster RPC |
| `20260623023000_workspace_projects_summary.sql`, `20260623163000_fix_workspace_projects_summary_pending_invites_readonly.sql` | `workspace_projects_summary` | Workspace projects rollup with pending-invite counts — **direct reuse** for Publisher project filter |
| `20260601151500_restrict_sheet_collaborator_estimate_inheritance.sql` | restrict inheritance | When `access_mode = restricted`, project members do NOT auto-inherit sheet access |

**Gap G-DB-1:** No single RPC returns "all publications visible to current user across their workspace projects". Today each project publication summary is computed in `workspace-repository.ts` per-project. For Phase 1, a server-component loop is sufficient; for Phase 2+, a dedicated `workspace_publications_summary` RPC may be needed. Severity: MED.

**Gap G-DB-2:** No single audit timeline RPC across `shared_link_events + shared_link_comments + shared_link_responses + collaboration_audit_events + estimate_sheet_events`. Phase 1 will union at the application layer (5 small queries, paginated); Phase 2+ may add a `workspace_activity_feed` RPC. Severity: MED.

---

## 3.10 Middleware / route protection (`src/proxy.ts`)

- Line 8: `PROTECTED_PREFIXES = ["/workshop"]` — Publisher is protected.
- Line 10: `PUBLIC_ROUTE_PREFIXES` — `/share` is public (receiver side).
- Line 12-13: `SENSITIVE_ROUTE_CACHE_CONTROL = "private, no-cache, no-store, max-age=0, must-revalidate"` — applied to protected routes.
- Lines 88-99: env-missing fallback to login redirect for protected routes.
- Lines 122-128: unauthenticated protected → login with `next` param.
- Lines 131-141: closed-beta gate — `getClosedBetaAccessForEmail` signs out unauthorized users.

**Publisher impact:** None. Publisher rides on top of the existing `/workshop` protection.

---

## 3.11 Test coverage

### 3.11.1 Vitest (427 files; publisher-relevant subset)

| File | Covers |
|---|---|
| `tests/vitest/security-findings-publication-contracts.test.ts` | Publication security contracts |
| `tests/vitest/security-findings-implementation-contracts.test.ts` | Implementation-level invariants |
| `tests/vitest/security-findings-auth-contracts.test.ts` | Auth-boundary contracts |
| `tests/vitest/security-findings-proof-contracts.test.ts` | Cryptographic proof contracts |
| `tests/vitest/security-findings-library-tooling-contracts.test.ts` | Tooling-side contracts |
| `tests/vitest/security-automation-config.test.ts` | Security automation config |
| `tests/vitest/security-findings-test-helpers.ts` | Shared security-test helpers |
| `tests/vitest/project-publication-security.test.ts` | Publication security e2e |
| `tests/vitest/project-publication-security-hardening.test.ts` | Hardening invariants |
| `tests/vitest/project-publication-security-headers.test.ts` | Security headers on publication routes |
| `tests/vitest/project-publication-one-published-index.test.ts` | One-active-publication invariant |
| `tests/vitest/project-collaboration-actions.test.ts` | Collaboration server actions |
| `tests/vitest/project-collaboration-realtime.test.ts` | Realtime RLS |
| `tests/vitest/project-collaboration-schema.test.ts` | Schema invariants |
| `tests/vitest/project-collaboration-summary.test.ts` | Summary rollups |
| `tests/vitest/project-invite-entry-route.test.ts` | Invite route |
| `tests/vitest/project-invite-entry-schema.test.ts` | Invite schema |
| `tests/vitest/project-invite-feature-flag.test.ts` | Feature-flag gate |
| `tests/vitest/project-invite-sign-out-route.test.ts` | Sign-out-recovery route |
| `tests/vitest/pending-invite-cookie.test.ts` | Pending-invite bridge cookie |
| `tests/vitest/invite-accept-origin.test.ts` | Origin check on accept |
| `tests/vitest/activity-security.test.ts` | Activity audit security |
| `tests/vitest/notification-rls-proof.test.ts` | Notification RLS proof |
| `tests/vitest/projects-page-access-tabs.test.tsx` | Projects page access tabs UI |
| `tests/vitest/projects-page-shared-access.test.tsx` | Shared access badges |
| `tests/vitest/design-enforcer-share-allowlist.test.ts` | Design-system allowlist for share |
| `tests/vitest/landing-security-headers.test.ts` | Landing headers (reference for header testing pattern) |
| `tests/vitest/beta-access-required-page.test.ts` | Closed-beta gate |
| `tests/vitest/closed-beta-access.test.ts` | Closed-beta logic |
| `tests/vitest/closed-beta-access-migration.test.ts` | Closed-beta DB migration |
| `tests/vitest/collaboration-colors.test.ts`, `collaboration-colors-contrast.test.ts` | Profile color accessibility |

### 3.11.2 E2E (Playwright — 20+ specs)

Publisher-relevant specs:

| Spec | Covers |
|---|---|
| `e2e/shared-link-receiver.spec.ts` | `/share/[token]` receiver end-to-end |
| `e2e/teamspace-collaboration.spec.ts` | Teamspaces modal + realtime |
| `e2e/project-invite-entry.spec.ts` | `/invite/[token]` flow |
| `e2e/auth.spec.ts` | Auth smoke |
| `e2e/workshop-route-error-boundaries.spec.ts` | Workshop route error boundaries (pattern reference) |
| `e2e/notifications-center.spec.ts` | Notifications center (pattern reference) |

**Gap G-TEST-1:** No e2e spec for `/workshop/publisher` (page is a stub today). Phase 1 implementation must add one. Severity: required for Phase 1 exit.

---

## 3.12 Existing UI conventions (workshop admin pages)

Reference implementations for the Publisher roster UX:

| Route | Pattern to mirror |
|---|---|
| `src/app/workshop/projects/page.tsx` | Project list with filter tabs (All / Owned / Shared), search, grid layout |
| `src/app/workshop/projects/[projectId]/page.tsx` | Project dashboard (shell + bento) |
| `src/app/workshop/library/page.tsx` | Library list with category tree + dense mode |
| `src/app/workshop/settings/workspace/page.tsx` | Settings form with audit |
| `src/app/workshop/settings/users/page.tsx` | User management list (closest analog to Publisher roster) |
| `src/app/workshop/feedback/page.tsx` | Feedback list with status filter |

---

## 3.13 Documentation trail

| Doc | Relevance |
|---|---|
| `.ai/06_specs/shared-link-and-publication-spec.md` | Canonical publication spec — Publisher inherits §1 (security architecture), §2 (presentation), §3 (collaboration pipelines) |
| `.ai/06_specs/teamspaces-collaboration-spec.md` | Canonical RBAC spec — Publisher exposes the role hierarchy + access modes |
| `.ai/06_specs/proposal-package-system.md` | Canonical proposal spec — Publisher surfaces the V2 shared-link flow |
| `.ai/06_specs/walkthrough-shared-link-overhaul.md` | V2 shared-link overhaul walkthrough (P0–P14 file map) |
| `.ai/06_specs/state-and-supabase-foundation.md` | TanStack + Zustand foundation |
| `.ai/06_specs/supabase-auth-setup.md` | Auth setup (CEO role mapping) |
| `.ai/06_specs/initial-data-model.md` | Canonical schema |
| `.ai/06_specs/deep/architecture-overview.md` | Architecture overview |
| `.ai/06_specs/feature-inventory.md` | Feature cross-reference |
| `.ai/03_plans/2026-06-19-Launch-Readiness-Audit/Share-Routes-And-Proxy-Self-Gating/` | Release-blocking findings |
| `.ai/03_plans/2026-06-19-Launch-Readiness-Audit/RLS-RPC-And-DB-Security/` | DB SECURITY DEFINER posture |
| `.ai/03_plans/2026-06-19-Launch-Readiness-Audit/Auth-And-Session-Security/` | Auth/session hardening |
| `.ai/03_plans/2026-06-21-Ponytail-Pass-Plan/` | Codebase over-engineering baseline |
| `.ai/10_state/decisions.md` | Architecture decisions (grep for share/RBAC/publication) |
| `.ai/10_state/current-state.md` | FAST PATH block (top of file) |
| `.ai/10_state/known-issues.md` | Known issues |
| `DESIGN.md` | Design philosophy (alpha) |
| `AGENTS.md` | Entry point |

---

## 3.14 Build / CI / validation

| Surface | Command / file |
|---|---|
| Type check | `bun run type-check` (`tsc --noEmit`) |
| Lint | `bun run lint` (ESLint 9 flat config) |
| Design-system lint | `bun run lint:design-system` (`scripts/enforce-app-design-system.mjs`) |
| Bun unit tests | `bun run test` (`tests/unit/`) |
| Vitest DOM tests | `bun run test:dom` (`tests/vitest/`) |
| Playwright E2E | `bun run test:e2e` (Chromium; mutating specs gated by env vars) |
| Build | `bun run build` (Next.js production) |
| Full gate | `bun run validate` (type-check + lint + design-system + unit + dom) |
| CI workflow | `.github/workflows/ci.yml` (PR + push to main/feat/*) |

**Known pre-existing reds on `main`** (per `current-state.md` FAST PATH): full `bun run validate` is red (charts `set-state-in-effect`; `ProposalExportPreviewDialog` design-lint). Not caused by Publisher. Use targeted DOM matrices during Phase 1.

---

## 3.15 Audit summary

The Publisher page sits on top of a mature, security-hardened, deeply tested substrate. **The audit identifies no rebuilds.** Every capability the user described — shared links, published projects, RBAC (all sheets / some sheets / single sheet), client view/edit/comment/decision — has backing infrastructure. The remaining work is presentation, navigation, and small schema extensions for the activity feed (G4) and bulk operations (G7, post-launch).

The next document (`04_REQUIREMENTS_SPECIFICATION.md`) translates this audit into numbered, testable requirements.

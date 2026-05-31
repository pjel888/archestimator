# 04 — Prioritized Improvement Roadmap: Shared Link System

**Date:** 2026-05-30
**Purpose:** Lane-local phased plan for shared link manager improvements with concrete code snippets, exact file paths, and expected blast radius for each change.

**Canonical sequencing note:** Root `../09-unified-implementation-flow.md` controls cross-lane order. The phase labels below are lane-local source labels.

---

## Phase 0 — Manager Visibility

### P0.1: Link-Status Indicator on Project Cards

**What:** Show a small "Shared" badge on project cards in the list page when a live shared link exists.

**File:** `src/components/workshop/LiveProjectCard.tsx`

**Data source:** `ProjectPublicationSummary` already contains `status` and `clientLinkPath`. Pass it as an optional prop or fetch alongside the project list.

**Change:**
```tsx
// LiveProjectCard.tsx — add new optional prop
interface LiveProjectCardProps {
  // ... existing props
  publicationStatus?: ProjectPublicationStatus | null;
  publicationClientLinkPath?: string | null;
}

// In the card rendering:
{publicationStatus === "published" ? (
  <span className="rounded-xs bg-emerald-50 px-1.5 py-0.5 text-[8px] font-medium uppercase text-emerald-700">
    Shared
  </span>
) : null}
```

**Blast radius:** Low. New optional props. Requires extending `listCurrentWorkspaceProjects()` to include publication status.

### P0.2: One-Click "Copy Link" from Header Rail

**What:** When a live link exists, allow copying it without opening the modal.

**File:** `src/components/workshop/ProjectPublicationHeader.tsx`, lines 179-188

**Change:** Split button — left side opens modal, right "Copy" icon copies immediately:
```tsx
{effectiveStatus === "published" && clientLinkPath ? (
  <div className="flex h-full items-center gap-0">
    <Button onClick={() => { setOpen(true) }}>Shared link</Button>
    <Button onClick={() => void copyClientLink()} title="Copy shared link">
      <LinkSimple size={12} />
    </Button>
  </div>
) : (
  <Button onClick={() => { setOpen(true) }}>Shared link</Button>
)}
```

**Blast radius:** Low. UI change only. `copyClientLink()` function already exists.

### P0.3: New-Activity Indicator on Header Rail Button

**What:** Orange dot on the "Shared link" button when unseen activity exists.

**File:** `src/components/workshop/ProjectPublicationHeader.tsx`

**Change:**
```tsx
<Button
  className="relative min-h-6 rounded-xs px-2..."
  onClick={() => { setActiveTab("activity"); setOpen(true); }}
>
  <UploadSimple size={12} />
  Shared link
  {hasUnseenActivity ? (
    <span className="absolute -right-0.5 -top-0.5 size-2 rounded-xs bg-orange-500 ring-1 ring-white" />
  ) : null}
</Button>
```

**Data:** Store `lastSeenAt` timestamp in React state (or localStorage for persistence). Mark seen when Activity tab is opened. Compare against most recent activity timestamp from `loadSharedLinkActivity`.

**Blast radius:** Low. Additive dot, requires `lastSeenAt` state + condition.

---

## Phase 1 — Security Hardening

### P1.1: Durable Rate Limiting for Public Share Endpoints

**What:** Migrate comment rate limiter and password lockout from in-memory to DB-backed. Add rate limiting to unthrottled public endpoints (snapshot API, events API).

**Files:** `src/app/api/share/[token]/comment/route.ts`, `src/app/api/share/[token]/password/route.ts`, `src/app/api/share/[token]/route.ts`, `src/app/api/share/[token]/events/route.ts`, new lib module, new migration

**Change:** Replace `rateBuckets = new Map()` in comment route with the same DB-backed rate limiter designed in `../06-performance-and-observability-plan.md`. Same for password lockout. Add IP+token_hash rate limiting to snapshot API and events API.

**Blast radius:** Medium. Changes persistence layer for 4 endpoints. New migration for rate_limits table.

---

## Phase 2 — Recipient Experience & Identity

### P2.1: Recipient Identity Indicator

**What:** Show "You are viewing as [email]" in the share page header.

**File:** `src/components/share/SharePageSessionBanner.tsx`

**Blast radius:** Low. Additive to existing banner component.

### P2.2: Per-Recipient View Tracking

**What:** Track and display which recipient opened the link.

**Files:** `src/lib/publication/public-repository.ts`, `src/components/workshop/ProjectPublicationHeader.tsx`

**Blast radius:** Medium. Requires event enrichment with recipient_id from session cookie. New UI in Activity tab or modal sidebar.

### P2.3: Mobile-Optimized Decision Layout

---

## Phase 3 — Content & Polish

### P3.1: Snapshot Staleness Warning

**What:** Warn manager when the published snapshot is older than current estimate data.

**Files:**
- `src/lib/publication/actions.ts` — new helper: `isSnapshotStale(publicationId)`
- `src/components/workshop/ProjectPublicationHeader.tsx` — warning banner in modal

**Change:**
```tsx
{isSnapshotStale ? (
  <p className="rounded-xs bg-amber-50 px-2 py-1 text-[9px] text-amber-700">
    Snapshot is {daysStale} days behind current data. Update shared page.
  </p>
) : null}
```

**Blast radius:** Medium. Requires comparing `snapshot_json.generatedAt` vs latest `estimates.updated_at`.

### P3.2: Search/Filter in Shared Estimates

**What:** Client-side text filter for estimate rows in Grid Preview mode.

**File:** `src/components/share/SharePageTabs.tsx`

**Change:** Add a search input above the grid table that filters rows by description, designation, material.

**Blast radius:** Medium. New client-side state + filter logic in SharePageTabs.

### P3.3: Print Stylesheet

**What:** `@media print` styles on the share page.

**File:** New `src/app/share/print.css` or co-located styles.

**Blast radius:** Low. Pure CSS addition.

---

## Phase 4 — Email & Compliance

### P4.1: Use Real Sender Name in Emails

**What:** Replace "A team member" with the manager's display name.

**File:** `src/lib/publication/actions.ts`, line 567

**Change:**
```typescript
// Resolve sender from context (available via assertProjectPublicationManager)
const sender = context.currentUserId
  ? await resolveProfileDisplayName(context.currentUserId)
  : "A team member";
```

**Blast radius:** Low. One variable change, requires profile lookup.

### P4.2: Real Owner Email for Digests

**What:** Replace `"owner@archestimator.test"` with actual owner email.

**File:** `src/lib/publication/actions.ts`, line 686

**Change:** Resolve owner from project → workspace → workspace_members with owner role → profile email.

**Blast radius:** Medium. Requires additional DB query.

### P4.3: Add Unsubscribe Link to Email Template

**What:** CAN-SPAM/GDPR compliance.

**File:** `src/lib/publication/actions.ts`, email template HTML

**Blast radius:** Low. Template change only.

---

## Phase 5 — Advanced Features

### P5.1: Confirmation Dialogs for Destructive Actions

**What:** Confirm before "Turn off link" and "New link" (rotate).

**File:** `src/components/workshop/ProjectPublicationHeader.tsx`

**Blast radius:** Low. UI-only confirmation state.

### P5.2: Password Strength Indicator

**What:** Weak/medium/strong bar on the password input.

**File:** `src/components/workshop/ProjectPublicationHeader.tsx`, Access tab

**Blast radius:** Low. New sub-component.

### P5.3: Comment Threading

**What:** Allow replies to comments.

**Schema change:** Add `parent_comment_id` to `shared_link_comments`.

**Blast radius:** High. Schema migration + new UI rendering for threads.

### P5.4: PDF Export for Recipients

**What:** "Download as PDF" button on share page.

**Files:** New or modified print/PDF export utility.

**Blast radius:** High. New feature requiring PDF generation pipeline.

---

## Phase Summary

| Phase | Items | Code Changes | Blast Radius |
|-------|-------|-------------|-------------|
| **P0** | Card badges + one-click copy + activity dot | ~50 lines across 3 files | Low |
| **P1** | Durable public endpoint rate limiting | persistence layer + 4 endpoints | Medium |
| **P2** | Identity indicator + view tracking + mobile layout | ~60 lines across 4 files | Medium |
| **P3** | Staleness warning + search + print styles | ~70 lines across 3 files | Medium |
| **P4** | Real sender name + owner email + unsubscribe | ~40 lines across 2 files | Low-Medium |
| **P5** | Confirmations + password strength + threading + PDF | ~150 lines across 5 files | Medium-High |

## Dependency Graph

```
P0 (visibility) ── standalone
  │
  ├── P1 (security hardening) ── required before external-beta/public endpoint expansion claims
  │
  ├── P2 (recipient UX) ── depends on P0 for tracking foundation and Wave 2 recipient-token query alignment
  │
  ├── P3 (content + polish) ── can run parallel with P2 after receiver layout ownership is clear
  │
  ├── P4 (email + compliance) ── can run parallel with P2+P3
  │
  └── P5 (advanced) ── threading/PDF require separate PRDs
```

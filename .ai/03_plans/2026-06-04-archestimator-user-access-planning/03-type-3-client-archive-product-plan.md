# 03 — Type 3: Paid Client / Buyer Archive Subscriber — Product Plan

**Status:** Planning  
**Last updated:** 2026-06-04

---

## 1. Product Definition

### What is a Type 3 user?

A **Paid Client / Buyer Archive Subscriber** is an external party (client, property owner, developer, investor) who:

1. Has received one or more proposals/estimates from an Archestimator user (Type 1)
2. Has paid a monthly subscription for **durable archive access** to those proposals
3. Retains read-only access to archived estimate sheets, activity history, comments, and decisions **even if the source project is deleted by the Type 1 user**
4. Can comment, approve, deny, or request revisions on active publications
5. Has a persistent identity (account) rather than a transient share-link session

### What Type 3 is NOT

- **NOT a free user** — this is a monetized actor
- **NOT a collaborator** — cannot edit estimates, create projects, or manage access
- **NOT tied to one contractor** — a client may receive proposals from multiple Archestimator users
- **NOT dependent on the source project** — archive survives deletion

---

## 2. Value Proposition

### For the Client (Type 3)

> "Keep every proposal and estimate you receive, forever. Compare contractors, track revisions, and reference past project costs — all in one place, even after the project is complete."

- **Durable record:** Proposals don't disappear when the contractor archives their project
- **Cross-contractor comparison:** View proposals from multiple contractors side by side
- **Revision history:** See what changed between proposal versions
- **Decision audit trail:** Your approvals, denials, and comments are preserved
- **Export anytime:** Download archived proposals as PDF or XLSX

### For the Contractor (Type 1)

> "Your clients get a professional archive of every proposal you send. They can reference it anytime — reducing back-and-forth and building trust. You control what's published; they control their archive."

- **Professional trust signal:** Offering archive access signals confidence in your estimates
- **Reduced support load:** Clients self-serve past proposals instead of asking you to resend
- **Competitive differentiation:** Not just a share link — a permanent client record
- **No additional work:** Archives are created automatically at publication time
- **Clean project hygiene:** You can delete old projects without breaking client archives

### For Archestimator (Business)

- **Recurring revenue:** Monthly subscription from the client side
- **Network effects:** Clients who use Archestimator to manage proposals from one contractor will want other contractors to use it too
- **Stickiness:** Once a client has their archive in Archestimator, switching costs increase
- **Market expansion:** Expands Archestimator from "tool for contractors" to "platform for the construction proposal ecosystem"

---

## 3. Pricing Model (Initial Proposal)

### Tier: Client Archive

| Feature | Included |
|---------|----------|
| Monthly price | $4.99/month (or local equivalent) |
| Annual price | $49/year (≈$4.08/month, ~18% discount) |
| Archived proposals | Unlimited (from any number of contractors) |
| Proposal viewing | Read-only, full estimate tree + totals |
| Activity history | Full timeline preserved |
| Comments & decisions | Read-only archive of own comments/decisions |
| Export | PDF and XLSX download of archived snapshots |
| Active proposal interaction | Comment, approve, deny, revision request (on live publications) |
| Email notifications | New proposal received, revision published, nearing expiry |

### Free Tier (Type 4 + transitional)

| Feature | Included |
|---------|----------|
| Share link viewing | Password-gated, view-only |
| Comments/decisions | On active publications (requires email verification) |
| Archive access | **None** — share link expires/revokes → access lost |
| Export | Not available to free viewers |

### Key Pricing Principle

> The archive subscription is **client-pays**, not contractor-pays. The contractor already pays by using Archestimator (eventually, when workspace pricing is introduced). The client pays for durable access to their proposals.

---

## 4. User Journey

### Acquisition Path

```
Contractor (Type 1) publishes proposal
  → Sends share link to client
    → Client (Type 4) views proposal
      → Client comments/approves
        → "Save this proposal to your archive" prompt
          → Client creates account (email + optional password)
            → "Subscribe to keep this and all future proposals" → Stripe Checkout
              → Client becomes Type 3
```

### Lifetime Flow

```
Client signs up for archive subscription
  → Receives proposals from Contractor A → auto-archived
  → Receives proposals from Contractor B → auto-archived
  → Contractor A deletes old project → Client's archive unaffected
  → Client cancels subscription → archive becomes read-only frozen (no new proposals)
  → Client resubscribes → archive reactivated + missed proposals captured
```

### Cancellation & Offboarding

| State | Behavior |
|-------|----------|
| Active | Full access, new proposals auto-archived |
| Past due | Grace period (7 days), access maintained, payment reminder |
| Cancelled | Archive frozen: existing archives viewable, no new proposals added |
| Expired (cancelled + 30 days) | Archive read-only for 30 days post-cancellation, then data retention per legal requirements |
| Deleted | GDPR/right-to-deletion: client can request full data purge |

---

## 5. Client Portal UX

### Route: `/client/archive`

**Purpose:** The client's home base. Shows all archived proposals across all contractors.

**Layout:**
```
┌──────────────────────────────────────────────┐
│  My Archive                          [⚙️]    │
│  client@email.com                             │
├──────────────────────────────────────────────┤
│  [Search proposals...]            [Filter ▾]  │
├──────────────────────────────────────────────┤
│  Active Proposals (3)                         │
│  ┌────────────────────────────────────────┐   │
│  │ Lewis Residence — Living Room Extension │   │
│  │ From: Philip Lewis · Jun 4, 2026       │   │
│  │ Status: Pending approval  ·  ₱2.45M    │   │
│  │ [View] [Comment] [Approve] [Deny]      │   │
│  └────────────────────────────────────────┘   │
│  ...                                          │
├──────────────────────────────────────────────┤
│  Archived Proposals (12)                      │
│  ┌────────────────────────────────────────┐   │
│  │ Synthetic Hotel — Lobby Renovation     │   │
│  │ From: Philip Lewis · Mar 15, 2026      │   │
│  │ Status: Approved  ·  ₱8.2M              │   │
│  │ [View Archive] [Download PDF] [XLSX]   │   │
│  └────────────────────────────────────────┘   │
│  ...                                          │
└──────────────────────────────────────────────┘
```

### Key UX Principles

1. **Contractor branding preserved** — each proposal shows the contractor's name/logo
2. **Status clarity** — active (can interact) vs archived (read-only snapshot)
3. **Source-deleted indicator** — if the contractor deleted the project: "Source project archived by contractor — your archive is preserved"
4. **Cross-contractor search** — filter by contractor, project name, date range, status
5. **Export without friction** — one-click PDF/XLSX download of any archive snapshot

---

## 6. Archive Data Model (Logical)

### What gets archived at publication time

When a Type 1 publishes a proposal (creates a `project_publication`), the system should also create an **independent archive snapshot**:

```
ClientArchiveSnapshot
  ├── snapshot_id (UUID, PK)
  ├── subscription_id → client_archive_subscriptions
  ├── source_publication_id → project_publications (nullable — survives cascade)
  ├── source_project_id (UUID — nullable, for reference only)
  ├── source_workspace_id (UUID — nullable)
  ├── contractor_name (text — denormalized)
  ├── contractor_email (text — denormalized)
  ├── project_name (text — denormalized)
  ├── project_code (text)
  ├── client_name (text — denormalized)
  ├── estimate_data (JSONB — frozen estimate tree + row items + totals)
  ├── activity_history (JSONB — frozen activity log at publication time)
  ├── comments (JSONB — frozen comments at publication time)
  ├── decisions (JSONB — frozen decisions at publication time)
  ├── snapshot_version (integer)
  ├── published_at (timestamptz)
  ├── source_deleted_at (timestamptz — NULL if source still exists)
  ├── created_at (timestamptz)
  └── updated_at (timestamptz)
```

### Key Properties

- **Independent PK** — no FK to `projects` or `project_publications`
- **Source references are nullable** — they become NULL when source is deleted
- **Denormalized contractor info** — survives contractor account deletion
- **Frozen data** — once created, snapshot is immutable (except `source_deleted_at`)
- **Versioned** — each republication creates a new snapshot version

---

## 7. Feature List

### Phase 1: Foundation (MVP for Type 3)

| Feature | Priority | Dependencies |
|---------|----------|-------------|
| `client_archive_subscriptions` table | P0 | None |
| Stripe integration (checkout + webhooks) | P0 | Stripe account |
| `client_archive_snapshots` table | P0 | Publications exist |
| Archive snapshot creation at publication time | P0 | Publication flow |
| Archive read API routes | P0 | Snapshots exist |
| `/client/archive` route + UI | P0 | Auth + snapshots |
| `deletion_tombstones` table | P0 | Mass deletion flow |
| Soft-delete for projects with active subscribers | P0 | Tombstones exist |
| Type 4 → Type 3 identity upgrade flow | P1 | Share page exists |
| Email verification for share-link viewers | P1 | Auth infrastructure |

### Phase 2: Client Experience

| Feature | Priority | Dependencies |
|---------|----------|-------------|
| Search/filter across archives | P1 | Archive route exists |
| PDF export of archive snapshots | P1 | Snapshots exist |
| XLSX export of archive snapshots | P1 | XLSX export code (exists) |
| Cross-contractor archive view | P1 | Multiple contractors |
| "Source deleted" indicator | P1 | Tombstones exist |
| Email notifications (new proposal, revision) | P2 | Resend integration (exists) |
| Subscription management (cancel, resume, payment method) | P2 | Stripe customer portal |

### Phase 3: Advanced

| Feature | Priority | Dependencies |
|---------|----------|-------------|
| Side-by-side proposal comparison | P3 | Multiple archives |
| Cost trend visualization | P3 | Historical snapshot data |
| Contractor discovery (find contractors on Archestimator) | P4 | Network effects |
| Team/client organization accounts | P4 | Multi-user client accounts |

---

## 8. Revenue Projection (Illustrative)

Assumptions:
- 100 active contractors (Type 1) using Archestimator
- Each contractor sends proposals to ~5 unique clients/month
- 5% of clients subscribe to archive ($4.99/month)
- Average client subscribes for 12 months

```
Monthly new clients: 100 contractors × 5 clients × 5% = 25 new subscribers/month
Month 1:  25 subscribers × $4.99 =     $124.75 MRR
Month 6:  150 subscribers × $4.99 =    $748.50 MRR
Month 12: 300 subscribers × $4.99 =  $1,497.00 MRR
Year 1 total: ~$10,000
```

This is supplementary revenue to the core contractor-side pricing (workspace subscriptions, not yet implemented). The client archive pricing should be validated with real users before scaling assumptions.

---

## 9. Competitive Landscape

### Direct Competitors (Construction Estimating)

- **Buildxact, CostX, PlanSwift, STACK** — none offer client archive portals
- **Procore** — has a client-facing "Documents" tab but no paid archive subscription
- **Bluebeam** — document-centric, no proposal archive subscription

### Indirect Competitors (Document/Proposal Archives)

- **Dropbox, Google Drive** — generic file storage, no structured proposal data
- **DocuSign** — signature-focused, limited archive browsing
- **PandaDoc, Proposify** — proposal creation, limited client archive features

**Archestimator's advantage:** Purpose-built for construction estimates. Structured cost data, hierarchy tree, activity history — not just a PDF dump.

---

## 10. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Clients won't pay $4.99/month | Medium | High | Start with free trial (30 days), validate willingness-to-pay |
| Contractors see archive as threat (clients compare costs) | Medium | Medium | Contractor controls what's published; archive is a trust signal |
| Stripe integration complexity delays launch | Low | Medium | Use Stripe Checkout (hosted) for MVP, not custom UI |
| Deletion tombstone creates data retention obligations | Medium | Low | Clear ToS: archives preserved for active subscribers only |
| Cross-contractor privacy concerns | Low | High | Each archive is subscriber-private; contractors cannot see other contractors' archives |
| GDPR/data deletion requests | Low | Medium | Implement full data export + deletion in subscription settings |

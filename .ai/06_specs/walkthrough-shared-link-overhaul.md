# Shared Link Overhaul — Implementation Walkthrough

**Status:** Complete (P0–P14, 2026-05-29)
**Source:** `.ai/09_archive/store/2026-05-29-project-shared-link-overhaul-complete/` (13 detailed plan docs)
**Evidence branch:** `feature/shared-link-overhaul-v2` (worktree at `.worktrees/feature/shared-link-overhaul-v2/`)
**Evidence SHAs:** 859285c (P0) → 4c93bb1 (P13), plus post-P14 polish commits

## Overview

The Shared Link Overhaul (V2) replaces the original V1 "Public link" project publication with a full production-grade manager and receiver experience. V1 provided basic view-only `/share/[token]` with optional password protection. V2 adds recipient management, tabbed navigation, client comments and decisions, owner activity feeds, email digests, security hardening, error resilience, and comprehensive testing.

## Key Files

### Publication Data & Actions
- `src/lib/publication/types.ts` — Publication types (`ProjectPublicationStatus`, `PublicationSnapshotTreeNode`, `PublicationSnapshotRow`, `ProjectPublicationSnapshot`)
- `src/lib/publication/actions.ts` — Manager actions: create/republish/rotate/revoke/link recipients, add/remove recipients, load activity, trigger digests
- `src/lib/publication/public-repository.ts` — Public-facing data: resolve access/snapshot, verify password, record events, comments, decisions
- `src/lib/publication/security.ts` — Crypto: token hashing (SHA-256 peppered), scrypt passwords, access cookies, CSRF, rate limiting, lockout
- `src/lib/publication/snapshot.ts` — Snapshot builder from project estimate data

### Share Page (Receiver)
- `src/app/share/[token]/page.tsx` — Public share receiver page
- `src/components/share/SharePageTabs.tsx` — Tabbed navigation (Link | Sheets | Access | Recipients | Activity)
- `src/components/share/SharePageComments.tsx` — Client comment composer + flat list
- `src/components/share/SharePageDecision.tsx` — Accept/Decline/Request Revision UI
- `src/components/share/SharedLinkActivityFeed.tsx` — Owner activity feed with Realtime updates
- `src/components/share/SharePageHero.tsx` — Cover image + project metadata
- `src/components/share/SharePageSessionBanner.tsx` — Recipient session status banner
- `src/components/share/ShareEstimateTreeView.tsx` — Reconstructed estimate tree (read-only WorkshopTree)
- `src/components/share/ShareEstimateTreePanel.tsx` — Tree view panel
- `src/components/share/ShareFloatingTreeNav.tsx` — Sticky floating nav with IntersectionObserver
- `src/components/share/ProjectPublicationPasswordForm.tsx` — Password gate with lockout

### Publication Manager (Workshop)
- `src/components/workshop/ProjectPublicationHeader.tsx` — Header control with Shared link modal
- `src/components/workshop/publication/RecipientEmailComposer.tsx` — Email chip input with Resend delivery

### Share API Routes
- `src/app/api/share/[token]/route.ts` — Main share endpoint (GET snapshot)
- `src/app/api/share/[token]/password/route.ts` — Password verification
- `src/app/api/share/[token]/comment/route.ts` — Comment submission (CSRF + rate limited)
- `src/app/api/share/[token]/decision/route.ts` — Decision submission (Accept/Decline/Revise)
- `src/app/api/share/[token]/activity/route.ts` — Activity feed (owner-only)
- `src/app/api/share/[token]/events/route.ts` — Event recording

### Share Page Utilities
- `src/lib/share/aggregate-share-chart-buckets.ts` — Aggregates publication rows to `CostBucket[]` by discipline
- `src/lib/share/reconstruct-share-tree.ts` — Client-side tree reconstruction from flat snapshot rows
- `src/lib/charts/types.ts` — Shared `CostBucket` type
- `src/components/charts/CostDonutChart.tsx` — Shared D3 donut chart component

### Database Migration
- `supabase/migrations/20260528220000_project_shared_link_overhaul.sql` — Recipient tables, comments, decisions, security-definer RPCs

### Tests
- `tests/vitest/project-publication-actions.test.ts`
- `tests/vitest/project-publication-activity.test.tsx`
- `tests/vitest/project-publication-comments.test.tsx`
- `tests/vitest/project-publication-decision.test.tsx`
- `tests/vitest/project-publication-header.test.tsx`
- `tests/vitest/project-publication-page.test.tsx`
- `tests/vitest/project-publication-public-repository.test.ts`
- `tests/vitest/project-publication-schema.test.ts`
- `tests/vitest/project-publication-security-headers.test.ts`
- `tests/vitest/project-publication-security.test.ts`
- `tests/vitest/project-publication-snapshot.test.ts`
- `tests/vitest/project-publication-summary.test.ts`
- `tests/vitest/share/reconstruct-share-tree.test.ts`

## Implementation Sequence

### P0 — Foundation
- Route audit, blast radius analysis (500 nodes, 0 crit flows)
- Resend email integration scaffold
- Red tests for renamed terminology

### P1 — Rename "Public link" → "Shared link"
- All copy, labels, route text, and type names updated
- Sheets tab added to receiver UI with `SheetPickerList`
- Backwards-compatible with existing tokens

### P2 — Receiver Tabs
- Tabbed navigation spec (ARIA tabs pattern)
- Link, Sheets, Access, Recipients, Activity tabs
- Responsive layout (sidebar on lg, stack on mobile)

### P3 — Database Migration
- `publication_recipients` and `publication_recipient_groups` tables
- Comment/decision tables with `snapshot_version` locking
- Security-definer RPCs for gated writes
- Additive only — no V1 column removals

### P4 — Email & Recipient Management
- RecipientEmailComposer with chip input + validation
- Add/remove recipient server actions
- Resend email delivery with `?rt=` recipient token links
- Graceful email failure (link creation always succeeds)

### P5 — Recipient Session Security
- `shared_link_session_[token]` HttpOnly cookie
- Recipient token verification on `?recipient=` load
- `useSharedLinkSession` hook (safe client flag)
- UI blocking guard in SharePageTabs

### P6 — Client Comments
- `POST /api/share/[token]/comment` with CSRF + session validation
- In-memory LRU rate limiting (5/min, 20/hour per recipient)
- HTML-strip sanitization + 1000-char truncation
- SharePageComments (flat list + composer + counter + optimistic)

### P7 — Client Decisions
- `POST /api/share/[token]/decision` with version locking
- Accept/Decline/Request Revision UI + confirmation modal
- Read-only badge after decision, post-decision comments allowed
- 409 duplicate handling

### P8 — Activity & Notifications
- `GET /api/share/[token]/activity` (owner-only, is_internal filter)
- SharedLinkActivityFeed with Realtime live updates
- Owner email digest (rate-limited 1/15min per publication)
- Project sidebar badge for unseen activity

### P9 — Visual Polish
- SharePageHero (cover image from project metadata + Next/Image)
- 32px thumbnails in estimate rows
- `loading="lazy"` on all receiver images
- Responsive audit (horizontal swipe preserved, safe-area-inset-bottom)
- next.config.ts remotePatterns for component bucket images

### P10 — Password Security Hardening
- In-memory progressive lockout store
- Delay matrix: 1s → 2s → 4s → 8s → ...
- Hard 5-attempt / 15-minute lockout per IP+token
- `password_attempt` audit events on every attempt

### P11 — CSP & Security Headers
- CSP upgraded from Report-Only to enforced on `/share/:path*`
- 3 security headers added to share API routes (nosniff, DENY, referrer)
- Verified no tracking scripts fire on share routes

### P12 — Error Resilience
- Client-side retry (3 attempts) + offline queue (sessionStorage)
- Circuit breakers for comment endpoint + email dispatch
- Structured error logging (level, route, errorCode, ipHash)

### P13 — Testing & Validation
- All 13 publication Vitest files updated for "Shared link" strings
- Unit tests for 5 new components
- Integration tests for 3 new API routes
- E2E/pen/load via documented simulations (env gaps for full Playwright)

### Post-P14 Share Estimate View Enhancement (P0–P5)
- Per-sheet D3 donut charts (discipline-based aggregation via `aggregateRowsByDiscipline`)
- Sub-tab system (Tree View | Grid Preview) with ArrowLeft/Right keyboard isolation
- Designation-based tree reconstruction (`reconstructTreeFromRows`) + read-only `WorkshopTree<TNode>`
- Floating navigation tree (desktop lg+, sticky, scrollIntoView + IntersectionObserver)
- Shared `CostDonutChart` + `CostBucket` type extraction

## Known Limitations

- P3: Local Supabase/Docker verification blocked (proceeded with linked remote + sims)
- Rate limiting, circuit breakers, lockout: in-memory only (not durable/Redis)
- P13: E2E/penetration/load via vitest simulations (not full Playwright due to env gaps)
- No PDF/download artifacts (future plan)
- Some TS casts in email/Resend paths (temporary until type regeneration)

## Security Architecture

```
/share/[token] request
    │
    ▼
Token resolution: SHA-256(pepper + rawToken) → project_publications.token_hash
    │
    ├── Password-protected?
    │   ├── YES → Check HttpOnly access cookie
    │   │   ├── Valid → Serve snapshot
    │   │   └── Invalid → Password gate (lockout, progressive delay)
    │   └── NO → Serve snapshot directly
    │
    ▼
Snapshot: whitelisted DTO from project_publications.snapshot_json
  (strip IDs, emails, private metadata, live workspace authorization)
    │
    ▼
Receiver UI: read-only tabs (Link | Sheets | Access | Recipients | Activity)
  with optional sessions for authenticated comment/decision flows
```

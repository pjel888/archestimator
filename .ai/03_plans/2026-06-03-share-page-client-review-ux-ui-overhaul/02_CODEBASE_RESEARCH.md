# 02 — Codebase Research

**Plan:** Share Page Client Review UX/UI Overhaul
**Date:** 2026-06-03

---

## Files Inspected

### Core Share Page
| File | Purpose | Key Findings |
|------|---------|--------------|
| `src/app/share/[token]/page.tsx` | Route handler (Server Component) | `force-dynamic`, resolves access/snapshot, handles password gate + recipient session, renders `ProjectPublicationView` |
| `src/components/share/SharePageTabs.tsx` | Client component — estimate tabs, chart, tree/grid | Uses D3 `CostDonutChart`, manages tab state with sessionStorage, sub-tabs for tree/grid view |
| `src/components/share/SharePageComments.tsx` | Client component — comment composer + list | Uses `useSharedLinkSession`, optimistic add, offline queue, retry logic |
| `src/components/share/SharePageDecision.tsx` | Client component — accept/decline/revision | Uses `useSharedLinkSession`, confirmation modal, 409 handling |
| `src/components/share/SharePageHero.tsx` | Client component — cover image | `next/image` with lazy loading, gracefully handles null |
| `src/components/share/SharePageSessionBanner.tsx` | Client component — session status | Shows "Viewing as {email}" or session-required info |
| `src/components/share/SharePageRecipientSessionInitializer.tsx` | Client component — initializes session | POSTs to session route on `?recipient=` presence |
| `src/components/share/ProjectPublicationPasswordForm.tsx` | Client component — password gate | Lockout-aware form with progressive delay |
| `src/components/share/ShareEstimateTreeView.tsx` | Client component — tree rendering | Read-only `WorkshopTree<TNode>` |
| `src/components/share/ShareEstimateTreePanel.tsx` | Client component — tree nav panel | Floating nav with IntersectionObserver |
| `src/components/charts/CostDonutChart.tsx` | Shared D3 donut chart | **Hydration bug source** — floating-point precision mismatch in SVG path `d` attributes |

### API Routes
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/share/[token]/session` | POST/DELETE | Initialize/clear recipient session |
| `/api/share/[token]/comment` | POST | Submit comment (CSRF + rate limited) |
| `/api/share/[token]/decision` | POST | Submit decision (version locked) |
| `/api/share/[token]/activity` | GET | Activity feed (owner-only) |
| `/api/share/[token]/password` | POST | Password verification |

### Data Layer
| File | Purpose |
|------|---------|
| `src/lib/publication/public-repository.ts` | Public-facing reads: access, snapshot, password, events, comments, decisions |
| `src/lib/publication/security.ts` | Crypto: token hashing, scrypt passwords, access cookies, CSRF, rate limiting |
| `src/lib/publication/types.ts` | Types: `ProjectPublicationSnapshot`, `PublicationSnapshotEstimate`, `PublicationSnapshotRow` |
| `src/lib/publication/actions.ts` | Manager actions (workshop-side, not in scope) |
| `src/lib/share/aggregate-share-chart-buckets.ts` | Aggregates publication rows to `CostBucket[]` by discipline |
| `src/lib/share/reconstruct-share-tree.ts` | Client-side tree reconstruction from flat snapshot rows |

### Tests
| File | Coverage |
|------|----------|
| `tests/vitest/project-publication-page.test.tsx` | Share page rendering, password gate, session handling |
| `tests/vitest/project-publication-activity.test.tsx` | Activity feed rendering |
| `tests/vitest/project-publication-comments.test.tsx` | Comment submission and display |
| `tests/vitest/project-publication-decision.test.tsx` | Decision flow |
| `tests/vitest/project-publication-header.test.tsx` | Header/activity dot |
| `tests/vitest/project-publication-actions.test.ts` | Publication server actions |
| `tests/vitest/project-publication-public-repository.test.ts` | Public repository functions |
| `tests/vitest/project-publication-security.test.ts` | Security/crypto |
| `tests/vitest/project-publication-security-headers.test.ts` | CSP/headers |
| `tests/vitest/project-publication-schema.test.ts` | Schema validation |
| `tests/vitest/project-publication-snapshot.test.ts` | Snapshot builder |
| `tests/vitest/project-publication-summary.test.ts` | Summary aggregation |
| `tests/vitest/share/reconstruct-share-tree.test.ts` | Tree reconstruction |
| `tests/vitest/project-publication-route.test.ts` | Publication route handler | (previously omitted from inventory) |

### Additional Share Components (Not Modified)
| File | Purpose |
|------|---------|
| `src/components/share/SharedLinkActivityFeed.tsx` | Owner-only activity feed with Realtime updates — unchanged |
| `src/components/share/ShareFloatingTreeNav.tsx` | Sticky floating nav with IntersectionObserver — unchanged |

### Additional API Routes (Not Modified)
| Route | Purpose |
|-------|---------|
| `/api/share/[token]/route.ts` | Main share endpoint (GET snapshot) |
| `/api/share/[token]/events/route.ts` | Event recording |
| `/api/share/[token]/unsubscribe/route.ts` | Email unsubscribe |

### Additional Publication Lib Files (Not Modified)
| File | Purpose |
|------|---------|
| `src/lib/publication/activity-helpers.ts` | Activity/event helper functions |
| `src/lib/publication/client-csrf.ts` | Client-side CSRF header creation |
| `src/lib/publication/snapshot.ts` | Snapshot builder from project estimate data |

### Design System
- `DESIGN.md` — strict SF Pro system, ≤12px, 3px radius, Phosphor regular, zero tracking
- `scripts/enforce-app-design-system.mjs` — design-system linter (`bun run lint:design-system`)
- `src/components/ui/` — shared primitives: Button, Badge, Card, Modal, etc.

---

## Current Architecture

### Page Shell
```
SharePage (Server Component, force-dynamic)
├── ProjectPublicationPasswordGate (if password-protected + no cookie)
└── ProjectPublicationView (main content)
    ├── SharePageRecipientSessionInitializer (on ?recipient=, client-side POST)
    ├── SharePageSessionBanner (recipient status)
    ├── Header bar (logo + "View-only" badge)
    ├── Project metadata (name, code, client, "Visits are logged")
    ├── SharePageHero (cover image)
    └── Two-column layout (flex-col on mobile, flex-row on lg)
        ├── Left: SharePageTabs (estimates + chart + tree/grid)
        └── Right (sticky): SharePageDecision + SharePageComments
```

### Data Flow
1. Server Component resolves `publicationAccess` by token hash
2. If password-protected and no valid cookie → render password gate
3. If recipient token in query → client initializer POSTs to session route
4. If existing session cookie → resolve recipient identity for banner
5. Resolve `publication.snapshot` → pass to client components
6. Client components render chart (D3), tabs (estimates), decision, comments

### State Management
- **Server**: Publication access, snapshot resolution, recipient identity (Server Component)
- **Client session**: `useSharedLinkSession` hook reads `_ok` cookie flag
- **Client UI**: `useState` for tab selection, view mode, comments, decision, drafts
- **Persistence**: `sessionStorage` for active tab, offline comment queue

---

## Current UX Issues (Concrete Evidence)

### 1. "View-only" Badge
**File:** `src/app/share/[token]/page.tsx:74`
```tsx
<span className="text-[9px] font-medium uppercase tracking-normal text-tertiary">View-only</span>
```
**Issue:** "View-only" is an internal/developer term. For a client reviewing a proposal, this feels dismissive and untrustworthy. A client doesn't need to know the page is "view-only" — they need to know they're reviewing a proposal.

### 2. Scary Compliance Language
**File:** `src/app/share/[token]/page.tsx:82`
```tsx
<p className="mt-1 text-[9px] leading-3 text-tertiary">Visits are logged for project security and activity history.</p>
```
**Issue:** "Visits are logged" sounds like surveillance. For a client-facing proposal page, this erodes trust. This information doesn't need to be in the main content area.

### 3. Technical Jargon
**File:** `src/app/share/[token]/page.tsx:79-81`
```tsx
<p className="text-[9px] font-medium uppercase leading-3 tracking-normal text-tertiary">Client publication</p>
<h1 className="mt-1.5 text-[12px] font-medium leading-4 text-ink">{snapshot.project.name}</h1>
<p className="mt-1 text-[10px] leading-4 text-secondary">View-only project page</p>
```
**Issue:** "Client publication" and "View-only project page" are internal product terms, not client-friendly language. A client should see "Proposal Review" or "Project Estimate — For Your Review".

### 4. Weak Visual Hierarchy
- Project name is 12px — same as estimate tab titles and other secondary headings
- Decision buttons are small and buried in right sidebar
- No clear visual distinction between "this is the proposal" and "these are your actions"
- Comment area feels like an afterthought, not a collaboration tool

### 5. Desktop-First Layout
- The lg:flex-row split forces desktop layout
- Mobile: decision/comments stack below estimates — requires excessive scrolling
- No mobile-first consideration for the review flow

### 6. Inline Header Has Internal Feel
**File:** `src/app/share/[token]/page.tsx:71-76`
```tsx
<header className="share-print-hidden border-b border-hairline bg-white">
  <div className="mx-auto flex h-12 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
    <ArchestimatorLogo markSize={24} showWordmark className="text-ink" />
    <span className="text-[9px] font-medium uppercase tracking-normal text-tertiary">View-only</span>
  </div>
</header>
```
**Issue:** The Archestimator logo + "View-only" header feels like a developer preview, not a client-facing proposal. For a client, the sender's branding should be secondary to the proposal content.

### 7. Hydration Warning
**File:** `src/components/charts/CostDonutChart.tsx:375`
D3 floating-point precision causes server/client SVG `d` attribute mismatch.
See bug plan: `.ai/15_Bugs/2026-06-03-share-page-cost-donut-chart-hydration-mismatch.md`

---

## Behaviors That Must Be Preserved

1. **Public unauthenticated viewing**: Anyone with the share link can view estimates without login
2. **Password protection**: Password-gated publications require password before content is revealed
3. **Recipient session**: `?recipient=` initializes session; session required for comments/decisions
4. **CSRF protection**: All mutation endpoints require CSRF token validation
5. **Rate limiting**: Comment and decision endpoints are rate-limited
6. **Durable rate limit events**: Stored in `security_rate_limit_events` table
7. **Password lockout**: 5 failed attempts within 15 minutes triggers lockout
8. **HttpOnly cookies**: Access and session cookies are HttpOnly, SameSite=Lax
9. **Snapshot integrity**: Snapshot content is read-only; no mutation of published data
10. **Existing test suite**: All 13 publication test files must continue passing

---

## Commands Run

```bash
pwd                          # /Users/philiplewis/archestimator
git rev-parse --show-toplevel # /Users/philiplewis/archestimator
git status --short --branch   # main, clean except next-env.d.ts
git branch --show-current     # main
git worktree list             # 2 worktrees (safe)
git remote -v                 # origin https://github.com/pjel888/archestimator.git
git fetch --prune origin      # Done
git log --oneline -5          # Latest: 4fbce80 refactor(prompts)
date '+%Y-%m-%d'              # 2026-06-03
```

---

## Design-System Constraints (from DESIGN.md)

| Constraint | Value |
|------------|-------|
| Font | SF Pro (system stack) |
| Weights | Regular (400), Medium (500) only |
| Max size | 12px (titles), 10px (body/controls), 8-9px (labels) |
| Letter spacing | 0 (zero) |
| Border radius | `rounded-xs` / 3px only |
| Icons | Phosphor regular outline (1px) |
| Colors | Strong: #292929, Default: #5D5D5D, Subtle: #7F7F7F |
| Surface | #FFFFFF, Selected: #F5F5F5, Border: #F2F2F2 |
| Primitives | Must reuse `src/components/ui/` before creating local controls |

---

## Gaps / Unknowns

1. **Comment history loading**: Current implementation only shows optimistically added comments. The `GET /api/share/[token]/comment` route does not appear to exist — comments may not load existing server comments on page load. This is a confirmed UX gap: a returning client won't see prior comments they or the team made.
2. **Decision state persistence**: Decision state is stored in `useState` only — it's not loaded from the server on page load. A returning client won't see their prior decision.
3. **Activity feed on share page**: Currently only visible to owners via workspace-side activity tab, not on the public share page

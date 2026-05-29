# Implementation Phased Plan — Shared Link Overhaul (V2)

**Date:** 2026-05-28
**Status:** Proposed — requires owner approval + Phase 0 completion before any code edits.

---

## Phase 0: Foundations, Audits & Gates (Pre-Implementation)

**Goal**: Establish solid groundwork, understand codebase constraints, and configure the first red tests.

### Tasks & Deliverables
1. **Audit Clear**: Document the finding that the existing invite email system in `src/lib/collaboration/actions.ts` uses `admin.auth.admin.inviteUserByEmail`. Since this requires full account creation, it cannot be reused for client sharing.
2. **Audit Existing API Routes**: Document the three existing `/api/share/[token]/*` routes (`GET /`, `POST /password`, `POST /events`) as the foundation for new endpoints.
3. **Email Path Decision**: Formulate a decision to either:
   - **Option A**: Configure custom SMTP settings on the Supabase dashboard (reusing Supabase's mailer, zero code changes for transport).
   - **Option B**: Introduce a lightweight transactional email provider (Resend) with a thin wrapper in `src/lib/email/`.
   - *Decision criteria*: Cost, deliverability, template flexibility, and setup time.
4. **Draft first red tests**:
   - Create failing Vitest test asserting that the old "Public link" string is not present in the headers/labels.
   - Create test verifying `createProjectPublication` correctly filters estimate sheets when passed an array of `selectedEstimateIds`.
   - Create test for tabbed receiver rendering.
5. **Create Task Packet**: Create `.ai/04_tasks/shared-link-phase-0-foundations.md` to track these checkoffs.

**Exit Gate**: All Phase 0 documents exist, and `bun run validate` runs successfully.

---

## Phase 1: Rename, Sheet Selection UI, & Tabbed Navigation

**Goal**: Deliver the sheet multi-select control in the manager modal and render tabs on the receiver page.

### Tasks & Deliverables
1. **Rename Copy**: Refactor string occurrences of "Public Link" / "Public client link" to **"Shared Link"** in headers, modals, receiver page, and tests.
2. **Sheet Picker UI**:
   - Modify the modal in `ProjectPublicationHeader.tsx` to add a "Sheets" tab.
   - Load the project's estimates in the layout component and thread them down to `ProjectPublicationHeader`.
   - Track checked estimate IDs in local component state.
   - Add validation: block "Generate shared link" if 0 estimates are selected.
3. **Pass Selection**: Modify `ProjectPublicationHeader.tsx` to pass the selected estimate IDs array into `createProjectPublication`.
4. **Receiver Tabs Layout**:
   - Wrap the estimates rendering in `src/app/share/[token]/page.tsx` in a lightweight client component (`SharePageTabs`) to handle tab selection state.
   - Show estimate names and sheet codes in horizontal tabs.
   - Dynamically render only the selected tab's table (improving performance and layout clutter).
5. **Aesthetics**: Apply the `proposalPaper: #FFFDF8` theme to the receiver tables for a document feel.
6. **Test Update**: Update all 10 existing `project-publication-*.test.ts(x)` files to use "Shared link" strings.

**Exit Gate**: Creating a publication with a subset of sheets displays only those sheets inside horizontal tabs on `/share/[token]`. No database migrations are required. `bun run validate` passes.

---

## Phase 2: Email-Targeted Sharing Infrastructure

**Goal**: Introduce client email list controls and notification mailings.

### Tasks & Deliverables
1. **Database Migration**: Create and run the SQL migration for `shared_link_recipients` with RLS.
2. **Manager Recipient UI**: Add a "Recipients" tab inside the `ProjectPublicationHeader` modal with:
   - Email input with chip/comma-separated parsing.
   - Delivery status chips (Pending, Sent, Bounced, Opened).
   - "Send email" button.
3. **Email Mailing Action**:
   - Implement the transactional email trigger using the provider chosen in Phase 0.
   - Queue and send notification emails to recipients containing their secure token links: `/share/[token]?recipient=[recipient_token]`.
   - Handle failures gracefully: publication creation succeeds even if email delivery fails.
4. **Security Cookie Gate**: Write the cookie handler on `/share/[token]` to verify `recipient_token` query param and set the `shared_link_session_[token]` HttpOnly cookie.
5. **Open Tracking**: Update `recordProjectPublicationEvent` or create `recordSharedLinkEvent` to track recipient opens and update `shared_link_recipients.last_opened_at`.

**Exit Gate**: Adding a recipient email successfully triggers a delivery notification, and opening the link sets the verification cookie. Delivery status is visible in the manager modal.

---

## Phase 3: Recipient Comments & Decision Workflows

**Goal**: Enable clients to ask questions and formally accept/decline estimate sheets.

### Tasks & Deliverables
1. **Comment/Response Migration**: Run the migrations for `shared_link_comments` and `shared_link_responses` with Security Definer RPC functions.
2. **API Routes**: Create new POST endpoints:
   - `/api/share/[token]/comment` — validates recipient cookie, calls `insert_client_comment` RPC.
   - `/api/share/[token]/decision` — validates recipient cookie, calls `submit_client_response` RPC.
3. **Comments Panel UI**: Add the comments list and text composer to the receiver page:
   - Collapsible side-pane on desktop (width 320px).
   - Stacked accordion on mobile.
   - Flat chronological list (no threading for V2).
4. **Rate Limiting**: Enforce rate limits on the new POST endpoints using the in-memory LRU approach.
5. **Decision UI**:
   - Add "Accept Estimates" and "Decline / Revise" buttons on the receiver page.
   - Confirmation modal before finalizing.
   - Log decisions to `shared_link_responses`, binding to the `snapshot_version` at time of decision.
   - Lock UI to read-only after decision is recorded.
6. **Snapshot Version Guard**: On every comment/decision POST, server validates that the client's `snapshot_version` cookie matches the current publication. If mismatch, return `409` with "Please refresh" message.
7. **Activity Log UI**: Add a read-only "Activity" tab inside the owner's manager modal showing opens, comments, and decisions.

**Exit Gate**: Recipient comments and accept/decline actions are saved securely, locking the screen to read-only post-decision. Rate limiting blocks abuse attempts.

---

## Phase 4: Visual Polish, Images & Notifications

**Goal**: Integrate project/component images, refine responsiveness, and build the owner notification loop.

### Tasks & Deliverables
1. **Project Hero**: Render the project's cover image as a banner on `/share/[token]` (read from `projects.metadata`).
2. **Component Images**: Render 32px thumbnails for items in the estimate table rows where images exist in `estimate_row_items.source_snapshot`.
3. **OpenGraph Tags**: Add `<meta property="og:*">` tags to `/share/[token]` for rich link previews in iMessage, Slack, and email clients.
   - `og:title`: Project name.
   - `og:description`: "Review the estimate proposal for [Project Name]."
   - `og:image`: Project cover image (if available).
4. **Responsive Audit**: Verify horizontal swipe on mobile tables and touch sizes (minimum 44x44px).
5. **Accessibility Check**: Ensure ARIA tags on tabs, labels on comment inputs, and live regions for status announcements.
6. **Owner Notification Loop**:
   - In-app: Add a Realtime broadcast or polling-based activity badge on the project sidebar.
   - Email digest: Optional lightweight email to the owner when a client comments or decides (uses the same transactional email provider from Phase 2).
7. **Design System Lint**: Run `bun run lint:design-system` and `bun run lint:app-font-size` to verify compliance.

**Exit Gate**: Receiver view is fully polished, responsive, accessible, passes design-system lint checks, and owners receive activity notifications. OpenGraph previews render correctly.

---

## Phase 5: Hardening, Load Testing & Release

**Goal**: Security hardening, performance validation, and production readiness.

### Tasks & Deliverables
1. **Password Brute-Force Hardening**: Implement the attempt-tracking table and progressive delay for password failures.
2. **CSP Upgrade**: Evaluate upgrading `/share/:path*` from `Report-Only` to enforced CSP.
3. **Load Testing**: Simulate 100 concurrent share page views and 20 concurrent comment posts. Verify P95 response times stay under 200ms.
4. **Penetration Test**: Attempt CSRF bypass, XSS injection in comments, and decision spoofing without valid cookies.
5. **Documentation**: Write `walkthrough.md` for support team explaining how shared links work.
6. **Analytics Consent**: Verify no tracking scripts fire on `/share/[token]` without explicit `archestimator_cookie_consent` analytics approval.

**Exit Gate**: All validation gates in `07-validation-release-gates.md` are satisfied. `bun run validate` passes with 0 failures. `bun run build` compiles cleanly.

---

## Dependency Graph

```
Phase 0 ──► Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 4 ──► Phase 5
                │           │           │           │
                └───────────┴───────────┴───────────┘
                     (each phase can build on prior)
```

**Parallelization Opportunity**: Phase 4 (notifications) can begin in parallel with Phase 3 once the comment/decision API contracts are stable, because notification logic only reads from `shared_link_comments` and `shared_link_responses`.

---

## Rollback Triggers

Any of the following triggers an immediate halt and rollback to the last stable V1 state:
- `bun run validate` fails with >3 new test failures after a phase merge.
- Security audit reveals a critical vulnerability (e.g., comment injection bypass).
- Email provider integration causes >10% delivery failure rate in staging.
- Database migration fails to apply cleanly on a fresh Supabase instance.

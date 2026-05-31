# 02 — Feature Gap Analysis: Shared Link System

**Date:** 2026-05-30
**Purpose:** Ranked inventory of every gap, missing state, and deficiency in the shared link (view-only client publication) feature. Severity: Critical (broken), High (significantly below industry baseline), Medium (degrades UX or security), Low (polish).

---

## High — Below Industry Baseline

| # | Gap | Severity | Competitor Benchmark | Fix Complexity |
|---|-----|----------|---------------------|-----------------|
| 1 | **No link-status indicator on project cards** — manager can't see at a glance which projects have live shared links | **High** | Dropbox: green link icon on files. Google Drive: "Shared with N people" on items. Notion: share state visible without opening. | Medium — new optional prop on `LiveProjectCard`, new query in project list data fetch |
| 2 | **No per-recipient view tracking** — only aggregate `open_count` and global `latestOpenedAt`, no per-recipient attribution | **High** | Dropbox: shows "Viewed by [email] at [time]" per file. Google Drive: "Last viewed by..." in Activity dashboard. | Medium — requires event-level enrichment with recipient_id from session cookie, new UI in Activity tab |
| 3 | **"Copy link" requires two clicks** — must open modal, then click Copy | **High** | Dropbox: hover action → "Copy link". Google Drive: one-click toolbar button. Figma: prominent "Copy link" in share dialog. Notion: one-click from page top. | Low — add split button or right-click handler on the header rail button |
| 4 | **No new-activity indicator outside the modal** — manager only discovers new comments/decisions by opening the modal | **High** | Figma: notification dot on share button. Google Drive: "New" badge on items with unseen activity. | Low — orange dot on "Shared link" button, store `lastSeenAt` in component state or localStorage |
| 5 | **Recipient can't see their own identity** — no "You are viewing as [email]" on the share page | **High** | All major sharing platforms show the viewing identity. Dropbox, Google Drive, Figma, Notion all indicate "You are signed in as..." or "Viewing as..." | Low — add to `SharePageSessionBanner` |
| 6 | **Owner digest email hardcoded to `owner@archestimator.test`** — real owners never receive activity digests | **High** | All competitors send real notification emails to the content owner. | Medium — resolve owner from project/workspace, use real email |
| 7 | **No "Changes since last publish" indicator** — manager can't tell if the shared snapshot is stale vs current estimate data | **High** | Notion: "Last edited by [name] on [date]" on published pages. Figma: version history with diffs. | Medium — compare `snapshot_json.generatedAt` vs `estimates.updated_at`, show warning in modal |

---

## Medium — Degrades UX or Security

| # | Gap | Severity | Evidence | Fix Complexity |
|---|-----|----------|----------|-----------------|
| 8 | **In-memory rate limiters not durable** — comment rate limiter and password lockout reset on server restart | **Medium** | Comment limiter: `rateBuckets = new Map()` in `comment/route.ts`. Password lockout: similar in-memory Map. In serverless/multi-instance, each instance has independent counters. | Medium — migrate to DB-backed limiter (see `06-performance-and-observability-plan.md` for design) |
| 9 | **No rate limiting on public snapshot/event APIs** — `/api/share/[token]` and `/api/share/[token]/events` are unthrottled | **Medium** | Neither endpoint has rate limiting. Could be flooded with requests. | Medium — add IP+token_hash rate limiting per the matrix in `05-security-threat-model-and-hardening.md` |
| 10 | **Missing audit events for publication lifecycle** — no audit for create/republish/rotate/revoke/password-unlock events | **Medium** | `shared_link_events` table exists but only records opens and password attempts (generic). No creation, republish, rotation, or revocation audit rows. | Medium — add audit event recording to publication server actions |
| 11 | **No confirmation before "Turn off link"** — one click immediately revokes with no warning | **Medium** | `ProjectPublicationHeader.tsx` — `revokeProjectPublication()` called directly on click | Low — add confirmation dialog |
| 12 | **No confirmation before "New link" (rotate)** — old link breaks immediately | **Medium** | Same pattern — `rotateProjectPublicationLink()` called directly | Low — add confirmation dialog |
| 13 | **Password field has no strength indicator** — client-facing passwords should show strength | **Medium** | Industry standard: weak/medium/strong bar on password inputs | Low — add strength meter component |
| 14 | **"Update shared page" silently overwrites** — no version history, no "changes since last publish" diff | **Medium** | Figma: shows version history. Google Docs: shows "Last edit was..." | Medium — store previous snapshot hash, show "X rows changed" |
| 15 | **No preview before publishing** — manager can't see what recipients will see without opening a new tab | **Medium** | Notion: "View as visitor" toggle. Figma: "View prototype" opens in new tab but is one-click. | Medium — "Preview" button in modal |
| 16 | **Sheet selection resets on modal reopen** — if manager closes and reopens modal, sheet selection resets to all sheets | **Medium** | `ProjectPublicationHeader.tsx:useEffect` resets `selectedEstimateIds` on `projectEstimateSheets` or `summaryKey` change | Low — persist selection in component state keyed by projectId |
| 17 | **No search/filter on shared estimate rows** — large estimates frustrating to navigate | **Medium** | Notion: full-text search on published pages. Google Sheets: Ctrl+F. | Medium — add client-side filter to grid view |
| 18 | **No sortable columns in Grid Preview** — rows are fixed in snapshot order | **Medium** | Google Sheets: full sort/filter. Airtable: sort by any column. | Medium — add client-side sort to grid view |

---

## Low — Polish & Compliance

| # | Gap | Severity | Evidence | Fix Complexity |
|---|-----|----------|----------|-----------------|
| 19 | **No email unsubscribe link** — CAN-SPAM/GDPR requirement | **Low** | Email template in `actions.ts:565-580` — no unsubscribe footer | Low — add unsubscribe link to template |
| 20 | **Email says "A team member" instead of real sender name** — should use manager's display name | **Low** | `actions.ts:567` — `const sender = "A team member"` | Low — resolve sender name from `context.currentUserId` profile |
| 21 | **No comment threading/replies** — comments are flat list | **Low** | Figma: threaded comments. Google Docs: reply-to-comment. | Medium — add parent_comment_id to schema |
| 22 | **No comment editing or deletion** — once posted, permanent | **Low** | Most platforms allow edit/delete within a window | Medium — add edit/delete with soft-delete or edit window |
| 23 | **No decision change after submission** — locked forever | **Low** | Some platforms allow undo within a time window | Low — add 5-min undo window |
| 24 | **No notification to recipient after decision** — only owner gets digest | **Low** | Recipient should get confirmation of their decision | Low — send confirmation email |
| 25 | **No attachment support in comments** — can't attach screenshots or files | **Low** | Figma: attach files to comments. | High — requires file upload infrastructure |
| 26 | **No print stylesheet** — browser print is unstyled | **Low** | Standard expectation for estimate/document sharing | Low — add `@media print` styles |
| 27 | **No dark mode for share page** — always white background | **Low** | Increasingly standard expectation | Medium — add dark mode styles |
| 28 | **"Bounced" and "Opened" delivery statuses never set** — only `pending` and `sent` | **Low** | Resend webhooks not configured; statuses defined but unused | Medium — configure Resend webhooks |
| 29 | **No resend-email capability** — if a recipient didn't receive it, no "Resend" button | **Low** | `RecipientEmailComposer.tsx` — only add/remove, no resend | Low — add "Resend" action |
| 30 | **No CC/BCC for the sender** — manager doesn't get copy of invite email | **Low** | Common expectation: sender gets a copy | Low — add CC to email send |
| 31 | **No mobile-optimized decision/comments layout** — side column doesn't reflow well on mobile | **Low** | `page.tsx` — `lg:flex-row` with fixed sidebar, mobile gets `flex-col` but decision/comments are awkwardly stacked | Low — responsive layout adjustments |
| 32 | **No "scroll to top" when switching estimate tabs** — user loses scroll position context | **Low** | Standard UX pattern for tabbed content | Low — scroll to top on tab change |
| 33 | **No loading skeleton for the share page** — server-rendered so largely mitigated, but rehydration has no skeleton | **Low** | Standard web UX pattern | Low — add skeleton component |

---

## Gap Summary by Category

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| Manager visibility & discoverability | 0 | 3 | 4 | 0 | 7 |
| Recipient UX | 0 | 1 | 0 | 4 | 5 |
| Email delivery & compliance | 0 | 1 | 0 | 5 | 6 |
| Interaction (comments/decisions) | 0 | 0 | 0 | 5 | 5 |
| Content (search, sort, preview) | 0 | 0 | 4 | 2 | 6 |
| Security & rate limiting | 0 | 0 | 3 | 0 | 3 |
| Destructive confirmations | 0 | 0 | 2 | 0 | 2 |
| **Total** | **0** | **5** | **13** | **16** | **34** |

---

## Comparison: Collaboration Invites vs Shared Link

| Dimension | Collaboration Invites | Shared Link |
|-----------|----------------------|-------------|
| Critical gaps | 3 (system non-functional) | 0 |
| High gaps | 12 | 5 |
| Medium gaps | 10 | 13 |
| Low gaps | 8 | 16 |
| Overall health | **Broken** (cannot function without config) | **Functional** (works end-to-end, gaps are UX/polish and rate-limit hardening) |

The shared link is the healthier feature. It works end-to-end. The gaps are competitive parity, polish, and rate-limit durability. Collaboration invites cannot function without configuration changes and security hardening.

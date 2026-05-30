# Shared Link: Signifiers, Visibility & Industry Comparison

**Date:** 2026-05-30
**Purpose:** Audit where shared-link status is shown in the manager UI, compare against industry standards (Dropbox shared links, Google Drive sharing, Figma prototypes, Notion share), and document what's missing.

---

## Current State Audit: Where Shared-Link Status Is Shown

### Manager Side

| Location | Component | Shows link status? | Shows recipient activity? | Shows open count? |
|---|---|---|---|---|
| Project header rail | `ProjectPublicationHeader` button | ✅ "Shared link" label only | ❌ | ❌ |
| Shared link modal sidebar | Status + stats | ✅ "Link live" / "Link off" / "Expired" | ❌ | ✅ Open count, latest open, published date, expiry |
| Shared link modal - Link tab | URL display + Copy/Open | ✅ Full URL, password state badge | ❌ | ❌ |
| Shared link modal - Recipients tab | `RecipientEmailComposer` | ❌ | ✅ Delivery status chips (Pending/Sent) | ❌ |
| Shared link modal - Activity tab | `SharedLinkActivityFeed` | ❌ | ✅ Comments, decisions, events timeline | ❌ |
| Project cards (list page) | `LiveProjectCard` | ❌ | ❌ | ❌ |
| Workshop homebase | `WorkshopHomebaseClient` | ❌ | ❌ | ❌ |
| Main sidebar | `MainSidebar` | ❌ | ❌ | ❌ |

### Recipient Side

| Location | Component | Shows estimate data? | Shows comment/decision? | Shows session status? |
|---|---|---|---|---|
| Share page header | Logo + "View-only" badge | ✅ | ❌ | ❌ |
| Share page body | `SharePageTabs` | ✅ Tabs + Tree/Grid + donut charts | ❌ | ❌ |
| Share page right column | `SharePageDecision` + `SharePageComments` | ❌ | ✅ Decision + comments | Gated on session |
| Password gate | `ProjectPublicationPasswordForm` | ❌ | ❌ | ❌ |
| Session banner | `SharePageSessionBanner` | ❌ | ❌ | ✅ |

---

## Missing Signifiers

### For the Manager

| # | Missing | Priority | Where it should go |
|---|---------|----------|-------------------|
| 1 | "Link is live" indicator on project card | **P0** | LiveProjectCard — small green dot or badge: "Shared" |
| 2 | New activity indicator outside the modal | **P0** | Header rail button: orange dot when unseen activity exists |
| 3 | Open count trend (not just total) | **P1** | Modal sidebar: "12 opens this week" with sparkline |
| 4 | "Last opened by [recipient]" attribution | **P1** | Modal sidebar: replace generic "Latest open" with recipient-scoped |
| 5 | Recipient response rate | **P2** | "2 of 5 recipients responded" |
| 6 | Warning when snapshot is stale (>7 days since last update vs current estimate data) | **P2** | Modal sidebar: "Snapshot out of date. Update shared page." |
| 7 | Password strength indicator | **P2** | Access tab password input: weak/medium/strong bar |
| 8 | Link expiry countdown | **P2** | "Expires in 23 days" instead of just the date |
| 9 | "Someone is viewing your link right now" realtime indicator | **P2** | Header rail or modal |
| 10 | Recipient email delivery failures surfaced to manager | **P1** | Recipients tab: red "Failed" chip instead of hiding failures |

### For the Recipient

| # | Missing | Priority | Where it should go |
|---|---------|----------|-------------------|
| 1 | "You are viewing as [email]" identity indicator | **P0** | Session banner or sidebar |
| 2 | "You submitted a decision on [date]" persistent status | **P1** | After decision, show read-only badge with timestamp |
| 3 | Comment confirmation/receipt | **P1** | After posting comment: "Comment posted" toast |
| 4 | "Last updated [date]" for stale snapshots | **P1** | Header: "Snapshot from May 28" |
| 5 | Mobile-optimized decision/comments layout | **P2** | Full-width stacked layout on mobile instead of side column |
| 6 | "Contact sender" link | **P2** | Footer or header: "Questions? Contact [name]" |

---

## Industry Comparison

### Dropbox Shared Links

| Feature | Dropbox | Archestimator | Gap |
|---------|---------|---------------|-----|
| Link status indicator on file/folder | ✅ Green link icon in file list | ❌ No indicator on project cards | **Missing** |
| Password protection | ✅ | ✅ | On par |
| Expiry date | ✅ | ✅ (optional) | On par |
| View activity (who viewed) | ✅ Per-file view history with email + time | ❌ Only aggregate open_count | **Missing** |
| Disable/revoke link | ✅ | ✅ | On par |
| "Anyone with link can view" | ✅ Clear permission label | ❌ Modal shows status but not permissions model | **Partial** |
| Email notifications for activity | ✅ | ⚠️ Only owner digest (rate-limited, hardcoded email) | **Partial** |
| Copy link one-click | ✅ Hover action → "Copy link" | ❌ Must open modal → Copy button | **Missing** |
| Preview thumbnail | ✅ File preview | ✅ Hero image (when available) | On par |

### Google Drive Sharing

| Feature | Google Drive | Archestimator | Gap |
|---------|-------------|---------------|-----|
| "Anyone with link" vs "Restricted" label | ✅ Clear on share dialog | ❌ No share-type label on modal | **Missing** |
| Role picker (Viewer/Commenter/Editor) | ✅ | ❌ Only "View-only" (commenting requires recipient session, decisions are separate) | **Different model** |
| "Notify people" checkbox on share | ✅ | ✅ Email sent automatically | On par |
| Shared-with list with avatars | ✅ Shows people with access | ❌ Recipients tab shows email list only | **Missing avatars** |
| "Remove access" per person | ✅ | ✅ | On par |
| "Copy link" in one click | ✅ Right-click → "Copy link" or toolbar button | ❌ | **Missing** |
| Expiry date per person | ✅ | ❌ Global expiry only | **Missing** |
| "People with access" summary on card | ✅ Shows "Shared with 3 people" in drive list | ❌ | **Missing** |

### Figma Prototype Sharing

| Feature | Figma | Archestimator | Gap |
|---------|-------|---------------|-----|
| "Anyone with link can view" toggle | ✅ Clear toggle in share modal | ❌ Link is always view-only | **Missing clarity** |
| Password protection | ✅ | ✅ | On par |
| Link access level (view vs view-prototype-only) | ✅ | ❌ | **N/A (estimates only)** |
| Commenting mode | ✅ Separate comment access toggle | ⚠️ Requires ?recipient= token | **Different model** |
| Embed code | ✅ | ❌ | **Missing** |
| Share modal opens at correct context | ✅ Remembers last state | ⚠️ Sheet selection resets on reopen | **UX gap** |
| "Share" button in toolbar (always visible) | ✅ Prominent blue "Share" button | ❌ Buried in header rail as "Shared link" | **Discoverability gap** |

### Notion Share

| Feature | Notion | Archestimator | Gap |
|---------|--------|---------------|-----|
| Share menu shows current state at a glance | ✅ "Shared to web" / "Not shared" / "Shared with X people" | ⚠️ Shows "Shared link" label but not state | **Partial** |
| "Copy link" one-click from page top | ✅ One click from "Share" menu | ❌ Two clicks (open modal → Copy button) | **Missing** |
| Publish vs share distinction | ✅ "Share" (collaborators) vs "Publish" (public) | ❌ "Shared link" is the only public path; "Teamspaces" is the collaboration path — but not visually distinguished | **Confusing** |
| Last edited indicator on published page | ✅ "Last edited by [name] on [date]" | ❌ No last-update indicator on share page | **Missing** |
| Search within published page | ✅ | ❌ | **Missing** |
| Comments on published page | ✅ If enabled | ✅ If session-enabled | On par |
| "Unpublish" vs "Delete" distinction | ✅ "Unpublish" keeps content, link stops working | ✅ "Turn off link" = revoke | On par |

---

## Summary: Competitive Gaps

### Critical (below industry baseline)

| # | Gap | Competitors handling it |
|---|-----|------------------------|
| 1 | **No link-status indicator on project cards** | Dropbox, Google Drive, Notion all show share status on list items |
| 2 | **No per-recipient view tracking** | Dropbox shows "Viewed by [email] at [time]" |
| 3 | **"Copy link" requires two clicks** | Dropbox, Figma, Notion expose one-click copy |
| 4 | **No new-activity indicator for the manager** | Figma shows notification dot; Google Drive shows "New" badge |
| 5 | **Recipient can't see their own identity** | All competitors show "You are viewing as [email]" |

### Important (differentiator opportunity)

| # | Gap | Value |
|---|-----|-------|
| 6 | **No "changes since last publish" diff** | Managers don't know if the shared page is stale vs current data |
| 7 | **No recipient response rate dashboard** | Can't track how many recipients accepted/declined |
| 8 | **No mobile-optimized decision flow** | Decision + comments side column doesn't reflow well |
| 9 | **No email unsubscribe** | CAN-SPAM/GDPR compliance risk |
| 10 | **No search within shared estimates** | Large estimates frustrating to navigate |

### Nice-to-have

| # | Gap |
|---|-----|
| 11 | PDF/download for recipients |
| 12 | Embed code |
| 13 | Recipient typing indicator in comments |
| 14 | Comment threading/replies |
| 15 | @mentions in comments |
| 16 | Password hint |
| 17 | Dark mode for shared page |
| 18 | Print stylesheet |

# 18 — Manual QA and Acceptance Matrix

**Date:** 2026-06-02  
**Status:** Second-pass proposed

---

## Purpose

Define manual QA scripts to verify Activity History correctness across browsers, devices, surfaces, user roles, and event types. Automated tests cover copy correctness — manual QA covers visual rendering, interaction, accessibility, and real-world workflows.

---

## 1. Browser/Device Matrix

| Browser | Version | OS | Priority |
|---------|---------|----|----------|
| Chrome | Latest stable | macOS | P0 |
| Firefox | Latest stable | macOS | P1 |
| Safari | Latest stable | macOS | P1 |
| Chrome | Latest stable | Windows | P1 |
| Edge | Latest stable | Windows | P2 |
| Safari | Latest | iOS | P2 |
| Chrome | Latest | Android | P2 |
| Screen reader (VoiceOver) | macOS + Safari | macOS | P1 |
| Screen reader (NVDA) | Windows + Chrome | Windows | P2 |

---

## 2. QA Script: Owner Estimate Activity

### Prerequisites
- Logged in as an owner/admin
- Project with an estimate sheet that has rows, groups, areas
- Multiple days of activity (at least 3 events across 2 days)

### Steps

| # | Action | Expected result | Pass/Fail |
|---|--------|-----------------|-----------|
| 1 | Open workshop → project → estimate sheet | Estimate sheet loads | [ ] |
| 2 | Click "Activity" button in sheet header | Activity History modal opens | [ ] |
| 3 | Check first activity card | Primary sentence is complete (actor + verb + object). No raw event type. | [ ] |
| 4 | Check that actor name is resolved (not "Unknown user" unless genuinely unknown) | Actor name appears in primary sentence | [ ] |
| 5 | Check delta badge | +/-₱ amount appears if event has cost impact | [ ] |
| 6 | Click "View details" / expand chevron | Audit facts expand below card, showing before/after values | [ ] |
| 7 | Click "View details" again | Audit facts collapse | [ ] |
| 8 | Test day grouping | Events are grouped under day headers (e.g., "May 24, 2026") | [ ] |
| 9 | Test correlation grouping | Related events from same action are visually grouped | [ ] |
| 10 | Click "Load more" | Next page of activity loads; scroll position preserved | [ ] |
| 11 | Select a different scope in tree (e.g., a specific area) | Activity feed filters to that scope | [ ] |
| 12 | Select a row in scope tree | Activity feed shows only events for that row | [ ] |
| 13 | Open filter dropdown | Filter options appear | [ ] |
| 14 | Select "Row updates" filter | Only row_updated events appear | [ ] |
| 15 | Type in search field | Events filter by material name | [ ] |
| 16 | Apply date range filter | Events filtered by date | [ ] |
| 17 | Clear all filters | All events reappear | [ ] |
| 18 | Close modal (X button or Escape) | Modal closes, estimate sheet still functional | [ ] |
| 19 | Reopen modal — verify state reset | Filters, scope, search reset to defaults | [ ] |

### Events to test individually

| Event type | Expected primary sentence pattern |
|-----------|----------------------------------|
| `row_updated` (quantity) | "{actor} changed quantity for {material} from {old} to {new}." |
| `row_updated` (unit cost) | "{actor} changed unit cost for {material} from {old} to {new}." |
| `row_updated` (multiple fields) | "{actor} changed {fields list} for {material}." |
| `row_added` | "{actor} added {material} to the estimate." |
| `row_blank_added` | "{actor} added an empty row slot." |
| `row_deleted` | "{actor} removed {material} from the estimate." |
| `row_replaced` | "{actor} replaced {old} with {new}." |
| `sheet_code_updated` | "{actor} changed sheet code from {old} to {new}." |
| `sheet_metadata_updated` (name) | "{actor} changed estimate name from {old} to {new}." |
| `node_created` | "{actor} created area '{name}'." |
| `node_renamed` | "{actor} renamed '{old}' to '{new}'." |
| `node_deleted_with_children` | "{actor} deleted area '{name}' and its contents." |
| `tree_reordered` | "{actor} reorganized the estimate tree." |
| `template_inserted` | "{actor} inserted template rows." |

---

## 3. QA Script: Shared-Link Activity (Owner)

### Prerequisites
- Logged in as owner/admin
- Project with a published shared link that has client comments, decisions, and open events

### Steps

| # | Action | Expected result | Pass/Fail |
|---|--------|-----------------|-----------|
| 1 | Open project → Publication modal → Activity tab | Activity feed loads with all shared-link activity | [ ] |
| 2 | Check comment rendering | Comment shows human-readable title, comment body below, NOT "COMMENT · date" | [ ] |
| 3 | Check decision rendering (accepted) | Shows "{name} approved the proposal." with green badge, NOT "Decision: accepted" | [ ] |
| 4 | Check decision rendering (declined) | Shows "{name} declined the proposal." with optional note | [ ] |
| 5 | Check decision rendering (revision_requested) | Shows "{name} requested revisions." with optional note | [ ] |
| 6 | Check internal comment | Shows with amber "Internal" badge, visible only to owner | [ ] |
| 7 | Check shared-link open event | Shows "Client viewed the proposal.", NOT "EVENT · date" + raw JSON | [ ] |
| 8 | Click Refresh button | Feed refreshes with latest data | [ ] |
| 9 | Leave tab open → submit a comment as client in another browser | Feed shows new activity (via Realtime or manual refresh) | [ ] |
| 10 | Check "Live updates via Realtime (owner)" text | Footer text appears | [ ] |

---

## 4. QA Script: Shared-Link Activity (Client)

### Prerequisites
- Open shared link in incognito/clean browser as a client (with recipient session)
- Shared link has comments, decisions, and open events

### Steps

| # | Action | Expected result | Pass/Fail |
|---|--------|-----------------|-----------|
| 1 | Navigate to `/share/[token]` | Shared page loads with password gate (if applicable) | [ ] |
| 2 | Enter password (if required) | Proposal loads | [ ] |
| 3 | Scroll to Activity section | Activity feed loads with client-visible items | [ ] |
| 4 | Check that internal comments are NOT visible | No amber "Internal" badges; no internal note content | [ ] |
| 5 | Check comment rendering (own + others?) | Comments show human-readable titles; only own comments show email | [ ] |
| 6 | Check decision rendering | Shows human-readable decision copy: "{name} approved...", NOT raw enum | [ ] |
| 7 | Check that no raw UUIDs appear anywhere in page | Inspect DOM — no UUID patterns | [ ] |
| 8 | Check that no raw event types appear | No `row_updated`, `revision_requested`, etc. | [ ] |
| 9 | Check that no `server_action`, `metadata_json` appear | No internal strings in response | [ ] |
| 10 | Submit a comment | Comment appears in feed after submission | [ ] |
| 11 | Submit a decision (if not already submitted) | Decision appears in feed after submission | [ ] |
| 12 | Test rate limiting (submit 6 comments in 1 min) | 5th succeeds, 6th returns 429 with retry-after | [ ] |

---

## 5. QA Script: Row Activity Tab

### Steps

| # | Action | Expected result | Pass/Fail |
|---|--------|-----------------|-----------|
| 1 | Open Row Details → Activity tab | Only events for this row appear | [ ] |
| 2 | Check event count | All events reference this row | [ ] |
| 3 | If row is deleted → open activity from scope tree | Row appears with "(removed)" label if target deleted | [ ] |
| 4 | Empty state: row with no events | Shows "No activity recorded for this row." | [ ] |

---

## 6. QA Script: Empty/Loading/Error States

| Surface | State | Expected | Pass/Fail |
|---------|-------|----------|-----------|
| Estimate Activity History | Empty (no events) | Guidance copy: "Activity events will appear here when rows are added, updated, or removed." | [ ] |
| Estimate Activity History | Loading | Skeleton cards (2-3) or spinner with "Loading activity…" | [ ] |
| Estimate Activity History | Error | Error message with Retry button | [ ] |
| Estimate Activity History | Filter returns no results | "No activity events match your filter." + Clear filters | [ ] |
| Shared Link (owner) | Empty | "Activity will appear here when comments are added or the proposal is approved, declined, or revised." | [ ] |
| Shared Link (client) | Empty | "Activity will appear here when you comment or make a decision on the proposal." | [ ] |
| Shared Link | Loading | Skeleton or "Loading activity…" | [ ] |
| Shared Link | Error | Error message + Retry | [ ] |
| Row Activity tab | Empty | "No activity recorded for this row." | [ ] |

---

## 7. QA Script: Accessibility Keyboard Flow

### Steps (keyboard only, no mouse)

| # | Action | Key | Expected result | Pass/Fail |
|---|--------|-----|-----------------|-----------|
| 1 | Tab to "Activity" button | Tab | Button focused | [ ] |
| 2 | Open Activity modal | Enter | Modal opens | [ ] |
| 3 | Tab into search | Tab | Search input focused | [ ] |
| 4 | Tab to filter button | Tab | Filter button focused | [ ] |
| 5 | Open filter dropdown | Enter | Dropdown opens | [ ] |
| 6 | Navigate filter options | Tab / Arrow keys | Options navigable | [ ] |
| 7 | Select a filter | Space | Filter applied, dropdown closes | [ ] |
| 8 | Tab to scope tree | Tab | Scope tree focused | [ ] |
| 9 | Navigate scope tree | Arrow keys | Tree nodes navigable | [ ] |
| 10 | Select a scope | Enter | Activity filtered to scope | [ ] |
| 11 | Tab to activity card | Tab | First card focused | [ ] |
| 12 | Expand audit facts | Enter or Space | Facts expand | [ ] |
| 13 | Collapse audit facts | Enter or Space | Facts collapse | [ ] |
| 14 | Tab to "Load more" | Tab repeatedly | Button focused | [ ] |
| 15 | Tab to close button | Tab | Close button focused | [ ] |
| 16 | Close modal | Enter | Modal closes | [ ] |

---

## 8. QA Script: Screen Reader Smoke Test

### Steps (VoiceOver on macOS + Safari)

| # | Action | Expected screen reader announcement | Pass/Fail |
|---|--------|-------------------------------------|-----------|
| 1 | Open Activity modal | "Activity History, dialog" | [ ] |
| 2 | Navigate to first card | Primary sentence read aloud | [ ] |
| 3 | Expand audit on card | "View details, expanded" | [ ] |
| 4 | Navigate to next day group | "Activity on May 24, 2026" | [ ] |
| 5 | Navigate to search | "Search activity" | [ ] |
| 6 | New activity arrives (Realtime) | "3 new activity events" (via aria-live) | [ ] |

---

## 9. Acceptance Criteria (Go/No-Go per Surface)

| Surface | Criteria | Status |
|---------|----------|--------|
| Estimate Activity History | All 14 raw estimate event types (12 active + 2 dormant) render human-readable copy; no raw event types; filters work; pagination works; keyboard navigable | [ ] |
| Shared-link Activity (owner) | All comment types, decisions, events render human-readable; internal badge visible; Realtime functional or removed; pagination fixed | [ ] |
| Shared-link Activity (client) | No internal comments; no raw UUIDs; no raw event types; decisions human-readable; pagination added | [ ] |
| Email digest | Both comment and decision triggers work; improved copy; no internal comment leak | [ ] |
| Accessibility | Keyboard flow complete; screen reader announces activity; ARIA roles correct | [ ] |
| Performance | First page <1s; composer overhead <1ms/event; 200 events render without lag | [ ] |

---

## Cross-References

- See `08-test-strategy.md` for automated test cases
- See `14-user-journeys-and-ux-paths.md` for journey context
- See `20-edge-case-and-failure-mode-matrix.md` for edge case coverage

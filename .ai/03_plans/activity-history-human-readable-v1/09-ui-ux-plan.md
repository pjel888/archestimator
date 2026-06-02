# 09 — UI/UX Plan: Activity Timeline

**Date:** 2026-06-02

---

## 1. Timeline Hierarchy

```
Activity History Modal (dialog)
├── Scope Tree (left sidebar)
│   ├── Sheet node
│   │   ├── Group node (with row count)
│   │   │   └── Row item
│   │   └── Area node (with row count)
│   └── Filters toolbar
├── Timeline Area (main content)
│   ├── Search bar + filters
│   ├── Day Group "May 24, 2026"
│   │   ├── Event Group (correlation-grouped)
│   │   │   ├── Activity Card
│   │   │   │   ├── Primary Sentence
│   │   │   │   ├── Context Line (location · timestamp · delta)
│   │   │   │   ├── Badge
│   │   │   │   ├── Body (comment/note)
│   │   │   │   └── Expandable Audit Facts
│   │   │   └── Activity Card (next event in group)
│   │   └── Activity Card (standalone)
│   └── Day Group "May 23, 2026"
│       └── ...
│   └── Load More button
└── (Shared Link Activity Feed — simpler, no scope tree)
```

---

## 2. Card Anatomy

### Ideal Card Structure (Owner View)

```
┌─────────────────────────────────────────────┐
│  Philip changed quantity for Hardwood Oak    │  ← Primary Sentence (bold, text-base)
│  Flooring from 5 sqm to 10 sqm.              │
│                                              │
│  Living Area · May 24, 10:45 AM · +₱ 7,200  │  ← Context Line (text-xs, muted)
│                                              │
│  [+₱ 7,200.00] [Changed]                    │  ← Badges (inline, small chips)
│                                              │
│  ▼ View details                              │  ← Expandable trigger
│  ┌─────────────────────────────────────────┐ │
│  │ Previous      │ Current                 │ │  ← Audit Facts (table)
│  │ 5 sqm         │ 10 sqm                  │ │
│  │ ₱ 1,200.00    │ ₱ 1,500.00              │ │
│  │ ──            │ ──                      │ │
│  │ Event ID      │ abc-123-def             │ │
│  │ Event type    │ row_updated             │ │
│  │ Source        │ server_action           │ │
│  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### Client View (Simplified)

```
┌─────────────────────────────────────────────┐
│  Maria approved the proposal.                │  ← Primary Sentence
│                                              │
│  Shared Link · May 24, 11:00 AM              │  ← Context Line (no delta)
│                                              │
│  [Approved]                                  │  ← Badge
└─────────────────────────────────────────────┘
```

---

## 3. Day Grouping

Already implemented in `EstimateSheetContent.tsx` via `groupActivityTimelineByDay()`. Keep this pattern.

```
┌── May 24, 2026 ─────────────────────────────┐
│  (activity cards)                            │
└──────────────────────────────────────────────┘
┌── May 23, 2026 ─────────────────────────────┐
│  (activity cards)                            │
└──────────────────────────────────────────────┘
```

Day headers are sticky within the scroll container (if feasible) or at least visually separated with a border/background.

---

## 4. Actor/Avatar Strategy

**Owner view:** No avatars (keep it clean). Actor name in the primary sentence is sufficient. The actor metadata is already in the sentence — no need for an avatar taking space.

**Client view:** "Client" as actor label, no avatar. If recipient name is available, use it in the sentence: "Maria approved..."

If avatars are added in the future, use initials in a small circle (24px) to the left of the card, not inside it.

---

## 5. Icon Strategy

No icons in the current design. If added:

- Changed → pencil icon (12px, muted)
- Added → plus icon
- Removed → minus icon
- Comment → chat bubble icon
- Approved → check icon (green)
- Declined → X icon (red)
- Revision → refresh/undo icon (amber)

Icons should be used sparingly and never replace the primary sentence. They're decorative, not informational.

---

## 6. Status/Badge Strategy

Badges are small (text-[9px] or text-[10px]), low-contrast chips placed inline after the primary sentence or in a badge bar.

| Badge | Style | Used for |
|-------|-------|---------|
| `+₱ 7,200.00` | Green chip (positive delta) | Cost increases |
| `-₱ 1,200.00` | Red chip (negative delta) | Cost decreases |
| `Changed` | Blue/gray neutral chip | Field changes |
| `Added` | Green chip | Row/node additions |
| `Removed` | Red chip | Row/node deletions |
| `Replaced` | Blue chip | Component replacements |
| `Approved` | Green chip | Proposal accepted |
| `Declined` | Red chip | Proposal declined |
| `Revision` | Amber chip | Revision requested |
| `Comment` | Gray neutral chip | Comments |
| `Internal` | Amber chip, only owner view | Internal notes |

---

## 7. Expand/Collapse Audit Facts

- Trigger: "View details ▼" or "▼" chevron button at the bottom of the card
- Expands inline below the card content
- Audit facts table: Previous | Current, with field labels
- Event metadata: Event ID, Correlation ID, Event type, Source (owner-only)
- Keyboard: Enter/Space to toggle
- `aria-expanded="true/false"` on trigger button
- `aria-controls="audit-facts-{eventId}"` on trigger

---

## 8. Filters

Already implemented in `EstimateSheetContent.tsx`:
- Event type dropdown (all 13 types + "All events")
- Date range (from/to with local day boundaries)
- Search (text input, searches material names)

**Proposed additions:**
- Search also searches node names and actor names
- "Clear filters" button appears when any filter is active

---

## 9. Search

Current: Searches `row_context->>'material'` using `ilike`.

**Proposed:** Keep current implementation but display search hint: "Search materials, areas, or actors..."

Search debounce: 300ms before triggering refetch.

---

## 10. Empty States

### Estimate History (empty)
```
┌────────────────────────────────────────────┐
│                                            │
│         (no activity icon)                  │
│                                            │
│  Activity events will appear here when      │
│  rows are added, updated, or removed.      │
│                                            │
└────────────────────────────────────────────┘
```
Current copy is good — keep it.

### Estimate History (filtered, no results)
```
No activity events match your filter.
[Clear filters]
```

### Shared Link Activity (empty, owner)
```
Activity will appear here when comments
are added or the proposal is approved,
declined, or revised.
```

### Shared Link Activity (empty, client)
```
Activity will appear here when you
comment or make a decision on the
proposal.
```

---

## 11. Loading States

**Skeleton cards** (matching card layout):
```
┌────────────────────────────────────────────┐
│  ████████████████████████████               │  ← Skeleton text lines
│  ████████████████████                      │
│                                            │
│  ██████████████                            │
│  ████                                      │
└────────────────────────────────────────────┘
┌────────────────────────────────────────────┐
│  ████████████████████████████               │
│  ████████████████████                      │
└────────────────────────────────────────────┘
```
Show 2–3 skeleton cards during load.

---

## 12. Error States

```
Unable to load activity.
[Retry]
```
Error message is kept concise. No technical details. Retry button re-fetches.

---

## 13. Realtime New Activity Indicator

When new activity arrives via Realtime (shared link owner view):

```
┌────────────────────────────────────────────┐
│  ⬆ New activity — 3 new events              │  ← Banner at top
│  [View]                                    │  ← Button to scroll to top
└────────────────────────────────────────────┘
│
│  (existing activity cards below)
```

- **Do NOT auto-scroll** — prevents disruption
- **Do NOT auto-insert** — prevents layout shift
- Banner is sticky at the top of the feed
- "View" button scrolls to top and dismisses banner
- Banner auto-dismisses after 10 seconds
- `aria-live="polite"` region announces: "3 new activity events"

---

## 14. Mobile/Responsive Behavior

### Estimate Activity History Modal (mobile)
- Full-screen modal (already implemented)
- Scope tree: Collapsed by default, toggle via hamburger/scope button
- Timeline: Single column, full width
- Audit cards: Full width, expandable audit facts
- Filters: Collapsible bar, opens dropdown

### Shared Link Activity Feed (mobile)
- Single column, full width
- Cards: Full width, reduced padding
- No scope tree
- Comment body: `whitespace-pre-wrap` with word-break

---

## 15. Accessibility Behavior

| Element | Role | ARIA |
|---------|------|------|
| Activity feed container | `region` | `aria-label="Activity timeline"` |
| Activity list | `feed` | `aria-label="Activity events"` |
| Activity card | `article` | `aria-label="{primary sentence}"` |
| Day group | `section` | `aria-label="Activity on May 24, 2026"` |
| Expand audit trigger | `button` | `aria-expanded`, `aria-controls` |
| Audit facts panel | `region` | `aria-label="Event details"`, `id={auditId}` |
| Load more | `button` | `aria-label="Load more activity"` |
| New activity banner | `status` | `aria-live="polite"`, `aria-atomic="true"` |
| Search input | `searchbox` | `aria-label="Search activity"` |
| Filter button | `button` | `aria-label="Filter activity"`, `aria-expanded` |
| Scope tree | `tree` | `aria-label="Activity scope"` |
| Empty state | `status` | `aria-live="polite"` |

### Keyboard Flow
1. Tab into search → type → Enter to search
2. Tab to filter button → Enter to open → Tab through checkboxes → Escape to close
3. Tab to scope tree → Arrow keys to navigate → Enter to select scope
4. Tab to activity cards → Each card is focusable as an article
5. Enter/Space on card trigger → expands/collapses audit facts
6. Tab to "Load more" → Enter to load next page
7. New activity banner (if present) → "View" button focusable

---

## 16. Owner vs Client View Differences

| Aspect | Owner View | Client View |
|--------|-----------|-------------|
| Primary sentence | Full actor name | "Client" or recipient name |
| Delta badge | Shows +₱ amount | Suppressed/filtered |
| Internal comments | Visible with "Internal" badge | Never visible |
| Audit facts | Full diff + event metadata | Diff only (no IDs) |
| Event type badge | Shown | Shown (human readable) |
| Expandable audit | Full detail | Limited detail |
| Raw field | Present (debug) | Stripped entirely |
| Realtime | Yes | No |
| Scope tree | Yes (estimate history) | No (shared link) |
| Filters | Yes | No |
| Day grouping | Yes | Can be simpler |

---

## 17. Wireframe: Shared Link Activity Feed (Owner View)

```
┌─ Shared Link Activity ──────────────────────┐
│                                              │
│  Activity                         [Refresh]  │
│                                              │
│  ┌── May 24, 2026 ────────────────────────┐ │
│  │                                         │ │
│  │  ┌───────────────────────────────────┐  │ │
│  │  │ Maria approved the proposal.      │  │ │
│  │  │ Shared Link · 11:00 AM            │  │ │
│  │  │ [Approved]                        │  │ │
│  │  └───────────────────────────────────┘  │ │
│  │                                         │ │
│  │  ┌───────────────────────────────────┐  │ │
│  │  │ Philip added an internal note on   │  │ │
│  │  │ Living Area.          [Internal]   │  │ │
│  │  │ Shared Link · 10:50 AM            │  │ │
│  │  │ "Check supplier for bulk discount" │  │ │
│  │  └───────────────────────────────────┘  │ │
│  │                                         │ │
│  │  ┌───────────────────────────────────┐  │ │
│  │  │ Client commented on Living Area.   │  │ │
│  │  │ Shared Link · 10:45 AM            │  │ │
│  │  │ "Could we use a lighter finish?"   │  │ │
│  │  │ [Comment]                         │  │ │
│  │  └───────────────────────────────────┘  │ │
│  │                                         │ │
│  │  ┌───────────────────────────────────┐  │ │
│  │  │ Client viewed the proposal.        │  │ │
│  │  │ Shared Link · 9:00 AM             │  │ │
│  │  └───────────────────────────────────┘  │ │
│  │                                         │ │
│  └─────────────────────────────────────────┘ │
│                                              │
│  Live updates via Realtime (owner).          │
└──────────────────────────────────────────────┘
```

---

## 18. Wireframe: Estimate Activity History Modal (Owner, scoped to a row)

```
┌─ Activity History ───────────────────────────┐
│  ┌─ Scope ────┐  ┌─ Timeline ───────────────┐│
│  │            │  │  🔍 Search…  [Filter ▾]   ││
│  │ 📄 Sheet   │  │                           ││
│  │  ├─ Living │  │  ┌── May 24, 2026 ──────┐││
│  │  │  │      │  │  │                        │││
│  │  │  ├─ Row │  │  │  Philip changed        │││
│  │  │  │      │  │  │  quantity for Hardwood │││
│  │  │  └─ Row │  │  │  Oak Flooring from     │││
│  │  │         │  │  │  5 sqm to 10 sqm.      │││
│  │  └─ Kitchen│  │  │                        │││
│  │            │  │  │  Living Area · 10:45 AM│││
│  │            │  │  │  [+₱7,200] [Changed]   │││
│  │            │  │  │  ▼ View details        │││
│  │            │  │  └────────────────────────┘││
│  │            │  │                           ││
│  │            │  │  ┌────────────────────────┐││
│  │            │  │  │  Philip added Hardwood │││
│  │            │  │  │  Oak Flooring to the   │││
│  │            │  │  │  estimate.             │││
│  │            │  │  │                        │││
│  │            │  │  │  Living Area · 10:30 AM│││
│  │            │  │  │  [Added]               │││
│  │            │  │  └────────────────────────┘││
│  │            │  │                           ││
│  │            │  │       [Load more]          ││
│  │            │  └───────────────────────────┘││
│  └────────────┘  └───────────────────────────┘│
└───────────────────────────────────────────────┘
```

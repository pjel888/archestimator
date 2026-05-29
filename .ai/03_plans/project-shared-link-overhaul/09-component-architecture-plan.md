# Component Architecture Plan — Shared Link Overhaul

**Date:** 2026-05-28
**Status:** Proposed Planning

This document breaks down the React component tree, file placement, prop interfaces, and state boundaries for the new Shared Link UI.

---

## 1. Philosophy

- **Keep it stupidly simple**: No new global state stores for this feature. All state lives in React component hooks.
- **Server Components by default**: The receiver page (`/share/[token]/page.tsx`) should remain a Server Component as much as possible. Client interactivity (tabs, comments, decisions) is extracted into small Client Components.
- **Re-use existing primitives**: Use the existing `Modal`, `Button`, and form patterns. Do not introduce new UI libraries.

---

## 2. Manager Surface Components

### 2.1 `ProjectPublicationHeader.tsx` (Modified)
**Path**: `src/components/workshop/ProjectPublicationHeader.tsx`
**Type**: Client Component (already is)

**New Props**:
```typescript
type ProjectPublicationHeaderProps = {
  summary: ProjectPublicationSummary | null;
  projectEstimates: Array<{ id: string; name: string; sheetCode: string; rowCount: number }>; // NEW
};
```

**New Internal State**:
```typescript
type PublicationModalTab = "sheets" | "access" | "recipients" | "activity";

const [activeTab, setActiveTab] = useState<PublicationModalTab>("sheets");
const [selectedEstimateIds, setSelectedEstimateIds] = useState<Set<string>>(new Set());
const [recipientEmails, setRecipientEmails] = useState<string[]>([]);
const [activityFeed, setActivityFeed] = useState<SharedLinkActivityItem[]>([]);
```

**Changes**:
- Rename all "Public link" strings to "Shared link".
- Add tab navigation inside the modal (`sheets`, `access`, `recipients`, `activity`).
- Pass `selectedEstimateIds` (as array) into `createProjectPublication` and `republishProjectPublication`.
- Add `PasswordRequiredForSubmit` validation: if 0 estimates selected, disable generate button.

---

### 2.2 `SheetPickerList` (New)
**Path**: `src/components/workshop/SheetPickerList.tsx`
**Type**: Client Component

```typescript
type SheetPickerListProps = {
  estimates: Array<{ id: string; name: string; sheetCode: string; rowCount: number }>;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
};
```

- Renders a scrollable list of checkboxes.
- Each row: `[checkbox] ES-001 — Structure (24 rows)`.
- Includes "Select all" / "Deselect all" buttons.
- Uses `<label>` with `htmlFor` for a11y.

---

### 2.3 `RecipientEmailComposer` (New)
**Path**: `src/components/workshop/RecipientEmailComposer.tsx`
**Type**: Client Component

```typescript
type RecipientEmailComposerProps = {
  emails: string[];
  onAdd: (email: string) => void;
  onRemove: (email: string) => void;
  onSend: () => void;
  deliveryStatus: Map<string, "pending" | "sent" | "bounced" | "opened">;
  isSending: boolean;
};
```

- Input field with comma/space/Enter parsing.
- Chip list with `X` remove buttons.
- Validation: reject invalid emails with inline error.
- "Send email" button triggers server action.

---

### 2.4 `SharedLinkActivityFeed` (New)
**Path**: `src/components/workshop/SharedLinkActivityFeed.tsx`
**Type**: Client Component

```typescript
type SharedLinkActivityFeedProps = {
  items: SharedLinkActivityItem[];
};
```

- Chronological list of opens, comments, and decisions.
- Uses relative time formatting ("2 minutes ago").
- Grouped by date headers ("Today", "Yesterday").

---

## 3. Receiver Surface Components

### 3.1 `SharePage` (Modified)
**Path**: `src/app/share/[token]/page.tsx`
**Type**: Server Component (remains)

**Changes**:
- Rename "Client publication" labels to "Shared proposal".
- Pass `snapshot` and `recipientToken` (from query param) down to client wrappers.
- Conditionally render interactive surfaces only if `recipientToken` is present and valid.
- Add OpenGraph `<meta>` tags in `<head>`.

---

### 3.2 `SharePageTabs` (New)
**Path**: `src/components/share/SharePageTabs.tsx`
**Type**: Client Component

```typescript
type SharePageTabsProps = {
  estimates: PublicationSnapshotEstimate[];
  currencyCode: string;
};
```

- Horizontal tab list with `overflow-x-auto`.
- Active tab underline indicator (2px, `#292929`).
- Keyboard navigation (Left/Right arrows).
- Renders `SharePageEstimateTable` for the active tab only.

---

### 3.3 `SharePageEstimateTable` (New)
**Path**: `src/components/share/SharePageEstimateTable.tsx`
**Type**: Client Component

```typescript
type SharePageEstimateTableProps = {
  estimate: PublicationSnapshotEstimate;
  currencyCode: string;
};
```

- Responsive table with `overflow-x-auto`.
- Optional 32px thumbnails in Description column (if `row.sourceSnapshot?.imageUrl` exists).
- Pin "Total" column to right on mobile.

---

### 3.4 `SharePageComments` (New)
**Path**: `src/components/share/SharePageComments.tsx`
**Type**: Client Component

```typescript
type SharePageCommentsProps = {
  publicationId: string;
  token: string;
  recipientToken: string;
  estimateId?: string;
};
```

- Fetches comments via `GET /api/share/[token]/activity`.
- Displays flat chronological list.
- Composer textarea with character counter (`0/1000`).
- Submit button with loading state.
- Error banner for failed posts.
- `aria-live="polite"` wrapper around the list.

---

### 3.5 `SharePageDecision` (New)
**Path**: `src/components/share/SharePageDecision.tsx`
**Type**: Client Component

```typescript
type SharePageDecisionProps = {
  publicationId: string;
  token: string;
  recipientToken: string;
  existingDecision?: SharedLinkDecision;
};
```

- "Accept Estimates" (green) and "Decline / Request Revision" (white/red outline) buttons.
- Confirmation modal on click.
- POSTs to `/api/share/[token]/decision`.
- On success, replaces buttons with static badge: `Accepted on May 28, 2026`.
- Disables composer if decision is recorded (optional — may still allow comments post-decision).

---

### 3.6 `SharePageHero` (New)
**Path**: `src/components/share/SharePageHero.tsx`
**Type**: Client Component (or Server if no interactivity)

```typescript
type SharePageHeroProps = {
  imageUrl?: string;
  projectName: string;
};
```

- Renders 4:1 (desktop) or 16:9 (mobile) aspect ratio image.
- Uses Next.js `<Image>` with `priority` if above the fold.
- Falls back to a subtle gradient placeholder if no image.

---

## 4. Shared Utilities

### 4.1 `useSharedLinkSession` (New Hook)
**Path**: `src/hooks/use-shared-link-session.ts`

- Reads the `shared_link_session_[token]` cookie client-side.
- Returns `{ isVerified: boolean; recipientEmail?: string }`.
- Used by `SharePageComments` and `SharePageDecision` to decide if interactive UI should render.

### 4.2 `useRateLimitedSubmit` (New Hook)
**Path**: `src/hooks/use-rate-limited-submit.ts`

- Generic hook for wrapping async submit functions with client-side debounce and error display.
- Accepts `{ submitFn, onSuccess, onError }`.

---

## 5. File Placement Summary

| Component | Path | Type |
|-----------|------|------|
| `ProjectPublicationHeader` | `src/components/workshop/ProjectPublicationHeader.tsx` | Modified Client |
| `SheetPickerList` | `src/components/workshop/SheetPickerList.tsx` | New Client |
| `RecipientEmailComposer` | `src/components/workshop/RecipientEmailComposer.tsx` | New Client |
| `SharedLinkActivityFeed` | `src/components/workshop/SharedLinkActivityFeed.tsx` | New Client |
| `SharePage` | `src/app/share/[token]/page.tsx` | Modified Server |
| `SharePageTabs` | `src/components/share/SharePageTabs.tsx` | New Client |
| `SharePageEstimateTable` | `src/components/share/SharePageEstimateTable.tsx` | New Client |
| `SharePageComments` | `src/components/share/SharePageComments.tsx` | New Client |
| `SharePageDecision` | `src/components/share/SharePageDecision.tsx` | New Client |
| `SharePageHero` | `src/components/share/SharePageHero.tsx` | New Client |
| `useSharedLinkSession` | `src/hooks/use-shared-link-session.ts` | New Hook |
| `useRateLimitedSubmit` | `src/hooks/use-rate-limited-submit.ts` | New Hook |

---

## 6. State Boundaries

| State | Owner | Persistence |
|-------|-------|-------------|
| Active modal tab | `ProjectPublicationHeader` | None (local) |
| Selected estimate IDs | `ProjectPublicationHeader` | None (local, sent to server on action) |
| Recipient email chips | `RecipientEmailComposer` | None (local, sent to server on add) |
| Active estimate tab | `SharePageTabs` | `sessionStorage` (survives refresh) |
| Comment list | `SharePageComments` | Server (fetched on mount, optimistic updates) |
| Decision status | `SharePageDecision` | Server (fetched on mount) |
| Recipient session | `useSharedLinkSession` | Cookie (`shared_link_session_*`) |

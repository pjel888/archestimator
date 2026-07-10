# 23 — Component API Contracts

**Created:** 2026-07-09 (Asia/Manila)
**Purpose:** TypeScript-shaped prop interfaces, state, and behavior for each
new admin component. Closes GAP-3 from `20`. Pairs with `22` (wireframes)
and `26` (a11y proof).

This is planning-only. Interfaces are **planning contracts**; the
implementer may rename or refine during code if behavior preserves the
contract and `04` requirements still pass their acceptance criteria.

---

## 23.1 Authority

- **Source authority:** repo conventions (`src/components/ui/`, `src/hooks/`,
  `src/stores/`), TanStack Query + Zustand patterns, React 19 + Next 16
  Server Component boundaries.
- **Naming:** follows existing camelCase props, PascalCase components.
- **Type imports:** from `@/lib/admin/types` (new) or existing domain
  types where they fit.
- **`"use client"` boundary:** marked per component. Default: Server
  Component unless client interactivity is required.

---

## 23.2 Shared types (`src/lib/admin/types.ts`)

```ts
// Generic shapes reused across admin components.

export type AdminStatusBadge = "ok" | "degraded" | "down" | "unknown";

export type AdminMetricStatus = "live" | "cached" | "stale" | "degraded" | "error";

export interface AdminMetricCardProps {
  label: string;
  value: number | string;
  status?: AdminMetricStatus;
  delta?: { value: number; direction: "up" | "down" | "flat"; label?: string };
  tooltip?: string;
  hint?: string;              // small text below value
  onClick?: () => void;       // make the card a link
  ariaLive?: "polite" | "assertive" | "off";
  refreshHref?: string;       // optional link instead of onClick
  lastRefreshedAt?: Date;
}

export interface AdminTileError {
  title: string;
  detail?: string;
  retry?: () => void;
  linkOut?: { label: string; href: string };
}

export interface AdminQueryResult<T> {
  data: T | null;
  error: AdminTileError | null;
  isLoading: boolean;
}

// Reuses existing QueryResult<T> { count, data, error } from
// src/lib/repositories/* for paginated admin endpoints.

export type AdminFeatureFlagKey =
  | "admin_dashboard_enabled"
  | "admin_support_realtime"
  | "admin_analytics_server_pulls"
  | "admin_maintenance_mode"
  | string;  // future flags

export interface AdminFeatureFlag {
  key: AdminFeatureFlagKey;
  enabled: boolean;
  description: string | null;
  updatedAt: string;       // ISO
  updatedBy: string | null; // profile id
}

export interface AdminUserRow {
  id: string;
  email: string;
  displayName: string | null;
  role: "ceo" | "admin" | "member";
  createdAt: string;       // ISO
  lastSessionAt: string | null; // ISO or null
}

export interface AdminAuditEventRow {
  id: string;
  actorUserId: string;
  actorEmail: string;
  action: string;          // e.g., "flag.update"
  targetType: string | null;
  targetId: string | null;
  summaryJson: Record<string, unknown> | null;
  requestId: string | null;
  createdAt: string;       // ISO
}

export interface AdminConversationRow {
  id: string;
  userId: string;
  userEmail: string;
  userDisplayName: string | null;
  subject: string | null;
  status: "open" | "pending" | "resolved" | "archived";
  channel: "in_app" | "email";
  lastMessageAt: string;
  unreadForAdmin: number;
  preview: string | null;   // last message preview (truncated)
}

export interface AdminMessageRow {
  id: string;
  conversationId: string;
  senderRole: "user" | "admin" | "system";
  authorUserId: string | null;
  bodyText: string;
  sendStatus: "sent" | "send_failed" | "pending";
  createdAt: string;
}

export interface AdminCronHealthRow {
  cron: string;            // e.g., "0 3 * * *"
  name: string;            // "upload-cleanup"
  lastStatus: "ok" | "failed" | "unknown";
  lastRunAt: string | null;
  nextRunAt: string | null;
}

export interface AdminQueueHealthRow {
  bindingName: string;     // "UPLOAD_JOBS_QUEUE"
  depth: number;
  inFlight: number;
  dlqDepth: number;
}

export interface AdminWebVitalsRow {
  metric: "LCP" | "INP" | "CLS";
  p75: number;
  rating: "good" | "needs-improvement" | "poor";
}

export interface AdminFreeTierConsumptionRow {
  resource: "workers_requests" | "d1_rows_read" | "r2_storage" | "queue_ops";
  used: number;
  limit: number;
  unit: string;
}
```

---

## 23.3 Shell components

### `AdminShell.tsx` (Server Component)

```tsx
// src/app/admin/layout.tsx wraps children in <AdminShell>.
// Server Component — performs the admin gate.

interface AdminShellProps {
  children: React.ReactNode;
  // Identity is resolved inside via getCurrentUserContext(); no props leak.
}

// Behavior:
// 1. const context = await getCurrentUserContext();
// 2. if (!isPlatformAdmin(context)) redirect("/access-required");
// 3. if (!await isAdminDashboardEnabled()) redirect("/workshop");
// 4. Render <AdminHeader />, <AdminSidebar />, <main>{children}</main>
//
// Streaming: children Suspense boundaries stream independently.
```

### `AdminSidebar.tsx` (Client Component)

```tsx
"use client";

interface AdminSidebarProps {
  // Read from Zustand admin-ui-store for collapsed state.
  // Active section derived from usePathname().
  conversationsUnreadCount?: number;  // for the badge on Support
}

interface AdminSidebarItem {
  href: string;             // "/admin/users"
  label: string;            // "Users"
  icon: PhosphorIcon;       // from @phosphor-icons/react/dist/ssr
  badge?: { count: number; label: string };  // { count: 3, label: "unread" }
  isActive: boolean;        // derived from pathname
}

// Behavior:
// - Click navigates via next/link (no full reload).
// - Keyboard: Tab moves between items; Enter activates.
// - aria-current="page" on active item.
// - Collapse button in header toggles Zustand state.
// - On < 640 px: hidden by default; SheetDrawer opens via hamburger.
```

### `AdminHeader.tsx` (Server Component)

```tsx
interface AdminHeaderProps {
  // Identity resolved server-side.
  user: { email: string; displayName: string | null; avatarUrl: string | null };
}

// Renders:
// - Logo + "Archestimator · Admin" wordmark
// - Avatar dropdown (client island):
//   - View profile → /workshop/settings/profile
//   - Back to app → /workshop
//   - Sign out → existing Better Auth sign-out
```

---

## 23.4 Metric / tile components

### `AdminMetricCard.tsx` (Server or Client)

```tsx
interface AdminMetricCardProps {
  label: string;
  value: number | string;
  status?: AdminMetricStatus;
  delta?: { value: number; direction: "up" | "down" | "flat"; label?: string };
  tooltip?: string;
  hint?: string;
  onClick?: () => void;
  refreshHref?: string;
  lastRefreshedAt?: Date;
  isLoading?: boolean;        // shows Skeleton
  error?: AdminTileError | null;
  ariaLive?: "polite" | "assertive" | "off";
}

// Behavior:
// - Card renders with <Card> wrapper.
// - Label is <span> with id; value references it via aria-labelledby when
//   used in live region.
// - ariaLive defaults to "off"; presence counter passes "polite".
// - delta rendered via <DeltaBadge>.
// - status rendered via <StatusBadge>.
// - error renders AdminTileError inline.
// - isLoading renders Skeleton matching card shape.
```

### `AdminPresenceCounter.tsx` (Client)

```tsx
"use client";

interface AdminPresenceCounterProps {
  initialCount: number;        // server-rendered initial value
  wsUrl: string;               // "/__cloudflare/global-presence"
  token: string;               // Ed25519 token issued server-side
}

// Behavior:
// - Renders an AdminMetricCard with ariaLive="polite".
// - useGlobalPresence() hook manages WS lifecycle.
// - On WS message {type:"presence", count}: update state.
// - On WS disconnect: show amber "reconnecting" subline, keep last count.
// - On reconnect: clear subline, resume.
// - initialCount prevents flash-of-zero on hydration.
//
// State machine:
//   connecting → live ↔ reconnecting
//                      ↘ error (after N retries)
```

### `AdminHealthStrip.tsx` (Server Component)

```tsx
interface AdminHealthStripProps {
  probes: Array<{
    label: string;            // "D1"
    status: AdminStatusBadge;
    detail?: string;          // "4ms" or null
    tooltip?: string;
  }>;
}

// Renders a horizontal strip of probe rows in a <Panel>.
// Each row: label, StatusBadge, optional detail text.
// Failures do not block sibling probes from rendering.
```

### `AdminIncidentStrip.tsx` (Server Component)

```tsx
interface AdminIncidentStripProps {
  incidents: Array<{
    id: string;
    severity: 1 | 2 | 3;
    title: string;
    openedAt: string;         // ISO
    status: string;           // "open" | "monitoring" | etc.
  }>;
}

// Empty state: <EmptyState icon={<CheckCircle/>} title="No open incidents." />
```

### `AdminFunnelTile.tsx` (Server Component)

```tsx
interface AdminFunnelTileProps {
  title: string;              // "Onboarding funnel"
  subtitle?: string;          // "(last 30 days)"
  stages: Array<{
    label: string;            // "Signup"
    count: number;
  }>;
  // Optional: conversion rates between stages.
}

// Renders as a vertical list with count + bar (relative width).
```

---

## 23.5 Users components

### `AdminUsersTable.tsx` (Client)

```tsx
"use client";

interface AdminUsersTableProps {
  initialRows: AdminUserRow[];   // server-rendered first page
  initialCount: number;
  searchPlaceholder?: string;    // default "search by email prefix"
}

// Behavior:
// - Wraps existing <DataTable<AdminUserRow>>.
// - Search input debounces 300ms; updates URL ?search=; TanStack Query
//   fetches /api/admin/users?search=...&page=1.
// - Role filter: <DropdownMenu>.
// - Pagination: URL ?page=N.
// - Row click: opens <AdminUserDrawer>.
// - Export CSV button: triggers download.
// - Columns: Email, Display name, Role (badge), Created (relative),
//   Last session (relative or "active").
```

### `AdminUserDrawer.tsx` (Client, P2)

```tsx
"use client";

interface AdminUserDrawerProps {
  userId: string | null;     // null = closed
  onClose: () => void;
}

// Behavior:
// - Uses <SheetDrawer> from ui/overlays/sheet-drawer.
// - Fetches /api/admin/users/[id] on open.
// - Shows profile, recent sessions, workspace memberships, recent activity.
// - Focus trap; Esc closes; restore focus to triggering row on close.
// - "View in closed-beta allowlist" link.
// - "Start support conversation" action → creates conversation, navigates.
```

### `AdminSessionHealthTile.tsx` (Server Component)

```tsx
interface AdminSessionHealthTileProps {
  activeSessions: number;
  providerBreakdown: Array<{ provider: string; count: number }>;
  avgSessionHours: number;
}
```

---

## 23.6 Support inbox components

### `AdminSupportInbox.tsx` (Client)

```tsx
"use client";

interface AdminSupportInboxProps {
  initialConversations: AdminConversationRow[];
  initialStatus: "open" | "pending" | "resolved" | "archived" | "all";
}

// Layout: split view (list | thread). Collapses to single-pane nav on < 640.
// State:
//   - selectedConversationId (URL ?id=)
//   - status filter (URL ?status=)
//   - WS connection state (connecting | live | reconnecting | error)
// Behavior:
//   - Selecting conversation: update URL, fetch messages, connect WS.
//   - WS message {type:"message", message:{...}}: append to thread,
//     update conversation list preview, increment unread if not selected.
//   - WS disconnect: amber banner, fall back to 30s poll.
```

### `AdminSupportThread.tsx` (Client)

```tsx
"use client";

interface AdminSupportThreadProps {
  conversation: AdminConversationRow;
  messages: AdminMessageRow[];
  wsConnectionState: "connecting" | "live" | "reconnecting" | "error";
}

// Renders messages top-to-bottom; new messages appended with highlight.
// Each message:
//   - senderRole="admin" → right-aligned, brand-color bubble
//   - senderRole="user" → left-aligned, neutral bubble
//   - senderRole="system" → centered, italic
// sendStatus="send_failed" → red border + retry affordance
//
// Auto-scroll to bottom on new message (unless user has scrolled up).
//
// a11y: aria-live="polite" on the messages container.
```

### `AdminSupportComposer.tsx` (Client)

```tsx
"use client";

interface AdminSupportComposerProps {
  conversationId: string;
  recipientEmail: string;
  disabled?: boolean;
}

// Behavior:
//   - Textarea with placeholder "Type your reply...".
//   - Send on Cmd/Ctrl+Enter; button click also sends.
//   - On send:
//       1. Generate clientMessageId (crypto.randomUUID()).
//       2. Optimistic insert into thread (status "pending").
//       3. Call sendSupportReply Server Action.
//       4. On success: replace optimistic row with real (status "sent").
//       5. On failure: mark row "send_failed", keep draft, toast error.
//   - Body length validation (max 10_000 chars); inline error if exceeded.
//   - XSS safety: body rendered as plain text in thread (not dangerouslySetInnerHTML).
```

---

## 23.7 Analytics components

### `AdminAnalyticsTiles.tsx` (Server Component)

```tsx
interface AdminAnalyticsTilesProps {
  tiles: Array<
    | {
        provider: "cloudflare" | "clarity" | "ga4";
        configured: true;
        cachedAt: string;
        metrics: Array<{ label: string; value: string | number }>;
        openInProviderHref: string;
      }
    | {
        provider: "cloudflare" | "clarity" | "ga4";
        configured: false;
        reason: "missing_credentials" | "quota_exhausted";
        openInProviderHref: string;
        howToEnableHref: string;
      }
  >;
}

// Renders a grid of provider tiles.
// "configured: false" tiles render the not-configured state (22.6).
```

### `AdminCharts.tsx` (Client, dynamic-imported)

```tsx
"use client";

// Loaded via next/dynamic with { ssr: false } to keep recharts out of SSR.
// Thin wrappers:
//   - AdminLineChart
//   - AdminBarChart
//   - AdminAreaChart
//   - AdminSparkline

interface AdminLineChartProps {
  data: Array<{ x: string; y: number }>;
  xLabel?: string;
  yLabel?: string;
  height?: number;        // default 200
  ariaLabel: string;      // for screen readers
}

// Theming: recharts <ResponsiveContainer> + tokens:
//   stroke/fill from --brand-orange, --brand-amber, --success, --warning
```

---

## 23.8 Flags components

### `AdminFlagsList.tsx` (Client)

```tsx
"use client";

interface AdminFlagsListProps {
  initialFlags: AdminFeatureFlag[];
}

// Behavior:
//   - Renders a DataTable-like list of flags.
//   - Each row has a <Switch> with aria-label={`Toggle ${flag.key}`}.
//   - Toggle → optimistic update → setFeatureFlag Server Action → audit.
//   - On failure: revert + toast.
//   - "Add flag" button opens a modal with key + description fields.
```

---

## 23.9 Audit components

### `AdminAuditTable.tsx` (Client)

```tsx
"use client";

interface AdminAuditTableProps {
  initialRows: AdminAuditEventRow[];
  initialCount: number;
}

// Wraps DataTable; cursor pagination; filters:
//   - action (free-text or dropdown of known action prefixes)
//   - actor (email autocomplete)
//   - date range (7d / 30d / custom)
// Export CSV button.
```

### `AdminDSARQueue.tsx` (Client)

```tsx
"use client";

interface AdminDSARQueueProps {
  initialRows: Array<{
    id: string;
    userEmail: string;
    requestType: "export" | "delete";
    requestedAt: string;
    status: "open" | "in_progress" | "complete";
    slaDeadline: string;
  }>;
}

// Behavior:
//   - List open requests with SLA countdown.
//   - "Mark complete" action (audited).
//   - "View details" opens drawer with full request + user data summary.
```

### `AdminMassOpAudit.tsx` (Server Component)

```tsx
interface AdminMassOpAuditProps {
  recentEvents: Array<{
    id: string;
    actor: string;
    targetType: string;
    affectedCount: number;
    createdAt: string;
  }>;
}
```

---

## 23.10 Observability components

### `AdminObservabilityView.tsx` (Server Component, composed)

```tsx
interface AdminObservabilityViewProps {
  systemStatus: { uptime24h: AdminStatusBadge; lastSev1: string | null };
  backupStatus: { lastVerifiedAt: string | null };
  dataResidency: { region: string; provider: string };
  cronHealth: AdminCronHealthRow[];
  queueHealth: AdminQueueHealthRow[];
  clientErrors: Array<{ message: string; count: number; route: string }>;
  webVitals: AdminWebVitalsRow[];
  freeTierConsumption: AdminFreeTierConsumptionRow[];
  maintenanceMode: boolean;
}

// Composes:
//   <AdminSystemStatusPanel>
//   <AdminCronHealth>
//   <AdminQueueHealth>
//   <AdminClientErrors>
//   <AdminWebVitals>
//   <AdminFreeTierGauge>
//   <AdminMaintenanceModeToggle>
```

### `AdminCronHealth.tsx` (Server Component)

```tsx
interface AdminCronHealthProps {
  crons: AdminCronHealthRow[];
}
```

### `AdminQueueHealth.tsx` (Server Component)

```tsx
interface AdminQueueHealthProps {
  queues: AdminQueueHealthRow[];
  onViewDlq?: (bindingName: string) => void;  // navigates to DLQ viewer
}
```

### `AdminClientErrors.tsx` (Server Component)

```tsx
interface AdminClientErrorsProps {
  topErrors: Array<{
    message: string;       // truncated stack / message
    count: number;
    route: string | null;
    firstSeen: string;
    lastSeen: string;
  }>;
  workersObservabilityHref: string;
}
```

### `AdminWebVitals.tsx` (Server Component)

```tsx
interface AdminWebVitalsProps {
  vitals: AdminWebVitalsRow[];
  // LCP good ≤ 2.5s, needs-improvement ≤ 4.0s, poor > 4.0s
  // INP good ≤ 200ms, needs-improvement ≤ 500ms, poor > 500ms
  // CLS good ≤ 0.1, needs-improvement ≤ 0.25, poor > 0.25
}
```

### `AdminFreeTierGauge.tsx` (Server Component)

```tsx
interface AdminFreeTierGaugeProps {
  rows: AdminFreeTierConsumptionRow[];
  // Each row renders a <Progress> bar:
  //   - < 60%: green
  //   - 60–85%: amber
  //   - > 85%: red
}
```

### `AdminMaintenanceModeToggle.tsx` (Client)

```tsx
"use client";

interface AdminMaintenanceModeToggleProps {
  initialEnabled: boolean;
}

// Behavior:
//   - <Switch> with confirmation dialog on enable.
//   - Confirmation copy: "Maintenance mode will block all writes to /workshop.
//     Users will see a 'back soon' message. Continue?"
//   - Calls setFeatureFlag({ key: "admin_maintenance_mode", enabled }).
//   - proxy.ts reads this flag and serves 503 for /workshop writes when on.
```

---

## 23.11 Hooks

### `useGlobalPresence.ts`

```ts
// src/hooks/use-global-presence.ts
"use client";

export function useGlobalPresence(opts: {
  wsUrl: string;
  token: string;
  initialCount: number;
}): {
  count: number;
  state: "connecting" | "live" | "reconnecting" | "error";
  lastUpdated: Date | null;
};

// Lifecycle:
//   - useEffect on mount: open WS, send authorize message.
//   - onMessage: parse { type, count } and update state.
//   - onClose: state="reconnecting", exponential backoff reconnect.
//   - onVisible (useVisibility): pause WS when tab hidden? (decide impl).
//   - cleanup on unmount: close WS.
```

### `useSupportInbox.ts`

```ts
// src/hooks/use-support-inbox.ts
"use client";

export function useSupportInbox(opts: {
  conversationId: string;
  token: string;
}): {
  messages: AdminMessageRow[];
  connectionState: WSState;
  sendTypingIndicator: () => void;
};

// Similar WS lifecycle to useGlobalPresence but per-conversation.
```

### `useAdminMetrics.ts`

```ts
// src/hooks/use-admin-metrics.ts
"use client";

export function useAdminMetrics<T>(
  endpoint: string,  // "/api/admin/metrics/signups"
  options?: {
    refetchInterval?: number;  // default 60_000
    staleTime?: number;        // default 30_000
  },
): UseQueryResult<T>;

// Uses TanStack Query.
// Defers refetch via requestIdleCallback per notifications-hook pattern.
// Disabled when document.hidden = true (resume on visibility change).
```

---

## 23.12 Zustand store

### `admin-ui-store.ts`

```ts
// src/stores/admin-ui-store.ts
import { create } from "zustand";

interface AdminUIState {
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileSidebarOpen: (open: boolean) => void;
}

export const useAdminUIStore = create<AdminUIState>((set) => ({
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
}));

// Persisted to localStorage? No — keep in-memory; default to expanded on
// every load (operator surfaces benefit from consistent layout).
```

---

## 23.13 Repository interfaces (`src/lib/admin/*-repository.ts`)

```ts
// users-repository.ts
export async function listAdminUsers(opts: {
  search?: string;
  role?: "ceo" | "admin" | "member";
  page: number;
  limit: number;
}): Promise<QueryResult<AdminUserRow>>;

export async function countSignups(windowDays: 7 | 30): Promise<number>;

export async function listRecentSignups(limit: number): Promise<AdminUserRow[]>;

export async function getAdminUserDetail(
  userId: string,
): Promise<AdminUserDetail | null>;

// audit.ts / audit-repository.ts
export async function writeAdminAuditEvent(input: {
  actor: { userId: string; email: string };
  action: string;
  targetType?: string;
  targetId?: string;
  summary?: Record<string, unknown>;
  requestId?: string;
}): Promise<{ id: string }>;

export async function listAuditEvents(opts: {
  action?: string;
  actorUserId?: string;
  dateRange?: { from: Date; to: Date };
  cursor?: string;
  limit: number;
}): Promise<QueryResult<AdminAuditEventRow>>;

// support-repository.ts
export async function listConversations(opts: {
  status?: AdminConversationRow["status"];
  page: number;
  limit: number;
}): Promise<QueryResult<AdminConversationRow>>;

export async function getConversationMessages(
  conversationId: string,
): Promise<AdminMessageRow[]>;

export async function appendMessage(input: {
  conversationId: string;
  senderRole: "user" | "admin" | "system";
  authorUserId: string | null;
  bodyText: string;
  clientMessageId: string;
}): Promise<{ message: AdminMessageRow; inserted: boolean }>;
// Returns inserted:false if (conversation_id, client_message_id) already exists
// (idempotency).

// feature-flags.ts
export async function getFeatureFlag(key: string): Promise<boolean>;
export async function listFeatureFlags(): Promise<AdminFeatureFlag[]>;
export async function setFeatureFlag(input: {
  key: string;
  enabled: boolean;
  actor: { userId: string; email: string };
}): Promise<AdminFeatureFlag>;

// metric-cache.ts
export async function getMetricCache<T>(key: string): Promise<T | null>;
export async function setMetricCache(
  key: string,
  payload: unknown,
  ttlSeconds: number,
): Promise<void>;
export async function refreshIfStale<T>(
  key: string,
  ttlSeconds: number,
  refresher: () => Promise<T>,
): Promise<T>;

// health-probes.ts
export async function runAdminHealthProbes(
  env: CloudflareEnv,
): Promise<AdminHealthProbeResult[]>;

// observability-repository.ts (new surfaces from §21)
export async function getCronHealth(): Promise<AdminCronHealthRow[]>;
export async function getQueueHealth(): Promise<AdminQueueHealthRow[]>;
export async function getRecentClientErrors(
  windowHours: number,
  limit: number,
): Promise<Array<{ message: string; count: number; route: string | null; firstSeen: string; lastSeen: string }>>;
export async function getWebVitalsField(
  windowDays: number,
): Promise<AdminWebVitalsRow[]>;
export async function getFreeTierConsumption(): Promise<AdminFreeTierConsumptionRow[]>;
export async function getBackupStatus(): Promise<{ lastVerifiedAt: string | null }>;
```

---

## 23.14 Server Action contracts

```ts
// src/lib/admin/support-actions.ts
"use server";

export async function sendSupportReply(input: {
  conversationId: string;
  body: string;
  clientMessageId: string;
}): Promise<
  | { ok: true; message: AdminMessageRow; conversation: AdminConversationRow }
  | { ok: false; error: "email_send_failed" | "unauthorized" | "validation"; message?: AdminMessageRow }
>;

export async function setConversationStatus(input: {
  conversationId: string;
  status: "open" | "pending" | "resolved" | "archived";
}): Promise<{ ok: true; conversation: AdminConversationRow } | { ok: false; error: string }>;

export async function startConversation(input: {
  userId: string;
  subject?: string;
  initialBody?: string;
}): Promise<{ ok: true; conversation: AdminConversationRow } | { ok: false; error: string }>;

// src/lib/admin/flag-actions.ts
"use server";

export async function setFeatureFlag(input: {
  key: string;
  enabled: boolean;
}): Promise<{ ok: true; flag: AdminFeatureFlag } | { ok: false; error: string }>;

// src/lib/admin/audit-actions.ts (CSV export)
"use server";

export async function exportAuditCsv(opts: {
  action?: string;
  actorUserId?: string;
  dateRange?: { from: string; to: string };
}): Promise<{ url: string; expiresAt: string }>;
// Generates CSV in-memory (or R2 temp object), returns signed URL.

// src/lib/admin/dsar-actions.ts
"use server";

export async function markDsarComplete(input: {
  requestId: string;
}): Promise<{ ok: true } | { ok: false; error: string }>;
```

---

## 23.15 API route contracts

```ts
// GET /api/admin/metrics/signups?window=7d
// → 200 { count: number; recent: AdminUserRow[]; window: "7d" | "30d" }
// → 401 if no session
// → 403 if non-admin

// GET /api/admin/metrics/cloudflare
// → 200 { requests: number; errors: number; fetchedAt: string; degraded: false }
//   OR
// → 200 { degraded: true }

// GET /api/admin/users?search=&page=&limit=&role=
// → 200 { items: AdminUserRow[]; count: number; page: number; limit: number }

// GET /api/admin/users/:id
// → 200 { user: AdminUserDetail }
// → 404 if not found

// GET /api/admin/support/conversations?status=&page=
// → 200 { items: AdminConversationRow[]; count: number; page: number }

// GET /api/admin/support/conversations/:id/messages
// → 200 { messages: AdminMessageRow[] }

// GET /api/admin/audit?action=&actor=&from=&to=&cursor=&limit=
// → 200 { items: AdminAuditEventRow[]; nextCursor: string | null }

// GET /api/admin/observability/cron-health
// GET /api/admin/observability/queue-health
// GET /api/admin/observability/client-errors?hours=24
// GET /api/admin/observability/web-vitals?days=7
// GET /api/admin/observability/free-tier
// GET /api/admin/observability/backup-status

// All admin routes:
//   - force-dynamic
//   - requireCurrentUserContext() + admin gate
//   - Cache-Control: private, no-store
//   - Errors logged via emitLogRecord
```

---

## 23.16 WebSocket message contracts

### GlobalPresence

```ts
// /__cloudflare/global-presence

// Client → Server (once on connect):
{ "type": "authorize", "token": "<Ed25519-token>" }

// Server → Client (on count change, debounced 1s):
{ "type": "presence", "count": 12 }
```

### SupportInbox

```ts
// /__cloudflare/support-inbox/:conversationId

// Client → Server (once on connect):
{ "type": "authorize", "token": "<Ed25519-token>" }

// Server → Client (new message in this conversation):
{ "type": "message", "message": AdminMessageRow }

// Optional P2:
// Client → Server: { "type": "typing" }
// Server → Client: { "type": "typing", "userId": "..." }
```

---

## 23.17 What this doc does NOT specify

- Final visual styling (color, typography beyond existing tokens).
- Exact Tailwind class names (use existing patterns).
- Internal implementation of `DataTable<T>` or other reused primitives
  (they already exist).
- Phosphor icon names per sidebar item (implementer picks from regular
  weight outline family).
- Test file contents (see `12` for the test matrix).

---

## 23.18 Confirmation

No application code, tests, migrations, schemas, `wrangler.jsonc`,
`package.json`, provider state, or runtime data were modified. All writes
are confined to `.ai/03_plans/2026-07-08/Admin-Dashboard-Planning/`.

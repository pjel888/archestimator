# 06 — Performance & Observability Plan

**Date:** 2026-05-30
**Purpose:** Database index recommendations, query optimization guidance, caching strategy, rate limiter storage architecture, observability metrics, and alerting thresholds.

**2026-06-01 status note:** The unchecked acceptance rows below are pre-implementation planning rows, not the canonical current status. Use `07-implementation-acceptance-criteria.md`, `09-unified-implementation-flow.md`, and `.ai/10_state/known-issues.md` for truth. Current local/live proof covers batched project-list collaboration/publication metadata, optional card props, recipient/session activity tracking, DB-backed public share/invite rate limiting, non-blocking email failure handling, circuit-breaker behavior, and visible pending-invite bridge progress. Remaining performance/observability readiness gates are provider/dashboard proof, linked query/index review under the separate database-indexing plan, and launch monitoring/alerting ownership.

---

## Database Indexes

### Recommended New Indexes

```sql
-- Collaboration: fast lookup by email + state
create index if not exists collaboration_invitations_email_state_idx
  on public.collaboration_invitations(email, lifecycle_state, expires_at);

-- Collaboration: pending invites per project (for project card badges)
create index if not exists collaboration_invitations_project_state_idx
  on public.collaboration_invitations(project_id, lifecycle_state)
  where lifecycle_state = 'pending';

-- Collaboration: token lookup (primary access pattern)
-- Already exists: collaboration_invitation_tokens(token_hash) unique constraint ✅

-- Shared link: token lookup (primary access pattern)
-- Already exists: project_publications(token_hash) unique constraint ✅

-- Shared link: live publications per project (for project card badges)
create index if not exists project_publications_project_status_idx
  on public.project_publications(project_id, status)
  where status = 'published';

-- Shared link: recipient lookup
-- Already exists: shared_link_recipients(recipient_token_hash) unique constraint ✅
create index if not exists shared_link_recipients_pub_email_idx
  on public.shared_link_recipients(publication_id, email);

-- Shared link: activity feed ordering
create index if not exists shared_link_comments_pub_created_idx
  on public.shared_link_comments(publication_id, created_at desc);

create index if not exists shared_link_responses_pub_recipient_idx
  on public.shared_link_responses(publication_id, recipient_id);

create index if not exists shared_link_events_pub_created_idx
  on public.shared_link_events(publication_id, created_at desc);
```

### Indexes to Verify (may already exist)

```sql
-- Membership lookups for role resolution
-- Verify these exist:
-- project_members(project_id, user_id)
-- estimate_sheet_members(estimate_id, user_id)
-- workspace_members(workspace_id, user_id)
```

---

## Query Optimization Guidance

### Project List with Collaboration Metadata

**Current:** `listCurrentWorkspaceProjects()` queries projects + project_members + estimate_sheet_members + workspace_members. Does NOT query collaboration_invitations or project_publications.

**Target:** Add aggregated metadata without N+1 queries:

```typescript
// Single query for pending invite counts across owned projects:
const { data: pendingCounts } = await supabase
  .from("collaboration_invitations")
  .select("project_id, count")
  .in("project_id", ownedProjectIds)
  .eq("lifecycle_state", "pending")
  .gt("expires_at", new Date().toISOString());

// Single query for publication status across all projects:
const { data: publicationStatuses } = await supabase
  .from("project_publications")
  .select("project_id, status, clientLinkPath:encrypted_token")
  .in("project_id", allProjectIds)
  .eq("status", "published");
```

**Constraint:** Keep card props optional — only fetch metadata when the query is cheap. If the list has 100+ projects, consider paginating metadata or loading it on hover/focus.

### Activity Feeds

**Current:** `loadSharedLinkActivity()` fetches comments, responses, and events in 3 parallel queries, sorts client-side. Uses cursor pagination via `created_at`.

**Target:** Consider a unified server-side view or RPC that unions the three tables:

```sql
-- Future optimization:
create or replace function public.get_shared_link_activity(
  pub_id uuid, p_limit int, p_cursor timestamptz
) returns table(...) as $$
  -- UNION ALL of comments, responses, events
  -- ORDER BY created_at DESC
  -- LIMIT p_limit
$$;
```

**Pagination:** Always use cursor-based pagination (not offset). Current implementation uses `created_at` cursor — verify it handles ties correctly (add `id` as tiebreaker).

### Shared Snapshots

**Current:** Snapshot is a JSONB column. Full snapshot loaded on every page view.

**Optimizations:**
- Snapshot is immutable by design — but **must remain `no-store`** because it contains confidential client estimate data behind a bearer token. Do not use public CDN caching.
- Consider storing large snapshots in Supabase Storage with a DB reference, rather than in the table row
- Add a hash of the snapshot JSON for quick staleness comparison without loading full content

---

## Rate Limiter Storage Architecture

### Current: In-Memory (3 limiters)

| Limiter | Scope | Risk |
|---------|-------|------|
| Comment rate limiter | publication_id:recipient_id | Resets on server restart; per-instance in serverless |
| Password lockout | IP:token hash | Resets on restart; attacker can cycle IPs faster than lockout window in multi-instance |
| Digest rate limiter | publication_id | Acceptable — best-effort feature, low risk |

### Target: Durable Storage

**Option A: Supabase table with fixed-window counters (simplest, no new infra)**

Migration to create:
```sql
-- Migration: supabase/migrations/YYYYMMDDHHMMSS_rate_limits.sql
create table if not exists public.rate_limits (
  key_hash text not null,              -- SHA-256 hex of (namespace:entity_key), not raw IP/email
  window_start timestamptz not null,   -- normalized to minute boundary (floor to minute)
  count int not null default 1,
  expires_at timestamptz not null default (now() + interval '2 hours'),
  primary key (key_hash, window_start)
);

create index rate_limits_expires_idx on public.rate_limits(expires_at);

-- Cleanup: delete expired rows (called from app on each rate-limit check, or via pg_cron)
-- delete from public.rate_limits where expires_at < now();
```

Rate limiter logic:
```typescript
import { createHash } from "node:crypto";

function hashKey(namespace: string, ...parts: string[]) {
  // Hash all key parts so raw IP/email/token never stored
  return createHash("sha256")
    .update(`${namespace}:${parts.filter(Boolean).join(":")}`)
    .digest("hex")
    .slice(0, 32);
}

function normalizeWindow(ts: number, windowMs: number): string {
  // Floor to window boundary (e.g., minute)
  return new Date(Math.floor(ts / windowMs) * windowMs).toISOString();
}

// Trusted IP extraction (behind Vercel/proxy):
function getClientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || headers.get("x-real-ip")
    || "unknown";
}

async function checkRateLimit(
  namespace: string,
  keyParts: string[],
  { maxRequests, windowMs }: { maxRequests: number; windowMs: number }
): Promise<{ allowed: true } | { allowed: false; retryAfter: number }> {
  const key = hashKey(namespace, ...keyParts);
  const now = Date.now();
  const windowStart = normalizeWindow(now, windowMs);
  const expiresAt = new Date(now + windowMs * 2).toISOString();

  // Best-effort expire cleanup
  const supabase = await createSupabaseServerClient();
  await supabase.from("rate_limits").delete().lt("expires_at", new Date().toISOString()).catch(() => {});

  // Upsert increment
  await supabase.from("rate_limits").upsert(
    { key_hash: key, window_start: windowStart, count: 1, expires_at: expiresAt },
    { onConflict: "key_hash,window_start", ignoreDuplicates: false }
  ).catch(() => {});

  // Read current count with raw SQL for upsert increment
  const { data } = await supabase
    .from("rate_limits")
    .select("count")
    .eq("key_hash", key)
    .eq("window_start", windowStart)
    .maybeSingle();

  const count = data?.count ?? 1;
  if (count > maxRequests) {
    const retryAfter = Math.ceil(windowMs / 1000);
    return { allowed: false, retryAfter };
  }
  return { allowed: true };
}
```

**Upsert increment:** For production, use a raw SQL upsert with `count = rate_limits.count + 1`:
```sql
insert into public.rate_limits (key_hash, window_start, count, expires_at)
values ($1, $2, 1, $3)
on conflict (key_hash, window_start)
do update set count = rate_limits.count + 1, expires_at = excluded.expires_at;
```

**Retry-After:** All 429 responses must include `Retry-After` header with seconds until next allowed request.

**Option B: Upstash Redis (if already in stack, or for higher throughput)**
Same design but using Redis `INCR` + `EXPIRE` per key+window. Simpler code, external dependency.

**Recommendation:** Option A for MVP. Migrate to Option B if rate-limit checks exceed ~50/second sustained.

---

## Caching Strategy

| Data | Cache Strategy | TTL | Invalidation |
|------|---------------|-----|-------------|
| Shared snapshot (public) | **Cache-Control: no-store** | N/A | N/A — tokenized share pages contain confidential estimate data behind bearer tokens; public caching is unsafe |
| Project publication summary (manager) | TanStack Query with `staleTime: 60000` | 1 min (client-side only) | After publish/republish/rotate/revoke |
| Collaboration summary (manager) | TanStack Query with `staleTime: 30000` | 30 sec (client-side only) | After invite/update/remove |
| Project list (shared projects) | Server-side: revalidate via `revalidatePath` | On mutation | After invite accept/removal |
| Invite resolution (public) | `Cache-Control: no-store` | None | N/A — must be fresh |

### Caching Rule: Token-Protected Pages Default to no-store

Tokenized share pages (`/share/[token]`) and invite pages (`/invite/[token]`) contain confidential data behind bearer tokens. They must use `Cache-Control: no-store`. Private caching (`private, max-age=60`) may be considered only after explicit threat modeling confirms the page contains no confidential snapshot data and is not password-protected or recipient-session-enabled. **Never use `public` or `stale-while-revalidate` for any token-protected resource.**

---

## Observability Metrics

### Counters (increment-only)

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `invite_created_count` | Invitation rows inserted | None (informational) |
| `invite_accepted_count` | Successful acceptances | None (informational) |
| `invite_wrong_account_count` | Wrong-email accept attempts | >10 in 5 min → investigate |
| `invite_expired_count` | Invitations expired | None (informational) |
| `invite_email_attempted_count` | Email send attempts | None (informational) |
| `invite_email_failure_count` | Email send failures | >5 in 10 min → alert |
| `shared_link_open_count` | Publication opens | None (informational) |
| `shared_link_password_failure_count` | Failed password attempts | >20 in 5 min per token → alert |
| `shared_link_comment_count` | Comments posted | None (informational) |
| `shared_link_decision_count` | Decisions submitted | None (informational) |
| `rate_limit_block_count` | Rate limit rejections | >50 in 1 min → investigate |
| `email_provider_failure_count` | Resend API errors | >10 in 10 min → alert |
| `circuit_open_count` | Circuit breaker trips | >1 in 10 min → alert |
| `token_resolution_failure_count` | Invalid/missing token lookups | >100 in 1 min → investigate (scanning) |

### Gauges (current value)

| Metric | Description |
|--------|-------------|
| `active_pending_invitations` | Count of pending invitations across all projects |
| `active_publications` | Count of published shared links |
| `rate_limit_buckets_size` | Number of active rate limit buckets (memory pressure indicator) |
| `circuit_state` | 0 = closed, 1 = open |

### Implementation

Use a lightweight structured logging format (already established in `resend-client.ts` and `comment/route.ts`):

```typescript
console.log(JSON.stringify({
  level: "info",
  metric: "invite_created",
  project_id: projectId.slice(0, 8),
  ts: new Date().toISOString(),
}));
```

For production: ship these to a log aggregator (Vercel Log Drain, Datadog, etc.) and create dashboards.

---

## Alerting Thresholds

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| Email delivery degraded | `email_provider_failure_count` >10 in 10 min | **High** | Check Resend status page; verify API key; check circuit state |
| Brute-force password attempts | `shared_link_password_failure_count` >20 in 5 min per token | **High** | Verify lockout is working; investigate IP |
| Token scanning detected | `token_resolution_failure_count` >100 in 1 min | **Medium** | IP-based rate limiting working? Check for scanning pattern |
| Circuit breaker tripped | `circuit_open_count` >1 in 10 min | **Medium** | Investigate root cause of elevated error rate |
| Rate limiting aggressive | `rate_limit_block_count` >50 in 1 min | **Medium** | Check if legitimate traffic is being blocked |
| Invite acceptance anomaly | `invite_wrong_account_count` >10 in 5 min | **Low** | Possible phishing — investigate email pattern |
| Stale snapshot (per-publication) | `snapshot_generated_at` < `estimates.updated_at` by >7 days | **Low** | Informational; manager should update |

---

## Performance-Specific Acceptance Criteria

### AC-PERF-01: Project List Query
- [ ] Project list page loads with pending-invite counts and publication status in one additional round-trip (not N+1)
- [ ] Query uses indexes from recommended list
- [ ] Card props for collaboration/publication metadata are optional (don't break if tables don't exist yet)

### AC-PERF-02: Activity Feed
- [ ] Activity feed loads initial 50 items in <500ms (p95)
- [ ] "Load more" uses cursor-based pagination with `id` tiebreaker
- [ ] No full table scans on `shared_link_comments`, `shared_link_responses`, `shared_link_events`

### AC-PERF-03: Rate Limiter Durability
- [ ] Comment rate limiter survives server restart (uses DB-backed storage)
- [ ] Password lockout survives server restart
- [ ] Cleanup job removes expired rate limit records
- [ ] Rate limiter does not add >50ms overhead to request latency

### AC-PERF-04: Email Non-Blocking
- [ ] Email send never blocks invite/link creation response
- [ ] Email failures logged but don't throw to caller
- [ ] Circuit breaker prevents cascading failures

### AC-PERF-05: Redirect Chain
- [ ] Signed-out invite acceptance: ≤3 redirects total (target: 2)
- [ ] Bridge cookie flow visible to user with progress indicator
- [ ] No silent redirects without user-facing state change

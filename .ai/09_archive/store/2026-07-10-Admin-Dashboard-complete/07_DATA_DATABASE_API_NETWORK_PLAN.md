# 07 — Data, Database, API, and Network Plan

## 7.1 Cloudflare resource boundary (from `wrangler.jsonc`)

- D1 `ARCH_DB` (`archestimator-proof-db`, id `9bdb29bb-...`) — app + auth + admin data.
- R2 `ARCH_UPLOADS_R2` — uploads (admin reads usage only).
- DO `COLLAB_ROOMS` (`CollaborationRoom`) — existing; new DOs added alongside.
- Queue `UPLOAD_JOBS_QUEUE` — admin reads depth only.
- Images `IMAGES`, Email `EMAIL` (`send_email`; P2 inbound via Email Routing).
- **New bindings (implementation):**
  - DO `GLOBAL_PRESENCE` → class `GlobalPresence` (SQLite, `new_sqlite_classes`).
  - DO `SUPPORT_INBOX` → class `SupportInbox` (SQLite).
  - Optional `analytics_engine` binding `ADMIN_METRICS` (presence trend; free-tier).
  - Optional `ratelimit` binding(s) `ADMIN_LOGIN_LIMIT`, `ADMIN_WRITE_LIMIT` (free, GA).
- Provider boundary strict: only `archestimator-proof` resources; never the
  historical Supabase project or unrelated accounts.

## 7.2 Database change blueprints

### Blueprint 7.2.1 — Support conversations/messages (migration `0041`)

- **Filename:** `migrations/0041_support_conversations.sql` (next after `0040`).
- **Tables/changes:**
  ```sql
  CREATE TABLE IF NOT EXISTS support_conversations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    subject TEXT,
    status TEXT NOT NULL DEFAULT 'open'
      CHECK (status IN ('open','pending','resolved','archived')),
    channel TEXT NOT NULL DEFAULT 'in_app'
      CHECK (channel IN ('in_app','email')),
    last_message_at TEXT NOT NULL,
    unread_for_admin INTEGER NOT NULL DEFAULT 1,
    unread_for_user INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX idx_support_conv_user ON support_conversations(user_id, last_message_at DESC);
  CREATE INDEX idx_support_conv_status ON support_conversations(status, last_message_at DESC);

  CREATE TABLE IF NOT EXISTS support_messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
    sender_role TEXT NOT NULL CHECK (sender_role IN ('user','admin','system')),
    author_user_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    body_text TEXT NOT NULL,
    body_html TEXT,
    email_message_id TEXT,           -- RFC822 Message-ID for email threading (P2)
    client_message_id TEXT,          -- idempotency key for in-app sends
    send_status TEXT NOT NULL DEFAULT 'sent'
      CHECK (send_status IN ('sent','send_failed','pending')),
    created_at TEXT NOT NULL,
    UNIQUE(conversation_id, client_message_id)
  );
  CREATE INDEX idx_support_msg_conv ON support_messages(conversation_id, created_at ASC);
  CREATE INDEX idx_support_msg_email ON support_messages(email_message_id) WHERE email_message_id IS NOT NULL;
  ```
- **Backfill:** none (new tables).
- **Concurrency:** `UNIQUE(conversation_id, client_message_id)` enforces idempotency.
- **Expected query counts:** list=1 per page; thread=1 (messages) + 1 (conv); send=insert msg + update conv (2) + email.
- **Cardinality (solo-dev):** now ~10² convs; 10x ~10³; 100x ~10⁴; 1000x ~10⁵ — all fine on D1 with the indexes.
- **Index selectivity:** `(user_id, last_message_at)` and `(status, last_message_at)` cover the inbox views.
- **D1 cost:** trivial at this scale; no denormalization needed yet.
- **Generated types:** no Env binding change; no `cf:typegen` needed.
- **Rollback/fix-forward:** `DROP TABLE support_messages; DROP TABLE support_conversations;` (safe — new tables).
- **Local proof:** `bun run cf:d1-local:exec -- migrations/0041_support_conversations.sql` then a repository test.
- **Provider proof:** after deploy, `wrangler d1 execute ARCH_DB --command "SELECT COUNT(*) FROM support_conversations"` against bound DB.

### Blueprint 7.2.2 — Feature flags (migration `0042`)

- **Filename:** `migrations/0042_feature_flags.sql`.
- **Changes:**
  ```sql
  CREATE TABLE IF NOT EXISTS feature_flags (
    key TEXT PRIMARY KEY,
    enabled INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    updated_at TEXT NOT NULL,
    updated_by TEXT REFERENCES profiles(id) ON DELETE SET NULL
  );
  CREATE INDEX idx_feature_flags_enabled ON feature_flags(enabled);
  -- seed defaults (all off; safe)
  INSERT OR IGNORE INTO feature_flags(key, enabled, description, updated_at, updated_by) VALUES
    ('admin_dashboard_enabled', 0, 'Master switch for /admin surface', '', NULL),
    ('admin_support_realtime', 0, 'Realtime support inbox (SupportInbox DO)', '', NULL),
    ('admin_analytics_server_pulls', 0, 'Server-side GA4/Clarity/CF pulls', '', NULL);
  ```
- **Backfill:** seed defaults via `INSERT OR IGNORE`.
- **Cardinality:** ~10–50 rows ever.
- **Rollback:** `DROP TABLE feature_flags;` (master flag off first).
- **Note:** `updated_at` seeded to a real timestamp at insert time in the migration runner; empty string placeholder avoided by using `datetime('now')` in final SQL.

### Blueprint 7.2.3 — Admin audit events (migration `0043`)

- **Filename:** `migrations/0043_admin_audit_events.sql`.
- **Changes:**
  ```sql
  CREATE TABLE IF NOT EXISTS admin_audit_events (
    id TEXT PRIMARY KEY,
    actor_user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    actor_email TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    summary_json TEXT,
    request_id TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX idx_admin_audit_actor ON admin_audit_events(actor_user_id, created_at DESC);
  CREATE INDEX idx_admin_audit_action ON admin_audit_events(action, created_at DESC);
  CREATE INDEX idx_admin_audit_target ON admin_audit_events(target_type, target_id, created_at DESC);
  ```
- **Cardinality:** grows with admin actions; prune > 90d via existing retention cron (extend `runRetentionPassInD1` scope — implementation task).
- **Rollback:** `DROP TABLE admin_audit_events;`.

### Blueprint 7.2.4 — `admin_metric_cache` (migration `0044`)

- **Filename:** `migrations/0044_admin_metric_cache.sql`.
- **Changes:**
  ```sql
  CREATE TABLE IF NOT EXISTS admin_metric_cache (
    key TEXT PRIMARY KEY,
    payload_json TEXT NOT NULL,
    fetched_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );
  CREATE INDEX idx_admin_metric_expires ON admin_metric_cache(expires_at);
  ```
- **Rollback:** `DROP TABLE admin_metric_cache;`.

## 7.3 API contracts

### Route: `GET /api/admin/metrics/signups`
- **Authz:** admin gate. **Dynamic:** `force-dynamic`. **Cache:** `private, no-store`.
- **Query:** `?window=7d|30d&page=1&limit=50`.
- **Response 200:**
  ```json
  { "count": 42, "window": "7d", "recent": [{"id":"...","email":"...","displayName":"...","createdAt":"..."}] }
  ```
- **Errors:** 401 (no session), 403 (non-admin), 500 (D1 error → logged).
- **PII:** email/displayName served only to admin context (SEC-PII-01).

### Route: `GET /api/admin/metrics/cloudflare`
- **Response 200:** `{ "requests": N, "errors": N, "fetchedAt": "...", "degraded": false }`.
- **Degraded:** `{ "degraded": true }` when token missing/quota hit.

### Route: `GET /api/admin/metrics/ga4` and `/clarity` (when creds)
- Same shape, daily-cached, `degraded` fallback.

### Route: `GET /api/admin/users?search=&page=&limit=`
- **Response 200:** `{ "items":[{id,email,displayName,role,createdAt,lastSessionAt}], "count":N, "page":1, "limit":50 }`.

### Route: `GET /api/admin/support/conversations?status=&page=`
### Route: `GET /api/admin/support/conversations/:id/messages`
### Action: `sendSupportReply({conversationId, body, clientMessageId})`
- **Returns:** `{ message: {...}, conversation: {...} }` or
  `{ message: {..., sendStatus:'send_failed'}, error: 'email_send_failed' }`.

### Action: `setFeatureFlag({key, enabled})`
- Writes flag + audit row; returns `{ flag: {...} }`.

### WebSocket: `/__cloudflare/global-presence`
- Auth: Ed25519 token (existing pattern, new global topic).
- Messages: server→client `{ type:'presence', count:N }`; client→server `authorize`.

### WebSocket: `/__cloudflare/support-inbox/:conversationId`
- Messages: server→client `{type:'message', message:{...}}`; client→server `authorize`.

## 7.4 Network behavior

- **Timeouts:** external provider pulls 8 s; WS reconnect backoff 1→30 s.
- **Retries:** provider pulls 1 retry then cache/link-out; WS auto-reconnect.
- **Idempotency:** `client_message_id` on sends; presence reconnect-safe.
- **Rate limits:** `ADMIN_LOGIN_LIMIT` (e.g., 10/min/email), `ADMIN_WRITE_LIMIT`
  (e.g., 60/min/admin) via `ratelimit` binding.
- **Pagination:** cursor for audit (high cardinality); offset for users/conversations.
- **Provider quota:** GA4 Data API — no documented hard daily cap for read;
  Clarity — 10 calls/day (cache 1/day); CF GraphQL — 300 queries/5min (cache aggressively).

## 7.5 Access-path matrix

| Source | Chosen path | Runtime role | Authorization | Schema posture | Proof source | Fallback |
|---|---|---|---|---|---|---|
| Users | D1 `profiles`+`user` via `users-repository` | Worker | admin gate | stable | repo test | error state |
| Signups | D1 `COUNT(*)` on `user` | Worker | admin gate | stable | repo test | 0 count |
| Presence | `GlobalPresence` DO `getWebSockets()` | Worker DO | Ed25519 token | new (migrations via DO) | DO test | last-known |
| Support | D1 `support_*` + `SupportInbox` DO | Worker + DO | admin gate + token | new (0041) | action+DO test | poll fallback |
| CF Analytics | GraphQL Analytics API (scoped token) | Worker fetch | admin gate + token | n/a | provider read-back (OPEN-3) | link-out |
| GA4 | GA4 Data API (service account) | Worker fetch | admin gate + SA | n/a | provider read-back (OPEN-1) | link-out |
| Clarity | Clarity Data Export API (token) | Worker fetch | admin gate + token | n/a | provider read-back (OPEN-2) | link-out |
| Flags | D1 `feature_flags` | Worker | admin gate (write) / app-wide (read) | new (0042) | repo test | env default |
| Audit | D1 `admin_audit_events` | Worker | admin gate | new (0043) | repo test | n/a |
| Incidents | D1 `operational_incidents` (existing) | Worker | admin gate | stable (0040) | repo test | empty state |

No path depends on legacy Supabase. All D1 writes paired with rollback SQL above.

## 7.6 Data retention / deletion

- `admin_audit_events`: retain 90d, prune via existing retention cron (extend
  its scope). `support_*`: retain per product retention policy (default keep;
  deletion tied to user account deletion via `ON DELETE CASCADE`).
- GDPR/DSAR: support conversations are user data; a DSAR export/erasure must
  include them (extend the existing `privacy_requests` flow — implementation task).

## 7.7 Provider-proof boundary

- Local D1 proof: migration apply + repository tests on local D1.
- Hosted proof: `wrangler d1 execute ARCH_DB` read-back after deploy; CF
  Analytics/GA4/Clarity read-back requires owner-provided credentials (OPEN-1/2/3).
- DO proof: local `wrangler dev` DO test + deployed WS smoke (post-merge).

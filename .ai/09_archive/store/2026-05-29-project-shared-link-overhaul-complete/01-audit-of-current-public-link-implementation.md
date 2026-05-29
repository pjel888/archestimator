# Audit of Current "Public Link" Implementation (V1 Baseline)

**Date:** 2026-05-28
**Source of Truth:** Live codebase + migration `20260527120000_project_client_publication.sql`

---

## 1. Codebase Schema Audit

The existing publication database schema in `supabase/migrations/20260527120000_project_client_publication.sql` already defines the following:

- **Table**: `public.project_publications`
  - `id uuid primary key default gen_random_uuid()`
  - `selected_estimate_ids uuid[] not null default '{}'::uuid[]` (Array of selected estimates is already persisted!)
  - `snapshot_json jsonb not null`
  - `status public.project_publication_status` (`published`, `expired`, `revoked`)
  - `password_hash text` (Encrypted password for security gates)
  - `snapshot_version integer`
  - `workspace_id uuid not null`, `project_id uuid not null`
  - `token_hash text not null unique`, `encrypted_token text not null`
  - `published_by uuid references public.profiles(id)`
  - `published_at timestamptz not null default now()`
  - `expires_at timestamptz`, `revoked_at timestamptz`
  - `open_count integer not null default 0`, `latest_opened_at timestamptz`
  - `created_at / updated_at` timestamps

- **Table**: `public.project_publication_events`
  - `id uuid primary key default gen_random_uuid()`
  - `publication_id uuid not null references public.project_publications(id) on delete cascade`
  - `event_type public.project_publication_event_type not null`
  - `metadata_json jsonb not null default '{}'::jsonb`
  - `ip_hash text`, `user_agent_hash text`
  - `created_at timestamptz not null default now()`

- **Function**: `public.increment_project_publication_open(target_publication_id uuid)` — Security Definer, atomically increments `open_count` and sets `latest_opened_at`.
- **Function**: `public.can_manage_project_publication(target_project_id uuid)` — Delegates to `can_manage_project_access`.

- **RLS**: Both tables have RLS enabled. `authenticated` role has `select/insert/update` on `project_publications` (via manager policy) and `service_role` has `insert` on `project_publication_events`.

---

## 2. Server Actions Audit (`src/lib/publication/actions.ts`)

The server-side actions already support selective publishing parameters:

```typescript
// createProjectPublication supports selectedEstimateIds parameter:
export async function createProjectPublication({
  projectId,
  selectedEstimateIds,
  password,
  expiresAt,
}: {
  projectId: string;
  selectedEstimateIds?: string[];
  password?: string;
  expiresAt?: string | null;
})
```

- **Snapshot Generation**: Inside `buildSnapshotForProject`, the database query is filtered if `selectedEstimateIds` contains UUID elements:
  ```typescript
  if (selectedEstimateIds.length) estimatesQuery = estimatesQuery.in("id", selectedEstimateIds);
  ```
- **Republish Action**: `republishProjectPublication` retains the previously selected estimate IDs when recreating the snapshot:
  ```typescript
  const snapshot = await buildSnapshotForProject(context, latest.selected_estimate_ids);
  ```
- **Security**: All actions call `assertProjectPublicationManager`, which checks workspace/project membership and requires `admin` rank or `ceo/admin` platform role.

---

## 3. Public Repository Audit (`src/lib/publication/public-repository.ts`)

- `resolveProjectPublicationAccessByToken(token)` — Returns access metadata (password required, snapshot version) without the heavy snapshot payload.
- `resolveProjectPublicationSnapshotByToken(token)` — Returns access + full `snapshot_json`.
- `verifyProjectPublicationPasswordByToken(token, password)` — Validates password using `scrypt` hashing and returns access metadata on success.
- `recordProjectPublicationEvent(...)` — Logs events to `project_publication_events` and triggers `increment_project_publication_open` for `"open"` events.
- All lookups use service-role client with `token_hash` index matching.

---

## 4. Existing API Routes Audit

| Route | Method | Purpose | Auth |
|-------|--------|---------|------|
| `/api/share/[token]` | GET | Returns `{ publicationId, passwordRequired, snapshot }` JSON. Used for client-side hydration or external integrations. | None (token-bound) |
| `/api/share/[token]/password` | POST | Verifies password, sets `ae_publication_access_*` cookie, returns 204. | CSRF cookie |
| `/api/share/[token]/events` | POST | Records client-side events (`open`, `password_success`, etc.). | CSRF cookie |

- All routes set `Cache-Control: no-store`.
- Password route enforces `assertSameOriginPublicPost` (origin check + CSRF token validation).
- Event route validates against an `allowedEvents` allowlist.

---

## 5. Security Layer Audit (`src/lib/publication/security.ts`)

- **Token generation**: `createPublicationToken` — 32 random bytes, base64url.
- **Token hashing**: `hashPublicationToken` — HMAC-SHA256 with `PUBLICATION_TOKEN_HASH_SECRET`.
- **Token encryption**: `encryptPublicationToken` — AES-256-GCM with `PUBLICATION_TOKEN_ENCRYPTION_SECRET`.
- **Password hashing**: `hashPublicationPassword` — `scrypt` with 16-byte random salt.
- **Access cookie**: `createPublicationAccessCookie` — HMAC-signed payload with `publicationId`, `snapshotVersion`, `tokenDigest`, and expiration. HttpOnly, SameSite=Lax, Secure in production.
- **CSRF protection**: `createPublicPostCsrfToken` + `assertSameOriginPublicPost` for public POST endpoints.

---

## 6. UI Implementation Gaps

### Modal Trigger & Layout (`ProjectPublicationHeader.tsx`)
- Labeled as **"Public link"** in the workspace header.
- The action call to `createProjectPublication` inside the modal does **not** supply `selectedEstimateIds`, causing the action to normalize it to an empty array (which query-wise returns all estimate sheets).
- **Missing Interface**: No checkboxes or list controls exist to let users select or toggle which estimate sheets are included in the publication.
- **Missing Interface**: No recipient email input, chip list, or delivery status display.

### Public Share View (`src/app/share/[token]/page.tsx`)
- Renders the estimates vertically in a simple loop:
  ```typescript
  <div className="space-y-4">
    {snapshot.estimates.map((estimate) => (
      <section key={estimate.id} ...>
    ))}
  </div>
  ```
- Stacks all data tables together. No navigation controls, tabs, or segmented controls exist.
- No comment composer, comments list, or decision buttons.
- No project cover image / hero banner.
- No OpenGraph meta tags for link previews.

---

## 7. Test Suite Audit

Ten Vitest test files cover the publication system:

1. `project-publication-actions.test.ts` — String-inclusion tests verifying server action signatures.
2. `project-publication-header.test.tsx` — React Testing Library tests for `ProjectWorkspaceHeaderRow` modal interactions.
3. `project-publication-page.test.tsx` — Tests for `SharePage` rendering, password gate, and event recording.
4. `project-publication-public-repository.test.ts` — Tests for repository lookups.
5. `project-publication-route.test.ts` — Tests for `GET /api/share/[token]` and password route.
6. `project-publication-schema.test.ts` — Tests for snapshot schema shape.
7. `project-publication-security-headers.test.ts` — Tests for security headers.
8. `project-publication-security.test.ts` — Tests for token/crypto functions.
9. `project-publication-snapshot.test.ts` — Tests for snapshot builder math.
10. `project-publication-summary.test.ts` — Tests for summary mapping.

**Gap**: No E2E Playwright tests exist for the full "create link → open link → view estimates" flow. No tests exist for password gate interaction, mobile layout, or tab navigation.

---

## 8. Key Conclusions for Overhaul Implementation

1. **Database & API Ready**: We do not need to modify the `project_publications` schema or rewrite the snapshot generator for Phase 1. The database column and `createProjectPublication` API are ready.
2. **Security Foundation Ready**: The existing cookie signing, password hashing, and CSRF protection provide a solid base. Recipient token binding can reuse the same crypto patterns.
3. **API Route Foundation Ready**: The existing `/api/share/[token]/*` routes provide patterns for adding new unauthenticated endpoints (comments, decisions).
4. **Phase 1 Focus**:
   - Add estimate checkbox multi-select UI in `ProjectPublicationHeader.tsx`.
   - Pass the selected estimate ID array into `createProjectPublication`.
   - Implement the tabbed client-side toggle interface in the receiver page `src/app/share/[token]/page.tsx`.
   - Rename "Public link" → "Shared link" across UI and tests.

# API Routes & Server Actions Plan — Shared Link Overhaul

**Date:** 2026-05-28
**Status:** Proposed Planning

This document defines the exact API contracts, request/response shapes, and server action signatures for the new interactive Shared Link features.

---

## 1. Existing API Baseline

The V1 implementation already provides three public API routes under `/api/share/[token]/`:

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/share/[token]` | GET | Returns `{ publicationId, passwordRequired, snapshot }` JSON. |
| `/api/share/[token]/password` | POST | Verifies password, sets `ae_publication_access_*` cookie. |
| `/api/share/[token]/events` | POST | Records `open`, `password_success`, `password_failure`, `download_attempt_blocked`. |

All existing routes use `assertSameOriginPublicPost` for CSRF protection and set `Cache-Control: no-store`.

---

## 2. New API Routes

### 2.1 POST `/api/share/[token]/comment`

**Purpose**: Submit a comment from a verified recipient.

**Request Headers**:
```http
Content-Type: application/json
x-archestimator-csrf: <csrf-token>
Cookie: ae_publication_csrf=<csrf-token>; ae_publication_access_<suffix>=<value>; shared_link_session_<suffix>=<value>
```

**Request Body**:
```typescript
type PostCommentRequest = {
  recipientToken: string; // From query param, also inside cookie
  body: string;           // Max 1,000 chars
  estimateId?: string;    // Optional — ties comment to a specific sheet
  rowId?: string;         // Optional — ties comment to a specific row
};
```

**Validation Rules**:
1. `assertSameOriginPublicPost(request)` must pass.
2. Rate limit: 5 comments/minute, 20/hour per recipient session.
3. `shared_link_session_[token]` cookie must be present and valid.
4. Publication must be `published`, not expired, not revoked.
5. `body` must be non-empty and ≤ 1,000 characters after trimming.
6. `estimateId` (if provided) must exist in `publication.selected_estimate_ids`.

**Response — Success (201)**:
```json
{
  "ok": true,
  "commentId": "uuid",
  "createdAt": "2026-05-28T14:00:00.000Z"
}
```

**Response — Error**:
```json
{ "ok": false, "error": "Rate limit exceeded. Try again in 45 seconds." }  // 429
{ "ok": false, "error": "Invalid session. Please open the link from your email." }  // 403
{ "ok": false, "error": "Publication expired or revoked." }  // 410
{ "ok": false, "error": "Comment must be between 1 and 1,000 characters." }  // 400
```

**Implementation**: Server action or Route Handler that calls the `insert_client_comment` RPC with `token_hash` and `recipient_token_hash`.

---

### 2.2 POST `/api/share/[token]/decision`

**Purpose**: Submit a formal accept/decline/revision decision.

**Request Headers**: Same CSRF + session cookie requirements as `/comment`.

**Request Body**:
```typescript
type PostDecisionRequest = {
  recipientToken: string;
  decision: "accepted" | "declined" | "revision_requested";
  note?: string; // Max 2,000 chars
};
```

**Validation Rules**:
1. Same origin + CSRF + session validation as comments.
2. Rate limit: 1 decision per recipient per publication (enforced by DB unique index, but API should pre-check for better UX).
3. `decision` must be one of the allowed enum values.
4. `note` ≤ 2,000 characters.
5. Publication must be active.

**Response — Success (201)**:
```json
{
  "ok": true,
  "responseId": "uuid",
  "snapshotVersion": 3,
  "createdAt": "2026-05-28T14:00:00.000Z"
}
```

**Response — Error**:
```json
{ "ok": false, "error": "Decision already submitted." }  // 409
{ "ok": false, "error": "Invalid session." }  // 403
{ "ok": false, "error": "Publication expired." }  // 410
```

---

### 2.3 GET `/api/share/[token]/activity`

**Purpose**: Load comments and decisions for the recipient view (or owner view if authenticated).

**Request Headers**:
```http
Cookie: shared_link_session_<suffix>=<value>  // Required for unauthenticated reads
```

**Query Parameters**:
```
?recipientToken=<token>  // Required for unauthenticated reads
```

**Response — Success (200)**:
```json
{
  "ok": true,
  "comments": [
    {
      "id": "uuid",
      "authorEmail": "client@example.com",
      "authorName": "John Smith",
      "body": "Is the marble tile imported?",
      "estimateId": "uuid",
      "rowId": null,
      "createdAt": "2026-05-28T14:00:00.000Z"
    }
  ],
  "decisions": [
    {
      "id": "uuid",
      "authorEmail": "client@example.com",
      "decision": "accepted",
      "note": "Looks good",
      "snapshotVersionAtDecision": 3,
      "createdAt": "2026-05-28T14:05:00.000Z"
    }
  ]
}
```

**Note**: `is_internal` comments are filtered out for unauthenticated requests.

---

### 2.4 POST `/api/share/[token]/send-email` (Manager-Only)

**Purpose**: Trigger transactional email delivery to recipients. This is NOT a public route — it requires an authenticated workspace manager session.

**Request Body**:
```typescript
type SendSharedLinkEmailRequest = {
  publicationId: string;
  recipientIds?: string[]; // If omitted, send to all pending recipients
};
```

**Response — Success (200)**:
```json
{
  "ok": true,
  "sentCount": 2,
  "failedCount": 0
}
```

**Failure Handling**: If email delivery fails, the HTTP response still returns `200` with `failedCount > 0` and an array of failures. The publication itself is not affected.

---

## 3. Server Actions (Authenticated)

### 3.1 `addSharedLinkRecipients`

```typescript
export async function addSharedLinkRecipients({
  projectId,
  publicationId,
  emails,
}: {
  projectId: string;
  publicationId: string;
  emails: string[];
}): Promise<{ ok: boolean; message: string; recipients?: Array<{ id: string; email: string; recipientToken: string }> }>
```

- Validates manager permissions via `assertProjectPublicationManager`.
- Normalizes and deduplicates emails.
- Generates `recipient_token` per email using `createPublicationToken`.
- Inserts into `shared_link_recipients` with `delivery_status: 'pending'`.
- Returns the raw `recipientToken` (not hash) so the manager can preview the unique link if needed.

### 3.2 `removeSharedLinkRecipient`

```typescript
export async function removeSharedLinkRecipient({
  projectId,
  recipientId,
}: {
  projectId: string;
  recipientId: string;
}): Promise<{ ok: boolean; message: string }>
```

- Soft-removes a recipient (hard delete via cascade is acceptable for V2).

### 3.3 `loadSharedLinkActivity`

```typescript
export async function loadSharedLinkActivity({
  projectId,
  publicationId,
}: {
  projectId: string;
  publicationId: string;
}): Promise<{ ok: boolean; comments: SharedLinkComment[]; decisions: SharedLinkDecision[]; events: SharedLinkEvent[] }>
```

- Returns the full activity feed for the manager modal "Activity" tab.
- Includes `is_internal` comments.

---

## 4. Error Handling Contract

All new API routes must follow a consistent error envelope:

```typescript
type ApiErrorResponse = {
  ok: false;
  error: string;        // Human-readable message
  code?: string;        // Machine-readable code (e.g., "RATE_LIMITED", "INVALID_SESSION")
  retryAfter?: number;  // Seconds until retry is allowed (for 429s)
};
```

**HTTP Status Codes**:
- `200/201` — Success
- `400` — Bad request (validation failure)
- `403` — Forbidden (CSRF or session invalid)
- `409` — Conflict (decision already exists, snapshot version mismatch)
- `410` — Gone (publication revoked or expired)
- `429` — Too many requests (rate limit)
- `500` — Internal server error (logged, generic message to client)

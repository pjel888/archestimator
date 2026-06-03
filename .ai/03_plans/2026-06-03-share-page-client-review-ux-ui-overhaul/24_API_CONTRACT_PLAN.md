# 24 — API Contract Plan

**Plan:** Share Page Client Review UX/UI Overhaul
**Date:** 2026-06-03 (second-pass refinement)
**Status:** Decision required — resolves API scope contradiction in plan

---

## Current API Routes (Unchanged)

| Route | Method | Purpose | Auth |
|-------|--------|---------|------|
| `/api/share/[token]/session` | POST | Initialize recipient session from `?recipient=` param | Cookie-based |
| `/api/share/[token]/session` | DELETE | Clear recipient session ("Not you?") | Cookie-based |
| `/api/share/[token]/comment` | POST | Submit comment (CSRF + rate limited) | Session cookie |
| `/api/share/[token]/decision` | POST | Submit decision (version locked) | Session cookie |
| `/api/share/[token]/activity` | GET | Activity feed (owner-only, not public) | Auth required |
| `/api/share/[token]/password` | POST | Password verification | CSRF token |
| `/api/share/[token]` | GET | Snapshot resolution (via page route) | Token hash |

---

## The Contradiction

The plan currently has an unresolved contradiction:

1. **Non-goal** (`01_REQUIREMENTS`): "Adding new API routes"
2. **Architecture decision D7** (`03_ARCHITECTURE`): "Load comments/decisions via new GET routes"
3. **Implementation step 5.1** (`04_IMPLEMENTATION_SEQUENCE`): "add a lightweight GET handler at `/api/share/[token]/comment`"
4. **Open question P4** (`12_OPEN_QUESTIONS`): Philip should "approve adding comment/decision GET API routes (if needed)"

This plan must explicitly resolve this before implementation.

---

## Resolution Options

### Option 1: Add Lightweight GET Routes (RECOMMENDED)

Add two read-only GET handlers to existing route files. This is the most straightforward approach and directly enables the required UX improvements.

**New route: `GET /api/share/[token]/comment`**

```
Purpose: Return public comments for the publication

Request:
  - No request body
  - Publication identified by {token} path parameter
  - No auth required (public unauthenticated access)
  - Scoped to publicly-visible comments only (NOT internal/workshop comments)
  - Must respect password gate (return 401 if publication is password-protected and no valid access cookie)

Response (200):
```json
{
  "comments": [
    {
      "id": "uuid",
      "content": "string",
      "createdAt": "ISO 8601",
      "authorName": "string",
      "authorType": "owner" | "recipient"
    }
  ]
}
```

Response (401): Publication is password-protected and no valid access cookie
```json
{
  "error": "password_required"
}
```

Response (404): Publication not found or token invalid
```

**New route: `GET /api/share/[token]/decision`**

```
Purpose: Return the current recipient's prior decision (if any)

Request:
  - No request body
  - Publication identified by {token} path parameter
  - Recipient identified by session cookie (shared_link_session_*)
  - Must have valid recipient session (return 401 if no valid session)
  - Returns only the requesting recipient's OWN decision (not other recipients')
  - Must respect password gate

Response (200 with decision):
```json
{
  "decision": {
    "type": "accepted" | "declined" | "revision_requested",
    "note": "string | null",
    "submittedAt": "ISO 8601",
    "final": true
  }
}
```

Response (200 no decision):
```json
{
  "decision": null
}
```

Response (401): No valid recipient session or password required
```

**Implementation approach:**
- Add GET handler exports to existing `route.ts` files alongside existing POST handlers
- Use existing `public-repository.ts` functions where available; add lightweight read functions if needed
- No database schema changes required
- No new dependencies
- Reuse existing CSRF/session validation patterns

**Files affected:**
- `src/app/api/share/[token]/comment/route.ts` — add `export async function GET()`
- `src/app/api/share/[token]/decision/route.ts` — add `export async function GET()`
- `src/lib/publication/public-repository.ts` — add read functions if needed

### Option 2: Reuse Existing Activity Route

Modify the existing `GET /api/share/[token]/activity` route to also return public comments and decision state alongside activity events. Currently this route is owner-only — would need to be extended with a public variant.

**Not recommended because:**
- Activity route is currently owner-only and scoped differently
- Mixing public comment reads with owner activity reads creates confusing auth boundaries
- Requires modifying existing route behavior instead of adding narrow additions

### Option 3: Defer to Human Decision

Leave the contradiction unresolved and mark the plan as `NEEDS_HUMAN_DECISION` until Philip approves the API strategy.

**Risk:** Delays implementation. The comment/decision state loading depends on this decision.

---

## Decision

**Recommended: Option 1 — Add lightweight GET routes.**

This is the least disruptive approach:
- Adds minimal code (two GET handler exports)
- No schema changes
- No existing route behavior changes
- Clear responsibility boundaries
- Enables the required UX improvements (comment history, decision persistence)

The API contract above is specific enough for implementation but leaves exact repository function selection to the implementation agent (who should read the actual `public-repository.ts` signatures at implementation time).

---

## Rollback Notes

If GET routes cause issues:
1. Remove the GET exports from route files
2. Revert comment/decision components to useState-only behavior
3. No database rollback needed (no schema changes)

---

## Test Contracts

For each new GET route, the following tests are required:

**Comment GET route tests:**
1. Public publication without password → returns comments (200)
2. Password-protected publication without access cookie → returns 401
3. Password-protected publication with valid access cookie → returns comments (200)
4. Publication with no comments → returns empty array (200)
5. Invalid token → returns 404

**Decision GET route tests:**
1. Valid recipient session, prior decision exists → returns decision (200)
2. Valid recipient session, no prior decision → returns null (200)
3. No valid recipient session → returns 401
4. Password-protected without access cookie → returns 401
5. Invalid token → returns 404

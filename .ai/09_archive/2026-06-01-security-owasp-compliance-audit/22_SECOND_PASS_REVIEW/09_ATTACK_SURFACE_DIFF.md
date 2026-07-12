# 09 — Attack Surface Diff

Comparison of first-pass attack surface inventory against actual repo code.

---

## API Routes — Actual vs First-Pass Inventory

### Actual API routes (verified from `find src/app/api`)

```
src/app/api/ai/ask/handler.ts          — Ask Flip AI handler
src/app/api/ai/ask/route.ts            — Ask Flip POST entry
src/app/api/ai/package-builder/handler.ts  — Package builder handler
src/app/api/ai/package-builder/route.ts   — Package builder POST entry
src/app/api/component-library/attachments/route.ts  — PDF/XLS/XLSX upload
src/app/api/component-library/images/route.ts       — Image upload
src/app/api/projects/images/route.ts          — Project image upload
src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts  — XLSX export
src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/filename.ts  — Filename sanitizer
src/app/api/share/[token]/activity/route.ts   — Share activity GET
src/app/api/share/[token]/comment/route.ts    — Share comment POST
src/app/api/share/[token]/decision/route.ts   — Share decision POST
src/app/api/share/[token]/events/route.ts     — Share events POST
src/app/api/share/[token]/password/route.ts   — Share password POST
src/app/api/share/[token]/route.ts            — Share snapshot GET
src/app/api/share/[token]/session/route.ts    — Share session POST
src/app/api/share/[token]/unsubscribe/route.ts  — Share unsubscribe POST
src/app/api/webhooks/resend/route.ts          — Resend webhook POST
```

**Total:** 14 route files covering 10 distinct API surfaces.

### Routes present in first-pass inventory

The first pass covered share routes, AI routes, upload routes, webhook route, and XLSX export route. All 10 surfaces were mentioned across the audit documents.

### Routes missing from first-pass attack surface inventory

None — all routes were referenced. However, the inventory was spread across multiple documents rather than presented as a single authoritative list.

---

## Server Actions — Actual vs First-Pass Inventory

### Server action modules (verified from repo)

```
src/lib/ai/package-builder/apply.ts       — AI apply commands (writes to DB)
src/lib/ai/package-builder/draft.ts       — AI draft generation
src/lib/auth/account-actions.ts           — Profile/workspace account actions
src/lib/auth/account-audit.ts             — Account security event auditing
src/lib/auth/account-data.ts              — Account data validation
src/lib/collaboration/actions.ts          — Invite creation, role changes, member removal
src/lib/collaboration/invite-entry.ts     — Invite entry resolution + rate limiting
src/lib/component-library/actions.ts      — Component CRUD, brand/supplier management
src/lib/email/resend-webhooks.ts          — Resend outbound + webhook verification
src/lib/estimates/actions.ts              — Estimate row/node mutations, reorder, delete
src/lib/projects/actions.ts               — Project CRUD, metadata
src/lib/publication/actions.ts            — Publication CRUD, recipient management, resend
src/lib/workshop/actions.ts               — Workshop favorites
```

**Total:** 13 server action modules.

### Server actions missing from first-pass inventory

The first pass covered:
- `src/lib/publication/actions.ts` (publication)
- `src/lib/collaboration/actions.ts` (collaboration)
- `src/lib/estimates/actions.ts` (estimates)

The first pass did not explicitly inventory:
- `src/lib/ai/package-builder/apply.ts` (mentioned in AI section but not in API surface)
- `src/lib/auth/account-actions.ts` (account management)
- `src/lib/auth/account-audit.ts`
- `src/lib/auth/account-data.ts`
- `src/lib/component-library/actions.ts`
- `src/lib/email/resend-webhooks.ts`
- `src/lib/projects/actions.ts`
- `src/lib/workshop/actions.ts`

These are standard CRUD server actions, not additional attack surface beyond what RLS covers.

---

## RPC Functions — Service-role vs Authenticated

### RPCs accessible to `anon`
- `resolve_collaboration_invitation(text)` — public invite resolution
- `insert_client_comment(text, text, uuid, uuid, text)` — public comments
- `submit_client_response(text, text, text, text)` — public decisions

### RPCs accessible to `authenticated` only
~40+ RPCs for estimates, components, templates, collaboration, publication management. All verified to use `revoke ... from public, anon` + `grant ... to authenticated`.

### RPCs accessible to `service_role` only
- `increment_project_publication_open(uuid)`
- `security_rate_limit_events` table CRUD

### RPCs with revoked service_role
- `create_project_estimate_package_with_history` — explicitly revoked from service_role (verified)
- `create_ai_package_library_components_with_history` — explicitly revoked from service_role (verified)

**First-pass accuracy:** The first pass correctly identified most RPC grants but did not mention the explicit `revoke from service_role` pattern on AI apply RPCs. This is a strong design choice worth crediting.

---

## Storage/File Surfaces

| Surface | First-pass coverage |
|---|---|
| `component-library/attachments` (PDF/XLS/XLSX) | Covered |
| `component-library/images` (JPEG/PNG/WebP/AVIF) | Covered |
| `projects/images` (JPEG/PNG/WebP/AVIF) | Covered |
| `component-attachments` bucket policies | Not covered |
| `component-images` bucket policies | Not covered |
| `project-images` bucket policies | Not covered |

**Gap:** Storage bucket RLS/policy configuration was not covered in either pass. Added as new finding SEC-20260601-2P-007.

---

## AI Surfaces

| Surface | First-pass coverage | Second-pass verification |
|---|---|---|
| `/api/ai/ask` | Covered | Verified — no rate limit |
| `/api/ai/package-builder` | Covered | Verified — HMAC token, no rate limit |
| `src/lib/ai/deepseek.ts` | Covered | Verified — hard-coded model, 20s timeout |
| `src/lib/ai/auth.ts` | Covered | Verified — admin-DB rejection |
| `src/lib/ai/audit.ts` | Covered | Verified — service-role for audit |
| `src/lib/ai/package-builder/draft-token.ts` | Covered | Verified — HMAC 30-min TTL |
| `src/lib/ai/package-builder/schemas.ts` | Not covered | Custom validation (strength, not gap) |
| `src/lib/ai/package-builder/read-tools.ts` | Not covered | Selected-column, DB-limited |
| `src/lib/ai/package-builder/memory.ts` | Not covered | Default-off ranking hints |

---

## Surfaces incorrectly listed in first pass

### `src/lib/publication/security.ts` — "probably service-role"
The first pass said the XLSX export route "likely service-role or RLS-only." Verified: The export route uses the server Supabase client (RLS-dependent), not service-role. This is correct behavior.

### CSP `frame-ancestors` — "not enumerated"
The first pass said `frame-ancestors` was "not enumerated." Verified: It IS present in `next.config.ts` as `frame-ancestors 'none'` in the base CSP source list.

---

## Final Corrected Inventory Summary

| Surface type | Count | Auth required | Rate limited | CSRF protected | no-store |
|---|---|---|---|---|---|
| Public share API routes (GET) | 2 | Token | Yes (per-token) | N/A (GET) | Yes |
| Public share API routes (POST) | 6 | Token | Yes (per-token) | Yes (origin check) | Yes |
| Public invite routes (GET) | 1 | Token | Yes (per-token) | N/A (server component) | N/A |
| Public invite routes (POST) | 2 | Token | Yes (per-token) | N/A (server component) | Yes |
| Auth AI routes (POST) | 2 | Session | **No** | N/A (auth required) | N/A |
| Auth upload routes (POST) | 3 | Session | N/A | No (auth) | N/A |
| Auth export route (GET) | 1 | Session | No | N/A (auth) | Private, no-store |
| Webhook route (POST) | 1 | Signature | N/A | N/A | N/A |
| Server actions | 13 | Session | Partial (invite actions) | N/A (server actions) | N/A |

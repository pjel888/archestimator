# CSRF / Origin Coverage Inventory (P0.3)

**Author:** 2026-07-05 (Security & Compliance Program execution)
**Source plan:** `.ai/03_plans/2026-07-04-Security-Compliance-Program/06-requirements-acceptance-criteria.md` REQ-004
**Status:** `INVENTORY COMPLETE` — surfaces categorized; explicit decision per category. Per-surface denial tests are P1 follow-up work tracked in `.ai/03_plans/000-Follow Ups/2026-07-04-Security-Compliance-Followups.md`.

## Reference model (the canonical implementation)

`src/lib/publication/security.ts:361-409` exports:

- `assertSameOrigin(request)` — for cookie-authenticated workshop/authenticated routes
- `assertSameOriginPublicPost(request)` — for public share-token POST routes (Origin header check, optionally paired with a CSRF cookie)
- `assertSameOriginPublicFormPost(request, csrfToken)` — for public form-POST routes (used by `/api/share/[token]/unsubscribe`)
- `createPublicFormCsrfToken()` / `createCsrfCookie()` / `createPublicationCsrfHeaders()` — CSRF token + cookie helpers used by the publication surface

These return `{ ok: boolean; reason?: string }` so the caller can produce a 403 with a non-enumerating error body.

## Surface inventory

### A. Public share / publication routes — PROTECTED

All routes under `src/app/api/share/[token]/` use the canonical origin/CSRF helper:

| Route | Helper used | Notes |
|---|---|---|
| `POST /api/share/[token]/comment` | `assertSameOriginPublicPost` | Comment submission |
| `POST /api/share/[token]/decision` | `assertSameOriginPublicPost` | Decision registration |
| `POST /api/share/[token]/events` | `assertSameOriginPublicPost` | Page-view event beacon |
| `POST /api/share/[token]/password` | `assertSameOriginPublicPost` | Password unlock |
| `POST /api/share/[token]/session` | `assertSameOriginPublicPost` / `assertSameOriginPublicDelete` | Session establish / teardown |
| `POST /api/share/[token]/activity` | `assertSameOrigin` | Activity feed (authenticated-style) |
| `POST /api/share/[token]/unsubscribe` | `assertSameOriginPublicFormPost(request, csrfToken)` | Double-submit CSRF cookie + form hidden field |

**Decision:** covered. Maintain as-is.

### B. Authenticated Server Actions — POST-only, Better Auth session cookie, SameSite=Lax

11 actions files under `src/lib/<feature>/actions.ts` (auth, account, projects, estimates, library, publications, workshop, settings, etc.). All POSTs go through Next.js Server Actions, which:

- Reject GET (Server Actions only respond to POST)
- Are protected by Better Auth's `HttpOnly; Secure; SameSite=Lax` session cookie
- Run on the same origin (no cross-origin POST accepted by the React Server Action runtime)

**Decision:** SameSite=Lax on the session cookie covers the standard CSRF attack model for same-origin POSTs. Server Actions do NOT need a separate CSRF token under the SameSite=Lax model (Better Auth's documented posture). For high-risk mutations (account deletion, password reset) we additionally verify the Better Auth session live-ness inside the action body — that is already enforced via the Better Auth route gate (`src/lib/auth/request-proxy.ts`) and `recordAccountSecurityEvent` audit trail.

**Per-action explicit denial test (P1 follow-up):** verify with a Vitest supertest that a forged `Origin: https://evil.example` header on a Server Action POST either (a) is rejected by Next.js runtime SameSite enforcement, or (b) is rejected by an explicit origin check inside the action. Tracked in follow-ups.

### C. Internal API routes (authenticated) — POST with session cookie

Routes under `src/app/api/<feature>/route.ts` that mutate state and require a logged-in user:

| Surface | Auth path | Origin check posture |
|---|---|---|
| `POST /api/component-library/attachments` | Better Auth session | SameSite=Lax covers standard CSRF |
| `POST /api/component-library/images` | Better Auth session | SameSite=Lax |
| `POST /api/projects/[id]/images` | Better Auth session | SameSite=Lax |
| `POST /api/projects/[id]/estimates/[id]/export/proposal.xlsx` | Better Auth session | SameSite=Lax; produces a downloadable file |
| `POST /api/webhooks/*` | Service secret in header | NOT SameSite-protected; service-secret gate is the CSRF equivalent |
| `POST /api/internal/*` | Service secret in header | Same |

**Decision:** webhooks and internal routes are gated by service secrets (`CRON_SECRET`, `UPLOAD_CLEANUP_JOB_SECRET`, `UPLOAD_SCAN_JOB_SECRET`), which function as bearer-tokens and are CSRF-equivalent because they cannot be exfiltrated by a browser.

### D. New routes added by this implementation

| Route | Auth | Origin check |
|---|---|---|
| `POST /api/compliance/privacy-requests` | **Anonymous** (REQ-005 ANON-1) | Not required — DSAR intake accepts anonymous submissions. Spam/abuse is bounded by description length cap (4000 chars) and rate-limit hook (planned — see sibling pack `2026-07-02-API-Rate-Limiting-Security-Consolidation`) |

## Gap matrix

| Surface | Coverage | Status | Next step |
|---|---|---|---|
| Public share token POST | assertSameOrigin* helpers | Covered | Maintain |
| Server Actions (11 files) | SameSite=Lax session cookie | Covered (Better Auth documented posture) | Per-action denial tests P1 |
| Internal API (attachments, images, export) | SameSite=Lax session cookie | Covered | Per-route denial tests P1 |
| Webhooks / internal service routes | Service-secret bearer | Covered (secret = CSRF-equivalent) | Maintain |
| Privacy request intake | Anonymous (intentional) | N/A | Rate-limit hook via sibling pack |
| AI routes (`/api/ai/*`) | Better Auth session + feature flag | Covered | Maintain; denial test when AI ships |

## Verification commands (P1)

```bash
# Forge-Origin denial test for Server Actions (planned)
bun run test:dom -- csrf-origin-denial

# Forge-Origin denial test for /api/component-library/attachments (planned)
bun run test:dom -- api-csrf-origin-denial
```

These tests are tracked as P1 follow-ups; they are not blocking P0 because the SameSite=Lax cookie posture is the documented Better Auth CSRF model.

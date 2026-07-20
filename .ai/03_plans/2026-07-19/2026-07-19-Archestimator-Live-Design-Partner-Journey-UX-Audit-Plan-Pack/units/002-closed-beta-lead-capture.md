# 002 — Closed-Beta Lead Capture

> Closes **Critical** `UX-LEAD-001` and **Medium** `UX-LEAD-002`, absorbing `UX-SIGNUP-001`.

## unit_id
`UNIT-002`

## title
Wire the closed-beta request-access and contact form to a server-side lead capture handler.

## status
`READY`

## priority
`P0` — before recruiting. Every beta request and every contact-form submission is currently lost.

## severity_of_findings
Critical (`UX-LEAD-001`) + Medium (`UX-LEAD-002`); absorbs High `UX-SIGNUP-001` (same root cause).

## effort
Small (~half-day). One new server-side write path + two form rewiring.

## implementation_risk
`LOW-MEDIUM` — adds a new D1 write surface. The admin support inbox repository already exists (`src/lib/admin/support-attention-repository.ts`) and can be reused as the persistence layer.

## local_implementation_status
`NOT_STARTED`

## external_lifecycle_status
`NOT_REQUIRED` — local D1 only; no real email send.

## requirements
`UX-002`

## findings
`UX-LEAD-001`, `UX-LEAD-002`, `UX-SIGNUP-001`

## existing_plan_links
MVP Startup Readiness `001-lead-capture.md` owns the founder-side lead-capture product surface; this unit owns the *intake plumbing* fix that unblocks it. Coordinate the D1 schema with the MVP pack if it prescribes a specific table.

## goal
- Submitting the `/signup` closed-beta gate form persists the request server-side and shows a confirmation.
- Submitting the `/contact` form persists the message server-side (mailto becomes a fallback), with rate-limit and duplicate-submission guard.
- Founder can see both lead types in `/admin/support` (which already exists).

## security_invariants
1. Lead capture accepts only honeypot-validated, server-action-shaped requests.
2. PII (email) is stored only in the authorized D1 (`ARCH_DB`) and never logged in plaintext beyond the existing redactor.
3. Rate-limit per IP/email to prevent lead-spam.

## current_source_evidence
- `src/components/auth/ClosedBetaGate.tsx:42-78` — `<form action="/contact" method="post">` with hidden `intent=beta-request` and honeypot `company_url`.
- `src/app/contact/page.tsx:18` — `export const dynamic = "force-static"`.
- `src/app/contact/` — only `page.tsx`, no `route.ts`.
- `src/components/landing/ContactForm.tsx:73-84` — `window.open(nextMailtoLink, "_self")` only.
- `src/lib/admin/support-attention-repository.ts` — existing persistence surface used by `deriveActionItemsFromSources`.

## affected_paths_and_resources
- `src/app/contact/route.ts` (new POST handler) OR a new server action in `src/lib/landing/`.
- `src/components/auth/ClosedBetaGate.tsx` — change form to call the new action.
- `src/components/landing/ContactForm.tsx` — persist first, mailto as fallback.
- (Schema) one new D1 table for lead submissions if no existing table fits.

## owned_paths
- `src/app/contact/route.ts` (new)
- `src/components/auth/ClosedBetaGate.tsx`
- `src/components/landing/ContactForm.tsx`

## dependencies
- `UNIT-001` (build must compile to verify acceptance).

## preconditions
- `bun run build` exits 0 (after UNIT-001).
- D1 connection is configured (already true; `ARCH_DB` bound in `wrangler.jsonc`).

## non_goals
- Real email send (preview transport only).
- A founder-side UI redesign of `/admin/support` (already exists).
- Public marketing site redesign.

## implementation_sequence
1. Decide persistence: reuse the existing admin support conversation table OR add a minimal `lead_submissions` table. Prefer reuse.
2. Add a POST handler at `src/app/contact/route.ts` (or a server action) that:
   - Reads `intent` (beta-request | walkthrough | started | general).
   - Validates email + honeypot (honeypot filled → silently succeed without persisting).
   - Rate-limits by IP/email.
   - Persists to D1.
   - Returns a confirmation (303 redirect to `/contact?submitted=1` or in-place success).
3. Update `ClosedBetaGate.tsx` to either post to the new handler (already does, just needs the handler to exist) or invoke a server action.
4. Update `ContactForm.tsx` to persist via the same handler first; keep mailto as a fallback for users who want a draft in their own mail client.
5. Add duplicate-submission guard (e.g., disable submit button on click; server-side idempotency on email+intent within N seconds).

## data_or_schema_changes
Possibly one new D1 migration adding a `lead_submissions` table (id, email, intent, honeypot_triggered, ip_hash, created_at). Reuse existing admin support tables if compatible.

## authz_and_tenant_implications
None. Public intake; no auth required to submit. Founder-side read access already gated by `/admin/support` admin auth.

## failure_and_exception_behavior
- D1 unavailable: return 5xx, surface user-visible error, persist nothing.
- Honeypot triggered: silently succeed (return 200/303) without persisting, to discourage bot retry.
- Rate-limit exceeded: return 429 with Retry-After.

## acceptance_criteria
1. POST `/contact` (or new endpoint) with `intent=beta-request` returns 200/303 and persists the submission (D1 row created).
2. `ClosedBetaGate` submission shows a confirmation view.
3. `ContactForm` submission persists to D1; founder can list it in `/admin/support`.
4. Honeypot-filled submission does NOT persist.
5. Rate-limit prevents >N submissions per email per minute.
6. `bun run build` exits 0.

## acceptance_evidence
- Source inspection of the new handler + form rewiring.
- Local dev manual submit (after UNIT-001) confirmed via D1 read or /admin/support listing.
- `bun run build` exit 0.

## test_decision
`TEST_PROPOSAL`.

## exact_test_proposal_if_any
- **Risk:** Lead capture silently drops submissions under load or when D1 is briefly unavailable.
- **Cheapest decisive test:** `bun x vitest run tests/vitest/landing/contact-route.test.ts` (new) — POST the handler with valid + honeypot + rate-limit-exceeded inputs; assert D1 write counts.

## authorization_boundaries
None. Local D1 only.

## observability_or_audit_requirements
Use the existing structured redactor (`src/lib/observability/*`). Do not log raw emails at info level.

## recovery_or_fix_forward
If the new table is wrong, drop it via a new migration (no production data at this stage). If the handler regresses, revert to mailto-only.

## conflict_and_concurrency_notes
Coordinate the D1 schema choice with MVP pack `001-lead-capture.md` if it prescribes a specific table; otherwise pick the minimal one.

## completion_signal
`UNIT-002` is `DONE` when all six acceptance criteria are evidenced.

## next_unit_on_success
Any of UNIT-003..UNIT-013 (all are dependency-free after UNIT-001). Recommended: UNIT-005 (next-highest user-impact — first-estimate checklist always-broken step).

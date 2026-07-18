# UNIT-001 · Lead-capture table + server action

- **Requirement:** REQ-001, REQ-015
- **Priority:** P0 · **Effort:** S · **Risk:** LOW · **Status:** READY
- **Depends on:** —
- **Evidence:** EVID-001

## Goal

Every public CTA persists a lead in D1 with qualification fields and source
attribution. No lead is lost to mailto abandonment.

## Source evidence (commit `a41a07d01`)

- `src/components/landing/ContactForm.tsx:73-84` — `handleSubmit` builds a
  `mailto:` URL client-side via `buildSupportMailto` and calls
  `window.open(nextMailtoLink, "_self")`. No server action, no D1 write.
- `src/components/landing/ContactForm.tsx:133-135` — copy admits: *"This form
  opens a support email draft. Nothing is stored until you send it."*
- `src/components/auth/ClosedBetaGate.tsx:42-78` — `<form action="/contact"
  method="post">` with hidden `intent=beta-request`.
- `src/app/contact/page.tsx:18` — `force-static`; **no `route.ts` or server
  action receives the POST.** The form lands on the GET page and the
  `intent=beta-request` is parsed by `ContactFormFromSearchParams`
  (`ContactForm.tsx:64-67`) into the same mailto builder. The POST is lost.
- Negative grep over `migrations/` for `access_requests`, `leads`,
  `waitlist`, `beta_requests`, `signups`, `contact_messages`,
  `design_partners` → zero matches. Closest tables
  (`closed_beta_allowed_emails`, `beta_feedback_submissions`,
  `beta_activation_progress`) are all post-login or admin-curated.

## Implementation

- Migration `00XX_beta_access_requests.sql`:
  `beta_access_requests` table with `id, normalized_email, name, persona
  (architect|contractor|estimator|qs|interior_design|other), company,
  estimating_volume (per_month band), current_tool, source_cta, inquiry_type
  (started|walkthrough|general|beta-request), status
  (new|qualified|invited|active|rejected|duplicate), notes, created_at,
  updated_at`. Index on `normalized_email`, `status`, `created_at`.
- `src/lib/leads/` — `submitAccessRequest` server action (or
  `POST /api/access-requests` route). Same-origin CSRF, rate limit per IP
  (5/h) and email (3/h), email normalization, duplicate detection
  (auto-`duplicate` if email exists and not `rejected`).
- Rewire `ClosedBetaGate` (`ClosedBetaGate.tsx:42-78`) to the action;
  preserve `intent=beta-request` semantics.
- Rewire `ContactForm` (`ContactForm.tsx:73-84`) to the action when
  `inquiryType ∈ {started, walkthrough, beta-request}`. Keep mailto fallback
  for `general` (low-value, low-volume).
- Admin list view at `/admin/access-requests` (reuse `/admin/users` shape)
  with status update + notes + "Invite to beta" button calling existing
  `createClosedBetaAllowlistEntry` (`beta-allowlist-admin-actions.ts:19-39`).
- Add a `source_cta` column / property so the founder can see which CTA
  produced each qualified design partner (REQ-015, G-18).

## Acceptance evidence

- Submitting ClosedBetaGate inserts a row; admin list shows it; `source_cta`
  is correct per CTA.
- Email + IP rate limits reject abuse.
- Duplicate email is marked `duplicate`, not inserted twice.

## Test decision

`test_requirement: NOT_REQUIRED`. Source-diff + scoped manual submit proves
correctness. `TEST_PROPOSAL`: focused action test would catch silent
duplicate-detection or rate-limit regressions; deferred pending user
authorization.

## Recovery

If migration fails to apply: drop the table and re-apply. No data loss
(table is empty on first apply). The action's CSRF and rate-limit code
falls back to the existing mailto path if the action throws — the user
still gets a draft email.

## Completion signal

`POST /api/access-requests` returns 2xx; a row appears in
`beta_access_requests`; admin `/admin/access-requests` lists it.

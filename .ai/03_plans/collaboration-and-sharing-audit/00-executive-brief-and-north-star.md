# 00 — Executive Brief & North Star

**Date:** 2026-05-30
**Status:** Planning complete. Implementation not started.
**Confidence:** High for documented code paths verified against the repository. Inline environment config (`.env.local`, `config.toml`) and linked Supabase dashboard state confirmed by inspection. API route contracts, RPC behavior, and generated types confirmed via Vitest contract tests. Remaining items marked `[verify-in-code]` where implementation details may drift from documentation.

---

## What This Folder Contains

A comprehensive audit of Archestimator's two sharing features, organized as a pair-programming-ready plan for a future implementation pass:

| Feature | Sub-folder | Docs |
|---------|-----------|------|
| **Collaboration Invites** (team access inside workshop) | `collaboration-invite/` | 01–04 + appendix |
| **Shared Link** (view-only client publication) | `shared-link/` | 01–04 + 2 appendices |
| **Cross-cutting** (security, performance, acceptance, prompts) | root | 00, 05, 06, 07, 08 |

---

## Feature Distinction

**Collaboration Invites** = "Add Alice as an Editor so she can edit the estimate inside the workshop."
- Requires account (Supabase Auth)
- Roles: owner, admin, editor, viewer
- Project-scoped and estimate-sheet-scoped
- Uses Supabase Auth email (`admin.inviteUserByEmail`)
- Accept via `/invite/[token]` route

**Shared Link** = "Send Bob a view-only link so he can review the estimate and comment."
- No account required (public URL)
- View-only + optional password + optional comments/decisions
- Uses Resend for email
- Access via `/share/[token]` route

---

## Current Health Assessment

### Collaboration Invites — ❌ Non-functional

**Root cause:** Three configuration failures compound to make the entire system non-functional:

1. **Supabase Auth email not configured** — `admin.inviteUserByEmail()` succeeds at the API level but no email is sent if the SMTP provider isn't configured in the Supabase dashboard.
2. **Missing `PROJECT_INVITE_ENTRY_ENABLED` and `ARCHESTIMATOR_INVITE_TOKEN_PEPPER`** — the custom `/invite/[token]` acceptance route is disabled.
3. **Auto-grant RPC deliberately neutered** — `apply_pending_collaboration_invitations` is a no-op; the trigger-based auto-accept path is gone.

**Result:** No email is sent. Even if an email were sent, no acceptance mechanism exists. The system produces false-positive "Invite email sent." messages.

### Shared Link — ✅ Functional, below industry parity

**Strengths:**
- Works end-to-end: publish → share → view → comment → decide
- Solid crypto: scrypt passwords, AES-256-GCM tokens, HMAC-signed cookies
- Proper security: CSP headers, CSRF gates, same-origin enforcement, rate limiting, circuit breakers
- Email delivery via Resend with graceful degradation

**Weaknesses:**
- No link-status indicators on project cards or homebase
- No per-recipient view tracking (only aggregate open_count)
- No one-click copy from project page
- Owner digest uses hardcoded email
- In-memory rate limiters won't survive server restart
- No destructive-action confirmations

---

## Quality Bar (North Star)

Every change to these systems must satisfy:

### Security
- Fail closed: missing config must disable features, never silently weaken access
- POST-only mutations: no GET request may grant access or change state
- Rate-limited: all public and auth-gated endpoints
- Auditable: every security-relevant event recorded
- Token-safe: raw tokens never logged, never in URLs after initial load, never in analytics
- Bearer-aware: tokens treated like passwords — anyone with the raw token can attempt access

### UX
- No false positives: "sent" only when delivery is confirmed; otherwise "created" or "attempted"
- Every state visible: pending, sent, opened, accepted, expired, revoked, removed — all surfaced
- Every surface has signifiers: project cards, homebase, sidebar, header rail, modal, invite page
- Confirmation-first: destructive actions require confirmation
- Progress-visible: multi-step flows show loading/progress states
- Accessible: WCAG contrast, ARIA labels, keyboard navigation

### Performance
- Minimal redirects: signed-out invite acceptance consolidated to one POST/redirect cycle
- Targeted queries: no N+1 in project lists; metadata aggregated in single queries
- Paginated feeds: activity and comment feeds capped and cursor-paginated
- Durable rate limiting: production limits survive server restart
- Batch operations: invite/resend/send operations support bulk where sensible

### Testability
- Every gap has acceptance criteria
- Every security control has a negative test
- E2E smoke tests runnable with env vars set
- Contract tests verify generated types align with migrations

---

## Implementation Phases (Cross-Feature)

| Phase | Collaboration Invites | Shared Link |
|-------|----------------------|-------------|
| **P0** | Config: add env vars, configure Supabase email, unblock flow | N/A (already functional) |
| **P1** | Security: POST-only accept, rate limiting, fail-closed config, audit events, fix messaging | Visibility: project card badge, one-click copy, activity dot |
| **P2** | Visibility: pending-invite cards, sidebar dots, homebase banners, opened status | Tracking: per-recipient opens, recipient identity, owner digest fix |
| **P3** | UX: bridge-consolidation, wrong-account fixes, confirmation, resend, expiry warnings | Polish: stale snapshot warning, search/sort, print, confirmations |
| **P4** | Removal: confirmation dialog, notification, favorites cleanup, removed-user banner | Email: webhooks, unsubscribe, real sender, resend |
| **P5** | Edge cases: re-invite request, ownership transfer policy, duplicate detection | Advanced: threading, PDF export, dark mode, attachment support |

---

## Critical Quick Wins (Config-Only, No Code)

These can be done immediately to unblock collaboration invites:

1. Add `PROJECT_INVITE_ENTRY_ENABLED=true` and `ARCHESTIMATOR_INVITE_TOKEN_PEPPER=<random>` to `.env.local`
2. Add both vars to `.env.example`
3. Configure an email provider in the Supabase dashboard for project `ebxxqidacheyapmmzavr`
4. Run the E2E smoke test: `ARCHESTIMATOR_E2E_INVITE_ENTRY=1 bun run test:e2e -- e2e/project-invite-entry.spec.ts --project=chromium`

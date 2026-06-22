# LOOP LEDGER — Email, Notifications & Integrations (Domain 13)

Lightweight in-session loop (proportional). No dated plan-pack ceremony required
unless remediation expands to migrations (only the optional EMAIL-04 DB-backed
throttle would). Send-path + same-origin edits are security-adjacent, so a Codex
review pass is recommended before merging EMAIL-01/02/03.

**Launch-blocker count for this domain: 0.**

---

## DISCOVER
- Adversarially verified the prior auditor's 8 findings (EMAIL-01..08) by re-opening
  every cited file/line this pass. Source read-only.
- Reconciled against prior packs: OWASP-09 (rate-limiting → AI routes only, not
  recipient bulk-send), OWASP-15 (collab invite RLS, not SMTP deliverability),
  OWASP-18 (R-60 webhook-verification alerting → Domain 9), archived notification-system
  pack (RLS proven). No prior pack covers EMAIL-01/02/06; EMAIL-05 partial-overlaps
  OWASP-18.
- Confirmed early signals in-lane: no `middleware.ts` (auth is server-action +
  RLS-based, not middleware-gated for these routes); webhook + unsubscribe routes are
  their own POST handlers with their own guards.

## PLAN
- See `02-REMEDIATION-PLAN.md`. Sequence:
  - **P1 EMAIL-01** (S) — cap recipients/call (<=50) + DB-backed add rate-limit in
    `addSharedLinkRecipients` (`publication/actions.ts`). Highest value/effort.
  - **P2 EMAIL-02** (S) — gate resend on `delivery_status === "bounced"` in
    `resendSharedLinkRecipientEmail`.
  - **P3 EMAIL-05+06** (S) — ops launch checklist: Resend domain SPF/DKIM/DMARC +
    webhook registration + Supabase-SMTP sender decision. No code (optional DKIM
    probe in `check-support-email-dns.ts`).
  - **P4 EMAIL-04** (M, deferrable) — move digest throttle (+ optionally circuit
    breaker) to `security_rate_limit_events` for serverless correctness.
  - **No action:** EMAIL-03 (low, optional DiD), EMAIL-07 (info), EMAIL-08 (add
    guardrail test only).

## EXECUTE
- _Not started._ This pass is audit + plan only; source untouched. Implementer picks
  up at P1.

## VERIFY
- _Pending execution._ Per-item proof gates in `03-EVIDENCE-AND-VERIFICATION.md`:
  - EMAIL-01/02/08: targeted Vitest + `bun run build` (server-action files — build is
    the only check that catches a bad `"use server"` export, per MEMORY).
  - EMAIL-04: Vitest against mocked rate-limit store + migration apply check if a new
    table is added.
  - EMAIL-05/06: manual Resend-dashboard + DNS check (cannot be a CI gate).
- `bun run validate` is known-red on main (unrelated charts/design-lint; test:dom can
  hang) — gate on touched-area tests + build, diff failing-test names to ensure no NEW
  red.

## RECORD
- On completion, record outcomes in `.ai/10_state/current-state.md`
  (Email/Notifications section) and the Supabase-SMTP sender decision (EMAIL-06) +
  recipient-cap value (EMAIL-01) in `.ai/10_state/decisions.md`.

## DECIDE
- Owner (Philip) decisions needed before/at execution:
  1. **EMAIL-01 cap value** (default <=50/call) + add rate-limit window (default N/15min).
  2. **EMAIL-06**: configure custom Supabase SMTP on the Resend domain, or accept
     default Supabase SMTP for closed-beta invites (document either way).
  3. **EMAIL-04**: accept per-instance throttles for closed beta (defer) or implement
     the DB-backed window now.
  4. **EMAIL-03**: ship the missing-Origin reject as defense-in-depth, or defer
     (token-secrecy is the real control).
- Pack is deletable per `00-README.md` deletion criteria if (a) bulk-add abuse surface
  accepted for trusted-manager closed beta, (b) DNS/sender confirmed out-of-band,
  (c) serverless in-memory-limiter caveat accepted.

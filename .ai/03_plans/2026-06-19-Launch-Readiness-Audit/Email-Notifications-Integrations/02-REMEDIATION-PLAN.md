# Remediation Plan — Email, Notifications & Integrations (Domain 13)

Part of the 2026-06-19 Launch-Readiness Audit. Adversarially verified pass over
`01-AUDIT-FINDINGS.md`. Source is READ-ONLY in this pass; this file is a plan, not
applied changes. Assume concurrent agents — implementer should re-open cited lines
before editing (line numbers drift).

## Verdict summary (see 03-EVIDENCE for proof)

| ID | Title | Orig sev | Final sev | Launch blocker | Verdict |
|----|-------|----------|-----------|----------------|---------|
| EMAIL-01 | `addSharedLinkRecipients` no rate-limit + no recipient cap | high | high | no | confirmed |
| EMAIL-02 | Resend path ignores prior hard `bounced` status | medium | medium | no | confirmed |
| EMAIL-03 | Unsubscribe POST treats missing Origin as same-origin | medium | low | no | adjusted (down) |
| EMAIL-04 | Digest limiter + circuit breaker are per-process on serverless | medium | low | no | adjusted (down) |
| EMAIL-05 | Sender DNS (SPF/DKIM/DMARC) + webhook registration not gated | medium | medium | no | confirmed |
| EMAIL-06 | Collab invites use Supabase Auth SMTP (separate sender) | low | low | no | confirmed |
| EMAIL-07 | Webhook has no dedicated idempotency/dedup store | info | info | no | confirmed (no action) |
| EMAIL-08 | Notification mutation service-role w/ manual user-scoping | info | info | no | confirmed (guardrail) |

**Launch-blocker count: 0.** This domain has no launch blocker. The outbound-email
surface is functional, signed, RLS-correct, and best-effort-degrading. The findings
are abuse-surface hardening (EMAIL-01/02), defense-in-depth alignment (EMAIL-03),
serverless-correctness of throttles (EMAIL-04), and ops/deliverability posture
(EMAIL-05/06). For a *closed beta with trusted managers and no external users*, all
are deferrable; EMAIL-01 and EMAIL-05 are the two worth doing before any wider send.

Severity adjustments made this pass:
- **EMAIL-03 medium -> low.** The mutation requires a recipient secret token (hashed
  at `public-repository.ts`), only writes `email_unsubscribed_at`, and GET is a
  read-only interstitial. The missing-Origin gap is pure defense-in-depth on an
  already-secret-gated, low-value, *self-harm-only* action. Not medium.
- **EMAIL-04 medium -> low.** Both throttles are best-effort guards on best-effort
  callers that already degrade gracefully (digest is "nice to have", circuit breaker
  is a courtesy fast-fail). Per-instance scope means *weaker* protection, never a
  correctness/security break. In closed beta with low lambda fan-out this is near-zero
  impact. Document-and-defer is the right call, so it is not medium.

---

## Sequenced remediation

Ordering: highest abuse-surface-reduction-per-effort first. All items are additive
and reversible. None require a migration except the optional EMAIL-04 DB-backed
throttle. No cross-domain blocking dependencies (EMAIL-05/06 ops items depend on
Domain 9/Observability + Domain 11/Deploy for the launch checklist home, but can
ship as a standalone runbook here).

### P1 — EMAIL-01: cap + rate-limit `addSharedLinkRecipients` (do before any non-trivial send volume)

- **Why first:** lowest effort, highest blast-radius reduction. One authenticated
  manager submitting a giant recipient array currently fans out unbounded Resend
  sends from your verified domain — sender-reputation + Resend-quota + cost vector.
  The DB-backed limiter and the resend-scope pattern already exist; this is reuse.
- **Files:** `src/lib/publication/actions.ts` (`addSharedLinkRecipients`, currently
  ~`:989`). Look at the already-rate-limited sibling
  `resendSharedLinkRecipientEmail` (~`:1165`, `checkSharedLinkRecipientResendRateLimit`)
  and the existing scope constant pattern (`SHARED_LINK_RECIPIENT_RESEND_SCOPE`) to
  mirror.
- **Steps:**
  1. Add a hard per-call cap on `inputs` length (recommend `<= 50`) at the top of
     `addSharedLinkRecipients`, *after* the `Array.isArray(inputs)` guard at `:998`,
     before normalization. On overflow return `ok:false` with a clear message and do
     NOT insert/send any rows (fail the whole batch, mirroring the linkBase
     short-circuit at `:1054`).
  2. Add a `checkPublicationActionRateLimit`-style call keyed on
     `[userId, publicationId]` (e.g. a new `SHARED_LINK_RECIPIENT_ADD_SCOPE`, N adds
     per 15 min) before the insert loop at `:1068`. Reuse the same
     `security_rate_limit_events`-backed helper that the resend path uses so the
     gate is global (DB), not per-instance.
  3. Optionally add a matching client-side soft cap in
     `src/components/workshop/publication/RecipientEmailComposer.tsx` (chip count)
     for UX, but the server cap is the security boundary — do not rely on the client.
- **Migration/RLS:** none if reusing the existing `security_rate_limit_events`
  table + helper. Confirm the helper's RLS/grants already permit the service-role /
  admin client path used here (the resend sibling already writes to it, so this is
  proven by the existing path).
- **Risk:** low. Additive guard; only changes behavior for oversized/abusive calls.
  Add a Vitest that a 51-recipient call is rejected with no inserts and that the
  rate-limit blocks the (N+1)th add within the window.
- **Effort:** S.
- **Dependencies:** none. Self-contained.

### P2 — EMAIL-02: block resend (and re-add) to hard-bounced addresses

- **Why:** prevents a manager repeatedly hammering a known-invalid/suppressed
  address, which degrades sender reputation. The webhook already writes
  `delivery_status = "bounced"` (`resend-webhooks.ts:42-52`); nothing reads it as a
  send gate.
- **Files:** `src/lib/publication/actions.ts`
  - `resendSharedLinkRecipientEmail` (~`:1174`): the `select` currently fetches
    `"id, email, display_name, email_unsubscribed_at"`. Add `delivery_status` and,
    right after the existing `email_unsubscribed_at` guard (`:1185`), add a
    `delivery_status === "bounced"` guard returning a clear `ok:false`
    ("This address previously bounced; correct it and re-add to retry.").
  - `addSharedLinkRecipients` (~`:1068`): a hard-bounced row is suppressed today only
    as a *duplicate* (unique index → status `duplicate`), which already avoids a
    resend. The real gap is the explicit resend path above. Optionally, when a
    duplicate insert hits a row whose current `delivery_status === "bounced"`, surface
    that distinctly in `emailResults` so the UI does not imply success. This is a
    UX nicety, not a security need.
- **Migration/RLS:** none. `delivery_status` already exists and is normalized via
  `normalizeRecipientDeliveryStatus`.
- **Risk:** low. The only behavior change is refusing resend to bounced rows.
  Provide an explicit operator override path only if Philip wants it (correct the
  address → `removeSharedLinkRecipient` then re-add yields a fresh `pending` row, so
  no override flag is strictly required — document this as the recovery path).
- **Effort:** S.
- **Dependencies:** none.

### P3 — EMAIL-05 + EMAIL-06: sender/DNS + dual-sender launch checklist (ops doc, no code)

- **Why:** the readiness scripts self-disclose they only prove env-var *presence*,
  not domain verification, DKIM, DMARC alignment, or webhook registration
  (`check-resend-readiness.ts:120`). The one live 2026-06-04 delivered-event
  reconciliation (current-state) is strong but not a *standing* gate — a domain or
  secret change after launch would silently regress deliverability. Separately,
  collaboration invites go through Supabase Auth SMTP
  (`collaboration/actions.ts:366`, `inviteUserByEmail`), a second sender with its own
  DNS/rate posture that none of the Resend gates cover.
- **Files (new ops doc only — write OUTSIDE source, inside this pack or `.ai`):**
  - Add a "Launch DNS / Sender Checklist" section to this pack (or to the
    Observability/Deploy launch checklist owned by Domains 9/11). No code change.
- **Checklist content:**
  1. In the Resend dashboard, confirm the production **sending** domain shows
     verified **SPF + DKIM**, and DMARC alignment for that domain.
  2. Confirm `/api/webhooks/resend` is registered/enabled in Resend with a secret
     matching `RESEND_WEBHOOK_SECRET` in Vercel prod env.
  3. Decide intentionally on the Supabase Auth invite sender (EMAIL-06): either
     configure **custom SMTP in Supabase pointed at the same Resend domain** (best
     for brand/DMARC consistency + higher rate limits) OR explicitly accept
     Supabase's default SMTP for closed-beta invite volume and document its sharp
     rate limit. Record the decision in `.ai/10_state/decisions.md`.
  4. (Optional automation) extend `check-support-email-dns.ts` to also assert a DKIM
     selector for the *sending* domain (it currently checks MX/SPF/DMARC for the
     support domain only, `:93`). Keep it out-of-CI; it is a network-dependent ops
     probe, not a unit gate.
- **Migration/RLS:** none.
- **Risk:** none (doc). The only "risk" is forgetting the manual step — that is the
  point of the checklist.
- **Effort:** S (doc) + S (optional script extension).
- **Dependencies:** Domain 9 (Observability) and Domain 11 (Deploy/Headers) own the
  canonical launch checklist surface; coordinate where this lives. Content is
  self-contained here regardless.

### P4 (deferrable) — EMAIL-04: make digest throttle + circuit breaker serverless-correct

- **Why deferrable:** both are best-effort guards on best-effort callers; per-instance
  scope weakens, never breaks. Acceptable to ship closed beta as-is *if documented*.
- **Files:**
  - `src/lib/publication/actions.ts` `digestRateLimit` Map (~`:1285`), `shouldSendDigest`
    (~`:1288`): replace the module Map with a `security_rate_limit_events`-backed
    window keyed on `publicationId` (same table/helper as EMAIL-01), so "1 digest /
    15 min" holds across lambda instances.
  - `src/lib/email/resend-client.ts` circuit-breaker module arrays (`:78-80`):
    optionally move to a tiny DB/KV row. Lower priority than the digest throttle —
    the circuit breaker failing-open-per-instance just means each instance protects
    itself; the blast radius is small.
- **Migration/RLS:** if a new dedicated table is chosen, add a migration with
  service-role-only writes (mirror `notification_system.sql:131-132` grant posture:
  revoke INSERT/UPDATE from `authenticated`). Reusing `security_rate_limit_events`
  needs no migration.
- **Risk:** low-medium. Touches the hot send path; a DB round-trip per digest is
  fine (digests are rare), but ensure failure of the throttle read fails *open*
  (best-effort) so a transient DB error never blocks a recipient invite send.
- **Effort:** M.
- **Dependencies:** shares the rate-limit table decision with EMAIL-01 — do EMAIL-01
  first, then this reuses the same helper.

### No action — EMAIL-03, EMAIL-07, EMAIL-08

- **EMAIL-03 (low):** OPTIONAL defense-in-depth. If touched, the one-line change is in
  the unsubscribe POST (`src/app/api/share/[token]/unsubscribe/route.ts:70`): either
  swap `assertSameOrigin` for `assertSameOriginPublicPost` (already exists,
  `security.ts:358`, requires Origin + CSRF double-submit) OR add a local
  missing-Origin reject. Caveat: `assertSameOriginPublicPost` requires the CSRF
  cookie/header to be present on this unauthenticated interstitial form — verify the
  interstitial actually sets/sends the `x-archestimator-csrf` pair before switching,
  or the legitimate unsubscribe breaks. Given token-secrecy is the real control,
  recommend deferring unless free.
- **EMAIL-07 (info):** keep as-is. Idempotency rests on standardwebhooks tolerance +
  the monotonic `resend_last_event_at` stale-event guard (`resend-webhooks.ts:193`).
  Only add a processed-`svix-id` table if the webhook ever gains non-idempotent
  side effects (counters). No action for launch.
- **EMAIL-08 (info):** keep as-is; the `.eq("user_id", userId)` filter
  (`repository.ts:157`) is the load-bearing boundary under service-role. Add a
  regression test (see EVIDENCE) so a future edit can't silently drop it.

---

## Cross-domain handoffs

- **Webhook-verification-failure alerting** (handler returns 400 with no structured
  alert, `route.ts:42`): owned by **Domain 9 / Observability** — OWASP-18 F-LOG-02 /
  R-60 already plans alerting for "Webhook signature verification failures". Do NOT
  re-plan it here; reference it.
- **Secret scrubbing in Vercel logs** (RESEND_* keys): owned by **Domain 9**, OWASP-18
  R-61. Out of lane.
- **CSP/headers on the webhook + unsubscribe routes:** owned by **Domain 7 /
  NextJS-Vercel-Deploy-And-Headers**.
- **Full RLS proof of `collaboration_invitation_*` RPCs:** owned by **Domain 2 /
  RLS-RPC-And-DB-Security**.

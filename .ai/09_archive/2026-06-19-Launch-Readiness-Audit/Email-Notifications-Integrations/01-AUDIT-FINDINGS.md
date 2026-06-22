# Audit Findings — Email, Notifications & Integrations (Domain 13)

Part of the 2026-06-19 Launch-Readiness Audit. Read-only audit; no source edited.

## Scope & coverage

Read in full:
- `src/lib/email/resend-client.ts`, `resend-webhooks.ts`,
  `resend-webhook-route-constants.ts`
- `src/app/api/webhooks/resend/route.ts`
- `src/app/api/share/[token]/unsubscribe/route.ts`
- `src/lib/notifications/{repository,actions}.ts`
- `src/lib/publication/actions.ts` (send/digest/recipient sections),
  `public-repository.ts` (unsubscribe fn), `security.ts` (same-origin helpers)
- `src/lib/collaboration/actions.ts` (invite + removal email paths)
- `scripts/check-resend-readiness.ts`, `check-support-email-dns.ts`
- Migrations: `resend_shared_link_delivery_webhooks`,
  `shared_link_recipient_unsubscribe`, `notification_system`,
  `harden_notification_action_href`, `project_shared_link_overhaul` (indexes)
- Resend SDK `webhooks.verify` impl (`node_modules/resend/dist/index.cjs`) +
  `standardwebhooks` dep

Deferred / out of lane: SMTP template content quality; full RLS proof of
collaboration_invitation_* RPCs (Domain 2 owns); CSP/headers for the webhook
route (Domain 7); secret scrubbing in Vercel logs (Domain 9, already R-61).

## Reconciliation vs prior packs

| Area | Prior pack | Verdict |
|------|-----------|---------|
| Webhook signature verification (Svix/standardwebhooks) | OWASP F-CRYPTO-05 | covered-by — verified live; verify() uses `standardwebhooks.Webhook(secret).verify` |
| `new Resend("re_webhook_verifier")` placeholder default | OWASP F-CRYPTO-06 | covered-by — confirmed harmless (verify-only client; real key passed for sends) |
| Server-only secrets (RESEND_*) | OWASP F-CRYPTO-04/05, R-61 | covered-by — no NEXT_PUBLIC leakage; scrubbing is Domain 9 |
| Webhook-verification-failure monitoring/alerting | OWASP audit item 2 / file 18 | partial — handler returns 400 but emits no structured alert; Domain 9 owns alerting |
| Unsubscribe table RLS | OWASP 04 row (`...unsubscribe`) | covered-by — service-role mediated, scoped |
| Resend delivery webhook table RLS | OWASP 04 row | covered-by |
| Notification system tables/RLS/grants | archived 2026-06-06-notification-system + 2026-06-14 migration-check | covered-by — RLS uses `(select auth.uid())`, writes revoked from authenticated |
| Signed delivered-webhook live reconciliation | current-state 2026-06-04 18:09Z | covered-by — proven against production endpoint |
| Recipient clickthrough/open + absolute email URLs | current-state 2026-06-04 17:31Z | covered-by |
| Shared-link recipient delivery contract | archived share-and-collaboration-implementation | covered-by for the happy path |

New, not in prior packs: bulk-send rate-limit/cap gap (EMAIL-01), bounce-resend
honoring (EMAIL-02), unsubscribe POST missing-Origin (EMAIL-03), serverless
in-memory limiter/circuit-breaker (EMAIL-04), DNS/dual-sender deliverability not
proven (EMAIL-05/06).

---

## Findings

### EMAIL-01 — `addSharedLinkRecipients` has no send rate-limit and no recipient-count cap
- Severity: high · launch_blocker: false (closed beta = trusted managers) · confidence: high
- Evidence: `src/lib/publication/actions.ts:989` (`addSharedLinkRecipients`) loops
  `for (const r of allowedRecipients)` at `:1068` calling
  `sendSharedLinkRecipientInvitationEmail` (`:1103`) with no
  `checkPublicationActionRateLimit` and no length cap on `inputs`. Contrast:
  `resendSharedLinkRecipientEmail` is rate-limited (`:1165`) and
  `inviteProjectCollaborator` is rate-limited (`actions.ts:479`).
- Impact: an authenticated manager (or a compromised/abusive beta account) can
  submit an arbitrarily long recipient list in one call and fan out unbounded
  Resend sends from your verified sender domain — sender-reputation / spam-list /
  Resend-quota risk, and a cost vector. The DB-backed limiter exists and is
  trivially reusable here.
- Recommendation: cap recipients per call (e.g. <=50) and add a
  `checkPublicationActionRateLimit` keyed on `[userId, publicationId]` (e.g.
  N sends / 15 min). Reuse the existing `SHARED_LINK_RECIPIENT_RESEND_SCOPE`
  pattern.
- Effort: S · existing_plan_overlap: none

### EMAIL-02 — Resend path does not honor a prior hard `bounced` status
- Severity: medium · launch_blocker: false · confidence: high
- Evidence: `resendSharedLinkRecipientEmail` checks `email_unsubscribed_at`
  (`src/lib/publication/actions.ts:1185`) but never checks
  `delivery_status === "bounced"` before re-sending; `addSharedLinkRecipients`
  likewise marks rows `sent`/`pending` and never suppresses known-bounced
  addresses. Webhook sets `bounced` (`resend-webhooks.ts:42-52`) but nothing
  reads it as a send gate.
- Impact: a manager can repeatedly resend to a hard-bounced address. Resend will
  eventually suppress, but repeated attempts against a suppressed/invalid address
  degrade sender reputation and waste quota.
- Recommendation: block resend when `delivery_status === "bounced"` (mirror the
  unsubscribe guard) unless the manager explicitly overrides after correcting the
  address.
- Effort: S · existing_plan_overlap: none

### EMAIL-03 — Unsubscribe POST treats a missing Origin header as same-origin
- Severity: medium · launch_blocker: false · confidence: high
- Evidence: `src/app/api/share/[token]/unsubscribe/route.ts:70` calls
  `assertSameOrigin`, which returns `{ ok: true }` when there is no `Origin`
  header (`src/lib/publication/security.ts:347-348`). The stricter sibling
  `assertSameOriginPublicPost` (`:358`) requires Origin AND a CSRF
  double-submit token. The unsubscribe mutation is also unauthenticated.
- Impact: limited — the mutation only sets `email_unsubscribed_at` and requires a
  valid `recipient_token` (a secret hashed in `public-repository.ts:809`), so an
  attacker needs the recipient's secret token to do anything. But a non-browser
  client (no Origin) can POST cross-context, and the design comment at
  `route.ts:69` claims "only our own interstitial form (same-origin) may submit" —
  the missing-Origin bypass weakens that stated guarantee.
- Recommendation: for this POST, treat a missing Origin as a reject (or adopt
  `assertSameOriginPublicPost` with the CSRF token already used elsewhere). Token
  secrecy is the real control; this is defense-in-depth alignment with the comment.
- Effort: S · existing_plan_overlap: none

### EMAIL-04 — Digest rate-limiter and email circuit-breaker are per-process (in-memory) on serverless
- Severity: medium · launch_blocker: false · confidence: high
- Evidence: owner-digest limiter is a module-level `Map` —
  `src/lib/publication/actions.ts:1285` (`digestRateLimit`),
  `shouldSendDigest` `:1288`, with the in-source caveat "resets on restart;
  production would use DB row or Redis" `:1284`. The email circuit breaker is
  also module-level arrays — `src/lib/email/resend-client.ts:78-80`.
- Impact: on Vercel each lambda instance has its own memory, so the 15-min digest
  throttle and the >50%-failure circuit breaker are per-instance, not global.
  Under concurrency/cold-starts the digest can exceed "1 per 15 min" and the
  circuit can fail to open globally. Degraded protection, not a correctness break
  (callers are best-effort and degrade gracefully).
- Recommendation: back the digest throttle with `security_rate_limit_events`
  (already used elsewhere) keyed on `publicationId`; optionally move circuit state
  to a tiny DB/KV table. Acceptable to defer for closed beta if documented.
- Effort: M · existing_plan_overlap: none

### EMAIL-05 — Sender DNS (SPF/DKIM/DMARC) and webhook registration are not proven by the readiness gates
- Severity: medium · launch_blocker: false (requires manual confirmation before broad send) · confidence: high
- Evidence: `scripts/check-resend-readiness.ts` checks only env-var *presence*
  and self-discloses it "does not prove sender/domain verification, DNS, webhook
  registration, delivery, bounce, complaint, or open events" (`:120`).
  `scripts/check-support-email-dns.ts` checks the *support* domain's
  MX/SPF/DMARC (`:93`) but not a DKIM selector and not the Resend *sending*
  domain. No automated assertion that the Resend production domain shows verified
  SPF/DKIM or that `/api/webhooks/resend` is registered.
- Impact: recipient invites could land in spam or be rejected if the sending
  domain's DKIM/DMARC are not actually verified at Resend. The live 2026-06-04
  reconciliation (current-state) proves one delivered event end-to-end, which is
  strong evidence the basics work — but there is no standing gate that keeps it
  true (e.g. after a domain or secret change).
- Recommendation: add a launch checklist step that confirms, in the Resend
  dashboard, the production sending domain shows verified SPF + DKIM and DMARC
  alignment, and that the webhook endpoint is enabled with the matching secret.
  Keep it as ops doc (out-of-band), not CI.
- Effort: S · existing_plan_overlap: partial:2026-06-01-security-owasp-compliance-audit
  (file 18 flagged webhook-verification monitoring; DNS posture itself was not a finding)

### EMAIL-06 — Collaboration invites send via Supabase Auth SMTP, a separate sender/deliverability surface from Resend
- Severity: low · launch_blocker: false · confidence: high
- Evidence: `sendSupabaseInviteEmail` calls
  `admin.auth.admin.inviteUserByEmail(...)`
  (`src/lib/collaboration/actions.ts:366`) — i.e. project/estimate collaborator
  invites go through Supabase's Auth email (default Supabase SMTP unless a custom
  SMTP is configured), NOT through Resend/`sendEmail`. The Resend readiness/DNS
  gates do not cover this path at all.
- Impact: two independent email senders with different DNS/deliverability/rate
  limits. Supabase's default SMTP is sharply rate-limited and uses a generic
  sender; closed-beta invite volume could be throttled or land in spam, and the
  sender domain differs from the Resend transactional domain (brand/DMARC
  inconsistency). This is a real operational surprise, not a vuln.
- Recommendation: decide intentionally — either configure custom SMTP in Supabase
  (ideally the same Resend domain) or document that invite email uses Supabase's
  sender with its limits. Add it to the launch DNS/sender checklist.
- Effort: S (config/doc) · existing_plan_overlap: none

### EMAIL-07 — Webhook has no dedicated idempotency/dedup store (relies on standardwebhooks replay tolerance + stale-event guard)
- Severity: info · launch_blocker: false · confidence: high
- Evidence: `recordResendEmailWebhookEvent` passes `svix-id`
  (`route.ts:46`) and stores it as `event_id` metadata, but there is no
  processed-event table. Idempotency rests on (a) `standardwebhooks` timestamp
  tolerance inside `verify()` and (b) the monotonic `resend_last_event_at`
  guard at `resend-webhooks.ts:193-198` that ignores out-of-order/stale events.
- Impact: none expected — the update is idempotent (status + last-event fields)
  and stale/duplicate events are dropped. Noted only so a future migration to
  non-idempotent side effects (e.g. counters) knows to add real dedup.
- Recommendation: keep as-is for launch; if webhook handling ever gains
  non-idempotent effects, add a unique processed-`svix-id` table.
- Effort: S (only if needed) · existing_plan_overlap: covered-by:2026-06-01-security-owasp-compliance-audit (A08 integrity)

### EMAIL-08 — Notification mark/dismiss uses service-role with manual user-scoping; RLS read path is correct
- Severity: info · launch_blocker: false · confidence: high
- Evidence: read/list path uses the RLS-scoped server client
  (`notifications/actions.ts:51,63,75`); mutations use
  `createSupabaseServiceRoleClient` and rely on the explicit
  `.eq("user_id", userId)` filter in `updateCurrentUserDeliveryState`
  (`repository.ts:153-163`) for the security boundary, because UPDATE is revoked
  from `authenticated` (`notification_system.sql:131-132`). `userId` comes from
  `requireCurrentUserContext()` and `deliveryId` is UUID-validated
  (`actions.ts:85,98,111`). `action_href` is constrained to `^/workshop` with
  traversal/scheme guards (`harden_notification_action_href.sql`).
- Impact: correct as written. Flagged so reviewers know the user-scoping is
  load-bearing: any future repository edit that drops the `.eq("user_id", …)`
  filter would let one user mutate another's deliveries (service-role bypasses
  RLS). Add a regression test asserting cross-user mark-read fails.
- Recommendation: add a unit test that the service-role mutation refuses a
  delivery owned by a different user (guards the invariant).
- Effort: S · existing_plan_overlap: covered-by:archived 2026-06-06-notification-system (RLS proven; this is a guardrail note)

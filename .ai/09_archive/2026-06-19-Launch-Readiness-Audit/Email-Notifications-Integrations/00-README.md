# Launch-Readiness — Email, Notifications & Integrations (Domain 13)

> Canonical status override: before implementing from this pack, read
> `../03-LAUNCH-GATE-DECISION-REGISTER.md` and `../08-IMPLEMENTATION-HANDOFF.md`.
> Pack-local blocker counts are historical/domain-scoped; the root register is authoritative
> for wider/external beta.

Part of the **2026-06-19 Launch-Readiness Audit**. This is a deletable plan-pack
header. If Philip rejects the pack, delete the whole
`.ai/03_plans/2026-06-19-Launch-Readiness-Audit/Email-Notifications-Integrations/`
directory — nothing else references it.

## Exact owner job
Make the outbound-email + in-app-notification + external-integration surface safe
to expose to closed-beta users: Resend transactional sends (shared-link recipient
invites, owner activity digests, collaborator-removal notices), Supabase-Auth
invite emails, the signed Resend delivery webhook, the recipient unsubscribe flow,
and the in-app notification system. Confirm signed-webhook integrity, sender/DNS
posture, send rate-limiting/abuse caps, unsubscribe + bounce honoring, notification
RLS, and secret handling are launch-grade.

## Routes / screens affected (remediation only — none touched yet)
- `POST /api/webhooks/resend` (Resend delivery events → `shared_link_recipients`)
- `GET|POST /api/share/[token]/unsubscribe` (recipient unsubscribe interstitial)
- Shared-link manager modal → Recipients tab (add / resend recipient emails)
- Project/estimate collaboration invite flow (Supabase Auth invite email)
- Workshop notification bell / center / release-announcement modal

## Files expected to change during remediation (scoped, additive)
- `src/lib/publication/actions.ts` — add rate-limit + recipient-count cap to
  `addSharedLinkRecipients`; honor `delivery_status==="bounced"` before resend.
- `src/lib/publication/security.ts` — tighten `assertSameOrigin` (treat
  missing Origin on the unsubscribe POST conservatively) OR switch the
  unsubscribe POST to `assertSameOriginPublicPost`.
- `src/lib/publication/actions.ts` (digest) + `src/lib/email/resend-client.ts`
  (circuit breaker) — move per-process state to a DB-backed window for serverless.
- Ops runbook (new doc) — DNS/SPF/DKIM/DMARC + dual-sender (Resend + Supabase
  Auth SMTP) verification checklist; no code.

## Non-goals
- Redesigning the notification UI or email templates (DESIGN.md is alpha guidance).
- Building Sentry/Turnstile (other domains / roadmap).
- Changing the webhook signature scheme (standardwebhooks/Svix is correct).
- RLS changes to notification tables (already correct — see findings).

## Validation gate
- `bun run launch:check-resend-readiness` (env presence) + a manual Resend
  dashboard check that the production domain shows verified SPF/DKIM and the
  `/api/webhooks/resend` endpoint is enabled with a matching secret.
- `bun run launch:check-support-dns` (or equivalent) for the sender domain,
  asserting `hasSpf && hasDmarc` and a DKIM selector.
- Targeted Vitest for any touched `publication/actions` / `security` helper.
- `bun run validate` is known-red on main (charts/design-lint, unrelated) —
  gate on the touched-area tests, not the whole suite.

## Deletion criteria
Delete this pack if Philip decides (a) the bulk-add abuse surface is acceptable
for closed beta (trusted managers only), and (b) the DNS/sender posture is already
confirmed out-of-band, and (c) the serverless in-memory-limiter caveat is accepted.

## Loop-surface selection
Lightweight in-session loop (proportional). The send-path + same-origin changes
touch security-adjacent code, so a Codex review pass is recommended before merge,
but no dated LOOP_LEDGER is mandated unless remediation expands to migrations.

## Durable-state path
Record outcomes in `.ai/10_state/current-state.md` (Email/Notifications section)
and decisions in `.ai/10_state/decisions.md`.

# Resend Email Readiness Evidence - 2026-06-02

Scope: read-only local/Vercel/source evidence for Resend-backed share/invite email readiness.

No email was sent. No provider dashboard, DNS, webhook configuration, or production environment value was mutated or exposed.

## Source Surface

| Surface | Current evidence | Launch meaning |
| --- | --- | --- |
| Email client | `src/lib/email/resend-client.ts` uses `RESEND_API_KEY` outside tests and falls back to mocked success when no key/client is available. | Local tests can pass without real delivery; provider proof is required before launch-ready email claims. |
| Sender config | `sendEmail()` defaults to `RESEND_FROM` when set, otherwise `Archestimator <no-reply@archestimator.com>`. | A verified sender/domain must be configured before visible email flows are launch-ready. |
| Webhook route | `src/app/api/webhooks/resend/route.ts` returns `503` when `RESEND_WEBHOOK_SECRET` is absent, verifies raw-body Svix headers when present, and records delivery events. | Webhook delivery proof cannot pass without the secret and provider webhook setup. |
| Visible email flows | `src/lib/publication/actions.ts` and `src/lib/collaboration/actions.ts` call `sendEmail()` for shared-link recipients, owner digests, and invite/resend paths. | Resend is P0 for these visible email-dependent workflows unless they are intentionally disabled/deferred. |

## Read-Only Env Evidence

```bash
vercel env ls --non-interactive
```

Result: pass for read-only command; Vercel returned `No Environment Variables found`.

```bash
# key-presence check only; values were not printed
RESEND_API_KEY=present
RESEND_FROM=missing_or_empty
RESEND_REPLY_TO=missing_or_empty
RESEND_WEBHOOK_SECRET=missing_or_empty
```

Result: local `.env.local` has a Resend API key, but the sender, reply-to, and webhook secret are missing or empty.

`.env.example` still documents the required launch variables:

- `RESEND_API_KEY`
- `RESEND_FROM`
- `RESEND_REPLY_TO`
- `RESEND_WEBHOOK_SECRET`

## Existing Test Evidence

`tests/vitest/resend-webhook-delivery.test.ts` already guards the local webhook and delivery-reconciliation contract:

- durable `shared_link_recipients` delivery columns exist in migrations/types,
- the webhook route reads raw body text instead of `req.json()`,
- webhook verification requires `RESEND_WEBHOOK_SECRET`,
- recipient email sends are tagged with `shared_link_recipient_id`,
- Resend opened/failed events map to recipient delivery status updates.

## Launch Meaning

- This is negative/blocked provider readiness evidence.
- Manual beta invite email can remain outside Resend only if in-app share/invite email workflows are not treated as launch-ready.
- Visible shared-link recipient email, owner digest, collaboration invite, and resend flows must not be considered launch-ready until Vercel env values, verified sender/domain/DNS, a configured webhook secret, and real delivery/bounce/open webhook evidence are archived.

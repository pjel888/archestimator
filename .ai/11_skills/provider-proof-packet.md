# Provider Proof Packet Playbook

Use this when a claim inherently requires redacted external/provider evidence.
`wrangler.jsonc` is executable provider truth.

## Current Provider Scope

Standing repository authority is limited to the bound Cloudflare resources:

- Worker `archestimator-proof`
- D1 `ARCH_DB`
- R2 `ARCH_UPLOADS_R2`
- Durable Objects `COLLAB_ROOMS`, `GLOBAL_PRESENCE`, `SUPPORT_INBOX`
- Queues `UPLOAD_JOBS_QUEUE`, `CLIENT_PORTAL_NOTIFICATIONS_QUEUE`
- Images `IMAGES`
- Email `EMAIL`
- configured cron triggers

Legacy Vercel, Supabase, and Resend assumptions are not current provider proof.
Never mutate legacy `supabase/migrations/` or unrelated provider projects.

## Required Labels

- `local-only`: source, diff, static, dry-run, or local runtime evidence.
- `provider-proven`: redacted readback from the exact bound Cloudflare resource.
- `manual-proof-pending`: hosted behavior, operator confirmation, legal/support,
  OAuth, email delivery, or browser behavior not actually observed.

## Packet Fields

- claim and success criterion
- bound provider/resource
- timestamp and environment
- operator/tool and action performed
- sanitized resource IDs/status/counts/hashes
- proof artifact path
- secrets and customer-data redaction statement
- local-only versus provider-proven boundary
- remaining gaps
- restore/recovery note when relevant

## Safety

Source inspection and local redacted proof preparation are safe defaults. Actual
external deployment, paid add-ons, unbound resources, irreversible data loss,
credential-gated actions, destructive restores, or external notifications need
exact authority. Never store secrets, raw provider logs, cookies, tokens, private
URLs, customer data, or recipient addresses in `.ai`.

# Cloudflare Hosted Recipient Composer UI Proof

Generated: 2026-07-02T04:51:10Z

Result: **PASS** for the owner-side hosted recipient composer UI.

- Browser route: `https://archestimator.com/workshop/publisher?project=bd9a8e68-4e24-49d8-aeed-e4651b7cab0b`
- Publication: `337f1427-2dd1-4ff4-b89f-5e518aecb66e`
- Entered synthetic reviewer: `codex-owner-ui-20260702t045000z@example.invalid`
- Visible result: `Added 1 recipient(s). 1 email(s) dispatched (failures are non-fatal).`
- Recipient row visible in Publisher UI with status `sent`.

## Remote D1 Readback

Remote D1 `archestimator-proof-db` returned one matching row:

- `id=6b3fe7c0-6375-4e9f-957c-7d08e37c38c0`
- `delivery_status=sent`
- `invited_by=4e23801d-6fc2-4886-b980-d15ca2b164b8`
- `invited_at=2026-07-02T04:51:02.968Z`
- `resend_email_id=<tnrlpMmIgSeAqsK2d1naMLUKwTgBKR5IbvOP@archestimator.com>`
- Served by APAC/SIN primary with `rows_read=1`.

## Boundary

The database column is still named `resend_email_id` for historical schema compatibility, but the runtime dependency scan remains Cloudflare-only. This proof used an `example.invalid` recipient address, so it proves composer UI, D1 persistence, and outbound dispatch/message-id recording, not a recipient mailbox receipt.

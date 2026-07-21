# Support Email Operator Runbook

Local code readiness is separate from live mailbox activation. Do not treat
source checks as production proof.

## Retention

- Conversation and message bodies live in D1 (`support_conversations`,
  `support_messages`).
- Attachment bytes live in R2 under `support-email/...`.
- Raw MIME is not retained by default after successful parse.
- Profile deletion sets `user_id` to NULL and preserves history when requester
  email/name remain; privacy erase for a profile redacts that user’s in-app
  support content.
- External-sender deletion requests must locate rows by persisted
  `requester_email` / conversation id through the existing privacy workflow
  extension path (not auto-wired in this change).

## Recommended activation order

1. Inspect live MX / SPF / DKIM / DMARC for `archestimator.com`.
2. Document any existing Namecheap/Gmail forwarding that MX changes would replace.
3. Confirm the domain uses Cloudflare DNS.
4. Onboard Email Sending: `npx wrangler email sending enable archestimator.com`
5. Verify DNS records Cloudflare requires for sending.
6. Confirm `support@archestimator.com` is an allowed/usable sender.
7. Confirm the Workers plan supports arbitrary-recipient transactional sending.
8. Onboard Email Routing for the domain (dashboard or
   `npx wrangler email routing enable`).
9. Create exactly one routing rule:
   - pattern: `support`
   - domain: `archestimator.com`
   - action: Send to a Worker
   - Worker: deployed `archestimator-proof`
10. Enable subaddressing if using `support+<token>@...` reply correlation.
11. Keep catch-all disabled.
12. Optionally verify a personal fallback destination, then set:
    - `ARCHESTIMATOR_SUPPORT_FORWARD_ENABLED=true`
    - `ARCHESTIMATOR_SUPPORT_FORWARD_TO=<verified address>`
13. Set Worker vars/secrets (name-only in reports):
    - existing outbound email vars
    - `ARCHESTIMATOR_INBOUND_EMAIL_ENABLED=true`
    - support mailbox/from/alias vars
14. Apply D1 migration `0095_support_email_inbox.sql` to the bound `ARCH_DB`.
15. Deploy only after explicit authorization.
16. Run the controlled external smoke plan from the implementation prompt.
17. Record hosted evidence separately from local static checks.

## DMARC posture

Observe with `p=none`, confirm legitimate senders, then quarantine, then reject
only after verified alignment. DNS presence is not deliverability proof.

## ceo@ alias

Do not block support on `ceo@`. Prefer personal forwarding first; the schema
already persists `mailbox_address` for a later alias if needed.

## Admin send identities

Admin support email uses a fixed local registry with two same-domain identities:
`support@<support-mailbox-domain>` and `philip@<support-mailbox-domain>`. The
selected identity controls the provider From address and display name only.
Replies always route through the configured canonical support mailbox (including
its conversation plus-address), so a visible From selection never changes inbound
routing.

Registry validation proves local configuration only. It does not prove DNS,
provider acceptance, delivery, or inbox placement; verify those conditions with
the provider before enabling outbound delivery.

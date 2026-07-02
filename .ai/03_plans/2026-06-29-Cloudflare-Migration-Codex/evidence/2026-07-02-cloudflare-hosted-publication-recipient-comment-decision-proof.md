# Cloudflare Hosted Publication Recipient/Comment/Decision Proof

Generated: 2026-07-02T04:45:52.905Z

Result: **PASS** for the hosted Cloudflare recipient session/comment/decision path.

- Base URL: `https://archestimator.com`
- Worker/D1 surface: production Cloudflare Worker + remote D1 `archestimator-proof-db`
- Publication: `337f1427-2dd1-4ff4-b89f-5e518aecb66e`
- Estimate/row: `985f6690-741e-4136-9fa1-a4896cd364e4` / `878e98e0-6a5a-4e58-ac42-4b73284eae4d`
- Token handling: publication token, synthetic recipient token, and recipient token hash are redacted.

## Hosted Requests

- Inserted one synthetic recipient into remote D1: success, `changed_db=true`, APAC/SIN primary, `rows_written=7`.
- Started the hosted recipient session through `GET /api/share/[token]/session?recipient=[redacted]`: final `200`, one redirect to the redacted shared page, two `shared_link_session_*` cookie entries persisted.
- Posted a recipient comment through `POST /api/share/[token]/comment`: `201`, comment id `0199faf4-d460-4a8b-9103-2c6e26ded2f5`, target row labels resolved from snapshot version `2`.
- Submitted a recipient decision through `POST /api/share/[token]/decision`: `201`, decision id `f06de334-7768-4eb4-bf33-68362b2022f6`, decision `revision_requested`.
- Read back hosted comments/decision through GET routes: both `200`; comments count `1`; decision returned as final `revision_requested`.

## Remote D1 Readback

- Recipient `75eba67a-0335-4084-a542-889dd2622861` was marked `opened` with `last_opened_at=2026-07-02T04:45:39.177Z`.
- Comment row persisted with body `Cloudflare hosted recipient comment proof 20260702T044528Z`, estimate/row IDs matching the live smoke estimate, and `snapshot_version_at_comment=2`.
- Response row persisted with decision `revision_requested`, note `Cloudflare hosted recipient decision proof 20260702T044528Z`, matching estimate/row IDs, and `snapshot_version_at_decision=2`.
- Shared-link event readback contains the recipient `open` event.

## Boundary

This proves the hosted Cloudflare recipient-session, public comment, public decision, and D1 persistence paths. It used a synthetic recipient inserted directly into D1 to avoid sending a real invite email; therefore it does not prove the owner-side recipient composer/email-delivery UI in this artifact.

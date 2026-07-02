# Cloudflare Hosted Publication Owner/Public Proof

Generated: 2026-07-02T01:29:00Z

## Result

PARTIAL PASS. The signed-in production Publisher UI created a hosted shared
proposal, remote D1 persisted it, and a fresh unauthenticated browser rendered
the public share page from `archestimator.com`.

The named recipient session, comment, and decision/response flows are still a
separate hosted proof gap.

## Evidence

| Probe | Result |
| --- | --- |
| Owner UI | Publisher drawer for `Codex Cloudflare Smoke 2026-07-01` changed from `DRAFT` to `ACTIVE` after `Generate shared link`; `Shared link ready` appeared; Copy/Open link controls became available. |
| Sheet scope | `ES-001 — ES-001 Estimate` was the only selected client-visible sheet. |
| Remote D1 publication | `project_publications.id=337f1427-2dd1-4ff4-b89f-5e518aecb66e`, `status=published`, `snapshot_version=1`, selected estimate `985f6690-741e-4136-9fa1-a4896cd364e4`, encrypted token present, token hash present. |
| D1 provider metadata | Query served by Cloudflare D1 `v3-prod`, APAC/SIN primary, read-only query with `rows_written=0` and `changed_db=false`. |
| Public share curl | `https://archestimator.com/share/[redacted]` returned HTTP `200`, no redirects, private no-store, HSTS, CSP, `X-Frame-Options: DENY`, `X-Robots-Tag: noindex, nofollow`; body contained project and `ES-001` markers and zero `state_mismatch` matches. |
| Fresh public browser | Unauthenticated Chromium rendered title `Proposal Review | Archestimator — Archestimator`, heading `Codex Cloudflare Smoke 2026-07-01`, `ES-001` markers, no sign-in wall, no not-found/expired/revoked text, and no `state_mismatch`. |
| D1 open events | `project_publication_events` recorded two `open` events for the publication after the public-route checks. |
| Recipient tables | `shared_link_recipients` and `shared_link_events` had no rows for this publication, so personalized recipient proof remains open. |

## Conclusion

Hosted owner publish and public proposal open are working on Cloudflare Worker +
D1. This closes the owner-create/public-open slice of P0-PUBLISH; named
recipient invite/session/comment/decision still needs a separate hosted proof.

The bearer share token is intentionally redacted from this artifact.

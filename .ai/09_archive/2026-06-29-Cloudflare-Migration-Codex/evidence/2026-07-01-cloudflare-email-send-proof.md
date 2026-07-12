# Cloudflare Email Send Proof

Generated: 2026-07-01T07:34:20.000Z

Cloudflare Email Sending is enabled for `archestimator.com`, and one outbound arbitrary-recipient proof email was sent through Wrangler and received in the owner's Gmail mailbox.

## Summary

| Item | Value |
| --- | --- |
| Sending domain | archestimator.com |
| Sender | noreply@archestimator.com |
| Subject token | Archestimator Cloudflare Email proof 20260701T073355Z |
| Wrangler send result | Email sent successfully |
| Gmail receipt | yes |
| Received at | 2026-07-01T07:33:59Z |
| Production email send proof ready | yes |

## DNS

| Record class | Observed |
| --- | --- |
| MX for return-path domain | yes |
| SPF for return-path domain | yes |
| DKIM for selector | yes |
| DMARC | yes, public policy currently `p=none` |

## Notes

- The proof is sanitized: it does not include raw provider tokens, Worker secret values, or a full recipient email address.
- Public DNS showed DMARC `p=none` while Wrangler's DNS helper prints a `p=reject` TXT recommendation. Readiness and send/receipt proof passed; DMARC tightening remains a policy decision.

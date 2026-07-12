# Cloudflare Worker Custom Domain Provider Proof

Generated: 2026-06-30T12:47:14.302Z

Source: Codex Cloudflare MCP API read/write after owner-authorized Cloudflare migration execution.

## Result

Cloudflare API readback now shows both Worker custom domains enabled:

| Hostname | Worker | Environment | Enabled |
| --- | --- | --- | --- |
| archestimator.com | archestimator-proof | production | yes |
| www.archestimator.com | archestimator-proof | production | yes |

## DNS Record Changes

The first API attach attempt failed because the imported pending-zone DNS still had conflicting Vercel records on the target hostnames. Codex removed only those exact pending-zone conflicts:

| Type | Name | Previous content |
| --- | --- | --- |
| A | archestimator.com | 216.150.1.1 |
| CNAME | www.archestimator.com | bb7ab57cfa50fcad.vercel-dns-017.com |

Cloudflare then created proxied originless Worker-domain records:

| Type | Name | Content | Proxied |
| --- | --- | --- | --- |
| AAAA | archestimator.com | 100:: | yes |
| AAAA | www.archestimator.com | 100:: | yes |

## Remaining Blocker

Public DNS still delegates `archestimator.com` to Namecheap nameservers, so the Cloudflare zone remains pending. Production traffic will not reach these Worker custom domains until registrar nameservers are changed to:

- carl.ns.cloudflare.com
- ziggy.ns.cloudflare.com

This is provider API proof only; it does not prove public DNS delegation, live custom-domain traffic, authenticated production traffic, Vercel/Supabase/Resend removability, or registrar-side nameserver completion.

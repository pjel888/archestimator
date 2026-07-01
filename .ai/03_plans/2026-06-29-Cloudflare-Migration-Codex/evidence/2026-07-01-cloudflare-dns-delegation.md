# Cloudflare DNS Delegation

Generated: 2026-07-01T06:51:06.031Z
Source: .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-06-30-cloudflare-provider-readiness-source.json
Zone: archestimator.com
Public DNS checked: yes
Nameservers active: yes
Custom-domain HTTPS checked: yes
Custom-domain HTTPS ready: yes
Cloudflare DNS imported record count: 9
Cloudflare DNS import reviewed: yes
Cloudflare DNS record list captured: yes

Public DNS/custom-domain preflight check only. It resolves public DNS records and, when enabled, performs credential-free HTTPS HEAD checks for the Cloudflare zone. It does not call Cloudflare APIs, does not read env files, does not print secrets, does not deploy, does not change DNS/nameservers/resources/billing, and does not make Vercel/Supabase/Resend removable.

## Nameservers

| Source | Nameservers |
| --- | --- |
| Cloudflare assigned | carl.ns.cloudflare.com, ziggy.ns.cloudflare.com |
| Sanitized registrar evidence | dns1.registrar-servers.com, dns2.registrar-servers.com |
| Public DNS NS lookup | carl.ns.cloudflare.com, ziggy.ns.cloudflare.com |

## Cloudflare DNS Record List

| Name | Type | Content | Proxy status | TTL | Priority |
| --- | --- | --- | --- | --- | ---: |
| archestimator.com | MX | eforward5.registrar-servers.com | DNS only | Auto | 20 |
| archestimator.com | MX | eforward4.registrar-servers.com | DNS only | Auto | 15 |
| archestimator.com | MX | eforward3.registrar-servers.com | DNS only | Auto | 10 |
| archestimator.com | MX | eforward2.registrar-servers.com | DNS only | Auto | 10 |
| archestimator.com | MX | eforward1.registrar-servers.com | DNS only | Auto | 10 |
| archestimator.com | TXT | "v=spf1 include:spf.efwd.registrar-servers.com ~all" | DNS only | Auto |  |
| _dmarc.archestimator.com | TXT | "v=DMARC1; p=none;" | DNS only | Auto |  |
| archestimator.com | Worker | archestimator-proof | Proxied | Auto |  |
| www.archestimator.com | Worker | archestimator-proof | Proxied | Auto |  |

## Public DNS Record Snapshot

| Hostname | Type | Values | Error |
| --- | --- | --- | --- |
| archestimator.com | A | 104.21.74.99, 172.67.201.196 |  |
| archestimator.com | AAAA | 2606:4700:3034::ac43:c9c4, 2606:4700:3037::6815:4a63 |  |
| archestimator.com | CNAME | (none) |  |
| archestimator.com | MX | 10 eforward1.registrar-servers.com, 10 eforward2.registrar-servers.com, 10 eforward3.registrar-servers.com, 15 eforward4.registrar-servers.com, 20 eforward5.registrar-servers.com |  |
| archestimator.com | TXT | v=spf1 include:spf.efwd.registrar-servers.com ~all |  |
| www.archestimator.com | CNAME | bb7ab57cfa50fcad.vercel-dns-017.com |  |
| www.archestimator.com | A | 216.198.79.65, 64.29.17.65 |  |
| www.archestimator.com | AAAA | (none) |  |
| _dmarc.archestimator.com | TXT | v=DMARC1; p=none; |  |

## Custom-Domain HTTPS Checks

| Hostname | URL | Ready | Status | Server | CF-Ray | Error |
| --- | --- | --- | ---: | --- | --- | --- |
| archestimator.com | https://archestimator.com/ | yes | 200 | cloudflare | a1437acf7e04c613-SIN |  |
| www.archestimator.com | https://www.archestimator.com/ | yes | 200 | cloudflare | a1437adbba73a071-SIN |  |

## Current Public Provider Signals

- Public MX still uses Namecheap email forwarding.
- Public SPF still references Namecheap email forwarding.
- Public www DNS still resolves through Vercel.

## Blockers

- (none)

# Cloudflare Observability Proof

Generated: 2026-06-30T08:17:30.000Z
Source: Cloudflare Workers Observability MCP
Worker: archestimator-proof
Observed version: 722234d9-7e09-4c31-b1ba-a036fb595006
Window: 2026-06-30T08:14:00Z to 2026-06-30T08:18:00Z

Sanitized Cloudflare Workers Observability proof for the deployed proof Worker. It records sampled provider telemetry for harmless public-route probe traffic and does not expose request IPs, headers, secrets, cookies, DNS mutations, billing changes, or production cutover readiness.

## Summary

| Gate | Ready |
| --- | --- |
| Workers Observability receiving data | yes |
| Current Worker version observed | yes |
| Probe events observed | yes |
| Analytics/observability ready | yes |
| Production cutover | no |

## Sampled Provider Metrics

| Path | Status | Events | p95 wall ms | p95 CPU ms |
| --- | ---: | ---: | ---: | ---: |
| /contact | 200 | 10 | 49 | 40 |
| /trust | 200 | 10 | 110 | 101 |

Traffic probe sent 40 harmless public-route GET requests; all returned HTTP 200.

## Blockers

- (none)

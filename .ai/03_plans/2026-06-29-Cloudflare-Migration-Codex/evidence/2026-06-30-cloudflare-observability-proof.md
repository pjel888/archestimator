# Cloudflare Observability Proof

Generated: 2026-06-30T11:27:15.000Z
Source: Cloudflare Workers Observability MCP
Worker: archestimator-proof
Observed version: 0db6e2b7-de5e-4a37-ba67-0e59feecc709
Window: 2026-06-30T11:20:00Z to 2026-06-30T11:30:00Z

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
| /workshop | 307 | 30 | 6 | 5 |
| /access-required | 200 | 10 | 13 | 9 |
| /api/share/not-a-real-hosted-worker-share-token | 404 | 10 | 316 | 13 |
| /api/projects/images | 404 | 10 | 4 | 3 |

Traffic came from `cf:verify-hosted-routes` and `cf:verify-hosted-performance` proof probes. The route contracts passed with expected 200/307/404 statuses. Strict client-observed p95 budgets still showed local/network jitter on cache HIT static pages; the sampled provider Worker telemetry above stayed low for observed Worker-executed paths.

## Blockers

- (none)

# Cloudflare Observability Proof

Generated: 2026-07-01T07:25:00.000Z

Source: Cloudflare Workers Observability MCP

Worker: `archestimator-proof`

Current Worker version observed: `3e06ceb1-de53-4a45-8672-29a77b5faeff`

Sanitized Cloudflare Workers Observability proof for the deployed proof Worker. It records sampled provider telemetry for harmless public-route probe traffic and does not expose request IPs, headers, secrets, cookies, DNS mutations, billing changes, or production cutover readiness.

## Summary

| Check | Ready |
| --- | --- |
| Workers Observability receiving data | yes |
| Current Worker version observed | yes |
| Probe events observed | yes |
| Analytics/observability ready | yes |
| Production cutover ready | no |

## Sampled Statuses

| Status | Events | P95 wall | P95 CPU | Max wall |
| ---: | ---: | ---: | ---: | ---: |
| 200 | 60 | 63ms | 35ms | 63ms |
| 404 | 30 | 109ms | 15ms | 109ms |
| 307 | 20 | 6ms | 3ms | 6ms |

## Sampled Paths

| Path | Status | Events | P95 wall | P95 CPU | Max wall |
| --- | ---: | ---: | ---: | ---: | ---: |
| `/api/share/not-a-real-hosted-worker-share-token` | 404 | 30 | 109ms | 15ms | 109ms |
| `/workshop` | 307 | 20 | 6ms | 3ms | 6ms |
| `/access-required` | 200 | 20 | 38ms | 25ms | 38ms |
| `/contact` | 200 | 20 | 63ms | 35ms | 63ms |
| `/trust` | 200 | 10 | 2ms | 1ms | 2ms |
| `/privacy` | 200 | 10 | 50ms | 33ms | 50ms |

Credential-free route contracts passed. Strict client p95 budgets still showed local/network jitter on cache HIT static pages; provider Worker telemetry stayed low for observed Worker-executed paths. Static cache HIT pages are partly absent from Worker logs because Cloudflare serves them from edge cache.

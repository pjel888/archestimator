# Cloudflare Platform Toolchain Snapshot

Generated: 2026-06-29T19:53:46.255Z

Local Cloudflare toolchain snapshot only. It validates installed package versions, Wrangler schema/config support, compatibility-date freshness, nodejs_compat, generated type coverage, and binding names without reading env files or provider secrets. It does not prove Wrangler/API authentication, hosted deployment, custom domains, remote bindings, provider usage, observability receipt, Workers Paid, or production cutover readiness.

## Readiness

| Gate | Ready |
| --- | --- |
| Local toolchain snapshot ready | yes |
| Direct workers-types package installed | no |
| Production deploy ready | no |

## Versions

| Package | Version |
| --- | --- |
| wrangler | 4.105.0 |
| @opennextjs/cloudflare | 1.20.1 |
| @cloudflare/workers-types | missing |
| next | 16.2.6 |
| typescript | 6.0.3 |

## Wrangler Config

| Check | Value |
| --- | --- |
| Parsed | yes |
| Name | archestimator-proof |
| Main | worker.ts |
| Compatibility date | 2026-06-29 |
| Compatibility date age days | 0 |
| Compatibility date within 30 days | yes |
| nodejs_compat enabled | yes |
| Observability configured | yes |
| Observability enabled | true |
| Observability sample rate | 0.1 |
| Logs enabled | true |
| Logs sample rate | 0.1 |
| Invocation logs | true |
| Logs persisted | true |
| Traces enabled | true |
| Traces sample rate | 0.05 |
| Traces persisted | true |
| Cron count | 2 |
| Configured keys supported by schema | yes |
| Unsupported keys |  |

## Generated Binding Types

| Binding | Present in generated types |
| --- | --- |
| ARCH_DB | yes |
| ARCH_UPLOADS_R2 | yes |
| ASSETS | yes |
| COLLAB_ROOMS | yes |
| IMAGES | yes |

Runtime types line: // Runtime types generated with workerd@1.20260625.1 2026-06-29 nodejs_compat

# Cloudflare Wrangler Deploy Dry-Run

Generated: 2026-07-03T19:03:53.539Z

Local Wrangler deploy dry-run only. It compiles/checks the Worker bundle and exits before upload. It does not prove Cloudflare authentication, hosted deployment, custom domains, remote bindings, Workers Paid, request handling, production traffic, logs/observability receipt, DNS cutover, or provider rollback.

## Readiness

| Gate | Ready |
| --- | --- |
| Local Wrangler dry-run ready | yes |
| Production deploy ready | no |

## Dry-Run

| Check | Value |
| --- | --- |
| Exit code | 0 |
| Dry-run marker seen | yes |
| Asset files read | 289 |
| Total upload KiB | 25204.46 |
| Gzip upload KiB | 5395.01 |
| Warnings | (none) |
| Missing required bindings | (none) |

## Bindings

| Binding | Resource | Type |
| --- | --- | --- |
| ARCH_DB | 363c756a-7c4d-42fe-908f-6d328bfa4acb | D1 Database |
| ARCH_UPLOAD_HOSTED_BODY_LIMIT_BYTES | "4194304" | Environment Variable |
| ARCH_UPLOAD_HOSTED_CONCURRENT_UPLOADS | "3" | Environment Variable |
| ARCH_UPLOAD_HOSTED_MEMORY_MB | "128" | Environment Variable |
| ARCH_UPLOAD_HOSTED_ROUTE_DURATION_MS | "30000" | Environment Variable |
| ARCH_UPLOAD_STORAGE_LATENCY_P95_MS | "250" | Environment Variable |
| ARCH_UPLOADS_R2 | archestimator-proof-uploads | R2 Bucket |
| ASSETS |  | Assets |
| COLLAB_ROOMS | CollaborationRoom | Durable Object |
| EMAIL | unrestricted | Send Email |
| IMAGES |  | Images |
| UPLOAD_JOBS_QUEUE | archestimator-upload-jobs | Queue |

## Bundle

| Check | Value |
| --- | --- |
| Metafile read | yes |
| Metafile inputs | 680 |
| Metafile outputs | 2 |
| Metafile output bytes | 63219877 |

| Generated file | Bytes |
| --- | ---: |
| .wrangler/tmp/cloudflare-deploy-dry-run/worker.js | 25809363 |
| .wrangler/tmp/cloudflare-deploy-dry-run/worker.js.map | 37410514 |
| .wrangler/tmp/cloudflare-deploy-dry-run/metafile.json | 699553 |
| .wrangler/tmp/cloudflare-deploy-dry-run/README.md | 120 |

## Sanitized Log

```text
 ⛅️ wrangler 4.105.0 (update available 4.107.0)
───────────────────────────────────────────────
✨ Read 289 files from the assets directory <repo>/.open-next/assets
Total Upload: 25204.46 KiB / gzip: 5395.01 KiB
Your Worker has access to the following bindings:
Binding                                                                               Resource
env.COLLAB_ROOMS (CollaborationRoom)                                                  Durable Object
env.EMAIL (unrestricted)                                                              Send Email
env.UPLOAD_JOBS_QUEUE (archestimator-upload-jobs)                                     Queue
env.ARCH_DB (363c756a-7c4d-42fe-908f-6d328bfa4acb)                                    D1 Database
env.ARCH_UPLOADS_R2 (archestimator-proof-uploads)                                     R2 Bucket
env.IMAGES                                                                            Images
env.ASSETS                                                                            Assets
env.ARCH_UPLOAD_HOSTED_MEMORY_MB ("128")                                              Environment Variable
env.ARCH_UPLOAD_HOSTED_BODY_LIMIT_BYTES ("4194304")                                   Environment Variable
env.ARCH_UPLOAD_HOSTED_ROUTE_DURATION_MS ("30000")                                    Environment Variable
env.ARCH_UPLOAD_HOSTED_CONCURRENT_UPLOADS ("3")                                       Environment Variable
env.ARCH_UPLOAD_STORAGE_LATENCY_P95_MS ("250")                                        Environment Variable
--dry-run: exiting now.
```

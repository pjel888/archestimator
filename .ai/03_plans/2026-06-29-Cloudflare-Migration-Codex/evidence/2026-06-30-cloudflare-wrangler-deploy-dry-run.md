# Cloudflare Wrangler Deploy Dry-Run

Generated: 2026-06-30T03:01:02.668Z

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
| Asset files read | 302 |
| Total upload KiB | 20431.97 |
| Gzip upload KiB | 4432.44 |
| Warnings | (none) |
| Missing required bindings | (none) |

## Bindings

| Binding | Resource | Type |
| --- | --- | --- |
| ARCH_DB | 363c756a-7c4d-42fe-908f-6d328bfa4acb | D1 Database |
| ARCH_UPLOADS_R2 | archestimator-proof-uploads | R2 Bucket |
| ASSETS |  | Assets |
| COLLAB_ROOMS | CollaborationRoom | Durable Object |
| IMAGES |  | Images |
| UPLOAD_JOBS_QUEUE | archestimator-upload-jobs | Queue |

## Bundle

| Check | Value |
| --- | --- |
| Metafile read | yes |
| Metafile inputs | 50 |
| Metafile outputs | 2 |
| Metafile output bytes | 50292260 |

| Generated file | Bytes |
| --- | ---: |
| .wrangler/tmp/cloudflare-deploy-dry-run/worker.js | 20922341 |
| .wrangler/tmp/cloudflare-deploy-dry-run/worker.js.map | 29369919 |
| .wrangler/tmp/cloudflare-deploy-dry-run/metafile.json | 65672 |
| .wrangler/tmp/cloudflare-deploy-dry-run/README.md | 120 |

## Sanitized Log

```text
 ⛅️ wrangler 4.105.0
────────────────────
✨ Read 302 files from the assets directory <repo>/.open-next/assets
Total Upload: 20431.97 KiB / gzip: 4432.44 KiB
Your Worker has access to the following bindings:
Binding                                                           Resource
env.COLLAB_ROOMS (CollaborationRoom)                              Durable Object
env.UPLOAD_JOBS_QUEUE (archestimator-upload-jobs)                 Queue
env.ARCH_DB (363c756a-7c4d-42fe-908f-6d328bfa4acb)                D1 Database
env.ARCH_UPLOADS_R2 (archestimator-proof-uploads)                 R2 Bucket
env.IMAGES                                                        Images
env.ASSETS                                                        Assets
--dry-run: exiting now.
```

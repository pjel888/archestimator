# Cloudflare Worker Version Upload Resolved

Generated: 2026-06-30T06:32:00Z

## Result

- Upload blocker resolved: yes
- Active proof Worker: `archestimator-proof`
- Active proof URL: `https://archestimator-proof.philipjonlewis.workers.dev`
- Current deployed version: `79e6814f-51d5-42b2-8d1d-35a643a691ee`
- Deployment: `a31f8161-c41b-4e98-88e9-a55978e54189`
- Deployment percentage: 100
- Production cutover ready: no

## What Changed

The earlier blocker artifact captured repeated uploads that appeared stalled after asset handling. Later runs showed the full OpenNext upload path can simply take several minutes without useful progress output. Letting the command continue produced accepted Worker versions and successful 100% deployments.

## Successful Uploads

| Version | Tag | Uploaded/deployed | Upload duration | Startup |
| --- | --- | --- | ---: | ---: |
| `fedcc0e2-0a02-4311-8eed-06301eecc5e0` | `static-public-route-speed` | uploaded `2026-06-30T05:51:09.691876Z`, deployed `2026-06-30T05:54:05.950373Z` | 254.69s | 32ms |
| `79e6814f-51d5-42b2-8d1d-35a643a691ee` | `public-static-cache-policy` | uploaded `2026-06-30T06:24:59.465687Z`, deployed `2026-06-30T06:25:27.458601Z` | 529.82s | 28ms |

The latest upload reported 1 new asset (`/BUILD_ID`) and total upload size of 14565.93 KiB raw / 4013.70 KiB gzip.

## Post-Resolution Proof

- Hosted route matrix: pass (`evidence/2026-06-30-cloudflare-hosted-route-proof.{json,md}`)
- Hosted credential-free p95 performance: pass (`evidence/2026-06-30-cloudflare-hosted-performance.{json,md}`)
- Public static page cache policy: `s-maxage=31536000`
- Provider resource readback: Worker deployment, D1, R2, Queues, and Worker secret names pass (`evidence/2026-06-30-cloudflare-provider-resource-readback.{json,md}`)

## Remaining Blockers

- Worker custom-domain routing and Cloudflare nameserver cutover are not active.
- Full D1/Auth/Realtime production proof is still incomplete.
- Cloudflare Images provider proof, Cron/Queues provider execution, Web Analytics/Workers Observability receipt, and production cost inputs remain incomplete.

This supersedes `evidence/2026-06-30-cloudflare-worker-version-upload-blocker.{json,md}` as the current upload status.

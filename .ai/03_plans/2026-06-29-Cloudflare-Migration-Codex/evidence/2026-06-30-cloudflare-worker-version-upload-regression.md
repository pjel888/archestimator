# Cloudflare Worker Version Upload Regression

Generated: 2026-06-30T15:43:36Z

Status: FAIL. The current OpenNext Worker bundle builds locally and asset upload succeeds, but Cloudflare's Worker versions endpoint repeatedly times out before creating a new version. Minified and no-bundle deploy retries reduced/reshaped upload payloads but hit the same endpoint timeout.

## Attempts

| Attempt | Command shape | Asset phase | Version endpoint result | New version |
| --- | --- | --- | --- | --- |
| 1 | `wrangler versions upload --keep-vars` | 1 changed asset uploaded | first `POST /workers/scripts/archestimator-proof/versions` hit `UND_ERR_HEADERS_TIMEOUT`; command was interrupted after no version appeared | no |
| 2 | `wrangler versions upload --keep-vars --no-upload-source-maps` | no updated assets | retried for about 15.4 minutes, then exited `fetch failed` after repeated `UND_ERR_HEADERS_TIMEOUT` | no |
| 3 | `wrangler deploy --minify --keep-vars --no-upload-source-maps` | no updated assets | minified bundle retried three `POST /workers/scripts/archestimator-proof/versions` calls from `14:32:19Z` through `14:47:24Z`, then exited `fetch failed` after repeated `UND_ERR_HEADERS_TIMEOUT` | no |
| 4 | `wrangler deploy --config .wrangler/tmp/nobundle-full-wrapper/wrangler.jsonc --keep-vars --no-upload-source-maps` | 1 changed asset (`/BUILD_ID`) uploaded | no-bundle wrapper with 19 modules retried `POST /workers/scripts/archestimator-proof/versions` and exited `fetch failed` after repeated `UND_ERR_HEADERS_TIMEOUT`; no new version appeared in readback | no |

## Bundle

| Item | Bytes |
| --- | ---: |
| Wrangler reported upload | 31,948,226 |
| Wrangler reported gzip | 6,574,033 |
| Dry-run worker | 31,948,262 |
| Dry-run source map | 46,580,362 |
| Dry-run metafile | 862,063 |
| Minified dry-run reported upload | 22,114,540 |
| Minified dry-run reported gzip | 5,801,390 |
| Minified dry-run worker | 22,114,536 |
| Minified dry-run metafile | 861,692 |
| No-bundle dry-run reported upload | 23,663,500 |
| No-bundle dry-run reported gzip | 5,796,450 |
| No-bundle attached module count | 19 |
| Current rebuilt minified dry-run reported upload | 22,187,270 |
| Current rebuilt minified dry-run reported gzip | 5,784,220 |

## Readback

- Latest known Worker version remains `8c293c50-c45d-47f0-8da1-d126ec041812` / number `63`.
- No `Refresh Cloudflare migration runtime` version appeared in `wrangler versions list`.
- No new deployment appeared in `wrangler deployments list`.

## Blocker

Cloudflare's Worker versions endpoint repeatedly timed out while ingesting the current OpenNext Worker bundle, a minified bundle, and a no-bundle wrapper/module-split upload. Wrangler exited with `fetch failed` on deploy attempts; readback still shows no new version beyond version 63.

This is a deployment blocker only. It does not print secrets or raw API payloads, does not change DNS, does not mutate Worker secrets, does not purchase plans, and does not make production cutover ready.

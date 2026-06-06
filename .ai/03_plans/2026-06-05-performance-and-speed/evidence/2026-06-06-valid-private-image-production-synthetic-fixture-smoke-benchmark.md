# Hosted private image valid-fixture smoke — 2026-06-06T03:21:12.154Z

Status: **PASSED**.

Mode: `hosted-private-image-valid-fixture-smoke`

Base URL: `https://www.archestimator.com`

Project ID: `e4806c48-6645-41cf-8b1a-c1122c8c30c3`

Upload: pass (200, 2541ms)

Delete cleanup: pass (200, 2089ms)

Route: `/api/projects/images?path=HOSTED_PRIVATE_IMAGE_PATH_REDACTED`

| Sample | Result | Status | Duration | Bytes | Content-Type | Cache-Control | x-vercel-cache | Age | Private directive | Public/shared directive |
| --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | pass | 200 | 2318ms | 72 | image/webp | private, max-age=300 | MISS | 0 | yes | no |
| 2 | pass | 200 | 1979ms | 72 | image/webp | private, max-age=300 | MISS | 0 | yes | no |

Note: Synthetic allowed-session fixture uploaded a tiny PNG through the production private image API, fetched the generated private WebP route twice, and deleted uploaded storage paths. Session cookies and storage paths are never written to this report.

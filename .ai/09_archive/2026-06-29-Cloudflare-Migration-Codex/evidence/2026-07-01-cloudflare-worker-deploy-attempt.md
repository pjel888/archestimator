# Cloudflare Worker deploy attempt - 2026-07-01

Status: **blocked after Worker bundle upload**.

Fresh local gates passed before deploy:

- `NODE_OPTIONS=--max-old-space-size=8192 bunx tsc --noEmit --pretty false`
- `NODE_OPTIONS=--max-old-space-size=8192 bun run cf:build`

Deploy attempts:

- `bunx wrangler deploy --keep-vars` on Wrangler `4.105.0`
- `bunx wrangler versions upload --keep-vars` on Wrangler `4.105.0`
- `bunx wrangler@4.106.0 versions upload --keep-vars`
- `bunx wrangler@4.106.0 deploy --keep-vars` with a five-minute wait after bundle upload

The final Wrangler `4.106.0` deploy uploaded 11 fresh static assets successfully and then reached `Total Upload: 31246.68 KiB / gzip: 6362.54 KiB`. It produced no Worker version or deployment response after five minutes at that boundary, and was stopped. Earlier attempts reached the same boundary with `Total Upload: 31247.82 KiB / gzip: 6362.93 KiB`.

Readback:

- `bunx wrangler deployments list --name archestimator-proof`
- Latest deployment remains `2026-07-01T04:18:13.768Z`, source `Secret Change`, version `f815a673-97d4-458a-bff0-d09515213d8a`.
- Latest version remains `2026-07-01T04:18:13.768Z`, source `Secret Change`, version `f815a673-97d4-458a-bff0-d09515213d8a`.

No secret values were recorded.

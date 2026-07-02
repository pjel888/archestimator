# Cloudflare Main Worker Split Upload Attempt

Generated: 2026-07-01T19:28:30.000Z

## Result

BLOCKED. Current source builds successfully, and the safer split upload path
reduces the Worker payload size, but both Wrangler 4.105.0 and 4.106.0 still
hang after the Worker payload upload and return no version ID.

## What Changed

- `cf:deploy` now uses the long-timeout Undici shim plus `--minify` and
  `--no-upload-source-maps`.
- Added `cf:upload-version` for no-traffic version uploads.
- Added `cf:build-upload-version` for build plus no-traffic version upload.

## Evidence

- `NODE_OPTIONS="--max-old-space-size=8192" bun run cf:build` passed and
  generated `.open-next/worker.js`.
- Wrangler 4.105.0 no-traffic upload reached `Total Upload: 21661.61 KiB /
  gzip: 5611.33 KiB`, then hung without returning a version ID.
- Wrangler 4.106.0 no-traffic upload reached the same payload summary, then
  hung without returning a version ID.
- A separate `wrangler versions list --name archestimator-proof --json` readback
  showed no new version after the attempts.
- A separate `wrangler deployments list --name archestimator-proof --json`
  readback showed production still on `b909ac54-1a72-47f0-9a70-f6c70f7c6fb6`.

## Decision

Do not promote existing version `76c1b259-1515-460b-9878-eccfdac0b3c7`: it is
older than later auth hardening and is not proven to preserve the live OpenNext
assets runtime stanza. Keep the edge auth adapter active until a fresh
current-source main Worker version can be uploaded and proven.

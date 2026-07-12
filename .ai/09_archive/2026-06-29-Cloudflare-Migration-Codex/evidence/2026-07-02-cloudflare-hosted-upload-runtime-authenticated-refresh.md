# Hosted Upload Runtime Authenticated Refresh

Generated: 2026-07-02 04:36 UTC

Status: **PASS**

Base URL: `https://archestimator.com`

Evidence JSON: `2026-07-02-cloudflare-hosted-upload-runtime-authenticated-refresh.json`

## Result

The hosted upload runtime proof passed with authenticated, non-mutating dry-run probes. The route proved:

- unauthenticated upload-runtime access fails closed with `401`, private/no-store cache, and no `Set-Cookie`;
- authenticated runtime dry-run reaches the Cloudflare Worker/OpenNext upload runtime;
- 1024-byte body probe is received and bounded;
- concurrency probe succeeds;
- Cloudflare R2 storage latency check reports `provider=cloudflare-r2`, `status=ok`, and `bucketReachable=true`.

The persisted JSON reports `productionProofReady=true`, `proofBoundary=hosted-runtime-authenticated-dry-run`, `authenticated=true`, and no missing authenticated probe secrets.

Observed R2 latency samples from the JSON were approximately `94-218ms`.

## Boundary

This does not prove real browser upload UX, scanner/CDR execution, alert delivery, dashboard observation, backpressure traffic, or retention-runbook completion.

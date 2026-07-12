# Post-Hotfix Parallel QA Refresh

Generated: `2026-07-01T20:04:00Z`

## Fresh Passes

- State-mismatch fallback hardening is live on `archestimator-auth-callback-normalizer` version `efab385a-a0ca-4e8b-b382-e7cc0f469044`.
- Exact `https://archestimator.com/?error=state_mismatch` now redirects to `/login?next=%2Fworkshop&oauth_state_reset=1` with `Location`, `Refresh`, fallback HTML/JS, no-store cleanup, and `Clear-Site-Data`.
- Hosted route matrix refresh passed on `archestimator.com`.
- Release gates refresh passed with `productionCutoverReady=true` and blockers empty.
- Hosted auth smoke signed-out case passed; allowed/denied/revoked/expired remain fixture-limited because sanitized `HOSTED_AUTH_*_COOKIE` inputs are not present.

## Lane Findings

- Auth: no new blocker. Google OAuth start/callback, missing-cookie callback recovery, app-path `state_mismatch` recovery, magic-link evidence, and signed-out denial are covered.
- Data/library: local D1 estimate-history and component-library proofs pass functionally; hosted scalar estimate Notes mutation is proven. Full hosted estimate tab/row/item/history and component-library UI/Worker+D1 journeys remain open.
- Upload/publication/realtime: local contracts pass, R2 runtime proof passes, and Durable Object transport proof passes. Real hosted browser journeys remain open.
- Deploy/provider: the main `archestimator-proof` Worker current-source upload still stalls after bundle upload and returns no fresh version ID. Keep the edge adapter active.

## Remaining Work

- Hosted authenticated estimate tab/row/item/history journey with rollback, idempotency, reload/readback, and cross-workspace denial.
- Hosted authenticated component-library mutation journey with editor/viewer proof.
- Hosted real user upload to R2 with scanner persistence.
- Hosted authenticated publication creation plus recipient open/respond and D1 activity readback.
- Hosted two-client in-app realtime roster/presence/broadcast proof.
- Repair main Worker current-source version upload before folding adapter behavior into `archestimator-proof`.
- Complete provider cleanup/export/runbook before any destructive provider cancellation or deletion.

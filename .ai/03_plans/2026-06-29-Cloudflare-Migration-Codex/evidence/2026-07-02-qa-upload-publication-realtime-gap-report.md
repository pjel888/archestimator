# QA Upload, Publication, Realtime Gap Report

Generated: 2026-07-01T19:14:00Z

Scope: QA-UPLOAD-02, QA-PUB-02, and realtime UI evidence beyond existing Durable Object WebSocket proof.

## Production Targets Used

- `https://archestimator.com`
- No production data IDs were created or mutated in this QA lane.

## Checks Run

| Area | Command | Result |
| --- | --- | --- |
| Upload scanner hosted fail-closed | `HOSTED_UPLOAD_OPERATIONS_BASE_URL=https://archestimator.com HOSTED_UPLOAD_OPERATIONS_RUNS=1 HOSTED_UPLOAD_OPERATIONS_LIMIT=1 OUTPUT_FILE=.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-02-qa-upload-operations-proof.json MARKDOWN_FILE=.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-02-qa-upload-operations-proof.md bun run scripts/verify-hosted-upload-operations.ts` | PASS for unauthenticated fail-closed only; production dry-run proof not ready because scanner/cleanup proof secrets were absent. |
| Upload lifecycle contracts | `bunx vitest run tests/vitest/hosted-upload-operations-proof-script.test.ts tests/vitest/hosted-upload-runtime-proof-script.test.ts tests/vitest/upload-scan-job.test.ts tests/vitest/cloudflare-scheduled-upload-jobs.test.ts tests/vitest/cloudflare-upload-job-queue.test.ts` | PASS: 5 files, 27 tests. |
| Publication recipient flow | `bunx vitest run tests/vitest/recipient-proposals-action.test.ts tests/vitest/project-publication-actions.test.ts tests/vitest/project-publication-route.test.ts tests/vitest/project-publication-public-repository.test.ts tests/vitest/project-publication-decision.test.tsx tests/vitest/recipient-proposals-repository.test.ts tests/vitest/recipient-proposals-route-gate.test.ts tests/vitest/share/share-page-decision-anonymous.test.tsx tests/vitest/project-publication-cookie-credential-version.test.ts tests/vitest/publication-client-csrf.test.ts` | PASS after updating the stale recipient action harness from Supabase mocks to the migrated D1 admin client seam: 10 files, 121 tests. |
| Realtime UI/contracts | `bunx vitest run tests/vitest/project-collaboration-realtime.test.ts tests/vitest/realtime-auth-bridge-favorites-clear.test.tsx tests/vitest/cloudflare-collaboration-room-router.test.ts tests/vitest/project-collaboration-actions.test.ts tests/vitest/project-collaboration-tree-contract.test.ts tests/vitest/realtime-identity.test.ts tests/vitest/cloudflare-d1-collaboration-invitation-proof-script.test.ts` | PASS: 7 files, 40 tests. |

## Evidence Outcome

- QA-UPLOAD-02 remains open. Existing R2 runtime proof shows hosted R2 reachability, and the new operations proof shows scan/cleanup routes fail closed when unauthenticated. It still does not prove real user upload UX, authenticated hosted scanner dry-run, live scanner/CDR execution, or scanner result persistence.
- QA-PUB-02 remains open for hosted/browser completion. Local D1/action/route tests cover recipient authorization, shared-link session cookie minting, recipient proposal listing, public decision routes, and CSRF/session contracts. No hosted authenticated create-publication plus external recipient open/respond journey was run.
- Realtime remains verified for Durable Object transport and local UI hook/contracts. The missing evidence is a hosted in-app two-client browser journey showing roster/presence behavior through the real workshop UI.

## Blockers

- `HOSTED_UPLOAD_OPERATIONS_CLEANUP_SECRET`, `HOSTED_UPLOAD_OPERATIONS_SCAN_SECRET`, `UPLOAD_CLEANUP_JOB_SECRET`, and `UPLOAD_SCAN_JOB_SECRET` were absent in the QA process environment, so only fail-closed scanner/cleanup probes could run.
- The available hosted recipient activity script is Supabase-era and mutates the old provider path, so it was not used as Cloudflare QA-PUB-02 evidence.
- No authenticated production browser session was available to perform real user upload, publication creation, recipient response, or in-app realtime two-client UI proof.

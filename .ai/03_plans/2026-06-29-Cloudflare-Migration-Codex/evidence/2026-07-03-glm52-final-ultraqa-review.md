# GLM52 / Codex Final UltraQA Static Review

Generated: 2026-07-03T14:46:59Z
Status: PARTIAL - app runtime near-complete, strict deploy/source and provider exit still open
Mode: static local review plus prior independent verifier, current Codex refresh, focused local residual refresh, and Doc 37 scenario-matrix reconciliation

## Boundary

This pass did not run browser automation, deploy source, mutate providers,
rotate secrets, change DNS, cancel services, read secret values, or create raw
provider/mailbox exports. It preserved the dirty worktree and only records
local static evidence plus evidence-led ledger corrections.

## Verdict

The Cloudflare migration plan pack cannot honestly be called fully implemented.
It can be called near-complete for Cloudflare closed-beta app runtime, but the
strict app-runtime completion row remains open until latest deploy/source smoke
is ready.

Full migration/provider exit remains `OPEN / NOT READY` because:

- latest deploy/source smoke is open
- the sanitized operator record is missing
- final exports/backups or accepted retention/loss decision is missing
- Resend account/API-key/domain status is missing
- obsolete provider secret removal or rotation record is missing
- post-exit Cloudflare smoke is missing
- real non-owner Google proof or accepted deferral is missing
- real recipient mailbox proof or accepted deferral is missing

## Verifier Evidence

Verifier: Galileo (`019f26bd-bf23-7a23-aef1-545effc566a4`)
Verification mode: independent prior pass, followed by current Codex same-agent
refresh against the `2026-07-03T14:46:59.752Z` evidence set
Verdict: PARTIAL

The prior verifier inspected `AGENTS.md`, `.ai/10_state/current-state.md`, plan docs
`35`, `36`, and `37`, the provider-exit pack, `git status`, `git diff --stat`,
`git diff --name-status`, evidence JSON, and `git diff --check`.

Current refresh evidence:

- `2026-07-03-cloudflare-provider-exit-pack.json` generated
  `2026-07-03T14:46:59.752Z`: `appRuntimeExitPrerequisitesReady=false`,
  `providerExitReady=false`, operator record absent, legacy blocker count `0`,
  seven blockers listed, deploy-relevant source/config scan paths recorded, and
  provider-resource evidence pointed at the current 2026-07-01 artifact.
- `2026-07-03-cloudflare-latest-deploy-source-smoke.json` generated
  `2026-07-03T14:46:55.585Z`: `latestDeploySourceSmokeReady=false` with two
  deploy-source evidence blockers and no deploy-relevant dirty runtime source
  paths.
- Release gates generated `2026-07-03T10:35:33.942Z` with blockers empty.
- Hosted auth synthetic matrix cleanup counts are zero.
- Cloudflare Email readiness generated `2026-07-03T10:41:35.143Z`.
- Workbook keeps `strictHostedClientP95Ready=false` with `/terms` at
  `564.56ms` against the `300ms` strict budget.
- Focused Vitest for latest-deploy/source-smoke and provider-exit passed
  `2` test files / `32` tests / `0` failed after malformed proof-artifact,
  strict-readiness CLI exit, provider-exit scan-surface/filesystem scanner,
  `bun.lock` scan coverage, accepted-deferral, deployed-commit mismatch,
  deployment-time Markdown, and default provider-resource path regressions were covered; the
  JSON reporter for that run records `4` suites.
- Focused local QA-R2/QA-SHARE residual refresh passed `12` suites / `96`
  tests / `0` failed via
  `/tmp/archestimator-cloudflare-ultraqa-residual-refresh-20260703-rerun.json`.
- Scoped ESLint for both proof scripts/tests and `bun run type-check` passed.
- Scoped secret-shaped scan over regenerated proof artifacts returned no
  matches.
- Independent native code-review evidence
  `2026-07-03-codex-independent-proof-tooling-code-review.*` generated
  `2026-07-03T15:10:50Z` reports `findingCount=0` and
  `safeLocalFixesStillNeeded=false`; it leaves this review's classification as
  `PARTIAL`.

## Lead Static Checks

| Check | Result | Evidence |
| --- | --- | --- |
| Provider-exit pack readiness | PASS for honest open status | `2026-07-03-cloudflare-provider-exit-pack.json` generated `2026-07-03T14:46:59.752Z`: `appRuntimeExitPrerequisitesReady=false`, `providerExitReady=false`, operator record absent, legacy blocker count `0`, seven blockers listed, active scan paths include deploy-relevant source/config files including `bun.lock` and `src/middleware.ts`, and provider-resource evidence points to the current 2026-07-01 artifact. |
| Provider-exit artifact secret-shaped token scan | PASS | Scanned latest deploy/source-smoke JSON/MD/template, provider-exit pack JSON/MD, operator-record template, completion audit, and active ledger docs for private-key, API-key, GitHub-token, OpenAI-key, JWT, bearer-token, and Resend-key shaped values; finding count `0`. |
| Latest deploy/source-smoke plus provider-exit script regression | PASS | `bunx vitest run tests/vitest/cloudflare-latest-deploy-source-smoke-script.test.ts tests/vitest/provider-exit-pack-script.test.ts --maxWorkers=1 --reporter=json --outputFile=/tmp/archestimator-provider-exit-proof-coverage-20260703-lockfile.json` passed `2` test files / `32` tests / `0` failed after malformed proof-artifact, strict-readiness CLI exit, provider-exit scan-surface/filesystem scanner, `bun.lock` scan coverage, accepted-deferral, deployed-commit mismatch, deployment-time Markdown, and default provider-resource path regressions were covered; the JSON reporter records `4` suites; scoped ESLint for both scripts/tests passed. |
| Provider-resource timestamp sanity | PASS | `2026-07-01-cloudflare-provider-resource-readback.json` has `generatedAt=2026-07-03T10:35:30.209Z` and blockers empty; the provider-exit pack also records provider-resource evidence present. |
| Release/performance freshness | PASS for honest partial status | `cf:release-gates` generated `2026-07-03T10:35:33.942Z` with blockers empty; hosted performance generated `2026-07-03T10:32:52.047Z` with `hostedCredentialFreePerformanceReady=true`, but strict p95 remains red on `/terms` at `564.56ms` against `300ms`. |
| Broad DOM baseline | PASS for local test maintenance | Later local evidence in Doc 36 records `bun run test:dom -- --reporter=json --outputFile=/tmp/archestimator-testdom-20260703-after-optional-upload-evidence.json`: `1350` / `1350` suites passed, `4010` / `4055` tests passed, `40` skipped, `5` todo, `0` failed. |
| Local R2/share residual refresh | PASS | `bunx vitest run tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/cloudflare-r2-storage-provider.test.ts tests/vitest/share-no-store-invariants.test.ts tests/vitest/share/share-page-get-routes-contract.test.ts tests/vitest/shared-link-header-smoke-script.test.ts tests/vitest/project-publication-security-headers.test.ts --maxWorkers=1 --reporter=json --outputFile=/tmp/archestimator-cloudflare-ultraqa-residual-refresh-20260703-rerun.json` passed `12` suites / `96` tests / `0` failed. |
| Independent proof-tooling code review | PASS no findings | `2026-07-03-codex-independent-proof-tooling-code-review.*` generated `2026-07-03T15:10:50Z` by Hilbert (`019f2884-6b36-7e41-9d2c-64294dad8a3d`) reports `findingCount=0` and `safeLocalFixesStillNeeded=false`; it is read-only local review evidence, not deploy/provider/browser/mailbox/persona proof. |

## Doc 37 Scenario Matrix

| ID | Scenario | Result | Evidence / Residual Risk |
| --- | --- | --- | --- |
| QA-AUTH-001 | Exact `https://archestimator.com/?error=state_mismatch` | PASS existing evidence | Doc 36 records clean reset/login redirect, cookie clearing, no visible raw `state_mismatch`, and restart available. |
| QA-AUTH-002 | Owner production Google OAuth | PASS existing browser evidence | `evidence/2026-07-02-production-google-oauth-real-browser-proof.*`. |
| QA-AUTH-003 | Local `http://localhost:3000` Google OAuth | PASS existing browser evidence | `evidence/2026-07-02-local-dev-google-oauth-real-browser-proof.*`. |
| QA-AUTH-004 | `127.0.0.1` local login attempt | PASS boundary recorded | Doc 36 records `localhost` as canonical local proof host; `127.0.0.1` is not substitute proof. |
| QA-AUTH-005 | Non-owner Google | OPEN external-persona gate | Provider-exit pack keeps the gate open until real non-owner Google persona/session evidence or accepted deferral is recorded. |
| QA-AUTH-006 | Revoked/expired/missing closed-beta session | PASS hosted synthetic evidence | `evidence/2026-07-02-cloudflare-hosted-auth-synthetic-cookie-matrix.*`; direct helper still needs `HOSTED_AUTH_*` fixtures for real-cookie operator runs. |
| QA-EMAIL-001 | Magic link real mailbox | PASS existing mailbox evidence | `evidence/2026-07-01-cloudflare-magic-link-ui-mailbox-proof.*` plus Cloudflare Email readiness `2026-07-03T10:41:35.143Z`. |
| QA-EMAIL-002 | Recipient invite real mailbox | OPEN mailbox gate | Requires real recipient mailbox receipt and recipient-scoped action proof, or owner-accepted deferral. |
| QA-DATA-001 | Estimate row edit/idempotency | PASS existing hosted evidence | Doc 36 accepts unchanged hosted estimate mutation proof from the 2026-07-02 proof set. |
| QA-DATA-002 | Cross-workspace write attempt | PASS existing denial evidence | Doc 36 records green hosted denial/security evidence and repaired D1/action-client test slices. |
| QA-R2-001 | Upload UI and cleanup | PASS existing hosted evidence | `evidence/2026-07-02-cloudflare-hosted-upload-ui-proof.*`. |
| QA-R2-002 | Bad file type/oversize/path traversal | PASS local adversarial security refresh | Focused refresh passed `auth-sensitive-api-boundaries.test.ts` and `cloudflare-r2-storage-provider.test.ts`, covering oversized image rejection before auth/body/storage work, MIME/magic mismatch rejection before storage writes/upload records, owned-path-only project image deletion, malformed private image path fail-closed/no-store behavior, and unsafe R2 bucket/path rejection before R2 calls. |
| QA-DO-001 | Two-client collaboration | PASS existing hosted evidence | `evidence/2026-07-02-cloudflare-hosted-collaboration-ui-proof.*`. |
| QA-SHARE-001 | Invalid share token | PASS hosted sensitive-route evidence | Hosted sensitive-route fail-closed proof passed for invalid share/private image probes. |
| QA-SHARE-002 | Public share cache safety | PASS local route/cache refresh | Focused refresh passed `share-no-store-invariants.test.ts`, `share/share-page-get-routes-contract.test.ts`, `shared-link-header-smoke-script.test.ts`, and `project-publication-security-headers.test.ts`, covering no-store/dynamic share API invariants, share GET route cache headers, hosted shared-link header parsing, and publication security header config. |
| QA-PERF-001 | Strict p95 red with release gate green | PASS watch visible | Workbook keeps strict p95 red while release gates remain green. |
| QA-PROVIDER-001 | Supabase removed from runtime | PASS active source scan | Provider-exit pack reports `activeLegacyProviderRuntimeBlockers=0` with `bun.lock` and `src/middleware.ts` in the deploy-relevant scan contract. |
| QA-PROVIDER-002 | Vercel removed from runtime | OPEN provider-exit gate | Requires provider-exit operator record and post-exit Cloudflare smoke. |
| QA-PROVIDER-003 | Resend removed from runtime | PARTIAL / provider status open | Cloudflare Email is ready, but sanitized Resend account/API-key/domain status remains missing. |
| QA-SEC-001 | Secrets in repo/evidence | PASS scoped scan | Scoped proof-artifact scan returned no matches; this is not a full-repository secret audit. |
| QA-WORKTREE-001 | Dirty worktree | PASS with caution | Existing modified/untracked Cloudflare evidence/tooling files are intentional; no unrelated work was reverted. |
| QA-SCRIPT-001 | Misleading success output | PASS | Focused tests cover stale deploy/source smoke, missing operator record, missing evidence-source pointers, malformed proof-artifact JSON parse errors, open provider-exit status, default non-fatal artifact generation, and strict nonzero exit when blockers remain. |
| QA-OPS-001 | Provider cancellation rollback | OPEN provider-exit gate | No destructive provider action attempted; exports/retention, rollback decision, obsolete-secret handling, and post-exit smoke remain required. |

## Known Local Gaps

- Latest deploy/source smoke is open and requires current-source deploy or
  current deployed-source proof.
- Broad DOM is locally green after later test-maintenance repairs, but this is
  local test evidence only and does not prove provider exit, deploy currency,
  real mailbox delivery, or non-owner Google behavior.
- `QA-R2-002` and `QA-SHARE-002` now have fresh local automated proof, but
  this does not replace hosted browser/provider smoke for final provider exit.
- Provider-exit artifacts and this UltraQA evidence are local working-tree
  evidence until committed.
- This pass did not perform provider actions, browser proof, deploys, hosted
  reruns, or a full-repository secret audit.

## Stop Condition

Stop static local UltraQA refresh here for this branch of evidence. Further
progress on full migration completion requires latest deploy/source proof,
operator/provider/persona actions, or explicit accepted deferral for the
external gates.

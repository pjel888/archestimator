# GLM52 / Codex Final UltraQA Static Review

Generated: 2026-07-03T10:53:32Z  
Status: PARTIAL - app runtime ready, full provider exit still open  
Mode: static local review plus prior independent verifier and current Codex refresh

## Boundary

This pass did not run browser automation, deploy source, mutate providers,
rotate secrets, change DNS, cancel services, read secret values, or create raw
provider/mailbox exports. It preserved the dirty worktree and only records
local static evidence plus evidence-led ledger corrections.

## Verdict

The Cloudflare migration plan pack cannot honestly be called fully implemented.
It can honestly be called Cloudflare closed-beta app-runtime ready with a
generated provider-exit pack.

Full migration/provider exit remains `OPEN / NOT READY` because the sanitized
operator record is missing and six external/operator gates are still open:

- final exports/backups or accepted retention/loss decision
- Resend account, API-key, and domain status
- obsolete provider secret removal or rotation record
- post-exit Cloudflare smoke
- real non-owner Google proof
- real recipient mailbox proof or accepted deferral

## Verifier Evidence

Verifier: Galileo (`019f26bd-bf23-7a23-aef1-545effc566a4`)  
Verification mode: independent prior pass, followed by current Codex same-agent
refresh against the `2026-07-03T10:41:40.108Z` evidence set  
Verdict: PARTIAL

The prior verifier inspected `AGENTS.md`, `.ai/10_state/current-state.md`, plan docs
`35`, `36`, and `37`, the provider-exit pack, `git status`, `git diff --stat`,
`git diff --name-status`, evidence JSON, and `git diff --check`.

Key verifier findings:

- The plan documents preserve the same boundary: app runtime near-complete, full
  provider exit not complete.
- `2026-07-03-cloudflare-provider-exit-pack.md/json` reports `OPEN / NOT READY`,
  missing operator record, and six blockers.
- Current Codex refresh confirms release gates report `productionCutoverReady=true`
  with blockers empty at `2026-07-03T10:35:33.942Z`; hosted auth matrix passed
  with cleanup counts all zero; Cloudflare Email is ready at
  `2026-07-03T10:41:35.143Z`; the workbook still keeps
  `strictHostedClientP95Ready=false`.
- `git diff --check` passed before this artifact write.
- Scoped evidence scanning found no PEM, JWT, or API-key-shaped leaks. Reported
  hits outside this artifact were redacted cookie examples and a D1 seed SQL
  file, not provider exports.

## Lead Static Checks

| Check | Result | Evidence |
| --- | --- | --- |
| Provider-exit pack readiness | PASS for honest open status | `2026-07-03-cloudflare-provider-exit-pack.json` generated `2026-07-03T10:41:40.108Z`: `readiness.appRuntimeExitPrerequisitesReady=true`, `readiness.providerExitReady=false`, `artifacts.operatorRecord.present=false`, legacy blocker count `0`, six blockers listed. |
| Provider-exit artifact secret-shaped token scan | PASS | Scanned the provider-exit pack JSON/MD and operator-record template for private-key, API-key, GitHub-token, OpenAI-key, JWT, bearer-token, and Resend-key shaped values; finding count `0`. |
| Provider-exit script regression | PASS | `bunx vitest run tests/vitest/provider-exit-pack-script.test.ts --maxWorkers=1` passed 1 file / 6 tests; scoped ESLint for the script/test passed. |
| Provider-resource timestamp sanity | PASS after ledger refresh | `2026-07-01-cloudflare-provider-resource-readback.json` has `generatedAt=2026-07-03T10:35:30.209Z` and blockers empty; the provider-exit pack also records provider-resource evidence present. |
| Release/performance freshness | PASS for honest partial status | `cf:release-gates` generated `2026-07-03T10:35:33.942Z` with blockers empty; hosted performance generated `2026-07-03T10:32:52.047Z` with `hostedCredentialFreePerformanceReady=true`, but strict p95 remains red on `/terms` at `564.56ms` against `300ms`. |
| Broad DOM baseline | PASS for local test maintenance | Later local evidence in Doc 36 records `bun run test:dom -- --reporter=json --outputFile=/tmp/archestimator-testdom-20260703-after-optional-upload-evidence.json`: `1350` / `1350` suites passed, `4010` / `4055` tests passed, `40` skipped, `5` todo, `0` failed. |

## Scenario Matrix

| Scenario | Result | Note |
| --- | --- | --- |
| Dirty worktree during QA | PASS with caution | Existing user/agent edits were preserved. |
| Provider-exit pack masks missing operator gates | PASS | The pack remains `OPEN / NOT READY` without the sanitized operator record and enumerates all six blockers. |
| Active legacy provider runtime dependency remains | PASS for active runtime scan | Provider-exit pack reports zero blocker-level active Supabase/Vercel/Resend runtime dependencies; informational Resend lexical references remain visible. |
| Evidence leaks secrets or raw provider exports | PASS for scoped scan | No secret-shaped findings were found in the new provider-exit pack artifacts. This is not a full-repository secret audit. |
| Script success masks failure | PASS | Provider-exit tests prove missing operator evidence keeps the pack open instead of reporting final readiness. |
| External proof gates are still missing | OPEN | Non-owner Google, recipient mailbox, export/retention, Resend status, obsolete-secret cleanup, and post-exit smoke require operator/provider/persona evidence. |
| Latest deploy/source proof is current | OPEN | No deploy or hosted browser smoke was run in this pass. Latest recorded production deploy proof is Worker `d47bcd1d-37f0-41e3-864a-05a90b28518b` at `2026-07-02T04:31:00Z`; the checked-in `AuthStateMismatchRecoveryScript` warning fix landed later in commit `cdf74b72d` at `2026-07-02T14:02:31Z`, so latest-branch deploy/smoke remains open. |
| Stale artifact claims after 10:41 refresh | PASS after this refresh | This artifact now points at the `2026-07-03T10:41:40.108Z` provider-exit pack, the `2026-07-03T10:35:33.942Z` release gates, and the current Doc 37 deploy-source watch. |

## Known Local Gaps

- Broad DOM is locally green after later test-maintenance repairs, but this is
  local test evidence only and does not prove provider exit, deploy currency,
  real mailbox delivery, or non-owner Google behavior.
- Provider-exit artifacts and this UltraQA evidence are local working-tree
  evidence until committed.
- This pass did not perform provider actions, browser proof, deploys, or a
  full-repository secret audit.

## Stop Condition

Stop static local work here for this branch of evidence. Further progress on
full migration completion requires operator/provider/persona actions or an
explicit accepted deferral for the external gates.

# GLM5.2 Cloudflare Migration Completion Handoff Implementation Plan
> **For agentic workers:** REQUIRED SUB-SKILL: use `autopilot` as the lead loop, `ultragoal` for durable goal/ledger discipline, `ultrawork` or native subagents for parallel lanes, `ultraqa` for adversarial final proof, `writing-plans` for plan edits, and `cloudflare` for Cloudflare-specific execution and official-doc refreshes when current product facts are needed.

**Goal:** Finish the remaining Cloudflare-only migration work for Archestimator, prove the app can operate on Cloudflare without active Supabase, Vercel, or Resend runtime dependencies, and prepare provider-exit evidence so the owner can safely downgrade or cancel legacy paid plans.

**Architecture:** GLM5.2 should act as the lead orchestrator. Keep one primary thread for integration and verification, then split independent lanes into subagents or separate Codex threads: deploy/release, auth/persona proof, recipient/email proof, provider-exit operations, performance p95 watch, and independent review/UltraQA. The app target is a Cloudflare-native Next.js/OpenNext Worker with Better Auth on D1, R2 media/attachments, Durable Objects for collaboration, Queues/Cron for async jobs, and Cloudflare Email for app mail.

**Tech Stack:** Next.js 16, React 19, Bun, TypeScript, Tailwind v4, OpenNext Cloudflare, Cloudflare Workers, D1, R2, Durable Objects, Queues, Cloudflare Email, Better Auth, Playwright, Vitest, Wrangler, Google OAuth, local developer OAuth on `http://localhost:3000`, production domain `https://archestimator.com`.

**2026-07-03 status refresh:** Doc 36 now contains fresh independent
verification/test-maintenance evidence, and `.ai/10_state/current-state.md` has
been updated with that evidence. Cloudflare app runtime remains near-complete
for closed-beta operation, but strict app-runtime completion is still open on
latest deploy/source smoke. Full migration completion remains open until the
non-owner Google proof, real recipient mailbox proof or accepted deferral,
provider export/retention/post-exit evidence, and final smoke/review gates are
closed. Owner-reported Vercel/Supabase cancellation does not, by itself,
satisfy the formal provider exit evidence pack.

**2026-07-03 provider-exit pack refresh:** Codex added and refreshed
`evidence/2026-07-03-cloudflare-provider-exit-pack.*`. The latest refresh at
`2026-07-03T22:15:48.194Z` proves zero blocker-level active
Supabase/Vercel/Resend runtime references in scanned source, while keeping
provider exit `OPEN / NOT READY` on latest deploy/source smoke, exports or
accepted retention/loss, post-exit smoke, non-owner Google proof or accepted
deferral, and real recipient mailbox proof or accepted deferral. A sanitized
operator record now closes the obsolete-secret-name review gate and the Resend
account/API-key/domain status gate using existing sanitized evidence; it does
not close export, post-exit smoke, persona, or mailbox gates.

**2026-07-03 latest deploy/source-smoke gate refresh:** Codex added
`scripts/check-cloudflare-latest-deploy-source-smoke.ts` and `bun run
cf:check-latest-deploy-source-smoke`, then extended it with
`bun run cf:latest-deploy-source-smoke-template`. The latest provider-exit pack
was regenerated at `2026-07-03T22:15:48.194Z` with
`appRuntimeExitPrerequisitesReady=false`, `activeLegacyProviderRuntimeBlockers=0`,
`providerExitReady=false`, latest deploy/source smoke open, a sanitized
operator record closing the obsolete-secret-name and Resend status gates, and five
remaining blockers. Its active runtime scan now includes
deploy-relevant root config files (`cloudflare-env.d.ts`, `next.config.ts`, and
`open-next.config.ts`) in addition to `src`, `worker.ts`, `package.json`,
`bun.lock`, `wrangler.jsonc`, and `src/middleware.ts`. The deploy-source checker generated
`evidence/2026-07-03-cloudflare-latest-deploy-source-smoke.*` at
`2026-07-03T22:15:48.057Z` and reports
`latestDeploySourceSmokeReady=false` with one blocker: the local
CRUD/image-auth/favorites/component-library/sidebar-access runtime source patch is uncommitted and cannot be claimed
deployed. The dirty runtime entries are
`src/app/api/estimate-row-images/route.ts`,
`src/app/api/projects/images/route.ts`, `src/lib/component-library/actions.ts`,
`src/lib/projects/actions.ts`,
`src/lib/repositories/estimate-favorites-repository.ts`,
`src/lib/repositories/workspace-repository.ts`,
`src/lib/uploads/upload-records.ts`, and `src/lib/workshop/actions.ts`.
Proof-tooling-only `package.json` script
additions are excluded from runtime dirtiness; `bun.lock` and runtime
package/dependency/build changes still block. It also writes a sanitized deploy-source starter template at
`evidence/2026-07-03-cloudflare-latest-deploy-source-smoke.template.json`; this
template is not proof and remains open until real post-deploy production-version,
hosted-route, and release-gate fields replace the placeholders. The provider
exit workflow also preserves optional sanitized operator-record intake and now
keeps malformed proof-artifact JSON open through explicit `parseError` and
field-level diagnostics, plus a generated
operator-record template at
`evidence/2026-07-03-cloudflare-provider-exit-operator-record.template.json`.
The operator template now requires sanitized evidence-source pointers for
external/provider gates before the pack will treat recorded booleans as proof.
The provider-resource gate now reads the current `2026-07-01` readback artifact,
and the non-owner Google gate now supports real proof or accepted deferral.
Provider exit remains open because export/retention, post-exit smoke, persona,
and mailbox gates are still unproven or undeferred. Release gates
remain `productionCutoverReady=true` with blockers empty. Strict public
p95 remains visible as a watch item; the latest miss is `/terms` at `564.56ms`
against the `300ms` budget.

## Global Constraints

- Work from `/Users/philiplewis/Documents/archestimator`.
- Read `AGENTS.md` and the Fast Path block at `.ai/10_state/current-state.md` before making code or provider changes.
- Preserve the dirty worktree. Do not revert unrelated edits, especially the unrelated API rate-limiting/security planning files.
- Do not print, copy, commit, or summarize secret values from `.env*`, `.dev.vars`, provider dashboards, OAuth clients, cookies, session tokens, API keys, backup files, or database dumps.
- Use `http://localhost:3000` as the canonical local developer Google OAuth proof host. `127.0.0.1` is not accepted as local sign-in proof unless host-dynamic Better Auth behavior is deliberately implemented and tested.
- Treat `https://archestimator.com` as the production app URL and `https://www.archestimator.com` as a canonicalization/auth-boundary URL to verify, not as a separate active app origin.
- Do not mark the durable migration goal complete until provider-exit evidence, post-exit smoke, real non-owner Google proof, and real recipient mailbox proof are complete or explicitly accepted as deferred in the ledger.
- Cloudflare for Platforms / Workers for Platforms is not part of the current estimate-sheet user model. Use Better Auth + D1 users, sessions, workspaces, memberships, collaborators, and recipients. Reconsider Platforms only for tenant-owned custom domains, tenant-deployed code, or hard per-tenant runtime isolation.
- Strict hosted public-route p95 is a visible speed watch item. It should stay red/visible when it misses; it is not by itself a release blocker when route contracts, sample count, provider runtime readiness, and aggregate hosted performance gates are green.
- When exact Cloudflare limits, pricing, API signatures, product availability, or dashboard behavior matter, refresh the current official Cloudflare docs and record the date in evidence. Do not rely on old pricing or limit memory.
- For provider downgrade, cancellation, deletion, or secret rotation, first create export/backups and a rollback decision record. The owner has given broad permission to proceed, but destructive billing/data actions still need an evidence-backed exit window and a rollback posture recorded before execution.
- Every synthetic hosted mutation must use unique test names, prove D1/R2/DO cleanup, and write sanitized evidence under `.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/`.
- Keep final reporting honest: Cloudflare app runtime can be near-complete while legacy provider account exit remains incomplete.

---

## 1. Current State Snapshot For GLM5.2

This section is the truth to start from. Verify it against the current source and latest evidence before claiming completion.

| Area | Current state | Evidence |
| --- | --- | --- |
| Overall app runtime | Near-complete for closed-beta operation, but not strict-complete: the latest deploy/source-smoke artifact has `latestDeploySourceSmokeReady=false` with one blocker, so the local CRUD/image-auth/favorites patch is not proven deployed. | `evidence/2026-07-02-cloudflare-wrap-up-assessment.*`; `evidence/2026-07-03-cloudflare-latest-deploy-source-smoke.*` |
| Overall migration including provider exit | `OPEN / NOT READY`: the active provider-exit pack has `providerExitReady=false`, `appRuntimeExitPrerequisitesReady=false`, five blockers, and a sanitized operator record that closes the obsolete-secret-name review gate plus the Resend account/API-key/domain status gate. Remaining gates are latest deploy/source proof plus export/post-exit/persona/mailbox evidence or accepted deferrals. | `36_COMPREHENSIVE_FOLLOWUP_QA_LEDGER.md`; `evidence/2026-07-03-cloudflare-provider-exit-pack.*`; `evidence/2026-07-03-cloudflare-migration-implementation-completion-audit.*` |
| Release gates | `productionCutoverReady=true` and blockers empty at `2026-07-03T10:35:33.942Z`. | `evidence/2026-07-01-cloudflare-release-gates.*` |
| Cost/performance workbook | Runtime/cost decision readiness green at `2026-07-03T10:32:56.734Z`. Strict hosted public-route p95 remains red as a watch item: `strictHostedClientP95Ready=false`; `hostedPerformanceReady=false`; `aggregateHostedPerformanceReady=true`; latest miss is `/terms` p95 TTFB `564.56ms` against `300ms`. | `evidence/2026-07-01-cloudflare-cost-performance-workbook.*`; `evidence/2026-06-30-cloudflare-hosted-performance.*` |
| Production Google OAuth owner flow | Real desktop Chrome proof passed on `https://archestimator.com`; no `state_mismatch`; landed in `/workshop`. | `evidence/2026-07-02-production-google-oauth-real-browser-proof.*` |
| Local developer Google OAuth | Real desktop Chrome proof passed on `http://localhost:3000`; D1 local user/account/session/terms readback passed. | `evidence/2026-07-02-local-dev-google-oauth-real-browser-proof.*` |
| Google OAuth provider configuration | Production and local callbacks/origins configured; Audience is `In production`; user type is `External`; no sensitive/restricted custom scopes recorded. | `evidence/2026-07-02-google-oauth-local-production-readback.*` |
| Non-owner Google | Provider-side block has been removed, but a real non-owner account journey has not been proven. | Open P1 |
| Magic link | Production magic-link flow previously passed with Cloudflare Email and Gmail receipt. Rerun if auth/email code or provider secrets change. | `evidence/2026-07-01-cloudflare-magic-link-ui-mailbox-proof.*` |
| Uploads/media | Hosted upload UI, R2 checksum, D1 upload session/asset/event readback, app cleanup, and R2 cleanup passed. | `evidence/2026-07-02-cloudflare-hosted-upload-ui-proof.*` |
| Collaboration | Hosted two-client collaboration UI proof passed with Durable Object subscriptions and remote cursor rendering. | `evidence/2026-07-02-cloudflare-hosted-collaboration-ui-proof.*` |
| Publication/share/recipient app flow | Owner publish/public share/recipient app interaction green. Real external recipient mailbox receipt remains open. | `evidence/2026-07-02-cloudflare-hosted-publication-owner-public-proof.*`, `evidence/2026-07-02-cloudflare-hosted-d1-row-publication-refresh-proof.*`, `evidence/2026-07-02-cloudflare-hosted-publication-recipient-comment-decision-proof.*`, and `evidence/2026-07-02-cloudflare-hosted-recipient-composer-ui-proof.*` |
| Provider exit | App-runtime exit prerequisites are packaged as non-destructive evidence, but the active pack at `2026-07-03T22:15:48.194Z` has `appRuntimeExitPrerequisitesReady=false` because latest deploy/source smoke is open. The active runtime scan covers deploy-relevant source/config paths, including `bun.lock` and `src/middleware.ts`, and still has `activeLegacyProviderRuntimeBlockers=0`. Full provider exit remains open. Owner reports Vercel/Supabase cancellation is already done; export/retention, rollback posture, external-persona/mailbox proof or accepted deferral, and post-exit smoke remain an operations/evidence lane. The refreshed export-attempt artifact records that no Supabase access token, DB password, or project-ref env was available and that the available CLI paths either exited before output or hung on project listing, so no raw dump was created. The sanitized operator record closes the obsolete-secret-name review gate and Resend account/API-key/domain status gate using existing sanitized evidence; it did not freshly refresh or mutate Resend domain settings. `cf:provider-exit-pack` supports the remaining sanitized external gates, and `cf:provider-exit-operator-template` writes the template plus diagnostics. The template requires sanitized evidence-source pointers for final export/retention, post-exit smoke, and recorded recipient-mailbox proof; malformed proof artifacts are reported through `parseError`. | `evidence/2026-07-03-cloudflare-provider-exit-pack.*`; `evidence/2026-07-03-cloudflare-provider-exit-operator-record.json`; `evidence/2026-07-03-provider-exit-export-metadata-attempt.*`; `evidence/2026-07-03-cloudflare-provider-exit-operator-record.template.json`; `evidence/2026-07-03-cloudflare-latest-deploy-source-smoke.*`; `evidence/2026-07-03-cloudflare-latest-deploy-source-smoke.template.json`; `35_PROVIDER_EXIT_AND_FINAL_PROOF_RUNBOOK.md`; `36_COMPREHENSIVE_FOLLOWUP_QA_LEDGER.md` |
| Latest deploy source watch | The generated latest deploy/source-smoke checker reports `latestDeploySourceSmokeReady=false` at `2026-07-03T22:15:48.057Z`: deploy evidence is present for the previously deployed source, but the local CRUD/image-auth/favorites/component-library/sidebar-access source patch is uncommitted and cannot be claimed deployed. Dirty runtime entries are `src/app/api/estimate-row-images/route.ts`, `src/app/api/projects/images/route.ts`, `src/lib/component-library/actions.ts`, `src/lib/projects/actions.ts`, `src/lib/repositories/estimate-favorites-repository.ts`, `src/lib/repositories/workspace-repository.ts`, `src/lib/uploads/upload-records.ts`, and `src/lib/workshop/actions.ts`. Proof-tooling-only `package.json` script additions are excluded from runtime dirtiness; `bun.lock`, dependency, build, runtime script, or other package metadata changes still block. Use `bun run cf:latest-deploy-source-smoke-template` as the sanitized starter, then commit/deploy/smoke the current branch after source state is settled before claiming app-runtime complete or running final provider-exit smoke. | `evidence/2026-07-03-cloudflare-latest-deploy-source-smoke.*`; `evidence/2026-07-03-cloudflare-latest-deploy-source-smoke.template.json`; `evidence/2026-07-02-cloudflare-main-worker-current-source-deploy.*`; `src/components/auth/AuthStateMismatchRecoveryScript.tsx` |

Note on the publication evidence row: run this exact inventory command to see the complete file set without guessing:

```bash
cd /Users/philiplewis/Documents/archestimator
rg -n "publication|recipient|composer|mailbox|share" .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence --glob "*.md"
```

## 2. First 15 Minutes For The Next Agent

Run these steps before implementing, deploying, or touching providers.

1. Confirm the working directory and branch:

```bash
cd /Users/philiplewis/Documents/archestimator
pwd
git status --short --branch
```

2. Read the minimum project brain:

```bash
sed -n '1,220p' AGENTS.md
sed -n '1,180p' .ai/10_state/current-state.md
sed -n '1,260p' .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/36_COMPREHENSIVE_FOLLOWUP_QA_LEDGER.md
sed -n '1,220p' .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/35_PROVIDER_EXIT_AND_FINAL_PROOF_RUNBOOK.md
sed -n '1,220p' .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-02-cloudflare-wrap-up-assessment.md
```

3. Inspect the current deploy/auth source touched by the final warning fix:

```bash
sed -n '1,180p' src/components/auth/AuthStateMismatchRecoveryScript.tsx
sed -n '1,240p' src/lib/auth/request-proxy.ts
sed -n '1,220p' tests/vitest/auth-proxy.test.ts
```

4. Inventory runnable Cloudflare scripts:

```bash
node -e "const p=require('./package.json'); for (const [k,v] of Object.entries(p.scripts||{})) if (/^(cf:|launch:verify|test|type-check|lint|validate)/.test(k)) console.log(k+'='+v)"
```

5. Check for known unrelated dirty files and preserve them:

```bash
git status --short --branch
git diff --name-only
```

Do not spend time rereading every historical plan document. Pull older documents only when a task touches that surface.

## 3. Recommended Multi-Agent / Multi-Thread Topology

Use parallel workers only for independent slices. The lead thread owns integration and final judgment.

| Thread | Role | Recommended skill/agent | Scope | Output |
| --- | --- | --- | --- | --- |
| Thread 0 | Lead orchestrator | `autopilot` + `ultragoal` | Maintain goal ledger, merge evidence, decide final pass/blocker, update `.ai/10_state/current-state.md`. | Final completion report and updated ledgers. |
| Thread A | Release/deploy verifier | `executor` + `verifier` + `cloudflare` | Deploy latest branch if needed, run hosted smoke, prove exact `state_mismatch` recovery and auth route behavior. | `evidence/YYYY-MM-DD-glm52-latest-deploy-smoke.*` |
| Thread B | Auth/persona proof | `debugger` + `verifier` + browser automation | Prove real non-owner Google account journey after Google Audience became `In production`. | `evidence/YYYY-MM-DD-glm52-non-owner-google-oauth-proof.*` |
| Thread C | Recipient/email proof | `test-engineer` + browser automation | Prove real recipient mailbox receipt and recipient app action without owner privileges. | `evidence/YYYY-MM-DD-glm52-recipient-mailbox-proof.*` |
| Thread D | Provider-exit ops | `architect` + `executor` + `cloudflare` | Build export/backup pack, capture Vercel/Supabase/Resend status, execute downgrade/cancel only after the exit-window record is complete. | `evidence/YYYY-MM-DD-glm52-provider-exit-pack.*` and post-exit smoke. |
| Thread E | Performance p95 lane | `performance-goal` or `test-engineer` + `cloudflare` | Rerun hosted performance, keep strict p95 misses visible, tune low-risk route/cache/static behavior when evidence points to a change. | `evidence/YYYY-MM-DD-glm52-public-p95-watch.*` |
| Thread F | Independent review and UltraQA | `code-reviewer` + `architect` + `ultraqa` | Adversarial review, maker/checker separation, scenario matrix, final risk classification. | `evidence/YYYY-MM-DD-glm52-final-ultraqa-review.*` |
| Thread G | Documentation/state | `writer` + `writing-plans` | Update `36`, `37`, provider runbook, README index if useful, and current-state Fast Path. | Markdown updates with `git diff --check` passing. |

### Subagent Launch Briefs

Use these as compact prompts for spawned agents or separate Codex threads. Keep each worker bounded and require sanitized evidence.

**Thread A prompt:**

```text
You are the Release/Deploy verifier for Archestimator Cloudflare migration. Work in /Users/philiplewis/Documents/archestimator. Read AGENTS.md, current-state Fast Path, docs 35/36/37, and package scripts. Preserve unrelated dirty files. Determine whether the deployed Cloudflare Worker includes the latest branch, especially src/components/auth/AuthStateMismatchRecoveryScript.tsx. If not current, run the Cloudflare build/deploy path, then verify hosted routes, auth, sensitive routes, performance, workbook, release gates, and exact state_mismatch recovery. Write sanitized evidence under .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/YYYY-MM-DD-glm52-latest-deploy-smoke.*. Do not print secrets.
```

**Thread B prompt:**

```text
You are the Auth/persona verifier. Prove the non-owner Google path on https://archestimator.com now that Google Auth Platform Audience is In production and External. Use browser automation or the signed-in desktop browser profile already available. Do not record credentials, cookies, screenshots with private email content, or OAuth secrets. Record whether the non-owner lands in /workshop, /access-required, or a closed-beta denial state, and prove the behavior matches the app policy. Write evidence/YYYY-MM-DD-glm52-non-owner-google-oauth-proof.* and update the open P1 row in doc 36.
```

**Thread C prompt:**

```text
You are the Recipient/email proof worker. Use the production Cloudflare app and a real recipient mailbox to prove a publication/share invite reaches an external inbox through the current Cloudflare Email path, opens the recipient journey, and allows only recipient-scoped action. Prove no owner workspace access. Keep message content minimal and non-sensitive. Clean synthetic data. Write evidence/YYYY-MM-DD-glm52-recipient-mailbox-proof.*.
```

**Thread D prompt:**

```text
You are the Provider-exit ops worker. Do not delete or cancel providers until the export pack and rollback decision record exist. Build a repo-safe evidence pack for Supabase, Vercel, and Resend: active use check, backup/export path outside the repo, sanitized provider status, environment-variable names only, domain/DNS status, and post-exit smoke command plan. Start from `bun run cf:provider-exit-operator-template` if the sanitized operator-record template is missing, then record the sanitized external gate state in `evidence/2026-07-03-cloudflare-provider-exit-operator-record.json` or pass its path through `PROVIDER_EXIT_OPERATOR_RECORD_FILE`, and rerun `bun run cf:provider-exit-pack`. If the exit-window decision is already recorded and the governing policy permits destructive billing actions, execute one provider at a time in the runbook order: Resend, Vercel, Supabase. After each provider action, run Cloudflare smoke and write evidence/YYYY-MM-DD-glm52-provider-exit-pack.*. Never commit exports or secrets.
```

**Thread E prompt:**

```text
You are the performance p95 lane. Rerun hosted performance against https://archestimator.com, compare workbook/release-gate fields, and keep strictHostedClientP95Ready visible. Investigate only evidence-backed low-risk improvements. Do not hide p95 misses by changing the gate semantics. Write evidence/YYYY-MM-DD-glm52-public-p95-watch.* with route timings, misses, and any source changes.
```

**Thread F prompt:**

```text
You are the independent reviewer/UltraQA lane. Review the latest Cloudflare migration diff, docs, and evidence. Run or inspect the adversarial matrix in doc 37. Lead with blockers and residual risks. Verify no secrets are committed, no Supabase/Vercel/Resend runtime dependencies remain active, provider exit claims match evidence, and synthetic cleanup is proven. Write evidence/YYYY-MM-DD-glm52-final-ultraqa-review.*.
```

## 4. Task Breakdown And Acceptance Criteria

### Task 1: Re-lock Context And Dirty Worktree

Purpose: prevent GLM5.2 from losing current state or overwriting unrelated edits.

Commands:

```bash
cd /Users/philiplewis/Documents/archestimator
git status --short --branch
git diff --name-only
git diff --check
```

Acceptance:

- The agent records which files were already dirty before its edits.
- The unrelated API rate-limiting/security planning files are not modified by Cloudflare migration work.
- `git diff --check` passes or whitespace failures are attributed to pre-existing unrelated files and then avoided in Cloudflare edits.

### Task 2: Deploy Latest Branch If Production Is Behind

Purpose: ensure production includes the last React/Next script-warning fix and current source.

Inspect:

```bash
cd /Users/philiplewis/Documents/archestimator
sed -n '1,160p' src/components/auth/AuthStateMismatchRecoveryScript.tsx
rg -n "AuthStateMismatchRecoveryScript|beforeInteractive|dangerouslySetInnerHTML|next/script" src tests
```

Build and deploy:

```bash
cd /Users/philiplewis/Documents/archestimator
bun run cf:build
bun run cf:deploy
```

If `wrangler deploy` hangs during upload but build output is valid, use the existing project pattern from prior evidence:

```bash
cd /Users/philiplewis/Documents/archestimator
bun run cf:build-upload-version
wrangler versions list --name archestimator-proof
```

Then promote the uploaded version through the Cloudflare path already proven in prior evidence. Record the version id, deployment id, and percentage in sanitized evidence.

Hosted smoke after deploy:

```bash
cd /Users/philiplewis/Documents/archestimator
CLOUDFLARE_HOSTED_ROUTE_BASE_URL=https://archestimator.com bun run cf:verify-hosted-routes
HOSTED_AUTH_BASE_URL=https://archestimator.com bun run launch:verify-hosted-auth
HOSTED_SENSITIVE_BASE_URL=https://archestimator.com bun run launch:verify-hosted-sensitive-routes
CLOUDFLARE_HOSTED_PERFORMANCE_BASE_URL=https://archestimator.com bun run cf:verify-hosted-performance
bun run cf:workbook
bun run cf:release-gates
```

Exact `state_mismatch` recovery smoke:

```bash
cd /Users/philiplewis/Documents/archestimator
curl -sS -L -D /tmp/archestimator-state-mismatch-headers.txt -o /tmp/archestimator-state-mismatch.html "https://archestimator.com/?error=state_mismatch"
node -e "const fs=require('fs'); const html=fs.readFileSync('/tmp/archestimator-state-mismatch.html','utf8'); console.log({hasStateMismatch:html.includes('state_mismatch'), hasSignIn:/Sign in|Continue with Google/.test(html), bytes:html.length});"
```

Acceptance:

- Hosted routes pass with blockers empty.
- Hosted auth and sensitive fail-closed pass.
- Release gates pass with `productionCutoverReady=true`.
- If strict p95 is still red, the workbook and release evidence preserve it as a watch item.
- Exact root `/?error=state_mismatch` reaches a clean sign-in/retry path without visible raw `state_mismatch` content.
- Evidence file is written as `evidence/YYYY-MM-DD-glm52-latest-deploy-smoke.md` and, when scripts emit JSON, `evidence/YYYY-MM-DD-glm52-latest-deploy-smoke.json`.

### Task 3: Prove Real Non-Owner Google Account Path

Purpose: close the final P1 auth/persona gap.

Known facts:

- Google Auth Platform Audience is already `In production`.
- User type is `External`.
- The Google client has production apex/`www` and local callbacks.
- App closed-beta access still depends on D1 allowlist/session policy after Google auth.

Flow:

1. Start from a browser profile not signed in as the owner.
2. Visit `https://archestimator.com/login?next=%2Fworkshop`.
3. Click `Continue with Google`.
4. Complete Google sign-in with a real non-owner account.
5. Record the final app URL and visible state:
   - `/workshop` only if that account is allowed by the app policy.
   - `/access-required` or equivalent denial if not allowed.
   - no raw `state_mismatch` at any point.
6. If the non-owner account should be allowed for closed beta, insert or verify an allowed email row through the existing app/admin/Cloudflare D1 path and record only the email hash or redacted email form in evidence.
7. If the expected result is denial, prove no workspace/project data is visible.

Suggested evidence checks:

```bash
cd /Users/philiplewis/Documents/archestimator
rg -n "closed_beta|access-required|allowed_emails|Better Auth|session" src scripts tests
```

Acceptance:

- The Google provider no longer blocks the account before the app callback.
- The app accepts or denies the account according to the closed-beta policy.
- Evidence redacts email addresses except the owner-approved domain or a short masked form.
- No cookies, OAuth codes, refresh tokens, client secrets, or session tokens appear in evidence.
- `36_COMPREHENSIVE_FOLLOWUP_QA_LEDGER.md` is updated from open P1 to pass or to an explicitly accepted deferral.

### Task 4: Prove Real Recipient Mailbox Delivery

Purpose: close the external email/mailbox quality gap for publication/share recipients.

Flow:

1. Use an owner session on `https://archestimator.com`.
2. Create or reuse a synthetic project/estimate with a unique proof marker:

```text
GLM52 recipient mailbox proof 2026-07-02
```

3. Publish/share it using the in-app Publisher flow.
4. Send or trigger a recipient invite to a real mailbox that is not the owner mailbox.
5. Verify the mailbox receives the message. Do not store full mailbox content in repo evidence.
6. Open the link in a recipient browser context.
7. Prove recipient-scoped actions:
   - can view the intended share/recipient page,
   - can submit comment or decision if that is the intended workflow,
   - cannot access owner workspace/project routes.
8. Read back D1 rows for recipient/comment/decision using sanitized identifiers.
9. Clean up synthetic project, publication, recipient rows, comments, decisions, and related artifacts.

Inventory commands:

```bash
cd /Users/philiplewis/Documents/archestimator
rg -n "recipient|publication|share|composer|Cloudflare Email|email" src scripts tests .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence --glob "!**/*.png"
```

Acceptance:

- A real mailbox receipt is proven without saving secrets or full personal mailbox content.
- The recipient app flow is proven from a recipient browser context.
- Owner-only data is not visible to the recipient.
- Cleanup evidence shows zero synthetic residue for the marker.
- `36_COMPREHENSIVE_FOLLOWUP_QA_LEDGER.md` and `33_POST_CUTOVER_FULL_APP_QA_LEDGER.md` are updated with pass status.

### Task 5: Build Provider Exit Export Pack Outside The Repo

Purpose: preserve rollback and audit options before downgrading or cancelling legacy providers.

Create a backup location outside the repository:

```bash
BACKUP_DIR="/Users/philiplewis/Documents/archestimator-provider-exit-backups/2026-07-02"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
```

Supabase export targets:

- Schema dump.
- Data dump.
- Auth/user-related rows needed for audit.
- Storage inventory.
- Migration archaeology notes.
- Project id boundary: Archestimator project `ebxxqidacheyapmmzavr` only.

Supabase CLI path when authenticated:

```bash
cd /Users/philiplewis/Documents/archestimator
supabase --version
supabase projects list
supabase db dump --project-ref ebxxqidacheyapmmzavr --file "$BACKUP_DIR/supabase-ebxxqidacheyapmmzavr-full.sql"
supabase db dump --project-ref ebxxqidacheyapmmzavr --schema public --file "$BACKUP_DIR/supabase-ebxxqidacheyapmmzavr-public-schema.sql"
```

If CLI auth is unavailable, use the browser/dashboard export path and write a repo-safe evidence note containing:

- export file names,
- export timestamp,
- provider project id,
- file sizes,
- checksum command output from local files,
- no raw database content.

Checksum command:

```bash
shasum -a 256 "$BACKUP_DIR"/*
```

Vercel export targets:

- Current project name and id if visible.
- Domain assignments for `archestimator.com` and `www.archestimator.com`.
- Environment variable names only.
- Latest deployment metadata.
- Rollback deployment reference if keeping one temporarily.

Vercel CLI path when authenticated:

```bash
cd /Users/philiplewis/Documents/archestimator
vercel --version
vercel projects ls
vercel domains ls
vercel env ls
```

Resend export targets:

- Sending domain status.
- API key names/created dates only, no key values.
- Recent delivery log status for app auth/share emails.
- Suppression/bounce records if available.

Cloudflare active resource readback:

```bash
cd /Users/philiplewis/Documents/archestimator
bun run cf:check-wrangler-auth
bun run cf:check-provider-resources
bun run cf:check-email
```

Acceptance:

- Backups exist outside `/Users/philiplewis/Documents/archestimator`.
- Repo evidence contains metadata and checksums only.
- The evidence states whether each provider is still needed for rollback or historical audit.
- No provider export, SQL dump, raw user data, raw email log, cookie, or secret is added to the repo.

### Task 6: Provider Downgrade/Cancellation Sequence

Purpose: remove paid legacy-provider dependency after Cloudflare proof and backups are safe.

Order:

1. Resend first, after Cloudflare Email proof and magic-link/share email proof are current.
2. Vercel second, after DNS/custom-domain and rollback deployment decisions are recorded.
3. Supabase last, after final export/backups and data-retention/rollback decision are recorded.

Pre-action smoke:

```bash
cd /Users/philiplewis/Documents/archestimator
CLOUDFLARE_HOSTED_ROUTE_BASE_URL=https://archestimator.com bun run cf:verify-hosted-routes
HOSTED_AUTH_BASE_URL=https://archestimator.com bun run launch:verify-hosted-auth
HOSTED_SENSITIVE_BASE_URL=https://archestimator.com bun run launch:verify-hosted-sensitive-routes
CLOUDFLARE_HOSTED_PERFORMANCE_BASE_URL=https://archestimator.com bun run cf:verify-hosted-performance
bun run cf:workbook
bun run cf:release-gates
```

Post-action smoke after each provider change:

```bash
cd /Users/philiplewis/Documents/archestimator
CLOUDFLARE_HOSTED_ROUTE_BASE_URL=https://archestimator.com bun run cf:verify-hosted-routes
HOSTED_AUTH_BASE_URL=https://archestimator.com bun run launch:verify-hosted-auth
HOSTED_SENSITIVE_BASE_URL=https://archestimator.com bun run launch:verify-hosted-sensitive-routes
bun run cf:check-provider-resources
bun run cf:check-email
bun run cf:release-gates
```

App-surface smoke after all provider changes:

- Production owner Google OAuth real browser.
- Magic link real mailbox.
- Non-owner Google account path.
- Project/workshop read route.
- Estimate row edit/readback.
- R2 upload UI and cleanup.
- Public share route.
- Recipient mailbox journey.
- Collaboration two-client Durable Object proof if any collaboration code changed.

Acceptance:

- Each provider action has before/after evidence.
- Any cancellation/downgrade confirmation number or billing-state text is captured as sanitized metadata.
- No app runtime proof depends on Vercel, Supabase, or Resend after the action.
- If a provider cannot be downgraded because of rollback policy, record the exact reason and keep the overall migration status as "Cloudflare runtime complete, provider account exit pending."

### Task 7: Continue Public p95 Watch Without Hiding It

Purpose: honor the site-speed goal while keeping release gating honest.

Commands:

```bash
cd /Users/philiplewis/Documents/archestimator
CLOUDFLARE_HOSTED_PERFORMANCE_BASE_URL=https://archestimator.com bun run cf:verify-hosted-performance
bun run cf:workbook
bun run cf:release-gates
```

Evidence fields to record:

- `strictHostedClientP95Ready`
- `hostedPerformanceReady`
- `aggregateHostedPerformanceReady`
- `productionRuntimePerformanceReady`
- p95 misses by route
- sample count
- Worker wall/cpu timing if available
- route contract status

Allowed low-risk fixes:

- Static/prerender route verification for `/login` and other credential-free pages.
- Cache header correction when a route is truly public and does not leak user data.
- Asset size cleanup when source evidence identifies a specific heavy bundle or image.
- OpenNext/Worker config changes only with focused tests and hosted smoke.

Disallowed shortcuts:

- Do not classify p95 as green by dropping samples.
- Do not hide strict p95 misses from workbook/release evidence.
- Do not cache authenticated or user-specific routes publicly.
- Do not optimize by weakening fail-closed auth or share-token checks.

Acceptance:

- The p95 evidence is current.
- A red strict p95 watch remains visible when it is red.
- Any source change has focused tests and hosted route/performance smoke.

### Task 8: Final UltraQA Scenario Matrix

Purpose: find the kind of failures that normal build/typecheck cannot catch.

Run or prove each row. Mark any unrun row as a named residual risk, not as pass.

| ID | Scenario | Expected result | Evidence |
| --- | --- | --- | --- |
| QA-AUTH-001 | Exact `https://archestimator.com/?error=state_mismatch` | Clean reset/login path; no raw visible `state_mismatch`; fresh Google start possible. | Curl plus browser or script evidence. |
| QA-AUTH-002 | Owner production Google OAuth | Lands authenticated in app; no state mismatch. | Real browser proof. |
| QA-AUTH-003 | Local `http://localhost:3000` Google OAuth | Lands authenticated locally; D1 local user/account/session rows present. | Real browser proof or current accepted evidence. |
| QA-AUTH-004 | `127.0.0.1` local login attempt | Not accepted as canonical proof unless host-dynamic config is implemented. | Recorded boundary. |
| QA-AUTH-005 | Non-owner Google | Provider allows callback; app closed-beta policy allows or denies correctly. | Real persona proof. |
| QA-AUTH-006 | Revoked/expired/missing closed-beta session | Redirects to login or access-required with no private data. | Hosted synthetic matrix. |
| QA-EMAIL-001 | Magic link real mailbox | Receives link through Cloudflare Email and creates session. | Mailbox proof. |
| QA-EMAIL-002 | Recipient invite real mailbox | Receives invite; recipient-scoped route/action works; owner data hidden. | Recipient proof. |
| QA-DATA-001 | Estimate row edit/idempotency | D1 updates once; duplicate/retry does not corrupt. | Hosted estimate-history proof. |
| QA-DATA-002 | Cross-workspace write attempt | Denied with zero mutation. | Hosted proof or targeted test. |
| QA-R2-001 | Upload UI and cleanup | Upload persists to R2/D1 and cleanup removes object and rows. | Hosted upload UI proof. |
| QA-R2-002 | Bad file type/oversize/path traversal | Rejected safely; no R2 path escape. | Security test or evidence note. |
| QA-DO-001 | Two-client collaboration | Durable Object session/cursor behavior works; cleanup passes. | Hosted collaboration UI proof. |
| QA-SHARE-001 | Invalid share token | Fail-closed public route. | Sensitive route proof. |
| QA-SHARE-002 | Public share cache safety | No authenticated private data in public cache. | Headers and route proof. |
| QA-PERF-001 | Strict p95 red with release gate green | Watch remains visible and not hidden. | Workbook/release gate evidence. |
| QA-PROVIDER-001 | Supabase removed from runtime | No active app code/env path requires Supabase for production. | Source search plus hosted smoke. |
| QA-PROVIDER-002 | Vercel removed from runtime | DNS/app route still served by Cloudflare after Vercel downgrade/cancel. | DNS/provider smoke. |
| QA-PROVIDER-003 | Resend removed from runtime | Magic-link/share mail still works through Cloudflare Email. | Email proof. |
| QA-SEC-001 | Secrets in repo/evidence | No secrets, dumps, cookies, OAuth codes, API keys, or raw exports committed. | `rg` and manual review. |
| QA-WORKTREE-001 | Dirty worktree | Only intended files changed; unrelated edits preserved. | `git status` and diff summary. |
| QA-SCRIPT-001 | Misleading success output | Exit code and JSON blockers agree in explicit strict verifier mode; default report-generation mode may remain non-fatal while still writing blockers. | Strict CLI test plus script output inspection. |
| QA-OPS-001 | Provider cancellation rollback | Backups/checksums and rollback decision exist before irreversible action. | Provider exit pack. |

Baseline commands:

```bash
cd /Users/philiplewis/Documents/archestimator
bunx playwright test --list
bunx vitest run tests/vitest/auth-entry-ui-contract.test.ts tests/vitest/auth-redirect-sanitizer.test.ts tests/vitest/auth-magic-link.test.ts tests/vitest/cloudflare-hosted-route-script.test.ts tests/vitest/cloudflare-release-gates-script.test.ts --maxWorkers=1
bunx playwright test e2e/auth.spec.ts
bunx tsc --noEmit --pretty false
bun run lint
bun run test
bun run test:dom
git diff --check
```

Hosted commands:

```bash
cd /Users/philiplewis/Documents/archestimator
CLOUDFLARE_HOSTED_ROUTE_BASE_URL=https://archestimator.com bun run cf:verify-hosted-routes
HOSTED_AUTH_BASE_URL=https://archestimator.com bun run launch:verify-hosted-auth
HOSTED_SENSITIVE_BASE_URL=https://archestimator.com bun run launch:verify-hosted-sensitive-routes
CLOUDFLARE_HOSTED_PERFORMANCE_BASE_URL=https://archestimator.com bun run cf:verify-hosted-performance
bun run cf:verify-hosted-upload-ui
bun run cf:verify-hosted-collaboration-ui
bun run cf:workbook
bun run cf:release-gates
```

Acceptance:

- The matrix is written to evidence with pass/fail/residual-risk rows.
- Failures lead to fixes or explicit risk records.
- Green summary is not claimed unless the matrix and provider-exit gates support it.

### Task 9: Independent Review And Slop/Cleanup Gate

Purpose: avoid ending a 24-hour migration on a false-positive.

Review sequence:

1. Maker lane finishes implementation/evidence.
2. Independent code-reviewer lane reviews diff and evidence.
3. Architect lane reviews provider-exit/runtime claims.
4. UltraQA lane runs adversarial matrix.
5. Lead integrates findings and fixes.
6. Rerun targeted verification after every fix.

Review focus:

- Runtime still points to Cloudflare-only active services.
- Supabase imports are historical, migration, or quarantined only; no active production path needs Supabase.
- Vercel is not serving production traffic and not required for deploy.
- Resend is not required for auth/share email once Cloudflare Email proof is current.
- Better Auth sessions are D1-backed and fail closed.
- R2 cleanup removes object keys individually.
- Durable Object collaboration is still live after deploy.
- Provider exits have backups and rollback records.
- No secrets or raw provider data are in repo evidence.

Suggested source searches:

```bash
cd /Users/philiplewis/Documents/archestimator
rg -n "supabase|SUPABASE|@supabase|Vercel|VERCEL|resend|RESEND|Resend" src app scripts tests package.json wrangler.jsonc cloudflare-env.d.ts .env.example .dev.vars.example
rg -n "better-auth|D1|R2|Durable Object|Queue|Cloudflare Email|CLOSED_BETA_ACCESS_ENABLED" src scripts tests wrangler.jsonc
```

Acceptance:

- Review findings are resolved or recorded as residual risk.
- The final report leads with blockers if any remain.
- The durable goal stays active if provider exit remains incomplete.

### Task 10: Update Ledgers, State, And Final Claim

Purpose: make the next handoff unnecessary.

Files to update:

- `.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/36_COMPREHENSIVE_FOLLOWUP_QA_LEDGER.md`
- `.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/35_PROVIDER_EXIT_AND_FINAL_PROOF_RUNBOOK.md` when provider-exit status changes
- `.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/37_GLM52_CLOUDFLARE_MIGRATION_HANDOFF.md` when this plan is executed or superseded
- `.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/README.md` if the document index should include doc 37
- `.ai/10_state/current-state.md` Fast Path when durable project truth changes

Final completion status rules:

| Status | Required evidence |
| --- | --- |
| Cloudflare app runtime complete | Latest deploy source-smoke gate ready, production/local auth, route/auth/sensitive gates, D1/R2/DO/email core surfaces, release gates, and UltraQA pass. |
| Full migration complete | Cloudflare app runtime complete plus provider exports, provider downgrade/cancel or accepted retained-free posture, post-exit smoke, non-owner Google proof, recipient mailbox proof, and state/ledger updates. |
| Near-complete | App runtime green, but provider exit or external-persona proof remains open. |
| Blocked | A required provider/browser/account action cannot be completed and no safe alternate proof exists. |

Do not use `update_goal complete` unless the "Full migration complete" row is satisfied. If app runtime is green but provider account exit is still pending, report "near-complete" and keep the goal active.

## 5. Evidence Naming And Report Template

Use these evidence slots for the remaining work. If a lane runs on a later date, keep the lane slug and replace only the date prefix with the actual UTC date of the run.

```text
.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-02-glm52-latest-deploy-smoke.md
.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-02-glm52-latest-deploy-smoke.json
.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-02-glm52-non-owner-google-oauth-proof.md
.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-02-glm52-non-owner-google-oauth-proof.json
.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-02-glm52-recipient-mailbox-proof.md
.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-02-glm52-recipient-mailbox-proof.json
.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-03-cloudflare-provider-exit-pack.md
.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-03-cloudflare-provider-exit-pack.json
.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-03-cloudflare-provider-exit-operator-record.json
.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-02-glm52-provider-post-exit-smoke.md
.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-02-glm52-provider-post-exit-smoke.json
.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-02-glm52-public-p95-watch.md
.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-02-glm52-public-p95-watch.json
.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-03-glm52-final-ultraqa-review.md
.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-03-glm52-final-ultraqa-review.json
```

Markdown evidence structure:

```markdown
# GLM5.2 Latest Deploy Smoke

Generated: 2026-07-02T14:30:00Z
Status: pass
Worker: archestimator-proof
Production URL: https://archestimator.com

## Claim

The latest Cloudflare Worker deployment serves the current source and passes hosted release smoke on https://archestimator.com.

## Commands Or Browser Steps

Commands run: `bun run cf:build`, `bun run cf:deploy`, hosted route/auth/sensitive/performance checks, workbook, release gates, and exact root state-mismatch curl. No secrets, cookies, OAuth codes, or raw provider exports were recorded.

## Results

| Check | Result | Evidence |
| --- | --- | --- |
| Hosted routes | pass | blockers empty |
| Release gates | pass | productionCutoverReady=true |

## Cleanup

No synthetic mutation was performed by this lane.

## Residual Risk

Strict hosted p95 remains a watch item if `strictHostedClientP95Ready=false`.
```

JSON evidence shape:

```json
{
  "generatedAt": "2026-07-02T00:00:00.000Z",
  "status": "pass",
  "claim": "Exact claim proven by this evidence file.",
  "productionUrl": "https://archestimator.com",
  "worker": "archestimator-proof",
  "checks": [
    {
      "name": "check name",
      "status": "pass",
      "evidence": "sanitized evidence string"
    }
  ],
  "blockers": [],
  "residualRisks": [],
  "cleanup": {
    "required": true,
    "status": "pass",
    "evidence": "sanitized cleanup evidence"
  }
}
```

Every committed evidence file must contain real values from the lane run. Omit a section when the lane did not produce that kind of evidence.

## 6. Provider Runtime Dependency Audit

Run this before and after provider-exit actions.

```bash
cd /Users/philiplewis/Documents/archestimator
rg -n "supabase|SUPABASE|@supabase|createClient\\(|postgres|POSTGRES|Vercel|VERCEL|resend|RESEND|Resend" src app scripts tests package.json wrangler.jsonc .env.example .dev.vars.example
```

Interpretation rules:

- Historical docs, migration scripts, archived tests, and explicit legacy-provider runbooks are allowed to mention Supabase/Vercel/Resend.
- Active production source under `src/`, active server actions, active API routes, Worker config, and app auth/email paths must not require Supabase/Vercel/Resend.
- If a legacy reference remains active, classify it as a blocker or intentionally retained historical tool with a short explanation.
- Do not delete legacy migration archaeology just to make `rg` clean.

Expected final active-provider map:

| Capability | Target provider |
| --- | --- |
| Hosting/runtime | Cloudflare Workers/OpenNext |
| App database | Cloudflare D1 |
| Auth/session | Better Auth backed by D1 |
| Media/attachments | Cloudflare R2 |
| Collaboration transport | Cloudflare Durable Objects |
| Async jobs | Cloudflare Queues/Cron |
| App email | Cloudflare Email |
| DNS/security/analytics | Cloudflare |
| User/collaborator model | App-level Better Auth + D1 memberships, not Cloudflare for Platforms |

## 7. Local Developer Mode Contract

Local sign-in is not optional. The owner specifically asked to keep Gmail sign-in working locally.

Required local contract:

- `http://localhost:3000/login?next=%2Fworkshop` starts Google OAuth.
- Google callback is `http://localhost:3000/api/auth/callback/google`.
- Better Auth local sessions persist in local D1.
- The user can pass the terms gate and reach `/workshop`.
- Ignored local env files may contain the local OAuth client credentials, but these values must never be printed or committed.

Suggested local proof:

```bash
cd /Users/philiplewis/Documents/archestimator
bunx vitest run tests/vitest/auth-proxy.test.ts tests/vitest/auth-redirect-sanitizer.test.ts --maxWorkers=1
bun run dev
```

Use browser automation or desktop Chrome to complete the flow on `http://localhost:3000`. Stop the dev server after proof. If port `3000` is occupied, identify the process and choose whether to reuse it or stop it according to the current workspace practice; do not silently switch the proof to `127.0.0.1`.

## 8. Known Recovery Paths

### State mismatch returns

1. Capture the exact URL and final redirect chain without logging cookies.
2. Probe the current root recovery:

```bash
curl -sS -I "https://archestimator.com/?error=state_mismatch"
curl -sS -L -D /tmp/archestimator-state-mismatch-headers.txt -o /tmp/archestimator-state-mismatch.html "https://archestimator.com/?error=state_mismatch"
```

3. Inspect the source:

```bash
rg -n "state_mismatch|oauth_state_reset|Clear-Site-Data|better-auth.state" src scripts tests
```

4. Rerun focused auth tests and hosted auth/route checks.
5. Do not remove the edge fallback/normalizer until main Worker source proof and live recovery proof both pass.

### Worker deploy hangs

1. Confirm `bun run cf:build` passes.
2. Use `bun run cf:build-upload-version`.
3. Inspect uploaded versions.
4. Promote the uploaded version using the already-proven Cloudflare Versions path.
5. Record version id/deployment id and run hosted smoke.

### p95 is red

1. Confirm route contracts and sample counts.
2. Preserve red p95 in workbook evidence.
3. Check whether Worker wall/cpu time indicates app latency or client/network variance.
4. Apply only evidence-backed low-risk optimizations.
5. Rerun hosted performance, workbook, and release gates.

### Provider dashboard/CLI auth fails

1. Switch to the desktop browser where the owner is logged in.
2. Use Computer Use or browser automation only for readback/export actions needed for evidence.
3. Save only sanitized metadata in repo.
4. Store raw exports outside the repo.

## 9. Final Response Shape For GLM5.2

When the remaining work is complete, the final response should be short and evidence-led:

```text
Cloudflare app runtime is complete and provider exit is complete.

Production is served from Cloudflare Workers/OpenNext at https://archestimator.com. Active data/auth/media/collaboration/email paths are D1, Better Auth, R2, Durable Objects, Queues/Cron, and Cloudflare Email. Supabase/Vercel/Resend are no longer active runtime dependencies.

Evidence:
- Latest deploy smoke: .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-02-glm52-latest-deploy-smoke.md
- Non-owner Google proof: .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-02-glm52-non-owner-google-oauth-proof.md
- Recipient mailbox proof: .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-02-glm52-recipient-mailbox-proof.md
- Provider exit pack: .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-03-cloudflare-provider-exit-pack.md
- Post-exit smoke: .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-02-glm52-provider-post-exit-smoke.md
- Final UltraQA review: .ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-03-glm52-final-ultraqa-review.md

Verification:
- Hosted route/auth/sensitive checks passed.
- Workbook and release gates passed.
- Final UltraQA matrix passed.

Residual risk:
- Strict hosted p95 remains a watch item if it is still red in the workbook.
```

If latest deploy/source smoke is proven but provider exit remains unexecuted,
use this wording:

```text
Cloudflare app runtime is complete for closed-beta operation, but full provider account exit is still pending. The remaining work is provider exports/downgrade/cancel/post-exit smoke, plus any explicitly listed external-persona proof.
```

If latest deploy/source smoke is still unproven, do not call the app runtime
complete. Use the current readiness language instead:

```text
Cloudflare migration implementation has local proof/tooling coverage, but latest deployed-source smoke and provider exit remain open. The remaining work is latest-branch deploy/source evidence, provider exports/downgrade/cancel/post-exit smoke, plus any explicitly listed external-persona proof.
```

## 10. Self-Review Checklist For This Handoff

- [x] The plan states the current readiness booleans, blocker counts, and why the goal is not fully complete.
- [x] The plan names the remaining P1 gaps: non-owner Google, recipient mailbox, provider exit, p95 watch.
- [x] The plan includes multiple agent/thread lanes with bounded scopes and outputs.
- [x] The plan includes exact local and hosted verification commands from the current `package.json`.
- [x] The plan preserves the local developer Google OAuth requirement on `http://localhost:3000`.
- [x] The plan keeps Cloudflare for Platforms out of the current user model.
- [x] The plan prevents secret leakage and repo-committed provider exports.
- [x] The plan keeps destructive provider actions behind export/backups and rollback records.
- [x] The plan includes an UltraQA adversarial matrix, not just build/typecheck.
- [x] The plan defines final status language for both full completion and near-complete handoff.

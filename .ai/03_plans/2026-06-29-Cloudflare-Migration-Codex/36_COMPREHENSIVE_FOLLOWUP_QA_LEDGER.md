# Comprehensive Follow-Up QA Ledger

Created: 2026-07-02T13:09:06Z  
Status: active ledger  
Owner: Codex lead orchestrator  
Goal: prove Archestimator can run Cloudflare-only, with Google and magic-link auth working on `https://archestimator.com` and local developer mode on `http://localhost:3000`, before any provider downgrade or cancellation is treated as safe.

## Executive State

Current readiness classification: Cloudflare-only app path closed-beta ready, not final provider-exit complete.

App-side migration progress is about 99.7/100. The owner production Google OAuth path and the local developer Gmail OAuth callback/session path are now freshly proven. The remaining auth-related proof gap is the P1 real non-owner closed-beta Google persona.

Cloudflare for Platforms / Workers for Platforms is not needed for the current estimate-sheet user model. Use Better Auth, D1 users/sessions/memberships, Workers, D1, R2, Queues, Durable Objects, and Cloudflare Email. Reconsider Cloudflare for Platforms only if the product later needs tenant-owned custom domains, tenant-deployed workers, or hard runtime isolation per customer.

Public-route strict p95 is a visible watch item, not a release blocker by itself. The active release gate is hosted route contracts, enough public samples, provider runtime readiness, and aggregate hosted performance. Strict p95 misses must stay visible in the workbook and release-gate evidence.

## Execution Contract

- Do not ask for approval for non-destructive commands, local edits, evidence generation, or safe synthetic QA with cleanup.
- Do not print or persist secret values from `.env*`, `.dev.vars`, provider dashboards, OAuth clients, API tokens, or cookies.
- Preserve the dirty worktree. Treat existing edits as user/agent work unless proven otherwise.
- Do not delete, cancel, downgrade, or rotate external providers as part of QA. Provider exit remains a separate ops step after backups/exports and rollback smoke are accepted.
- Hosted synthetic-mutating checks must create uniquely named test data, prove cleanup, and record evidence paths.
- Local developer proof must use `http://localhost:3000` for Google OAuth callback compatibility. `127.0.0.1` is not a substitute for the required local proof.

## Source Authority

| Id | Source | Role |
| --- | --- | --- |
| SRC-01 | Active user request and goal | Requires Cloudflare-only completion, no approval prompts, production and localhost Gmail sign-in. |
| SRC-02 | `33_POST_CUTOVER_FULL_APP_QA_LEDGER.md` | Prior full-app QA status and remaining gaps. |
| SRC-03 | `34_FULL_CLOUDFLARE_APP_VERIFICATION_LEDGER.md` | Full Cloudflare verification matrix and acceptance state. |
| SRC-04 | `35_PROVIDER_EXIT_AND_FINAL_PROOF_RUNBOOK.md` | Provider exit boundaries and final proof ordering. |
| SRC-05 | Evidence files under `evidence/` | Current proof artifacts, timestamps, and generated script outputs. |
| SRC-06 | Source/tests/scripts in repo | Ground truth for runnable verification and implementation behavior. |
| SRC-07 | Parallel verifier lanes | Independent auth, test-matrix, hosted, and security findings to integrate. |

## Completion Gates

| Gate | Required proof | Current state |
| --- | --- | --- |
| G-01 Production Google OAuth owner | Fresh real browser completion on `https://archestimator.com`, ending in an authenticated app session without `state_mismatch`. | Pass: `evidence/2026-07-02-production-google-oauth-real-browser-proof.*`. |
| G-02 Local developer Google OAuth | Fresh real browser completion on `http://localhost:3000`, ending in an authenticated local app session. | Pass: `evidence/2026-07-02-local-dev-google-oauth-real-browser-proof.*`. |
| G-03 Google OAuth non-owner | Real or equivalent external-persona completion through closed-beta / access-required behavior. | Open external-persona gap. |
| G-04 Magic link | Production request, delivery or equivalent Cloudflare Email proof, verify-link session. | Previously green; rerun as regression if auth changes. |
| G-05 Closed beta gates | Signed-out, allowed, denied, revoked, expired, and malformed sessions. | Previously green; rerun after auth changes. |
| G-06 Projects and estimates | CRUD, row edits, tabs, history, rollback/idempotency, viewer/cross-workspace denial. | Previously green synthetic hosted proof; rerun if related code changes. |
| G-07 Components and uploads | Component library operations, R2 upload runtime/UI/scanner/lifecycle. | Previously green synthetic hosted proof; rerun if related code changes. |
| G-08 Publication/share/recipient | Owner publish, public share open, recipient session/comment/decision, owner composer. | Previously green except real recipient mailbox remains ops follow-up. |
| G-09 Collaboration | Invitation, acceptance, and two-client Durable Object cursor/session behavior. | Previously green synthetic hosted proof. |
| G-10 Security denial | Fail-closed sensitive routes, cross-workspace denial, token/state sanitization. | Previously green; security lane to refresh adversarial view. |
| G-11 Performance/release | Hosted route contracts, hosted performance, workbook, release gates. | Current release gate passes with strict p95 watch. |
| G-12 Provider exit | Exports/backups, downgrade/cancel, post-exit smoke, rollback path. | Not executed; must remain separate from app QA. |

## Workstreams

| Lane | Owner | Scope | Status |
| --- | --- | --- | --- |
| Lead integration | Codex lead | Ledger, command queue, fixes, evidence integration, final judgment. | Active |
| Auth debugger | Turing | Auth source/evidence, state mismatch, hosted/local Google callback gap. | Integrated; owner production and localhost callback/session are now proven. |
| Test matrix | Rawls | Safe command inventory and priority matrix. | Completed initial report; 25 Playwright tests listed and 52 Vitest tests passed. |
| Hosted verifier | Volta | Hosted proof currentness, credential-free checks, evidence gaps. | Active |
| Security/adversarial | Raman | Security gaps, auth/session/public-route adversarial review. | Active |

## Required Verification Queue

### Phase 0: Safe Baseline

- `git status --short --branch`
- `bunx playwright test --list`
- `bunx vitest run tests/vitest/auth-entry-ui-contract.test.ts tests/vitest/auth-redirect-sanitizer.test.ts tests/vitest/auth-magic-link.test.ts tests/vitest/cloudflare-hosted-route-script.test.ts tests/vitest/cloudflare-release-gates-script.test.ts --maxWorkers=1`
- `bunx playwright test e2e/auth.spec.ts`
- `CLOUDFLARE_HOSTED_ROUTE_BASE_URL=https://archestimator.com bun run cf:verify-hosted-routes`
- `HOSTED_AUTH_BASE_URL=https://archestimator.com bun run launch:verify-hosted-auth`
- `HOSTED_SENSITIVE_BASE_URL=https://archestimator.com bun run launch:verify-hosted-sensitive-routes`
- `CLOUDFLARE_HOSTED_PERFORMANCE_BASE_URL=https://archestimator.com bun run cf:verify-hosted-performance`
- `bun run cf:workbook`
- `bun run cf:release-gates`

### Phase 1: Auth Blocker Proof

- Reproduce and inspect `https://archestimator.com/?error=state_mismatch` without logging cookies or secrets.
- Prove production Google OAuth start uses the expected callback URL and creates a state cookie.
- Prove production Google OAuth owner completion in a real browser session. Done in `evidence/2026-07-02-production-google-oauth-real-browser-proof.*`.
- Prove local Google OAuth start on `http://localhost:3000`.
- Prove local Google OAuth callback/session completion on `http://localhost:3000`. Done in `evidence/2026-07-02-local-dev-google-oauth-real-browser-proof.*`.
- Rerun Better Auth provider/readiness scripts if auth config changes.

### Phase 2: Hosted Synthetic Mutation With Cleanup

Run only after Phase 1 fixes are understood or when unchanged surfaces need final confidence:

- Hosted estimate history / rows / tabs / rollback proof.
- Hosted upload lifecycle and upload UI proof.
- Hosted collaboration invitation and two-client UI proof.
- Hosted project CRUD proof if wrapper exists.
- Hosted component library proof if wrapper exists.
- Hosted publication/share/recipient proof if wrapper exists.

### Phase 3: Broad Local Gates

- `bunx tsc --noEmit --pretty false`
- `bun run lint`
- `bun run test`
- `bun run test:dom`
- Default Playwright smoke, with legacy Supabase specs remaining opt-in/quarantined unless intentionally enabled.

### Phase 4: Provider Exit

Do not execute inside this QA loop. Required later:

- Confirm export/backups for Supabase and Vercel.
- Confirm rollback target and rollback credentials without exposing secrets.
- Downgrade/cancel one provider at a time.
- Run post-exit smoke on auth, projects, estimates, uploads, share, collaboration, and email.

## Adversarial Scenario Matrix

| Scenario | Expected result | Status |
| --- | --- | --- |
| Stale Google OAuth state cookie | Callback fails closed and can restart cleanly. | Pass for owner production and localhost developer proof. |
| OAuth callback host mismatch | No silent session corruption; user can restart on correct host. | Pass for required `localhost` developer completion proof. |
| `127.0.0.1` used instead of `localhost` | Not accepted as proof for local dev Gmail sign-in. | Recorded. |
| Missing, expired, revoked, or malformed closed-beta session | Access denied or redirected as designed. | Previously green. |
| Non-owner Google account | Lands in allowed or access-required flow according to closed-beta policy. | Open. |
| Invalid share token | Public route returns safe not-found/denied state. | Previously green. |
| Recipient session with no owner privileges | Can act only on recipient scope; cannot access owner workspace. | Previously green; mailbox receipt open. |
| Viewer/cross-workspace write attempt | Denied and logged without mutation. | Previously green. |
| Duplicate estimate row/history submit | Idempotent or safely rejected; no duplicate corruption. | Previously green. |
| Upload oversize/bad type/path traversal | Rejected safely; no R2 path escape. | Needs security lane refresh. |
| Public route cache leak | No authenticated data cached publicly. | Security lane refresh. |
| Script success masking failure | Evidence JSON and exit code must agree. | Included in script tests. |
| Dirty worktree during QA | Preserve unrelated changes and report touched files only. | Active. |

## Open Blockers And Gaps

| Priority | Gap | Why it matters | Next action |
| --- | --- | --- | --- |
| P1 | Real non-owner Google account completion. | Closed-beta access policy needs external-persona confirmation. | Use browser/persona path or equivalent if available. |
| P1 | Real recipient mailbox delivery. | Publication recipient workflow proof currently uses controlled/synthetic evidence. | Treat as ops follow-up unless email surface changes. |
| P1 | Provider exit not executed. | Cancelling/downgrading providers is irreversible ops work. | Follow runbook after final app proof and backups. |
| P1 | Strict public p95 watch. | User cares about site speed; watch should not disappear. | Keep workbook/release-gate visibility and optimize after auth is stable. |
| P2 | Legacy Supabase E2E quarantine. | Broad default E2E cannot represent old Supabase fixtures. | Keep quarantined; do not use legacy failures as Cloudflare blockers. |

## Decision Log

- Cloudflare Platforms is deferred. Current users belong inside the app data model, not separate customer platform deployments.
- Supabase and Vercel can be downgraded only after final app proof plus backups/exports and provider-exit smoke.
- Public strict p95 misses are a visible watch item, while hosted route contracts and aggregate/runtime provider readiness remain the release gate.
- Production and local Google OAuth completion are both required. Both are now freshly proven for the owner profile; local start-only proof has been superseded by completed callback/session evidence.

## Final Completion Checklist

- [x] Production Google OAuth owner session proven fresh.
- [x] Local `http://localhost:3000` Google OAuth session proven fresh.
- [x] State mismatch no longer blocks restart or completion for the proven owner/local journeys.
- [ ] Magic link still passes after any auth fix.
- [ ] Closed-beta gates still pass after any auth fix.
- [ ] Hosted credential-free route/auth/sensitive/performance evidence refreshed.
- [ ] Hosted synthetic mutation surfaces either rerun or explicitly unchanged with current evidence accepted.
- [ ] Broad local type/test gates run or explicit validation gap recorded.
- [ ] Provider exit remains separate and not falsely claimed complete.
- [ ] `.ai/10_state/current-state.md` updated with the final evidence and remaining risk.

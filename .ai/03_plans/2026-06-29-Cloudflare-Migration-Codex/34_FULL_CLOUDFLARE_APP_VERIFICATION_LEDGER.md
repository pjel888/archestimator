# Full Cloudflare App Verification Ledger

Status: active
Last updated: 2026-07-02

## Objective

Finish the Cloudflare-only migration with evidence from local checks, hosted Cloudflare routes, and browser/runtime probes. The latest production blocker was that the user still reached:

`https://archestimator.com/?error=state_mismatch`

That blocker now has a deployed no-store hardening pass, an edge normalizer hotfix, and a first-order Cloudflare Redirect Rule that catches stale `www` state-mismatch URLs before the generic `www` -> apex redirect can preserve the stale query. This ledger remains the live task list for proving the rest of the app is not secretly depending on Vercel, Supabase Auth, Supabase storage/realtime, or Resend.

After fresh owner reports at 2026-07-02 00:51 UTC, 01:06 UTC, and 01:21 UTC,
the exact URL was rechecked with curl, no-cache curl, callback probes, deploy
readback, and fresh no-cookie browser contexts; all recovered to
`/login?next=%2Fworkshop&oauth_state_reset_done=1` with no visible
`state_mismatch`, and a fresh Google-start flow generated a state cookie that
matched Google's `state` parameter.

## Execution Contract

- Do not ask for routine approvals; proceed on reversible implementation, tests, Cloudflare deploys, provider readbacks, and evidence generation already requested by the owner.
- Do not delete, downgrade, cancel, or destructively clean up Vercel/Supabase/Resend/Namecheap resources in this run. Produce a separate cleanup runbook only after the Cloudflare app is proven.
- Keep source changes scoped to verified blockers.
- Preserve existing dirty worktree changes; do not revert unrelated edits.
- Record every hosted-production claim with a command, browser probe, provider readback, or evidence artifact.

## Acceptance Matrix

| ID | Requirement | Evidence needed | Status |
| --- | --- | --- | --- |
| P0-AUTH-GOOGLE | Google sign-in succeeds on `archestimator.com` without returning to `/?error=state_mismatch`. | Fresh browser or real Chrome proof; auth callback/state-cookie probe; Cloudflare Worker deploy/version readback if changed. | pass for OAuth start/state; desktop Chrome observed authenticated in workshop/publisher; 01:21 fresh Google-start state-cookie proof passed |
| P0-AUTH-RESET | Existing stale `state_mismatch` URLs recover to a clean login surface and allow a second Google attempt. | Curl + browser proof for `/?error=state_mismatch`, `/login?error=state_mismatch`, `www` stale-state URLs, and callback redirect normalization. | pass after normalizer hotfix, `www` Redirect Rule, and repeated 00:51/01:06/01:21 live rechecks |
| P0-AUTH-MAGIC | Magic-link sign-in is Better Auth + Cloudflare D1 backed. | Hosted provider proof plus route smoke or mailbox proof. | partial |
| P0-APP-SHELL | Signed-in app shell loads from Cloudflare Worker at `archestimator.com`. | Authenticated hosted browser proof. | pass for hosted Chrome app shell |
| P0-DATA-PROJECTS | Projects can be created/read/updated through D1 on Cloudflare. | Hosted authenticated workflow proof. | pending |
| P0-DATA-ESTIMATES | Estimate area/row/tab/history/rollback/idempotency work on D1. | Hosted and local proof artifacts. | partial: hosted note write/readback plus area/row/history proof |
| P0-LIBRARY | Component library custom category, folder, template, insert, and viewer-denial flows work. | Hosted browser or script proof; local authz tests. | partial: seeded-category and custom/free-typed category hosted create pass; folder/template/viewer-denial pending |
| P0-UPLOADS | Media upload/scanner flow uses R2 and Cloudflare routes. | Hosted upload runtime and operations proof; browser upload if possible. | partial |
| P0-PUBLISH | Shared proposal publish/recipient flow works without Vercel/Supabase runtime. | Hosted owner + recipient proof. | partial: owner hosted publish + unauthenticated public open pass; named recipient/comment/decision pending |
| P0-COLLAB | Collaboration/invites/realtime replacement works on Cloudflare-compatible runtime. | Hosted two-client or local DO-backed proof; invite/access matrix. | pending |
| P0-AUTHZ | Cross-workspace, revoked, viewer, and anonymous access fail closed. | Local authz tests plus hosted route/security smoke. | local repository/cache/verifier hardening passed; hosted allowed/denied/revoked/expired cookie matrix pending |
| P0-OPS | Cloudflare deploy/readiness gates pass and active Worker version is current source. | `wrangler deployments`, hosted route proof, release gates. | pass for current deploy |
| P1-PERF | Hosted performance is acceptable after migration. | Hosted performance proof and route timing budget. | pending |
| P2-CLEANUP | Provider downgrade/unsubscribe plan is safe. | Separate cleanup checklist after P0/P1 pass. | deferred |

## Parallel Lanes

| Lane | Owner | Scope | Output |
| --- | --- | --- | --- |
| Auth blocker | lead + debugger | Reproduce Google state flow, inspect cookies/redirects, patch Worker/auth if needed. | Root cause, patch, deploy, proof. |
| Local checks | test lane | Typecheck, focused auth tests, release scripts, identify stale suites. | Pass/fail list and commands. |
| Hosted workflow QA | verifier lane | Map and run hosted workflow proofs for project/estimate/library/upload/publish. | Gap matrix and artifacts. |
| Security/authz | security lane | Access-control and cookie/session risk review. | Required tests/proofs and any fix recommendations. |

## Active Findings

- 2026-07-02: After the owner again reported the exact `https://archestimator.com/?error=state_mismatch` URL, a 01:21 UTC refresh still passed: curl follows the exact URL through `302 -> 302 -> 200` to `/login?next=%2Fworkshop&oauth_state_reset_done=1` with zero `state_mismatch` body matches; `www`, `/workshop`, and a missing-cookie Google callback all first-hop to the clean reset URL; a fresh Playwright browser lands on reset-done login with no state cookies; and starting Google creates one `__Secure-better-auth.state` cookie matching Google's 32-character `state`. The signed-in desktop Chrome session is already authenticated at `/workshop/publisher` and was preserved for workflow QA instead of forcing a reset that intentionally clears cookies/storage. Evidence: `evidence/2026-07-02-cloudflare-state-mismatch-user-report-live-recheck-0121.*`.
- 2026-07-02: Hosted publication owner/public proof now partially passes P0-PUBLISH. The signed-in production Publisher UI generated a shared link for project `bd9a8e68-4e24-49d8-aeed-e4651b7cab0b`, changing the drawer from `DRAFT` to `ACTIVE`; remote D1 found `project_publications.id=337f1427-2dd1-4ff4-b89f-5e518aecb66e`, `status=published`, selected estimate `985f6690-741e-4136-9fa1-a4896cd364e4`, encrypted token and token hash present, served by `v3-prod` in APAC/SIN primary. Fresh unauthenticated curl and Chromium loaded the redacted `/share/...` URL with HTTP 200, private no-store/security headers, title `Proposal Review | Archestimator — Archestimator`, heading `Codex Cloudflare Smoke 2026-07-01`, visible `ES-001`, no sign-in wall, and zero `state_mismatch`; D1 recorded two `open` events. Remaining P0-PUBLISH gap: named recipient invite/session/comment/decision. Evidence: `evidence/2026-07-02-cloudflare-hosted-publication-owner-public-proof.*`.
- 2026-07-02: After the owner again reported the exact `https://archestimator.com/?error=state_mismatch` URL, a 01:06 UTC refresh still passed: curl follows the exact URL to `/login?next=%2Fworkshop&oauth_state_reset_done=1` with HTTP 200 and zero `state_mismatch` body matches; apex and `www` first hops send the clean reset; a missing-cookie Google callback returns the clean reset with private no-store and `Clear-Site-Data`; fresh Playwright lands on reset-done login; and starting Google produces `redirect_uri=https://archestimator.com/api/auth/callback/google` with the generated Google `state` matching the single `__Secure-better-auth.state` cookie. Main Worker `e4476425-2fdb-41ce-856a-de78e3a22fd8` and normalizer Worker `aaee7b3f-a120-4e5e-ada2-5950c57831df` remain at 100%. Cloudflare observability API keys/values queries failed, so no log claim is made. Evidence: `evidence/2026-07-02-cloudflare-state-mismatch-user-report-live-recheck-0106.*`.
- 2026-07-02: Hosted component-library custom/free-typed category create now passes. The signed-in production browser created component `f7007706-def3-4f7a-bd7c-020b2eb8bbbe` with free-typed category `Cloudflare Custom Category 2026-07-02`, blank supplier/brand, unit `unit`, and cost `91.25`; remote D1 readback found the item exactly once, with null `category_node_id`/`supplier_id`/`brand_id`, active price option `6dca209c-d33c-4a1b-8eb4-697df7d127a4`, current cost entry `b07d4b62-ca80-459d-a86f-914503d55e3d`, and version row `a6a17cd9-4169-4a1c-82ab-6d39a829a236`, served by `v3-prod` in APAC/SIN primary. Remaining P0-LIBRARY gaps: hosted folder mutation, hosted template insertion, and hosted viewer-denial proof. Evidence: `evidence/2026-07-02-cloudflare-hosted-component-custom-category-proof.*`.
- 2026-07-02: After the owner again reported the exact `https://archestimator.com/?error=state_mismatch` URL, fresh production curl, no-cache curl, and a fresh no-cookie Playwright browser all recovered to `/login?next=%2Fworkshop&oauth_state_reset_done=1` with HTTP 200, private no-store auth-recovery responses, Google sign-in visible, zero body `state_mismatch`, and no leftover state cookies. The available desktop Chrome tab was already authenticated in the hosted estimates view, so it was not force-navigated through the stale reset route because that route intentionally clears OAuth/session storage. Evidence: `evidence/2026-07-02-cloudflare-state-mismatch-user-report-live-recheck.*`.
- 2026-07-02: Refreshed hosted authenticated D1 write proof: the signed-in Chrome production session updated `ES-001 Estimate` notes from `Cloudflare QA 2026-07-02` to `Cloudflare hosted QA 2026-07-02 00:51Z`; the hosted row settled with updated cell `7/2/26, 8:50 AM`, and remote D1 readback from `archestimator-proof-db` returned the same value with `updated_at=2026-07-02T00:50:13.126Z`, `rows_read=1`, `rows_written=0`, and `changed_db=false`. Evidence: `evidence/2026-07-02-cloudflare-hosted-estimate-note-refresh-proof.*`.
- 2026-07-02: User again reported production still lands on `/?error=state_mismatch` after prior deploy. Fresh checks now show desktop Chrome already authenticated at a project estimate URL, but the report exposed a worthwhile edge gap: stale-cookie cleanup did not include `Path=/login`, and the main Worker source did not yet mirror the callback/redirect recovery that the edge normalizer owned.
- 2026-07-02: Source inspection shows the sign-in server action clears Better Auth OAuth state cookies and then forwards Better Auth `Set-Cookie` from the sign-in response. The next proof must confirm the live response leaves exactly one state cookie whose value matches the Google callback state.
- 2026-07-02: Deployed Worker version `e4476425-2fdb-41ce-856a-de78e3a22fd8` at 100% with `/login` dynamic/no-store, `/login` removed from Worker static-page cache, and delegated `/api/auth/*` responses forced to no-store. Hosted probes show `/login` and `/api/auth/get-session` return no-store, the exact `/?error=state_mismatch` URL redirects into reset without visible `state_mismatch`, the browser Google click reaches Google with one matching Better Auth state cookie, and synthetic matching-state callback returns `invalid_code` instead of `state_mismatch`. Evidence: `evidence/2026-07-02-cloudflare-login-auth-no-store-deploy.*`.
- 2026-07-02: Deployed `archestimator-auth-callback-normalizer` version `54de3fb5-9f04-4bb0-a3d8-ad11a6ae3ed0` at 100% on `archestimator.com/*` and `archestimator.com/api/auth/callback/google*`. Production curl proves both the exact root `state_mismatch` URL and a stale Google callback with mismatched state cookie redirect to the clean login reset with no-store, fallback HTML, `Clear-Site-Data`, and expanded cleanup including `Path=/login`. Fresh Chromium from the bad URL lands on reset-done login; clicking Google reaches Google with a matching Better Auth state cookie. Main Worker source has equivalent hardening and passed typecheck/build/dry-run, but full main Worker publish hung after upload and did not create a new version. Evidence: `evidence/2026-07-02-cloudflare-oauth-normalizer-recovery-hotfix.md`.
- 2026-07-02: Added Cloudflare Redirect Rule `Recover www Google state mismatch` (`d8a83c3442aa4c589f7a01bd5dd33fde`) at order 1, before the generic `Redirect from WWW to root [Template]` rule. It matches `https://www.archestimator.com/*error=state_mismatch*`, issues a temporary `302` to `https://archestimator.com/login?next=%2Fworkshop&oauth_state_reset=1`, and does not preserve the stale query. Production curl proves apex, `www` root, and `www/workshop` stale-state URLs all follow to `/login?next=%2Fworkshop&oauth_state_reset_done=1` with zero visible `state_mismatch`. Fresh Playwright proves both apex and `www` stale-state URLs render the clean login page; starting Google uses apex callback and a state matching `__Secure-better-auth.state`. Evidence: `evidence/2026-07-02-cloudflare-www-state-mismatch-redirect-rule.*`.
- 2026-07-02: Closed local P0 authz/cache hardening: stale default workspace IDs are verified before use, central project lookup fails closed without `canAccessProjectInD1`, estimate/sheet lists filter through `canAccessEstimateInD1`, sheet-only collaboration summaries expose only accessible sheet data, protected asset success responses use private no-store, and hosted auth verifier expects `/access-required`. Focused authz/security/verifier tests passed, hosted signed-out smoke passed, typecheck passed, and `git diff --check` passed. Evidence: `evidence/2026-07-02-cloudflare-authz-cache-hardening.*`.
- 2026-07-02: Security lane found P0/P1 follow-ups: `workspace-repository.ts` default-workspace membership validation, central project lookup fail-closed checks, protected asset cache policy after revocation, and hosted auth verifier route expectation `/access-required`.

## Next Commands

1. Run full hosted auth allowed/denied/revoked/expired proof when sanitized cookies are available.
2. Continue P0 workflow proof matrix: project update, estimate tab/rollback/idempotency, component library custom category/folder/template/viewer denial, real upload UX/scanner persistence, hosted publish/recipient, and hosted collaboration/invite proof.

---
title: Current Evidence Inventory
plan_id: 2026-06-29-cloudflare-migration-codex
document: 29
---

# Current Evidence Inventory

## Purpose

This document records the local evidence used to judge the Cloudflare migration plan quality. It is not a completed migration inventory and it is not provider proof. It is the bridge between repo reality and the future worksheets in `26_INVENTORY_WORKSHEETS.md`.

## Evidence Boundary

Initially collected on 2026-06-29 from the local repository only. The 2026-06-30 refresh now includes sanitized Cloudflare dashboard facts, Wrangler OAuth readback, and provider resource creation/readback for the named proof D1/R2/Queue resources. It still does not include hosted Worker traffic, Worker secret values, production DNS cutover, provider cancellation, or production user data migration.

Current 2026-07-02 addendum: this inventory is historical planning evidence and is superseded for cutover readiness by the active ledgers `33_POST_CUTOVER_FULL_APP_QA_LEDGER.md` and `34_FULL_CLOUDFLARE_APP_VERIFICATION_LEDGER.md`. Hosted evidence now exists for Cloudflare Worker/OpenNext serving `archestimator.com`, Better Auth + D1 auth, D1 app-data workflows, R2 upload runtime/lifecycle/UI, Durable Object collaboration transport plus two-client hosted collaboration UI, Cloudflare Email proof, DNS delegation, Google OAuth client/Audience provider readback including localhost developer callback support, provider resource readback, and release gates. Local browser evidence now also shows the default Playwright suite is Cloudflare-compatible after quarantining legacy Supabase-only E2E specs behind `ARCHESTIMATOR_E2E_ENABLE_LEGACY_SUPABASE=1`; the default suite no longer fails on the removed Supabase SDK import. Local developer Google OAuth is now proven end-to-end on `http://localhost:3000`: Chrome completed Google sign-in, returned without `state_mismatch`, reached the local terms gate, accepted clickwrap, rendered `/workshop`, and local D1 readback found Better Auth user/account/session rows plus a terms acceptance. Use `localhost` rather than `127.0.0.1` unless host-dynamic Better Auth configuration is added. Provider cancellation/deletion remains intentionally unproven and belongs to `35_PROVIDER_EXIT_AND_FINAL_PROOF_RUNBOOK.md`.

Current 2026-07-03 implementation addendum: this inventory remains the
historical proof-surface map, but the active implementation-completion evidence
now lives in the follow-up ledger and the generated proof artifacts below. These
artifacts are the current source for the active goal question "is the plan pack
implemented?":

| Evidence | Current result | Boundary |
| --- | --- | --- |
| `evidence/2026-07-03-cloudflare-latest-deploy-source-smoke.*` | Generated `2026-07-03T22:15:48.057Z`; `latestDeploySourceSmokeReady=false` with one blocker: runtime source paths have uncommitted changes and cannot be claimed deployed. The dirty runtime entries include the intended local CRUD/image-auth/favorites plus component-library/sidebar-access source files: `src/app/api/estimate-row-images/route.ts`, `src/app/api/projects/images/route.ts`, `src/lib/component-library/actions.ts`, `src/lib/projects/actions.ts`, `src/lib/repositories/estimate-favorites-repository.ts`, `src/lib/repositories/workspace-repository.ts`, `src/lib/uploads/upload-records.ts`, and `src/lib/workshop/actions.ts`. The prior ready artifact recorded deployed source commit `230930b39ffed927cb397aec4d9dde161f8169b0`, production Worker version `01c577ee-ab6a-4da7-bcaf-ddab7baea524` / number `95`, deployment timestamp `2026-07-03T17:34:08.169674Z`, hosted route proof passing, and release gates passing; it is superseded for current-worktree readiness by this refresh because the shared-project CRUD/image-auth/favorites/component-library/sidebar-access patch is local and not yet committed/deployed. The runtime source status contract covers `src`, `worker.ts`, `package.json`, `bun.lock`, `wrangler.jsonc`, `cloudflare-env.d.ts`, `next.config.ts`, `open-next.config.ts`, and `src/middleware.ts`; proof-tooling-only `package.json` script additions are no longer counted as deploy-relevant runtime dirtiness, while `bun.lock`, dependency, build, runtime script, or other package metadata changes still block. The artifact schema records `parseError` so malformed JSON cannot masquerade as a pass, and the CLI supports `STRICT_READINESS_EXIT=1` / `FAIL_ON_BLOCKERS=1` so blocked readiness can produce a nonzero verifier exit after artifacts are written. | Sanitized current-source deploy/readback plus hosted-route/release-gate aggregation; no deploy of the local CRUD/image-auth/favorites/component-library/sidebar-access patch, provider-exit operator, non-owner persona, or recipient mailbox proof. |
| `evidence/2026-07-03-cloudflare-latest-deploy-source-smoke.template.json` | Sanitized starter for the future current-source deploy lane. | Not proof; placeholders must be replaced by real post-deploy production-version, hosted-route, and release-gate evidence. |
| `evidence/2026-07-03-cloudflare-provider-exit-pack.*` | Generated `2026-07-03T22:15:48.194Z`; `activeLegacyProviderRuntimeBlockers=0`, `appRuntimeExitPrerequisitesReady=false`, `providerExitReady=false`, five blockers. The sanitized obsolete-secret-name review gate and Resend account/API-key/domain status gate are ready through the durable operator record, but latest deploy/source smoke is blocked by the local undeployed CRUD/image-auth/favorites/component-library/sidebar-access source patch. Remaining blockers are latest deploy/source smoke, final exports or accepted-retention/loss, post-exit Cloudflare smoke, real non-owner Google proof or accepted deferral, and real recipient mailbox proof or accepted deferral. The active runtime scan covers `src`, `worker.ts`, `package.json`, `bun.lock`, `wrangler.jsonc`, `cloudflare-env.d.ts`, `next.config.ts`, `open-next.config.ts`, and `src/middleware.ts` where present. The provider-resource gate reads the current `2026-07-01-cloudflare-provider-resource-readback.json` generated `2026-07-03T19:09:20.522Z`; release gates generated `2026-07-03T19:09:27.829Z` are green; Cloudflare Email readiness is green; the non-owner Google gate accepts either real proof or an accepted deferral. The artifact summary and operator diagnostics preserve malformed-JSON blockers via `parseError`, and the CLI supports `STRICT_READINESS_EXIT=1` / `FAIL_ON_BLOCKERS=1` so blocked provider-exit readiness can produce a nonzero verifier exit after artifacts are written. | Non-destructive evidence only; no deployment of local source changes, export, provider cancellation, post-exit operator smoke, persona, mailbox proof, or fresh Resend dashboard/domain mutation. |
| `evidence/2026-07-03-cloudflare-provider-exit-operator-record.json` | Sanitized operator record generated `2026-07-03T17:57:32.000Z` and locally updated at 2026-07-03 20:31 UTC; records Cloudflare secret-name review for obsolete provider secret cleanup plus Resend status from existing sanitized evidence. Resend account/key status points to the 2026-07-01 read-only Resend dashboard notes; domain status points to archived 2026-06-04 Resend verified-domain proof and current Cloudflare Email readiness. It states secret values were not read or recorded and that this run did not mutate or freshly refresh Resend domain settings. | Closes the obsolete-secret-name review gate and the Resend account/API-key/domain status gate; it does not prove exports, post-exit smoke, non-owner persona behavior, or recipient mailbox receipt. |
| `evidence/2026-07-03-provider-exit-export-metadata-attempt.*` | Generated `2026-07-03T22:15:21Z`; created the owner-local dated backup directory outside the repo with `700` permissions and recorded read-only Vercel/Cloudflare metadata, but `exportsOrRetentionDecisionRecorded=false`. Vercel project/domain/env-name/deployment metadata readbacks passed without values; Cloudflare Wrangler auth/provider-resource/email readbacks passed. Supabase export for historical project `ebxxqidacheyapmmzavr` remains blocked: no `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, or `SUPABASE_PROJECT_REF` was present in the process environment; the Homebrew Supabase CLI exited `137` before output; and package-runner Supabase `2.109.0` printed its version but hung on `projects list` until interrupted. | Evidence-quality progress only; does not close the export/retention gate. No raw export, SQL dump, secret, provider mutation, provider cancellation, deploy, persona proof, or mailbox proof. |
| `evidence/2026-07-03-cloudflare-provider-exit-operator-record.template.json` | Sanitized operator-record template exists and requires evidence-source pointers for external/provider gates. | Template only; use the real operator record above for the one currently closed sanitized gate. |
| `evidence/2026-07-03-cloudflare-migration-implementation-completion-audit.*` | Generated `2026-07-03T14:46:59Z`; verdict `NEAR-COMPLETE, NOT FULLY IMPLEMENTED`; goal should not be marked complete. | Completion audit is local/static plus automated evidence; it does not replace deploy, browser, provider, persona, or mailbox proof. |
| `evidence/2026-07-03-cloudflare-migration-blocked-audit.*` | Generated `2026-07-03T15:31:00Z`; historical strict blocked audit records blockers present at that time. Its deploy/source blocker was temporarily superseded by deployed-commit proof, but is open again for the current worktree because local CRUD runtime source changes are not deployed; provider/operator, persona, and mailbox blockers remain open. | Blocked-audit evidence only; it does not replace the missing external/provider proof and does not make the migration complete. |
| `evidence/2026-07-03-glm52-final-ultraqa-review.*` | Generated `2026-07-03T14:46:59Z`; verdict `PARTIAL`; Doc 37 scenario matrix has `23` rows with explicit pass/open classifications, including malformed proof-artifact parse-error coverage, strict readiness-exit CLI coverage for QA-SCRIPT-001, provider-exit scan-surface/filesystem scanner coverage, `bun.lock` scan coverage, accepted-deferral coverage, deployed-commit mismatch/deployment-time coverage, fresh local QA-R2/QA-SHARE residual refresh proof, and the 14:46 proof-tooling package/lockfile precision refresh. | Same-agent/local refresh plus prior verifier evidence; external/operator gates remain open. |
| `evidence/2026-07-03-codex-independent-proof-tooling-code-review.*` | Generated `2026-07-03T15:10:50Z`; independent native `code-reviewer` Hilbert found no scoped correctness issues and no safe local fixes in the proof-tooling/plan-pack diff. Focused Vitest passed `2` files / `32` tests, `bun run type-check` passed, scoped `git diff --check` passed, and static secret/provider-mutation pattern review found no blockers. | Read-only local review; it does not replace current-source deploy proof, provider/operator evidence, browser/persona proof, mailbox proof, or commit/staging durability. |

As of this addendum, Cloudflare closed-beta app runtime had deploy/source proof
for commit `230930b39ffed927cb397aec4d9dde161f8169b0`, but current-worktree
deploy/source proof is open again because the shared-project CRUD/image-auth
and favorites/sidebar-access patch is local and not yet committed/deployed. Full migration/provider exit
remains open on latest deploy/source smoke, final exports or accepted
retention/loss, post-exit Cloudflare smoke, real non-owner Google proof, and
real recipient mailbox proof or accepted deferral. Resend account/API-key/domain
status is now recorded in the sanitized operator record from existing evidence,
with the explicit boundary that this pass did not freshly refresh Resend domain
settings.

2026-07-03 18:40 UTC local follow-up evidence: the local CRUD/image-auth patch
now also pins shared-workspace project-image DELETE, collaborator-owned project
image path rejection before project lookup/storage deletion, cross-project
project-image DELETE atomic denial when any current-user target project is not
editable, project detail thumbnail path rejection, shared-workspace
project-image metadata cleanup, project bulk-delete foreign image metadata
filtering, mixed eligible/forbidden bulk-delete non-execution, exact R2 cleanup
paths, R2 cleanup failure reporting, and project bulk-delete
project-admin/non-manager collaborator eligibility. Verification passed:
focused modified Vitest (`5` files / `111` tests), metadata/bulk-delete
follow-up matrix (`2` files / `17` tests), `bun run type-check`,
`bun run cf:build` (runtime source unchanged since this check), and
`git diff --check`. Independent read-only code review approved the scoped
CRUD/image-auth runtime patch with no correctness or security findings. This is
local evidence only; it does not close the current-source deploy/source blocker.

2026-07-03 19:22 UTC local CRUD/access follow-up evidence: the remaining
`Project not found in the current workspace.` occurrences in estimate and
location actions were rechecked. They are behind the repaired
`getCurrentWorkspaceProject` D1 target-project access gate or downstream
project/estimate scoping, so no new default-workspace CRUD source defect was
found in that pass. Fresh focused verification passed:
`bunx vitest run tests/vitest/d1-access-created-by.test.ts tests/vitest/workspace-repository-authz-contract.test.ts tests/vitest/project-location-actions.test.ts tests/vitest/project-location-schema.test.ts tests/vitest/estimate-sheet-actions-authz.test.ts tests/vitest/project-metadata-audit.test.ts tests/vitest/project-bulk-delete-d1-actions.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/project-creation-ui.test.ts --maxWorkers=1`
(`10` files / `142` tests), `bun run type-check`, `git diff --check`, and
`bun run cf:build`. This is local-only evidence; it does not deploy the
CRUD/image-auth patch and does not close provider-exit, persona, or mailbox
gates.

2026-07-03 19:30 UTC local CRUD/image-auth proof refresh: a focused D1
validator regression was added to prove estimate-row upload assets are recorded
with the row id as `target_entity_id` while preserving separate `project_id`
and `estimate_id` lookup ids for the active D1 validator. Fresh verification
passed the focused CRUD/authz suite above with `10` files / `143` tests,
`bun run type-check`, `git diff --check`, and `bun run cf:build`. Independent
native `code-reviewer` Faraday returned zero findings on the scoped patch, and
independent native `verifier` Kuhn returned `PASS` for the local-ready claim.
`bun run cf:check-latest-deploy-source-smoke` regenerated the source-smoke
artifact at `2026-07-03T21:08:28.881Z` and kept readiness false with the same
uncommitted-runtime-source blocker, now including the later favorites/read-path
files in the dirty runtime list. `bun run cf:provider-exit-pack` regenerated
the provider-exit pack at `2026-07-03T21:08:32.788Z` with
`activeLegacyProviderRuntimeBlockers=0` and five external/provider blockers at
that checkpoint. The focused proof-script regression suite also passed
(`2` files / `32` tests). This is still local/non-destructive proof only; no
commit, deploy, provider mutation, browser proof, external persona proof, or
mailbox proof was performed.

2026-07-03 21:28 UTC local component-library shared-project follow-up: the
estimate-template source actions no longer bind reusable source estimate lookup
to the user's default workspace. `createEstimateTemplateFromEstimateNode`,
`createEstimateTemplateFromEstimateTab`, and `resolveEstimateTemplateInsertTarget`
now resolve the source estimate by target project/estimate, then use the
estimate's real `workspace_id` for library editor checks, quota/sort-order
reads, template inserts, and insert-target telemetry. Fresh focused verification
passed `bunx vitest run tests/vitest/estimate-insert-target-authz.test.tsx tests/vitest/library-viewer-authz.test.tsx tests/vitest/security-findings-auth-contracts.test.ts --maxWorkers=1`
(`3` files / `27` tests), the broader related template/library suite passed
`8` files / `148` tests, `bun run type-check`, `git diff --check`, and
`bun run cf:build` passed. The latest deploy/source-smoke and provider-exit
pack were regenerated at `2026-07-03T21:28:12.165Z`; readiness remains open
with the same one source blocker / five provider-exit blockers, now listing
`src/lib/component-library/actions.ts` in the dirty runtime source set. This is
local/non-destructive proof only; no commit, deploy, provider mutation, browser
proof, external persona proof, or mailbox proof was performed.

2026-07-03 21:43 UTC local estimate-row image delete follow-up: a scoped
review found an authz asymmetry in `src/app/api/projects/images/route.ts`.
Estimate-row image upload and download allowed estimate-only editors, but the
shared DELETE endpoint still required project edit for estimate-row image paths.
The local patch now allows current-user estimate-row image path removal when
`canEditEstimateInD1` resolves for the target estimate and still requires
project edit for project-cover image deletion. Fresh verification passed
`bunx vitest run tests/vitest/auth-sensitive-api-boundaries.test.ts --maxWorkers=1`
(`1` file / `74` tests), the related upload/CRUD subset (`6` files / `49`
tests), the dirty-runtime regression pack (`14` files / `156` tests), the
broader component/template suite (`8` files / `148` tests), `bun run
type-check`, `git diff --check`, `bun run cf:build`, and scoped code-review
graph analysis of the eight dirty runtime files. `bun run logs:debug` still
reports only the stale `2026-07-03T16:40:42.495Z` project-create record. The
latest deploy/source-smoke and provider-exit pack were regenerated at
`2026-07-03T21:43:06.524Z` and `2026-07-03T21:43:09.008Z`; readiness remains
open with the same one source blocker / five provider-exit blockers. This is
local/non-destructive proof only; no commit, deploy, provider mutation, browser
proof, external persona proof, mailbox proof, or provider export was performed.

2026-07-03 21:51 UTC safe-local blocker audit refresh: after the estimate-row
image DELETE follow-up, a targeted source audit rechecked project bulk-delete
execution, project/estimate-row image API access, component-library
shared-project template actions, workspace project access summaries, workshop
favorites, upload metadata, and the remaining estimate-action
`Project not found in the current workspace.` paths. No additional confirmed
safe local source defect was found. Fresh validation passed:
`bunx vitest run tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/project-metadata-audit.test.ts tests/vitest/project-bulk-delete-d1-actions.test.ts tests/vitest/workshop-favorite-actions-hygiene.test.ts tests/vitest/estimate-favorites-repository.test.ts tests/vitest/project-activity-page/route-contract.test.ts tests/vitest/project-location-actions.test.ts tests/vitest/library-viewer-authz.test.tsx tests/vitest/estimate-insert-target-authz.test.tsx tests/vitest/estimate-sheet-create-empty-tree.test.ts tests/vitest/express-promotion-action.test.ts --maxWorkers=1`
(`12` files / `139` tests), `bun run type-check`, `git diff --check`, and
`bun run cf:build`. `bun run logs:debug` still reports only the stale
`2026-07-03T16:40:42.495Z` project-create record. The latest
deploy/source-smoke and provider-exit pack were regenerated at
`2026-07-03T21:51:36.422Z` and `2026-07-03T21:51:41.373Z`; readiness remains
open with the same one source blocker / five provider-exit blockers. This is
local/non-destructive proof only; no commit, deploy, provider mutation, browser
proof, external persona proof, mailbox proof, provider export, or accepted
deferral was performed.

2026-07-03 20:32 UTC provider-exit evidence refresh: the sanitized operator
record now records Resend account/API-key/domain status from existing repo-safe
evidence. `bun run cf:provider-exit-pack` regenerated the provider-exit pack at
`2026-07-03T20:31:56.818Z`; `activeLegacyProviderRuntimeBlockers=0`,
`appRuntimeExitPrerequisitesReady=false`, and `providerExitReady=false` remain
unchanged, but the computed blocker count dropped to five because the Resend
status gate is now `PASS`. Focused verification passed
`bunx vitest run tests/vitest/provider-exit-pack-script.test.ts --maxWorkers=1`
(`1` file / `18` tests). This is still local/non-destructive proof only; no
commit, deploy, provider mutation, browser proof, external persona proof,
mailbox proof, or fresh Resend dashboard/domain refresh was performed.

2026-07-03 20:12 UTC local project-create setup-path evidence: a regression in
`tests/vitest/d1-access-created-by.test.ts` now proves the real D1 estimate
action client call path, `EstimateActionsD1Client.call("can_edit_project")`,
grants edit access through the repaired `projects.created_by` predicate. This
targets the default-estimate creation guard that runs after project creation and
can surface "Project was created, but setup needs attention." if it fails.
Focused verification passed:
`bunx vitest run tests/vitest/d1-access-created-by.test.ts tests/vitest/estimate-sheet-create-empty-tree.test.ts tests/vitest/projects-page-create-optimistic.test.tsx --maxWorkers=1`
(`3` files / `10` tests), `bun run type-check`, and `git diff --check`. This is
local evidence only; it does not close deploy/source, provider-exit,
external-persona, or mailbox gates.

2026-07-03 20:17 UTC local project-create image setup-path evidence:
`tests/vitest/auth-sensitive-api-boundaries.test.ts` now proves the project
image upload route allows a just-created project owner through the real D1
`canEditProjectInD1` created-by predicate even when membership-style edit grants
are false. `tests/vitest/project-metadata-audit.test.ts` now proves
`updateProjectImageMetadata` saves image metadata through the same predicate.
Focused verification passed:
`bunx vitest run tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/project-metadata-audit.test.ts --maxWorkers=1`
(`2` files / `84` tests), followed by integrated setup-path verification:
`bunx vitest run tests/vitest/d1-access-created-by.test.ts tests/vitest/estimate-sheet-create-empty-tree.test.ts tests/vitest/projects-page-create-optimistic.test.tsx tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/project-metadata-audit.test.ts --maxWorkers=1`
(`5` files / `94` tests), `bun run type-check`, and `git diff --check`. This is
local evidence only; it does not close deploy/source, provider-exit,
external-persona, or mailbox gates.

2026-07-03 20:24 UTC local shared-project express promotion evidence:
`tests/vitest/express-promotion-action.test.ts` now proves express component
promotion for a shared-project row outside the user's default workspace binds
library access and library-folder validation to the source row's
`workspace_id`, then inserts the cost library item and price option into that
same project workspace. Focused verification passed
`bunx vitest run tests/vitest/express-promotion-action.test.ts --maxWorkers=1`
(`1` file / `5` tests). Expanded local CRUD/authz verification passed
`bunx vitest run tests/vitest/express-promotion-action.test.ts tests/vitest/d1-access-created-by.test.ts tests/vitest/estimate-sheet-create-empty-tree.test.ts tests/vitest/projects-page-create-optimistic.test.tsx tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/project-metadata-audit.test.ts tests/vitest/project-activity-page/route-contract.test.ts tests/vitest/project-bulk-delete-d1-actions.test.ts tests/vitest/project-creation-ui.test.ts tests/vitest/project-location-actions.test.ts tests/vitest/upload-domain-contracts.test.ts --maxWorkers=1`
(`11` files / `139` tests), plus `bun run type-check` and
`git diff --check`; `bun run cf:build` also completed successfully and wrote
`.open-next/worker.js` locally without deployment. This is local evidence only;
it does not close deploy/source, provider-exit, external-persona, or mailbox
gates.

What this evidence proves:

- The migration has broad provider coupling and cannot be safely planned as a narrow hosting swap.
- The D1 path must account for a real RPC/RLS/function surface, not just table definitions.
- Existing tests and proof scripts provide useful source material for future Cloudflare proof gates.
- The current plan has enough local grounding for owner review and proof-spike planning.

What this evidence does not prove:

- Cloudflare will be cheaper for real Archestimator usage.
- Current-source deploy/source smoke for the local shared-project
  CRUD/image-auth patch.
- Full provider exit, post-exit smoke, provider export/retention posture, or
  Resend provider status.
- Real non-owner Google persona behavior.
- Real recipient mailbox receipt or owner-accepted deferral.
- Production cutover for any future source changes after the current proof set.

## Generated Inventory Refresh

Generated on 2026-06-30 local time with `bun run cf:inventory`.

Artifacts:

- `evidence/2026-06-30-cloudflare-migration-inventory.json`
- `evidence/2026-06-30-cloudflare-migration-inventory.md`

The generated artifact is the current repeatable inventory surface for selecting proof slices. It scans local source, route files, package scripts, and SQL migrations, and records only file paths, route paths, RPC names, script names, and counts.

| Evidence | Generated result |
| --- | ---: |
| App Router route entries | `71` |
| Page routes | `39` |
| Route handlers | `30` |
| Metadata routes | `2` |
| Provider-coupled source files | `93` |
| Distinct app-code RPC names | `80` |
| Package scripts | `94` |
| Script files | `110` |
| Cloudflare package scripts | `31` |
| Provider-readiness package scripts | `8` |
| Applied SQL migration files | `181` |
| Pending-review SQL files | `13` |
| SQL function declaration/update matches | `346` |
| RLS/policy/storage/auth SQL matches | `684` |

The refresh does not read env files, print secret values, mutate providers, prove hosted Cloudflare deployment, prove D1/R2/Images/Email/Workers Paid readiness, change DNS, or make current providers removable.

## Generated Cost And Performance Workbook

Originally generated on 2026-06-30 local time with `bun run cf:workbook`; refreshed on 2026-07-02 after the hosted p95 verifier, workbook default evidence pointer, and workbook sample-count gate were corrected.

Artifacts:

- `evidence/2026-06-30-cloudflare-cost-performance-workbook.json`
- `evidence/2026-06-30-cloudflare-cost-performance-workbook.md`
- `evidence/2026-07-01-cloudflare-cost-performance-workbook.json`
- `evidence/2026-07-01-cloudflare-cost-performance-workbook.md`

The current generated workbook combines the migration inventory, hosted route p95 proof, provider-runtime performance proofs, official Cloudflare pricing snapshot, and sanitized provider usage inputs. It was refreshed at `2026-07-02T12:54:37.647Z` after the hosted p95 proof generated at `2026-07-02T12:54:02.688Z`. It keeps strict hosted client p95 visible separately from provider runtime readiness:

| Gate | Ready? |
| --- | --- |
| Current provider costs ready | yes |
| Cloudflare pricing refreshed | yes |
| Cloudflare usage costs ready | yes |
| Local preview performance captured | yes |
| Hosted credential-free performance captured | yes |
| Production runtime performance ready | yes |
| Strict hosted client p95 ready | no |
| Aggregate hosted performance ready | yes |
| Hosted performance ready | no |
| Production cost decision ready | yes |

Current hosted p95 rows captured from `evidence/2026-06-30-cloudflare-hosted-performance.*`:

| Fixture | Hosted p95 | Status |
| --- | ---: | --- |
| Public home route p95 TTFB | `1104.91ms` | hosted-partial-fail / watch |
| Pricing/features static route p95 TTFB | `821.51ms` / `140.02ms` | pricing watch, features pass |
| Share route p95 TTFB | `80.61ms` | hosted-partial-pass |
| Workshop home p95 TTFB | `114.37ms` | hosted-partial-pass |

Credential-free hosted route contracts and sample count currently pass, so the hosted verifier and aggregate release gate are green. Strict public-route client p95 budgets are currently watch-grade tuning evidence (`p95BudgetReady=false`, `p95BudgetWatch=true`, `strictHostedClientP95Ready=false`, `p95BudgetMisses=7`) and should not block provider runtime readiness unless route contracts fail, sample count is insufficient, or provider runtime performance regresses. The workbook now requires the hosted verifier's `hostedCredentialFreePerformanceReady` signal before treating hosted performance as captured, so a low-sample artifact cannot falsely green the release gate.

## Generated Hosted Worker Route Proof

Generated on 2026-06-30 local time with `bun run cf:verify-hosted-routes`.

Artifacts:

- `evidence/2026-06-30-cloudflare-hosted-route-proof.json`
- `evidence/2026-06-30-cloudflare-hosted-route-proof.md`

The generated proof harness mirrors the local Worker route matrix against an HTTPS non-local deployed Worker URL supplied through `CLOUDFLARE_HOSTED_ROUTE_BASE_URL` or `CLOUDFLARE_HOSTED_WORKER_BASE_URL`. It rejects localhost/private URLs when supplied and does not call Cloudflare APIs, read env files, print secrets, deploy Workers, change DNS, purchase plans, mutate providers, authenticate users, or make production cutover ready.

| Gate | Ready? |
| --- | --- |
| Hosted route URL configured | no |
| Provider-backed route probe | no |
| Hosted route contract ready | no |
| Hosted route proof ready | no |

Current blocker recorded by the proof: no hosted Worker URL is configured yet, so no hosted route samples were collected. This is now an explicit provider-scope blocker in `cf:release-gates`.

## Generated Official Cloudflare Pricing Snapshot

Generated on 2026-06-30 local time with `bun run cf:pricing`.

Artifacts:

- `evidence/2026-06-30-cloudflare-official-pricing-source.json`
- `evidence/2026-06-30-cloudflare-official-pricing-snapshot.json`
- `evidence/2026-06-30-cloudflare-official-pricing-snapshot.md`

The generated snapshot validates that all sources are official Cloudflare URLs and covers `13` required product surfaces:

| Gate | Ready? |
| --- | --- |
| Official Cloudflare pricing refreshed | yes |
| Required products covered | `13` |
| Required products missing | `0` |
| Invalid source URLs | `0` |
| Production cost decision ready | no |

Covered surfaces: Workers compute, Workers Static Assets, Workers KV, D1, R2, Queues, Durable Objects, Cloudflare Images, Email Service/Email Routing, Turnstile, Web Analytics, Workers Logs, and WAF/rate limiting/zone plan tier.

This is official-pricing evidence only. It does not prove Archestimator monthly usage, current-provider invoices, hosted Cloudflare usage metrics, provider-dashboard receipts, or production cost approval.

## Generated Cloudflare Platform Toolchain Snapshot

Generated on 2026-06-30 local time with `bun run cf:check-toolchain`.

Artifacts:

- `evidence/2026-06-30-cloudflare-platform-toolchain.json`
- `evidence/2026-06-30-cloudflare-platform-toolchain.md`

The generated snapshot validates the local Wrangler/OpenNext/tooling surface without provider API calls, env-file reads, or secret values:

| Gate | Ready? |
| --- | --- |
| Local toolchain snapshot ready | yes |
| Production deploy ready | no |

Captured local facts:

- Wrangler `4.105.0`.
- `@opennextjs/cloudflare` `1.20.1`.
- Next.js `16.2.6`.
- TypeScript `6.0.3`.
- `@cloudflare/workers-types` is not installed as a standalone package; `cloudflare-env.d.ts` carries Wrangler-generated runtime types from `workerd@1.20260625.1`.
- `wrangler.jsonc` uses compatibility date `2026-06-29`, has `nodejs_compat`, and configured binding names `ARCH_DB`, `ARCH_UPLOADS_R2`, `ASSETS`, `COLLAB_ROOMS`, `IMAGES`, and `UPLOAD_JOBS_QUEUE` are present in `cloudflare-env.d.ts`.
- `wrangler.jsonc` configures Workers Observability with 10% top-level/log sampling, invocation logs persisted, and 5% traces sampling.

This is local toolchain evidence only. It does not prove Wrangler/API authentication, hosted deployment, custom domains, remote bindings, provider usage, observability receipt, Workers Paid, or production cutover readiness.

## Generated Wrangler Auth Snapshot

Generated on 2026-06-30 local time with `bun run cf:check-wrangler-auth`.

Artifacts:

- `evidence/2026-06-30-cloudflare-wrangler-auth.json`
- `evidence/2026-06-30-cloudflare-wrangler-auth.md`

The generated snapshot runs read-only `wrangler whoami --json`, sanitizes output, and records the local CLI/API auth state without reading env files, printing tokens/secrets, creating resources, deploying Workers, changing DNS, purchasing plans, mutating providers, or making production cutover ready:

| Gate | Ready? |
| --- | --- |
| Wrangler CLI available | yes |
| Auth check completed | yes |
| Wrangler/API authenticated | yes |
| Provider readback ready | yes |
| Production deploy ready | no |

Captured local facts:

- Auth method: OAuth.
- Account email present: yes.
- Account ID: `7f6229cfea61b59f6f48b517fde86039`.
- Account name: `Philipjonlewis@gmail.com's Account`.
- Not authenticated reason: none.

Current blocker recorded by the snapshot: none for Wrangler/API auth. Production deployment remains false because hosted Worker deployment and secret-name/provider proof are separate gates.

## Generated Provider Resource Readback

Generated on 2026-06-30 local time with `bun run cf:check-provider-resources`;
the current release-gate artifact path was refreshed on 2026-07-03 19:09 UTC.

Artifacts:

- `evidence/2026-06-30-cloudflare-provider-resource-readback.json`
- `evidence/2026-06-30-cloudflare-provider-resource-readback.md`
- `evidence/2026-07-01-cloudflare-provider-resource-readback.json`
- `evidence/2026-07-01-cloudflare-provider-resource-readback.md`

The generated readback is a read-only Wrangler resource gate. It reads `wrangler.jsonc`, the Wrangler auth artifact, and the Worker readiness artifact, then runs provider list/status commands only after Wrangler/API auth is proven. It does not print raw command output, secret values, tokens, or env files; does not deploy, update, delete, purge, purchase, change DNS, or make Vercel/Supabase/Resend removable.

| Gate | Ready? |
| --- | --- |
| Wrangler authenticated | yes |
| Provider readback attempted | yes |
| Worker deployment readback ready | yes |
| D1 database readback ready | yes |
| R2 bucket readback ready | yes |
| Queues readback ready | yes |
| Worker secret name readback ready | yes |
| Provider resource readback ready | yes |
| Production cutover ready | no |

Expected proof resource names recorded by the artifact: Worker `archestimator-proof`, D1 database `archestimator-proof-db`, R2 buckets `archestimator-proof-uploads` and `archestimator-proof-uploads-dev`, Queues `archestimator-upload-jobs` and `archestimator-upload-jobs-dlq`, and the required Worker secret names from the readiness artifact.

Provider resources now created/read back: D1 `archestimator-proof-db` (`9bdb29bb-687e-4f51-ae81-7659c426ea5f`), preview D1 `archestimator-proof-db-dev` (`363c756a-7c4d-42fe-908f-6d328bfa4acb`), R2 buckets `archestimator-proof-uploads` and `archestimator-proof-uploads-dev`, and Queues `archestimator-upload-jobs` and `archestimator-upload-jobs-dlq`.

Current blockers recorded by the 2026-07-03 19:09 UTC readback: none.
The Worker deployment list, D1 database list, R2 bucket list, Queue list, and
Worker secret-name list all passed. `productionCutoverReady` remains false in
this provider-resource artifact because deploy/source and release readiness are
separate aggregate gates.

## Generated Wrangler Deploy Dry-Run Snapshot

Generated on 2026-06-30 local time with `bun run cf:check-deploy-dry-run`;
refreshed on 2026-07-03 19:03 UTC after the local CRUD/image-auth patch and
Cloudflare build refresh.

Artifacts:

- `evidence/2026-06-30-cloudflare-wrangler-deploy-dry-run.json`
- `evidence/2026-06-30-cloudflare-wrangler-deploy-dry-run.md`

The generated snapshot runs `wrangler deploy --dry-run` against the local OpenNext Worker bundle and exits before upload:

| Gate | Ready? |
| --- | --- |
| Local Wrangler dry-run ready | yes |
| Production deploy ready | no |

Captured local facts:

- Wrangler dry-run exit code `0` with the no-upload marker present.
- `289` asset files read from `.open-next/assets`.
- Bundle upload estimate: `25204.46 KiB`, gzip `5395.01 KiB`.
- Required bindings present in the dry-run output: `ARCH_DB`, `ARCH_UPLOADS_R2`, `ASSETS`, `COLLAB_ROOMS`, `EMAIL`, `IMAGES`, and `UPLOAD_JOBS_QUEUE`.
- Metafile read: `680` inputs, `2` outputs, `63219877` output bytes.
- Warning captured: none.

This is local no-upload bundling evidence only. It does not prove Cloudflare authentication, hosted deployment, custom domains, remote binding resources, request handling, production traffic, logs/observability receipt, DNS cutover, or rollback.

## Generated D1 App-Layer Authorization Access Matrix

Generated on 2026-06-30 local time with `bun run cf:d1-authz-matrix`.

Artifacts:

- `evidence/2026-06-30-cloudflare-d1-authz-access-matrix.json`
- `evidence/2026-06-30-cloudflare-d1-authz-access-matrix.md`

The generated matrix maps current Supabase/RLS/RPC access paths to future D1 app-layer guard requirements and existing positive, denial, and cross-workspace test references. It intentionally stays local and does not read env files, print secret values, call provider APIs, create D1 databases, mutate Cloudflare/Supabase, deploy Workers, change DNS, bill, or make current providers removable.

| Evidence | Generated result |
| --- | ---: |
| Authorization-relevant access paths | `47` |
| Rows with positive test refs | `47` |
| Rows with denial/fail-closed test refs | `47` |
| Rows with cross-workspace denial refs | `41` |
| All protected access paths covered | yes |
| Cross-workspace denials ready | yes |
| Route/action coverage ready | yes |

Current blockers recorded by the matrix: none. The matrix now narrows to DB-backed authorization access paths, treats internal service/admin upload operations separately from user-controlled tenant routes, and includes forged cross-workspace behavior coverage for account workspace settings plus direct upload session creation.

## Generated D1 RPC Rewrite Map

Generated on 2026-06-30 local time with `bun run cf:d1-rpc-map`.

Artifacts:

- `evidence/2026-06-30-cloudflare-d1-rpc-rewrite-map.json`
- `evidence/2026-06-30-cloudflare-d1-rpc-rewrite-map.md`

The generated map converts every inventory RPC name into a D1 rewrite row with domain, caller count, current Postgres behavior summary, D1 rewrite strategy, transaction needs, idempotency needs, and proof references. It intentionally stays local and does not read env files, print secret values, call provider APIs, create D1 databases, mutate Cloudflare/Supabase, deploy Workers, change DNS, bill, or make Supabase removable.

| Evidence | Generated result |
| --- | ---: |
| Total RPC names | `80` |
| Mapped RPC names | `80` |
| RPCs with golden fixture refs | `80` |
| Transaction-sensitive RPCs | `54` |
| Idempotency-sensitive RPCs | `44` |
| Golden fixtures ready | yes |
| Transaction proof ready | yes |
| Rollback proof ready | yes |
| Idempotency proof ready | yes |
| Local RPC mechanics proof ready | yes |
| Production RPC rewrite ready | no |

Current blockers recorded by the map: none for local rewrite-map coverage. The latest classifier deliberately excludes stable read-model, authorization, list, preview, summary, seed, and route-context RPCs from write-proof gates while keeping mutating invitation, upload, estimate-history, component-library, closed-beta, and destructive operations conservative. The local collaboration-invitation proof artifact supplies transaction, rollback, and idempotency refs for the five invitation token/acceptance RPCs; the local closed-beta proof artifact supplies transaction and rollback refs for the two closed-beta allowlist mutation RPCs; the local component-library proof artifact supplies transaction, rollback, and idempotency refs for six component-library mutation RPCs; the local estimate-history proof artifact supplies transaction, rollback, and idempotency refs for twelve estimate-history mutation RPCs; and local contract assertions now cover the final references for `record_mass_deletion_storage_cleanup_result` and `ensure_current_user_profile`.

## Generated D1 RPC Transaction Mechanics Proof

Generated on 2026-06-30 local time with `bun run cf:d1-rpc-proof`.

Artifacts:

- `evidence/2026-06-30-cloudflare-d1-rpc-transaction-proof.json`
- `evidence/2026-06-30-cloudflare-d1-rpc-transaction-proof.md`

The generated proof uses sanitized temporary SQLite tables to prove reusable local mechanics for D1-style mutating RPC replacements: all-or-nothing writes, rollback with no residue, and uniqueness/correlation-key idempotency. It intentionally stays local and does not read env files, print secret values, call provider APIs, create hosted D1 databases, mutate Cloudflare/Supabase, deploy Workers, change DNS, bill, rewrite every Supabase RPC, or make production D1/Auth/Realtime ready.

| Evidence | Generated result |
| --- | --- |
| Local transaction mechanics ready | yes |
| Local rollback mechanics ready | yes |
| Local idempotency mechanics ready | yes |
| Local RPC mechanics proof ready | yes |
| Production RPC rewrite ready | no |
| Local-only proof | yes |
| Provider-backed D1 proof | no |
| Covered proof patterns | `4` |
| Rollback residue rows | `0` |
| Duplicate side effects | `0` |

Current blockers recorded by the proof: hosted Worker+D1 mutation/rollback/idempotency proof is still missing. The local per-RPC rewrite-map references are now complete; `record_mass_deletion_storage_cleanup_result` has atomic status/result plus duplicate-retry contract proof, and `ensure_current_user_profile` has fail-closed RPC usage proof.

## Generated D1 Beta Feedback Domain Proof

Generated on 2026-06-30 local time with `bun run cf:d1-beta-feedback-proof`.

Artifacts:

- `evidence/2026-06-30-cloudflare-d1-beta-feedback-proof.json`
- `evidence/2026-06-30-cloudflare-d1-beta-feedback-proof.md`

The generated proof uses sanitized temporary SQLite tables to model the current protected beta-feedback submission and platform-admin review/status workflow as a low-risk D1 domain slice. It intentionally stays local and does not read env files, print secret values, call provider APIs, create hosted D1 databases, mutate Cloudflare/Supabase, deploy Workers, change DNS, bill, replace the live Supabase-backed Server Actions, or make production D1/Auth/Realtime ready.

| Evidence | Generated result |
| --- | --- |
| Schema ready | yes |
| Enum parity ready | yes |
| App-layer authz ready | yes |
| Submission mutation ready | yes |
| Forged context denied | yes |
| Admin review ready | yes |
| Admin status update ready | yes |
| Non-admin review denied | yes |
| Rollback ready | yes |
| Idempotency ready | yes |
| Query budget ready | yes |
| Restore fixture ready | yes |
| Local beta-feedback D1 slice ready | yes |
| Production beta-feedback D1 ready | no |
| Provider-backed D1 proof | no |

Captured local facts: one authorized feedback row persisted; forged workspace rows, mismatched project rows, rollback residue rows, and duplicate status-audit rows all remained `0`; the admin review queue uses `idx_beta_feedback_status_created_at`; and the three local query surfaces passed p95 budgets (`submit_beta_feedback_authz`, `beta_feedback_admin_review_queue`, and `beta_feedback_status_update_guard`). Current blockers recorded by the proof: hosted Worker+D1 beta-feedback proof is missing, and Better Auth production identity handoff is still missing.

## Generated D1 Collaboration Invitation Domain Proof

Generated on 2026-06-30 local time with `bun run cf:d1-collaboration-invitation-proof`.

Artifacts:

- `evidence/2026-06-30-cloudflare-d1-collaboration-invitation-proof.json`
- `evidence/2026-06-30-cloudflare-d1-collaboration-invitation-proof.md`

The generated proof uses sanitized temporary SQLite tables to model the current collaboration-invitation token issue, delivery, resolve, wrong-account, replay, accept-by-token, and accept-by-id workflows as a bounded D1 domain slice. It intentionally stays local and does not read env files, print secret values, call provider APIs, create hosted D1 databases, mutate Cloudflare/Supabase, deploy Workers, change DNS, bill, replace live invitation routes/actions, or make production D1/Auth/Realtime ready.

| Evidence | Generated result |
| --- | --- |
| Schema ready | yes |
| Token issue ready | yes |
| Delivery audit ready | yes |
| Resolve state ready | yes |
| Resolve audit ready | yes |
| Accept by token ready | yes |
| Accept by id ready | yes |
| Wrong account denied | yes |
| Replay denied | yes |
| Revoked terminal nulled | yes |
| Rollback ready | yes |
| Idempotency ready | yes |
| Query budget ready | yes |
| Restore fixture ready | yes |
| Local collaboration-invitation D1 slice ready | yes |
| Production collaboration-invitation D1 ready | no |
| Provider-backed D1 proof | no |

Captured local facts: `5` affected RPCs are covered (`issue_collaboration_invitation_token`, `record_collaboration_invitation_delivery`, `resolve_collaboration_invitation`, `accept_collaboration_invitation`, and `accept_collaboration_invitation_by_id`); token issue creates one active token while revoking the old active token; delivery/open/accept/replay audit rows dedupe; revoked resolution returns a terminal state with project id nulled; wrong-account acceptance leaves `0` membership rows; rollback residue rows stayed `0`; duplicate accept audit rows stayed `0`; and four local query surfaces passed p95 budgets. Current blockers recorded by the proof: hosted Worker+D1 collaboration-invitation proof is missing, and Better Auth production identity handoff is still missing.

## Generated D1 Closed-Beta Allowlist Domain Proof

Generated on 2026-06-30 local time with `bun run cf:d1-closed-beta-proof`.

Artifacts:

- `evidence/2026-06-30-cloudflare-d1-closed-beta-proof.json`
- `evidence/2026-06-30-cloudflare-d1-closed-beta-proof.md`

The generated proof uses sanitized temporary SQLite tables to model the current closed-beta access check, admin queue read, allowlist create, allowlist update, non-admin denial, invalid status denial, rollback, restore, and indexed query workflows as a bounded D1 domain slice. It intentionally stays local and does not read env files, print secret values, call provider APIs, create hosted D1 databases, mutate Cloudflare/Supabase, deploy Workers, change DNS, bill, replace live auth gates, or make production D1/Auth ready.

| Evidence | Generated result |
| --- | --- |
| Schema ready | yes |
| Status contract ready | yes |
| App-layer admin guard ready | yes |
| Access check ready | yes |
| Queue read ready | yes |
| Create mutation ready | yes |
| Update mutation ready | yes |
| Non-admin denied | yes |
| Invalid status denied | yes |
| Rollback ready | yes |
| Idempotency ready | yes |
| Query budget ready | yes |
| Restore fixture ready | yes |
| Local closed-beta D1 slice ready | yes |
| Production closed-beta D1 ready | no |
| Provider-backed D1 proof | no |

Captured local facts: `4` affected RPCs are covered (`check_closed_beta_access`, `read_closed_beta_allowlist_queue`, `create_closed_beta_allowlist_entry`, and `update_closed_beta_allowlist_entry`); invited and active beta emails are allowed while revoked, missing, and wrong-email requests are denied; admin queue rows are visible only to admin context; create normalizes `NewPilot@Example.TEST` to `newpilot@example.test`; duplicate create rows, non-admin queue rows, non-admin create rows, invalid create rows, and rollback residue rows all stayed `0`; invalid create/update commands failed closed; and four local query surfaces passed p95 budgets. Current blockers recorded by the proof: hosted Worker+D1 closed-beta proof is missing, Better Auth production identity handoff is still missing, and provider-backed D1 export/restore proof for closed-beta allowlist rows is still missing.

## Generated D1 Component-Library Domain Proof

Generated on 2026-06-30 local time with `bun run cf:d1-component-library-proof`.

Artifacts:

- `evidence/2026-06-30-cloudflare-d1-component-library-proof.json`
- `evidence/2026-06-30-cloudflare-d1-component-library-proof.md`

The generated proof uses sanitized temporary SQLite tables to model the current component-library folder, component update/versioning, lifecycle, price-option, and bulk-archive mutation cluster as a bounded D1 domain slice. It intentionally stays local and does not read env files, print secret values, call provider APIs, create hosted D1 databases, mutate Cloudflare/Supabase, deploy Workers, change DNS, bill, replace live library routes/actions, or make production D1/Auth ready.

| Evidence | Generated result |
| --- | --- |
| Schema ready | yes |
| Editor guard ready | yes |
| Folder delete ready | yes |
| Folder reorder ready | yes |
| Bulk archive ready | yes |
| Component update ready | yes |
| Lifecycle mutation ready | yes |
| Price option upsert ready | yes |
| Rollback ready | yes |
| Idempotency ready | yes |
| Query budget ready | yes |
| Restore fixture ready | yes |
| Local component-library D1 slice ready | yes |
| Production component-library D1 ready | no |
| Provider-backed D1 proof | no |

Captured local facts: `6` affected RPCs are covered (`delete_library_folder`, `execute_bulk_archive_library_components`, `reorder_library_folders`, `set_cost_library_component_lifecycle_state`, `update_cost_library_component`, and `upsert_cost_library_component_price_option`); unauthorized folder deletion fails closed; folder deletion reparents child folders and detaches item folder ids; duplicate/cycle reorder attempts fail closed; component update writes a version row; lifecycle and price-option operations dedupe repeated side effects; bulk archive is correlation-id idempotent; stale preview rollback leaves `0` residue rows; restored fixture rows match; and four local query surfaces pass p95 budgets. Current blockers recorded by the proof: hosted Worker+D1 component-library proof is missing, Better Auth production identity handoff is still missing, and provider-backed D1 export/restore proof for component-library rows is still missing.

## Generated D1 Estimate-History Domain Proof

Generated on 2026-06-30 local time with `bun run cf:d1-estimate-history-proof`.

Artifacts:

- `evidence/2026-06-30-cloudflare-d1-estimate-history-proof.json`
- `evidence/2026-06-30-cloudflare-d1-estimate-history-proof.md`

The generated proof uses sanitized temporary SQLite tables to model the current estimate-history tab, subtree, row move, sheet adjustment, package apply, and promote-to-library mutation cluster as a bounded D1 domain slice. It intentionally stays local and does not read env files, print secret values, call provider APIs, create hosted D1 databases, mutate Cloudflare/Supabase, deploy Workers, change DNS, bill, replace live estimate routes/actions, or make production D1/Auth ready.

| Evidence | Generated result |
| --- | --- |
| Schema ready | yes |
| Editor guard ready | yes |
| Estimate tab mutation ready | yes |
| Subtree insert ready | yes |
| Row move ready | yes |
| Sheet adjustment ready | yes |
| Package apply ready | yes |
| Promote to library ready | yes |
| Rollback ready | yes |
| Idempotency ready | yes |
| Query budget ready | yes |
| Restore fixture ready | yes |
| Local estimate-history D1 slice ready | yes |
| Production estimate-history D1 ready | no |
| Provider-backed D1 proof | no |

Captured local facts: `12` affected RPCs are covered (`archive_estimate_tab_with_history`, `create_ai_package_library_components_with_history`, `create_estimate_tab_with_history`, `create_project_estimate_package_with_history`, `delete_estimate_tab_with_history`, `duplicate_estimate_tab_with_history`, `insert_estimate_subtree_into_estimate_with_history`, `move_estimate_row_item_with_history`, `promote_estimate_row_to_library_component`, `rename_estimate_tab_with_history`, `reorder_estimate_tabs_with_history`, and `update_estimate_sheet_adjustment_with_history`); viewer mutation fails closed with `0` residue rows; tab create replay dedupes to one tab; duplicate reorder fails closed; subtree insert replays through one operation key; row move and sheet adjustment write history rows; project and library package commands persist once; promote-to-library links the estimate row; rollback residue rows stayed `0`; restored tabs/nodes/rows/history rows match; and four local query surfaces pass p95 budgets. Current blockers recorded by the proof: hosted Worker+D1 estimate-history proof is missing, Better Auth production identity handoff is still missing, and provider-backed D1 export/restore proof for estimate-history rows is still missing.

## Generated D1/Auth/Realtime Readiness Snapshot

Generated on 2026-06-30 local time with `bun run cf:check-d1-auth-realtime`.

Artifacts:

- `evidence/2026-06-30-cloudflare-better-auth-route-gate-proof.json`
- `evidence/2026-06-30-cloudflare-better-auth-route-gate-proof.md`
- `evidence/2026-06-30-cloudflare-d1-rpc-transaction-proof.json`
- `evidence/2026-06-30-cloudflare-d1-rpc-transaction-proof.md`
- `evidence/2026-06-30-cloudflare-d1-beta-feedback-proof.json`
- `evidence/2026-06-30-cloudflare-d1-beta-feedback-proof.md`
- `evidence/2026-06-30-cloudflare-d1-collaboration-invitation-proof.json`
- `evidence/2026-06-30-cloudflare-d1-collaboration-invitation-proof.md`
- `evidence/2026-06-30-cloudflare-d1-closed-beta-proof.json`
- `evidence/2026-06-30-cloudflare-d1-closed-beta-proof.md`
- `evidence/2026-06-30-cloudflare-d1-component-library-proof.json`
- `evidence/2026-06-30-cloudflare-d1-component-library-proof.md`
- `evidence/2026-06-30-cloudflare-d1-estimate-history-proof.json`
- `evidence/2026-06-30-cloudflare-d1-estimate-history-proof.md`
- `evidence/2026-06-30-cloudflare-d1-auth-realtime-readiness.json`
- `evidence/2026-06-30-cloudflare-d1-auth-realtime-readiness.md`

The generated snapshot evaluates the Supabase-to-D1/Auth/Realtime redesign prerequisites without provider API calls, env-file reads, secret printing, D1 creation, provider mutation, deployment, DNS mutation, billing, or provider removal:

| Gate | Ready? |
| --- | --- |
| Database inventory ready | yes |
| D1 binding ready | yes |
| Better Auth local route-gate proof ready | yes |
| Auth replacement ready | no |
| App-layer authorization spec ready | yes |
| Local RPC transaction mechanics ready | yes |
| Local beta-feedback D1 slice ready | yes |
| Local collaboration-invitation D1 slice ready | yes |
| Local closed-beta D1 slice ready | yes |
| Local component-library D1 slice ready | yes |
| Local estimate-history D1 slice ready | yes |
| RPC rewrite plan ready | yes |
| Realtime replacement ready | yes |
| Restore proof ready | yes |
| Performance proof ready | no |
| Local redesign readiness report ready | yes |
| Production D1/Auth/Realtime ready | no |

Captured local facts:

- Current inventory contains `71` App Router route entries, `93` provider-coupled files, `80` distinct Supabase RPC names, `181` applied SQL migrations, `346` SQL function declaration matches, and `684` RLS/policy/storage/auth SQL matches.
- `wrangler.jsonc` has local proof D1 binding `ARCH_DB` with placeholder zero UUIDs plus Durable Object namespace binding `COLLAB_ROOMS` for `CollaborationRoom`.
- `cloudflare-env.d.ts` has typed `ARCH_DB: D1Database` and `COLLAB_ROOMS: DurableObjectNamespace<import("./worker").CollaborationRoom>`.
- `package.json` includes `better-auth@1.6.22`.
- `src/lib/auth/better-auth-cloudflare.ts` is a local-only Better Auth/D1 route-gate scaffold with lazy Better Auth runtime loading, D1 database factory pattern, Next handler factory pattern, migration compilation helper, secure server session check pattern, and `7` route-gate parity rows.
- `src/app/api/auth/[...all]/route.ts` mounts guarded Better Auth handlers for local proof and fails closed unless `BETTER_AUTH_SECRET` is at least 32 characters and the OpenNext Cloudflare context exposes `ARCH_DB`; it does not replace the live Supabase auth gate.
- Source scanning finds `12` Supabase Auth-related files, `19` Supabase Realtime-related files, one Durable Object realtime source at `src/lib/cloudflare/collaboration-room.ts`, and the local Better Auth D1 route-gate scaffold plus guarded route mount.
- App-layer authorization matrix evidence is present with `47` DB-backed access paths, `47` positive-test rows, `47` denial-test rows, `allProtectedAccessPathsCovered=true`, `crossWorkspaceDenialsReady=true`, and `routeActionCoverageReady=true`.
- Local beta-feedback D1 slice evidence is present with `schemaReady=true`, `appLayerAuthzReady=true`, `localBetaFeedbackD1SliceReady=true`, `productionBetaFeedbackD1Ready=false`, `forgedWorkspaceRows=0`, `mismatchedProjectRows=0`, `rollbackResidueRows=0`, and `duplicateStatusAuditRows=0`.
- Local collaboration-invitation D1 slice evidence is present with `schemaReady=true`, `tokenIssueReady=true`, `resolveStateReady=true`, `acceptByTokenReady=true`, `acceptByIdReady=true`, `localCollaborationInvitationD1SliceReady=true`, `productionCollaborationInvitationD1Ready=false`, `wrongAccountMembershipRows=0`, `rollbackResidueRows=0`, `duplicateAcceptAuditRows=0`, and `replayBlockedAuditRows=1`.
- Local closed-beta D1 slice evidence is present with `schemaReady=true`, `statusContractReady=true`, `appLayerAdminGuardReady=true`, `accessCheckReady=true`, `queueReadReady=true`, `createMutationReady=true`, `updateMutationReady=true`, `localClosedBetaD1SliceReady=true`, `productionClosedBetaD1Ready=false`, `nonAdminQueueRows=0`, `nonAdminCreateRows=0`, `duplicateCreateRows=0`, and `rollbackResidueRows=0`.
- Local component-library D1 slice evidence is present with `schemaReady=true`, `editorGuardReady=true`, `folderDeleteReady=true`, `folderReorderReady=true`, `bulkArchiveReady=true`, `componentUpdateReady=true`, `lifecycleMutationReady=true`, `priceOptionUpsertReady=true`, `localComponentLibraryD1SliceReady=true`, `productionComponentLibraryD1Ready=false`, `viewerDeleteResidueRows=0`, `rollbackResidueRows=0`, `duplicatePriceHistoryRows=0`, `duplicateBulkArchiveEventRows=0`, and restored component rows `5`.
- Local estimate-history D1 slice evidence is present with `schemaReady=true`, `appLayerEditorGuardReady=true`, `estimateTabMutationReady=true`, `subtreeInsertReady=true`, `rowMoveReady=true`, `sheetAdjustmentReady=true`, `packageApplyReady=true`, `promoteToLibraryReady=true`, `rollbackReady=true`, `idempotencyReady=true`, `queryBudgetReady=true`, `restoreFixtureReady=true`, `localEstimateHistoryD1SliceReady=true`, `productionEstimateHistoryD1Ready=false`, `viewerMutationResidueRows=0`, `rollbackResidueRows=0`, `duplicateSubtreeOperationRows=1`, `projectPackageCommandRows=1`, `libraryPackageCommandRows=1`, and restored history rows `11`.
- Supabase RPC rewrite-map evidence is present with `80` of `80` inventory RPCs mapped, golden fixtures ready, `transactionProofReady=true`, `rollbackProofReady=true`, `idempotencyProofReady=true`, and no local rewrite-map blockers. The final local reference gaps are covered by contract proof for `record_mass_deletion_storage_cleanup_result` and `ensure_current_user_profile`.
- Local D1 RPC transaction mechanics evidence is present with `localTransactionMechanicsReady=true`, `localRollbackMechanicsReady=true`, `localIdempotencyMechanicsReady=true`, `localRpcMechanicsProofReady=true`, `rollbackResidueRows=0`, and `duplicateSideEffects=0`; production rewrite readiness remains false because hosted Worker+D1/provider proof is still absent.
- D1 restore rehearsal evidence is present and local-only: `d1ExportReady=true`, `d1ImportReady=true`, `restoreRehearsalReady=true`, `destructiveRestoreDocumented=true`, `localOnly=true`, and `providerBacked=false`. The rehearsal uses sanitized temporary SQLite data and does not create or restore a hosted Cloudflare D1 database.
- D1 performance evidence is present and local-only: `queryCountBudgetsReady=true`, `p95RouteProofReady=true`, `hostedWorkerD1PerformanceReady=false`, `localOnly=true`, and `providerBacked=false`. The benchmark seeds `132` sanitized SQLite rows across `6` fixture tables and passes four indexed query surfaces locally; hosted Worker+D1 performance remains unproven.

Current blockers recorded by the readiness report: Better Auth production cutover proof is missing, and no hosted Worker+D1 performance proof exists. The local D1 binding, app-layer authorization, local RPC mechanics, per-RPC rewrite map, local beta-feedback slice, local collaboration-invitation slice, local closed-beta slice, local component-library slice, local estimate-history slice, Durable Objects/WebSockets scaffold, local restore-rehearsal, and local query/p95 gates are clear, but no real Cloudflare D1 database has been created, restored, benchmarked, or provider-proven.

## Generated Cloudflare Release Gate Snapshot

Generated on 2026-06-30 local time with `bun run cf:release-gates`.

Artifacts:

- `evidence/2026-06-30-cloudflare-release-gates.json`
- `evidence/2026-06-30-cloudflare-release-gates.md`

The generated snapshot aggregates the current local and sanitized proof artifacts, including Wrangler/API auth readiness, without provider API calls, env-file reads, secret printing, deployment, DNS mutation, billing, or provider removal:

| Gate | Ready? |
| --- | --- |
| Planning inputs ready | yes |
| Local runtime proof ready | yes |
| Provider dashboard inventory ready | yes |
| Provider proof ready | no |
| Cost/performance proof ready | no |
| D1/Auth/Realtime proof ready | no |
| Local release-gate report ready | yes |
| Production cutover ready | no |

Historical blockers recorded by the older 2026-06-30 aggregate gate: D1/Auth/Realtime production proof, hosted Worker route matrix proof, Wrangler/API auth readback, provider resource readback, hosted Worker/custom-domain proof, Workers Paid/secrets, provider-backed R2/Images proof, Cron/Queues/dead-letter proof, Cloudflare analytics/observability receipt, sanitized current-provider cost inputs, hosted Cloudflare usage inputs, hosted performance proof, and production cost decision evidence.

Current aggregate release gates were refreshed at `2026-07-03T19:09:27.829Z`
in `evidence/2026-07-01-cloudflare-release-gates.*`; they report
`productionCutoverReady=true` with `blockers=[]`. This does not close the
latest deploy/source-smoke blocker for the local CRUD/image-auth/favorites patch
and does not make the remaining provider-exit operator/persona/mailbox gates
complete.

This is an aggregate evidence index only. A passing local release-gate report does not prove production deploy readiness or make Vercel/Supabase/Resend removable.

## Latest Read-Only Cloudflare Dashboard Refresh

Refreshed on 2026-06-30 with the Codex in-app browser against the authenticated Cloudflare dashboard. This was a read-only pass: no provider mutation, deploy, DNS edit, API token creation, checkout, subscription action, or provider cancellation was performed.

Current dashboard facts recorded in `evidence/2026-06-30-cloudflare-provider-readiness-source.json`:

- Zone `archestimator.com` is still on the Free plan and pending Cloudflare ownership verification.
- DNS records page shows DNS Setup: Full, a pending-domain notice, and `9` imported records, including apex `A 216.150.1.1` proxied and `www` CNAME `bb7ab57cfa50fcad.vercel-dns-017.com` proxied.
- Workers & Pages shows no projects, requests `0`, CPU time `0 ms`, observability events `0`, Workers build minutes `0`, account ID `7f6229cfea61b59f6f48b517fde86039`, and subdomain `philipjonlewis.workers.dev`.
- Workers plans marks Free as the current plan and presents Purchase Workers Paid as the paid-plan action.
- D1 shows no visible database rows and zero read/write/storage metrics.
- R2 redirects to the R2 subscription page with `Add R2 subscription to my account`; the action was not clicked.
- Queues shows no visible queue rows and zero operations/messages/backlog/lag metrics.
- Hosted Images says a subscription is required to add storage; images delivered is `0` and images stored is not applicable in the current plan.
- Web Analytics lists one `archestimator.com` site, with `0` page views and `0` visits in the last 24 hours.
- Account Observability shows Cloudflare Workers dataset events `0`, success `0`, and errors `0` for the last hour.
- Zone Workers Routes says there are no configured routes.

Subscription sequencing based on the current target and dashboard state: Workers Paid and R2 are the first paid-provider steps for this migration. Cloudflare Images is separate and only needed if the hosted media pipeline uses it. Pro, Argo, and Load Balancing should be deferred until hosted traffic proves a concrete WAF/cache/origin-routing/failover need; they do not clear the current Worker deployment, R2/Images, D1/Auth/Realtime, or provider readback blockers.

## Repo Scan Commands And Counts

| Evidence | Command | Result |
| --- | --- | ---: |
| App files | `rg --files src/app` | `107` |
| API route files | `rg --files src/app/api` | `27` |
| Source files matching provider coupling | `rg -l "supabase|createSupabase|@supabase|\\.rpc\\(|\\.storage\\.|realtime|channel\\(" src/app src/lib src/components src/proxy.ts` | `126` |
| Distinct app-code RPC names | `rg -o --no-filename "rpc\\(\"[A-Za-z0-9_]+\"" src/app src/lib` | `76` |
| Applied SQL migrations | `rg --files supabase/migrations` | `181` |
| Pending-review SQL files | `rg --files supabase/migrations-pending-review` | `15` |
| SQL function declaration/update matches | `rg -n "create (or replace )?function public\\.|create function public\\." supabase/migrations supabase/migrations-pending-review` | `346` |
| RLS/policy/storage/auth SQL matches | `rg -n "create policy|alter table .* enable row level security|storage\\.objects|storage\\.buckets|auth\\.uid\\(" supabase/migrations supabase/migrations-pending-review` | `655` |
| Vitest files | `rg --files tests/vitest` | `555` |

## Full App-Code RPC Catalog

The command only scans `src/app` and `src/lib`; SQL-only functions may exist beyond this list. Every item below needs a caller, SQL source, auth assumption, D1 rewrite strategy, transaction strategy, and denial/golden fixture before D1 implementation.

Access, auth, workspace, and closed-beta RPCs:

- `accept_collaboration_invitation`
- `accept_collaboration_invitation_by_id`
- `can_access_estimate`
- `can_access_project`
- `can_edit_estimate`
- `can_edit_project`
- `check_closed_beta_access`
- `create_closed_beta_allowlist_entry`
- `is_workspace_editor`
- `is_workspace_member`
- `read_closed_beta_allowlist_queue`
- `update_closed_beta_allowlist_entry`

Estimate, tree, tab, history, and template RPCs:

- `archive_estimate_tab_with_history`
- `create_estimate_node_with_history`
- `create_estimate_tab_with_history`
- `create_project_estimate_package_with_history`
- `delete_estimate_node_with_history`
- `delete_estimate_nodes_bulk_with_history`
- `delete_estimate_row_item_with_history`
- `delete_estimate_row_items_bulk_with_history`
- `delete_estimate_tab_with_history`
- `duplicate_estimate_tab_with_history`
- `estimate_node_route_context`
- `get_estimate_activity_retention_metrics`
- `insert_estimate_row_item_with_history`
- `insert_estimate_template_into_estimate_with_history`
- `insert_estimate_template_node_into_estimate_with_history`
- `move_estimate_row_component_with_history`
- `move_estimate_row_item_with_history`
- `project_estimate_list_summaries`
- `project_estimate_list_summaries_for_estimates`
- `promote_estimate_row_to_library_component`
- `rename_estimate_node_with_history`
- `rename_estimate_tab_with_history`
- `reorder_estimate_nodes_with_history`
- `reorder_estimate_tabs_with_history`
- `replace_estimate_row_item_with_history`
- `restore_deleted_estimate_nodes_with_history`
- `restore_deleted_estimate_rows_with_history`
- `unlink_estimate_row_item_from_library_with_history`
- `update_estimate_details_with_history`
- `update_estimate_row_item_with_history`
- `update_estimate_sheet_adjustment_with_history`

Project, navigation, publication, and recipient RPCs:

- `increment_project_publication_open`
- `list_recipient_publications_for_current_user`
- `main_sidebar_favorite_projects`
- `preview_bulk_delete_estimate_sheets`
- `preview_bulk_delete_projects`
- `execute_bulk_delete_estimate_sheets`
- `execute_bulk_delete_projects`
- `workspace_homebase_summary`
- `workspace_projects_summary`

Library and reusable-source RPCs:

- `create_ai_package_library_components_with_history`
- `create_cost_library_component`
- `delete_library_folder`
- `execute_bulk_archive_library_components`
- `library_component_rows_seed`
- `library_overview_summary`
- `library_templates_seed`
- `preview_bulk_archive_library_components`
- `reorder_library_folders`
- `set_cost_library_component_lifecycle_state`
- `update_cost_library_component`
- `upsert_cost_library_component_price_option`

Collaboration, invitations, upload, and provider-operation RPCs:

- `approve_upload_scan_override`
- `create_upload_session`
- `finalize_upload_session`
- `issue_collaboration_invitation_token`
- `list_pending_collaboration_invitations`
- `read_project_collaboration_audit_events`
- `record_collaboration_invitation_delivery`
- `record_mass_deletion_storage_cleanup_result`
- `record_upload_asset`
- `record_upload_scan_result`
- `resolve_collaboration_invitation`
- `validate_estimate_row_image_asset`

## High-Signal Provider-Coupled Source Areas

The provider-coupling scan matched `126` files under `src/app`, `src/lib`, `src/components`, and `src/proxy.ts`. The list below combines the highest-priority matches from that scan with realtime hook files identified in `03_SOURCE_AND_CODEBASE_AUDIT.md`, because those files sit at auth, database, storage, realtime, email, and publication boundaries:

- `src/proxy.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/client.ts`
- `src/lib/supabase/service-role.ts`
- `src/lib/supabase/types.ts`
- `src/app/auth/callback/route.ts`
- `src/app/providers.tsx`
- `src/app/api/projects/images/route.ts`
- `src/app/api/estimate-row-images/route.ts`
- `src/app/api/component-library/images/route.ts`
- `src/app/api/component-library/attachments/route.ts`
- `src/app/api/component-library/attachments/direct-upload/route.ts`
- `src/app/api/component-library/attachments/scan-override/route.ts`
- `src/app/api/internal/upload-cleanup/route.ts`
- `src/app/api/internal/upload-runtime/route.ts`
- `src/app/api/internal/upload-scan/route.ts`
- `src/app/api/webhooks/resend/route.ts`
- `src/app/api/share/[token]/activity/route.ts`
- `src/app/invite/[token]/accept/route.ts`
- `src/lib/auth/session.ts`
- `src/lib/auth/account-service-role.ts`
- `src/lib/auth/closed-beta-access.ts`
- `src/lib/collaboration/actions.ts`
- `src/lib/collaboration/realtime-identity-server.ts`
- `src/lib/collaboration/realtime-telemetry.ts`
- `src/lib/component-library/actions.ts`
- `src/lib/component-library/template-editor-actions.ts`
- `src/lib/email/resend-webhooks.ts`
- `src/lib/estimates/actions.ts`
- `src/lib/projects/actions.ts`
- `src/lib/publication/actions.ts`
- `src/lib/publication/public-repository.ts`
- `src/lib/publisher/activity-repository.ts`
- `src/lib/repositories/component-library-repository.ts`
- `src/lib/repositories/estimate-repository.ts`
- `src/lib/repositories/project-data-repository.ts`
- `src/lib/repositories/project-estimate-sheets-repository.ts`
- `src/lib/repositories/recipient-proposals-repository.ts`
- `src/lib/repositories/workspace-repository.ts`
- `src/lib/uploads/storage-provider.ts`
- `src/lib/uploads/upload-records.ts`
- `src/lib/uploads/direct-upload-records.ts`
- `src/lib/uploads/scan-job.ts`
- `src/lib/uploads/cleanup-job.ts`
- `src/lib/uploads/provider-portability.ts`
- `src/components/realtime-auth-bridge.tsx`
- `src/components/workshop/ProjectCursorLayer.tsx`
- `src/hooks/use-project-presence.ts`
- `src/hooks/use-estimate-cursor-broadcast.ts`
- `src/hooks/use-estimate-row-update-broadcast.ts`

Future inventory should fill the remaining matched files from the same command and the realtime hook audit, but this priority set is enough to pick a first proof slice.

## Existing Test And Proof Surfaces To Reuse

Auth and route gates:

- `tests/vitest/auth-proxy.test.ts`
- `tests/vitest/auth-session-closed-beta.test.ts`
- `tests/vitest/auth-sensitive-api-boundaries.test.ts`
- `tests/vitest/hosted-auth-route-smoke-script.test.ts`
- `e2e/auth.spec.ts`

Estimate and project correctness:

- `tests/vitest/estimate-mutations.test.ts`
- `tests/vitest/estimate-sheet-actions-authz.test.ts`
- `tests/vitest/estimate-node-route-context-rpc-contract.test.ts`
- `tests/vitest/project-estimate-list-summaries-parity.test.ts`
- `tests/vitest/project-data-repository.test.ts`
- `e2e/estimate-sheet-target-route-smoke.spec.ts`

Library:

- `tests/vitest/component-library-actions-revalidation.test.ts`
- `tests/vitest/component-library-templates-repository.test.ts`
- `tests/vitest/library-route-state-authz.test.tsx`
- `tests/vitest/perf/library-overview-rpc-contract.test.ts`
- `e2e/workshop-library-routes.spec.ts`

Publication and share links:

- `tests/vitest/project-publication-route.test.ts`
- `tests/vitest/project-publication-security.test.ts`
- `tests/vitest/share-no-store-invariants.test.ts`
- `tests/vitest/shared-link-hosted-password-route-proof-script.test.ts`
- `tests/vitest/shared-link-perf-budgets-script.test.ts`
- `e2e/shared-link-receiver.spec.ts`

Uploads and storage:

- `tests/vitest/upload-storage-provider.test.ts`
- `tests/vitest/upload-provider-portability.test.ts`
- `tests/vitest/upload-provider-readback.test.ts`
- `tests/vitest/upload-storage-denial-proof.test.ts`
- `tests/vitest/upload-signed-provider-proof.test.ts`
- `tests/vitest/upload-scan-worker-provider-proof.test.ts`
- `tests/vitest/hosted-upload-runtime-proof-script.test.ts`

Realtime and collaboration:

- `tests/vitest/project-collaboration-realtime.test.ts`
- `tests/vitest/realtime-identity.test.ts`
- `tests/vitest/realtime-auth-bridge-favorites-clear.test.tsx`
- `tests/vitest/estimate-cursor-broadcast-throttle.test.ts`
- `e2e/teamspace-collaboration.spec.ts`

Email:

- `tests/vitest/cloudflare-email-readiness-script.test.ts`
- `tests/vitest/cloudflare-email-client.test.ts`
- `tests/vitest/transactional-email-client.test.ts`
- `tests/vitest/resend-readiness-script.test.ts`
- `tests/vitest/resend-webhook-delivery.test.ts`
- `tests/vitest/resend-webhook-route.test.ts`
- `tests/vitest/resend-webhook-scope.test.ts`

Latest Cloudflare Email readiness artifact:

- `evidence/2026-06-30-cloudflare-email-readiness.json`
- `evidence/2026-06-30-cloudflare-email-readiness.md`

Current email cutover status: Cloudflare Worker `send_email` binding and local client paths exist, including a provider-neutral transactional `sendEmail` wrapper. The Cloudflare email Worker secret names are now present on `archestimator-proof`, but production Email Sending remains **NO-GO** because `wrangler email sending list` reports no onboarded Email Sending domains/subdomains and `wrangler email sending enable archestimator.com` fails while the zone is inactive. Resend remains the rollback/current provider until Cloudflare Email Service proves outbound send, arbitrary-recipient eligibility, bounce/retry/suppression behavior, and analytics/event parity.

Performance:

- `tests/vitest/route-transition-performance-spec.test.ts`
- `tests/vitest/route-transition-readiness-script.test.ts`
- `tests/vitest/perf/projects-page-rpc-contract.test.ts`
- `tests/vitest/perf/projects-page-server-parallelism.test.ts`
- `tests/vitest/perf/estimate-sheet-render-baseline.test.tsx`
- `e2e/route-transition-performance.spec.ts`
- `e2e/estimate-sheet-loading-performance.spec.ts`

## Existing Provider Proof Script Inventory

These scripts are evidence that the current stack already has provider proof habits. A Cloudflare migration must replace the relevant claims before retiring the old scripts.

- `scripts/check-resend-readiness.ts`
- `scripts/check-route-transition-readiness.ts`
- `scripts/check-supabase-backup-readiness.ts`
- `scripts/check-supabase-linked-readiness.ts`
- `scripts/check-supabase-migration-readiness.ts`
- `scripts/check-vercel-env-readiness.ts`
- `scripts/check-vercel-health-readiness.ts`
- `scripts/check-vercel-production-readiness.ts`
- `scripts/check-vercel-speed-insights-readiness.ts`
- `scripts/collect-live-db-performance-evidence.ts`
- `scripts/prove-estimate-list-summaries-postgres.mjs`
- `scripts/prove-estimate-row-item-move-rpc-postgres.mjs`
- `scripts/prove-estimate-tabs-postgres.mjs`
- `scripts/prove-membership-floor-triggers-postgres.mjs`
- `scripts/prove-notification-rls-postgres.mjs`
- `scripts/prove-project-activity-route-browser.mjs`
- `scripts/prove-project-dashboard-activity-location-postgres.mjs`
- `scripts/prove-project-dashboard-route-browser.mjs`
- `scripts/prove-recipient-proposals-browser.mjs`
- `scripts/prove-rls-initplan-postgres.mjs`
- `scripts/prove-shared-link-current-preview-smoke.ts`
- `scripts/prove-shared-link-duplicate-decision-race-http.ts`
- `scripts/prove-shared-link-hosted-password-route.ts`
- `scripts/prove-shared-link-hosted-recipient-activity.ts`
- `scripts/prove-shared-link-provider-perf.ts`
- `scripts/prove-shared-link-response-recipient-set-null-postgres.mjs`
- `scripts/prove-t4-shared-link-db-hygiene-postgres.mjs`
- `scripts/prove-unify-estimate-node-kinds-postgres.mjs`
- `scripts/prove-upload-clamd-live.ts`
- `scripts/prove-upload-clean-download-provider-postgres.ts`
- `scripts/prove-upload-cleanup-provider-postgres.ts`
- `scripts/prove-upload-domain-rls-postgres.mjs`
- `scripts/prove-upload-operations-runbook-local.ts`
- `scripts/prove-upload-scan-rpc-provider-postgres.ts`
- `scripts/prove-upload-scan-worker-provider-postgres.ts`
- `scripts/prove-upload-session-capacity-provider-postgres.ts`
- `scripts/prove-upload-signed-provider-postgres.ts`
- `scripts/prove-upload-signed-route-provider-postgres.ts`
- `scripts/prove-upload-storage-denial-postgres.mjs`
- `scripts/prove-upload-tus-provider-postgres.ts`
- `scripts/prove-workshop-homebase-summary-postgres.mjs`

## Evidence-Based First Slice Candidates

Best first proof slice candidates, based on current coupling and reusable tests:

1. Cloudflare front-door/WAF/Turnstile observability slice. Lowest data migration risk, useful security/cost evidence, rollback by DNS/origin path.
2. Upload storage R2 proof slice. Strong existing upload proof surface and clear provider boundary, but requires signed/private object and scan lifecycle parity.
3. Next-on-Workers route fidelity proof. Required for full-native target, but should stay proof-only until auth/proxy/cache behavior is measured.
4. D1 read-only shadow/projection proof for one low-risk read model. Useful for learning D1 query/performance shape without changing source of truth.

Local follow-up evidence on 2026-06-29:

- A first Cloudflare Cron Trigger wrapper now exists for the existing upload cleanup and scan schedules. It is local proof groundwork only: the Worker preview scheduled endpoint observed matched cron invocations and fail-closed missing-secret logs, while Vercel remains the live cron fallback until Cloudflare provider proof and rollback proof pass.
- A local Cloudflare Queues/Cron retry and DLQ proof now exists for the same upload cleanup/scan job family. `wrangler.jsonc` declares producer binding `UPLOAD_JOBS_QUEUE`, consumer queue `archestimator-upload-jobs`, `max_retries=3`, and dead-letter queue `archestimator-upload-jobs-dlq`; `worker.ts` exposes a Cloudflare `queue()` handler; and `src/lib/cloudflare/upload-job-queue.ts` provides deterministic idempotency keys plus ack/retry decisions. Evidence in `evidence/2026-06-30-cloudflare-queues-cron-proof.json` and `.md` records `localQueuesCronProofReady=true`, `providerBacked=false`, `productionJobsMessagingReady=false`, `3` acked messages, `1` retried message, `1` duplicate ack, `1` invalid-message ack, and `1` DLQ-expected final retry. The Queues and DLQ provider resources now exist and read back through Wrangler; hosted consumer/cron execution evidence remains open.
- A local Wrangler/API auth snapshot now exists. `scripts/check-cloudflare-wrangler-auth.ts` and `bun run cf:check-wrangler-auth` run read-only `wrangler whoami --json`, sanitize output, and write `evidence/2026-06-30-cloudflare-wrangler-auth.{json,md}`. The latest artifact records CLI/auth check completed, OAuth authenticated against account `7f6229cfea61b59f6f48b517fde86039`, `wranglerApiAuthenticated=true`, `providerReadbackReady=true`, and `productionDeployReady=false`. `cf:check-provider` and `cf:release-gates` consume this artifact.
- A first Cloudflare R2 upload storage adapter, Cloudflare Images processing adapter, and R2-mode upload lifecycle route path now exist behind explicit runtime selectors. Local tests prove safe logical key mapping, R2 `put`/`get`/`delete` adaptation, delete cleanup, unsafe path denial, fail-closed signed/public URL behavior, explicit runtime storage provider selection, current image-route compatibility with the provider-neutral upload/download/delete path, mocked OpenNext `ARCH_UPLOADS_R2` component-image route POST/GET behavior, mocked server-mediated component attachment upload/private-download/delete through `ARCH_UPLOADS_R2`, mocked cleanup delete and scan download through `ARCH_UPLOADS_R2`, R2-mode direct signed/TUS session creation failing closed before Supabase signer/RPC use, and mocked `IMAGES` raw-byte WebP resize/thumbnail processing. `cf:typegen` now emits `ARCH_UPLOADS_R2: R2Bucket` and `IMAGES: ImagesBinding`. R2 provider bucket creation/readback is now proven for `archestimator-proof-uploads` and `archestimator-proof-uploads-dev`; the older hosted upload lifecycle/browser proof gap is now superseded by `2026-07-02-cloudflare-hosted-upload-lifecycle-proof.*` and `2026-07-02-cloudflare-hosted-upload-ui-proof.*`. Direct signed-or-TUS R2 signer replacement and paid/deployed Cloudflare Images proof remain separate follow-ups.
- A credential-free local Worker route probe now exists. `.dev.vars.example` lists the publication secret bindings needed for local/deployed Worker proof, and the ignored local `.dev.vars` carries placeholder preview values. Evidence in `evidence/2026-06-29-cloudflare-worker-preview-route-probe.json` and `.md` passed 16 local preview probes for health, 11 public/signed-out pages, signed-out protected-route redirect, invalid share page/API behavior, and private image fail-closed behavior. Hosted custom-domain route parity remains open before provider cutover.
- A Cloudflare Worker readiness checker now exists. `scripts/check-cloudflare-worker-readiness.ts` and `bun run cf:check-readiness` verify `.env.example`, `.dev.vars.example`, `wrangler.jsonc` bindings/crons/observability sampling, package scripts, optional ignored local `.dev.vars` preview names, and optional sanitized Cloudflare Worker secret-list transcripts without printing secret values. Evidence in `evidence/2026-06-29-cloudflare-worker-readiness.json` and `.md` passed manifest/local-preview readiness and intentionally kept `deploymentReady=false` because no provider secret-list/deployment evidence was supplied.

Do not start with full D1/Auth/Realtime replacement. The evidence shows that would mix the riskiest boundaries before the team has proof infrastructure.

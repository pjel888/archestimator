# 14 - Subagent Evidence

Generated: 2026-06-24T17:00:11Z
Updated: 2026-06-25T01:09:51Z

This file records the read-only lane outputs integrated into the findings register. It is a continuation aid, not independent proof that the release gate passed.

## Entry point lane

- Commands used included `rg --files src/app/api -g 'route.ts' -g 'route.tsx'`, exported HTTP method searches, `"use server"` searches, action-file searches, dangerous render/navigation sink searches, and network/storage sink searches.
- Inventory highlights:
  - Public/auth routes: health, auth callback, resend webhook, AI ask/package-builder, component image/attachment uploads, project images, proposal XLSX export, invite continue/accept/sign-out, pending invite.
  - Public share routes: snapshot, password, session, comment, decision, activity, events, unsubscribe.
  - Server-action surfaces: auth/account/legal, collaboration/publication, component library/template editor, estimates/projects/location, beta admin/review, realtime identity.
  - Network/rendering sinks: DeepSeek, Resend, browser fetch/XHR public-share flows, project image upload XHR, constrained JSON-LD/Clarity/pending-invite inline rendering, dynamic image URLs.
- Suspicious gaps promoted to findings:
  - AI package-builder missing route-level quota/rate limit compared with ask route.
  - Component attachment upload error text leakage.
  - Project image GET authorization needs deeper trace.
  - Invite sign-out lacked same-origin/rate-limit guard.
  - Share events metadata lacked obvious bound.
  - Package-builder provider timeout/behavior needs comparison with `deepseek.ts`.

## DB/RLS/storage lane

- RLS coverage: migration source creates 60 tables and every created table has matching `ENABLE ROW LEVEL SECURITY`; `realtime.messages` is enabled. No `FORCE ROW LEVEL SECURITY` found.
- Later broad `TO public` policies were narrowed to authenticated in `20260614144712_narrow_private_rls_policies_to_authenticated.sql`.
- Explicit deny policies exist for internal/audit tables in `20260614152946_explicit_internal_table_deny_policies.sql`.
- SECURITY DEFINER is widespread. Current recount evidence records 204 matches across 67 applied migration files in `16-db-posture-inventory.md`. Many functions use `set search_path = public`; later subset hardening exists in `20260614140923_harden_security_advisor_findings.sql`.
- Authenticated destructive/admin RPC areas requiring negative authorization tests:
  - Bulk delete/archive grants in `20260603191903_harden_mass_deletion_actor_derivation.sql`.
  - Project deletion grants in `20260616180000_allow_project_deletion_with_active_publications.sql`.
  - Library governance grants in `20260622143000_library_trust_governance.sql`.
- Sensitive anon-callable invite resolution remains intentional but needs continued testing.
- Storage:
  - `component-images` public-read WebP bucket with authenticated member write policies.
  - `project-images` private bucket with project-member read and editor write/delete policies.
  - Later migration fixed unqualified `name` references in storage policies.
- Pending-review SQL must not be auto-applied; pending token index drops, retention deletes, concurrent index DDL, deferred chart RPC grant caveat, and superseded do-not-apply migration remain release risks.

## DB/RLS/storage continuation lane

- A follow-up read-only DB reviewer rechecked `INFOSEC-DB-001` through `INFOSEC-DB-003` without editing files, running provider SQL, or reading secrets.
- `INFOSEC-DB-001` remains open: the reviewer counted 204 applied-migration `SECURITY DEFINER` matches across 67 migration files and cited authenticated destructive/admin RPC examples including bulk estimate deletion and project deletion. The reviewer recommended per-function authorization review and negative cross-tenant/provider tests before release.
- `INFOSEC-DB-002` remains open: no `FORCE ROW LEVEL SECURITY` matches were found. The reviewer noted `project_publication_events` enables RLS, revokes public/anon/authenticated, grants `service_role` insert, and has no service-role policy, so current behavior relies on Supabase service-role/table-owner bypass. The stale `project-publication-schema.test.ts` expectation claiming a service-role policy existed was corrected.
- `INFOSEC-DB-003` is partially controlled locally but provider-blocked: pending SQL remains outside `supabase/migrations/`, P2 token-index drops remain blocked by known nonzero scan evidence, P1/P7 retention deletes require backup/preflight evidence, and deferred/superseded SQL remains non-release input. The deferred chart RPC now explicitly revokes public/anon/authenticated execute before granting authenticated execute.
- Validation evidence: `bunx vitest run tests/vitest/infosec-db-pending-review-contract.test.ts tests/vitest/project-publication-one-published-index.test.ts tests/vitest/project-publication-schema.test.ts --maxWorkers=1` passed 3 files / 15 tests; targeted ESLint and scoped `git diff --check` passed.
- Additional local inventory evidence: `16-db-posture-inventory.md` records 204 SECURITY DEFINER matches across 67 applied migration files and zero FORCE RLS matches. It intentionally keeps `INFOSEC-DB-001` and `INFOSEC-DB-002` open.
- Focused DB/security source-contract matrix passed: `bunx vitest run tests/vitest/security-findings-auth-contracts.test.ts tests/vitest/project-deletion-active-publication-contract.test.ts tests/vitest/mass-deletion-contract.test.ts tests/vitest/infosec-db-pending-review-contract.test.ts tests/vitest/project-publication-schema.test.ts --maxWorkers=1` passed 5 files / 32 tests.

## AppSec lane

- Fixed:
  - Attachment upload error leakage (`INFOSEC-APP-001`).
  - Invite sign-out logout CSRF (`INFOSEC-APP-002`).
  - AI package apply internal error reflection (`INFOSEC-APP-003`).
  - Public comment/decision error reflection (`INFOSEC-APP-004`).
- Fixed after lane integration:
  - Share events metadata bounds (`INFOSEC-APP-005`).
  - Invite rate-limit IP hash privacy (`INFOSEC-APP-006`).
  - Dependency audit advisory remediation (`INFOSEC-SC-001`).
- Hardening:
  - CSP enforcement outside share surface.
- False-positive/hardening:
  - Dev auth bypass appears production-gated and now has focused guard-test evidence (`INFOSEC-APP-007`).
  - Public share CSRF is broadly controlled and now has endpoint-by-endpoint source contract plus route-test evidence (`INFOSEC-APP-008`).

## Supply-chain/config lane

- Visible controls:
  - Lockfile integrity and frozen Bun install in CI.
  - Package is private and uses Bun script/dependency controls.
  - Env hygiene ignores `.env*` except `.env.example`.
  - Vercel git deployments disabled in repo config.
  - Next security headers/CSP/HSTS/no-store controls exist for share/workshop/invite surfaces.
  - Supabase local config includes API max rows, migrations enabled, auth refresh token rotation, and rate limits.
  - Readiness scripts parse sanitized evidence rather than secrets.
  - Dev auth bypass is production-disabled, localhost-bound, and requires a 32+ character credential.
  - PR template includes no-secrets and proof-boundary checkboxes.
- Scanner evidence:
  - Missing local scanner binaries: gitleaks, trufflehog, detect-secrets, secretlint, semgrep, osv-scanner, snyk.
  - Initial `bun audit` reported 15 vulnerabilities, including 5 high, 6 moderate, and 4 low.
  - Final `bun audit --json` passed with `{}` after dependency remediation.
- Dependency remediation evidence:
  - `vitest` updated to `^4.1.9`.
  - Storybook packages updated to `10.4.6`.
  - Bun overrides added for `@babel/core@7.29.7`, `esbuild@0.28.1`, `js-yaml@4.2.0`, `postcss@8.5.15`, `tmp@0.2.7`, `undici@7.28.0`, and `uuid@11.1.1`.
  - `bun pm why` confirmed all remediated package versions.
  - UUID CJS smoke, ExcelJS XLSX write/load smoke, focused Vitest suite, targeted ESLint, typecheck, Next production build, Storybook static build, and `git diff --check` passed.
- Env-template remediation evidence:
  - `.env.example` now documents sanitized placeholders for the local/runtime DeepSeek, Google Maps, estimate column-resize, and Supabase publishable-key names without reading or recording values.
  - `tests/vitest/closed-beta-env-manifest.test.ts` guards the optional provider/feature-flag names; focused Vitest passed 2 files / 8 tests.
  - A key-only `.env.local` versus `.env.example` comparison produced no missing names.
- Toolchain remediation evidence:
  - `package.json` now pins `packageManager` to `bun@1.3.14`.
  - `tests/vitest/supply-chain-toolchain-manifest.test.ts` guards the exact pin and rejects `latest`; focused Vitest passed 1 file / 1 test.
  - `bun pm pkg get packageManager` returned `"bun@1.3.14"` and `bun --version` returned `1.3.14`.
- Workflow pinning remediation evidence:
  - `.github/workflows/ci.yml` and `.github/workflows/react-doctor.yml` now use `ubuntu-24.04` instead of `ubuntu-latest`.
  - `actions/checkout`, `oven-sh/setup-bun`, and `millionco/react-doctor` are pinned to immutable SHAs resolved with `git ls-remote` from their `v5`/`v2` tags.
  - CI uses `bun-version: 1.3.14`.
  - `tests/vitest/ci-workflow-pinning.test.ts` guards the runner, Bun, and action-ref pins; focused Vitest passed 1 file / 2 tests after a test-regex correction.
- Security automation remediation evidence:
  - `.github/dependabot.yml` configures weekly npm and GitHub Actions update checks.
  - `.github/workflows/codeql.yml` configures pinned CodeQL JavaScript/TypeScript analysis using `github/codeql-action@411bbbe57033eedfc1a82d68c01345aa96c737d7`.
  - `.github/codeql/codeql-config.yml` enables `security-extended` and `security-and-quality` queries over source, scripts, tests, and Supabase paths.
  - `tests/vitest/security-automation-config.test.ts` guards the Dependabot/CodeQL config; focused Vitest passed 2 files / 4 tests with the workflow pinning test.
- Gaps:
  - CODEOWNERS enforcement is pending external branch protection.
  - Hosted GitHub API evidence now confirms `main` is unprotected, `CI` is `disabled_manually`, code scanning is not enabled, Dependabot alert state is disabled or not provable with the current token scope, secret scanning is disabled, `Preview` and `Production` have empty protection rules, and no security policy is enabled. This is recorded as `INFOSEC-SC-006`.
  - Vercel API/live response evidence now confirms production/domain proof is not release-ready: production is not on the current checkout, apex timed out, live `/` uses report-only CSP, and latest preview is Vercel-SSO protected rather than production proof. This is recorded as `INFOSEC-SC-007`.
	  - External provider env proof and local scanner binary coverage remain pending.

## Planning-package review lanes - 2026-06-25

These lanes reviewed the document package only. They did not edit files, run provider mutations, deploy, read secrets, or approve release.

- Analyst lane `019efc35-0ec8-7091-89ed-1949365f62ea` found the package useful as an interim audit ledger but not implementation-ready; package-level scores were Strategy 78, document quality 82, implementation readiness 58. It requested an open-decision register, release decision matrix, traceability matrix, and risk ownership.
- Architecture lane `019efc35-e567-7601-8698-1eaeb1aa35b4` scored the overall package 43/100 with implementation readiness 28/100. It emphasized stale SHA binding, zero Class A/B review, unreviewed entrypoint/authz ledgers, DB/RLS posture gaps, and hosted GitHub/Vercel blockers.
- Security lane `019efc35-e70f-7f92-b258-503e7d1b4b12` raised P1 planning gaps for ASVS/API/security-control traceability, threat model abuse/privacy coverage, stale residual-risk wording, remediation-log synchronization, and DB/service-role traceability. It also raised a P2 gap for LLM-specific security coverage.
- Test lane `019efc35-e850-73b2-b919-205f5b764528` confirmed 0/1746 Class A reviewed, 0/5945 Class B reviewed, 792/792 entrypoints still `inventoried_not_reviewed`, and 586/586 authz rows still `not_started`. It requested release gates, raw evidence retention, observability/rollback proof, and explicit command references.
- Coherence lane `019efc35-e983-7592-b640-5b9d01e6ce61` inventoried all 20 existing files, confirmed 15 markdown docs plus 5 CSV/JSON artifacts, and identified stale wording in `11-residual-risk.md` and `12-final-report.md`.
- Adversarial lane `019efc35-eb53-79e3-8673-db4f5790f640` returned NO-GO for release and NO-GO for final audit-package treatment. It confirmed the baseline/current SHA mismatch, current tracked-file coverage gap, source-wide review incompleteness, and hosted-control precision issue.

Consensus result: this folder is now treated as an interim blocker/remediation and planning package. It is not final audit evidence and it does not approve release.

## Final verifier lane - 2026-06-25

- Verifier lane `019efc42-4e25-7061-8d32-784513336a51` passed the planning-package content claims:
  - Release remains `NOT APPROVED` and interim-only.
  - `17-plan-package-audit-and-scorecard.md` and `18-release-gates-traceability.md` exist and cover the requested planning content.
  - Rollups separate original local scaffold evidence from later hosted GitHub/Vercel blocker evidence.
  - Runtime/external-provider and Dependabot precision are corrected.
  - The coordination ledger records the six specialist lanes and final verifier lane.
- The verifier failed the broad "no app changes" claim because the wider current worktree contains app/test/config/provider-adjacent diffs. That failure is an attribution limitation, not a content-quality failure for this run folder.
- Follow-up decision: this continuation now claims only that its intentional edit scope is `.ai` documentation/state artifacts and that it performed no provider mutations, deployments, secret reads, browser automation, or production actions. It does not claim the wider worktree is clean or that earlier InfoSec remediation avoided app/test/config changes.
- Verifier rerun `019efc45-5148-7cd1-80b2-b15805e64a09` passed closure for only the docs-planning continuation after the narrowed attribution note was recorded. It explicitly did not approve release. This was the pre-follow-up verifier for the original planning-package patch, before the later explicit source/requirements map, before/after score comparison, traceability coverage, and final-deliverable checklist additions.
- Follow-up final verifier `019efc4a-eea3-7933-8893-cf892f43d628` passed closure for the prompt-compliance additions in `17-plan-package-audit-and-scorecard.md`, including source/authority mapping, requirements mapping, before/after score comparison, traceability coverage, and final deliverable checklist. It explicitly closed only the docs-planning branch and did not approve release.

## Final quality review lanes - 2026-06-25

- Code-review lane `019efc4e-c148-7263-9767-2f6b42079b65` approved the docs-planning branch only and kept release `NOT APPROVED`. It found two documentation-quality fixes: add the follow-up final verifier to this ledger, and clarify that tracked `git diff --check` does not cover the untracked run-folder docs. Both fixes were applied.
- Architecture lane `019efc4e-e60b-7bc3-ba7f-1499240131c7` returned architectural status `CLEAR` for closing the docs-planning branch only. Its strongest counterargument was that stale-baseline evidence and open release blockers still matter for release, not for closing the planning package.

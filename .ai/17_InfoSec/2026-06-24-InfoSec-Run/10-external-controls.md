# 10 - External Controls

Generated: 2026-06-24T16:56:40.064Z
Updated: 2026-06-25T00:44:57Z

## Local evidence available

- GitHub workflow files: `.github/workflows/ci.yml`, `.github/workflows/react-doctor.yml`
- Config/deployment-relevant files from initial scan: `.ai/05_logs/2026-06-12-estimate-tabs-phase5/eslint-changed-files-project-source-updated-at-metadata.log`, `.ai/05_logs/2026-06-12-estimate-tabs-phase5/eslint-greeting-feedback-baseline-fix.log`, `.ai/05_logs/2026-06-12-estimate-tabs-phase5/eslint-lint-blockers-targeted.log`, `.ai/05_logs/2026-06-12-estimate-tabs-phase5/eslint-server-action-type-export-fix.log`, `.ai/05_logs/2026-06-12-estimate-tabs-phase5/eslint-storybook-plan-matrix-archive-import-fix.log`, `.ai/05_logs/2026-06-12-estimate-tabs-phase5/eslint-workshop-route-error-boundaries-library-template-import-fix.log`, `.ai/07_design/tailwind.theme.json`, `.ai/09_archive/store/2026-05-31-BETA-P0-PERF-001-route-transition-optimization-subsequent-phases/eslint-bfcache-capture-evidence-contract.txt`, `.ai/09_archive/store/2026-05-31-BETA-P0-PERF-001-route-transition-optimization-subsequent-phases/eslint-bfcache-diagnostics-evidence-contract.txt`, `.ai/09_archive/store/2026-05-31-BETA-P0-PERF-001-route-transition-optimization-subsequent-phases/eslint-component-library-ui-cleanup-continuation.txt`, `.ai/09_archive/store/2026-05-31-BETA-P0-PERF-001-route-transition-optimization-subsequent-phases/eslint-library-folder-tree-dynamic-final.txt`, `.ai/09_archive/store/2026-05-31-BETA-P0-PERF-001-route-transition-optimization-subsequent-phases/eslint-library-folder-tree-dynamic.txt`, `.ai/09_archive/store/2026-05-31-BETA-P0-PERF-001-route-transition-optimization-subsequent-phases/eslint-peak-load-profile-harness.txt`, `.ai/09_archive/store/2026-05-31-BETA-P0-PERF-001-route-transition-optimization-subsequent-phases/eslint-route-error-smoke-20260601.txt`, `.ai/09_archive/store/2026-05-31-BETA-P0-PERF-001-route-transition-optimization-subsequent-phases/eslint-route-error-smoke-after-locator-fix-20260601.txt`, `.ai/09_archive/store/2026-05-31-BETA-P0-PERF-001-route-transition-optimization-subsequent-phases/eslint-route-transition-measure-script-auth-final.txt`, `.ai/09_archive/store/2026-05-31-BETA-P0-PERF-001-route-transition-optimization-subsequent-phases/eslint-route-transition-measure-script-auth-sidebar-position.txt`, `.ai/09_archive/store/2026-05-31-BETA-P0-PERF-001-route-transition-optimization-subsequent-phases/eslint-route-transition-measure-script-hidden-overlay.txt`, `.ai/09_archive/store/2026-05-31-BETA-P0-PERF-001-route-transition-optimization-subsequent-phases/eslint-route-transition-measure-script-login-link.txt`, `.ai/09_archive/store/2026-05-31-BETA-P0-PERF-001-route-transition-optimization-subsequent-phases/eslint-route-transition-measure-script-real-links.txt`, `.ai/09_archive/store/2026-05-31-BETA-P0-PERF-001-route-transition-optimization-subsequent-phases/eslint-route-transition-measure-script-scenario-filter.txt`, `.ai/09_archive/store/2026-05-31-BETA-P0-PERF-001-route-transition-optimization-subsequent-phases/eslint-route-transition-measure-script-settings-final-path.txt`, `.ai/09_archive/store/2026-05-31-BETA-P0-PERF-001-route-transition-optimization-subsequent-phases/eslint-route-transition-measure-script.txt`, `.ai/09_archive/store/2026-05-31-BETA-P0-PERF-001-route-transition-optimization-subsequent-phases/eslint-route-transition-peak-load-and-measure.txt`, `.ai/09_archive/store/2026-05-31-BETA-P0-PERF-001-route-transition-optimization-subsequent-phases/eslint-slow-3g-link-transition-evidence-contract.txt`, `.ai/09_archive/store/2026-05-31-BETA-P0-PERF-001-route-transition-optimization-subsequent-phases/eslint-workshop-route-error-boundaries.txt`, `bun.lock`, `eslint.config.mjs`, `next.config.ts`, `package.json`, `postcss.config.mjs`, `src/proxy.ts`, `supabase/config.toml`, `tsconfig.json`, `vercel.json`

## Unverified external controls

The following cannot be treated as passing from local source review alone:

- GitHub repository settings, branch protection, required checks, secret scanning, Dependabot alerts, and environment protections
- Vercel project settings, environment separation, production/preview variables, deployment protection, headers observed from actual responses
- Supabase dashboard settings, Auth provider configuration, storage bucket runtime settings, backups, PITR posture, and linked project controls
- Resend domain, webhook, API key, sender, bounce/abuse controls
- Production monitoring, alerting, incident response, log retention, and access controls

Until verified, deployment-only controls are external verification blockers, not passes.

## Supply-chain and config lane evidence

- `bun.lock` has integrity hashes, and CI uses `bun install --frozen-lockfile`.
- `package.json` is private, pins `packageManager` to `bun@1.3.14`, and uses Bun `ignoreScripts`, `trustedDependencies`, and a patched `@firecms/neat`.
- `.github/workflows/ci.yml` and `.github/workflows/react-doctor.yml` now use `ubuntu-24.04`, immutable action SHAs, and Bun `1.3.14` where applicable.
- `.github/dependabot.yml` configures Dependabot for npm and GitHub Actions; `.github/workflows/codeql.yml` and `.github/codeql/codeql-config.yml` configure pinned CodeQL JavaScript/TypeScript analysis.
- `.gitignore` ignores `.env*` except `.env.example`; `git ls-files '.env*'` showed only `.env.example` tracked.
- `vercel.json` disables Vercel git deployments in repo config.
- `next.config.ts` contains security headers/CSP/HSTS/no-store controls for share/workshop/invite surfaces.
- `supabase/config.toml` has API max rows, migrations enabled, auth refresh token rotation, and rate limits.
- Local scanner binaries were not found for gitleaks, trufflehog, detect-secrets, secretlint, semgrep, osv-scanner, or snyk.
- Initial `bun audit` ran in the main lane and reported 15 vulnerabilities: 5 high, 6 moderate, 4 low. `INFOSEC-SC-001` was remediated with package updates/overrides; final `bun audit --json` passed with `{}`. See `15-dependency-advisory-triage.md`.
- Local ignored `.env.local` key-name drift was checked without reading values; current local key names are now mirrored by sanitized placeholders in `.env.example`.

## Hosted GitHub API evidence

Read-only GitHub API checks ran on 2026-06-25 against
`pjel888/archestimator` using the authenticated `gh` CLI. No settings were
changed.

- Repository is private; viewer permission is `ADMIN`.
- Default branch is `main`.
- `gh api repos/pjel888/archestimator/branches/main --jq '{name, protected, protection_url, commit_sha:.commit.sha}'` returned `protected: false`.
- `gh api repos/pjel888/archestimator/branches/main/protection` returned HTTP 403 with GitHub's plan/visibility message, so branch protection cannot be claimed from this repo state.
- `gh api repos/pjel888/archestimator/actions/workflows` returned two hosted workflows: `CI` is `disabled_manually`, and `React Doctor` is `active`.
- Recent workflow runs sampled only `React Doctor`; no active hosted CI run evidence was produced.
- `gh api repos/pjel888/archestimator/code-scanning/alerts` returned HTTP 403: code scanning is not enabled.
- `gh api repos/pjel888/archestimator/dependabot/alerts` returned HTTP 403: Dependabot alert state is disabled or not provable with the current token scope; the command log also records GitHub's missing `admin:repo_hook` scope message for this operation.
- `gh api repos/pjel888/archestimator/secret-scanning/alerts` returned HTTP 404: secret scanning is disabled.
- `gh api repos/pjel888/archestimator/environments` returned `Preview` and `Production` environments with empty `protection_rules`.
- `gh api repos/pjel888/archestimator/community/profile` returned no security policy file and health percentage 28.

These checks promote `INFOSEC-SC-006`: hosted GitHub security and release
controls are not release-ready. The local CodeQL/Dependabot files added during
this run are useful config, but they are not proof that hosted alerts, required
checks, or branch/environment protections are active.

## Hosted Vercel API and response evidence

Read-only Vercel checks ran on 2026-06-25 against the locally linked project
from `.vercel/project.json`:

- Project ID: `prj_QTjX1WrMb7b0ZxmMIRAL96ILRY9E`
- Team ID: `team_eRuwqQwhMbYYDmvgIgpQW1GS`
- Project name: `archestimator`

Evidence:

- The local Vercel CLI is installed (`54.9.1`) but not authenticated. `vercel whoami` started a device-login flow and was cancelled; no CLI login was completed.
- Connected Vercel project readback reported framework `nextjs`, Node `24.x`, `live:false`, and latest deployment `dpl_8tpYp3UeoUfkiezuZYuDp5FhHYKu` with `target:null`.
- Recent deployment listing showed the latest deployments are preview/untargeted branch deployments. The latest production deployment in the returned page was `dpl_8ymooyEM51amXCJ7xNstAHEkTeGq`.
- Production deployment readback for `dpl_8ymooyEM51amXCJ7xNstAHEkTeGq` reported target `production`, source `cli`, alias entries for `www.archestimator.com`, `archestimator.vercel.app`, `archestimator.com`, and Vercel subdomains, and commit `8c611d1333210838f201b4c91deb74fe656f5902`.
- Current local and remote `main` readback returned `12fef73cd385ce4b9e9ef341f9fed2be10c30c3e`, so the production deployment is not the current checkout.
- `curl -sSIL --max-time 20 https://www.archestimator.com` and `curl -sSI --max-time 20 https://archestimator.vercel.app` returned HTTP 200 and `content-security-policy-report-only` on `/`.
- `curl -sSIL --max-time 20 https://archestimator.com` timed out. Follow-up IPv4 and IPv6 curl checks with 12 second max times also timed out.
- `dig +short archestimator.com A archestimator.com AAAA www.archestimator.com CNAME www.archestimator.com A` returned apex A `216.150.1.1`, `www` CNAME to a Vercel DNS host, and `www` A records `216.150.1.129` and `216.150.16.129`.
- `curl -sSIL --connect-timeout 8 --max-time 15 https://www.archestimator.com/api/health` returned HTTP 200 with `cache-control: no-store`.
- The latest preview deployment URL redirected to Vercel SSO, which is useful protection evidence for that preview URL but not production release proof.

These checks promote `INFOSEC-SC-007`: Vercel production/domain state is not
release-ready for an audited release.

## Supply-chain and config gaps

- CODEOWNERS says enforcement is pending branch protection, so ownership is advisory until GitHub settings prove enforcement.
- Hosted GitHub branch protection/ruleset, required checks, CI state, code scanning, Dependabot alerts, secret scanning, security policy, and environment protections are currently failing, unavailable, or unproven as recorded in `INFOSEC-SC-006`.
- Vercel production/domain/deployment state is currently failing or unproven as recorded in `INFOSEC-SC-007`.
- External provider environment variables and non-GitHub/non-Vercel secret-scanner evidence remain unverified.

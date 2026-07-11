# Source And Codebase Audit

## Evidence Rules

Source inspection is authoritative for implementation reality; hosted controls and deployments require hosted evidence. The planning audit is a structured source, not execution proof. The original observations were collected on 2026-07-10 from commit `081a0757a` and rechecked during this improvement run on 2026-07-11 in a dirty shared worktree. `plan-pack.json.baseline.head` is the immutable refresh point; any later HEAD or stale trigger requires another scoped check.

## Source Ledger

| ID | Source | Status | Relevant claim |
| --- | --- | --- | --- |
| `SRC-001` | `.ai/02_audits/archestimator_beta_readiness_audit_2026-07-10.md:190-269,681-710,750-759,1000-1042,1116-1196` | Current planning input | CI, golden-path, release-manifest findings and release gates. |
| `SRC-002` | `.github/workflows-disabled/ci.yml`; `.github/workflows-disabled/codeql.yml`; `.github/workflows-disabled/dependabot.yml`; `.github/workflows-disabled/react-doctor.yml` | Current source observation | No active `.github/workflows/*.yml` enforcement exists. |
| `SRC-003` | `README.md:384`; `next.config.ts:84`; `package.json:127` | Current source observation | README claims active CI, build ignores TypeScript errors, and local validation exists. |
| `SRC-004` | `playwright.config.ts:63`; `e2e/shared-link-receiver.spec.ts:8`; `e2e/estimates-crud-latency.spec.ts:36`; `e2e/estimate-sheet-component-interop.spec.ts`; `e2e/estimate-sheet-performance.spec.ts`; `e2e/*.spec.ts` | Current source observation | Browser coverage is shallow and environment-gated; no deterministic 20-step golden path exists. |
| `SRC-005` | `scripts/check-cloudflare-release-gates.ts`; `scripts/check-route-transition-readiness.ts`; `scripts/check-support-monitoring-readiness.ts`; `scripts/check-production-observability-proof.ts` | Current source observation | Release evidence collectors exist but do not form a single canonical manifest for the exact deploy SHA. |
| `SRC-006` | `tests/vitest/ci-workflow-pinning.test.ts`; `tests/vitest/cloudflare-release-gates-script.test.ts`; `tests/vitest/route-transition-readiness-script.test.ts` | Current test observation | Useful contract tests exist and must be extended rather than bypassed. |
| `SRC-007` | `AGENTS.md`; all nine `.ai/03_plans/2026-07-10/*/plan-pack.json` manifests | Current authority and dependency observation | Bound Cloudflare data-resource authority is distinct from GitHub, out-of-scope staging, and production-deploy authority; cross-pack integration uses validated receipts. |
| `SRC-008` | `migrations/0052_corporate_accounts.sql` plus `0053_corporate_account_owner_integrity.sql`; `src/lib/admin/corporate-account-{actions,repository}.ts`; `.ai/03_plans/2026-07-11/Corporate-Accounts/plan-pack.json` | Concurrent candidate-dependency observation | Corporate source is present and its separate plan folder now has a manifest at `CONDITIONALLY_READY` / `IN_PROGRESS`. It remains outside the nine-pack registry and may enter a candidate only with a current validated receipt; otherwise release truth records exact exclusion. |

## Explicit Assumptions

- `ASSUMP-001`: workflow source can be repaired locally and GitHub state can be
  discovered read-only; GitHub ruleset, required-check, environment, retention,
  secret, and scheduled-workflow mutations remain under `AUTH-001`. The plan does
  not assume those controls exist, and unavailable readback is `UNKNOWN`.
- `ASSUMP-002`: an isolated staging surface can run namespaced deterministic
  seed/cleanup and the hosted browser matrix without touching production. The
  plan does not assume that surface exists; resource mutation or execution stays
  under `AUTH-002`, and absence blocks the unit instead of falling back locally.
- `ASSUMP-003`: production deployment is a distinct externally visible action
  under `AUTH-003`; standing authority for Cloudflare resources bound in
  `wrangler.jsonc` does not silently authorize a Worker release or smoke against users.

## Official Reference Constraints

Accessed 2026-07-10; these sources define vendor capabilities, not Archestimator readiness.

- GitHub [rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets) and [available rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets) can require status checks and successful deployment, but live repository plan, visibility, targets, bypass actors, and active rules still require hosted readback.
- GitHub's [required-check troubleshooting](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/troubleshooting-required-status-checks) treats `success`, `skipped`, and `neutral` as successful conclusions and documents merge-queue trigger requirements. The aggregate gate must therefore fail closed on skipped dependencies and include `merge_group` if a merge queue is enabled.
- GitHub [deployment environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments) gate secrets and branches, but required reviewers/wait timers for private repositories require Enterprise under the current documentation. The authorization packet must discover repository visibility/plan before proposing reviewer gates.
- GitHub [artifact retention](https://docs.github.com/en/organizations/managing-organization-settings/configuring-the-retention-period-for-github-actions-artifacts-and-logs-in-your-organization) defaults to 90 days and differs by visibility/plan; deleting a workflow run deletes its artifacts. Evidence collection must record actual `expires_at`, not assume policy.
- Next.js 16 documents lint as an explicit gate rather than part of `next build`, and identifies Cloudflare as an external, not Next-verified, adapter in the [deployment guide](https://nextjs.org/docs/app/getting-started/deploying). Local Next/OpenNext success is therefore not hosted Cloudflare proof.

## Current State

1. `.github/workflows/` contains no active workflow files; four workflows are intentionally parked under `workflows-disabled`.
2. `next.config.ts` permits build-time TypeScript errors. This is tolerable only when a separate typecheck cannot be bypassed.
3. The Playwright inventory covers auth, latency, shell streaming, landing, route transitions, a fixture-gated shared link, library smoke, route error boundaries, estimate-sheet component interop, and estimate-sheet performance. It does not prove access request through recipient decision and owner follow-up.
4. The shared-link spec requires manually supplied publication and recipient secrets. That is not deterministic CI setup.
5. Existing release scripts aggregate substantial local and hosted evidence, but README facts and migration counts drift independently. The current workspace migration tail is `migrations/0065_activity_history_lifecycle.sql` (57 tracked migration files, including the concurrent `0053_corporate_account_owner_integrity.sql`, `0054_collaboration_pending_invitation_uniqueness.sql`, `0055_collaboration_manager_floor_integrity.sql`, and `0060_activity_history_indexes.sql`); release truth must inventory the exact settled workspace rather than rely on older README counts or a superseded migration-generation receipt.
6. Local `bun run validate` and pack validation can prove repository readiness only. They cannot prove a GitHub ruleset, deployment environment, hosted smoke, or artifact retention is active.
7. Concurrent landing work adds a private no-store display hint for session-aware
   CTA copy while preserving protected-route authorization. This changes the
   golden-path entry state and candidate input set, but its source/tests are not
   browser, staging, GitHub, or deployment proof.

## Target State

- Active workflows use pinned actions and frozen Bun dependency installation.
- A small fast required-check set gates merge, while build/browser/security jobs preserve audit coverage without unsafe cancellation or silent skipping.
- Deployment jobs consume the immutable artifact and SHA from the same successful run; they do not rebuild an unverified ref.
- Deterministic staging data is namespaced by run ID, creates all required identities/data, and removes only its own records and objects.
- The critical merge path is Chromium desktop; release proof adds WebKit mobile review/share; the broader matrix is scheduled.
- Failure artifacts include traces, screenshots, console/network summaries, test results, build logs, and the redacted seed/cleanup report.
- `release-readiness.json` and its Markdown rendering list source SHA, migration, flags, routes, test inventory, active CI, scans, smoke, recovery, operating-contract evidence, blockers, timestamps, and decision.
- Cross-pack inputs are versioned manifest/handoff receipts, never agent-status or conversation dependencies.
- Read-only hosted discovery, GitHub mutation, isolated staging execution, and production deployment have separate packets and results.

## Official Release-Control Constraints

Accessed 2026-07-10; these sources define provider behavior, not current hosted proof.

- Cloudflare [Versions and Deployments](https://developers.cloudflare.com/workers/versions-and-deployments/) makes a version upload distinct from a deployment. Candidate identity therefore covers every upload input, not only `.open-next`, and promotion records the returned Worker version ID from the exact verified CI workspace.
- Cloudflare [rollbacks](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/) create a new deployment with 100% traffic to an eligible retained version. They do not roll back D1, R2, KV, Durable Object, or other resource state; incompatible bindings or migrations can make a code rollback unavailable, so data/schema recovery remains separate.
- OpenNext's [Cloudflare CLI](https://opennext.js.org/cloudflare/cli) `upload` command consumes an existing build while performing adapter-owned cache population and deployment-mapping work before `wrangler versions upload`. Direct Wrangler upload is not equivalent unless an installed-version contract proves those phases are unnecessary.
- GitHub's [secret-scanning REST API](https://docs.github.com/en/rest/secret-scanning/secret-scanning) supports `hide_secret=true`; discovery must use it, paginate, and sanitize responses before stdout, logs, or persistence.
- GitHub's [required-check troubleshooting](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/troubleshooting-required-status-checks) and [ruleset rule reference](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets) require check-name/source-app precision. A check must have completed successfully in the repository within the preceding seven days before it is eligible to be required.

## Drift And Contradictions

| Contradiction | Resolution |
| --- | --- |
| README says CI is active; repository has disabled workflows. | Source layout wins. Update README only after hosted evidence, and render volatile facts from the manifest. |
| A workflow file can exist without being required. | Local source is `AC-001`; authorized GitHub before/after readback is separate `AC-009`. |
| A green local Playwright run can differ from Cloudflare parity. | Release evidence must identify URL, deploy SHA, fixture ID, browser, and hosted route checks. |
| Existing route smokes can pass while the product journey fails. | The golden path owns one cross-domain transaction with deterministic setup and teardown. |
| A plan or archived proof can look current. | Every evidence record carries producer version, commit, environment, collection time, and freshness rule. |

## Baseline And Freshness

Before implementation, recompute `PLAN-PACK-SCOPED-BASELINE-v1` over these
ordered literal pathspecs:

1. `.github`
2. `README.md`
3. `next.config.ts`
4. `package.json`
5. `bun.lock`
6. `wrangler.jsonc`
7. `open-next.config.ts`
8. `playwright.config.ts`
9. `e2e`
10. `scripts`
11. `tests`
12. `migrations`
13. `src/app/page.tsx`
14. `src/app/api/landing`
15. `src/components/landing`
16. `src/components/landing-v3`
17. `src/lib/landing`
18. `src/lib/auth`
19. `src/lib/publication`

The fingerprint includes matching untracked files and remains repository
provenance only; GitHub, Cloudflare, browser, deployment, and production claims
still require their own evidence.

Stale triggers: any change to the audit, workflow definitions, `package.json` validation/build commands, Playwright config or golden spec, release-gate scripts, migration directory, bound Cloudflare configuration, feature flags, auth/publication behavior, evidence schema, or external GitHub/Cloudflare control state.

## Evidence Boundaries

- `EVID-001`: this source audit, valid until a stale trigger fires.
- `EVID-002`: planned verification/rollout evidence, invalid until commands run.
- GitHub rulesets, required checks, workflow history, artifact retention, deployment environments, staging execution, and production smoke must be collected from GitHub/Cloudflare. Repository configuration alone cannot satisfy those claims.
- Read-only hosted discovery may establish `UNKNOWN`/observed facts without mutation authority. Only `AUTH-001`, `AUTH-002`, or `AUTH-003` permits the matching mutation/execution packet; none implies the others.

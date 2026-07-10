# Source And Codebase Audit

## Evidence Rules

Source inspection is authoritative for implementation reality; hosted controls and deployments require hosted evidence. The planning audit is a structured source, not execution proof. Every observation below was collected on 2026-07-10 from commit `081a0757a` in a dirty shared worktree and must be refreshed when a stale trigger fires.

## Source Ledger

| ID | Source | Status | Relevant claim |
| --- | --- | --- | --- |
| `SRC-001` | `.ai/02_audits/archestimator_beta_readiness_audit_2026-07-10.md:190-269,681-710,750-759,1000-1042,1116-1196` | Current planning input | CI, golden-path, release-manifest findings and release gates. |
| `SRC-002` | `.github/workflows-disabled/ci.yml`; `.github/workflows-disabled/codeql.yml`; `.github/workflows-disabled/dependabot.yml`; `.github/workflows-disabled/react-doctor.yml` | Current source observation | No active `.github/workflows/*.yml` enforcement exists. |
| `SRC-003` | `README.md:384`; `next.config.ts:84`; `package.json:127` | Current source observation | README claims active CI, build ignores TypeScript errors, and local validation exists. |
| `SRC-004` | `playwright.config.ts:63`; `e2e/shared-link-receiver.spec.ts:8`; `e2e/estimates-crud-latency.spec.ts:36`; `e2e/*.spec.ts` | Current source observation | Browser coverage is shallow and environment-gated; no deterministic 20-step golden path exists. |
| `SRC-005` | `scripts/check-cloudflare-release-gates.ts`; `scripts/check-route-transition-readiness.ts`; `scripts/check-support-monitoring-readiness.ts`; `scripts/check-production-observability-proof.ts` | Current source observation | Release evidence collectors exist but do not form a single canonical manifest for the exact deploy SHA. |
| `SRC-006` | `tests/vitest/ci-workflow-pinning.test.ts`; `tests/vitest/cloudflare-release-gates-script.test.ts`; `tests/vitest/route-transition-readiness-script.test.ts` | Current test observation | Useful contract tests exist and must be extended rather than bypassed. |

## Explicit Assumptions

- `ASSUMP-001`: workflow source can be repaired locally, while GitHub rulesets,
  required-check activation, environment protection, and retention remain live
  discovery/authorization work under `AUTH-001`; the plan does not assume those
  hosted controls currently exist.
- `ASSUMP-002`: an isolated staging surface can run namespaced deterministic
  seed/cleanup and the hosted browser/smoke matrix without touching production;
  if live discovery cannot prove that surface and cleanup boundary, the hosted
  unit stays blocked rather than falling back to local evidence.

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
3. The Playwright inventory covers auth, latency, shell streaming, landing, route transitions, a fixture-gated shared link, library smoke, and route error boundaries. It does not prove access request through recipient decision and owner follow-up.
4. The shared-link spec requires manually supplied publication and recipient secrets. That is not deterministic CI setup.
5. Existing release scripts aggregate substantial local and hosted evidence, but README facts and migration counts drift independently. Current migrations extend through `migrations/0049_ops_run_events.sql`, while README text remains older.
6. Local `bun run validate` and pack validation can prove repository readiness only. They cannot prove a GitHub ruleset, deployment environment, hosted smoke, or artifact retention is active.

## Target State

- Active workflows use pinned actions and frozen Bun dependency installation.
- A small fast required-check set gates merge, while build/browser/security jobs preserve audit coverage without unsafe cancellation or silent skipping.
- Deployment jobs consume the immutable artifact and SHA from the same successful run; they do not rebuild an unverified ref.
- Deterministic staging data is namespaced by run ID, creates all required identities/data, and removes only its own records and objects.
- The critical merge path is Chromium desktop; release proof adds WebKit mobile review/share; the broader matrix is scheduled.
- Failure artifacts include traces, screenshots, console/network summaries, test results, build logs, and the redacted seed/cleanup report.
- `release-readiness.json` and its Markdown rendering list source SHA, migration, flags, routes, test inventory, active CI, scans, smoke, recovery, operating-contract evidence, blockers, timestamps, and decision.

## Drift And Contradictions

| Contradiction | Resolution |
| --- | --- |
| README says CI is active; repository has disabled workflows. | Source layout wins. Update README only after hosted evidence, and render volatile facts from the manifest. |
| A workflow file can exist without being required. | Hosted ruleset/API evidence is required separately under `AUTH-001`. |
| A green local Playwright run can differ from Cloudflare parity. | Release evidence must identify URL, deploy SHA, fixture ID, browser, and hosted route checks. |
| Existing route smokes can pass while the product journey fails. | The golden path owns one cross-domain transaction with deterministic setup and teardown. |
| A plan or archived proof can look current. | Every evidence record carries producer version, commit, environment, collection time, and freshness rule. |

## Baseline And Freshness

Before implementation, record hashes for:

```bash
git status --short -- .github README.md next.config.ts package.json playwright.config.ts e2e scripts tests
git diff --binary -- .github README.md next.config.ts package.json playwright.config.ts e2e scripts tests | shasum -a 256
```

Stale triggers: any change to the audit, workflow definitions, `package.json` validation/build commands, Playwright config or golden spec, release-gate scripts, migration directory, bound Cloudflare configuration, feature flags, auth/publication behavior, evidence schema, or external GitHub/Cloudflare control state.

## Evidence Boundaries

- `EVID-001`: this source audit, valid until a stale trigger fires.
- `EVID-002`: planned verification/rollout evidence, invalid until commands run.
- GitHub rulesets, required checks, workflow history, artifact retention, deployment environments, and production smoke must be collected from GitHub/Cloudflare. Repository configuration alone cannot satisfy those claims.

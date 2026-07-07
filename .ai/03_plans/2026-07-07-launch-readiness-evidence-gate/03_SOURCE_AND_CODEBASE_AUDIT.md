# 03 — Source & Codebase Audit

This document is the **inventory the executor must not re-derive**. Every anchor script, its exit semantics, its evidence artifact, and its position in the evidence DAG is recorded here with `file:line` references.

## §1. The four anchor scripts (from the PROMPT)

### 1.1 `scripts/check-cloudflare-release-gates.ts` (817 lines)
- **Purpose:** Master aggregator of the Cloudflare migration release gates. Consumes 13 pre-existing sanitized JSON artifacts and reduces them to a `Gate[]` list across 5 scopes (`"planning" | "local-runtime" | "data-auth-realtime" | "provider" | "cost-performance"` — `GateScope` at line 6).
- **Exit behavior (`main` line 801):** Hard-blocks (`process.exitCode = 1`, line 808) only on `localReleaseGateReportReady === false`. `productionCutoverReady` is reported but does **not** influence exit code. Catch-all (lines 812–815) sets exit 1 on thrown errors.
- **Reads:** 13 JSON artifacts from `PLAN_ROOT = ".ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence"` (line 231), enumerated in `DEFAULT_FILES` (lines 233–247): `inventory`, `workerPreviewRoutes`, `hostedRoutes`, `workerReadiness`, `platformToolchain`, `wranglerAuth`, `providerResources`, `deployDryRun`, `queuesCronProof`, `pricingSnapshot`, `costPerformanceWorkbook`, `d1AuthRealtimeReadiness`, `providerReadiness`. Uses `readArtifact` (line 254) = `existsSync` + `readFileSync` + `JSON.parse`. Missing files tolerated (`present:false`). Env overrides via `readEnv` (line 249): `CLOUDFLARE_RELEASE_*_FILE`, `OUTPUT_FILE`, `MARKDOWN_FILE`.
- **Does NOT:** read wrangler config, package.json, env files, or call Cloudflare APIs (explicit `note` at lines 697–699). **Never spawns child processes** (`readInputs` line 759).
- **Emits:** JSON report → default `.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-01-cloudflare-release-gates.json` (`writeOutput` line 702); Markdown report → `...2026-07-01-cloudflare-release-gates.md` (`writeMarkdown` line 712); full report JSON to stdout (line 807).
- **Report shape** (`CloudflareReleaseGateReport`, line 212): `generatedAt`, `mode`, `sources`, `gates[]`, `readiness{8 booleans}`, `blockers[]`, `note`.
- **Composite readiness:** `localReleaseGateReportReady = planningInputsReady && localRuntimeProofReady && providerDashboardInventoryReady` (lines 660–662). `productionCutoverReady` adds provider + cost/performance + D1/auth/realtime proof (lines 691–694).
- **Key symbols:** `buildCloudflareReleaseGateReport` (649), `buildGates` (324), `readInputs` (759), `artifactMissingGate` (295), `requiredRouteProbeSummary` (314), `providerResourceReadbackBlocker` (307).
- **Gate verdict for the unified gate:** **authoritative** for the "Cloudflare migration release" domain. Use `localReleaseGateReportReady` as a hard blocker; `productionCutoverReady` as advisory.

### 1.2 `scripts/check-legal-owner-readiness.ts` (183 lines)
- **Purpose:** Legal/owner sign-off readiness. Records operator-confirmed proof flags + sanitized owner/reviewer labels + approval date/reference. Does **not** provide legal advice or authorize launch (explicit `note`, lines 115, 151).
- **Exit behavior (`main` line 161):** Hard-blocks (`process.exitCode = 1`, line 174) when any required proof flag or label is missing. Template mode (line 162 `WRITE_LEGAL_OWNER_READINESS_TEMPLATE`) returns early exit 0. Catch-all (lines 177–181) sets exit 1 on errors.
- **Reads:** Env only (`readEnv` line 49). No file/config/wrangler/package.json reads. Proof flags (`LEGAL_PROOF_FLAGS`, line 41): `LEGAL_OWNER_TERMS_CONFIRMED`, `LEGAL_OWNER_PRIVACY_CONFIRMED`, `LEGAL_OWNER_BETA_COPY_CONFIRMED`, `LEGAL_OWNER_DATA_RETENTION_CONFIRMED`, `LEGAL_OWNER_SUPPORT_COMMS_CONFIRMED` (parsed by `parseLegalProofFlag` line 54, accepts `1|true|yes|approved`). Labels: `LEGAL_OWNER_PRODUCT_OWNER`, `LEGAL_OWNER_LEGAL_REVIEWER` (`sanitizeLegalLabel` line 59, max 100 chars, strips `<>{}[]\``), `LEGAL_OWNER_APPROVAL_DATE` (`parseApprovalDate` line 67, strict `YYYY-MM-DD`), `LEGAL_OWNER_APPROVAL_REFERENCE` (max 140). Control env: `WRITE_LEGAL_OWNER_READINESS_TEMPLATE`, `TEMPLATE_FILE`, `OUTPUT_FILE`.
- **Emits:** stdout full result JSON (line 173) or template JSON (line 166); optional file artifact via `writeOutput` (line 155) to `OUTPUT_FILE` (no default — write only if set); optional template file to `TEMPLATE_FILE` (line 165).
- **Report shape** (`LegalOwnerReadinessResult`, line 13): `proofFlags`, `productOwner`, `legalReviewer`, `approvalDate`, `approvalReference`, `missing[]`, `legalOwnerReady`, `note`.
- **Gate verdict:** **authoritative** for the "legal/owner signoff" domain. `legalOwnerReady` is a hard blocker. **Owner-decision-gated** (cannot be code).
- **Known current state:** `legalOwnerReady=false` — all five proof flags false, reviewer/approval reference missing (per `current-state.md:782-799, 8855`). This is explicit negative evidence, not approval.

### 1.3 `scripts/check-support-monitoring-readiness.ts` (108 lines)
- **Purpose:** Support + monitoring operational readiness. Records operator-confirmed proof flags for inbox monitoring, feedback review, uptime/error alert delivery, incident escalation, plus owner labels for 24h/72h review windows. Does not verify inbox access or alert dashboards (explicit `note`, line 84).
- **Exit behavior (`main` line 94):** Hard-blocks (`process.exitCode = 1`, line 99) when any flag/owner missing. Catch-all (lines 102–106) sets exit 1 on errors.
- **Reads:** Env only (`readEnv` line 34). Proof flags (`PROOF_FLAGS`, line 26): `SUPPORT_MONITORING_INBOX_CONFIRMED`, `SUPPORT_MONITORING_FEEDBACK_REVIEW_CONFIRMED`, `SUPPORT_MONITORING_UPTIME_ALERT_CONFIRMED`, `SUPPORT_MONITORING_ERROR_ALERT_CONFIRMED`, `SUPPORT_MONITORING_INCIDENT_ESCALATION_CONFIRMED` (`parseProofFlag` line 39, accepts `1|true|yes|passed`). Owner labels via `sanitizeOwnerLabel` (line 44, max 80 chars): `SUPPORT_MONITORING_SUPPORT_OWNER`, `SUPPORT_MONITORING_ALERT_OWNER`, `SUPPORT_MONITORING_FIRST_24H_OWNER`, `SUPPORT_MONITORING_FIRST_72H_OWNER`. Control env: `OUTPUT_FILE`.
- **Emits:** stdout full result JSON (line 98); optional file artifact via `writeOutput` (line 88) to `OUTPUT_FILE` (no default).
- **Report shape** (`SupportMonitoringReadinessResult`, line 13): `proofFlags`, `supportOwner`, `alertOwner`, `first24HourReviewOwner`, `first72HourReviewOwner`, `missing[]`, `supportMonitoringReady`, `note`.
- **Gate verdict:** **authoritative** for the "support/monitoring" domain. `supportMonitoringReady` is a hard blocker. **Owner-decision-gated.**

### 1.4 `scripts/generate-cloudflare-provider-exit-pack.ts` (1042 lines)
- **Purpose:** Provider-exit evidence pack — proves the app no longer depends on legacy Supabase/Vercel/Resend runtime and that operator records exist for exports/retention, Resend account status, secret rotation, post-exit smoke, non-owner Google proof, recipient mailbox proof.
- **Exit behavior (`main` line 996):** **Advisory by default (exit 0).** Lines 1025–1033: `strictReadinessExit = envFlag("STRICT_READINESS_EXIT") || envFlag("FAIL_ON_BLOCKERS")`; `summary.exitCode = strictReadinessExit && !report.readiness.providerExitReady ? 1 : 0`. Hard-blocks only with strict flag. Catch-all (lines 1036–1040) sets exit 1 on errors.
- **Reads:** 6 JSON artifacts via `readJsonArtifact` (line 129), paths in `ARTIFACT_PATHS` (lines 93–100): `releaseGates` (`2026-07-01-cloudflare-release-gates.json`), `providerResources` (`2026-07-01-cloudflare-provider-resource-readback.json`), `emailReadiness` (`2026-06-30-cloudflare-email-readiness.json`), `hostedAuthMatrix` (`2026-07-02-cloudflare-hosted-auth-synthetic-cookie-matrix.json`), `latestDeploySourceSmoke` (`2026-07-03-cloudflare-latest-deploy-source-smoke.json`), `operatorRecord` (`2026-07-03-cloudflare-provider-exit-operator-record.json`). **Source scan** via `scanLegacyProviderReferences` (line 667) over `DEFAULT_PROVIDER_EXIT_SCAN_PATHS` (lines 80–90): `src`, `worker.ts`, `package.json`, `bun.lock`, `wrangler.jsonc`, `cloudflare-env.d.ts`, `next.config.ts`, `open-next.config.ts`, `src/proxy.ts`. Walks dirs via `listFiles` (line 616, skips `node_modules`/`.next`/`.open-next`), filters text extensions (line 91), reads line-by-line, classifies via `classifySourceLine` (line 642) for `@supabase`/supabase imports, `@vercel`/`vercel_`, `resend`/`RESEND_API_KEY`/`new Resend(`/lockfile markers. Env: `OUTPUT_FILE`, `MARKDOWN_FILE`, `WRITE_OPERATOR_RECORD_TEMPLATE`, `OPERATOR_RECORD_TEMPLATE_FILE`, `PROVIDER_EXIT_OPERATOR_RECORD_FILE`, `STRICT_READINESS_EXIT`, `FAIL_ON_BLOCKERS`.
- **Does NOT:** read `.env`, print secrets, create exports, deploy, rotate, cancel, delete, or change DNS (explicit `NOTE`, lines 102–103).
- **Emits:** JSON report via `writeJson` (line 894) → default `...2026-07-03-cloudflare-provider-exit-pack.json` (line 77); Markdown via `writeMarkdown`/`renderMarkdown` (lines 908/990) → `...2026-07-03-cloudflare-provider-exit-pack.md` (line 78); optional operator-record template via `buildOperatorRecordTemplate` (line 556) → `...2026-07-03-cloudflare-provider-exit-operator-record.template.json` (line 79) when `WRITE_OPERATOR_RECORD_TEMPLATE` set; stdout summary JSON (lines 1010–1029).
- **Report shape** (`ProviderExitPackReport`, line 43): `artifacts`, `legacyProviderScan{blockers,informational}`, `operatorRecordDiagnostics`, `gates[]`, `readiness{appRuntimeExitPrerequisitesReady, providerExitReady}`, `blockers[]`.
- **12 gates** (lines 770–855): `release-gates-green`, `provider-resources-readable`, `cloudflare-email-ready`, `hosted-auth-matrix-ready`, `no-active-legacy-provider-runtime`, `latest-deploy-source-smoke-ready`, `exports-or-retention-decision-recorded`, `resend-account-status-recorded`, `obsolete-secret-rotation-recorded`, `post-exit-smoke-recorded`, `non-owner-google-proof-recorded`, `recipient-mailbox-proof-or-deferral-recorded`. `providerExitReady = gates.every(ready)` (line 868); `appRuntimeExitPrerequisitesReady` = 6-gate subset (lines 857–867).
- **Gate verdict:** **authoritative** for the "provider-exit" domain. `appRuntimeExitPrerequisitesReady` (with strict flag) = hard blocker; `providerExitReady` external sub-gates = advisory (owner/operator actions).

## §2. Evidence DAG (producer → artifact → consumer)

```
Producers (scripts)                        Artifacts (JSON/MD in evidence/)           Consumers
─────────────────────                      ────────────────────────────────           ─────────
generate-cloudflare-migration-inventory →  ...migration-inventory.json               → release-gates(inventory)
verify-cloudflare-worker-preview-routes →  ...worker-preview-routes.json             → release-gates(workerPreviewRoutes)
verify-cloudflare-hosted-routes         →  ...hosted-routes.json                     → release-gates(hostedRoutes)
check-cloudflare-worker-readiness       →  ...worker-readiness.json                  → release-gates(workerReadiness)
check-cloudflare-platform-toolchain     →  ...platform-toolchain.json                → release-gates(platformToolchain)
check-cloudflare-wrangler-auth          →  ...wrangler-auth.json                     → release-gates(wranglerAuth)
check-cloudflare-provider-resources     →  ...provider-resource-readback.json        → release-gates(providerResources), provider-exit(providerResources)
check-cloudflare-wrangler-deploy-dry-run → ...deploy-dry-run.json                    → release-gates(deployDryRun)
generate-cloudflare-queues-cron-proof   →  ...queues-cron-proof.json                 → release-gates(queuesCronProof)
generate-cloudflare-pricing-snapshot    →  ...pricing-snapshot.json                  → release-gates(pricingSnapshot)
generate-cloudflare-cost-performance-workbook → ...cost-performance-workbook.json     → release-gates(costPerformanceWorkbook)
check-cloudflare-d1-auth-realtime-readiness → ...d1-auth-realtime-readiness.json      → release-gates(d1AuthRealtimeReadiness)
check-cloudflare-provider-readiness     →  ...provider-readiness.json                → release-gates(providerReadiness)
                                                                                      │
check-cloudflare-release-gates          →  ...2026-07-01-cloudflare-release-gates.json → provider-exit(releaseGates)  ◄── MASTER ARTIFACT
                                                                                      │
check-cloudflare-email-readiness        →  ...2026-06-30-cloudflare-email-readiness.json → provider-exit(emailReadiness)
verify-cloudflare-hosted-routes (auth)  →  ...2026-07-02-cloudflare-hosted-auth-synthetic-cookie-matrix.json → provider-exit(hostedAuthMatrix)
check-cloudflare-latest-deploy-source-smoke → ...2026-07-03-cloudflare-latest-deploy-source-smoke.json → provider-exit(latestDeploySourceSmoke)
(operator fills template)               →  ...2026-07-03-cloudflare-provider-exit-operator-record.json → provider-exit(operatorRecord)
                                                                                      │
generate-cloudflare-provider-exit-pack  →  ...2026-07-03-cloudflare-provider-exit-pack.json  ◄── DOWNSTREAM MASTER
```

**Implication for the unified gate:** the gate must **run producers before consumers** (or detect stale/missing artifacts and flag them). The simplest contract: the gate runs each anchor + its producer chain in dependency order, OR the gate *reads* the existing artifacts and surfaces `missing-evidence`/`stale-evidence` for any that are absent/expired. The design in `06` chooses the **read + freshness** model (Stage 0–1) with an explicit `--regenerate` option for Stage 2+.

## §3. Sibling readiness/proof scripts in `scripts/` (paths + one-line purpose)

### check-* (authoritative domain anchors or evidence producers)
- `check-auth-audit-completion-readiness.ts` — auth-audit completion readiness gate.
- `check-cloudflare-d1-auth-realtime-readiness.ts` — D1/auth/realtime replacement readiness (largest check, 72KB). **Producer for release-gates(d1AuthRealtimeReadiness).**
- `check-cloudflare-dns-delegation.ts` — Cloudflare DNS delegation proof.
- `check-cloudflare-email-readiness.ts` — Cloudflare Email readiness (replacing Resend). **Producer for provider-exit(emailReadiness).**
- `check-cloudflare-latest-deploy-source-smoke.ts` — latest deployed-source smoke proof. **Producer for provider-exit(latestDeploySourceSmoke).** Supports `WRITE_DEPLOY_SOURCE_SMOKE_TEMPLATE`.
- `check-cloudflare-platform-toolchain.ts` — Wrangler/OpenNext/typegen/observability toolchain snapshot. **Producer for release-gates(platformToolchain).**
- `check-cloudflare-provider-readiness.ts` — provider dashboard inventory + provider proof readiness. **Producer for release-gates(providerReadiness).**
- `check-cloudflare-provider-resources.ts` — read-only Wrangler resource readback (Worker/D1/R2/Queues/secret names). **Producer for release-gates(providerResources) + provider-exit(providerResources).**
- `check-cloudflare-worker-readiness.ts` — Worker manifest + local preview readiness. **Producer for release-gates(workerReadiness).**
- `check-cloudflare-wrangler-auth.ts` — Wrangler/API auth readback gate. **Producer for release-gates(wranglerAuth).**
- `check-cloudflare-wrangler-deploy-dry-run.ts` — `wrangler deploy --dry-run` gate. **Producer for release-gates(deployDryRun).**
- `check-performance-budgets.mjs` — performance budget check (the advisory CI step).
- `check-public-cache-safety.ts` — public cache safety check.
- `check-route-transition-readiness.ts` — route-transition readiness gate.
- `check-storybook-boundary.mjs` — Storybook boundary check.
- `check-storybook-component-coverage.mjs` — Storybook component coverage check.
- `check-support-email-dns.ts` — support email DNS proof.
- `check-upload-production-proof-evidence.ts` — upload production proof evidence check.
- `check-upload-requirement-coverage.ts` — upload requirement coverage check.

### generate-* (proof/provider artifact producers)
- `generate-cloudflare-better-auth-proof.ts` — better-auth proof.
- `generate-cloudflare-d1-beta-feedback-proof.ts` — D1 beta-feedback slice proof.
- `generate-cloudflare-d1-closed-beta-proof.ts` — D1 closed-beta slice proof.
- `generate-cloudflare-d1-collaboration-invitation-proof.ts` — D1 collaboration-invitation slice proof.
- `generate-cloudflare-d1-component-library-proof.ts` — D1 component-library slice proof.
- `generate-cloudflare-d1-estimate-history-proof.ts` — D1 estimate-history slice proof.
- `generate-cloudflare-d1-performance-proof.ts` — D1 performance proof.
- `generate-cloudflare-d1-restore-rehearsal.ts` — D1 restore rehearsal artifact (referenced in `AGENTS.md` as the cheaper recovery path).
- `generate-cloudflare-d1-rpc-transaction-proof.ts` — D1 RPC transaction proof.
- `generate-cloudflare-migration-inventory.ts` — migration inventory. **Producer for release-gates(inventory).**
- `generate-cloudflare-pricing-snapshot.ts` — pricing snapshot. **Producer for release-gates(pricingSnapshot).**
- `generate-cloudflare-cost-performance-workbook.ts` — cost/perf workbook. **Producer for release-gates(costPerformanceWorkbook).**
- `generate-cloudflare-queues-cron-proof.ts` — Queues/Cron retry + DLQ proof. **Producer for release-gates(queuesCronProof).**
- `generate-provider-cleanup-allowlist.ts` — provider cleanup allowlist generator.
- `prove-shared-link-provider-perf.ts` — shared-link provider performance proof.

### verify-* (hosted/provider proof verifiers)
- `verify-cloudflare-better-auth-provider-proof.ts` — better-auth provider proof verify.
- `verify-cloudflare-d1-runtime-performance-proof.ts` — D1 runtime performance proof verify.
- `verify-cloudflare-hosted-collaboration-invitation-proof.ts` — hosted collaboration-invitation proof verify.
- `verify-cloudflare-hosted-collaboration-ui-proof.ts` — hosted collaboration UI proof verify.
- `verify-cloudflare-hosted-estimate-history-proof.ts` — hosted estimate-history proof verify.
- `verify-cloudflare-hosted-performance.ts` — hosted Cloudflare runtime performance. **Producer for release-gates workbook.**
- `verify-cloudflare-hosted-routes.ts` — hosted Worker route matrix. **Producer for release-gates(hostedRoutes).**
- `verify-cloudflare-hosted-upload-lifecycle-proof.ts` — hosted upload lifecycle proof verify.
- `verify-cloudflare-hosted-upload-ui-proof.ts` — hosted upload UI proof verify.
- `verify-cloudflare-jobs-proof.ts` — Cron/Queues/dead-letter provider proof.
- `verify-cloudflare-provider-proof.ts` — Cloudflare provider proof.
- `verify-cloudflare-worker-preview-routes.ts` — Worker preview route probe. **Producer for release-gates(workerPreviewRoutes).**
- `verify-hosted-auth-routes.ts` — hosted auth routes.
- `verify-hosted-export-route.ts` — hosted export route.
- `verify-hosted-sensitive-route-fail-closed.ts` — sensitive routes fail closed.
- `verify-hosted-upload-operations.ts` — hosted upload operations.
- `verify-hosted-upload-runtime.ts` — hosted upload runtime.
- `verify-upload-alert-delivery.ts` — upload alert delivery.
- `verify-upload-production-observations.ts` — upload production observations.

### Other relevant tooling
- `audit-dbidx-repo.ts` — DB index audit (`dbidx:audit-repo`).
- `rotate-audit-pepper.mjs` — rotate the audit pepper (secret material; not a gate).
- `sync-cloudflare-worker-secrets.ts` — sync Cloudflare Worker secrets (`cf:sync-worker-secrets`; not a gate, but referenced by Worker readiness).
- `validate-ai-workflow-adapters.mjs` — AI workflow adapters valid (`validate:agents`; not a launch gate).
- `enforce-app-design-system.mjs` — design-system token/font-size enforcement (`lint:design-system`).
- `check-performance-budgets.mjs` — perf budget check (advisory in CI).

## §4. `package.json` scripts relevant to launch readiness

File: `package.json` (lines 6–102). Package manager `bun@1.3.14`.

### Composite local gate
- **`validate`** (line 98): `bun run type-check && bun run lint && bun run lint:design-system && bun run lint:design && bun run test && bun run test:dom`. The closest thing to a unified local proof command — but covers only type/lint/design/unit/dom. **Hard blocker (local-automated).**

### Build / type / lint / test
- `build` → `next build`. Hard blocker (local-automated).
- `type-check` → `tsc --noEmit`. Hard blocker (local-automated).
- `lint` → `eslint`. Hard blocker.
- `lint:design-system` / `lint:font-size` → `node scripts/enforce-app-design-system.mjs`. Hard blocker.
- `lint:design` → Impeccable strict audit. Hard blocker.
- `test` → `bun test tests/unit`. Hard blocker.
- `test:dom` → `vitest run --maxWorkers=1`. Hard blocker.
- `test:e2e` → `playwright test`. Hard blocker when CI is on; local-optional.
- `test:e2e:perf` → route-transition perf spec. Hard blocker when CI is on.
- `build-storybook` / `storybook:validate` → Storybook gate. Advisory for launch (component coverage), hard for design-system contract.

### cf:* (Cloudflare) — release / provider / exit / proof
- `cf:release-gates` → `check-cloudflare-release-gates.ts`. **Aggregator** (reads artifacts, does not run scripts). Hard blocker on `localReleaseGateReportReady`.
- `cf:provider-exit-pack` → `generate-cloudflare-provider-exit-pack.ts`. Advisory unless strict.
- `cf:provider-exit-operator-template` → operator-record template generator.
- `cf:check-readiness` → Worker readiness.
- `cf:check-toolchain` → platform toolchain.
- `cf:check-wrangler-auth` → wrangler auth.
- `cf:check-provider-resources` → provider resources readback.
- `cf:check-provider` → provider readiness.
- `cf:check-d1-auth-realtime` → D1/auth/realtime readiness.
- `cf:check-email` → email readiness.
- `cf:check-dns-delegation` → DNS delegation.
- `cf:check-latest-deploy-source-smoke` → deploy source smoke.
- `cf:check-deploy-dry-run` → `wrangler deploy --dry-run`.
- `cf:verify-preview-routes` / `cf:verify-hosted-routes` / `cf:verify-hosted-performance` → route/perf proofs.
- `cf:provider-proof` / `cf:jobs-proof` → provider/jobs proofs.
- `cf:sync-worker-secrets` → secret sync (not a gate).
- `cf:d1-*` family → D1 slice proofs (beta-feedback, closed-beta, collaboration-invitation, component-library, estimate-history, rpc-transaction, performance, restore-rehearsal, runtime).
- `cf:verify-hosted-*` family → hosted proofs (estimate-history, collaboration-invitation, upload-runtime/operations/lifecycle/ui, collaboration-ui).
- `cf:better-auth-proof` / `cf:better-auth-provider-proof` → auth proofs.
- `cf:inventory` / `cf:pricing` / `cf:workbook` / `cf:d1-authz-matrix` / `cf:d1-rpc-map` → artifact producers.
- `cf:build` / `cf:preview` / `cf:deploy` / `cf:upload-version` / `cf:build-upload-version` / `cf:typegen` → build/deploy tooling (not gates; deploy is owner-gated).

### launch:* (the explicit launch-readiness script namespace)
- `launch:verify-hosted-auth` → `verify-hosted-auth-routes.ts`.
- `launch:verify-hosted-export` → `verify-hosted-export-route.ts`.
- `launch:check-support-dns` → `check-support-email-dns.ts`.
- `launch:check-support-monitoring` → `check-support-monitoring-readiness.ts`. **Hard blocker.**
- `launch:check-legal-owner` → `check-legal-owner-readiness.ts`. **Hard blocker.**
- `launch:verify-hosted-sensitive-routes` → `verify-hosted-sensitive-route-fail-closed.ts`.

**Note:** there is **no `launch:gate`** script today — that is the gap this pack designs.

### perf:* (performance)
- `perf:measure-routes` / `perf:check-routes` → route-transition timings/budgets.
- `perf:dashboard-query-count` → dashboard query count.
- `perf:seed-fixture` / `perf:library-baseline` / `perf:profile-peak-load` / `perf:collect-live-evidence` → perf evidence producers.

### Other
- `validate:agents` → `validate-ai-workflow-adapters.mjs` (AI adapter validation; not a launch gate).
- `dbidx:audit-repo` → DB index audit.
- `graph:*` → GitNexus tooling (not a launch gate).
- `supermemory:start` → supermemory server (not a launch gate).

## §5. CI workflow reality (CRITICAL CORRECTION to the brief)

**The brief says** "`.github/workflows/ci.yml` runs build, tests, and advisory performance checks." **Repo reality:** all workflows are in `.github/workflows-disabled/` (note the `-disabled` suffix). **GitHub only executes workflows from `.github/workflows/`, so NO CI is currently running.**

### `.github/workflows-disabled/ci.yml`
- **Triggers:** `pull_request`; `push` to `main` and `feat/**`.
- **Runner:** `ubuntu-24.04`. Single job `validate`. Steps:
  1. checkout (pinned).
  2. setup-bun v2, `bun-version: 1.3.14`.
  3. `bun install --frozen-lockfile`.
  4. `bun run validate` — **blocking**.
  5. `bun run build` — **blocking**.
  6. `bun run scripts/check-performance-budgets.mjs` — **advisory** (`continue-on-error: ${{ secrets.PERF_BUDGET_STRICT != '1' }}`; blocking only if `PERF_BUDGET_STRICT=1`). Labeled `WP-P4-01 / OPEN-PERF-05`, 2-week advisory window.
  7. `bun run lint:design` — **blocking**.
  8. `bunx playwright install chromium --with-deps`.
  9. `bun run test:e2e` — **blocking**.
  10. `bun run test:e2e:perf` — **blocking**.
- **No deploy/preview steps.** No artifact upload. No Cloudflare deploy.

### Other disabled workflows
- `.github/workflows-disabled/codeql.yml` — GitHub CodeQL (JS/TS). Triggers: PR to main, push to main, weekly cron `33 2 * * 1`. Config `.github/codeql/codeql-config.yml`. Writes `security-events`. **Currently not running; CodeQL API returns 403** (per `current-state.md` fast path).
- `.github/workflows-disabled/react-doctor.yml` — React Doctor scan on PR/push. Posts sticky PR comment + commit status. **Advisory** (`blocking` is commented out, lines 44–51).
- `.github/workflows-disabled/dependabot.yml` — Dependabot **config** (not a workflow). Weekly npm + github-actions updates. **Dependabot alerts return 403.**

### `.github/` supporting files
- `.github/CODEOWNERS`, `.github/pull_request_template.md`, `.github/codeql/codeql-config.yml`.

### Implication for the gate
- The gate must work **with CI off** (local-first).
- Re-enabling CI (`workflows-disabled/` → `workflows/`) is an **owner decision** (`OPEN-LG-05`).
- The gate's CI integration is **opt-in**: it can be added as a new advisory job first, promoted to required later. The design must not assume CI is the enforcement surface.

## §6. Historical launch verdict lineage (from `current-state.md` + `decisions.md`)

**The historical verdict is NO-GO and stale.** Key lines:
- `current-state.md:8825` — **MVP Closed Beta Remaining No-Go Gates (2026-06-02):** "Closed beta remains **NO-GO** until external/manual evidence exists for linked Supabase backup/PITR and restore drill, hosted auth allowed/denied/revoked smoke, Vercel deploy/env/health/rollback proof, Resend delivery/webhook proof, owner/counsel legal review, monitored support inbox/feedback-table/alert proof, demo rehearsal proof, and current hosted E2E/manual smoke."
- `current-state.md:782-799` — legal-owner readiness refresh: `legalOwnerReady=false`, all five proof flags false, reviewer/approval reference missing. "Explicit negative legal/public-launch readiness evidence, not approval."
- `current-state.md:3327` — Fresh provider/DNS/email evidence **NO-GO**: missing Worker secret names `BETTER_AUTH_GOOGLE_CLIENT_ID` and `BETTER_AUTH_GOOGLE_CLIENT_SECRET`; nameservers still `dns1/dns2.registrar-servers.com`; Email readiness NOT READY. *(Note: later checkpoints L3040–3050 report D1/Auth/Realtime and provider readiness green — substrate has progressed since 2026-06-02.)*
- `current-state.md:3052` — Hosted performance: strict p95 budgets **fail** for cached public outliers: `login` 571.55ms/300ms, `pricing` 500.15ms/200ms, `features` 836ms/200ms, `contact` 527.17ms/300ms, `trust` 448.89ms/300ms, `privacy` 826.25ms/300ms, `terms` 490.36ms/300ms, `signup` 409.02ms/300ms, uncached `access-required` 776.23ms/300ms.
- `current-state.md:9053-9054` — `/privacy` and `/terms` are pending-review status pages; public self-serve launch remains blocked until reviewed legal copy replaces them.
- `decisions.md:722` — "Do not claim closed-beta launch ready until hosted Google OAuth, Resend sending-domain, owner/legal/support monitoring, and residual security/history-risk gates close."
- `decisions.md:764` — "Do not keep adding local code for launch readiness... Closed beta remains NO-GO until those gates pass."

**Implication:** the unified gate must **re-derive status from current artifacts**, not trust the stale verdict. The gate's freshness TTL (DEC-LG-04) is what makes re-derivation trustworthy.

## §7. Sibling launch-readiness plan packs (to aggregate, not re-derive)

The gate must surface the readiness of these domains by **citing** the relevant sibling pack + its anchor script, not by reproducing the analysis:

| Domain | Sibling pack | Anchor script(s) |
|---|---|---|
| Global nonced CSP enforcement | `2026-07-07-global-nonced-csp-enforcement` (PROMPT only) | (future) |
| OWASP API authz matrix refresh | `2026-07-07-owasp-api-authz-matrix-refresh` (PROMPT only) | (future) |
| Privacy request / DSAR / erasure | `2026-07-07-privacy-request-operations-and-erasure-workflow` (full) | (future) |
| Invite token flow hardening | `2026-07-07-invite-token-flow-hardening` (full) | (future) |
| Provider-exit final proof closure | `2026-07-07-provider-exit-final-proof-closure` (PROMPT only) | `cf:provider-exit-pack` |
| D1 hot-path query budgets & indexes | `2026-07-07-d1-hot-path-query-budgets-and-indexes` (full) | `dbidx:audit-repo`, `cf:d1-performance-proof` |
| D1 migration state & schema integrity | `2026-07-07-d1-migration-state-and-schema-integrity` (full) | (migration audit) |
| D1/R2 backup-restore ops readiness | `2026-07-07-d1-r2-backup-restore-operational-readiness` (full) | `cf:d1-restore-rehearsal` |
| D1/R2 referential integrity orphan audit | `2026-07-07-d1-r2-referential-integrity-orphan-audit` (full) | (audit) |
| Durable Object realtime scale | `2026-07-07-durable-object-realtime-scale-readiness` (full) | (load test) |
| R2 upload memory/multipart/image | `2026-07-07-r2-upload-memory-multipart-and-image-readiness` (PROMPT only) | `cf:verify-hosted-upload-*` |
| Cloudflare Queues/Cron prod ops | `2026-07-07-cloudflare-queues-cron-production-ops` (full) | `cf:jobs-proof` |
| Worker prod observability & budgets | `2026-07-07-cloudflare-worker-production-observability-and-budgets` (full) | (observability) |
| Observability alert proof & log retention | `2026-07-07-observability-alert-proof-and-log-retention` (PROMPT only) | (future) |
| Production RUM & CWV telemetry | `2026-07-07-production-rum-and-cwv-telemetry` (PROMPT only) | (future) |
| Bundle & route performance gate hardening | `2026-07-07-bundle-and-route-performance-gate-hardening` (full) | `perf:check-routes`, `check-performance-budgets.mjs` |
| Security CI release gates | `2026-07-07-security-ci-release-gates` (PROMPT only) | (future) |
| Test harness stability & flake budget | `2026-07-07-test-harness-stability-and-flake-budget` (PROMPT only) | (future) |
| E2E fixture smoke harness | `2026-07-07-e2e-fixture-smoke-harness` (full) | `test:e2e` |
| First-user activation / empty workspace | `2026-07-07-first-user-activation-empty-workspace` (full) | (UX) |
| Beta support/feedback operating loop | `2026-07-07-beta-support-feedback-operating-loop` (full) | `launch:check-support-monitoring` |
| Public→beta trust/onboarding continuity | `2026-07-07-public-to-beta-trust-onboarding-continuity` (PROMPT only) | (UX) |
| AI safety leakage & provider resilience | `2026-07-07-ai-safety-leakage-and-provider-resilience` (full) | (audit) |
| Cost-library data governance & source trust | `2026-07-07-cost-library-data-governance-and-source-trust` (full) | (audit) |
| Client-ready proposal package workflow | `2026-07-07-client-ready-proposal-package-workflow` (full) | (UX) |
| Upload production proof closure | `2026-07-07-upload-production-proof-closure` (full) | `cf:verify-hosted-upload-*` |
| Operational data readiness source-of-truth | `2026-07-07-operational-data-readiness-source-of-truth` (PROMPT only) | (future) |
| Security OWASP compliance audit | `2026-07-01-security-owasp-compliance-audit` (full) | (audit) |

**Implication:** the gate's domain list (in `06`) is derived from this set + the anchor scripts. Packs marked "(PROMPT only)" represent **future** domains whose anchor scripts do not yet exist; the gate must mark them `missing-evidence` or `not-applicable-pending-sibling` rather than silently passing them.

## §8. `wrangler.jsonc` provider boundary (for the gate's provider-claim safety)

From `AGENTS.md` (verified authoritative):
- Worker: `archestimator-proof` (custom domain `archestimator.com`).
- D1: `ARCH_DB` (`archestimator-proof-db`, id `9bdb29bb-687e-4f51-ae81-7659c426ea5f`).
- R2: `ARCH_UPLOADS_R2` (`archestimator-proof-uploads`).
- Durable Object: `COLLAB_ROOMS` (class `CollaborationRoom`, SQLite-backed).
- Queue: `UPLOAD_JOBS_QUEUE` (`archestimator-upload-jobs` + DLQ).
- Images: `IMAGES`.
- Email: `EMAIL`.
- Cron triggers: `0 3 * * *`, `15 3 * * *`.

The gate must **never** mutate any of these and must **never** claim proof against resources outside this boundary.

## §9. Confidence & gaps in this audit

- **High confidence:** anchor script behaviors (read in full via subagent), package.json scripts (read in full), CI location/disabled status (verified), evidence DAG (derived from `ARTIFACT_PATHS` + `DEFAULT_FILES` constants).
- **Medium confidence:** the exact current values of artifacts on disk (not read — they may be stale; the gate's freshness TTL handles this), the exact sibling-pack completion state (inferred from folder contents).
- **Known gap:** the hosted security control 403/404 status (CodeQL/Dependabot/secret-scan) is from the `current-state.md` fast path, dated; the gate should re-probe these via `gh api` at runtime rather than trust the doc.

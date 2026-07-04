# Provider cleanup allowlist report

Generated: 2026-07-04T08:59:40.214Z

Non-destructive provider-cleanup allowlist report. This script reads source, scripts, e2e, and tests only; it does not read .env files, print secrets, mutate providers, deploy, delete data, or prove hosted/provider-dashboard state.

## Readiness

| Gate | Status |
|---|---|
| activeRuntimeProviderReferencesReady | PASS |
| allProviderStringsClassified | PASS |
| providerCleanupAllowlistReady | PASS |
| finalProviderCleanupReady | PASS |

## Disposition Counts

| Disposition | Files |
|---|---:|
| active-runtime-blocker | 0 |
| cleanup-candidate | 0 |
| compatibility-guard | 10 |
| keep-active-audit-tooling | 8 |
| keep-active-audit-tooling-test | 16 |
| keep-active-negative-assertion | 50 |
| keep-active-security-fixture | 5 |
| type-reference-retirement | 0 |
| unclassified | 0 |

## Blockers

- none

## Files

| File | Disposition | Rationale | Hits |
|---|---|---|---:|
| scripts/check-cloudflare-d1-auth-realtime-readiness.ts | keep-active-audit-tooling | Cloudflare D1/Better Auth readiness scanner intentionally detects legacy Supabase/Resend patterns. | 7 |
| scripts/collect-live-db-performance-evidence.ts | keep-active-audit-tooling | Historical performance evidence collector keeps explicit, guarded, read-only Supabase comparison modes; it is not runtime code. | 11 |
| scripts/generate-cloudflare-better-auth-proof.ts | keep-active-audit-tooling | Better Auth proof tooling intentionally checks retired Supabase auth-gate patterns while proving current Cloudflare/D1 behavior. | 6 |
| scripts/generate-cloudflare-cost-performance-workbook.ts | keep-active-audit-tooling | Cloudflare cost/performance evidence workbook intentionally records legacy-provider comparison command labels. | 1 |
| scripts/generate-cloudflare-d1-authz-access-matrix.ts | keep-active-audit-tooling | D1 authorization matrix intentionally records old Supabase RPC signal labels while proving current coverage. | 1 |
| scripts/generate-cloudflare-migration-inventory.ts | keep-active-audit-tooling | Migration inventory tooling intentionally detects Supabase/Vercel coupling. | 1 |
| scripts/generate-cloudflare-provider-exit-pack.ts | keep-active-audit-tooling | Provider-exit pack intentionally scans for legacy Supabase/Vercel/Resend references. | 1 |
| scripts/generate-provider-cleanup-allowlist.ts | keep-active-audit-tooling | Provider-cleanup allowlist report intentionally scans and classifies legacy provider strings. | 10 |
| tests/vitest/ai-audit-schema.test.ts | keep-active-negative-assertion | Negative assertion test intentionally mentions old-provider strings to prove current Cloudflare/D1 paths avoid them. | 2 |
| tests/vitest/ai-package-builder-security-contract.test.ts | keep-active-negative-assertion | Negative assertion test intentionally mentions old-provider strings to prove current Cloudflare/D1 paths avoid them. | 6 |
| tests/vitest/auth-account-audit-d1-store.test.ts | keep-active-negative-assertion | Negative assertion test intentionally mentions old-provider strings to prove current Cloudflare/D1 paths avoid them. | 2 |
| tests/vitest/auth-account-data-contract.test.ts | keep-active-negative-assertion | Negative assertion test intentionally mentions old-provider strings to prove current Cloudflare/D1 paths avoid them. | 1 |
| tests/vitest/auth-account-data-schema.test.ts | keep-active-negative-assertion | Negative assertion test intentionally mentions old-provider strings to prove current Cloudflare/D1 paths avoid them. | 3 |
| tests/vitest/auth-account-settings-d1-store.test.ts | keep-active-negative-assertion | Negative assertion test intentionally mentions old-provider strings to prove current Cloudflare/D1 paths avoid them. | 3 |
| tests/vitest/auth-callback-route.test.ts | compatibility-guard | Compatibility guard mocks or names retired Supabase modules to prove current code does not call the old provider path. | 4 |
| tests/vitest/auth-magic-link.test.ts | keep-active-negative-assertion | Negative assertion test intentionally mentions old-provider strings to prove current Cloudflare/D1 paths avoid them. | 6 |
| tests/vitest/auth-profile-d1-store.test.ts | keep-active-negative-assertion | Negative assertion test intentionally mentions old-provider strings to prove current Cloudflare/D1 paths avoid them. | 2 |
| tests/vitest/auth-proxy.test.ts | compatibility-guard | Mocks retired Supabase proxy modules to prove Better Auth/proxy code does not call them. | 10 |
| tests/vitest/auth-sensitive-api-boundaries.test.ts | compatibility-guard | Uses legacy provider sentinels while asserting sensitive APIs stay on current D1/Cloudflare boundaries. | 12 |
| tests/vitest/auth-session-closed-beta.test.ts | keep-active-negative-assertion | Negative assertion test intentionally mentions old-provider strings to prove current Cloudflare/D1 paths avoid them. | 1 |
| tests/vitest/closed-beta-env-manifest.test.ts | keep-active-negative-assertion | Negative assertion test intentionally mentions old-provider strings to prove current Cloudflare/D1 paths avoid them. | 3 |
| tests/vitest/cloudflare-better-auth-proof-script.test.ts | keep-active-audit-tooling-test | Fixture coverage for Cloudflare Better Auth proof scanner migration detection. | 5 |
| tests/vitest/cloudflare-cost-performance-workbook-script.test.ts | keep-active-audit-tooling-test | Audit/proof fixture intentionally mentions legacy-provider commands or helpers while preserving an explicit non-runtime evidence boundary. | 1 |
| tests/vitest/cloudflare-d1-auth-realtime-readiness-script.test.ts | keep-active-audit-tooling-test | Fixture coverage for legacy-provider readiness scanner detection. | 7 |
| tests/vitest/cloudflare-d1-authz-access-matrix-script.test.ts | keep-active-audit-tooling-test | Audit/proof fixture intentionally mentions legacy-provider commands or helpers while preserving an explicit non-runtime evidence boundary. | 4 |
| tests/vitest/cloudflare-migration-inventory-script.test.ts | keep-active-audit-tooling-test | Fixture coverage for migration inventory scanner detection. | 6 |
| tests/vitest/collaboration-invitation-d1-store.test.ts | keep-active-negative-assertion | Negative assertion test intentionally mentions old-provider strings to prove current Cloudflare/D1 paths avoid them. | 3 |
| tests/vitest/component-library-durable-telemetry.test.ts | keep-active-negative-assertion | Negative assertion test intentionally mentions old-provider strings to prove current Cloudflare/D1 paths avoid them. | 1 |
| tests/vitest/component-library-versioning-schema.test.ts | keep-active-negative-assertion | Negative assertion test intentionally mentions old-provider strings to prove current Cloudflare/D1 paths avoid them. | 1 |
| tests/vitest/dbidx-repo-audit.test.ts | keep-active-negative-assertion | Negative assertion test intentionally mentions old-provider strings to prove current Cloudflare/D1 paths avoid them. | 1 |
| tests/vitest/estimate-image-url.test.ts | keep-active-security-fixture | Legacy public storage URL is an unsafe image URL sanitization fixture. | 3 |
| tests/vitest/estimate-node-reorder-action.test.ts | compatibility-guard | Compatibility guard mocks or names retired Supabase modules to prove current code does not call the old provider path. | 31 |
| tests/vitest/estimate-repository.test.ts | keep-active-negative-assertion | Negative assertion test intentionally mentions old-provider strings to prove current Cloudflare/D1 paths avoid them. | 1 |
| tests/vitest/estimate-route-server-concurrency.test.ts | keep-active-negative-assertion | Negative assertion test intentionally mentions old-provider strings to prove current Cloudflare/D1 paths avoid them. | 1 |
| tests/vitest/estimate-sheet-actions-authz.test.ts | compatibility-guard | Compatibility guard mocks or names retired Supabase modules to prove current code does not call the old provider path. | 2 |
| tests/vitest/estimate-sheet-route-loading.test.ts | keep-active-negative-assertion | Negative assertion test intentionally mentions old-provider strings to prove current Cloudflare/D1 paths avoid them. | 1 |
| tests/vitest/estimate-sheet-user-preferences.test.ts | keep-active-negative-assertion | Negative assertion test intentionally mentions old-provider strings to prove current Cloudflare/D1 paths avoid them. | 3 |
| tests/vitest/estimate-sheet-version-control-actions.test.ts | compatibility-guard | Compatibility guard mocks or names retired Supabase modules to prove current code does not call the old provider path. | 22 |
| tests/vitest/estimate-sheet-version-control-db.test.ts | keep-active-audit-tooling-test | Audit/proof fixture intentionally mentions legacy-provider commands or helpers while preserving an explicit non-runtime evidence boundary. | 2 |
| tests/vitest/legal-terms-d1-store.test.ts | keep-active-negative-assertion | Negative assertion test intentionally mentions old-provider strings to prove current Cloudflare/D1 paths avoid them. | 4 |
| tests/vitest/mass-deletion-action-contract.test.ts | keep-active-negative-assertion | Negative assertion test intentionally mentions old-provider strings to prove current Cloudflare/D1 paths avoid them. | 3 |
| tests/vitest/notifications-actions.test.ts | keep-active-negative-assertion | Negative assertion test intentionally mentions old-provider strings to prove current Cloudflare/D1 paths avoid them. | 3 |
| tests/vitest/perf/library-overview-rpc-contract.test.ts | keep-active-negative-assertion | Negative assertion test intentionally mentions old-provider strings to prove current Cloudflare/D1 paths avoid them. | 1 |
| tests/vitest/project-activity-page/repository-contract.test.ts | keep-active-negative-assertion | Negative assertion test intentionally mentions old-provider strings to prove current Cloudflare/D1 paths avoid them. | 2 |
| tests/vitest/project-activity-page/route-contract.test.ts | keep-active-negative-assertion | Negative assertion test intentionally mentions old-provider strings to prove current Cloudflare/D1 paths avoid them. | 2 |
| tests/vitest/project-charts-d1-repository.test.ts | keep-active-negative-assertion | Negative assertion test intentionally mentions old-provider strings to prove current Cloudflare/D1 paths avoid them. | 1 |
| tests/vitest/project-collaboration-actions.test.ts | keep-active-negative-assertion | Negative assertion test intentionally mentions old-provider strings to prove current Cloudflare/D1 paths avoid them. | 3 |
| tests/vitest/project-collaboration-realtime.test.ts | keep-active-negative-assertion | Negative assertion test intentionally mentions old-provider strings to prove current Cloudflare/D1 paths avoid them. | 1 |
| tests/vitest/project-component-projection.test.ts | keep-active-negative-assertion | Negative assertion test intentionally mentions old-provider strings to prove current Cloudflare/D1 paths avoid them. | 1 |
| tests/vitest/project-d1-audit.test.ts | keep-active-negative-assertion | Negative assertion test intentionally mentions old-provider strings to prove current Cloudflare/D1 paths avoid them. | 3 |
| tests/vitest/project-dashboard-side-panel-ui.test.ts | keep-active-negative-assertion | Negative assertion test intentionally mentions old-provider strings to prove current Cloudflare/D1 paths avoid them. | 2 |
| tests/vitest/project-estimate-list-row-contract.test.ts | keep-active-negative-assertion | Negative assertion test intentionally mentions old-provider strings to prove current Cloudflare/D1 paths avoid them. | 2 |
| tests/vitest/project-estimate-list-summaries-scoping.test.ts | keep-active-negative-assertion | Negative assertion test intentionally mentions old-provider strings to prove current Cloudflare/D1 paths avoid them. | 1 |
| tests/vitest/project-group-actions.test.ts | compatibility-guard | Compatibility guard mocks or names retired Supabase modules to prove current code does not call the old provider path. | 44 |
| tests/vitest/project-invite-entry-route.test.ts | keep-active-negative-assertion | Negative assertion test intentionally mentions old-provider strings to prove current Cloudflare/D1 paths avoid them. | 6 |
| tests/vitest/project-invite-sign-out-route.test.ts | compatibility-guard | Compatibility guard mocks or names retired Supabase modules to prove current code does not call the old provider path. | 3 |
| tests/vitest/project-location-schema.test.ts | keep-active-negative-assertion | Negative assertion test intentionally mentions old-provider strings to prove current Cloudflare/D1 paths avoid them. | 3 |
| tests/vitest/project-publication-public-repository.test.ts | keep-active-negative-assertion | Negative assertion test intentionally mentions old-provider strings to prove current Cloudflare/D1 paths avoid them. | 3 |
| tests/vitest/project-publication-snapshot.test.ts | keep-active-security-fixture | Legacy public storage URL is used to prove publication snapshot image sanitization. | 4 |
| tests/vitest/provider-cleanup-allowlist-script.test.ts | keep-active-audit-tooling-test | Fixture coverage for this provider-cleanup allowlist scanner. | 26 |
| tests/vitest/provider-exit-pack-script.test.ts | keep-active-audit-tooling-test | Fixture coverage for provider-exit pack legacy-provider detection. | 5 |
| tests/vitest/publisher-activity-d1-repository.test.ts | keep-active-negative-assertion | Negative assertion test intentionally mentions old-provider strings to prove current Cloudflare/D1 paths avoid them. | 1 |
| tests/vitest/publisher-page-contract.test.ts | keep-active-negative-assertion | Negative assertion test intentionally mentions old-provider strings to prove current Cloudflare/D1 paths avoid them. | 5 |
| tests/vitest/publisher-roster-repository.test.ts | keep-active-negative-assertion | Negative assertion test intentionally mentions old-provider strings to prove current Cloudflare/D1 paths avoid them. | 4 |
| tests/vitest/realtime-auth-bridge-favorites-clear.test.tsx | compatibility-guard | Compatibility guard mocks or names retired Supabase modules to prove current code does not call the old provider path. | 3 |
| tests/vitest/recipient-proposals-route-gate.test.ts | keep-active-negative-assertion | Negative assertion test intentionally mentions old-provider strings to prove current Cloudflare/D1 paths avoid them. | 1 |
| tests/vitest/redact.test.ts | keep-active-security-fixture | Legacy provider key names are credential-adjacent redaction fixtures. | 2 |
| tests/vitest/security-findings-auth-contracts.test.ts | keep-active-negative-assertion | Negative assertion test intentionally mentions old-provider strings to prove current Cloudflare/D1 paths avoid them. | 1 |
| tests/vitest/security-findings-library-tooling-contracts.test.ts | keep-active-negative-assertion | Negative assertion test intentionally mentions old-provider strings to prove current Cloudflare/D1 paths avoid them. | 1 |
| tests/vitest/security-findings-proof-contracts.test.ts | keep-active-negative-assertion | Negative assertion test intentionally mentions old-provider strings to prove current Cloudflare/D1 paths avoid them. | 1 |
| tests/vitest/share/duplicate-decision-race.provider.test.ts | keep-active-audit-tooling-test | Audit/proof fixture intentionally mentions legacy-provider commands or helpers while preserving an explicit non-runtime evidence boundary. | 3 |
| tests/vitest/supabase-type-reference-retirement-inventory-script.test.ts | keep-active-audit-tooling-test | Audit/proof fixture intentionally mentions legacy-provider commands or helpers while preserving an explicit non-runtime evidence boundary. | 4 |
| tests/vitest/terms-gate-direct-callers.test.ts | compatibility-guard | Mocks retired Supabase modules to prove protected direct callers do not use them before terms acceptance. | 5 |
| tests/vitest/upload-component-image-backfill.test.ts | keep-active-security-fixture | Legacy storage URLs are migration/sanitization fixtures for upload backfill behavior. | 4 |
| tests/vitest/upload-operations-runbook-local-proof-script.test.ts | keep-active-negative-assertion | Negative assertion test intentionally mentions old-provider strings to prove current Cloudflare/D1 paths avoid them. | 1 |
| tests/vitest/upload-provider-migration-dry-run.test.ts | keep-active-audit-tooling-test | Audit/proof fixture intentionally mentions legacy-provider commands or helpers while preserving an explicit non-runtime evidence boundary. | 2 |
| tests/vitest/upload-release-gates.test.ts | keep-active-audit-tooling-test | Audit/proof fixture intentionally mentions legacy-provider commands or helpers while preserving an explicit non-runtime evidence boundary. | 1 |
| tests/vitest/upload-scan-override-ui.test.tsx | keep-active-negative-assertion | Negative assertion test intentionally mentions old-provider strings to prove current Cloudflare/D1 paths avoid them. | 3 |
| tests/vitest/upload-scan-worker-provider-proof-script.test.ts | keep-active-audit-tooling-test | Audit/proof fixture intentionally mentions legacy-provider commands or helpers while preserving an explicit non-runtime evidence boundary. | 1 |
| tests/vitest/upload-session-capacity-provider-proof.test.ts | keep-active-negative-assertion | Negative assertion test intentionally mentions old-provider strings to prove current Cloudflare/D1 paths avoid them. | 1 |
| tests/vitest/upload-signed-provider-proof-script.test.ts | keep-active-audit-tooling-test | Audit/proof fixture intentionally mentions legacy-provider commands or helpers while preserving an explicit non-runtime evidence boundary. | 1 |
| tests/vitest/upload-signed-route-proof-script.test.ts | keep-active-audit-tooling-test | Audit/proof fixture intentionally mentions legacy-provider commands or helpers while preserving an explicit non-runtime evidence boundary. | 1 |
| tests/vitest/upload-signed-route.test.ts | keep-active-negative-assertion | Negative assertion test intentionally mentions old-provider strings to prove current Cloudflare/D1 paths avoid them. | 3 |
| tests/vitest/upload-tus-provider-proof-script.test.ts | keep-active-audit-tooling-test | Audit/proof fixture intentionally mentions legacy-provider commands or helpers while preserving an explicit non-runtime evidence boundary. | 2 |
| tests/vitest/upsert-update-grant-contract.test.ts | keep-active-negative-assertion | Negative assertion test intentionally mentions old-provider strings to prove current Cloudflare/D1 paths avoid them. | 2 |
| tests/vitest/vercel-analytics-removed.test.ts | keep-active-negative-assertion | Negative assertion test intentionally mentions old-provider strings to prove current Cloudflare/D1 paths avoid them. | 5 |
| tests/vitest/with-action-errors.test.ts | keep-active-security-fixture | Legacy provider key names are error-redaction fixtures. | 2 |
| tests/vitest/workshop-homebase-summary-rpc-contract.test.ts | keep-active-negative-assertion | Negative assertion test intentionally mentions old-provider strings to prove current Cloudflare/D1 paths avoid them. | 1 |
| tests/vitest/workshop-pending-invite.test.tsx | keep-active-negative-assertion | Negative assertion test intentionally mentions old-provider strings to prove current Cloudflare/D1 paths avoid them. | 2 |

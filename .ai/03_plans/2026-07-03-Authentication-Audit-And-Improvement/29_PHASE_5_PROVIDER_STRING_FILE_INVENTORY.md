# 29 - Phase 5 Provider String File Inventory

**Date:** 2026-07-04
**Status:** Original file-level inventory plus post-Slice 0, Slice A, Slice A2, Slice B, and Slice D0-D3 delta evidence.
**Scope boundary:** This artifact began as planning evidence. Later Slice 0, Slice A, Slice A2, Slice B, and Slice D0-D3 continuations changed narrow source/test/script subsets and record the updated scan counts here; no provider, secret, deployment, migration, package-manifest, hosted runtime, or production state was changed.

## Objective

Record the resolved local Phase 5 provider-cleanup classification for every current old-provider string hit outside `supabase/**`. This is the file-level companion to `28_PHASE_5_REMAINING_PROVIDER_FIXTURE_CLEANUP_PLAN.md`: `28` defines the cleanup slices, and this document records the inventory those slices resolved or allowlisted while reserving remaining proof for provider-exit, hosted, operator, and final-review gates. Outer auth-goal completion also keeps legal/privacy proof open for launch-level claims.

This inventory does not close `RISK-007`, because local provider-cleanup/type-reference retirement is only one gate. Final provider-exit/launch cleanup proof still requires provider-exit pack/CI readiness, hosted/provider-dashboard/operator evidence or an explicit accepted skip, external Google/persona and mailbox proof or accepted deferrals, legal/privacy approval where the outer launch/auth goal requires it, and final review.

## Scan Evidence

Primary scan:

```bash
rg -l "@supabase/|supabase-js|NEXT_PUBLIC_SUPABASE|SUPABASE_SERVICE_ROLE|@vercel/|VERCEL_|RESEND_API_KEY" src scripts e2e tests --glob '!supabase/**' --glob '!.ai/**' | sort
```

Original result: `60` files.

Count-by-file scan:

```bash
rg -n "@supabase/|supabase-js|NEXT_PUBLIC_SUPABASE|SUPABASE_SERVICE_ROLE|@vercel/|VERCEL_|RESEND_API_KEY" src scripts e2e tests --glob '!supabase/**' --glob '!.ai/**' | cut -d: -f1 | sort | uniq -c | sort -nr
```

Secondary type-reference scan:

```bash
rg -l "src/lib/supabase/types|@/lib/supabase/types|\\.\\./.*lib/supabase/types|\\.\\./.*src/lib/supabase/types" src scripts tests --glob '!supabase/**' | sort
```

Original result: `38` files referenced the historical `src/lib/supabase/types.ts` shape directly or indirectly. The result after Slice A/A2 was `34` active files. After Slice D0-D3 migration/inventory/deletion work, the current result is `4` active path-reference files, all non-blocking negative guards or audit-tooling references to the retired path. The generated inventory now reports `0` deletion-blocking files and `typeReferenceDeletionReady=true`. This is a separate retirement dependency from the old-provider keyword hits because many type imports do not contain `@supabase/` or uppercase provider env names.

2026-07-04 continuation recheck: the primary scan still returns `60` files and the secondary type-reference scan still returns `38` files. A direct caller check for stale proof utilities found two dependent Vitest files that are not both visible in the primary keyword inventory but must be handled with Slice A:

- `tests/vitest/shared-link-smoke-seed-script.test.ts` imports `scripts/seed-shared-link-smoke.ts`.
- `tests/vitest/shared-link-hosted-password-route-proof-script.test.ts` imports `scripts/prove-shared-link-hosted-password-route.ts`.

Treat those as cleanup dependencies even when the dependent test does not itself contain an old-provider keyword hit.

2026-07-04 Slice 0 target-literal recheck: the primary scan returned `54` files after clearing the low-risk stale text/scaffold subset in `e2e/shared-link-receiver.spec.ts`, `scripts/verify-upload-alert-delivery.ts`, `tests/vitest/project-publication-resolved-ids.test.ts`, `tests/vitest/project-publication-rotate-resend.test.ts`, and `tests/vitest/project-publication-security-hardening.test.ts`, plus verifying the publication-page cleanup already present in `tests/vitest/project-publication-page.test.tsx` from a concurrent dirty change. The secondary type-reference scan returned `38` files, and the stale shared-link proof-utility caller dependency was unchanged at that historical checkpoint.

2026-07-04 Slice A archive recheck: eight stale Supabase-backed proof utilities and their two direct dependent Vitest tests were archived under `supabase/migration-evidence/provider-parity-proofs/`. The primary scan now returns `45` files outside `supabase/**`, the secondary type-reference scan now returns `34` files outside `supabase/**`, and the active caller check for those archived utility names across `package.json`, `scripts`, `tests`, `e2e`, and `.github` returns no matches outside `supabase/**`.

2026-07-04 Slice A2 archive recheck: `tests/vitest/notification-rls-proof.test.ts` and `tests/vitest/upload-storage-denial-proof.test.ts` were archived under `supabase/migration-evidence/provider-parity-proofs/tests/`. At that checkpoint, the primary scan remained `45` files outside `supabase/**`, the secondary type-reference scan remained `34` active files, and the remaining active references to those two historical test names were provider-cleanup allowlist/scanner fixtures rather than direct imports.

2026-07-04 Slice B allowlist recheck: `scripts/generate-provider-cleanup-allowlist.ts` regenerated `evidence/2026-07-04-provider-cleanup-allowlist.{json,md}` from the then-current worktree. The report classified all `45` then-current keyword-hit files, had zero active-runtime blockers, zero cleanup candidates, and zero unclassified files, and set `providerCleanupAllowlistReady=true`. Its final-cleanup flag was still false at that checkpoint because `src/lib/supabase/types.ts` remained a `type-reference-retirement` file, and because final provider-exit/hosted/operator/final-review gates are outside the report. Slice D3 first superseded this with a `44`-file narrow keyword local provider-cleanup pass; the scoped scanner-review fix then broadened the active provider-boundary allowlist pass to `89` classified hit files.

2026-07-04 Slice D0 type-reference inventory recheck: `scripts/generate-supabase-type-reference-retirement-inventory.ts` regenerated `evidence/2026-07-04-supabase-type-reference-retirement-inventory.{json,md}` from the current worktree. At that checkpoint, the raw path-reference scan returned `22` files outside `supabase/**`; the report classified all `22`, had zero unknown references, separated `4` non-blocking files, and reported `18` deletion-blocking files. `typeReferenceDeletionReady=false` was correct until those blockers were migrated, archived, deleted, or explicitly accepted.

2026-07-04 Slice D1 direct type-import migration recheck: project-page fixture tests now use `ProjectRow` from `src/lib/types/database` instead of historical `Tables<"projects">`, and estimate-tree/proposal grouping fixtures now use current workspace-repository query row types. Focused validation passed the direct-import migration Vitest suite (`14` files / `110` tests), the inventory-script suite (`1` file / `3` tests), and high-memory TypeScript check. The regenerated inventory remained an intermediate blocker map: `22` raw path-reference files, `18` deletion blockers, `4` non-blocking guard/audit-tooling files, and zero unknown references.

2026-07-04 Slice D2 remaining deletion-blocker migration recheck: shared-link, publication/collaboration/invite/activity, mass-deletion, component-library, and remaining schema/source-read tests were migrated from historical Supabase generated type reads/imports to active D1 migration/source-contract assertions. Focused validation passed the migrated Vitest suite (`17` files / `136` tests), the Bun P3 shared-link migration suite (`2` tests), the inventory-script suite (`1` file / `3` tests), the provider-cleanup allowlist suite (`1` file / `4` tests), canonical inventory regeneration, provider-cleanup allowlist regeneration, and high-memory TypeScript check. The regenerated inventory is now the current blocker map: `4` raw path-reference files, `0` deletion blockers, `4` non-blocking guard/audit-tooling files, `0` unknown references, and `typeReferenceDeletionReady=true`.

2026-07-04 Slice D3 historical type-file deletion recheck: `src/lib/supabase/types.ts` was deleted after active deletion blockers reached zero. The narrow old-provider keyword scan now reports `44` files. A scoped independent code-review then found the allowlist scanner missed broader Supabase boundary references such as `SUPABASE_DB_URL`, `SUPABASE_PROJECT_ID`, `@/lib/supabase`, `createSupabase*`, and `supabase db`; after broadening the scanner and focused test, strict regeneration now reports `89` classified active-surface provider-boundary hit files with zero active-runtime blockers, zero cleanup candidates, zero unclassified files, zero type-reference-retirement files, and `finalProviderCleanupReady=true`. The regenerated type-reference inventory remains `4` non-blocking guard/audit-tooling path references with `typeReferenceDeletionReady=true`. The 2026-07-04T09:04:19Z regenerated provider-exit/source-smoke/template evidence reports `activeLegacyProviderRuntimeBlockers=0` but `providerExitReady=false` with five remaining external/operator/hosted gates; the latest deploy/source-smoke subgate is separately `NOT READY` with `3` current-tree blockers, and the matching source-smoke plus operator-record templates are sanitized handoff artifacts rather than proof.

## Disposition Legend

| Disposition | Meaning | Final-proof handling |
|---|---|---|
| `cleanup-candidate` | Stale provider wording, script logic, or env scaffolding that can likely be removed or rewritten in a scoped implementation slice. | Must be changed, archived, or explicitly waived before final cleanup completion. |
| `migration-archaeology` | Historical provider proof or migration evidence that may still have evidentiary value, but is not active runtime behavior. | Move under `supabase/migration-evidence/` or allowlist as archaeology with a banner. |
| `keep-active-audit-tooling` | Current Cloudflare/provider-exit scanner that must mention old-provider strings to detect regressions. | Allowlist by file and purpose. |
| `keep-active-audit-tooling-test` | Test fixture for scanner/proof tooling. | Allowlist by file and purpose. |
| `keep-active-negative-assertion` | Test uses old-provider strings to prove current source does not use them. | Allowlist as regression coverage. |
| `keep-active-security-fixture` | Test uses old-provider key names or legacy URLs as credential/leak/sanitization examples. | Keep or replace with equally strong generic fixtures. |
| `compatibility-guard` | Test mocks historical provider modules/env only to prove the Cloudflare/Better Auth path does not call them. | Keep until the compatibility guard is replaced or no longer needed. |
| `type-reference-retirement` | Historical schema-shape file or reference to `src/lib/supabase/types.ts`. | The historical file is deleted; keep remaining path references only as intentional negative guards or retirement-audit tooling. |
| `dependent-proof-test` | Test imports or exercises a cleanup-candidate proof utility even if the test is not itself an old-provider keyword hit. | Move, delete, or rewrite with the proof utility in the same implementation slice; the two known shared-link direct importers were archived in Slice A. |

## File Inventory

| File | Disposition | Current hit source | Next action |
|---|---|---|---|
| `e2e/shared-link-receiver.spec.ts` | Cleared in Slice 0 | No current old-provider keyword hit; stale `RESEND_API_KEY` setup comment was replaced with Cloudflare Email / recipient fixture wording. | No remaining action unless the setup note regresses. |
| `scripts/check-cloudflare-d1-auth-realtime-readiness.ts` | `keep-active-audit-tooling` | Old-provider detector regexes and package dependency checks. | Keep and allowlist as scanner logic. |
| `scripts/generate-cloudflare-migration-inventory.ts` | `keep-active-audit-tooling` | Supabase/Vercel detector signatures. | Keep and allowlist as migration inventory tooling. |
| `scripts/generate-cloudflare-provider-exit-pack.ts` | `keep-active-audit-tooling` | Resend/provider detector signatures. | Keep and allowlist as provider-exit proof tooling. |
| `scripts/generate-provider-cleanup-allowlist.ts` | `keep-active-audit-tooling` | Provider-cleanup allowlist detector signatures and classification fixtures. | Keep and allowlist as the generated report tooling. |
| `supabase/migration-evidence/provider-parity-proofs/prove-project-activity-route-browser.mjs` | Archived in Slice A | No active `scripts/` hit; historical file imports `@supabase/supabase-js` and requires Supabase env inside the `supabase/**` archaeology tree. | Keep as migration evidence only; do not run, apply, or extend. |
| `supabase/migration-evidence/provider-parity-proofs/prove-project-dashboard-route-browser.mjs` | Archived in Slice A | No active `scripts/` hit; historical file requires Supabase env inside the `supabase/**` archaeology tree. | Keep as migration evidence only; do not run, apply, or extend. |
| `supabase/migration-evidence/provider-parity-proofs/prove-recipient-proposals-browser.mjs` | Archived in Slice A | No active `scripts/` hit; historical file imports `@supabase/supabase-js` and requires Supabase env inside the `supabase/**` archaeology tree. | Keep as migration evidence only; do not run, apply, or extend. |
| `supabase/migration-evidence/provider-parity-proofs/prove-shared-link-current-preview-smoke.ts` | Archived in Slice A | No active `scripts/` hit; historical file imports Supabase client and historical `Database`/`Json` types inside the `supabase/**` archaeology tree. | Keep as migration evidence only; replace with a Cloudflare/D1 proof only if a current hosted claim requires it. |
| `supabase/migration-evidence/provider-parity-proofs/prove-shared-link-duplicate-decision-race-http.ts` | Archived in Slice A | No active `scripts/` hit; historical file imports Supabase client and historical `Database` type inside the `supabase/**` archaeology tree. | Keep as migration evidence only; replace with a Cloudflare/D1 proof only if a current hosted claim requires it. |
| `supabase/migration-evidence/provider-parity-proofs/prove-shared-link-hosted-password-route.ts` | Archived in Slice A | No active `scripts/` hit; historical file uses dynamic `@supabase/supabase-js`, Supabase env, and historical `Database` type inside the `supabase/**` archaeology tree. | Keep as migration evidence only; replace with Cloudflare-hosted password-route proof only if the claim is still needed. |
| `supabase/migration-evidence/provider-parity-proofs/prove-shared-link-hosted-recipient-activity.ts` | Archived in Slice A | No active `scripts/` hit; historical file imports Supabase client and historical `Database`/`Json` types inside the `supabase/**` archaeology tree. | Keep as migration evidence only; replace with Cloudflare-hosted recipient/activity proof only if the claim is still needed. |
| `supabase/migration-evidence/provider-parity-proofs/seed-shared-link-smoke.ts` | Archived in Slice A | No active `scripts/` hit; historical file uses dynamic `@supabase/supabase-js` and Supabase service-role env inputs inside the `supabase/**` archaeology tree. | Keep as migration evidence only; replace with a D1 seed flow only if current smoke proof needs it. |
| `scripts/verify-upload-alert-delivery.ts` | Cleared in Slice 0 | No current old-provider keyword hit; Vercel production fallback was removed in favor of `ARCH_UPLOAD_ALERT_DELIVERY_HOSTED_OBSERVED`. | Keep the focused proof-script regression test; no provider proof is implied. |
| `src/lib/supabase/types.ts` | Deleted in Slice D3 | Historical banner mentioned `@supabase/supabase-js`; the current generated inventory reports `0` deletion-blocking files and `4` non-blocking guard/audit-tooling references elsewhere. | Keep deleted. Preserve focused scanner/type-reference tests and do not claim provider-exit readiness from local deletion alone. |
| `tests/vitest/ai-audit-schema.test.ts` | `keep-active-negative-assertion` | Negative source assertion plus current D1 audit migration/source assertions after Slice D2. | Keep; preserve no-service-role assertion. |
| `tests/vitest/ai-package-builder-security-contract.test.ts` | `keep-active-negative-assertion` | Asserts AI package builder code has no service-role/client path. | Keep or fold into central provider-exit scanner. |
| `tests/vitest/auth-account-audit-d1-store.test.ts` | `keep-active-negative-assertion` | Asserts D1 store does not import Supabase/client/type path. | Keep. |
| `tests/vitest/auth-account-data-contract.test.ts` | `keep-active-negative-assertion` | Asserts account audit source avoids service-role/client persistence. | Keep. |
| `tests/vitest/auth-account-data-schema.test.ts` | `keep-active-negative-assertion` | Current D1 schema/source assertions plus no Supabase/service-role source assertion after Slice D2. | Keep. |
| `tests/vitest/auth-account-settings-d1-store.test.ts` | `keep-active-negative-assertion` | Asserts account settings actions/store use D1 and not Supabase clients. | Keep. |
| `tests/vitest/auth-magic-link.test.ts` | `keep-active-negative-assertion` | Asserts dev auth/session/proxy/env example avoid Supabase service-role/anon env. | Keep. |
| `tests/vitest/auth-proxy.test.ts` | `compatibility-guard` | Mocks `@supabase/ssr` and stubs Supabase env to prove Better Auth/proxy paths do not create clients. | Keep until historical proxy compatibility guard is replaced. |
| `tests/vitest/auth-sensitive-api-boundaries.test.ts` | `compatibility-guard`, `keep-active-security-fixture` | Mocks Supabase modules/env while asserting sensitive APIs use D1/current boundaries. | Keep or replace mocks with generic sentinel modules. |
| `tests/vitest/closed-beta-env-manifest.test.ts` | `keep-active-negative-assertion` | Asserts `.env.example` has no Supabase/Resend keys. | Keep. |
| `tests/vitest/cloudflare-better-auth-proof-script.test.ts` | `keep-active-audit-tooling-test` | Fixture source includes Supabase auth calls/imports so the proof script can classify migration state. | Keep and allowlist as scanner fixture. |
| `tests/vitest/cloudflare-d1-auth-realtime-readiness-script.test.ts` | `keep-active-audit-tooling-test` | Fixture package/source references old Supabase client/service-role patterns. | Keep and allowlist as readiness-scanner fixture. |
| `tests/vitest/cloudflare-migration-inventory-script.test.ts` | `keep-active-audit-tooling-test` | Fixture source imports `@supabase/ssr`. | Keep and allowlist as inventory scanner fixture. |
| `tests/vitest/collaboration-invitation-d1-store.test.ts` | `keep-active-negative-assertion` | Asserts invitation flow avoids Supabase service-role/RPC path. | Keep. |
| `tests/vitest/estimate-image-url.test.ts` | `keep-active-security-fixture` | Legacy Supabase storage URL is an unsafe image URL example. | Keep or replace with generic legacy-public-storage fixture of equal strength. |
| `tests/vitest/estimate-sheet-user-preferences.test.ts` | `keep-active-negative-assertion` | Asserts user-preferences actions/store avoid Supabase clients/RPC. | Keep. |
| `tests/vitest/legal-terms-d1-store.test.ts` | `keep-active-negative-assertion` | Asserts terms paths avoid service-role/Supabase type imports. | Keep. |
| `tests/vitest/mass-deletion-action-contract.test.ts` | `keep-active-negative-assertion` | Asserts mass-deletion actions avoid old service-role/RPC cleanup path. | Keep. |
| `supabase/migration-evidence/provider-parity-proofs/tests/notification-rls-proof.test.ts` | Archived in Slice A2 | No active `tests/vitest/` hit; historical gated Supabase RLS proof with direct client imports/env now lives inside the `supabase/**` archaeology tree. | Keep as migration evidence only; replace with D1/app-authz proof only if a current claim requires it. |
| `tests/vitest/notifications-actions.test.ts` | `keep-active-negative-assertion` | Asserts notification actions/repository avoid Supabase service-role/client path. | Keep. |
| `tests/vitest/project-collaboration-actions.test.ts` | `keep-active-negative-assertion` | Asserts collaboration actions avoid Supabase invite/RPC path. | Keep. |
| `tests/vitest/project-collaboration-realtime.test.ts` | `keep-active-negative-assertion` | Asserts realtime identity code avoids Supabase service-role. | Keep. |
| `tests/vitest/project-d1-audit.test.ts` | `keep-active-negative-assertion` | Asserts project D1 audit avoids Supabase service-role/client path. | Keep. |
| `tests/vitest/project-invite-entry-route.test.ts` | `keep-active-negative-assertion` | Asserts invite entry route avoids Supabase client/env path. | Keep. |
| `tests/vitest/project-publication-page.test.tsx` | Cleared in current worktree / verified in Slice 0 | No current old-provider keyword hit; stale `NEXT_PUBLIC_SUPABASE_URL` test env scaffolding is absent after a concurrent dirty-worktree change verified by this continuation. | Keep focused publication-page coverage. |
| `tests/vitest/project-publication-public-repository.test.ts` | `keep-active-negative-assertion` | Asserts public repository avoids Supabase client/service-role. | Keep. |
| `tests/vitest/project-publication-resolved-ids.test.ts` | Cleared in Slice 0 | No current old-provider keyword hit; stale Supabase env scaffolding was removed from D1-admin-client mock tests. | Keep focused publication resolved-id coverage. |
| `tests/vitest/project-publication-rotate-resend.test.ts` | Cleared in Slice 0 | No current old-provider keyword hit; stale Supabase env scaffolding was removed from publication rotate/resend tests. | Keep focused rotate/resend coverage. |
| `tests/vitest/project-publication-security-hardening.test.ts` | Cleared in Slice 0 | No current old-provider keyword hit; stale Supabase env scaffolding was removed while preserving HMAC and recipient-scope coverage. | Keep focused publication security-hardening coverage. |
| `tests/vitest/project-publication-snapshot.test.ts` | `keep-active-security-fixture` | Legacy Supabase storage URL used to prove public snapshot image sanitization. | Keep or replace with generic legacy-public-storage fixture. |
| `tests/vitest/provider-exit-pack-script.test.ts` | `keep-active-audit-tooling-test` | Fixture files include Supabase and Vercel strings for provider-exit report behavior. | Keep and allowlist as provider-exit scanner fixture. |
| `tests/vitest/publisher-page-contract.test.ts` | `keep-active-negative-assertion` | Asserts publisher page/repository avoid service-role. | Keep. |
| `tests/vitest/publisher-roster-repository.test.ts` | `keep-active-negative-assertion` | Asserts publisher roster repository avoids service-role. | Keep. |
| `tests/vitest/recipient-proposals-route-gate.test.ts` | `keep-active-negative-assertion` | Asserts route gate does not expose service-role/encrypted token details. | Keep. |
| `tests/vitest/redact.test.ts` | `keep-active-security-fixture` | Uses `SUPABASE_SERVICE_ROLE_KEY` as a secret-redaction fixture. | Keep or replace with generic secret-name fixture of equal strength. |
| `tests/vitest/security-findings-auth-contracts.test.ts` | `keep-active-negative-assertion` | Asserts auth/session code avoids Supabase client path. | Keep. |
| `supabase/migration-evidence/provider-parity-proofs/tests/shared-link-smoke-seed-script.test.ts` | Archived in Slice A | No active `tests/vitest/` hit; historical test exercises the archived Supabase-backed smoke seed script. | Keep as migration evidence only; do not run as active Vitest coverage. |
| `supabase/migration-evidence/provider-parity-proofs/tests/shared-link-hosted-password-route-proof-script.test.ts` | Archived in Slice A | No active `tests/vitest/` hit; historical test directly imports the archived hosted password-route proof script. | Keep as migration evidence only; do not run as active Vitest coverage. |
| `tests/vitest/terms-gate-direct-callers.test.ts` | `compatibility-guard` | Mocks Supabase modules to assert direct protected callers do not use them before terms acceptance. | Keep until replaced with generic no-provider-call guard. |
| `tests/vitest/upload-component-image-backfill.test.ts` | `keep-active-security-fixture`, `migration-archaeology` | Legacy Supabase storage URLs used for backfill/snapshot classification behavior. | Keep as migration/sanitization coverage or replace with generic legacy-public-storage fixtures. |
| `tests/vitest/upload-operations-runbook-local-proof-script.test.ts` | `keep-active-negative-assertion` | Asserts local proof script avoids service-role. | Keep. |
| `tests/vitest/upload-scan-override-ui.test.tsx` | `keep-active-negative-assertion` | Asserts upload override UI/actions avoid Supabase/service-role. | Keep. |
| `tests/vitest/upload-session-capacity-provider-proof.test.ts` | `keep-active-negative-assertion` | Asserts serialized provider proof does not expose service-role. | Keep or archive with provider-proof evidence after replacement. |
| `tests/vitest/upload-signed-route.test.ts` | `keep-active-negative-assertion` | Asserts upload signed route avoids Supabase client/service-role. | Keep. |
| `supabase/migration-evidence/provider-parity-proofs/tests/upload-storage-denial-proof.test.ts` | Archived in Slice A2 | No active `tests/vitest/` hit; historical linked-provider storage-denial proof artifact/env-name validation now lives inside the `supabase/**` archaeology tree. | Keep as migration evidence only; replace with Cloudflare/R2 denial proof only if a current claim requires it. |
| `tests/vitest/vercel-analytics-removed.test.ts` | `keep-active-negative-assertion` | Asserts Vercel analytics/speed-insights packages/layout references are absent. | Keep. |
| `tests/vitest/with-action-errors.test.ts` | `keep-active-security-fixture` | Uses `SUPABASE_SERVICE_ROLE_KEY` in an error-redaction fixture. | Keep or replace with generic secret-name fixture of equal strength. |

## Secondary Type-Reference Inventory

Slice D2/D3 regenerated the current source of truth for active `src/lib/supabase/types.ts` path references:

- Raw active path-reference files outside `supabase/**`: `4`
- Deletion-blocking files: `0`
- Non-blocking negative-guard/audit-tooling files: `4`
- Unknown references: `0`
- `typeReferenceDeletionReady`: `true`
- Evidence: `evidence/2026-07-04-supabase-type-reference-retirement-inventory.{json,md}`

Current deletion-blocking files: none.

Current non-blocking path-reference files:

- `scripts/generate-supabase-type-reference-retirement-inventory.ts` (`retirement-audit-tooling`)
- `tests/vitest/legal-terms-d1-store.test.ts` (`negative-import-guard`)
- `tests/vitest/project-estimate-list-row-contract.test.ts` (`negative-import-guard`)
- `tests/vitest/supabase-type-reference-retirement-inventory-script.test.ts` (`retirement-audit-tooling`)

Historical note: after Slice A/A2, the active type-reference scan still returned `34` files. Slice D1 moved low-risk project-page fixture imports to current `src/lib/types/database` shapes and moved estimate-tree/proposal grouping fixtures to current workspace-repository query row types. Slice D2 moved the remaining deletion-blocking shared-link, publication/collaboration/invite/activity, mass-deletion, and component-library schema/source-read tests to D1/current source contracts. Slice D3 deleted the historical type file itself. Those migrated files are no longer listed in the current raw scan.

## Implementation Order

1. Treat the low-risk stale text/scaffold Slice 0 in `28` as locally cleared. Do not reuse that result to claim final provider cleanup.
2. Treat the Slice A stale proof-utility archive as complete for the eight moved proof scripts and two moved direct tests, and treat Slice A2 as complete for the two remaining provider-only proof tests archived under `supabase/**`.
3. Treat Slice B/D3 as the current allowlist proof for active audit tooling, scanner tests, negative assertions, compatibility guards, and redaction/sanitization fixtures. Re-run it after any further cleanup.
4. Continue from the Slice D3 baseline: keep the deletion-blocker count at zero, keep `src/lib/supabase/types.ts` deleted, and treat provider-exit/hosted/operator/final-review proof as separate remaining gates.

## Completion Boundary

This document proves classification coverage for the current scan, not cleanup completion. `RISK-007` remains open until:

- every `cleanup-candidate` is changed, archived, or explicitly waived; Slice B currently reports zero cleanup candidates,
- every retained old-provider string or provider-boundary reference is allowlisted with disposition and owner intent; Slice B/D3 plus the scoped scanner-review fix currently covers all `89` broadened active-surface provider-boundary hit files,
- active runtime/source import/env scans pass under the final provider-exit proof criteria,
- `src/lib/supabase/types.ts` stays deleted and the four remaining path references stay non-blocking guard/audit-tooling references,
- provider-exit pack/CI proof is ready from the post-cleanup tree; the current regenerated pack still has five blockers,
- hosted/provider-dashboard/operator proof is gathered or explicitly accepted as unnecessary for the final claim, with legal/privacy approval where the outer launch/auth goal requires it and final review.

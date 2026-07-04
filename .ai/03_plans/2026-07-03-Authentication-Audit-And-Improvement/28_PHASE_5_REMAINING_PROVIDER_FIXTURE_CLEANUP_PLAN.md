# 28 - Phase 5 Remaining Provider Fixture Cleanup Plan

**Date:** 2026-07-04
**Status:** Follow-up implementation-planning artifact plus Slice 0, Slice A, Slice A2, Slice B, Slice D type-reference deletion-readiness, and Slice D3 historical type-file deletion local implementation/evidence.
**Verification mode:** `same-agent` for this continuation. Two read-only native `explore` subagents were attempted for scripts/tests classification, but both failed immediately on the Spark model usage limit, so this artifact does not claim independent classification evidence.

## Objective

Record the former Phase 5 provider-string blocker from `26` and `27` as an exact cleanup packet and local classification ledger. The resolved local slices distinguish stale Supabase/Vercel/Resend proof utilities from intentional negative assertions and provider-exit scanners without weakening security/redaction coverage or claiming provider-dashboard proof from local scans. For this provider-cleanup slice, remaining proof gates are provider-exit, hosted, operator, and final review; the outer auth goal also keeps legal/privacy gates open for launch-level claims.

This artifact is planning-package work only. It does not authorize provider mutation, secret reads, deployment, browser proof, or broad application source edits.

## Current Revalidation

Fresh scan command:

```bash
rg -l "@supabase/|supabase-js|NEXT_PUBLIC_SUPABASE|SUPABASE_SERVICE_ROLE|@vercel/|VERCEL_|RESEND_API_KEY" src scripts e2e tests --glob '!supabase/**' --glob '!.ai/**' | sort
```

Original auth-follow-up result: `60` files contained old-provider strings outside `supabase/**`.

`29_PHASE_5_PROVIDER_STRING_FILE_INVENTORY.md` is the full file-level companion for this scan. It classifies all original `60` hit files, records the original `38` pre-Slice-A consumers of the historical `src/lib/supabase/types.ts` reference, records the `34` active consumers after Slice A/A2, records the Slice D0/D1 intermediate `22` raw / `18` blocker inventory, records the regenerated Slice D inventory for the current `4` non-blocking path-reference files, and records Slice D3 deletion of the historical type file plus a current `44`-file narrow keyword scan and `89`-file broadened provider-boundary allowlist pass.

2026-07-04 historical continuation recheck: the same primary scan returned `60` files, and the secondary type-reference scan returned `38` files. A direct caller check for the stale proof utilities found two active non-archive Vitest importers that were queued to move/delete/rewrite with their scripts in Slice A:

- `tests/vitest/shared-link-smoke-seed-script.test.ts` imports `scripts/seed-shared-link-smoke.ts`.
- `tests/vitest/shared-link-hosted-password-route-proof-script.test.ts` imports `scripts/prove-shared-link-hosted-password-route.ts`.

Other direct hits from the caller check are script self-usage/help text or `.ai` historical/archival references; they are evidence for archaeology, not proof that those scripts can be moved independently.

2026-07-04 Slice 0 historical implementation recheck: the low-risk stale text/scaffold slice was locally cleared, including worktree verification of the publication-page env stub removal that was deferred during the first pass and then arrived via concurrent dirty-worktree changes. The primary old-provider string scan returned `54` files, the secondary historical type-reference scan returned `38` files, and the stale shared-link proof-utility caller check was unchanged at that checkpoint. Slice 0 updated or verified:

- `e2e/shared-link-receiver.spec.ts`
- `scripts/verify-upload-alert-delivery.ts`
- `tests/vitest/upload-alert-delivery-proof-script.test.ts`
- `tests/vitest/project-publication-page.test.tsx`
- `tests/vitest/project-publication-resolved-ids.test.ts`
- `tests/vitest/project-publication-rotate-resend.test.ts`
- `tests/vitest/project-publication-security-hardening.test.ts`

No stale proof utilities, provider dashboards, deployments, migrations, package manifests, secrets, or hosted runtime state were changed.

2026-07-04 Slice A archive recheck: the stale Supabase-backed proof utilities named below were moved out of active `scripts/` and their two direct Vitest importers were moved out of active `tests/vitest/` into `supabase/migration-evidence/provider-parity-proofs/`. The primary old-provider keyword scan now returns `45` files outside `supabase/**`, the secondary historical type-reference scan now returns `34` files, and the focused active caller check across `package.json`, `scripts`, `tests`, `e2e`, and `.github` returns no matches for the archived utility names outside `supabase/**`.

2026-07-04 Slice A2 archive recheck: the remaining two provider-only proof tests from this packet, `tests/vitest/notification-rls-proof.test.ts` and `tests/vitest/upload-storage-denial-proof.test.ts`, were moved under `supabase/migration-evidence/provider-parity-proofs/tests/`. At that checkpoint, the primary old-provider keyword scan returned `45` files outside `supabase/**`, and the secondary historical type-reference scan returned `34` active files. Remaining non-archive references to those two test names are provider-cleanup allowlist/scanner fixtures, not direct imports of the archived tests. This was a cleanup-slice improvement only; later Slice D/D3 work superseded the historical type-reference retirement blocker, while final provider-cleanup/provider-exit proof remains open for provider-exit pack/CI proof, hosted/provider-dashboard/operator evidence, outer-goal legal/privacy gates where applicable, and final review.

2026-07-04 Slice B allowlist recheck: `scripts/generate-provider-cleanup-allowlist.ts` generated JSON and Markdown evidence for the then-current provider-string inventory. The report classified all `45` then-current old-provider keyword hit files, reported zero active-runtime blockers, zero cleanup candidates, and zero unclassified files, and set `activeRuntimeProviderReferencesReady=true`, `allProviderStringsClassified=true`, and `providerCleanupAllowlistReady=true`. At that checkpoint, the final-cleanup flag was still false because `src/lib/supabase/types.ts` remained a `type-reference-retirement` blocker with `34` active consumers, and because provider-exit pack/CI, hosted/provider-dashboard/operator proof, and final independent review remained separate gates. Slice D0/D1 superseded that checkpoint with an intermediate `22` raw / `18` deletion-blocking inventory, Slice D2 superseded it with `4` raw / `0` deletion-blocking references, and Slice D3 superseded the final historical-file blocker.

2026-07-04 Slice D0 type-reference inventory recheck: `scripts/generate-supabase-type-reference-retirement-inventory.ts` added JSON and Markdown evidence for the `src/lib/supabase/types.ts` path-reference graph. At that checkpoint the raw path-reference scan returned `22` files in the dirty checkout after direct type-fixture migration work plus the new inventory tooling. The report classified all `22`, reported `18` deletion-blocking files, separated `4` non-blocking negative-guard/audit-tooling files, and had zero unknown references. It intentionally kept `typeReferenceDeletionReady=false` because the historical type file still had source-read/type-import/existence blockers.

2026-07-04 Slice D1 direct type-import migration recheck: low-risk project-page fixture tests now import `ProjectRow` from `src/lib/types/database` instead of `Tables<"projects">`, and estimate-tree/proposal grouping fixtures now use current workspace-repository query row types instead of historical Supabase table types. At that checkpoint, the raw path-reference scan remained `22` files after inventory tooling/negative guards were counted, and the generated inventory still reported `18` true deletion blockers. Focused validation passed the direct-import migration Vitest suite (`14` files / `110` tests), the inventory-script suite (`1` file / `3` tests), and high-memory TypeScript check.

2026-07-04 Slice D final blocker migration recheck: the remaining deletion-blocking schema-source-read, file-existence, and P3 type-import tests were migrated to active D1 migration/source assertions. The raw path-reference scan now returns `4` files, all non-blocking negative guards or audit tooling; the regenerated inventory reports `deletionBlockingFileCount=0`, `unknown-reference=0`, and `typeReferenceDeletionReady=true`. Focused validation passed the migrated Vitest suite (`17` files / `136` tests), the Bun P3 shared-link migration suite (`2` tests), the inventory-script suite (`1` file / `3` tests), the provider-cleanup allowlist suite (`1` file / `4` tests), and high-memory TypeScript check.

2026-07-04 Slice D3 historical type-file deletion recheck: `src/lib/supabase/types.ts` was deleted after the active deletion-blocking consumers reached zero. The narrow old-provider keyword scan now classifies `44` keyword-hit files. A scoped independent code-review then found the allowlist scanner was too narrow for broader Supabase boundary references such as `SUPABASE_DB_URL`, `SUPABASE_PROJECT_ID`, `@/lib/supabase`, `createSupabase*`, and `supabase db`; the scanner and focused test were broadened, and the regenerated provider-cleanup allowlist now classifies `89` active-surface hit files with zero active-runtime blockers, zero cleanup candidates, zero unclassified files, zero type-reference-retirement files, and `finalProviderCleanupReady=true`. The regenerated type-reference inventory still reports `4` non-blocking guard/audit-tooling path references and `typeReferenceDeletionReady=true`. The regenerated provider-exit pack reports `activeLegacyProviderRuntimeBlockers=0` but keeps `providerExitReady=false` with five external/operator/hosted blockers.

The current broad string scan is useful as a discovery net, but it is too blunt to be the final proof by itself because it catches:

- remaining Supabase-backed proof tests or any future stale proof utilities that should be archived or deleted,
- active Cloudflare provider-exit and migration-inventory scanners that must mention old-provider strings,
- tests that intentionally assert old-provider imports/secrets are absent from current source,
- redaction fixtures that intentionally use old provider key names as credential-adjacent examples,
- guard/audit-tooling references to the retired `src/lib/supabase/types.ts` path. The historical type file itself is now deleted.

## Disposition Buckets

| Bucket | Files | Classification | Safe next action | Required validation |
|---|---|---|---|---|
| Stale Supabase-backed proof utilities in `scripts/` | Archived in Slice A: `prove-recipient-proposals-browser.mjs`, `prove-project-activity-route-browser.mjs`, `prove-project-dashboard-route-browser.mjs`, `prove-shared-link-current-preview-smoke.ts`, `prove-shared-link-duplicate-decision-race-http.ts`, `prove-shared-link-hosted-password-route.ts`, `prove-shared-link-hosted-recipient-activity.ts`, and `seed-shared-link-smoke.ts` now live under `supabase/migration-evidence/provider-parity-proofs/` | Archived migration archaeology | Keep archived as historical provider evidence; do not run, apply, or extend from `supabase/**`. Replace with Cloudflare/D1 proof only when the hosted claim is still required | Active caller check for the archived utility names across `package.json`, `scripts`, `tests`, `e2e`, and `.github` excluding `supabase/**`; current check returns no matches |
| Active provider-exit / migration scanners | `scripts/check-cloudflare-d1-auth-realtime-readiness.ts`, `scripts/generate-cloudflare-migration-inventory.ts`, `scripts/generate-cloudflare-provider-exit-pack.ts`, `scripts/generate-provider-cleanup-allowlist.ts` | `keep-active-audit-tooling` | Keep. These files must mention old-provider strings to detect regressions. Final proof should allowlist them by file and purpose rather than requiring zero raw string hits | Unit tests for the scanner scripts, provider-exit pack generation, and the Slice B allowlist report proving no active runtime import remains |
| Vercel-era production signal fallback | `scripts/verify-upload-alert-delivery.ts` | Cleared in Slice 0 | Replaced the Vercel production fallback with the Cloudflare/current-hosted proof flag only; the direct importer test now proves legacy hosting env vars do not satisfy hosted-observation proof | Focused upload alert delivery proof-script Vitest plus static target scan |
| Historical type-shape reference | `src/lib/supabase/types.ts` | `deleted-retired-type-reference` | Deleted in Slice D3 after active deletion-blocking consumers were migrated. Keep the four non-blocking guard/audit-tooling references intentional; do not claim provider-exit completion from this local cleanup proof | `bun run scripts/generate-supabase-type-reference-retirement-inventory.ts`; `rg "src/lib/supabase/types|@/lib/supabase/types" src tests e2e scripts`; typecheck after deletion/migration |
| Stale E2E setup comment | `e2e/shared-link-receiver.spec.ts` | Cleared in Slice 0 | Updated the setup note to Cloudflare Email / recipient-flow fixture wording | No runtime test required for the comment-only change; `git diff --check` |
| Supabase-backed proof tests | Archived in Slice A: `shared-link-smoke-seed-script.test.ts` and `shared-link-hosted-password-route-proof-script.test.ts`; archived in Slice A2: `notification-rls-proof.test.ts` and `upload-storage-denial-proof.test.ts`. All four now live under `supabase/migration-evidence/provider-parity-proofs/tests/`. | Archived migration archaeology | Keep archived tests as historical evidence only; do not run them as active Vitest coverage. Replace with Cloudflare/D1/R2 proofs only when a current hosted claim requires it | Active import/caller scan for the archived tests outside `supabase/**`; Slice B scanner/allowlist suite and regenerated allowlist artifact |
| Negative assertion tests | Examples: `tests/vitest/project-invite-entry-route.test.ts`, `tests/vitest/estimate-sheet-user-preferences.test.ts`, `tests/vitest/project-collaboration-actions.test.ts`, `tests/vitest/upload-signed-route.test.ts`, `tests/vitest/vercel-analytics-removed.test.ts` | `keep-active-negative-assertion` | Keep unless replaced by a central provider-exit scanner. These strings are the assertion payload, not active provider use | The test itself is validation. Final proof should treat these as allowlisted negative assertions, not cleanup failures |
| Redaction / secret-safety fixtures | Examples: `tests/vitest/redact.test.ts`, `tests/vitest/with-action-errors.test.ts`, `tests/vitest/auth-sensitive-api-boundaries.test.ts` | `keep-active-security-fixture` | Keep when the old key name is intentionally used as a credential-adjacent leak example. Optionally migrate to generic key names only if the security tests stay equally strong | Focused redaction/security tests |
| Provider-exit and migration inventory tests | Examples: `tests/vitest/provider-exit-pack-script.test.ts`, `tests/vitest/cloudflare-migration-inventory-script.test.ts`, `tests/vitest/cloudflare-d1-auth-realtime-readiness-script.test.ts`, `tests/vitest/cloudflare-better-auth-proof-script.test.ts`, `tests/vitest/provider-cleanup-allowlist-script.test.ts` | `keep-active-audit-tooling-test` | Keep. These tests must include old-provider strings to verify scanners catch regressions | Focused scanner-script Vitest suite |
| Env absence / package absence tests | Examples: `tests/vitest/closed-beta-env-manifest.test.ts`, `tests/vitest/vercel-analytics-removed.test.ts` | `keep-active-negative-assertion` | Keep as current Cloudflare-first regression tests | Existing focused Vitest slice |

## Implementation Slice Plan

### Slice 0 - First Low-Risk Stale Text And Scaffold Handoff

This was the first implementation slice. It is intentionally smaller than Slice A so it can land in a dirty shared checkout without touching the stale Supabase-backed proof utilities or their dependent proof tests.

Implementation status: this low-risk stale text/scaffold slice has landed locally. Broader stale proof-utility archival, dependent proof-test migration, and `src/lib/supabase/types.ts` retirement were separate slices; the type-reference deletion-blocking consumer migration is complete, and Slice D3 completed the historical file deletion.

Scope:

- `e2e/shared-link-receiver.spec.ts`: rewrote the stale `RESEND_API_KEY` setup comment so it refers to Cloudflare Email / seeded recipient fixtures only when that flow is actually exercised.
- `tests/vitest/project-publication-page.test.tsx`: verified the current-worktree removal of the stale `NEXT_PUBLIC_SUPABASE_URL` env stub from a concurrent dirty change and preserved the current publication-page coverage.
- `tests/vitest/project-publication-resolved-ids.test.ts`, `tests/vitest/project-publication-rotate-resend.test.ts`, and `tests/vitest/project-publication-security-hardening.test.ts`: removed stale Supabase env stubs while preserving D1-admin-client, HMAC, recipient-scope, and publication security assertions.
- `scripts/verify-upload-alert-delivery.ts`: replaced the `VERCEL=1` / `VERCEL_ENV=production` hosted-observation fallback with the existing Cloudflare/current-hosted proof flag (`ARCH_UPLOAD_ALERT_DELIVERY_HOSTED_OBSERVED`), and updated `tests/vitest/upload-alert-delivery-proof-script.test.ts` to prove legacy hosting env vars do not satisfy hosted observation.

Pre-edit characterization:

```bash
rg -n "RESEND_API_KEY|NEXT_PUBLIC_SUPABASE|SUPABASE_SERVICE_ROLE|VERCEL=|VERCEL_ENV" \
  e2e/shared-link-receiver.spec.ts \
  tests/vitest/project-publication-page.test.tsx \
  tests/vitest/project-publication-resolved-ids.test.ts \
  tests/vitest/project-publication-rotate-resend.test.ts \
  tests/vitest/project-publication-security-hardening.test.ts \
  scripts/verify-upload-alert-delivery.ts \
  tests/vitest/upload-alert-delivery-proof-script.test.ts
```

Validation for this first slice:

```bash
bunx vitest run --maxWorkers=1 \
  tests/vitest/project-publication-page.test.tsx \
  tests/vitest/project-publication-resolved-ids.test.ts \
  tests/vitest/project-publication-rotate-resend.test.ts \
  tests/vitest/project-publication-security-hardening.test.ts \
  tests/vitest/upload-alert-delivery-proof-script.test.ts
git diff --check -- \
  e2e/shared-link-receiver.spec.ts \
  tests/vitest/project-publication-page.test.tsx \
  tests/vitest/project-publication-resolved-ids.test.ts \
  tests/vitest/project-publication-rotate-resend.test.ts \
  tests/vitest/project-publication-security-hardening.test.ts \
  scripts/verify-upload-alert-delivery.ts \
  tests/vitest/upload-alert-delivery-proof-script.test.ts
```

Slice 0 validation already run:

```bash
bunx vitest run --maxWorkers=1 \
  tests/vitest/project-publication-page.test.tsx \
  tests/vitest/project-publication-resolved-ids.test.ts \
  tests/vitest/project-publication-rotate-resend.test.ts \
  tests/vitest/project-publication-security-hardening.test.ts \
  tests/vitest/upload-alert-delivery-proof-script.test.ts
rg -n "RESEND_API_KEY|NEXT_PUBLIC_SUPABASE|SUPABASE_SERVICE_ROLE|VERCEL=|VERCEL_ENV" \
  e2e/shared-link-receiver.spec.ts \
  tests/vitest/project-publication-page.test.tsx \
  tests/vitest/project-publication-resolved-ids.test.ts \
  tests/vitest/project-publication-rotate-resend.test.ts \
  tests/vitest/project-publication-security-hardening.test.ts \
  scripts/verify-upload-alert-delivery.ts \
  tests/vitest/upload-alert-delivery-proof-script.test.ts
git diff --check -- \
  e2e/shared-link-receiver.spec.ts \
  scripts/verify-upload-alert-delivery.ts \
  tests/vitest/upload-alert-delivery-proof-script.test.ts \
  tests/vitest/project-publication-page.test.tsx \
  tests/vitest/project-publication-resolved-ids.test.ts \
  tests/vitest/project-publication-rotate-resend.test.ts \
  tests/vitest/project-publication-security-hardening.test.ts
```

Results: the full Slice 0 suite passed `5` Vitest files / `80` tests; the target old-provider literal scan returned no matches; `git diff --check` passed for the touched files. The `tests/vitest/project-publication-page.test.tsx` source edit was already present in the dirty worktree from a concurrent change and was verified here rather than reverted or reauthored.

Out of scope for Slice 0:

- Moving, deleting, archiving, or rewriting `scripts/seed-shared-link-smoke.ts`, `scripts/prove-shared-link-hosted-password-route.ts`, or their direct Vitest importers. This was handled later by Slice A.
- Provider-exit/hosted/operator/final-review proof. Historical `src/lib/supabase/types.ts` deletion is now complete.
- Claiming final provider-cleanup/provider-exit proof from a reduced string count alone.
- Running provider dashboards, deployments, browser proof, or hosted mutations.

### Slice A - Scripts And Proof Utilities

Slice A implementation status: archived the eight stale Supabase-backed proof utilities and the two direct dependent Vitest tests under `supabase/migration-evidence/provider-parity-proofs/`. The active caller check for the archived utility names now returns no matches outside `supabase/**`.

Archived script paths:

- `supabase/migration-evidence/provider-parity-proofs/prove-recipient-proposals-browser.mjs`
- `supabase/migration-evidence/provider-parity-proofs/prove-project-activity-route-browser.mjs`
- `supabase/migration-evidence/provider-parity-proofs/prove-project-dashboard-route-browser.mjs`
- `supabase/migration-evidence/provider-parity-proofs/prove-shared-link-current-preview-smoke.ts`
- `supabase/migration-evidence/provider-parity-proofs/prove-shared-link-duplicate-decision-race-http.ts`
- `supabase/migration-evidence/provider-parity-proofs/prove-shared-link-hosted-password-route.ts`
- `supabase/migration-evidence/provider-parity-proofs/prove-shared-link-hosted-recipient-activity.ts`
- `supabase/migration-evidence/provider-parity-proofs/seed-shared-link-smoke.ts`

Archived dependent test paths:

- `supabase/migration-evidence/provider-parity-proofs/tests/shared-link-smoke-seed-script.test.ts`
- `supabase/migration-evidence/provider-parity-proofs/tests/shared-link-hosted-password-route-proof-script.test.ts`

Validation for this slice:

```bash
rg -n "prove-recipient-proposals-browser|prove-project-activity-route-browser|prove-project-dashboard-route-browser|prove-shared-link-current-preview-smoke|prove-shared-link-duplicate-decision-race-http|prove-shared-link-hosted-password-route|prove-shared-link-hosted-recipient-activity|seed-shared-link-smoke" package.json scripts tests e2e .github --glob '!supabase/**'
rg -l "@supabase/|supabase-js|NEXT_PUBLIC_SUPABASE|SUPABASE_SERVICE_ROLE|@vercel/|VERCEL_|RESEND_API_KEY" src scripts e2e tests --glob '!supabase/**' --glob '!.ai/**' | sort | wc -l
rg -l "src/lib/supabase/types|@/lib/supabase/types|\\.\\./.*lib/supabase/types|\\.\\./.*src/lib/supabase/types" src scripts tests --glob '!supabase/**' | sort | wc -l
```

Results: active caller scan returned no matches; primary old-provider keyword file count is `45`; historical type-reference consumer count is `34`; focused scanner/absence Vitest passed `5` files / `40` tests; `git diff --check` passed for the touched docs/state files; trailing-whitespace/conflict-marker scan had no matches for the touched docs and archived files.

Historical implementation instructions retained for context:

1. For each stale proof utility, run an import/caller check:

   ```bash
   rg -n "prove-recipient-proposals-browser|prove-project-activity-route-browser|prove-project-dashboard-route-browser|prove-shared-link-current-preview-smoke|prove-shared-link-duplicate-decision-race-http|prove-shared-link-hosted-password-route|prove-shared-link-hosted-recipient-activity|seed-shared-link-smoke" package.json scripts tests e2e .github .ai --glob '!supabase/**'
   ```

2. Archive scripts that are historical provider proof and not active Cloudflare tooling under `supabase/migration-evidence/provider-parity-proofs/`, or delete only when no artifact value remains.
3. Move/delete/rewrite dependent tests in the same commit/slice. Slice A archived `tests/vitest/shared-link-smoke-seed-script.test.ts` with `scripts/seed-shared-link-smoke.ts` and `tests/vitest/shared-link-hosted-password-route-proof-script.test.ts` with `scripts/prove-shared-link-hosted-password-route.ts`.
4. Preserve or replace any hosted proof still needed with a Cloudflare/D1-specific proof plan; do not silently drop hosted proof requirements.

### Slice A2 - Remaining Provider Proof Tests

Slice A2 implementation status: archived the two remaining provider-only proof tests from this cleanup packet under `supabase/migration-evidence/provider-parity-proofs/tests/`.

Archived dependent test paths:

- `supabase/migration-evidence/provider-parity-proofs/tests/notification-rls-proof.test.ts`
- `supabase/migration-evidence/provider-parity-proofs/tests/upload-storage-denial-proof.test.ts`

Validation for this slice:

```bash
rg -n "from [\"'].*notification-rls-proof|import .*notification-rls-proof|from [\"'].*upload-storage-denial-proof|import .*upload-storage-denial-proof|upload-storage-denial-proof\.test|notification-rls-proof\.test" package.json scripts tests e2e .github --glob '!supabase/**'
rg -l "@supabase/|supabase-js|NEXT_PUBLIC_SUPABASE|SUPABASE_SERVICE_ROLE|@vercel/|VERCEL_|RESEND_API_KEY" src scripts e2e tests --glob '!supabase/**' --glob '!.ai/**' | sort | wc -l
rg -l "src/lib/supabase/types|@/lib/supabase/types|\\.\\./.*lib/supabase/types|\\.\\./.*src/lib/supabase/types" src scripts tests --glob '!supabase/**' | sort | wc -l
```

Results before Slice B: the active import/caller scan found only provider-cleanup allowlist/scanner fixture references to the old active test paths, not direct imports; primary old-provider keyword file count was `45`; historical type-reference consumer count was `34`. Slice B then regenerated the provider-cleanup allowlist evidence from that current worktree state.

### Slice B - Intentional Old-Provider String Allowlist

Slice B implementation status: complete for the current provider-string classification gate. It added a non-destructive allowlist report script, focused tests, and regenerated JSON/Markdown evidence.

Artifacts:

- `scripts/generate-provider-cleanup-allowlist.ts`
- `tests/vitest/provider-cleanup-allowlist-script.test.ts`
- `evidence/2026-07-04-provider-cleanup-allowlist.json`
- `evidence/2026-07-04-provider-cleanup-allowlist.md`

Current report result after Slice D3 and the scoped allowlist review fix:

- Narrow old-provider keyword scan: `44` files
- Broadened provider-boundary allowlist: `totalHitFiles=89`
- `active-runtime-blocker=0`
- `cleanup-candidate=0`
- `unclassified=0`
- `type-reference-retirement=0`
- `providerCleanupAllowlistReady=true`
- `finalProviderCleanupReady=true`

The final local report now passes the provider-cleanup classification gate, and strict provider-cleanup mode passes after the scanner-review fix. This still does not prove provider-exit, hosted runtime, provider-dashboard, external persona, mailbox, or final-review gates.

### Slice D0 - Supabase Type Reference Inventory

Slice D0 implementation status: complete for the current type-reference classification gate. It added a non-destructive inventory report script, focused tests, and regenerated JSON/Markdown evidence.

Artifacts:

- `scripts/generate-supabase-type-reference-retirement-inventory.ts`
- `tests/vitest/supabase-type-reference-retirement-inventory-script.test.ts`
- `evidence/2026-07-04-supabase-type-reference-retirement-inventory.json`
- `evidence/2026-07-04-supabase-type-reference-retirement-inventory.md`

Checkpoint report result:

- `totalReferenceFiles=22`
- `deletionBlockingFileCount=18`
- `nonBlockingGuardFileCount=4`
- `unknown-reference=0`
- `allReferencesClassified=true`
- `negativeImportGuardsSeparated=true`
- `typeReferenceDeletionReady=false`

This checkpoint report split true deletion blockers from negative import guards and the inventory scanner/test fixture strings. Slice D2 supersedes it as the current deletion-blocker map.

### Slice D1 - Low-Risk Direct Type Import Migration

Slice D1 implementation status: complete for the low-risk direct import subset. It migrated project-page fixture tests from `Tables<"projects">` to the current `ProjectRow` type and migrated estimate-tree/proposal grouping fixtures to the current workspace-repository query row types.

Checkpoint report result after D1 regeneration:

- `totalReferenceFiles=22`
- `deletionBlockingFileCount=18`
- `nonBlockingGuardFileCount=4`
- `unknown-reference=0`
- `typeReferenceDeletionReady=false`

Validation run for this slice:

```bash
bunx vitest run --maxWorkers=1 \
  tests/vitest/perf/projects-page-render-baseline.test.tsx \
  tests/vitest/project-dashboard-client.test.tsx \
  tests/vitest/project-details-modal.test.tsx \
  tests/vitest/project-group-section.test.tsx \
  tests/vitest/projects-page-access-tabs.test.tsx \
  tests/vitest/projects-page-card-layout.test.tsx \
  tests/vitest/projects-page-create-optimistic.test.tsx \
  tests/vitest/projects-page-group-mode.test.tsx \
  tests/vitest/projects-page-organize-control.test.tsx \
  tests/vitest/projects-page-shared-access.test.tsx \
  tests/vitest/projects-page-sort-controls.test.tsx \
  tests/vitest/projects-page-view-mode.test.tsx \
  tests/vitest/proposal-export-tab-grouping.test.ts \
  tests/vitest/workspace-repository-estimate-tree.test.ts
bunx vitest run --maxWorkers=1 tests/vitest/supabase-type-reference-retirement-inventory-script.test.ts
bun run scripts/generate-supabase-type-reference-retirement-inventory.ts
NODE_OPTIONS=--max-old-space-size=8192 bun run type-check
```

Results: the direct-import migration suite passed `14` files / `110` tests, the inventory-script suite passed `1` file / `3` tests, the regenerated report classified all `22` current path-reference files with zero unknown references, and high-memory TypeScript check passed.

### Slice D2 - Remaining Type Reference Deletion-Blocker Migration

Slice D2 implementation status: complete for the remaining generated type-file deletion blockers. It migrated shared-link, publication/collaboration/invite/activity, mass-deletion, and component-library schema/contract tests away from reading/importing `src/lib/supabase/types.ts` and onto active D1 migrations/source contracts.

Current report result:

- `totalReferenceFiles=4`
- `deletionBlockingFileCount=0`
- `nonBlockingGuardFileCount=4`
- `unknown-reference=0`
- `typeReferenceDeletionReady=true`

Validation run for this slice:

```bash
bunx vitest run --maxWorkers=1 \
  tests/vitest/ai-audit-schema.test.ts \
  tests/vitest/auth-account-data-schema.test.ts \
  tests/vitest/component-library-attachment-lifecycle.test.ts \
  tests/vitest/component-library-brand-schema.test.ts \
  tests/vitest/component-library-cost-governance-actions.test.ts \
  tests/vitest/component-library-versioning-schema.test.ts \
  tests/vitest/estimate-sheet-project-budget-schema.test.ts \
  tests/vitest/estimate-sheet-version-control-actions.test.ts \
  tests/vitest/legal-terms-acceptance-migration.test.ts \
  tests/vitest/library-folder-schema.test.ts \
  tests/vitest/mass-deletion-contract.test.ts \
  tests/vitest/project-activity-page/migration.test.ts \
  tests/vitest/project-collaboration-schema.test.ts \
  tests/vitest/project-invite-entry-schema.test.ts \
  tests/vitest/project-publication-actions.test.ts \
  tests/vitest/project-publication-schema.test.ts \
  tests/vitest/workshop-favorites-schema.test.ts
bun test tests/unit/p3-shared-link-migration-red.test.ts
bunx vitest run --maxWorkers=1 tests/vitest/supabase-type-reference-retirement-inventory-script.test.ts
bunx vitest run --maxWorkers=1 tests/vitest/provider-cleanup-allowlist-script.test.ts
bun run scripts/generate-supabase-type-reference-retirement-inventory.ts
bun run scripts/generate-provider-cleanup-allowlist.ts
NODE_OPTIONS=--max-old-space-size=8192 bun run type-check
```

Results: the migrated Vitest suite passed `17` files / `136` tests; the Bun shared-link contract passed `2` tests; the inventory-script suite passed `1` file / `3` tests; the provider-cleanup allowlist suite passed `1` file / `4` tests; canonical inventory regeneration reported `4` references, `0` blockers, and `typeReferenceDeletionReady=true`; the provider cleanup allowlist remained `providerCleanupAllowlistReady=true` at this checkpoint. Slice D3 superseded the remaining historical-file blocker; high-memory TypeScript check passed.

### Slice D3 - Historical Type File Deletion

Slice D3 implementation status: complete for local provider-cleanup/type-reference retirement. It deleted `src/lib/supabase/types.ts` after Slice D2 reduced active deletion-blocking path references to zero.

Current report results:

- Provider-cleanup allowlist: narrow old-provider keyword scan `44` files; broadened provider-boundary allowlist `totalHitFiles=89`, `active-runtime-blocker=0`, `cleanup-candidate=0`, `unclassified=0`, `type-reference-retirement=0`, `finalProviderCleanupReady=true`
- Type-reference inventory: `totalReferenceFiles=4`, `deletionBlockingFileCount=0`, `nonBlockingGuardFileCount=4`, `unknown-reference=0`, `typeReferenceDeletionReady=true`
- Provider-exit pack: `activeLegacyProviderRuntimeBlockers=0`, `providerExitReady=false`, `blockerCount=5`

Validation run for this slice:

```bash
bun run scripts/generate-provider-cleanup-allowlist.ts
bun run scripts/generate-supabase-type-reference-retirement-inventory.ts
bunx vitest run --maxWorkers=1 \
  tests/vitest/provider-cleanup-allowlist-script.test.ts \
  tests/vitest/supabase-type-reference-retirement-inventory-script.test.ts
bun run cf:provider-exit-pack
bunx vitest run --maxWorkers=1 tests/vitest/provider-exit-pack-script.test.ts
NODE_OPTIONS=--max-old-space-size=8192 bun run type-check
```

### Slice C - Stale Comment And Vercel Fallback Cleanup

This work was completed in Slice 0. Keep this heading only as historical slice mapping; do not reopen it unless the stale comment or Vercel hosted-observation fallback regresses.

### Slice D - Supabase Type Reference Retirement

Only after Slice A and active-test migration:

1. Use the regenerated Slice D2 report as the current inventory for path references, negative guards, and audit-tooling references.
2. Keep or generalize the four non-blocking guard/audit-tooling references as final cleanup policy requires.
3. Keep `src/lib/supabase/types.ts` deleted after Slice D3; continue to preserve the four non-blocking guard/audit-tooling references as intentional scanner/negative-assertion coverage.

## Validation Contract

Planning/doc-only validation for this artifact:

```bash
git diff --check -- .ai/03_plans/2026-07-03-Authentication-Audit-And-Improvement
rg -n "[[:blank:]]$|^(<<<<<<<|=======$|>>>>>>>)" .ai/03_plans/2026-07-03-Authentication-Audit-And-Improvement
```

Future implementation validation:

```bash
rg -n "from [\"']@supabase/|import .*@supabase/|createClient\\(" src scripts e2e tests --glob '!supabase/**'
bunx vitest run --maxWorkers=1 \
  tests/vitest/provider-exit-pack-script.test.ts \
  tests/vitest/cloudflare-migration-inventory-script.test.ts \
  tests/vitest/cloudflare-d1-auth-realtime-readiness-script.test.ts \
  tests/vitest/closed-beta-env-manifest.test.ts \
  tests/vitest/vercel-analytics-removed.test.ts
NODE_OPTIONS=--max-old-space-size=8192 bun run type-check
bun run cf:provider-exit-pack
```

Run additional focused Vitest files for any script/test actually moved or deleted.

## Completion Boundary

This plan advances `RISK-007` by converting the remaining provider-string scan into actionable cleanup slices; `29` records the file-level inventory behind those slices. Neither document closes `RISK-007` or proves final provider-cleanup/provider-exit completion.

Final provider-cleanup/provider-exit proof still requires:

- stale proof utilities archived/deleted or replaced, with the eight known stale proof utilities archived in Slice A and four provider-only proof tests archived in Slice A/Slice A2,
- intentional old-provider/provider-boundary strings allowlisted with rationale, which Slice B/D3 plus the scoped allowlist review fix now covers for the current `44` narrow keyword-hit files and `89` broadened provider-boundary hit files,
- active runtime/source scan clean for old-provider imports/env requirements,
- historical type-reference deletion blockers remain at zero and `src/lib/supabase/types.ts` stays retired,
- provider-exit pack/CI proof remains open after regeneration; current pack has five blockers,
- hosted/provider-dashboard/operator proof gathered or explicitly accepted as not required for the claim, plus final review.

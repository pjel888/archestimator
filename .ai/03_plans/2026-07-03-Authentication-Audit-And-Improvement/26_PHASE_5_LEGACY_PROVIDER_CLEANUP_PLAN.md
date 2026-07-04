# 26 - Phase 5 Legacy Provider Cleanup Plan

**Date:** 2026-07-04
**Status:** Classification, current-worktree re-audit, Slice B/D3 allowlist evidence, and local type-reference retirement complete; sibling-ledger repo-local cleanup evidence exists, but hosted/provider/operator/legal/privacy/cleanup/provider-exit/final-review proof remains open.

## Objective

Turn the Phase 5 gate in `11_IMPLEMENTATION_PLAN.md` and the worksheet in `21_LEGACY_PROVIDER_CLEANUP_WORKSHEET.md` into an execution-safe cleanup plan: classify every Supabase, Vercel, and Resend-era artifact before deletion, separate active Cloudflare audit/proof tooling from migration archaeology, and coordinate with the sibling cleanup pack at `.ai/03_plans/2026-07-04-Vercel-Supabase-Cleanup/` instead of racing it.

## Non-Goals

- No Supabase, Vercel, Resend, Cloudflare, DNS, D1, R2, Durable Object, Queue, Email, Images, or production mutation is authorized by this document.
- No `.env.local` secret values are read into evidence or copied into docs. Any obsolete local/provider secret removal or rotation remains an owner/provider-exit runbook action.
- No source, test, script, config, or CI deletion proceeds from the broad cleanup pack alone because that pack is explicitly planning-only and requires fresh implementation authorization.
- No historical migration evidence is rewritten as active runtime truth. Accurate archaeology may stay with a banner.

## Current Evidence

| Evidence | Result |
|---|---|
| `package.json` | No `@supabase/*`, `@vercel/*`, or Resend runtime dependency is present. Remaining provider references are Cloudflare provider-exit scripts (`cf:provider-exit-pack`, `cf:provider-exit-operator-template`). |
| `wrangler.jsonc`, `.env.example`, `.github/workflows` | Local static scan found no Supabase/Vercel/Resend active-provider references in these files. |
| `README.md` | Cloudflare migration is framed as complete and Supabase as historical provider-exit evidence. It still documents the disabled legacy callback and `src/lib/supabase/` as migration archaeology. |
| `src/app/auth/callback/route.ts` | The route is a disabled legacy callback safety gate. It records `auth_callback_missing_code` or `auth_callback_legacy_disabled` and redirects to login; it does not import or call Supabase. |
| `tests/vitest/auth-callback-route.test.ts` | Tests prove the legacy callback rejects codes, does not call the mocked Supabase server client, and does not route to post-auth destinations. The test still mocks the retired client to guard against reintroduction. |
| `src/lib/supabase/types.ts` | Deleted in the current local cleanup slice. It was not active app runtime; the current path-reference inventory reports zero deletion-blocking consumers and only four non-blocking guard/audit-tooling references to the retired path. |
| `src/lib/email/transactional-email-client.ts`, `src/lib/email/cloudflare-email-client.ts` | Runtime email delivery is Cloudflare Email Service only. `ARCHESTIMATOR_EMAIL_PROVIDER` accepts Cloudflare provider values; no Resend client is active. |
| `src/app/api/webhooks/resend/` | Directory exists but contains no route file in the current working tree. There is no active Resend webhook route to classify. |
| `.ai/03_plans/2026-07-04-Vercel-Supabase-Cleanup/LOOP_LEDGER.md` | Sibling ledger records 2026-07-04 implementation complete with 16/18 findings resolved, owner-waived Supabase key rotation as not in use, legacy env vars removed from `.env.local`, legacy check scripts deleted, selected proof/backfill assets archived under `supabase/migration-evidence/`, stale specs/roadmap archived, `.vercel`/`.vercelignore` removed, and two non-blocking deferrals. Treat this as repo-local cleanup evidence, not hosted/provider-dashboard/operator proof. |
| Current cleanup artifacts in the dirty worktree | `scripts/check-supabase-*` and `scripts/check-vercel-*` are absent; `package.json` has no `check-supabase` or `check-vercel` entries; `.vercel` and `.vercelignore` are absent; 7 backfill scripts, 29 provider-parity proof files plus 4 archived proof-test files, and 4 SQL files are archived under `supabase/migration-evidence/`; `supabase/README.md` formalizes the folder as migration archaeology. |
| Current remaining provider-string hits outside `supabase/**` | Fresh auth follow-up scan still has a narrow `44` old-provider keyword-file count after Slice 0 target-literal cleanup, Slice A proof-utility archive, Slice A2 proof-test archive, and Slice D3 deletion of the historical type file. The canonical provider-cleanup allowlist report now uses a broader provider-boundary token set and classifies `89` active-surface hit files, sets `activeRuntimeProviderReferencesReady=true`, `allProviderStringsClassified=true`, `providerCleanupAllowlistReady=true`, and `finalProviderCleanupReady=true`, with zero active-runtime blockers, zero cleanup candidates, zero unclassified files, and zero type-reference-retirement files. The current path-reference inventory reports `4` total files, `0` deletion blockers, `4` non-blocking guard/audit-tooling files, and `typeReferenceDeletionReady=true`. |
| `28_PHASE_5_REMAINING_PROVIDER_FIXTURE_CLEANUP_PLAN.md` | Follow-up cleanup packet records the original `60`-file inventory, Slice 0 target-literal cleanup/verification, Slice A archive evidence for stale proof utilities and their direct tests, Slice A2 archive evidence for the remaining provider-only proof tests, Slice B/D3 allowlist proof, scoped review feedback, the broadened `89`-file provider-boundary allowlist pass, and historical type-file retirement. The active caller checks for the archived stale proof-utility/test names now return no direct imports outside `supabase/**`. This closes the local provider-cleanup gate but does not close hosted/provider/operator/legal/privacy/cleanup/provider-exit/final-review proof. |
| `29_PHASE_5_PROVIDER_STRING_FILE_INVENTORY.md` | File-level companion inventory now classifies the original old-provider keyword hit files, marks the Slice 0 cleared files/current-worktree page-test cleanup, records Slice A stale proof-utility archive evidence, records Slice A2 provider-only proof-test archive evidence, adds the Slice B/D3 scanner/report artifacts, records Slice D type-reference deletion-readiness evidence (`4` current path-reference files, `0` deletion blockers, `4` non-blocking guard/audit-tooling files), and records the deleted historical type file. This sharpens the cleanup/allowlist work but does not complete hosted/provider/operator/legal/privacy/cleanup/provider-exit/final-review proof. |
| `evidence/2026-07-04-provider-cleanup-allowlist.json` and `.md` | Non-destructive generated allowlist evidence for the current `89` provider-boundary hit files. The report passes the local provider-cleanup gate and sets `finalProviderCleanupReady=true`. It does not prove provider-dashboard, hosted runtime, provider-exit pack/CI, or final review gates. |
| `evidence/2026-07-04-supabase-type-reference-retirement-inventory.json` and `.md` | Non-destructive generated retirement inventory for current `src/lib/supabase/types.ts` path references. It classifies all current references, proves there are no unknown path-reference patterns, separates negative guards/audit-tooling from true blockers, and reports `deletionBlockingFileCount=0` with `typeReferenceDeletionReady=true`. |
| Provider-exit proof boundary | The 2026-07-04T09:04:19Z regenerated sibling provider-exit/source-smoke/template artifacts report `activeLegacyProviderRuntimeBlockers=0`, but `providerExitReady=false` with five blockers: latest deploy/source smoke, final exports or accepted retention/loss decision, post-exit Cloudflare smoke, real non-owner Google proof or accepted deferral, and real recipient mailbox proof or accepted deferral. The matching latest deploy/source-smoke artifact is also `NOT READY` with `3` current-tree blockers: uncommitted runtime source paths, deployed commit mismatch, and deployment older than current HEAD. The refreshed source-smoke template and provider-exit operator-record template are sanitized handoff artifacts for the remaining gates, not completion proof. |

## Artifact Classification

| Artifact class | Classification | Planned action |
|---|---|---|
| Active app/runtime dependencies | `keep-active-cloudflare` | Keep `better-auth`, OpenNext Cloudflare, D1/R2/DO/Queue/Email tooling. Do not introduce old-provider packages. |
| `src/app/auth/callback/route.ts` | `transitional-disabled-legacy-gate` | Keep until provider/OAuth redirect URI proof shows no external traffic depends on `/auth/callback`, then delete with route and redirect-sanitizer tests. |
| `src/lib/supabase/types.ts` | `deleted-retired-type-reference` | Deleted locally after active deletion-blocking consumers were migrated. Keep the four remaining guard/audit-tooling path references intentional, and do not conflate this local cleanup pass with hosted/provider/operator/legal/privacy/cleanup/provider-exit/final-review proof. |
| Legacy proof scripts importing `@supabase/supabase-js` | `migration-archaeology` | Keep, archive, or delete only after owner disposition. If archived, move with tests or remove test cascade in the same wave. |
| Cloudflare audit/proof scripts that mention legacy providers | `keep-active-audit-tooling` | Keep when the reference is a negative scan, provider-exit report, or Cloudflare readiness check. |
| Supabase migrations and provider evidence | `migration-archaeology` | Keep with a clear banner or move to archive per owner decision. Do not run, extend, or mutate historical Supabase resources. |
| Resend-era code/comments/tests | `mixed` | Keep Cloudflare email runtime. Delete/update stale Resend comments/tests only after classifying whether they are negative assertions, archaeology, or dead coverage. |
| Vercel folder/config/docs | `cleanup-candidate` | Current worktree shows `.vercel` and `.vercelignore` absent and sibling ledger records the cleanup; final provider-exit proof still needs current scans/provider-gate evidence. |
| `.env.local` obsolete provider credentials | `owner-provider-exit-runbook` | Do not print values. Sibling ledger records local env removal and a Supabase-key rotation waiver; dashboard/provider proof remains outside this auth pack. |
| README and `.ai` stale active-provider wording | `doc-cleanup-candidate` | Update active docs after classification. Leave accurate historical mentions intact. |

## Work Packages

### WP1 - Runtime And Package Inventory

**Status:** Local static classification complete.

Acceptance criteria:
- `package.json` has zero old-provider runtime deps.
- Active source does not import Supabase/Vercel/Resend clients.
- Cloudflare provider-exit tooling is not misclassified as dead old-provider code.

### WP2 - Legacy Callback Disposition

**Status:** Keep as disabled safety gate for now.

Required before deletion:
- Confirm external OAuth/provider redirect URIs no longer point to `/auth/callback`.
- Keep `/api/auth/[...all]` / `/api/auth/callback/google` as the active Better Auth callback path.
- Update or delete `tests/vitest/auth-callback-route.test.ts` only with a replacement proof that requests to the removed path fail safely.

Acceptance criteria:
- No route deletes happen without redirect-URI evidence and route-level tests.
- The disabled route cannot be mistaken for an active Supabase exchange path.

### WP3 - Supabase Types And Legacy Proof Scripts

**Status:** Active consumer migration and historical type-file deletion complete locally; hosted/provider/operator/legal/privacy/cleanup/provider-exit/final-review proof remains open.

Required sequence:
1. Use the generated type-reference inventory as the authoritative active path-reference map.
2. Keep the migrated tests on current D1/source assertions where the test asserts current behavior.
3. Archive or delete historical proof scripts and their tests together when future cleanup touches them.
4. Keep `src/lib/supabase/types.ts` deleted; the active deletion-blocking path-reference count is zero, but non-blocking guard/tooling strings and final provider-exit gates still need to be handled honestly.

Acceptance criteria:
- Typecheck passes after removal.
- Source tree has zero old Supabase SDK imports outside intentional archived evidence.
- Tests that remain describe Cloudflare/D1 behavior, not Supabase runtime.

### WP4 - Email/Resend Classification

**Status:** Runtime Cloudflare Email only; remaining Resend-era references are classified/allowlisted as fixtures or tooling, while provider/dashboard credential disposition remains outside this auth pack.

Required sequence:
- Keep `src/lib/email/transactional-email-client.ts` and `src/lib/email/cloudflare-email-client.ts` as active runtime.
- Classify any `RESEND_API_KEY` test/comment hit as negative assertion, archaeology, or dead test.
- Remove or update stale Resend comments only with a targeted test or static check that proves no active Resend provider path remains.
- Owner removes/rotates any obsolete Resend provider credential outside repo.

Acceptance criteria:
- Runtime email docs and tests point to Cloudflare Email.
- No Resend package/client/webhook route remains active.

### WP5 - Documentation And Test Cascade

**Status:** Coordinate with `.ai/03_plans/2026-07-04-Vercel-Supabase-Cleanup/`; sibling-ledger repo-local cleanup evidence exists, and retained legacy provider scan hits are now classified with zero cleanup candidates. Final proof remains blocked by hosted, provider, operator, legal, privacy, cleanup, provider-exit, and final-review evidence.

Required sequence:
- Use the sibling pack's wave plan for repository-wide doc/script/test/folder cleanup.
- Do not delete tests that still cover active negative assertions.
- Update this auth pack's risk/readiness/evidence docs when the cleanup lands.

Acceptance criteria:
- Active docs no longer imply Supabase Auth or Vercel are current runtime/deploy surfaces.
- Historical docs are clearly marked as migration archaeology or archived.

## 2026-07-04 Current Worktree Re-Audit

This auth pack did not perform broad source cleanup, but a re-audit of the current dirty worktree found substantial repo-local cleanup already present:

- `find scripts -maxdepth 1 \( -name 'check-supabase-*' -o -name 'check-vercel-*' \) -type f` returned no files.
- `rg -n '"launch:check-(supabase|vercel)|check-(supabase|vercel)' package.json` returned no package-script hits.
- `ls -ld .vercel .vercelignore` returned no such file for both paths.
- `supabase/migration-evidence/backfill-scripts/` contains 7 migrated backfill scripts.
- `supabase/migration-evidence/provider-parity-proofs/` contains 29 top-level archived provider-parity proof files plus 4 archived proof-test files under `provider-parity-proofs/tests/`.
- `supabase/migration-evidence/sql/` contains 4 archived SQL proof files.
- `supabase/README.md` now says the folder is migration archaeology and must not be run, applied, or extended.

Remaining cleanup limits and gates from the same scan:

- The legacy shared-link, project-activity, dashboard, recipient, notification, and upload proof artifacts named by earlier scans no longer live under active `scripts/` / `tests/vitest/`; current archived homes are under `supabase/migration-evidence/provider-parity-proofs/` and `supabase/migration-evidence/provider-parity-proofs/tests/`.
- Active `scripts/` provider-string hits are scanner/report tooling only.
- `src/lib/supabase/types.ts` is deleted; current active path-reference blockers are zero and the remaining path references are guard/audit-tooling only.
- The first Slice 0 stale text/scaffold targets are now clear in the current worktree, including the shared-link receiver comment, upload-alert hosted-observation fallback, clean publication test env stubs, and the concurrently edited publication-page env stub.
- Several tests intentionally keep old-provider strings as negative assertions, mocks, scanner fixtures, or security fixtures; Slice B now classifies these in the generated allowlist report.
- Provider-dashboard/hosted proof was not performed in this auth pass; the sibling ledger says Supabase key rotation was owner-waived as not in use, which is owner disposition evidence but not provider-dashboard proof.

The sibling cleanup pack now has implementation ledger evidence, `28` converts the remaining scan hits into cleanup buckets, Slice B/D3 generated the current allowlist proof, and Slice D/D3 proves active type-reference retirement. This pack still cannot treat Phase 5 or the active goal as complete until hosted/provider/operator/legal/privacy/cleanup/provider-exit/final-review proof is gathered or explicitly accepted.

## Validation Plan

Planning-only validation for this slice:

```bash
rg -n "@supabase/|supabase-js|NEXT_PUBLIC_SUPABASE|SUPABASE_|@vercel/|VERCEL_|RESEND_API_KEY|auth/callback" src e2e scripts tests package.json README.md wrangler.jsonc --glob '!supabase/**'
rg -n "supabase|vercel|resend|provider-exit|check-supabase|check-vercel" package.json README.md wrangler.jsonc .github/workflows .gitignore .env.example
git diff --check
```

Implementation validation after future source cleanup:

```bash
bun run validate
NODE_OPTIONS=--max-old-space-size=8192 bun run type-check
bun run cf:provider-exit-pack
```

Run targeted Vitest/e2e suites based on the files actually changed by the cleanup wave. Browser/hosted proof is required only for claims about hosted behavior or user-facing flows.

## Exit Criteria

- Every old-provider artifact is classified as active Cloudflare tooling, migration archaeology, cleanup candidate, transitional safety gate, mixed/test dependency, or owner/provider-exit runbook.
- No active runtime artifact is misclassified as dead code.
- No legacy provider credential value appears in docs, logs, tests, or evidence.
- Any deletion is paired with the smallest test/static proof that the deleted artifact was not active runtime.
- Sibling cleanup implementation records owner disposition for env/provider secret rotation, proof-script archival, and Supabase folder disposition.

## Implementation Evidence

Status: no broad source cleanup implementation in this auth pack. Substantial repo-local cleanup is visible in the current dirty worktree and sibling cleanup ledger. Local provider-cleanup/type-reference retirement is now green, but this is not provider-exit completion because hosted/provider-dashboard/operator proof plus legal/privacy/final-review acceptance remain open.

Local evidence collected on 2026-07-04:
- Runtime package/config scan confirms `package.json` has no old-provider packages and `wrangler.jsonc` remains Cloudflare-bound.
- Legacy `/auth/callback` route is disabled and covered by existing tests; it is not an active Supabase code exchange route.
- `src/lib/supabase/types.ts` no longer exists; the remaining four path references are non-blocking guard/audit-tooling references and final provider-exit evidence remains a separate gate.
- Email runtime is Cloudflare Email Service only; no Resend webhook route file exists in the current working tree.
- Broad repository cleanup is controlled by `.ai/03_plans/2026-07-04-Vercel-Supabase-Cleanup/`; its ledger records implementation, while this auth pass records the remaining scan contradictions and skipped provider/hosted proof.
- `scripts/check-supabase-*`, `scripts/check-vercel-*`, `.vercel`, and `.vercelignore` are currently absent.
- Backfill scripts, provider-parity proofs, SQL proof files, and four archived proof-test files have current archived homes under `supabase/migration-evidence/`.
- Slice B/D3 local evidence added `scripts/generate-provider-cleanup-allowlist.ts`, `tests/vitest/provider-cleanup-allowlist-script.test.ts`, and regenerated `evidence/2026-07-04-provider-cleanup-allowlist.{json,md}`. A scoped code-reviewer found the scanner missed broader Supabase provider-boundary tokens; the scanner now covers those variants, classifies `89` active-surface provider-boundary hit files, has zero active-runtime blockers, zero cleanup candidates, zero unclassified files, zero type-reference-retirement files, and sets `finalProviderCleanupReady=true`.
- Slice D/D3 local evidence added `scripts/generate-supabase-type-reference-retirement-inventory.ts`, `tests/vitest/supabase-type-reference-retirement-inventory-script.test.ts`, regenerated `evidence/2026-07-04-supabase-type-reference-retirement-inventory.{json,md}`, migrated active deletion-blocking test imports/source reads/file-existence guards from historical schema-shape checks to current D1/source checks, deleted `src/lib/supabase/types.ts`, and updated the allowlist rationale for the retired type file. The live type-reference report classifies `4` current path-reference files, has zero unknown references, separates `4` non-blocking guard/audit-tooling files, and reports `0` deletion-blocking files with `typeReferenceDeletionReady=true`.
- Provider-exit/source-smoke/template regeneration at `2026-07-04T09:04:19Z` now reports `activeLegacyProviderRuntimeBlockers=0`, `appRuntimeExitPrerequisitesReady=false`, `providerExitReady=false`, and five remaining gates. The source-smoke subgate has `3` current-tree blockers: uncommitted runtime source paths, deployed commit mismatch, and deployment older than current HEAD. The refreshed source-smoke template carries six operator instructions; the provider-exit operator-record template keeps six sanitized missing evidence sections as placeholders. Focused proof-tool validation passed `bunx vitest run tests/vitest/cloudflare-latest-deploy-source-smoke-script.test.ts tests/vitest/provider-exit-pack-script.test.ts --maxWorkers=1` (`2` files / `32` tests).
- Focused local validation passed `bunx vitest run --maxWorkers=1 tests/vitest/auth-callback-route.test.ts tests/vitest/cloudflare-email-client.test.ts tests/vitest/closed-beta-env-manifest.test.ts tests/vitest/vercel-analytics-removed.test.ts` (`4` files / `13` tests).
- Focused Slice D validation passed the migrated Vitest suite (`17` files / `136` tests), the Bun P3 shared-link migration suite (`2` tests), the type-reference inventory-script suite (`1` file / `3` tests), the provider-cleanup allowlist suite (`1` file / `5` tests), regenerated both provider-cleanup/type-reference reports, and `NODE_OPTIONS=--max-old-space-size=8192 bun run type-check`.
- `git diff --check` passed after the docs and README consistency updates.

Validation limits:
- This is local static/docs proof only.
- It does not claim provider-dashboard proof, hosted proof, production deployment, or final provider-cleanup/provider-exit completion.

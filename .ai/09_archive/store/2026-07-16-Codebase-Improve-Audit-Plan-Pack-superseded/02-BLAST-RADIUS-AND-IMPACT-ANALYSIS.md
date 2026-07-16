# 02 — Blast-Radius and Impact Analysis

Per-unit blast radius, grounded in the call graph and the actual code read during vetting. "Direct" = the symbols the change touches; "transitive" = what depends on those symbols. Risk = what breaks if the change is done wrong. Verification = the cheapest decisive evidence.

The repo's auto-injected graph-mandate is a vendor template; per the repo-local proportional policy this analysis used targeted source inspection (the proportional choice for narrow, reversible local edits) rather than mandatory graph tooling. Where the GitNexus index adds confidence it is noted.

---

## UNIT-001 — Migration safety (0084–0087) · DATA · risk MED
- **Direct:** `migrations/0084_upload_lifecycle_integrity.sql`, `0085_component_category_folder_unification.sql`, `0086_component_category_folder_enforcement.sql`, `0087_upload_actor_and_removal_state_integrity.sql`.
- **Transitive:** every D1 apply to hosted `ARCH_DB`; the upload cleanup queue (`idx_upload_assets_cleanup_queue` from 0084); the removal-claim runtime (`removal-claims.ts`) which depends on `purge_state`/`cleanup_not_before`; the session-integrity triggers (0087) which now ABORT on metadata mismatch.
- **What breaks if wrong:** (a) a migration ROLLBACKs on an unrelated FK orphan → deploy blocked with a generic `*_preflight_failed` message; (b) 0087 ROLLBACKs on a historical NULL `actor_user_id`; (c) replay/dev-reset fails on missing `IF NOT EXISTS`. None corrupt data (assertions are fail-closed), but each blocks deploy.
- **Verification:** apply the edited migrations to a local D1 shadow (`wrangler d1 migrations apply --local` equivalent via the repo's migration runner) + a deliberately-introduced orphan/NULL to confirm the scoped check no longer trips; `SELECT * FROM pragma_foreign_key_check` before/after to show the targeted variant still catches real upload-table orphans.

## UNIT-002 — Category-folder Map rebuild · PERF · risk LOW
- **Direct:** `src/lib/component-library/category-folders.ts` (`resolveComponentCategory`).
- **Transitive:** `normalizeComponentLibraryItem` (`component-library-repository.ts:626`), mapped over every item at `:1037`; AI package-builder `apply.ts:339,1840` and `read-tools.ts:907`.
- **What breaks if wrong:** category path resolution returns a wrong folder chain → mis-categorized components. Mitigated by reusing the exact resolution logic, just hoisting the `Map`.
- **In-repo precedent (de-risks the fix):** `src/lib/project-charts/aggregate-project-charts.ts:19-20` already documents the identical anti-pattern and its fix ("built ONCE per series instead of once per row"). The team has done this exact refactor before.
- **Verification:** `bun run type-check`; a unit test asserting `resolveComponentCategories(folders, items)` matches per-item `resolveComponentCategory` for a nested folder set; optional `perf:library-baseline` comparison.

## UNIT-003 — Timing-safe Bearer compare · SEC · risk LOW
- **Direct:** `src/app/api/internal/{upload-cleanup,upload-scan,upload-runtime}/route.ts` `isAuthorized`.
- **Transitive:** every CRON-secret-gated internal route (system-wide upload deletion, AV scan, runtime proof).
- **What breaks if wrong:** a constant-time helper bug could reject valid secrets. Behavior must be identical for legitimate callers.
- **Verification:** unit test over the helper (equal-length match, length-mismatch early-return, wrong secret rejected, correct secret accepted); confirm the 3 routes still authorize a known-good `CRON_SECRET`.

## UNIT-004 — Test-gate integrity · TESTS · risk LOW
- **Direct:** `package.json` (`test`, `test:dom` scripts; possibly a new `test:evidence`), vitest config / `tests/evidence` directory move for `*proof*` files.
- **Transitive:** CI `validate`, every agent/executor that runs `bun run test` as a smoke check, the "green = safe" intuition.
- **What breaks if wrong:** reclassification could accidentally drop real behavioral tests from the default suite, or break the release-evidence lane. Must keep `*proof*` tests runnable on demand.
- **Verification:** `bun run test:dom` still runs the behavioral suite; `bun run test` either aliases `test:dom` or is explicitly documented as smoke-only; a moved `*proof*` test still runs under the evidence script.

## UNIT-005 — D1 batch limit guard · PERF/RELIAB · risk LOW
- **Direct:** `src/lib/cloudflare/d1-batch.ts` (`runRequiredD1Batch`); `src/lib/admin/action-inbox-repository.ts:142` (direct `db.batch`).
- **Transitive:** all `runRequiredD1Batch` callers (`upload-records.ts`, `direct-upload-records.ts`, `cleanup-job.ts`, `template-mutations.ts`); the admin reconcile path.
- **What breaks if wrong:** a too-aggressive limit rejects legitimate large batches. The existing `assertD1MutationStatementLimit` (`mutation-receipts.ts:52`) already encodes the safe ceiling — reuse it, don't invent a new constant.
- **Verification:** unit test that a batch at the ceiling passes and one over it throws a clear error; `bun run type-check`.

## UNIT-006 — API route auth contract test · SEC/DX · risk LOW
- **Direct:** new vitest glob test over `src/app/api/**/route.ts`; an explicit allowlist for intentionally-public intake routes.
- **Transitive:** future route authors (the test is the safety net).
- **What breaks if wrong:** false positives (flagging a route that does auth differently) → noisy failures. Mitigated by an allowlist + checking for the canonical auth symbols.
- **Verification:** the test passes today (all current routes gate correctly per the security audit) and fails when a synthetic ungated POST handler is added.

## UNIT-007 — Upload removal semantics · BUG/PERF · risk MED
- **Direct:** `src/lib/uploads/removal-claims.ts` (the claim UPDATE + diagnostic), the 3 route handlers returning `removedPaths`, a new index migration.
- **Transitive:** the removal UI (success/blocked affordances), the cleanup job (`cleanup-job.ts:469-498` re-checks the reference predicate before purge — so a contract change here must stay consistent with it).
- **What breaks if wrong:** changing from all-or-nothing to per-asset eligibility changes the return contract (`removedIds`/`blockedIds`); callers that expected `removedPaths` for all requested paths must be updated. A mis-coded per-row predicate could remove a still-referenced file — but the cleanup job's final `NOT (referencePredicate)` re-check is the storage-side backstop (confirmed during vetting).
- **Verification:** unit tests over the claim function: mixed batch (1 referenced + N free) returns the N removed and the 1 blocked; already-claimed returns `already_claimed` distinctly; the diagnostic distinguishes `referenced` vs `already_claimed` vs `not_found`.

## UNIT-008 — Action-inbox snooze consistency · BUG · risk LOW
- **Direct:** `src/lib/admin/action-inbox-repository.ts` (`listOpenActionItems`, `snoozeActionItemInD1`/`mutateStatus`).
- **Transitive:** the `/admin/today` render; the reconcile `deriveActionItemsFromSources`.
- **What breaks if wrong:** projecting expired-snooze as `open` must stay consistent with the stored `status`/`snooze_until`. Requiring `snoozeUntil` is additive (current wrapper always passes it).
- **Verification:** unit test: a snoozed item past `snooze_until` is returned by `listOpenActionItems` with projected status `open`; `snoozeActionItemInD1(id, undefined as any)` throws instead of writing an immediately-expired snooze.

## UNIT-009 — Publication password floor · SEC/DOC · risk LOW
- **Direct:** `src/lib/publication/security.ts` (`MIN_PUBLICATION_PASSWORD_LENGTH`); a server-action test; the stale BLK-01 note in `.ai/04_tasks/2026-07-16-publisher-audit-deferred-*.md`.
- **Transitive:** `createProjectPublication`/`republishProjectPublication`/`updateProjectPublicationPassword` (3 call sites at `actions.ts:896,969,1053`); existing password hashes verify unchanged (`verifyPublicationPassword` has no length gate).
- **What breaks if wrong:** raising the floor only rejects *new* weak passwords; existing links keep working. Risk is product (a partner chose a 5-char password) — low.
- **Verification:** server test: a 3-char password is rejected on create + republish; an 8-char password is accepted; existing-hash verification unaffected.

## UNIT-010 — Active-recipient de-dup · TECH-DEBT · risk MED
- **Direct:** new `src/lib/client-portal/recipient-loader.ts`; 5–6 call sites consolidated.
- **Transitive:** every client-portal authorization path that scopes by active recipient.
- **What breaks if wrong:** authz drift — if the consolidated loader's "active" definition differs from any of the 5 copies, a recipient could be treated active in one path and not another. Mitigated by a characterization test asserting the active set before consolidating.
- **Verification:** characterization test capturing the current SQL's active set; after refactor, the loader returns the identical set for a fixture workspace.

## UNIT-011 — web-vitals pagehide leak · RELIAB · risk LOW
- **Direct:** `src/components/web-vitals-collector.tsx:157-168`.
- **Transitive:** none (dev-only churn; prod mounts once).
- **What breaks if wrong:** nothing functional; worst case the metric double-reports in dev StrictMode. Trivial.
- **Verification:** `bun run type-check`; manual confirm the effect cleans up both listeners.

## UNIT-012 — D1 null observability · RELIAB/OBS · risk LOW
- **Direct:** `src/lib/cloudflare/d1.ts:35-44` (`getCloudflareD1Database`).
- **Transitive:** every caller that guards `if (!database)`.
- **What breaks if wrong:** logging on import failure must not itself throw. Keep the `return null` contract for callers; only *add* a log on the "broken" branch.
- **Verification:** `bun run type-check`; unit test that an import failure logs and returns null, while an absent binding returns null silently.

## UNIT-013 — Component-library unbounded load · PERF · risk LOW
- **Direct:** `src/lib/repositories/component-library-repository.ts:557-570` (the `for(;;)` OFFSET loop); `isPartial` (`:1067`) is already plumbed.
- **Transitive:** library browse/manager consumers.
- **What breaks if wrong:** capping could hide items past the cap; `isPartial` must signal it. Prefer keyset pagination to avoid growing-OFFSET re-reads.
- **Verification:** unit test that a fixture > cap returns `isPartial:true` and the first cap rows; `bun run type-check`.

## UNIT-014 — Estimate god-module split · TECH-DEBT · risk HIGH
- **Direct:** `src/lib/estimates/d1-action-client.ts` (6,261 LOC): extract `query-builder.ts`, `history-events.ts`, `mutation-receipts.ts`, `client.ts`.
- **Transitive:** the single caller `src/lib/estimates/actions.ts`; downstream pricing/export/publication/client-portal projections (14 callers of `estimate-row-total`).
- **What breaks if wrong:** the money/write path. Any regression escapes into pricing, export, publication. **Characterization tests must precede any split.**
- **GitNexus note:** `d1-action-client.ts` is a high-fan-in hub; the index (28029 symbols) is the right tool to confirm the extraction boundaries before editing. Run `impact` on the symbols being moved.
- **Verification:** characterization tests over the `call()` dispatcher + each mutation kind green *before* moving code; after each extraction `bun run type-check` + the existing narrow history tests still pass; no behavioral diff in the golden estimate-health fixture.

## UNIT-015 — Hosted share-link lockout characterization · TESTS · risk HIGH (value)
- **Direct:** new `tests/staging/share-link-lockout.characterization.test.ts` (or `e2e/`).
- **Transitive:** the BETA P0 gate (roadmap #5/#7c/#8); `public-repository.ts:394` rate-limit contract.
- **What breaks if wrong:** a flaky/hangs-against-staging test. Must be tagged out of the default gate and run pre-beta only.
- **Verification:** the test asserts lockout survives a worker restart and token enumeration is bounded, against staging D1 (not local mocks).

## UNIT-016 — Upload reference-tracking table · PERF · risk MED
- **Direct:** new `upload_asset_references` table + triggers; `removal-claims.ts` predicate swap.
- **Transitive:** every write to the consuming tables (projects, cost_library_items, estimate_row_items, estimate_template_row_items, publications, …) must maintain the reference rows.
- **What breaks if wrong:** a stale reference table orphans uploads (keeps them forever) or, worse, allows premature purge. The cleanup job's final re-check remains the backstop, but the table must be consistent.
- **Depends on:** UNIT-007 (lands the predicate refactor this table replaces).
- **Verification:** trigger-level tests that insert/delete a referencing row flips the reference row; the removal predicate returns identical results to the `json_tree` version for a fixture; golden purge dry-run unchanged.

## UNIT-017 — Public-repository access-security extract · TECH-DEBT · risk MED
- **Direct:** new `src/lib/publication/access-security.ts`; `client-portal/public-session-handler.ts:10`; both `public-repository.ts`.
- **Transitive:** publication issuance + client-portal session start + the rate-limit events table.
- **What breaks if wrong:** token verification / password lockout semantics diverge between the two layers. Must keep `timingSafeEqual`/HMAC behavior byte-identical.
- **Verification:** existing publication + client-portal auth suites green; a parity test that the extracted helpers produce identical outputs to the in-repo originals.

## Direction units (018–020)
- Blast radius is design-scope, not code-scope. Each doc lists the surfaces a future build would touch and the open product questions. Risk LOW–MED by definition (they are spikes).

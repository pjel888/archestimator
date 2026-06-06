# Terms and Conditions Sheet Implementation Log

**Date:** 2026-06-06
**Branch:** `codex/terms-and-conditions`
**Worktree:** `/Users/philiplewis/archestimator.omx-worktrees/launch-codex-terms-and-conditions`
**Source plan:** `.ai/09_archive/store/2026-06-06-terms-and-conditions-sheet-implementation-complete/`
**Status:** IMPLEMENTED_ON_BRANCH / LINKED_SUPABASE_TERMS_MIGRATION_VERIFIED / NOT MERGED_TO_MAIN

## Summary

Implemented a versioned Terms of Service / Terms and Conditions acceptance system for ArchEstimator closed beta users.

Implemented scope:

- Versioned Terms and Privacy metadata/content source in `src/lib/legal/terms-content.ts`.
- Public `/terms` page upgraded from pending-review status copy to versioned closed-beta Terms with strong software-tool-only, no-professional-advice/no-reliance, user responsibility, warranty/liability, and privacy metadata language.
- Public `/privacy` page updated to disclose Terms acceptance metadata and no raw IP/user-agent default collection.
- Login page now links Terms/Privacy and explains affirmative acceptance happens after sign-in, rather than relying on passive browsewrap copy.
- Protected `/workshop` layout gate checks current authenticated user's required Terms version and redirects to `/workshop/terms?next=...` when acceptance is missing.
- Protected `/workshop/terms` clickwrap page with required checkbox, version/effective date display, Terms/Privacy links, software-tool-only summary, and error state.
- Server action `acceptCurrentTermsAction` validates submitted version + checkbox, derives user server-side, writes acceptance through service-role persistence, and redirects to sanitized `next`.
- Append-only Supabase migration `20260606095935_legal_terms_acceptance.sql` with `legal_terms_acceptances`, version/hash/effective-date evidence, no raw IP/user-agent columns, RLS enabled, authenticated own-row SELECT only, and service-role INSERT.
- Generated type surface update for `legal_terms_acceptances`; later linked-generated type comparison confirmed the committed table block matches the linked schema exactly despite local Docker being unavailable.
- Settings hub link to reopen the protected Terms acceptance screen.

## Legal/product posture implemented

- No absolute zero-liability claim.
- Uses “to the maximum extent permitted by law.”
- States ArchEstimator is only a software tool and not a licensed professional, contractor, estimator-of-record, architect-of-record, engineer-of-record, quantity surveyor, financial adviser, legal adviser, permitting authority, code-compliance authority, or construction authority.
- Requires users to independently review estimates, quantities, pricing guidance, schedules, reports, exports, assumptions, and project decisions.
- Keeps closed beta no-payment/billing future-scope positioning.
- Keeps Philippine-law/dispute wording as a legal placeholder requiring qualified legal review.
- Stores only necessary acceptance evidence; raw IP and raw user-agent are omitted by default.

## Validation evidence

- Red first: Terms-focused Vitest suite initially failed on missing modules/component/migration.
- Focused green: `bunx vitest run tests/vitest/legal-terms-content.test.ts tests/vitest/legal-terms-acceptance-migration.test.ts tests/vitest/legal-terms-acceptance-record.test.ts tests/vitest/legal-terms-gate.test.ts tests/vitest/terms-acceptance-panel.test.tsx tests/vitest/auth-entry-ui-contract.test.ts tests/vitest/auth-settings-ui-contract.test.ts --maxWorkers=1` passed 7 files / 19 tests.
- `bun run type-check` passed.
- `bun run lint:design-system` passed.
- `bun run lint` passed with existing warnings only.
- `bun run validate` passed: typecheck, lint, design-system lint, unit tests, and 195 Vitest files / 1475 passing / 2 skipped.
- `bun run build` passed; route output includes `/workshop/terms`.
- `bun run test:e2e` passed: 9 passed / 24 environment-gated skipped.

## UltraQA scenario matrix

| Scenario | User/attacker model | Setup / command | Expected signal | Actual result | Cleanup |
| --- | --- | --- | --- | --- | --- |
| Normal authenticated acceptance UI | Closed-beta authenticated user | `terms-acceptance-panel.test.tsx` | Version, Terms/Privacy links, summary, required checkbox, disabled submit until checked | Passed | Committed regression test |
| Malformed/hostile `next` URL | Phishing attempt with external URL | `legal-terms-gate.test.ts` | Redirect falls back to `/workshop` | Passed | Committed regression test |
| Missing acceptance record on protected route | Existing user without current acceptance | `src/app/workshop/layout.tsx` + type/build validation | Redirect to `/workshop/terms?next=...` | Build/typecheck passed; linked table/grant/RLS proof completed for acceptance storage | None |
| Forged browser write attempt | Authenticated client trying to insert arbitrary version | Migration static test | No authenticated INSERT grant/policy; own-row SELECT only | Passed | Committed migration test |
| Raw metadata privacy risk | Overcollection of IP/user-agent | Migration/content/record tests | No raw IP/user-agent storage by default | Passed | Committed regression tests |
| Duplicate first-login race | Double submit/current version exists | `recordCurrentTermsAcceptance` handles `23505` duplicate by reading existing row | Typecheck/build passed; no live duplicate-write residue created during linked proof | None |
| Public legal surfaces | Signed-out/public visitor | `auth-entry-ui-contract`, support-contact contract, Playwright signed-out routes | `/terms`, `/privacy`, `/login` remain public and truthful | Passed | Committed regression tests |
| Broad app regression | Existing repo workflows | `bun run validate`, `bun run build`, `bun run test:e2e` | Existing unit/DOM/E2E gates stay green | Passed with existing lint warnings and env-gated E2E skips | None |
| Dirty worktree safety | Multi-agent branch isolation | `git status --short --branch` before/after validation | Only intended branch changes; generated `next-env.d.ts` reverted | Cleaned generated toggle | `next-env.d.ts` reverted |
| Linked Terms migration apply/readback | Provider migration release | exact-file `supabase db query`, single-version repair, shape/RLS/type readback | Terms table exists with RLS/grants/type shape matching code | Passed; evidence captured | `.ai/09_archive/store/2026-06-06-terms-and-conditions-sheet-implementation-complete/evidence/2026-06-06-linked-supabase-terms-migration-proof.md` |
| Local DB validation gap | Environment missing Docker | `supabase status --output json` | Local DB stack reachable | Failed locally; provider proof closed for Terms migration | `.ai/15_Bugs/2026-06-06-local-supabase-docker-unavailable-for-terms-migration-verification.md` |
| Broad linked `db push` drift | Provider migration tooling | `supabase db push --linked --dry-run` | Safe no-op or only intended Terms migration | Blocked by unrelated migration-history drift; exact-file path used | `.ai/15_Bugs/2026-06-06-linked-supabase-migration-history-drift-blocks-db-push.md` |

## Remaining gates

- Qualified lawyer review is still required before public/paid launch Terms enforcement.
- Legal entity name, formal notices address, venue/dispute wording, and future billing/refund copy remain owner/legal decisions.
- Terms migration `20260606095935` has been applied to linked ArchEstimator Supabase project `ebxxqidacheyapmmzavr`, repaired into migration history, and verified by table/grant/RLS/type-shape readback.
- Local Supabase Docker proof remains open because Docker daemon was unavailable in this worktree, but it no longer blocks this Terms-specific provider migration proof.
- Global Supabase migration parity remains open because broad linked `db push` is blocked by unrelated migration-history drift.
- Philip subsequently authorized resolving remaining integration steps; main merge status is handled by the final git closeout rather than this earlier branch-only log line.

## Code-review graph evidence

- `list_graph_stats_tool` at the first implementation pass reported this worktree graph had 0 files / 0 nodes / 0 edges, so initial impact analysis was structurally limited.
- After graph update, `list_graph_stats_tool` reported 22 files, 73 nodes, 867 edges, and languages `tsx`, `typescript`, and `sql` for this worktree.
- `detect_changes_tool` with explicit changed source/test/migration files returned risk score `0.50`, 0 affected flows, and page-level review priorities for `LoginPage`, `/login auth entry UI contract`, and the Terms/Privacy page contract.
- Native subagent review lanes were not launched because the available `spawn_agent` tool did not expose the required `agent_type` parameter, while AGENTS/OMX requires typed role subagents for OMX work. Direct review plus graph and validation evidence were used instead.

## Linked Supabase provider proof addendum — 2026-06-06

- Linked project: ArchEstimator `ebxxqidacheyapmmzavr`.
- Exact-file apply: `supabase db query --linked --file supabase/migrations/20260606095935_legal_terms_acceptance.sql --output json`.
- Migration repair: `supabase migration repair --linked --status applied 20260606095935 --yes --output pretty` returned `Repaired migration history: [20260606095935] => applied`.
- Migration list readback showed `20260606095935 | 20260606095935 | 2026-06-06 09:59:35`.
- Shape/grant/RLS readback confirmed `legal_terms_acceptances_exists:true`, `migration_20260606095935_recorded:true`, authenticated SELECT only, no authenticated INSERT/UPDATE/DELETE, service-role INSERT, and own-row SELECT policy.
- Transactional RLS own-row smoke returned `own_visible_count:1` and rolled back; no test-row residue remained (`legal_terms_acceptances_total_rows:0`).
- Linked generated-type comparison confirmed the committed `src/lib/supabase/types.ts` `legal_terms_acceptances` block matches `/tmp/archestimator-linked-types.ts` exactly (`45` local lines, `45` linked lines, `blocks_match True`).
- Broad `supabase db push --linked --dry-run` remains unsafe because of unrelated migration-history drift; tracked at `.ai/15_Bugs/2026-06-06-linked-supabase-migration-history-drift-blocks-db-push.md`.
- One later cross-user RLS replay after repeated CLI auth failures hit Supabase temp-role/circuit-breaker auth errors; earlier cross-user denial proof plus policy readback remain the available evidence until the circuit resets.

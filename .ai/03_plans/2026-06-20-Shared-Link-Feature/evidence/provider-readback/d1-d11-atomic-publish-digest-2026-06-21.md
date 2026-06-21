# D1-D11 Provider Readback — Atomic Publish + Digest Slot

Date: 2026-06-21
Project: `ebxxqidacheyapmmzavr`
Scope: shared-link D1-D11 hardening follow-up for D4/D8/D9.

## Provider Migration

Applied via Supabase MCP:

- Local migration file: `supabase/migrations/20260621133000_shared_link_atomic_publish_and_digest_slot.sql`
- Provider migration name: `shared_link_atomic_publish_and_digest_slot`
- Provider recorded version: `20260621112542`
- Apply result: `{"success": true}`

The migration adds:

- `public.replace_project_publication(...)`: service-role-only `SECURITY DEFINER` RPC that locks the project row, revokes prior published rows, computes the next snapshot version, and inserts the replacement publication in one database transaction.
- `public.reserve_security_rate_limit_slot(...)`: service-role-only `SECURITY DEFINER` RPC that serializes a rate-limit reservation with `pg_advisory_xact_lock(...)`, then inserts exactly one durable slot per scope/key/window.

## Readback

Readback SQL returned:

| Check | Observed |
|---|---:|
| `duplicate_published_projects` | 0 |
| `one_published_unique_partial_index` | 1 |
| `replace_project_publication_function` | 1 |
| `reserve_security_rate_limit_slot_function` | 1 |
| `publication_digest_log_table` | 1 |
| `publication_digest_log_manager_select_policy` | 1 |
| `project_publication_events_manager_select_policy` | 1 |

The one-published index present on provider is:

`project_publications_one_published_per_project_idx`

Definition readback:

`CREATE UNIQUE INDEX project_publications_one_published_per_project_idx ON public.project_publications USING btree (project_id) WHERE (status = 'published'::project_publication_status)`

## Local Verification

Focused tests after the code/RPC changes:

```text
bunx vitest run tests/vitest/project-publication-actions.test.ts tests/vitest/project-publication-resolved-ids.test.ts tests/vitest/project-publication-rotate-resend.test.ts tests/vitest/project-publication-activity.test.tsx tests/vitest/project-publication-comments.test.tsx tests/vitest/project-publication-decision.test.tsx tests/vitest/project-publication-schema.test.ts tests/vitest/security-findings-publication-contracts.test.ts --maxWorkers=1

Test Files  8 passed (8)
Tests       157 passed (157)
```

Additional QA-G06 harness check:

```text
bunx vitest run tests/vitest/project-publication-one-published-index.test.ts tests/vitest/share/duplicate-decision-race.provider.test.ts --maxWorkers=1

Test Files  2 passed (2)
Tests       8 passed | 1 skipped (9)
```

Other verification:

```text
bun run type-check
$ tsc --noEmit

git diff --check
# exit 0
```

## Remaining Archive Blockers

This evidence closes the local/provider D4/D8/D9 implementation hole for atomic publish replacement and durable digest-slot reservation. It does not archive the plan folder. Open archive blockers remain:

- App deploy and post-deploy smoke from `90_DEPLOY_AND_MIGRATION_RUNBOOK.md`.
- Browser/visual QA and live mobile/print proof from `85_UX_ACCEPTANCE_AND_VISUAL_QA_PLAN.md`.
- QA-G06 real database race proof because the provider/local harness still skipped without `SUPABASE_DB_URL`.
- QA-G10 live `SHARE_URL` security-header smoke.
- Hosted/provider performance evidence for public page p95, password-route DB/backoff timing, rotate lock/update timing, and provider `EXPLAIN`.
- Full `bun run validate` remains intentionally skipped because the worktree contains unrelated dirty files outside the shared-link scope.

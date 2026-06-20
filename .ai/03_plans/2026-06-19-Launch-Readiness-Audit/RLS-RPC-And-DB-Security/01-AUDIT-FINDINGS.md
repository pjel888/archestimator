# 01 — Audit Findings: RLS, RPC & DB Security (Launch-Readiness Domain 2)

Date: 2026-06-19 · Auditor: Claude (Opus 4.8) · Project: `ebxxqidacheyapmmzavr`
Verdict: **No confirmed exploitable tenant-isolation defect found. The RLS/RPC surface is mature
and well-hardened.** One launch-relevant issue is migration-ledger / tree drift (reproducibility),
not a runtime authz hole.

> Canonical status note: this domain's "not a runtime authz blocker" verdict remains true.
> The root gate register escalates RLS-01 to B6, a hard wider/external-beta DR/reproducibility
> gate, because a reset/restore could lose live RLS/uniqueness protections.

## Scope & coverage

**Read in full or grepped exhaustively:**
- All ~107 SQL files in `supabase/migrations/` (every `security definer`, `set search_path`,
  `grant`, `revoke`, `create policy`, `using`, `with check` occurrence enumerated).
- `supabase/migrations-pending-review/**` (README + each `AC-MOD-*` / `T4-*` file).
- `supabase/seed.sql` (referenced; no policy/grant surface).
- Service-role provenance: every `SUPABASE_SERVICE_ROLE_KEY` / `serviceRole` reference in `src/`,
  plus `src/lib/supabase/service-role.ts`, `src/lib/auth/dev-auth.ts`, `dev-auth-gate.ts`,
  `src/lib/notifications/{actions,repository}.ts`.
- Every `.upsert(` call in `src/` cross-referenced to its Supabase client + onConflict mode.
- **Live DB probes** via Supabase MCP (`get_advisors`, `execute_sql`): RLS-enabled count,
  policy count, ledger state, presence of out-of-tree objects.

**Deferred / not deep-read:** the 305 KB `20260522064018_component_library_taxonomy_source.sql`
data-seed body (only its policy/grant tail was inspected); per-RPC body line-by-line logic for all
74 SECURITY DEFINER functions (verified search_path + grant posture for all; spot-read the
authorization checks of the highest-risk ones — invites, mass-deletion, history wrappers,
publication).

**Live-DB ground truth (probed 2026-06-19):**
- `public_tables_rls_disabled = 0` of `public_tables_total = 55` → **every public table has RLS enabled.**
- `public_policies = 113`.
- Security advisors: **74 WARN, all `*_security_definer_function_executable`** (73 authenticated,
  1 anon = `resolve_collaboration_invitation`). **Zero** `rls_disabled_in_public`,
  `policy_exists_rls_disabled`, or `rls_no_policy` findings.

## Reconciliation vs prior packs

| Prior pack / artifact | Area | This audit's reconciliation |
|---|---|---|
| `2026-06-01-security-owasp-compliance-audit/04-authorization-and-rls-coverage.md` | RLS coverage, SD search_path, service-role discipline | **Confirmed and extended.** Their F-AUTHZ-01..04 hold. Their R-04 (`force row level security` inconsistent) is **still partially open** but Low — re-stated as RLS-04 (covered-by their pack). Their R-05 (regression test that every table has RLS) is **validated live**: 0/55 tables lack RLS today, so the risk is regression-only. |
| memory: `.upsert() needs an UPDATE table grant or it 42501s` | upsert/DO-UPDATE grants | **Confirmed fixed** by `20260617210000_grant_update_for_membership_and_favorite_upserts.sql`. Swept all other `.upsert(` paths — no remaining gap (RLS-02, info). |
| `prove:notification-rls` / `prove:estimate-tabs-rls` / `prove:rls-initplan` / `prove:membership-floor-triggers` | RLS regression proofs | Exist in `package.json`; service-role notification path independently verified to scope by `.eq("user_id", userId)`. |
| `database-indexing-and-query-performance`, `2026-06-13-Shared-Link-Improvement-Plan` (T4 pass) | index hygiene + RLS-on-events | The T4 RLS-on-events policy (P3) was **applied live out-of-tree** → see RLS-01 drift. |

## Findings

### RLS-01 — Migration ledger & tree drift: live DB has objects not in `supabase/migrations/` nor recorded in the migration ledger
- **Severity:** medium · **launch_blocker:** false (no runtime authz hole; it is a reproducibility / change-control hazard)
- **Files:** `supabase/migrations-pending-review/README.md`, `supabase/migrations-pending-review/AC-MOD-T4-P3_project_publication_events_manager_rls.sql`, `supabase/migrations-pending-review/AC-MOD-06_one_published_publication_per_project.sql`, `supabase/migrations-pending-review/AC-MOD-T4-P6_snapshot_size_guardrail.sql`, `supabase/migrations/20260618184856_workspace_homebase_summary.sql`
- **Evidence (live probes 2026-06-19):**
  - `supabase_migrations.schema_migrations`: `ledger_rows = 101`, `max_ledger_version = 20260617010523`. So the committed migrations `20260617210000_grant_update_for_membership_and_favorite_upserts.sql` and `20260618184856_workspace_homebase_summary.sql` are **not in the ledger** (`recent_migration_rows` for `version >= 20260618` = 0), yet their objects exist live.
  - Out-of-tree `migrations-pending-review/` objects are **live**: P3 events policy present (`pg_policy … 'project publication managers can read publication events' = 1`), AC-MOD-06 partial-unique index present (`= 1`), P6 `project_publications.snapshot_size_bytes` column present (`= 1`).
  - `migrations-pending-review/README.md` (2026-06-19 closeout) documents that Codex applied `AC-MOD-04/06`, T4 `P1/P3/P4/P5/P6/P7` directly to the linked project from files that live **outside** `supabase/migrations/`.
- **Impact:** `supabase db reset` / a fresh CI rebuild / a new branch DB will NOT reproduce production: it would omit the P3 events RLS policy, the AC-MOD-06 "one published publication per project" race guard, the P6 snapshot guardrail, and would re-run/skew the ledger for the homebase-summary + upsert-grant migrations. In a security context this means a recovery or branch-promotion could silently **drop an RLS policy and a uniqueness guard** that production relies on, and disaster-recovery posture is weakened (compounded by PITR disabled). It also breaks the "every applied migration is in the ledger" invariant that the prior OWASP R-05 regression idea depends on.
- **Recommendation:** Reconcile before/at launch: (a) move the applied `migrations-pending-review/*.sql` into `supabase/migrations/` as canonical dated files (or author equivalent dated migrations), (b) repair the ledger so `20260617210000`, `20260618184856`, and the applied T4 set are recorded (`supabase migration repair` or a controlled `schema_migrations` insert), (c) verify with a scratch/branch `supabase db reset` that yields zero object diff vs production. Treat as HIGH-blast-radius DB work (dated pack + Codex gate).
- **effort:** M · **confidence:** high · **existing_plan_overlap:** partial:2026-06-13-Shared-Link-Improvement-Plan (the pending-review README tracks the apply but not the tree/ledger reconciliation)

### RLS-02 — Upsert/DO-UPDATE grant posture is correct after the 2026-06-17 fix; no remaining missing-grant path
- **Severity:** info · **launch_blocker:** false
- **Files:** `supabase/migrations/20260617210000_grant_update_for_membership_and_favorite_upserts.sql`, `src/lib/workshop/group-actions.ts:330,421`, `src/lib/workshop/actions.ts:59,103`, `src/lib/repositories/estimate-repository.ts:230,250`, `src/lib/auth/account-actions.ts:207,236`
- **Evidence:** The fix grants UPDATE on `project_group_memberships` and `project_favorites` (both used via authenticated `createSupabaseServerClient` with `onConflict … DO UPDATE`). Swept all remaining `.upsert(`: `estimate_favorites` uses `{ ignoreDuplicates: true }` = DO NOTHING (needs only INSERT — correct, and explicitly documented). `estimate_row_items` upserts (browser client) rely on Supabase's default `GRANT ALL TO authenticated` baseline (core schema `20260518090000` adds no explicit revoke, so default UPDATE is present). Collaboration/account/ai-audit upserts run on the **service-role/admin** client, which bypasses table grants.
- **Impact:** None outstanding. The memory fact is fully resolved; no other authenticated upsert is one privilege short.
- **Recommendation:** Optionally add a `prove:*` regression that exercises a real DO-UPDATE on these two tables as the `authenticated` role to lock the grant in.
- **effort:** S · **confidence:** high · **existing_plan_overlap:** covered-by:memory `.upsert() needs an UPDATE table grant`

### RLS-03 — SECURITY DEFINER discipline is uniform; `anon`-executable surface is intentional and minimal
- **Severity:** info · **launch_blocker:** false
- **Files:** all `supabase/migrations/*` with `security definer`; `supabase/migrations/20260614143000_harden_non_public_helper_execute.sql`; `supabase/migrations/20260601165000_prevent_profile_role_self_escalation.sql`; `auth_profiles_ceo_access.sql:81`
- **Evidence:** Every SECURITY DEFINER function definition pins `set search_path` (verified per-file; the only `SD-count > SP-count` files were comment artifacts — e.g. `20260528220000_project_shared_link_overhaul.sql` has `set search_path = public` on both real RPCs at lines 127/184). Helper functions not used by public-role policies had PUBLIC/anon EXECUTE revoked (`20260614143000`). Live advisor: only **one** anon-executable SD function, `resolve_collaboration_invitation` — by design (invitees are unauthenticated; token-hash + email-scoped, prior F-AUTHZ-04). Role self-escalation is double-gated: RLS `WITH CHECK (id = auth.uid())` + a `BEFORE UPDATE OF role` trigger raising 42501 unless `is_platform_admin()` (`prevent_profile_role_self_escalation`).
- **Impact:** None. Strength, not a gap.
- **Recommendation:** Keep `bun run graph:neutralize` / re-index discipline; ensure any NEW SD RPC added during launch crunch carries `set search_path` + explicit `revoke … from public, anon`.
- **effort:** S · **confidence:** high · **existing_plan_overlap:** covered-by:2026-06-01-security-owasp-compliance-audit (F-AUTHZ-02/03/04)

### RLS-04 — `force row level security` still not asserted on most tables (table-owner bypass only)
- **Severity:** low · **launch_blocker:** false
- **Files:** `supabase/migrations/20260601003000_security_rate_limit_events.sql` (the one table that uses `force`); all other table-creating migrations
- **Evidence:** Only `security_rate_limit_events` uses `force row level security`. Every other table relies on default RLS, which the table OWNER (`postgres`) bypasses. Live `rls_disabled` count is 0, so policies exist everywhere; this is purely about owner-context bypass.
- **Impact:** Low for closed beta — application traffic never runs as `postgres`. Matters only if a future SECURITY DEFINER function (owner = postgres) reads these tables without re-checking authorization. Several already do re-check (`assert_can_edit_estimate_for_history`, workspace cross-checks).
- **Recommendation:** Add `force row level security` to security-sensitive tables (audit/event/membership tables) in a follow-up migration. Defer past launch; track only.
- **effort:** S · **confidence:** high · **existing_plan_overlap:** covered-by:2026-06-01-security-owasp-compliance-audit (R-04 / F-AUTHZ-01)

### RLS-05 — All broad `USING (true)` / `WITH CHECK (true)` write policies are scoped to `service_role`; the one authenticated `using(true)` is read-only reference data
- **Severity:** info · **launch_blocker:** false
- **Files:** `20260601003000_security_rate_limit_events.sql:23-24`, `20260527120000_project_client_publication.sql:118`, `20260528220000_project_shared_link_overhaul.sql:293`, `20260522064018_component_library_taxonomy_source.sql:60`
- **Evidence:** Every `(true)` write policy is `to service_role` (which bypasses RLS regardless, and the matching tables `revoke all … from public, anon, authenticated`). The single authenticated `using (true)` is `component_category_nodes` SELECT — a global component taxonomy/reference catalog intentionally shared across all authenticated users (writes are admin-gated separately). No tenant data is exposed by a `true` predicate.
- **Impact:** None. Confirmed no over-broad tenant-write policy.
- **Recommendation:** None.
- **effort:** S · **confidence:** high · **existing_plan_overlap:** none

### RLS-06 — Service-role key never reaches the client; dev service-role bypass is triple-gated and prod-safe
- **Severity:** info · **launch_blocker:** false
- **Files:** `src/lib/supabase/service-role.ts`, `src/lib/auth/dev-auth.ts`, `src/lib/auth/dev-auth-gate.ts`, `src/lib/notifications/repository.ts:147-163`
- **Evidence:** No `NEXT_PUBLIC_*` service-role var exists (matches were error-message strings only). `service-role.ts` uses `import "server-only"`. All other service-role creators live in `route.ts` (server-only by Next.js), `"use server"` action files, or `import "server-only"` libs. No service-role file carries `"use client"`. The dev bypass `isDevAuthBypassRequest` requires ALL of: `NODE_ENV !== production` AND localhost hostname AND a `>= 32`-char matching secret — cannot activate in prod. Service-role reads that bypass RLS (notifications) are explicitly row-scoped: `updateCurrentUserDeliveryState` filters `.eq("user_id", userId)` (`repository.ts:157`).
- **Impact:** None. Strength.
- **Recommendation:** None.
- **effort:** S · **confidence:** high · **existing_plan_overlap:** covered-by:2026-06-01-security-owasp-compliance-audit (service-role discipline section)

## Cross-domain notes (assign to owning domain)

- **Domain 3 (DB schema/index):** RLS-01's drift includes index objects (AC-MOD-06 unique index, T4 FK-covering indexes P5, dropped/gated P2 indexes). The reproducibility fix is shared with Domain 3; coordinate the reconciliation migration.
- **Domain 1 (Auth/Session):** the `resolve_collaboration_invitation` anon RPC and the dev-auth bypass gate are authz-adjacent but their *session* semantics (cookie issuance, invite token lifecycle) belong to Domain 1.
- **Domain 9 (Observability/Ops):** PITR disabled + migration-ledger drift (RLS-01) jointly raise disaster-recovery risk; the DR/backup posture is Domain 9's call.
- **Domain 4 (API/Server Actions):** service-role clients are minted inside `"use server"` actions and `route.ts`; the provenance is clean, but the *authorization-before-service-role-call* checks in those actions are Domain 4's deeper remit.

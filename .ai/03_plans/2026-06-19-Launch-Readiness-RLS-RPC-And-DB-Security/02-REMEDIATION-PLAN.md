# 02 — Remediation Plan: RLS, RPC & DB Security (Domain 2)

Date: 2026-06-19 · Verifier/Planner: Claude (Opus 4.8 1M) · Project: `ebxxqidacheyapmmzavr`
Status: Plan deliverable. Not yet owner-approved. Delete folder if Philip rejects.

## Verdict roll-up (see `03-EVIDENCE-AND-VERIFICATION.md` for proof)

| ID | Title | Prior sev | Final sev | Verdict | Launch-blocker |
|----|-------|-----------|-----------|---------|----------------|
| RLS-01 | Migration ledger & tree drift | medium | medium | confirmed | **no** |
| RLS-02 | Upsert/DO-UPDATE grant posture correct | info | info | confirmed | no |
| RLS-03 | SECURITY DEFINER discipline uniform | info | info | confirmed | no |
| RLS-04 | `force row level security` not asserted | low | low | **adjusted** (evidence error corrected) | no |
| RLS-05 | Broad `using(true)` write policies are service_role only | info | info | confirmed | no |
| RLS-06 | Service-role key never reaches client; dev bypass prod-safe | info | info | confirmed | no |

**Launch-blocker count for this domain: 0.**

Bottom line is unchanged from the audit: there is **no confirmed exploitable tenant-isolation
defect**. The RLS/RPC/grant surface is mature. The only item warranting tracked remediation is
**RLS-01** (reproducibility / change-control), which is a launch-readiness concern, not a runtime
authz hole. Everything else is "keep doing what you're doing" hygiene plus one cheap, deferrable
defense-in-depth item (RLS-04).

---

## Sequenced remediation

Ordering: RLS-01 first (only tracked item with real cost-of-inaction at launch), then the two
cheap defense-in-depth/lock-in items (RLS-04, RLS-02 regression). RLS-03/05/06 require **no
action** — they are recorded as standing invariants to protect, not work items.

### R1 — RLS-01: Reconcile migration tree + ledger with live DB (HIGH blast radius)

**Why:** `supabase db reset` / a fresh CI rebuild / a new Supabase branch DB will NOT reproduce
production. It would omit the P3 `project_publication_events` manager-read RLS policy, the AC-MOD-06
"one published publication per project" partial-unique race guard, and the P6 snapshot guardrail,
and it would re-run/skew the ledger for the two committed-but-unrecorded migrations
(`20260617210000`, `20260618184856`). In a recovery or branch-promotion scenario this can silently
**drop an RLS policy and a uniqueness guard production relies on**. Compounded by PITR disabled
(Domain 9), so a bad branch-promotion has no cheap undo.

**Confirmed live state (probed 2026-06-19):**
- `ledger_rows = 101`, `max_ledger_version = 20260617010523`, ledger rows `>= 20260618` = 0.
- Committed-but-unrecorded: `20260617210000_grant_update_for_membership_and_favorite_upserts.sql`,
  `20260618184856_workspace_homebase_summary.sql` (objects live: `workspace_homebase_summary` fn,
  both UPDATE grants present — but neither migration is in the ledger).
- Applied-but-out-of-tree (live, files only in `supabase/migrations-pending-review/`):
  P3 events policy = 1, AC-MOD-06 partial-unique index = 1, P6 `snapshot_size_bytes` column = 1.
  Per `migrations-pending-review/README.md`, Codex also applied AC-MOD-04, T4 P1/P4/P5/P7. T4 **P2
  was NOT applied** (zero-scan preflight failed) — must stay un-promoted as a DROP.

**Steps (treat as HIGH-blast-radius DB work: dated implementation, Codex review gate):**

1. **Snapshot live truth first.** Re-run the probes in `03-EVIDENCE-AND-VERIFICATION.md` §A and
   capture the exact set of live objects + the live ACL of each touched table, so the post-reconcile
   `db reset` diff has a baseline. Save under `.ai/99_scratch/` (ignored).
2. **Author canonical dated migrations** in `supabase/migrations/` for every applied-but-out-of-tree
   object, byte-faithful to what is LIVE (not to the original file if it drifted). Source files:
   - `migrations-pending-review/AC-MOD-T4-P3_project_publication_events_manager_rls.sql`
   - `migrations-pending-review/AC-MOD-06_one_published_publication_per_project.sql`
   - `migrations-pending-review/AC-MOD-T4-P6_snapshot_size_guardrail.sql`
   - `migrations-pending-review/AC-MOD-04_shared_link_responses_recipient_set_null.sql`
   - `migrations-pending-review/AC-MOD-T4-P1_shared_link_telemetry_retention.sql`
   - `migrations-pending-review/AC-MOD-T4-P4_shared_link_comments_public_feed_index.sql`
   - `migrations-pending-review/AC-MOD-T4-P5_fk_covering_indexes.sql`
   - `migrations-pending-review/AC-MOD-T4-P7_security_rate_limit_gc.sql`
   Use `create … if not exists` / `drop policy if exists … create policy` idempotent forms so the
   migration is a no-op against the already-live prod DB but reproduces the object on a fresh DB.
   For `CONCURRENTLY` index creates, keep each in its own statement/file (Management API constraint,
   per the README) — note these cannot run inside a transaction.
3. **Repair the ledger** so it records `20260617210000`, `20260618184856`, and every new dated
   migration from step 2 as already-applied: `supabase migration repair --status applied <version>`
   per version (or a controlled `insert into supabase_migrations.schema_migrations`). Do NOT
   re-execute the DDL on prod — these objects already exist; repair only writes the ledger row.
4. **Keep T4 P2 gated.** Do NOT author a tree migration that drops the token-hash indexes; its
   preflight (`project_publications_token_hash_idx.idx_scan = 0`) is still failing. Leave the file in
   `migrations-pending-review/` with its gate documented. Add a short note in the new tree so the
   absence is intentional, not forgotten.
5. **Prove reproducibility.** On a scratch Supabase branch (or local `supabase db reset` if Docker is
   available), run a clean apply and diff the resulting object set vs the §A live snapshot. Gate: the
   P3 policy, AC-MOD-06 unique index, P6 column, AC-MOD-04 FK action, and both upsert UPDATE grants
   must all be present with **zero diff**.
6. **Re-run advisors** (`get_advisors type=security`) post-reconcile: expect the same 74 WARN SD-exec
   set and **zero** new `rls_disabled` / `rls_no_policy` findings.

**Files to change:** new dated files under `supabase/migrations/` only (never edit applied files);
`supabase/migrations-pending-review/README.md` (mark which files were promoted; keep P2 + `deferred/`
+ `superseded/` as-is); the ledger (via `supabase migration repair`).

**Risk:** Medium. The danger is authoring a migration that DOESN'T match live (e.g. a policy
predicate that drifted) and then "reconciling" to the wrong thing, or running a non-idempotent
statement against prod. Mitigated by step 1 (snapshot first) + idempotent forms + ledger-repair (not
re-exec). **Effort:** M. **Dependencies:** Domain 3 (DB schema/index) — the AC-MOD-06 unique index,
P4/P5 covering indexes, and P2 gated DROP are index objects; co-author the reconcile migration with
Domain 3 so index hygiene and the security objects land in one consistent dated set. Domain 9
(Observability/Ops) owns the PITR/DR posture that makes this matter more.

---

### R2 — RLS-04 (adjusted): add `force row level security` to security-sensitive tables (deferrable)

**Why:** Defense-in-depth only. The table OWNER (`postgres`) bypasses non-forced RLS. Application
traffic never runs as `postgres`, so this is irrelevant to normal request paths. It matters only if a
future SECURITY DEFINER function (owner = postgres) reads a sensitive table without re-checking
authorization. Several SD functions already re-check (`assert_can_edit_estimate_for_history`,
workspace cross-checks), so today there is no exploitable path.

**Evidence correction (see §B of evidence doc):** the audit's claim that
`security_rate_limit_events` "uses `force row level security`" is **factually wrong** — live
`relforcerowsecurity` count across all 55 public tables is **0**, and the migration
`20260601003000_security_rate_limit_events.sql` uses plain `enable row level security`. The
finding's *direction* (no table asserts force RLS) is correct and in fact stronger than stated; only
the cited example was inverted.

**Steps (post-launch follow-up, low priority):**
1. Pick the highest-value tables where an owner-context SD read would be a real risk:
   `security_rate_limit_events`, the notification tables, membership/role tables
   (`project_members`, `estimate_sheet_members`, `project_group_memberships`),
   `project_publication_events`, and any audit/event table.
2. New dated migration: `alter table public.<t> force row level security;` for each. This is
   additive and reversible (`no force row level security`).
3. **Verify nothing relies on owner-bypass.** Before applying, confirm each chosen table is not read
   by an SD function that depends on bypassing RLS to do its job (e.g. a maintenance/GC function).
   The T4 P1/P7 retention-GC functions run as service_role and DELETE — forcing RLS on those tables
   could break them if they are SD-owned; check `prosecdef` + the policy set first. **This is the
   one real trap** in R2.
4. Re-run the `prove:*` RLS scripts and advisors.

**Files:** one new dated migration under `supabase/migrations/`. **Risk:** Low-Medium (the GC/retention
trap above). **Effort:** S. **Dependencies:** sequence AFTER R1 so it lands as a clean dated
migration in a reconciled tree; coordinate with whoever owns the P1/P7 GC functions.

---

### R3 — RLS-02: lock in the upsert UPDATE-grant fix with a regression proof (optional)

**Why:** The 2026-06-17 fix (UPDATE grant on `project_group_memberships` + `project_favorites`) is
confirmed live (both grants present), and the broader `.upsert(` sweep is clean. But the original
bug class (a `DO UPDATE` upsert 42501-ing for want of an UPDATE grant) is invisible to mocked tests
and only surfaces against real Postgres. A targeted prove script locks it in against regression.

**Steps:**
1. Add `scripts/prove-upsert-update-grants-postgres.mjs` (mirroring the existing
   `prove-rls-initplan-postgres.mjs` harness): as the `authenticated` role with a seeded session,
   execute a real `INSERT … ON CONFLICT … DO UPDATE` against `project_group_memberships` and
   `project_favorites` and assert no 42501.
2. Wire `"prove:upsert-grants"` into `package.json`.

**Files:** `scripts/prove-upsert-update-grants-postgres.mjs`, `package.json`. **Risk:** None (test
only). **Effort:** S. **Dependencies:** none. **Optional** — skip if launch time is tight; the grant
is already live and correct.

---

## No-action items (standing invariants to protect, not work)

- **RLS-03** — every live SD function pins `search_path` (0 live exceptions). Keep the discipline:
  any NEW SD RPC added during launch crunch MUST carry `set search_path` + `revoke … from public,
  anon`. The single intentional anon-executable SD is `resolve_collaboration_invitation`.
- **RLS-05** — the only non-`service_role` `using(true)` policy is `component_category_nodes` SELECT
  (global reference catalog, intentional). Do not add any authenticated/anon `using(true)` /
  `with check(true)` policy on tenant tables.
- **RLS-06** — no `NEXT_PUBLIC_*SERVICE_ROLE*` env var; `service-role.ts` is `server-only`; dev
  bypass is triple-gated (non-prod + localhost + ≥32-char secret). Never relax any gate.

## Cross-domain hand-offs

- **Domain 3 (DB schema/index):** co-own R1's index objects (AC-MOD-06 unique idx, P4/P5 covering
  idxs, the gated P2 DROP).
- **Domain 9 (Ops/DR):** PITR-disabled + ledger drift jointly raise DR risk; R1 reduces it but DR
  posture is theirs.
- **Domain 1 (Auth):** `resolve_collaboration_invitation` anon RPC + dev-auth bypass *session*
  semantics.
- **Domain 4 (API/Server Actions):** authorization-before-service-role-call checks inside the
  `"use server"` actions / `route.ts` that mint service-role clients.

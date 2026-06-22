# 03 — Evidence & Verification: RLS, RPC & DB Security (Domain 2)

Date: 2026-06-19 · Verifier: Claude (Opus 4.8 1M) · Project: `ebxxqidacheyapmmzavr`
Method: adversarial re-verification of `01-AUDIT-FINDINGS.md` — opened cited files, re-ran live
probes via Supabase MCP, tried to refute each claim. Default to skepticism.

> Canonical status note: "not a launch-blocker" below means no runtime authz hole for the
> owner-only beta. The master register classifies the same RLS-01 evidence as B6, a hard
> wider/external-beta DR/reproducibility gate.

---

## §A — Live probes re-run 2026-06-19 (authoritative ground truth)

All run via `mcp__claude_ai_Supabase__execute_sql` against `ebxxqidacheyapmmzavr`.

| Probe | Result | Bears on |
|-------|--------|----------|
| public tables total | 55 | RLS-01, RLS-04 |
| public tables with RLS disabled | **0** | RLS-04, RLS-05 |
| public tables with `relforcerowsecurity` (force RLS) | **0** | RLS-04 (refutes example) |
| public policies | 113 | RLS-01 |
| `supabase_migrations.schema_migrations` rows | 101 | RLS-01 |
| max ledger version | 20260617010523 | RLS-01 |
| ledger rows with version ≥ 20260618 | **0** | RLS-01 |
| live SD funcs in public WITHOUT `search_path` in `proconfig` | **0** | RLS-03 |
| P3 `project_publication_events` manager policy live | 1 | RLS-01 |
| AC-MOD-06 published-publication partial unique idx live | 1 | RLS-01 |
| P6 `project_publications.snapshot_size_bytes` column live | 1 | RLS-01 |
| `workspace_homebase_summary` fn live | 1 | RLS-01 |
| UPDATE grant on `project_group_memberships` to authenticated | 1 | RLS-02 |
| UPDATE grant on `project_favorites` to authenticated | 1 | RLS-02 |
| non-`service_role` policies with `qual='true'` or `with_check='true'` | exactly 1: `component_category_nodes` SELECT (authenticated) | RLS-05 |
| security advisors | 74 WARN, all `*_security_definer_function_executable` (73 authenticated, 1 anon = `resolve_collaboration_invitation`); 0 `rls_disabled_in_public` / `rls_no_policy` / `policy_exists_rls_disabled` | RLS-03 |

---

## §B — Per-finding verdicts

### RLS-01 — Migration ledger & tree drift — **CONFIRMED** (medium, not a launch-blocker)
- **Refutation attempt:** could the unrecorded migrations actually be in the ledger under aliased
  versions? No — ledger rows ≥ 20260618 = 0 and max version is 20260617010523, strictly below both
  `20260617210000` and `20260618184856`. Their objects are nonetheless live (UPDATE grants present,
  `workspace_homebase_summary` fn present). Could the out-of-tree T4 objects be absent (making the
  drift moot)? No — P3 policy, AC-MOD-06 unique index, and P6 column all probe = 1 live, while their
  only source files are under `migrations-pending-review/` (NOT `supabase/migrations/`).
- **`existing_plan_overlap` correction:** the audit cited
  `partial:2026-06-13-Shared-Link-Improvement-Plan`. That plan is **archived** at
  `.ai/09_archive/store/2026-06-13-Shared-Link-Improvement-Plan` — it is NOT an active
  `.ai/03_plans/` pack. The live tracking artifact is `supabase/migrations-pending-review/README.md`
  (2026-06-19 closeout). Adjusted overlap: **partial:migrations-pending-review/README.md (apply is
  tracked there; tree/ledger reconciliation is NOT)**. The earlier `2026-06-14-Database-Migration-Check`
  reconciliation (in `current-state.md`) only covered through 2026-06-14 and predates this drift.
- **Severity check:** medium is correct. No runtime authz hole — it is a reproducibility /
  change-control / DR hazard. Not a launch-blocker (closed beta, no external users; prod is the
  source of truth and is correct). Confirmed as written, with the overlap citation corrected.

### RLS-02 — Upsert/DO-UPDATE grant posture correct — **CONFIRMED** (info)
- **Refutation attempt:** swept all 14 `.upsert(` call sites in `src/`. Collaboration/account-admin
  upserts (`collaboration/actions.ts`, `account-actions.ts:207`, `ai/audit.ts`) run on the
  service-role/admin client → bypass grants. `account-actions.ts:236` (`workspace_account_settings`)
  runs on the authenticated `supabase` client and DOES have UPDATE for authenticated (live grant
  confirmed). `estimate_row_items` (browser client) has UPDATE for authenticated (live). The two
  fixed tables (`project_group_memberships`, `project_favorites`) have UPDATE (live). `estimate_favorites`
  is `{ ignoreDuplicates: true }` = DO NOTHING → needs only INSERT, and live grants are SELECT/INSERT/
  DELETE (no UPDATE) — correct, no gap.
- **Nuance (not a new finding):** `estimate_row_items`, `workspace_account_settings`,
  `user_onboarding_profiles` carry the Supabase default broad grant set (INSERT/UPDATE/DELETE/TRUNCATE)
  to **anon** as well as authenticated. This is the platform default baseline; RLS (enabled on all 55
  tables) is the actual gate and anon has no `auth.uid()` to satisfy tenant policies. Worth a hygiene
  note (tighten anon DML grants someday) but NOT a launch-blocker and NOT an authz hole. Recorded for
  Domain 3 hygiene backlog, not added as a Domain 2 finding.
- Verdict: confirmed info.

### RLS-03 — SECURITY DEFINER discipline uniform — **CONFIRMED** (info)
- **Refutation attempt:** the per-file text grep shows 6 files where `count(security definer)` >
  `count(set search_path)`. Opened them — all are multi-RPC files or comment artifacts where a single
  `set search_path` covers the real functions (e.g. the helper-revoke migrations `20260614143000`,
  `20260614170000` re-grant/revoke EXECUTE rather than redefine bodies). The **authoritative** check —
  live `pg_proc.proconfig` for every SD function in `public` — returns **0 functions without a
  `search_path=` entry**. Advisor confirms exactly 1 anon-executable SD (`resolve_collaboration_invitation`,
  by design). Verdict: confirmed info; the live proof is stronger than the file-grep the audit leaned on.

### RLS-04 — `force row level security` not asserted — **ADJUSTED** (low, evidence error corrected)
- **Refutation attempt SUCCEEDED on the cited example.** The audit states "Only
  `security_rate_limit_events` uses `force row level security`." This is **false**: (1) a repo-wide
  grep for `force row level` across `supabase/migrations/` returns **zero** matches; (2) the cited
  migration `20260601003000_security_rate_limit_events.sql` uses plain `enable row level security`
  (verified by reading the file); (3) live `relforcerowsecurity` count across all 55 public tables is
  **0**. So NO table forces RLS — the audit inverted its own example.
- **Finding direction still holds, stronger:** the recommendation ("assert force RLS on
  security-sensitive tables in a follow-up; defer past launch; track only") remains valid and is in
  fact more applicable (it is universal, not "one table already does it"). Severity stays **low /
  not a launch-blocker**: app traffic never runs as `postgres`, and the SD functions that read these
  tables already re-check authorization. Verdict: ADJUSTED — same severity/blocker, corrected
  evidence.

### RLS-05 — Broad `using(true)` write policies are service_role-only — **CONFIRMED** (info)
- **Refutation attempt:** queried every live policy with `qual='true'` or `with_check='true'`
  filtered to NON-`service_role` roles. Result: exactly ONE row — `component_category_nodes` SELECT
  for `authenticated` (global component taxonomy/reference catalog, intentional). Read the three other
  cited files: `shared_link_events` INSERT `(true)` → `to service_role`; `project_publication_events`
  INSERT `(true)` → `to service_role` (with `revoke all … from public, anon, authenticated`);
  `component_category_nodes` "manage" policy is `for all to authenticated` but gated by `exists(...)`
  admin check, NOT `true`. No over-broad tenant-write `true` policy. Verdict: confirmed info.

### RLS-06 — Service-role key never reaches client; dev bypass prod-safe — **CONFIRMED** (info)
- **Refutation attempt:** the 7 `NEXT_PUBLIC*SERVICE_ROLE` grep hits are all error-message **string
  literals** naming the env var inside a `throw` (e.g. `service-role.ts:10`), NOT a
  `NEXT_PUBLIC_SERVICE_ROLE_KEY` env reference — no client-exposed key. `service-role.ts` line 1 is
  `import "server-only"`. Cross-checked every `src/` file referencing the service role for
  `"use client"` → zero matches. Dev bypass (`dev-auth-gate.ts`) requires ALL of: `NODE_ENV !==
  "production"` AND localhost/127.0.0.1/::1/.localhost hostname AND a provided credential that equals
  an expected secret of length ≥ 32 — cannot activate in prod. Verdict: confirmed info.

---

## §C — Proof gates per remediation item (honest about local limits)

| Item | Proof gate | What it proves | What it CANNOT prove locally |
|------|-----------|----------------|------------------------------|
| **R1** (ledger/tree reconcile) | Scratch Supabase branch `db reset` → object-diff vs §A live snapshot = 0; `supabase migration list --linked` shows no remote-only rows; `get_advisors(security)` unchanged (74 WARN, 0 new). | A fresh DB reproduces prod's RLS policy + unique guard + column + grants; ledger is complete. | Without Docker locally, `supabase db reset` needs a remote scratch branch (cost/credentials). Branch DR/PITR recovery itself (Domain 9) is unprovable here. Idempotent-migration safety against prod is asserted by form (`if not exists`), confirmed only by the branch reset. |
| **R2** (force RLS) | New migration applies on the branch; `relforcerowsecurity` = 1 for each chosen table; `prove:notification-rls` + `prove:rls-initplan` still green; advisors unchanged. | Force RLS is asserted without breaking existing policy-gated paths. | Cannot prove no owner-context SD reader regressed unless the GC/retention SD functions are exercised against real data (the §B R2 trap). Must spot-run T4 P1/P7 GC after forcing. |
| **R3** (upsert grant proof) | `node scripts/prove-upsert-update-grants-postgres.mjs` PASS (real `DO UPDATE` as `authenticated`, no 42501). | The UPDATE grant is present and a DO-UPDATE upsert succeeds as the app role. | Needs local Homebrew Postgres (PG17) like the sibling prove scripts; does not exercise hosted RLS, only grant + policy semantics replicated locally. |

### Standing-invariant regression gates (no code change, run as guardrails)
- `bun run prove:notification-rls`, `prove:estimate-tabs-rls`, `prove:rls-initplan`,
  `prove:membership-floor-triggers` — all present in `package.json`; require local PG17
  (`POSTGRES_BIN_DIR`/`POSTGRES_BIN_DIR=/opt/homebrew/bin`).
- `get_advisors(type=security)` after ANY DB change — expect the stable 74-WARN SD-exec set and
  **zero** new `rls_disabled` / `rls_no_policy` findings.
- Live SD-without-search_path probe (§A) must stay **0** after any new RPC.

### Honest limitations of this verification pass
- All live probes are **read-only metadata** queries; I did NOT mutate prod, did NOT run an
  authenticated end-to-end tenant-isolation exploit, and did NOT run the local `prove:*` scripts
  (they need PG17 + are an implementer step). The "no exploitable defect" conclusion rests on the
  metadata/grant/policy surface being correct, not on a live cross-tenant read attempt.
- The 305 KB component-taxonomy seed body was not line-read (only its policy/grant tail); per-RPC
  body logic for all 74 SD functions was not exhaustively re-read this pass — search_path + grant
  posture was verified live for all, which is the authz-relevant property.

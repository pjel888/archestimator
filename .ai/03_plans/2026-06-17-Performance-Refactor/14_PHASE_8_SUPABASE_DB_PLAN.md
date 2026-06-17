# 14 — Phase 8: Supabase / RPC / Index / RLS Performance Pass

> **Status:** Plan. **PLANNING ONLY — NO MIGRATIONS APPLIED, NO DESTRUCTIVE DB ACTIONS.** Every index/RPC/RLS item below is a *candidate* with a risk level and a validation requirement. Authoring and applying migrations happens in execution, not in this document, and only behind the proof gates in §6.
>
> **Authoritative inputs:** `_research/_SYNTHESIS.md` (contract §1 Data/Supabase, §3 track 5), `_research/R5-data-supabase.md` (primary — full read), `04_TARGET_ARCHITECTURE.md` (§9.2 server aggregation, §9.3 DB performance), `01_CODEBASE_AUDIT.md` (A-22…A-28), `02_PATTERN_INVENTORY.md` (PAT-23). Live evidence: Supabase performance advisors, project `ebxxqidacheyapmmzavr` (101 INFO lints), read-only.
>
> **Conventions (contract §4):** Priority `P0–P3`, Risk `Low/Medium/High/Critical`, evidence `path:line — observation`. Decision IDs `D-NN`, Risk IDs `RISK-NN` (esp. `RISK-05` RLS/security), Open-question IDs `Q-NN`. Validation vocabulary uses only existing scripts (`bun run prove:*`, `get_advisors`); new scripts are flagged "to be added in Phase N."

---

## 0. Phase intent and relationship to Phase 4

Phase 8 is the **DB-side** counterpart to Phase 4 (`10_…`). Phase 4 shapes the *application* reads (DTOs, `.select` discipline, the buckets-only chart payload, the scoped-node action return); Phase 8 adds the **indexes, RPCs, and RLS proofs** those reads depend on. The two phases are co-designed so each RPC slots into an already-shaped repository call.

**Early-win note (contract §2):** the hot-path FK indexes and shipping `get_project_chart_buckets` are cheap, isolated, high-leverage and **may be pulled forward right after Phase 0 baseline** (each gated by baseline + `validate` + the proof requirements in §6). They do not depend on the tree/sheet refactors. The disciplined default keeps them in Phase 8.

**Cross-refs:** RPC/RLS **security** (cross-tenant denial, SECURITY model, top-3 exploit scenarios) is owned by `22_SECURITY_AND_RLS_THREAT_PLAN.md` (`RISK-20`); per-route **query-count / round-trip / payload budgets** that gate the round-trip-reduction items (§3, §4) are owned by `23_NETWORK_AND_DATA_FLOW_PLAN.md`.

**Liveness caveat:** the advisor is statistics-based on a young/low-traffic DB. Two findings are gated on open questions before any DROP or aggressive change: `Q-E` (component-library Lite vs full — severity of the unbounded read), `Q-J` (are the 13 `unused_index` entries genuinely dead?).

---

## 1. Suspected expensive queries (the targets, from R5)

| # | Query | `path:line` | Cost shape | Severity |
|---|---|---|---|---|
| 1 | Component-library load — `.select("*")` on 8 tables, **unbounded** (no `.limit()` on `cost_library_items` or per-item history) | `component-library-repository.ts:530-746` (`:562-566`, `:630-656`) | Full-volume payload; N+1-free but unbounded | **HIGH** (gated `Q-E`) |
| 2 | `getWorkshopHomebaseData` serial tail — 5–7 sequential awaits after a 6-way `Promise.all`, several mutually independent | `workspace-repository.ts:1126-1222` (`:1128,1155,1167,1184,1194,1204,1214`) | Serial round-trip latency | **HIGH** |
| 3 | Chart aggregation in JS — per-estimate `.reduce` + category/supplier bucketing over ≤5000 rows / ≤1500 nodes | `project-charts-repository.ts:101-128` | Volume shipped to client to be reduced | **MED** |
| 4 | `.select("*")` on `projects` in sidebar/list path | `workspace-repository.ts:837, 908` (+ `:1356,1367` cached) | Every column across the list boundary | **MED** |
| 5 | Activity-history descendant scope — fetches **every node** of the estimate then JS BFS | `estimates/actions.ts:670-719` (`:698-701` no limit, `:640-662` BFS) | Full-node fetch, wasted when `includeDescendants=false` | **MED** |
| 6 | Activity actor-label N+1 — second `profiles` `.in()` hop after event fetch | `estimates/actions.ts:600-622` | Extra round-trip, batched | **MED** |
| 7 | `listProjectEstimates` first-node oracle — fetches ALL nodes for ALL estimates to pick one per estimate in JS | `workspace-repository.ts:1620-1683` (`:1661-1665`) | Bounded but wasteful | **LOW** |

Counter-note (R5): `project-charts-repository.ts` fetch discipline (explicit columns, `.limit(N+1)` overflow), the `project_estimate_list_summaries` RPC, the `public-repository.ts` `cache()`+split-columns pattern, and the active RLS-initplan remediation are all **strong** — generalize, do not rebuild (A-28, PAT-23).

### 1a. Hot query law (Bible §10.2) — applies to every query in §1 and every new read path

Every hot query authored or refactored in this phase MUST satisfy all six clauses; (f) is a **hard gate**, not advisory:

- [ ] **(a) Explicit selected columns** — no `select("*")` (directly resolves §1#1, §1#4).
- [ ] **(b) A scope filter** — at least one of `workspace_id` / `project_id` / `estimate_id` / `tab_id` / `node_id` in the WHERE; an unscoped hot read is a defect, not a slow path.
- [ ] **(c) A matching index** — the scope filter (and any order/predicate column) is backed by an index (§2.1) whose column order matches the predicate.
- [ ] **(d) Stable order** — a deterministic `ORDER BY` (no implicit/heap order), so pagination and golden-master parity are reproducible.
- [ ] **(e) Limit / cursor for lists** — every list read carries a `.limit()` or cursor (the `.limit(N+1)` overflow pattern, PAT-23); unbounded list reads (§1#1) are disallowed.
- [ ] **(f) `EXPLAIN ANALYZE` evidence — GATE.** Any **new slow path** (>50ms local/staging, or p95 API >200ms per the `23_NETWORK_AND_DATA_FLOW_PLAN.md` budget) ships only with an attached `EXPLAIN ANALYZE` plan demonstrating index use and no unexpected seq scan. No EXPLAIN evidence ⇒ the change does not pass the §6 proof gate.

---

## 2. Candidate indexes (planning only — NOT applied)

**Source:** Supabase performance advisor — **87 × `unindexed_foreign_keys`** (HIGH in aggregate), **13 × `unused_index`** (MED, write-cost waste), 1 × `auth_db_connections_absolute` (LOW/infra).

### 2.1 Hot-path FK indexes to ADD (read-relevant subset) — **P1**
These back the sidebar / homebase / list / tree queries in §1. Add **only this subset**; defer the ~80 audit/AI FK indexes.

| Candidate index | Backs | Risk | Validation |
|---|---|---|---|
| `estimate_nodes(parent_id)` | tree descent / reorder joins; activity node scope (§3) | Low (additive) | `get_advisors` re-run shows FK indexed; `prove:*` no access change; query plan uses index |
| `estimate_nodes(estimate_tab_id)` | tab-scoped tree loads | Low | as above |
| `project_favorites(project_id)` (verify composite `(workspace_id,user_id)` already exists) | sidebar favorites, homebase | Low | advisor + sidebar DOM |
| `estimate_favorites(estimate_id)`, `estimate_favorites(project_id)` | homebase favorite estimates | Low | advisor + homebase |
| `project_members(project_id)` | project-layout member loads, access ranks | Low | advisor |
| `project_group_memberships(project_id)` | sidebar group organize-by | Low | advisor |
| `estimate_sheet_members(estimate_id)`, `estimate_sheet_members(project_id)` | sheet membership reads | Low | advisor |
| `notification_deliveries(project_id)`, `(estimate_id)`, `(workspace_id)` | notification feed | Low | advisor + notifications DOM |

**Risk note:** all are **additive** (CREATE INDEX) — low risk, but every index is a write-cost tradeoff, so the subset is deliberately the read-hot FKs only. Use `CREATE INDEX CONCURRENTLY` to avoid table locks (migration-safety, §6).

### 2.2 FK indexes to DEFER — **P3**
The remaining ~80 unindexed FKs are write-heavy audit/AI tables (`ai_tool_calls`, `ai_data_access_events`, `cost_library_item_*_history`, `collaboration_audit_events`). Missing indexes there mainly slow **cascade deletes**, not reads. **Defer unless cascade-delete latency is observed** — they cost writes for little read benefit.

### 2.3 `unused_index` re-evaluation for DROP — **P3 / Risk: Medium (gated `Q-J`)**
13 advisor `unused_index` entries (write-cost waste): includes `estimate_nodes_tab_parent_sort_idx`, `estimate_nodes_tab_parent_sort`, `project_members_workspace_user_idx`, `shared_link_recipients_token_hash_idx`, `collaboration_invitations_estimate_email_idx`, several `notification_definitions_*`.

- **Do NOT drop on a young/low-traffic DB without confirmation** (`Q-J`). The advisor is statistics-based; low traffic ≠ dead.
- **Per-candidate cross-check against §2.1 ADDITIONS before any DROP (DB review GAP-7):** confirm a drop candidate is not the **better backing** for a path that §2.1 is about to (re)cover with a narrower single-column index. Concretely — `estimate_nodes_tab_parent_sort_idx` (a composite) may be the superior index for the **tree-descent / reorder path** that §2.1 targets with the narrower `estimate_nodes(parent_id)` / `(estimate_tab_id)` single-column adds; dropping it and adding narrower indexes can be a net regression. **Re-run `get_advisors` AFTER the §2.1 adds, BEFORE evaluating any drop**, so the "unused" verdict reflects the post-addition index set, not the pre-addition one.
- **Validation requirement:** require a longer `pg_stat_user_indexes` observation window before any DROP; confirm the index is not the backing for a unique/FK constraint. DROP is the only *destructive* item in this plan and is therefore gated hardest.

---

## 3. Candidate RPCs (planning only — NOT applied)

**RPC law for hierarchy mutations (Bible §10.3).** Any RPC that mutates the estimate hierarchy (reorder, move, insert, delete, reparent) MUST be **transactional** — within a single transaction it enforces sibling ordering, cycle checks (no `parent_id` loop; cf. the GAP-8 cycle guard below), tab-scope checks, permissions, and emits the history events — so a partial mutation can never be observed. It MUST **return a compact authoritative result with a revision stamp** (the affected/reordered node ids + their new ordering/parent + a revision or version token), never forcing the client to refetch the universe. This reinforces the existing chart-buckets, homebase-summary, and activity RPC contracts (§3a, the `*_with_history` SECURITY DEFINER mutation precedent in §5) — read RPCs return shaped DTOs; mutation RPCs return the authoritative delta + revision stamp.


| RPC | Replaces | `path:line` | Priority | Risk | Validation requirement |
|---|---|---|---|---|---|
| **`get_project_chart_buckets`** — **review-and-harden the existing deferred migration**, NOT author fresh. The RPC already exists at `supabase/migrations-pending-review/deferred/20260614021500_get_project_chart_buckets_rpc.sql` — the `rg get_project_chart_buckets supabase/migrations` → 0 hits only because the file lives under `migrations-pending-review/deferred/`, not the live `migrations/` dir (cf. doc 28 §4.1). Task: review → harden the two gaps below → promote into `migrations/`. | JS per-estimate `.reduce` + bucketing | `project-charts-repository.ts:101-128`, comment `:113-118`; deferred SQL `20260614021500_get_project_chart_buckets_rpc.sql` | **P1** (early win) | **Med** | **Security (`RISK-20`):** the deferred file ALREADY satisfies **`security invoker`** + **`set search_path = public`** (`:34-35`) and uses a **`recursive` CTE** (`:41`) — those mandates are MET. It is MISSING two things that MUST be added before promotion: **(1) the workspace-membership join** — today it scopes only by `where ri.estimate_id = any(target_estimate_ids)` + caller RLS (`:51`), exactly the "do not rely solely on child-table RLS" gap **doc 22 §2.2 forbids**; add the **`is_workspace_member(...)`** join (the function already exists in `migrations`). **(2) the `revoke execute on function … from public, anon`** line — the file currently only `grant`s to `authenticated`; add the revoke that the `project_estimate_list_summaries` precedent and §3a/§5 mandate. Golden-master oracle: `project-charts-*` DOM tests must produce identical buckets pre/post; the new `prove:project-chart-buckets` harness (to be added, mirroring `prove:estimate-list-summaries`) proves SQL == JS over a fixture **and is extended with a cross-tenant denial fixture** (workspace-B caller gets no workspace-A buckets — **expected to FAIL today until the membership join lands**); buckets-only payload (decisions.md — no raw facts reintroduced); deploy probe fails open on partial drift. Cross-ref `22`, doc 28 §4.1. |
| **`estimate_activity_node_scope`** — `WITH RECURSIVE` CTE for descendant scope | JS full-node fetch + BFS | `estimates/actions.ts:670-719` (`:640-662`, `:698-701`) | **P2** | **Med** | **Cycle guard (DB review GAP-8):** a corrupted `parent_id` cycle must not make the CTE non-terminating server-side — use **`UNION` (dedupes the working set), or a depth bound = the tree max depth**, never bare `UNION ALL` on an unverified parent chain. `set search_path = public`. Equivalence test: CTE descendant set == `collectDescendantNodeIds` BFS over a fixture; **the parity fixture set must include a malformed-cycle fixture** (proves termination) **and run under multiple user contexts** (multi-role isolation — a non-member sees no nodes; `RISK-20`). Respect `includeDescendants=false` short-circuit; `language sql stable security invoker`, revoked anon / granted authenticated (the `…rpc.sql` precedent). Cross-ref `22`. |
| **Fold actor labels into the activity event read** (join or RPC) | second `profiles` `.in()` hop | `estimates/actions.ts:600-622` | **P2** | **Low** | Activity DOM tests render identical actor labels; one round-trip instead of two |
| **`workspace_homebase_summary`** (OR an extra `Promise.all` wave) | serial tail | `workspace-repository.ts:1126-1222` | **P1** | **Med** | See §4 — prefer the cheap parallelization first; RPC only if the summary genuinely reduces round-trips. Homebase DOM/e2e renders identical; query-count budget (Phase 9) shows fewer round-trips. **Full contract: §3a below (DB review GAP-2).** |
| **first-node oracle window-function RPC** (optional) | JS `selectFirstEstimateNodeIds` all-node fetch | `workspace-repository.ts:1620-1683` | **P3** | **Med** | Must honor depth/area ordering (the RPC currently returns `first_node_id = NULL` deliberately because a flat SQL pick mis-targets links, `…rpc.sql:14-17`); window-function pick must match JS oracle exactly. **Only if measurement justifies it.** |

### 3a. `workspace_homebase_summary` — full contract (DB review GAP-2, mirrors the chart RPC)

Only authored if §4 parallelization is insufficient. When authored, it ships with a contract row equivalent to `get_project_chart_buckets`:

| Field | Contract |
|---|---|
| **Input** | workspace context + caller user context (`(select auth.uid())`); no client-supplied workspace id that bypasses membership — the WHERE joins through workspace membership. |
| **Output** | the **explicit-column DTOs §4 names** (favoriteProjects / favoriteEstimates / recentEstimates / missingProjects / pending-collab summary), one composite row — no `.select("*")`, no raw facts the client must re-reduce. |
| **Security** | **`security invoker`** + **`set search_path = public`** (RLS-respecting; default per §3/§5). A `security definer` variant must be justified and carry no per-row bare `auth.uid()` in its body. |
| **Parity oracle** | homebase **DOM golden-master** — the rendered homebase is byte-identical pre/post cutover; app keeps the JS path until the proof passes. |
| **Proof gate** | **`prove:workspace-homebase-summary`** (new, Phase 8) — SQL == JS over a fixture, mirroring `prove:estimate-list-summaries`, **plus a cross-tenant denial assertion** (a user from workspace B gets no workspace-A rows; `RISK-20`). |

Cross-ref `RISK-20` (new-RPC cross-tenant data leak), `22_SECURITY_AND_RLS_THREAT_PLAN.md` (new-RPC SECURITY model + cross-tenant denial proofs).

**Pattern to follow for all new RPCs (A-28):** `project_estimate_list_summaries` (`…rpc.sql`, `language sql stable security invoker`, GROUP BY counts + inlined sum, revoked anon / granted authenticated). Mutations stay `*_with_history` SECURITY DEFINER; these are **read** RPCs and should be `security invoker` + RLS-respecting unless a definer is justified (and if definer, no bare `auth.uid()` in the body that re-evaluates per row — §5).

---

## 4. `getWorkshopHomebaseData` serial-tail collapse — **P1 / Risk: Medium**

**Resolves:** A-23, contract §1 `[HIGH]`.

**Current shape (PINNED):** `workspace-repository.ts:1050-1261` — after a 6-way `Promise.all` (`:1061`), 5–7 **sequential** awaits: favoriteProjects `:1128`, recentEstimates `:1155`, favoriteEstimates `:1167`, missingProjects `:1184`, `readOptionalProjectPublications` `:1194`, pending-collab summary `:1204`, firstNodes `:1214`. Columns are explicit (good).

**Plan (ordered by safety):**
1. **Safe first move:** parallelize the provably-independent trio — favoriteProjects (`:1128`) / favoriteEstimates (`:1167`) / recentEstimates (`:1155`) — into one `Promise.all` wave. **Low risk; no SQL change.**
2. Fold the remaining independent awaits (`missingProjects`, `readOptionalProjectPublications`, pending-collab summary) into the same/another wave where data dependencies allow.
3. **Only if (1)+(2) are insufficient:** author a `workspace_homebase_summary` RPC (§3) to collapse the round-trips server-side.

**Unsafe move to avoid (A-23):** do not parallelize the `sharedProjects` follow-up (`:905-913`) — it legitimately depends on `sharedProjectIds` from the members batch.

**Validation:** homebase DOM/e2e renders identically; a query-count budget (Phase 9, to be added) proves fewer round-trips; no functional change to the returned shape.

---

## 5. RLS initplan / `auth.uid()` checklist — **P2 / Risk: Low (verification) — `RISK-05`**

**Resolves:** A-28, contract §1 (`prove:rls-initplan`), `RISK-05` (RLS/security is the highest-consequence risk class).

**Current state (PINNED, R5):** 211 `auth.uid()` occurrences; 64 wrapped as `(select auth.uid())`; ~147 unwrapped — **but most unwrapped ones live inside `SECURITY DEFINER` helper bodies, not policy `USING`/`CHECK` clauses**, so they do NOT trigger per-row initplan re-eval. The team has actively remediated: migrations `…192344` (teamspace), `…201302` (`is_workspace_member`), `…162000` (`current_project_access_rank`, `can_access_estimate`), plus permissive-policy consolidation. Regression harness exists: `scripts/prove-rls-initplan-postgres.mjs` / `bun run prove:rls-initplan`.

**Checklist for any policy/RPC authored in this phase:**
- [ ] **No new bare `auth.uid()` in a policy `USING`/`CHECK` clause** — wrap as `(select auth.uid())` (initplan: evaluated once, not per row).
- [ ] **Index EVERY column referenced in a policy's `USING` and `WITH CHECK` clauses (Bible §10.1)** — not only the hot-path FKs already listed in §2.1. A policy predicate forces a per-row evaluation; an unindexed column in that predicate turns every RLS-filtered scan into a seq scan. For each policy authored/touched in this phase, enumerate the columns it filters on (FK and non-FK alike) and confirm a covering index exists or add one (additive, §6.1). Verify with the post-add `get_advisors` pass and a query plan that shows index use under the policy.
- [ ] **Reuse the remediated helpers** (`is_workspace_member`, `current_project_access_rank`, `can_access_estimate`) instead of inlining new predicates.
- [ ] **Read RPCs default to `security invoker`** (RLS-respecting); a `security definer` read must be justified and must not put a per-row `auth.uid()` in its body.
- [ ] **`Q-I`:** has any policy added after migration `…162000` reintroduced a bare `auth.uid()` in a USING/CHECK clause? — run a fresh `bun run prove:rls-initplan` + `get_advisors` security scan to confirm before this phase closes.
- [ ] **Multiple-permissive-policy:** do not add a second permissive policy where one suffices (the `consolidate_low_risk_permissive_policies` work shows the cost).

**Validation:** `bun run prove:rls-initplan` (no access-decision change); `get_advisors` performance **and** security pass; `bun run prove:estimate-tabs-rls` / `prove:notification-rls` for those domains; advisor `unindexed_foreign_keys` count drops by the §2.1 subset, no new `multiple_permissive_policies` or `auth_rls_initplan` lints.

---

## 6. Migration safety + provider proof + rollback strategy (gates ALL items)

**Hard constraint (contract §4):** this document applies no migrations. The requirements below are the gates that execution must satisfy before any candidate above is applied.

### 6.1 Migration safety requirements
- **Indexes:** `CREATE INDEX CONCURRENTLY` (no table lock); one index per migration for clean rollback; verify the FK column order matches the query predicate.
- **Deploy-window / sequencing note (DB review GAP-9):** `CREATE INDEX CONCURRENTLY` (and `DROP INDEX CONCURRENTLY`) **cannot run inside a transaction block.** The Supabase migration runner wraps each migration in a transaction by default — so any migration containing a `CONCURRENTLY` statement must be marked **non-transactional** (one such statement per migration; no other DDL in the same file). For RPCs: the **additive `CREATE FUNCTION` ships in deploy N**; the **app cutover** (repository switches from the JS path to the RPC) ships in **deploy N+1**, only after the relevant `prove:*` gate passes — so a missing/failing RPC degrades gracefully (the JS path is still live) rather than erroring on deploy N.
- **DROP (`unused_index`, §2.3):** **gated on `Q-J`** + a longer `pg_stat_user_indexes` window; confirm the index does not back a unique/FK constraint; this is the only destructive item — require explicit sign-off, never auto-applied.
- **RPCs:** additive (`CREATE FUNCTION`); the application keeps the JS path until the proof harness passes, then cuts over behind the existing fail-open/deploy-probe pattern (chart buckets), so a missing/failing RPC degrades gracefully rather than erroring.
- **Types:** any new RPC/table that changes generated types must be **spliced additively** into `types.ts` (MEMORY: `types.ts` is not pure-generated — a raw `gen:types` overwrite breaks the build; add new tables additively).
- **Supabase grants:** `.upsert()` / DO UPDATE paths need an explicit UPDATE table grant even with no conflict (MEMORY: `42501` without it; mocked tests miss it) — verify grants for any new table touched by an upsert.

### 6.2 Provider proof requirements (`prove:*`)
Every RPC/index/RLS change must pass the relevant proof harness **before** cutover (these prove the change altered no result/access decision over a fixture):
- `bun run prove:rls-initplan` — RLS rewrites change no access decision.
- `bun run prove:estimate-list-summaries` — the precedent for SQL-vs-JS aggregation equivalence; **mirror it** for `get_project_chart_buckets` as a new `prove:project-chart-buckets` (to be added, Phase 8/9), and for `workspace_homebase_summary` as a new `prove:workspace-homebase-summary` (to be added, Phase 8) — both extended with a **cross-tenant denial** assertion (`RISK-20`, §3/§3a).
- `bun run prove:estimate-tabs-rls`, `bun run prove:notification-rls`, `bun run prove:unify-kinds` for the domains they cover.
- `get_advisors` (performance + security) before/after — FK-index count drops, no new security lint.

### 6.3 Rollback / proof strategy per class
| Class | Rollback | Proof gate |
|---|---|---|
| Add FK index | `DROP INDEX CONCURRENTLY` (additive, trivially reversible) | `get_advisors` + query-plan check + relevant DOM |
| Drop unused index | Re-`CREATE INDEX CONCURRENTLY` (keep the original DDL) — **gated `Q-J`** | `pg_stat_user_indexes` window + sign-off |
| New read RPC | Drop function; app keeps JS path until cutover | `prove:*` SQL==JS equivalence + golden-master DOM |
| Homebase parallelization (§4) | Pure app revert (no SQL) | homebase DOM/e2e + query-count budget |
| RLS-adjacent | Revert policy; `prove:rls-initplan` re-asserts access decisions | `prove:rls-initplan` + advisor security scan (`RISK-05`) |

---

## 7. Open questions seeded for `19_OPEN_QUESTIONS.md`

- **`Q-E`** — Does prod call the full component-library loader (`:1146`) or the Lite variant (`:1169`)? Decides severity of §1#1 and whether the audit-table limits are hot-path. (owner: eng + caller trace)
- **`Q-J`** — Are the 13 `unused_index` entries genuinely dead or just untouched on a young/low-traffic DB? Needs a longer `pg_stat_user_indexes` window before any DROP (§2.3).
- **`Q-I`** — Has any policy added after migration `…162000` reintroduced a bare `auth.uid()` in a USING/CHECK clause? Run `prove:rls-initplan` + advisor security scan (§5, `RISK-05`).
- **`Q-D`** (R3↔R4 seam, also relevant) — does the left `EstimateSheetTree` run its own totals DFS? Affects whether a totals/scope RPC would serve both panels.

---

## 8. Phase 8 work summary (priority-ordered)

| # | Item | Priority | Risk | Gate |
|---|---|---|---|---|
| 2.1 | Add hot-path FK indexes (CONCURRENTLY) | P1 (early win) | Low | `get_advisors` re-run; `prove:*` |
| 3 | Ship `get_project_chart_buckets` RPC | P1 (early win) | Med | golden-master + `prove:project-chart-buckets` (new) |
| 4 | Collapse `getWorkshopHomebaseData` serial tail | P1 | Med | homebase e2e + query-count budget |
| 3 | `estimate_activity_node_scope` recursive-CTE RPC | P2 | Med | equivalence test vs JS BFS |
| 3 | Fold actor labels into activity read | P2 | Low | activity DOM tests |
| 5 | RLS initplan verification pass | P2 | Low | `prove:rls-initplan` + advisor (`RISK-05`) |
| 2.3 | Re-evaluate 13 `unused_index` for DROP | P3 | Med | **`Q-J`** + pg_stat window + sign-off |
| 2.2 | Defer ~80 audit/AI FK indexes | P3 | — | only if cascade-delete latency observed |
| 3 | first-node oracle window-function RPC | P3 | Med | only if measurement justifies |

**Done-when (phase gate):** the §2.1 FK indexes applied via CONCURRENTLY and confirmed by `get_advisors`; `get_project_chart_buckets` shipped and golden-master-proven; homebase serial tail collapsed and query-count reduced; `prove:rls-initplan` + advisor security scan green (`Q-I` resolved); `Q-E`/`Q-J` resolved or explicitly deferred with a recorded decision (`D-NN`); **no `unused_index` dropped without `Q-J` + sign-off**; all changes reversible per §6.3.

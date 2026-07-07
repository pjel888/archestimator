# 02 — Feature Brief And Scope

## Source brief (verbatim, from `PROMPT.md`)

> **Goal.** Create a D1 migration integrity plan that reconciles local migration files,
> remote application state, schema drift, migration safety, and fix-forward procedure
> before first users.
>
> **Evidence To Start From.**
> - `migrations/` now includes migrations through `0036_cost_library_component_drafts.sql`.
> - `AGENTS.md` still references an older latest migration count, creating source-of-truth drift.
> - `.ai/10_state/current-state.md` records remote migration/application uncertainty around recent D1 migrations.
> - Some migrations contain non-idempotent schema operations and table rebuilds; inspect `0033` through `0036` first.
> - Relevant scripts include `cf:d1-*`, `scripts/audit-dbidx-repo.ts`, and `scripts/cf-d1-restore-rehearsal.mjs`.
>
> **Required Plan Pack.** Include local-vs-remote migration ledger, schema verification SQL,
> migration application order, destructive-change review, fix-forward policy, rollback/rehearsal
> limits for D1, and CI/release checks that prevent stale documentation.
>
> **Constraints.** Use only the D1 binding in `wrangler.jsonc`. Stay on free-tier assumptions.
> Do not mutate unrelated provider projects.
>
> **Stop Condition.** The pack enables a future executor to prove D1 migration state and
> schema integrity without guessing which document or provider state is canonical.

## Brief-vs-reality reconciliation (conflicts, recorded not smoothed)

Per the Multi-Agent-Execution-Directive authority model, when the brief conflicts with
repo reality, the conflict is recorded and resolved explicitly. The brief is requirements
data; repo reality controls.

| Brief claim (PROMPT.md) | Repo reality | Resolution (SAD) |
|---|---|---|
| "`migrations/` now includes migrations through `0036_cost_library_component_drafts.sql`" (`PROMPT.md:13`) | `migrations/` actually has `0037_remove_preloaded_component_categories.sql` and `0038_component_draft_resource_limits.sql` too (38 files total). | **SAD-001:** Plan covers `0033`–`0038` (broader than `0033`–`0036`). The prompt's evidence premise is stale; the directory wins. |
| "`AGENTS.md` still references an older latest migration count" (`PROMPT.md:14`) | `AGENTS.md:41` currently says "38 SQL files, latest `0038_component_draft_resource_limits.sql`" — **current and correct** on migrations. (It IS stale on cron count: says 2, actual 3.) | **SAD-002:** The prompt's premise is itself stale on the migration-count point. The plan still fixes `AGENTS.md` (cron drift is real) and `README.md` (migration-count drift is real), but does not claim `AGENTS.md` migration count is wrong. |
| "inspect `0033` through `0036` first" (`PROMPT.md:16`) | `0037` (data mutation: clears category-node refs + `DELETE FROM component_category_nodes`) and `0038` (4 `CREATE TRIGGER`) are equally integrity-relevant. | Plan inspects `0033`–`0038` (all six), with `0035` and `0037` flagged highest-risk. |
| "`scripts/cf-d1-restore-rehearsal.mjs`" (`PROMPT.md:17`) | No `.mjs` file by that name exists. The real file is `scripts/generate-cloudflare-d1-restore-rehearsal.ts`; the npm script is `cf:d1-restore-rehearsal` (`package.json:48`). | Plan cites the correct `.ts` path and npm script name; flags the prompt's filename as a typo. |
| "Some migrations contain non-idempotent schema operations and table rebuilds" | Confirmed and expanded: 7 non-idempotent migrations (`0021`, `0025`, `0028`, `0029`, `0032`, `0035`, `0037`), not just in the `0033`–`0036` window. | Plan's destructive-change review covers all 7; see `07_DATA_DATABASE_API_NETWORK_PLAN.md`. |

No conflict was silently smoothed. Each is recorded with the chosen resolution.

## Product / business outcome

**Outcome:** Before first users, any agent, human, or executor can determine within
minutes (a) which migrations the local `migrations/` dir defines, (b) which migrations the
remote `ARCH_DB` has applied, (c) whether the remote schema matches the canonical set, and
(d) the exact fix-forward action if any of those are out of sync — without guessing which
doc or provider snapshot is authoritative.

**Business value:** removes a class of "works locally, breaks on deploy" failures and
compliance-table-absence risks (privacy requests, retention events, security-audit HMAC)
right before first-user exposure.

## Functional scope (in scope)

1. Documentation-drift reconciliation (`AGENTS.md` cron, `README.md` migrations+crons, optionally `PROMPT.md` premise note).
2. A local migration-state ledger approach (local `migrations/` ↔ Wrangler `d1_migrations` tracker, local and remote).
3. Schema-verification SQL covering all app tables + indexes + triggers + Better Auth tables.
4. Migration application order + a destructive-change / non-idempotency classification for all 38.
5. Fix-forward policy for partial-apply and re-run scenarios (no retroactive migration edits).
6. D1 restore/rollback rehearsal limits (extend the existing local rehearsal; document hosted limits).
7. CI/release stale-doc guard (doc-count ↔ `migrations/` count).

## Non-goals (explicitly out of scope)

- Applying, rolling back, editing, reordering, or retroactively idempotency-guarding any existing migration.
- Changing application source (the only code touch is an additive verifier script + optional CI guard script).
- Touching legacy Supabase (`supabase/migrations/`, project `ebxxqidacheyapmmzavr`).
- Enabling paid Cloudflare tiers (D1 paid plan, R2 paid tier, Smart Placement, dedicated egress, etc.).
- Proving hosted performance, cost, OAuth/magic-link cutover, or provider-backed Better Auth production readiness.
- Mutating provider state (this is planning only).
- Building a new migration-runner framework (Wrangler's `d1 migrations apply` is the runner; the plan does not replace it).

## Success metrics (planning-task)

- Every required `exhaustive` document exists and is internally consistent.
- Schema-verification SQL is exhaustive (69 app + 4 auth tables, 134 indexes, 4 triggers).
- Every non-idempotent migration has a documented fix-forward action.
- README states a canonical readiness status with the reason for any cap.
- No application code is modified.

## Failure metrics (what would make the plan fail)

- A requirement left untraced.
- A schema object missing from the verifier's expected set.
- A non-idempotent migration left without a fix-forward action.
- An unsupported readiness claim (e.g., claiming remote state is proven from local evidence).

## Stakeholders

- **Philip Lewis** — owner; approves hosted-proof readback (OPEN-DEC-001/002/003) and any doc edits.
- **Future implementation agent** — executes Phases 0–5.
- **Future release reviewer** — confirms hosted-proof gates before first users.

## Assumptions

- ASSUMP-001: Wrangler's `d1 migrations apply`/`list` semantics match the documented behavior (tracker marks applied after success; `--remote` targets `archestimator-proof-db`). Source: Wrangler docs + `21_DATABASE_CHANGE_BLUEPRINTS.md:71,81`. Validated: medium (official docs cited, not run in-session).
- ASSUMP-002: The 2026-07-06 `current-state.md:271` "0033/0034/0035 pending remotely" snapshot has not been superseded by a later remote apply (no later entry found). Validated: weak (absence of evidence; the hosted readback will confirm or refute).
- ASSUMP-003: Free-tier D1 limits are sufficient for a schema-verification pass (catalog reads, not data scans). Validated: strong (catalog reads are constant-time and free-tier-safe).
- ASSUMP-004: `0037` was applied remotely (per `current-state.md:65-67`: "Remote `ARCH_DB` was cleaned directly with that migration SQL"). Validated: medium (recorded in state log; not independently re-confirmed in-session).

All assumptions are labeled; none is used as proof of a stronger claim.

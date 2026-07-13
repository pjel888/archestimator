# 11 — Implementation Plan

**Entrypoint for the future implementation AI.** Phases are dependency-aware. Every task
has an exact path/symbol or is explicitly marked `BLOCKED-EXTERNAL` (owner-gated hosted
proof). No task edits existing migrations or application source.

If `Create-Implementation-Prompt.md` later produces `IMPLEMENTATION_PLAN.md`, that file
supersedes this one for execution.

---

## Phase 0 — Reconcile documentation drift (P1, implementation-ready)

**Objective.** Make `AGENTS.md` and `README.md` match `migrations/` and `wrangler.jsonc` reality.
**Requirements.** REQ-DOC-01, REQ-DOC-02, REQ-DOC-03.
**Prerequisites.** Re-read `AGENTS.md:40`, `README.md:36,39,211`, `wrangler.jsonc:59-65`, and
`ls migrations/ | tail -1` immediately before editing (shared-worktree discipline).
**Dependencies.** None.

### T-00 — Fix `AGENTS.md` cron count
- **Req IDs.** REQ-DOC-02.
- **Objective.** `AGENTS.md:40` lists all three crons.
- **Target file.** `AGENTS.md`.
- **Target line.** Line 40 (the "Two cron triggers" sentence).
- **Edit.** Change "Two cron triggers (`0 3 * * *`, `15 3 * * *`)" → "Three cron triggers (`0 3 * * *`, `15 3 * * *`, `30 3 * * *`)".
- **Validation.** `grep -A4 '"crons"' wrangler.jsonc` shows 3; `grep 'cron triggers' AGENTS.md` shows "Three".
- **Complexity.** Small.

### T-01 — Fix `README.md` migration count, latest, and cron count
- **Req IDs.** REQ-DOC-01.
- **Objective.** `README.md:36,39,211` reflect 38 migrations / latest `0038` / 3 crons.
- **Target file.** `README.md`.
- **Target lines.** 36 ("29 migrations"), 39 (cron line), 211 ("29 D1 migrations … latest `0029_…`").
- **Edits.**
  - L36: "29 migrations" → "38 migrations".
  - L39: add `30 3 * * *`.
  - L211: "29 D1 migrations … latest `0029_estimate_actions_d1_support.sql`" → "38 D1 migrations … latest `0038_component_draft_resource_limits.sql`".
- **Validation.** Run T-06 (the doc-count guard) once built; until then, manual `grep`.
- **Complexity.** Small.

### T-02 — Record PROMPT.md premise staleness (optional, P2)
- **Req IDs.** REQ-DOC-03.
- **Objective.** A future reader of `PROMPT.md` isn't misled by "through 0036" / "AGENTS.md older count".
- **Target file.** `PROMPT.md` (this plan folder — NOT the root; non-destructive annotation).
- **Edit.** Optionally add a one-line note at the top: "<!-- Premise note (2026-07-07): repo now has migrations through 0038; AGENTS.md migration count is current. See plan pack 02_FEATURE_BRIEF_AND_SCOPE.md. -->". Or skip and rely on this plan's `02_…` recording (already done).
- **Validation.** Doc review.
- **Complexity.** Small.
- **Phase exit.** All three docs consistent with `migrations/` + `wrangler.jsonc`.

**Phase 0 exit criteria.** `grep 'cron triggers' AGENTS.md` → "Three"; `grep -c 'migrations' README.md` consistent with 38; T-06 guard (once built) passes.

---

## Phase 1 — Local migration-state ledger (P0, implementation-ready)

**Objective.** A script that diffs `migrations/` against the Wrangler `d1_migrations` tracker.
**Requirements.** REQ-FR-01, REQ-ARCH-01.
**Prerequisites.** Confirm `rg 'd1 migrations (list|apply)' scripts/` is still empty (no collision).
**Dependencies.** None.

### T-03 — Create `scripts/audit-d1-migration-state.ts`
- **Req IDs.** REQ-FR-01, REQ-ARCH-01.
- **Objective.** Reconcile local dir ↔ Wrangler tracker, for `--local` (default) and `--remote` (explicit flag).
- **New file path.** `scripts/audit-d1-migration-state.ts`.
- **Responsibility.**
  1. `ls migrations/*.sql` → local dir set.
  2. `bunx wrangler d1 migrations list ARCH_DB --local|--remote` → applied/pending set (parse the CLI output).
  3. Diff → `{appliedBoth, pendingRemote|pendingLocal, missingFromDir}`.
  4. Print JSON summary + optional markdown artifact (env-configurable paths, matching `generate-cloudflare-d1-restore-rehearsal.ts:438-439` pattern).
  5. Exit non-zero if `missingFromDir` is non-empty (tracker references a migration not in the dir = real problem) OR if parse fails.
- **Reuse.** `d1Execute()` / subprocess pattern from `scripts/verify-cloudflare-hosted-upload-ui-proof.ts:241-266` (generalized for `d1 migrations list`).
- **Contract.** Output shape: `{ generatedAt, mode: "d1-migration-state", target, dirCount, appliedCount, pendingCount, appliedBoth[], pending[], missingFromDir[], ready, localOnly, providerBacked }`.
- **Failure cases.** Wrangler output format change → fail-closed non-zero exit. Empty dir → fail.
- **Validation.** `bun run scripts/audit-d1-migration-state.ts --local` after `wrangler d1 migrations apply ARCH_DB --local`; output should show all 38 applied-both.
- **Tests to add.** `tests/unit/scripts/audit-d1-migration-state.test.ts` (or `tests/unit/` per repo convention) — fixture: a sample `d1 migrations list` output string + sample `ls` → assert diff. Denial test: a migration in tracker but not in dir → `missingFromDir` non-empty → non-zero exit.
- **Completion evidence.** Local run JSON artifact + test pass.
- **Parallelization.** Parallel-safe with Phase 2 (disjoint files).
- **Complexity.** Medium.
- **Status.** `DISCOVERY-REQUIRED` → no; exact path known. `implementation-ready` for `--local`; `--remote` is the hosted-proof gate (owner).

---

## Phase 2 — Schema-existence verifier (P0, implementation-ready)

**Objective.** A script that checks all tables/indexes/triggers/auth-tables exist on a target D1.
**Requirements.** REQ-DATA-01, REQ-DATA-02, REQ-DATA-03, REQ-SEC-01, REQ-ARCH-02.
**Prerequisites.** Confirm `src/lib/cloudflare/better-auth-proof-router.ts:63-69` still defines `EXPECTED_TABLES`/`EXPECTED_INDEXES` (re-read before importing).
**Dependencies.** None (can run standalone; optionally consumes T-03 output to distinguish "pending" vs "drift").

### T-04 — Create `scripts/verify-d1-schema-integrity.ts`
- **Req IDs.** REQ-DATA-01/02/03, REQ-SEC-01, REQ-ARCH-02.
- **Objective.** Verify schema existence on `--local` (default) / `--remote` (explicit).
- **New file path.** `scripts/verify-d1-schema-integrity.ts`.
- **Responsibility.**
  1. Generate expected sets from `migrations/` (regex scan: `CREATE TABLE`, `CREATE [UNIQUE] INDEX`, `CREATE TRIGGER`) — same regexes proven in §7.4.1.
  2. Read auth expected sets from `src/lib/cloudflare/better-auth-proof-router.ts` (import `EXPECTED_TABLES`/`EXPECTED_INDEXES` or duplicate the constants with a sync test).
  3. Query target D1 via `SELECT name FROM sqlite_master WHERE type=? AND name IN (…)` (generalize `better-auth-proof-router.ts:120-128`).
  4. Compute missing/extra per object type.
  5. Compliance gates (REQ-SEC-01): assert `privacy_requests`, `data_retention_events` present; assert `account_security_events` CHECK constraint includes `hmac-sha256:` branch (via `SELECT sql FROM sqlite_master WHERE name='account_security_events'`).
  6. Print JSON summary (shape in `09_…` §9.3); exit non-zero on any missing required object.
- **Reuse.** `listSqliteNames` pattern (`better-auth-proof-router.ts:120-128`); `d1Execute()` wrapper (`verify-cloudflare-hosted-upload-ui-proof.ts:241-266`).
- **Failure cases.** Empty expected set (scanner bug) → fail. Remote unreachable → fail-closed "not run".
- **Validation.** `bun run scripts/verify-d1-schema-integrity.ts --local` after `--local` apply → all PASS.
- **Tests to add.** `tests/unit/scripts/verify-d1-schema-integrity.test.ts`: (a) expected-set generation from a fixture `migrations/` dir; (b) diff logic (missing/extra); (c) denial: empty DB → all FAIL → non-zero exit.
- **Completion evidence.** Local run JSON (all PASS) + test pass.
- **Parallelization.** Parallel-safe with T-03.
- **Complexity.** Medium-Large (regex scanner + D1 query + compliance gates).
- **Status.** `implementation-ready` for `--local`; `--remote` is owner-gated.

---

## Phase 3 — Remote readback + fix-forward runbook execution (P0, BLOCKED-EXTERNAL)

**Objective.** Run the Phase 1 + 2 tools against remote `ARCH_DB` and resolve OPEN-DEC-001/002/003.
**Requirements.** REQ-FR-01 (remote), REQ-DATA-03 (remote), REQ-SEC-01 (remote).
**Prerequisites.** Phases 1 + 2 merged; owner authorization for `--remote`.
**Dependencies.** T-03, T-04.

### T-05 — Execute remote migration-state + schema readback
- **Req IDs.** REQ-FR-01, REQ-DATA-03, REQ-SEC-01.
- **Objective.** Determine the actual remote state of `0033`–`0038` and the remote schema.
- **Commands (owner-gated).**
  ```bash
  bunx wrangler d1 migrations list ARCH_DB --remote
  bun run scripts/audit-d1-migration-state.ts --remote
  bun run scripts/verify-d1-schema-integrity.ts --remote
  ```
- **Target.** Remote `ARCH_DB` only.
- **Decision tree.**
  - If `0033`/`0034`/`0035` pending → owner decides: apply (class A for 0033/0034 — safe; class R for 0035 — follow §7.3, never blind-apply) OR accept as known gap.
  - If a migration "applied" but its table missing → partial apply → follow §7.3 fix-forward (DB-INT-03).
  - If `0035` HMAC CHECK absent remotely → flag P0 compliance drift.
- **Outputs.** Evidence artifacts under `.ai/…/evidence/`; update `current-state.md` with the resolution.
- **Validation.** The verifier reports `ready: true` for remote OR a documented P0 gap.
- **Complexity.** Small (execution) but High-stakes (data integrity).
- **Status.** `BLOCKED-EXTERNAL` (owner-gated hosted proof). Resolves OPEN-DEC-001/002/003.

**Phase 3 exit.** Remote state known and recorded; either clean or a documented fix-forward plan.

---

## Phase 4 — CI/release stale-doc guard (P1, implementation-ready)

**Objective.** A script that prevents doc drift from recurring.
**Requirements.** REQ-OPS-01.
**Prerequisites.** Phase 0 done (so the guard passes as baseline).
**Dependencies.** T-00, T-01.

### T-06 — Create `scripts/check-doc-migration-counts.mjs`
- **Req IDs.** REQ-OPS-01.
- **Objective.** Assert `AGENTS.md` + `README.md` migration/cron claims match reality.
- **New file path.** `scripts/check-doc-migration-counts.mjs` (`.mjs` to match `scripts/neutralize-graph-mandate.mjs` / `validate-ai-workflow-adapters.mjs` convention for non-TS utility scripts).
- **Responsibility.**
  1. `ls migrations/*.sql | wc -l` → actual migration count.
  2. `grep -A4 '"crons"' wrangler.jsonc` → actual cron count (count the string-literal cron entries).
  3. Regex-parse `AGENTS.md` and `README.md` for their migration-count and cron-count claims.
  4. Exit non-zero with a clear diff if any mismatch.
- **Validation.** `bun run scripts/check-doc-migration-counts.mjs` → exits 0 (after Phase 0). Denial: temporarily revert a Phase 0 edit → exits non-zero.
- **Tests to add.** `tests/unit/scripts/check-doc-migration-counts.test.ts` with fixture doc snippets (matching/mismatching) → assert pass/fail.
- **`package.json` entry.** `"check:doc-migration-counts": "node scripts/check-doc-migration-counts.mjs"`.
- **Complexity.** Small-Medium.
- **Parallelization.** Depends on Phase 0; otherwise standalone.
- **Status.** `implementation-ready`.

---

## Phase 5 — Restore rehearsal extension (P1, partially implementation-ready)

**Objective.** Extend the restore rehearsal to cover the real schema set.
**Requirements.** REQ-REL-01.
**Prerequisites.** Phase 2 (for the expected schema set); Phase 3 (for remote reality).
**Dependencies.** T-04, T-05.

### T-07 — Extend `scripts/generate-cloudflare-d1-restore-rehearsal.ts`
- **Req IDs.** REQ-REL-01.
- **Objective.** Add a "real schema" rehearsal mode alongside the existing 5-table fixture.
- **Target file.** `scripts/generate-cloudflare-d1-restore-rehearsal.ts` (existing).
- **Change (additive).** Add a new rehearsal path that:
  1. Builds a local SQLite DB from the real expected schema (all 73 tables, generated per §7.4.1) with minimal column shapes (just `CREATE TABLE` skeletons — enough for `.dump`/import/FK-check).
  2. Runs the existing dump → import → checksum → FK-check flow.
  3. Calls into `verify-d1-schema-integrity.ts`'s expected-set to assert the restored DB has the same object set.
- **Keep existing.** The 5-table `FIXTURE_SQL` rehearsal stays as the default (backward compat); the real-schema mode is opt-in via env or flag.
- **Validation.** `bun run cf:d1-restore-rehearsal` still passes (default mode); the real-schema mode passes when invoked.
- **Tests.** Extend existing restore-rehearsal coverage if present; otherwise a focused unit test on the real-schema-set generation.
- **Complexity.** Medium.
- **Status.** `implementation-ready` for the local extension; hosted `d1 export`/`time-travel restore` rehearsal is owner-gated (`BLOCKED-EXTERNAL`).

### T-08 — Document hosted restore rehearsal limits
- **Req IDs.** REQ-REL-01.
- **Objective.** A short runbook section in `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` (this plan) naming the hosted commands and their destructive nature. (Already done in §7.8 + `13_…`; this task is the implementation-time confirmation that the docs match the extended script.)
- **Complexity.** Small.
- **Status.** `proven` (documented in this plan).

---

## Phase exit gates (summary)

| Phase | Exit gate |
|---|---|
| 0 | T-06 guard passes (after Phase 4 build) OR manual grep confirmation |
| 1 | T-03 local run shows all 38 applied-both; unit test passes |
| 2 | T-04 local run all PASS; unit test passes |
| 3 | Remote verifier `ready: true` OR documented P0 gap + fix-forward plan |
| 4 | T-06 guard exits 0; denial test exits non-zero |
| 5 | Extended rehearsal passes locally with real schema set |

## Rollback considerations (per phase)

- Phases 0, 4, 5: revert commits; no data impact.
- Phases 1, 2: revert commits (remove new scripts); no data impact (read-only).
- Phase 3: no code rollback (execution-only); the recorded evidence stays. If a fix-forward
  SQL was run remotely and was wrong, follow §7.3 / DB-INT-04 restore.

## Documentation updates (implementation-time)

- Add `current-state.md` entry after Phase 3 resolves OPEN-DEC-001/002/003.
- Add the new scripts to any relevant `cf:*` inventory docs (if a script-inventory doc exists).

## Task → requirement mapping (quick view)

| Task | Req IDs |
|---|---|
| T-00 | REQ-DOC-02 |
| T-01 | REQ-DOC-01 |
| T-02 | REQ-DOC-03 |
| T-03 | REQ-FR-01, REQ-ARCH-01 |
| T-04 | REQ-DATA-01/02/03, REQ-SEC-01, REQ-ARCH-02 |
| T-05 | REQ-FR-01, REQ-DATA-03, REQ-SEC-01 |
| T-06 | REQ-OPS-01 |
| T-07 | REQ-REL-01 |
| T-08 | REQ-REL-01 |
| (REQ-FR-02, REQ-FR-03, REQ-DATA-04, REQ-DATA-05, REQ-TEST-01) | satisfied by this plan pack (docs), no impl task needed |

Every requirement in `04_…` is mapped to ≥1 task OR marked `proven` (satisfied by the plan itself).

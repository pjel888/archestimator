# 04 — Requirements Specification

Stable IDs. Every requirement has: statement, rationale, source, priority, dependencies,
acceptance criteria (objective/testable), validation method, affected code areas, risks,
status. Source strength is tagged: `brief`, `repo evidence`, `official docs`, `derived`.

Priority legend: P0 = blocks first users / data integrity; P1 = should ship before first users;
P2 = nice-to-have / hardening.

---

## FR (Functional)

### REQ-FR-01 — Local migration-state ledger
**Statement.** A documented procedure (and ideally a local script) reconciles the local
`migrations/` directory against the Wrangler `d1_migrations` tracker, for both `--local`
preview and `--remote` hosted targets, producing a human-readable "applied / pending /
missing-locally / missing-remotely" diff.
**Rationale.** F-4/F-5: migration-applied state is Wrangler-internal with no script reading it;
the most recent remote signal shows 0033/0034/0035 pending.
**Source.** PROMPT.md "local-vs-remote migration ledger" (brief); `current-state.md:271` (repo evidence).
**Priority.** P0.
**Dependencies.** REQ-ARCH-01.
**Acceptance criteria.**
- AC-FR-01a: Running the ledger procedure against `--local` lists all 38 migrations with applied/pending status, matching `wrangler d1 migrations list ARCH_DB --local` exactly.
- AC-FR-01b: The procedure document names the exact `wrangler d1 migrations list ARCH_DB --remote` command and states that remote execution is owner-gated.
- AC-FR-01c: The diff output distinguishes four states: applied-both, pending-remote, pending-local, missing-from-dir.
**Validation.** Local: run the script (if built) or the documented commands against local preview D1; compare output to `ls migrations/`. Remote: owner runs `--remote` (hosted-proof gate).
**Affected areas.** New script `scripts/audit-d1-migration-state.ts` (proposed); docs in this plan.
**Risks.** RISK-001 (remote state unknown).
**Status.** `pending` (implementation Phase 1).

### REQ-FR-02 — Migration application order is documented and unambiguous
**Statement.** The plan records the canonical application order (lexicographic `0001`→`0038`),
the Wrangler command for each environment, and the dependency relationships between
non-idempotent migrations (e.g., `0037` depends on `0026`).
**Rationale.** F-8; PROMPT.md "migration application order".
**Source.** PROMPT.md (brief); `migrations/` filenames (repo evidence).
**Priority.** P1.
**Dependencies.** —
**Acceptance criteria.**
- AC-FR-02a: A table lists all 38 migrations in order with: filename, creates/alters, idempotent? (Y/N + class), depends-on.
- AC-FR-02b: The Wrangler apply command for local, preview, and remote is named verbatim.
**Validation.** Doc review; cross-check table against `rg` over `migrations/`.
**Affected areas.** `07_DATA_DATABASE_API_NETWORK_PLAN.md`.
**Risks.** —
**Status.** `proven` (this plan provides the table).

### REQ-FR-03 — D1 restore/rollback rehearsal limits documented
**Statement.** The plan documents the D1-specific restore options (`d1 export` + `d1 execute --file`,
`time-travel restore`), their free-tier/destructive limits, and a rehearsal that extends the
existing local fixture toward real schema coverage.
**Rationale.** F-10; PROMPT.md "rollback/rehearsal limits for D1".
**Source.** PROMPT.md (brief); `scripts/generate-cloudflare-d1-restore-rehearsal.ts:75,77,81,84-90` (repo evidence + official-doc URLs).
**Priority.** P1.
**Dependencies.** REQ-DATA-03.
**Acceptance criteria.**
- AC-FR-03a: Restore options, commands, and destructive/non-destructive classification are listed.
- AC-FR-03b: Free-tier limits (no paid Time Travel retention beyond default; `d1 export` row/size considerations) are stated as assumptions and flagged for official-doc confirmation.
- AC-FR-03c: The rehearsal extension proposal covers real-schema coverage (not just the 5-table synthetic fixture).
**Validation.** Doc review; local: `bun run cf:d1-restore-rehearsal` still passes (existing).
**Affected areas.** `scripts/generate-cloudflare-d1-restore-rehearsal.ts` (extension proposal); `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md`.
**Risks.** RISK-005 (hosted restore unproven).
**Status.** `proven` (documentation); `pending` (rehearsal extension implementation — Phase 5, owner-gated).

---

## DATA (Data / Database)

### REQ-DATA-01 — Schema-verification SQL covers all app tables
**Statement.** A schema-verification SQL set (or script) checks existence of all 69 app
tables created by `migrations/` against a target D1 (local preview or remote).
**Rationale.** F-6/F-7; no general schema-drift verifier exists.
**Source.** PROMPT.md "schema verification SQL" (brief); `migrations/` (repo evidence).
**Priority.** P0.
**Dependencies.** REQ-ARCH-02.
**Acceptance criteria.**
- AC-DATA-01a: The verifier's expected-table list contains every table name extracted from `CREATE TABLE` across `migrations/` (69 names, excluding the transient `__hmac_rebuild`).
- AC-DATA-01b: A missing table is reported by name with a clear PASS/FAIL.
**Validation.** Local: run verifier against local preview D1 after `wrangler d1 migrations apply ARCH_DB --local`. Cross-check expected set via `rg -o 'CREATE TABLE…' migrations/`.
**Affected areas.** New script `scripts/verify-d1-schema-integrity.ts` (proposed).
**Risks.** RISK-003 (table set drifts as migrations added).
**Status.** `pending` (Phase 2).

### REQ-DATA-02 — Schema-verification covers all indexes and triggers
**Statement.** The verifier also checks the 134 indexes and 4 triggers.
**Rationale.** F-6; indexes/triggers affect query plans and data constraints, not just existence.
**Source.** PROMPT.md (brief); `migrations/` (repo evidence).
**Priority.** P1.
**Dependencies.** REQ-DATA-01.
**Acceptance criteria.**
- AC-DATA-02a: Expected-index list = 134 names from `CREATE [UNIQUE] INDEX` across `migrations/`.
- AC-DATA-02b: Expected-trigger list = 4 names from `0038`.
**Validation.** Same as DATA-01.
**Affected areas.** Same script.
**Risks.** RISK-003.
**Status.** `pending` (Phase 2).

### REQ-DATA-03 — Schema-verification covers Better Auth tables (out-of-band schema)
**Statement.** The verifier also checks the 4 Better Auth tables (`user`, `session`,
`account`, `verification`) and their 3 indexes, sourced from the canonical Better Auth DDL
(`better-auth-proof-router.ts:63-69`), and flags if they diverge from numbered migrations
(which currently don't contain them — by design).
**Rationale.** F-9; Better Auth schema is a separate canonical source.
**Source.** `src/lib/cloudflare/better-auth-proof-router.ts:63-69` (repo evidence).
**Priority.** P0.
**Dependencies.** REQ-DATA-01.
**Acceptance criteria.**
- AC-DATA-03a: Verifier expected-auth-set = the 4 tables + 3 indexes from `better-auth-proof-router.ts`.
- AC-DATA-03b: Verifier reports whether auth tables are present on the target D1.
- AC-DATA-03c: The plan explicitly states the auth schema is applied out-of-band (not via numbered migrations) so a reader doesn't mistake its absence from `migrations/` for drift.
**Validation.** Local: run verifier; Remote: hosted-proof gate (owner).
**Affected areas.** Same script; reuses `listSqliteNames` pattern.
**Risks.** RISK-004 (auth schema applied differently across envs).
**Status.** `pending` (Phase 2).

### REQ-DATA-04 — Fix-forward policy for every non-idempotent migration
**Statement.** For each of the 7 non-idempotent migrations (`0021`, `0025`, `0028`, `0029`,
`0032`, `0035`, `0037`), the plan specifies the exact re-run failure mode and the fix-forward
action (one-off reconciliation + marking applied in `d1_migrations`), and forbids editing
existing migrations.
**Rationale.** F-8; PROMPT.md "destructive-change review, fix-forward policy".
**Source.** PROMPT.md (brief); `migrations/` (repo evidence).
**Priority.** P0.
**Dependencies.** —
**Acceptance criteria.**
- AC-DATA-04a: Each of the 7 migrations has a row in the fix-forward table (file, op, failure mode, action).
- AC-DATA-04b: The policy explicitly forbids `ADD COLUMN IF NOT EXISTS` retrofitting into existing migrations and explains why (SQLite doesn't support it; editing migrations breaks the audit trail).
- AC-DATA-04c: The partial-apply reconciliation pattern is documented (per-column `PRAGMA table_info` check → add only missing → mark applied).
**Validation.** Doc review.
**Affected areas.** `07_DATA_DATABASE_API_NETWORK_PLAN.md`.
**Risks.** RISK-002 (0035 rebuild especially dangerous).
**Status.** `proven` (this plan provides the table).

### REQ-DATA-05 — Destructive-change review of all 38 migrations
**Statement.** Every migration is classified by destructive potential: additive (CREATE IF NOT EXISTS), mutating (ALTER/UPDATE/DELETE), or rebuild (DROP+RENAME).
**Rationale.** PROMPT.md "destructive-change review".
**Source.** PROMPT.md (brief); `migrations/` (repo evidence).
**Priority.** P1.
**Dependencies.** —
**Acceptance criteria.** AC-DATA-05a: A classification table covers all 38 files.
**Validation.** Cross-check via `rg -c 'DROP|ALTER|UPDATE|DELETE' migrations/`.
**Affected areas.** `07_DATA_DATABASE_API_NETWORK_PLAN.md`.
**Status.** `proven`.

---

## ARCH (Architecture)

### REQ-ARCH-01 — Wrangler is the canonical migration runner; no custom runner introduced
**Statement.** The plan does NOT propose a custom migration runner. It treats Wrangler
`d1 migrations apply`/`list` as canonical and builds only read-only ledger/verifier tooling around it.
**Rationale.** F-4; avoid abstraction sprawl.
**Source.** `package.json`, `README.md:66` (repo evidence).
**Priority.** P0.
**Acceptance criteria.** AC-ARCH-01a: No task in `11_IMPLEMENTATION_PLAN.md` creates a migration applier.
**Validation.** Doc review.
**Status.** `proven`.

### REQ-ARCH-02 — Schema verifier reuses the `listSqliteNames` / `d1Execute` patterns
**Statement.** The verifier generalizes the existing remote schema-check pattern
(`better-auth-proof-router.ts:120-128`) and the script-side `d1Execute()` helper
(`verify-cloudflare-hosted-upload-ui-proof.ts:241-266`) rather than inventing a new mechanism.
**Rationale.** Existing-pattern reuse over novelty.
**Source.** repo evidence.
**Priority.** P1.
**Acceptance criteria.** AC-ARCH-02a: The implementation task cites both reuse sources by file:line.
**Validation.** Doc review.
**Status.** `proven`.

---

## SEC (Security)

### REQ-SEC-01 — Compliance-critical table presence is verified
**Statement.** The verifier explicitly asserts presence of `privacy_requests` (0033),
`data_retention_events` (0034), and the HMAC-upgraded `account_security_events` (0035), because
their absence remotely would silently break the compliance/security program.
**Rationale.** F-8/0035; `0033`/`0034` are DSAR/retention audit tables.
**Source.** `migrations/0033,0034,0035` (repo evidence).
**Priority.** P0.
**Acceptance criteria.** AC-SEC-01a: Verifier flags each of these three tables as a named compliance gate, not just a generic table-count.
**Validation.** Local + remote verifier.
**Status.** `pending` (Phase 2; remote is owner-gated).

---

## REL (Reliability)

### REQ-REL-01 — Restore rehearsal covers real schema, not only synthetic fixture
**Statement.** The restore-rehearsal extension proposal covers dumping and re-importing the
real D1 schema (all tables), not just the 5-table synthetic fixture.
**Rationale.** F-10.
**Source.** `scripts/generate-cloudflare-d1-restore-rehearsal.ts:92-154` (repo evidence).
**Priority.** P1.
**Acceptance criteria.** AC-REL-01a: Extension proposal names how to derive the real schema set (from REQ-DATA-01 expected list) and run dump/import/checksum against it locally.
**Validation.** Local: extended rehearsal passes; checksums match; FK check clean.
**Status.** `pending` (Phase 5; hosted is owner-gated).

---

## OPS (Operations)

### REQ-OPS-01 — CI/release stale-doc guard
**Statement.** A local script (wireable into a restored GH Actions workflow) asserts that
documentation migration/cron counts match `migrations/` and `wrangler.jsonc` reality, failing
non-zero on drift.
**Rationale.** F-1/F-2; PROMPT.md "CI/release checks that prevent stale documentation".
**Source.** PROMPT.md (brief); `README.md:36,39,211`, `AGENTS.md:40` (repo evidence of drift).
**Priority.** P1.
**Acceptance criteria.**
- AC-OPS-01a: Script checks `AGENTS.md` and `README.md` migration-count claims against `ls migrations/ | wc -l`.
- AC-OPS-01b: Script checks cron-count claims against `grep '"crons"' wrangler.jsonc`.
- AC-OPS-01c: Script exits non-zero on mismatch with a clear diff message.
**Validation.** Local: run script; expect it to fail today (because README.md is stale) and pass after Phase 0 doc fixes.
**Affected areas.** New script `scripts/check-doc-migration-counts.mjs` (proposed).
**Status.** `pending` (Phase 4).

---

## TEST (Testing)

### REQ-TEST-01 — Test execution matrix covers every requirement
**Statement.** A Test Execution Matrix maps every requirement to a concrete local command or a documented hosted-proof gate.
**Rationale.** Creating-Plan-Prompt §12.
**Source.** directive.
**Priority.** P0.
**Acceptance criteria.** AC-TEST-01a: Matrix exists in `12_TEST_AND_VALIDATION_STRATEGY.md` with no untraced requirement.
**Validation.** Doc review.
**Status.** `proven`.

---

## DOC (Documentation)

### REQ-DOC-01 — Reconcile `README.md` migration/cron drift
**Statement.** `README.md:36,39,211` are updated to reflect 38 migrations, latest `0038`, and 3 crons.
**Rationale.** F-1.
**Source.** repo evidence.
**Priority.** P1.
**Acceptance criteria.** AC-DOC-01a: After edit, `README.md` matches `migrations/` count and `wrangler.jsonc` crons; REQ-OPS-01 script passes.
**Validation.** Run REQ-OPS-01 script.
**Status.** `pending` (Phase 0).

### REQ-DOC-02 — Reconcile `AGENTS.md` cron drift
**Statement.** `AGENTS.md:40` is updated to list all three crons.
**Rationale.** F-2.
**Source.** repo evidence.
**Priority.** P1.
**Acceptance criteria.** AC-DOC-02a: After edit, `AGENTS.md` lists three crons matching `wrangler.jsonc`; REQ-OPS-01 script passes.
**Validation.** Run REQ-OPS-01 script.
**Status.** `pending` (Phase 0).

### REQ-DOC-03 — Record PROMPT.md premise staleness
**Statement.** A note (in this plan, and optionally a non-destructive annotation in `PROMPT.md`) records that the prompt's "through 0036" and "AGENTS.md older count" premises are stale, so a future reader isn't misled.
**Rationale.** F-3; SAD-001/002.
**Source.** repo evidence.
**Priority.** P2.
**Acceptance criteria.** AC-DOC-03a: This plan's `02_FEATURE_BRIEF_AND_SCOPE.md` records the staleness (done).
**Validation.** Doc review.
**Status.** `proven` (recorded in this plan).

---

## Shadow-path matrices

The "flows" for a migrations plan are migration-apply flows. Shadow paths are in
`07_DATA_DATABASE_API_NETWORK_PLAN.md` (Database Change Blueprints DB-INT-01…DB-INT-05).
Summary of covered shadow paths: partial apply, re-run after success, re-run after partial
failure, apply out-of-order, apply with dirty tracker, apply with missing dependency table,
rollback after partial success.

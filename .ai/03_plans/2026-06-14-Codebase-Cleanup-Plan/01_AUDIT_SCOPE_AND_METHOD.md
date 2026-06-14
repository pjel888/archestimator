# 01 — Audit Scope and Method

## Mandate

Whole-app cleanup intelligence pass: dead/dead-reachable/deprecated/duplicated/stale/superseded/non-MVP code, plus unused deps, stale schema/migrations, duplicate abstractions, and pre-launch MVP simplification. **Audit + deletion-readiness + migration-readiness + validation-design only.** No implementation.

## Non-goals (hard constraints honored)

- No source edits, no file deletion, no `package.json` change, no migrations applied.
- No Supabase/Vercel/GitHub/DNS/provider mutation; no secret exposure; no paid add-ons.
- No SlateCamp or unrelated provider projects.
- No irreversible data loss; destructive DB cleanup only behind documented dump+rollback+owner gate.

## Inputs read first

README.md, package.json, AGENTS.md, `.ai/03_plans/README.md`, `.ai/10_state/known-issues.md` (partial — 408 lines), `.ai/10_state/current-state.md` (436 KB — grepped, not read whole), plus `.ai` directory structure. Stack/flag/feature context cross-checked against AGENTS.md standing DB authorization and the closed-beta posture.

## Method — 8 concurrent read-only research lanes

Each lane used `rg`/`find`/file reads only; none edited, queried a DB, or called a provider. Lanes: (1) routes/API, (2) components/hooks/stores, (3) server actions/repos/domain, (4) DB schema/migrations/RPCs/RLS/types, (5) deps/scripts/patches/build, (6) tests/storybook/e2e/prove, (7) assets/env/flags/config, (8) docs/.ai/watchlist. Ephemeral `knip`/`depcheck`/`madge` were run via `bunx` without modifying `package.json`. Static gates (`type-check`, `lint`, `lint:design-system`, `test`, `test:dom`, `build`) were run and logged.

Findings were cross-reconciled by the lead (e.g. the dead landing sections import live `ab-testing` infra — confirmed that deleting them does **not** orphan `ab-testing`; the "2 failing tests" guessed by lane 6 were corrected against the actual `test-dom.log`).

## Reference-analysis rules (applied to every candidate)

20 reference classes (see `evidence/import-reference-index.md`): direct/dynamic imports, Next route conventions, server-action/form-action bindings, fetch URLs, link hrefs, router calls, Supabase `.rpc()`/`.from()`/select strings, SQL refs, test/story/script imports, env conditionals, docs/.ai refs, generated-types refs, CSS class/data-attr refs, Playwright selectors, external provider/route expectations. **No file is "safe delete" on absent TS imports alone** — route files, SQL, selectors, dynamic strings, and provider callbacks can be externally reachable.

## Language discipline (used throughout)

- **Safe delete** — reference analysis + type/build impact + ownership all clear.
- **Likely dead** — no imports, but dynamic/string usage not fully ruled out.
- **Stale but referenced** — still imported, only by obsolete tests/docs/flags.
- **MVP-cut candidate** — works, but should be removed to simplify pre-launch scope.
- **Needs migration proof / Owner gate / Blocked** — schema/destructive/security-sensitive or proof-blocked.

## Confidence calibration

Every finding carries a confidence and a decision (`DELETE_NOW` / `DELETE_AFTER_LOCAL_PROOF` / `DELETE_AFTER_MIGRATION_DRY_RUN` / `OWNER_GATE` / `KEEP_FOR_NOW`). Production schema cleanup is never marked "safe" without rollback/dump. Where proof requires a live DB or running app, the item is marked BLOCKED and deferred to the matching phase.

## Coverage map (prompt categories → docs)

| Category | Doc |
|---|---|
| Dead routes/API | 05 |
| Components/hooks/stores/utilities | 06 |
| Server actions/repos/domain | 07 |
| DB schema/migrations/RPCs/RLS/types | 08 |
| Dependencies/scripts/patches/build | 09 |
| Tests/Storybook/E2E/harnesses | 10 |
| Assets/env/flags/config | 11 |
| Docs/.ai/comments | 12 |
| Speed/complexity | 13 |
| Validation/migration/risk/phases/readiness/open-questions | 14–19 |

# 10 — Blast Radius And Dependencies

## 10.1 Direct impact

| Area | Impact class | Evidence |
|---|---|---|
| `migrations/*.sql` (38 files) | **Verification only** (read) — no edits | §7.2; `AGENTS.md:41` forbids editing |
| `AGENTS.md:40` (cron claim) | **Required change** (Phase 0: 2→3 crons) | F-2; `wrangler.jsonc:59-65` |
| `README.md:36,39,211` (migration + cron claims) | **Required change** (Phase 0: 29→38 migrations, 2→3 crons, latest 0029→0038) | F-1 |
| New: `scripts/audit-d1-migration-state.ts` | **New file** (Phase 1) | REQ-FR-01 |
| New: `scripts/verify-d1-schema-integrity.ts` | **New file** (Phase 2) | REQ-DATA-01/02/03 |
| New: `scripts/check-doc-migration-counts.mjs` | **New file** (Phase 4) | REQ-OPS-01 |
| `scripts/generate-cloudflare-d1-restore-rehearsal.ts` | **Possible change** (Phase 5 extension, additive) | REQ-REL-01; DB-INT-04 |
| `package.json` (new script entries) | **Required change** (additive: `cf:d1-migration-state`, `cf:d1-schema-integrity`, `check:doc-migration-counts`) | REQ-OPS-01 |
| `PROMPT.md` (this plan's prompt) | **Optional annotation** (note stale premise) | REQ-DOC-03; P2 |

## 10.2 Transitive impact (if a migration is found unapplied remotely)

If `DB-INT-01`/`DB-INT-02` reveal a recent migration is unapplied on remote `ARCH_DB`, the
transitive impact is on every code path that reads the affected table:

| Migration (if unapplied remotely) | Affected code paths (consumers of the table) | Runtime symptom |
|---|---|---|
| `0033` (`privacy_requests`) | privacy/intake route + repository | Privacy intake fails or errors |
| `0034` (`data_retention_events`) | retention cron (`30 3 * * *`) logging | Retention actions unlogged (compliance gap) |
| `0035` (`account_security_events` HMAC) | audit-event writes expecting `hmac-sha256:` | Audit writes may fail CHECK constraint OR silently use `sha256:` |
| `0036` (`cost_library_component_drafts`) | component-draft feature reads/writes | Component-draft feature broken |
| `0037` (taxonomy removal) | (data only; no table) | None — already applied per `current-state.md:65-67` (ASSUMP-004) |
| `0038` (draft triggers) | component-draft inserts/updates exceeding limits | Limits not enforced; possible oversized drafts |

These are **the risks the plan exists to surface**, not risks the plan creates. The plan's
scripts themselves are read-only and create no runtime risk.

## 10.3 Classification of all impacts

| Impact | Classification |
|---|---|
| Doc edits (`AGENTS.md`, `README.md`) | Required change |
| New scripts (3) | Required change (new files) |
| `package.json` script entries | Required change (additive) |
| Restore-rehearsal extension | Possible change (Phase 5) |
| Existing `cf:d1-*` proof scripts | Explicitly unaffected (reused as patterns, not modified in core slices) |
| Application source (`src/`) | Explicitly unaffected (no UI/runtime change) |
| `migrations/*.sql` | Explicitly unaffected (read-only) |
| Better Auth runtime | Explicitly unaffected |
| R2 / DO / Queue / Email | Explicitly unaffected |
| Legacy Supabase | Explicitly unaffected (out of scope) |
| Worker deployment | Explicitly unaffected (scripts are dev/CI only) |

## 10.4 Backward compatibility

- Doc edits: improve accuracy; no behavioral change.
- New scripts: additive; do not affect existing scripts or runtime.
- No API contract changes. No DTO changes. No migration format changes.

## 10.5 Dependencies

### In-plan dependencies
- Phase 4 (doc guard) depends on Phase 0 (doc fixes) — otherwise the guard fails today (which is correct behavior, but the docs should be fixed first so the guard passes as the baseline).
- Phase 3 (remote readbook) depends on Phases 1 + 2 (the tools to run remotely).
- Phase 5 (restore rehearsal) depends on Phase 3 (real schema set).

### External dependencies
- Wrangler CLI (must be installed; it is — `package.json` uses `bunx wrangler`).
- Cloudflare credentials (for `--remote`; owner-gated).
- The `d1 migrations list` output format (a CLI contract; stable but not versioned).

### Downstream consumers
- Future release reviewer: consumes the verifier/ledger artifacts as first-user gate evidence.
- Future implementation agents: consume this plan pack as the canonical D1-integrity procedure.

## 10.6 Affected documentation

| Doc | Change |
|---|---|
| `AGENTS.md:40` | Add third cron `30 3 * * *` |
| `README.md:36,39,211` | Update migration count (29→38), latest (0029→0038), cron count (2→3) |
| `package.json` | Add 3 script entries |
| This plan pack | The canonical reference (already written) |
| `current-state.md` | Should get an entry recording the reconciliation once executed (post-implementation) |

## 10.7 Other active development work

Per `current-state.md` FAST PATH, there are concurrent workstreams (component sidebar sync,
cost-library governance, beta-support feedback). None of them touch the files this plan
modifies (`AGENTS.md:40` cron line, `README.md` migration/cron lines, new `scripts/` files,
`package.json` script entries) except potentially `package.json` (additive — low collision
risk). The implementation agent must re-read `package.json` immediately before editing it
and declare file-scope ownership in a coordination ledger (`00_COORDINATION_LEDGER.md` at
implementation time, not this planning folder).

## 10.8 Risk-concentration note

The highest-risk concentration is migration `0035` (class R rebuild). If it is partially
applied or re-run on remote, the `account_security_events` audit table is at risk of data
loss. The plan treats `0035` as the single most dangerous migration and gives it a dedicated
fix-forward row (§7.3) and compliance gate (REQ-SEC-01).

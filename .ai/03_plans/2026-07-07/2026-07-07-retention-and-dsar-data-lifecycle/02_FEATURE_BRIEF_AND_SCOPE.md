# 02 — Feature Brief and Scope

## Feature brief (source)

From `PROMPT.md`:

> Create a plan pack that makes **retention policy and DSAR execution real** across D1, R2, logs, feedback, shares, proposals, and operational evidence.

Required plan pack elements (verbatim from PROMPT.md):

> Include **data inventory, retention TTL decisions, DSAR export/delete workflow, cron proof, R2 deletion proof, log retention boundaries, evidence format, legal-owner signoff points, and tests.**

Constraints:

> Do not invent legal commitments; identify owner decisions explicitly. Do not claim compliance from code-only checks.

Stop condition:

> The pack is complete when it defines the exact implementation and proof needed for retention and DSAR readiness.

Evidence to start from (from PROMPT.md):
- `.ai/10_state/compliance/retention-schedule.md` and the current-state record retention work still open.
- `src/lib/compliance/retention-core.ts`, `src/lib/cloudflare/scheduled-upload-jobs.ts`, `worker.ts`, migration `0034`.
- Privacy-request intake exists, but full data-class propagation and deletion/export proof are not complete.
- Log retention and support feedback handling overlap with observability and support-readiness work.

## Scope decomposition — every required element → where it is satisfied

| PROMPT.md required element | Definition location | Implementation plan |
|---|---|---|
| **Data inventory** | `03_SOURCE_AND_CODEBASE_AUDIT.md` §1–§9 + `07_` data-class table | Phase 0 (inventory codification) in `11_` |
| **Retention TTL decisions** | `04_` (REQ-RET-002), `15_` DEC-002, `07_` §retention-policy SoT | Phase 1 in `11_`; `OPEN-DEC-004` gate |
| **DSAR export/delete workflow** | `04_` (REQ-DSAR-*), `06_` DSAR state machine, `07_` propagation map | Phases 2–4 in `11_` |
| **Cron proof** | `09_` evaluator, `13_` 30-day gate, `12_` cron tests | Phase 5 in `11_` |
| **R2 deletion proof** | `06_` R2 lifecycle, `07_` R2 blueprint, `12_` R2 receipt test | Phase 4 in `11_` |
| **Log retention boundaries** | `18_` stack contract, `13_` ops, `07_` logs classes | Phase 1 (rules) + `13_` (proof) |
| **Evidence format** | `19_` evidence classes + `data_retention_events` schema | Phase 1 + `13_` |
| **Legal-owner signoff points** | `15_` `OPEN-DEC-*` table, `13_` release gates | Isolated gates, not silently resolved |
| **Tests** | `12_` test execution matrix + `19_` adversarial matrix | Phase 6 in `11_` |

## In-scope surfaces (concrete)

### Retention engine
- `src/lib/compliance/retention-core.ts` — rule registry, apply/dry-run driver, audit writer.
- `src/lib/compliance/retention-repository.ts` — server-only D1 adapter.
- `worker.ts` `scheduled()` handler (cron `30 3 * * *`).
- New rule entries for the 7 unwired classes; new action handlers for `anonymized`/`tombstoned`/`soft_deleted`/`skipped_legal_hold`.

### DSAR / privacy lifecycle
- `src/lib/compliance/privacy-request-repository.ts` — add status-transition + export + erasure functions.
- `src/app/api/compliance/privacy-requests/route.ts` — intake (exists); add admin triage routes/actions.
- New admin triage surface (route + server action + repository), read-only-planned UI states in `05_`.
- New DSAR export builder (data-subject data package) + delivery path.
- New DSAR erasure orchestrator (reuses `src/lib/mass-deletion/` pattern).

### R2 / storage lifecycle
- `src/lib/uploads/r2-storage-provider.ts` (the `removeObjects` boundary).
- `src/lib/uploads/cleanup-job.ts` + `cleanup.ts` (existing upload cleanup; DSAR erasure reuses the storage-cleanup target/correlation pattern).
- `src/lib/mass-deletion/bulk-action.ts` (`StorageCleanupTarget`, `StorageCleanupReport`, `validateTypedConfirmationPhrase`, `createBulkActionCorrelationId`).

### D1 schema (new migrations)
- `deleted_at` / `anonymized_actor` columns on audit event tables (`account_security_events`, `collaboration_audit_events`, `estimate_sheet_events`, `shared_link_events`).
- Soft-delete on `profiles` (the D1 user record) + a DSAR erasure ledger (preferred over mutating Better Auth `user`).
- Optional `legal_hold` column on retention-target tables (behind a flag).
- Optional `retention_policy` D1 table (Phase N+, single source of truth for TTLs).

### Observability / logs
- Cloudflare Workers Observability (platform-managed; documented + observed, not engine-enforced).
- Cloudflare Email delivery logs (platform-managed; documented + observed).
- `data_retention_events` as the unified retention/DSAR audit trail.

### Operations
- Runbook (`13_`), dashboard queries, alerts, 30-day hosted observation gate.

## Out-of-scope (explicit non-goals)

1. **No code/migration/test implementation in this pack** — planning only.
2. **No self-serve public DSAR portal** — admin triage surface only. Self-serve export UI is a separate epic (roadmap `08-legal-privacy-compliance-readiness.md:63`).
3. **No legal TTL invention** — all periods pinned to draft schedule pending `OPEN-DEC-004`.
4. **No compliance claim** — no "GDPR-ready"/"DPA-compliant" assertions; only "implementation-ready, pending legal sign-off + hosted proof."
5. **No Better Auth schema migration** — Better Auth-managed `user`/`session`/`account`/`verification` tables are not ALTERed by D1 migrations. DSAR erasure uses a privacy ledger + revocation, not schema mutation of auth tables.
6. **No Supabase/Vercel/Resend runtime work** — historical/provider-exit surfaces only, referenced as boundaries.
7. **No legacy `supabase/migrations/` extension** — migration archaeology only.
8. **No paid Cloudflare add-ons** — stay on free/bundled tier (current cost posture, `AGENTS.md`).
9. **No automated Git branch/worktree creation** — shared live worktree; coordinate by file ownership.
10. **No AI audit content expansion** — the AI classes (`ai_action_runs` etc.) get TTL rules only; raw prompt/response retention is a separate, later policy decision (decisions.md `2026-05-24` entry).

## Stakeholders
- **Owner**: Philip Lewis (product + cost posture + the `OPEN-DEC-*` decisions).
- **Legal counsel**: owns `OPEN-DEC-002`, `OPEN-DEC-004`, `OPEN-DEC-006` (legal hold), `OPEN-DEC-007` (DSAR SLA).
- **Engineering**: implements the pack (future implementation AI).
- **Operations**: owns the 30-day cron observation gate, runbook adherence, alert response.
- **Data subjects**: the end users whose data is retained/erased (no direct UI in this scope beyond the existing public intake).

## Success metrics (planning pack quality, not feature metrics)
- Every PROMPT.md required element maps to a concrete document + phase + REQ.
- Every REQ has a stable ID, acceptance criteria, shadow-path coverage, and test entry.
- Every DB task has a blueprint + rollback.
- Verification mode recorded; readiness cap applied honestly.
- No internally resolvable P0/P1 gap remains after the critique-revision cycle.

## Failure metrics (what would make the pack fail its own readiness bar)
- A vague task ("update the backend", "add tests").
- An approximate path/symbol where exact placement is knowable.
- A missing shadow-path cell on a DSAR/retention flow.
- A TTL presented as policy rather than draft-pending-`OPEN-DEC-004`.
- A compliance claim from code-only evidence.
- A missing legal sign-off point for a decision that is genuinely external.

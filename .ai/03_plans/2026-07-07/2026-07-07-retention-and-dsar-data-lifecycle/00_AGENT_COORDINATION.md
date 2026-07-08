# 00 — Agent Coordination, Master Goal, and Ledger

Plan pack: `2026-07-07-retention-and-dsar-data-lifecycle`
Plan folder (absolute): `/Users/philiplewis/Documents/archestimator/.ai/03_plans/2026-07-07-retention-and-dsar-data-lifecycle`
Profile: `exhaustive` (touches D1 schema, R2 lifecycle, Cloudflare Cron, app authorization, DSAR/privacy, security, data integrity, release/compliance readiness).
Mode: **planning only**. No application code, tests, migrations, or provider state is modified by this pack.
Date convention: Asia/Manila `2026-07-07` (folder already exists from caller; this pack was authored on 2026-07-08 UTC / 2026-07-08 PHT — the folder date is preserved per the caller's PROMPT.md).

---

## Master `/goal`

### Outcome
Make retention policy and DSAR (data subject access request) execution **real** across D1, R2, worker logs, support feedback, shares/proposals, and operational evidence — turning the draft `retention-schedule.md` and partial cron/audit pieces into a defined, testable, provable implementation that a future implementation AI can execute without rediscovering requirements.

### Problem being solved
Archestimator has a retention *engine* (`retention-core.ts`), a `data_retention_events` audit table (migration `0034`), a privacy-request *intake* (`privacy-request-repository.ts` + public POST route), and a daily cron hook in `worker.ts`. But the picture is incomplete:

1. **Only 7 of 14 declared retention classes have rules** in `DEFAULT_RETENTION_RULES`. The AI audit classes, logs classes, `uploads_orphaned`, and `sessions_expired` are declared in the type but not enforced.
2. **All enforced actions are `purged`** (hard `DELETE`). The `tombstoned` / `anonymized` / `soft_deleted` / `skipped_legal_hold` actions exist only as enums — no rule uses them.
3. **DSAR erasure propagation is not implemented at all** (per `retention-schedule.md:46-56`). There is no status-transition function (`in_triage → in_progress → completed`), no admin triage UI, no consumer of `listPrivacyRequests`, and no export-delete propagation to `users`/`profiles`, audit event tables, or R2 uploads.
4. **Soft-delete schema is almost absent**: only `cost_library_item_variant_cost_entries.deleted_at` exists. There is no `deleted_at`/`anonymized_at` on users/profiles, projects, or estimates, and **no `legal_hold` column exists anywhere** despite a `skipped_legal_hold` action.
5. **Cron proof is local-only**: the retention pass runs in `worker.ts scheduled()` but has no env-gated dry-run flag and no hosted/30-day observation evidence. The PROMPT requires "cron proof."
6. **R2 deletion proof** for the upload lifecycle exists for the upload-cleanup job (`upload_events`) but not for DSAR-driven erasure.
7. **TTLs are DRAFT, gated on `OPEN-DEC-004`** counsel sign-off. The pack must not invent legal commitments; it must isolate owner/legal decisions.

### Intended feature behavior (target state, summarized)
- A complete, codified retention rule registry covering all 14 classes, with TTL values pinned to the owner-approved schedule (defaulting to the draft schedule pending `OPEN-DEC-004`), and with non-purge actions (`anonymized`, `tombstoned`, `soft_deleted`) actually wired where the schedule calls for them.
- A DSAR lifecycle: intake (exists) → triage (admin UI + action) → **export** (data subject data package) → **erasure** (propagation to `users`/`profiles`, audit events, R2 uploads) → evidence (audit row + operator-visible proof), with status transitions enforced server-side.
- A cron surface that is provably running on the bound Worker, with dry-run staging, apply mode, per-run audit rows, and a 30-day hosted observation gate.
- An R2 deletion-proof path that records tombstone + delayed purge for DSAR-affected uploads.
- Log-retention boundaries documented for Cloudflare Workers Observability and Cloudflare Email, with redaction rules and access-review proof.
- Operational evidence: runbooks, dashboards/queries, alerts, and the exact hosted proof required before claiming compliance.
- Legal/owner sign-off points (`OPEN-DEC-002`, `OPEN-DEC-004`) isolated as explicit decision gates, never silently resolved.

### Planning scope
- Retention engine completion (rule registry, non-purge actions, batching, idempotency).
- DSAR export + erasure workflow (server actions, repositories, propagation map, R2 path).
- Admin triage surface (read-only plan; UI states, authz, audit).
- Cron + R2 + log-retention operational proof design.
- Evidence/runbook/observation definitions.
- Tests, adversarial QA matrix, rollout/rollback.

### Non-goals (explicit)
- **No code implementation in this pack** — this is planning only.
- Do not mutate D1, R2, the Worker, queues, or any provider state.
- Do not run, extend, or repair legacy `supabase/migrations/` (migration archaeology only).
- Do not invent legal TTLs or claim compliance; legal commitments require `OPEN-DEC-004` and counsel.
- Do not design a public-facing self-serve DSAR portal UI beyond what is needed for an admin triage surface; self-serve export UI is a separate future epic (flagged in roadmap `08-legal-privacy-compliance-readiness.md:63`).
- Do not change Better Auth session lifecycle internals; `sessions_expired` retention is modeled as accepting Better Auth's own expiry, with the cron only sweeping D1-side references if any.
- Do not tackle unrelated provider-exit work (Supabase/Vercel/Resend) except as legacy-evidence boundaries.

### Required codebase analysis
- `src/lib/compliance/` (retention + privacy request repos).
- `worker.ts` `scheduled()` + `queue()` handlers; `wrangler.jsonc` triggers/bindings.
- `src/lib/cloudflare/scheduled-upload-jobs.ts`, `upload-job-queue.ts`, `src/lib/uploads/cleanup*.ts`, `r2-storage-provider.ts`.
- `migrations/0033, 0034, 0035, 0014, 0010, 0006, 0007, 0023, 0002, 0001, 0003` (and 0008 access-settings).
- `src/lib/authz/d1-access.ts` (the `can*InD1` app-authz helpers).
- `src/lib/publication/` (publication + shared-link events for shared-link retention + DSAR recipient data).
- `src/lib/mass-deletion/` (the existing hard-delete + R2 cleanup pattern to reuse for DSAR erasure).
- `src/lib/auth/account-audit.ts` + `account-audit-d1-store.ts` (HMAC hashing, legacy sha256 purge).

### Required specialist workstreams
Product/scope, codebase architecture, DSAR/privacy data model, D1 schema/migrations, R2/storage lifecycle, security/privacy threat model, performance/reliability, test/QA adversarial matrix, operations/rollout, blast radius, adversarial gap analysis, independent final verification.

### Implementation-readiness criteria (for the *pack*, not the feature)
A future implementation AI can execute every phase without rediscovering requirements: exact files, symbols, migration SQL sketches, propagation map, shadow-path matrices, test matrix, and proof gates — with all owner/legal decisions isolated as `OPEN-*` gates.

### Validation criteria (for the pack)
- Every requirement has a stable `REQ-*` ID, acceptance criteria, shadow-path coverage, and a test entry.
- Every DB-touching task has a Database Change Blueprint + rollback.
- Performance evaluator + rollout gates defined where relevant.
- Adversarial scenario matrix covers the runtime surfaces.
- Readiness scoring honest; verification mode recorded.

### Stop condition
The pack is complete when it defines the exact implementation and proof needed for retention and DSAR readiness, every internal decision is resolved or explicitly isolated as an owner/legal gate, and the critique-revision cycle leaves no internally resolvable P0/P1 gap.

---

## Skills discovered and used

| Skill | Used? | Why |
|---|---|---|
| `archestimator-plan-pack` | Yes | Binds the generic planning contract to Archestimator's `.ai/03_plans/<date>-<slug>/` + `LOOP_LEDGER` convention and the proportionality rules. |
| `writing-plans` / `ce-plan` / `plan` | (Referenced) | Generic planning skills; the `archestimator-plan-pack` override binds them. Not invoked separately — the `Creating-Plan-Prompt.md` directive is the active planning contract. |
| `Explore` (subagent) | Yes | Two parallel read-only Explore agents produced the source inventory and the D1 schema/migration audit (evidence cited in `03_` and `07_`). |
| `gitnexus` | Not used | The discovery work was bounded and well-served by `rg` + targeted reads; proportional-graph policy says skip the graph for narrow/local reads. |
| `cloudflare` / `wrangler` / `workers-best-practices` | (Referenced) | Provider behavior (D1, R2, Cron, Queues, Email, Workers Observability) is cited from `wrangler.jsonc`, `worker.ts`, and current source, not from skill memory. |
| `durable-objects` / `cloudflare-email-service` | (Referenced) | DO is `COLLAB_ROOMS` (collab only); Email is transactional. Neither is mutated by this plan; referenced as boundaries. |
| `ultrawork` / `ultragoal` / `ultraqa` / `autopilot` / `performance-goal` / `autoresearch(-goal)` | (Named, not invoked) | The directive requires the pack to *reflect* these workflow shapes for future implementation; they are not run during planning. |

No skill was fabricated. No tool output was invented. Where a capability was unavailable, it is recorded.

---

## Agent / workstream orchestration

This pack was produced by a single lead orchestrator (the authoring agent) with **two native `Explore` subagents** dispatched in parallel for read-only discovery, plus emulated specialist passes for the dimension analyses. The structure:

| Lane | Role | Native or emulated | Owned scope |
|---|---|---|---|
| Lead coordinator | Scope, synthesis, all document authorship, final verification | Same agent (lead) | All `NN_*.md` files |
| Source & codebase audit (Explore #1) | Retention/DSAR/privacy/cron/R2/migration code inventory | **Native subagent** (read-only) | Returns findings; lead writes `03_` |
| D1 schema & migration audit (Explore #2) | Full table schemas, soft-delete infra, authz pattern, cron, cf scripts | **Native subagent** (read-only) | Returns findings; lead writes `03_`/`07_` |
| Product/scope, UX, architecture, data, security, perf, test, ops, blast-radius, adversarial, verifier | Dimension analyses | **Emulated** as separated passes by the lead | All dimension docs |
| Independent final verifier | Requirement-by-requirement + cross-doc consistency audit | **Emulated** (no second native agent available) → `verification_mode: emulated` → readiness cap applies | `17_FINAL_READINESS_REVIEW.md` |

Coordination ledger (per the directive, a live table):

| Lane | /goal | Scope | Evidence | Dependencies | Findings | Conflicts | Status |
|---|---|---|---|---|---|---|---|
| Lead | Author exhaustive pack | All docs | Cited inline | Explore lanes | — | — | In progress |
| Explore #1 | Retention/DSAR/privacy code inventory | `src/lib/compliance`, `worker.ts`, `scheduled-upload-jobs.ts`, `upload-job-queue.ts`, publication, migrations | File paths + symbols in `03_` | None | 7/14 rules enforced; DSAR propagation absent; intake exists, triage/export/erasure missing; dual audit table | None | Complete |
| Explore #2 | D1 schema + migration + authz audit | `migrations/0001–0039`, `src/lib/authz/d1-access.ts`, `wrangler.jsonc`, `package.json` cf scripts | Table schemas + helper map in `03_`/`07_` | None | `deleted_at` scarce; no `legal_hold`; profiles is the D1 user record; Better Auth tables out-of-band; cron = 3 triggers; HMAC rotation mid-flight | None | Complete |
| Product/scope (emulated) | Scope + non-goals | PROMPT + roadmap | `01_`, `02_` | Explore | Legal gates `OPEN-DEC-002/004` | None | Complete |
| Architecture (emulated) | Target architecture + contracts | All source | `06_` | Explore | Reuse mass-deletion R2 pattern; unify audit via `data_retention_events` not `upload_events` | None | Complete |
| Data/DB (emulated) | Migrations + blueprints | `migrations/` + repos | `07_` | Explore | New migrations for `deleted_at`, DSAR propagation, `legal_hold` optional | None | Complete |
| Security/privacy (emulated) | Threat model + denial tests | Auth, shares, R2 | `08_` | Explore | DSAR = privileged abuse surface; legal-hold abuse; cross-workspace | None | Complete |
| Perf/rel/ops (emulated) | Evaluator + cron proof + runbook | Worker, D1, R2 | `09_`, `13_` | Explore | D1 batch limits; cron 30-day gate; R2 tombstone window | None | Complete |
| Test/QA (emulated) | Adversarial matrix + test matrix | All surfaces | `12_`, `19_` | All | 16+ adversarial scenarios | None | Complete |
| Adversarial reviewer (emulated) | P0/P1 gap hunt | Whole pack | `17_`, `19_` | All | Listed findings → revised | None | Complete |
| Final verifier (emulated) | Requirement audit + readiness | Whole pack | `17_` | All | See verification mode cap | None | Complete |

Because true independent verification by a different native agent was not available, `verification_mode: emulated` is recorded and the readiness cap is applied in `17_FINAL_READINESS_REVIEW.md`.

---

## Concurrent-repository safety notes

- All writes are confined to `.ai/03_plans/2026-07-07-retention-and-dsar-data-lifecycle/`.
- No application code, tests, migrations, package manifests, or provider state touched.
- `git status` checked before authoring; working tree was clean at session start.
- No branches created, switched, or pushed; no worktrees.
- If another agent edits a file in this folder concurrently, re-read before updating (the directive's high-concurrency discipline).

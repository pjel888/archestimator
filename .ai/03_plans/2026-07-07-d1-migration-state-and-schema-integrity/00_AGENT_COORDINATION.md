# 00 — Agent Coordination

**Plan:** D1 Migration State And Schema Integrity
**Date:** 2026-07-07
**Verification mode:** `emulated` (separated review passes by the same lead agent; no native independent verifier available in-session). Caps overall readiness at 97 and holds the package at `CONDITIONALLY READY` for a high-blast-radius topic pending owner / independent review.

---

## Master Goal (`/goal`)

**Intended outcome.** Before first users, Archestimator must be able to prove that its
active Cloudflare D1 database (`ARCH_DB`, `archestimator-proof-db`) is in a known,
reconcilable migration state and that its schema matches the canonical source defined by
`migrations/` plus the out-of-band Better Auth DDL — without any agent or human having to
guess which document, script, or provider snapshot is authoritative.

**Problem being solved.**
1. Documentation drift: `README.md` claims 29 migrations / 2 crons; `PROMPT.md` claims "through 0036"; `AGENTS.md` is correct on migrations (38/0038) but stale on crons (says 2, actual 3).
2. No local-vs-remote migration ledger: migration-applied state is Wrangler-internal (`d1_migrations` table); no script reads it; `.ai/10_state/current-state.md:271` records 0033/0034/0035 as pending remotely as of 2026-07-06 with no later resolution.
3. No general schema-drift verifier: the only real remote schema check (`src/lib/cloudflare/better-auth-proof-router.ts:120-128`) covers 4 Better Auth tables only; the two inventory scripts (`cf:inventory`, `audit-dbidx-repo.ts`) scan the legacy `supabase/migrations/` dir, not active `migrations/`.
4. Non-idempotent migrations (`0021`, `0025`, `0028`, `0029`, `0032`, `0035`, `0037`) create partial-apply / re-run risk that has no documented repo-wide fix-forward policy.
5. Restore rehearsal is local-SQLite-only on a synthetic fixture; `providerBacked: false`.

**Planning scope.** Produce an exhaustive, evidence-grounded plan pack that defines: a
local-vs-remote migration ledger approach, schema-verification SQL, migration application
order, destructive-change review, fix-forward policy, D1 rollback/rehearsal limits, and
CI/release checks that prevent stale documentation.

**Non-goals.**
- Do NOT apply, roll back, edit, or reorder any migration.
- Do NOT change application code (the plan's implementation slices are additive scripts + docs only).
- Do NOT touch legacy Supabase (`supabase/migrations/`, project `ebxxqidacheyapmmzavr`).
- Do NOT enable paid Cloudflare tiers.
- Do NOT prove hosted performance, cost, or OAuth/magic-link cutover (out of scope).
- Do NOT mutate provider state. This is planning only.

**Authoritative inputs (source authority model).**
- `PROMPT.md` — product intent (but its evidence premises are partly stale; see `02_FEATURE_BRIEF_AND_SCOPE.md`).
- `AGENTS.md`, `wrangler.jsonc`, `package.json`, `migrations/`, `src/`, `scripts/`, `.ai/10_state/current-state.md` — implementation reality (highest authority on conflict).
- Creating-Plan-Prompt / Multi-Agent-Execution-Directive — planning discipline.
- Older plans / model memory — lowest authority.

**Major workstreams.**
- W-A Documentation drift reconciliation.
- W-B Migration-state ledger (local ↔ remote).
- W-C Schema-existence verification (tables/indexes/triggers + Better Auth).
- W-D Destructive-change / non-idempotency review + fix-forward policy.
- W-E Restore/rollback rehearsal limits for D1.
- W-F CI/release stale-doc guard.

**Safety constraints / forbidden actions.** No `git reset --hard`/`clean`/force-push/branch-or-worktree-creation/history-rewrite. No edits outside this plan folder during planning. No provider mutation. No paid-tier enablement. No legacy Supabase mutation.

**File/module ownership model.** During planning: all writes confined to this plan folder. During future implementation: file-scope ownership declared in a coordination ledger; additive scripts go under `scripts/`; doc edits are isolated to `AGENTS.md`, `README.md`, and (optionally) `PROMPT.md`.

**Acceptance criteria (planning task).**
1. The plan pack contains all required `exhaustive`-profile documents.
2. Every requirement is traced (source → task → AC → validation).
3. Schema-verification SQL covers all 69 app tables + 4 Better Auth tables + 134 indexes + 4 triggers.
4. Fix-forward policy covers every non-idempotent migration.
5. README states a canonical readiness status with an explicit reason for any cap.
6. No application code is intentionally modified.

**Validation requirements / evidence classes.** Local static (file inspection, `rg`, `grep`, `ls`) is the primary evidence class for this planning task. Hosted/provider-backed proof is explicitly out of scope and recorded as a gate, not claimed.

**Review / adversarial QA gates.** Two emulated critique-and-revision cycles (required minimum for `exhaustive`) plus a final emulated verifier pass. See `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md`.

**Final deliverables.** The 22 documents in this folder (00–19 + README + provider appendices 20–21).

**Stop condition.** Planning complete when all completion gates in §17 of Creating-Plan-Prompt pass OR a documented bounded exception explains why another cycle would not improve correctness. **Blocker condition:** if repo evidence is insufficient to ground a recommendation, mark `BLOCKED-EVIDENCE`/`BLOCKED-EXTERNAL` with options + recommendation (do not invent certainty).

---

## Skills discovered / used

| Skill | Used? | Why (or why not) |
|---|---|---|
| `archestimator-plan-pack` | Yes (read) | Confirms `exhaustive` profile is correct for D1/migration/data-integrity work; defines the `LOOP_LEDGER.md` pattern. |
| Creating-Plan-Prompt | Yes (governing) | Defines the exhaustive document set, readiness scoring, and completion gates. |
| Multi-Agent-Execution-Directive | Yes (governing) | Defines authority model, verification-mode caps, concurrent-repo safety. |
| `cloudflare` / `wrangler` / `durable-objects` | Read (referenced) | Consulted for Wrangler `d1 migrations` semantics; no skill execution needed for a planning-only task. |
| `gitnexus` | Not used | Code-intelligence graph; this plan's claims are proven by direct `rg`/file reads against `migrations/`, `scripts/`, `wrangler.jsonc`. Per AGENTS.md proportional policy, graph tools are for broad/unfamiliar refactors, not narrow local evidence. |
| `ultraqa` / `ultrawork` / `autopilot` | Not invoked | Planning-only task; the directive's loop is run in-session by the lead. Three `Explore` subagents were dispatched for parallel read-only discovery (recorded below). |

No skill was fabricated. No unavailable required skill was encountered.

---

## Multi-agent orchestration (record of what ran)

| Lane | Role | Native or emulated | Output |
|---|---|---|---|
| Lead coordinator | Scope, synthesis, integration, final claim | Single agent (this lead) | This plan pack |
| Discovery lane 1 — migration application mechanism | How are D1 migrations applied? Is there a ledger table? | **Native `Explore` subagent** (dispatched) | Confirmed: Wrangler `d1 migrations apply`; `d1_migrations` is Wrangler-internal; no custom runner. |
| Discovery lane 2 — documentation drift | Where are migration/cron/provider facts documented, and which are stale? | **Native `Explore` subagent** (dispatched) | Drift inventory: `README.md` (29/2 crons) stale; `AGENTS.md` migrations current, crons stale; `PROMPT.md` premise partly stale. |
| Discovery lane 3 — schema-verification tooling | What remote-D1 / schema-drift tooling exists to reuse? | **Native `Explore` subagent** (dispatched) | Only `better-auth-proof-router.ts` does real remote schema checks (4 tables); `cf:inventory` + `audit-dbidx-repo.ts` scan legacy Supabase dir. |
| Adversarial reviewer | P0/P1/P2 gap hunt | Emulated pass by lead | `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` |
| Final verifier | Requirement-by-requirement audit | Emulated pass by lead | `17_FINAL_READINESS_REVIEW.md` |

Three real native `Explore` subagents were dispatched (read-only). Adversarial review and final verification were emulated (same agent, separated passes) because no independent verifier lane was available; this is recorded honestly and caps readiness at 97.

---

## Coordination ledger

| Lane | Goal | Owned scope | Dependencies | Current work | Findings | Decisions / rejected alternatives | Conflicts | Validation evidence | Status |
|---|---|---|---|---|---|---|---|---|---|
| Discovery-1 | Migration apply mechanism | `migrations/`, `scripts/`, `src/`, `package.json`, `.ai/03_plans/*` | none | complete | Wrangler `d1 migrations apply` is the only applier; `d1_migrations` is Wrangler-internal; no custom runner | Rejected: "there is a custom migrate script" — disproven | none | file:line refs in `03_SOURCE_AND_CODEBASE_AUDIT.md` | COMPLETE |
| Discovery-2 | Doc drift inventory | `AGENTS.md`, `README.md`, `wrangler.jsonc`, `migrations/`, `.ai/10_state/current-state.md`, `.ai/06_specs/`, `DESIGN.md` | none | complete | `README.md` stale (29 mig / 2 crons); `AGENTS.md` mig current, crons stale; `PROMPT.md` premise partly stale | — | none | file:line refs in `03_SOURCE_AND_CODEBASE_AUDIT.md` | COMPLETE |
| Discovery-3 | Schema-verify tooling | `scripts/cf:d1-*`, `scripts/audit-dbidx-repo.ts`, `src/lib/cloudflare/better-auth-proof-router.ts`, evidence dir | none | complete | Only Better Auth router does remote schema checks (4 tables); inventory scripts scan legacy Supabase | Reuse recommendations recorded | none | file:line refs in `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md`, `07_DATA_DATABASE_API_NETWORK_PLAN.md` | COMPLETE |
| Lead | Synthesize plan | this folder | Discovery 1-3 | complete | 14 reqs, 11 tasks, 22 docs | — | none | `git diff --check` after each write; all writes inside plan folder | COMPLETE |
| Adversarial | P0/P1/P2 gap hunt | whole pack | Lead synthesis | complete | findings in `19_…` | — | none | emulated pass | COMPLETE |
| Verifier | req-by-req audit | whole pack | Lead + Adversarial | complete | verdict in `17_…` | `verification_mode: emulated` → cap 97 | none | emulated pass | COMPLETE |

---

## Source authority decisions

- **SAD-001:** When `PROMPT.md` says "through 0036" but `migrations/` has 0037/0038, the
  repo directory wins. The plan covers 0033–0038 (broader than the prompt's 0033–0036),
  and notes the prompt premise is stale rather than silently smoothing it.
- **SAD-002:** When `PROMPT.md` says "AGENTS.md still references an older latest migration
  count" but `AGENTS.md:41` actually shows 38/0038 (current), the plan records that the
  prompt's premise is itself stale on migrations (though `AGENTS.md` IS stale on crons).
- **SAD-003:** Better Auth D1 schema (`user/session/account/verification`) is canonical
  from `src/lib/cloudflare/better-auth-proof-router.ts:63-69` and
  `src/lib/auth/better-auth-cloudflare.ts:254` (`compileCloudflareBetterAuthD1Migrations`),
  NOT from the numbered `migrations/` files. The plan treats both as canonical sources
  that must agree in the verifier.

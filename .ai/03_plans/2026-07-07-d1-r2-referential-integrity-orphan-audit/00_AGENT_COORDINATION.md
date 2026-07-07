# 00 — Agent Coordination

Plan folder: `.ai/03_plans/2026-07-07-d1-r2-referential-integrity-orphan-audit`
Date: 2026-07-07
Plan profile: `exhaustive`
Verification mode: `emulated` (single planning agent ran separated analysis + adversarial + verification passes; no independent native verifier lane was available in-session)

---

## Master /goal

Produce an evidence-based, codebase-specific **planning package** that gives a future executor a precise, safe audit-and-remediation path for cross-store referential integrity across D1 records and R2 upload objects before first production users.

Concrete deliverables:

1. A complete ownership-relationship inventory across all 38 active D1 migrations and every R2-storing code path.
2. A canonical orphan taxonomy distinguishing (a) D1 rows without parents, (b) R2 objects without owning D1 rows, (c) D1 rows referencing deleted R2 objects, and (d) cross-store drift after partial failure.
3. A dry-run-first detection design (SQL orphan checks + R2-key reconciliation) that emits safe, redacted evidence.
4. A repair policy gated behind dry-run + evidence + owner review; no destructive cleanup without explicit gates.
5. A CI/operator cadence recommendation and an interaction model with retention (0034) and DSAR (0033) workflows.
6. A migration-safe forward path for closing the load-bearing FK-enforcement gap.

Intended outcome: an executor can build the orphan-audit tooling, run it read-only against preview/prod D1+R2, and remediate findings without silent data loss.

Problem being solved: referential integrity across D1↔R2 and across D1 parent→child tables is enforced only partially and inconsistently. Headline gap: **no `PRAGMA foreign_keys = ON` exists anywhere** (`rg` confirmed empty), so every declared `ON DELETE CASCADE / SET NULL` is unverified at runtime; the entire 0014 publication cluster (7 tables) has zero FK declarations; multiple production delete paths desync D1 rows from R2 objects.

Planning scope (this pack): analysis + design + implementation-readiness for the orphan-audit capability. **Not** the execution of the audit itself against production data.

Non-goals:
- Not implementing the audit tooling (planning only).
- Not mutating D1/R2/provider state (planning only).
- Not designing a workspace/user hard-delete feature (called out as a blocker for full DSAR closure, but out of scope for the audit pack itself).
- Not re-litigating the Cloudflare migration (complete).

Specialist workstreams (covered, with evidence): product strategy, codebase architecture, UX (operator/report surface), backend/API, data/database/migrations/integrity, security/privacy/authz, performance/reliability, testing/QA, rollout/operations, blast radius, adversarial gap analysis, final verification.

Implementation-readiness criteria: see `17_FINAL_READINESS_REVIEW.md`.

Validation criteria: planning package passes the completion gates in `Creating-Plan-Prompt.md` §17; every requirement traceable; shadow-path matrices complete for the audit/report flows.

Final planning deliverables: docs 00–21 listed in the README.

Stop condition: the pack gives an executor a precise, dry-run-first, evidence-output, owner-gated audit and remediation path for cross-store referential integrity before production use (matches PROMPT.md stop condition).

Blocker condition: any unresolved P0 finding in `14_RISK_REGISTER.md` that an executor cannot safely work around, or a missing owner decision on FK-enforcement remediation (OPEN-DEC-001).

---

## Orchestration model used

| Lane | Role | Native or emulated | Evidence location |
|---|---|---|---|
| Lead coordinator & synthesizer | Scope, synthesis, document integration, final claim | This agent (same) | All docs |
| D1 schema & FK analyst | Map all 38 migrations, ownership edges, cascade behavior, FK-enforcement gap | Native subagent (Explore) | Source: agent_65964725; synthesized into `03`, `07`, `10` |
| Uploads/R2 code analyst | Map `src/lib/uploads/`, `src/lib/cloudflare/`, R2 delete paths, D1↔R2 linkage | Native subagent (Explore) | Source: agent_d33e0e9c; synthesized into `03`, `07`, `08` |
| Cross-entity lifecycle & app-authz analyst | Deletion cascades, publication/share lifecycle, retention/DSAR, Better Auth | Native subagent (Explore) | Source: agent_cc0108db; synthesized into `06`, `07`, `08`, `13` |
| Test & tooling inventory analyst | Existing tests, D1/R2 harness, package scripts, restore rehearsal | Native subagent (Explore) | Source: agent_adece17a; synthesized into `12`, `13` |
| Adversarial reviewer | Disprove readiness, find omissions, challenge assumptions | Emulated pass (this agent) | `19` adversarial matrix + `17` critique log |
| Final verifier | Requirement-by-requirement completion audit | Emulated pass (this agent) | `17` |

**Verification-mode cap applied:** because the final verifier is emulated (same agent, separated pass), overall readiness is capped at 97 and the package status is capped at `CONDITIONALLY READY` for the high-blast-radius slices pending a real independent reviewer or owner acceptance. See `17`.

---

## Coordination ledger

| Agent / lane | /goal | Scope | Evidence | Dependencies | Findings | Conflicts | Status |
|---|---|---|---|---|---|---|---|
| D1 schema analyst | Map tables, FKs, cascades across migrations | `migrations/0001–0038` | 69 tables, ownership edge list, R2 key columns | none | 0014 cluster has zero FKs; no `PRAGMA foreign_keys=ON`; declared-only cascade risk | none | complete |
| Uploads/R2 analyst | Map R2/D1 linkage and delete paths | `src/lib/uploads/`, `src/lib/cloudflare/`, upload routes | delete-path table, D1↔R2 linkage contract | none | user-initiated DELETE routes desync R2 from D1; cleanup job never sets terminal statuses; no R2 reconciliation | none | complete |
| Lifecycle/authz analyst | Map deletion cascades, publication/share, retention, DSAR | `src/lib/{projects,estimates,publication,compliance}/*`, `worker.ts` | cascade map, retention sweep scope, DSAR gap | D1 schema inventory (for table names) | project delete omits `estimate_sheet_events`/`estimate_sheet_adjustments` explicit deletes; revoke leaves publication children; no DSAR fulfillment pipeline; Better Auth tables never deleted in prod | none | complete |
| Test/tooling analyst | Map existing tests + harness + scripts | `tests/`, `scripts/`, `package.json`, restore rehearsal | test inventory, harness description, gap list | none | no full-schema D1 harness; no orphan-detection queries; no R2-vs-D1 reconciliation; `uploads_orphaned`/`sessions_expired` declared but unimplemented | none | complete |
| Lead synthesizer | Integrate into plan pack | all docs | this pack | all four analyst lanes | FK-enforcement gap is the load-bearing P0; remediation is two-track (defense-in-depth explicit deletes + enable-and-prove FKs) | none | complete |
| Adversarial reviewer | Disprove readiness | all docs | `19` matrix + `17` critique | synthesized pack | found 3 P1/P2 doc gaps in cycle 1 (orphan-report redaction spec, dry-run exit-code contract, cost model for R2 `list()` scan) — corrected in cycle 2 | none | complete |
| Final verifier | Requirement-by-requirement audit | all docs | `17` | synthesized pack | verification_mode emulated → readiness cap 97, status cap CONDITIONALLY READY | none | complete |

---

## Skills discovered and used

| Skill | Why relevant | Used |
|---|---|---|
| `archestimator-plan-pack` | Canonical plan-pack skill for this repo | Inspected for structure conventions |
| `cloudflare` / `cloudflare-one-migrations` | D1 migration + provider-boundary context | Read for D1 migration semantics |
| `durable-objects` | DO room semantics referenced in blast radius | Read (out of primary scope; COLLAB_ROOMS unaffected) |
| `supabase-postgres-best-practices` | Compare D1 vs Postgres FK behavior | Read for contrast only; no Supabase mutation |
| GitNexus (`.agents/skills/gitnexus`) | Code-graph impact for symbol edits | **Not invoked** — this is a planning-only task with no symbol edits; `rg` + targeted reads were the proportional choice per AGENTS.md graph policy |

Unavailable / not invoked:
- No native independent verifier lane available in-session → final verification is `emulated`, cap applied.
- `playwright`/browser QA not applicable (no browser-only claim in a planning pack).
- Supermemory local memory not queried (no server binary configured in this session; `.ai/` is the canonical truth per AGENTS.md).

No skills were fabricated. No agent executions were invented.

---

## Concurrent-repository safety

- All writes are confined to `.ai/03_plans/2026-07-07-d1-r2-referential-integrity-orphan-audit/`.
- `git status` was clean at start; no application code, tests, migrations, or configs were modified.
- The folder contained only `PROMPT.md` before this run; it was preserved unchanged.
- No branches created, switched, or pushed. No worktrees created.

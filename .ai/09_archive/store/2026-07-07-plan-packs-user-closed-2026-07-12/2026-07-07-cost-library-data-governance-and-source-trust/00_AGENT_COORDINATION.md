# 00 — Agent Coordination and Master Goal

Date: 2026-07-07
Plan folder: `.ai/03_plans/2026-07-07-cost-library-data-governance-and-source-trust/`
Plan profile: `exhaustive` (touches D1 schema, app authorization, data integrity, multi-source provenance, and first-user trust — all high-blast-radius per `AGENTS.md` and the plan-pack skill).
Classification: `planning-only` — produce the plan pack only. No application code, tests, migrations, schemas, provider state, or runtime data changes.

## Master `/goal`

**Outcome.** Archestimator's production cost library becomes the *trusted, reviewable, honestly-surfaced* source of component costs that estimators commit into estimates. Before first users, every library cost has auditable provenance, a defined review state, a trust label, and a freshness signal that flows correctly into estimate rows. Stale, low-confidence, draft, and superseded sources are surfaced honestly — never silently trusted — and import/export is safe.

**Problem being solved.** The repo carries a complete, durable cost-library trust-governance model in legacy Supabase/Postgres (`supabase/migrations/20260622143000_library_trust_governance.sql` — review enums, assignment, lock/unlock, supersede, attachment approval, admin-only RPCs, optimistic-revision conflicts), but the **active Cloudflare D1 + Next.js Server Action write path mirrors only a schema subset and calls none of those governance RPCs**. The D1 variant cost entries lack `review_status / assigned_to / review_due_at / locked_by`. The `source-changed` estimate-row link state is *read* by the trust gate but **never written** when a library item changes — so stale propagation is effectively dead. There is no library CSV/JSON/Excel import or export. Confidence is free text. Currency is hardcoded to PHP. This plan closes those gaps for first-user trust without inventing authoritative cost data.

**Intended feature behavior (target state).**
1. Every library cost entry carries provenance (source, pricing date, confidence, currency, region/version where applicable), a review state (proposed/needs-review/accepted/rejected/superseded), an owner/assignee, and an audit trail.
2. A draft → review → accept/reject/lock/supersede workflow exists on the active D1 path with admin/editor authorization.
3. Library trust chips and estimate commit trust gates read from this governance state, not just free-text confidence.
4. Updating an accepted library cost entry flips consuming estimate rows to `link_state = 'source-changed'` (lazy/computed or materialized — an explicit decision in this plan), so the gate's `source-changed` branch is no longer dead.
5. Stale / very-stale / missing-price windows are honored and surfaced in browse, inspector, templates, overview, and export.
6. Safe library import/export with formula-injection guards, row limits, dry-run preview, and provenance/review-field normalization.
7. Owners can mark honest "owner decision" sources whose authority they stand behind, distinct from "imported" or "unverified."

**Planning scope (in scope).**
- D1 schema additions + migration(s) for governance columns on `cost_library_item_variant_cost_entries` and any new review-event table.
- App-level (no D1 native RLS) authorization for review/accept/lock/supersede/assignment actions.
- Server Actions and Route Handler coverage in `src/lib/component-library/actions.ts` and `src/app/api/component-library/`.
- Estimate-side stale propagation contract (`link_state='source-changed'`) and the read/write boundary.
- Trust-model + chips + commit-gate updates in `src/components/workshop/library/source-trust-model.ts` and consumers.
- Import/export safety (new feature) for the library.
- Provenance model (source taxonomy, confidence enum/taxonomy, region/version/currency).
- Audit trail (version/state history extensions + new review events).
- Tests, adversarial matrix, rollout gates.

**Non-goals (explicitly out of scope).**
- Inventing or seeding authoritative cost values. Per PROMPT.md: do not invent authoritative cost data. All seed/import data is an explicit owner decision.
- Multi-currency FX conversion engine. Currency is recorded and surfaced; conversion is an owner-gated future decision.
- Migrating off D1 or reintroducing Supabase as the active runtime. Supabase governance migration is *reference evidence* for parity, not the target runtime.
- Rewriting the existing versioning/lifecycle/price-history model (already present in D1) — this plan extends it, not replaces it.
- Building a new design system. UI uses existing `src/components/ui/` primitives and existing chip patterns.
- Changing the broader estimate-sheet architecture beyond the stale-propagation contract.

**Required codebase analysis.** Covered in `03_SOURCE_AND_CODEBASE_AUDIT.md`.

**Required specialist workstreams.** Listed in the ledger below; outputs distributed across `03`–`13`, `19`.

**Implementation-readiness criteria.** Defined per phase in `11_IMPLEMENTATION_PLAN.md`; package readiness in `17_FINAL_READINESS_REVIEW.md`.

**Validation criteria.** Test execution matrix in `12_TEST_AND_VALIDATION_STRATEGY.md`; adversarial matrix in `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md`.

**Final planning deliverables.** `README.md` + `01`–`19` (this exhaustive profile).

**Stop condition (for this planning task).** Pack is complete when every required document is present, every requirement is traceable, every phase has exact paths/symbols or a documented blocker, and the autonomous review loop converges or hits its bounded cap with residual findings recorded.

**Constraints.**
- Do not invent authoritative cost data. Mark owner decisions and unknown source commitments explicitly (`DEC-*`, `OPEN-*`).
- Stay inside the bound Cloudflare resources in `wrangler.jsonc` (D1 `ARCH_DB`, R2 `ARCH_UPLOADS_R2`). Never mutate the historical Supabase project `ebxxqidacheyapmmzavr`.
- Stay on free-tier Cloudflare posture (no paid add-ons without owner approval).
- Planning-only: no code/test/migration/provider changes.

## Plan pack conventions

- **Statuses (canonical suite labels):** `IMPLEMENTATION-READY`, `CONDITIONALLY READY`, `NOT READY`. Older aliases (`READY`, `READY WITH EXTERNAL DECISIONS`) are mapped, not used as primary.
- **Readiness caps from verification mode:** `independent` → 98–100; `emulated` → cap 97; `same-agent` → cap 94 and cannot support `IMPLEMENTATION-READY` for high-risk packages. This pack's verification mode is recorded in `17_FINAL_READINESS_REVIEW.md`.
- **Stable IDs:** `REQ-*`, `FR-*`, `UX-*`, `A11Y-*`, `ARCH-*`, `DATA-*`, `API-*`, `SEC-*`, `PERF-*`, `REL-*`, `OPS-*`, `TEST-*`, `DOC-*` (requirements); `WP-*` (work packages); `TASK-*` (implementation tasks); `AC-*` (acceptance criteria); `RISK-*`; `DEC-*`; `OPEN-*` (open decisions); `GATE-*` (verification/release gates); `SRC-*` (source evidence).
- **Source strength tags:** `brief`, `repo evidence`, `official docs`, `provider proof`, `assumption`, `derived`, `owner-delegated decision`.

## Skills discovered and used

| Skill | Used? | Why |
|---|---|---|
| `archestimator-plan-pack` | Yes | Binds this pack to Archestimator's `.ai/03_plans/<date>-<slug>/` + loop convention and high-blast-radius trigger. |
| `Creating-Plan-Prompt.md` / `Multi-Agent-Execution-Directive.md` | Yes | The authoritative planning + execution directive this pack implements. |
| `gitnexus` (impact/context) | Available, not invoked for this pack | Cost-library surface is already mapped by direct read audit; proportional policy says use the graph for broad/unfamiliar refactors, not narrow well-mapped edits. Implementation phase *may* use `impact()` before editing symbols. |
| `ultraqa` | Referenced in `19` as the adversarial-QA shape for future implementation | Not invoked at planning time (no runtime to test). |
| `ultrawork` / `ultragoal` / `autopilot` / `autoresearch` / `performance-goal` | Documented in `19` as the recommended implementation-time shapes | Not invoked at planning time. |
| `cloudflare-one-migrations` / `durable-objects` / `workers-best-practices` | Available | Will inform `07`/`18` for D1 migration shape; not needed at planning time. |

No skill was fabricated. No capability claimed without evidence.

## Multi-agent orchestration (emulated)

Native subagents for this planning task were unavailable in a way that produces a durable independent verifier output, so specialist lanes were run as **emulated separated analysis passes** by the lead planner (read-only audit delegation was used for the codebase sweep). Per the directive, this caps the readiness claim and is recorded in `17`. The final verifier pass is `verification_mode: emulated`.

### Coordination ledger

| Lane | `/goal` | Scope | Evidence | Dependencies | Findings | Conflicts | Status |
|---|---|---|---|---|---|---|---|
| Lead coordinator | Synthesize exhaustive pack from brief + repo evidence | All documents | `SRC-*` | All lanes | Dual persistence drift; dead `source-changed` propagation; D1 schema gap; no import/export | — | complete |
| Source & requirements analyst | Extract requirements from PROMPT.md + repo | `01`,`02`,`04`,`16` | `SRC-PROMPT`,`SRC-AUDIT` | — | 7 requirement families; owner-decision constraints | — | complete |
| Codebase architecture analyst | Map current files/symbols/patterns | `03`,`06`,`10` | delegated read audit | — | Files, symbols, dual-layer drift, estimate integration | — | complete |
| Product/UX/a11y planner | User journeys, UI states, keyboard/focus/ARIA | `05`,`19` | `SRC-UI`,`SRC-TRUST-MODEL` | requirements | Existing chips/gates/filters; gaps in review UX | — | complete |
| React/Next specialist | Server/Client boundaries, cache, mutations | `06`,`18` | `SRC-ACTIONS`,`SRC-REPO` | architecture | `"use server"` actions; TanStack invalidation; revalidation | — | complete |
| Backend/API/integration planner | Server Actions, Route Handlers, contracts | `06`,`07` | `SRC-API` | architecture | Attachments route; authz model; missing review actions | — | complete |
| Data/database planner | D1 schema, migrations, app-authz, indexes, rollback | `07`,`11` | `SRC-MIGRATIONS`,`SRC-SUPABASE-GOV` | architecture | D1 governance column gap; Supabase parity reference; stale-propagation gap | — | complete |
| Security/privacy reviewer | Threat model, authz, input validation, abuse | `08` | `SRC-AUTHZ`,`SRC-VALIDATION` | data, backend | Review-action authorization; import injection; enumeration; tenant isolation | — | complete |
| Performance/reliability reviewer | Baseline, budgets, evaluator, degraded behavior | `09`,`13` | `SRC-PERF` | data, backend | Stale-propagation write fan-out cost; index needs; evaluator contract | — | complete |
| Test/QA strategist | Unit/DOM/integration coverage, adversarial matrix | `12`,`19` | `SRC-TESTS` | all | Test execution matrix; existing test inventory; gaps | — | complete |
| Operations/rollout planner | Flags, deploy sequence, monitoring, rollback | `13` | `SRC-OPS` | performance | Migration apply order; preview→prod gates; rollback | — | complete |
| Integration reviewer | Cross-lane compatibility | `10`,`17` | all | all | Estimate↔library contract; template health; export parity | — | complete |
| Adversarial reviewer | Disprove readiness, find omissions | `17`,`19` | all | all | Residual findings recorded; caps applied | — | complete |
| Final verifier (emulated) | Requirement-by-requirement audit | `17` | all | all | Verifier matrix; `verification_mode: emulated` | — | complete |

### Open decisions (owner-required) — summarized here, detailed in `15`

| ID | Decision | Why external | Recommendation | Impact if deferred |
|---|---|---|---|---|
| `OPEN-1` | Seed/import authoritative cost data source(s) | PROMPT.md forbids inventing authoritative cost data | Owner names source(s) or explicitly accepts "no seed data, all user-entered" | Review workflow exists but has no real accepted costs to govern |
| `OPEN-2` | Currency/region model (PHP-only vs multi-currency recorded vs FX) | Product scope decision | Record currency + region labels now; defer FX conversion | Blocks multi-region trust labeling; does not block PHP-only governance |
| `OPEN-3` | Confidence taxonomy (free text vs enum) | UX + data-shape decision | Introduce structured enum + keep free-text note | Free text continues to drive chip labels by regex |
| `OPEN-4` | Stale-propagation mechanism (materialized column vs computed-on-read vs queue) | Architecture tradeoff (cost vs freshness) | Computed-on-read at estimate load + optional async materialization | Either keeps gate honest; materialized has write cost |
| `OPEN-5` | Reviewer role (workspace admin only vs editor-with-admin-override vs platform admin) | Authz model decision | Workspace admin/editor split matching Supabase `require_cost_library_governance_admin` parity | Blocks who can accept/lock/supersede |
| `OPEN-6` | Library import format priority (CSV vs JSON vs Excel) | UX/priority decision | CSV first (lowest risk), JSON for round-trip, Excel later | Blocks import safety work ordering |

These are `CONDITIONALLY READY` gates, not implementation blockers for the schema/authz/trust-label work, which can land independently.

## Autopilot / durable-goal / loop discipline (for future implementation)

Recorded here per §4A of the directive so the implementation AI inherits the contract:

- **Autopilot shape:** `clarify (OPEN-1..6) → consensus plan (this pack) → durable goal execution (phases in 11) → code review → adversarial QA (matrix in 19)`.
- **Ultragoal-style ledger:** every phase in `11` carries Goal ID, objective, scope, requirements covered, required evidence, completion audit, checkpoint artifacts, stop condition, blocker condition, review gate, QA gate.
- **Ultrawork-style parallelization:** each phase classifies tasks parallel-safe / sequential-dependency / sequential-shared-file / not-worth-delegating.
- **Performance-goal contract:** in `09`/`13` (stale-propagation fan-out evaluator; library browse p95).
- **UltraQA adversarial matrix:** in `19`.
- **React/Next review gate:** in `18`.

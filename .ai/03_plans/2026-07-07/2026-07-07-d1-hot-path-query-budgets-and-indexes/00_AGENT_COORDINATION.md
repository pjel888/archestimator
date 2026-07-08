# 00 — Agent Coordination

## Master goal (recorded per Section 2 of the directive)

**User/business outcome:** First users of the closed beta experience the `/workshop` app as fast and predictable. No first-user route silently scans an unindexed column, fans out into an N+1, or exceeds a Cloudflare subrequest ceiling.

**Problem being solved:** Today D1 query budgets and index coverage are partial. Migration `0031` fixed the single hottest project-list query. Eight D1-backed repositories have no dedicated query-budget/p95 proof. The hosted D1 runtime proof covers 5 generic synthetic surfaces, not the real repository functions. No subrequest budget is defined anywhere. One classic N+1 (`canEditEstimateInD1` per estimate in `estimates/page.tsx`) and several unbounded `SELECT *` reads remain.

**Intended feature behavior (planning-level):** Measurable per-route D1 query-count + p95 + subrequest budgets, published as a single table; additive indexes that close every EXPLAIN-confirmed full-scan gap on first-user paths; local SQLite proof per repository; hosted D1 proof covering real repository functions; CI gates that fail when a budget regresses.

**Planning scope:** D1 hot-path query/index readiness only.

**Non-goals:** general UX, bundle size, DO realtime scale, R2 ops, migration-state integrity, full OWASP authz refresh (sibling packs own those).

**Required codebase analysis:** repository-layer D1 query map; migration index inventory; existing perf-script inventory; route→repository call graph for first-user paths; per-request auth cost.

**Required specialist workstreams:** product strategy, codebase architecture, data/database, performance/reliability, test/QA, security (auth-floor), operations/rollout, adversarial review, final verification.

**Implementation-readiness criteria:** every task has exact repo-relative paths + symbols; every requirement has objective acceptance criteria; every database-impacting task has a migration blueprint + rollback; hosted-proof gaps are isolated to safe `DISCOVERY-REQUIRED` steps.

**Validation criteria:** critique-and-revision cycles complete for exhaustive profile; final readiness review records verification mode; no internally resolvable P0/P1 gap remains.

**Final planning deliverables:** this 20-document pack.

## Specialist workstream lanes used

| Lane | Mode | Goal / scope | Owned docs |
|---|---|---|---|
| Lead coordinator | same-agent | Scope, sequencing, integration, final synthesis | All (integration) |
| Source & codebase architecture analyst | emulated (Explore subagent `agent_a22204d9`) | Route→repo→query map for first-user hot paths; index-coverage analysis | `03`, `06`, `10` |
| D1/repository data analyst | emulated (Explore subagent `agent_5355d53e`) | Per-repository query shapes, N+1 detection, index gaps, cross-tenant scoping | `03`, `07`, `11` |
| Performance & proof-script analyst | emulated (Explore subagent `agent_69f738d4`) | Existing proof-script inventory, budget definitions, hosted-vs-local gaps | `09`, `11`, `12` |
| Product strategy & requirements | same-agent | Convert brief to requirements with stable IDs | `02`, `04` |
| UX/a11y planner | same-agent (minimal — non-UI plan) | Confirm plan is non-UX; record why dynamic a11y QA is N/A for planning | `05` |
| Data/database planner | same-agent (synthesizing lane outputs) | Migration blueprints, rollback, EXPLAIN gates | `07` |
| Security/privacy (auth-floor) | same-agent | Per-request auth read cost, session-cache decision | `08` |
| Test/QA strategist | same-agent | Test execution matrix, adversarial scenario matrix | `12`, `19` |
| Operations/rollout planner | same-agent | CI gates, rollback runbook, hosted-proof release gates | `13` |
| Adversarial reviewer | emulated (separated pass) | Disprove readiness; find omitted repos, missing budgets, vague tasks | `19` |
| Final verifier | emulated (separated pass) | Requirement-by-requirement audit | `17` |

**Native vs simulated:** the three Explore lanes were native read-only subagents (`Agent` tool, `Explore` type). All write/synthesis, adversarial, and verifier lanes were emulated as separated passes by the lead because no separate write-capable native reviewer was available in this session. This is recorded honestly as `verification_mode: emulated`.

## Skills and repository instructions used

- `AGENTS.md` — stack baseline, Cloudflare-resource standing authorization, proportional verification policy, proportional graph policy.
- `.ai/10_state/current-state.md` — Fast Path block only (stage = pre-launch closed-beta MVP; migration `0035`/`0036` latest schema state; `0031` additive index).
- `.agents/skills/archestimator-plan-pack/SKILL.md` — confirmed this work is high-blast-radius (database/indexes/migration) → dated plan pack is warranted, not in-session loop.
- `Creating-Plan-Prompt.md` directive — exhaustive profile selection, document set, readiness contract.
- `Multi-Agent-Execution-Directive.md` — verification-mode caps, evidence classes, completion audit.

No skill was invoked solely for ceremony. `gitnexus` was not used because the relevant call graph is narrow (route→repository→`database.prepare`) and was traced faster by direct `rg`/`Read` in the Explore lanes (per AGENTS.md proportional graph policy).

## Coordination ledger

| Agent / lane | Goal | Owned scope | Dependencies | Findings | Decisions / rejected alternatives | Conflicts | Validation evidence | Status |
|---|---|---|---|---|---|---|---|---|
| Explore `agent_a22204d9` | First-user flow→route→repo→query map | `src/app/workshop/**`, `src/app/share/**`, `src/app/invite/**`, `src/lib/auth/*` | None (read-only) | 11 hot paths; 3-read auth floor; HP-5 N+1; unbounded scans | — | None | file:line citations throughout `03` | COMPLETE |
| Explore `agent_5355d53e` | Per-repo query + index inventory | `src/lib/repositories/**`, `migrations/**` | None | Full index table; 5 index gaps; unbounded SELECT * list; correlated-subquery cost in `listProjectEstimates` | Explicit `idx_estimate_favorites_user_created` recommended over relying on implicit UNIQUE index | None | EXPLAIN-confirmed 0031 effect; migration rg inventory | COMPLETE |
| Explore `agent_69f738d4` | Perf-script + budget inventory | `scripts/**`, `package.json`, `src/lib/cloudflare/d1-performance-proof-router.ts`, `scripts/lib/**` | None | 18 scripts; budgets scattered; 0 subrequest budgets; 8 repos no proof; 5 generic hosted surfaces only | Shared `scripts/lib/d1-query-budget.ts` recommended over per-script duplication | None | package.json line cites; script header `localOnly:true` flags | COMPLETE |
| Lead synthesizer | Integrate into plan pack | All docs | All three lanes | Cross-lane consistent | Exhaustive profile; P0–P5 phase order | None | Internal cross-doc consistency check | COMPLETE |
| Adversarial reviewer (emulated) | Disprove readiness | All docs | Lead synthesis | See `19` cycle-1/2 logs | Required: add subrequest budget task; add `EXPLAIN` hosted gate; add rollback for `idx_*` migrations | None | `19` findings list | COMPLETE |
| Final verifier (emulated) | Requirement audit | All docs | Adversarial pass | See `17` | `IMPLEMENTATION-READY` with emulated cap at 97 | None | `17` matrix | COMPLETE |

## Conflicts and resolutions

None. The three lanes were read-only and mutually consistent; the only "disagreement" was the implicit-UNIQUE-index question for `estimate_favorites`/`project_favorites`, which the data lane resolved by recommending an explicit index for clarity and to remove reliance on SQLite's implicit behavior (a defensive choice, recorded in `15`).

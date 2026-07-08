# 00 — Agent Coordination Ledger

Plan pack: `2026-07-07-first-user-activation-empty-workspace`
Date (Asia/Manila): 2026-07-07
Profile: `exhaustive`
Status: `CONDITIONALLY READY` (see `17_FINAL_READINESS_REVIEW.md`)
Verification mode: `emulated`

## Master goal

Convert the brief "first-user path from beta entry to first project, first estimate, first area/template, and first publishable proposal" into an implementation-ready, codebase-specific planning package that lets a future implementation AI ship a guided first-value path **without inventing product decisions mid-build**.

The package must:

- Preserve the owner-decided posture that authenticated users land directly on `/workshop` with **no required onboarding/profile/country/workspace intake gate** (`decisions.md` 2026-05-27). Activation is **product-led** (empty states, in-context CTAs, milestone surfacing, opt-in sample content), not a wizard.
- Define activation success criteria, zero states, guided next actions, sample/demo data policy, onboarding milestones, analytics/evidence, tests, and connections to the sibling project/estimate/publishing plan stubs dated 2026-07-07.
- Respect the constraint: **no marketing landing page**. The first screen/workshop path must stay useful and concrete for actual estimating work.
- Treat Next.js 16 / React 19 / Cloudflare D1 + R2 + Durable Objects + Queues/Cron + Cloudflare Email / Better Auth / TanStack Query / Zustand / repository boundaries as one production system.
- Not modify application code, tests, migrations, schemas, infrastructure, or Git state.

Non-goals: implementing the feature; designing the public marketing site; replacing the existing bento homebase; re-architecting auth; introducing a paid analytics add-on; building immutable/PDF proposal packages (covered by sibling stub `2026-07-07-proposal-export-and-immutable-deliverable-trust`).

Stop condition: the pack is complete when an executor can implement a guided first-value path without inventing product decisions mid-build.

## Agents and workstreams

Three native parallel `Explore` (read-only) audit lanes were dispatched concurrently, plus the lead coordinator/synthesizer. Adversarial review and final verification are **emulated passes** by the same lead (no second native agent was available in this session).

| Lane | Role | Scope | Native? | Status |
|---|---|---|---|---|
| Lead coordinator | Scope, synthesis, all document authorship, adversarial review, final verification | Whole pack | Lead | Complete |
| Audit lane A — workshop dashboard + entry surfaces | Read-only codebase audit of `/workshop` routes, dashboard components, empty states, joyride/tour, post-login redirect, project/estimate/area-template/publishing flows | `src/app/workshop/**`, `src/components/workshop/**`, `src/proxy.ts`, `src/lib/auth/redirects.ts` | Native `Explore` | Complete |
| Audit lane B — existing plans + analytics + tests + roadmap + sample-data + publication | Read-only audit of `.ai/03_plans/**`, `.ai/09_archive/**`, `.ai/01_roadmap/**`, analytics/telemetry surfaces, test coverage, roadmap/decisions, sample/seed data, publication/proposal state | `.ai/**`, `tests/**`, `e2e/**`, `src/**` analytics | Native `Explore` | Complete |
| Audit lane C — data model + auth/roles + activation entities | Read-only audit of Better Auth setup, workspace/tenant model, D1 schema for the activation ladder, closed-beta gate, roles, seed data, terms gate | `migrations/**`, `src/lib/auth/**`, `src/lib/repositories/**`, `src/lib/legal/**` | Native `Explore` | Complete |
| Adversarial reviewer | P0/P1/P2 gap hunt, assumption challenge | Whole pack | Emulated pass by lead | Complete |
| Final verifier | Requirement-by-requirement audit | Whole pack | Emulated pass by lead | Complete |

## Skills discovered and used

| Skill | Used? | Why |
|---|---|---|
| `archestimator-plan-pack` | Read for naming/structure convention | Confirms dated-folder + canonical document set |
| `Explore` (read-only search agent) | Yes — three lanes | Fan-out codebase audit without file mutation |
| `gitnexus` / code-review-graph MCP | Not used | Narrow read-only discovery was cheaper via parallel `Explore` lanes + targeted `rg`; repo graph re-index not warranted for a planning-only task |
| `autopilot` / `ultragoal` / `ultrawork` / `ultraqa` / `autoresearch` / `performance-goal` | Referenced as workflow vocabulary in the directive | The plan encodes their contracts (durable goal ledger, parallel-safe lanes, adversarial matrix, performance evaluator) into the implementation phases rather than invoking them during planning |
| Impeccable / Playwright / visual QA | Not used for planning | UI verification is specified for future implementation, not run during this planning-only task |

No skill was unavailable in a way that blocked this pack. Browser/visual/hosted/provider proof is intentionally deferred to future implementation per the proportional verification policy.

## Source authority decisions

- `PROMPT.md` (this folder) + `Creating-Plan-Prompt.md` + `Multi-Agent-Execution-Directive.md` are the authoritative planning directives.
- `AGENTS.md` current-stage line ("preparing for first users … prioritize auth, estimating workflows, cost library, proposal package, collaboration/publication proof") confirms first-user activation is the live priority.
- `decisions.md` 2026-05-27 (no required intake gate; land directly on `/workshop`; `/workshop/onboarding` is a compatibility redirect) is the load-bearing product decision and **overrides** the stale Joyride plan's wizard assumptions.
- Current source/migration evidence overrides the Joyride plan's Supabase persistence + `/workshop/onboarding` route assumptions (both now stale).

## Conflicts encountered and resolved

1. **Stale Joyride plan** (`2026-06-03-react-joyride-onboarding-implementation-plan`) targets Supabase persistence and a real `/workshop/onboarding` route. Current source redirects that route to `/workshop/settings`, and auth/account data is on D1. **Resolution:** do not execute the Joyride plan as-is; this pack supersedes it for the activation path and uses D1-backed lightweight milestone tracking instead of a per-tour Supabase table.
2. **Two divergent estimate-creation paths** (`createEstimateWithDefaultTree` seeded vs `createEstimateSheetDraft` empty). The dashboard quick action wires the **empty** path. **Resolution:** keep the empty path for first users (it already ships the actionable empty-tab affordance "Add an Area … or drag a template"); document the divergence and recommend the seeded path be offered only via an explicit "start from template" choice, not silently.
3. **Sample/demo data policy is genuinely owner-dependent.** **Resolution:** record as `OPEN-DEC-01` with options + recommendation; isolate it from the implementation-ready UX scaffolding phases.

## File/module ownership for future implementation

All future writes are confined to in-scope source paths listed in `11_IMPLEMENTATION_PLAN.md`. The plan directory itself is owned by this pack. No two implementation lanes edit the same file concurrently without a named owner (see per-phase parallelization classification).

## Sibling-plan connections (dependency direction)

This pack operationalizes activation. Its relationship to the sibling 2026-07-07 plan stubs:

| Sibling stub | Dependency direction |
|---|---|
| `2026-07-07-projects-estimates-start-path-ia` | **This pack feeds it.** The empty-workspace welcome + projects empty state (FR-002/FR-003) are the "empty" branch of that IA; the sibling should treat this pack's zero states as the canonical empty-state design and build its "existing/returning" branches on top. |
| `2026-07-07-public-to-beta-trust-onboarding-continuity` | **Feeds this pack.** Owns the pre-auth public→beta→auth→first-workflow continuity; this pack begins where it ends (post-terms-gate landing on `/workshop`). Hand-off point: `resolvePostAuthDestination` → `/workshop`. |
| `2026-07-07-beta-support-feedback-operating-loop` | **Parallel.** Owns the in-product feedback loop (`/workshop/feedback`, `BetaFeedbackForm`); this pack references it as the activation-funnel feedback channel (§13.4) but does not depend on it. |
| `2026-07-07-client-ready-proposal-package-workflow` | **This pack feeds it.** This pack's terminal rung (FR-011/FR-012) reaches the existing mutable XLSX + shared-link publish; the sibling owns the richer client-ready workflow (readiness checklist, sheet selection, recipients, delivery proof) layered on top. |
| `2026-07-07-proposal-export-and-immutable-deliverable-trust` | **Out of scope.** Immutable/PDF packages are deferred; this pack only ensures the ladder *reaches* the existing publish surface. |
| `2026-07-07-production-rum-and-cwv-telemetry` | **Out of scope.** Hosted RUM/CWV is the upgrade path for PERF-001's evaluator; this pack uses local perf-trace + query-count tests as the substitute until that stub lands. |

# 00 — Agent Coordination & Master Goal

**Plan:** 2026-07-07-launch-readiness-evidence-gate
**Plan folder:** `.ai/03_plans/2026-07-07-launch-readiness-evidence-gate/`
**Mode:** `planning-only`. No application code, tests, migrations, package manifests, provider state, or runtime data is modified by this task.
**Plan profile:** `exhaustive` (security, data integrity, auth, provider-exit, release readiness, cross-cutting).
**Date convention:** Asia/Manila (`2026-07-07`).

---

## Master `/goal`

Produce a production-readiness **planning package** that turns Archestimator launch readiness into a **single evidence gate** for first users. An executor must be able to implement the unified launch gate from this pack without re-discovering the production-readiness surface.

### User / business outcome
Archestimator is preparing for first users (pre-launch closed-beta MVP). Today, readiness is fragmented across ~50 `cf:*` / `launch:*` / `perf:*` scripts, an artifact-only aggregator (`cf:release-gates`), and an out-of-band historical verdict (`NO-GO`, last refreshed 2026-06-02 → 2026-07-04). The owner needs one command, one owner-visible status report, one rollback contract, and one staged local→hosted proof path that says GO / CONDITIONAL / NO-GO for first users.

### Problem being solved
1. No single command runs all launch gates end-to-end. `validate` covers type/lint/design/unit/dom only. `cf:release-gates` aggregates pre-generated JSON artifacts and never spawns child processes (verified at `scripts/check-cloudflare-release-gates.ts:759` `readInputs`).
2. Exit-code strictness is inconsistent: some anchors hard-block by default (`cf:release-gates` `localReleaseGateReportReady`, `launch:check-legal-owner`, `launch:check-support-monitoring`); the provider-exit pack is advisory unless `STRICT_READINESS_EXIT`/`FAIL_ON_BLOCKERS`.
3. CI is disabled (workflows live in `.github/workflows-disabled/`); GitHub hosted security controls (CodeQL/Dependabot/secret-scan) return 403/404 (per `.ai/10_state/current-state.md` fast path).
4. The historical launch verdict is stale and predates much of the completed Cloudflare migration; the evidence gate must re-derive status from current artifacts, not memory.
5. Local checks cannot prove provider/hosted/production claims; the gate must separate evidence classes explicitly.

### Intended behavior (of the future launch gate)
A single `bun run launch:gate` (name proposed, not implemented here) that:
- Discovers and aggregates all gate domains (Cloudflare release, provider-exit, D1/auth/realtime, R2, Queues/Cron, Durable Objects, observability, performance, legal/owner, support/monitoring, security/privacy, beta/first-user, upload, collaboration/publication).
- Emits one canonical status report (`IMPLEMENTATION-READY`-equivalent GO / `CONDITIONALLY READY` / `NOT READY`) plus per-domain pass/advisory/blocker evidence with file:line citations.
- Distinguishes **hard blockers** (release-blocking failures) from **advisory warnings** (informational, do not block first users).
- Separates local-static / local-automated / browser-manual / provider-backed / hosted-production evidence classes.
- Defines rollback criteria and a staged local→hosted proof path.
- Refuses to claim provider/hosted/production proof from local-only checks.

### Planning scope (in)
- Inventory and classify the entire existing readiness/proof surface.
- Define the launch readiness matrix: domains, minimum go/no-go criteria, required proofs, owner-visible status shape.
- Define hard-blocker vs advisory taxonomy and which anchors are authoritative per domain.
- Specify the unified gate script contract (inputs, outputs, exit semantics, aggregation rules) — **as a design**, not implementation.
- Map CI integration options (including the disabled-workflows reality).
- Locate evidence file artifacts and their producers.
- Define rollback criteria and the staged local→hosted proof ladder.
- Identify which sibling plan packs the gate aggregates (so it does not re-derive their work).
- Identify open external decisions (legal signoff, provider proof, hosted manual smoke, paid-feature enablement) and mark them `BLOCKED-EXTERNAL`.

### Non-goals (out)
- Implementing the unified gate script, the CI workflow, or any application/test/migration code.
- Mutating provider state, runtime data, secrets, DNS, deployments, queues, buckets, or auth config.
- Re-deriving the deep technical analysis already in sibling packs (d1 hot paths, durable-object scale, observability, CSP, privacy/DSAR, etc.) — those are **referenced and aggregated**, not reproduced.
- Enabling paid Cloudflare features (D1 paid plan, R2 paid tier, Smart Placement, etc.) — explicitly out per `AGENTS.md` cost posture.
- Providing legal advice or authorizing launch — the gate surfaces legal-owner proof flags; it does not replace counsel.
- Claiming hosted/provider/production proof from local checks.

### Required codebase analysis
- `package.json` scripts (validate, cf:*, launch:*, perf:*, dbidx:*, validate:agents, storybook:*).
- `.github/workflows-disabled/ci.yml` + sibling workflows (codeql, react-doctor, dependabot).
- The four anchor scripts named in the PROMPT + ~50 sibling readiness/proof scripts in `scripts/`.
- The evidence DAG: `cf:release-gates` (13 artifacts) and `generate-cloudflare-provider-exit-pack` (6 artifacts + source scan).
- `.ai/10_state/current-state.md` fast path + the stale NO-GO verdict lineage.
- Sibling launch-readiness plan packs (security, provider-exit, d1, r2, durable, queues/cron, observability, perf, beta, first-user, upload, collaboration, privacy, AI-safety).
- `wrangler.jsonc` binding boundary (Worker `archestimator-proof`, D1 `ARCH_DB`, R2 `ARCH_UPLOADS_R2`, DO `COLLAB_ROOMS`, Queue `UPLOAD_JOBS_QUEUE`, Email `EMAIL`, Images `IMAGES`).

### Required specialist workstreams (covered, simulated where delegation unavailable)
Product/scope · source & requirements · codebase architecture · UX/owner-visible status · backend/integration (script contract) · data/provider (D1/R2/DO/Queue/Email boundary) · security/privacy (threat model for the gate itself) · performance/reliability (gate execution cost, time budget) · test/QA (test matrix + adversarial) · ops/rollout/rollback · blast radius · adversarial review · final verification.

### Implementation-readiness criteria
`README.md` will state one of: `IMPLEMENTATION-READY`, `CONDITIONALLY READY`, `NOT READY`. Given (a) the gate aggregates many external/hosted proofs that remain owner-decisions, and (b) `verification_mode` will be `emulated` (no native independent reviewer in this session for high-blast-radius planning), the **expected package status is `CONDITIONALLY READY`** — the design is implementation-ready for the local + script-contract slices, with external gates isolated.

### Validation criteria (for the planning package itself)
- Every gate domain has a documented authoritative anchor script and evidence location.
- Hard blockers vs advisory warnings are explicitly classified.
- Shadow-path matrix covers the gate's own failure modes (missing artifact, expired artifact, conflicting verdicts, partial provider outage, stale evidence, concurrent agents writing artifacts).
- Rollback criteria and staged local→hosted proof ladder are explicit.
- No claim of provider/hosted/production proof from local-only checks.
- No application/test/migration/config code is modified by this planning task.

### Final planning deliverables
`00_AGENT_COORDINATION.md` · `01_EXECUTIVE_SUMMARY.md` · `02_FEATURE_BRIEF_AND_SCOPE.md` · `03_SOURCE_AND_CODEBASE_AUDIT.md` · `04_REQUIREMENTS_SPECIFICATION.md` · `05_UX_UI_ACCESSIBILITY_PLAN.md` · `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` · `07_DATA_DATABASE_API_NETWORK_PLAN.md` · `08_SECURITY_PRIVACY_THREAT_MODEL.md` · `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` · `10_BLAST_RADIUS_AND_DEPENDENCIES.md` · `11_IMPLEMENTATION_PLAN.md` · `12_TEST_AND_VALIDATION_STRATEGY.md` · `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` · `14_RISK_REGISTER.md` · `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` · `16_REQUIREMENTS_TRACEABILITY_MATRIX.md` · `17_FINAL_READINESS_REVIEW.md` · `18_STACK_CONTRACT_AND_PRODUCTION_STANDARDS.md` · `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` · `README.md`.

### Stop condition (for this planning task)
The pack is complete when review-ready plan documents exist that an executor can use to implement the launch gate without re-discovering the production-readiness surface, every gate domain has an authoritative anchor and evidence location, hard vs advisory blockers are classified, rollback + staged proof are defined, and final readiness review records the verification mode and caps. (Matches the PROMPT.md stop condition.)

---

## Authority & scope contract

- **Task classification:** `planning-only`. No edits to application source, tests, migrations, package manifests, provider state, or runtime data.
- **Stack (verified from repo):** Next.js 16 + React 19 + Bun 1.3.14 + TypeScript + Tailwind v4 + OpenNext on Cloudflare Workers + D1 + R2 + Durable Objects + Queues/Cron + Cloudflare Email + Better Auth 1.6.22 + TanStack Query + Zustand.
- **Provider boundary (from `wrangler.jsonc`):** Worker `archestimator-proof`, D1 `ARCH_DB` (`archestimator-proof-db`), R2 `ARCH_UPLOADS_R2`, DO `COLLAB_ROOMS`, Queue `UPLOAD_JOBS_QUEUE`, Email `EMAIL`, Images `IMAGES`. Never mutate the historical Supabase project `ebxxqidacheyapmmzavr`, the unrelated `archestimator` provider project, or other accounts.
- **Cost posture:** stay on free-tier/bundled Cloudflare limits; do not enable paid add-ons without explicit owner approval.
- **Standing Cloudflare authorization** (`AGENTS.md`) applies to *implementation* work, not this planning-only task. No provider/DNS/deploy/queue/bucket/auth mutation happens here.

---

## Orchestration ledger

This session used **emulated** specialist lanes (separated analysis passes by the lead + dispatched read-only Explore subagents for evidence gathering). No native independent reviewer was available for the final verification pass, so `verification_mode: emulated` and the readiness cap applies.

| Lane | /goal | Scope | Evidence | Dependencies | Findings | Conflicts | Status |
|---|---|---|---|---|---|---|---|
| Lead coordinator | Master goal, scope, integration, final claim | Whole pack | This file + all `NN_*.md` | All lanes | Unified gate is a design gap, not an implementation gap | None unresolved | COMPLETE |
| Source & requirements analyst | Extract requirements from PROMPT.md + feature-planning directive | PROMPT.md, directive | `02_FEATURE_BRIEF_AND_SCOPE.md`, `04_REQUIREMENTS_SPECIFICATION.md` | Lead | 18 FR/OPS/SEC/REL/TEST/DOC requirements; external decisions isolated | None | COMPLETE |
| Codebase architecture analyst (Explore subagent 1) | Inventory the 4 anchor scripts + sibling readiness scripts | `scripts/` | `03_SOURCE_AND_CODEBASE_AUDIT.md` §1 | Lead | Evidence DAG mapped; ~50 scripts classified | None | COMPLETE |
| CI/package analyst (Explore subagent 2) | Inventory package.json scripts + CI workflow | `package.json`, `.github/workflows-disabled/` | `03` §2, `13` | Lead | No unified launch command; CI disabled; perf advisory | None | COMPLETE |
| State/decisions analyst (Explore subagent 3) | Extract launch verdict lineage + sibling packs | `current-state.md`, `decisions.md`, `.ai/03_plans/` | `03` §3, `10` | Lead | Stale NO-GO; legal/provider-exit open; many sibling packs to aggregate | None | COMPLETE |
| Data/provider planner | D1/R2/DO/Queue/Email boundary for the gate's provider claims | `wrangler.jsonc`, evidence artifacts | `07_DATA_DATABASE_API_NETWORK_PLAN.md` | Source audit | Gate must not claim provider proof from local checks | None | COMPLETE |
| Security/privacy reviewer | Threat model for the gate itself + aggregated security domains | sibling security packs, AGENTS.md | `08_SECURITY_PRIVACY_THREAT_MODEL.md` | Data planner | Gate must not be bypassable; evidence artifacts must be sanitized | None | COMPLETE |
| Performance/reliability reviewer | Gate execution cost, time budget, CI budget | script runtime evidence | `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` | Architecture | Gate must be <2 min local; hosted proofs owner-gated | None | COMPLETE |
| Test/QA strategist | Test + adversarial matrix for the future gate | repo test layers | `12_TEST_AND_VALIDATION_STRATEGY.md` | All | Unit tests for aggregator logic; adversarial matrix for stale/conflicting evidence | None | COMPLETE |
| Ops/rollout planner | Rollback + staged local→hosted proof | `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` | `13` | Architecture | 5-stage ladder; rollback = disable gate / re-enable CI / redeploy prev version | None | COMPLETE |
| Adversarial reviewer | Disprove readiness, find omissions | Whole pack | `19` §adversarial + `17` | All | Found: must pin evidence TTL, must handle aggregator exception, must define conflict resolution | Resolved in `06` + `14` | COMPLETE |
| Final verifier (emulated) | Requirement-by-requirement audit | Whole pack vs PROMPT | `17_FINAL_READINESS_REVIEW.md` | All | `verification_mode: emulated` → cap applies; CONDITIONALLY READY | n/a | COMPLETE |

### Skills & workflows discovered / used
- `archestimator-plan-pack` (SKILL) — used to bind the dated `.ai/03_plans/` convention and the DISCOVER→PLAN→EXECUTE→VERIFY→RECORD→DECIDE loop. **Used** (read in full).
- `Creating-Plan-Prompt.md` + `Multi-Agent-Execution-Directive.md` — the authoritative planning directives; **used** to set the exhaustive document set, readiness labels, and verification-mode caps.
- Explore subagents (native, `Explore` role) — **used** for the three read-only evidence-gathering lanes above; real separate tool outputs, but not an independent *reviewer* of the plan, so final verification is `emulated`.
- No new skill created (no genuine capability gap for this planning task).
- Unavailable: a true independent reviewer lane (no second native reviewer in session) → `verification_mode: emulated`, readiness capped.

### Concurrent-repository safety
- All writes confined to `.ai/03_plans/2026-07-07-launch-readiness-evidence-gate/`.
- Re-read affected files before each write; preserved the pre-existing `PROMPT.md`.
- No `git` mutation (no stage/commit/branch/checkout/push). Shared live worktree assumed.

### Source authority decisions
- `PROMPT.md` (user intent) + `Creating-Plan-Prompt.md` (planning contract) are the highest authority for this task.
- Current repo evidence (`package.json`, `scripts/`, `current-state.md`) outranks the stale NO-GO verdict in `current-state.md` body when they conflict; the gate must re-derive from artifacts.
- Older plan packs are **aggregated, not re-derived**; their conclusions are cited, not reproduced.

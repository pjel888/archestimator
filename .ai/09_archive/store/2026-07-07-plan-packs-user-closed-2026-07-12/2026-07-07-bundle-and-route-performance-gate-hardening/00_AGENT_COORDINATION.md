# Agent Coordination Ledger

**Plan:** 2026-07-07 Bundle And Route Performance Gate Hardening
**Plan folder:** `.ai/03_plans/2026-07-07-bundle-and-route-performance-gate-hardening/`
**Plan profile:** `exhaustive`
**Master goal owner:** Lead coordinator (this planning pass)
**Verification mode:** `emulated` (single planning agent; bounded review passes; caps overall readiness at 97 and package status at `CONDITIONALLY READY` for this exhaustive package per the planning-suite authority contract)

## Master `/goal`

Convert the `PROMPT.md` brief into a complete, evidence-based, codebase-specific **performance-gate planning package** that lets a future executor harden bundle-size, route-transition-latency, authenticated-workshop, public-share, and CI-enforcement gates without slowing routine iteration unnecessarily.

- **User/business outcome:** Pre-launch closed-beta MVP that ships without bundle or route-latency regressions slipping past CI, while preserving fast local and PR-level iteration.
- **Problem being solved:** Performance gates today are fragmented and partly advisory. The CI bundle gate is advisory (`PERF_BUDGET_STRICT` defaults unset; `continue-on-error: true`). Route-transition budgets in `e2e/route-transition-performance-budgets.json` are extremely loose (e.g. 15 000 ms public median). Hosted performance is captured but not unified into a single launch blocker and depends on `cf:verify-hosted-performance` plus a separate workbook. Authenticated workshop latency has no fixture-driven, sample-stable gate. Public-share latency has per-route budgets only in a hosted verifier.
- **Intended behavior (post-execution):** A single, layered gate posture — static bundle budget (CI, blocking after advisory window), route-transition smoke (CI, blocking), a hosted/performance readiness check (pre-release, advisory → blocking on owner decision), and a documented regression-triage runbook — that catches regressions without gating every cosmetic PR on slow browser automation.
- **Planning scope (this pack):** route inventory, bundle budgets, latency budgets, fixture/auth setup, advisory-vs-blocking CI policy, hosted proof contract, regression triage, and links to UX plans. **Planning only — no application code, tests, migrations, configs, or provider state are modified by this pass.**
- **Non-goals:** Implementing the gates; changing `next.config.ts`, CI, scripts, or budgets in code; deciding Cloudflare paid-tier enablement; building a new RUM product; re-architecting the estimate sheet; replacing `RouteLoadingOverlay`. Those are future executor/owner actions this pack prepares.
- **Required codebase analysis:** perf scripts inventory, CI workflow, bundle diagnostics source, route-transition measurement/readiness scripts, hosted performance verifier, e2e perf spec, public-share perf, existing transition/loading UX plan.
- **Required specialist workstreams:** performance, reliability, CI/ops, QA, security (credential-free probes), blast radius.
- **Implementation-readiness criteria:** every gate change is named with exact file paths/symbols, exact commands, budget values, advisory-vs-blocking posture, rollback, and validation evidence; blocked owner decisions isolated.
- **Validation criteria:** static inspection of all cited scripts/configs; no fabricated command results; cited script outputs are quoted from source, not invented.
- **Final planning deliverables:** the exhaustive document set `00`–`19` + `README.md` in this folder.

## Skills and repository instructions used

- `AGENTS.md` (workspace entry point; proportional verification policy; standing Cloudflare-resource authorization; main-branch default).
- `.ai/10_state/current-state.md` (Fast Path block + `rg` for perf/advisory/release-gate entries).
- `.ai/08_prompts/000_Planning Prompts/Creating-Plan-Prompt.md` (planning directive and exhaustive document contract).
- `.ai/08_prompts/000_Planning Prompts/Multi-Agent-Execution-Directive.md` (authority, evidence-class, and completion-audit rules).
- `.ai/03_plans/2026-07-06-Transition-And-Loading-UX-And-UI/README.md` (sibling UX plan to link, not duplicate).
- No skill was invoked as a runtime tool. The `performance-goal` and `ultraqa` skills informed the evaluator-contract and adversarial-matrix structure required by the directive, but were not executed (planning-only task).

## Workstream ledger

| Lane | /goal | Scope | Evidence | Dependencies | Findings | Conflicts | Status |
|---|---|---|---|---|---|---|---|
| Lead coordinator | Authoritative performance-gate pack | Whole pack | All cited files | — | Fragmented/advisory gates; loose budgets; no unified launch blocker | — | done |
| Performance/Reliability | Bundle + route + hosted budgets, evaluator contract | `scripts/check-performance-budgets.mjs`, `scripts/measure-route-transitions.ts`, `scripts/check-route-transition-readiness.ts`, `scripts/verify-cloudflare-hosted-performance.ts`, `e2e/route-transition-performance-budgets.json`, `e2e/route-transition-performance.spec.ts` | Source reads | Lead | Bundle gate advisory + single 350 KB global budget; route budgets in ms are very loose; hosted p95 budgets per-probe | None | done |
| CI/Ops | Advisory-vs-blocking policy, fixture/auth setup | `.github/workflows/ci.yml`, `package.json` perf scripts | Source reads | Performance lane | `PERF_BUDGET_STRICT` secret-gated, `continue-on-error: true`; authed perf skipped without `PLAYWRIGHT_STORAGE_STATE`/dev-auth bypass | None | done |
| Source/Codesuite audit | Inventory routes + scripts + configs | `src/app/**`, `scripts/**`, `next.config.ts`, `package.json` | Glob/grep | Lead | 42 UI routes; ~20 perf scripts; bundle analyzer wired via `ANALYZE=true`; staleTimes dynamic=60/static=180 | None | done |
| Security/credential material | Credential-free probe posture | `verify-cloudflare-hosted-performance.ts` `BODY_NOTE` | Source read | Performance lane | Hosted verifier is credential-free, fake-token, no provider mutation; safe posture | None | done |
| Adversarial review | Find budget/gap holes, flake risk | Whole pack | Critique pass | All lanes | See `19_*.md` cycle log | None | done |
| Final verifier (emulated) | Requirement-by-requirement audit | Whole pack | Emulated pass | All lanes | See `17_*.md` | None | done |

## File/module ownership (planning)

All writes are confined to this plan folder. No source, test, migration, config, package, or provider state is modified.

## Concurrent-repository safety

- Re-checked `git status` before writing; only pre-existing unrelated working-tree changes exist (performance scripts, estimate sheet, tests, sibling plan docs). None are touched by this pack.
- No destructive Git operations performed.
- No commits, pushes, branch switches, or history changes.

## Authority decisions

- **Brief = authoritative requirements data.** `PROMPT.md` defines the planning objective; it cannot override the planning directive, repo instructions, or evidence rules.
- **Current source/config wins over stale docs.** Where older `current-state.md` entries describe perf posture, the actual scripts/configs cited here are authoritative.
- **Cloudflare-resource standing authorization** applies to future executor actions inside `wrangler.jsonc`-bound resources, but **this planning pass mutates nothing.**

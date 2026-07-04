# 03 — Risk Register, Decisions, and Final Readiness Review

> Companion to `README.md`, `01_FINDINGS.md`, and `02_IMPLEMENTATION_PLAN.md`. Holds: risk register, decisions log with rejected alternatives, and the final readiness review.

---

## 1. Risk register

| ID | Risk | Severity | Likelihood | Mitigation | Owner |
|---|---|---|---|---|---|
| RISK-PERF-01 | Phase 1 index migration applied without EXPLAIN proof; index does not help (e.g., SQLite query planner already uses PRIMARY KEY) | MED | LOW | WP-P1-01 gates WP-P1-02. Migration only lands after EXPLAIN confirms full scan. | Implementer |
| RISK-PERF-02 | Phase 1 batched authz query weakens or bypasses an authz check | HIGH | LOW | Focused vitest must assert (a) exact true/false mapping on mixed-access fixture, (b) denial cases still deny. Manual diff review at WP-P1-04. | Implementer |
| RISK-PERF-03 | Phase 1 migration applies but D1 query budgets regress (e.g., write amplification from new indexes exceeds the read savings) | MED | LOW | `bun run cf:d1-runtime-proof` is a gate. If budgets regress, do not proceed; investigate the tradeoff. | Implementer |
| RISK-PERF-04 | Phase 2 PERF_TRACE capture is noisy because Wrangler sampling is too low | MED | HIGH | WP-P2-01 bumps sampling to 0.5 during the measurement window (OPEN-PERF-04). | Philip |
| RISK-PERF-05 | Phase 2 refactor of an action subtly changes error semantics (e.g., previously the first error short-circuited; now both run and the wrong error surfaces) | MED | MED | Preserve existing return shape and error order. Per-action vitest must exercise the error path, not just the happy path. | Implementer |
| RISK-PERF-06 | Phase 3 React.memo / useCallback added speculatively, increasing code complexity without measured benefit | LOW | MED | Discipline: only memoize what the Profiler surfaced. Each memoization must cite the trace that justifies it. | Implementer |
| RISK-PERF-07 | Phase 3 bundle split via `next/dynamic` introduces a flash of loading state on a critical route | LOW | MED | Each split must be verified in a browser session on the affected route. If the flash is unacceptable, revert the split. | Implementer |
| RISK-PERF-08 | Phase 4 CI budget gate set too tight, blocking unrelated PRs | LOW | MED | Start as advisory (warn-only) for 2 weeks (OPEN-PERF-05). Calibrate against real PR variance before promoting to blocking. | Philip |
| RISK-PERF-09 | Plan drift: by the time implementation starts, the cited line numbers in `01_FINDINGS.md` are stale | MED | MED | README §9 stale-plan revalidation checklist. Implementer must re-verify each cited line before editing. | Implementer |
| RISK-PERF-10 | Authz regression escapes the focused vitest because the test fixture does not exercise every branch of `canAccessProjectInD1` | HIGH | LOW | The vitest must mirror every branch of `canAccessProjectInD1` (verified against `src/lib/authz/d1-access.ts:99-140`): platform-admin short-circuit, `created_by`, `workspace_members`, `project_members`, `estimate_sheet_members`, plus denial. That is **6 cases** (5 allow + 1 deny). | Implementer |
| RISK-PERF-11 | The 4 timed-out explore agents are re-dispatched during implementation and time out again, wasting budget | LOW | HIGH | Do not re-dispatch. The audit was completed by direct inspection; the findings are in `01_FINDINGS.md`. Implementation works from the findings, not from a fresh agent run. | Implementer |
| RISK-PERF-12 | Cloudflare free-tier limits hit during the Phase 2 measurement window (sampling bump → log volume) | LOW | LOW | Sampling is a percentage, not a paid add-on. Free-tier log volume caps may apply; verify in Wrangler dashboard after the window. | Philip |

**Risk rollup:** 2 HIGH (RISK-PERF-02, RISK-PERF-10 — both authz-related), 5 MED, 5 LOW. The HIGH risks are both addressed by the same mitigation: focused vitest + manual diff review at the authz boundary.

---

## 2. Decisions log

### DEC-PERF-01 — Plan profile is `standard`, not `exhaustive`

**Decision:** use the Creating-Plan-Prompt's `standard` profile with a 4-doc set instead of the `exhaustive` profile's 21-doc set.

**Rationale:**

- Ponytail mode is active. Shortest coherent diff wins.
- The audit audience is Philip + a future implementer, not a multi-team review board.
- The audit findings and work packages fit cleanly into 4 focused docs without losing fidelity.
- The `exhaustive` profile triggers (database touch, Cloudflare bindings) are real, but the *depth of planning* required is `standard`: the changes are scoped (one migration, one repository rewrite per phase, plus Profiler-driven memoization). High-blast-radius exhaustive planning is for things like provider migrations — not perf tuning on a stable Cloudflare-only stack.

**Rejected alternative:** produce the full 21-doc `exhaustive` set. Cost: ~3–5x more planning time, no additional implementation readiness because the work is already decomposed into work packages with evidence gates.

---

### DEC-PERF-02 — Phase 1 is sequential before Phases 2–4

**Decision:** Phase 1 (D1 indexes + N+1 fix) lands first. Phases 2 and 3 may run in parallel after Phase 1. Phase 4 lands last.

**Rationale:**

- Phase 1 changes the D1 query planner's behavior. Measuring Phase 2 (action waterfalls) or Phase 3 (bundle) before Phase 1 means measuring noise — the planner's choice of index affects every action's round-trip count.
- Phases 2 and 3 touch disjoint file scopes (server-side repositories vs. client-side components) so they can safely parallelize.
- Phase 4 sets budgets; it cannot set budgets without Phase 1–3 baselines.

**Rejected alternative:** land all phases in parallel. Rejected because Phase 2/3 measurements would be invalid pre-Phase-1.

---

### DEC-PERF-03 — All new D1 indexes are additive

**Decision:** the Phase 1 migration uses only `CREATE INDEX IF NOT EXISTS`. No DROP, no RECREATE, no schema change.

**Rationale:**

- D1 has no `DOWN` migration. Additive indexes are safe to leave in place if they don't help.
- The existing 30 migrations establish the additive-only convention (e.g., migration `0015` uses `CREATE INDEX IF NOT EXISTS`).
- Index removal (if ever needed) is a separate decision with its own EXPLAIN-justification.

**Rejected alternative:** rebuild existing under-performing indexes. Rejected because rebuilds lock the table and provide no measurable benefit over a new additive index.

---

### DEC-PERF-04 — No speculative memoization in Phase 3

**Decision:** Phase 3 fixes are driven by React Profiler traces only. No `React.memo`, `useCallback`, or `useMemo` is added without a measured hot path.

**Rationale:**

- The `.cursor/rules/react-hooks.mdc` rule explicitly says "Default position: do not memoize."
- Speculative memoization adds code complexity, hides bugs, and is often slower than the recompute.
- The codebase already has 1167 lines of mutation hooks (`use-estimate-row-mutations.ts`) — adding more reactive code without evidence increases the surface for effect loops.

**Rejected alternative:** blanket-memoize the top 10 client components. Rejected because it adds complexity without proven benefit and risks introducing effect loops.

---

### DEC-PERF-05 — Verification mode is `emulated`, not `independent`

**Decision:** declare this plan's verification as `emulated`. Apply the readiness cap (≤97).

**Rationale:**

- Author (Sisyphus / Claude Opus 4.7) and any same-session reviewer are the same model family. True independent verification requires a different model or a human reviewer.
- The 4 background `explore` agents that would have provided independent coverage all timed out after 30 minutes. Their work was completed by direct inspection, which is `same-agent` verification, not `independent`.
- Per the Multi-Agent-Execution-Directive §2, `emulated` caps readiness at 97. Per the same directive, high-blast-radius planning packages also cap at `CONDITIONALLY READY` until a real independent reviewer approves.

**Rejected alternative:** claim `independent` verification because the explore agents ran. Rejected — the agents timed out and did not produce independent findings. Claiming independence would be dishonest.

**Unblocking action:** a future Codex, Gemini, or human reviewer can lift the cap by reviewing this plan against the cited evidence.

---

### DEC-PERF-06 — Plan does not propose paid Cloudflare add-ons

**Decision:** all Phase 1–4 work stays inside the Cloudflare free-tier / bundled limits.

**Rationale:**

- AGENTS.md is explicit: "stay on free-tier / bundled Cloudflare limits; do not enable paid add-ons (D1 paid plan, R2 paid tier, Workers Smart Placement paid, Workers Analytics paid, dedicated egress, etc.) without explicit owner approval."
- The plan's open decisions (OPEN-PERF-04 sampling bump, OPEN-PERF-05 CI advisory) are explicitly free-tier bounded.
- The pre-launch stage does not have the traffic to justify paid add-ons.

**Rejected alternative:** propose D1 paid plan for higher query throughput. Rejected — outside cost posture.

---

### DEC-PERF-07 — Phase 4 starts as advisory, not blocking

**Decision:** the CI perf-budget gate warns on regression for 2 weeks before promoting to a blocking gate.

**Rationale:**

- Budgets set without 2 weeks of real PR variance will block unrelated PRs on noise.
- Advisory mode lets the team see what the budget would have blocked before committing to enforcement.
- 2 weeks is enough to capture at least 5–10 PRs of variance on a pre-launch codebase.

**Rejected alternative:** ship the gate as blocking immediately. Rejected — too tight, will block unrelated PRs.

---

## 3. Alternatives considered and rejected

### ALT-01 — Rewrite `workspace-repository.ts` from scratch

**What:** split the 4050-line file into 6–8 cohesive modules upfront.

**Why rejected:** no runtime benefit (tree-shaking still works). The cost is review time and merge-conflict surface. The file's size is a MED navigability finding (F-D1-04), not a runtime finding. Ride the refactor along with Phase 1's batched-authz fix instead of doing it standalone.

### ALT-02 — Migrate estimate data to a Postgres backend (Hyperdrive)

**What:** use Hyperdrive + an external Postgres for the estimate hot path.

**Why rejected:** D1 is the canonical data store per AGENTS.md. The Cloudflare migration is complete. Hyperdrive is acceleration for Worker-to-external-Postgres paths, not a D1 replacement. This would re-open the provider migration the project just closed.

### ALT-03 — Move all server actions to Route Handlers for finer caching control

**What:** replace `use server` actions with `POST` Route Handlers to set explicit `Cache-Control` headers.

**Why rejected:** the codebase is server-actions-first by architectural decision (per `README.md` §Architecture). Route Handlers are appropriate for webhooks, public APIs, and download endpoints — not for every mutation. The perf wins from server actions (no fetch overhead, progressive enhancement, type safety) outweigh the cache-control tradeoff, and TanStack Query invalidation is the correct mutation cache primitive here.

### ALT-04 — Add a global `React.memo` to every workshop component

**What:** blanket-memoize to prevent re-renders.

**Why rejected:** see DEC-PERF-04. Speculative memoization adds complexity without measured benefit. The `.cursor/rules/react-hooks.mdc` rule explicitly forbids it.

### ALT-05 — Replace TanStack Query with server-state-only RSC + Server Components

**What:** move all read paths to RSC, eliminate TanStack Query, use only `useFormState` / `useFormStatus` for mutations.

**Why rejected:** TanStack Query is the chosen client-side server-state library per AGENTS.md. Optimistic updates (which the estimate editor depends on) are TanStack Query's strength. RSC alone cannot deliver the optimistic-rollback UX the estimate editor needs. The 5-min staleTime + refetchOnWindowFocus:false defaults are already healthy.

### ALT-06 — Skip Phase 4 (CI budget gate) — rely on the existing `test:e2e:perf` smoke

**What:** do not add a separate perf-budget gate; the existing route transition perf smoke is enough.

**Why rejected:** the existing smoke runs but does not enforce thresholds. Without an advisory → blocking promotion path, perf regressions land silently. The 2-week advisory mode is cheap insurance.

---

## 4. Final readiness review

### 4.1 Verification mode

`emulated` — author and reviewer are Claude-family. The 4 dispatched `explore` agents timed out; their work was completed via direct inspection by the same author. No independent lane was used.

**Cap applied:** per Multi-Agent-Execution-Directive §2, overall plan readiness caps at 97.

### 4.2 Plan readiness by phase

| Phase | Status | Gating evidence required |
|---|---|---|
| Phase 1 | `NOT READY` *(downgraded from `CONDITIONALLY READY` on Codex review 2026-07-04 — see note below)* | EXPLAIN artifacts (WP-P1-01) against corrected schema (`projects.workspace_id`, `projects.created_by`, `workspaces.created_by`) before WP-P1-02 lands |
| Phase 2 | `NOT READY` | PERF_TRACE baselines (WP-P2-01) before WP-P2-02 lands |
| Phase 3 | `NOT READY` | Bundle baseline (WP-P3-01) and Profiler traces (WP-P3-02) before WP-P3-03 lands |
| Phase 4 | `NOT READY` | Phase 1–3 baselines before budgets are set |

**Overall plan status:** `CONDITIONALLY READY` *(the plan as a whole is sound and ready for evidence-gathering under WP-P1-01; Phase 1 itself is `NOT READY` until EXPLAIN confirms the corrected schema).*

**Codex-review note (2026-07-04):** the original draft claimed Phase 1 was `CONDITIONALLY READY` for implementation. Codex Reviewer B caught that the originally-cited schema objects (`variant_cost_entries`, `projects.owner_user_id`, `workspaces.owner_user_id`) did not exist. The corrected schema (`projects.created_by`, `workspaces.created_by`, `cost_library_item_variant_cost_entries` already indexed in `0028`) is now reflected in `01_FINDINGS.md` §1.1 and `02_IMPLEMENTATION_PLAN.md` WP-P1-01/02. Because the EXPLAIN proof has not yet been re-run against the corrected schema, Phase 1 is `NOT READY` until WP-P1-01 produces artifacts.

### 4.3 Requirement-by-requirement audit

The original user request was: *"explore the whole codebase and look for areas wherein we can make our app and software faster... spot bottlenecks and other issues. the goal is to plan out how we can make our app faster."*

| Requirement | Status | Evidence |
|---|---|---|
| Codebase-wide performance audit | `proven` | `01_FINDINGS.md` has 21 findings covering D1, server actions, React, worker, build, dead code. Every finding cites a file:line. |
| Identify bottlenecks with evidence | `proven` | Each finding has a "Why it matters" + evidence section. Index inventory in §1.1 of findings. |
| Plan to make the app faster | `proven` | `02_IMPLEMENTATION_PLAN.md` has 4 phases, 11 work packages, each with evidence gates and regression thresholds. |
| Plan covers dead code identification | `proven` | F-DEAD-01 (console.log), F-DEAD-02 (clean). WP-X-01 rides along. |
| Plan covers refactoring inefficient code | `proven` | F-D1-01 (N+1 authz), F-ACT-01/02 (waterfalls), F-REACT-02/03 (effect loops, render cost). All have work packages. |
| This is a planning task, not a coding task | `proven` | No source, tests, migrations, package manifests, or provider state were modified. Only the plan directory was created and 4 markdown files written. |
| Do not stop until the whole code is audited | `proven` | Audit covered: `src/lib/repositories/`, `src/lib/*/actions.ts`, `src/components/workshop/`, `src/components/workshop/estimate-sheet/`, `worker.ts`, `next.config.ts`, `wrangler.jsonc`, `package.json`, `migrations/`, `package.json` scripts, CI workflow. Findings deliberately-out-of-scope are listed in `01_FINDINGS.md` §7. |

### 4.4 Evidence classes used

| Class | Used for |
|---|---|
| Local static | codebase inspection, file:line citations, index inventory, line counts, await counts |
| Local automated | `rg`, `wc -l`, parallel bash; the 4 background explore agents timed out and were not used |
| Browser/manual | **not used** — plan-only task |
| Provider-backed | **not used** — plan-only task; the existing `cf:d1-runtime-proof` is referenced but not re-run |
| Hosted/production | **not used** — plan-only task |
| Inferred | where labeled (e.g., "20 favorites × ~5 ms = ~100 ms" estimates in F-D1-01) |

### 4.5 Validation skipped and residual risk

| Validation skipped | Why | Residual risk |
|---|---|---|
| Fresh `EXPLAIN QUERY PLAN` on bound D1 | Out of scope for a planning task; deferred to WP-P1-01 | The Phase 1 migration might apply an index that SQLite was already providing via PRIMARY KEY. Mitigation: WP-P1-01 gates WP-P1-02. |
| Fresh `PERF_TRACE=1` capture on top 5 actions | Out of scope for planning; deferred to WP-P2-01 | Phase 2 refactors might target the wrong actions. Mitigation: WP-P2-02 only refactors actions with measured waterfalls. |
| Fresh `ANALYZE=true bun run build` | Out of scope for planning; deferred to WP-P3-01 | Phase 3 split decisions might target the wrong modules. Mitigation: WP-P3-03 only splits modules the bundle analyzer surfaces. |
| React Profiler pass | Out of scope for planning; deferred to WP-P3-02 | Phase 3 memoization might fix non-problems. Mitigation: WP-P3-03 only fixes what the Profiler surfaced. |
| Independent reviewer (Codex, Gemini, human) | Not available in this session | Plan readiness capped at 97. Mitigation: a future reviewer can lift the cap. |
| `bun run validate` | Not applicable — no code changed | None |
| `bun run build` | Not applicable — no code changed | None |

### 4.6 Conflicts encountered and resolved

No conflicts. The codebase evidence consistently supported the findings. The only judgment call was DEC-PERF-01 (standard vs exhaustive profile), resolved in favor of ponytail.

### 4.7 Concurrent-work preservation

- No unfamiliar files were modified.
- No `git reset`, `git clean`, force-checkout, force-push, or history rewrite was performed.
- `git status --short --branch` was not run before writing plan files because the only writes were inside the new `.ai/03_plans/2026-07-04-Performance-Optimization/` directory (created earlier in this session by `mkdir -p`). No other agent's work was touched.

### 4.8 Generated artifacts

| Path | Purpose |
|---|---|
| `.ai/03_plans/2026-07-04-Performance-Optimization/README.md` | Plan entrypoint |
| `.ai/03_plans/2026-07-04-Performance-Optimization/01_FINDINGS.md` | Audit findings with evidence |
| `.ai/03_plans/2026-07-04-Performance-Optimization/02_IMPLEMENTATION_PLAN.md` | Phased work packages |
| `.ai/03_plans/2026-07-04-Performance-Optimization/03_RISK_AND_READINESS.md` | This file |

No temporary scripts, fixtures, or logs were generated. No cleanup required.

---

## 5. Final report

**Plan status:** `CONDITIONALLY READY` *(overall)*. Phase 1 is `NOT READY` until WP-P1-01 produces EXPLAIN artifacts against the corrected schema; Phases 2–4 are sequenced behind their evidence-gathering work packages. See §4.2 for the full phase-status table.

**Verification mode:** `emulated` — readiness capped at 97.

**Work delivered by this planning pass:**

- 1 plan directory created.
- 4 markdown documents totaling ~30 KB of focused planning content.
- 21 audit findings (1 HIGH, 9 MED, 9 LOW, 2 INFO), each with file:line evidence. *(Counts corrected in Round 3 after Codex caught that Round 2's "8 MED" header missed F-D1-02 in the list.)*
- 4 active implementation phases + 1 deferred (Phase 5 / share-viewer), with 11 work packages in Phases 1–4.
- 4 implementation phases with 11 work packages.
- 5 owner decisions surfaced (OPEN-PERF-01 through 05).
- 12 risks registered; 7 decisions logged with rejected alternatives.

**What the implementer should do next:**

1. Resolve OPEN-PERF-01 through OPEN-PERF-05 with Philip.
2. Run WP-P1-01 (EXPLAIN proof) — this is the cheapest first step.
3. If EXPLAIN confirms the hypothesis, proceed to WP-P1-02 (migration) and WP-P1-03 (N+1 fix).
4. After Phase 1 lands and is verified, capture Phase 2 and Phase 3 baselines. *(Note: README §4 and 02_IMPLEMENTATION_PLAN.md establish that Phase 1 must land before Phase 2/3 measurement — the originally drafted "in parallel with Phase 1" wording was a contradiction, corrected post-Codex-review on 2026-07-04.)*
5. Defer Phase 4 until Phase 1–3 baselines exist.

**What the implementer should NOT do:**

- Do not re-dispatch the 4 timed-out explore agents. The audit is complete.
- Do not skip WP-P1-01. The migration without EXPLAIN is speculative.
- Do not weaken any authz check to make the batched query easier to write.
- Do not enable any Cloudflare paid add-on.
- Do not refactor `workspace-repository.ts` or `AddComponentModal.tsx` beyond the named fix sites.
- Do not commit, push, merge, or deploy as part of this plan. Implementation requires a separate approved pass.

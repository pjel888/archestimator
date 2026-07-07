# 19 — Research, Review & QA Evidence

## §1. Research questions & sources

This is a planning pack building on existing repo scripts; minimal external research was required. Research questions and outcomes:

| Question | Sources consulted | Outcome | Date |
|---|---|---|---|
| How do the 4 anchor scripts behave? | `scripts/*.ts` (read in full via Explore subagent) | Exit semantics + artifacts mapped (`03` §1) | 2026-07-07 |
| Is there a unified launch gate today? | `package.json`, grep for `launch:gate` | No — confirmed gap | 2026-07-07 |
| Is CI running? | `.github/workflows*` directory listing | Disabled (`workflows-disabled/`) | 2026-07-07 |
| What is the historical launch verdict? | `current-state.md`, `decisions.md` (rg) | Stale NO-GO (2026-06-02 → 2026-07-04) | 2026-07-07 |
| What sibling packs must the gate aggregate? | `.ai/03_plans/` folder listing | 30+ sibling packs catalogued (`03` §7) | 2026-07-07 |

No external/web research was needed (the gate is internal tooling; official Cloudflare docs are not load-bearing for the *design* — they are for the anchor scripts, which already exist).

## §2. Skills & workflows used / unavailable

| Skill/workflow | Used? | Why |
|---|---|---|
| `archestimator-plan-pack` | ✅ read | Bound the dated-folder + loop convention |
| `Creating-Plan-Prompt.md` | ✅ applied | Exhaustive doc set + readiness labels |
| `Multi-Agent-Execution-Directive.md` | ✅ applied | Authority model + verification caps |
| Explore subagents (native) | ✅ used (3 lanes) | Read-only evidence gathering |
| `ultrawork`/`ultragoal`/`autopilot`/`ultraqa`/`autoresearch` | referenced in objective, not invoked as separate runs | The directive §4A contracts are *reflected in the plan* (autopilot shape, ultragoal-style durable goals, ultraqa adversarial matrix, autoresearch evidence rubric) without spawning separate workflow runs |
| Independent native reviewer | ❌ unavailable | → `verification_mode: emulated`, cap applies |
| GitNexus MCP | not invoked | Narrow planning task; `rg` + targeted reads sufficient per AGENTS.md proportional graph policy |

## §3. Specialist workstream outputs

- **Source/requirements:** `02`, `04`.
- **Codebase architecture:** `03`, `06`.
- **UX/owner-visible status:** `05`, `06` §8.
- **Backend/integration (script contract):** `06`, `11`.
- **Data/provider:** `07`.
- **Security/privacy:** `08`.
- **Performance/reliability:** `09`.
- **Test/QA:** `12`.
- **Ops/rollout/rollback:** `13`.
- **Blast radius:** `10`.
- **Adversarial:** `12` §3, `08`.
- **Final verification:** `17`.

## §4. Critique-and-revision cycle summaries

This is an `exhaustive` pack; the directive requires ≥2 critique-and-revision cycles after the initial draft.

### Cycle 0 (initial draft)
Drafted `00`–`19` from the three Explore subagent evidence lanes.

### Cycle 1 — full critique pass
**Findings identified:**
- P1: `06` §3 matrix did not explicitly mark missing-evidence domains (DOM-41+) — would silently pass. **Fixed:** added `*(missing-evidence)*` markers + NO-GO-for-Hard rule.
- P1: `04` shadow-path matrix did not cover aggregator-exception → exit path. **Fixed:** added REL-LG-01 AC3 + ADV row.
- P2: `13` did not address the CI-disabled reality for the rollout rings. **Fixed:** Ring 2 made owner-gated (OPEN-LG-05); Option C (local-only) added.
- P2: `06` §7 conflict precedence was implicit. **Fixed:** explicit precedence ladder + pessimistic-within-class + DEC-LG-07.
- P2: `12` adversarial matrix lacked dirty-worktree/concurrent-edit scenario. **Fixed:** added ADV-01, ADV-17.

### Cycle 2 — targeted critique pass
**Findings identified:**
- P1: `07` did not state the no-promotion rule as enforceable. **Fixed:** added FR-LG-05 cross-ref + the unit-test assertion.
- P2: `11` WP-1.2 lacked a DISCOVERY-REQUIRED marker for the exact anchor set. **Fixed:** marked DISCOVERY-REQUIRED with stop condition.
- P2: `15` assumptions lacked validation status. **Fixed:** added Validated column.
- P2: `17` needed explicit verification_mode + cap. **Fixed:** recorded `emulated` + CONDITIONALLY READY cap.

No further cycles needed; remaining gaps are genuinely external (OPEN-LG-01..06).

## §5. Adversarial scenario matrix

See `12` §3 (ADV-01..17). All applicable scenarios covered; N/A scenarios marked with reason.

## §6. Performance evaluator contract

See `12` §4 + `09` §1. Gate local-mode ≤120s; 3 runs; max; fixture = synthetic evidence dir.

## §7. Independent final verifier evidence

**`verification_mode: emulated`.** No native independent reviewer was available in this session. The lead performed a separated verification pass (re-read each doc against PROMPT requirements + directive completion gates), recorded in `17`. Per the directive, emulated verification caps overall readiness at 97 and package status at `CONDITIONALLY READY` for high-blast-radius planning until a real reviewer or owner accepts the package.

## §8. Explicit validation gaps

- The exact current on-disk artifact values were not read (the gate's freshness TTL handles this at runtime).
- The hosted security 403/404 status is from a dated fast-path entry; the gate should re-probe via `gh api` at runtime.
- Provider/hosted stage integration is not unit-testable without credentials (residual risk in `12` §7).
- Independent review is unavailable (RISK-LG-11).

## §9. Source citations

- `scripts/check-cloudflare-release-gates.ts` (817 lines) — read in full.
- `scripts/check-legal-owner-readiness.ts` (183 lines) — read in full.
- `scripts/check-support-monitoring-readiness.ts` (108 lines) — read in full.
- `scripts/generate-cloudflare-provider-exit-pack.ts` (1042 lines) — read in full.
- `package.json` — read in full.
- `.github/workflows-disabled/ci.yml` — read in full.
- `.ai/10_state/current-state.md` (fast path + rg) — read selectively.
- `.ai/10_state/decisions.md` (rg) — read selectively.
- `.ai/03_plans/` folder listing — for sibling pack catalogue.
- `AGENTS.md`, `archestimator-plan-pack/SKILL.md`, `Creating-Plan-Prompt.md`, `Multi-Agent-Execution-Directive.md` — read in full.

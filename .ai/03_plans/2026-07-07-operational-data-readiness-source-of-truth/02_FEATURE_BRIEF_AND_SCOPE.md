# 02 — Feature Brief and Scope

## Source brief (verbatim)

From `.ai/03_plans/2026-07-07-operational-data-readiness-source-of-truth/PROMPT.md`:

> Goal: Create a plan pack that eliminates operational source-of-truth drift across `AGENTS.md`, `.ai/10_state/current-state.md`, `wrangler.jsonc`, migrations, scripts, and provider proof docs.
>
> Evidence To Start From:
> - `AGENTS.md` references 29 migrations/latest `0029`, while `migrations/` contains later files through `0036`.
> - `AGENTS.md` lists two cron triggers, while `wrangler.jsonc` declares three.
> - Current-state, provider-exit proof, retention docs, and release scripts all hold overlapping readiness facts.
> - Drift makes future agents and GLM plan packs vulnerable to stale assumptions.
>
> Required Plan Pack: Define canonical facts, generated check scripts, update protocol, stale-doc detection, evidence locations, agent handoff rules, and a small recurring audit.
>
> Constraints: Do not use this plan to rewrite unrelated docs. Keep scope to operational truth needed for production readiness and agent safety.
>
> Stop Condition: The pack is complete when future agents can discover current operational reality quickly and stale facts are detectable.

## Correction of the brief against current repo reality

The brief's "Evidence To Start From" was authored ~01:00 on 2026-07-07 and is itself partly stale. This pack reconciles the brief against the **current** `main` (HEAD at audit time). Per the Creating-Plan-Prompt authority contract, current source/files overrule an older brief when they conflict; the conflict is recorded here, not smoothed over.

| Brief claim | Current repo reality | Resolution |
|---|---|---|
| "`AGENTS.md` references 29 migrations/latest `0029`" | `AGENTS.md:41` now says **38** files, latest **`0038`**. The 29/`0029` claim is true of **`README.md:36`/`L211`**, not `AGENTS.md`. | Pack treats the *migration-count drift class* as real (README.md is stale) but corrects the *location* in the brief. Both `AGENTS.md` and `README.md` are in the detector's assertion set. |
| "`migrations/` contains later files through `0036`" | `migrations/` now contains files through **`0038`**. | Snapshot counts the live directory; no hardcoded ceiling. |
| "`AGENTS.md` lists two cron triggers" | Confirmed: `AGENTS.md:40` lists two; `wrangler.jsonc` declares three; `worker.ts:109` dispatches the third. | Cron-drift requirement stands as written. |

No scope was silently removed. The pack still covers exactly what the brief requires (canonical facts, generated checks, update protocol, stale-doc detection, evidence locations, agent handoff, recurring audit); it just points the detector at the correct drifted files.

## Goals (converted from brief)

1. **Single canonical home** for operational facts that an agent reads first.
2. **Generated snapshot** so no operational number is hand-maintained.
3. **Drift detector** that fails closed when narrative docs diverge from the substrate.
4. **Update protocol** naming an owner and trigger per fact-class.
5. **Agent handoff rules** so restart reads, plan-pack authoring, and PR review consult the canonical home.
6. **Recurring audit** so drift is caught on a cadence, not only when a human notices.

## Non-goals

- Do **not** rewrite unrelated docs (PROMPT constraint). The detector *identifies* stale narrative lines; the execution phase *repairs* only the operational-fact lines, not surrounding prose.
- Do **not** change `wrangler.jsonc`, `migrations/`, application source, scripts, or provider state in this planning task.
- Do **not** close provider-exit blockers (sibling: `2026-07-07-provider-exit-final-proof-closure`).
- Do **not** design observability/alerting (sibling: `2026-07-07-cloudflare-worker-production-observability-and-budgets`).
- Do **not** design the D1 schema verifier (sibling: `2026-07-07-d1-migration-state-and-schema-integrity`). This pack consumes D1 migration *count* as one fact-class only.

## Success metrics (objective, testable)

| Metric | Target | Measurement |
|---|---|---|
| Time for a fresh agent to learn the live cron list | <60s, one file read | Canonical home contains the cron list verbatim, sourced from `wrangler.jsonc` |
| Time for a fresh agent to learn the live migration count + latest | <60s, one file read | Canonical home contains count + latest filename, sourced from `migrations/` |
| Drift between narrative docs and substrate is detectable pre-merge | 100% of audited fact-classes | `check-operational-truth-drift.mjs` exits non-zero on injected drift (adversarial test) |
| False-positive rate of the detector | 0 on clean `main` | Detector exits 0 on current `main` after the execution-phase repair |
| Hand-maintained operational numbers in the canonical home | 0 for mechanical facts | Snapshot JSON is the source; canonical home quotes it or is regenerated from it |

## Failure metrics (anti-success)

- A future agent reads `AGENTS.md` cron line and acts on "two crons" → failure of canonical-home authority.
- A PR merges that adds migration `0039` without updating the snapshot/detector → failure of update protocol / CI hook.
- The detector passes while `README.md` still says 29 → false negative.
- The canonical home and the snapshot disagree → source-of-truth split (the detector must catch this too).

## Stakeholders

- **Owner:** Philip Lewis (approves canonical-home location, cadence, CI gating).
- **Agents (all frameworks):** consumers of the canonical home; must follow handoff rules.
- **Plan-pack authors:** must cite the canonical home instead of re-deriving operational facts.
- **Reviewers:** must run the detector (or rely on CI) before approving substrate/doc changes.

## Assumptions

- ASSUMP-1: `wrangler.jsonc` is and remains the declarative substrate for bindings/crons/routes/vars. (Repo evidence: it is the only file `cf:deploy` consumes.)
- ASSUMP-2: `migrations/` is and remains the active D1 migration directory; `supabase/migrations/` is legacy archaeology only. (Repo evidence: `AGENTS.md:41`, `wrangler.jsonc` migrations array.)
- ASSUMP-3: `cloudflare-env.d.ts` is auto-generated (`cf:typegen`) and therefore always in sync with `wrangler.jsonc` — it is **not** a narrative doc and does not need drift detection, only regen. (Repo evidence: header comment + `package.json` `cf:typegen`.)
- ASSUMP-4: `worker.ts` scheduled handler is the behavioral source of which crons are *dispatched* (a cron in `wrangler.jsonc` with no `worker.ts` branch is dead config). (Repo evidence: `worker.ts:107-111`.)
- ASSUMP-5: The owner prefers a Markdown canonical home that is partly generated (mechanical facts) and partly curated (posture narratives), over a fully-generated doc. (To confirm — see OPEN-1 in `15_DECISIONS`.)

## Constraints

- Planning-only: no execution in this task.
- Shared worktree: no branch/worktree operations.
- Free-tier cost posture: the detector and snapshot must run locally and in CI without paid add-ons.
- No secrets in any generated artifact (the snapshot must not echo Worker secrets, only binding *names*).

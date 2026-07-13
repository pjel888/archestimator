# 19 — Research, Review, and QA Evidence

## Research questions and sources

This plan did not require external/official-doc research — all facts came from **current repo files** (the substrate and narrative docs), which is the authoritative source for *this* feature (operational truth *about this repo*). No Next.js 16, Cloudflare pricing, or provider-version behavior was relied upon, because the feature makes no framework/provider call.

| Research question | Source | Finding | Decision it shaped |
|---|---|---|---|
| How many crons does wrangler.jsonc declare vs. worker.ts dispatch? | `wrangler.jsonc` L59-65, `worker.ts` L107-111 | 3 declared, 3 dispatched (retention = `30 3 * * *`) | FR-3 cron assertion; `cronConfigVsDispatchMismatch` field |
| Is `AGENTS.md` or `README.md` the stale migration-count doc? | `AGENTS.md` L41, `README.md` L36/L211 | AGENTS.md current (38/0038); README.md stale (29/0029) | Corrected PROMPT premise (`02`); detector asserts both files |
| Does a drift-check script already exist? | `ls scripts/`, grep for drift/parity/reconcile/truth | None exists; `generate-cloudflare-migration-inventory.ts` scans only `supabase/migrations/` | FR-2/FR-3 are greenfield; RISK-12 |
| Are bindings drifted anywhere? | cross-check wrangler.jsonc vs AGENTS.md/current-state.md/cloudflare-env.d.ts | All 7 match everywhere | Detector focuses on cron + migration count (the real drift); binding assertion is subset-presence only |
| Does the sibling d1-migration pack already own a stale-doc guard? | sibling `16_REQUIREMENTS_TRACEABILITY_MATRIX` T-09 | Yes, D1-count-scoped | DEC-CANONICAL-SCRIPT (umbrella here) |

**What was searched for but not found:** an existing exported JSONC parser helper in `scripts/` (DISCOVERY-REQUIRED in T-01); an existing husky config (DISCOVERY-REQUIRED in T-10). Both have bounded read-only first steps.

**Validation rubric for "research sufficient":** for a docs-truth feature, current-repo-file evidence is the strongest possible class (it is the thing being asserted). No official-doc research could improve it. Research declared sufficient.

## Skills and workflows used / unavailable

- **Used:** `archestimator-plan-pack` (binds dated-folder + loop shape, confirmed exhaustive warranted); `Creating-Plan-Prompt.md` (authoring directive); `Multi-Agent-Execution-Directive.md` (authority/verification/audit); `AGENTS.md` (project policy).
- **Used (parallel discovery):** three native Explore subagents (migration-drift, cron/binding-drift, provider-truth inventory).
- **Not used (deliberately):** GitNexus impact tools — not warranted for a docs/scripts feature with no symbol-graph question (per AGENTS.md proportional graph policy: narrow local work → `rg`/reads, not graph). `impeccable`/Playwright/visual QA — no UI claim (skipped per speed guardrail, stated reason). `ultraqa`/`ultrawork`/`autopilot` as *workflow names* — the planning task used direct orchestration + native subagents; the *adversarial matrix style* of ultraqa is reflected in `12` AQ-1..8 without invoking the workflow.
- **Unavailable:** a native independent *document-verifier* lane → `verification_mode: emulated` (cap 97).

## Specialist workstream outputs (summary)

- **Migration-drift lane:** 38 D1 files, latest `0038`; AGENTS.md current; README.md stale; supabase/README.md L15 stale (14 vs 10). Full drift table in `03` §3.2.
- **Cron/binding lane:** 3 crons in wrangler+worker; 2 in AGENTS.md/README.md/current-state.md; bindings all match; `databaseId` is a public binding id, not a secret. Full table in `03` §3.1/§3.2.
- **Provider-truth inventory lane:** 6+ overlapping artifacts; provider-exit OPEN/NOT READY vs AGENTS.md "complete"; no drift detector exists; sibling boundary mapped. Inventory in `03` §3.3/§3.4.

## Critique-and-revision cycle summaries

This is an **exhaustive** package → ≥2 critique-and-revision cycles required after the first draft.

- **Cycle 1 (post-first-draft, emulated adversarial):** Challenged (a) "is the PROMPT premise correct?" → discovered and corrected the AGENTS.md-vs-README.md misattribution (`02`, `03`); (b) "does the detector cover the real drift?" → added `current-state.md` stale-phrase assertion and `cronConfigVsDispatchMismatch` field; (c) "is the sibling overlap a duplicate-script risk?" → added DEC-CANONICAL-SCRIPT + T-12 cross-ref; (d) "could the snapshot leak secrets?" → added SEC-1 allowlist + secret-scan test; (e) "is `databaseId` a secret?" → classified (T-SEC-2). Revised `02`,`03`,`04`,`08`,`11`,`15`.
- **Cycle 2 (emulated final-verifier):** Re-checked traceability (every req → task → test → rollout); confirmed no vague tasks; confirmed every path exact or DISCOVERY-REQUIRED with falsifiable target; confirmed provider boundary explicit; confirmed shadow-path matrices complete; applied emulated cap → CONDITIONALLY READY. Residual gaps recorded in `17`.
- No cycle 3 warranted: remaining gaps (OPEN-1, OPEN-2, emulated cap, posture-truth, latent inventory-script bug) are owner decisions or inherent limitations, not internally resolvable defects. Cap reached honestly per the bounded-loop contract.

## UltraQA-style adversarial scenario matrix

See `12_TEST_AND_VALIDATION_STRATEGY.md` AQ-1..8. Coverage: stale cron (AGENTS/README/current-state), stale migration count, home/snapshot split, stale snapshot (DATA-1), malformed wrangler.jsonc (fail-closed), dead/undeclared cron, secret in home, false-positive on clean main, duplicate regen idempotency. All have setup/command/expected/cleanup.

## Performance evaluator contract

See `12` PERF-1: generator + detector <2s each (median of 5), regression >5s, evaluator = `time` on real repo. Runtime perf n/a (no runtime path).

## Independent final verifier evidence

`verification_mode: emulated`. The final verifier pass is documented in `17`. Independence unavailable; cap applied honestly. A human/external review pass is the path to lift the cap.

## Explicit validation gaps

1. Native independent document verifier unavailable → emulated cap 97.
2. CI may be disabled (§3.6) → detector gate deferred to pre-commit + manual cadence until re-enabled (RISK-8).
3. Detector cannot prove posture *narrative* truth, only citation presence (RISK-10).
4. `generate-cloudflare-migration-inventory.ts` latent bug (RISK-12) out of scope.
5. Browser/provider/E2E proof intentionally skipped (no such claim).

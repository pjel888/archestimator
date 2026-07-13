# 01 — Executive Summary

## The problem in one paragraph

Archestimator's operational facts (migrations applied, cron schedules, Cloudflare bindings, provider-exit posture, cost tier, retention) currently live in ≥6 overlapping artifacts, and several have drifted from the canonical deploy substrate (`wrangler.jsonc` + `migrations/` + `worker.ts`). The drift is real and load-bearing: `wrangler.jsonc` and `worker.ts` dispatch **three** cron triggers, but `AGENTS.md:40`, `README.md:39`, and `current-state.md` all say **two**; `README.md` claims **29** migrations/latest `0029` when there are **38** and the latest is `0038`; `AGENTS.md` says the Cloudflare migration is "complete" while the provider-exit runbook records it as **OPEN/NOT READY**. There is **no script** that detects this drift, so it propagates into new plan packs (the PROMPT for this very pack was itself written against a stale premise). Future agents reading these docs build on wrong assumptions.

## What this pack delivers (planning only)

A production-grade plan to make operational reality **discoverable from one canonical home** and **mechanically drift-detectable**, without rewriting unrelated docs. The four load-bearing deliverables, all to be implemented in a later execution phase (not in this planning task):

1. **A canonical operational-facts home** — one Markdown file (recommended `docs/OPERATIONAL_TRUTH.md` or `.ai/10_state/operational-truth.md`) that is the single source agents read first, generated/synced from the substrate where the fact is mechanical (e.g. cron list from `wrangler.jsonc`).
2. **A generated snapshot** — `scripts/generate-operational-truth-snapshot.ts` emits `operational-truth.snapshot.json` by reading `wrangler.jsonc`, counting `migrations/`, parsing `worker.ts` scheduled branches, and reading `package.json` scripts. No hand-maintained numbers.
3. **A stale-doc detector** — `scripts/check-operational-truth-drift.mjs` asserts the snapshot against the claims embedded in `AGENTS.md`, `README.md`, and `current-state.md` (and the canonical home itself). Fails the check (non-zero exit) on any mismatch. Wired into CI and/or pre-commit and/or the existing `cf:release-gates` surface.
4. **An update protocol + recurring audit** — a per-fact-class owner table, a "when X changes, update Y" protocol, and a small recurring audit cadence so drift is caught early rather than rediscovered.

## Scope boundaries

In scope: operational facts needed for **production readiness and agent safety** — D1 migration count/latest, cron triggers, Cloudflare bindings (D1/R2/DO/Queue+DLQ/Images/Email/Assets), Worker name + custom domains, provider-exit posture, cost/free-tier posture, retention posture, compatibility flags, and which scripts prove which facts.

Out of scope (explicit non-goals): rewriting unrelated docs, refactoring application code, changing `wrangler.jsonc`, applying/creating migrations, touching provider/production state, designing the full observability stack (covered by `2026-07-07-cloudflare-worker-production-observability-and-budgets`), or closing the provider-exit blockers (covered by `2026-07-07-provider-exit-final-proof-closure`).

## Why exhaustive

Per `Creating-Plan-Prompt.md` §9, `exhaustive` is required for release-readiness, data-integrity, and agent-framework/operational-truth work. This pack touches all three: it governs what every future agent believes about the deploy substrate, it asserts against schema-bearing files (`migrations/`, `wrangler.jsonc`), and it defines an agent-handoff protocol. A compact/standard pack would under-cover the cross-artifact reconciliation and the CI hook contract.

## Headline findings

- **Cron drift is the only load-bearing narrative-doc drift that is also runtime-affecting.** Bindings match everywhere; the third cron (`30 3 * * *`, retention pass, `worker.ts:109`) is documented nowhere narrative.
- **Migration-count drift is concentrated in `README.md`, not `AGENTS.md`.** `AGENTS.md` is current (38/`0038`); `README.md` (L36/L211) is stale (29/`0029`). The PROMPT premise naming AGENTS.md is itself stale — this pack corrects it.
- **Provider-exit is a posture nuance, not a binary.** Code/runtime migration is complete; provider-exit *closure* is OPEN/NOT READY. The canonical home must carry both facts, not collapse them.
- **No drift detector exists.** `generate-cloudflare-migration-inventory.ts` only scans `supabase/migrations/` (legacy), never active `./migrations/`. The detector is genuinely greenfield.
- **One sibling boundary conflict** (`2026-07-07-d1-migration-state-and-schema-integrity` Phase 4) is resolved: the umbrella detector lives here; the D1 count is one fact-class within it.

## Readiness

- Plan status: **CONDITIONALLY READY** (see `17_FINAL_READINESS_REVIEW.md`).
- Verification mode: `emulated`. Readiness cap 97 applied. The package is internally complete and implementation-ready for the non-blocked slices; it is held at CONDITIONALLY READY rather than IMPLEMENTATION-READY because (a) verification is emulated, not independent, and (b) the canonical-home *location* is an owner decision (two viable options with a recommendation) that should be confirmed before execution begins.
- No application/source/script/migration/config/provider state was modified by this planning task.

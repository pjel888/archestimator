# 19 — Research, Review, and QA Evidence

## Research questions and sources

| # | Question | Source | Decision shaped | Citation/date |
|---|---|---|---|---|
| RQ-1 | What is the free-tier retention for Cloudflare Workers Logs? | Cloudflare Workers Observability docs (retrieved via discovery agent; official-doc status) | DEC-03 / DATA-03: corrected "30d" → "~3d free, 30d+ via Logpush/Workers Paid" | official docs; exact page citation deferred to implementation (retrieval-first per AGENTS.md Cloudflare skill guidance) |
| RQ-2 | Is native Worker alerting available/usable on Free? | Cloudflare docs (sibling pack OBS-03 researched) | DEC-08: free self-poll GraphQL is the realistic path | official docs (sibling `19_…`) |
| RQ-3 | Does D1 (SQLite) support ALTER CHECK in place? | SQLite docs | `07_…` DB-01: rebuild-via-tmp for the CHECK extension | SQLite docs (well-known: CHECK is table-level) |
| RQ-4 | Does `data_retention_events` CHECK already allow the 7 log/platform classes? | `migrations/0034` (read directly) | DATA-02: no CHECK change needed for retention rules; only DATA-01 incidents need the ALTER | repo evidence `migrations/0034:13-30` |
| RQ-5 | What is the latest applied migration number? | `ls migrations/` | `0040` is the next free slot; beta-feedback `0039` proposal is stale | repo evidence |

**Research validation rubric:** official docs > repo evidence > derived > assumption. RQ-1/RQ-2 are
official-doc-shaped but the exact Cloudflare doc page is deferred to implementation (retrieval-
first); the *decision* (free-tier ~3d) is well-established and the runbook captures the
implication. RQ-3/RQ-4/RQ-5 are repo/SQLite facts verified directly.

**Searched for but not found:** a free-tier Workers Logs retention SLA page stating an exact
"3 days" number — the ~3d figure is the widely-documented free-tier behavior; implementation must
confirm against the current Cloudflare dashboard/doc before launch (DATA-03 AC crosses-checked).

## Skills and workflows used

| Skill/workflow | Used | How |
|---|---|---|
| `archestimator-plan-pack` | yes | confirmed exhaustive profile + LOOP_LEDGER contract |
| `Explore` discovery agents (×3, parallel) | yes | logging/redaction, observability/alerting, retention/compliance audits — separate outputs cited in `03` |
| `verification-before-completion` | yes | completion-audit discipline |
| Native adversarial/final-verify lanes | **not available** | emulated; recorded honestly in `17` |
| `cloudflare`/`workers-best-practices` skills | referenced (retrieval-first) | not loaded for planning; current-doc refresh deferred to implementation |

## Specialist workstream outputs (summary)

- **Source/requirements:** `02_…`, `04_…`, `16_…` — 20 requirements, all traced.
- **Architecture:** `06_…` — pipes-vs-proof boundary; Mermaid current/target.
- **Data:** `07_…` — DB-01/DB-02 blueprints; access-path matrix.
- **Security/redaction:** `08_…` — full emit-path inventory + 9 gaps + credential taxonomy.
- **Performance/reliability:** `09_…` — latency + retention budgets.
- **Test/QA:** `12_…` — execution matrix + 12-row adversarial matrix.
- **Operations:** `13_…` — runbook + gates + rollback.
- **Blast radius:** `10_…`.
- **Adversarial:** `17_…` cycle log (C1-1..C1-10).
- **Final verify:** `17_…` requirement-by-requirement table.

## Critique-and-revision cycle summaries

- **Cycle 1 (adversarial, emulated):** 10 findings (3 P0, 6 P1, 1 P2). All P0/P1 resolved:
  migration-slot verification, CHECK-resolution, free-tier TTL correction, scope-overlap boundary,
  double-delete seam, session-shape discovery, sibling sequencing, validation non-manual,
  emulated-verification cap, evidence-store decision.
- **Cycle 2 (final verify, emulated):** 20 requirements audited; 0 failures; no internally-
  resolvable blocker remains. Caps recorded.

A third cycle would not improve correctness: remaining gaps are genuinely external (hosted proof,
owner decisions, sibling-pack dependency, independent reviewer). Bounded iteration cap reached per
the suite contract.

## UltraQA-style adversarial scenario matrix

See `12_…` §"Adversarial scenario matrix" (AQ-1..AQ-12). Covers: malformed webhook URL, secret
leak via receipt, alert spam DoS, non-admin incident declare, retention mis-delete, dual-emission
leak, stale receipt, migration collision, local-automated passing critical gate, token expiry,
email circuit breaker, concurrent declares. All specified for implementation; not run at planning
time (docs-only planning task — dynamic adversarial QA is specified for future implementation per
the directive §4A).

## Performance evaluator contract

See `09_…` "Alert-latency budget" (per-scenario `sentAt`/`ackObservedAt`) + retention-pass cost
(large-fixture `budget_reached` test). Passing ordinary tests is not claimed as perf readiness;
the receipt timestamps are the declared evaluator.

## Independent final verifier evidence

`verification_mode: emulated`. No independent native verifier was delegated. The three `Explore`
discovery agents were independent for the *audit* stage (separate outputs), but the adversarial
and final-verification stages were separated passes by the author. This is recorded honestly and
caps readiness at 97 / status CONDITIONALLY READY. An independent reviewer or owner acceptance is
the path to remove the cap.

## Explicit validation gaps (honest)

1. **Provider-backed receipts** (S-01/S-02/S-05/S-06) — cannot be produced locally; external gate.
2. **Independent verification** — emulated; cap applied.
3. **Cloudflare free-tier log retention exact number** — ~3d widely documented but exact dashboard
   figure to be confirmed at implementation.
4. **Better Auth `session` table shape** — DISCOVERY-REQUIRED (R-07).
5. **Sibling pack landing** — S-02/S-05 precision depends on it (R-04).
6. **`OPEN-DEC-004`** — final TTLs; draft enforcement proceeds meanwhile.

# 19 — Research, Review, and QA Evidence

## Research questions and sources

| Question | Source | Finding | Decision changed? |
|---|---|---|---|
| Does a feedback loop already exist? | repo (`src/lib/workshop/beta-feedback*.ts`, `migrations/0001`) | Yes — capture half is complete; the *operating loop* is missing | Yes — scope shifted from build to complete-the-loop |
| Is there an alert pattern to clone? | repo (`src/lib/uploads/operational-telemetry.ts`) | Yes — `sendUploadOperationalAlert` env triplet | Yes — `sendFeedbackAlert` clones it (DEC-04) |
| Is email wired and reliable? | repo (`src/lib/email/transactional-email-client.ts`) | Yes for publication; not for feedback; circuit breaker exists | Yes — reuse `sendEmail` (ARCH-02) |
| How many crons exist? | repo (`wrangler.jsonc`, `worker.ts`) | 3 (AGENTS.md stale says 2) | Yes — noted; room for a 4th |
| Is zod used? | repo (`package.json`, `rg`) | No | Yes — match manual parse-union (DEC-06) |
| Is there a retention row for feedback? | repo (`.ai/10_state/compliance/retention-schedule.md`) | No | Yes — add DATA-02 (OPEN-RET-01) |
| What's the privacy basis for feedback content? | repo (`.ai/10_state/compliance/privacy-notice-draft.md:33`) | Consent + legitimate interest | Yes — retention + DSAR apply (08) |
| What SLA do operators promise? | repo (`.ai/16_user-experience/.../admin-support-operator-use-cases.md`) | Open question | Yes — `OPEN-SLA-01` recommended defaults |

**Primary sources first**: all findings are from current repo files (`.ai/`, `src/`, `migrations/`, `wrangler.jsonc`). No community-convention sources were relied upon for version-sensitive claims. No external web research was required (the stack behavior is repo-confirmed). Next.js 16 docs under `node_modules/next/dist/docs/` were not read in depth because the loop does not change routing/caching/Server-Action semantics beyond extending existing patterns; if implementation touches cache/Suspense, the impl agent must read the relevant local doc first (recorded in `11`).

## Skills and workflows used / unavailable

| Capability | Used? | How | Substitute if unavailable |
|---|---|---|---|
| `Explore` subagent (read-only fan-out) | yes | 4 concurrent lanes (UI, backend/data, monitoring, plans/state) | targeted `rg` + reads |
| `archestimator-plan-pack` skill | yes | binds to dated folder + loop convention | n/a |
| `gitnexus` / `code-review-graph` MCP | no | narrow, already-mapped surfaces; `rg` cheaper (proportional graph policy) | n/a |
| Independent verifier agent | **unavailable** | emulated verifier pass by the same agent | emulated (cap 97) |
| Playwright / browser QA | intentionally skipped | RTL DOM tests prove ack/a11y/focus | n/a |

No capability was fabricated. No skill name was used as proof of work.

## Specialist workstream outputs (all emulated as separated passes)

| Workstream | Output doc | Key finding |
|---|---|---|
| Product strategy/scope | `02` | scope = complete-the-loop, not build |
| Codebase architecture | `03`, `06` | loop 80% built; gaps = notify/SLA/follow-up/retention/proof |
| UX/a11y | `05` | ack + a11y fixes; toast is wrong for ack |
| Backend/API | `06`, `07` | reuse Server Actions + cron; no new routes |
| Data/D1 | `07`, `21` | migration 0039 additive; retention row missing |
| Security/privacy | `08` | feedback = personal data; webhook summary-only |
| Performance/reliability | `09` | sweep evaluator; notify 2s timeout |
| Test/QA | `12` | matrix + UltraQA + shadow paths |
| Ops/rollout | `13` | feature flag + rollback |
| Blast radius | `10` | additive; shared files = `worker.ts`, `wrangler.jsonc` |
| Adversarial | below | 15 QA scenarios |
| Final verifier | `17` | emulated; CONDITIONALLY READY |

## Critique-and-revision cycle summaries

Per the suite contract, `exhaustive` requires ≥2 critique cycles after the first draft. This pack ran:

1. **Cycle 1 (consistency + completeness)**: cross-doc check found (a) missing notify-timeout decision, (b) ambiguous sweep-route decision, (c) stale cron count, (d) `UNIQUE(status)` SLA implication, (e) non-archived purge protection, (f) webhook-vs-email PII parity. All resolved (see `17`).
2. **Cycle 2 (adversarial + readiness)**: ran the UltraQA matrix and the verifier search; confirmed shadow paths complete; identified `OPEN-MON-01`/`OPEN-RET-01` as the only blockers to full readiness; applied emulated cap.

No 3rd cycle was warranted: remaining findings are external (hosted proof, retention ratification) or owner-delegated (SLA values), not internally resolvable planning defects.

## UltraQA adversarial scenario matrix

See `12_TEST_AND_VALIDATION_STRATEGY.md` — 15 scenarios (QA-01..QA-15) covering malformed/oversized/missing input, auth denial, cross-role, duplicate submit, concurrency, retry/idempotency, upstream failure, rollback-after-partial-success, misleading-success, dirty-worktree safety (n/a — planning-only), webhook SSRF, circuit-open, retention safety. All have expected signals and planned tests.

## Performance evaluator contract

| Evaluator | Baseline | Target | Fixture | Runs | Threshold | Evidence artifact |
|---|---|---|---|---|---|---|
| SLA sweep latency | new | <500ms p95 @1000 rows; <5s @100k | synthetic {10,100,1000,10000} | 5 | >2x baseline | recorded here post-impl |

(Submission/update are O(1) — proven by unit tests, no evaluator.)

## Independent final verifier evidence

`verification_mode: emulated` (synthesis). The **evidence-gathering** was `independent`: two separate `Explore` subagent lanes (Verifier + Adversarial, distinct agent IDs, distinct outputs) ran against the Creating-pass package before re-scoring. Their findings drove the Improvement pass. See `17_FINAL_READINESS_REVIEW.md` for the full resolution table, baseline→final scorecard, and evidence-class table. True end-to-end independence (separate synthesizer) was not available in this session; a human or separate-agent review of the *final* package is recommended to lift the emulated cap.

### Improvement-pass evidence added (2026-07-07)

- **Local Next.js 16 docs consulted:** `node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md:11,97-99` (fetch not cached by default; force-dynamic ≡ no-store), `node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md:15,32-44` (cacheComponents replaces old configs; without the flag, previous model holds). Next.js version: **16.2.10**. `next.config.ts:92-106` confirmed Cache Components NOT enabled.
- **Codebase claims re-verified:** 17/17 items checked; 13 VERIFIED, 4 corrected (SUPPORT_EMAIL/MAX_*/MIN_* module-private not exported; `canReviewBetaFeedback` lives in `beta-feedback-review.ts:28-30` not the page; static mailto in `page.tsx:21` not the action; worker.ts comment text + `0 3`/`15 3` routing via `runCloudflareScheduledUploadJobs` not switch arms).
- **Retention registry located (was DISCOVERY-REQUIRED, now resolved):** `src/lib/compliance/retention-core.ts` — `RetentionClassName` union (`:28-42`), `RetentionRule` type (`:44-50`), `DEFAULT_RETENTION_RULES` (`:79-143`), `runRetentionPassInD1` (`:180`). Closed union → adding feedback is a source edit, not an additive insert.
- **Adversarial finding count:** 6 P0 + 11 P1 + 8 P2 → all P0/P1 resolved in this pass (resolution table in `17`).

## Explicit validation gaps

| Gap | Why | Risk | Substitute | Unblocks with |
|---|---|---|---|---|
| Hosted inbox monitoring proof | external/manual | operator may miss feedback | readiness check + operator email + breach alert | `OPEN-MON-01` (observability-alert-proof pack) |
| Alert-delivery hosted proof | external | webhook may silently fail | `verify-feedback-alert-delivery.ts` + log `code` | `OPEN-MON-01` |
| Retention-schedule ratification | owner/legal | TTL value not yet law | recommended 365d default; archived-only guard is safe either way | `OPEN-DEC-004` |
| Browser proof of ack/focus | intentionally skipped (RTL proves it) | none | RTL DOM tests | n/a |
| Sweep perf at prod volume | not yet measured | low (indexed; beta volume tiny) | perf test at 1000 rows | impl |

## Cleanup

No temporary artifacts were generated (planning-only). The `Explore` subagents performed read-only inspection; no harnesses, fixtures, logs, or temp files were created in the repo.

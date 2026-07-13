# 00 — Agent Coordination — Production RUM And CWV Telemetry

Date: 2026-07-07
Plan folder: `.ai/03_plans/2026-07-07-production-rum-and-cwv-telemetry`
Profile: `exhaustive`
Mode: `planning-only` — produce the plan pack; do not change application code, tests, migrations, `wrangler.jsonc`, `next.config.ts`, `package.json`, or any provider state.

## Master goal

Produce a production-grade, codebase-specific implementation plan pack that lets
a future implementation AI add **privacy-safe Real User Monitoring (RUM) and
Core Web Vitals (CWV) telemetry** to Archestimator without overbuilding and
without violating the free-tier / no-paid-add-on / no-personal-data posture.

**Outcome.** An executor can read `README.md` → `11_IMPLEMENTATION_PLAN.md` and
land the smallest coherent telemetry system that: (1) measures CWV (LCP, INP,
CLS) plus supporting vitals (TTFB, FCP) on real user page loads; (2) stores the
data cheaply on Cloudflare free-tier primitives (Workers Analytics Engine as
primary sink, optional D1 rollup); (3) minimizes privacy surface (cookieless,
sampled, route-bucketed, no PII, no raw URLs, no IP logging); (4) surfaces
actionable p75 dashboards and release-blocking alert thresholds; and (5) feeds
release decisions explicitly.

**Problem being solved.** Today every CWV metric measured in the browser is
discarded. `WebVitalsProbe` is hard-gated to `NEXT_PUBLIC_PERF_TRACE=1` and only
`console.log`s; `PerformanceMonitor` is dev-only. There is no `/api/rum`
ingestion endpoint, no `sendBeacon`/`visibilitychange` flush, no
`analytics_engine` binding, and `worker.ts` never reads `request.cf`. Synthetic
gates (`e2e/route-transition-performance.spec.ts`, `check-performance-budgets.mjs`)
cover lab signal only; there is no durable real-user signal. This pack closes
that gap.

**Non-goals.**
- Not replacing the synthetic/perf gates (`e2e/route-transition-performance.spec.ts`, `check-performance-budgets.mjs`, `perf:*` scripts). RUM is independent of and complementary to those.
- Not adding paid tooling (SpeedCurve, Datadog RUM, New Relic, Akamai mPulse, Vercel Speed Insights paid, Sentry Performance) — these are documented as rejected alternatives only.
- Not building session-replay, funnel analytics, conversion tracking, or business-event analytics. RUM/CWV field telemetry only.
- Not collecting personal content, secrets, tokens, full URLs, IPs, user IDs, or free text.
- Not enabling Cloudflare paid add-ons (D1 paid, Workers Paid solely for RUM, Logpush paid, paid alerting). All sinks must fit free-tier limits.
- Not changing the existing `/api/internal/client-error` endpoint contract.
- Not doing nonce-CSP work (owned by `2026-07-07-global-nonced-csp-enforcement`); this pack only *coordinates* with it.
- Not doing server-side Worker Observability work (owned by `2026-07-07-cloudflare-worker-production-observability-and-budgets` and `2026-07-07-observability-alert-proof-and-log-retention`); this pack is browser-RUM + first-party sink only and explicitly boundaries against those.

**Planning scope (what this pack must define).** Metrics set, collection point
(client mount + transport), sampling rate, consent/privacy posture, storage sink
+ retention, dashboard format, alert thresholds, no-paid-option evaluation, and
how CWV evidence informs release decisions. Source: `PROMPT.md` "Required Plan Pack".

**Required codebase analysis.** Inventory existing perf instrumentation, telemetry
collection points, Cloudflare bindings, CSP, consent, layout mount points, and
existing perf tests. Done — see `03_SOURCE_AND_CODEBASE_AUDIT.md`.

**Required specialist workstreams (covered, emulated where noted).**
1. Product strategy/scope — lead.
2. Existing codebase architecture — codebase-audit lane (independent Explore).
3. UX/UI/accessibility — N/A for planning (no new UI chrome in the core path; an internal-only dashboard is out of scope for v1, see `05_UX_UI_ACCESSIBILITY_PLAN.md`).
4. Frontend components/state — lead.
5. Backend services/API/network — lead.
6. Data models/database/migrations — lead (Analytics Engine + optional D1).
7. Security/privacy/auth — lead + threat model.
8. Performance/scalability/caching/reliability — lead.
9. Testing/validation/regression — lead.
10. Deployment/observability/rollout/rollback/operations — lead.
11. Blast radius/dependencies/docs — lead.
12. Adversarial gap analysis — emulated pass.

**Implementation-readiness criteria (for the pack itself).** Every requirement
traceable; exact file paths/symbols named or explicitly blocked with options;
privacy posture explicit; free-tier cost model explicit; rollout gates defined;
adversarial matrix complete; no internally resolvable P0/P1 gap remains.

**Validation criteria.** Two critique-and-revision cycles + final emulated
verification. `verification_mode: emulated` → caps readiness at 97 and status at
`CONDITIONALLY READY`.

**Final planning deliverables.** The 22 documents listed in `README.md` plus
this coordination file and `LOOP_LEDGER.md`.

## Coordination ledger (summary — full append-only log in `LOOP_LEDGER.md`)

| Agent | /goal | Scope | Evidence | Dependencies | Findings | Conflicts | Status |
|---|---|---|---|---|---|---|---|
| Lead | Author + synthesize + verify | All docs | All | All | Synthesis in each doc | C1–C3 resolved | COMPLETE |
| codebase-audit (Explore) | Inventory existing perf/RUM/CWV surface | Read-only `src/`, config, tests | `03_SOURCE_AND_CODEBASE_AUDIT.md` | none | greenfield for production CWV; client-error route is the beacon template | none | COMPLETE |
| sibling-survey (Explore) | Extract doc shape + prior decisions | 2 observability sibling packs | `19_…` §Sibling survey | none | both server/edge-only, silent on RUM/CWV | none | COMPLETE |
| external-research (general) | web-vitals v5, CWV thresholds, Cloudflare free-tier sinks, sampling/privacy/GDPR | Web, primary sources | `19_…` §External research | none | web-vitals v5.3.0; Analytics Engine 100K writes/day free; CF Web Analytics free/cookieless/CWV-capable for landing | AE retention UNCONFIRMED | COMPLETE |
| adversarial (emulated) | P0/P1/P2 gap hunt | Full draft | `17_…` §Cycle 1–2 | draft | 3×P0 + 6×P1 + 4×P2 resolved | none | COMPLETE |
| final-verifier (emulated) | Requirement-by-requirement audit | Full pack | `17_FINAL_READINESS_REVIEW.md` | cycle 2 | emulated cap applies | none | COMPLETE |

## Skills discovered and used

- `archestimator-plan-pack` — binds the planning task to Archestimator's dated `.ai/03_plans/<YYYY-MM-DD>-<slug>/` convention and the named-loop discipline. Used to confirm plan-pack-vs-in-session decision and loop shape.
- `Explore` agent — two genuinely independent read-only discovery lanes (codebase audit, sibling survey).
- `general-purpose` agent — one independent research lane (external best-practice).
- Creating-Plan-Prompt + Multi-Agent-Execution-Directive — the authoritative suite contract this pack follows.

Skills discovered but NOT used (and why):
- `gitnexus` / code-review-graph MCP — the change surface is small and well-understood from the audit; the proportional-graph policy (AGENTS.md) says use `rg`/targeted reads for narrow local edits and reserve the graph for broad/unfamiliar refactors. Planning a new telemetry surface does not require call-graph impact analysis.
- `impeccable` / visual QA — no UI deliverable in v1 (internal dashboard out of scope). Proportional verification policy: routine UI fixes lean on DESIGN.md; this pack has no UI change.
- `playwright` / browser automation — no browser-only claim to prove in the planning task itself; the plan *specifies* future browser proof for the implementation AI.

No new reusable skill was created — no genuine capability gap exists.

## Verification mode

`verification_mode: emulated`. Discovery subagents were independent, but the
adversarial and final-verification passes were emulated as separated passes by
the lead. Per the suite contract this caps overall readiness at 97 and package
status at `CONDITIONALLY READY` until an independent reviewer or the owner
accepts the pack.

## Files off-limits to this pack

All files outside `.ai/03_plans/2026-07-07-production-rum-and-cwv-telemetry/`.
In particular this pack must not touch: `src/**`, `worker.ts`, `wrangler.jsonc`,
`next.config.ts`, `package.json`, `migrations/**`, `open-next.config.ts`,
`tests/**`, `e2e/**`, `scripts/**`, or any sibling plan-pack folder.

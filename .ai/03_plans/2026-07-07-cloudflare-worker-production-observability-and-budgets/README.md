# Plan Pack — Cloudflare Worker Production Observability and Budgets

**Date:** 2026-07-07
**Profile:** `exhaustive`
**Status:** **`CONDITIONALLY READY`** (`verification_mode: emulated`; overall 96/100)
**Mode:** planning-only — no application code changed by this task.

## What this is

A production observability and runtime-budget plan for the Archestimator
Cloudflare Worker (`archestimator-proof`) that an implementation AI can execute
**entirely within the free tier**. It defines request IDs, job IDs, error
taxonomy, CPU/duration/subrequest/memory/D1 budgets, log sampling, privacy
redaction, dashboard/alert expectations, evidence scripts, and free-tier-safe
monitoring options.

## Implementation start here

➡️ **`11_IMPLEMENTATION_PLAN.md`** — the authoritative execution guide.

Phase order (dependency-aware):

1. **Phase 0** — Discovery + scaffolding (verify files match the plan).
2. **Phase 1** — Request-id core (`request-id.ts`) — FR-01.
3. **Phase 2** — Worker dispatch try/catch + `x-request-id` echo — FR-01/03.
4. **Phase 3** — Error/log taxonomy wiring — FR-05.
5. **Phase 4** — Cron/queue correlation — FR-02.
6. **Phase 5** — Retention time+row budget — REL-02.
7. **Phase 6** — DO fan-out cap + metrics — REL-03.
8. **Phase 7** — Sampling config + Analytics Engine binding — OBS-01/02.
9. **Phase 8** — Server-Timing header + metrics emit — FR-04/OBS-01.
10. **Phase 9** — Redaction audit + proof routes — SEC-01/02.
11. **Phase 10** — Tests + runbook + closeout — TEST-01/DOC-01.

**Phases 1-6, 9-10 do not depend on any open decision and can start immediately.**
Phases 7-8 proceed with the recommended AE binding name `ARCH_METRICS`
(renameable later — OPEN-01).

## Dependency graph

```
Phase 0 ─┬─> Phase 1 ─┬─> Phase 2 ─┬─> Phase 4 ─> Phase 5
         │            ├─> Phase 3   ├─> Phase 9 ─> Phase 10
         │            ├─> Phase 6   └─> Phase 7 ─> Phase 8 ─┘
         │            └─> Phase 7
         └─> (characterization only)
```

## Requirements / task / test traceability

- Requirements: `04_REQUIREMENTS_SPECIFICATION.md` (FR-01..05, REL-01..03,
  OBS-01..03, SEC-01..02, TEST-01, DOC-01).
- Tasks: `11_IMPLEMENTATION_PLAN.md` (T-0.1 .. T-10.8).
- Tests: `12_TEST_AND_VALIDATION_STRATEGY.md` (matrix + AQ-1..12).
- Full trace: `16_REQUIREMENTS_TRACEABILITY_MATRIX.md`.

## Blocked / open decisions (do not block Phases 1-6, 9-10)

| ID | Decision | Owner | Recommendation |
|---|---|---|---|
| OPEN-01 | Analytics Engine binding name | Philip | `ARCH_METRICS` |
| OPEN-02 | Exact KPI set beyond route/outcome/duration | Philip | start small, expand |
| OPEN-03 | Alert-polling destination | Philip | GitHub Actions (free) |
| OPEN-04 | Enforce the 5 `ARCH_UPLOAD_HOSTED_*` vars live? | Philip | keep advisory (out of scope here) |
| OPEN-05 | Independent review of this pack | Philip | recommended before merge |

## Stale-plan revalidation checklist (before implementing)

- [ ] `wrangler.jsonc` still has the bindings listed in `03_…` §3.15.
- [ ] `worker.ts` still has the unguarded `fetch`/`scheduled`/`queue` (`03_…` §3.2).
- [ ] `src/lib/perf/server-timing.ts` still dev-only + no header (`03_…` §3.4).
- [ ] `src/lib/observability/route-error.ts:readTraceId` still prefers perf-trace (`03_…` §3.3).
- [ ] `src/lib/compliance/retention-core.ts` still unbounded (`03_…` §3.10).
- [ ] `src/lib/cloudflare/collaboration-room.ts` still re-encodes + no log (`03_…` §3.9).
- [ ] No paid add-on enabled since this plan was written (re-check `wrangler.jsonc` + dashboard).
- [ ] Re-confirm free-tier ceilings (re-read `19_…` sources) in case Cloudflare changed limits.

## Commands / checks before the first edit

- `git status` (confirm clean-ish; no unexpected diffs in target files).
- Read this plan folder's `03_…` and `11_…` fully.
- Declare file ownership in `LOOP_LEDGER.md` (per Multi-Agent Execution Directive §6).
- `bun run type-check` baseline (know the starting green/red state).

## Files explicitly off-limits (for this plan's scope)

- Legacy Supabase migrations (`supabase/migrations/`) — historical only.
- The unrelated `archestimator` provider project and `ebxxqidacheyapmmzavr`.
- Auth/data model, D1 schema, app-authorization paths (no change by this plan).
- Any frontend component/UI file (no UI change — `05_…`).
- Better-Auth runtime, R2 storage provider (unchanged).

## Files / systems intentionally unaffected

- ~28 Server Action files (inherit id; no body change).
- ~35 API routes (inherit id; existing error path reused).
- D1 repositories (optional `traced()` wrap only if a perf slice adds it).
- Client components (error envelope shape unchanged).
- Marketing-page cache (`routeStaticPublicPageThroughCache`) — unchanged.

## External proof that remains required before production rollout

- Hosted Workers Logs: find-by-`x-request-id`, error-rate-by-route (manual).
- Analytics Engine dataset readback (manual).
- D1 rows-written/day headroom check (manual).
- `exceededCpu`/`exceededMemory` outcome watch post-deploy.
- (Separate task) free-tier alert self-poll via GraphQL.

## Cost posture

**Stays on free-tier/bundled limits.** No paid add-on recommended by this plan.
Upgrade triggers (Logpush, Workers Paid, D1 paid, traces re-enable) documented in
`13_…` and DEC-09.

## Archive policy

Do **not** archive automatically. Archive only after the implementation is
verified in production and `current-state.md` is updated. Slices may be archived
independently (Phases 1-6 vs 7-8 vs 9-10) as they land.

## Document index

| Doc | Purpose |
|---|---|
| `00_AGENT_COORDINATION.md` | Master /goal, workstreams, ledger, skills |
| `01_EXECUTIVE_SUMMARY.md` | TL;DR + current/target state + decisions |
| `02_FEATURE_BRIEF_AND_SCOPE.md` | Brief, scope in/out, flows, constraints |
| `03_SOURCE_AND_CODEBASE_AUDIT.md` | File:line evidence map |
| `04_REQUIREMENTS_SPECIFICATION.md` | FR/REL/OBS/SEC/TEST/DOC + shadow paths |
| `05_UX_UI_ACCESSIBILITY_PLAN.md` | n/a with evidence |
| `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` | Current/target arch, boundaries |
| `07_DATA_DATABASE_API_NETWORK_PLAN.md` | No-schema proof, contracts, access paths |
| `08_SECURITY_PRIVACY_THREAT_MODEL.md` | Threats, controls, credential taxonomy |
| `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` | Budget table, evaluators, sources |
| `10_BLAST_RADIUS_AND_DEPENDENCIES.md` | Direct/transitive impact |
| `11_IMPLEMENTATION_PLAN.md` | Phases + tasks (execution entrypoint) |
| `12_TEST_AND_VALIDATION_STRATEGY.md` | Test matrix + adversarial matrix |
| `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` | Rings, rollback, runbook, queries |
| `14_RISK_REGISTER.md` | Risks with mitigations |
| `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` | DEC-01..10, ASSUMP-01..09, OPEN-01..05 |
| `16_REQUIREMENTS_TRACEABILITY_MATRIX.md` | Req → task → code → test |
| `17_FINAL_READINESS_REVIEW.md` | Verifier pass, scores, gaps |
| `18_STACK_CONTRACT_AND_PRODUCTION_STANDARDS.md` | Cross-cutting stack decisions |
| `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` | Research, cycles, QA, evidence gaps |
| `LOOP_LEDGER.md` | Append-only coordination log (impl-time) |
| `PROMPT.md` | Source brief (verbatim) |

## One-line summary

An executor can implement runtime budgets and observability proof for Cloudflare
production behavior from this pack — free-tier-safe, fully traced, with honest
gaps where hosted proof is required.

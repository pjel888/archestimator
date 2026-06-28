# 00 — Agent Coordination

## Master goal

`/goal`: Produce a complete, codebase-specific, evidence-grounded implementation planning pack for software-wide error handling across the Archestimator Next.js 16 + React 19 + Supabase codebase. The plan must let a separate implementation agent build a typed `AppError` hierarchy, a structured NDJSON dev logger with an AI-tail command, a production observability forwarder, and a unified Server Action error return shape — without re-researching requirements, current architecture, or industry standards.

## Authoritative inputs

| Source | Authority | Used for |
|---|---|---|
| User request (verbatim, 2026-06-28) | Highest — product intent | Scope, non-goals, AI-diagnosability requirement |
| `.ai/08_prompts/000_Planning Prompts/Creating-Plan-Prompt.md` | Framework — planning directive | File list, profile choice, readiness labels |
| `.ai/08_prompts/000_Planning Prompts/Multi-Agent-Execution-Directive.md` | Framework — execution directive | DISCOVER→PLAN→EXECUTE→VERIFY→RECORD→DECIDE loop, evidence rules |
| `AGENTS.md` | Repository instructions | Stack baseline, DB mandate, verification policy |
| `.ai/10_state/current-state.md` FAST PATH | Project state | Stage, pre-existing reds, DB boundary |
| Source code under `src/` | Repository truth | Current error-handling inventory (`01_SOURCE_AUDIT.md`) |
| `package.json`, `next.config.ts`, `vercel.json` | Config truth | Deps, hooks, deploy target |
| Official docs (Next.js, React, OTel, Sentry) | Industry standards | Citations in `02_INDUSTRY_RESEARCH.md` |

## Lanes used

Per `Multi-Agent-Execution-Directive.md` Section 2, the smallest lane set was used. Native subagent lanes were **attempted but unavailable** this session. Lead executed all lanes directly with emulated separation.

| Lane | Native subagent attempted | Outcome | Substitute used |
|---|---|---|---|
| Lead coordinator | — | — | Lead (Sisyphus) |
| Source/requirements analyst | `explore` bg × 3 | All timed out, 0 output | Lead direct grep + read |
| Industry research | `librarian` bg × 2 | Both timed out, 0 output | Lead direct websearch + context7 |
| Plan graph | `plan` sync × 1 | Timed out, 0 output | Lead direct, patterned on prior canonical packs |
| Adversarial reviewer | Planned for verify phase | Lead-as-emulated | Documented in `13_FINAL_AUDIT_SCORECARD.md` |
| Final verifier | Same | Lead-as-emulated | Same |

**Verification mode declaration:** `emulated`. Readiness cap = 97 per directive.

## Skill discipline

Per `Multi-Agent-Execution-Directive.md` Section 4, only skills whose current instructions materially improve the planning output are listed.

| Skill | Loaded? | Why |
|---|---|---|
| `request-refactor-plan` | yes (load attempted via plan agent; failed) | This is a refactor-plan task; pattern fits |
| `writing-plans` | same | Plan-document structure conventions |
| `improve-codebase-architecture` | same | Audit/scan framing for cross-cutting refactor |
| `best-practice-research` | same (lead direct) | Industry-standard research |
| `gitnexus` / `Explore Codebase` | NOT loaded — `rg`/`fd` direct was sufficient for the bounded scope | Per AGENTS.md proportional-graph policy: narrow local audits do not require the graph |
| `ponytail-audit` | applied as mode, not loaded as skill | Counterweight to keep plan tight |
| `verification-before-completion` | yes — gate at end | Evidence-before-claims |
| `autoresearch-goal` | yes — invoked by user | Durable mission/rubric artifacts |

No fabricated skills, no skill name used as proof.

## Workflow routing

Per `Creating-Plan-Prompt.md` Section 4A:

- **Autopilot delivery shape:** not invoked (planning-only, no implementation).
- **Ultragoal-style durable goal ledger:** per-phase contracts in `08_IMPLEMENTATION_PLAN.md`.
- **Ultrawork-style parallelization:** P2 (server-side wrapping) and P3 (client-side wiring) are parallel-safe after P1 lands; called out in `08_IMPLEMENTATION_PLAN.md`.
- **Autoresearch/validator-gated evidence:** research in `02_INDUSTRY_RESEARCH.md` shaped decisions `DEC-ERR-002`, `DEC-ERR-004`, `DEC-ERR-005`; citations recorded.
- **Compound Engineering plan quality:** stable IDs (`FR-`, `ARCH-`, `LOG-`, `OBS-`, `SEC-`, `UX-`, `A11Y-`, `TEST-`, `DEC-ERR-`, `RISK-ERR-`, `AC-`); repo-relative paths; rejected alternatives in `11_RISKS_DECISIONS_ALTERNATIVES.md`; no addenda stacking.
- **React/Next best-practice review:** P3 contract in `08_IMPLEMENTATION_PLAN.md` covers `"use client"` boundaries (Toast already client-only), Server Action shape (canonical in P2), RSC payload impact (none — error path is additive).
- **Performance-goal contract:** logger overhead budget defined in `06`/`08` (<1ms p95 per call, <50KB bundle add).
- **UltraQA adversarial QA:** matrix in `09_TEST_QA_ULTRAQA_PLAN.md`.
- **Superpowers-style skill discipline:** every skill name above was verified to exist in this environment; none used as proof of work.

## Coordination ledger

| Lane | Goal | Owned scope | Dependencies | Findings | Decisions | Status |
|---|---|---|---|---|---|---|
| Lead | Master plan | Full pack | None | Audit + research complete | Profile=standard, 16 files | EXECUTE in progress |
| Plan agent (attempted) | Plan graph | n/a | None | n/a (failed) | n/a | superseded |
| Explore client (attempted) | Client audit | src/components, src/hooks, src/app | None | n/a (failed) | n/a | superseded |
| Explore server (attempted) | Server audit | src/lib, src/app/api, src/proxy.ts | None | n/a (failed) | n/a | superseded |
| Explore infra (attempted) | Infra audit | package.json, configs, CI | None | n/a (failed) | n/a | superseded |
| Librarian Next.js (attempted) | Framework research | Next.js 16 docs | None | n/a (failed) | n/a | superseded |
| Librarian AI logs (attempted) | OTel/Sentry research | OTel docs, GenAI semconv | None | n/a (failed) | n/a | superseded |

## Conflict log

None. All decisions were resolved by the lead using audit + research evidence. See `11_RISKS_DECISIONS_ALTERNATIVES.md` for rejected alternatives.

## Stop conditions

Planning stops when:
- All 16 docs exist in the plan dir.
- `13_FINAL_AUDIT_SCORECARD.md` shows every rubric item PASS.
- README declares IMPLEMENTATION-READY.
- OMX verdict recorded as `pass`.

Implementation (separate task, future) stops when:
- P1–P6 landed and committed.
- AI-tail-diagnose loop proven end-to-end on a real failure.
- Sentry dashboard shows first real production error with source-mapped stack.

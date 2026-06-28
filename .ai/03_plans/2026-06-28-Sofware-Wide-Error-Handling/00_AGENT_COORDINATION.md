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

Per `Multi-Agent-Execution-Directive.md` Section 2, the original pack used lead-emulated lanes. This improvement pass used native read-only council lanes where they materially improved quality: feasibility, security/privacy, coherence, adversarial document review, and a final verifier gate.

| Lane | Native subagent attempted | Outcome | Substitute used |
|---|---|---|---|
| Lead coordinator | — | — | Lead integrated findings and edited docs |
| Source/requirements analyst | original: `explore` bg × 3 | timed out in original pass | Lead direct grep + read |
| Industry research | original: `librarian` bg × 2 | timed out in original pass | Lead direct web/local-doc research |
| Feasibility reviewer | native `ce-feasibility-reviewer` | completed | P0/P1 contradictions resolved in this improvement pass |
| Security/privacy reviewer | native `ce-security-lens-reviewer` | completed | P1/P2 security gaps resolved in this improvement pass |
| Coherence reviewer | native `ce-coherence-reviewer` | requested | Results integrated if returned before final gate |
| Adversarial document reviewer | native `ce-adversarial-document-reviewer` | requested | Results integrated if returned before final gate |
| Final verifier | native `verifier` | required before completion | Validates no P0/P1 planning gaps remain |

**Verification mode declaration:** `independent-council-improved`. The previous `emulated` cap no longer describes this repaired package because native reviewer output was available and used.

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

No fabricated skills, no skill name used as proof. User-granted planning-only owner authority was used only to settle reversible planning decisions; it did not authorize code, provider, paid-service, production, or destructive actions.

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

| Conflict | Resolution |
|---|---|
| Original pack claimed native agents were unavailable; current Codex session had native subagents. | Reclassified verification as independent-council-improved and recorded actual reviewer lanes. |
| Baseline gates required full `test`/`test:dom` green while the repo FAST PATH records known `test:dom` reds. | Replaced full-suite baseline assumptions with type-check/lint plus targeted tests and no-new-failures against the recorded baseline. |
| Next.js `onRequestError` snippets used the wrong parameter order. | Updated snippets to the local Next 16 docs signature: `(err, request, context)`. |
| `ERROR_HANDLING_ENABLED=false` claimed to restore legacy behavior after exported Server Action signatures change. | Removed master rollback flag; rollback is now per-phase revert plus observability kill switches. |
| Client-error logs and AI log explanations treated attacker-controlled text as trusted. | Added same-origin, schema, redaction, tainted-field, and prompt-injection requirements. |
| Sentry replay was enabled before privacy controls were defined. | Defaulted replay sampling to `0` until a separate owner-approved privacy posture exists. |

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

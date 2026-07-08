# 00 — Agent Coordination

Plan pack: `2026-07-07-ai-safety-leakage-and-provider-resilience`
Plan profile: **exhaustive** (touches security, data integrity, auth/tenant isolation, provider surfaces, AI prompt-injection, auditability, and release readiness).
Created: 2026-07-07 (Asia/Manila). **Improve pass applied 2026-07-07** per `Improve-Plan-Prompt.md`.
Lead coordinator / synthesizer: GLM-5.2 (single lead, native subagents unavailable in this session → emulated specialist lanes, see verification mode below).

## Master `/goal`

Produce a production-grade, codebase-specific planning package that lets Archestimator either (a) keep AI safely gated OFF for first-users launch with documented proof, or (b) enable AI behind a hardened contract with leakage- and resilience-proven controls — without adding or enabling a paid AI provider path by default and without leaking estimates, proposals, user data, or workspace context across tenants.

**Outcome:** A reviewer-approved plan pack that names the exact current-state AI surface (DeepSeek-only, disabled-by-default, two routes), the target-state hardening contract, every affected file/symbol, the adversarial/leakage test matrix, provider-resilience design, release gates, and rollback.

**Problem being solved:** Before first users, every AI path must provably resist tenant leakage, prompt injection, and provider failure, and must be auditable. The conservative launch posture exists but lacks a dedicated, evidence-grounded, implementation-ready hardening plan.

**Intended behavior:** Two AI routes (`/api/ai/ask`, `/api/ai/package-builder`) either stay 404-by-default or, if enabled, execute under auth + workspace scoping + bounded context + redacted audit + provider resilience + adversarial test coverage.

**Planning scope (in):** `src/lib/ai/**`, `src/app/api/ai/**`, AI client component(s), AI env vars/feature flags, AI D1 audit/rate-limit/memory/apply tables, observability/redaction layers they touch, and the documentation that must be re-anchored from Supabase→D1.

**Non-goals (out):** Implementing the feature; enabling a paid AI binding/provider; adding OpenAI/Anthropic/Workers AI; building RAG/vector storage; stored conversations; autonomous mutations; multi-step agent loops; re-platforming auth; modifying legacy Supabase resources; cost-library AI pricing (deterministic by corpus §8.4).

**Required codebase analysis:** AI entry points, prompt construction, data-in/data-out, tenant boundaries, redaction, provider timeouts/fallbacks, disable switches, logging policy, audit schema, adversarial tests, release gates.

**Specialist workstreams:** product/scope, codebase architecture, UX/A11y, frontend/state, backend/API, data/D1, security/privacy/threat model, performance/reliability, test/QA, rollout/ops, blast radius, adversarial gap analysis.

**Implementation-readiness criteria:** Every task has exact paths/symbols or a safe `DISCOVERY-REQUIRED`/`BLOCKED-*` block with options + recommendation; all requirements traceable; shadow paths complete; readiness ≥95 in scoped categories or residual gaps isolated.

**Validation criteria:** Planning pack passes cross-document consistency, traceability, adversarial, and final-verifier passes (verification mode recorded).

**Final deliverables:** This folder's 21 documents + 2 provider appendices.

**Stop condition:** AI exposure can be either safely gated off (with proof) or implemented with clear leakage and resilience proof.

## Skills and repository instructions used

- `archestimator-plan-pack` SKILL.md — confirmed the dated `.ai/03_plans/<YYYY-MM-DD>-<slug>/` convention; this is high-blast-radius (security/data/release), so an exhaustive pack is warranted over an in-session loop.
- `AGENTS.md` — Cloudflare-resource authorization, free-tier cost posture, verification proportionality, GitHub-security-loop redaction discipline, proportional graph policy.
- `.ai/08_prompts/000_Planning Prompts/Creating-Plan-Prompt.md` — authoritative structure for this exhaustive pack.
- Read-only `Explore` agents (5 parallel lanes) — used for codebase inventory; see `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md`.

Skills NOT used and why: `autopilot`/`ultrawork`/`ultragoal`/`ultraqa`/`gitnexus`/`cloudflare`/`supabase` are execution/QA/research-time tools; this is a planning-only task and their direct invocation is not required to produce the package (the disciplines they encode — durable goal ledger, parallelization, adversarial QA matrix, performance evaluator contract — are reflected in the plan content instead, per `Creating-Plan-Prompt.md` §4A). GitNexus impact analysis was not run because no symbol is being edited (planning-only).

## Workstream matrix (emulated lanes)

| Agent/Lane | `/goal` | Scope | Evidence | Dependencies | Findings | Conflicts | Status |
|---|---|---|---|---|---|---|---|
| Lead coordinator | Synthesize pack | All docs | All | All | — | — | COMPLETE |
| L1 AI code surface | Inventory AI entry points, prompts, providers, flows | `src/lib/ai/**`, `src/app/api/ai/**` | file paths, symbols, line refs | None | DeepSeek-only; 2 routes; bounded context; metadata-only audit | None | COMPLETE |
| L2 Auth/tenant | Map auth + workspace isolation AI must respect | `src/lib/authz`, `src/lib/auth`, AI auth | d1-access.ts, roles.ts, proxy.ts | None | No D1 RLS; app-code isolation; platform-admin bypass; AI outside proxy | None | COMPLETE |
| L3 Provider config/env | Inventory wrangler, deps, env, flags, resilience | `wrangler.jsonc`, `package.json`, `.env*` | bindings, deps, env names | None | No AI binding; 20s timeout; no retry/circuit; rate limit on Ask only | None | COMPLETE |
| L4 D1 schema/logging | Map AI tables, audit, retention, log sinks | `migrations/`, `src/lib/observability`, repositories | migration list, table schemas, redact.ts | None | 4 AI migrations; hash-only audit; 1 unredacted console.error; retention unverified | None | COMPLETE |
| L5 Docs/risks | Trace all AI-constraining docs + risks | `.ai/01_roadmap`, `.ai/06_specs`, `.ai/17_InfoSec`, corpus | doc paths, quoted constraints | None | R-011 launch-blocking leakage gap; Supabase→D1 doc drift; no decisions.md AI entries | None | COMPLETE |
| Adversarial reviewer | Disprove readiness; find omissions | Whole pack | P0/P1/P2 list | Synthesis | See `17_FINAL_READINESS_REVIEW.md` | — | COMPLETE |
| Final verifier | Requirement-by-requirement audit | Whole pack | Verification matrix | Synthesis | See `17_FINAL_READINESS_REVIEW.md` | — | COMPLETE |

Native subagents were **not** available in this session. The five discovery lanes ran as real parallel `Explore` agents (read-only, distinct outputs — genuine independence for the *discovery* phase). The adversarial and final-verification passes over the *synthesized pack* are `verification_mode: emulated` (separated passes by the same lead agent). Per the Suite Succession and Authority Contract, emulated verification caps overall readiness at 97 and, for a high-blast-radius package, caps package status at `CONDITIONALLY READY` unless a real independent reviewer or the owner accepts the final package. This pack is therefore marked **`CONDITIONALLY READY`** pending owner/independent review — see `17_FINAL_READINESS_REVIEW.md`.

## File/module ownership

All writes confined to this plan folder. No application code, tests, migrations, configs, or docs outside this folder are modified by this planning task. Future implementation will lease files per `11_IMPLEMENTATION_PLAN.md`.

## Concurrent-repository safety

Rechecked `git status` before writing; only files inside this plan folder are created. No staging, commits, branches, or history changes.

# 02 — Feature Brief and Scope

## Source brief (verbatim, from `PROMPT.md`)

> Create a plan pack for AI feature safety before first users: tenant isolation, prompt injection resistance, data leakage prevention, disabled/default behavior, provider failure handling, and auditability.
>
> Evidence to start from: AI code under `src/lib/ai/` and `src/app/api/ai/`; risk docs reference AI-generated output and provider-risk concerns; production readiness requires that any AI path cannot leak estimates, proposals, user data, or workspace context across tenants; launch posture appears conservative but a dedicated plan is needed before AI features are exposed.
>
> Required plan pack: inventory AI entry points, data inputs/outputs, tenant boundaries, prompt construction, redaction, provider timeouts/fallbacks, disable switches, logging policy, adversarial tests, and release gates.
>
> Constraints: do not add or enable a paid AI provider path by default; do not include secrets or real customer content in tests/evidence.
>
> Stop condition: the pack is complete when AI exposure can be either safely gated off or implemented with clear leakage and resilience proof.

## Interpreted product goal

Archestimator is preparing for first users. The AI features (Ask Flip, package-builder) must be either provably gated off for launch, or enabled behind a contract that is provably leak-resistant, injection-resistant, provider-resilient, and auditable. The pack must not expand to paid providers, RAG/autonomy, or non-AI surfaces.

## In-scope (planning)

| Area | Surfaces |
|---|---|
| AI routes | `src/app/api/ai/ask/{route,handler}.ts`, `src/app/api/ai/package-builder/{route,handler}.ts` |
| AI lib | `src/lib/ai/**` (feature-flags, deepseek, auth, read-context, rate-limit, audit, audit-d1-store, package-builder/*) |
| AI client UI | `src/components/workshop/EstimateCopilotFloatingButton.tsx`, `WorkshopPageShell.tsx` (UI gate) |
| AI env/flags | `ARCHESTIMATOR_AI_ENABLED`, `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED`, `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL`, `AI_PACKAGE_BUILDER_*`, `AI_PACKAGE_BUILDER_DRAFT_SIGNING_SECRET` |
| AI D1 schema | migrations `0006`, `0019`, `0027`, `0034` (retention classes) |
| Observability touched | `src/lib/observability/{redact,logger,app-error}.ts` (AI is a consumer) |
| Docs to re-anchor | `.ai/01_roadmap/10-ai-safety-readiness.md`, `02-security-tenancy-data-protection.md`, `01-launch-gates-master-checklist.md`, `13-risk-register.md`, `.ai/06_specs/ai-assistant-and-package-builder-spec.md`, `deep/architecture-overview.md`, `.ai/00_corpus/ARCHESTIMATOR_MASTER.md` §393, OWASP `12-ai-llm-security.md` |

## Out-of-scope (non-goals)

- Implementing the AI feature or flipping any flag.
- Adding OpenAI / Anthropic / Cloudflare Workers AI / any paid AI binding. (Constraint.)
- RAG, vector search, stored conversations, provider-owned memory, autonomous mutations, multi-step agent loops. (Roadmap rule; `10-ai-safety-readiness.md` §2.)
- Re-platforming auth (Better Auth stays) or migrating off D1.
- Mutating legacy Supabase project `ebxxqidacheyapmmzavr` or the unrelated `archestimator` provider project. (AGENTS.md.)
- Cost-library AI pricing — costs are deterministic arithmetic (corpus §8.4: "No AI-generated pricing").
- Proposal export AI — proposal XLSX is deterministic.
- Agent-framework model routing (DeepSeek/Kimi/etc. as coding assistants) — disambiguated in `18_STACK_CONTRACT_AND_PRODUCTION_STANDARDS.md`; not the product AI feature.

## Constraints inherited

- Free-tier / bundled Cloudflare only; no paid add-ons without explicit owner approval (AGENTS.md cost posture).
- No secrets or real customer content in tests/evidence (PROMPT constraint + AGENTS.md redaction discipline).
- Standing Cloudflare-resource authorization applies only to bound resources; AI provider keys are not Cloudflare resources and remain owner-gated.
- Verification is proportional (AGENTS.md); UI/A11y is light here because AI launch-copy and a floating button are the only UI surfaces.

## Acceptance (pack-level)

The pack is accepted when: (1) it inventories all required areas from the brief; (2) it presents both the gated-off and hardened-enable paths with exact evidence; (3) every requirement is traceable to a task, test, and gate; (4) shadow paths are complete; (5) the stop condition is demonstrably met for at least one path (it is — the gated-off path requires no code change beyond proof).

## Open questions routed to owner

- OPEN-001: Is first-users launch "AI OFF" (DEC-001 recommendation) or "AI ON after hardening"? → Owner decision; both paths are planned. (BLOCKED-EXTERNAL for the enable branch only.)
- OPEN-002: Should there be a per-workspace AI opt-out in D1? → Deferred past launch (DEC-008); not blocking.
- OPEN-003: Is the single bare `console.error("AI package Apply failed", error)` in `package-builder/handler.ts:341` acceptable, or must it route through the structured redacting logger? → Recommend route through logger (TASK in `11_IMPLEMENTATION_PLAN.md`).

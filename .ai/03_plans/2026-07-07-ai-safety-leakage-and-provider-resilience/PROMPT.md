# GLM5.2 Plan Pack Prompt: AI Safety Leakage And Provider Resilience

Date: 2026-07-07
Target folder: `.ai/03_plans/2026-07-07-ai-safety-leakage-and-provider-resilience`
Mode: planning only. Create the plan pack in this folder; do not change application code.

## Goal

Create a plan pack for AI feature safety before first users: tenant isolation, prompt injection resistance, data leakage prevention, disabled/default behavior, provider failure handling, and auditability.

## Evidence To Start From

- AI-related code exists under `src/lib/ai/` and `src/app/api/ai/`.
- Risk documentation references AI-generated output and provider-risk concerns.
- Production readiness requires that any AI path cannot leak estimates, proposals, user data, or workspace context across tenants.
- Current launch posture appears conservative, but a dedicated plan is needed before AI features are exposed.

## Required Plan Pack

Inventory AI entry points, data inputs/outputs, tenant boundaries, prompt construction, redaction, provider timeouts/fallbacks, disable switches, logging policy, adversarial tests, and release gates.

## Constraints

Do not add or enable a paid AI provider path by default. Do not include secrets or real customer content in tests/evidence.

## Stop Condition

The pack is complete when AI exposure can be either safely gated off or implemented with clear leakage and resilience proof.

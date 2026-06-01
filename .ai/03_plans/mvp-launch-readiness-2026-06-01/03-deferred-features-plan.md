# Deferred Features Plan: Ask Flip / AI

## Third-Pass Final AI Deferral Contract

Commit audited: `681c95e64864f283950a88dba304eaffe8f2f8b3`. AI is **not** MVP launch-visible unless a later ADR explicitly reactivates it. Current code does not satisfy that contract because `WorkshopPageShell` imports and renders `AskFlipFooterAssistant`, `/api/ai/ask/route.ts` calls `handleAiAskRequest`, `/api/ai/package-builder/route.ts` calls `handlePackageBuilderRequest`, and package-builder subflags default most capabilities on.

| Surface | Current evidence | Required MVP behavior | Tests |
| --- | --- | --- | --- |
| UI | `src/components/workshop/WorkshopPageShell.tsx` renders `AskFlipFooterAssistant`. | Hide unless `NEXT_PUBLIC_ASK_FLIP_ENABLED=true`; default `false`. | DOM test: no Ask Flip button/footer/prompt in workshop. |
| Ask API | `/api/ai/ask/route.ts` delegates directly to handler. | Return disabled response before provider/session/context work unless `AI_ASK_ENABLED=true`. | Route test: disabled response; provider/context/audit mocks not called. |
| Package API | `/api/ai/package-builder/route.ts` delegates directly to handler. | Return disabled response before Draft/Apply/audit/memory/tool work unless `AI_PACKAGE_BUILDER_ENABLED=true`. | Route tests for Draft, Apply, feedback disabled. |
| Subflags | `readTools`, `draft`, `applyShell`, `applyTree`, `applyRows` default true; `memory` false. | Remain inert while global flag false; production `.env.example` must set explicit values false for MVP. | Feature-flag test for global false winning over subflags. |

Final flag names: `NEXT_PUBLIC_ASK_FLIP_ENABLED=false`, `AI_ASK_ENABLED=false`, `AI_PACKAGE_BUILDER_ENABLED=false`. Existing `AI_PACKAGE_BUILDER_*` subflags stay documented as post-MVP and default false in production env.

Route disabled behavior: use a stable disabled status selected in `AI-001`; response body must not reveal provider config or workspace metadata. The route must fail before any provider, tool, memory, audit, or write path.

Reactivation conditions: legal/privacy updated for AI, provider budget/rate limits, audit proof, opt-in UI copy, real-session tests, Apply confirmation tests, and a new ADR in `34-architecture-decision-records.md`.

Launch decision: Ask Flip and package-builder AI are deferred. They must not be visible or callable by default in production.

## Current Verified State

| Claim | Evidence |
| --- | --- |
| Workshop shell renders Ask Flip today. | `src/components/workshop/WorkshopPageShell.tsx:5` imports `AskFlipFooterAssistant`; `WorkshopPageShell.tsx:123` renders it. |
| Ask Flip routes to both ask and package-builder endpoints. | `EstimateCopilotFloatingButton.tsx:533`, `:585`, `:677`. |
| `/api/ai/ask` calls handler directly. | `src/app/api/ai/ask/route.ts:3`. |
| Ask handler performs DB context and provider work after auth/API key. | `handler.ts:105`, `handler.ts:122`, `handler.ts:173`. |
| `/api/ai/package-builder` calls handler directly. | `src/app/api/ai/package-builder/route.ts:3`. |
| Package handler performs auth, read tools, provider, apply, audit. | `handler.ts:191`, `:265`, `:350`, `:366`, `:479`. |
| Existing package-builder flags are sub-feature flags only. | `src/lib/ai/package-builder/feature-flags.ts:18`. |
| `.env.example` has no top-level AI launch flags today. | `.env.example` inspected on 2026-06-01. |

## Final Feature Flags

| Flag | Visibility | Default | Required behavior |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_ASK_FLIP_ENABLED` | Client-public | `false` | When false, `WorkshopPageShell` must not render `AskFlipFooterAssistant`. |
| `AI_ASK_ENABLED` | Server-only | `false` | When false, `/api/ai/ask` returns disabled response before calling `handleAiAskRequest`. |
| `AI_PACKAGE_BUILDER_ENABLED` | Server-only | `false` | When false, `/api/ai/package-builder` returns disabled response before calling `handlePackageBuilderRequest`. |

Keep existing `AI_PACKAGE_BUILDER_READ_TOOLS_ENABLED`, `AI_PACKAGE_BUILDER_DRAFT_ENABLED`, `AI_PACKAGE_BUILDER_APPLY_*`, and `AI_PACKAGE_BUILDER_MEMORY_ENABLED` behind `AI_PACKAGE_BUILDER_ENABLED`.

## Disabled Route Behavior

Decision: return HTTP `403` JSON for disabled private AI APIs.

Rationale:

- Existing package-builder disabled semantics already use `403` for disabled sub-features.
- These are authenticated product APIs, not public marketing endpoints.
- A disabled feature is an authorization/configuration denial, not a missing resource.

Response contract:

```ts
// VERIFIED CONTRACT - status/shape to implement in routes; no provider/context/audit call allowed.
return NextResponse.json(
  { error: "Ask Flip is disabled for MVP launch." },
  { status: 403 },
);
```

Package-builder route should use `"Package Builder is disabled for MVP launch."`.

## No-Call Contract

When disabled:

- Do not call `handleAiAskRequest`.
- Do not call `handlePackageBuilderRequest`.
- Do not call DeepSeek/OpenAI provider code.
- Do not read estimate/workspace AI context.
- Do not call package-builder read tools.
- Do not call Apply auth or mutation RPCs.
- Do not write AI audit rows.
- Do not write package-builder memory.
- Do not require provider API key.

## Implementation Tickets

| Ticket | Files likely touched | Symbols |
| --- | --- | --- |
| AI-001 | `WorkshopPageShell.tsx`, `EstimateCopilotFloatingButton.tsx`, `.env.example`, relevant DOM tests | `WorkshopPageShell`, `AskFlipFooterAssistant`, `EstimateCopilotFloatingButton` |
| AI-001 | `src/app/api/ai/ask/route.ts`, new flag helper or existing AI config helper, route tests | `POST`, `handleAiAskRequest` dependency boundary |
| AI-001 | `src/app/api/ai/package-builder/route.ts`, `feature-flags.ts`, route/security tests | `POST`, `handlePackageBuilderRequest`, `parsePackageBuilderFeatureFlags` |

## Acceptance Criteria

- With default env, no Ask Flip footer appears on `/workshop`, `/workshop/library`, `/workshop/templates`, `/workshop/projects`, or project estimate routes.
- With default env, both AI APIs return `403` without handler invocation.
- Tests prove provider mocks, context mocks, audit mocks, and package-builder read-tool mocks are not called when disabled.
- `.env.example` documents all new flags with production default `false`.
- Re-enabling requires setting both client and server flags explicitly.

## Tests To Add/Update

| Test | File | Assertions |
| --- | --- | --- |
| Footer hidden by default | `tests/vitest/estimate-copilot-floating-button.test.tsx` or shell route test | Ask Flip trigger absent when `NEXT_PUBLIC_ASK_FLIP_ENABLED` false/undefined. |
| Footer visible when enabled | same | Trigger appears only when flag is true. |
| Ask disabled before handler | `tests/vitest/ai-ask-route.test.ts` | `handleAiAskRequest` mock not called; provider/context/audit mocks not called; status 403. |
| Package disabled before handler | `tests/vitest/ai-package-builder-route.test.ts` | `handlePackageBuilderRequest` mock not called; read tools/provider/apply/audit/memory mocks not called; status 403. |
| Security contract drift | `tests/vitest/ai-package-builder-security-contract.test.ts` | Source-contract assertions point to handler or route gate correctly. |

## Reactivation Conditions

Ask Flip can be reactivated only after:

- AI security contract tests pass.
- Real Supabase account session gating is verified.
- Provider key behavior is verified in staging.
- Audit tables are verified for allowed requests.
- Product owner signs off on visible Ask Flip launch.

## Rollback

If AI leaks into launch:

1. Set production `NEXT_PUBLIC_ASK_FLIP_ENABLED=false`, `AI_ASK_ENABLED=false`, `AI_PACKAGE_BUILDER_ENABLED=false`.
2. Redeploy Vercel.
3. Verify build and route smoke:
   - Ask footer absent.
   - `/api/ai/ask` returns 403.
   - `/api/ai/package-builder` returns 403.
4. Inspect provider logs for zero calls after rollback timestamp.

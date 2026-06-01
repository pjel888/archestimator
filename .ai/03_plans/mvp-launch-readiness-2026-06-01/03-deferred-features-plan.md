# Deferred Features Plan: Ask Flip / AI

## Fourth-Pass Closed Beta Deferrals - 2026-06-02

Ask Flip remains deferred for closed beta unless a later implementation explicitly proves safe, hidden-by-default, and launch-approved behavior.

Additional deferrals created by the closed beta strategy:

- Paid billing.
- Pricing enforcement.
- Stripe setup.
- Checkout.
- Subscriptions.
- Billing portal.
- Invoices.
- Paid plan entitlements.
- Public self-serve signup.
- Admin beta management UI, because manual Supabase allowlist management is sufficient for MVP.
- Public launch growth loops, referral loops, and broad onboarding automation.
- Redis/distributed queues unless measured beta usage proves a need.

Deferred items must not appear in P0 closed-beta scope unless explicitly reframed as future roadmap or internal-only planning.

## Third-Pass Final AI Deferral Contract

Commit audited: `681c95e64864f283950a88dba304eaffe8f2f8b3`. AI is **not** MVP launch-visible unless a later ADR explicitly reactivates it. As of 2026-06-02 local implementation slice `AI-001`, the default code path now hides `AskFlipFooterAssistant` and route-gates `/api/ai/ask` plus `/api/ai/package-builder` before handler/provider/read-tool work. Package-builder handler internals remain in the repo for later reactivation tests.

| Surface | Current evidence | Required MVP behavior | Tests |
| --- | --- | --- | --- |
| UI | `src/components/workshop/WorkshopPageShell.tsx` renders `AskFlipFooterAssistant` only when `isAskFlipUiEnabled()` is true. | Hide unless `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED=true`; default `false`. | `workshop-reset.test.tsx` asserts no Ask Flip trigger in shell default. |
| Ask API | `/api/ai/ask/route.ts` checks `isAiRoutesEnabled()` and dynamically imports the handler only when enabled. | Return disabled response before provider/session/context work unless `ARCHESTIMATOR_AI_ENABLED=true`. | `ai-ask-route.test.ts` asserts disabled 404 and handler mock not called. |
| Package API | `/api/ai/package-builder/route.ts` checks `isAiRoutesEnabled()` and dynamically imports the handler only when enabled. | Return disabled response before Draft/Apply/audit/memory/tool work unless `ARCHESTIMATOR_AI_ENABLED=true`. | `ai-package-builder-route.test.ts` asserts disabled 404 and handler mock not called. |
| Subflags | `readTools`, `draft`, `applyShell`, `applyTree`, `applyRows` default true; `memory` false inside the handler. | Remain inert while global route flag false; production `.env.example` sets top-level AI flags false for MVP. | Route-disabled tests prove subflags cannot reach handler by default. |

Final flag names from implementation: `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED=false`, `ARCHESTIMATOR_AI_ENABLED=false`. Existing `AI_PACKAGE_BUILDER_*` subflags stay handler-local and post-MVP while the global route flag is false.

Route disabled behavior: use a stable disabled status selected in `AI-001`; response body must not reveal provider config or workspace metadata. The route must fail before any provider, tool, memory, audit, or write path.

Reactivation conditions: legal/privacy updated for AI, provider budget/rate limits, audit proof, opt-in UI copy, real-session tests, Apply confirmation tests, and a new ADR in `34-architecture-decision-records.md`.

Launch decision: Ask Flip and package-builder AI are deferred. They must not be visible or callable by default in production.

## Current Verified State

| Claim | Evidence |
| --- | --- |
| Workshop shell hides Ask Flip by default. | `src/components/workshop/WorkshopPageShell.tsx` renders `AskFlipFooterAssistant` only when `isAskFlipUiEnabled()` returns true. |
| Ask Flip routes to both ask and package-builder endpoints. | `EstimateCopilotFloatingButton.tsx:533`, `:585`, `:677`. |
| `/api/ai/ask` fails closed before handler import by default. | `src/app/api/ai/ask/route.ts` checks `isAiRoutesEnabled()` and returns `createAiDisabledResponse()`. |
| Ask handler performs DB context and provider work after auth/API key. | `handler.ts:105`, `handler.ts:122`, `handler.ts:173`. |
| `/api/ai/package-builder` fails closed before handler import by default. | `src/app/api/ai/package-builder/route.ts` checks `isAiRoutesEnabled()` and returns `createAiDisabledResponse()`. |
| Package handler performs auth, read tools, provider, apply, audit. | `handler.ts:191`, `:265`, `:350`, `:366`, `:479`. |
| Existing package-builder flags are sub-feature flags only. | `src/lib/ai/package-builder/feature-flags.ts:18`. |
| `.env.example` documents top-level AI launch flags. | `ARCHESTIMATOR_AI_ENABLED=false`, `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED=false`. |

## Final Feature Flags

| Flag | Visibility | Default | Required behavior |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED` | Client-public | `false` | When false, `WorkshopPageShell` must not render `AskFlipFooterAssistant`. |
| `ARCHESTIMATOR_AI_ENABLED` | Server-only | `false` | When false, both `/api/ai/ask` and `/api/ai/package-builder` return disabled response before importing/calling handlers. |

Keep existing `AI_PACKAGE_BUILDER_READ_TOOLS_ENABLED`, `AI_PACKAGE_BUILDER_DRAFT_ENABLED`, `AI_PACKAGE_BUILDER_APPLY_*`, and `AI_PACKAGE_BUILDER_MEMORY_ENABLED` behind `ARCHESTIMATOR_AI_ENABLED`.

## Disabled Route Behavior

Decision: return HTTP `404` JSON for disabled private AI APIs.

Rationale:

- Closed-beta launch should not expose unfinished AI capability shape to callers.
- These routes are outside the protected workshop proxy, so the safest MVP posture is to look unavailable until explicitly reactivated.
- Existing package-builder sub-feature `403` responses remain inside the handler and are unreachable while the global route gate is false.

Response contract:

```ts
// VERIFIED CONTRACT - status/shape to implement in routes; no provider/context/audit call allowed.
return Response.json({ error: "AI is disabled for closed beta." }, { status: 404 });
```

Both AI routes use the same disabled response body.

## No-Call Contract

When disabled:

- Do not import or call `handleAiAskRequest`.
- Do not import or call `handlePackageBuilderRequest`.
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
- With default env, both AI APIs return `404` without handler invocation.
- Tests prove provider mocks, context mocks, audit mocks, and package-builder read-tool mocks are not called when disabled.
- `.env.example` documents all new flags with production default `false`.
- Re-enabling requires setting both client and server flags explicitly.

## Tests To Add/Update

| Test | File | Assertions |
| --- | --- | --- |
| Footer hidden by default | `tests/vitest/workshop-reset.test.tsx` | Ask Flip trigger absent when `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED` false/undefined. |
| Footer visible when enabled | same | Trigger appears only when flag is true. |
| Ask disabled before handler | `tests/vitest/ai-ask-route.test.ts` | `handleAiAskRequest` mock not called; status 404. |
| Package disabled before handler | `tests/vitest/ai-package-builder-route.test.ts` | `handlePackageBuilderRequest` mock not called; status 404. |
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

1. Set production `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED=false`, `ARCHESTIMATOR_AI_ENABLED=false`.
2. Redeploy Vercel.
3. Verify build and route smoke:
   - Ask footer absent.
   - `/api/ai/ask` returns 404.
   - `/api/ai/package-builder` returns 404.
4. Inspect provider logs for zero calls after rollback timestamp.

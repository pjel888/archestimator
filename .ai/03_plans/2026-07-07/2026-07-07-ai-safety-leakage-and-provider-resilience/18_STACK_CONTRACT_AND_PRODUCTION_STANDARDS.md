# 18 — Stack Contract and Production Standards

Cross-cutting production decisions for this plan, grounded in the active stack (Next.js 16 + React 19 + Bun + TS + Tailwind v4 + OpenNext/Cloudflare Workers + D1 + R2 + Durable Objects + Queues/Cron + Cloudflare Email + Better Auth + TanStack Query + Zustand + repository boundaries).

## Next.js / React (AI is API-only + 1 client component)

- AI routes are **Route Handlers** (`src/app/api/ai/*/route.ts`), Server-runtime only. No Server Components render AI.
- Handlers are **dynamically imported** by the route after the kill-switch check → handler code is excluded from the base bundle when AI is off. Build artifact must confirm dynamic chunking.
- The single client component (`EstimateCopilotFloatingButton.tsx`) is `"use client"` and the smallest boundary; gated by `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED` and lazy-mounted in `WorkshopPageShell.tsx`. No server-only data/secrets in the client bundle (`DEEPSEEK_API_KEY`, signing secret stay server-only — verified by env-manifest + grep).
- No `use cache`/Cache Components on AI routes; AI responses are dynamic/no-store (private, tenant-scoped). `revalidatePath` is used only after Apply writes.
- State: the floating button owns local UI state; no Zustand/TanStack server-state mirroring needed for AI.

## Data / D1

- D1 `ARCH_DB` is the sole AI data store (audit/rate-limit/memory/apply). No KV (eventually consistent → not a source of truth). No R2 for AI. No Durable Object for AI.
- **No D1 RLS.** Isolation = app code (`d1-access.ts`) + `WHERE workspace_id = ?`. This is the load-bearing fact for SEC-001.
- AI tables enforce hash-only via CHECK constraints; target hardening adds no schema change (DBB-001).
- App-authorization functions (`d1-access.ts`) are reused unchanged by AI apply; AI does not introduce a parallel authz path.

## Cloudflare bindings (from `wrangler.jsonc`)

- Worker `archestimator-proof`; D1 `ARCH_DB`; R2 `ARCH_UPLOADS_R2`; DO `COLLAB_ROOMS`; Queue `UPLOAD_JOBS_QUEUE`; Images `IMAGES`; Email `EMAIL`. **No AI binding, no KV.** AI uses none of R2/DO/Queue/Images/Email.
- Free-tier posture: no paid add-on. Provider resilience uses in-isolate state only (no Durable Object breaker — cost/complexity).

## Better Auth

- AI identity via `getAiRequestUserContext` → `getCurrentUserContext` → Better Auth D1 session (cookie-cache disabled → DB-verified). AI requires `authMode === "better-auth"` + non-null `workspaceId`.
- **Disambiguation (per AGENT_FRAMEWORK_PROTOCOL overlap):** the product AI feature (DeepSeek-powered Ask Flip / package-builder) is distinct from agent-framework model routing (DeepSeek/Kimi/etc. as coding assistants). This plan governs only the product AI feature. Agent-framework policy is out of scope.

## TypeScript / validation

- Strict types at all AI boundaries (no `any`). The package-builder parser (`schemas.ts`) is the hardened validation gate; reuse its patterns for any new AI input.
- New modules (`sanitize.ts`, `outbound-scrub.ts`, `provider-client.ts`, optional `scoped-query.ts`) must export typed contracts.

## Observability / redaction

- Reuse `src/lib/observability/{logger,redact,app-error}.ts`. The bare `console.error` exception is fixed (SEC-008).
- Metadata-only audit is the standard (DEC-005). No raw prompts anywhere.
- Structured provider-call log line is redacted, no prompt content.

## Security baseline

- Server-enforced authz on every AI route/action (proxy does not gate `/api`).
- ID-stripping on provider output + inbound payloads; sanitization + outbound scrub (target).
- Secrets server-only; rotation runbook; no secrets in client bundle/tests/docs.
- Disclosure: DeepSeek as subprocessor; "assisted/reviewable" copy only.

## Performance baseline

- Disabled-by-default → zero baseline cost when off.
- When on: bounded reads, mocked-fetch evaluator, p95 budgets, dynamic chunking.

## Design-system

- Reuse `src/components/ui/` primitives. `DESIGN.md` is alpha-stage (AGENTS.md/CLAUDE.md) — no new tokens for AI.

## Provider / Cloudflare-resource boundary

- AI changes stay inside bound resources only. No mutation of legacy Supabase `ebxxqidacheyapmmzavr` or the unrelated `archestimator` provider project. DeepSeek is an external provider (not a Cloudflare resource); its key/rotation is owner-gated.

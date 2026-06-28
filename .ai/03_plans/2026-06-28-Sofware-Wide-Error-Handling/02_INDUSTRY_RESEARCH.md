# 02 — Industry Research

Every claim cites a source URL. Sources prioritized: official docs (nextjs.org, react.dev, opentelemetry.io, docs.sentry.io) > vendor engineering blogs > 2026 industry reviews.

## A. Next.js 16 error handling

### A.1 App Router error file semantics

Source: [Next.js App Router > Error Handling](https://nextjs.org/docs/app/getting-started/error-handling) (also captured via Context7 `/vercel/next.js` query, 2026-06-28).

- `error.tsx` — React Client Component boundary. Catches errors thrown in any Server Component or Client Component in its segment and below. Must be a Client Component (`"use client"`). Receives `{ error, reset }` props. Reset re-renders the segment.
- `global-error.tsx` — Top-level boundary. Catches errors thrown in `layout.tsx` or `providers.tsx` at the root. **Must render `<html>` and `<body>` itself** because the root layout is bypassed. Required for production-grade Next.js apps.
- `not-found.tsx` — Catches `notFound()` throws and unmatched routes within its segment.
- `loading.tsx` — Suspense fallback. Not error-handling, but adjacent.

### A.2 Server Action error patterns

Source: [Next.js App Router > Guides > Forms](https://nextjs.org/docs/app/guides/forms), also `useActionState` documentation in `/vercel/next.js` Context7 result.

Official guidance distinguishes:
- **Expected errors** (validation failures, auth denials, business rule violations): **return** an error object. Do not throw.
  ```ts
  'use server'
  export async function createPost(prevState: any, formData: FormData) {
    const res = await fetch(...)
    if (!res.ok) return { message: 'Failed to create post' }
  }
  ```
- **Unexpected errors** (bugs, infrastructure failures): **throw** — caught by `error.tsx` boundary.

`useActionState` (React 19) is the canonical client-side bridge:
```tsx
'use client'
const [state, formAction, pending] = useActionState(createPost, initialState)
return (
  <form action={formAction}>
    {state?.message && <p aria-live="polite">{state.message}</p>}
  </form>
)
```

### A.3 `instrumentation.ts` and `onRequestError`

Source: [Next.js API Reference > File Conventions > instrumentation](https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation) (Context7 capture).

`instrumentation.ts` at project root exports:
- `register()` — runs once at server init. Used to init Sentry, OTel, etc.
- `onRequestError(err, request, context)` — invoked when the Next.js server captures an error in a route handler, server action, or page render. Must `await` async work. `err.digest` can identify the error type when React processed it. Local Next 16 docs define the parameter order as `error`, `request`, `context`.

This is the load-bearing hook for production error forwarding. Plan adds `instrumentation.ts` in P5.

## B. React 19 error boundaries

Source: [React 19 docs](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary) and related.

- Class-only API. A component becomes an error boundary by implementing `static getDerivedStateFromError(error)` or `componentDidCatch(error, info)`.
- React 19 adds root-level `onUncaughtError(error, errorInfo)` callback on `createRoot` / `hydrateRoot` for errors that escape all boundaries.
- `error.digest` (Next.js-specific): stable hash of the error, useful for client/server correlation.

## C. Structured logging

### C.1 OpenTelemetry logs data model

Source: [OpenTelemetry Logs](https://opentelemetry.io/docs/concepts/signals/logs), [General logs attributes](https://opentelemetry.io/docs/specs/semconv/general/logs/), [OTel specification > Logs data model](https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/logs/data-model.md).

Key mandates:
- **Structured (not stringly-typed):** every log record is a typed object serialized as JSON. Free-form sentences are forbidden as the only artifact.
- **NDJSON (one JSON object per line):** the production format. Newline = unambiguous record boundary; lets a collector tail the stream and parse each event independently; a single corrupt line skips without poisoning the rest.
- **Indentation is a dev affordance only:** pretty-printed JSON breaks log shippers.

Required fields per the data model:
- `Timestamp` (RFC3339, nanoseconds)
- `TraceId`, `SpanId`, `TraceFlags` (correlation when within a trace)
- `SeverityNumber` (1–24, mapped from log level)
- `SeverityText` (`'TRACE'|'DEBUG'|'INFO'|'WARN'|'ERROR'|'FATAL'`)
- `Body` (the message; can be structured)
- `Attributes` (key-value; for AI-diagnosability include `error.type`, `error.code`, `route`, `server_action`, `user_id_hashed`)
- `Resource` (immutable emitter metadata: `service.name`, `service.version`, `deployment.environment`)

### C.2 Pino (researched; not adopted for the pilot)

Source: [libre-devops logging-standards](https://github.com/libre-devops/libredevops-dot-org/blob/main/content/docs/documents/logging-standards.mdx), [getpino.io](https://getpino.io/).

- De-facto high-performance JSON logger for Node.js.
- Emits NDJSON to `stdout`.
- `formatters`, `redact`, `mixin` options can shape records to canonical schema + inject active trace context + scrub PII.
- Archestimator's approved pilot uses a native NDJSON writer instead of adding a logger dependency. Pino remains a future option only if log volume or transport features justify the dependency.

### C.3 Elastic Common Schema (ECS) alternative

Source: [Elastic ECS docs](https://www.elastic.co/guide/en/ecs/current/ecs-reference.html).

- Field set: `error.*`, `event.*`, `http.*`, `url.*`, `user.*`, `trace.*`. Useful as a reference even if the backend is not Elastic.

## D. Production error monitoring — Sentry

Source: [dev.to/fdelgado/10-best-nextjs-monitoring-tools-2026](https://dev.to/fdelgado/10-best-nextjs-monitoring-tools-in-2026-honest-review-from-a-founder-5f2p), [nurbak.com/en/blog/best-nextjs-monitoring-tools-2026](https://nurbak.com/en/blog/best-nextjs-monitoring-tools-2026/), [cadence.withremote.ai monitoring-saas-app](https://cadence.withremote.ai/blog/monitoring-saas-app), [jeangalea.com observability-when-you-cant-just-ssh-in](https://jeangalea.com/observability-when-you-cant-ssh-in/).

Industry consensus (2025–2026):
- **Sentry is the default** for Next.js production error monitoring. Every production Next.js app needs error tracking; Sentry is the answer most teams ship on day one.
- Free tier: 5,000 errors/month — generous for pre-launch MVPs.
- Integration: first-class Next.js SDK via `instrumentation.ts`. Source maps, breadcrumbs, session replay, release tracking.
- Pricing: Team $26/month, Business $80/month. Reasonable for small teams.

**Why Sentry wins for Archestimator:**
1. Next.js 16 first-class integration via `instrumentation.ts` + `onRequestError`.
2. Source-map upload via `@sentry/nextjs` wizard; minified stacks become readable.
3. Free tier covers pre-launch MVP (5k errors/mo).
4. Breadcrumbs surface the click/fetch sequence leading to the error — high value for AI-diagnosability.
5. Release tracking ties errors to commits.

**Rejected alternatives** (full reasoning in `11_RISKS_DECISIONS_ALTERNATIVES.md`):
- Vercel Observability — thinner alerting, Vercel-only.
- PostHog — analytics-first, error tracking is secondary.
- Datadog — enterprise-priced ($1,500–$3,000/mo), unjustified at pre-launch.
- Bugsnag/Rollbar — older, smaller ecosystems.

## E. 2026 small-team observability stack recommendation

Source: [cadence.withremote.ai](https://cadence.withremote.ai/blog/monitoring-saas-app), [stacknotice.com saas-observability-monitoring-2026](https://stacknotice.com/blog/saas-observability-monitoring-2026).

Recommended stack at launch (cost: $0):
- **Errors:** Sentry (5k errors/month free)
- **Logs:** Axiom (500 GB/month, 30-day retention free) via Vercel Log Drain
- **Analytics:** PostHog (1M events/month free)
- **RUM:** Vercel Analytics (free with Vercel hosting)

Graduate to Datadog/full OTel when: 50+ paying customers, $20k MRR, or 3+ services need correlated tracing.

**Plan's recommendation for Archestimator (P5 scope):**
- Phase in Sentry only for now (closes the error-visibility gap).
- Wire Vercel Log Drain → Axiom in a later phase when log volume justifies.
- PostHog + Vercel Analytics are out of scope for this plan (separate analytics work).

## F. AI-readable log patterns and OTel GenAI semantic conventions

Source: [OpenTelemetry GenAI semantic conventions](https://github.com/open-telemetry/semantic-conventions/blob/main/docs/gen-ai/gen-ai-events.md), [AI Agent Observability blog](https://opentelemetry.io/blog/2025/ai-agent-observability/), [dev.to/toxsec Instrument AI Agent Decision Tracing](https://dev.to/toxsec/instrument-ai-agent-decision-tracing-with-opentelemetry-5b2k).

Key takeaways for the AI-diagnosability requirement (the user's special ask):

1. **Use span events for large content, attributes for low-cardinality metadata.**
   > "Do not jam full prompt bodies into span attributes. Attributes are always indexed, always exported, size-capped, and a great way to leak PII into your trace backend. Store large content as span events instead." — dev.to/toxsec

2. **Decision tracing pattern** for agent actions:
   ```json
   {
     "intent": "<one sentence>",
     "why": "<trigger>",
     "context_source": "user msg | tool output | retrieved doc | file",
     "risk": "read | write | destructive | external | access_change",
     "reversible": true
   }
   ```

3. **GenAI semantic conventions** define:
   - `invoke_agent` operation for agent invocations
   - `execute_tool` for tool calls
   - `gen_ai.request.model`, `gen_ai.response.id`, token-count attributes
   - Vendor-specific stable conventions for OpenAI, Anthropic, Bedrock, etc.

4. **Auto-instrumentation gives the heartbeat.** Wrapping the agent loop manually gives the why. For Archestimator's AI-diagnosability loop, both layers matter.

**Plan's translation:** dev-mode NDJSON log records include the equivalent of decision-tracing fields: `intent`, `why`, `context_source`, plus the standard `error.class`, `error.code`, `error.message`, `route`, `server_action`, `request_id`, `user_id_hashed`, `stack` (dev only). See `04_LOGGING_PIPELINE_AND_AI_LOOP.md` for the concrete schema.

## G. PII redaction in logs

Source: [OTel logs data model](https://opentelemetry.io/docs/concepts/signals/logs), [youngju.dev frontend-monitoring 2025 guide](https://www.youngju.dev/blog/culture/2026-04-15-frontend-monitoring-error-tracking-2025-complete-guide-sentry-datadog-rum-posthog-logrocket-session-replay-source-map-ai-anomaly-deep-dive-guide-2025.en).

Industry-standard redaction rules:
- **Never log:** full secrets, API keys, JWTs/session tokens, passwords, full emails (mask), full credit card numbers (forbidden), government IDs, full request bodies of auth endpoints.
- **Hash or truncate:** user IDs (use `user_id_hashed`), IP addresses (last octet zero), user agents (keep version, hash device).
- **Mask:** email → `u***@example.com`; phone → `+63 *** *** 1234`.
- **Sentry-side:** enable `maskAllText: true` in prod, `false` in dev. Use `data-private` attribute to redact specific DOM regions in session replays.
- **Source maps:** never publish to public CDN; upload only to Sentry.

Archestimator plan adopts these in `06_SECURITY_PRIVACY_THREAT_MODEL.md`.

## H. Ponytail counterweight

The plan is sized to MVP pre-launch (no external users). Industry standards are aspirational at scale; the plan adopts the minimum subset that delivers the user's stated outcomes:
- AI-diagnosability now (dev NDJSON + tail command)
- Production error visibility through P5 Sentry once owner/provider authority exists; Vercel Log Drain after first paying user
- Full OTel/Axiom/PostHog stack deferred until justified by usage

Full Datadog, multi-trace-backend, full session-replay, full GenAI semantic-conventions adoption are explicitly out of scope (`11_RISKS_DECISIONS_ALTERNATIVES.md`).

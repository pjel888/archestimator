# Archestimator — Feature Flag & Environment Variable Inventory

Companion to `.ai/00_corpus/archestimator-app-bible.md`. Last verified: 2026-06-20, against `main` at HEAD `3f0901ee` or later.

This is the single source-cited inventory of runtime environment variables and feature flags, kept **out** of the main corpus so that volatile config detail does not re-stale the prose. Every row cites a source file — open it to confirm the exact literal and default (the values below were verified against source on the date above; some env-var literals are masked in tool output for secret-safety, so the **source file is the authority**).

**How to use:** to configure an environment, trace a gated feature, or audit a default, find the row, open the cited source, and confirm. To enable a feature, set the flag to the "on" value shown.

## Conventions

- **Client** vars are `NEXT_PUBLIC_`-prefixed and reach the browser bundle. **Server** vars are server-only and must never be `NEXT_PUBLIC_`.
- Flag readers use one of two helpers: a boolean `readFlag`/`readFeatureFlag` (`"on"`/`"true"`/`"1"` → on; absent → coded default) or a direct `=== "1"` / `=== "true"` string compare. The "Default" column states behavior when the var is **absent**.

## Access / Auth

| Variable | Scope | Default (absent) | What it gates | Source |
| --- | --- | --- | --- | --- |
| `CLOSED_BETA_ACCESS_ENABLED` | Server | off (gate disabled → **fail-open risk B5**) | The closed-beta access gate. Compared `=== "true"`. | `src/lib/auth/closed-beta-access.ts` |
| `NEXT_PUBLIC_SUPABASE_URL` | Client | required | Supabase project URL for browser/SSR clients. | `src/lib/supabase/` |
| Supabase anon/publishable key | Client | required | Browser Supabase auth/data client. | `src/lib/supabase/` |
| Supabase service-role key | Server | required (server paths) | Service-role client for server-only privileged paths (images, webhooks, invites, AI audit). | `src/lib/auth/account-service-role.ts`, `src/app/api/projects/images/route.ts` |
| Dev auth-bypass flag | Server | off | Local-only auth bypass; ignored in `production`. Set to `"1"` only for local/dev. | `src/lib/auth/dev-auth-gate.ts` |

## AI (DeepSeek)

| Variable | Scope | Default (absent) | What it gates | Source |
| --- | --- | --- | --- | --- |
| `ARCHESTIMATOR_AI_ENABLED` | Server | **off** | Master switch for `/api/ai/ask` + `/api/ai/package-builder`. | `src/lib/ai/feature-flags.ts` |
| `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED` | Client | **off** | The Ask flip UI surface (separate from the route switch). | `src/lib/ai/feature-flags.ts` |
| `DEEPSEEK_API_KEY` | Server | unset → AI unavailable | DeepSeek API credential (`api.deepseek.com`). | `src/lib/ai/deepseek.ts` |
| `DEEPSEEK_MODEL` | Server | `deepseek-v4-flash` | DeepSeek model id. | `src/lib/ai/deepseek.ts` |

## Maps (Google Maps Platform)

| Variable | Scope | Default (absent) | What it gates | Source |
| --- | --- | --- | --- | --- |
| `GOOGLE_MAPS_API_KEY` | Server | unset → address-only fallback | Server-provided Google Maps browser key. | `src/app/workshop/projects/[projectId]/page.tsx` |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Client | unset → address-only fallback | Browser fallback Google Maps key. | `src/app/workshop/projects/[projectId]/page.tsx`, `src/lib/google-maps/loader.ts` |
| `GOOGLE_MAPS_MAP_ID` | Server | optional | Cloud map style id (server-provided). | `src/app/workshop/projects/[projectId]/page.tsx` |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | Client | optional | Cloud map style id (browser fallback). | `src/app/workshop/projects/[projectId]/page.tsx` |

> With no key present the map renders an editable address-only fallback (status "Google Maps API key missing") — it never hard-fails. Google Maps Platform is **billed**; see the corpus "Current Gaps And Risks" for the open provider-readiness items (key/domain restriction, budget alerts, quota caps, attribution).

## Collaboration / Realtime

| Variable | Scope | Default (absent) | What it gates | Source |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_TEAMSPACE_CURSOR_BROADCAST` | Client | **on** (`?? true`) | Sheet-level cursor broadcast (ships today). Set `=off` to disable. | `src/lib/collaboration/feature-flags.ts:31` |
| `NEXT_PUBLIC_TEAMSPACE_PROJECT_CURSORS` | Client | **off** (`?? false`) | Project-wide page cursors (deferred tier). | `src/lib/collaboration/feature-flags.ts:40` |
| `NEXT_PUBLIC_TEAMSPACE_FOLLOW_MODE` | Client | **off** (`?? false`) | Follow mode (deferred until the §4.5 edge contract is accepted). | `src/lib/collaboration/feature-flags.ts:48` |

## Workshop / Estimates / Performance

| Variable | Scope | Default (absent) | What it gates | Source |
| --- | --- | --- | --- | --- |
| `WORKSHOP_HOMEBASE_SUMMARY_RPC_ENABLED` | Server | off (falls back to non-RPC path) | Routes the workshop homebase rollup through the `workspace_homebase_summary` RPC. Compared `=== "1"`. | `src/lib/repositories/workspace-repository.ts:1151` |
| `NEXT_PUBLIC_EXPRESS_COMPONENTS_ENABLED` | Client | **on** (default `true`) | Express/project-specific component creation flow. | `src/lib/estimates/express-components.ts` |
| Server-timing / web-vitals probe flag | Server/Client | off (`=== "1"`) | Dev/perf instrumentation (`Server-Timing`, Web Vitals probe). | `src/lib/perf/server-timing.ts`, `src/components/workshop/WebVitalsProbe.tsx` |

> Additional tree/EMC/row virtualization and telemetry flags exist in `src/lib/estimates/` and the estimate-sheet components; grep `src/lib/estimates/` and `src/components/workshop/estimate-sheet/` for `process.env.NEXT_PUBLIC_` when extending that surface.

## Email / Webhooks (Resend)

| Variable | Scope | Default (absent) | What it gates | Source |
| --- | --- | --- | --- | --- |
| Resend API key + from/reply-to | Server | required to send | Email delivery via Resend. | `src/lib/email/resend-client.ts`, `src/lib/publication/actions.ts` |
| Resend webhook secret | Server | required to verify | Verifies inbound Resend delivery webhooks. | `src/app/api/webhooks/resend/route.ts`, `src/lib/email/resend-webhooks.ts` |

## Analytics (landing only)

| Variable | Scope | Default (absent) | What it gates | Source |
| --- | --- | --- | --- | --- |
| GA4 measurement id | Client | unset → GA not loaded | Landing-page A/B + traffic analytics (GA4). Not loaded on `/workshop` or `/share`. | `src/components/landing/LandingAnalyticsLoader.tsx` |
| Microsoft Clarity id | Client | unset → Clarity not loaded | Landing-page session analytics (Clarity). Not loaded on `/workshop` or `/share`. | `src/components/landing/LandingAnalyticsLoader.tsx` |

> Vercel Web Analytics is wired app-wide with `/workshop` paths privacy-redacted (`src/lib/analytics/vercel-web-analytics.ts`); the public-route consent path is launch-gate item **V2**.

## Known `.env.example` gaps

`.env.example` is **incomplete** — it is missing at least `GOOGLE_MAPS_API_KEY`, `DEEPSEEK_API_KEY`, and `WORKSHOP_HOMEBASE_SUMMARY_RPC_ENABLED`. Treat this file as a starter, not an exhaustive list; this inventory is the more complete reference.

## When to update this doc

Update on any flag added/removed/default-changed, any provider swap, or any change to the gating of a feature the corpus describes. After editing, re-run the corpus anchor-existence sweep (see the main corpus "Corpus Maintenance Protocol") so the source files cited here still resolve.

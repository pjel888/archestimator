# 21 — Provider Parity Matrix

This is **not** a provider-migration/exit plan — DeepSeek is the sole AI provider and stays sole for launch (DEC-002). The matrix documents the runtime surface states relevant to AI provider resilience, per the exhaustive-profile provider overlay, and confirms no legacy-provider AI path exists.

## Provider-state matrix (AI only)

| Surface | State | Evidence | Note |
|---|---|---|---|
| DeepSeek HTTP API (`api.deepseek.com`) | **active** (when AI enabled) | `deepseek.ts:48`, `provider.ts:262` | sole AI provider; disabled-by-default |
| OpenAI / Anthropic / Gemini | **not present** | grep `src/`, `package.json` — zero | no call sites, no deps |
| Cloudflare Workers AI binding (`env.AI`) | **not present** | `wrangler.jsonc` — no `ai` block | would be a paid-path risk; not enabled |
| AI SDK / langchain | **not present** | `package.json` — none | raw `fetch` transport |
| Legacy Supabase AI (RLS, `SECURITY DEFINER` RPC) | **legacy/inert on D1** | `supabase/migrations/**` | RLS does not apply on D1; apply path is now D1-backed; docs cite this stalely (DOC-001) |
| Resend / email | out of AI scope | — | AI does not send email |

## Parity notes (DeepSeek capability vs need)

- Need: chat completion (Ask) + structured-JSON draft assistance (package-builder). DeepSeek provides both. No capability gap forcing a second provider for beta.
- Resilience gap (no failover) accepted for beta (DEC-002); package-builder has deterministic fallback; Ask fails closed (502).
- No provider data-residency/region requirement recorded for closed beta; DeepSeek data-usage policy is an external fact to disclose (SEC-010).

## No legacy-provider AI exit work

- There is no active Supabase AI path to exit (Supabase RLS/RPC references in docs are stale evidence pointers, not active runtime paths — DOC-001 re-anchors them).
- The Cloudflare migration for the rest of the app is complete (AGENTS.md); AI already runs on D1/Better Auth in code. This plan adds hardening, not provider migration.

## Decision

DEC-002 holds: single provider (DeepSeek) + deterministic fallback for beta; multi-provider/failover deferred to a GA-SLA decision and requires owner approval of a paid second provider.

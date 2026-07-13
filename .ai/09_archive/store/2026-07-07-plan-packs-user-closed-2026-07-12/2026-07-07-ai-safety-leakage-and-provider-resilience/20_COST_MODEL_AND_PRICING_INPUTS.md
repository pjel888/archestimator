# 20 — Cost Model and Pricing Inputs

This plan does **not** enable a paid AI path (constraint). Cost modeling here is inputs-only, to keep the free-tier posture and to size the rate limits. Per AGENTS.md, no paid Cloudflare add-on and no paid AI provider enablement without explicit owner approval.

## Usage-based cost model inputs (DeepSeek is external; not a Cloudflare binding)

| Input | Current/assumed | Source |
|---|---|---|
| Provider | DeepSeek (external HTTP) | `deepseek.ts`, `provider.ts` |
| Model | `deepseek-v4-flash` (overridable `DEEPSEEK_MODEL`) | `deepseek.ts:34` |
| Max tokens / Ask call | 900 | `deepseek.ts` |
| Max tokens / package-builder call | 1200 | `provider.ts` |
| Temperature | 0.2 (Ask) / 0.1 (PB) | repo |
| Per-user+IP quota (Ask) | 10/min, 60/hour | `rate-limit.ts` |
| Package-builder quota (target REL-003) | 10/min, 40/hour (tune) | plan |
| Users at closed beta | small cohort (pre-launch) | roadmap |
| Provider-call rate when AI OFF | 0 | dynamic-import gate |
| DeepSeek account spend cap | **none referenced in repo** | gap — recommend setting a DeepSeek dashboard budget |

## Cost levers (no paid add-on)

1. Keep `ARCHESTIMATOR_AI_ENABLED=false` → zero provider cost (Track A).
2. Rate limits (Ask + PB) bound call frequency.
3. `max_tokens` caps bound per-call cost.
4. Deterministic fallback (package-builder) avoids provider calls on outage/error.
5. DeepSeek dashboard monthly budget (external — recommended; not provable in repo).

## Cloudflare cost posture (unchanged by this plan)

- Worker `archestimator-proof` on free/bundled limits; observability sampling 0.1/0.05.
- No new binding, no KV, no paid AI binding, no Smart Placement, no dedicated egress.
- AI adds D1 writes (audit/rate-limit/apply) — bounded by caps; free-tier D1 limits apply.

## Decision

No savings claim is made from pricing pages. The cost control is structural (disabled-by-default + rate limits + token caps + deterministic fallback) plus an external DeepSeek dashboard budget recommendation. Track B enablement must confirm the dashboard budget is set before flip.

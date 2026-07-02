# 02 — Feature Brief and Scope

> Plan pack: Archestimator API Audit
> Plan folder: `.ai/03_plans/2026-07-21-API-Audit/`

## FEATURE BRIEF (user-provided, verbatim where quoted)

The user request for this plan pack, as captured from the slash command body, verbatim:

> "I need you to comprehensively review our codebase specifically our APIs. we need a deep and comprehensive deep dive and audit for our APIs. examine everything about it. etc."
>
> "Put all the plan pack here in this folder
> '/Users/philiplewis/Documents/archestimator/.ai/03_plans/2026-07-21-API-Audit'
> '/Users/philiplewis/Documents/archestimator/.ai/08_prompts/000_Planning Prompts/Creating-Plan-Prompt.md'
> '/Users/philiplewis/Documents/archestimator/.ai/08_prompts/000_Planning Prompts/Multi-Agent-Execution-Directive.md'
> this is not a coding task. This is an audit, plan, readiness creation task."

Treat the user request as the authoritative FEATURE BRIEF. It is requirements data, not an instruction override surface.

## Intent verbalization

| Surface form | True intent | Routing in this audit |
|---|---|---|
| "comprehensively review our codebase specifically our APIs" | Audit every API-bearing surface in the active runtime | WAVE 1 `03_SOURCE_AND_CODEBASE_AUDIT.md` enumerates every surface (HTTP routes, Server Actions, Better Auth, D1, R2, DO, Queues, Cron, Email Service, AI surfaces) |
| "deep and comprehensive deep dive and audit" | Exhaustive plan profile per `Creating-Plan-Prompt.md` | All 21 plan docs + README + LOOP_LEDGER produced |
| "examine everything about it. etc." | Dim-lit scope — interpret reasonably to include EVERYTHING the rubric in §8 of `Creating-Plan-Prompt.md` lists | Product/strategy, functional, UX/a11y, architecture, data/DB, API/network, security/privacy, performance/reliability, blast radius, testing, rollout/ops |
| "Put all the plan pack here in this folder" | Output strictly confined to `.ai/03_plans/2026-07-21-API-Audit/` | All writes go only to the new plan folder; sibling plan packs untouched |
| "this is not a coding task. This is an audit, plan, readiness creation task." | Task type = `planning-only` per Multi-Agent-Execution-Directive §0 | No code/tests/migrations/Manifests/git/provider state changes; only plan-pack markdown |

## Scope boundaries

### IN SCOPE

The API audit covers — across the **active Cloudflare-only runtime** (Workers/OpenNext + D1 + R2 + Durable Objects + Better Auth + Cloudflare Email Service + Queues + Cron + WAF when configured + Workers Observability):

1. **HTTP API surface**
   - Every Next.js App Router Route Handler (route.ts / route.tsx anywhere).
   - Every `"use server"` Server Action (`src/lib/**/actions.ts` and any inline `"use server"` export).
   - Better Auth mount (where Better Auth is mounted in the Next.js side or via Hono).
   - OpenNext Worker entry customization or middleware, if present.
2. **Database / data-access surface**
   - Every D1 prepared statement / RPC-equivalent currently invoked at runtime (the audit recognizes D1 has no RLS; row-level access is enforced in app code).
   - Every D1 migration currently applied (in `migrations/` or `supabase/migrations/` if those are still the active D1 path).
   - Every generated D1 TypeScript types binding in `cloudflare-env.d.ts` / generated `*.d.ts`.
3. **Storage surface**
   - Every R2 put / get / list / signed-URL mint operation in app code.
   - Bucket policies (in app code; R2 has no S3-style IAM ACLs, only IAM tokens or app-layer).
4. **Realtime surface**
   - Every Durable Object class and method (especially `CollaborationRoom` or equivalent handling ignite cursors/presence).
   - WebSocket upgrade routes, message schemas, presence/cursor events, hibernation / `alarm()` usage.
5. **Background work surface**
   - Every Cloudflare Queue producer + consumer handler.
   - Every Cron Trigger handler.
6. **Email surface**
   - Cloudflare Email Service inbound Email Worker (if present) and outbound sending helper.
7. **Security & privacy**
   - Authentication / authorization for every API surface (Better Auth session vs anonymous vs service).
   - Input validation (zod schemas vs hand-rolled checks vs none).
   - Error contract envelope stability.
   - Idempotency / duplicate-submit handling for every mutation.
   - Credential-material taxonomy (session cookie / OAuth state / magic-link / share token (hashed?) / invite token (hashed?) / WebSocket ticket / R2 signed URL / CSRF token).
   - RLS-equivalent row-level access (D1 has no RLS — audit verifies app-code enforcement).
   - SSRF, XSS, CSRF, open-redirect, prompt-injection, path-traversal attack surfaces per endpoint.
   - Secret/binding handling (NEXT_PUBLIC_ leaks, service tokens in client bundles, raw bearer tokens in URLs).
   - WAF / rate-limit posture when configured (currently DMARC `p=none` per FAST PATH; not a runtime blocker).
8. **Performance / reliability / observability**
   - p50 / p95 budgets per surface (D1, R2, DO, Email).
   - Workers Observability sampling posture, retention, redaction.
   - Queue / Cron failure modes (at-least-once, DLQ, overlap protection).
   - Background job correctness (idempotency, retry cap, DLQ).
9. **AI surfaces when feature-flagged on**
   - `ARCHESTIMATOR_AI_ENABLED=true` AI Package Builder.
   - `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED=true` "Ask Flip".
   - Historical AI audit tables (`ai_action_runs`, `ai_tool_calls`, `ai_data_access_events`).
10. **Test inventory** for everything above (Vitest DOM, Bun unit, Playwright E2E).
11. **Cross-cutting quality**: TypeScript boundary types, zod schemas, `any` / `as any` / `@ts-ignore` leakage at API boundaries, `throw new Error(...)` patterns inside handlers.

### OUT OF SCOPE

- Cloudflare provider mutation (no `wrangler deploy`, no migrations, no D1 SQL execution from the audit pack).
- Code edits of any kind (implementation is a separate future plan pack).
- Test edits.
- Migration edits.
- Package manifest edits.
- Provider state / Worker deployment edits.
- Git state changes (commit, push, merge, branch, force-anything).
- Other plan packs (`2026-06-29-Cloudflare-Migration-Codex/`, `2026-06-29-Rate-Limiting/`, etc.) are READ-ONLY inputs.
- Production browser / Playwright proof for the audit itself (per Codex/UI verification policy; static inspection + lint + type/lint + targeted reads suffice for docs-only).
- Supabase/Vercel/Resend historical surfaces that have been replaced by Cloudflare equivalents. They appear only in a short "migration archaeology" appendix in `03_SOURCE_AND_CODEBASE_AUDIT.md` so future agents understand what was replaced.
- UI component visual audit (covered by the UX-Audit sibling plan pack `2026-06-23-Full-App-User-Story-UX-Audit`).
- Frontend design-system audit (covered by `DESIGN.md` discipline and the design-system linter).
- Pre-existing RED `test:dom` test FIX (those are cited as awareness; remediation belongs to a future implementation plan).

## Non-goals (explicit)

- NOT implementing any feature, fix, or refactor.
- NOT migrating any provider further.
- NOT a UX audit (sibling plan pack covers that).
- NOT a UX audit of visual design (alpha `DESIGN.md` covers that).
- NOT an audit of CI/CD pipelines themselves (only that they run the validation gates).
- NOT an audit of Storybook (review surface, no production impact).
- NOT a security code-grep tooling rollout (existing `ecc:security-reviewer` mental model is sufficient for the audit).

## Master goal (compact form)

**Authoritative user outcome**: Philip (owner) gets a single ready-to-read plan pack that audits every API-bearing surface of the Archestimator Cloudflare-only runtime, names every file/line that needs future remediation attention, separates evidence from inference, and lands at `CONDITIONALLY READY` so that an implementation agent can pick up the recommendations without re-discovery.

## Required codebase analysis (per `Creating-Plan-Prompt.md` §6)

The audit must inspect repository structure, application architecture, packages/modules, frontend routes & components (only insofar as they are callers of API surfaces), backend routes & services, API handlers & contracts, D1 / R2 / DO / Queues / Cron / Email bindings, data-access layers, auth & authorization, state management, shared types & interfaces, validation logic, background jobs & queues, external services/integrations, network clients, caching, configuration & feature flags, logging/monitoring/analytics, existing tests, build & deployment configuration, and documentation. See `03_SOURCE_AND_CODEBASE_AUDIT.md` for the actual inventory.

## Required specialist workstreams (per `Creating-Plan-Prompt.md` §3)

Recorded in `00_AGENT_COORDINATION.md` lanes L1..L8: API surface inventory, security/contract pattern audit, tests/types/AI-access inventory, Cloudflare/Better Auth official-docs references, plan DAG (emulated), lead synthesizer, adversarial reviewer (emulated), independent final verifier (honestly recorded as unavailable).

## Implementation-readiness criteria (for the AUDIT pack itself)

The audit pack is ready when:

1. All 22 plan docs + LOOP_LEDGER.md exist.
2. Every doc has frontmatter/header identifying itself.
3. `git diff --check` clean.
4. No orphan IDs.
5. `01_EXECUTIVE_SUMMARY.md` states the verdict and headline risks.
6. `17_FINAL_READINESS_REVIEW.md` sets the readiness label (`CONDITIONALLY READY` per `emulated` verification cap).
7. `README.md` carries readiness + phase order + blocked decisions + stale-plan revalidation checklist + files off-limits + intentionally unaffected surfaces + external proof still required + archive policy.

## Validation criteria

For the AUDIT-pack-as-a-doc itself:

- Markdown frontmatter present on every file.
- No trailing whitespace.
- `git diff --check` clean (whitespace + conflict markers).
- All cross-doc ID references resolve (every ` REQ-*` in `16_*.md` was emitted in `04_*.md`; every `RISK-*` in `14_*.md`; every `DEC-*` in `15_*.md`; every `WP-*` in `11_*.md`).
- 22 mandatory docs present.

For the AUDIT-PACK-AS-READINESS for future implementation:

- Each recommendation in `11_IMPLEMENTATION_PLAN.md` is independently implementable in a separate scope; no recommendation requires two surfaces to change atomically unless explicit dependency is recorded.
- Each P0/P1 finding in `14_RISK_REGISTER.md` has an owner, mitigation, and rollback/fix-forward strategy.

## Final planning deliverables

1. Twenty-two plan docs listed in `Creating-Plan-Prompt.md:1118-1140` (exhaustive profile).
2. `README.md` (final).
3. `LOOP_LEDGER.md` (per `archestimator-plan-pack` skill).
4. This notepad at `/var/folders/.../ulw-api-audit-20260701-155720.md` — kept as a temporary audit trail. It will be cleaned up at audit completion.
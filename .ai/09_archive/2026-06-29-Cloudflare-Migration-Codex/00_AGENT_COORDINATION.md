---
title: Agent Coordination
plan_id: 2026-06-29-cloudflare-migration-codex
document: 00
---

# Agent Coordination

## Master Goal

Create a planning-only, research-backed migration package for preparing a cheapest/full Cloudflare-native redesign while Archestimator has not launched and can still absorb deeper provider changes.

This is not a coding task. This package must not modify application code, tests, schemas, migrations, infrastructure, provider resources, branches, or runtime state.

## Authority and Inputs

Primary user brief:

- Evaluate Cloudflare Workers, D1, KV, R2, Queues, Hyperdrive, Email Service, WAF, DDoS protection, Turnstile, Durable Objects/WebSockets, Web Analytics, and Workers Observability.
- Consider Better Auth as part of the database/auth migration.
- Aim for everything in Cloudflare if proof shows it is cheaper, fast enough, and safe enough.
- Confirm whether the database can move away from Supabase into Cloudflare.
- Make performance a first-class target, not an afterthought.
- Put the result in `.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex`.
- Update `.ai/08_prompts/000_Planning Prompts/Multi-Agent-Execution-Directive.md`.
- Treat this as planning, not coding.

Repository authority:

- `AGENTS.md`
- `.ai/10_state/current-state.md` fast-path block
- `README.md`
- `package.json`
- `next.config.ts`
- `vercel.json`
- `src/lib/supabase/*`
- `src/proxy.ts`
- `src/lib/email/*`
- `supabase/migrations/*`
- local Next.js 16 docs under `node_modules/next/dist/docs/`

External authority:

- Installed Cloudflare skills: Cloudflare platform, Cloudflare One, Cloudflare One migrations, Workers best practices, Wrangler, and adjacent product-specific references when a slice uses them.
- Official Cloudflare docs for Workers, D1, KV, R2, Queues, Hyperdrive, Email Service, WAF, and DDoS.
- Cloudflare product changelogs and Wrangler config schema for exact limits, flags, binding shapes, and command/config behavior at execution time.
- Official Better Auth docs and release notes.
- Official Supabase pricing docs for baseline comparison.
- Local installed Next.js docs for adapter/platform expectations.

## Workstreams Completed

WS-01 Repo audit:

- Mapped provider dependencies in `package.json`.
- Mapped Supabase client, auth proxy, service-role, storage, realtime, and RPC surfaces.
- Mapped Vercel cron and hosted proof scripts.
- Mapped Resend client/webhook/readiness surface.
- Counted current SQL migration files.

WS-02 Official-doc research:

- Checked current Cloudflare platform limits and pricing as of 2026-06-29.
- Checked Cloudflare Next.js/OpenNext support, D1 SQLite model, KV consistency, R2 consistency/cost, Queues limits, Hyperdrive purpose, Email Service boundaries, WAF and DDoS plan boundaries.
- Checked Better Auth support for Cloudflare Workers and D1.
- Reclassified exact Cloudflare limits/prices/config fields as execution-time refresh items, because installed Cloudflare guidance is retrieval-first and Cloudflare product surfaces are version-sensitive.

WS-03 Planning synthesis:

- Converted findings into requirements, risk register, parity matrix, cost model, staged rollout, rollback, and validation gates.
- Reframed the plan around a preferred full Cloudflare-native proof program because the product has no external users yet.
- Added D1/Auth/Realtime redesign and performance proof tracks.

WS-04 Second-pass quality hardening:

- Added an execution readiness scorecard.
- Added worksheets for route/provider/RPC/SQL/script inventory.
- Added a sequenced proof-spike backlog.
- Added a cost and performance workbook template.
- Grounded the worksheets with repo counts: `107` files under `src/app`, `27` files under `src/app/api`, `126` source files matching Supabase/realtime/storage/RPC coupling, `76` distinct app-code RPC names, `181` applied migration files, `15` pending-review SQL files, `346` SQL function declaration/update matches, and `655` RLS/policy/storage/auth-related SQL matches.

WS-05 Completion audit:

- Added a local evidence inventory with the full app-code RPC catalog, high-signal provider-coupled source areas, reusable test surfaces, and current provider proof script inventory.
- Added a completion audit that separates planning artifact quality from proof-program readiness and production migration readiness.
- Marked the documentation-quality loop PASS while keeping execution and production migration NO-GO until provider proof, cost data, performance evidence, and rollback rehearsals exist.

## No-Code Guardrail

Allowed in this task:

- Read local repository files.
- Research official docs.
- Create planning documents under the requested `.ai/03_plans` folder.
- Update the planning prompt requested by the user.
- Update the requested multi-agent execution directive.
- Run read-only verification such as `find`, `rg`, `sed`, `nl`, `git diff --check`, and file counts.

Not allowed in this task:

- Source-code implementation.
- Test edits.
- Schema or migration edits.
- Provider mutations.
- Runtime deploys.
- DNS changes.
- Cloudflare, Vercel, Supabase, or Resend configuration changes.
- Commits, pushes, or branch changes.

## Status

- Planning package status: CONDITIONALLY READY for full Cloudflare-native redesign review and proof planning.
- Documentation-quality loop status: PASS.
- Implementation status: NOT STARTED by design.
- Main blocker before execution: usage-based cost model, D1/Auth/Realtime redesign proof, Next-on-Workers proof, and provider parity proof.

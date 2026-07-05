# Coordination Ledger

## Master Goal

Combine, audit, and improve the 2026-06-29 Rate Limiting plan pack and the user-provided 2026-07-01 API Audit workspace copy into one dated plan that is ready for careful implementation sequencing. The API-audit material also had tracked/historical path drift under `2026-07-21-API-Audit`; this pack supersedes that identity too when it appears in old docs or git status.

This ledger records what was combined, what was corrected, what remains blocked, and what evidence supports the final planning state.

## Mode

- Task type: planning-only.
- Code/source edits: none intended or required.
- Durable output: this plan pack plus a fast-path current-state note.
- Deletion scope: remove only the two user-named superseded source folders after this merged pack exists.

## Source Authority

Higher authority:

- `AGENTS.md`
- `.ai/10_state/current-state.md` fast path
- `.ai/08_prompts/000_Planning Prompts/Multi-Agent-Execution-Directive.md`
- `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
- `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`

Source packs:

- `.ai/03_plans/2026-06-29-Rate-Limiting/`
- `.ai/03_plans/2026-07-01-API-Audit/` as the user-provided workspace source folder.
- `.ai/03_plans/2026-07-21-API-Audit/` as tracked/historical API-audit path drift.

Current runtime source:

- `package.json`
- `worker.ts`
- `wrangler.jsonc`
- `cloudflare-env.d.ts`
- `src/app/api/**/route.ts`
- `src/app/**/route.ts`
- `src/lib/**/actions.ts`
- `src/lib/cloudflare/**`
- `src/lib/publication/**`
- `src/lib/collaboration/**`
- `src/lib/authz/d1-access.ts`
- `src/lib/uploads/**`
- `src/lib/ai/**`

## Coordination Lanes Used

- Source-plan audit lane: compared overlap, contradictions, and preservation targets.
- Codebase exploration lane: mapped active runtime, API routes, Server Actions, realtime path, D1 authz helpers, and existing limiter helpers.
- Repo-local idempotency/resilience lane: mapped current correlation-id, idempotency-key, queue retry, `Retry-After`, no-store, and error-envelope patterns.
- Standards research lane: gathered HTTP idempotency, conditional request, Problem Details, caching, Trace Context, Cloudflare Queues/alarms, and industry retry/idempotency references.
- Security lens lane: adversarially reviewed missing requirements with OWASP/GDPR-style risk posture.
- Lead integration lane: merged findings into this pack and set readiness gates.

## Evidence Summary

Planning evidence collected:

- Both source folders existed at the start of consolidation.
- The rate-limiting pack contained durable public-share and Better Auth coordination details, plus a Lean P0A slice, but also stale Postgres/Supabase wording.
- The API audit pack was closer to current Cloudflare-only runtime and contained important corrections, including the false WebSocket ticket assumption and invite-token hash/pepper correction.
- Current repo source confirms a Cloudflare/OpenNext stack with D1, R2, Durable Objects, Better Auth, and many API Route Handler plus Server Action surfaces.
- Current repo source confirms `routeCollaborationRoomRequest` forwards requests to `COLLAB_ROOMS` by room name and `CollaborationRoom` accepts WebSocket upgrades, so a signed ticket flow is a P0 implementation requirement.
- Current repo source confirms multiple durable D1-backed public/share/invite rate limits already exist and should be consolidated rather than replaced wholesale.
- Current repo source confirms `src/lib/authz/d1-access.ts` exists as a D1 app-authorization helper, but the merged plan must require complete access-path proof because D1 has no native RLS.
- Current repo source confirms estimate mutation history and AI package-builder flows have useful correlation/idempotency precedents, but they are not yet a universal HTTP idempotency contract.
- Current repo source confirms queue retry/dead-letter assets exist, but the plan needs explicit at-least-once duplicate-delivery, poison-message, and side-effect idempotency proof.
- Standards research confirms RFC 9110/6585/9111/9457 and W3C Trace Context should be the stable baseline, while `Idempotency-Key` and `RateLimit` are draft-level guidance that must not be overclaimed.

## Tooling Notes

- GitNexus was checked for repo context. The index was stale and query quality was degraded, so current-source reads and targeted `rg` results were treated as the stronger evidence source.
- Local Supermemory at `http://localhost:6767/` was unavailable during planning. Startup was attempted. This is an advisory-memory gap, not a blocker, because `.ai` and current source are authoritative.
- Browser and Playwright proof were intentionally skipped because this was a planning-only docs task and no browser-only behavior was changed.

## Corrections Applied

- API audit identity drift is superseded. The source folder named by the user and removed by this task was `2026-07-01-API-Audit`; tracked history and stale internal references also identify the same API-audit planning line as `2026-07-21-API-Audit`.
- Realtime WebSocket tickets are not assumed to exist. They are a required build item.
- Invite tokens are not described as encrypted-at-rest when source indicates SHA-256 hash plus server pepper.
- D1 app authorization is treated as a proof matrix requirement, not an RLS substitute that can be assumed complete.
- Supabase/Postgres references are treated as historical migration archaeology unless a future source read proves an active path.
- Better Auth, Cloudflare WAF/Rate Limiting/Turnstile, and provider controls are observe-first and proof-gated.
- Idempotency is no longer Server Action-centric. Route Handlers, public-token endpoints, internal routes, provider callbacks, queues, cron, and Durable Object alarms now require explicit semantics where touched.
- Cloudflare Queues and Durable Object alarms are treated as at-least-once execution surfaces.
- Draft `Idempotency-Key` and `RateLimit` references are marked as non-final planning input, not RFC compliance.

## Planning Completion Criteria

This planning task is complete when:

- A new `2026-07-02-*` plan folder exists.
- The merged pack contains source reconciliation, standards mapping, requirements traceability, work packages, validation strategy, risk register, and completion audit.
- The merged pack contains a dedicated idempotency, retry, error, cache, trace, and async resilience addendum.
- The two requested old folders are removed.
- Documentation verification passes for paths and whitespace.
- Remaining risks are explicit and implementation blockers are not hidden.

## Handoff Rule

Any implementation agent must start by re-reading:

- This `README.md`.
- `01_EXECUTIVE_SUMMARY.md`.
- `03_REQUIREMENTS_AND_TRACEABILITY.md`.
- `04_SECURITY_PRIVACY_STANDARDS_MODEL.md`.
- `05_CONSOLIDATED_ARCHITECTURE_AND_WORK_PACKAGES.md`.
- `06_VALIDATION_QA_AND_ROLLOUT_PLAN.md`.
- `07_RISK_REGISTER_AND_DECISIONS.md`.

Then it must re-check current source before editing. This pack is a planning authority, not a substitute for fresh implementation evidence.

## Concurrent Plan-Pack Coordination (Iteration 11 Update)

This pack was authored 2026-07-02. Four sibling packs authored between 2026-07-03 and 2026-07-04 touch surfaces this pack treats as open P0/P1 blockers. Coordination is required to avoid duplicate implementation, conflicting assumptions, or silent scope shrinkage.

| Sibling pack | Surfaces that overlap | Coordination rule |
|---|---|---|
| `.ai/03_plans/000-Follow Ups/2026-07-03-Authentication-Audit-And-Improvement/` | `RISK-P0-1` (WebSocket ticket), `RISK-P0-2` (D1 authz matrix), `RISK-P0-3` (Server Action safety); `WP-C` (Better Auth), `WP-D` (D1 authz), `WP-E` (realtime ticket). | Auth-audit Phase 3 WP1-WP6 (locally implemented 2026-07-04) controls *local implementation status* for these surfaces. This pack controls *program-level scope, sequencing, and cross-surface contracts* (idempotency key/ttl/storage/replay, error envelope, cache/revocation, trace/correlation, async at-least-once delivery). Implementation agents must read `24_PHASE_3_AUTHZ_MATRIX_AND_ROLE_TAXONOMY_PLAN.md` and the rate-limit plan's `09_IDEMPOTENCY_RETRY_AND_RESILIENCE_STANDARDS.md` together before editing any of those surfaces. |
| `.ai/03_plans/2026-07-04-Security-Compliance-Program/` | Shared OWASP API Top 10 / GDPR / RFC 9457 surface area. | The compliance pack already cites this pack as a source. Cite reciprocally; do not duplicate risk-register entries. New program-level security/compliance risks go to the compliance pack; new cross-surface API contract gates go to this pack. |
| `.ai/09_archive/store/2026-07-05-Performance-Optimization/` | Backend cost/spend budgets, D1 round-trip counts, Worker CPU/duration pressure (this pack's `06_VALIDATION_QA_AND_ROLLOUT_PLAN.md`, `IMPLEMENTATION_PLAN.md` Section 13). | The performance pack owns benchmark/baseline/target/regression evidence; this pack owns the per-surface spend/round-trip budget posture. Implementation that changes either must cite both. (Archived 2026-07-05.) |
| `.ai/09_archive/store/2026-07-05-Vercel-Supabase-Cleanup-complete/` | `RISK-P0-4` (store authority). | The cleanup pack's hosted/provider/operator gates remain open. This pack's classification of Supabase/Postgres references as migration archaeology still controls for *active-runtime* claims; the cleanup pack controls for *provider-exit/historical-cleanup* claims. (Archived 2026-07-05.) |

Drift rule: if any sibling pack updates a surface's implementation status, this pack's risk register (`07`) and source authority (`02`) must be re-checked for status updates in the same loop. Silent staleness here is exactly the kind of issue that triggered the 2026-07-04 auth-audit work being untracked in this ledger before iteration 11.

Cross-pack proof rule: hosted/provider/two-client/runtime/browser proof is never closed by a sibling pack's local-only slice. When a sibling pack records "Phase X WP-Y locally complete", that closes only the local implementation layer. The release gates in this pack's `06` and `IMPLEMENTATION_PLAN.md` Section 17 (PH-8) still require hosted/provider proof before the program can claim production-ready.

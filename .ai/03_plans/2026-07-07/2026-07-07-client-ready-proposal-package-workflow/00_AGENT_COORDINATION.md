# 00 — Agent Coordination

Plan pack: `2026-07-07-client-ready-proposal-package-workflow`
Lead: GLM-5.2 planner (single agent).
Plan profile: `exhaustive` (touches publication/shared links, app authorization, data integrity, Cloudflare Email, possible D1 migration).
Verification mode: `emulated` (separated passes by the same agent; no native independent verifier lane was available this session). This caps overall readiness at 97 and package status at `CONDITIONALLY READY` for this high-blast-radius package until an independent reviewer or owner accepts the package.

## Master /goal

Produce an implementation-ready planning package for a **Client-Ready Proposal Package Workflow**: the owner journey that takes an estimate from "drafted" to a client-ready, sent, tracked proposal package, with explicit readiness checks, missing-data blockers, stale/source-risk warnings, sheet selection, recipient setup, preview states, delivery confirmation, and resend/revoke handling.

- **User/business outcome.** An estimator owner can confidently turn a finished estimate into a package they can stand behind (downloadable XLSX + shareable publication), send it to recipients, and see whether it was delivered/opened/decided — without leaking internal estimator detail.
- **Problem being solved.** The export-preview surface, the publisher drawer, and the publication lifecycle are all built but are **not stitched into one coherent owner workflow**. There is no readiness/preflight layer, no data-completeness blocker, no surfaced source-staleness warning, no owner-composable recipient message, no wiring of the declared `bounced`/`responded` delivery statuses, and no `publication_activity` notification dispatch. The owner has to mentally cross three surfaces and has no "is this ready to send?" answer.
- **Intended feature behavior.** A unified readiness model (server-derived, redacted for the client) feeds both the estimate-side export preview and the project-side publisher drawer; a Publish/Send action is gated by hard blockers (and warns on soft issues); delivery confirmation surfaces what is actually knowable (sent/opened/responded) and is honest about the provider gap (bounce/complaint ingestion); resend/revoke stays coherent.
- **Planning scope.** Planning only. No application code, tests, migrations, or provider state is changed by this pack.
- **Non-goals.** (1) Building a brand-new `proposals` table — "proposal" remains a `project_publications` row. (2) PDF generation — there is no PDF path today; out of scope for v1 (greenfield, deferred). (3) Recipient-side read/unread inbox state. (4) Per-proposal legal terms the client must accept (platform beta terms remain the only terms surface). (5) R2-stored snapshot blobs (snapshot stays in D1 `snapshot_json`). (6) A real-time collaboration/Presence change. (7) Provider migration off Cloudflare Email.
- **Required codebase analysis.** Export preview + workbook model; publisher drawer + roster; publication lifecycle (create/republish/rotate/revoke) and security model; recipient model and delivery-status writers; email client + EMAIL binding; notifications module; D1 schema in `0014`/`0015`; app-authorization patterns.
- **Required specialist workstreams.** Product/scope; codebase architecture; UX/UI/a11y; frontend state; backend/API/data; security/privacy; performance/reliability; test/QA; rollout/ops; blast radius; adversarial review; final verification.
- **Implementation-readiness criteria.** Every requirement traceable to a task, test, and rollout check; exact repo-relative paths/symbols for each task; shadow-path matrices complete; database change blueprint for any migration; performance evaluator contract; honest blocker list.
- **Validation criteria.** The pack must let an executor implement a coherent owner workflow from estimate to client-ready package without rediscovery (the PROMPT.md stop condition).
- **Final planning deliverables.** Docs `00`–`19` + `README.md` in this folder.

## Specialist workstream lanes (emulated passes)

All lanes below were run as **separated read-only analysis passes by the same lead agent** (no native subagents were spawned). Evidence was gathered via four parallel `Explore` subagent dispatches for breadth; the synthesis, adversarial, and final-verification passes are emulated.

| Lane | Role | Scope | Evidence | Status |
|---|---|---|---|---|
| Lead coordinator | Scope, sequencing, integration, final claim | Whole pack | This folder | Done |
| Source & requirements analyst | Extract requirements from PROMPT.md, scope, non-goals | PROMPT.md, related plan folders | 02, 04 | Done |
| Codebase architecture analyst | Map current files, symbols, dependencies | src/components/workshop, src/lib/proposal-export, src/lib/publication, src/lib/publisher, src/lib/recipient-proposals, migrations/0014, 0015 | 03, 06, 07, 10 | Done |
| Product/UX/a11y planner | Owner journeys, states, keyboard/focus/sr | Workshop UI, dialog, drawer | 05 | Done |
| React/Next specialist | Server/Client boundaries, routing, caching, mutations | EstimateSheetContent, route.ts, Server Actions | 06, 18 | Done |
| Backend/API/data planner | Server Actions, D1 schema, app-authz, provider proof | actions.ts, admin-d1-client.ts, d1-store.ts, migrations | 07 | Done |
| Security/privacy reviewer | Threat model, authz, tokens, CSRF, abuse | security.ts, permissions.ts, public-repository.ts | 08 | Done |
| Performance/reliability reviewer | Baseline, budgets, evaluator, failure modes | route.ts caps, rate limits, circuit breaker | 09 | Done |
| Test/QA strategist | Coverage matrix, adversarial scenarios | existing tests, scripts | 12, 19 | Done |
| Operations/rollout planner | Flags, gates, rollback, runbook | wrangler.jsonc, cf:* scripts | 13 | Done |
| Adversarial reviewer | Disprove readiness, find omissions | All docs | 17, 19 | Done (emulated) |
| Final verifier | Requirement-by-requirement audit | All docs | 17 | Done (emulated) |

## Skills discovered and used

- `archestimator-plan-pack` (project-local): canonical plan-pack structure and exhaustive doc set — used as the structural template for `00`–`19`.
- `Explore` (read-only search subagent): used to fan out four parallel codebase audits (export/preview UI; publisher/publication; data/schema/repos; email/notifications/readiness). Returned concrete file:line evidence.
- `gitnexus` (code intelligence): available but **not used** for this planning task — the surface is well-localized (workshop + publication libs) and `rg` + targeted reads were the proportional choice per the AGENTS.md proportional-graph policy. Recorded as intentionally skipped.
- Repository instructions read: `AGENTS.md` (entry point + fast path), `.ai/10_state/current-state.md` fast-path block, the two governing planning directives.

Skills/workflows referenced by the directives but **not invoked as live tools** (recorded honestly): `autopilot`, `ultragoal`, `ultrawork`, `ultraqa`, `autoresearch`, `performance-goal`, `gitnexus`, `superpowers`. Their *discipline* is reflected in the plan (durable-goal contracts per phase in `11`; parallel-lane classification in `10`/`11`; adversarial matrix in `12`/`19`; evaluator contract in `09`/`19`; skill-existence verification in this section). No native goal tool was available, so the master /goal is recorded above instead of via `update_goal`.

## Unavailable capabilities and substitutes

- No native independent verifier lane this session → final verification is `emulated`; readiness capped accordingly (see `17`).
- No live Cloudflare provider readback was performed (planning-only task) → provider facts are sourced from `wrangler.jsonc`, `cloudflare-env.d.ts`, source code, and current-state log, and labeled as repo evidence, not provider proof.
- Cloudflare Email Service does not expose a per-recipient bounce/complaint/open webhook that this app currently ingests (empty `src/app/api/webhooks/resend/`, no webhook route) → delivery-confirmation scope is honestly bounded; the bounce/complaint ingestion path is recorded as `BLOCKED-EXTERNAL` in `11`/`15`.

## Coordination ledger (single-agent)

| Workstream | Owned scope | Dependencies | Findings | Decisions | Status |
|---|---|---|---|---|---|
| Source/requirements | PROMPT.md | — | Scope is owner workflow, not new infra | Keep "proposal" = publication | Done |
| Architecture | export + publisher + publication libs | requirements | Three built surfaces, not stitched; no readiness layer | New `proposal-readiness` lib + unified entry | Done |
| Data/schema | migrations 0014/0015, repos | architecture | `bounced`/`responded` never written; no readiness fields | `responded` hook is in-scope; `bounced` is BLOCKED-EXTERNAL; readiness is derived not persisted | Done |
| Security | tokens, CSRF, authz | architecture | Strong existing model; readiness must stay server-side | Reuse snapshot redaction; server-only readiness computation | Done |
| Performance | route caps, rate limits | architecture | Existing caps adequate; checklist is cheap | No new budget needed beyond defined evaluator | Done |
| Adversarial | all docs | all lanes | Provider webhook gap; optimistic `sent` honesty | Document as CONDITIONAL blocker | Done |
| Final verify | all docs | all lanes | Emulated; residual external blocker | CONDITIONALLY READY | Done |

No concurrent-agent file conflicts: all writes are confined to this new plan folder; no other planning files were modified.

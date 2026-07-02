# Archestimator API Audit — Plan Pack

> Plan folder: `.ai/03_plans/2026-07-21-API-Audit/`
> Plan profile: `exhaustive`
> Task type: `planning-only` (audit, plan, readiness creation — NOT implementation)
> Date authored: 2026-07-01 (PHT). Folder prefix `2026-07-21-API-Audit` retained from user-explicit instruction.
> Verification mode at audit open: `emulated` (iteration-8 claim) → `same-agent` effective classification (iteration-9 honest reclassification: all 4 dispatched independent lanes — V1/V2 explore, V3 librarian, V4 oracle — produced zero output; lead-authored verification performed via direct filesystem scan and cross-doc review)
> Canonical readiness status: **CONDITIONALLY READY**

## Status

**Readiness status:** `CONDITIONALLY READY`

> Per Multi-Agent-Execution-Directive §2, emulated verification (same-agent coordination with dispatched parallel exploration lanes but no truly independent reviewer) caps the readiness of a high-blast-radius exhaustive package at `CONDITIONALLY READY`. An independent reviewer or owner sign-off would lift this toward `IMPLEMENTATION-READY`.

This audit pack is the deliverable. **No code, tests, migrations, package manifests, provider state, or Git state were modified to author this pack.** Future remediation work — implementing the audit's recommendations — is a SEPARATE implementation plan pack that has not been opened.

## Pack deliverables (final — 22 files)

All 22 deliverables are present in `.ai/03_plans/2026-07-21-API-Audit/`:

- `00_AGENT_COORDINATION.md` — coordination ledger (lanes L1-L8)
- `01_EXECUTIVE_SUMMARY.md` — verdict + headline risks + recommendation summary
- `02_FEATURE_BRIEF_AND_SCOPE.md` — user FEATURE BRIEF + scope boundaries
- `03_SOURCE_AND_CODEBASE_AUDIT.md` — 22 SRC-* IDs (19 original SRC-001..019 + 3 added in iteration-9 verification pass: SRC-020/021/022); 29 Route Handlers + 30 Server Action files + Better Auth + DO + Queue + Cron + Email inventory
- `04_REQUIREMENTS_SPECIFICATION.md` — 56 REQ-* IDs + Shadow Path Matrix
- `05_UX_UI_ACCESSIBILITY_PLAN.md` — error-state UX (narrowed scope)
- `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` — current/target architecture + Mermaid diagrams
- `07_DATA_DATABASE_API_NETWORK_PLAN.md` — D1/R2/DO/Queue/Cron/Email matrices + API contract matrix + credential material taxonomy
- `08_SECURITY_PRIVACY_THREAT_MODEL.md` — threat model + 12 credential materials + per-Action verdict preview
- `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` — budgets + evaluators + failure modes + observability
- `10_BLAST_RADIUS_AND_DEPENDENCIES.md` — required/probable/possible/verification/unaffected change matrix
- `11_IMPLEMENTATION_PLAN.md` — 12 remediation phases (Phase 1..12) with WP-* IDs
- `12_TEST_AND_VALIDATION_STRATEGY.md` — Test Execution Matrix + pre-existing RED triage
- `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` — per-phase rollback + alerting + support runbook
- `14_RISK_REGISTER.md` — 37 RISK-* IDs (6 P0 / 19 P1 / 12 P2)
- `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` — 24 DEC-* + 12 ASSUMP-* + 16 OPEN-*
- `16_REQUIREMENTS_TRACEABILITY_MATRIX.md` — REQ ↔ WP ↔ AC ↔ TEST ↔ evidence
- `17_FINAL_READINESS_REVIEW.md` — scoring (94/100 emulated cap) + canonical `CONDITIONALLY READY` label
- `18_STACK_CONTRACT_AND_PRODUCTION_STANDARDS.md` — cross-cutting Cloudflare + Next 16 + Better Auth + D1 + R2 + DO + Queue + Email decisions
- `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` — research questions + 18 UltraQA adversarial scenarios + perf evaluator contract + validation gaps
- `20_INDEPENDENT_VERIFICATION_HANDOFF.md` — pick-up-cold handoff for OPEN-004 independent reviewer (V1/V2/V3/V4 scopes, pass/fail rules, recording protocol)
- `README.md` (this file) — entrypoint
- `LOOP_LEDGER.md` — DISCOVER → PLAN → EXECUTE → VERIFY → RECORD → DECIDE iteration log (8 iterations)

## What this pack is

A comprehensive, evidence-based, codebase-specific API audit of Archestimator's **active runtime** (Next.js 16 + Cloudflare Workers/OpenNext + D1 + R2 + Durable Objects + Better Auth + Cloudflare Email Service + Queues + Cron + WAF when configured + Workers Observability). The pack:

- Names every API-bearing surface (HTTP routes, Server Actions, Better Auth, D1 prepared statements/RPC-equivalents, R2 ops, DO methods, Queue consumers/producers, Cron handlers, Email Worker entry).
- Emits stable IDs (`REQ-*`, `WP-*`, `AC-*`, `TEST-*`, `RISK-*`, `DEC-*`, `GATE-*`, `OPEN-*`, `SRC-*`) carried through every downstream document.
- Distinguishes evidence (file:line references) from inference.
- Carries a credential-material taxonomy that does NOT collapse distinct tokens into one "token" concept.
- Carries an RLS-equivalent row-level access matrix for D1 (D1 has no RLS; app code owns the enforcement).
- Carries Test Execution Matrix + UltraQA adversarial scenario matrix.

## Implementation start document

For future remediation work (NOT this audit), the implementation entrypoint is `11_IMPLEMENTATION_PLAN.md`. For the audit-pack itself, the executive entrypoint is `01_EXECUTIVE_SUMMARY.md`.

## Phase order (audit-pack-write)

| Wave | Docs | Trigger |
|---|---|---|
| WAVE 0 | `00`, `01`, `02`, README skeleton | Author now (no deps) |
| WAVE 1 | `03`, `04`, `06` | Needs WAVE 0 + exploration lanes L1, L2, L3 |
| WAVE 2 | `05`, `07`, `08`, `09` | Needs WAVE 1 |
| WAVE 3 | `10`, `11`, `12`, `13`, `14` | Needs WAVE 2 |
| WAVE 4 | `15`, `18`, `19` | Needs WAVE 3 + librarian lane L4 |
| WAVE 5 | `16` | Needs WAVE 4 |
| WAVE 6 | `17`, README final, `LOOP_LEDGER.md` | Needs WAVE 5 |

## Dependency graph (docs)

```
00 ──┬─> 03 ──┬─> 04 ──┬─> 05
01 ──┤         └─> 06 ──┬─> 07
02 ──┘                  ├─> 08
                        └─> 09
08 + 09 + 07 → 10
08 + 09 + 07 → 11
08 + 09 + 07 → 12
08 + 09 + 07 → 13
04 + 08 + 09 + 10 + 11 + 12 + 13 → 14
04 + 14 + 11 → 15
06 + 07 + 08 + 09 + 14 + 15 → 18
04 + 12 + 14 + 15 + L4 (librarian) → 19
04 + 11 + 12 + 14 + 15 + 18 + 19 → 16
00 + … + 16 → 17
17 → README (final)
00 + 01 + 02 + 17 + README → LOOP_LEDGER.md
```

## Requirement/task/test traceability links

| REQ-* IDs emitted | WP-* Tasks emitted | TEST-* Scenarios emitted | AC-* Criteria emitted | Traceability document |
|---|---|---|---|---|
| `04_REQUIREMENTS_SPECIFICATION.md` | `11_IMPLEMENTATION_PLAN.md` | `12_TEST_AND_VALIDATION_STRATEGY.md` | `04_*.md` (per REQ) | `16_REQUIREMENTS_TRACEABILITY_MATRIX.md` |

Risk ID ownership: `14_RISK_REGISTER.md` (RISK-* IDs).
Decision ID ownership: `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` (DEC-* IDs).
Source evidence ID ownership: `03_SOURCE_AND_CODEBASE_AUDIT.md` (SRC-* IDs), with `19_*.md` librarian references.

## Blocked decisions table

| Decision ID (preview) | Owner | Why blocked | Source |
|---|---|---|---|
| OPEN-001 (preview) | Philip / future implementation | Whether the audit's findings will be remediated in one batch PR or sliced by surface (HTTP / Server Actions / D1 / R2 / DO / Email / AI) | `15_*.md` |
| OPEN-002 (preview) | Philip / future implementation | Whether Workers Observability sampling must be raised for P0 forensic visibility | `09_*.md`, `15_*.md` |
| OPEN-003 (preview) | Philip / rate-limiter | Whether to activate Cloudflare WAF + rate-limit rules (currently defer/default); see sibling plan `.ai/03_plans/2026-06-29-Rate-Limiting/` | `08_*.md`, `13_*.md` |
| OPEN-004 (preview) | Independent reviewer / owner | Independent reviewer sign-off to lift `CONDITIONALLY READY` to `IMPLEMENTATION-READY` | `17_*.md` |
| OPEN-005 (preview) | Philip | README root file stack description is stale (still Supabase/Resend); fix-forward or leave as migration-archaeology reference | `03_*.md` |

Full OPEN-* table is in `17_FINAL_READINESS_REVIEW.md` and `15_*.md`.

## Stale-plan revalidation checklist

Before any future agent picks up this audit pack to start remediation, they must revalidate the following:

1. Re-read `.ai/10_state/current-state.md` FAST PATH. If active runtime has changed since the audit (e.g., new binding, new Worker version), the audit's surface inventory in `03_*.md` may have drifted.
2. `git status --short --branch` confirmed on `main` (or the new branch state if Worktree changes).
3. `bun run type-check`, `bun run lint`, `bun run lint:design-system`, `bun run test`, `bun run test:dom` still match the audit's expectations (since the FAST PATH records ~131 pre-existing reds on `test:dom`, confirm those are unowned and not introduced by the audit).
4. `wrangler.jsonc` bindings and `cloudflare-env.d.ts` re-read for any new / removed bindings.
5. Sibling plan packs `.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/` and `.ai/03_plans/2026-06-29-Rate-Limiting/` checked for new stable IDs (`SCE-*`, `RL-FR-*`, `RL-NFR-*`, `PROOF-RL-*`) that supersede this audit's references.
6. Workers Observability dashboard spot-checked for p95 + sampled-error posture before declaring the audit's P0/P1 findings still current.
7. If the audit pack is older than ~14 days, treat every P0/P1 finding as needing re-verification before remediation work starts.

If any of the above has drifted, file the audit pack as `CONDITIONALLY READY — STALE` and open a v2 plan pack.

## Commands to run before the first edit (for future remediation)

When a future implementation agent picks up this pack, before editing any file:

```bash
git status --short --branch                 # confirm branch state
bun run type-check                           # exit 0
bun run lint                                 # exit 0
bun run lint:design-system                   # exit 0
bun test                                     # available unit tests
bun run test:dom -- --reporter=basic 2>&1 | tail -40   # known pre-existing reds
bun run build                                # exit 0 (this is green on main today)
```

These are NOT required for authoring the audit pack itself (it is docs-only). They are required gates for any future implementation agent picking up the audit's recommendations.

## Files and systems explicitly off-limits

- Any file outside `.ai/03_plans/2026-07-21-API-Audit/` (NO code, tests, migrations, package.json, wrangler.jsonc, cloudflare-env.d.ts, sibling plan-pack folders).
- Sibling plan packs `.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/`, `.ai/03_plans/2026-06-29-Rate-Limiting/`, `.ai/03_plans/2026-06-23-Full-App-User-Story-UX-Audit/`, etc. are READ-ONLY inputs.
- The notepad at `/var/folders/.../ulw-api-audit-20260701-155720.md` — internal to this audit run; not part of the deliverable.

## Files and systems intentionally unaffected

- Any Next.js route / page / component NOT in the API surface (UI components are documented but not modified).
- UI design-system primitives (`src/components/ui/**`).
- Storybook configuration (review surface).
- Vitest/Bun/Playwright configuration files themselves (test framework config is not changed).
- Provider state (Cloudflare, GitHub, Vercel, Resend).
- Git history index.

## External proof still required (before future remediation ships)

This audit pack does NOT ship remediation. The future remediation plan pack will need:

- D1 query-plan `EXPLAIN` evidence for any prepared statement flagged P0 in `07_*.md`.
- Better Auth session-cookie / OAuth state / CSRF posture provider readback from a deployed Worker (or local sandbox).
- Workers Observability sampling confirmation that P0 errors are visible at the configured sample rate.
- Cloudflare WAF / rate-limit rule evaluation (only if `OPEN-003` is resolved "yes").
- Cross-workspace access denial proof for every Server Action (Role-matrix test fixture).
- Public-share-link denial proof (password gate, expired token).
- R2 signed-URL mint proof for included-object-scoped GET/PUT (or whatever scoped mint posture is chosen).

## Archive policy

- **Archive automatically after full implementation**: archive this audit pack to `.ai/09_archive/03_plans/` once ALL audit findings have been remediated AND an independent reviewer has signed off (which lifts the `CONDITIONALLY READY` cap to `IMPLEMENTATION-READY`).
- **Do not archive automatically otherwise**. If only a subset of findings is remediated, the audit pack stays actively tracked in `LOOP_LEDGER.md` until remediation is complete.
- **Stale revalidation**: any consumer picking up this pack after >14 days follow the Stale-plan revalidation checklist first; if drift is found, open a v2 pack instead.
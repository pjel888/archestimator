# 01 — Executive Summary

> Plan pack: Archestimator API Audit
> Plan folder: `.ai/03_plans/2026-07-21-API-Audit/`
> Date authored: 2026-07-01 (PHT)
> Verification mode: `emulated` (lead author + dispatched exploration lanes; no independent reviewer available)
> Plan profile: `exhaustive`
> Canonical status label: `CONDITIONALLY READY` (capped by `emulated` verification per Multi-Agent-Execution-Directive §2 — independent reviewer or owner sign-off would lift toward `IMPLEMENTATION-READY`)

## What this plan pack is

This is an **audit and readiness package** for every API-bearing surface in Archestimator's **active runtime** — Next.js 16 App Router Route Handlers, Server Actions (`"use server"`), Better Auth endpoints, D1 prepared statements / RPC-equivalents, R2 storage operations, Durable Object RPC + WebSocket, Cloudflare Queue consumers/producers, Cron triggers, Cloudflare Email Service inbound/outbound, and (when feature-flagged on) AI tool-call surfaces.

> **Critical framing.** A previous Archestimator repo `README.md` describes the platform as "Supabase/Postgres + Resend." The `.ai/10_state/current-state.md` FAST PATH block (re-read at audit open) confirms that active runtime source is now **Cloudflare-only** (Workers/OpenNext + D1 + R2 + Durable Objects + Better Auth + Cloudflare Email Service + Queues + Cron + WAF when configured + Workers Observability). The Supabase/Vercel/Resend wiring is migration archaeology. This audit therefore covers the **live Cloudflare-only** API surface; rows pointing only at historical Supabase-only paths are explicitly excluded (with a short migration-archaeology appendix).

> **Critical pre-existing reds.** The FAST PATH also reports ~131 failed `test:dom` tests across 36 files in auth/beta, project groups/favorites, publication, library, agent-payload/tooling, upload-proof, and project-list contract areas. These are **pre-existing**, not introduced by the audit, and are cited in the test-traceability matrix as audit's regression-anchor awareness — they are not "fixed" by a planning pack.

## Recommended audit verdict

Based on the FAST PATH state read at audit open (production cutover `productionCutoverReady=true` as of 2026-07-01 07:52 UTC), the API audit's broad verdict is:

- **Foundational runtime**: production-ready. D1 p95s (`workspace_homebase_summary` 65ms, `project_estimate_list_summaries` 39ms, `library_overview_summary` 31ms, `can_edit_project` 51ms, `estimate_row_mutation` 57ms) all within budget. Durable Object WebSocket realtime p95 54ms. Email send-to-receipt ~4s.
- **API-layer confidence gaps to be removed by the audit's future remediation** (the audit names these as P0/P1 findings, not as blockers to the audit pack itself):
  - P0 (must verify per surface): D1 row-level access (RLS-equivalent) — confirm every prepared statement is scoped by `workspace_id`/`owner_id` at app code, since D1 has no RLS. Any unscoped read/write is a P0 finding.
  - P0: every `"use server"` mutation treated as a directly reachable POST endpoint — must verify auth, input validation, idempotency, and DTO-vs-throw contract per surface.
  - P0: credential-material taxonomy clearly separates session cookie / OAuth state / magic-link token / share token (hashed vs raw?) / invite token (hashed vs raw?) / WebSocket ticket / R2 signed URL minting expiry.
  - P1: error contract envelope stability (`{ok, error, data}`) and no stack-trace / secret leak in `throw new Error(...)` paths inside route handlers.
  - P1: WAF/rate-limit posture when configured (currently DMARC `p=none` flagged in FAST PATH; not a runtime blocker).
  - P1: known pre-existing RED test areas must be triaged against API-surface code — not postponed silently.
  - P2: Durable Object WebSocket hibernation / quota posture (`alarm()` usage, WS connection cap per DO).
  - P2: Queue idempotency / DLQ handling per consumer.
  - P2: Cron overlap protection (no native protection — verify in app code).

## Headline risks (preview; full list in `14_RISK_REGISTER.md`)

| Risk ID (preview) | Surface | Severity | Why it matters |
|---|---|---|---|
| RISK-001 (preview) | D1 unscoped prepared statement | P0 | D1 has no RLS; app code owns row-level access enforcement. Any unscoped query is a tenant-bypass vector. |
| RISK-002 (preview) | Server Action missing auth/ownership check | P0 | Server Actions are reachable as POST endpoints; missing auth = direct mutation by anonymous caller. |
| RISK-003 (preview) | Credential-material collapse (share / invite / magic-link tokens treated as one "token" concept) | P0 | Distinct materials have distinct visibility and rotation rules. Collapse → leak or rotation bug. |
| RISK-004 (preview) | R2 signed-URL mint without object-key authorization | P1 | Mint endpoint that does not verify the caller can access that object causes IDOR-style read/write. |
| RISK-005 (preview) | Worker Logs / Observability sampling loses P0 forensic signal | P1 | Workers Logs sampling may under-sample the rare P0 error. Retention/redaction must be set deliberately. |
| RISK-006 (preview) | README + sibling plan packs still reference stale Supabase/Resend stack | P2 | Drift causes future agents to audit dead surfaces. The audit closes the loop by naming the live surface. |

> Full RISK IDs are finalized in `14_RISK_REGISTER.md`. These previews are stable enough for the executive summary but should not be cited downstream — cite them through `14_RISK_REGISTER.md`.

## Top audit recommendations

1. **Build a per-D1-prepared-statement access-path matrix** in `07_DATA_DATABASE_API_NETWORK_PLAN.md` with columns: source surface | chosen API/client | client role | required grants | WHERE-scoping evidence | proof source | fallback. Any row missing `workspace_id`/`owner_id` scoping is a P0 finding.
2. **Build a per-Server-Action verdict table** in `08_SECURITY_PRIVACY_THREAT_MODEL.md` with columns: action name | file:line | auth check | ownership check | input validator | idempotency | error contract | verdict (PASS/WARN/FAIL).
3. **Build a credential-material taxonomy** in `08_*.md` that distinguishes session cookies, OAuth state, magic-link tokens, share tokens (hashed vs raw), invite tokens (hashed vs raw), WebSocket tickets, R2 mint URLs, and any CSRF tokens — each with created-by, stored-in, read-by, client-visible, rotation, and revocation columns.
4. **Build a Test Execution Matrix** in `12_TEST_AND_VALIDATION_STRATEGY.md` that maps each REQ-API-* / REQ-SEC-* / REQ-DATA-* to an actual test file path + test type + fixture setup + command + expected evidence + known pre-existing reds owner.
5. **Build an UltraQA adversarial scenario matrix** in `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` covering: malformed input, oversized payloads, unusual Unicode, path traversal, prompt injection, unauthorized/cross-workspace, duplicate submit, concurrent writes, stale cache, network timeout, retry-after-partial-success, cancellation, dirty worktree/concurrent-agent safety, hung commands, and misleading success output.

## What this audit does NOT do

- Implementation. No code, tests, migrations, package manifests, provider state, runtime config, or Git state will change as a result of authoring this plan pack.
- Browser / Playwright proof. Per AGENTS.md and Cloudflare migration Codex App speed guardrail, browser proof is opt-in. The audit pack itself is a static, unit/DOM-contract, type/lint, and review-gate artifact.
- Cloudflare provider mutation. No `wrangler deploy`, no migrations, no D1 SQL executes from the audit.
- Owner sign-off. The audit's final readiness label is `CONDITIONALLY READY` because verification is `emulated`. An independent reviewer or owner sign-off would lift it toward `IMPLEMENTATION-READY`.

## How to read the pack

The implementation entrypoint for **future remediation work** (NOT for this audit) is `11_IMPLEMENTATION_PLAN.md`. The audit pack's "implementation" is the AUDIT ITSELF — phasing is for which audit docs ship in which order during the audit-write, plus how the audit's findings should be remediated in a SEPARATE future implementation plan (separate from this package).

Read order:

1. `README.md` (final) — top-level readiness, phase order, blocked decisions.
2. `01_EXECUTIVE_SUMMARY.md` (this doc) — verdict + headline risks + recommendation summary.
3. `02_FEATURE_BRIEF_AND_SCOPE.md` — what the user asked for and what's out of scope.
4. `03_SOURCE_AND_CODEBASE_AUDIT.md` — the canonical API surface inventory.
5. `04_REQUIREMENTS_SPECIFICATION.md` — REQ-* IDs + Shadow Path Matrix.
6. `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` — current/target architecture.
7. `07_DATA_DATABASE_API_NETWORK_PLAN.md` — D1/R2/DO/Queues/Cron/Email matrices.
8. `08_SECURITY_PRIVACY_THREAT_MODEL.md` — attack surface + credential material + RLS-equivalent.
9. `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` — budgets + Workers Observability posture.
10. `12_TEST_AND_VALIDATION_STRATEGY.md` — Test Execution Matrix + UltraQA adversarial matrix.
11. `14_RISK_REGISTER.md` — RISK-* IDs with severity + mitigation + owner.
12. `16_REQUIREMENTS_TRACEABILITY_MATRIX.md` — REQ ↔ WP ↔ AC ↔ TEST ↔ evidence.
13. `17_FINAL_READINESS_REVIEW.md` — scoring + canonical status label.
14. `18_STACK_CONTRACT_AND_PRODUCTION_STANDARDS.md` — cross-cutting Cloudflare + Next 16 + Better Auth + D1 + R2 + DO + Queue + Email decisions.
15. `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` — librarian citations + adversarial matrix + perf evaluator contract.
16. `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md`, `10_BLAST_RADIUS_AND_DEPENDENCIES.md`, `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md`, `05_UX_UI_ACCESSIBILITY_PLAN.md`, `00_AGENT_COORDINATION.md`, `LOOP_LEDGER.md`.

## Blocked decisions

Recorded in `17_FINAL_READINESS_REVIEW.md` and `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md`. Headline blocking unknowns are expected to include:

- Whether the implementation team prefers a full Cloudflare-native remediation vs an incremental remediation while keeping the current Cloudflare-only runtime.
- Whether the audit's findings will be remediated in one batch PR or sliced by surface (HTTP / Server Actions / D1 / R2 / DO / Email / AI surfaces).
- Whether Workers Observability's sampling rate is high enough to catch P0 events; `OPEN-*` IDs will track this.
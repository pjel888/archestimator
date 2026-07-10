# Plan Pack: middleware → proxy Migration

**Date:** 2026-07-09 (Asia/Manila)
**Profile:** exhaustive (auth-adjacent + Cloudflare provider + app-authorization)
**Scope:** `planning-only` — no permanent changes authorized; experiments are reversible
**Status:** **ARCHIVED 2026-07-10** — Phase 1 (owner-delegable doc actions) complete; DEC-001 (do not rename `src/middleware.ts`) is locked in source and regression test. Phases 2-4 remain blocked upstream on `@opennextjs/cloudflare` adding `proxy.ts` support. Re-activate by moving this folder back to `.ai/03_plans/` if the upstream blocker clears.
**Verification mode:** `emulated` (single-agent planning; independent reviewer recommended before any implementation)

---

## TL;DR

The `bun dev` deprecation warning is **benign and intentional**. The current `src/middleware.ts` is the result of a 2-day investigation (Jul 7–8, 2026) where Philip renamed to `src/proxy.ts`, the OpenNext Cloudflare runtime broke, and he reverted. Until OpenNext Cloudflare (currently `@opennextjs/cloudflare` 1.20.1) supports the renamed `proxy.ts` convention, this warning must be tolerated.

**Recommended action:** document the decision in-source, monitor OpenNext releases, update stale state-doc entries. Do NOT rename the file blindly.

---

## Entrypoint Reading Order

1. This README
2. [`01_EXECUTIVE_SUMMARY.md`](01_EXECUTIVE_SUMMARY.md) — 5-minute decision brief
3. [`03_SOURCE_AND_CODEBASE_AUDIT.md`](03_SOURCE_AND_CODEBASE_AUDIT.md) — git evidence
4. [`10_BLAST_RADIUS_AND_DEPENDENCIES.md`](10_BLAST_RADIUS_AND_DEPENDENCIES.md) — the 13-file impact
5. [`15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md`](15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md) — ADR + RALPLAN-DR
6. [`17_FINAL_READINESS_REVIEW.md`](17_FINAL_READINESS_REVIEW.md) — verdict

For implementation (when unblocked): [`11_IMPLEMENTATION_PLAN.md`](11_IMPLEMENTATION_PLAN.md)

---

## Plan Pack File Index

| File | Purpose |
|---|---|
| `README.md` | This entrypoint |
| `LOOP_LEDGER.md` | Archestimator loop contract (DISCOVER→PLAN→EXECUTE→VERIFY→RECORD→DECIDE) |
| `00_AGENT_COORDINATION.md` | Master goal, agent lanes, shared ledger |
| `01_EXECUTIVE_SUMMARY.md` | TL;DR for reviewers |
| `02_FEATURE_BRIEF_AND_SCOPE.md` | User request, scope, non-goals |
| `03_SOURCE_AND_CODEBASE_AUDIT.md` | Current-state map + git history evidence |
| `04_REQUIREMENTS_SPECIFICATION.md` | Stable REQ-IDs |
| `05_SCORECARD.md` | Initial + final scorecard (per Improve-Plan-Prompt Phase 2) |
| `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` | Current vs target architecture |
| `07_SOURCE_AUTHORITY_AND_CONTRADICTIONS.md` | Source hierarchy + conflict resolution |
| `08_SECURITY_PRIVACY_THREAT_MODEL.md` | Auth gate implications |
| `10_BLAST_RADIUS_AND_DEPENDENCIES.md` | 13-file impact map |
| `11_IMPLEMENTATION_PLAN.md` | Phased work (4 phases, conditional) |
| `12_TEST_AND_VALIDATION_STRATEGY.md` | Test execution matrix |
| `14_RISK_REGISTER.md` | Risk table |
| `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` | RALPLAN-DR summary + ADR |
| `16_REQUIREMENTS_TRACEABILITY_MATRIX.md` | REQ ↔ WP ↔ AC ↔ TEST |
| `17_FINAL_READINESS_REVIEW.md` | Readiness verdict |
| `18_STACK_CONTRACT_AND_PRODUCTION_STANDARDS.md` | Next.js 16 / OpenNext 1.20.1 / Cloudflare |
| `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` | Experiment results |
| `evidence/` | Captured git logs, OpenNext source, command outputs |

**Explicitly skipped** (not applicable to a file-rename plan; see traceability matrix):
- `05_UX_UI_ACCESSIBILITY_PLAN.md` — no UI change
- `07_DATA_DATABASE_API_NETWORK_PLAN.md` — no data layer change
- `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` — no measurable runtime delta
- `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` — no rollout (blocked at planning stage)

---

## Master Decision

**DEC-001:** Do NOT rename `src/middleware.ts` → `src/proxy.ts` at this time. The `middleware` deprecation warning emitted by Next.js 16.2.10 on `bun dev` is benign, intentional, and the result of a verified OpenNext Cloudflare 1.20.1 runtime constraint. The decision is documented in commit `5558c5fa4` (Philip Lewis, 2026-07-08) and the existing test lock-in (`tests/vitest/proxy-file-convention.test.ts`) is correct behavior, not technical debt.

See [`15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md`](15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md) for the full ADR including alternatives considered.

---

## Owner-action gate

This plan recommends three **immediate, low-risk, owner-delegable** documentation actions (Phase 1) and four **future, blocked** implementation phases (Phases 2–4). No source/test/config edits are within the current task scope (`planning-only`).

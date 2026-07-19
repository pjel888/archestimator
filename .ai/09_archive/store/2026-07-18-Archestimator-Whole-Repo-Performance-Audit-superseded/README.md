# 2026-07-18 Archestimator Whole-Repo Performance Audit

**Canonical entrypoint:** [`00-PLAN.md`](00-PLAN.md) — outcome, scope, requirements, 17 execution units, status, next runnable action.
**Audit commit:** `a41a07d0143abf72289a97cd8bd023cfa9986361` (pass 1) → reconciled at HEAD `24b15e829770a78dbb2258ef65f5b955aad22376` (pass 2 — see `12-DRIFT-RECONCILIATION-PASS2.md`).
**Pack status:** `CONDITIONALLY_READY` / `NOT_STARTED` / `NOT_EVALUATED` · `next_unit: UNIT-001`. Planning only; no implementation has been authorized.
**Validator:** `bun run validate:plan-pack` PASS (run from repo root; manifest at `plan-pack.json`).
**Mode:** read-only audit + planning. No production code, migrations, infrastructure, dependencies, or deployment settings were modified; only files under this folder were authored.

## File index

See [`PACK-MANIFEST.md`](PACK-MANIFEST.md) for the full file registry with role labels (normative / research / reference) and topic ownership. See [`00-PLAN.md` §10 Reading Order](00-PLAN.md) for the recommended traversal.

## Headline findings

- **P0 — PERF-CI-001** (`UNIT-001`): `.github/workflows/` empty; README claims CI active.
- **P1 — PERF-OBS-001** (`UNIT-002`): web-vitals write amplification (5-11 D1 writes/page-view) + `pagehide` listener leak.
- **P1 — PERF-AUTH-001** (`UNIT-010`): `disableCookieCache: true` forces 3 D1 reads per authenticated request.
- **P2 — 9 findings** covering D1 N+1s (UNIT-004, UNIT-009), cron write-amp (UNIT-005), DO hibernation + backpressure (UNIT-006, UNIT-007), React memo/provider-scope gaps (UNIT-003, UNIT-012), XLSX memory (UNIT-008), recipient email (UNIT-011).
- **P3 — 4 findings** covering D1 EXPLAIN-gated candidates (UNIT-013, UNIT-014), dead code (UNIT-017), docs/scripts drift (UNIT-015, UNIT-016).

Totals: 16 actionable findings (1 P0 / 2 P1 / 9 P2 / 4 P3), 4 rejected, all 16 re-verified against fresh HEAD in pass 2.

## Sibling packs (do not duplicate)

- [`2026-07-18-Whole-App-Consistency-Audit`](../2026-07-18-Whole-App-Consistency-Audit/) — logical/factual/feature bugs. Their F-01 (`laborUnitCost` divergence) is being executed concurrently and touches `src/lib/` files this pack reads — see `12-DRIFT-RECONCILIATION-PASS2.md`.
- [`2026-07-18-Codebase-Improve-Audit-Plan-Pack`](../2026-07-18-Codebase-Improve-Audit-Plan-Pack/) — broad `/improve` backlog. Their Plans 021, 022, 023 correspond to this pack's UNIT-011, UNIT-003, UNIT-004. This pack confirms those plans are still valid at HEAD; it does not supersede them.

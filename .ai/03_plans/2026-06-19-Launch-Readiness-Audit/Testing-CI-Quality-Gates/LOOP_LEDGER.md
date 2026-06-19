# LOOP_LEDGER — Testing, CI & Quality Gates (Launch Readiness)

Seeded by the adversarial verification pass, 2026-06-19. High-blast-radius (release /
quality-gate). An implementer continues from EXECUTE. Codex review gate applies to the
`ci.yml` and `package.json` `validate` changes (release surface).

**Launch-blocker count: 2** — TESTING-01 (CI disabled, dark on main ~1 month),
TESTING-02 (`validate` red-by-construction; scope wider than prior audit thought).

---

## DISCOVER
- Prior audit `01-AUDIT-FINDINGS.md` filed 8 findings (TESTING-01..08). Verifier reproduced
  every cited command/file from disk.
- New evidence beyond prior audit:
  - **Root cause of TESTING-01 proven:** `gh workflow list --all` → `CI disabled_manually`.
    2731 commits on origin/main since the last run (2026-05-18); Actions enabled; repo live.
  - **TESTING-02 scope widened:** `validate` (package.json:56) chains FOUR gate commands —
    `type-check`(pass) + `lint`(6 err) + `lint:design-system`(fail) + `lint:design`(exit 2,
    21 anti-patterns; prior audit MISSED this) + `test`(unit) + `test:dom`(hang phase).
  - **TESTING-08 refuted:** unit tests import `bun:test`, not `vitest` — no compat coupling.

## PLAN
- See `02-REMEDIATION-PLAN.md`. Sequence: P0-A (make `validate` exit 0, 5 steps) →
  P0-B (re-enable CI + prove one green run + add timeout) → P1 (CI robustness) →
  P2 (auth e2e doc + type-check tests) → P3 (coverage baseline).
- Owner decisions logged in the plan: (1) de-gate `lint:design`/`lint:design-system` from
  `validate`? (recommend yes), (2) Actions minutes budget + PR-only vs push, (3) auth-e2e in
  beta scope?

## EXECUTE  — NOT STARTED (verification was read-only; no source changed)
Suggested first executable slice (smallest green path):
1. `eslint.config.mjs`: add `".gitnexus/**"` to globalIgnores (TESTING-04). Verify local
   lint red drops 6→3.
2. Fix 3 react-hooks errors (TESTING-02 Step 1): `useLiquidGlassRefraction.ts:118,122`,
   `projects-page-client.tsx:691`. Verify `bun run lint` exit 0.
3. Resolve design lints OR (recommended) de-gate `lint:design`+`lint:design-system` from
   `validate` (package.json:56) — OWNER DECISION first.
4. `bun run build` (MUST — catches `"use server"` non-async-export) + `bun run validate` → 0.
5. Add `timeout-minutes` to `ci.yml`; `gh workflow enable CI`; push PR; confirm one green run.

## VERIFY  — pending
Proof gates per item in `03-EVIDENCE-AND-VERIFICATION.md`. The decisive gate
("CI fires + green on current main") needs an owner-gated `gh workflow enable CI` + PR push;
not provable in the read-only audit session.

## RECORD  — pending
On completion, update `.ai/10_state/current-state.md:25-28` known-reds (currently STALE —
names `charts set-state-in-effect` + `ProposalExportPreviewDialog`; real reds are
`useLiquidGlassRefraction.ts`/`projects-page-client.tsx`/`MainSidebar.tsx`) and record the
CI re-enable + gate-shape decision in `.ai/10_state/decisions.md`.

## DECIDE  — pending
- GO criteria for the gate: `bun run validate` exit 0 locally + `bun run build` exit 0 + one
  green CI run on a PR against current main.
- If owner keeps design audits in `validate`: budget the impeccable/icon work (P0-A Steps 2-3).
- If Actions minutes are the original disable reason: scope CI to `on: pull_request` only.

---

## Audit-pass status
| Finding | Verdict | Sev (final) | Blocker | overlap |
|---|---|---|---|---|
| TESTING-01 | confirmed (root cause proven) | critical | yes | partial:2026-06-14-Codebase-Cleanup-Plan |
| TESTING-02 | adjusted (scope widened) | high | yes | stale:current-state.md |
| TESTING-03 | confirmed | high | no | partial:2026-06-14-Codebase-Cleanup-Plan |
| TESTING-04 | confirmed | medium | no | none |
| TESTING-05 | confirmed | high | no | none |
| TESTING-06 | confirmed | medium | no | none |
| TESTING-07 | confirmed | low | no | none |
| TESTING-08 | refuted (evidence false) | info | no | none |

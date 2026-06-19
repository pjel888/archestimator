# LOOP LEDGER — Bundle & Asset Optimization (Launch Readiness)

Pack: `.ai/03_plans/2026-06-19-Launch-Readiness-Bundle-And-Asset-Optimization/`
Domain: Bundle & Asset Optimization · Stage: pre-launch closed-beta MVP
**Launch-blocker count (this domain): 0**

Seeded by the adversarial-verification pass on 2026-06-19. Ready for an implementer to
continue. Write surface = this folder only; source is READ-ONLY for the audit pass.

---

## DISCOVER

- Inherited `01-AUDIT-FINDINGS.md` (6 findings BUNDLE-01..06) + `00-README.md`.
- Re-collected all cited evidence read-only: phosphor split (111 ssr / 6 barrel, 3 of
  which are type-only), `three` import sites (0 real), `d3` import sites (1: `d3-shape`),
  `public/**` orphan greps, `globals.css` sidebar-texture, `@firecms/neat` package.json,
  exceljs boundary.
- Reconciled against prior `2026-06-14-Overall-Site-Performance-And-Optimization`
  (files 05 + 09; items AS03/AS04/AS09, PERF-BN-08).

## PLAN

- Wrote `02-REMEDIATION-PLAN.md`: 5 sequenced items (2 dep removals → asset sweep →
  optional phosphor normalize → optional treemap baseline). All low-blast-radius,
  reversible; per `00-README` loop-surface = lightweight in-session loop, no Codex gate.

## EXECUTE

- None (audit/verification pass only; no source edited).

## VERIFY

- Wrote `03-EVIDENCE-AND-VERIFICATION.md`. Verdicts:
  - BUNDLE-01 CONFIRMED (medium) — overlap corrected `none → stale:2026-06-14`
    (prior pack wrongly called `three` a deferred transitive dep of neat).
  - BUNDLE-02 CONFIRMED (low) — overlap `partial:2026-06-14` correct.
  - BUNDLE-03 CONFIRMED (low) — broadened to absorb sidebar-BG.png.
  - BUNDLE-04 **REFUTED** as stated → downgraded medium→low, folded into BUNDLE-03.
    `--sidebar-texture` var is never consumed; `sidebar-BG.png` is an orphan, NOT on the
    authed critical path. Prior AS04 critical-path framing is stale.
  - BUNDLE-05 CONFIRMED (low) — scope tightened to 3 value-import files.
  - BUNDLE-06 CONFIRMED (info).
- Honest gaps: no webpack treemap, no Lighthouse/RUM this session.

## RECORD

- Two stale prior-pack assessments documented (three-transitive-of-neat; sidebar-BG
  painted by SidebarHeader.tsx). At implementation time, record accepted actions in
  `.ai/10_state/decisions.md`.

## DECIDE

- No launch blockers in this domain. Recommended order for an implementer:
  1. [S] Remove `three` + `@types/three` (`package.json`, `bun.lock`) → `bun install` +
     `type-check`. (BUNDLE-01)
  2. [S] Add `d3-shape` + `@types/d3-shape` direct; drop `d3` + `@types/d3` after grep
     gate. (BUNDLE-02) — same `bun install` as #1.
  3. [S] `git rm` confirmed orphans incl. `sidebar-BG.png`; remove dead
     `--sidebar-texture` line in `globals.css`; boot `/`,`/workshop`,`/share`. (BUNDLE-03/04)
  4. [S, optional] Normalize 3 phosphor value-imports to `/dist/ssr`. (BUNDLE-05)
  5. [M, optional/post-launch] `ANALYZE=true next build --webpack` baseline + recipe.
     (BUNDLE-06)
- Proof gates: `bun run type-check` (NOT full `bun run validate` — known-red on main for
  unrelated reasons); per-file `grep -rF` zero-reference proof before each delete; existing
  `tests/vitest/project-dashboard-charts-ui.test.ts` guards the d3-shape import.
- Open status: NOT STARTED (implementation deferred; this is the audit baseline).

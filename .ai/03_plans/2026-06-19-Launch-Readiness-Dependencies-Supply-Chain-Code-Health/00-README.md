# 2026-06-19 Launch-Readiness Audit — Dependencies, Supply-Chain & Code-Health

**Status:** AUDIT (read-only). Deletable plan-pack header. Part of the 2026-06-19
Launch-Readiness Audit (one pack per domain; this is domain 12).

## Exact owner job

Philip is taking Archestimator from pre-launch closed-beta into exposure to real
(invited) users. This pack answers one question for **domain 12 only**: *are the
project's third-party dependencies, supply-chain posture, and code-health hygiene
safe enough to expose to closed-beta users, and what must change first?* It audits
dependency versions/known-vulns, the `@firecms/neat` patch maintenance risk,
`trustedDependencies`/`ignoreScripts` posture, license risk, dead/undeclared
dependencies, type-escape hatches (`as any`/`@ts-ignore`), stray root files, and
repository/boundary integrity.

## Routes / screens affected (by remediation, not by the audit)

- None directly. Dependency removals (`three`, `class-variance-authority`) and the
  `d3`→`d3-shape` swap are **build-graph / bundle** changes; the only runtime-visible
  surface is the landing hero (`@firecms/neat`) and charts (`d3-shape`,
  `CostDonutChart`). Type-hygiene and stray-file removals are not user-visible.

## Non-goals

- CSP/headers/nonce pipeline (domain 7), auth/middleware mechanism (domain 1),
  RLS/RPC (domain 2), bundle-size *measurement* and code-splitting (domain 6),
  test/CI gate redness (domain 10). Cross-domain observations are recorded in
  `cross_domain_notes`, not acted on here.
- Re-litigating the 2026-06-14 Codebase-Cleanup-Plan. This pack **reconciles** with
  it: where that plan already diagnosed an item (F20–F24) and it is still unshipped,
  this pack re-confirms current state and flags it as a launch-relevant carry-over,
  not a new discovery.
- Design/a11y enforcement (DESIGN.md is an alpha guide).

## Files expected to change during remediation

- `package.json`, `bun.lock` — remove `three`/`@types/three`/`class-variance-authority`;
  add `d3-shape` (+ drop `d3`/`@types/d3` after the swap proof).
- `test-table.tsx` (repo root) — delete (stray scratch file).
- `patches/@firecms%2Fneat@0.8.0.patch` — only if the `paused` feature is upstreamed
  or `@firecms/neat` is upgraded past 0.8.0.
- No `src/**` runtime logic changes are required by this pack's findings (the
  `d3`→`d3-shape` swap is already done in source; only `package.json` lags).

## Validation gate

`bun install --frozen-lockfile` (after edits: `bun install`) →
`bun run type-check` → `bun run build` → charts smoke (`CostDonutChart`) →
`bun run test:dom` (scoped). Rollback = revert `package.json` + `bun.lock`.
Note `bun run validate` is known-red on main for unrelated reasons (charts
set-state-in-effect; ProposalExportPreviewDialog design-lint) — see domain 10; do
not treat that pre-existing red as caused by these changes.

## Deletion criteria (if Philip rejects this pack)

Delete this folder. No source files were modified by the audit, so there is nothing
to revert. Findings are advisory.

## Loop-surface selection

Low blast radius. Dependency removals and the lockfile add are **medium-risk
build-graph** changes (a real-install + build + charts-smoke + scoped test:dom is
the proportional gate); a dated LOOP_LEDGER is not required unless remediation is
bundled with other high-blast-radius work. Stray-file deletion and type-hygiene are
trivial/reversible.

## Durable-state path

`.ai/10_state/current-state.md` (append a short entry when remediation lands).
Evidence and findings live in this folder (`01-AUDIT-FINDINGS.md`).

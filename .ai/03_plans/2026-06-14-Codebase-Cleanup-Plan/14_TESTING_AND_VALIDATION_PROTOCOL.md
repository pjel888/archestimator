# 14 — Testing and Validation Protocol

Map each cleanup phase to the **smallest sufficient** gate. Pre-launch bias: targeted validation over ceremony — but never skip security/RLS/export/share/auth validation when those surfaces are touched.

## Baseline (this audit, 2026-06-14)

| Gate | Result |
|---|---|
| `bun run type-check` | PASS |
| `bun run build` | PASS |
| `bun run test` (unit) | PASS (9) |
| `bun run lint` | FAIL (65 errors / 409 warnings — pre-existing, mostly test files) |
| `bun run lint:design-system` | FAIL (`ProposalExportPreviewDialog`) |
| `bun run test:dom` | FAIL (2/2200: `estimate-sheet-version-control-ui`, `proposal-export-preview`) |

> Record the post-cleanup delta against this baseline. A cleanup must not introduce NEW failures; it may legitimately leave the 2 pre-existing dom failures + lint debt untouched (those are separate fix-forward items, CLEAN-F40). **Do not let pre-existing red gates mask cleanup regressions** — diff the failing-test set, don't just check exit codes.

## Validation tiers

**Tier 0 — Static sanity** (every phase)
```bash
bun run type-check
bun run lint            # compare error count to baseline (65); must not increase
bun run lint:design-system
bun run build
```

**Tier 1 — Unit/DOM** (any code/test change)
```bash
bun run test
bun run test:dom        # compare failing set to baseline (the 2 known); must not grow
```

**Tier 2 — Route/API smoke** (route/API/landing changes)
```bash
bun run test:e2e            # needs dev server + Supabase local + auth; many specs env-gated
bun run test:e2e:perf
# minimum for landing cleanup (F03/F12/F13): npx playwright test e2e/landing-audit.spec.ts
```

**Tier 3 — Storybook/design governance** (any story/UI-primitive change — required for F15)
```bash
bun run storybook:validate   # check-components + check-boundary + static build
```

**Tier 4 — DB/RLS prove** (only the relevant ones, only when DB scope touched — P4/P5)
```bash
bun run prove:unify-kinds            # before/with the staged unification work
bun run prove:rls-initplan
bun run prove:estimate-tabs-rls
bun run prove:estimate-list-summaries
bun run prove:notification-rls
```

**Tier 5 — Launch/readiness** (only if cleanup touches launch surfaces — needs live providers)
```bash
bun run launch:verify-hosted-auth
bun run launch:verify-hosted-export
bun run launch:verify-hosted-sensitive-routes
bun run launch:supabase-readiness
# (+ other launch:* as the touched surface requires)
```

**Tier 6 — Performance regression** (after dependency/landing/route cleanup)
```bash
bun run perf:check-routes
bun run perf:measure-routes
bun run perf:check-speed-insights   # note: this script targets a removed pkg (F39) — interpret carefully
```

## Phase → minimum gate

| Phase | Minimum gate | Add if applicable |
|---|---|---|
| P0 safe code deletes (F01–F13, F27 comp) | Tier 0 + Tier 1 | Tier 2 `landing-audit` for F03/F12/F13 |
| P1 MVP cuts (F07,F15,F17,F18,F25,F26) | Tier 0 + Tier 1 | Tier 3 for F15; Tier 2 for AI/landing |
| P2 deps (F20–F24) | Tier 0 + Tier 1 | charts smoke for F21; Tier 6 |
| P3 server/domain (F04–F06,F08,F14,F16,F19,F28) | Tier 0 + Tier 1 | targeted share/charts/export tests; Tier 2 share smoke for F14 |
| P4 DB dry-run (F29,F30) | Tier 4 (ephemeral PG) + dry-run readback | — |
| P5 hosted DB | Tier 4 + Tier 5 (auth/share/export/estimate/library/charts) | dump/export first |
| P6 docs/scripts (F33–F39) | Tier 0 + Tier 1 (doc-structure tests) | — |

## Cleanup-guard tests (must stay green throughout)
`reset-baseline`, `landing-amigo-redesign`, `vercel-web-analytics-integration`, `workshop-library-consolidation-ui`, `project-chrome-streaming`, `ensure-default-workspace-cache`, `estimate-tree-data` (P3). They prove the dead code stays gone.

## Per-finding gate quick-reference
See the "Validation Gate" column in `04_DELETION_CANDIDATE_MATRIX.md` and `evidence/findings-index.md`.

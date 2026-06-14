# 10 — Test / Storybook / Script / Tooling Cleanup Audit

Full classification map in `evidence/test-coverage-cleanup-map.md`. Tests are **classified, not deleted**, in this audit. Buckets: KEEP_CRITICAL · KEEP_UNTIL_REPLACED · DELETE_WITH_FEATURE · REWRITE_AFTER_CLEANUP · ARCHIVE_EVIDENCE_ONLY · OWNER_GATE.

## Required table (representative — full list in evidence map)

| Test/Story/Script | Current Purpose | Still Valid? | Obsolete Behavior? | Cleanup Coupling | Delete/Rewrite/Keep | Validation Gate | Decision |
|---|---|---|---|---|---|---|---|
| `tests/unit/reset-baseline.test.ts` | enforce workshop-homebase simplification (~70 absence asserts) | Yes | guards removals | workshop/library cleanup | KEEP_UNTIL_REPLACED | bun test | KEEP |
| `tests/unit/p3-shared-link-migration-red.test.ts` | red-first→now GREEN (tables/RPCs exist) | Yes | name stale | share-link P3 | REWRITE (rename) | bun test | KEEP (rename) F39 |
| `landing-amigo-redesign.test.tsx` | assert dead landing sections ABSENT | Yes | guards F03 | landing cleanup | KEEP_UNTIL_REPLACED | test:dom | KEEP |
| `landing-interactivity.test.tsx` | imports some dead landing sections | partial | imports dead code | F03 | REWRITE_AFTER_CLEANUP | test:dom | update on F03 |
| `workshop-library-consolidation-ui.test.tsx` | assert old library tabs ABSENT | Yes | guards | library unification | KEEP_UNTIL_REPLACED | test:dom | KEEP |
| `vercel-web-analytics-integration.test.ts` | assert `@vercel/speed-insights` ABSENT | Yes | guards removal | speed-insights | KEEP_UNTIL_REPLACED | test:dom | KEEP |
| AI tests (`ai-ask-route`, `ai-package-builder-*`, `estimate-copilot-floating-button`, …) | assert routes 404 when off + behavior | Yes | only if AI cut | AI feature (F25) | KEEP_UNTIL_REPLACED → DELETE_WITH_FEATURE | test:dom | KEEP-deferred |
| `ai-auth-guard`, `ai-package-builder-security-contract`, `ai-audit-*` | AI security/audit contracts | Yes | no | security | KEEP_CRITICAL | test:dom | KEEP (even if AI UI cut) |
| estimate-unification corridor tests (`estimate-unification-oracle(.fixtures)`, `workspace-repository-estimate-tree`, `estimate-tree-data`, `estimate-node-reorder-action`, `estimate-schema-compat`) | corridor + legacy-kind compat | Yes | transitional | unification P5/P6 | KEEP_UNTIL_REPLACED | test:dom | KEEP |
| security/RLS/publication/share/legal/launch tests (large set) | security + readiness contracts | Yes | no | — | KEEP_CRITICAL | test:dom / manual | KEEP |
| `prove:*` scripts (5) | live RLS/migration proofs | Yes | no | — | KEEP_CRITICAL | prove:* | KEEP |
| `storybook-component-coverage`, `storybook-provider-boundary` | governance gates | Yes | no | storybook | KEEP_CRITICAL | storybook:validate | KEEP |
| `storybook-plan-matrix.test.ts` | asserts inventory=809/coverage=703 from archived `.md` | Yes (counts current) | brittle | F15 story removal | KEEP_UNTIL_REPLACED | test:dom | KEEP (update with F15) |
| story-only component stories (6) | confidence-indicator/financial-total-card/timeline/status-badge/data-table/pagination | Yes (review surface) | no runtime comp | F15 | OWNER_GATE | storybook:validate | KEEP unless F15 cut |
| `check-vercel-speed-insights-readiness.ts` + `vercel-speed-insights-readiness-script.test.ts` | readiness for a REMOVED package | No | tests removed pkg | speed-insights | REWRITE_AFTER_CLEANUP | test:dom | F39 |
| `security-findings-library-tooling-contracts.test.ts` | MCP/hook command pins | drift-risk | maybe stale patterns | tooling config | REWRITE_AFTER_CLEANUP | test:dom | review (NOT a current failure) |
| `agentic-framework-routing-docs`, `closed-beta-readiness-docs`, `dbidx-repo-audit` | assert `.ai` doc structure | Yes | doc-bound | F37 plan archive | ARCHIVE_EVIDENCE_ONLY | test:dom | KEEP / update on archive |
| benchmark harness tests + scripts | perf evidence harnesses | Yes | not CI gates | — | ARCHIVE_EVIDENCE_ONLY | manual | KEEP |
| E2E specs (18; most env-flag-gated) | auth/tabs/dnd/landing/route-perf/collab/share/library | Yes | `ask-flip-package-builder-live` tied to AI | AI (F25) | KEEP_CRITICAL / KEEP_UNTIL_REPLACED | test:e2e (manual) | KEEP |

## Tests that ENFORCE cleanup (keep through the cleanup — they are the safety net)
`reset-baseline`, `landing-amigo-redesign`, `vercel-web-analytics-integration`, `workshop-library-consolidation-ui`, `project-chrome-streaming`, `ensure-default-workspace-cache`, `estimate-tree-data` (P3 "any node may own rows"). If a deletion regresses, these fail first.

## The 2 ACTUAL current `test:dom` failures (from `gates/test-dom.log` — authoritative)
1. `tests/vitest/estimate-sheet-version-control-ui.test.tsx` → "opens node activity … without named-version controls" (line 1013).
2. `tests/vitest/proposal-export-preview.test.tsx` → "surfaces export validation notes in the contents summary (P1-T2, F-20)" (line 189).
Both pre-existing, unrelated to any deletion. `proposal-export-preview` ↔ `ProposalExportPreviewDialog` (also the `lint:design-system` failure source) = fix-forward hotspot (CLEAN-F40). **Correction:** an earlier lane guessed `security-findings-library-tooling-contracts`/`storybook-plan-matrix` were failing — the log shows they are not.

## Findings
- **F39** — Retire/rewrite `check-vercel-speed-insights-readiness.ts` + its test (tests a removed package; `vercel-web-analytics-integration` already asserts absence). Rename `p3-shared-link-migration-red.test.ts` to reflect green-guard status.
- **F15 coupling** — story-only component removal must update `check-storybook-component-coverage.mjs` manifest + `storybook-plan-matrix` counts simultaneously.
- **F24** — orphan dev scripts (font-size alias, cursor benchmark, explain-list) — archive/remove after confirming not manually relied upon.

## DELETE_WITH_FEATURE
None now. AI tests convert to DELETE_WITH_FEATURE only on a formal AI cut (F25).

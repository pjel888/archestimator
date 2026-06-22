# Evidence — Findings Index

Maps every CLEAN-F finding to source files, reference analysis, matrix row, DB/package impact, tests affected, recommended phase, and validation gate. Full finding bodies live in the numbered audit docs (03–12). Matrix: `../04_DELETION_CANDIDATE_MATRIX.md`.

| ID | Title | Category | Confidence | Phase | Doc | DB? | Tests affected | Validation gate |
|---|---|---|---|---|---|---|---|---|
| CLEAN-F01 | `ProjectWorkspaceHeaderRow` + `ProjectWorkspaceProjectCode` dead | DEAD_CODE | Safe delete | P0 | 06 | no | absence enforced by `project-dashboard-core-ui`, `project-dashboard-center-column-ui` | type-check+build+test:dom |
| CLEAN-F02 | `ArchestimatorMark.tsx` orphan | DEAD_CODE | Safe delete | P0 | 06 | no | none | type-check+build |
| CLEAN-F03 | Dead landing-section graveyard (9 + exclusive deps) | DEAD_CODE | Safe delete | P0 | 06 | no | `landing-interactivity.test.tsx`, `landing-amigo-redesign` (guard) | type-check+build+test:dom+landing-audit |
| CLEAN-F04 | `cost-library-repository.ts` orphan file | DEAD_CODE | Safe delete | P0/P3 | 07 | no | none | type-check+build |
| CLEAN-F05 | `domain/estimate-totals.ts` orphan duplicate | DUPLICATE_CODE | Safe delete | P0/P3 | 07 | no | none | type-check+build |
| CLEAN-F06 | `createProject`/`deleteProject` dead wrappers | DEAD_CODE | Safe delete | P0/P3 | 07 | no | `mass-deletion-ui-contract` (guard) | type-check+build |
| CLEAN-F07 | `isFollowModeEnabled`/`readTeamspaceFeatureFlags` 0 callers | FEATURE_FLAG_DEBT | Owner gate | P1 | 07/11 | no | none | type-check (after follow-mode decision) |
| CLEAN-F08 | `componentLibraryDatasetVersion` 0 callers | UNUSED_EXPORT | Safe delete | P0/P3 | 07 | no | none | type-check+build |
| CLEAN-F09 | `EstimateDragIntent`/`EstimateDragType` unused type exports | UNUSED_EXPORT | Safe delete | P0 | 06 | no | none | type-check |
| CLEAN-F10 | stale `revalidatePath("/workshop/components")` ×2 | DEAD_CODE | Safe delete | P0 | 05 | no | none | type-check+build |
| CLEAN-F11 | `/workshop/onboarding` redirect shim + loading | ROUTE_DEBT | DELETE_AFTER_LOCAL_PROOF | P0/P3 | 05 | no | none | build+manual error-path check |
| CLEAN-F12 | public asset cleanup (~9.9 MB) | ASSET_DEBT | Safe delete | P0 | 11 | no | none | build+visual landing check |
| CLEAN-F13 | dead CSS (`halftone-*`, `arch-sketch-line`) | ASSET_DEBT | Safe delete | P0 | 11 | no | none | build+landing-audit |
| CLEAN-F14 | `/api/share/[token]/events` no client caller | API_DEBT | Likely dead | P0/P3 | 05 | no | 3 publication route/security tests | test:dom+share contract |
| CLEAN-F15 | story-only UI primitives (6) | UNUSED_EXPORT | Owner gate | P1 | 06/10 | no | their stories + `storybook-plan-matrix` + coverage manifest | storybook:validate |
| CLEAN-F16 | test-only exports (charts oracles, telemetry, retention) | UNUSED_EXPORT | Stale but referenced | P3 | 07/10 | no | chart/publication/version tests use them as oracles | test:dom (rewrite tests) |
| CLEAN-F17 | `aec-classification` module test-only/speculative | MVP_SCOPE_CUT | MVP-cut candidate | P1 | 07 | no | `aec-classification.test.ts` | type-check (owner decision) |
| CLEAN-F18 | `ab-testing/results-calculator.ts` test-only | DEAD_CODE | Likely dead | P1/P3 | 07 | no | `landing-ab-testing.test.tsx` | test:dom |
| CLEAN-F19 | AI `read-context.ts` inline `calculateEstimateRowTotal` dup | DUPLICATE_CODE | Stale but referenced | P3 (if AI kept) | 07 | no | AI tests | test:dom (AI on) |
| CLEAN-F20 | remove `three` + `@types/three` | UNUSED_DEPENDENCY | Safe delete | P2 | 09 | no | none | type-check+build |
| CLEAN-F21 | replace `d3`→`d3-shape` + remove `@types/d3` | UNUSED_DEPENDENCY | Safe delete | P2 | 09 | no | charts tests | type-check+build+charts |
| CLEAN-F22 | remove `class-variance-authority` | UNUSED_DEPENDENCY | Likely dead | P2 | 09 | no | none | type-check+build (re-confirm grep) |
| CLEAN-F23 | add missing `server-only`, `d3-shape` | CONFIG_DEBT | Safe (additive) | P2 | 09 | no | none | type-check+build |
| CLEAN-F24 | script hygiene (font-size alias, orphan dev tools) | UNUSED_SCRIPT | Likely dead | P2/P6 | 10 | no | none | n/a |
| CLEAN-F25 | AI surface keep-deferred vs cut | MVP_SCOPE_CUT | Owner gate | P1 | 05/07/08/11 | tables (audit) | many AI tests | owner decision |
| CLEAN-F26 | follow mode / project page cursors deferred | FEATURE_FLAG_DEBT | Owner gate | P1 | 06/11 | no | collaboration tests | owner decision |
| CLEAN-F27 | revision-intelligence / proposal-comparisons doc-only; `ProductPreviewVariants` dead | STALE_DOC / DEAD_CODE | MVP-cut / Safe delete | P0(code)/P6(doc) | 06/12 | no | `landing-interactivity.test.tsx` | test:dom + doc edit |
| CLEAN-F28 | `BulkActionToolbar` duplicate (workshop vs ui) | DUPLICATE_CODE | Owner gate | P3 | 06 | no | bulk-action tests | test:dom (after migrate 3 callers) |
| CLEAN-F29 | `profile_role_hardening_audit` table drop | DB_SCHEMA_DEBT | Owner gate (destructive) | P4/P5 | 08 | DB-HOSTED-DESTRUCTIVE | none | dump + post-beta migration |
| CLEAN-F30 | `resolve_app_role_for_email` RPC drop | RLS_RPC_DEBT | Owner gate (destructive) | P4/P5 | 08 | DB-HOSTED-DESTRUCTIVE | none | live `\df` verify + migration |
| CLEAN-F31 | `get_project_chart_buckets` deployed-dormant | DB_SCHEMA_DEBT | Keep | — | 08 | DB-KEEP | charts tests | n/a |
| CLEAN-F32 | version-control RPCs dormant (corridor) | DB_SCHEMA_DEBT | Keep | — | 08 | DB-KEEP | version-control tests | n/a |
| CLEAN-F33 | README stale counts | STALE_DOC | Safe (doc) | P6 | 12 | no | none | doc edit |
| CLEAN-F34 | `features/page.tsx` mislabels Excel export as Planned | STALE_DOC | Safe (doc) | P6 | 12 | no | none | doc edit + build |
| CLEAN-F35 | README collaboration "Available" overstates | STALE_DOC | Safe (doc) | P6 | 12 | no | none | doc edit |
| CLEAN-F36 | stale comments (`ProjectEstimatesClient` backout aid; publication Docker-blocked) | STALE_DOC | Safe (comment) | P6 | 12 | no | none | type-check |
| CLEAN-F37 | archive implemented/superseded plans; list 5 active plans in README | STALE_DOC | Safe (doc) | P6 | 12 | no | `agentic-framework-routing-docs`, `closed-beta-readiness-docs` (verify) | doc edit + test:dom |
| CLEAN-F38 | brand specs mark revision/proposal as planned | STALE_DOC | Safe (doc) | P6 | 12 | no | none | doc edit |
| CLEAN-F39 | speed-insights readiness script tests removed pkg; rename green p3 test | STALE_DOC / REWRITE | Rewrite | P6 | 10 | no | speed-insights script test, p3-red test | test:dom |
| CLEAN-F40 | 2 failing dom tests + lint debt (pre-existing) | (context) | Fix-forward (not cleanup) | P0-adjacent | 14/16 | no | `estimate-sheet-version-control-ui`, `proposal-export-preview` | test:dom + lint |

## Cross-references

- Route/API rows → `route-api-inventory.md`
- DB objects → `database-object-inventory.md`
- Packages → `dependency-analysis.md`
- Flags → `feature-flag-inventory.md`
- Tests → `test-coverage-cleanup-map.md`
- No-ref/test-only/story-only/dynamic → `import-reference-index.md`

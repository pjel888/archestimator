You are auditing the Archestimator codebase for whole-app cleanup, dead code removal, deprecated code removal, obsolete feature removal, unused dependency cleanup, stale migration/schema cleanup, duplicate abstraction cleanup, and pre-launch MVP simplification.

This is NOT a coding task.
This is NOT an implementation task.
This is NOT a refactor task.
This is an audit, planning, deletion-readiness, migration-readiness, and validation-design task.

Your output must be a complete cleanup audit and planning pack written to:

/Users/philiplewis/Documents/archestimator/.ai/03_plans/2026-06-14-Codebase-Cleanup-Plan

Do not create files outside that folder except temporary local evidence files if absolutely required for measurement, and copy/summarize all relevant evidence back into the plan folder.

Repository assumption:
- Local repo root: /Users/philiplewis/Documents/archestimator
- GitHub repo: pjel888/archestimator
- Default branch: main
- Product: Archestimator, contractor-first construction estimating/proposal/collaboration SaaS
- Stack: Next.js App Router, React, Bun, TypeScript, Supabase/Postgres/RLS, TanStack Query, Zustand, D3, React Complex Tree, Playwright, Vitest, Bun tests, Vercel
- Current product stage: pre-launch MVP, no external users yet

Important posture:
Archestimator is pre-launch. Prefer cleanup, deletion, consolidation, schema simplification, and removal of unused/deprecated code over preserving speculative backward compatibility. Do not keep code “just in case.” If code is unreachable, superseded, stale, duplicated, or not aligned with the current MVP, classify it for removal.

However:
- This specific task is audit/planning/readiness only.
- Do not implement deletions yet.
- Do not edit application source files.
- Do not remove files yet.
- Do not change package.json yet.
- Do not apply production migrations yet.
- Do not mutate Supabase/Vercel/GitHub/DNS/provider settings.
- Do not expose secrets.
- Do not touch SlateCamp or unrelated provider projects.
- Do not enable paid add-ons.
- Do not perform irreversible destructive data loss without a clearly documented recovery path and explicit owner gate.

You may propose code deletions, dependency removals, test removals, env var removals, storage cleanup, RPC/table/column cleanup, and migration candidates. For database cleanup, produce migration-readiness plans and local dry-run protocols. Separate “safe to delete now” from “requires destructive migration gate.”

Critical rule:
Audit the current source truth, not stale assumptions. Begin by reading the repo state and existing planning/state docs before drawing conclusions.

Read these first:
1. README.md
2. package.json
3. next.config.ts
4. tsconfig.json
5. eslint.config.* or eslint configuration files
6. src/app/layout.tsx
7. src/app/providers.tsx
8. src/proxy.ts
9. .ai/03_plans/README.md
10. .ai/10_state/current-state.md
11. .ai/10_state/decisions.md
12. .ai/10_state/known-issues.md
13. .ai/02_audits/2026-05-17-reset-cleanup-audit.md, if present
14. .ai/06_specs/restart-guardrails.md, if present
15. Existing cleanup, reset, archive, route-transition, database-indexing, library, estimates-list, teamspace, share/collaboration, AI, and estimate-tree plans referenced by current state

Also inspect:
- src/app/**
- src/components/**
- src/features/**
- src/hooks/**
- src/lib/**
- src/stores/**
- tests/**
- e2e/**
- scripts/**
- supabase/migrations/**
- supabase/seed files, SQL scripts, and generated types
- storybook stories and Storybook scripts
- public assets
- config files
- .ai plans/logs/archive references
- environment variable usage
- feature flag usage
- provider readiness scripts
- patches/
- package lockfile

================================================================================
MISSION
================================================================================

Produce a comprehensive, source-grounded cleanup audit and deletion-readiness plan for the whole app.

The plan must answer:

1. What code is dead, unreachable, deprecated, duplicated, stale, superseded, or no longer MVP-aligned?
2. What files, exports, routes, components, hooks, actions, stores, scripts, tests, stories, dependencies, migrations, tables, columns, RPCs, policies, buckets, env vars, assets, and docs can be removed?
3. Which removals are safe immediately because they are purely local/code-level?
4. Which removals require migrations?
5. Which removals require data export, rollback SQL, or owner gate because they are destructive?
6. Which removals would improve build time, bundle size, test time, route speed, cognitive load, or future implementation velocity?
7. Which stale plans/docs should be archived, superseded, or marked historical?
8. Which legacy flags/features should be removed rather than kept hidden?
9. Which test suites are preserving obsolete behavior and should be deleted or rewritten?
10. What exact next implementation prompt should Philip run after this audit?

Do not merely list suspicious files. Prove why each candidate is dead or stale.

Every cleanup recommendation must include:
- evidence
- import/reference analysis
- route/screen/API impact
- database/schema impact, if any
- test impact
- migration impact
- risk class
- rollback strategy
- validation gate
- deletion confidence

================================================================================
OUTPUT STRUCTURE
================================================================================

Create this folder:

/Users/philiplewis/Documents/archestimator/.ai/03_plans/2026-06-14-Codebase-Cleanup-Plan

Inside it, create the following files:

1. README.md
2. CURRENT_CANONICAL_PLAN.md
3. 00_EXECUTIVE_SUMMARY.md
4. 01_AUDIT_SCOPE_AND_METHOD.md
5. 02_REPO_ARCHITECTURE_AND_CURRENT_STATE.md
6. 03_DEAD_CODE_INVENTORY.md
7. 04_DELETION_CANDIDATE_MATRIX.md
8. 05_ROUTE_API_AND_FEATURE_CLEANUP_AUDIT.md
9. 06_COMPONENT_HOOK_STORE_CLEANUP_AUDIT.md
10. 07_SERVER_ACTION_REPOSITORY_AND_DOMAIN_CLEANUP_AUDIT.md
11. 08_DATABASE_SCHEMA_MIGRATION_AND_RLS_CLEANUP_AUDIT.md
12. 09_DEPENDENCY_PACKAGE_AND_BUILD_CLEANUP_AUDIT.md
13. 10_TEST_STORYBOOK_SCRIPT_AND_TOOLING_CLEANUP_AUDIT.md
14. 11_ASSET_ENV_FLAG_AND_CONFIG_CLEANUP_AUDIT.md
15. 12_DOCS_AI_PLANS_AND_ARCHIVE_CLEANUP_AUDIT.md
16. 13_CLEANUP_SPEED_AND_COMPLEXITY_MATRIX.md
17. 14_TESTING_AND_VALIDATION_PROTOCOL.md
18. 15_MIGRATION_READINESS_AND_ROLLBACK_PLAN.md
19. 16_RISK_REGISTER_AND_BLAST_RADIUS.md
20. 17_IMPLEMENTATION_PHASE_PLAN.md
21. 18_READINESS_DECISION.md
22. 19_OPEN_QUESTIONS_OWNER_GATES.md
23. evidence/README.md
24. evidence/command-log.md
25. evidence/repo-inventory.md
26. evidence/import-reference-index.md
27. evidence/dependency-analysis.md
28. evidence/route-api-inventory.md
29. evidence/database-object-inventory.md
30. evidence/feature-flag-inventory.md
31. evidence/test-coverage-cleanup-map.md
32. evidence/findings-index.md

If you capture command outputs, JSON, screenshots, dependency graphs, SQL dry-run output, analyzer output, or test logs, place or summarize them under:

/Users/philiplewis/Documents/archestimator/.ai/03_plans/2026-06-14-Codebase-Cleanup-Plan/evidence/

Do not dump huge generated artifacts into the plan if they are too large. Instead, summarize the exact location, command, timestamp, and headline result.

================================================================================
PLAN STYLE
================================================================================

This must read like a serious deletion-readiness audit, not a generic “clean code” checklist.

Every claim must be grounded in one or more of:
- file path
- import/reference analysis
- route inventory
- TypeScript compiler output
- grep/ripgrep result
- test/build result
- dependency graph
- database/schema inspection
- existing `.ai` state/plan/log
- current feature flag/env usage
- local dry-run evidence
- clearly labeled hypothesis

Use this language discipline:
- Say “safe delete” only when reference analysis, type-check/build impact, and route ownership are clear.
- Say “likely dead” when no imports exist but dynamic usage cannot be fully ruled out.
- Say “stale but referenced” when code is still imported but only by obsolete tests/docs/flags.
- Say “MVP-cut candidate” when it works but should be removed to simplify pre-launch scope.
- Say “migration cleanup candidate” when schema/data removal is needed.
- Say “owner gate” when destructive, security-sensitive, or irreversible.
- Say “blocked” when missing env/auth/db prevents proof.
- Never mark production schema cleanup as safe without rollback/dump strategy.

================================================================================
CLEANUP FINDINGS FORMAT
================================================================================

Every finding must use this structure:

```md
### CLEAN-FXX — <short title>

Category:
- DEAD_CODE / STALE_FEATURE / DUPLICATE_CODE / UNUSED_EXPORT / UNUSED_DEPENDENCY / UNUSED_SCRIPT / UNUSED_TEST / STALE_DOC / FEATURE_FLAG_DEBT / ROUTE_DEBT / API_DEBT / DB_SCHEMA_DEBT / RLS_RPC_DEBT / ASSET_DEBT / CONFIG_DEBT / MIGRATION_DEBT / MVP_SCOPE_CUT

Severity:
- Critical / High / Medium / Low

Cleanup confidence:
- Safe delete / Likely dead / Stale but referenced / MVP-cut candidate / Needs migration proof / Owner gate / Unknown

Affected surface:
- <routes/screens/APIs/components/scripts/tables>

Current behavior:
- <what exists today>

Why this is dead/stale/removable:
- <specific evidence>

Evidence:
- <file paths, imports, command outputs, grep results, plans, tests>

References found:
- Runtime references:
- Test references:
- Storybook references:
- Docs references:
- Dynamic/string references:
- Database references:

Suggested cleanup action:
- <delete/remove/consolidate/deprecate/archive/migrate/drop>

Files likely removed:
- <paths>

Files likely modified:
- <paths>

Database changes:
- None / local migration / hosted migration / destructive migration / rollback required

Expected benefit:
- <bundle/test/build/runtime/cognitive load/MVP simplification>

Risk:
- <blast radius>

Validation gate:
- <exact commands and browser/db checks>

Rollback strategy:
- <git revert / restore migration / rollback SQL / data restore>

Deletion decision:
- DELETE_NOW / DELETE_AFTER_LOCAL_PROOF / DELETE_AFTER_MIGRATION_DRY_RUN / OWNER_GATE / KEEP_FOR_NOW
````

================================================================================
CLEANUP CATEGORIES TO AUDIT
===========================

1. Dead routes and API endpoints
   Audit all routes under src/app.

Identify:

* routes not linked anywhere
* routes hidden behind disabled flags
* routes kept for future features
* routes superseded by newer flows
* placeholder legal/privacy/terms routes that may be incomplete but must not be deleted blindly
* old onboarding redirects
* dead auth callback helpers
* inactive AI routes
* stale invite/share variants
* API handlers with no reachable UI caller
* API handlers that duplicate server actions
* sensitive routes that should stay even if low traffic

For each route/API:

* path
* route type
* linked from where
* imported by what
* feature flag/env dependency
* auth/security role
* tests
* MVP status
* delete/archive/keep decision

2. Dead components, hooks, stores, utilities
   Audit:

* src/components/**
* src/hooks/**
* src/stores/**
* src/lib/ui/**
* src/lib/domain/**
* src/features/**

Identify:

* components with no imports
* components only used in obsolete stories/tests
* UI variants superseded by design-system components
* old modal/dialog variants
* duplicate shell/skeleton/loading components
* duplicate table/list/card primitives
* dead hooks
* Zustand stores or selectors no longer used
* old navigation/performance helpers no longer used
* old share/publication helpers superseded by current implementation
* estimate tree helpers made obsolete by single-node unification corridor
* component library helpers made obsolete by library optimization
* code only used by deferred AI features
* code only used by planned-but-not-MVP features

3. Server actions, repositories, and domain logic
   Audit:

* src/lib/*/actions.ts
* src/lib/repositories/**
* src/lib/estimates/**
* src/lib/projects/**
* src/lib/component-library/**
* src/lib/project-charts/**
* src/lib/publication/**
* src/lib/share/**
* src/lib/collaboration/**
* src/lib/proposal-export/**
* src/lib/ai/**
* src/lib/auth/**
* src/lib/workshop/**

Identify:

* duplicate data access functions
* unused repository functions
* actions no longer called by forms/components
* actions only used by obsolete tests
* old DTO shapes that were replaced
* fallback compatibility paths no longer needed pre-launch
* old warning paths kept for deprecated schema states
* redundant auth/workspace/project lookup functions
* old JS-fold aggregations superseded by RPCs
* query helpers that still select obsolete columns
* event/audit helpers for removed features
* AI helpers for disabled/deferred routes
* domain functions made obsolete by the current estimate-node unification direction

4. Database schema, migrations, RPCs, RLS, and generated types
   Audit:

* supabase/migrations/**
* scripts/sql/**
* src/lib/supabase/database.types.ts
* scripts/prove-*.mjs
* RLS helper functions
* RPC functions
* tables, columns, indexes, constraints, policies, triggers
* storage buckets and policies if represented in migrations/scripts

Identify:

* tables for removed/deferred features
* columns no longer selected or written
* RPCs no longer called
* RLS helpers no longer referenced
* policies for dead routes/features
* indexes for dead queries
* old migration artifacts superseded by newer migrations
* migrations that are staged but intentionally not applied
* functions duplicated by newer helpers
* enum values or check values that are obsolete
* audit/event tables that belong to removed features
* AI tables if AI stays deferred
* A/B testing tables/logic if not MVP
* old group/area node schema debt from estimate-tree unification
* storage buckets not used by MVP surfaces

Database cleanup classification:

* DB-CODE-ONLY: generated types or query code cleanup only
* DB-LOCAL-MIGRATION: safe local migration candidate
* DB-HOSTED-ADDITIVE: hosted additive cleanup/prove step
* DB-HOSTED-DESTRUCTIVE: drop/rename/delete data, requires backup/export/rollback
* DB-OWNER-GATE: irreversible, security-sensitive, or conflicts with active plan
* DB-KEEP: security/audit/legal/launch-critical

For destructive cleanup candidates, include:

* exact object
* why it exists
* current references
* user data risk
* rollback SQL
* dump/export command
* local dry-run protocol
* hosted apply protocol
* verification SQL
* fallback plan

5. Dependencies, package scripts, patches, and build tooling
   Audit:

* package.json
* bun.lock / lockfile
* patches/**
* next.config.ts
* postcss/tailwind config
* Storybook config
* Playwright config
* Vitest config
* TypeScript config
* ESLint config
* custom scripts

Identify:

* unused runtime dependencies
* unused dev dependencies
* packages imported only by dead code
* packages imported only by deferred features
* packages too heavy for MVP
* patch files no longer needed
* scripts no longer run or superseded
* duplicate validation scripts
* launch scripts for removed features
* prove scripts for migrations/features already completed or archived
* Storybook scripts not aligned with MVP
* package scripts that should remain because they are governance gates

Use tools where possible:

* bun pm ls or equivalent
* grep/ripgrep imports
* TypeScript trace or static graph
* bunx knip, if available and used without modifying package files
* depcheck, if available and used without modifying package files
* madge/dependency-cruiser, if available and used without modifying package files

Do not add these tools to dependencies. Use ephemeral execution only.

6. Tests, Storybook, E2E, and evidence harnesses
   Audit:

* tests/unit/**
* tests/vitest/**
* e2e/**
* stories/**/*.stories.*
* scripts/prove-*
* launch check scripts
* performance scripts
* archived evidence references

Identify:

* tests asserting obsolete behavior
* tests blocking cleanup of dead features
* tests for disabled/deferred AI surfaces
* brittle tests around transitional schema states
* duplicate tests
* stale snapshots or fixtures
* Storybook stories for dead components
* E2E routes no longer part of MVP
* harnesses that should stay because they prove security/RLS/migrations
* harnesses that should be archived with completed plans

Do not delete tests in this task. Classify them:

* KEEP_CRITICAL
* KEEP_UNTIL_REPLACED
* DELETE_WITH_FEATURE
* REWRITE_AFTER_CLEANUP
* ARCHIVE_EVIDENCE_ONLY
* OWNER_GATE

7. Assets, env vars, flags, configs, and docs
   Audit:

* public/**
* src/app/globals.css
* font usage
* image imports
* env var reads
* feature flags
* Vercel/env readiness scripts
* README
* .ai docs and active plans
* old beta/prototype references
* comments that describe old architecture
* TODO/FIXME/deprecated notes
* generated docs

Identify:

* unused images/fonts/assets
* env vars no longer read
* flags permanently false/true
* deferred feature flags that should be removed for MVP
* stale comments that mislead agents
* historical plans that should be archived
* docs referencing old repo path, old app structure, Glide/prototype, or superseded features
* stale “deferred” notes that should become explicit MVP cuts

================================================================================
PRE-LAUNCH MVP CLEANUP PRINCIPLES
=================================

Use these principles when making decisions:

1. Delete speculative code.
   If the code exists only for future enterprise features, proposal comparisons, revision intelligence, inactive AI, inactive A/B tests, unused analytics, or old prototype behavior, classify it as an MVP-cut candidate.

2. Prefer one path over compatibility branches.
   No external users means less need to preserve old internal states. Compatibility branches should survive only if they protect active migration corridors or important data integrity.

3. Do not preserve dead UI because it is “nice.”
   A polished but unreachable modal/component is still dead.

4. Schema cleanup is allowed, but proof matters.
   Pre-launch allows migrations, but destructive schema/data cleanup still needs rollback, local dry-run, and clear owner gate.

5. Security, auth, audit, and confidential sharing require extra caution.
   Do not remove security headers, RLS, share-link protections, audit trails, invite protections, password lockout, auth guards, or membership floors without proving they are obsolete and replaced.

6. Active plans outrank cleanup enthusiasm.
   If current-state says a plan is active, incomplete, or owner-gated, do not delete its staged artifacts unless the plan itself is being superseded by this cleanup pack and the owner gate is explicit.

7. Tests are not sacred if they preserve dead behavior.
   Classify obsolete tests for deletion or rewrite, but preserve tests that prove security, RLS, migration safety, export correctness, and share confidentiality.

================================================================================
REQUIRED INVENTORY MATRICES
===========================

Create 04_DELETION_CANDIDATE_MATRIX.md with this table:

| ID | Candidate | Type | Path/Object | Current References | Runtime Reachability | Test/Story Reachability | Docs References | DB Impact | MVP Alignment | Deletion Confidence | Risk | Expected Benefit | Suggested Phase | Validation Gate | Decision |

Create 13_CLEANUP_SPEED_AND_COMPLEXITY_MATRIX.md with this table:

| Cleanup Area | Candidate Count | Safe Deletes | Migration Deletes | Owner-Gated Deletes | Est. LOC Removed | Est. Files Removed | Est. Dependency Reduction | Build Impact | Test Impact | Bundle Impact | Runtime Speed Impact | Cognitive Load Impact | Risk | Recommended Phase |

Create 08_DATABASE_SCHEMA_MIGRATION_AND_RLS_CLEANUP_AUDIT.md with this table:

| DB Object | Object Type | Feature Owner | Current References | Data Present? | User/Data Risk | Drop/Rename/Keep | Migration Class | Rollback Path | Local Dry Run | Hosted Gate | Decision |

Create 09_DEPENDENCY_PACKAGE_AND_BUILD_CLEANUP_AUDIT.md with this table:

| Package/Script/Patch | Type | Current Imports/Calls | Feature Owner | Runtime Needed? | Dev Needed? | Removal Risk | Bundle/Build Benefit | Test Gate | Decision |

Create 10_TEST_STORYBOOK_SCRIPT_AND_TOOLING_CLEANUP_AUDIT.md with this table:

| Test/Story/Script | Current Purpose | Still Valid? | Obsolete Behavior? | Cleanup Coupling | Delete/Rewrite/Keep | Validation Gate | Decision |

Create evidence/feature-flag-inventory.md with this table:

| Flag/Env Var | Read Locations | Default | Feature | Route/API Impact | MVP Decision | Cleanup Decision |

================================================================================
COMMAND PROTOCOL
================

In evidence/command-log.md, record every command with:

* timestamp
* command
* working directory
* env vars used, secrets redacted
* success/failure
* summary
* output artifact path
* whether result is blocking or non-blocking

Suggested local command sequence:

Step 1 — Baseline repo state:

```bash
cd /Users/philiplewis/Documents/archestimator
git status --short
git branch --show-current
git rev-parse HEAD
bun --version
node --version
```

Step 2 — Static repo inventory:

```bash
find src/app -type f | sort > .ai/03_plans/2026-06-14-Codebase-Cleanup-Plan/evidence/src-app-files.txt
find src/components src/features src/hooks src/lib src/stores -type f | sort > .ai/03_plans/2026-06-14-Codebase-Cleanup-Plan/evidence/src-code-files.txt
find tests e2e scripts supabase -type f | sort > .ai/03_plans/2026-06-14-Codebase-Cleanup-Plan/evidence/test-script-db-files.txt
```

Step 3 — Text markers:

```bash
rg -n "TODO|FIXME|deprecated|DEPRECATED|legacy|LEGACY|obsolete|OBSOLETE|remove after|delete after|temporary|TEMP|HACK|dead code|unused|compat|backcompat|fallback|feature flag|NEXT_PUBLIC_|ARCHESTIMATOR_|process\.env" . \
  --glob '!node_modules/**' \
  --glob '!.next/**' \
  --glob '!coverage/**' \
  > .ai/03_plans/2026-06-14-Codebase-Cleanup-Plan/evidence/text-marker-scan.txt || true
```

Step 4 — Import/reference scans:

```bash
rg -n "from ['\"]@/|from ['\"]\.\.?/|import\(|require\(" src tests e2e scripts \
  > .ai/03_plans/2026-06-14-Codebase-Cleanup-Plan/evidence/import-scan.txt || true
```

Step 5 — Feature flag/env scan:

```bash
rg -n "process\.env\.|NEXT_PUBLIC_|ARCHESTIMATOR_|SUPABASE_|VERCEL_|RESEND_|DEEPSEEK_|OPENAI_|PLAYWRIGHT_|PERF_|SPEED_INSIGHTS_" src scripts tests e2e next.config.* package.json \
  > .ai/03_plans/2026-06-14-Codebase-Cleanup-Plan/evidence/env-flag-scan.txt || true
```

Step 6 — Static gates:

```bash
bun run type-check
bun run lint
bun run lint:design-system
bun run test
bun run test:dom
bun run build
```

Record failures honestly. Existing failures do not invalidate the cleanup audit; they become cleanup context.

Step 7 — Optional dead-code tools, no package modification:
Use only if available and safe:

```bash
bunx knip --no-progress
bunx depcheck
bunx madge src --extensions ts,tsx --warning
```

Do not add these tools to package.json. Do not commit generated config. Capture outputs under evidence.

Step 8 — Route/API inventory:
Use filesystem inspection and grep:

```bash
find src/app -type f \( -name 'page.tsx' -o -name 'route.ts' -o -name 'layout.tsx' -o -name 'loading.tsx' -o -name 'error.tsx' \) | sort
```

Step 9 — Database object inventory:
If local Supabase is running and safe:

```bash
supabase status
```

If local DB is available, run read-only schema inventory queries only. Do not apply migrations in this audit task. Capture:

* tables
* columns
* functions/RPCs
* policies
* triggers
* indexes
* storage buckets/policies, if available

If linked hosted DB is available, do not mutate it. Read-only inspection may be used only if already configured and safe.

Step 10 — Migration-readiness dry-run protocol:
Do not apply cleanup migrations. Instead, for each migration candidate, produce:

* draft migration title
* objects affected
* before/after schema
* rollback SQL
* local dry-run command
* verification SQL
* hosted apply gate
* data backup/export requirement

================================================================================
REFERENCE ANALYSIS RULES
========================

For each candidate, inspect at least these reference classes:

1. Direct TypeScript imports
2. Dynamic imports
3. Next route filesystem conventions
4. Server action references
5. Form action bindings
6. API fetch URLs
7. Link hrefs
8. router.push/replace/prefetch references
9. Supabase RPC calls
10. Table/column string references
11. SQL migration references
12. Test imports
13. Storybook imports
14. Script imports
15. Env flag conditionals
16. Docs/.ai references
17. Generated types references
18. CSS class/data attribute references
19. Playwright selectors
20. External provider/route expectations

A file is not safe to delete merely because TypeScript imports are absent. Next.js route files, SQL, scripts, Playwright selectors, dynamic string references, and provider callbacks can be externally reachable.

================================================================================
SPECIAL ARCHESTIMATOR WATCHLIST
===============================

Pay special attention to these likely cleanup zones:

1. Deferred AI features

* /api/ai/ask
* /api/ai/package-builder
* src/lib/ai/**
* AI audit tables
* AI feature flags
* AI tests/scripts/docs
  Decision needed: keep hidden for MVP, cut entirely, or isolate as post-MVP archive.

2. A/B testing framework

* src/lib/ab-testing/**
* experiments, analytics, consent, metrics, tests
  Decision needed: MVP-critical or speculative? If speculative, classify for removal.

3. Revision intelligence and proposal comparisons
   README marks these as planned. Search for partial code, tables, docs, flags, and tests. Classify speculative remnants.

4. Estimate-tree group/area unification
   Current state says reversible corridor is partially implemented and irreversible phases are staged. Do not delete staged artifacts blindly. Classify transitional compatibility code:

* safe no-op dead code
* still needed until P5/P6
* owner-gated irreversible cleanup
* cleanup after single-node migration completes

5. Component library/templates optimization remnants
   Recent implementation may have superseded older route-refresh, prompt/confirm, loading skeleton, and P2 migration artifacts. Separate implemented cleanup from owner-gated DB scaling work.

6. Estimates list optimization remnants
   Look for old DTOs, old JS-fold summaries, old loading fallback, obsolete tests, old performance scaffolding, and temporary flags.

7. Teamspace/collaboration
   Do not remove security-critical presence, invite, identity-signature, membership-floor, or origin guard code without proof. Look for disabled page-cursor layers and deferred follow mode as MVP-cut candidates.

8. Share/publication
   Confidential shared links are sensitive. Do not remove password protection, lockout, noindex/no-referrer/security headers, recipient token controls, or audit events unless replaced.

9. Launch/readiness scripts
   Some scripts may look unused but are launch gates. Classify carefully:

* keep launch gate
* obsolete launch gate
* duplicate launch gate
* archive-only evidence script
* migration prove script still needed

10. Storybook/design-system scaffolding
    Storybook may be useful but heavy. Decide whether it is MVP-critical, design-governance-critical, or cleanup candidate.

11. Dependencies with large bundle impact
    Audit:

* three
* d3
* exceljs
* @firecms/neat
* roughjs
* rough-notation
* @next/third-parties
* Storybook packages
* icon libraries
* testing libraries
  Classify as runtime-critical, route-isolated, deferred-feature-only, or removable.

12. Public landing/marketing sections
    The README mentions many landing components. Search for unused landing sections, old hero variants, old animations, duplicate CTA blocks, and third-party remnants.

13. Old prototype/reset references
    Search `.ai`, docs, comments, branch references, old route names, Glide/prototype/workshop reset language. Mark stale docs for archive or correction.

================================================================================
READINESS DECISION
==================

In 18_READINESS_DECISION.md, produce one clear cleanup readiness decision:

One of:

* NOT READY TO IMPLEMENT CLEANUP — evidence too weak or active plans conflict
* READY FOR P0 SAFE DELETE IMPLEMENTATION — safe code-only deletions identified
* READY FOR P0+P1 CLEANUP IMPLEMENTATION — safe deletions plus low-risk dependency/test cleanup identified
* READY FOR MIGRATION CLEANUP PLANNING ONLY — database cleanup exists but requires dry-run/owner gate
* READY FOR AGGRESSIVE PRE-LAUNCH CLEANUP — safe deletes, migration candidates, and validation gates are clear

Do not choose aggressive cleanup unless evidence supports it.

Include:

* readiness status
* top 10 safe deletes
* top 10 likely deletes needing proof
* top 10 migration cleanup candidates
* top 10 things to keep despite looking stale
* top 10 obsolete tests/stories/scripts
* top 10 stale docs/plans/comments
* biggest risk
* highest-benefit cleanup
* exact next implementation prompt Philip should run

================================================================================
IMPLEMENTATION PHASE PLAN
=========================

In 17_IMPLEMENTATION_PHASE_PLAN.md, create phases:

P0 — Evidence and no-regret code deletes

* unused files/exports with strong proof
* obsolete docs/comments
* dead stories/tests coupled only to dead components
* stale assets
* no DB changes
* must pass type-check/build after implementation

P1 — MVP scope cuts

* deferred AI surface decision
* A/B testing decision
* proposal comparisons/revision intelligence remnants
* inactive page cursors/follow mode remnants
* planned-but-not-MVP feature code
* requires owner approval on feature cuts but not per-file preservation

P2 — Dependency/package cleanup

* remove dependencies only after import graph proof
* remove patches only after install/build proof
* simplify scripts
* verify bundle/build/test impact

P3 — Server/domain/data-access consolidation

* remove duplicate repository functions
* remove stale DTOs
* remove compatibility branches
* remove obsolete server actions
* requires targeted tests and smoke routes

P4 — Database cleanup dry-run

* tables/columns/RPCs/policies/indexes candidates
* local migration drafts
* rollback SQL
* seed/test data proof
* no hosted destructive apply without gate

P5 — Hosted pre-launch migration cleanup

* only after local dry-run
* dump/export where destructive
* apply migration
* regenerate types
* run prove scripts
* validate auth/share/export/estimate/library/charts paths

P6 — Documentation and archive cleanup

* mark superseded plans
* update README/current-state/known-issues
* archive stale evidence
* preserve useful historical decisions

For each phase:

* objective
* candidate IDs
* expected benefit
* risk
* exact files likely touched
* migration impact
* validation commands
* rollback plan
* exit criteria

================================================================================
TESTING AND VALIDATION PROTOCOL
===============================

In 14_TESTING_AND_VALIDATION_PROTOCOL.md, define cleanup validation tiers:

Tier 0 — Static sanity

```bash
bun run type-check
bun run lint
bun run lint:design-system
bun run build
```

Tier 1 — Unit/DOM

```bash
bun run test
bun run test:dom
```

Tier 2 — Route/API smoke

```bash
bun run test:e2e
bun run test:e2e:perf
```

Tier 3 — Storybook/design governance

```bash
bun run storybook:validate
```

Tier 4 — Database/RLS prove scripts
Run only relevant prove scripts based on cleanup scope:

```bash
bun run prove:notification-rls
bun run prove:estimate-tabs-rls
bun run prove:estimate-list-summaries
bun run prove:rls-initplan
bun run prove:unify-kinds
```

Tier 5 — Launch/readiness scripts
Run only if cleanup touches launch surfaces:

```bash
bun run launch:verify-hosted-auth
bun run launch:verify-hosted-export
bun run launch:verify-hosted-sensitive-routes
bun run launch:supabase-readiness
bun run launch:check-supabase-backup
bun run launch:check-supabase-migrations
bun run launch:check-support-dns
bun run launch:check-support-monitoring
bun run launch:check-vercel-env
bun run launch:check-vercel-health
bun run launch:check-vercel-production
bun run launch:check-legal-owner
bun run launch:check-resend-readiness
bun run launch:check-supabase-linked-readiness
```

Tier 6 — Performance regression check after cleanup

```bash
bun run perf:measure-routes
bun run perf:check-routes
bun run perf:profile-peak-load
bun run perf:check-speed-insights
```

Do not require all tiers for every cleanup. Map each cleanup phase to the smallest sufficient validation gate. Since this is pre-launch, prefer targeted validation over heavyweight ceremony, but never skip security/RLS/export/share/auth validation when those surfaces are touched.

================================================================================
README.md CONTENT
=================

README.md must include:

* Purpose of the cleanup pack
* Date: 2026-06-14
* Status: AUDIT / PLANNING / DELETION-READINESS ONLY
* Exact local folder path
* Repo root
* Pre-launch cleanup posture
* Non-goals
* File list
* Recommended reading order
* Current cleanup readiness decision
* Top safe deletes
* Top migration candidates
* Top owner gates
* Exact next action

================================================================================
CURRENT_CANONICAL_PLAN.md CONTENT
=================================

CURRENT_CANONICAL_PLAN.md must be the single source of truth for this cleanup pack.

It must include:

* Executive summary
* Cleanup posture
* What is safe to delete
* What is likely dead but needs proof
* What should be cut from MVP
* What requires migration
* What requires owner gate
* What must be kept despite looking stale
* Deletion candidate matrix summary
* Cleanup speed/complexity matrix summary
* Recommended implementation phases
* Validation gates
* Rollback posture
* “Do not implement from stale docs” warning
* “Do not mutate production/provider/database from this audit task” warning

================================================================================
EVIDENCE REQUIREMENTS
=====================

evidence/findings-index.md must map every finding to:

* source files
* reference analysis
* route/API matrix row
* DB object, if relevant
* package/dependency row, if relevant
* tests/stories/scripts affected
* recommended phase
* validation gate

evidence/import-reference-index.md must summarize:

* no-reference files
* no-reference exports
* test-only references
* story-only references
* docs-only references
* dynamic/string references
* route-file exceptions

evidence/dependency-analysis.md must summarize:

* dependency
* imported from where
* runtime/dev use
* removable?
* removal gate

evidence/database-object-inventory.md must summarize:

* tables
* columns flagged
* RPCs/functions flagged
* policies flagged
* triggers flagged
* indexes flagged
* migration decision

evidence/test-coverage-cleanup-map.md must summarize:

* tests to keep
* tests to rewrite
* tests to delete with feature
* tests preserving obsolete behavior
* tests blocking cleanup

================================================================================
FINAL RESPONSE AFTER YOU FINISH
===============================

After creating the audit pack, respond with:

1. Folder path created
2. Cleanup readiness decision
3. Top 10 safe-delete candidates
4. Top 10 migration cleanup candidates
5. Top 10 owner-gated cleanup decisions
6. Top 10 things that looked stale but should be kept
7. Commands run and pass/fail status
8. Blocked measurements or blocked proof
9. Exact next implementation prompt Philip should run

Do not claim you cleaned the app.
Do not claim files were deleted.
Do not claim migrations were run.
Do not claim dependencies were removed.
Do not claim readiness unless the evidence supports it.

```

Use this as a **cleanup intelligence pass** first. The strongest next step after that will be a second agent prompt that implements only the `DELETE_NOW` and `DELETE_AFTER_LOCAL_PROOF` buckets, while leaving destructive database cleanup behind a separate migration gate.
```

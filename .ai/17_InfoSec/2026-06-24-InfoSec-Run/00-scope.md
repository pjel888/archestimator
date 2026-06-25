# 00 - Scope

Generated: 2026-06-24T16:56:40.064Z

Updated: 2026-06-25T00:44:57Z

## Repository state

- Repository: pjel888/archestimator
- Local path: `/Users/philiplewis/Documents/archestimator`
- Branch: `main`
- Commit SHA: `c2bef233097b7ef5bb07e4fa262b66f4bd4ef5dc`
- Tracked files from `git ls-files`: 8323
- File coverage classes: CLASS A 1746, CLASS B 5945, CLASS C 632
- Environment type: original scaffold local checkout.
- Original scaffold did not perform production or external attack-surface testing.
- Continuation evidence later added read-only hosted GitHub, Vercel API, and limited live response/header checks. Those checks prove open blockers, not release readiness.
- Deployment/repository settings accessibility: local files visible; GitHub and Vercel have partial read-only evidence in `10-external-controls.md`; Supabase, Resend, monitoring, external environment, and secret-scanner proof remain unverified unless later evidence is added.
- Current checkout warning: continuation readback on 2026-06-25 found local `HEAD` and `origin/main` at `12fef73cd385ce4b9e9ef341f9fed2be10c30c3e`, which differs from this scaffold baseline. The 8323-file coverage claim is baseline-only and is not a 100% current-checkout coverage claim.

## Tool versions

- Bun: `1.3.14`
- Node: `v26.0.0`
- Supabase CLI: `2.105.0`

## Working tree at baseline

```text
## main...origin/main [ahead 9]
 M .ai/03_plans/2026-06-24-Estimate-Sheet-Right-Sidebar-Analysis/00-README.md
 M .ai/03_plans/2026-06-24-Estimate-Sheet-Right-Sidebar-Analysis/17-PRIORITIZED-FINDINGS.md
 M .ai/03_plans/2026-06-24-Estimate-Sheet-Right-Sidebar-Analysis/18-IMPLEMENTATION-PLAN.md
 M .ai/10_state/current-state.md
 M src/app/workshop/library/page.tsx
 M src/app/workshop/library/templates/page.tsx
 M src/components/workshop/library/LibraryComponentsRoute.tsx
?? .ai/03_plans/2026-06-24-Estimate-Sheet-Center-Content-Analysis/16-IMPLEMENTATION-PLAN.md
?? .ai/03_plans/2026-06-24-Estimate-Sheet-Center-Content-Analysis/17-VALIDATION-PLAN.md
?? .ai/03_plans/2026-06-24-Estimate-Sheet-Center-Content-Analysis/18-OPEN-QUESTIONS-AND-DECISION-LEDGER.md
?? .ai/03_plans/2026-06-24-Estimate-Sheet-Center-Content-Analysis/19-TRACEABILITY-MATRIX.md
?? .ai/03_plans/2026-06-24-Estimate-Sheet-Right-Sidebar-Analysis/28-SCORECARD.md
?? .ai/03_plans/2026-06-24-Estimate-Sheet-Right-Sidebar-Analysis/29-AUDIT-REPORT.md
?? .ai/03_plans/2026-06-24-Estimate-Sheet-Tree-Sidebar-Analysis/18-FINAL-VERIFICATION-AND-RESCORING.md
```

The dirty worktree above existed before this InfoSec scaffold generation and must not be overwritten or reverted by the audit.

## Required audit files

This run folder is the sanitized audit directory requested by the user and the supplied brief. It contains the required files directly rather than under a nested `security-audit/` directory so findings remain in the requested path.

## Package scripts inspected before validation execution

```json
{
  "dev": "next dev",
  "build": "next build",
  "graph:reindex": "node .gitnexus/run.cjs analyze && node scripts/neutralize-graph-mandate.mjs",
  "graph:neutralize": "node scripts/neutralize-graph-mandate.mjs",
  "storybook": "storybook dev -p 6006",
  "build-storybook": "storybook build",
  "storybook:check-boundary": "node scripts/check-storybook-boundary.mjs",
  "storybook:check-components": "node scripts/check-storybook-component-coverage.mjs",
  "storybook:validate": "bun run storybook:check-components && bun run storybook:check-boundary && STORYBOOK_DISABLE_TELEMETRY=1 bun run build-storybook -- --output-dir /tmp/archestimator-storybook-static-standalone",
  "start": "next start",
  "lint": "eslint",
  "lint:design-system": "node scripts/enforce-app-design-system.mjs",
  "lint:font-size": "bun run lint:design-system",
  "type-check": "tsc --noEmit",
  "gen:types": "supabase gen types typescript --project-id ebxxqidacheyapmmzavr --schema public > src/lib/supabase/types.ts",
  "test": "bun test tests/unit",
  "test:dom": "vitest run --maxWorkers=1",
  "test:dom:watch": "vitest",
  "test:e2e": "playwright test",
  "test:e2e:perf": "playwright test e2e/route-transition-performance.spec.ts",
  "prove:notification-rls": "node scripts/prove-notification-rls-postgres.mjs",
  "prove:estimate-tabs-rls": "node scripts/prove-estimate-tabs-postgres.mjs",
  "prove:estimate-list-summaries": "node scripts/prove-estimate-list-summaries-postgres.mjs",
  "prove:workspace-homebase-summary": "node scripts/prove-workshop-homebase-summary-postgres.mjs",
  "prove:membership-floor-triggers": "node scripts/prove-membership-floor-triggers-postgres.mjs",
  "prove:project-dashboard-activity-location": "node scripts/prove-project-dashboard-activity-location-postgres.mjs",
  "generate:project-charts-payload-evidence": "bun run scripts/generate-project-charts-payload-evidence.ts",
  "prove:rls-initplan": "node scripts/prove-rls-initplan-postgres.mjs",
  "prove:unify-kinds": "node scripts/prove-unify-estimate-node-kinds-postgres.mjs",
  "prove:shared-link-response-recipient-set-null": "node scripts/prove-shared-link-response-recipient-set-null-postgres.mjs",
  "prove:t4-shared-link-db-hygiene": "node scripts/prove-t4-shared-link-db-hygiene-postgres.mjs",
  "launch:verify-hosted-auth": "bun run scripts/verify-hosted-auth-routes.ts",
  "launch:verify-hosted-export": "bun run scripts/verify-hosted-export-route.ts",
  "launch:supabase-readiness": "supabase db query --linked --file scripts/sql/linked-supabase-launch-readiness.sql --output json",
  "launch:check-supabase-backup": "bun run scripts/check-supabase-backup-readiness.ts",
  "launch:check-supabase-migrations": "bun run scripts/check-supabase-migration-readiness.ts",
  "launch:check-support-dns": "bun run scripts/check-support-email-dns.ts",
  "launch:check-support-monitoring": "bun run scripts/check-support-monitoring-readiness.ts",
  "launch:check-vercel-env": "bun run scripts/check-vercel-env-readiness.ts",
  "launch:check-vercel-health": "bun run scripts/check-vercel-health-readiness.ts",
  "launch:check-vercel-production": "bun run scripts/check-vercel-production-readiness.ts",
  "launch:check-legal-owner": "bun run scripts/check-legal-owner-readiness.ts",
  "launch:check-resend-readiness": "bun run scripts/check-resend-readiness.ts",
  "launch:check-supabase-linked-readiness": "bun run scripts/check-supabase-linked-readiness.ts",
  "dbidx:audit-repo": "bun run scripts/audit-dbidx-repo.ts",
  "perf:measure-routes": "bun run scripts/measure-route-transitions.ts",
  "perf:check-routes": "bun run scripts/check-route-transition-readiness.ts",
  "perf:dashboard-query-count": "bun run scripts/measure-workshop-dashboard-query-count.ts",
  "perf:seed-fixture": "bun run scripts/seed-performance-test-data.ts",
  "perf:library-baseline": "bun run scripts/measure-library-performance-baseline.ts",
  "perf:profile-peak-load": "vitest run tests/vitest/route-transition-peak-load-profile.test.tsx --maxWorkers=1",
  "perf:collect-live-evidence": "bun run scripts/collect-live-db-performance-evidence.ts",
  "validate": "bun run type-check && bun run lint && bun run lint:design-system && bun run lint:design && bun run test && bun run test:dom",
  "lint:design": "node .agents/skills/impeccable/scripts/detect.mjs --strict src/components",
  "launch:verify-hosted-sensitive-routes": "bun run scripts/verify-hosted-sensitive-route-fail-closed.ts",
  "perf:check-speed-insights": "bun run scripts/check-vercel-speed-insights-readiness.ts",
  "doctor": "react-doctor"
}
```

No package validation scripts were executed during this scaffold step.

## Environment file inventory

Only paths are listed; values were not read or recorded.

- `.env.example`

## Initial release posture

**NOT APPROVED.** This scaffold only records baseline scope and generated inventories. It does not prove source review, endpoint testing, RLS testing, dependency safety, secret hygiene, external control verification, or remediation completion.

## Continuation scope note

The 2026-06-25 planning-package continuation added `17-plan-package-audit-and-scorecard.md` and `18-release-gates-traceability.md` to make the package's authority, scores, open decisions, and release gates explicit. This continuation's intentional edit scope is documentation/state artifacts under `.ai/`; it does not refresh the source inventory, deploy code, mutate provider settings, or approve release. The wider worktree still contains app/test/config/provider-adjacent changes from earlier InfoSec remediation and unrelated active work, so global worktree cleanliness is not claimed here.

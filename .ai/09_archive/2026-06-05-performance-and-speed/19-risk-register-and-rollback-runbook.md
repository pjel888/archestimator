<!-- Docs-only performance planning pack. Added 2026-06-05. No application code implementation in this folder. -->

# Risk Register and Rollback Runbook

Use this before editing any performance-sensitive symbol or route. It complements `03-blast-radius-and-risk-map.md`.

## Risk register

| Target | Risk level | Why risky | Required pre-edit proof | Required tests/review | Rollback |
| --- | --- | --- | --- | --- | --- |
| `src/proxy.ts` cache/auth path | High | Auth, redirects, public/protected boundary, cache headers | GitNexus impact, hosted header timing, auth flow map | auth proxy tests, hosted auth verifier, closed-beta tests | revert proxy constant/change; redeploy |
| `getClosedBetaAccessForEmail` | Critical | Prior impact analysis found critical blast radius across auth flows | explicit security/architecture approval and impact analysis | beta allowlist, hosted auth, invite-entry proof | revert; invalidate sessions if needed |
| `src/app/layout.tsx` / `providers.tsx` | Medium/high | Global shell affects every route | bundle analyzer and route map | public smoke, workshop smoke, analytics/privacy tests | revert shell split or provider toggle |
| landing canvas/Lenis | Medium | UX/brand/scroll behavior | trace long tasks and visual baseline | screenshots, reduced-motion, anchor scroll | disable fallback/toggle or revert component |
| Speed Insights instrumentation | Medium/high | Privacy and route-label policy | dashboard gap + privacy decision | analytics redaction/drop tests | remove component/package |
| estimate sheet/tree | High | Core estimating workflow | React Profiler and fixture spec | cost input, DnD, context menu, version history, proposal preview, collaboration | revert slice; keep data unchanged |
| workspace repositories | High | Data correctness/RLS/payload | query inventory and EXPLAIN | repository tests, RLS/role tests | revert query; rollback migration if any |
| share page/API | High | token/password/session security | redacted timing + security map | publication tests, no-store/header checks | revert API/page change |
| proposal export | Medium | XLSX correctness and memory | benchmark evidence | workbook/route tests, hosted export verifier | revert export slice |

## Rollback checklist

1. Identify the exact PR/commit/surface.
2. Confirm rollback does not require database destructive action.
3. Revert the smallest change set.
4. Re-run focused tests for the affected surface.
5. Re-check hosted route if the change was deployed.
6. Update the plan evidence/status to `ROLLED BACK` or `PROVIDER PROOF OPEN`.

## Signoff matrix

| Change type | Required signoff before implementation |
| --- | --- |
| Auth/proxy/closed-beta | architect/security review |
| Share token/session/password | architect/security review |
| Supabase migration/index/RPC | owner approval + EXPLAIN + rollback |
| Public visual degradation/fallback | owner/design approval or visual-verdict evidence |
| Analytics/Speed Insights policy | owner/privacy decision |
| Generic large refactor | reject unless tied to scorecard proof |

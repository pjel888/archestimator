# Traceability Matrix

Status: `IMPLEMENTED_LOCAL_COMPLETE_NO_DOCKER_RLS_PROVEN`.

This matrix connects requirements, acceptance criteria, source files, specialist docs, tests, verification evidence, and rollback. Source implementation exists on `codex/notification-system`; no-Docker local PostgreSQL RLS behavior proof now passes. Provider/production readiness is still gated on owner-approved Supabase reset/typegen or branch-safe/linked provider evidence.

## Requirement Trace

| ID | Requirement | Acceptance Criteria | Future Files/Modules | Tasks | Specialist Docs | Required Evidence | Rollback |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R1 | Persist notification definitions and per-user deliveries | AC1, AC2, AC7 | `supabase/migrations/*notification_system*.sql`, `src/lib/notifications/repository.ts`, `src/lib/supabase/types.ts` | 1-2 | `15`, `16`, `19`, `23` | SQL static tests, RLS tests, typegen diff, provider evidence log | Forward repair migration; disable UI |
| R2 | Gate every delivery by authenticated user identity and RLS | AC3, AC8 | RLS policies, repository, server actions | 1-2 | `15`, `16`, `22`, `23` | same-user success, cross-user denial, direct authenticated write denial, unauthenticated denial | Revoke access; disable actions |
| R3 | Show release announcements as once-per-user modals | AC1, AC6 | `ReleaseAnnouncementModal.tsx`, `release-announcements.ts`, `modal_acknowledged_at` | 2, 4, 6, 8 | `16`, `17`, `18`, `20`, `24` | modal test, action test, Playwright once-only flow | Expire definition; remove provider mount |
| R4 | Provide notification center and unread count | AC2, AC4 | `NotificationCenter.tsx`, `NotificationBellButton.tsx`, query hooks | 3, 5, 6 | `17`, `18`, `20`, `21` | center component tests, query tests, mobile/manual QA | Remove shell bell/provider |
| R5 | Keep toasts transient and separate | AC5, AC9 | existing `ToastProvider`, notification provider/components | 4-6 | `07`, `17`, `21` | existing toast tests, provider tests | Revert notification UI integration |
| R6 | Use existing modal primitive unless evidence proves a gap | AC1, AC9 | existing `Modal`, optional minimal primitive enhancement | 4 | `20`, `21`, `22` | modal regression tests, focus-return test | Revert primitive change or disable release modal |
| R7 | Render only on authenticated app/workshop surfaces | AC3, AC5 | `NotificationProvider`, workshop shell | 6 | `17`, `22` | provider route-gating tests, public share regression | Disable provider on public routes |
| R8 | Treat Realtime as optional accelerator | AC8, AC10 | optional `useNotificationRealtime.ts`, Realtime policy | 7 | `18`, `23` | private-channel tests, cleanup test, polling fallback proof | Disable Realtime hook |
| R9 | Preserve invite, shared-link, publication, beta feedback, collaboration flows | AC5 | existing share/collaboration/publication modules plus notification integration points | 0, 6, 9 | `05`, `06`, `22` | targeted regression tests and impact report | Disable provider/shell bell |
| R10 | Include full automated and manual verification before merge | AC8-AC10 | tests, E2E, `.ai` logs/state | 9 | `06`, `13`, `25` | listed commands, manual QA notes, observability evidence | Correct/fix before PR |
| R11 | Keep payloads private and sanitized | AC6 | schema checks, validators, action-link validation | 1-2, 8 | `08`, `16`, `19` | forbidden-key tests, external-link rejection tests, DB/static seed action-href safety tests | Reject payload; expire announcement |
| R12 | Keep notification queries bounded and index-friendly | AC7, AC10 | indexes, query hooks, repository | 1, 3 | `15`, `18`, `23` | static index tests, optional EXPLAIN, waterfall proof | Add index migration; disable provider |
| R13 | Follow design system and accessibility requirements | AC4, AC9 | modal, center, bell, list item components | 4-6 | `07`, `20`, `21` | design-system lint, component tests, 320px manual QA | Adjust UI or disable entry point |
| R14 | Support release operations and rollback | AC1, AC7 | deterministic local fixtures, owner-approved beta fanout from `closed_beta_allowed_emails`, runbook, migration evidence | 8-9 | `19`, `23`, `24` | seed tests, release runbook evidence, provider approval for real fanout | Expire/reissue definition; dismiss deliveries |
| R15 | Maintain docs/state truth | All | `.ai/03_plans`, `.ai/04_tasks`, `.ai/05_logs`, `.ai/10_state` | 9 | `00`, `10`, `11`, `25` | docs diff, `git diff --check`, final log | Correct docs before PR |

## Acceptance Criteria Trace

| AC | Evidence Owner | Required Tests | Manual/Operational Proof | Status |
| --- | --- | --- | --- | --- |
| AC1 modal once per user | UI + server action | release modal, provider, actions, Playwright release flow | reload after acknowledgement; verify no repeat | Implemented by component/action tests; guarded E2E spec added for provider-backed smoke |
| AC2 center feed/unread | UI + query hooks | notification center, query, actions, Playwright center flow | open center, mark read, dismiss | Implemented by component/query/action tests |
| AC3 cross-user denial | schema/RLS | schema static, no-Docker PostgreSQL proof, guarded local/branch-safe RLS integration, actions | two-user manual probe if linked DB used | Static/action proof complete; no-Docker database proof passed; guarded Supabase harness remains for future provider target |
| AC4 empty state stability | UI/design | notification center, responsive layout checks | 320px and desktop inspection | Implemented by component tests; manual viewport proof pending |
| AC5 failure does not block workflows | provider/server | provider, action error, workshop regressions | navigation/save/toast smoke | Implemented by provider/action tests and full DOM regression |
| AC6 content sanitized | server/schema | action-link validator, payload forbidden-key tests | inspect seed content before release | Implemented by DB/static and server validator tests |
| AC7 additive migration/index/RLS | database | schema static, no-Docker RLS behavior proof, future local/branch-safe typegen diff, optional EXPLAIN | provider evidence log | Static migration proof and no-Docker DB RLS proof complete; Supabase typegen/provider proof deferred |
| AC8 state transitions/fallback | server/query/realtime | actions, query, optional realtime | disable Realtime and verify polling path | Implemented durable non-Realtime path; Realtime deferred |
| AC9 design-system fit | UI/design | `lint:design-system`, modal/center tests | visual/manual QA | Automated design-system lint passed; manual QA pending |
| AC10 async performance | provider/query | provider/query tests | browser waterfall, bounded fetch proof | Implemented async query path; browser waterfall pending |

## Plan Document Trace

| Doc | Purpose | Quality Gate |
| --- | --- | --- |
| `00_INDEX.md` | Navigation, status, readiness, start sequence | Must match file list and implementation status. |
| `01_REQUIREMENTS_AND_ACCEPTANCE_CRITERIA.md` | Product contract | Every MUST maps to tests or explicit non-goal. |
| `02_CODEBASE_RESEARCH.md` | Local/external evidence | Must identify current repo patterns and docs source. |
| `03_ARCHITECTURE_AND_DESIGN_PLAN.md` | ADR and boundaries | Must reject static/pure Realtime/shared-link reuse alternatives. |
| `04_IMPLEMENTATION_SEQUENCE.md` | Ordered work | Must include stop gates and task verification. |
| `05_BLAST_RADIUS_AND_RISK_ANALYSIS.md` | Risk map | Must include provider, shell, RLS, Realtime, modal, public share impact. |
| `06_TESTING_AND_VERIFICATION_PLAN.md` | Test matrix | Must include targeted, regression, E2E, manual, performance, observability. |
| `07_UI_UX_AND_ACCESSIBILITY_PLAN.md` | Interaction design | Must align modal, center, toast split and accessibility. |
| `08_SECURITY_PERFORMANCE_AND_DATA_PLAN.md` | Security/performance | Must include RLS, payload privacy, cache, Realtime limits. |
| `09_DEPLOYMENT_MIGRATION_AND_ROLLBACK_PLAN.md` | Migration/provider safety | Must include local/branch-safe/linked apply gates. |
| `10_IMPLEMENTATION_PROMPT_DRAFT.md` | Future handoff prompt | Must prevent scope drift and require plan reread. |
| `11_READINESS_SCORECARD.md` | Readiness scoring | Must justify 100/100 or report blocker. |
| `12_OPEN_QUESTIONS_AND_DECISIONS.md` | Decisions/open questions | Must separate blockers from optional scope. |
| `13_TRACEABILITY_MATRIX.md` | End-to-end trace | Must map requirements to evidence and rollback. |
| `14_RALPLAN_CONSENSUS_REVIEW.md` | Plan consensus record | Must record architect/critic refinements and final verdict. |
| `15` through `25` | Specialist handoff docs | Must remove ambiguity from schema, server, UI, state, fixtures, a11y, design, graph, provider, runbook, and start gates. |

## Status Rule

Rows should distinguish implemented source/test evidence from provider/runtime evidence. The local implementation RLS row is complete after `bun run prove:notification-rls`; provider rows remain incomplete until Supabase-specific reset/typegen or owner-approved branch-safe/linked evidence exists.

# 16 — Requirements Traceability Matrix

Every requirement traces to source, user outcome, implementation phase/task, code area, acceptance criterion, validation method, test coverage, and rollout check. `Status`: implementation-ready (IR), blocked-external (BE), deferred (DEF).

| Requirement ID | Source | User outcome | Phase / Task | Code areas | Acceptance criteria | Test coverage | Rollout check | Status |
|---|---|---|---|---|---|---|---|---|
| FR-001 | brief + decisions.md 2026-05-27 | Beta user lands on `/workshop` with no gate | P2/T2.3 | `workshop/page.tsx`, `WorkshopDashboard`, welcome panel | AC-001.1–3 | `auth-onboarding-guard.test.ts` (extend), e2e | closed-beta first user lands on `/workshop` | IR |
| FR-002 | derived from brief + audit | Empty workspace shows welcome panel with one primary CTA | P2/T2.2–T2.4 | `WorkspaceWelcomePanel`, `WorkshopDashboard`, `dashboard/lib.ts` | AC-002.1–5 | `workspace-welcome-panel.test.tsx`, `workshop-dashboard-first-run.test.tsx` | panel observed on first beta user | IR |
| UX-001 | brief constraint | Concrete estimating copy, no marketing | P2/T2.2 | welcome panel copy | copy review + DOM noun assertions | `workspace-welcome-panel.test.tsx` | copy review | IR |
| FR-003 | repo evidence (`projects-page-client.tsx:2953`) | Empty `/workshop/projects` shows zero state | P3/T3.1 | `projects-page-client.tsx` | AC-003.1–3 | `projects-page-empty-state.test.tsx` | observed | IR |
| FR-004 | derived | First project stamps milestone idempotently | P1/T1.2 | `projects/actions.ts`, milestones repo | AC-004.1–2 | `project-create-activation.test.ts` | event log shows `milestone_first=true` once | IR |
| FR-005 | derived | First project emits activation event | P1/T1.2 | `projects/actions.ts`, `activation/events.ts` | payload schema | `activation-events.test.ts` + action test | event in log | IR |
| FR-006 | repo evidence (`NewProjectForm.tsx:333`) | Project create auto-seeds first estimate (invariant) | P2/T2.3 (preserve) | `NewProjectForm.tsx` | estimate exists after project create | `estimate-sheet-create-empty-tree.test.ts` + new integration | observed | IR |
| FR-007 | derived | First estimate stamps + emits | P1/T1.3 | `estimates/actions.ts`, milestones, events | idempotency + schema | `estimate-sheet-activation.test.ts` | event in log | IR |
| FR-008 | repo evidence (`estimate-empty-tab-state.test.tsx`) | Empty-tab affordance canonical + preserved | P4/T4.1 | estimate editor | affordance intact | `estimate-empty-tab-state.test.tsx` (unchanged) | regression check | IR |
| FR-009 | derived | First area/template/line-item milestones + events | P1/T1.4 | `estimates/actions.ts` | each first-occurrence stamps once | extend node/tree tests | event in log | IR |
| FR-010 | repo evidence (library overview cleared; no first-run state) | Library components/templates/overview zero states | P5/T5.1–T5.3 | `library/**` clients | AC-010.1–3 | `library-empty-states.test.tsx` | observed | IR |
| FR-011 | ASSUMP-03 + spec | Ladder surfaces existing XLSX + shared-link publish | P6/T6.1 | `PublisherEmptyState`, existing export | AC-011.1–2 | `publisher-empty-state.test.tsx` + existing publication tests | terminal rung reachable | IR |
| FR-012 | derived | First publication stamps terminal milestone + emits | P1/T1.5 | `publication/actions.ts` | idempotency + schema | extend `project-publication-*` | `milestone_first=true` once | IR |
| DATA-001 | derived | `workspace_activation_milestones` table | P0/T0.1 | `migrations/0039` | schema + FK + idempotent | migration test | table exists on D1 | IR |
| DATA-002 | derived | Idempotent concurrency-safe milestones | P0/T0.2 | `activation/milestones.ts` | parallel calls → single row | repo concurrency test | n/a | IR |
| ARCH-001 | DEC-01/04 | No tour library; product-led | P0 (no tour dep) | `package.json` unchanged | no tour dep added | grep `package.json` | n/a | IR |
| ARCH-002 | derived | Payload additive to active app path | P2/T2.1 | `workspace-repository.ts` (`WorkshopHomebaseData` L296, `getWorkshopHomebaseDataAppPath` L2129), `dashboard/lib.ts` | additive fields + null-safe default | `workshop-homebase-summary-rpc-contract.test.ts` unchanged; new `workshop-homebase-app-path-activation.test.ts` | contract test green; new app-path test green | IR |
| SEC-001 | derived | Milestones + events authz + PII minimization | P0/T0.2–T0.3, P1 | `activation/*`, actions | denial + redaction | `activation-milestones-cross-workspace.test.ts`, `activation-events.test.ts` | denial tests green | IR |
| SEC-002 | derived (conditional) | Opt-in sample respects D1 authz | P7/T7.1 | sample seed path | sample = real rows, member-gated | sample authz denial test | n/a | BE (OPEN-DEC-01) |
| A11Y-001 | derived | Panel + zero states keyboard/SR operable | P2/T2.2–T2.3 | welcome panel + zero states | keyboard path + SR semantics | DOM a11y assertions + e2e | a11y review | IR |
| PERF-001 | derived | No new serialized round trip; wave count unchanged (6→7 parallel arms) | P2/T2.1 | `workspace-repository.ts:2140` (Promise.all wave) | serialized wave count stays 1; arm count 6→7 | `workshop-dashboard-query-batching-*.test.ts`; `workshop-dashboard-query-count-script.test.ts` (updated to new count) | perf-trace capture | IR |
| TEST-001 | derived | Test matrix covers all requirements | P8 + matrix | tests | no untraced requirement | this matrix | matrix complete | IR |
| DOC-001 | derived | Docs reconciled post-impl | post-impl | `16-onboarding-activation-readiness.md`, `decisions.md`, `known-issues.md` | deltas committed | review | post-impl | DEF |

**Performance-sensitive requirements (FR-002, PERF-001):**
| Requirement | Baseline | Target | Measurement source | Regression threshold | Rollback trigger |
|---|---|---|---|---|---|
| FR-002 / PERF-001 | pre-impl `/workshop` wave count (1) + arm count (6) + TTFB p95 | wave count unchanged (1); arm count 6→7 (one extra parallel single-row PK read); TTFB p95 ≤ +5% | local perf-trace + `workshop-dashboard-query-count-script.test.ts` (updated) | serialized wave count >1 OR arm count >7 OR TTFB p95 +>5% | `NEXT_PUBLIC_ACTIVATION_WELCOME_ENABLED=false` + revert |

**Security sub-threat coverage (SEC-001 decomposed):** SEC-T1 (cross-workspace read) → `activation-milestones-cross-workspace.test.ts`; SEC-T2 (non-member write) → action authz-denial tests; SEC-T3/T8 (event payload PII + injection) → `activation-events.test.ts`; SEC-T4 (direct POST) → action emit-on-direct-invoke test; **SEC-T6 (dismiss-control spoofing)** → `tests/vitest/welcome-dismiss-authz.test.ts` (anonymous/non-member dismiss invoke → deny); SEC-T5 (sample authz) → blocked on OPEN-DEC-01.

No requirement is untraced. Every implementation task (T0.1–T8.2) maps back to at least one requirement above.

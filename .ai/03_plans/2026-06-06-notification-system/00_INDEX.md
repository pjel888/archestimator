# Notification System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Build a durable in-app notification system for Archestimator that can show release/version announcement popup modals and user-specific notifications without weakening closed-beta security or slowing workshop workflows.

**Architecture:** Add persistent Supabase notification definitions and per-user delivery state, server-authoritative delivery/read/dismiss actions, a small client notification provider under the existing app provider stack, a workshop notification center, and a release announcement modal triggered by per-user delivery state. Supabase Realtime Broadcast is optional after persistence and should only accelerate already-authorized events.

**Tech Stack:** Next.js 16.2.6 App Router, React 19.2.6, Bun, TypeScript, Tailwind v4, TanStack Query 5.100.14, Supabase/Postgres project `ebxxqidacheyapmmzavr`, existing `ToastProvider`, existing `Modal`, existing Supabase private Realtime patterns.

---

## Status

REFINED_READY_FOR_IMPLEMENTATION after the future implementation agent reruns the verification preflight on the then-current branch. This pack is a planning artifact only.

2026-06-06 refinement status: 100/100 document quality and 100/100 implementation readiness by the dual-axis rubric in `11_READINESS_SCORECARD.md`. The score means every known gap is either concretely specified, assigned to a named implementation gate, or converted into a stop condition. It does not mean the feature is implemented or provider-proven. A second critic review initially returned WATCH on typegen sequencing, mutation authority, mandatory RLS proof, V1 fanout path, and seed/admin action-link safety; those fixes are now applied in docs `03`, `04`, `06`, `08`, `15`, `16`, `19`, `23`, `24`, and `25`.

## Scope

- Durable user-specific in-app notifications.
- Popup modal announcements for release/version notices.
- Notification center/list entry point in the workshop shell.
- Read, unread, dismiss, archived-hidden, and modal-acknowledged state.
- Optional private Realtime Broadcast acceleration for authenticated users.
- Admin/maintainer seed path for release announcements through migration seed data or a protected server action, depending on implementation phase.
- Tests, RLS proof, performance proof, accessibility proof, and rollback plan.

## Non-Goals

- Email, SMS, mobile push, browser push, or external notification providers.
- Changing Resend, Vercel, DNS, GitHub, Supabase project settings, or paid add-ons.
- Replacing existing toasts or shared-link activity feeds.
- Building a marketing announcement CMS.
- Mutating production data during implementation planning.

## Plan Map

1. `01_REQUIREMENTS_AND_ACCEPTANCE_CRITERIA.md`
2. `02_CODEBASE_RESEARCH.md`
3. `03_ARCHITECTURE_AND_DESIGN_PLAN.md`
4. `04_IMPLEMENTATION_SEQUENCE.md`
5. `05_BLAST_RADIUS_AND_RISK_ANALYSIS.md`
6. `06_TESTING_AND_VERIFICATION_PLAN.md`
7. `07_UI_UX_AND_ACCESSIBILITY_PLAN.md`
8. `08_SECURITY_PERFORMANCE_AND_DATA_PLAN.md`
9. `09_DEPLOYMENT_MIGRATION_AND_ROLLBACK_PLAN.md`
10. `10_IMPLEMENTATION_PROMPT_DRAFT.md`
11. `11_READINESS_SCORECARD.md`
12. `12_OPEN_QUESTIONS_AND_DECISIONS.md`
13. `13_TRACEABILITY_MATRIX.md`
14. `14_RALPLAN_CONSENSUS_REVIEW.md`
15. `15_DATABASE_SCHEMA_RLS_PLAN.md`
16. `16_SERVER_ACTIONS_API_CONTRACT_PLAN.md`
17. `17_FRONTEND_COMPONENT_AND_SHELL_INTEGRATION_PLAN.md`
18. `18_STATE_MANAGEMENT_AND_QUERY_CACHE_PLAN.md`
19. `19_TEST_FIXTURES_AND_SEED_DATA_PLAN.md`
20. `20_ACCESSIBILITY_FOCUS_MANAGEMENT_PLAN.md`
21. `21_DESIGN_SYSTEM_ALIGNMENT_PLAN.md`
22. `22_GITNEXUS_CODE_GRAPH_IMPACT_PLAN.md`
23. `23_SUPABASE_PROVIDER_AND_MIGRATION_EVIDENCE_PLAN.md`
24. `24_RELEASE_OPERATOR_RUNBOOK.md`
25. `25_IMPLEMENTATION_HANDOFF_CHECKLIST.md`

## Start Here

1. Read this index, `10_IMPLEMENTATION_PROMPT_DRAFT.md`, and `25_IMPLEMENTATION_HANDOFF_CHECKLIST.md`.
2. Rerun the repo safety preflight from `10_IMPLEMENTATION_PROMPT_DRAFT.md`.
3. Re-read the files cited in `02_CODEBASE_RESEARCH.md`; if local Next docs are still absent at `node_modules/next/dist/docs/`, use the official Next docs linked in `02_CODEBASE_RESEARCH.md`.
4. Execute the specialist docs in order: database/RLS (`15`), server/actions (`16`), frontend/shell (`17`), query/cache (`18`), fixtures (`19`), accessibility (`20`), design system (`21`), graph impact (`22`), provider/migration evidence (`23`), release operations (`24`), then handoff checklist (`25`).
5. Implement in the sequence in `04_IMPLEMENTATION_SEQUENCE.md`.
6. Do not skip database/RLS and server-action tasks before wiring UI.

## Recommended Execution Lane

Use `$ultragoal` as the durable goal ledger and `$team` for parallel implementation lanes once the owner explicitly starts implementation. Use `$ralph` only as a sequential fallback when the owner asks for a single persistent executor.

## Readiness Scores

| Area | Document Quality | Implementation Readiness |
| --- | ---: | ---: |
| Core plan docs `00`-`14` | 100 | 100 |
| Specialist docs `15`-`25` | 100 | 100 |
| Traceability and scorecard | 100 | 100 |
| Handoff and runbook | 100 | 100 |

Overall document quality: 100/100.
Overall implementation readiness: 100/100.

Scoring rule: a document earns 100 only when a future agent can act without inventing architecture, file paths, validation gates, RLS policy shape, fixture strategy, UI acceptance, or rollback criteria. Unknown live-provider facts are not hidden; they are encoded in `23_SUPABASE_PROVIDER_AND_MIGRATION_EVIDENCE_PLAN.md` as stop gates.

## Evidence Summary

- Existing `ToastProvider` is globally mounted in `src/app/providers.tsx`.
- Existing `Modal` already handles portal layering and dialog semantics, but the plan still requires focus-return verification because the primitive does not visibly implement a full focus trap.
- Existing private Supabase Realtime patterns use `project:` and `estimate:` topics with cleanup.
- Existing shared-link activity tables show the additive migration/RLS/grant precedent.
- Initial graph evidence on this worktree: code-review graph returned `0 communities`, `0 hubs`, and no source-code changes before docs refinement; the plan records the fallback and future impact gates in `22_GITNEXUS_CODE_GRAPH_IMPACT_PLAN.md`.
- Official Supabase Realtime docs confirm private Broadcast authorization through `realtime.messages` RLS and `config: { private: true }`.
- Official Supabase limits list Pro defaults of 500 concurrent connections, 500 messages/s, 500 joins/s, and 100 channels per connection.
- Official Supabase RLS docs require enabling RLS on exposed-schema tables and describe `auth.uid()`-scoped policies.
- Official Next.js Route Handler docs confirm App Router route handlers use Web Request/Response APIs and are not cached by default; the caching guide still requires explicit `no-store` discipline when private fetches/routes are introduced.

## Bug Plans

None created. Architect and critic reviews did not discover a current implementation blocker requiring `.ai/15_Bugs`. Remaining live-provider facts and RLS/provider proof requirements are deliberate future stop gates, not hidden blockers.

## Current Status

Planning refined. No implementation has started.

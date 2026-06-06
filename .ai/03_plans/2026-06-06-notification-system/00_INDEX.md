# Notification System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Build a durable in-app notification system for Archestimator that can show release/version announcement popup modals and user-specific notifications without weakening closed-beta security or slowing workshop workflows.

**Architecture:** Add persistent Supabase notification definitions and per-user delivery state, server-authoritative delivery/read/dismiss actions, a small client notification provider under the existing app provider stack, a workshop notification center, and a release announcement modal triggered by per-user delivery state. Supabase Realtime Broadcast is optional after persistence and should only accelerate already-authorized events.

**Tech Stack:** Next.js 16.2.6 App Router, React 19.2.6, Bun, TypeScript, Tailwind v4, TanStack Query 5.100.14, Supabase/Postgres project `ebxxqidacheyapmmzavr`, existing `ToastProvider`, existing `Modal`, existing Supabase private Realtime patterns.

---

## Status

READY_FOR_IMPLEMENTATION after the future implementation agent reruns the verification preflight on the then-current branch. This pack is a planning artifact only.

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

## Start Here

1. Read this index and `10_IMPLEMENTATION_PROMPT_DRAFT.md`.
2. Rerun the repo safety preflight from `10_IMPLEMENTATION_PROMPT_DRAFT.md`.
3. Re-read the files cited in `02_CODEBASE_RESEARCH.md`.
4. Implement in the sequence in `04_IMPLEMENTATION_SEQUENCE.md`.
5. Do not skip the database/RLS tasks before wiring UI.

## Recommended Execution Lane

Use `$ultragoal` as the durable goal ledger and `$team` for parallel implementation lanes once the owner explicitly starts implementation. Use `$ralph` only as a sequential fallback when the owner asks for a single persistent executor.

## Readiness Scores

| Document | Score |
| --- | ---: |
| Requirements | 99 |
| Codebase research | 98 |
| Architecture/design | 99 |
| Implementation sequence | 98 |
| Blast radius/risk | 99 |
| Testing/verification | 99 |
| UX/UI/accessibility | 98 |
| Security/performance/data | 99 |
| Deployment/rollback | 98 |
| Implementation prompt | 99 |
| Scorecard | 99 |
| Open questions/decisions | 99 |
| Traceability | 98 |

Overall readiness: 99.0.

## Evidence Summary

- Existing `ToastProvider` is globally mounted in `src/app/providers.tsx`.
- Existing `Modal` already handles portal layering and dialog semantics, but the plan still requires focus-return verification because the primitive does not visibly implement a full focus trap.
- Existing private Supabase Realtime patterns use `project:` and `estimate:` topics with cleanup.
- Existing shared-link activity tables show the additive migration/RLS/grant precedent.
- Official Supabase Realtime docs recommend private production channels, topic names such as `user:789:notifications`, cleanup on unmount, and Broadcast for notifications.
- Official Next.js Route Handler docs confirm App Router route handlers use Web Request/Response APIs.

## Bug Plans

None created. The plan is not blocked below the readiness threshold.

## Current Status

Planning complete. No implementation has started.

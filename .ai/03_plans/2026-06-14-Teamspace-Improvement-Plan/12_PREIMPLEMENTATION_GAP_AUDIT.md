# 12 · Pre-Implementation Gap Audit

**Plan:** Teamspace Improvement Plan (2026-06-14)
**Document type:** Second-pass audit (code/test/design gaps before implementation)
**Status:** Required preflight companion to `09`
**Quality self-rating:** Strategy 100% · Quality 100%

> This document exists because a complete-looking plan can still miss execution failure modes. It audits the plan against the current source, tests, and current official docs, then turns the missing angles into gates future implementers must close or explicitly defer.

---

## 1. Scope and evidence

Second-pass inspection covered:

- Plan pack `00`-`11`.
- Live source: `src/components/workshop/ProjectTeamspaceHeader.tsx`, `src/hooks/use-project-presence.ts`, `src/hooks/use-estimate-cursor-broadcast.ts`, `src/components/workshop/EstimateSheetContent.tsx`, `src/lib/repositories/workspace-repository.ts`, `src/lib/collaboration/actions.ts`, `src/app/workshop/projects/[projectId]/layout.tsx`, `next.config.ts`, `src/app/invite/[token]/accept/route.ts`.
- Tests: `tests/vitest/teamspace-collaboration-header.test.tsx`, `tests/vitest/project-collaboration-realtime.test.ts`, `tests/vitest/project-collaboration-actions.test.ts`, `tests/vitest/project-collaboration-summary.test.ts`, `tests/vitest/project-collaboration-schema.test.ts`, `tests/vitest/landing-security-headers.test.ts`.
- Official-doc refresh: Supabase Realtime limits and authorization docs plus Next.js `headers()` docs were rechecked on 2026-06-14. They still support the plan's capacity, private-channel/RLS, JWT refresh, and route-header assumptions.

## 2. Findings that change the plan

| ID | Gap | Evidence | Required plan/implementation response |
|----|-----|----------|---------------------------------------|
| G1 | Realtime tests are too static. `project-collaboration-realtime.test.ts` currently asserts the project hook contains `activeTabId`, `activeEstimateId`, and dependency strings, which will be wrong after the security fix. | `tests/vitest/project-collaboration-realtime.test.ts:11-30` | Phase 0 must rewrite this into fake-channel behavioral tests before T1.1/T1.2. Static string checks cannot close security gates. |
| G2 | Project presence still has sheet-granular fields in the type and `track()` payload. Current callers pass `null`, but the leak remains one prop away from real restricted-sheet disclosure. | `src/hooks/use-project-presence.ts:11-20`, `src/hooks/use-project-presence.ts:77-87` | T1.1 must remove the fields from both type and runtime payload, then prove the captured payload has no sheet fields. |
| G3 | Cursor receive trusts the wire identity. The hook stores `payload.displayName` and keys by `payload.userId`; the marker renders a label from cursor data. | `src/hooks/use-estimate-cursor-broadcast.ts:87-106`, `src/components/workshop/EstimateSheetContent.tsx:674-693` | T1.2 needs sender-bound identity proof before roster lookup supplies display data; unknown users and member-to-member impersonation must render nothing. Do not broaden viewer cursors until this is done. |
| G4 | Workshop/invite headers are not just absent; an existing test asserts `/workshop/:path*` is not covered. | `next.config.ts:60-117`, `tests/vitest/landing-security-headers.test.ts:5-28` | T1.5 must update both config and tests. Passing old tests would prove the vulnerability remains. |
| G5 | Invite acceptance lacks explicit Origin/same-site protection. The route accepts POST and calls `accept_collaboration_invitation` after auth/rate-limit checks. | `src/app/invite/[token]/accept/route.ts:71-118`, `src/app/invite/[token]/page.tsx:163-170` | T1.6 must add an Origin/same-site guard and prove same-origin form POST still works. |
| G6 | No top-level Realtime JWT refresh path was found. Repo search found no `supabase.realtime.setAuth()` / `onAuthStateChange` in `src/`. | `src/lib/supabase/client.ts:4-12`; no `src/` hits for `setAuth`/`onAuthStateChange` | T0.4 is a real implementation task. Long sessions are not proven safe until it lands. |
| G7 | Toast feedback can be hidden under the modal. Modal root is `z-[1000]`; toast viewport is `z-[100]`. | `src/components/ui/overlays/modal.tsx:92-126`, `src/components/ui/toast.tsx:156-163` | `08`/T4.2 must choose modal-local feedback or raise the toast z-band and test visibility while the modal is open. |
| G8 | The original "0 clicks to who's here + what" metric overclaimed the proposed UI. The cluster has faces at rest, but activity detail is in tooltip/popover paths. | `02_STRATEGY.md`, `06_LIVE_PRESENCE_AND_CURSORS_DESIGN.md`, `08_VISUAL_AND_INTERACTION_SPEC.md` | `02`/`06`/`10` now distinguish 0-click presence from hover/focus/popover activity detail. |
| G9 | Mobile proof was modal-only. Teamspace lives in the project shell action slot next to publication controls. | `src/app/workshop/projects/[projectId]/layout.tsx:54-62` | Add header-cluster breakpoints, touch behavior, and browser proof at 360/480/768/1024px. |
| G10 | Degraded Teamspace states are under-specified. `summary === null` renders a disabled gear, while optional collaboration reads can fail-soft to empty arrays. | `src/components/workshop/ProjectTeamspaceHeader.tsx:104-113`, `src/components/workshop/ProjectTeamspaceHeader.tsx:168`, `01_CURRENT_STATE_ARCHITECTURE.md:58` | `08`/T4.2 must distinguish unavailable/degraded/empty states and provide a retry or fallback where possible. |
| G11 | Cursor and selection affordances are visual-only today. The cursor overlay is `aria-hidden`. | `src/components/workshop/EstimateSheetContent.tsx:661-665` | `06`/`08`/T5.1 must add a screen-reader equivalent for "Alex is editing this row/cell." |
| G12 | Follow mode is deferred, but the future contract was too thin. | `06_LIVE_PRESENCE_AND_CURSORS_DESIGN.md`, `11_DECISIONS_AND_OPEN_QUESTIONS.md` | D-6 remains defer by default; if enabled, implement the edge contract in `06 §4.5`. |
| G13 | Project-member last-manager protection is not DB-atomic. The app does a read-then-write guard before demotion/removal, but concurrent writes can both pass. | `src/lib/collaboration/actions.ts:862`, `src/lib/collaboration/actions.ts:949`, `supabase/migrations/20260526142913_project_sheet_collaboration_access.sql:773-776` | T1.4 must add a `project_members` trigger/constraint and a concurrent demotion/removal test, not only a `workspace_members` trigger. |
| G14 | Project presence still leaks exact route shape, not just sheet fields. `activeRoute` is raw pathname data and should not cross the project channel. | `src/hooks/use-project-presence.ts:77-82` | T1.1 must remove `activeRoute` and replace it with an allowlisted `activeSurface` enum; tests must assert no exact path leaves the client. |
| G15 | Realtime lifecycle needs more than token refresh. Current hooks do not prove visibility pause/retrack, `CLOSED` recovery, StrictMode single-subscribe, or failure telemetry. | `src/hooks/use-project-presence.ts:42-103`, `src/hooks/use-estimate-cursor-broadcast.ts:71-196` | T0.3/T0.4/T0.6 must make lifecycle behavior testable and visible. A hook that silently disconnects fails the plan. |
| G16 | Runtime authz tests are missing for invite leakage and spoofed realtime identities. Existing coverage leans on source strings. | `tests/vitest/project-collaboration-actions.test.ts`, `tests/vitest/project-collaboration-realtime.test.ts`, `tests/vitest/project-collaboration-schema.test.ts` | T1.7 must add behavior tests for cross-project invite IDs, unknown invite IDs, spoofed/unknown realtime identities, and restricted-sheet viewer scenarios. |
| G17 | Cache invalidation was left as a fork between TanStack Query and layout split. Implementation needs one topology before Phase 2/4. | `src/lib/collaboration/actions.ts:435`, `src/app/workshop/projects/[projectId]/layout.tsx:25-31`, `03_AUDIT_PERFORMANCE_AND_DATA.md` | R-15/T2.1 now choose TanStack Query as the primary path; a layout split is a fallback only if the query migration proves impossible. |
| G18 | Rollout, rollback, and observability are too thin for security/realtime changes. | `09_IMPLEMENTATION_PLAN.md`, `10_MEASUREMENT_AND_QA.md` | T0.6 and Phase 6 must define flags, provider config proof, DB rollback/forward-fix steps, CSP Report-Only evidence, and telemetry for channel/auth failures. |
| G19 | Roster lookup alone does not stop authorized-member impersonation. If member B sends `payload.userId=A`, rendering A's roster identity still impersonates A. | `src/hooks/use-estimate-cursor-broadcast.ts:87-106`, `09_IMPLEMENTATION_PLAN.md` review finding | T1.2 must add sender-bound identity proof or a server-mediated broadcast fallback. The regression test must assert B-claiming-A renders nothing. |

## 3. Preflight gates before visible implementation

Before Phase 3 header faces, Phase 4 modal redesign, or Phase 5 cursor upgrades begin:

1. Create `.ai/05_logs/<date>-teamspace-baseline.md` with the `10 §1` metrics plus the state matrix from this doc.
2. Rewrite static realtime tests into behavioral fake-channel tests for project-presence payload minimization, no exact-path leakage, unknown-user cursor drop, sender-bound identity (including member B claiming member A), lifecycle (`setAuth`, visibility, `CLOSED`, cleanup), and failure telemetry.
3. Add/update tests for `/workshop/:path*` and `/invite/:path*` headers, replacing the old "workshop routes are not covered" assertion.
4. Add DB-atomic `workspace_members` and `project_members` owner/manager guards, including a concurrency proof.
5. Decide the feedback layering implementation: modal-local inline feedback or global toast viewport above active dialogs.
6. Record a mobile/touch contract for the header cluster and project cursors.
7. Pin the TanStack Query cache topology and create the rollout/observability ledger before Phase 2/4 implementation. The ledger must name flags, telemetry/log destinations, provider config proof path, DB rollback/forward-fix SQL, CSP Report-Only window, and stop/rollback thresholds.
8. Keep "100% bug-free" out of claims. The stop condition is zero known bugs after behavioral, browser/manual, DB, rollout, and review evidence.

## 4. What remains strong

The original pack's central reframing is correct: the realtime engine exists, private-channel RLS exists, invite/role actions exist, and the modal/header are the main product gap. The second-pass findings do not require rebuilding from scratch. They make the plan stricter about proof, states, layering, mobile behavior, and the security/runtime edge cases that would otherwise slip through a visually impressive implementation.

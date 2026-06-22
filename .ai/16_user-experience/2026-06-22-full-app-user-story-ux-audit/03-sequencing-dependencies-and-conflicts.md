# Sequencing, Dependencies, And Conflict Matrix

Date: 2026-06-22

This document prevents multiple coding agents from implementing overlapping UX fixes in incompatible ways.

## Execution Phases

| Phase | Units | Why first/next | Exit evidence |
|---|---|---|---|
| Phase 0: Plan and schema lock | `00`, `01`, `02`, `08`, `09` docs | Prevents stale evidence, priority drift, ambiguous decisions, and ambiguous status updates. | CSV schema validation passes; implementation units, priority tiers, and decision ledger are present. |
| Phase 1: Quick existing-surface hardening | IU-01 to IU-06, low-schema parts of IU-07/IU-09/IU-11/IU-13 | High value, low blast radius; improves beta trust without migrations. | Targeted component/unit tests pass; no provider claims upgraded. |
| Phase 2: Validation signal repair | IU-08, IU-14 | Makes later status trustworthy before broad execution. | Known lint/test reds either fixed or quarantined with route-specific alternatives. |
| Phase 3: Provider and operation proof | IU-10, IU-12, IU-18, IU-19 | Hosted/provider proof needs stable local behavior first. | Provider runbook rows marked pass/fail/blocked with artifacts. |
| Phase 4: New workflow foundations | IU-15, IU-16, IU-17 | Access-path, data, and security choices must precede UI surface work. | Relevant `09-decision-ledger.md` row resolved; data/RLS/migration plan written when needed; rollback path defined. |
| Phase 5: New workflow surfaces | IU-15 to IU-18 after foundations | UI can safely build on stable product and data contracts. | Feature-specific tests plus browser/provider proof where required. |
| Phase 6: Status update and release readout | All units | Status changes only after evidence. | CSV rows updated with proof artifacts and validation notes. |

## Dependency Graph

| Work | Must follow | Reason |
|---|---|---|
| Contractor/builder and field package (`UX-031`) | Workflow/access-path decision, share/package IA decision, authz/RLS matrix only if permissions change | Current collaboration and share paths exist; adding new permission roles without package scope and data rules is unsafe. |
| Mobile/interrupted estimate (`UX-030`) | Estimate save/pending/error contract (`UX-011`, `UX-044`) | Mobile recovery depends on base save-state semantics. |
| PM/owner readiness (`UX-032`) | Project/share source-of-truth decision, lifecycle data contract | Readiness cannot be reliable if approval/history source is ambiguous. |
| Supplier/cost governance (`UX-033`) | Data model, RLS, accepted-cost state decision | Cost trust requires persistent governance semantics. |
| Attachment approval (`UX-034`) | Storage metadata and variant applicability decision | Approval is unsafe if file version scope is unclear. |
| Campaign authoring (`UX-039`) | Notification delivery inspection, CTA safety, operator boundary | Rich authoring without delivery/audit proof creates operational risk. |
| Admin repair (`UX-040`) | Auth/support permission matrix and audit trail | Support actions must be least-privilege and reviewable. |
| Provider readiness (`UX-029`, `UX-038`) | Local behavior stabilization and environment target selection | Hosted proof is meaningful only against a known target and expected behavior. |

## Conflict Groups

| Conflict group | Includes | Do not implement concurrently with | Lead integration owner |
|---|---|---|---|
| Auth/support boundary | `UX-002`, `UX-003`, `UX-040`, `UX-043` | Any support/admin repair or invite role change | Auth/support lead |
| Project/dashboard/readiness | `UX-006`, `UX-007`, `UX-009`, `UX-032` | Owner governance or publication lifecycle changes | Project lead |
| Estimate sheet | `UX-010`, `UX-011`, `UX-012`, `UX-013`, `UX-030`, `UX-044` | Field handoff if it changes estimate permissions | Estimate lead |
| Publication/share recipient | `UX-016`, `UX-022`, `UX-023`, `UX-035`, `UX-036`, `UX-037` | Share security, recipient events, publication lifecycle | Share lead |
| Collaboration/access paths | `UX-020`, `UX-021`, `UX-031` | Any RLS, invitation, permission, shared-link, or field package change | Collaboration lead |
| Library/cost/storage | `UX-013`, `UX-033`, `UX-034` | Supplier directory, accepted cost, attachment versioning | Library lead |
| Operations/provider | `UX-028`, `UX-029`, `UX-038`, `UX-039` | Provider UI, scripts, monitoring, legal/support proof | Operations lead |
| Evidence/schema | `UX-041`, `UX-042` | Any CSV/status update or route manifest change | QA lead |

## Parallelization Rules

Safe to run in parallel:

- Public copy readiness and project group delete copy.
- Settings role explanations and proposal export preflight.
- Root route recovery and feedback mailto fallback.
- Map fallback copy and AI disabled/quota copy, if both stay in existing surfaces.
- Read-only provider proof gathering and local component test authoring, if the status file is not edited by both lanes.

Not safe to run in parallel without lead integration:

- Any two agents touching collaboration permission or access-path semantics.
- Any two agents adding new persistent status enums.
- Any agent editing share recipient events while another edits publication security.
- Any agent editing supplier/cost governance while another edits attachment storage metadata.
- Any agent updating `canonical-feature-status.csv` while proof is still running.

## Feature Flag And Fallback Plan

| Work type | Flag/fallback expectation |
|---|---|
| Copy/state hardening | No flag needed; fallback is old copy/state if reverted. |
| Existing UI behavior | Prefer local component rollback; keep old action contract unless tests prove new behavior. |
| New operator surface | Gate behind role and feature flag or route-level beta-only access. |
| Data-model expansion | Migration must preserve existing rows, include backfill defaults, and keep old code behavior until UI is ready. |
| Provider proof UI | If provider check fails, display blocked/not-run state; do not hide the surface or mark green. |
| Share/public recipient changes | Fail closed; never expose token, project private data, or raw provider error. |

## Rollback And Recovery Requirements

Before coding a unit that changes data, permissions, routes, or provider behavior, the implementation plan must answer:

1. Which existing user data changes shape?
2. Which route/action/RPC/table/storage bucket changes access?
3. How does old UI behave during a staged deploy?
4. Can the migration be rolled forward if rollback is unsafe?
5. What user-visible fallback appears if the new surface is disabled?
6. What proof proves no unrelated workspace/project/share data became visible?

## Status Update Rule

Only the lead integration lane updates `canonical-feature-status.csv`. Workers produce evidence artifacts and suggested row updates. The lead applies status changes after checking:

- The targeted verification ID matches the row.
- Proof covers the user story, not just nearby code.
- Browser/provider/manual claims have matching artifacts.
- Worktree conflicts are resolved.
- `08-csv-schema-and-validation-contract.md` validation passes.

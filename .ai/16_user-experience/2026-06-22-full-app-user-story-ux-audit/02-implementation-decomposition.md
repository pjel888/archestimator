# Implementation Decomposition

Date: 2026-06-22

This document decomposes the 44 `UX-*` findings into implementable lanes. It is planning guidance only; coding agents must still inspect current source before editing.

## Work Classes

| Class | Meaning | Implementation gate |
|---|---|---|
| Copy/state hardening | Existing surface needs clearer copy, visible state, or recovery affordance. | Can execute with targeted tests. |
| Existing-surface UX | Existing route/component needs interaction, accessibility, or feedback improvement. | Execute after reading current component and tests. |
| Validation-signal repair | Fixes test/lint/QA reliability or evidence status. | Execute early; status updates require fresh evidence. |
| Provider/proof readiness | Local code may exist, but hosted/provider/manual proof is needed. | Do not mark proven without the provider artifact. |
| New workflow | Requires new product surface, data model, permission model, access-path behavior, or persistent status. | Needs decision, data/RLS plan, sequencing, and rollback before coding. |
| Decision/research required | Multiple valid product directions exist. | Do not implement until `09-decision-ledger.md` records an accepted decision and required guardrails. |

## Implementation Units

| Unit | Issues | Class | Primary owner lane | Implementation boundary | Verification |
|---|---|---|---|---|---|
| IU-01 Public copy and legal readiness | `UX-001`, `UX-029` legal subset | Copy/state hardening, provider/proof readiness | Public/legal | Public pages, pricing/features/contact, legal owner proof. | `TV-PUBLIC`, `TV-OPS-SUPPORT`. |
| IU-02 Auth, beta, terms, invite recovery | `UX-002`, `UX-003`, `UX-040`, `UX-043` | Existing-surface UX, support workflow | Auth/support | Login callback, beta access required, terms persistence, invite repair, workspace/account recovery. | `TV-AUTH`, `TV-INVITE`, `TV-WORKSHOP-ADMIN`. |
| IU-03 Root route recovery | `UX-004`, `UX-042` | Existing-surface UX, validation-signal repair | App shell/routing | Root `not-found`, `error`, `global-error`, route aliases, API route inventory. | `TV-ROUTE-ALIASES`, route boundary tests. |
| IU-04 Settings and admin discoverability | `UX-005` | Copy/state hardening | Settings/admin | Role-aware explanations for hidden admin/beta capabilities. | `TV-WORKSHOP-ADMIN`. |
| IU-05 Project list, group, details, destructive flows | `UX-006`, `UX-007`, `UX-008`, `UX-009` | Existing-surface UX | Projects | Group delete copy, dirty-state modal close, destructive alert semantics, shared-link card signal. | `TV-PROJECT-DASHBOARD`. |
| IU-06 Estimate list and sheet interaction confidence | `UX-010`, `UX-011`, `UX-012`, `UX-013`, `UX-014`, `UX-044` | Existing-surface UX | Estimates | Blank-row affordance, visible save errors, DnD undo/keyboard path, stale-source warning, history unavailable reason, numeric/focus validation. | `TV-ESTIMATE-SHEET`. |
| IU-07 Versioning and proposal export polish | `UX-015`, `UX-016`, `UX-017` | Decision/research required, existing-surface UX | Proposal/export | Version panel only if productized; export preflight; preview design lint. | Proposal/export tests and design lint. |
| IU-08 Charts and data validation signal | `UX-018`, owner-alert part of `UX-032` | Validation-signal repair, new workflow | Data/charts | Derived-state lint repair; chart a11y/aggregation; owner alerting only after product decision. | `TV-DATA-MAPS`, chart tests. |
| IU-09 Maps/location fallback | `UX-019` | Existing-surface UX, provider/proof readiness | Maps/location | Provider banner, address-only fallback, manual coordinate validation. | `TV-DATA-MAPS`, Maps provider proof if claiming live tiles. |
| IU-10 Collaboration, invites, realtime presence | `UX-020`, `UX-021` | Existing-surface UX, provider/proof readiness | Collaboration | Email readiness, copy-link fallback, disconnect/reconnect stale presence. | `TV-COLLABORATION`, two-user/browser proof for live presence. |
| IU-11 Share recipient comprehension and recovery | `UX-022`, `UX-023`, `UX-035`, `UX-036`, `UX-037` | Existing-surface UX, provider/proof readiness | Publication/share | Expired/revoked/password recovery, first-open summary, print, activity load more, comment/decision retry. | `TV-SHARE-RECIPIENT`. |
| IU-12 AI availability and draft recovery | `UX-024` | Existing-surface UX, provider/proof readiness | AI | Disabled reasons, quota/provider state, draft expiry, recovery/regenerate path, data minimization gate. | `TV-AI`. |
| IU-13 Feedback, toast, and support triage | `UX-025`, `UX-026`, `UX-027`, support part of `UX-038` | Existing-surface UX, support workflow | Support/feedback | Prefilled fallback mailto, pagination/search or manual query, scoped toast ids, persistent inline critical errors. | `TV-OPS-SUPPORT`. |
| IU-14 QA route manifest and evidence honesty | `UX-028`, `UX-041`, route part of `UX-042` | Validation-signal repair | QA/release | Targeted manifest, schema validation, known red quarantine, evidence-status discipline. | `06-verification-matrix-and-proof-runbook.md`, `08-csv-schema-and-validation-contract.md`. |
| IU-15 Contractor/builder and field handoff | `UX-030`, `UX-031` | Decision/research required, new workflow | Field/collaboration/share | Mobile interrupted estimate is existing-surface; contractor/builder and field-operator package workflows are access-path-gated. Do not add new permission roles unless current paths are proven insufficient. | `TV-ESTIMATE-SHEET`, `TV-FIELD-HANDOFF` after workflow/access-path decision. |
| IU-16 PM/owner readiness and lifecycle governance | `UX-032` | New workflow | Project dashboard/publication | Readiness checklist, approval state, margin/risk, lifecycle timeline. Start as lightweight checklist/notes before persistent approval model. | `TV-PROJECT-DASHBOARD`, `TV-SHARE-RECIPIENT`. |
| IU-17 Library supplier/cost governance | `UX-033`, `UX-034` | New workflow, provider/proof readiness | Library/cost | Stale queue, accepted cost, supplier directory, attachment review metadata. External supplier intake is later unless explicitly approved. | `TV-LIBRARY-SOURCING`, storage/provider proof. |
| IU-18 Notifications/campaign operations | `UX-039` | Decision/research required, provider/proof readiness | Notifications/ops | Seeded/manual release campaign plus CTA validation first; rich campaign authoring later. | `TV-OPS-SUPPORT`, notification tests/provider proof. |
| IU-19 Operations/provider readiness | `UX-029`, `UX-038`, `UX-040` | Provider/proof readiness, support workflow | Operations | Monitoring, Resend, Supabase, Vercel, Maps, legal/privacy, support repair owners and artifacts. | Provider proof runbook. |

## Every Issue Mapped

| Issue | Priority | Unit | Scope posture | Next implementation action |
|---|---|---|---|---|
| `UX-001` | P1 | IU-01 | Copy/state hardening | Add public copy readiness checklist and text-contract tests. |
| `UX-002` | P0 | IU-02 | Existing surface | Add access status/recovery state or explicit support queue path. |
| `UX-003` | P0 | IU-02 | Existing surface/provider | Add retry/support copy and terms persistence failure test. |
| `UX-004` | P0 | IU-03 | Existing surface | Add branded root recovery boundaries and route tests. |
| `UX-005` | P2 | IU-04 | Copy/state hardening | Add role-aware hidden-admin explanation. |
| `UX-006` | P1 | IU-05 | Existing surface | Clarify group delete copy and success/failure state. |
| `UX-007` | P0 | IU-05 | Existing surface | Add dirty/upload close interception across backdrop/Escape/close. |
| `UX-008` | P1 | IU-05 | Existing surface | Force destructive tone and alertdialog proof. |
| `UX-009` | P1 | IU-05 | Existing surface/security | Add shared-link chip without token leakage. |
| `UX-010` | P1 | IU-06 | Existing surface | Add visible blank-row create affordance and keyboard path. |
| `UX-011` | P0 | IU-06 | Existing surface/a11y | Add visible rollback error and live-region alert. |
| `UX-012` | P1 | IU-06 | Existing surface/a11y | Add undo and keyboard reorder parity. |
| `UX-013` | P1 | IU-06 | Existing surface/data trust | Add stale-source badge and refresh/compare path. |
| `UX-014` | P2 | IU-06 | Existing surface | Add unavailable snapshot reason. |
| `UX-015` | P2 | IU-07 | Decision required | Productize versions before building panel. |
| `UX-016` | P1 | IU-07 | Existing surface/perf | Add export preflight size/split guidance. |
| `UX-017` | P1 | IU-07 | Existing surface/design | Simplify preview and rerun focused design lint. |
| `UX-018` | P1 | IU-08 | Validation-signal repair | Remove derived-state lint issue and rerun chart tests. |
| `UX-019` | P0 | IU-09 | Existing surface/provider | Add map fallback plus coordinate validation. |
| `UX-020` | P0 | IU-10 | Existing surface/provider | Add invite/email readiness and copy-link fallback. |
| `UX-021` | P1 | IU-10 | Existing surface/provider | Add stale/offline/reconnect indicators and two-client proof. |
| `UX-022` | P0 | IU-11 | Existing surface/security | Add share recovery copy, timer, owner contact path. |
| `UX-023` | P2 | IU-11 | Existing surface | Add count, load more, terminal state. |
| `UX-024` | P1 | IU-12 | Existing surface/provider | Add AI disabled/quota/provider/draft-expiry states. |
| `UX-025` | P0 | IU-13 | Existing surface/support | Preserve submitted payload in fallback mailto. |
| `UX-026` | P1 | IU-13 | Existing surface/support | Add pagination/search or temporary operator query procedure. |
| `UX-027` | P1 | IU-13 | Existing surface/a11y | Scope toast ids and keep critical inline errors. |
| `UX-028` | P0 | IU-14 | Validation-signal repair | Build route-specific manifest and quarantine known reds. |
| `UX-029` | P0 | IU-19 | Provider/proof readiness | Split provider/legal/monitoring proof owners and artifacts. |
| `UX-030` | P1 | IU-15 | Existing surface/mobile | Decide offline vs pending/retry; add interrupted edit proof. |
| `UX-031` | P2 | IU-15 | Decision required | Choose the field package or collaboration slice across Primary App User, Project Collaborator, and Shared-Link Recipient before any new permission/RLS changes. |
| `UX-032` | P1 | IU-16 | New workflow | Start lightweight readiness checklist before full approval model. |
| `UX-033` | P1 | IU-17 | New workflow | Use curator-owned stale queue before external supplier workflow. |
| `UX-034` | P1 | IU-17 | New workflow/storage | Add reviewed/current metadata before full approval lifecycle. |
| `UX-035` | P0 | IU-11 | Existing surface/content | Add recipient first-open summary and decision glossary. |
| `UX-036` | P0 | IU-11 | Existing surface/security | Add expired/session/unsubscribe/asset recovery paths. |
| `UX-037` | P1 | IU-11 | Existing surface | Add print/activity/comment/decision retry acceptance. |
| `UX-038` | P0 | IU-19 | Provider/support readiness | Split operator owners and stop conditions. |
| `UX-039` | P1 | IU-18 | Decision required/provider | Seeded/manual campaign first; rich composer later. |
| `UX-040` | P0 | IU-02/IU-19 | Support workflow/security | Define support repair permissions and audit notes. |
| `UX-041` | P0 | IU-14 | Validation-signal repair | Enforce proof-status vocabulary and status update rules. |
| `UX-042` | P1 | IU-03/IU-14 | Validation-signal repair | Keep route/API inventory and source path checks current. |
| `UX-043` | P0 | IU-02 | Existing surface/support | Add distinct auth/account/invite recovery states. |
| `UX-044` | P0 | IU-06 | Existing surface/a11y | Add numeric validation, focus, keyboard semantics, tests. |

## Decomposition Stop Condition

Implementation can start only when a future agent can point to:

1. One implementation unit from this document.
2. The matching priority and scope posture from `01-beta-product-thesis-and-prioritization.md`.
3. The dependency and conflict group from `03-sequencing-dependencies-and-conflicts.md`.
4. The UX state/copy/a11y contract from `04-ux-state-accessibility-and-content-contracts.md`.
5. The blast-radius checklist from `05-security-data-and-provider-blast-radius.md` when data, auth, provider, storage, AI, or public sharing is involved.
6. The exact proof path from `06-verification-matrix-and-proof-runbook.md`.
7. The decision row from `09-decision-ledger.md` when the issue is decision-gated.

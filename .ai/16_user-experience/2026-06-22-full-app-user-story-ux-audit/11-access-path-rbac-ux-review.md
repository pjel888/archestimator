# Access Path RBAC And UX Review

Date: 2026-06-22

This review applies `10-access-path-and-persona-taxonomy.md` to the UX audit packet. It identifies where the planning language can accidentally turn product personas into RBAC roles, and defines the safer implementation posture.

## Core Finding

The previous packet language mixed two different concepts:

- **Access path**: how the user enters and what authorizes them.
- **Product persona**: why the user is there and what workflow they need.

That confusion is highest around `UX-031` contractor/builder and field-operator workflows. For beta, these should be first-class user stories and package flows, but they are not automatically first-class database roles.

## RBAC Issues To Avoid

| Issue | Why it is risky | Correct posture |
|---|---|---|
| Treating Contractor / Builder as a permission role | A contractor/builder can be the account owner, a project collaborator, or a shared-link recipient. One persona does not imply one access model. | Pick the access path first, then apply existing workspace/project/share authority. |
| Treating Field Operator as only an invitee | Field operators may need a shared package, project collaboration, or a full signed-in workflow depending on the beta story. | Model field tasks across Primary App User, Project Collaborator, and Shared-Link Recipient before adding new roles. |
| Adding RLS roles before package scope is defined | Permission changes without a field package contract can expose too much or block the wrong task. | Define package contents, allowed actions, and data scope before any DB/RLS change. |
| Using shared-link recipient behavior for collaboration edits | A token recipient and an invited collaborator have different trust, session, audit, and revocation rules. | Keep Shared-Link Recipient read/review/acknowledge actions separate from Project Collaborator edit/comment actions. |
| Calling supplier/vendor an MVP app user | Supplier/vendor can be a data source before they are an app actor. | Keep Supplier / Vendor Contact off-platform until supplier intake is explicitly approved. |

## UX/UI Issues To Fix In Future Work

| Surface | Issue | Improvement |
|---|---|---|
| Invite and collaboration copy | Copy like `contractor role` can imply a new permission model. | Use `project collaborator` for the access path and describe the persona need in body copy, such as feasibility review or field coordination. |
| Share/package copy | `Field package` can be unclear if it behaves like a client proposal. | Name the package type and action: review, print, acknowledge receipt, report constraint, request clarification. |
| Settings/admin explanations | `Workspace member` undersells the primary signed-in users and blurs the main app path. | Use `Primary App User` in planning docs; product UI can still use natural copy like team member where appropriate. |
| User-story tests | Persona labels can make tests assert copy while missing authorization. | Tests must prove access-path behavior: workspace/project role, invite state, share token/session state, or public route state. |
| Field/mobile surfaces | Field-operator needs can be forced into desktop collaboration UI. | Require low-data, printable, touch-safe, and recovery states before claiming field readiness. |

## Implementation Rules

1. Every future `UX-031` story must name both an access path and a product persona.
2. Do not add a `contractor`, `builder`, `installer`, or `field_operator` permission enum until the current access paths are proven insufficient.
3. If a new permission role is required later, create a separate RBAC/RLS plan with migration, policy, audit, rollback, and tests before code.
4. Shared-link field packages must remain token-scoped and fail closed on expired, revoked, password-locked, stale-session, or asset-failure states.
5. Project collaboration field workflows must use existing invite/collaboration state unless a narrower permission is explicitly designed.
6. Primary App User contractor/builder workflows must not be written as if contractors are only recipients.

## Coverage Map

| Story area | Access path to evaluate | Product personas to evaluate | Verification |
|---|---|---|---|
| Field execution package export | Primary App User; Shared-Link Recipient | Contractor / Builder; Field Operator; Project Manager | `TV-FIELD-HANDOFF` plus export/package contract tests. |
| Contractor feasibility and clarification | Primary App User; Project Collaborator | Contractor / Builder; Estimator; Project Manager | `TV-COLLABORATION` plus scoped edit/comment proof. |
| Minimal field handoff package | Shared-Link Recipient; Project Collaborator | Field Operator; Contractor / Builder | `TV-FIELD-HANDOFF` plus mobile/print/recovery proof. |
| Operational constraints feedback | Project Collaborator; Shared-Link Recipient | Field Operator; Project Manager | `TV-FIELD-HANDOFF` plus dashboard visibility proof. |
| Supplier/vendor information | Off-Platform Source Contact first | Supplier / Vendor Contact; Cost Library Manager | `TV-LIBRARY-SOURCING` only after supplier intake is approved. |

## Remaining Owner Decisions

The taxonomy resolves naming. It does not yet decide all product mechanics. Owner decisions still needed before implementation:

| Decision | Needed before |
|---|---|
| Which `UX-031` beta slice ships first: field package export, shared-link field package, project-collaborator feasibility loop, or dashboard constraints feedback. | Building the first contractor/builder or field-operator workflow. |
| Whether the first beta field workflow is read-only/review/acknowledge or allows writeback such as constraints, completion, or clarification requests. | Choosing tests and RLS/share-token behavior. |
| Whether any new permission role is truly required after mapping the workflow to existing access paths. | Any migration, RLS policy, collaboration enum, or invite-role change. |
| Whether supplier/vendor contacts remain off-platform for beta. | Any supplier intake route or external contributor account flow. |

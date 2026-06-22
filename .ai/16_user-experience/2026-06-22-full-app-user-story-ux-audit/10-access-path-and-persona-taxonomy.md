# Access Path And Persona Taxonomy

Date: 2026-06-22

This document defines the canonical user names for the UX audit packet. It separates **how someone enters or is authorized in the product** from **why that person uses the product**.

The important rule: product personas are not permission roles. A contractor/builder or field operator can be the main signed-in user, an invited collaborator, or a shared-link recipient. Do not create a new database/RLS role just because a persona appears in this table.

## Canonical Table

| Canonical Access Path | Access Path Meaning | Canonical Product Personas | Product Persona Meaning |
|---|---|---|---|
| **Anonymous Visitor** | Someone using public pages before signing in. | Public Visitor | Evaluates Archestimator through marketing, pricing, contact, login, terms, or privacy pages. |
| **Primary App User** | Someone signed in and using the main Archestimator app/workspace. | Estimator; Contractor / Builder; Project Manager; Business Owner; Cost Library Manager; Support/Admin Operator; Launch/Provider Operator; Legal/Privacy Operator | Can create/manage estimates, projects, proposals, libraries, settings, support workflows, and operational proof depending on permissions. Contractor / Builder can be the main user here. |
| **Project Collaborator** | Someone invited to collaborate on a project, estimate, or workspace flow. | Estimator; Contractor / Builder; Field Operator; Project Manager; Business Owner | Helps review, edit, coordinate, or provide project/estimate feedback through collaboration flows. Not automatically a new permission model. |
| **Shared-Link Recipient** | Someone opening a shared proposal, package, or review link. | Client / Recipient; Contractor / Builder; Field Operator; Business Owner; Stakeholder | Reviews shared output, comments, accepts/declines, requests changes, prints, recovers access, or uses field/package information without full workspace access. |
| **Off-Platform Source Contact** | Someone outside the app who provides information. | Supplier / Vendor Contact | Provides cost, quote, source, spec, brand, or attachment information. Not an MVP app user unless supplier intake is explicitly approved later. |

## Naming Rules

- Use **Canonical Access Path** when discussing auth, RBAC, invitations, share tokens, sessions, routes, and data boundaries.
- Use **Canonical Product Personas** when discussing user needs, copy, UX expectations, workflow depth, and product strategy.
- Use **Primary App User**, not `Workspace Member`, when referring to the main signed-in users of the product.
- Use **Contractor / Builder** for the construction business persona. Do not imply this person is only an invitee or only a field recipient.
- Use **Field Operator** for someone doing on-site execution, receipt, constraints, or completion feedback.
- Do not use `Beta User` or `Beta Tester` as a canonical access path or product persona. That is a temporary release cohort label.

## Authority Rule

Authority comes from the access path and its underlying permission mechanism:

| Access path | Authority source |
|---|---|
| Anonymous Visitor | Public route policy only. |
| Primary App User | Account, workspace membership, project membership, admin/operator entitlement, and RLS. |
| Project Collaborator | Invite acceptance, collaboration role, project/workspace scope, and RLS. |
| Shared-Link Recipient | Share token, recipient session/password state, publication scope, no-store/cache policy, and share APIs. |
| Off-Platform Source Contact | Off-platform intake process until supplier/vendor app access is explicitly approved. |

## Practical Implication

When the packet says beta should include contractor/builder and field-operator support, it means:

1. Their user stories must be named.
2. Their UX copy and package expectations must be explicit.
3. Their access path must be clear for each story.
4. Their tests must prove the correct access-path behavior.
5. New permission roles are allowed only if the current Primary App User, Project Collaborator, or Shared-Link Recipient paths cannot support the required isolation.

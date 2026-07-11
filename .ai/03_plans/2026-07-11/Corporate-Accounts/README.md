# Corporate Accounts — Plan Pack

Status tuple: `package_status=CONDITIONALLY_READY`, `implementation_status=IN_PROGRESS`,
`release_status=NOT_EVALUATED`, `plan_lifecycle=ACTIVE`, `terminal_status=ACTIVE`.

## Mission

Add a corporate accounts (organization) layer above workspaces in Archestimator.
This enables grouping multiple users and workspaces under a single corporate
entity — assigning email addresses under team leaders, managing roles per
organization, and providing admin visibility into the org → workspace → user
hierarchy from `/admin`.

The user's directive: *"We also need a way to handle corporate accounts in the
/admin dashboard. Something like having different roles etc etc… groupings of
corporate accounts i.e. like assigning email addresses under like team leaders."*

## Authority Order

1. `AGENTS.md` and the current planning-prompt suite (`Frontier-Planning-Kernel.md`).
2. This plan pack's `IMPLEMENTATION_PLAN.md` for execution packets.
3. Numbered documents for detailed analysis.

## Current State

The hierarchy today is strictly: `profile → workspaces → projects → estimates`.
There is **no organization/corporate entity** above workspace. Each user gets
one auto-provisioned workspace. `workspace_members` exists but has no admin
management UI — it's only written by auto-provisioning. There's no email-domain
grouping, no team-leader concept, no org-level role system.

## Target State

```
corporate_account (organization)
  ├── corporate_account_members (users with org roles)
  │    └── role: owner / team_leader / member / viewer
  └── workspaces (linked to the corporate account)
       └── existing workspace_members / projects / estimates
```

Admin can:
- Create corporate accounts
- Assign users to accounts with roles (team leader, member, etc.)
- View the org → workspace → user hierarchy
- Manage which workspaces belong to which corporate account

## Profile

`high-blast-radius` — new top-level entity, new role system, new D1 tables,
authz-adjacent changes.

## Canonical Artifacts

- **Execution:** [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md)
- **Plan pack validation:** `bun run validate:plan-pack -- .ai/03_plans/2026-07-11/Corporate-Accounts`

## Pack Index

| Artifact | Purpose |
|---|---|
| `README.md` | This document — entrypoint |
| `IMPLEMENTATION_PLAN.md` | Execution unit packets and DAG |
| `01_AUDIT.md` | Current data model audit and gap analysis |
| `02_REQUIREMENTS.md` | Requirements and acceptance criteria |
| `03_DATA_MODEL.md` | Schema design, migration plan, repository API |
| `04_DECISIONS.md` | Autonomous decision record |
| `LOOP_LEDGER.md` | Durable coordination state |

# Archestimator User & Access Architecture Plan

**Date:** 2026-06-04  
**Status:** Planning — pre-implementation  
**Author:** Philip Echavez Lewis (with Hermes audit/planning layer)  
**Repo:** `/Users/philiplewis/archestimator`

---

## Purpose

This folder contains the comprehensive plan for Archestimator's user identity, access control, and monetization architecture — specifically addressing the correction that **User Type ≠ Role**, and that Archestimator needs three separate axes: **identity**, **permission**, and **entitlement**.

The critical new work is **Type 3 — Paid Client / Buyer Archive Subscriber**: a monetized archive actor with deletion-independent rights, requiring its own product plan, database model, and security boundary.

---

## Document Index

| # | Document | Purpose |
|---|----------|---------|
| 1 | [`01-user-and-access-matrix.md`](./01-user-and-access-matrix.md) | The 4 user types, their identity/permission/entitlement axes, current repo status, and the corrected matrix model |
| 2 | [`02-repo-audit-findings.md`](./02-repo-audit-findings.md) | Detailed audit of what exists and what doesn't in the current codebase for each user type |
| 3 | [`03-type-3-client-archive-product-plan.md`](./03-type-3-client-archive-product-plan.md) | Full product plan for the Type 3 Paid Client Archive Subscriber |
| 4 | [`04-database-model-schema-delta.md`](./04-database-model-schema-delta.md) | Exact schema changes needed — new tables, migrations, type changes |
| 5 | [`05-security-boundary-and-archive-plan.md`](./05-security-boundary-and-archive-plan.md) | Deletion-independent archive architecture, tombstone system, security boundaries |
| 6 | [`06-implementation-roadmap.md`](./06-implementation-roadmap.md) | Phased implementation plan with dependencies and feature tracker alignment |
| 7 | [`07-ux-ui-client-portal-and-share-upgrade-plan.md`](./07-ux-ui-client-portal-and-share-upgrade-plan.md) | Second-pass UX/UI plan for client archive portal, billing status, and Type 4→Type 3 upgrade flows |
| 8 | [`08-database-operations-rls-and-deletion-lifecycle-plan.md`](./08-database-operations-rls-and-deletion-lifecycle-plan.md) | Second-pass database operations plan for immutable snapshots, RLS, entitlements, tombstones, and auditability |
| 9 | [`09-infosec-threat-model-and-control-plan.md`](./09-infosec-threat-model-and-control-plan.md) | Second-pass infosec threat model and controls for public links, archive accounts, billing webhooks, and retention |
| 10 | [`10-type-3-state-machine-and-lifecycle-plan.md`](./10-type-3-state-machine-and-lifecycle-plan.md) | Explicit state machines for share viewers, identity upgrade, subscription entitlement, snapshots, deletion, and activity |
| 11 | [`11-migration-blast-radius-and-rollout-plan.md`](./11-migration-blast-radius-and-rollout-plan.md) | Migration blast-radius map, phased rollout, rollback posture, provider/deletion stop conditions, and codebase-AI handoff |
| 12 | [`12-testing-and-verification-plan.md`](./12-testing-and-verification-plan.md) | Testing matrix and verification gates for schema/RLS, APIs, UX, billing, share upgrade, deletion, and security regressions |

---

## Executive Summary

### The Problem

The current Archestimator user model conflates identity (who someone is), permission (what they can do), and entitlement (what they paid for). This works for the internal team (Types 1 and 2) but breaks when clients need durable archive access that survives project deletion.

### The Correction

**User Type is not the same as Role.** Archestimator needs three separate axes:

1. **Identity axis:** Who is this person? (authenticated user, anonymous viewer, identified recipient)
2. **Permission axis:** What can they do? (CRUD, manage access, comment, approve)
3. **Entitlement axis:** What have they paid for? (free workspace member, paid archive subscriber, public viewer)

### Current State

| User Type | Identity | Permissions | Entitlement | Repo Status |
|-----------|----------|-------------|-------------|-------------|
| Type 1 — Project Owner | Authenticated | Full CRUD + manage | Free (workspace member) | **Exists** |
| Type 2 — Granted Collaborator | Authenticated | Role-scoped CRUD | Free (invited) | **Exists** |
| Type 3 — Paid Client Archive Subscriber | Authenticated | Read-only archive + comment/approve | **Paid subscription** | **Missing** |
| Type 4 — Public Share Link Viewer | Anonymous | View + password-gated | None | **Partial** |

### Key Finding: Cascade Deletion Kills Type 3

The current `project_publications` table has `ON DELETE CASCADE` from `projects`. When a project is deleted, all its publications, snapshots, comments, responses, and events are also deleted. Type 3 requires deletion-independent archives that survive source project deletion — this is impossible with the current schema.

### The Type 4 → Type 3 Bridge

Type 4 becomes Type 3 when the person needs durable identity: commenting, approving, denying, requesting revisions, or subscribing to archive access. The current share page already hides comment/decision UI unless there is a valid shared-link recipient session — this supports the bridge direction but needs formalization.

### Required New Infrastructure

1. **Client archive subscriptions** table with Stripe/billing integration
2. **Deletion-independent archive snapshots** table (immutable, survives cascade)
3. **Deletion tombstones** for projects/estimates that have active archive subscribers
4. **Recipient identity upgrade path** from anonymous viewer → identified client → paid subscriber
5. **Security boundary** between live project data and archived client data

### Second-Pass Refinements

The second-pass audit adds six implementation-critical gates:

1. **UX/UI:** Client archive must feel like a read-only document vault, not a disabled contractor workspace.
2. **Database:** Archive snapshots must be immutable and should not have cascading source-project/publication foreign keys.
3. **Infosec:** Public share cookies, recipient sessions, authenticated client accounts, and paid entitlements must remain separate credentials/rights.
4. **State machines:** Type 4 share access, recipient account binding, paid entitlement, snapshot state, and deletion/tombstones need explicit transitions.
5. **Migration blast radius:** Roll out additively; schema/RLS/access contracts should land before billing, portal UI, or deletion changes.
6. **Testing:** The acceptance suite must include cross-user denial, no-project-member Type 3 assertions, webhook idempotency, and deletion-independent snapshot proof.

---

## Quick Reference: Key Files in Repo

| What | Path |
|------|------|
| Core schema + RLS | `supabase/migrations/20260518090000_archestimator_core_schema.sql` |
| Collaboration access | `supabase/migrations/20260526142913_project_sheet_collaboration_access.sql` |
| Shared link overhaul | `supabase/migrations/20260528220000_project_shared_link_overhaul.sql` |
| Publication/snapshot | `supabase/migrations/20260527120000_project_client_publication.sql` |
| Mass deletion governance | `supabase/migrations/20260603160000_mass_deletion_governance.sql` |
| Auth profiles/CEO | `supabase/migrations/20260518100000_auth_profiles_ceo_access.sql` |
| Feature inventory | `.ai/06_specs/feature-inventory.md` |
| Current state | `.ai/10_state/current-state.md` |
| .ai agent instructions | `AGENTS.md`, `.ai/AGENTS.md` |
| Share page route | `src/app/share/[token]/page.tsx` |
| Share components | `src/components/share/SharePageHero.tsx`, `SharePageTabs.tsx`, `SharePageSessionBanner.tsx`, `SharePageDecision.tsx`, `SharePageComments.tsx` |
| Share API routes | `src/app/api/share/[token]/session/route.ts`, `comment/route.ts`, `decision/route.ts`, `password/route.ts` |
| Publication security | `src/lib/publication/security.ts` |
| Publication repository | `src/lib/publication/public-repository.ts` |
| Mass deletion action/UI | `src/lib/mass-deletion/bulk-action.ts`, `src/components/workshop/BulkDestructivePreviewModal.tsx` |
| Resend webhook precedent | `src/app/api/webhooks/resend/route.ts`, `src/lib/email/resend-webhooks.ts` |
| Current test scripts | `package.json` → `validate`, `test`, `test:dom`, `test:e2e` |

---

## Second-Pass Research Sources

- OWASP Authorization Cheat Sheet — least privilege, deny-by-default, every-request authorization, ABAC/ReBAC guidance.
- OWASP Session Management Cheat Sheet — cookie/session protection and privilege-change renewal guidance.
- PostgreSQL Row Security Policies documentation — default-deny behavior and RLS bypass considerations.
- Supabase Row Level Security documentation — explicit RLS policies for app data and service-role isolation.
- Stripe Subscriptions/Webhooks documentation — subscription lifecycle, signature verification, duplicate events, order tolerance, and fast webhook acknowledgement.
- GOV.UK Service Manual form-structure guidance — ask only necessary information and design common scenarios first.
- Ant Design data-display guidance — organize dense data by importance/frequency/association and handle empty states deliberately.

---

## Planning Packet Boundary

This packet is documentation/planning only. It does not apply Supabase migrations, create provider products/prices, change Vercel environment variables, modify production deletion behavior, or edit the Archestimator repo.

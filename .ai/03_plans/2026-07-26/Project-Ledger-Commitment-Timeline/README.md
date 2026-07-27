# Archestimator Project Ledger & Commitment Timeline Plan Pack

**Plan date:** 26 July 2026  
**Repository:** `pjel888/archestimator`  
**Observed execution head:** `efa25a00413185aed6de64ad040d8b473c81a6ac`
**Plan profile:** High blast radius / `Q2_CRITICAL_CHANGE_GATE`  
**Implementation status:** Core implementation complete; Q2 aggregate evidence remains quality-blocked
**Canonical execution artifact:** [`00-PLAN.md`](./00-PLAN.md)

`Archestimator_VIP_Implementation_Orchestrator_Prompt.md` is a non-canonical execution adapter supplied with the implementation request. It is intentionally outside the plan-pack hash manifest; `AGENTS.md`, `.ai/00_system`, `plan-pack.json`, and `00-PLAN.md` remain authoritative when any wording differs.

## Purpose

This pack converts Archestimator's ratified product thesis into an implementation-grade product and code architecture:

> **One internal Project Ledger, with one or more audience-scoped Client Portals or timeline views.**

The project owns the complete commercial record. Each portal exposes only the commitments, requests, issued estimates, documents, discussions, decisions, and baselines relevant to its audience. The workspace-level Publisher becomes a cross-project command center rather than the place where project records are authored.

The desired end state is:

> **Unify requests, evidence, issued estimates, first-class document artifacts, discussions, decisions, and approved baselines into one project-level commitment narrative.**

## Product outcome

The feature pays for itself when one disputed variation is avoided or resolved because the original request, its evidence, the exact issued scope, the attached documents, the exclusions, and the resulting approval are all preserved in one attributable project record.

## Where this belongs in the repository

When this pack is adopted into the repository, use:

```text
.ai/03_plans/2026-07-26/Project-Ledger-Commitment-Timeline/
```

After copying it into the repository, refresh hashes and validate it:

```powershell
bun run validate:plan-pack -- --write .ai/03_plans/2026-07-26/Project-Ledger-Commitment-Timeline
```

The ZIP is an external handoff artifact. Repository source and `AGENTS.md` remain authoritative for execution behavior, validation policy, current dependencies, and current implementation truth.

## Reading order

1. [`00-PLAN.md`](./00-PLAN.md) — canonical execution contract.
2. [`01-CURRENT-STATE-AND-BLAST-RADIUS.md`](./01-CURRENT-STATE-AND-BLAST-RADIUS.md) — exact repository starting point.
3. [`02-TARGET-PRODUCT-AND-DOMAIN-MODEL.md`](./02-TARGET-PRODUCT-AND-DOMAIN-MODEL.md) — target product and state model.
4. [`03-DATABASE-AND-MIGRATION-DESIGN.md`](./03-DATABASE-AND-MIGRATION-DESIGN.md) — proposed D1 schema and backfill.
5. [`04-APPLICATION-ROUTES-AND-UX.md`](./04-APPLICATION-ROUTES-AND-UX.md) — internal, workspace, and public surfaces.
6. [`05-ARTIFACT-UPLOAD-AND-DOCUMENT-SECURITY.md`](./05-ARTIFACT-UPLOAD-AND-DOCUMENT-SECURITY.md) — PDFs, evidence, R2, scanning, and rendering.
7. [`06-RBAC-AUDIENCE-AND-PORTAL-PROJECTION.md`](./06-RBAC-AUDIENCE-AND-PORTAL-PROJECTION.md) — roles, permissions, visibility, and approval authority.
8. [`07-ISSUE-PACKAGES-DIFF-AND-AI-NARRATIVE.md`](./07-ISSUE-PACKAGES-DIFF-AND-AI-NARRATIVE.md) — multi-artifact issues, deterministic diffs, and AI-assisted prose.
9. [`08-IMPLEMENTATION-WORKSTREAMS-AND-TASKS.md`](./08-IMPLEMENTATION-WORKSTREAMS-AND-TASKS.md) — dependency-ordered tasks and file ownership.
10. [`09-LEGACY-CUTOVER-AND-RECOVERY.md`](./09-LEGACY-CUTOVER-AND-RECOVERY.md) — finishing the existing shared-link-to-portal migration.
11. [`10-VERIFICATION-QUALITY-AND-ACCEPTANCE.md`](./10-VERIFICATION-QUALITY-AND-ACCEPTANCE.md) — Q2 proof, security review, and acceptance.
12. [`11-DECISION-LEDGER-AND-OPEN-QUESTIONS.md`](./11-DECISION-LEDGER-AND-OPEN-QUESTIONS.md) — ratified decisions, rejected alternatives, and non-blocking questions.
13. [`12-EXECUTION-HANDOFF.md`](./12-EXECUTION-HANDOFF.md) — how an implementation agent should start, resume, and finish.
14. [`13-TRACEABILITY-MATRIX.md`](./13-TRACEABILITY-MATRIX.md) — requirements, units, acceptance, evidence, and principal paths.
15. [`plan-pack.json`](./plan-pack.json) — machine-readable plan state.

## Non-negotiable architecture

```text
Workspace
└── Commitment Center (/workshop/publisher)
    └── Project
        ├── Project Timeline / Internal Ledger
        ├── Estimate Sheets
        ├── Project Artifacts and immutable versions
        ├── Change Requests
        ├── Portal-specific approved baselines
        └── Client Portals
            ├── Client Portal
            ├── Consultant Portal
            └── Supplier Portal
                └── Audience-scoped Commitment Timeline
```

The operating rule is:

> **Create at the project level. Configure at the portal level. Monitor at the workspace level.**

## Critical boundaries

This plan does **not** turn Archestimator into:

- CAD or BIM authoring software;
- a general-purpose cloud drive or drawing-management suite;
- an RFI, submittal, procurement, payment, ERP, or accounting platform;
- a legally binding e-signature service;
- an AI system that invents or autonomously approves contractual changes.

Archestimator may preserve uploaded design and contract artifacts because those artifacts explain a financial commitment. It does not create or technically coordinate the design itself.

## Implementation posture

- Prefer additive D1 migrations and fix-forward recovery.
- Complete the modern Client Portal migration rather than adding a third publication system.
- Preserve existing issued records, decisions, recipient activity, and stable public access.
- Do not let the timeline become the source of truth; it is a narrative projection over authoritative domain objects.
- Do not let AI become the source of truth; deterministic structured changes and human-approved issue content remain authoritative.
- Do not silently remove content that has already been exposed to an external portal.
- Do not replace the active approved baseline merely because a new issue was published.

# UX-029 — Provider Proof Owners

Date: 2026-06-23

## Overview

UX-029 is a P0, Medium severity Operations issue from the canonical UX audit. It addresses the gap that monitoring, live alert and drain, email delivery, legal and DSAR, and provider readiness cannot be proven from local tests alone. The fix is to keep a provider proof checklist for Resend, Supabase, Vercel, monitoring, legal, support, and Maps before wider launch, so the beta operator sees which provider claims are locally tested versus externally proven.

## Issue Snapshot

| Field | Value |
|---|---|
| Issue ID | UX-029 |
| Priority | P0 |
| Severity | Medium |
| Area | Operations |
| Conflict group | Operations/provider |
| Implementation unit | IU-19 |
| Primary owner lane | Operations |
| Class | Provider/proof readiness |

## Scope

This plan does NOT implement code changes under `src/` or `scripts/`. It plans the proof collection, ownership assignment, artifact generation, and status tracking for every external provider the app depends on. The outcome is a runnable checklist where each provider has an assigned owner, a launch script, an expected artifact, and a pass/fail/blocked status.

## Canonical Sources

- `ux-logistical-errors-and-fixes.md` — issue definition, evidence, best fix, post-fix scenario
- `02-implementation-decomposition.md` — IU-19 mapping
- `03-sequencing-dependencies-and-conflicts.md` — Operations/provider conflict group
- `05-security-data-and-provider-blast-radius.md` — provider boundary register
- `06-verification-matrix-and-proof-runbook.md` — TV-OPS-SUPPORT, provider proof runbook
- `12-keystone-code-binding-and-drift-protection.md` — 18 launch script bindings

## Status

- Planning: complete
- Proof collection: not started
- Provider artifacts: none yet

## Folder Contents

Read the numbered files in order:

1. `01-ISSUE-DEFINITION.md` — full problem statement and evidence
2. `02-CURRENT-STATE-ANALYSIS.md` — which providers are wired versus unverified
3. `03-TARGET-EXPERIENCE.md` — owner-assigned provider proof matrix
4. `04-IMPLEMENTATION-PLAN.md` — file-by-file proof collection steps
5. `05-ACCEPTANCE-CRITERIA.md` — Given/When/Then scenarios
6. `06-VERIFICATION-AND-PROOF.md` — TV-OPS-SUPPORT and provider proof runbook
7. `07-BLAST-RADIUS-AND-ROLLBACK.md` — operational blast radius
8. `08-DECISIONS-AND-DEPENDENCIES.md` — decision gates and dependencies

## Exit Criteria

This issue is resolved when:

- Every provider in the matrix has an assigned owner.
- Every assigned owner has run their script and produced an artifact.
- The artifact is stored in a durable location (repo `provider-proof/` or equivalent).
- The canonical status tracker reflects pass/fail/blocked per provider.
- A beta operator can open the matrix and see which providers are proven versus still pending.

## Non-Goals

- Do not modify `src/` code.
- Do not modify `scripts/` code.
- Do not claim a provider is verified without the matching artifact.
- Do not create new provider accounts or change DNS settings.
- Do not run destructive provider checks against production.

## Related Issues

- `UX-038` — Operations personas split (same conflict group, same IU-19; UX-038 defines the personas who will own these provider checks).
- `UX-028` — QA route manifest (operations conflict group).
- `UX-039` — Notification campaign authoring (operations conflict group).
- `UX-040` — Admin repair workflow (support boundary).

## Risk If Not Fixed

- Launch proceeds with unverified provider claims.
- Email delivery fails silently because DNS or webhook verification was skipped.
- Supabase migration drift goes undetected because linked readiness was not checked.
- Legal or DSAR exposure because terms/privacy owner review was not recorded.
- Monitoring gaps because alert ownership was never assigned.
- Operator cannot distinguish "I ran the script" from "the provider is healthy."
- Provider failures are discovered by users rather than by proactive checks.
- Rollback decisions are delayed because no one owns the provider health signal.
- Compliance audits fail because proof of provider review is missing.
- Team churn causes provider knowledge to be lost because ownership was never documented.

## Post-Fix Scenario

A beta operator opens the provider proof matrix and sees:

- Resend: owned by the Email Delivery Owner; last run 2026-06-23; artifact `provider-proof/resend-2026-06-23.json`; status PASS.
- Supabase linked readiness: owned by the Database Owner; last run 2026-06-23; artifact `provider-proof/supabase-linked-2026-06-23.json`; status PASS.
- Vercel production: owned by the Infrastructure Owner; last run 2026-06-23; artifact `provider-proof/vercel-production-2026-06-23.json`; status PASS.

The operator knows which providers are safe to claim, which are blocked, and which have known failures.

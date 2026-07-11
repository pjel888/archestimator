# Proposals Feature — Comprehensive Audit & Improvement Plan Pack

> **Profile:** `high-blast-radius`
> **Status tuple:** `IMPLEMENTATION_READY / NOT_STARTED / NOT_EVALUATED / ACTIVE / ACTIVE`
> **Canonical execution artifact:** `06_IMPLEMENTATION_PLAN.md`
> **Canonical manifest:** `plan-pack.json`
> **Date:** 2026-07-11 (Asia/Manila)

---

## Outcome

Comprehensively audit, understand, and plan the bulletproofing of the
Archestimator **Proposals** feature — the recipient-facing inbox at
`/workshop/proposals`, the XLSX proposal export pipeline, the shared-link
publication/review surface at `/share/[token]`, and the manager-side publisher
flow — so that a fresh implementation agent can execute end-to-end without
routine owner questions, broad rediscovery, or false proof.

The user's explicit directive: **the proposals page should look like the
projects page** (card-based grid, search, filtering, view modes, grouping) while
also considering the nuances of proposal-specific information (status, decision,
expiry, sender identity, snapshot version, workspace origin).

---

## Scope

### In scope (this plan pack covers)

1. **Recipient proposals inbox** (`/workshop/proposals`) — full UX/UI redesign
   to match the projects page collection-layout pattern (card grid, search,
   status tabs, sort, view modes, grouping) while preserving proposal-specific
   data (status, decision, expiry, sender, version, workspace).
2. **Data layer improvements** — query enhancements (filtering, sorting,
   pagination beyond LIMIT 50, count), type safety, and repository boundary
   hardening.
3. **XLSX proposal export pipeline** — audit of the export model, workbook
   generation, audience policy, and client preview dialog for correctness,
   completeness, and edge cases.
4. **Shared-link publication/review surface** (`/share/[token]`) — audit of the
   recipient review experience, decision flow, comments, and terminal states.
5. **Publisher flow** (manager-side) — audit of publish/republish/revoke/rotate
   lifecycle, recipient management, and the publisher preview.
6. **Cross-cutting** — naming duality reconciliation (proposal vs publication),
   stale-plan reconciliation, security/privacy boundaries, and performance.

### Non-goals (explicitly deferred)

| Non-goal | Owned by / reason |
|---|---|
| Server-generated PDF export | Enterprise MVP P1 (D-009); renderer decision is `BLOCKED-EXTERNAL` (DEC-FORMAT-1) awaiting Philip. |
| Immutable issued proposal snapshots | Enterprise MVP P1 (D-008/ENTERPRISE-P1-PROD-001). Current export is mutable XLSX. |
| New `proposals` table (separate from `project_publications`) | Deferred — `project_publications` is the canonical record. |
| Cloudflare Email bounce ingestion | BLOCKED-EXTERNAL per client-ready-proposal-workflow REL-01. |
| In-app notification dispatch for recipient events | Phase 5 of client-ready-proposal-workflow; OPEN-IA-04. |
| Changing decision immutability schema (allowing revision) | OPEN-IA-03; future pack. |
| Owner-side publisher workflow redesign | Already completed in `2026-07-11-Publisher-And-Shared-Pages` (archived). This pack audits but does not re-plan it. |
| Landing page / marketing copy changes | Not a product feature. |

---

## Current state (summary)

The proposals feature has **three implemented subsystems** that share the
"proposal" name but are distinct code surfaces:

1. **Recipient proposals inbox** (`/workshop/proposals`) — a simple bordered
   table of rows with status chips and a "Review" button. Server-rendered with
   TanStack Query refresh. No search, no filtering, no card grid, no view modes.
   Capped at 50 rows. **This is the primary improvement target.**
2. **XLSX proposal export** (`src/lib/proposal-export/`) — ExcelJS workbook
   generation with Bid Form, Summary, Commercial Terms, and Source Breakdown
   sheets. Client preview dialog. Node-runtime API route. **Functional but
   unaudited for edge cases.**
3. **Shared-link publication** (`/share/[token]`) — public review surface with
   cost donut, tree/grid views, comments, decisions, and analytics. **Recently
   redesigned by the Publisher-And-Shared-Pages plan (archived 2026-07-11).**

The data model uses `project_publications` as the canonical "proposal" record —
there is no separate `proposals` table. "Proposal" is the user-facing term;
"publication" is the data-model term.

See `01_AUDIT_AND_CURRENT_STATE.md` for the full audit.

---

## Target state (summary)

- `/workshop/proposals` uses `WorkshopCollectionLayout` (same shell as projects)
  with: instant search, status tabs (All / New / Opened / Decision submitted /
  Expired / Revoked), sort dropdowns, view-mode toggle (list / cards), and
  optional grouping by workspace or status.
- Proposal cards mirror `LiveProjectCard`'s glass-card visual language but show
  proposal-specific metadata: project name, workspace origin, sender, status
  chip, decision chip, expiry, sent date, last activity, snapshot version.
- The data layer supports server-side or client-side filtering, sorting, and
  pagination beyond 50 rows.
- The XLSX export pipeline is audited and edge-case-hardened.
- The share/review surface and publisher flow are audited for gaps.

See `03_TARGET_UX_UI_DESIGN.md` and `04_DATA_API_AND_REPOSITORY_DESIGN.md`.

---

## Artifact map

| Artifact | Role | Content |
|---|---|---|
| `README.md` | Entrypoint | This file — outcome, scope, state, artifact map, execution start |
| `01_AUDIT_AND_CURRENT_STATE.md` | Current-state model | Comprehensive codebase + .ai audit, naming duality, staleness, known gaps |
| `02_SCOPE_NON_GOALS_AND_TERMINOLOGY.md` | Scope/terminology | In/out scope, non-goals, terminology reconciliation, entity model |
| `03_TARGET_UX_UI_DESIGN.md` | Target UX/UI | User journeys, screen states, card design, collection layout, a11y, responsive |
| `04_DATA_API_AND_REPOSITORY_DESIGN.md` | Data/API design | Schema, query improvements, types, pagination, filtering, export pipeline |
| `05_SECURITY_PRIVACY_AND_DATA_INTEGRITY.md` | Security/privacy | Token handling, recipient authz, anti-enumeration, snapshot integrity, export audience |
| `06_IMPLEMENTATION_PLAN.md` | Canonical execution | Execution DAG, units, dependencies, test decisions, evidence, resume |
| `07_DECISIONS_RISKS_AND_AUTH_BOUNDARIES.md` | Decisions/risks | DEC-AUTO records, risk register, AUTH boundaries |
| `08_REQUIREMENTS_TRACEABILITY_AND_READINESS_MATRIX.md` | Traceability | Requirements → units → criteria → evidence, readiness matrix |
| `LOOP_LEDGER.md` | Coordination | Durable append-only ledger for multi-agent execution |
| `plan-pack.json` | Manifest | Machine-readable index, baseline fingerprint, status tuple |

---

## Execution start point

**Start at:** `06_IMPLEMENTATION_PLAN.md`, Unit `UNIT-001` (Inbox collection-layout
shell adoption).

**Dependency layer 0 (no blockers):**
- UNIT-001: Adopt `WorkshopCollectionLayout` for the proposals inbox
- UNIT-002: Build `ProposalCard` component (mirrors `LiveProjectCard` patterns)
- UNIT-009: Audit XLSX export pipeline edge cases

**Dependency layer 1 (depends on UNIT-001/002):**
- UNIT-003: Add status tabs, search, sort, view-mode controls
- UNIT-004: Add grouping (by workspace / status)

**Dependency layer 2:**
- UNIT-005: Data layer — filtering, sorting, pagination support
- UNIT-006: Skeleton, empty states, error states parity with projects

**Dependency layer 3:**
- UNIT-007: Share/review surface audit findings
- UNIT-008: Publisher flow audit findings
- UNIT-010: Stale-plan reconciliation + current-state.md update

---

## Decision-closure summary

All internally resolvable decisions are closed as `DEC-AUTO-*` in
`07_DECISIONS_RISKS_AND_AUTH_BOUNDARIES.md`. Key decisions:

- **DEC-AUTO-001:** Adopt `WorkshopCollectionLayout` + card grid for proposals inbox (matches projects page pattern).
- **DEC-AUTO-002:** Keep TanStack Query for proposals (not RSC-only like projects) — recipient data needs window-focus refetch; hybrid SSR-seed + Query is correct.
- **DEC-AUTO-003:** Client-side filtering/sorting for V1 (recipient list is ≤50 rows; no server-side pagination needed yet).
- **DEC-AUTO-004:** Proposal card shows proposal-specific metadata (status, decision, expiry, sender, version) not project metadata (thumbnail, favorites, drag-and-drop).
- **DEC-AUTO-005:** No D1 migration needed for V1 inbox improvements; existing `RecipientProposalRow` type is sufficient.
- **DEC-AUTO-006:** XLSX export pipeline stays as-is architecturally; audit findings are fix-forward patches.

No `AUTH-*` boundaries are active — all work is within standing Cloudflare-resource
authorization and local implementation scope.

---

## Verification approach

Default `test_requirement: NOT_REQUIRED` for all units — this is a UI/data-layer
improvement with no named MVP-critical invariant that cheaper evidence cannot
prove. Evidence will be: source inspection, type checks, lint, diff checks, and
targeted existing tests where applicable. See `06_IMPLEMENTATION_PLAN.md` for
per-unit test decisions.

---

## Related plan packs

| Pack | Status | Relationship |
|---|---|---|
| `2026-07-11-Publisher-And-Shared-Pages` (archived) | ACHIEVED | Completed the publisher + share page redesign. This pack audits its output and focuses on the inbox. |
| `2026-07-07-recipient-proposals-inbox-ia-recovery` | CONDITIONALLY_READY | Planned IA recovery (terminal states, wrong-account, empty state). This pack supersedes and absorbs its open items. |
| `2026-07-07-client-ready-proposal-package-workflow` | CONDITIONALLY_READY | Planned owner workflow. This pack audits its scope but does not re-plan it. |
| `2026-07-07-proposal-export-and-immutable-deliverable-trust` | CONDITIONALLY_READY | Planned export trust. PDF is BLOCKED-EXTERNAL. This pack audits the XLSX pipeline. |
| `2026-06-28-Proposals-Page` (archived) | IMPLEMENTED | Original inbox implementation. Stale as planning artifact. |

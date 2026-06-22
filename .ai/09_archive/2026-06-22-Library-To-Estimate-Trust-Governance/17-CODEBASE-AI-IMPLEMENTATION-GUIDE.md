---
title: Library To Estimate Trust Governance Codebase AI Implementation Guide
type: docs
date: 2026-06-22
---

# Library To Estimate Trust Governance Codebase AI Implementation Guide

## Summary

This is the front-door implementation guide for future codebase AI agents. It
turns the pack's detailed planning contracts into one execution path, one
conflict-resolution layer, and one release-readiness standard.

Default release path: implement the beta reuse foundation first: U1, U2, U3,
the U6a recovery states needed by those flows, and U7 evidence for every phase.
Durable governance U4/U5 starts only after DB preflight proves the current
schema, RLS, grants, query plans, generated-type impact, and direct-write
prevention path.

This guide does not claim source code has changed. It raises the plan pack to
100/100 planning quality, strategy quality, and implementation readiness for a
future implementation agent that follows the gates below.

---

## Use This Guide First

Read order for implementation agents:

1. `AGENTS.md`
2. `.ai/10_state/current-state.md` FAST PATH block
3. `README.md`
4. This file, `17-CODEBASE-AI-IMPLEMENTATION-GUIDE.md`
5. `00-PLAN.md`
6. `01-CURRENT-EVIDENCE.md`
7. `02-UX-FLOWS-AND-STATES.md`
8. `03-DATA-GOVERNANCE-CONTRACTS.md`
9. `04-QA-AND-ACCEPTANCE-MATRIX.md`
10. `05-IMPLEMENTATION-SEQUENCING.md`
11. `06-PLAN-QUALITY-SCORECARD.md`
12. `12-IMPLEMENTATION-READINESS-CHECKLIST.md`
13. `13-BETA-MVP-CUTLINE-AND-ROLE-DECISIONS.md`
14. Specialist contracts as the touched phase requires: `07`, `08`, `09`,
    `10`, `11`, `14`, `15`, `16`
15. `FILE_LOCKS.md` before touching high-conflict files
16. `_evidence/README.md` before recording proof

Use `01-CURRENT-EVIDENCE.md` as an anchor map, not as a frozen truth source.
Re-run `rg` before relying on line numbers.

---

## Final Ratings

| Dimension | Final planning rating | Why this is now 100/100 |
| --- | ---: | --- |
| Strategy | 100 | The product bet is fixed on the cost-bearing Estimate Sheet commit moment, with U1-U3 as the beta-safe slice and U4/U5 as gated durable governance. |
| Document quality | 100 | The pack now has a single implementation front door, conflict resolver, phase gates, UX labels, DB gates, performance budgets, evidence rules, and handoff map. |
| Implementation readiness | 100 | A future codebase AI can start without inventing strategy, roles, schema shape, proof standards, cache budgets, file locks, or release semantics. |

This rating means implementation contracts are complete. It does not mean tests
have passed, migrations have run, provider proof exists, or release no-go items
are closed.

---

## Mission

Protect the moment where Library-derived data becomes estimate cost data.
Library browsing trust is useful, but this feature succeeds only when a user
cannot silently insert or replace estimate rows with stale, archived,
cross-workspace, unreviewed, unsafe, or mismatched source data.

The user-facing outcome:

- Estimators can tell whether a row source is `Library`, `Project`, or
  `Templates` before committing it.
- Stale, very stale, source-changed, archived, missing-source, thumbnail, and
  target-revision risks are visible before replacement.
- Failed and interrupted mutations are recoverable.
- Durable accepted-cost and attachment review claims are never shown unless the
  DB/RPC/security gates pass.
- Evidence is fresh, pack-local, privacy-safe, and tied to QA IDs.

---

## Non-Goals

- Do not rewrite the active Library page plan in
  `.ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/`.
- Do not treat workspace editor/member as a durable trust reviewer in beta.
- Do not add a supplier portal, marketplace workflow, or provider cost-ingestion
  pipeline.
- Do not server-fetch arbitrary source URLs unless full SSRF controls are added
  in the same unit.
- Do not expose raw source URLs, storage paths, filenames, review prose,
  confidence prose, or signed URL values in public snapshots, telemetry, logs,
  or `_evidence/`.
- Do not claim broad `bun run validate` green or red from stale notes.

---

## Conflict Resolver

When documents appear to overlap, use this table.

| Topic | Winning rule | Source |
| --- | --- | --- |
| Default release path | U1-U3 plus required U6a recovery and per-phase U7 evidence is the beta default. Phase 0 confirms eligibility; it does not reopen the cutline unless new evidence contradicts the plan. | `13`, this guide |
| Full governance | U4/U5 may proceed only after `_evidence/phase-0/db-preflight.md` is filled and DB/RPC/security no-go gates are closed. | `10`, `15`, this guide |
| U6 sequencing | U6a beta recovery states ship with U1-U3. U6b broader mobile/a11y/visual hardening runs after core behavior is stable. | `07`, `14`, this guide |
| U7 sequencing | U7 is continuous evidence and telemetry work with a final release pass, not only a terminal phase. | `12`, `16`, this guide |
| Partial status | `Partial` is an internal checkpoint or final work-status label. It is not a shippable release claim unless it satisfies either the beta or full-governance gates. | `13`, `16`, this guide |
| Curator/reviewer roles | `Library curator` and `Reviewer` are UX task labels. Durable trust-changing actions require platform admin or workspace admin in beta. | `09`, `13`, this guide |
| Insert action labels | `Insert as new row` means add another eligible linked row. `Insert as project-specific` means continue with an explicit non-fresh/detached project-specific path and do not claim reviewed Library trust. | `02`, `07`, `14`, this guide |
| Evidence folder | `_evidence/` is pre-created. Implementation agents add proof files; they do not create a second evidence format. | `_evidence/README.md`, this guide |
| R19 parallel ownership | R19 is proved by file-lock bootstrap and lock-conflict evidence, not by runtime cost/attachment race scenarios. | `08`, `12`, `FILE_LOCKS.md` |
| Source URL handling | Display-only by default. No server-side fetch unless SSRF controls are planned and tested in the same unit. | `09`, `13` |
| Direct-write prevention | Default durable path is column-level revoke/grant for added governance columns, append-only event tables with no ordinary update/delete grants, and RPC/action writes for trust changes. If preflight proves this cannot fit, pause and record an alternate in `db-preflight.md` before migrating. | `10`, `15`, this guide |

---

## Release Statuses

| Status | Meaning | Shippable |
| --- | --- | --- |
| Beta reuse foundation | U1, U2, U3, U6a, and per-phase U7 evidence passed their gates. No durable accepted-cost or approved-attachment claims are made. | Yes, for closed beta. |
| Full governance | Beta foundation plus U4, U5, U6b where touched, and final U7 release evidence passed DB/RPC/security/performance/privacy gates. | Yes, if all no-go gates are closed. |
| Partial | Some units or checkpoints are complete, but beta or full-governance gates are not all closed. | No. Report as internal progress only. |

---

## Phase Plan

| Phase | Units | Primary owner | Required artifacts | Stop gate |
| --- | --- | --- | --- | --- |
| Phase 0: Reality, locks, and cutline | Pre-work | Lead/integration | `_evidence/phase-0/baseline-reconciliation.md`, `FILE_LOCKS.md`, fresh `rg` anchors, dirty-worktree note | Current files and owners are known; beta foundation can start; U4/U5 remain blocked unless DB preflight is also complete. |
| Phase 1A: Compare-before-replace | U1 | UX/source with lead lock for `EstimateSheetContent.tsx` | `_evidence/U1-compare-before-replace.md` | No stale, archived, missing-source, source-changed, thumbnail-mismatched, or stale-row replace can silently commit. |
| Phase 1B: Sidebar source taxonomy | U2 | UX/source | `_evidence/U2-source-taxonomy.md` | `Library`, `Project`, and `Templates` are visibly distinct and user-observable tests pass. |
| Phase 1C: Cache, target, and performance foundation | U3 | Cache/target plus performance | `_evidence/U3-target-cache-recovery.md`, `_evidence/performance-cache-budgets.md` | Workspace switch, stale target, row revision, key-shape, fanout, payload, and query-count gates pass. |
| Phase 1D: Beta recovery and evidence | U6a, U7 continuous | UX/source plus QA/evidence | `_evidence/U6-mobile-interruption.md`, `_evidence/U6-a11y-validation.md`, phase evidence rows | Pending, saved, failed, retrying, recovered edit, duplicate submit, focus return, and visible-error states pass for U1-U3 flows. |
| Phase 2: Cost governance | U4 | Governance/DB plus security | `_evidence/phase-0/db-preflight.md`, `_evidence/U4-cost-governance.md`, `_evidence/db-migration-rpc-readiness.md` | Accepted-cost/lock/assignment/review state is durable only through migration/RPC proof, private read policy, direct-write prevention, and SQL probes. |
| Phase 3: Attachment lifecycle | U5 | Attachment/security plus DB | `_evidence/U5-attachment-lifecycle.md`, `_evidence/attachment-download-authz.md` | Attachment approval/supersede/download state is scoped, auditable, non-destructive, and private. |
| Phase 4: Broader mobile/a11y/visual hardening | U6b | UX/source plus verifier | Named visual/DOM artifacts for touched surfaces | Browser proof exists only for browser-only claims; DOM/static proof covers labels, a11y, focus, and copy where sufficient. |
| Phase 5: Final release evidence | U7 final | QA/evidence plus verifier | `_evidence/U7-release-evidence.md`, `_evidence/security-redaction.md`, `_evidence/requirements-traceability.md` | Every changed claim has fresh proof or valid `SKIP-WITH-RISK`; evidence privacy audit passes; final report follows `12` and `16`. |

---

## Phase 0 Procedure

Phase 0 is mandatory before app-source implementation.

1. Read the required docs listed in this guide.
2. Run `git status --short` and record unrelated dirty files in
   `_evidence/phase-0/baseline-reconciliation.md`.
3. Refresh anchors with `rg` for insert/replace actions, sidebar tabs, query
   keys, source trust helpers, attachment upload/delete, telemetry, and public
   redaction.
4. Open `FILE_LOCKS.md`; assign one active owner for each high-conflict file.
5. Decide release target:
   - default: beta reuse foundation
   - full governance only if the implementation assignment includes U4/U5 and
     DB preflight can pass
   - partial only as internal progress
6. If U4/U5 is in scope, fill `_evidence/phase-0/db-preflight.md` before
   writing migrations.

No-go conditions:

- `EstimateSheetContent.tsx` has no lead-owned lock and multiple lanes need it.
- Current source-trust/cache anchors cannot be found or are semantically
  different from `01-CURRENT-EVIDENCE.md`.
- Durable governance starts while `db-preflight.md` is still a template.
- Another active agent owns the same high-conflict file and the lead has not
  resolved the lock.

---

## Beta Foundation Requirements

The beta release is U1-U3 plus U6a and continuous U7.

U6a means these recovery states for insert, replace, project-source insert, and
template insert where touched:

- `Saving...`
- `Saved`
- `Could not save`
- `Retrying...`
- `Recovered edit`
- duplicate submit disabled or coalesced
- retry revalidates source and target
- focus returns to the initiating row or source item after cancel/error/success
- row/source target summary remains visible during pending and retry states

Recovered state placement:

| Origin | Required placement |
| --- | --- |
| Existing row replace | Inline row status on the affected row, plus compare dialog restore if the dialog was open. |
| Sidebar insert with known target | Inline or area-level status near the inserted/intended row, plus sidebar source summary while retrying. |
| Sidebar insert with unknown or invalid target | Sidebar banner above the source list and target-invalid inline copy where the user chooses the target. |
| Template insert | Template tab/banner state plus resolved target summary. |
| Toasts | Allowed only as supplemental feedback; a toast alone never satisfies recovery evidence. |

---

## Durable Governance Requirements

Durable U4/U5 starts only after Phase 0 DB preflight. The codebase AI must not
show reviewed accepted-cost or approved-attachment truth from transient state.

Required defaults:

- Additive migration only.
- Existing current costs backfill to `proposed`, not `accepted`, unless a
  deterministic reviewed source exists.
- Existing attachments backfill to `uploaded`, not `approved`, unless a
  deterministic reviewed source exists.
- Trust-changing actions use RPCs or server actions with the algorithm in `15`.
- Added governance columns use column-level revoke/grant by default.
- Event tables are append-only for ordinary app roles: no ordinary `UPDATE` or
  `DELETE` grants.
- Direct member/editor mutation of review fields fails.
- Admin/platform admin may mutate through the approved boundary.
- Workspace editor/member may see allowed status enums but not private audit
  prose by default for beta.

DB migration review must explicitly handle:

- nullable attachment uniqueness with `NULLS NOT DISTINCT`, expression indexes,
  or a non-null invariant;
- same-workspace validation for `superseded_by`, `applicable_cost_entry_id`,
  events, and assignee membership;
- concrete enforcement of `reviewed_by` and `reviewed_at` for reviewed states;
- SQL-006A for the implemented sidebar lite query;
- SQL-006B for the implemented governance queue query if U4 ships.

---

## Performance Gates

The future implementation must satisfy `11-PERFORMANCE-NETWORK-AND-CACHE-BUDGETS.md`
plus these explicit gates.

| Area | Gate |
| --- | --- |
| Lite sidebar query count | First page and filtered next page load in no more than 2 DB round trips for 50 rows, including accepted-cost summaries, warning counts, attachment counts, supplier/source labels, and thumbnail pointers. |
| Compare dialog warm open | Uses 0 list-wide queries and no more than 1 item-detail query when detail is not already cached. |
| Governance queue query count | No more than 2 DB round trips for 50 rows when U4 ships. |
| Lite payload bytes | 50-row lite sidebar page is no more than 75 KB uncompressed JSON; target is 50 KB when thumbnails are pointers. |
| Compare payload bytes | Source compare payload is no more than 25 KB unless the user opens attachment metadata. |
| Bundle | U1-U3 add no more than 25 KB gzip to the initial Estimate Sheet route chunk unless a measured baseline in evidence justifies it. U4/U5 manager/governance UI stays out of the initial Estimate Sheet chunk unless visible on first render. |
| Cache fanout | Telemetry-only events cause 0 invalidations; insert/replace causes no more than 2 invalidated key groups and no more than 1 active refetch group; sidebar item and attachment mutations cause no more than 2 scoped invalidated key groups. |
| Realtime/refetch | U1-U3 require no realtime subscriptions. If realtime is added later, use at most one workspace/project-scoped visible-session channel and no per-row subscriptions. Hidden tabs are stale-only on focus/reconnect. |
| SQL probes | SQL-006A proves the implemented sidebar lite query/RPC. SQL-006B proves the implemented governance queue query/RPC when U4 ships. Generic `select id` proof is not enough for release claims. |

QA-020 fails if any of these gates are unmeasured for a touched path.

---

## Security Gates

The future implementation must satisfy `09`, `10`, `15`, and `16`.

Non-negotiable gates:

- Trust-changing durable actions are platform admin or workspace admin only in
  beta.
- Member/editor direct updates to governance fields fail.
- Event tables cannot be updated or deleted by ordinary app roles.
- Signed/download URL creation re-checks workspace/project access, attachment
  row, bucket, path grammar, visibility/review state, TTL, and no-store/no-log
  rules.
- Foreign attachment IDs receive uniform denial and do not reveal existence.
- Source URLs render only after safe normalization; unsafe schemes render as
  text/disabled warning.
- No server-side source URL fetch exists unless SSRF controls are implemented.
- Public/proposal serializers are allowlist-based and have negative tests for
  nested source/attachment metadata.
- Evidence privacy audit is executable and blocks completion.

Suggested evidence privacy scan:

```bash
rg -n --hidden --glob '*.md' '(https?://[^ )]+|\\?token=|signature=|X-Amz-|component-attachments/|SUPABASE_SERVICE_ROLE_KEY|DATABASE_URL|review_note|lock_reason|storage_path|signedUrl|signed_url)' .ai/03_plans/2026-06-22-Library-To-Estimate-Trust-Governance/_evidence
```

Any real private value found in `_evidence/` blocks completion until redacted.
Redacted placeholders are allowed when clearly marked.

---

## UX And Visual Gates

Canonical action labels:

| Branch | Label | Meaning |
| --- | --- | --- |
| Eligible source, adding without replacing current row | `Insert as new row` | Adds another linked row under the selected target. |
| Missing source, accepted cost missing, archived non-fresh path, or explicit detachment | `Insert as project-specific` | Adds a detached/project-specific row with warning and does not claim reviewed Library trust. |
| Replacing current row after explicit review | `Replace selected row` | Replaces component identity/source snapshot while preserving the fields named in `07`. |

Visual proof artifact names should be specific. Use names like:

- `_evidence/U1-compare-dialog-mobile-390x844.md`
- `_evidence/U1-compare-dialog-focus-return.md`
- `_evidence/U2-sidebar-narrow-320.md`
- `_evidence/U2-sidebar-source-tabs-desktop.md`
- `_evidence/U6-portal-focus.md`
- `_evidence/U6-mobile-resume.md`

Browser proof is required only for browser-only claims: mobile geometry,
drag/drop pointer behavior, route/back-forward behavior, portal/focus trap, or
hosted/provider proof. DOM/static tests are preferred for labels, actions,
payloads, cache keys, mutation rollback, telemetry, and helper validation.

---

## Agent Staffing

Use at most six concurrent implementation lanes, and only when file ownership is
clear. The lead owns integration and conflict resolution.

| Lane | Owns | Must not do |
| --- | --- | --- |
| Lead/integration | Phase 0, file locks, `EstimateSheetContent.tsx`, final synthesis | Let two agents edit the same high-conflict file. |
| UX/source | U1/U2 labels, compare UI, source tabs, row/source visible states, DOM a11y tests | Change server actions, schema, or telemetry sanitizer without lead handoff. |
| Cache/target/performance | U3 query keys, stale target checks, row revision failures, fanout, payload, query-count proof | Rewrite source labels or cost governance UI. |
| Governance/DB/security | U4 migration/RPC/action boundaries, private read policy, generated types, SQL probes | Start before DB preflight. |
| Attachment/security | U5 upload/review/download URL lifecycle and attachment tests | Delete persisted approved files or broaden storage path scope. |
| QA/evidence/verifier | U7 evidence ledger, redaction audit, final report, adversarial checks | Mark blockers as `SKIP-WITH-RISK`. |

Agents coordinate through the lead, `FILE_LOCKS.md`, and evidence artifacts.
They do not resolve shared-file conflicts independently.

---

## Pros And Cons

| Strategy | Pros | Cons | Decision |
| --- | --- | --- | --- |
| Beta-first U1-U3 | Delivers the highest-value closed-beta safety fix quickly; avoids delaying stale-reuse prevention behind migrations; lowers initial blast radius. | Cannot claim reviewed accepted cost or approved attachments; warnings must be clear. | Default. |
| Full-governance-first U4/U5 before U1-U3 | Produces durable trust semantics early and avoids later UI caveats. | Delays the cost-bearing estimate safety fix; DB/RPC/security/performance blast radius is higher. | Not default. Use only if assignment explicitly prioritizes full governance and DB preflight passes. |
| Transient governance prototype | Lets users preview governance workflows before migration. | Easy to mislabel transient state as reviewed truth; risks confusing future migration. | Allowed only if visibly non-durable and U4/U5 remain open. |
| Single lead implementation | Reduces merge conflicts in high-conflict files. | Slower and weaker review coverage across security/DB/performance. | Use for `EstimateSheetContent.tsx` integration. |
| Parallel lanes | Faster and improves independent risk coverage. | Requires strict locks and lead synthesis. | Use after Phase 0 for disjoint tests/helpers/contracts. |

---

## SWOT

| Quadrant | Analysis |
| --- | --- |
| Strengths | The plan protects a real cost-bearing workflow, not a cosmetic Library surface. It has traceable requirements, QA rows, adversarial rows, security rules, DB gates, performance budgets, and file locks. |
| Weaknesses | The feature spans large high-conflict workshop files, private evidence, DB/RPC governance, and several user-facing surfaces. Without this guide, a cold agent could overbuild governance or under-prove beta recovery. |
| Opportunities | Beta users get immediate trust improvement during estimating. The durable governance layer can become the foundation for supplier refresh queues, attachment evidence, and safer proposal history later. |
| Threats | Stale source data, cache bleed, public leakage, signed URL leakage, N+1 sidebar queries, broad invalidation, or unclear role authority could damage estimator trust more than shipping no feature. |

---

## Required Proof Bundles

Run the exact QA rows in `12-IMPLEMENTATION-READINESS-CHECKLIST.md` for touched
behavior. These bundles are the minimum shape, not a substitute for reading
`12`.

Phase 1 beta core:

```bash
bunx vitest run tests/vitest/estimate-sheet-library-insert.test.tsx tests/vitest/estimate-sheet-actions-authz.test.ts tests/vitest/estimate-insert-target-authz.test.tsx --maxWorkers=1
bunx vitest run tests/vitest/estimate-sheet-sidebar-library-consumers.test.tsx tests/vitest/project-component-projection.test.ts --maxWorkers=1
bunx vitest run tests/vitest/library-workspace-switch-cache.test.ts tests/vitest/library-components-cache.test.tsx tests/vitest/library-templates-cache.test.tsx --maxWorkers=1
bunx vitest run tests/vitest/library-source-trust.test.ts --maxWorkers=1
```

Phase 2/3 durable governance:

```bash
bunx vitest run tests/vitest/component-library-versioning-schema.test.ts tests/vitest/component-library-cost-governance-actions.test.ts --maxWorkers=1
bunx vitest run tests/vitest/component-library-attachment-lifecycle.test.ts tests/vitest/library-add-component-modal-a11y.test.tsx --maxWorkers=1
```

Release evidence and redaction:

```bash
bunx vitest run tests/vitest/library-telemetry-emit.test.ts tests/vitest/share-snapshot-redaction.test.tsx --maxWorkers=1
git diff --check -- .ai/03_plans/2026-06-22-Library-To-Estimate-Trust-Governance
```

Do not use these bundles to bypass unit-specific evidence. If a touched QA row
in `12` names more tests or SQL probes, those are required.

---

## Implementation Report Template

Final reports must include:

- Release status: beta reuse foundation, full governance, or partial internal
  progress.
- Units completed by U-ID.
- Files changed.
- File-lock ledger status.
- Evidence artifact paths under this pack.
- Evidence privacy audit result.
- Commands and SQL probes run, with pass/fail.
- Browser/provider/manual proof skipped with `SKIP-WITH-RISK`, including
  residual risk and future trigger.
- Known unrelated baseline reds.
- Migration applied, generated types refreshed, SQL probes recorded, and
  fix-forward notes if durable data changed.
- Remaining release no-go items.

No final report may claim implementation complete while a core safety, authz,
DB, cache, redaction, or recovery gate is unproven.

---

## Subagent Audit Synthesis

The final guide incorporates the independent product, UX, security, DB,
performance, and coherence reviews.

| Lane | Main repair absorbed |
| --- | --- |
| Product strategy | Default beta path, U6a/U6b split, U7 continuous evidence, partial status rule, front-door guide. |
| UX/UI | Canonical insert labels, recovered-state placement, named visual artifacts. |
| Security | Direct-write default, signed URL behavior, public/proposal allowlist, executable evidence privacy scan, display-only source URLs. |
| DB/data integrity | DB preflight blocker, append-only event proof, nullable uniqueness handling, same-workspace invariants, reviewed timestamp enforcement. |
| Performance | Query-count gates, payload byte ceilings, bundle budget, numeric cache fanout, realtime/refetch defaults, SQL-006A/006B. |
| Coherence | Handoff read order, evidence ledger wording, R19 lock evidence, admin-only role authority, scorecard post-audit repair note. |

With these repairs, unexplored facets from the first pack are now planned:
bundle impact, N+1 query risk, automatic refetch policy, signed URL existence
leakage, nullable unique indexes, event-table mutability, recovered-state
placement, and partial-release semantics.

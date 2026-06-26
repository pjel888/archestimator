# 00 — README: Estimate Sheet Right Sidebar Forensic Audit

## Executive summary

The Estimate Sheet Right Sidebar is a **functionally broad but persistence-dishonest** feature surface. Three top-level tabs (Library / Project / Templates) provide extensive browsing, insertion, and management capabilities — but several actions that look like CRUD are **local-only mutations** that disappear on refresh. The most consequential gap: Component Edit, Duplicate, and Delete operate on local React state without server persistence, while the UI implies database operations.

**No P0 (data-loss / security-breach) findings.** The authorization layer (RLS + RPC `is_workspace_editor` / `can_edit_estimate` guards) is consistently applied to all server actions. Upload routes sanitize URLs and validate MIME types. The issues are primarily **persistence honesty** and **completeness**, not safety.

## Overall health rating

**🟡 Fair with targeted honesty gaps.** The sidebar is usable for its core flow (browse → insert into estimate) but misleading for secondary management tasks (edit, duplicate, delete, group management).

## Persistence-honesty assessment

**Rating: 5/10.** Template CRUD and folder create/rename are honestly persisted. Component create (via AddComponentModal) is honestly persisted. But component edit, duplicate, delete, favorites, recents, custom ordering, and template groups are all local-only — and several of these call `onLibraryDataChanged()` which implies a server mutation occurred.

## Performance assessment

**Rating: 7/10.** Lazy loading (U4/U18) keeps the initial bundle lean. Virtualization is enabled for large trees. Template totals are precomputed. The main risk is the giant reducer component causing broad re-renders, and unbounded hover prefetch on project sources.

## Accessibility assessment

**Rating: 6/10.** ARIA tree roles, roving tabindex, and keyboard navigation are implemented in the shared `Tree` component. The context-menu rename focus dance is fragile. Small text sizes (8–10px) may fail WCAG legibility. Below 1024px the entire sidebar is hidden with no alternative.

## Security assessment

**Rating: 8/10.** All server actions enforce `is_workspace_editor` / `can_edit_estimate` RPC guards. RLS is enabled on library tables. Upload routes sanitize paths. Source URLs are stripped of `javascript:` schemes. Telemetry sanitizes free-text. No cross-workspace ID leakage detected in static review. Background agent verifying RLS policies.

## Finding count

| Severity | Count |
| --- | --- |
| P0 | 0 |
| P1 | 5 |
| P2 | 7 |
| P3 | 1 |
| **Total** | **13** |

## Top 5 most consequential findings

1. **F-01/F-06**: Component Delete is local-only but calls `onLibraryDataChanged()` — false invalidation signal, item reappears on refresh
2. **F-03/F-05**: Component Edit and Duplicate use `createComponent()` helper — local-only with `custom-${Date.now()}` IDs, never persisted
3. **F-10**: Template Groups are local-only state — empty groups vanish on refresh
4. **F-11**: "Live source" / "Read-through source" labels on project-source preview imply ongoing sync that doesn't exist — insertion is a snapshot copy
5. **F-04**: Project-source search lacks request cancellation — stale responses can overwrite newer results

## Recommended first implementation phase

**Phase 1: Persistence Honesty (P1 findings)**
1. Wire component Delete to `executeBulkArchiveLibraryComponents` (the RPC already exists)
2. Remove the legacy `NewComponentForm` path; route Edit through `AddComponentModal`
3. Wire Duplicate to `createCostLibraryComponent`
4. Remove "Live source" / "Read-through source" chips; replace with "Snapshot copy"
5. Remove "New Template Group" affordance (categories are derived, not persisted)
6. Add request-identity guard to project-source search

## Audit artifact index

### Original audit (22 docs, 2026-06-24)

| File | Topic |
| --- | --- |
| [01-SCOPE-AND-CODE-MAP.md](./01-SCOPE-AND-CODE-MAP.md) | Git state, file inventory, query-key map, Mermaid diagrams |
| [02-TERMINOLOGY-AND-DOMAIN-CONTRACT.md](./02-TERMINOLOGY-AND-DOMAIN-CONTRACT.md) | Tab naming gate resolution, domain glossary |
| [03-BEHAVIOR-INVENTORY.md](./03-BEHAVIOR-INVENTORY.md) | Every user-visible action with trigger/handler/persistence |
| [04-PERSISTENCE-TRUTH-TABLE.md](./04-PERSISTENCE-TRUTH-TABLE.md) | Complete persistence matrix per entity/action |
| [05-SIDEBAR-SHELL-AND-LIFECYCLE-AUDIT.md](./05-SIDEBAR-SHELL-AND-LIFECYCLE-AUDIT.md) | Dynamic import, lazy load, resize, collapse, breakpoint |
| [06-LIBRARY-TAB-CRUD-AUDIT.md](./06-LIBRARY-TAB-CRUD-AUDIT.md) | Component + folder CRUD lifecycle |
| [07-PROJECT-TAB-AUDIT.md](./07-PROJECT-TAB-AUDIT.md) | Projection model, read-only intent |
| [08-TEMPLATES-CRUD-AUDIT.md](./08-TEMPLATES-CRUD-AUDIT.md) | Template create/rename/delete + groups |
| [09-REUSABLE-PROJECT-SOURCES-AUDIT.md](./09-REUSABLE-PROJECT-SOURCES-AUDIT.md) | Progressive source loading, search, insertion |
| [10-INSERTION-DRAG-DROP-AND-BULK-AUDIT.md](./10-INSERTION-DRAG-DROP-AND-BULK-AUDIT.md) | Target eligibility, drag payloads, bulk selection |
| [11-SEARCH-FILTER-VIEW-AND-PREFERENCES-AUDIT.md](./11-SEARCH-FILTER-VIEW-AND-PREFERENCES-AUDIT.md) | Search, facets, view modes, preferences |
| [12-UX-UI-ACCESSIBILITY-AUDIT.md](./12-UX-UI-ACCESSIBILITY-AUDIT.md) | IA, typography, keyboard, screen reader |
| [13-STATE-NETWORK-CACHE-AND-DATA-AUDIT.md](./13-STATE-NETWORK-CACHE-AND-DATA-AUDIT.md) | State machine, query/mutation inventory, race conditions |
| [14-PERFORMANCE-AUDIT.md](./14-PERFORMANCE-AUDIT.md) | Bundle, render, algorithmic complexity |
| [15-SECURITY-AND-INTEGRITY-AUDIT.md](./15-SECURITY-AND-INTEGRITY-AUDIT.md) | Auth, RLS, uploads, drag payload validation |
| [16-EDGE-CASE-AND-TEST-MATRIX.md](./16-EDGE-CASE-AND-TEST-MATRIX.md) | State transitions, concurrency, test coverage gaps |
| [17-PRIORITIZED-FINDINGS.md](./17-PRIORITIZED-FINDINGS.md) | All findings with severity, evidence, corrections |
| [18-IMPLEMENTATION-PLAN.md](./18-IMPLEMENTATION-PLAN.md) | Phased execution plan |
| [19-VALIDATION-PLAN.md](./19-VALIDATION-PLAN.md) | Verification strategy |
| [20-OPEN-QUESTIONS-AND-DECISION-LEDGER.md](./20-OPEN-QUESTIONS-AND-DECISION-LEDGER.md) | Product decisions with recommended defaults |
| [21-TRACEABILITY-MATRIX.md](./21-TRACEABILITY-MATRIX.md) | Finding → decision → task → test mapping |

### Improve-Plan pass additions (9 docs, 2026-06-25)

Added by the `Improve-Plan-Prompt.md` audit pass to close Phase 3 gaps (risk register, rollout/rollback, observability, UX state matrix, performance budget, threat model, scorecard, audit report) and hand off open verification work:

| File | Topic |
| --- | --- |
| [22-RISK-REGISTER.md](./22-RISK-REGISTER.md) | Per-finding owner, deadline, mitigation, residual risk |
| [23-ROLLOUT-AND-ROLLBACK-PLAN.md](./23-ROLLOUT-AND-ROLLBACK-PLAN.md) | Per-task rollback paths, feature flag, staged release |
| [24-OBSERVABILITY-PLAN.md](./24-OBSERVABILITY-PLAN.md) | Phase 1 telemetry events, metrics, alerts, dashboards |
| [25-UX-STATE-MATRIX.md](./25-UX-STATE-MATRIX.md) | Per-surface loading/empty/error/success/partial/permission state spec |
| [26-PERFORMANCE-BUDGET.md](./26-PERFORMANCE-BUDGET.md) | Concrete P50/P95/P99 latency, bundle, payload, memory ceilings |
| [27-THREAT-MODEL.md](./27-THREAT-MODEL.md) | STRIDE per surface, assets, threat agents, controls |
| [28-SCORECARD.md](./28-SCORECARD.md) | Before/after per-doc scoring across Strategy / Doc Quality / Impl Readiness |
| [29-AUDIT-REPORT.md](./29-AUDIT-REPORT.md) | Narrative report: inventory, findings, revisions, traceability, readiness |
| [30-HANDOFF.md](./30-HANDOFF.md) | Open work + verification gaps for a future agent (6 tracks: independent verification, RLS check, upload-route hardening, perf-budget CI, observability wiring, UX gap closure) |

### Create-Implementation-Prompt pass additions (4 artifacts, 2026-06-25)

Added by the `Create-Implementation-Prompt.md` pass to produce the canonical 22-section plan the template mandates and verify it:

| File | Topic |
| --- | --- |
| [GOAL.md](./GOAL.md) | Master `/goal` for the pass: outcome, scope, workstreams, acceptance, deliverables |
| [LOOP_LEDGER.md](./LOOP_LEDGER.md) | Append-only lane coordination log for the multi-agent pass |
| **[IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)** | **Canonical 22-section implementation plan** (template-mandated filename per template line 113-115). Expands the existing `18-IMPLEMENTATION-PLAN.md` stub; doc 18 is preserved as historical artifact. 22 sections. |
| [31-INDEPENDENT-VERIFICATION.md](./31-INDEPENDENT-VERIFICATION.md) | Original lead-authored Pass 2 (adversarial) + Pass 3 (verifier) + later native-subagent continuation findings. The original score was **90.5/100**; continuation review downgraded several areas to WATCH, and fresh adversarial/verifier passes also returned WATCH with concrete patch items. |

## Routing note (for /lfg pipeline consumers)

This audit is a **documentation-only** deliverable. The `/lfg` pipeline's ce-work → ce-simplify → ce-commit-push-pr → CI-watch steps were **intentionally skipped** because:
1. The audit prompt explicitly states "Do not modify production code."
2. The only files created are markdown audit documents inside `.ai/03_plans/`.
3. No build, test, or CI validation applies to documentation-only changes.

The implementation plan (doc 18) defines the phased code work that a future session should execute.

## Canonical implementation plan (2026-06-25)

The [Create-Implementation-Prompt pass](./IMPLEMENTATION_PLAN.md) produced
the canonical 22-section plan that template
`.ai/08_prompts/000_Planning Prompts/Create-Implementation-Prompt.md`
mandates. It expands doc 18 (the 96-line stub) into a 22-section
authoritative plan a codebase AI can execute without
reinterpreting feature intent. Score: **90.5 / 100** per
[31-INDEPENDENT-VERIFICATION.md](./31-INDEPENDENT-VERIFICATION.md) before
the continuation fixes. Current status: **WATCH after fresh adversarial
and verifier review**; the R1/R2 patch items have been reconciled in the
canonical plan and ledger, but clean APPROVE was not re-run in this pass and
the global worktree still contains unrelated app-code diffs outside this
plan pack.

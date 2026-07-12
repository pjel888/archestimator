# Execution Ledger

**Purpose:** live tracker of execution status for all 44 UX issues. Update every session. This is THE active document of the IMPLEMENTATION folder.

**Distinct from:** [../LOOP_LEDGER.md](../LOOP_LEDGER.md), which tracks the planning task (complete). This ledger tracks execution.

**Status vocab:** `planned` → `in-progress` → `implemented` → `verified` → `released`
**Evidence vocab:** `not-run` → `local-only` → `browser-verified` → `provider-verified` → `manual-verified`

**How to update:** edit the row for the issue you touched. Set `Status`, `Last updated`, `Agent`, `Branch`, `Evidence`, `Notes`. Never delete history — append a line to `## Audit Trail` below.

---

## Phase 1 — Auth & Shell (Beta Gate)

| UX | P | Conflict group | Status | Evidence | Agent | Branch | Last updated | Notes |
|---|---|---|---|---|---|---|---|---|
| UX-002 | P0 | Auth/support | planned | not-run | — | — | — | Recommended starting pick. |
| UX-003 | P0 | Auth/support | planned | not-run | — | — | — | Depends on UX-002 states. |
| UX-004 | P0 | Root recovery | planned | not-run | — | — | — | Adjacent to auth group; coordinate proxy.ts changes. |
| UX-040 | P0 | Auth/support | planned | not-run | — | — | — | Consumes UX-002 beta access states. |
| UX-042 | P1 | Evidence/schema | planned | not-run | — | — | — | Ship before UX-028 (Phase 2). |
| UX-043 | P0 | Auth/support | planned | not-run | — | — | — | Auth+invite+workspace recovery. |

**Phase 1 exit gate:** all 6 issues `verified`. Auth/support conflict group cleared.

---

## Phase 2 — Projects & QA

| UX | P | Conflict group | Status | Evidence | Agent | Branch | Last updated | Notes |
|---|---|---|---|---|---|---|---|---|
| UX-028 | P0 | Operations/provider (QA side) | planned | not-run | — | — | — | Ship first in Phase 2. Consumes UX-042. |
| UX-041 | P0 | Evidence/schema | planned | not-run | — | — | — | Ship with UX-028. Evidence vocabulary. |
| UX-005 | P2 | Project/dashboard | planned | not-run | — | — | — | Settings role explanations. |
| UX-006 | P1 | Project/dashboard | planned | not-run | — | — | — | Group delete copy. |
| UX-007 | P0 | Project/dashboard | planned | not-run | — | — | — | Dirty modal close intercept. |
| UX-008 | P1 | Project/dashboard | planned | not-run | — | — | — | Destructive modal tone. |
| UX-009 | P1 | Project/dashboard | planned | not-run | — | — | — | Shared link chip card. |

**Phase 2 exit gate:** all 3 P0s `verified`. UX-028 + UX-041 usable by later phases.

---

## Phase 3 — Estimates Core

| UX | P | Conflict group | Status | Evidence | Agent | Branch | Last updated | Notes |
|---|---|---|---|---|---|---|---|---|
| UX-011 | P0 | Estimate sheet | planned | not-run | — | — | — | Visible save errors. Aligns with UX-027 toast contract. |
| UX-044 | P0 | Estimate sheet | planned | not-run | — | — | — | Numeric validation + a11y. |
| UX-010 | P1 | Estimate sheet | planned | not-run | — | — | — | Blank row create affordance. |
| UX-012 | P1 | Estimate sheet | planned | not-run | — | — | — | DnD undo + keyboard. |
| UX-013 | P1 | Estimate sheet | planned | not-run | — | — | — | Stale source badge. |
| UX-014 | P2 | Estimate sheet | planned | not-run | — | — | — | History unavailable reason. |
| UX-018 | P1 | Export/charts | planned | not-run | — | — | — | Chart derived state lint. Parallel-safe with estimate work. |

**Phase 3 exit gate:** UX-011 + UX-044 `verified`. Estimate sheet conflict group cleared.

---

## Phase 4 — Share & Export

| UX | P | Conflict group | Status | Evidence | Agent | Branch | Last updated | Notes |
|---|---|---|---|---|---|---|---|---|
| UX-022 | P0 | Publication/share | planned | not-run | — | — | — | Share recovery copy. |
| UX-035 | P0 | Publication/share | planned | not-run | — | — | — | Recipient first open summary. |
| UX-036 | P0 | Publication/share | planned | not-run | — | — | — | Recipient recovery paths. |
| UX-016 | P1 | Export/charts | planned | not-run | — | — | — | Export preflight. |
| UX-017 | P1 | Export/charts | planned | not-run | — | — | — | Preview design lint. |
| UX-037 | P1 | Publication/share | planned | not-run | — | — | — | Recipient action retry. |
| UX-015 | P2 | Publication/share | **GATED** | not-run | — | — | — | Dormant for Wave 1. Do not start without fresh owner decision. |
| UX-023 | P2 | Publication/share | planned | not-run | — | — | — | Activity load more. |

**Phase 4 exit gate:** UX-022 + UX-035 + UX-036 `verified`. Share recipient recovery proven.

---

## Phase 5 — Collab, Maps, Feedback

| UX | P | Conflict group | Status | Evidence | Agent | Branch | Last updated | Notes |
|---|---|---|---|---|---|---|---|---|
| UX-019 | P0 | Maps | planned (scope narrowed 2026-06-24) | not-run | — | — | 2026-06-24 | Map provider surfaces now in source (ProjectDetailsModal/ProjectLocationMap/ProjectAddressAutocomplete/google-maps loader); remaining work is address-only fallback path. See [02-CURRENT-STATE-ANALYSIS.md](../phase-5/UX-019-maps-location-fallback/02-CURRENT-STATE-ANALYSIS.md). |
| UX-020 | P0 | Collaboration/access | planned | not-run | — | — | — | Invite email readiness. |
| UX-001 | P1 | Copy/settings/feedback | planned | not-run | — | — | — | Public copy readiness. |
| UX-021 | P1 | Collaboration/access | planned | not-run | — | — | — | Realtime presence indicators. Sequence with UX-020. |
| UX-024 | P1 | Copy/settings/feedback | planned | not-run | — | — | — | AI disabled/quota/draft states. |
| UX-025 | P1 | Copy/settings/feedback | planned | not-run | — | — | — | Feedback mailto payload. |
| UX-026 | P1 | Copy/settings/feedback | planned | not-run | — | — | — | Feedback review pagination. |
| UX-027 | P1 | Copy/settings/feedback | planned (scope shifted 2026-06-24) | not-run | — | — | 2026-06-24 | Toast primitive now supports action button (commit 1582b617); ESLint bans native prompt/confirm/alert (commit 52010190); production prior art in component-library sidebar migration (commit dc529267). Remaining work: per-caller scoped-ID adoption + acceptance criteria pinning the action-button surface. Ship first or align all other Phase 5 transient feedback. |

**Phase 5 exit gate:** UX-019 + UX-020 `verified`. Toast scoped-ID pattern landed.

---

## Phase 6 — Provider & New Foundations

| UX | P | Conflict group | Status | Evidence | Agent | Branch | Last updated | Notes |
|---|---|---|---|---|---|---|---|---|
| UX-038 | P0 | Operations/provider | planned | not-run | — | — | — | Operations persona split. |
| UX-029 | P0 | Operations/provider | planned | not-run | — | — | — | Provider proof owners. |
| UX-030 | P1 | Estimate sheet (mobile) | planned | not-run | — | — | — | Mobile interrupted estimate. |
| UX-032 | P1 | PM governance | **SCOPE LOCKED** | not-run | — | — | — | Lightweight checklist only. No approvals/margin/lifecycle. |
| UX-033 | P1 | Library/cost | planned | not-run | — | — | — | Stale cost refresh queue. Lightweight. |
| UX-034 | P1 | Library/cost | planned | not-run | — | — | — | Attachment review lifecycle. Lightweight. |
| UX-039 | P1 | Operations/provider | **GATED** | not-run | — | — | — | Seeded/manual campaigns only. No rich composer. |
| UX-031 | P2 | Estimate sheet (field) | **GATED** | not-run | — | — | — | Dormant for Wave 1. No field package code. |

**Phase 6 exit gate:** UX-038 + UX-029 `verified`. Provider proof owners assigned.

---

## Decision Gates

| Issue | Gate | Resolution required to unlock |
|---|---|---|
| UX-015 | Versions panel | Fresh owner decision supersededing [../04-DECISION-APPLICATION-AND-FEEDBACK-CONTRACT.md](../04-DECISION-APPLICATION-AND-FEEDBACK-CONTRACT.md). Record date + decision text here when granted. |
| UX-031 | Field handoff | Cohort expansion acceptance beyond estimator/PM-only Wave 1. |
| UX-039 | Notification campaign | Owner re-approval for rich composer (currently lightweight only). |
| UX-032 | PM governance scope | Already scope-locked lightweight. Any expansion (approvals, margin alerts, lifecycle) needs fresh owner sign-off. |

When a gate is resolved, move the issue to `planned` (not `in-progress`) and update this table with the resolution date and source.

---

## Parallel Coordination

Use this section when two agents need to claim issues in the same conflict group concurrently. Format:

```
- YYYY-MM-DD: Agent A claims UX-NNN, Agent B claims UX-MMM, both in <conflict group>.
  Lead: <name>. Coordination note: <what's shared, what's sequenced>.
```

Default: this section is empty. Parallel claims inside a conflict group without an entry here are a contract violation.

---

## Blockers

Format:

```
- YYYY-MM-DD: UX-NNN blocked on <decision/dependency/drift>.
  Attempted: <what>. Needed: <what decision/resource>. Owner: <who>.
```

Escalate per [01-AGENT-OPERATING-CONTRACT.md §12](01-AGENT-OPERATING-CONTRACT.md#12-escalation).

---

## Audit Trail

Append-only log of meaningful state transitions (status changes, blocker opens/closes, gate resolutions, parallel-coordination entries). One line per event.

Format:

```
- YYYY-MM-DD HH:MM (TZ): UX-NNN <from-status> → <to-status>. Agent: <name>. Evidence: <tag>. Note: <optional>.
```

First entry:

- 2026-06-23: Ledger initialized. All 44 issues `planned`. IMPLEMENTATION folder created.
- 2026-06-24: Planning audit pass (no code changes; no status transitions). Reconciled pack file count to 723 (was 709). Recorded post-2026-06-23 codebase drift affecting UX-019 and UX-027 scope (see [../LOOP_LEDGER.md § Audit Pass](../LOOP_LEDGER.md#audit-pass-2026-06-24) and [../04-DECISION-APPLICATION-AND-FEEDBACK-CONTRACT.md § Enforcement](../04-DECISION-APPLICATION-AND-FEEDBACK-CONTRACT.md#enforcement-verified-2026-06-24)). All 44 issues remain `planned`; none promoted to `in-progress` because no implementation work started. UX-019 and UX-027 received scope-narrowing notes (still `planned`, not `in-progress`).

---

## Completion Summary (live)

| Phase | Total | planned | in-progress | implemented | verified | released |
|---|---|---|---|---|---|---|
| 1 | 6 | 6 | 0 | 0 | 0 | 0 |
| 2 | 7 | 7 | 0 | 0 | 0 | 0 |
| 3 | 7 | 7 | 0 | 0 | 0 | 0 |
| 4 | 8 | 8 | 0 | 0 | 0 | 0 |
| 5 | 8 | 8 | 0 | 0 | 0 | 0 |
| 6 | 8 | 8 | 0 | 0 | 0 | 0 |
| **Total** | **44** | **44** | **0** | **0** | **0** | **0** |

Update this table whenever a status changes. The summary is the at-a-glance answer to "how far along is the pack?".

---

## Gated / Locked Summary

| Type | Issues | Effect |
|---|---|---|
| Decision-gated (hard stop) | UX-015, UX-031, UX-039 | Cannot start without fresh owner resolution. |
| Scope-locked (binding for Wave 1) | UX-027, UX-032, UX-015, UX-031, UX-039 | Implementable but only within the locked scope. |
| Rate-limit policy | All share/invite/landing issues | Preserve existing Postgres durable limiters. Do not weaken. |
| Analytics policy | All analytics-touching issues | Vercel Web Analytics + Speed Insights only. Redaction seam required. |
| RBAC/RLS changes | Any issue adding new roles/policies | Requires fresh RBAC/RLS plan before code, even if issue is otherwise unlocked. |

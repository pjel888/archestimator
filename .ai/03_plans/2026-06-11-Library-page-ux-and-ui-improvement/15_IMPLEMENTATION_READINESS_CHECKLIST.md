# Implementation Readiness Checklist

Status: no-code handoff gate.

Implementation must not begin until this checklist is either complete or explicitly waived with documented risk.

## Evidence Readiness

| Gate | Status | Evidence needed |
| --- | --- | --- |
| Authenticated screenshots captured | Pending | Desktop, tablet, mobile, reduced motion. |
| Console/network logs captured | Pending | No unexpected runtime errors; chunk behavior known. |
| Accessibility tree snapshots captured | Pending | Search, toolbar, catalogue, tree, modal. |
| Performance trace captured | Pending | LCP, INP, CLS, long tasks, image requests. |
| DB counts rechecked | Source/DB-verified for planning; rerun before coding | Supabase read-only queries. |
| RLS/policy status rechecked | Source/DB-verified for planning; rerun before mutation work | Supabase read-only policy/advisor checks. |
| Product task model agreed | Drafted | Tasks in `10_UX_AUDIT_PLAN.md`. |
| Scope avoids speculative backlog | Complete | P3 items are explicitly out unless approved. |

## Design Readiness

| Gate | Status | Evidence needed |
| --- | --- | --- |
| 64px rail geometry accepted | Source-verified in docs; visual proof pending | Source refs are captured; authenticated screenshots still required. |
| No 288px Library sidebar assumption | Corrected in docs; visual proof pending | Future screenshots must confirm the default user-visible layout. |
| Existing primitives selected | Drafted | Matrix in `11_UI_DESIGN_SYSTEM_COMPLIANCE_AUDIT.md`. |
| No-op toolbar decision made | Pending | Hide or implement decision. |
| Add button neutral styling decision made | Pending | Token/class decision. |
| Detail surface pattern chosen | Pending | Inspector/drawer/sheet/modal decision. |
| Discontinued item policy chosen | Pending | Show badge/filter or exclude. |
| Empty root category policy chosen | Pending | Show, collapse, or hide. |

## Accessibility Readiness

| Gate | Status |
| --- | --- |
| Keyboard criteria defined | Complete |
| Focus criteria defined | Complete |
| Status-message criteria defined | Complete |
| Tree pattern chosen | Pending |
| Combobox/listbox criteria defined | Complete |
| Mobile/reflow criteria defined | Complete |
| Contrast/target-size report captured | Pending |

## Performance Readiness

| Gate | Status |
| --- | --- |
| Production build trace plan defined | Complete |
| Current data baseline defined | Complete |
| Scale fixture plan defined | Complete |
| Virtualization decision gate defined | Complete |
| Next.js 16 image preload rule corrected | Complete |
| Chunk/cache scenario defined | Complete |
| Actual production trace captured | Pending |

## Recommended First Implementation Slice

After readiness evidence is collected, the safest first slice is:

1. Hide or wire no-op Filter/Group controls.
2. Neutralize Add action styling.
3. Clarify discontinued item handling.
4. Add missing accessibility status/label fixes found during audit.

Do not start with full detail/edit, virtualization, or new filter architecture until baseline evidence is complete.

## Go/No-Go Decision

Go to implementation only if:

1. P0 readiness blockers are complete.
2. The implementation slice is limited and testable.
3. Source, schema, and design-system impacts are known.
4. Accessibility and performance acceptance criteria are attached to the slice.
5. The future owner knows whether this is an audit-fix pass, a detail surface project, a filter project, or a performance project.

No-go if:

1. Authenticated visuals are still missing.
2. The requested work depends on old false claims.
3. Scope combines no-op controls, detail/edit, filters, virtualization, and schema mutation in one pass.
4. RLS/RPC policy review is missing for mutation work.

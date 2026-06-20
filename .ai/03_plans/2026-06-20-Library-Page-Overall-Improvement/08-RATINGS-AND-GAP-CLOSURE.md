# 08 - Ratings And Gap Closure

## Purpose

This document records the hardening-pass ratings and the closure criteria that
make the plan pack implementation-ready. Ratings measure planning readiness, not
implemented software.

## Initial Ratings From Review Lanes

| Lane | Strategy | Quality | Readiness | Notes |
| --- | ---: | ---: | ---: | --- |
| Product strategy | 78% | 86% | 82% | Strong direction, missing beta metrics and scope cutline. |
| UX/design | 82% | 86% | 72% | Good principles, missing state matrices and responsive contracts. |
| Feasibility | 78% | 76% | 58% | Missing route/cache/data/rollback contracts. |
| Security | 38% | 45% | 32% | Actor, RLS, IDOR, exposure, and input/file risks not specified. |
| Research | 82% | 80% | 76% | Good grounding, needed sharper table/filter/import/perf implications. |
| QA/adversarial | 84% | 88% | 72% | Happy path covered better than hostile/failure cases. |

## Gap Closure Matrix

| Gap | Closure Artifact | Closure Standard |
| --- | --- | --- |
| Beta outcomes undefined | `09-MVP-STRATEGY-AND-SUCCESS-METRICS.md` | Hypotheses, metrics, actors, and cutline are explicit. |
| Surface behavior underspecified | `10-LIBRARY-SURFACE-SPECS.md` | Overview, components, templates, inspector, add, folders, and insert states are specified. |
| Source trust unclear | `11-SOURCE-TRUST-STATE-MATRIX.md` | Freshness, confidence, lifecycle, linked/overridden/detached/source-changed semantics are defined. |
| Responsive/a11y incomplete | `12-RESPONSIVE-ACCESSIBILITY-INTERACTION-CONTRACT.md` | Breakpoints, toolbar behavior, focus, keyboard, screen reader, and table/grid choice are defined. |
| Route/cache/data contracts missing | `13-DATA-CONTRACTS-ROUTE-CACHE.md` | URL params, invalid states, payload additions, mutation cache behavior, and stale targets are defined. |
| Security weak | `14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md` | Threat model, actor matrix, RLS/authz, IDOR, public exposure, cache bleed, audit/rate limits are defined. |
| Input/file safety missing | `15-INPUT-IMPORT-EXPORT-FILE-HANDLING.md` | Text, money, URLs, CSV, upload, import, export, and sanitization rules are defined. |
| Perf/network/concurrency weak | `16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md` | Budgets and recovery behavior are defined. |
| Sequencing/rollback vague | `17-BLAST-RADIUS-SEQUENCING-ROLLBACK.md` | Phase dependencies, high-blast areas, rollback plans, and no-go gates are defined. |
| QA not adversarial enough | `18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md` | Hostile scenario matrix and completion proof checklist are defined. |

## Hardened Readiness Score

The pack is considered 95%+ planning-ready when:

- every high-severity lane gap maps to a named document and phase gate
- every implementation phase has entry evidence, tests, and rollback notes
- every user-facing state has a matching security/data/failure contract
- the final implementation report can cite exact documents for acceptance
  criteria instead of relying on interpretation

The remaining 5% is intentionally reserved for implementation discovery:
schema constraints, current RLS details, exact component APIs, and rendered UI
proof can only be finalized during the code pass.

## No-Go Conditions For Implementation

Do not start broad visual implementation if any of these are unresolved:

- selected component/template route-state behavior is still ambiguous
- public/private source metadata boundaries are unsettled
- actor capability and server-side authorization tests are not planned
- overview component payload cannot safely support visible trust metadata
- insert target resolution can mutate stale or cross-workspace estimates
- large-list behavior has no budget or fallback
- rollback path for a phase is "manually undo everything"

## Completion Claim Boundary

This planning pass can claim:

- the plan pack has been audited across product, design, implementation,
  security, research, and QA lenses
- the missing high-risk implementation contracts have been added
- code implementation has a concrete phase and validation map

This planning pass cannot claim:

- the Library UI has changed
- tests pass for behavior that has not been implemented
- browser/screenshot proof exists
- database/RLS/provider changes have been applied

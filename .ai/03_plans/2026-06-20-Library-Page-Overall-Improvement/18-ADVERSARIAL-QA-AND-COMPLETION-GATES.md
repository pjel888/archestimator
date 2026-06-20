# 18 - Adversarial QA And Completion Gates

## Purpose

This document is the hostile validation map for the implementation pass. It
turns the plan into proof obligations.

## Adversarial Scenario Matrix

| Scenario | Attack / Failure | Required Outcome |
| --- | --- | --- |
| Cross-workspace component param | User manually enters another workspace component ID. | Permission-safe not-found/denied; no details leaked. |
| Cross-workspace folder mutation | User submits folder ID from another workspace. | Server rejects; UI reports safe error. |
| Cross-workspace estimate target | Insert uses stale/foreign estimate ID. | Mutation blocked; target reselect required. |
| Public source leakage | Shared link requests source URL/confidence/history. | Private metadata redacted. |
| Viewer mutation | Read-only actor opens hidden mutation endpoint/action. | Server denies. |
| Workspace switch cache bleed | User switches workspace with inspector open. | Old data clears/refetches; no prior-workspace details visible. |
| Deleted search result | Overview result opens deleted component. | Recoverable not-found with clear selection. |
| Discontinued insert | User inserts discontinued component. | Block or explicit override per lifecycle rule. |
| Low-confidence insert | User inserts low-confidence component. | Warning before insert. |
| Source changed after insert picker | Component changed while picker open. | Review/refetch required before mutation. |
| Target estimate deleted | Estimate deleted while insert UI open. | Mutation blocked; choose new target. |
| Folder delete with children | Folder contains components. | Confirmation names count and consequences. |
| Concurrent folder rename | Folder changes while rename dialog open. | Conflict state; no silent overwrite. |
| Quick Add network fail | Save request fails. | Form data preserved; retry available. |
| Quick Add unsafe input | Formula-like text or bad URL submitted. | Sanitized/rejected with field message. |
| Bulk action partial invalid IDs | Some selected IDs missing/archived/foreign. | Valid IDs handled; skipped IDs reported safely. |
| Dense search out of order | Slow old query returns after newer query. | Newer visible query wins. |
| 500-row dense view | Large visible result set. | Budget met or fallback used. |
| Screen reader route open | Component opens from search/deep link. | Selection and result count announced once. |
| Mobile drawer overlap | Inspector opens on narrow screen. | Toolbar/actions do not overlap content. |
| Template missing dependency | Template preview includes missing component. | Warning and recovery before insert. |
| Template partial failure | Insert partially fails. | User gets recovery/report; no silent success. |
| Import/export future path | Export includes private fields by default. | Private fields redacted unless explicit future policy changes. |

## Evidence Requirements

For each implemented phase, final report should include:

- changed files
- target behavior
- tests/checks run
- exact command evidence
- skipped checks and why
- residual risk

Security-sensitive phases also include:

- actor matrix coverage
- IDOR coverage
- public/private redaction coverage
- workspace-switch/cache coverage

Performance-sensitive phases also include:

- seeded-row count or server-query evidence
- measured or observed budget result
- fallback decision if budget fails

## Minimum Command Set By Risk

Docs-only changes:

- `git diff --check`
- targeted link/path inspection

Narrow source changes:

- targeted unit/DOM test for touched behavior
- TypeScript/LSP or project typecheck when types are touched

Security/data/cache changes:

- targeted authz/IDOR/public-redaction tests
- cache invalidation tests
- relevant typecheck

UI interaction changes:

- targeted DOM/unit tests
- browser/manual proof only when the claim depends on rendered interaction,
  responsive behavior, focus, or no-overlap evidence

## Completion Gates

Implementation can be called complete only when:

- no remaining native `window.prompt`/`window.confirm` in Library-owned flows
- selected component/template deep links work and fail safely
- Quick Add works for valid editors and is blocked for read-only actors
- source trust states render correctly and use private/public exposure rules
- folder destructive actions show affected count and safe alternatives
- template preview names target and dependency health
- cache invalidation covers overview/components/templates/estimate insert
- workspace switch cannot show prior-workspace library data
- large-list behavior meets budget or uses documented fallback
- adversarial scenario matrix has pass/skipped-risk entries
- final report does not claim browser/provider/manual proof unless it actually
  happened

## No-Go Release Conditions

Do not release if any of these remain true:

- public/shared surfaces expose private library metadata
- cross-workspace IDs can reveal object details or mutate data
- stale insert targets can mutate the wrong estimate
- destructive folder actions lack affected-count review
- quick-add validation can save malformed required data
- dense/list mode has known severe keyboard or focus traps
- cache bleed across workspace switch is reproducible
- performance stalls at beta-scale data without a fallback

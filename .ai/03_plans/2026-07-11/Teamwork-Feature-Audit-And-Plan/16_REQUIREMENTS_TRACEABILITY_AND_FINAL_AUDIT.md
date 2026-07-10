# Requirements Traceability and Final Audit

## Requirement Matrix

| Requirement | Outcome | Primary units | Acceptance criteria |
| --- | --- | --- | --- |
| `REQ-001` | canonical effective access policy | 001, 002 | `AC-001` |
| `REQ-002` | sheet-only metadata isolation | 002, 004 | `AC-002` |
| `REQ-003` | project member lifecycle | 005, 007 | `AC-003` |
| `REQ-004` | estimate access lifecycle | 005, 008 | `AC-004` |
| `REQ-005` | scope-correct invitation lifecycle | 003, 005 | `AC-005` |
| `REQ-006` | explicit add/invite/role semantics | 005, 007, 008 | `AC-006` |
| `REQ-007` | dedicated Team access surface | 006, 007, 008 | `AC-007` |
| `REQ-008` | scoped project presence | 010, 011 | `AC-009` |
| `REQ-009` | supported estimate cursors | 010, 011, 012 | `AC-010`, `AC-011` |
| `REQ-010` | project cursors remain gated | 013, 019 | `AC-015` |
| `REQ-011` | Activity facts/receipt | 009, 019 | `AC-012` |
| `REQ-012` | Publisher authority/compatibility | 014, 019 | `AC-013` |
| `UX-001` | project manager journey | 007, 015 | `AC-007` |
| `UX-002` | restricted-sheet journey | 008, 015 | `AC-004` |
| `UX-003` | recipient consent/lifecycle journey | 005, 015 | `AC-008` |
| `UX-004` | accessible complete states | 007, 008, 012, 015 | `AC-008`, `AC-010` |
| `SEC-001` | deny-default/target dominance | 002, 005 | `AC-001`, `AC-003` |
| `SEC-002` | token/replay/rate/origin safety | 003, 005 | `AC-005` |
| `SEC-003` | realtime identity/capabilities | 010, 011 | `AC-009`, `AC-011` |
| `SEC-004` | roster/metadata privacy | 004, 006 | `AC-002` |
| `DATA-001` | atomic D1 invariants | 003 | `AC-014` |
| `DATA-002` | transaction/outbox/fact boundary | 003, 005, 009 | `AC-005`, `AC-012`, `AC-014` |
| `DATA-003` | set-based query/policy parity | 002, 004 | `AC-002` |
| `DATA-004` | optimistic D1 conflict recovery | 004, 015 | `AC-019` |
| `PERF-001` | D1/UI/query budgets | 004, 013 | `AC-015` |
| `PERF-002` | DO fanout/reconnect budgets | 010, 011, 013 | `AC-015` |
| `OPS-001` | structured observability/error handling | 005, 010, 013 | `AC-016` |
| `OPS-002` | separate local/hosted/release proof | 015, 016, 017, 018, 019 | `AC-017` |
| `OPS-003` | free-tier Cloudflare architecture decision | 013, 019 | `AC-018` |
| `OPS-004` | source-matched hosted Worker/DO deployment strategy | 016, 017, 018, 019 | `AC-020` |

## Acceptance Criteria

| Criterion | Required evidence |
| --- | --- |
| `AC-001` | table-driven policy/action/UI parity including owner/equal-manager denials |
| `AC-002` | sheet-only and viewer queries return no inaccessible estimate/roster/email/invite metadata |
| `AC-003` | project add/role/remove/revoke lifecycle is capability-correct and explicit |
| `AC-004` | direct sheet admin manages restricted sheet; inheritance/removal effects are honest and atomic |
| `AC-005` | invitation create/reissue/revoke/accept is scope-correct, atomic, idempotent, rate-limited, and POST-consented |
| `AC-006` | invite cannot silently downgrade; add/invite/change commands are distinct |
| `AC-007` | Team access UI exposes all required project controls and no unauthorized control |
| `AC-008` | recipient/manager states are accessible, keyboard-complete, responsive, and accurate |
| `AC-009` | roster/presence identity is server-trusted with scoped person/session semantics; removed subjects target 5-second revocation and are denied within 30 seconds |
| `AC-010` | two editors see supported, accessible, reconnecting estimate cursors with trusted labels |
| `AC-011` | viewer/forged/unknown/oversized/rate-abusive events are denied at the DO; removed subjects cannot publish after 30 seconds |
| `AC-012` | all access mutations produce approved redacted Activity facts with consumer receipt |
| `AC-013` | Publisher public authority remains separate and compatibility receipt passes |
| `AC-014` | active D1 constraints survive concurrent and injected-failure tests |
| `AC-015` | D1/UI/DO budgets and caps pass normal/10x/abuse proof, including 5-second revocation target/30-second maximum; project cursors stay gated otherwise |
| `AC-016` | structured logging/error-handling and operational metrics gates pass without sensitive data |
| `AC-017` | local integration, hosted D1, hosted DO/browser, and release evidence are separately classified |
| `AC-018` | existing primitives meet Teamwork needs within cost posture; paid Platforms remains deferred |
| `AC-019` | a real D1 stale write is rejected with the stable code; authoritative state refetches; local input remains available to reapply/copy; telemetry fires |
| `AC-020` | owner authorizes a source-matched Worker version/deployment strategy, including 0% override limits and nonzero DO canary/cutover when required |

All implementation/product criteria are `FAIL` at plan time because evidence is planned, not collected. `AC-020` is `BOUNDARY` because it is governed by active `AUTH-001`.

## Planning Readiness Audit

| Planning question | Result | Evidence |
| --- | --- | --- |
| Is current behavior source-audited? | PASS | `03_SOURCE_CODEBASE_ARCHIVE_AND_STALENESS_AUDIT.md` |
| Are ambiguities closed? | PASS | `04`, `05`, `07`, `15` decision tables |
| Is the UX complete enough to implement? | PASS | `08_USER_JOURNEYS_UX_UI_AND_ACCESSIBILITY.md` |
| Are security/data/performance/ops gates specified? | PASS | `06`, `09`, `12`, `13`, `14` |
| Are Activity/Publisher boundaries explicit? | PASS with future receipts | `10`, `11` |
| Is Cloudflare Platforms evaluated? | PASS, deferred | `12`, `15` |
| Is the unit DAG dependency-closed? | PASS | `IMPLEMENTATION_PLAN.md`, `plan-pack.json` |
| Is release being overclaimed? | PASS | release is `BOUNDARY`; local work is separated from `AUTH-001` |

## Final Implementation Audit Checklist

- Recompute scoped baseline and review drift.
- Verify every accepted requirement has a verified unit and passing criterion.
- Verify every risk is mitigated/accepted/closed with evidence.
- Verify no `PLANNED`, `FAIL`, or `STALE` tests remain for the claimed release scope.
- Validate all artifact/evidence/manifest hashes.
- Confirm Activity and Publisher receipts use current manifests.
- Confirm active D1 migration receipt and hosted proof source revisions match implementation.
- Confirm no raw token/email/URL or provider secret appears in artifacts.
- Confirm project cursor and paid-platform deferrals remain honest.
- Run `bun run validate:plan-pack -- <folder>` and `bun run validate:planning-prompts`.
- Run an independent read-only verifier before status elevation.

## Status Ceiling

The package is `CONDITIONALLY_READY`: `UNIT-001` through `UNIT-008` plus `UNIT-010` through `UNIT-013` are dependency-closed and executable. `UNIT-009`, `UNIT-014`, and downstream `UNIT-015` are blocked by stale overlap manifests; `UNIT-016` through `UNIT-019` remain blocked by `AUTH-001` plus their unresolved dependencies. Product criteria remain `FAIL` except boundary criterion `AC-020`; implementation, release, lifecycle, and terminal states must be elevated independently and only with fresh evidence.

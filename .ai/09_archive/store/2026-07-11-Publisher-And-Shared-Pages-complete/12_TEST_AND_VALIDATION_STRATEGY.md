# 12 - Test And Validation Strategy

## Truth Boundary

Focused execution evidence now covers the implemented Publisher/share paths,
including the current activation, immutable-issuance, recipient, and roster
contracts. The canonical `TEST-*` records and `GATE-001` through `GATE-003`
remain unpromoted until `UNIT-022` admits the current Publisher and Activity
receipts, rechecks the full integrated gate, and records the browser-only proof
boundary. Descriptive scenarios use `SCENARIO-*`; they are not alternate test
IDs.

## Canonical Test Reciprocity

The table below is the human-readable mirror of `plan-pack.json`. Criterion IDs
are exact and must not be remapped without updating both manifest directions.

| Canonical test | Exact criteria | Focused proof |
|---|---|---|
| TEST-001 | AC-001 | Share entry points |
| TEST-002 | AC-002, AC-003 | Wizard progression and success |
| TEST-003 | AC-004, AC-005, AC-006 | URL, Copy, native Web Share fallback |
| TEST-004 | AC-007, AC-008 | Authenticated manager preview and banner |
| TEST-005 | AC-011, AC-012, AC-013 | Responsive roster |
| TEST-006 | AC-014, AC-015 | Roster pagination |
| TEST-007 | AC-016, AC-017, AC-052 | Search and debounce |
| TEST-008 | AC-020 | Dynamic proposal status |
| TEST-009 | AC-024, AC-025 | Row selection without per-row buttons |
| TEST-010 | AC-026, AC-027, AC-028 | Comment date, author, page scroll |
| TEST-011 | AC-029, AC-030 | Print control and print CSS |
| TEST-012 | AC-031 | Expiry visibility |
| TEST-013 | AC-032 | Cover fallback |
| TEST-014 | AC-034, AC-035 | Password reveal and recovery hint |
| TEST-015 | AC-036 | Currency formatting |
| TEST-016 | AC-037, AC-039 | Expired/revoked and empty inbox copy |
| TEST-017 | AC-038 | Malformed recipient row fails closed, no partial list |
| TEST-018 | AC-040 | Bounded JSON route bodies |
| TEST-019 | AC-040 | Misleading/chunked/encoded body cases |
| TEST-020 | AC-040 | Bounded unsubscribe form body and AC-088 scenario in TEST-039 |
| TEST-021 | AC-041 | Comment GET locked status |
| TEST-022 | AC-041 | Decision GET locked status |
| TEST-023 | AC-042 | Durable decision limiter before mutation |
| TEST-024 | AC-043 | Server cursor and page cap |
| TEST-025 | AC-044 | Client load-more cursor append |
| TEST-026 | AC-045 | Concurrent snapshot reentrance |
| TEST-027 | AC-046 | Provider readiness plus request-time secret denial |
| TEST-028 | AC-047 | Events route and consumer absence |
| TEST-029 | AC-047 | Dead event union/CHECK absence |
| TEST-030 | AC-048 | FK schema upgrade and parity |
| TEST-031 | AC-049 | Project cascade |
| TEST-032 | AC-049 | Workspace cascade and recipient SET NULL |
| TEST-033 | AC-048 | Orphan/mid-copy failure rollback and digest parity |
| TEST-034 | AC-050 | SQL aggregation |
| TEST-035 | AC-053 | 10-publication evaluator |
| TEST-036 | AC-053 | 50-publication evaluator |
| TEST-037 | AC-053 | 100-publication evaluator |
| TEST-039 | AC-009, AC-010, AC-018, AC-019, AC-021, AC-022, AC-023, AC-033, AC-051, AC-055, AC-056, AC-057, AC-058, AC-059, AC-060, AC-061, AC-062, AC-063, AC-064, AC-065, AC-066, AC-067, AC-068, AC-069, AC-070, AC-071, AC-072, AC-073, AC-074, AC-075, AC-076, AC-077, AC-078, AC-079, AC-080, AC-081, AC-082, AC-083, AC-084, AC-085, AC-086, AC-087, AC-088 | Integration contract matrix below |

## Focused Files And Commands

### Security and data

```bash
bunx vitest run tests/vitest/publication-body-size.test.ts
bunx vitest run tests/vitest/share/share-page-get-routes-contract.test.ts
bunx vitest run tests/vitest/project-publication-decision.test.tsx
bunx vitest run tests/vitest/publication-comment-pagination.test.ts
bunx vitest run tests/vitest/publication-snapshot-reentrance.test.ts
bunx vitest run tests/vitest/publication-runtime-readiness.test.ts
bunx vitest run tests/vitest/publication-dead-code.test.ts
bunx vitest run tests/vitest/publication-fk-migration.test.ts
bunx vitest run tests/vitest/perf/publisher-roster-evaluator.test.ts
```

### Publisher, share, preview, and recipient

```bash
bunx vitest run tests/vitest/publisher-wizard.test.tsx
bunx vitest run tests/vitest/publisher-roster-client.test.tsx
bunx vitest run tests/vitest/publisher-roster-client.test.tsx
bunx vitest run tests/vitest/publisher-manager-preview-route.test.tsx
bunx vitest run tests/vitest/share-page-header-status.test.tsx
bunx vitest run tests/vitest/project-publication-page.test.tsx
bunx vitest run tests/vitest/project-publication-page.test.tsx
bunx vitest run tests/vitest/project-publication-comments.test.tsx
bunx vitest run tests/vitest/project-publication-page.test.tsx
bunx vitest run tests/vitest/project-publication-page.test.tsx
bunx vitest run tests/vitest/recipient-inbox-dead-end.test.tsx
bunx vitest run tests/vitest/recipient-proposals-route-gate.test.ts
```

Existing route/interaction contracts updated in the same owning unit:

```bash
bunx vitest run tests/vitest/share/share-page-decision-bar-copy-contract.test.tsx
bunx vitest run tests/vitest/share/share-page-get-routes-contract.test.ts
bunx vitest run tests/vitest/project-publication-decision.test.tsx
```

### Integration and static gates

```bash
bun run type-check
bun run lint
bun run validate:error-handling
bun run validate
git diff --check
bun run validate:plan-pack -- .ai/03_plans/2026-07-10/Publisher-And-Shared-Pages
```

`TEST-040` is the completion static audit for `AC-054`: confirm the Publisher
worktree diff contains no deploy or hosted-provider mutation command, then bind
that inspection to `18_FINAL_COMPLETION_AUDIT.md`.

## Adversarial Scenario Matrix

| Scenario | Canonical test | Assertion |
|---|---|---|
| SCENARIO-S01 | TEST-018 | Each JSON POST rejects actual bytes above its route limit with 413 |
| SCENARIO-S02 | TEST-019 | Absent, invalid, and understated length headers plus chunked bodies cannot bypass |
| SCENARIO-S03 | TEST-019 | Unsupported compression is 415; no parse or mutation occurs |
| SCENARIO-S04 | TEST-020 | Unsubscribe enforces 1 KiB before form parsing |
| SCENARIO-S05 | TEST-023 | Durable D1 denial happens before decision mutation |
| SCENARIO-S06 | TEST-023 | Separate module/isolate instances do not imply shared global state |
| SCENARIO-S07 | TEST-027 | Missing provider bindings fail explicit readiness and request-time readers |
| SCENARIO-S08 | TEST-028, TEST-029 | Events route and dead type have zero live consumers |
| SCENARIO-D01 | TEST-030 | Explicit-column rebuild preserves counts, digests, indexes, triggers, constraints |
| SCENARIO-D02 | TEST-033 | One orphan on every FK edge aborts with source unchanged |
| SCENARIO-D03 | TEST-033 | Mid-copy failure leaves no partial rebuild |
| SCENARIO-D04 | TEST-031, TEST-032 | Cascades and nullable-recipient SET NULL match contract |
| SCENARIO-P01 | TEST-004, TEST-039 | Unauthenticated/non-manager/wrong-workspace/revoked role sees no snapshot |
| SCENARIO-P02 | TEST-004, TEST-039 | Public token or recipient cookie alone grants no manager preview authority |
| SCENARIO-P03 | TEST-004, TEST-039 | Every refresh reruns RBAC; preview mutations remain unavailable |
| SCENARIO-R01 | TEST-017 | Malformed row returns typed unavailable and no partial IDs/titles |
| SCENARIO-R02 | TEST-016, TEST-039 | Legitimate expired/revoked/email mismatch states show recovery guidance |
| SCENARIO-U01 | TEST-003, TEST-039 | Native Web Share is progressive; Copy remains universal; no QR exists |
| SCENARIO-U02 | TEST-009, TEST-039 | Row keyboard model has one tab stop and preserves nested controls |
| SCENARIO-U03 | TEST-039 | JS-disabled recipient view retains header, summary, and estimate data |
| SCENARIO-U04 | TEST-039 | Sticky controls do not cover content and have named regions |

## Browser-Only Proof

Browser automation is not a default gate. Run targeted browser proof only for
claims that unit/DOM/static checks cannot prove:

1. Wizard/card responsive composition at 375, 768, and 1440 px.
2. Manager preview navigation, persistent banner, and disabled mutations.
3. Sticky decision behavior during real scroll.
4. Roving row keyboard behavior in the rendered table.
5. JS-disabled server-rendered proposal content.
6. Chrome and Safari print layout.

Do not claim screen-reader or hosted-production proof from DOM tests. A manual AT
check may be recorded separately if performed; it is not pre-credited here.

## Gate Exit Conditions

- `GATE-001`: TEST-018 through TEST-029 plus mapped TEST-039 security scenarios pass.
- `GATE-002`: TEST-030 through TEST-037 plus mapped TEST-039 data scenario passes.
- `GATE-003`: TEST-001 through TEST-017 and mapped TEST-039 UX scenarios pass.

Until then all three gate statuses remain `FAIL`.

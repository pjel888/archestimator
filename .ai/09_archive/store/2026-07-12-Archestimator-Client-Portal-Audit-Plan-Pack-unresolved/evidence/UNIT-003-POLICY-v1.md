# UNIT-003 Central Policy Receipt

## Scope and status

- **Unit:** `UNIT-003`
- **Run scope:** `IMPLEMENT_LOCAL`
- **Result:** `PASS`
- **Implementation:** `src/lib/client-portal/policy.ts`
- **Focused test:** `bunx vitest run tests/vitest/client-portal-policy.test.ts --maxWorkers=1` — 7 passed.
- **TypeScript:** `bunx tsc --noEmit --pretty false` — passed.

## Delivered contract

`evaluateClientPortalPolicy` is the single deny-by-default evaluator for new Client Portal work. It accepts a typed internal, recipient, or anonymous actor plus portal, issue, section, thread, and field context; it returns an allow/deny decision, a safe reason code, the visibility behavior, and effective capability hints.

- Internal users need matching workspace/project relationships plus project role or scoped portal grants.
- Recipients need matching portal membership, active state, verified identity for writes, role-template capability, ceiling eligibility, and relationship/section constraints.
- Explicit deny overrides win before role capabilities; allow overrides never escape the portal capability ceiling.
- Section filtering runs through the evaluator, so hidden/disabled/restricted sections are omitted before a public DTO can serialize them.
- Margin, internal markup, internal source, and provenance are permanently denied to public actors. Supplier, unit-cost, misc-cost, and adjustment-detail are controlled fields: they remain hidden until the section explicitly includes them in its field policy.
- Formal decisions require a current issue, an active verified designated approver, and `decision:submit_formal`; there is no row/estimate decision input.
- `createClientPortalRolePreview` uses the same evaluator and a typed preview actor. `requireClientPortalPolicy` is the repository/action integration guard for future routes and server actions.

## Acceptance review

| Acceptance claim | Evidence | Result |
|---|---|---|
| Deny by default | Unknown capability, mismatched portal, inactive recipient, unverified write, disabled section, and restricted field all resolve to denial. | PASS |
| Hidden resources absent | `filterClientPortalSections` retains only allowed sections; hidden-resource decisions set `hideResource`. | PASS |
| Public route and preview share evaluator | Preview delegates directly to `evaluateClientPortalPolicy`; no alternate preview authorization path exists. | PASS |
| No direct role-string authorization in new routes | No v2 route exists yet; the v2 module exports capability-based evaluator/guard only. Legacy Publisher and `/share` role checks remain compatibility code until their owned migration units. | PASS |

## Validation cases

The focused suite proves anonymous writes remain denied, recipient/portal relationship and verification fail closed, deny overrides win, formal decisions require the current issue, restricted/disabled sections are filtered before serialization, controlled cost fields are hidden by default, and role preview uses the same result.

## Next unit

`UNIT-004` owns the typed section registry and must use `ClientPortalSectionKind` and the policy section metadata instead of creating a parallel untyped config surface.

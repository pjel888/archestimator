# Cohort Query, Abandonment, And Support Model

This supporting model expands `PERF-001`, `OPS-001`, `SEC-001`, `RISK-004/008`,
and `UNIT-006`. It owns no Admin presentation or outreach policy.

## Query Contract

The server caller must satisfy `requireAdminContext` (page context) or
`assertAdminApiAccess`/`gateAdminApiMutation` (action/API context) before
invoking the repository; the plain `requireAdmin` name does not exist.
The repository returns an allowlisted DTO with opaque user ID, activation stage
and timestamps, selected path, safe project reference/name, derived stopped
state, and latest support status/time. It excludes email, token material, IP/user
agent, raw events or metadata, profile blobs, support subject/body, and outreach
history.

Pagination uses limit `1..100` and stable `(last_event_at DESC, user_id DESC)`
cursor ordering. Filters are allowlisted stage, stopped state, support state, and
created-at range. Invalid cursors, unknown filters, limit 101, non-admin access,
and empty D1 state are explicit test cases.

## Derived Stoppage Model

| State | Server-derived boundary | User recovery | Policy owner |
|---|---|---|---|
| `not_started` | Workspace ready and no project after 24 hours | Start sample/template/blank | Activation contract |
| `setup_stalled` | Project created and no valid total after 24 hours | Resume partial setup or delete and restart | Activation contract |
| `value_stalled` | Valid total and no export/publication after 72 hours | Open health/export/publish target | Activation contract |
| `handoff_stalled` | Publication and no recipient engagement after 72 hours | Review recipient/share state or support | Publisher receipt plus Activation query |
| `active` | Progress remains inside the applicable threshold | Continue current task | Activation contract |
| `completed` | Recipient decision or configured terminal milestone | Reopen checklist/history as needed | Program/Operating composition |

Thresholds are query defaults evaluated with an injected clock. Beta Operating,
not this pack, decides dashboard display, outreach thresholds, contact policy, or
whether an operator acts on a row.

## Support Join

The query may read only latest support conversation status/time from the current
support repository/migration. Output normalizes `none | open | pending |
resolved`. It never copies a support message, subject, attachment, participant
address, or arbitrary metadata into activation state.

## Performance And Failure Contract

- One bounded SQL query/CTE serves the page; no per-user read is allowed.
- The 10k-user fixture must show named activation indexes in the query plan,
  stable cursor pages, and at most 100 returned rows.
- Current progress reads remain one `(user_id, workspace_id)` lookup.
- D1/query failure returns a shaped unavailable result and redacted diagnostic;
  it never falls back to an unbounded scan or partial privacy-expanded DTO.

## Proof And Handoff

`TEST-007` owns query-plan, pagination, limit, privacy snapshot, and 10k fixture
proof. `TEST-008` owns injected-clock boundaries, no-event/partial states, and all
support states. `ACT-RECEIPT-COHORT-CONSUMER-v1` lets Beta Operating prove that it
consumes this exact version and degrades explicitly; its UI is outside this pack.

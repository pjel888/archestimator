# 001 — Action-Inbox Server Actions Async Contract

> Closes **Critical** `UX-BUILD-001`. This is `next_unit`.

## unit_id
`UNIT-001`

## title
Restore the codebase build by making the action-inbox `"use server"` exports async.

## status
`READY`

## priority
`P0` — before recruiting. The build is broken at HEAD; no deployment is possible and every workshop/admin journey is blocked.

## severity_of_findings
Critical (`UX-BUILD-001`)

## effort
Trivial (~5 minutes). Add `async` to three function declarations.

## implementation_risk
`LOW` — the bodies already delegate to the inner async `runActionInboxMutation`; making the wrappers `async` only satisfies the React 19 / Next.js 16 `"use server"` contract. No behavior change.

## local_implementation_status
`NOT_STARTED`

## external_lifecycle_status
`NOT_REQUIRED` — no hosted proof needed; `bun run build` exit 0 is the local proof.

## requirements
`UX-001`

## findings
`UX-BUILD-001`

## existing_plan_links
None. The build break merged in `6510a0de3` (2026-07-16) and persisted undetected across the MVP Startup Readiness, Quality Master, and Infosec OWASP packs because none triggered a live build.

## goal
`bun run build` exits 0; `bun run dev` serves `/workshop`, `/admin`, `/admin/today`, `/privacy`, `/security`, `/access-required` without HTTP 500.

## security_invariants
1. The action-inbox server actions remain callable as server actions.
2. No behavior change to snooze/resolve/dismiss semantics.

## current_source_evidence
- `src/lib/admin/action-inbox-actions.ts:1` — `"use server";`
- `src/lib/admin/action-inbox-actions.ts:58` — `export function snoozeActionItem(itemId: string): Promise<ActionInboxActionResult>` (non-async)
- `src/lib/admin/action-inbox-actions.ts:61` — `export function resolveActionItem(...)` (non-async)
- `src/lib/admin/action-inbox-actions.ts:64` — `export function dismissActionItem(...)` (non-async)
- Bodies at `:59,62,65` return `runActionInboxMutation(...)` which is already async (`:20-56`).
- `artifacts/build-failure-log.txt` — full Turbopack diagnostic.
- `artifacts/dev-server-runtime-log.txt` — HTTP 500 responses for `/workshop`, `/admin`, `/admin/today`, `/privacy`, `/security`, `/access-required`.
- Import chain: `src/app/admin/today/page.tsx:1` → `@/components/admin/AdminActionInbox` → `@/lib/admin/action-inbox-actions`.

## affected_paths_and_resources
- `src/lib/admin/action-inbox-actions.ts`

## owned_paths
- `src/lib/admin/action-inbox-actions.ts`

## dependencies
None.

## preconditions
None.

## non_goals
- Adding single-use token / spent-jti tracking (Infosec concern; belongs to Infosec OWASP pack).
- Adding a CI guard for the `"use server"` async contract (`UX-BUILD-002`, deferred to Quality Master).
- Refactoring the action-inbox repository.

## implementation_sequence
1. In `src/lib/admin/action-inbox-actions.ts`, change three declarations:
   - `export function snoozeActionItem(itemId: string): Promise<ActionInboxActionResult>` → `export async function snoozeActionItem(itemId: string): Promise<ActionInboxActionResult>`
   - Same `async` addition for `resolveActionItem` (`:61`) and `dismissActionItem` (`:64`).
2. Run `bun run build`. Expect exit 0.
3. (Optional, not authorized by this pack) Run `bun run type-check`.

## data_or_schema_changes
None.

## authz_and_tenant_implications
None. Action-inbox authorization is unchanged.

## failure_and_exception_behavior
Unchanged. The inner `runActionInboxMutation` already handles `validation` / `not_found` / `failed`.

## acceptance_criteria
1. `snoozeActionItem`, `resolveActionItem`, `dismissActionItem` are declared `async function` (source inspection).
2. `bun run build` exits 0.
3. `curl -H 'x-archestimator-dev-auth-bypass: <secret>' http://127.0.0.1:3020/workshop` returns 200.
4. `curl -H 'x-archestimator-dev-auth-bypass: <secret>' http://127.0.0.1:3020/admin/today` returns 200 (with `ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1` if needed for admin DB bypass).

## acceptance_evidence
- Diff inspection confirming all three declarations are `async`.
- `bun run build` exit 0 (terminal output).
- Local dev server HTTP 200 on the previously-500 routes.

## test_decision
`TEST_PROPOSAL` (not authorized by this pack).

## exact_test_proposal_if_any
- **Risk:** A future regression reintroduces a non-async `"use server"` export and breaks the build silently until the next deploy attempt.
- **Cheapest decisive test:** none at the product level (the build itself is the test). The deferred `UX-BUILD-002` CI guard is the long-term answer.

## authorization_boundaries
None. The local edit is fully executable.

## observability_or_audit_requirements
None beyond existing audit logging via `writeAdminAuditEvent` (already called in `runActionInboxMutation`).

## recovery_or_fix_forward
If `async` somehow regresses behavior (it cannot, but defensively): revert the three lines. No D1 migration. No provider state.

## conflict_and_concurrency_notes
None. Single file, single writer.

## completion_signal
`UNIT-001` is `DONE` when all four acceptance criteria are evidenced. Pack's `next_unit` then advances to `UNIT-002` (the next Critical — closed-beta lead capture).

## next_unit_on_success
`UNIT-002`.

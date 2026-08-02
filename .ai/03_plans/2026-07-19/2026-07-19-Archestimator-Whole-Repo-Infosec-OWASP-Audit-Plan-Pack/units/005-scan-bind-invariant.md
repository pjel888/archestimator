# 005 — Component-Attachment Bind Requires Clean Scan + Scanner Wiring Decision

> **Historical provenance only.** `UNIT-005` is `SUPERSEDED` by `DEC-AUTO-007`.
> This predecessor did not implement the unit; current authority is
> `.ai/03_plans/2026-07-31/Code-Improvement/`.

> Closes `SEC-UPLOAD-001`, `SEC-UPLOAD-002`.

## unit_id
`UNIT-005` · **status:** `SUPERSEDED` · **priority:** P0 (first-alpha functionality + security) · **effort:** S–M · **implementation_risk:** LOW · **local_implementation_status:** `NOT_STARTED` · **external_lifecycle_status:** scanner-wiring path requires `AUTH-003`.

## requirements / findings
- Requirements: `SEC-004`.
- Findings: `SEC-UPLOAD-001` (scanner effectively disabled), `SEC-UPLOAD-002` (bind accepts pending).

## goal
Two interlocking fixes:

(a) **Security invariant:** A component-variant attachment cannot be bound unless its `scan_status` is `clean` or has an active `override_approved`. The bind gate no longer accepts `pending`.

(b) **Functionality:** First-alpha users can actually download attachments. The operator chooses one of:
- (i) Wire a real scanner (clamd sidecar or paid service — `AUTH-003`), OR
- (ii) Document the policy-scanner as the control and enable the scan job (`UPLOAD_JOBS_ENABLED=1`, `CLOUDFLARE_UPLOAD_JOBS_DRY_RUN=0`) so `pending` assets transition to `clean`.

Without (b), the security fix (a) would leave first users unable to attach any PDF/Excel.

## security_invariants
1. `component-mutation-d1.ts:1234` and `:1170` accept only `scan_status IN ('clean')` or `scan_status='override_approved' AND override_expires_at > now`. Drop `'pending'`.
2. The scan-cron's default dry-run is flipped (or an operator runbook step is documented) so first-alpha deployments can transition `pending` → `clean`.

## current_source_evidence
- `src/lib/component-library/component-mutation-d1.ts:1233-1239` — accepts `pending`.
- `:1169-1175` — same gate for re-linking existing attachments.
- `src/lib/uploads/clamd-scanner.ts:158-169` — returns policy-scanner unless `UPLOAD_SCAN_PROVIDER=clamd`.
- `src/lib/cloudflare/scheduled-upload-jobs.ts:63-65` — dry-run unless both env flags set.
- `src/app/api/internal/upload-scan/route.ts:85` — 503 unless enabled.
- `src/lib/uploads/scanning.ts:64-79` — `decideUploadScanGate` already fails-closed for `pending` on downloads.

## affected_paths_and_resources
- `src/lib/component-library/component-mutation-d1.ts` (guards at `:1170, :1234`).
- `wrangler.jsonc` (potentially — if option (b)(ii), set vars).
- Operator runbook doc (new `docs/UPLOAD_SCAN_RUNBOOK.md` or similar).

## owned_paths
- `src/lib/component-library/component-mutation-d1.ts`

## dependencies
None for the local code edit. Scanner-wiring path (b)(i) depends on `AUTH-003`.

## preconditions
None.

## non_goals
- Adding new scanner providers (recorded as future work).
- Changing the upload-route content-type allowlist (already correct).

## implementation_sequence
1. `component-mutation-d1.ts:1234` — change `scan_status IN ('pending', 'clean')` → `scan_status = 'clean'`. Same at `:1170`.
2. Update any test fixtures that bind pending attachments (search `tests/` for `scan_status.*pending` in component-mutation context).
3. Document operator runbook: to enable first-alpha downloads, either set `UPLOAD_SCAN_PROVIDER=clamd` + provision clamd (`AUTH-003`) OR explicitly accept the policy-scanner and set `UPLOAD_JOBS_ENABLED=1`, `CLOUDFLARE_UPLOAD_JOBS_DRY_RUN=0`. The policy-scanner is the documented control.
4. Run `bun run type-check`.

## data_or_schema_changes
None.

## authz_and_tenant_implications
None.

## failure_and_exception_behavior
Bind attempt on a `pending` asset → batch rejects → user sees "Attachment is not yet scanned; try again in a moment" (after the scan cron transitions it). Fail-closed.

## acceptance_criteria
1. `component-mutation-d1.ts:1234,1170` requires `scan_status = 'clean'` or active `override_approved`.
2. `bun run type-check` passes.
3. Operator runbook documents the choice (path i or ii).

## acceptance_evidence
Source/diff inspection + `type-check` exit 0 + runbook file present.

## test_decision
`TEST_PROPOSAL` (`CHEAPEST_DECISIVE_EXISTING_TEST`).

## exact_test_proposal_if_any
Risk: editor binds an unscreened asset; future scanner transition auto-activates it without review. Cheapest decisive test: `bun x vitest run tests/vitest/component-library/component-mutation-attachment-bind.test.ts` — bind with `scan_status='pending'` → assert rejection; bind with `scan_status='clean'` → assert success.

## authorization_boundaries
`AUTH-003` only for path (b)(i). Path (b)(ii) and the local code edit (a) require no auth boundary.

## observability_or_audit_requirements
Log bind-rejection events for visibility.

## recovery_or_fix_forward
If the new gate blocks legitimate binds because no scanner is configured, the operator enables the policy-scanner via env vars (path b-ii) — no code rollback needed.

## conflict_and_concurrency_notes
Coordinate with `UNIT-006` (finalize magic-byte + checksum) — both touch upload paths but different files.

## completion_signal
All three acceptance criteria evidenced. `DONE`.

## historical_next_unit_on_success
The original proposal allowed any other unit. The retired pack now has
`next_unit=null`; use `.ai/03_plans/2026-07-31/Code-Improvement/`.

# 007 — Upload-Scan Per-Object Byte Ceiling + `failed_permanent` After N Transient Failures

> **Historical provenance only.** `UNIT-007` is `SUPERSEDED` by `DEC-AUTO-007`.
> This predecessor did not implement the unit; current authority is
> `.ai/03_plans/2026-07-31/Code-Improvement/`.

> Closes `SEC-UPLOAD-005`, `SEC-OPS-003`.

## unit_id
`UNIT-007` · **status:** `SUPERSEDED` · **priority:** P3 · **effort:** S · **implementation_risk:** LOW · **local_implementation_status:** `NOT_STARTED` · **external_lifecycle_status:** `NOT_REQUIRED`.

## requirements / findings
- Requirements: `SEC-004`.
- Findings: `SEC-UPLOAD-005` (no decompression cap), `SEC-OPS-003` (no per-object byte ceiling; retry amplification).

## goal
The upload-scan job enforces a per-object byte ceiling (`MAX_UPLOAD_SCAN_BYTES`) before reading the body, and marks assets `failed_permanent` after N transient failures to break the retry loop.

## security_invariants
1. `bytesFromDownload` rejects objects whose declared size exceeds `MAX_UPLOAD_SCAN_BYTES` before allocation.
2. After 3 transient failures, the asset moves to `failed_permanent` (not retried).
3. The scan-job route records a 413-style outcome for oversized objects.

## current_source_evidence
- `src/lib/uploads/scan-job.ts:93-111` — `bytesFromDownload` calls `.arrayBuffer()` unconditionally.
- `:163-179` — only filters `scan_status IN ('pending','failed_transient')`.
- `:329-398` — consumer loop with no per-object ceiling.

## affected_paths_and_resources
- `src/lib/uploads/scan-job.ts`.
- `wrangler.jsonc` (add `ARCH_UPLOAD_SCAN_MAX_OBJECT_BYTES` var).

## owned_paths
- `src/lib/uploads/scan-job.ts`

## dependencies
None.

## preconditions
None.

## non_goals
- ClamD protocol streaming (separate concern).
- Decompression-ratio heuristic (future work).

## implementation_sequence
1. Define `MAX_UPLOAD_SCAN_BYTES = 50 * 1024 * 1024` (50MB; below the 20MB ingress cap to allow headroom for legitimate PDFs).
2. In `bytesFromDownload`, compare `head.sizeBytes` to the cap before calling `.arrayBuffer()`; on exceed, return an error outcome that the route records as `failed_permanent`.
3. Add a transient-failure counter to the asset row (or use the existing retry count); after 3 strikes, set `scan_status='failed_permanent'` instead of `failed_transient`.
4. `wrangler.jsonc` `vars`: add `"ARCH_UPLOAD_SCAN_MAX_OBJECT_BYTES": "52428800"`.
5. Run `bun run type-check`.

## data_or_schema_changes
Possibly a `scan_failure_count` column on `upload_assets` if not already present. (Check migrations 0084/0087 — if not present, add a small migration `00NN_upload_scan_failure_count.sql`.)

## authz_and_tenant_implications
None.

## failure_and_exception_behavior
Oversized object → `failed_permanent` → download path blocks it via `decideUploadScanGate` (already correct). Fail-closed.

## acceptance_criteria
1. `MAX_UPLOAD_SCAN_BYTES` defined and enforced in `bytesFromDownload` (source inspection).
2. After 3 transient failures, asset is `failed_permanent` (source inspection).
3. `bun run type-check` passes.

## acceptance_evidence
Source/diff inspection + `type-check` exit 0.

## test_decision
`NOT_REQUIRED` (static evidence decisive; runtime bounds enforced by Cloudflare 128MB Worker limit independently).

## exact_test_proposal_if_any
None.

## authorization_boundaries
None.

## observability_or_audit_requirements
Log oversized-object rejections and `failed_permanent` transitions.

## recovery_or_fix_forward
If a legitimate large object is rejected, raise the cap via env var. No rollback.

## conflict_and_concurrency_notes
None.

## completion_signal
All three acceptance criteria evidenced. `DONE`.

## historical_next_unit_on_success
The original proposal allowed any other unit. The retired pack now has
`next_unit=null`; use `.ai/03_plans/2026-07-31/Code-Improvement/`.

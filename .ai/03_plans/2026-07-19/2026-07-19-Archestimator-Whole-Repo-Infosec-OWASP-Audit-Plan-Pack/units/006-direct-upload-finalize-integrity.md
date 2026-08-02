# 006 — Direct-Upload Finalize: Re-validate Magic Bytes + Verify Content Checksum

> **Historical provenance only.** `UNIT-006` is `SUPERSEDED` by `DEC-AUTO-007`.
> This predecessor did not implement the unit; current authority is
> `.ai/03_plans/2026-07-31/Code-Improvement/`.

> Closes `SEC-UPLOAD-003`, `SEC-UPLOAD-004`.

## unit_id
`UNIT-006` · **status:** `SUPERSEDED` · **priority:** P2 · **effort:** M · **implementation_risk:** LOW · **local_implementation_status:** `NOT_STARTED` · **external_lifecycle_status:** `NOT_REQUIRED`.

## requirements / findings
- Requirements: `SEC-004`.
- Findings: `SEC-UPLOAD-003` (unverified checksum), `SEC-UPLOAD-004` (no magic-byte re-validation).

## goal
Direct-upload finalize downloads the first 64 bytes (or full object for sizes ≤ single-part cap) and re-runs `readMagicMime` against the stored bytes. It recomputes `sha256(downloadedBytes)` and requires equality with `session.checksum_sha256` before recording the asset.

## security_invariants
1. `validateProviderObjectHead` plus a new magic-byte check on the stored bytes.
2. Finalize rejects if R2-stored bytes do not match the declared magic byte.
3. Finalize rejects if `sha256(downloadedBytes) !== session.checksum_sha256` (when checksum is present).

## current_source_evidence
- `src/app/api/component-library/attachments/direct-upload/route.ts:510-531` — finalize calls `headObject`/`downloadObject` + `validateProviderObjectHead` (content-type from R2 httpMetadata only; no magic-byte re-check).
- `src/lib/uploads/provider-portability.ts:124-143` — falls back to "any non-empty ETag" when checksum absent.
- `src/lib/uploads/r2-storage-provider.ts:90-99` — `headObject` returns `object.checksums?.toJSON?.().sha256` (R2-stored; not recomputed from bytes).

## affected_paths_and_resources
- `src/app/api/component-library/attachments/direct-upload/route.ts` (finalize handler).
- `src/lib/uploads/provider-portability.ts` (extend `validateProviderObjectHead` with optional magic-byte check).

## owned_paths
- `src/app/api/component-library/attachments/direct-upload/route.ts`
- `src/lib/uploads/provider-portability.ts`

## dependencies
None.

## preconditions
None.

## non_goals
- Hashing the full bytes for multipart-resumable uploads (path is currently 501-gated; out of scope until enabled).
- Changing the ETag fallback for multipart (recorded as future work).

## implementation_sequence
1. In finalize, after `headObject`, also fetch the first 64 bytes via a ranged `getObject` (R2 supports range requests).
2. Run `readMagicMime` against those bytes; reject if the result does not match `session.content_type`'s expected magic byte.
3. For sizes ≤ the signed-single-part cap, fetch the full body and recompute SHA-256; compare to `session.checksum_sha256` (if present); reject on mismatch.
4. Run `bun run type-check`.

## data_or_schema_changes
None.

## authz_and_tenant_implications
None.

## failure_and_exception_behavior
Magic-byte mismatch or checksum mismatch → reject finalize with 422 → R2 object orphaned (cleanup-job will reap). Fail-closed.

## acceptance_criteria
1. Finalize handler fetches first 64 bytes and runs `readMagicMime` (source inspection).
2. Finalize handler recomputes SHA-256 and compares to session checksum for sizes ≤ single-part cap (source inspection).
3. `bun run type-check` passes.

## acceptance_evidence
Source/diff inspection + `type-check` exit 0.

## test_decision
`TEST_PROPOSAL` (cheap decisive existing-test).

## exact_test_proposal_if_any
Risk: client reserves PDF session, PUTs HTML bytes with `Content-Type: application/pdf`, finalize passes. Cheapest decisive test: `bun x vitest run tests/vitest/uploads/direct-upload-finalize.test.ts` — PUT HTML bytes to a PDF session → assert finalize returns 422.

## authorization_boundaries
None.

## observability_or_audit_requirements
Log finalize-rejection events for visibility.

## recovery_or_fix_forward
If the checksum recomputation adds unacceptable latency for large objects, fall back to R2-stored checksum trust for the size tier above which full re-hash is too expensive. Fix-forward; no rollback.

## conflict_and_concurrency_notes
Coordinate with `UNIT-005` (both touch upload paths; different files).

## completion_signal
All three acceptance criteria evidenced. `DONE`.

## historical_next_unit_on_success
The original proposal allowed any other unit. The retired pack now has
`next_unit=null`; use `.ai/03_plans/2026-07-31/Code-Improvement/`.

# UNIT-009 Execution Addendum 2

This addendum is the current execution source for `UNIT-009`, `AC-009`, and `TEST-009`. It supplements `UNIT-009-EXECUTION-ADDENDUM.md` with one stale source-contract test discovered after the route implementation. The first addendum remains authoritative for classification and response semantics.

## Exact additional owned path

- `tests/vitest/component-library-attachment-lifecycle.test.ts` (DELETE protection ownership retarget only)

The existing test requires `readAttachmentRowsForDelete`, its whole-batch `409`, and three route strings that UNIT-009 intentionally removes. Keeping that assertion would make the broad suite demand the superseded all-or-nothing behavior.

## Authorized retarget

1. Rename only the DELETE protection test to describe per-asset deferred-removal protection.
2. Read `src/lib/uploads/removal-claims.ts` as the new protection owner.
3. Keep the route assertion that DELETE delegates to `claimUploadAssetsForRemoval` and never calls `removeObjects` directly.
4. Assert the route no longer contains `readAttachmentRowsForDelete` or the persisted-attachment batch-block message.
5. Assert the shared claim predicate covers `component_variant_attachments` by `upload_asset_id` and that the claim guard is row-correlated with `candidate.id = asset.id`.
6. Do not change migration assertions, attachment review/download behavior, unrelated test cases, product code outside the original five paths, or test intent.

## TEST-009

Run both focused files:

```sh
bunx vitest run tests/vitest/upload-removal-claims.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts
```

The unit passes only when both files are green, TypeScript/lint/static checks pass, all three routes map `removedPaths` only from `claimedPaths`, and no requested-path fallback or whole-batch attachment blocker remains.

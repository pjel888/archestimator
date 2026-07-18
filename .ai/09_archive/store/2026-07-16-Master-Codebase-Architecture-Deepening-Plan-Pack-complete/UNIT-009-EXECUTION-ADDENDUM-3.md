# UNIT-009 Execution Addendum 3

This correction is the current execution source for `UNIT-009`, `AC-009`, and `TEST-009`. It supersedes only step 4 of `UNIT-009-EXECUTION-ADDENDUM-2.md`; all classification, route, owned-path, and two-file test requirements from the first two addenda remain active.

## Corrected lifecycle source-contract assertion

The attachment route intentionally reuses `Persisted component attachments cannot be removed from draft cleanup.` after `claimUploadAssetsForRemoval` returns the zero-claim `referenced` status. That post-claim response must remain.

Retarget the lifecycle test as follows:

1. Slice the DELETE source at the `claimUploadAssetsForRemoval` call.
2. Assert the pre-claim slice contains neither `readAttachmentRowsForDelete` nor the persisted-attachment response message, proving the old whole-batch precheck is gone.
3. Assert the complete DELETE source still contains the post-claim `referenced` branch and its existing response message.
4. Keep the Addendum 2 assertions for claim delegation, no direct `removeObjects`, `component_variant_attachments`/`upload_asset_id` coverage, and `candidate.id = asset.id`.

No product copy or route branch changes are authorized by this correction.

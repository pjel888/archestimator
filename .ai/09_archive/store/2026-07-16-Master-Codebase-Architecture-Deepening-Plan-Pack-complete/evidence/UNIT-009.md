# UNIT-009 Verification Receipt

- Recorded: `2026-07-16T18:13:57+08:00`
- Baseline HEAD: `0a2667db998607917932ad7832e9a6a5bd7e066a`
- Scoped file-set SHA-256: `e06b10366253589c63d30a380b9d2786820d8a593ccc025c2f0c80bc890a2473`
- Result: `VERIFIED`

## Implemented boundary

Upload removal now matches only category-eligible assets, claims each unreferenced active pending/finalized row independently, and classifies every unmatched row after the claim. The result exposes disjoint claimed, blocked, and already-removed asset/path arrays plus deterministic `claimed`, `partial`, `referenced`, `already_claimed`, and `not_found` statuses.

Active reserved/failed rows retain their previous outward `not_found` behavior. Claimed paths have first deduplication priority, blocked paths second, and already-removed paths third. All three DELETE routes report only `claimedPaths` as removed and return the blocked/already-removed arrays. The attachment route no longer performs an all-or-nothing pre-claim persisted-row block; persisted attachments are protected by the shared row-correlated reference predicate.

## Evidence

- GitNexus reported `LOW` for the indexed route handlers; the claim helper was absent from the stale graph, so current-source inspection and behavior evidence are authoritative.
- Focused `TEST-009`: `bunx vitest run tests/vitest/upload-removal-claims.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts` — PASS, 2 files and 11 tests.
- TypeScript: `bun run type-check` — PASS.
- Scoped ESLint — PASS with no findings.
- Scoped `git diff --check` — PASS.
- Static proof found `candidate.id = asset.id`, claimed-ID diagnostic exclusion, and identical three-route result mapping. No requested-path fallback, old whole-set guard, or `readAttachmentRowsForDelete` remains.
- Lifecycle source-contract proof distinguishes the removed pre-claim batch block from the preserved post-claim `referenced` response and anchors protection to `component_variant_attachments.upload_asset_id`.
- `src/lib/uploads/cleanup-job.ts` and `migrations/` have no diff.
- Independent adversarial review passed with no actionable findings; independent test/type/static reruns also passed.

## File hashes

- `src/lib/uploads/removal-claims.ts`: `9bba85826fb177f4e14edec4d35a82d210859ba7b7cf53c1c55e4ba87bdf3c86`
- `src/app/api/projects/images/route.ts`: `48a7a3ca8c3c088d18830adc142855b71abc6dc83ceca5ca8af38144b436d19b`
- `src/app/api/component-library/attachments/route.ts`: `e1e92c9923c6510c2882c5092a26db812b71f572f7c6025a4f5eb0f5d00a73bb`
- `src/app/api/component-library/images/route.ts`: `21e754316de6f1b67ae06f9a7897881599ecdf23d7ab0dc125a557f0e5df3b01`
- `tests/vitest/upload-removal-claims.test.ts`: `38f5a01bf3da9ac60242227cd6036fb447e7b9700c67540f61e5bfc85300b517`
- `tests/vitest/component-library-attachment-lifecycle.test.ts`: `75017a630c55866b0763af3863ec198b75bc86ae9b029227224b8fad01dafdb7`

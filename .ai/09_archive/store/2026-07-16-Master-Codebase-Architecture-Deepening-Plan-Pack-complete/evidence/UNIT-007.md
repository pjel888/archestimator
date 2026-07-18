# UNIT-007 Verification Receipt

- Recorded: `2026-07-17T03:03:48+08:00`
- Baseline HEAD: `0a2667db998607917932ad7832e9a6a5bd7e066a`
- Scoped file-set SHA-256: `63ccf2436a33bb85a537bbd71b1cbadcd2495b2eace68a612a8eb59425bddcee`
- Result: `VERIFIED`

## Implemented boundary

The stringly Estimate D1 façade is deleted. Its query and action operations now have concrete typed owners under `src/lib/estimates/d1-intents/`: database primitives, strict access probes, Estimate records, tabs, nodes, rows, templates, bulk sheets, component impact, history events, trusted intent context, and one internal component-identity helper. `src/lib/estimates/actions.ts`, reusable-source actions, and the history proof router call those typed owners directly.

The exact Admin `sources.persistence` pointer now names `d1-intents/database.ts`. Reusable sources retain their purpose-built workflow SQL and error adaptation while delegating shared database and history primitives. Existing public authorization helpers remain fail closed; strict typed variants propagate D1 failures to intent callers, with only the public capability read intentionally adapting failures to `false`. Estimate-sheet adjustment mutations reject a project mismatch before any read or write.

## Evidence

- Exact final `TEST-007` gate: 21 files and 193 tests passed.
- Supplemental reusable-source/history-event gate: `activity-event-insert-shape.test.ts` passed all 3 tests and preserves the 19-column insert shape.
- Focused final strict-probe and project-boundary repair gate: 3 files and 27 tests passed.
- Legacy fail-closed D1 authorization-helper contract: 8 tests passed.
- `bun run type-check` passed after the final repairs.
- Scoped ESLint across production and owned test files had zero errors; the only output was the pre-existing unused `queryResult` warning in `estimate-insert-target-authz.test.tsx`.
- Scoped `git diff --check` passed. Repository-wide output contains only four known validator-generated Markdown hard-break lines in the plan artifact.
- Both mandatory residue scans were empty; the façade file is absent; no production façade client, query, dispatcher, internal-helper, hidden-session, or actor-spoofing residue remains.
- The Admin diff changes only the `sources.persistence` path and note.
- GitNexus refreshed to 28,840 nodes, 70,464 edges, 1,451 clusters, and 300 flows. Its shared-worktree change summary is `HIGH` across 94 files and 372 symbols because it includes all completed units; exact UNIT-007 caller and residue reconciliation is captured above.
- GitNexus cycle analysis remains exactly four pre-existing unrelated cycles: project-group UI, closed-beta auth, upload cleanup telemetry, and beta-feedback review. No typed Estimate intent participates in a cycle.
- Independent proof/security/reusable-source review returned clean. Architecture/parity review identified two high-priority issues; both were repaired and re-review returned `CLEAN / PROCEED`. A fresh adversarial review of those repairs also returned `CLEAN / PROCEED`.

## Key file hashes

- `src/lib/admin/estimate-system-knowledge-data.ts`: `d812c07814b825c09f88434ca726d4d7baf73d2ea71472ee4a3de75ea2270f71`
- `src/lib/authz/d1-access.ts`: `34fca6a767a7ddf9aaa13e679533396baaf51b585e87d5b593956dc18cdb3fad`
- `src/lib/cloudflare/estimate-history-proof-router.ts`: `af2648088019547c32acb164452b10fb6a3ef80e4d0dfbf382dde3c001ec081f`
- `src/lib/estimates/actions.ts`: `f4f57189b00009f4d1f693145b3de1f7bac3e502b62050e7f7e810b7c556be8c`
- `src/lib/estimates/d1-action-client.ts`: `DELETED`
- `src/lib/estimates/d1-intents/_component-identity.ts`: `ecdc20d0e67bdd7c0ab7675f0fce8c3f94ce3ef2479ac0464593fcd6fca97e69`
- `src/lib/estimates/d1-intents/access.ts`: `0e2f4fcfbfb2c713458e0d6296ac0fc8981b8a360c42025dc2447c6ad5898f71`
- `src/lib/estimates/d1-intents/bulk-sheets.ts`: `0eff3d6458930e224171b0eb895247ef8ef92cbadb0fcca7a0cf419cd05c9002`
- `src/lib/estimates/d1-intents/component-impact.ts`: `e3f552f00ada079cb1bb148ff2f7aa2a27b1cfe08492055e7edc92544c603f4f`
- `src/lib/estimates/d1-intents/database.ts`: `3ee64129021ee4733de8cb956bfaec015aa2ed7f61fed468362c1991787c685f`
- `src/lib/estimates/d1-intents/estimate-records.ts`: `b91b073f51285a40169735192e7e61c62f129a76c4bb43f8c3242439d8fa3905`
- `src/lib/estimates/d1-intents/history-events.ts`: `062d28d92a72160027471477c176fb06a72e58988e4d42127221771b11380e2f`
- `src/lib/estimates/d1-intents/intent-context.ts`: `48639f42f4d46b2c1bc2f4988c46fbcc50de32099a9adfcfd5cdfc65ee2ffb3b`
- `src/lib/estimates/d1-intents/nodes.ts`: `343cb5c35736e72c35c1508cdf2cc39ee2bb1589bb3a2d490839d29fcc5d50e1`
- `src/lib/estimates/d1-intents/rows.ts`: `8030a004c691b64d1d4ecb48216cc9c0b701381ea66294262c37f82f3a2bf802`
- `src/lib/estimates/d1-intents/tabs.ts`: `2283f495436f88828139f38c93e7deca490064e529e41c782ef21eea4f18be62`
- `src/lib/estimates/d1-intents/templates.ts`: `6f26958d88c01fb95c508f2e4e0bb4d815803c8115751b9eaa3fe9a506f76cf8`
- `src/lib/reusable-sources/actions.ts`: `d24abc2cbaf107b580781336c52cbda2ecbe30a53debd4722a9d9af28434aac3`
- `tests/vitest/activity-event-insert-shape.test.ts`: `bcfd234b470726b3850869ab5bfce0449111702584c898ff2e5cb2b6a6148f5d`
- `tests/vitest/d1-access-created-by.test.ts`: `2d88a6d747cb0e486ee784d29220e160f5139763fe81a69bd3126b5c5d990ec1`
- `tests/vitest/estimate-record-d1-intents.test.ts`: `027211c7f8b7657666703dbdd75d92e575c244f84c8c7170ffeeb68461691904`
- `tests/vitest/estimate-sheet-actions-authz.test.ts`: `ebeb17028e5caa1b65e1170a1d28ecec848798721e2dace66eff4d91ddbba0a1`
- `tests/vitest/security-findings-auth-contracts.test.ts`: `071630a93d625111e69d9188a2c2ae941bc57a3d14a66b60d69c59e919f0d326`

## Remaining risk

No known UNIT-007 defect remains. Canonical authorization helpers are high-blast-radius surfaces, but their public signatures and fail-closed behavior are preserved and independently covered. The shared-worktree GitNexus summary is broader than this unit, so this receipt also relies on exact focused tests, caller/residue reconciliation, scoped hashes, cycle evidence, and independent review.

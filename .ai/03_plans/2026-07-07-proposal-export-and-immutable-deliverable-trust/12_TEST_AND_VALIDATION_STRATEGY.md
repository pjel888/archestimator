# 12 — Test and Validation Strategy

Lightest proof that proves the claim. No browser proof unless browser-only behavior.

## Test Execution Matrix

| Requirement | Test file path | Test type | Existing/new | Fixture/data setup | Command | Expected evidence | Known pre-existing reds | Owner |
|---|---|---|---|---|---|---|---|---|
| DATA-1 (schema) | `tests/vitest/proposal-deliverable-packages-schema.test.ts` | unit (migration text) | new | migration file | `bun run test:dom -- proposal-deliverable-packages-schema` | table+columns+CHECK+indexes present | none | impl |
| ARCH-1/FR-1 (immutability) | `tests/vitest/proposal-deliverable-packages-repository.test.ts` | unit (D1 mock) | new | repo + mock D1 | `bun run test:dom -- proposal-deliverable-packages-repository` | insert, supersede, immutable-after-issue | none | impl |
| FR-2 (checksum) | `tests/vitest/proposal-deliverables-checksum.test.ts` | unit | new | known vectors | `bun run test:dom -- proposal-deliverables-checksum` | sha256 matches known; canonical stable | none | impl |
| FR-5/SEC-3 (redaction byte-scan) | `tests/vitest/proposal-deliverables-redaction-scan.test.ts` | unit (OOXML unzip+grep) | new | sample internal XLSX + policy | `bun run test:dom -- proposal-deliverables-redaction-scan` | zero internal tokens in client buffer | none | impl |
| FR-5 (cost-split suppression) | extend `tests/vitest/proposal-workbook.test.ts` | unit | extend | model fixture | `bun run test:dom -- proposal-workbook` | client audience lacks cost-split columns | none | impl |
| FR-2/FR-8/API-1 (route hash+audit) | extend `tests/vitest/proposal-export-route-workbook.test.ts` | integration (route handler) | extend | estimate tree fixture | `bun run test:dom -- proposal-export-route-workbook` | package row written; `X-Archestimator-Package-Hash` prefix == sha256(buffer) prefix; download audit row | none | impl |
| UX-1/A11Y-1 (trust panel) | `tests/vitest/proposal-export-preview-trust-panel.test.tsx` | DOM (RTL) | new | rendered dialog + server-provided hash | `bun run test:dom -- proposal-export-preview-trust-panel` | panel renders hash; copy button focus; aria-live | none | impl |
| FR-2 (snapshot checksum) | extend `tests/vitest/project-publication-snapshot.test.ts` | unit | extend | snapshot fixture | `bun run test:dom -- project-publication-snapshot` | checksum present + stable across key order | none | impl |
| FR-1 (snapshot immutability) | `tests/vitest/proposal-deliverable-packages-immutability.test.ts` | integration (D1 mock) | new | publish v1, republish v2 | `bun run test:dom -- proposal-deliverable-packages-immutability` | v1 hash/bytes unchanged; state=superseded | none | impl |
| FR-4 (recipient staleness) | `tests/vitest/recipient-staleness.test.tsx` (+ JSON) | DOM + unit | new | snapshot + advanced estimate.updated_at | `bun run test:dom -- recipient-staleness` | notice rendered when daysBehind>threshold; JSON field present | none | impl |
| FR-7 (content-bound accept) | `tests/vitest/shared-link-decision-content-hash.test.ts` | integration | new | accept flow fixture | `bun run test:dom -- shared-link-decision-content-hash` | `content_sha256_at_decision` written; == snapshot hash | none | impl |
| FR-6 (streaming) | `tests/vitest/proposal-export-streaming.test.ts` | integration | new | large fixture (threshold-crossing) | `bun run test:dom -- proposal-export-streaming` | 200 chunked; valid hash header; memory bounded (probe) | none | impl |
| FR-6 (async job) | `tests/vitest/proposal-export-async-job.test.ts` | integration (queue mock) | new | job fixture | `bun run test:dom -- proposal-export-async-job` | 202+jobId; job → completed; package row; R2 object; ownership denied to other user | none | impl |
| SEC-4 (job rate limit) | extend async-job test | integration | extend | rapid requests | as above | 429 above limit | none | impl |
| TEST-2 (hosted smoke) | new `scripts/verify-cloudflare-hosted-proposal-export-oversized.ts` | hosted provider proof | new | preview/host + oversized estimate | `bun run cf:verify-hosted-proposal-export-oversized` (new script) | above-threshold export completes; hash matches | hosted deps | impl |
| D-1..D-7 (denial) | `tests/vitest/proposal-deliverables-denial.test.ts` | unit/integration | new | denial fixtures | `bun run test:dom -- proposal-deliverables-denial` | each denial asserts expected signal | none | impl |
| Regression | existing suite | — | existing | — | `bun run test:dom`, `bun run test` | no regressions | none | impl |

## Commands (verified from `package.json`)

- `bun run type-check` (tsc --noEmit)
- `bun run lint`
- `bun run lint:design-system`
- `bun run test` (bun test tests/unit)
- `bun run test:dom` (vitest run --maxWorkers=1)
- `bun run validate` (full: type-check+lint+design+test+test:dom) — run before claiming readiness
- `bun run build` (next build)
- `bun run cf:typegen` (only if binding change)
- Focused: `bun run test:dom -- <pattern>`
- Targeted Playwright **only** if a browser-only claim arises (copy-hash focus restoration if DOM
  test insufficient). Default: DOM tests suffice.

## Coverage rationale

- Pure logic (checksum, canonical JSON, staleness compute, redaction policy) → unit.
- Repository (immutability, supersede) → unit with D1 mock (matches existing
  `proposal-deliverable-packages`-style tests).
- Route handler (hash header, audit) → integration via route call (matches existing
  `proposal-export-route-workbook.test.ts`).
- Snapshot sanitization/checksum → unit (matches existing `project-publication-snapshot.test.ts`).
- UI panel → DOM (RTL) — copy button focus, live-region are DOM-provable.
- Recipient staleness → DOM + JSON field assertion.
- Streaming/async → integration with stream/queue mock.
- Hosted oversized → provider proof (closes known-issues note) — **rollout gate**, not CI default.

## Skipped/deferred validation (honest gaps)

- **PDF tests:** none — PDF deferred (DEC-FORMAT-1).
- **Hosted proof in CI:** hosted scripts run manually/pre-release, not on every CI run (provider
  credentials). Recorded as rollout gate.
- **Browser proof:** intentionally skipped for the core ledger (server-only, unit/integration
  proven). Engaged only if copy-hash/focus proves insufficient in DOM.

## Pre-existing reds

None known for the new tests (they're new). Existing `proposal-workbook-benchmark.test.ts` relies
on `scripts/benchmark-proposal-workbook` (executor confirms it runs).

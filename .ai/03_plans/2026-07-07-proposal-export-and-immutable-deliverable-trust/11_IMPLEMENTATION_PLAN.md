# 11 — Implementation Plan

Authoritative execution guide. Phased, dependency-aware. Each phase includes the durable-goal
contract (ultragoal-style). Tasks name exact repo-relative paths/symbols or are explicitly
`DISCOVERY-REQUIRED` / `BLOCKED-EXTERNAL`.

Symbols note: file:line references are from the discovery audit (2026-07-07); the executor must
re-read each file immediately before editing (shared worktree discipline).

## Phase 0 — Foundations (sequential; prerequisites for all)

**Objective.** Land the trust-ledger schema, checksum primitive, redaction policy, and staleness
helper before any surface uses them.

**Requirements addressed.** DATA-1, DATA-3, ARCH-1, ARCH-4, SEC-3 (policy), FR-2 (primitive),
FR-4 (helper).

**Prerequisites.** Confirm latest migration number (`0039` today → next is `0040`).

### Task T0.1 — Migration `0040_proposal_deliverable_packages.sql`
- Requirement IDs: DATA-1, DATA-2.
- Objective: create append-only `proposal_deliverable_packages` + add `content_sha256_at_decision`
  column to `shared_link_responses`.
- Target path (new): `migrations/0040_proposal_deliverable_packages.sql`.
- SQL sketch: see `07_DATA_DATABASE_API_NETWORK_PLAN.md`.
- Inputs/dependencies: none.
- Failure cases: CHECK constraint rejects bad hash; existing rows unaffected (additive).
- Tests to add: `tests/vitest/proposal-deliverable-packages-schema.test.ts` (mirror
  `project-publication-schema.test.ts`) asserting table, columns, CHECK, indexes.
- Validation: `bun run cf:typegen` (only if binding change — none expected), `bun test tests/unit`
  for the new schema test, `bun run type-check`.
- Completion evidence: migration file + schema test green.
- Parallelization: sequential (everything depends on it).
- Complexity: Small.
- Durable-goal: G-T0.1 — ledger schema exists and is covered by a schema test. Stop: schema test
  green. Blocker: none.

### Task T0.2 — `proposal-deliverable-packages` repository
- Requirement IDs: ARCH-1, DATA-1, DATA-3.
- Objective: the sole writer/reader for the trust ledger.
- Target path (new): `src/lib/repositories/proposal-deliverable-packages-repository.ts`.
- Symbols: `createProposalDeliverablePackagesRepository`, `insertPackage`,
  `markSuperseded`, `getPackageById`, `listPackagesForProject`, `recordDownloadAudit`.
- Contract: `insertPackage({..., content_sha256, state='issued'})`; refuses `state='issued'` with
  null `content_sha256`.
- Inputs: D1 binding `ARCH_DB`, caller-authorized context.
- Failure cases: null hash → throw; duplicate id → D1 PK error.
- Tests: `tests/vitest/proposal-deliverable-packages-repository.test.ts` (insert, supersede,
  immutable-after-issue, list).
- Validation: `bun run test:dom`, `bun run type-check`.
- Complexity: Medium.
- Durable-goal: G-T0.2 — repository write/read + immutability unit-proven. Stop: tests green.

### Task T0.3 — Checksum + canonical-JSON module
- Requirement IDs: FR-2, ARCH-4, DEC-HASH-1.
- Objective: `sha256Hex(bytes)` via Web Crypto; `canonicalJsonStringify(obj)` (stable key sort) for
  snapshot hashing.
- Target path (new): `src/lib/proposal-deliverables/checksum.ts`.
- Symbols: `sha256Hex`, `canonicalJsonStringify`, `shortHashPrefix`.
- Inputs: `Uint8Array` or serializable object.
- Failure cases: non-serializable input → throw.
- Tests: `tests/vitest/proposal-deliverables-checksum.test.ts` (known-vector sha256; canonical
  ordering stable across key orders; prefix length).
- Validation: `bun run test:dom`.
- Complexity: Small.

### Task T0.4 — Redaction policy + byte-scan
- Requirement IDs: FR-5, SEC-3.
- Objective: config-driven internal-field allowlist; `scanXlsxBufferForInternalFields(buffer,
  policy)` that unzips the XLSX (the workbook is a ZIP) and greps worksheet XML for configured
  tokens; `broadenClientAudienceRedaction(settings)` to also drop cost-split columns + workspace-name
  fallback.
- Target path (new): `src/lib/proposal-deliverables/redaction-policy.ts`.
- Symbols: `INTERNAL_FIELD_ALLOWLIST` (default: supplier names patterns, pricingSource,
  confidence, storage paths, internal ids), `scanXlsxBufferForInternalFields`, `broadenClientRedaction`.
- Inputs: XLSX `Uint8Array`, policy.
- Failure cases: corrupt ZIP → throw (test must fail closed).
- Modify (required change): `src/lib/proposal-export/create-proposal-workbook.ts` (drop cost-split
  columns for client unless explicitly opted in by internal user — exact columns at
  :326-354), `route.ts` `contractorName` fallback (:229 — do not fall back to workspace name for
  client audience).
- Tests: `tests/vitest/proposal-deliverables-redaction-scan.test.ts` (client XLSX buffer scanned;
  asserts no configured token present); extend `proposal-workbook.test.ts` for cost-split suppression.
- Validation: `bun run test:dom`.
- Complexity: Medium-Large (byte-scan over OOXML).
- DISCOVERY-REQUIRED: confirm exact set of internal tokens with owner (pricing intelligence fields,
  internal note markers). Discovery step: bounded grep over sample internal XLSX; stop when allowlist
  reviewed; no code change beyond the later approved task.

### Task T0.5 — Staleness helper (recipient-facing)
- Requirement IDs: FR-4.
- Objective: `computeRecipientStaleness(snapshotSourceAsOf, latestEstimateUpdatedAt, thresholdDays)`.
- Target path (new): `src/lib/proposal-deliverables/staleness.ts`.
- Reuse: `readLatestEstimateUpdatedAt` (`workspace-repository.ts:1101`) — extend for recipient path.
- Tests: `tests/vitest/proposal-deliverables-staleness.test.ts`.
- Complexity: Small.

**Phase 0 exit criteria:** schema migration + repo + checksum + redaction-scan + staleness helper
all land and are unit-tested. Gate: `bun run test:dom` green for all new tests; `bun run type-check`
green.

## Phase 1 — Surface A (XLSX) trust wiring (sequential after Phase 0)

**Objective.** XLSX exports write a package row + checksum, return hash header, audit downloads.

**Requirements.** FR-1, FR-2, FR-3, FR-5, FR-8, API-1, UX-1, SEC-1.

### Task T1.1 — Route: post-buffer checksum + package insert + headers
- Requirement IDs: FR-2, FR-8, API-1.
- Modify: `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts`.
- After `createProposalWorkbookBuffer` (route.ts:165-168) and broadened redaction: compute
  `content_sha256` (T0.3), insert package row (T0.2) with `source_as_of = now`, `source_estimate_revision`
  (DISCOVERY: derive from estimate `updated_at` or a revision field — confirm), set headers
  `X-Archestimator-Package-Id`, `X-Archestimator-Package-Hash`.
- Failure cases: hash/insert failure → 500, no file served (never serve un-hashed file as issued).
- Tests: extend `proposal-export-route-workbook.test.ts` — assert package row written, header
  present, header prefix matches `sha256(buffer)`.
- Complexity: Medium.

### Task T1.2 — Download audit row
- Requirement IDs: FR-8.
- Modify: route — after successful response or via `after()`; insert download audit (T0.2
  `recordDownloadAudit`).
- Tests: audit-row assertion.
- Complexity: Small.

### Task T1.3 — Preview dialog: Integrity & Source panel
- Requirement IDs: UX-1, A11Y-1.
- Modify: `ProposalExportPreviewDialog.tsx`, `use-estimate-proposal-preview.ts` (surface response
  headers).
- Panel: hash prefix, source as-of, staleness badge, package version (post-download).
- A11y: `role=status`, `aria-live=polite`, non-color cue, keyboard-reachable copy button.
- Tests: `proposal-export-preview-trust-panel.test.tsx` (DOM) — panel renders server-provided hash;
  copy button focus; live-region.
- Complexity: Medium.

**Phase 1 exit:** XLSX exports are content-addressed, audited, redaction-broadened, and the UI
shows trust info. Gate: route + DOM tests green.

## Phase 2 — Surface B (snapshot) immutability + recipient proof

**Objective.** Publish writes package rows; rotate no longer overwrites in place; recipients see
staleness; accept binds content hash.

**Requirements.** FR-1, FR-2, FR-3, FR-4, FR-7, FR-8.

### Task T2.1 — Snapshot canonicalization + checksum on publish
- Modify: `src/lib/publication/snapshot.ts` (canonical JSON via T0.3), `actions.ts`
  (`buildSnapshotForProject` :609-732) to compute hash and pass to the insert path.
- Tests: `project-publication-snapshot.test.ts` extended — checksum present + stable.
- Complexity: Medium.

### Task T2.2 — Append-only publish/republish/rotate
- Modify: `admin-d1-client.ts` (`replace_project_publication` :488 → insert new package + supersede
  prior; `rotateProjectPublicationCredentials` :556 → stop overwriting in place; insert package row,
  keep old), `actions.ts`.
- Failure cases: supersede of already-superseded row → idempotent no-op or error (DECIDE: no-op).
- Tests: immutability test — publish v1, republish v2, assert v1 package row bytes/hash unchanged
  and `state='superseded'`.
- Complexity: Medium-Large (careful batch atomicity).

### Task T2.3 — Recipient staleness in payload
- Modify: `public-repository.ts` (`resolveProjectPublicationSnapshotByToken` :662-677) to include
  staleness (T0.5); `src/app/share/[token]/page.tsx` + share component to render notice (UX-2,
  A11Y recipient notice).
- Tests: recipient-staleness DOM/JSON test.
- Complexity: Small-Medium.

### Task T2.4 — Recipient accept binds content hash
- Modify: `d1-store.ts` (`submitClientResponse` :647-731) to write `content_sha256_at_decision`;
  `decision/route.ts` to pass it.
- Tests: content-binding test (FR-7).
- Complexity: Small.

**Phase 2 exit:** snapshots are immutable across republish, content-addressed, recipient-stale-
aware, and acceptances are content-bound. Gate: immutability + content-binding tests green.

## Phase 3 — Large-export reliability (P1; feature-flagged)

**Objective.** Streaming/async path above threshold; replace all-or-nothing 413 for the band
between inline-ceiling and hard-cap.

**Requirements.** FR-6, ARCH-3, PERF-1, REL-1, OPS-2.

### Task T3.0 — DISCOVERY: measure thresholds
- DISCOVERY-REQUIRED: run the evaluator (`09_*.md`) to set inline/stream/async cutoffs. Stop when
  cutoffs chosen with evidence. No code change.

### Task T3.1 — Streaming response for mid-band
- Modify: route — branch on size; for mid-band, pipe workbook generation through a
  `ReadableStream` with a streaming SHA-256 digest.
- Note: the current `writeWorkbookBuffer` returns a full `Uint8Array`; streaming the OOXML writer
  is non-trivial — DECIDE at impl whether to (a) stream the response while hashing the full buffer
  (memory unchanged but avoids timeout via chunked transfer) or (b) refactor the writer to emit
  parts. Recommendation: (a) first (hash-while-sending), (b) only if (a) insufficient.
- Tests: streaming test — large fixture returns 200 chunked + valid hash header.
- Complexity: Large.

### Task T3.2 — Async job for large-band
- Modify: route — above async threshold, enqueue `proposal_export` job on `UPLOAD_JOBS_QUEUE`,
  return 202 + job id. New job consumer (or extend existing) generates the workbook, writes R2
  object (`ARCH_UPLOADS_R2` key `proposal-deliverables/<id>`), inserts package row, marks job done.
- New: status endpoint `GET /api/.../export/proposal.xlsx/job/[jobId]` + download endpoint (R2
  mediated).
- Failure cases: job failure → `failed`, no package row; DLQ.
- Idempotency: `correlation_id`.
- Feature flag (OPS-2): `PROPOSAL_EXPORT_ASYNC_ENABLED`.
- Tests: job lifecycle test; ownership test (D-6); rate-limit test (SEC-4).
- ASSUMP-2 confirmation required: existing consumer structure. DISCOVERY if consumer cannot host
  a new kind without refactor.
- Complexity: Extra Large.

**Phase 3 exit:** large exports succeed without OOM/timeout via stream or job. Gate: streaming +
job tests green; feature flag default-off until rollout.

## Phase 4 — Tests, docs, cleanup (sequential after 1–3)

### Task T4.1 — Hosted oversized-export smoke (TEST-2 rollout gate)
- Add hosted proof script (pattern: `cf:verify-hosted-*`) exercising an above-threshold export
  against preview/host. Closes `known-issues.md:150` note.
- Complexity: Medium.

### Task T4.2 — Adversarial denial tests (D-1..D-7)
- Wire the denial scenarios from `08_*.md` into focused tests.
- Complexity: Medium.

### Task T4.3 — Docs updates (DOC-1)
- Update `README.md:252`, `.ai/06_specs/proposal-package-system.md`, `.ai/10_state/known-issues.md`
  to reflect issued-package immutability (post-implementation).
- Complexity: Small.

### Task T4.4 — Orphan R2 reconcile (T-15)
- DISCOVERY-then-impl: lifecycle rule or small reconcile cron (existing cron triggers) cleaning
  R2 objects whose package row is absent.
- Complexity: Medium.

**Phase 4 exit:** all tests green; docs updated; hosted smoke passed; reconcile in place.

## Blocked / discovery tasks (consolidated)

- **BLOCKED-EXTERNAL (DEC-FORMAT-1):** PDF renderer selection — owner decision on renderer +
  licensing. The plan defines the PDF contract (same package row, `package_kind='pdf'`); no
  implementation until owner approves.
- **DISCOVERY (T0.4):** exact internal-field token allowlist (owner review).
- **DISCOVERY (T1.1):** `source_estimate_revision` exact field (estimate `updated_at` vs a
  revision id — check `estimates` schema).
- **DISCOVERY (T3.0):** perf thresholds from evaluator.
- **DISCOVERY (T3.2):** confirm `UPLOAD_JOBS_QUEUE` consumer can host `proposal_export` kind
  (ASSUMP-2).
- **DISCOVERY (T4.4):** orphan R2 reconcile strategy.

## Parallelization classification

- Parallel-safe: T0.3, T0.4, T0.5 (after T0.1/T0.2 contracts set); Phase 1 UI (T1.3) parallel to
  Phase 2 backend if file-scope-separated; tests.
- Sequential (dependency): T0.1 → T0.2 → (T0.3/T0.4/T0.5) → T1.x/T2.x → T3.x → T4.x.
- Sequential (shared-file risk): `publication/*` files (T2.1/T2.2/T2.4 touch overlapping files) —
  serialize; `route.ts` (T1.1/T1.2/T3.1/T3.2) — serialize.
- Not worth delegating: docs (T4.3).

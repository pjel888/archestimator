# 03 — Source and Codebase Audit

All findings are read-only evidence gathered by four parallel discovery lanes. Every claim cites a
repo-relative `path:line` or migration filename. "Evidence" = direct source read; "Inference" =
derived from source.

## 3.1 Surface A — Workshop XLSX export

### File map

| Path | Key symbols | Responsibility | Trust relevance |
|---|---|---|---|
| `src/lib/proposal-export/types.ts` | `ProposalExportSettings` (audience, includeSourceBreakdownSheet, showSupplierInRemarks), `ProposalExportMetadata` (grossFloorArea, clientName, contractorName), `ProposalExportModel` (generatedAt at :204) | Pure type defs | **Yes** — redaction levers + the only provenance timestamp (`generatedAt`) |
| `src/lib/proposal-export/settings.ts:28` | `defaultProposalExportSettings`, `applyAudiencePolicy`, `resolveProjectCharges`, `resolveSheetAdjustment` | Redaction gate: `audience !== "client"` force-disables source-breakdown + supplier-in-remarks. Comment :24-27 "server-derived (never read off the wire)" | **Yes — core redaction primitive**, idempotent, applied at 2 chokepoints |
| `src/lib/proposal-export/worksheet-name.ts` | `sanitizeWorksheetBaseName`, `buildUniqueWorksheetNames` | Excel sheet-name hygiene (31-char, invalid chars) | Minor (workbook integrity, not trust) |
| `src/lib/proposal-export/xlsx-workbook.ts` | `Workbook`, `Worksheet`, `writeWorkbookBuffer` (:684), custom ZIP encoder with CRC32 (:561-583, :662-682), `docProps/core.xml` props (:529-541) | **Hand-rolled dependency-free OOXML writer**. Strings = `inlineStr`. CRC32 is ZIP-internal only | **Partial integrity** — CRC32 is structural, never exposed/stored/verified by app. **No streaming**: `writeWorkbookBuffer` → `concatBytes` returns single `Uint8Array` (:698) |
| `src/lib/proposal-export/build-proposal-export-model.ts` | `buildProposalExportModel` (:440 applies `applyAudiencePolicy`), `buildRemarks` (:59-80 gates supplier/pricingSource/pricingDate/confidence behind `showSupplierInRemarks`), `flattenEstimateTree`, `consolidateProposalRows` | Estimate tree → `ProposalExportModel`. Round-then-sum money math (:43-45). `generatedAt` defaults `new Date().toISOString()` (:478) | **Yes — redaction logic lives here**. Validation issues emitted (:450-468). No checksum |
| `src/lib/proposal-export/create-proposal-workbook.ts` | `createProposalWorkbook`, `createProposalWorkbookBuffer` (:742), `BID_FORM_COLUMNS`, `formulaCell` (:17 writes formula + pinned `result`) | Model → Workbook. `applyAudiencePolicy` **again** at :708 (second chokepoint). Cost-split columns written into Bid Form (:326-354): materialUnitCost, laborUnitCost, materialSubtotal, laborSubtotal, contingencySubtotal, miscSubtotal, costAmount. Formula-injection defense numFmt `@` (:49). Amount-in-words, exclusions, labor disclaimer | **Yes** — second redaction gate; **cost-split columns DO reach client XLSX** (gap). No streaming: returns `Promise<Uint8Array>` (:746) |
| `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts` | `GET`, `runtime`, `maxDuration=60` (:21), `resolveExportAudience` (:81-90), `checkProposalExportRateLimit` (:382), size caps (:23-25: 1200 nodes/3000 rows/50 tabs), `logProposalExport` (:191-202) | **Only server entry for XLSX**. Auth `getCurrentUserContext` (401 fail-closed :376). Per-user+IP rate limit (12/min, 120/hr). Settings parsed/validated off wire (:44-76, 400 malformed). Size cap → 413 (:144-156). Headers `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff` (:137-139). Buffer built in-memory, returned directly (:128-142) | **Yes — central trust chokepoint**. **No persisted artifact, no checksum stored, no D1 download audit row** (console.info only) |
| `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/filename.ts` | `buildProposalWorkbookFilename` | Filename sanitization (NFKD, ASCII, dashed) | No (hygiene) |
| `src/components/workshop/ProposalExportPreviewDialog.tsx` | `"use client"` (:1), props (:68-78), `status.freshness` (:62 "current"\|"stale"), stale badge (:257-263), unsaved-edits warning (:319-328), download state machine (:55-66), `buildExportContents` (:100, sheet flags review/internal/omitted) | **Client-side preview**. Model built client-side by parent hook (audience stays client-safe :105-109). Native `<dialog>` via portal, focus-trap, `aria-modal` | **Yes for stale-data warnings** (workshop edit staleness only). **Preview built from unsaved editable rows; download built from saved DB rows** — divergence. No publication-staleness or recipient-side warning. No checksum/hash/file-size display |
| `src/components/workshop/estimate-sheet/use-estimate-proposal-preview.ts` | `createProposalPreviewSignature` (:92-101), `isProposalPreviewStale` (:205), `countUnsavedEditableRows`, fetch-then-blob download (:169-195) | Builds client preview model; computes download href; **fetch-then-blob** validates `response.ok`+content-type before blobbing (avoids saving JSON error as .xlsx) | **Yes** — staleness via signature; corrupt-file-prevention via fetch-then-blob. No checksum verification of downloaded bytes |

### Surface A flow (current)

1. User opens preview from `EstimateSheetContent`. Hook builds client-side model from in-memory
   editable tree (incl. unsaved edits).
2. Download click → `fetch(proposalDownloadHref, {credentials:"same-origin"})`.
3. Server: auth → rate limit → parse settings → load estimate tree (caps) → `resolveExportAudience`
   (workspace-member-gated) → `buildProposalExportModel` (`applyAudiencePolicy`) →
   `createProposalWorkbookBuffer` (`applyAudiencePolicy` again) → `Response` (no-store, nosniff).
4. **No storage.** Buffer exists only in the HTTP response.
5. Client fetch-then-blob → `triggerBlobDownload`.

### Surface A trust gaps

- No generated-file integrity register (no SHA-256 of bytes).
- No XLSX download audit trail (console.info only; no D1 row).
- `versionLabel` is a display string, not a system version.
- Cost-split columns (material/labor/contingency/misc subtotals + unit costs) reach client XLSX.
- `contractorName` falls back to workspace name (internal naming leaks).
- Commercial Terms sheet is boilerplate "To be confirmed" (flagged "review before sending", not
  enforced).
- Whole buffer in memory; all-or-nothing 413; no backpressure/progress/resume.
- `download_attempt_blocked` event type exists in schema (`0014:44`) but **never emitted**.
- Preview/download divergence (unsaved edits).

## 3.2 Surface B — Publication shared-link snapshot

### File map

| Path | Key symbols | Responsibility | Trust relevance |
|---|---|---|---|
| `src/lib/publication/types.ts` | `ProjectPublicationStatus`, `ProjectPublicationSummary` (staleSnapshotWarning :47-52), `PublicationSnapshotRow` (:67-81 — **no** supplier/pricingSource/confidence/laborUnitCost), schemaVersion 1\|1.2\|1.3 | Type defs | **Yes** — staleSnapshotWarning + snapshotVersion primitives (recipient surface structurally excludes cost intelligence) |
| `src/lib/publication/snapshot.ts` | `buildProjectPublicationSnapshot` (:477), `sanitizeProjectPublicationSnapshotForPublicRead` (:308), `createPublicationSnapshotIdMaps` (:145 opaque proj_/est_/row_/node_/tab_ + sha256), `sanitizeProjectPublicationLocation` (:106-124 hidden/exact/locality, GPS stripped :112), `_privateIdNamespace` random 16 bytes (:504) | Build immutable-at-publish snapshot from live DB; redact on read | **Yes — strong redaction (opaque IDs + location)**. No checksum on snapshot content. schemaVersion 1.3 when tabs (:501) |
| `src/lib/publication/d1-store.ts` | `createPublicationD1Store` (:211), `insertClientComment` (:584 re-reads snapshot_version, throws "changed" :608), `submitClientResponse` (:647, throws :673), `signature_intent_hash` (:699-703 = sha256(publicationId:snapshotVersion:signerName:submittedAt)) | D1 access for recipient writes. **Optimistic-concurrency version lock on recipient writes** | **Yes — version lock is the closest immutability for recipient interaction**. snapshot_json itself **mutable by managers** (republish overwrites). signature_intent_hash binds version+signer+time, **not content** |
| `src/lib/publication/actions.ts` | `createProjectPublication` (:775), `republishProjectPublication` (:845), `rotateProjectPublicationLink` (:938), `revokeProjectPublication` (:1012), `buildSnapshotForProject` (:609-732), `assertProjectPublicationManager` (:394 RBAC), `recordPublisherAuditEvent` (:755-773 → account_security_events) | Manager publication lifecycle | **Yes**. Snapshot **versioned (monotonic int) but not immutable** — republish revoke+insert, rotate updates same row in place (keeps recipient FKs :978-982). Audit for manager actions, **not downloads** |
| `src/lib/publication/admin-d1-client.ts` | `replace_project_publication` (:488 revoke old + insert new), `rotateProjectPublicationCredentials` (:556 UPDATE same row in place, optimistic concurrency on expected_encrypted_token, returns -1 on mismatch) | Privileged D1 procedure client (post-authz) | **Yes — rotate overwrites snapshot_json+token+version in place**. Old snapshot not retained queryably |
| `src/lib/publication/public-repository.ts` | `resolveProjectPublicationAccessByToken` (:650), `resolveProjectPublicationSnapshotByToken` (:662 → sanitize :675), `checkProposalExportRateLimit` (:430-446 12/min 120/hr), `React.cache` memoization (:96-115), HMAC-peppered ip/user_agent hashes (:172-183) | Public-side read resolver + rate limiting | **Yes — read-side redaction every read, active-state gate, rate limits** |
| `src/lib/publication/security.ts` | `createPublicationToken` (32 random bytes :63), `hashPublicationToken` (HMAC-SHA256), `encryptPublicationToken`/`decryptPublicationToken` (AES-256-GCM, reversible for link reconstruction), `hashPublicationPassword`/`verifyPublicationPassword` (scrypt), `assertSameOriginPublicPost` (:373 CSRF), session/access/view cookie builders, `deriveCredentialVersion` (:194 rotates on password change) | Crypto primitives | **Yes — token confidentiality (AES-GCM), password (scrypt), CSRF**. No content-integrity signature on snapshot payload |
| `src/app/api/share/[token]/route.ts` | `GET`, `dynamic`, password-cookie gate (423), `after()` records "open", `Cache-Control: no-store` | Recipient snapshot fetch | **Yes — no-store, password gate, rate limit, open-event audit**. **No XLSX download offered to recipients** |
| `src/app/share/[token]/page.tsx` | public route (:137), `PUBLIC_ROUTE_PREFIXES` includes /share, OG metadata generic (:294), session redirect (:192) | Recipient-facing page | **Yes** — public+token-gated. No recipient-side staleness display |
| `src/lib/repositories/workspace-repository.ts` | `readPublicationSnapshotStaleness` (:1070, daysBehind>7), `readLatestEstimateUpdatedAt` (:1101 published subset only), `getProjectPublicationSummary` (:2925 — manager-only :2963-2976), 5-min in-memory cache (:1038-1045) | Publication summary + staleness | **Yes — staleness computed in JS at read time, manager-only**. Recipients see nothing. Conservative scope (published subset only :1091-1100) |

### Surface B flow (current)

1. **Publish:** manager action → RBAC → `buildSnapshotForProject` (read estimates/nodes/tabs/rows)
   → `buildProjectPublicationSnapshot` (redact location, opaque IDs, random namespace) →
   `replace_project_publication` (revoke old + insert new, `snapshot_version++`) → audit event →
   `revalidatePath`.
2. **Recipient visit:** `/share/[token]` → rate limit → `resolveProjectPublicationAccessByToken`
   (active gate) → password cookie check → `resolveProjectPublicationSnapshotByToken` → sanitize →
   JSON → `after()` open event.
3. **Recipient interaction:** comment/decision POST → CSRF + session + rate limit →
   `insertSharedLinkComment`/`submitSharedLinkDecision` → **version lock** (re-read
   `snapshot_version`, throw on mismatch) → store `snapshot_version_at_*` +
   `signature_intent_hash`.

### Surface B trust gaps

- `snapshot_json` mutable in place (rotate) or revoke+insert (republish); old content not retained
  queryably.
- No content checksum on snapshot; cannot prove bytes-at-read == bytes-at-publish.
- `signature_intent_hash` binds version+signer+time, not content → a party could claim approval of
  different content at the same version.
- Staleness asymmetric: managers warned >7 days, recipients never.
- No XLSX download for recipients (JSON view only).

## 3.3 D1 schema + bindings (from `wrangler.jsonc` + `migrations/`)

- Bindings: D1 `ARCH_DB` (`archestimator-proof-db`), R2 `ARCH_UPLOADS_R2`
  (`archestimator-proof-uploads`), DO `COLLAB_ROOMS` (`CollaborationRoom`), Queue
  `UPLOAD_JOBS_QUEUE` (`archestimator-upload-jobs` + DLQ).
- Migration convention: `NNNN_snake_case.sql`, zero-padded, lexical order. **Latest: `0039`**
  (39 files). Additive/forward-only.
- Relevant existing tables: `project_publications` (0014:1-28), `project_publication_events`
  (0014:40-53), `shared_link_recipients` (0014:58-81), `shared_link_comments` (0014:99-114),
  `shared_link_responses` (0014:126-147, `signature_intent_hash` 64-hex CHECK),
  `shared_link_events` (0014:164-178), `publication_digest_log` (0014:186-195),
  `estimate_sheet_events` (0025:8-39, `old_snapshot`/`new_snapshot` JSON, `correlation_id`
  UNIQUE-per-estimate idempotency), `account_security_events` (0004:1-34), `upload_assets`
  (0010, **`checksum_sha256`** 64-hex CHECK lowercased + `scan_status`), `ai_action_runs` (0006,
  **`redaction_status`** enum + `sha256:`-prefixed hashes).
- **TS row models:** only 4 core types in `src/lib/types/database.ts` (`ProjectRow`, `EstimateRow`,
  `WorkspaceRow`, `ProfileRow`). Publication/upload/audit row types live ad-hoc in repositories.
- **No** `*_export`, `deliverables`, or `packages` table exists. **No** R2 binding for exports.

### Reusable precedents (copy, don't invent)

| Precedent | Source | Copy for |
|---|---|---|
| `checksum_sha256` 64-hex CHECK lowercased | `upload_assets` (0010) | Deliverable content hash column |
| `sha256:`-prefixed hash + `redaction_status` enum | `ai_action_runs`/`ai_tool_calls` (0006) | Redaction-status + content-hash patterns |
| Append-only JSON snapshot columns | `estimate_sheet_events.old_snapshot/new_snapshot` (0025) | Retaining prior snapshot versions |
| `correlation_id` UNIQUE idempotency | `estimate_sheet_events`, `mass_deletion_events` (0023) | Export-job idempotency key |
| `preview_hash` | `mass_deletion_events` (0023) | Pre-generation content fingerprint |
| `signature_intent_hash` 64-hex CHECK | `shared_link_responses` (0014) | Content-binding hash on accept |
| Monotonic `snapshot_version` + recipient version-lock | `project_publications` + `d1-store` | Package versioning |

## 3.4 Risk-doc evidence (verbatim)

- `.ai/10_state/execution-ledger.md:124` — `- Proposal XLSX export (mutable current-estimate only)`
- `.ai/10_state/known-issues.md:361` — `✅ First export priority — Resolved. Proposal XLSX
  preview/download exists for the current mutable estimate. Immutable issued snapshots and PDF
  packages are future work.`
- `.ai/10_state/known-issues.md:372` — `- Immutable issued proposal snapshots — Not implemented.
  Current export is mutable XLSX only.`
- `.ai/10_state/known-issues.md:394` — `- Issued proposals/exports must be immutable snapshots if
  proposal functionality returns.`
- `README.md:252` — `- Exports are working documents, not immutable issued records, legal documents,
  or purchase orders. The immutable/issued-record policy is a future decision.`
- `.ai/10_state/current-state.md:8714` — Codex finding "Unbounded chart and XLSX export loading can
  exhaust server resources" fixed at `0e5dfff` (413 sentinel before workbook alloc); **"hosted
  authenticated oversized export/chart smoke with real beta data was not run."**
- `.ai/06_specs/proposal-package-system.md:34` — publication "complete immutable estimate JSON
  snapshot at publication time" (publication side; XLSX explicitly not).

## 3.5 Test inventory (current coverage)

| File | Asserts | Trust coverage |
|---|---|---|
| `tests/vitest/proposal-export-route-workbook.test.ts` | Route builds loadable XLSX; content-type/disposition; Content-Length == buffer byteLength; sheets; multi-tab; "Default audience client → Source Breakdown redacted" (:149) | Export route integration, size via Content-Length, sheet-level redaction. **No checksum/streaming** |
| `tests/vitest/proposal-workbook-benchmark.test.ts` | 500/1000/2500-row timing via `scripts/benchmark-proposal-workbook` | Large-fixture timing. **No streaming/memory-ceiling assertion** |
| `tests/vitest/proposal-workbook.test.ts` | Bid form/summary/commercial-terms/source; formulas; fractional-qty recalc parity; tab-aware; **redacts Source Breakdown + supplier remarks for client (P1-T9)**; CSV/formula injection defang (P1-T7, F-18); >11 section collision; contingency/VAT modes; cost-per-sqm; static-when-formulas-off | Export + redaction (sheet/remarks level). **No byte-level leak scan, no checksum, no staleness** |
| `tests/vitest/project-publication-snapshot.test.ts` | `buildProjectPublicationSnapshot` client-safe immutable DTO; strips unitCost/miscCost/contingencyPercentage/supplier/library/internalNote; location modes; compact v1.3 tabs; excludes archived-tab | Publication + redaction. **No snapshot checksum** |
| `tests/vitest/project-publication-schema.test.ts` | Migration has `project_publications`, token_hash, encrypted_token, password_hash, snapshot_json, selected_estimate_ids, status enum, event table | Publication schema primitives |
| `tests/vitest/project-publication-security.test.ts` | Token hash/encrypt/decrypt; scrypt password; CSRF; signed cookies; password normalization | Publication/share crypto |
| `tests/vitest/share-snapshot-redaction.test.tsx` | snapshot_json rows do NOT serialize trust fields (pricing_source, confidence, priceHistory, sourceUrl, storage_bucket/path, signedUrl, reviewStatus) | Share JSON redaction. **No XLSX byte scan** |
| `tests/vitest/share-no-store-invariants.test.ts` | All 8 `/api/share/[token]/*` routes force-dynamic + no-store | Stale-data prevention via cache invariants |
| `tests/vitest/publisher-drawer.test.tsx`, `publisher-rbac.test.ts`, `publisher-roster-repository.test.ts` | Drawer UX, RBAC roster filtering, link redaction | Publication UX/authz |
| `tests/vitest/recipient-proposals-repository.test.ts`, `tests/unit/p3-shared-link-migration-red.test.ts` | Recipient inbox, recipient_token_hash schema | Share recipient surface |

**Test gaps:** no file-integrity/checksum test; no immutability/versioning test for issued
exports; no streaming test; no stale-data test on download path; no hosted oversized-export smoke;
no XLSX byte-level leak scan; no recipient content-binding test; no PDF test; plan pack was unbuilt.

## 3.6 UI primitives + package scripts

- **Reusable primitives** (`src/components/ui/`): `dialog`/`modal`, `alert`, `banner`, `badge`,
  `status-badge`, `progress`, `spinner`, `skeleton`, `empty-state`, `confidence-indicator`,
  `card`, `panel`, `tabs`/`tab-strip`, `data-table`, `financial-total-card`, `button`,
  `checkbox`, `switch`, `segmented-control`, `dropdown-menu`, `toast`. (Native `<dialog>` used by
  `ProposalExportPreviewDialog`, not `modal.tsx`.)
- **Scripts:** `test` (bun test tests/unit), `test:dom` (vitest run --maxWorkers=1), `test:e2e`
  (playwright), `type-check` (tsc --noEmit), `lint` (eslint), `lint:design-system`, `validate`
  (type-check+lint+design+test+test:dom), `build` (next build), `cf:typegen`, `cf:build`,
  `cf:deploy`, many `cf:d1-*`/`cf:verify-hosted-*` proof scripts.

## 3.7 Document-impact matrix

| Document | Path | Relevant section | Accuracy | Update needed? |
|---|---|---|---|---|
| Proposal Package spec | `.ai/06_specs/proposal-package-system.md` | §1 XLSX, §2 publication | Accurate; calls publication "immutable" (true at publish-time, not across republish) | Yes — clarify immutability is per-version after this feature |
| README | `README.md` | "Exports are working documents, not immutable issued records" (:252) | Accurate today | Yes — after implementation, update to reflect issued-package immutability |
| Known issues | `.ai/10_state/known-issues.md` | :372, :394 immutable snapshots future work | Accurate | Yes — close after implementation |
| Execution ledger | `.ai/10_state/execution-ledger.md` | :124 mutable XLSX | Accurate | Yes — after implementation |
| current-state Codex note | `.ai/10_state/current-state.md` | :8714 hosted smoke not run | Accurate | Yes — add hosted smoke as rollout gate (this plan does) |
| DESIGN.md | `DESIGN.md` | alpha-stage guide | N/A (no design-system change mandated) | No (defer to owner) |

No document was modified by this task. Updates are flagged for the future executor.

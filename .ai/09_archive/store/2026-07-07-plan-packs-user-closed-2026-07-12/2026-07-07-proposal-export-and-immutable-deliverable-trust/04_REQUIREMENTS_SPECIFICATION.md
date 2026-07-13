# 04 — Requirements Specification

Priority: P0 = must for trust core; P1 = should; P2 = nice-to-have / deferred slice.
Source strength: `brief` (PROMPT.md), `repo evidence` (code/migration), `official docs`,
`derived`, `assumption`, `owner-delegated decision`.

## Requirements

### FR — Functional

- **FR-1 (P0, brief+repo)** — Issued deliverables are **immutable**: once a package is in
  `issued`/`superseded`/`revoked` state, its bytes and checksum cannot be overwritten. Republish /
  re-export creates a new package row; the prior row is retained and queryable by authorized
  managers.
  - AC: After republish, both old and new `snapshot_json`/bytes are readable by an authorized
    manager; old recipient decisions still reference the old `content_hash`.
  - Validation: immutability unit test (write v1, republish v2, assert v1 bytes/hash unchanged).
  - Affected: new `proposal_deliverable_packages` table; `actions.ts`, `admin-d1-client.ts`,
    `route.ts`.

- **FR-2 (P0, brief)** — Every issued deliverable has a **SHA-256 content checksum** computed at
  generation and persisted, covering the exact bytes delivered (XLSX buffer or canonicalized
  snapshot JSON).
  - AC: A package row has non-null `content_sha256` (64-hex) matching
    `sha256(delivered_bytes)`; a cover/title stamp or metadata field exposes a short prefix.
  - Validation: checksum unit test (regenerate, assert match).

- **FR-3 (P0, brief)** — Every issued deliverable carries a **source stamp**: as-of timestamp,
  source estimate revision reference, and (for snapshots) `snapshot_version`.
  - AC: Package row has `source_as_of`, `source_estimate_revision`, `snapshot_version` (snapshot
    surface); XLSX title block + `docProps/core.xml` include `generatedAt` + revision id.
  - Validation: source-stamp assertion test.

- **FR-4 (P0, brief)** — **Staleness is surfaced to recipients**, not only managers: when the
  underlying estimate has changed beyond a threshold since the deliverable's `source_as_of`, the
  recipient view shows a non-blocking staleness notice naming the deliverable date.
  - AC: `/share/[token]` payload includes a `staleness` object (or renders a notice) when
    `daysBehind` exceeds threshold; recipient cannot be misled that the view is current.
  - Validation: recipient-staleness DOM/JSON test.

- **FR-5 (P0, brief+repo)** — **Redaction is broadened and byte-proven** for client XLSX: cost-split
  columns (material/labor/contingency/misc subtotals + unit costs) and workspace-name-as-contractor
  fallback are suppressed for `audience=client` unless explicitly opted in by an authorized internal
  user; a byte-level leak scan asserts no configured internal field appears in the serialized XLSX.
  - AC: client-audience XLSX buffer scanned byte-for-byte lacks configured internal tokens;
    `contractorName` fallback no longer leaks workspace name.
  - Validation: byte-scan test over the real XLSX buffer (unzip + grep worksheet XML).

- **FR-6 (P0, brief)** — **Large-export reliability**: exports above a streaming threshold are
  produced via a streaming or background path; the all-or-nothing 413 is replaced by an async
  resumable path for above-threshold sizes (within the existing hard caps).
  - AC: A request at threshold-crossing size returns a job handle (202 + job id) or a streamed
    response, not a whole-buffer 413; the job completes or fails auditably.
  - Validation: streaming/job test at fixture size crossing threshold.

- **FR-7 (P0, brief)** — **Recipient delivery proof binds content**: recipient open/accept records
  the `content_sha256` of the deliverable they acted against, so approval is provably bound to
  *what* was viewed/accepted.
  - AC: `shared_link_responses`/events carry `content_sha256_at_decision` (or equivalent) in
    addition to `snapshot_version_at_decision`.
  - Validation: content-binding test.

- **FR-8 (P0, brief)** — **Audit trail** for deliverable lifecycle: generation, download,
  republish, revoke, recipient-view, recipient-accept are persisted as D1 rows (not console only).
  - AC: A manager can query "who downloaded/ viewed which deliverable version, when" from D1.
  - Validation: audit-row assertion tests.

- **FR-9 (P1, brief)** — **PDF/XLSX decision**: XLSX + JSON snapshot are the trust-bearing formats;
  PDF is explicitly deferred to an owner decision (renderer + licensing). The plan defines the
  contract a PDF would satisfy and the integration seam.
  - AC: DEC-FORMAT-1 recorded with options, recommendation, owner; PDF slice marked BLOCKED-EXTERNAL.

- **FR-10 (P1, derived)** — **Package state machine** is explicit: `draft`(preview only) →
  `issued` → `superseded` (on republish) | `revoked` | `expired`.
  - AC: Documented states + transitions; only `issued`/`superseded`/`revoked`/`expired` are
    immutable; `draft` never persisted as a deliverable.

### UX — User Experience

- **UX-1 (P0)** — The export preview dialog shows the integrity/staleness panel: content-hash
  prefix, source as-of, staleness badge, and (for issued packages) the package version.
- **UX-2 (P1)** — Recipients see a clear, non-blocking staleness notice (not an error) with the
  deliverable date.
- **UX-3 (P1)** — Download error states distinguish size-threshold (async path offered) from
  hard-cap (413 with guidance).

### A11Y — Accessibility

- **A11Y-1 (P0)** — Integrity/staleness panel uses semantic markup (`status`, `aria-live=polite`
  for staleness), visible focus, keyboard reachable, non-color cue (icon + text).
- **A11Y-2 (P1)** — Async-job progress is announced to assistive tech (role=`progress`,
  aria-busy).

### ARCH — Architecture

- **ARCH-1 (P0)** — A single shared **trust ledger** (`proposal_deliverable_packages`) holds both
  XLSX-package and snapshot-package rows; both surfaces write to it. (DEC-ARCH-1)
- **ARCH-2 (P0)** — Server/client boundaries unchanged in spirit: integrity computation is
  server-only; client only displays server-provided hash/staleness.
- **ARCH-3 (P1)** — Streaming uses `ReadableStream`; background jobs use the existing
  `UPLOAD_JOBS_QUEUE` consumer with a new job kind. (DEC-STREAM-1)
- **ARCH-4 (P0)** — No new crypto primitive; SHA-256 via Web Crypto.

### DATA — Data

- **DATA-1 (P0)** — New append-only `proposal_deliverable_packages` table with `content_sha256`
  (64-hex CHECK, copying `upload_assets` precedent), `source_as_of`, `source_estimate_revision`,
  `snapshot_version`, `package_kind` (xlsx|snapshot|pdf-future), `state`, `size_bytes`,
  `storage_ref` (D1-inline or R2 key), `workspace_id`/`project_id`/`estimate_id`, `created_by`,
  `created_at`, `superseded_by`.
- **DATA-2 (P0)** — `shared_link_responses` gains `content_sha256_at_decision`; recipient events
  gain `content_sha256_at_view` where applicable.
- **DATA-3 (P1)** — Centralized TS row model for the new table(s) (the 4-type `database.ts` gap).

### API — API/Network

- **API-1 (P0)** — XLSX export route writes a package row + checksum before/at response; returns
  the hash in a response header (`X-Archestimator-Package-Hash` short prefix) for client display.
- **API-2 (P1)** — Above streaming threshold, route returns 202 + job id; a status endpoint +
  download endpoint serve the result.
- **API-3 (P0)** — `/share/[token]` snapshot payload includes staleness; recipient accept records
  content hash.

### SEC — Security/Privacy

- **SEC-1 (P0)** — Package reads are authorized: managers via workspace/project RBAC; recipients
  via active token (+password+recipient-session for decisions). No new public surface without
  token.
- **SEC-2 (P0)** — R2 object keys are unguessable; access is app-authorized (signed URL or
  server-mediated), never public bucket listing.
- **SEC-3 (P0)** — Redaction byte-scan is a CI-gated denial test; internal-field allowlist is
  config-driven.
- **SEC-4 (P1)** — Rate limits extended to the async-job endpoint to prevent abuse.

### PERF — Performance

- **PERF-1 (P0)** — Inline export stays within `maxDuration`; streaming keeps memory bounded for
  mid-size; background job removes the 60s ceiling for large-size.
- **PERF-2 (P1)** — Performance evaluator defined (baseline/target/fixture/threshold) — see
  `09_*.md`.

### REL — Reliability

- **REL-1 (P0)** — Export job is idempotent (`correlation_id` precedent) and retry-safe; partial
  failure leaves no corrupt package row (transactional insert or compensating delete).
- **REL-2 (P0)** — Checksum is computed before the package row is marked `issued`; a row with
  null checksum cannot be `issued`.

### OPS — Operations

- **OPS-1 (P0)** — Structured logs for generation/download/job events with redaction.
- **OPS-2 (P1)** — Feature flag for the async path so it can be disabled (rollback).

### TEST — Testing

- **TEST-1 (P0)** — Checksum, immutability, staleness, redaction byte-scan, streaming/job,
  content-binding tests (see `12_*.md` matrix).
- **TEST-2 (P0)** — Hosted oversized-export smoke added as a rollout gate (closes the
  known-issues note).

### DOC — Documentation

- **DOC-1 (P1)** — Update README/spec known-issues to reflect issued-package immutability after
  implementation (flagged, not done by this plan).

## Shadow-path matrix (key flows)

Legend: HP=happy path; N/missing; Empty; Invalid; AuthDenied; UpstreamErr; Concurrency;
Retry/Idem; User-visible; Test. N/A marked with reason.

### Flow: XLSX export (client audience)

| Flow | HP | Nil input | Empty estimate | Invalid settings | Auth denied | Upstream/net err | Concurrency/race | Retry/idem | User-visible | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| XLSX export | file + package row + hash | 400 missing params | validation issue emitted, file still buildable (per current behavior) | 400 malformed | 401/audience downgrade | 5xx, no package row written | two concurrent downloads → two package rows (idempotent per download is not required; each download is a distinct issued copy) | re-POST same settings → new package row (download not idempotent by design) | file downloads; hash shown | TEST-X1 |

### Flow: Snapshot publish/republish

| Flow | HP | Nil sheets | Empty content | Invalid | Auth denied | Upstream err | Concurrency | Retry/idem | User-visible | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Publish/republish | new package row (v N+1), old row retained+superseded | rejected "Select at least one estimate" (existing) | N/A (guard exists) | 400 | 403 RBAC | no row written | two managers republish concurrently → second sees version bump, locks recipient writes | re-POST → new version (republish not idempotent by design) | version increments; recipients see new version | TEST-P1 |

### Flow: Recipient accept (content-bound)

| Flow | HP | Nil signerName | Empty note | Invalid decision | Auth denied | Upstream err | Concurrency (republish under accept) | Retry/idem | User-visible | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Recipient accept | response row with `content_sha256_at_decision` + `signature_intent_hash` | 400 signerName required (existing) | allowed (note optional) | 400 | 401/403 token | no row | 409 "snapshot version changed" (existing) | duplicate accept → idempotent or conflict (existing behavior) | acceptance recorded, hash bound | TEST-R1 |

### Flow: Large export async job

| Flow | HP | Nil job id | Empty (N/A) | Invalid threshold | Auth denied | Queue err | Concurrency | Retry/idem | User-visible | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Async export | 202 + job id → completed → download | 400 | N/A | 400 | 401 | job marked failed, no package row issued | one job per (user, estimate, settings) concurrent → dedupe or allow | `correlation_id` idempotent retry | progress → download | TEST-L1 |

## Credential / material taxonomy (SEC-affected additions)

This feature adds **no new raw token / cookie / bearer** material. It adds **derived content
hashes**:

| Material | Type | Created by | Stored in | Read by | Client-visible? | Used for URL/cookie/session? | Rotation/revocation | Proof |
|---|---|---|---|---|---|---|---|---|
| `content_sha256` (package) | derived (SHA-256 of bytes) | server at generation | `proposal_deliverable_packages.content_sha256` | managers (D1), recipients (via accept record) | yes (short prefix in UI/header) — **not secret** | no | immutable once written | checksum unit test |
| `content_sha256_at_decision` | derived | server at accept | `shared_link_responses` | managers, signing recipient | yes (in receipt) | no | immutable | content-binding test |

A content hash is a **public integrity marker**, not a credential. It must not be used as a bearer
token or session key. Existing tokens/passwords/cookies are unchanged.

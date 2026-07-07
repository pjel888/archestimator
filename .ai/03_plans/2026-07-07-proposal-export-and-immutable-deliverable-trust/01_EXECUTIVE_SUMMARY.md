# 01 — Executive Summary

## What this plan delivers

A planning package that makes Archestimator's proposal outputs **trustworthy enough for real
client review** by giving every issued deliverable five trust properties it currently lacks:

1. **Immutability** — an issued deliverable package is append-only; republish/rotate retains prior
   versions instead of overwriting `snapshot_json` in place.
2. **Content addressing** — a SHA-256 checksum of the deliverable bytes is computed at generation
   and stored, so "the file that was issued" is provable later.
3. **Source/staleness stamping** — every deliverable carries an as-of timestamp + source estimate
   revision; recipients (not just managers) see staleness when the underlying estimate has moved on.
4. **Redaction assurance** — the client XLSX redaction gate is broadened (cost-split columns,
   workspace-name-as-contractor fallback) and proven by a byte-level leak scan, not just a
   sheet-level assertion.
5. **Large-export reliability** — a streaming/background path for exports near the 1200-node /
   3000-row / 50-tab caps, replacing whole-buffer-in-memory + all-or-nothing 413.

Plus recipient **delivery proof** that binds what was viewed/accepted to the content hash, not just
the snapshot version integer.

## Current state (evidence-grounded)

Two surfaces exist today, independently:

- **Surface A — Workshop XLSX** (`src/lib/proposal-export/`, `route.ts`): on-demand, generated
  in-memory, returned in one HTTP response. **Not persisted, not versioned, no checksum, no D1
  download audit row** (only `console.info` via `logProposalExport`). Redaction via
  `applyAudiencePolicy` (`settings.ts:28`) at two chokepoints, server-derived audience. Hard caps
  1200 nodes / 3000 rows / 50 tabs → HTTP 413. `maxDuration = 60`. Whole buffer in memory
  (`writeWorkbookBuffer` → `concatBytes`).
- **Surface B — Publication snapshot** (`src/lib/publication/`): D1 row `project_publications`
  with `snapshot_json`, integer `snapshot_version` (monotonic), encrypted token, hashed password.
  Recipient writes are **version-locked** (`d1-store.ts:608,673`). **But `snapshot_json` is
  mutable**: `republish` revokes+inserts, `rotate` updates the same row in place
  (`admin-d1-client.ts:488,556`). No content checksum. `signature_intent_hash`
  (`d1-store.ts:699`) binds signer+version+timestamp — **not content**. Opaque-ID + location
  redaction on every read (`snapshot.ts:308`). Recipients see **no** staleness; managers see
  `staleSnapshotWarning` >7 days (`workspace-repository.ts:1047`).

Risk docs are explicit: `known-issues.md:372` "Immutable issued proposal snapshots — Not
implemented. Current export is mutable XLSX only."; `README.md:252` "Exports are working
documents, not immutable issued records… future decision."

## Target state (high level)

- A new append-only **deliverable package** record (D1 + optional R2 for large artifacts) that
  content-addresses both XLSX bytes and snapshot JSON, retained across republish.
- XLSX export writes a package row + checksum at generation; download is auditable.
- Snapshot publication writes a package row on create/republish; old `snapshot_json` retained.
- Staleness surfaced to recipients (and to the XLSX title block / docProps).
- Redaction broadened + byte-leak-tested.
- Streaming or Queue-backed generation for large exports.
- Recipient view/acceptance records the content hash they acted against.

## Major findings

- **Architecture:** the two surfaces share no integrity token today; the plan introduces a shared
  `proposal_deliverable_packages` table as the single trust ledger for both. (DEC-ARCH-1)
- **Data:** strong precedents exist to copy — `upload_assets.checksum_sha256` (64-hex CHECK),
  `ai_action_runs.redaction_status`, `estimate_sheet_events.old_snapshot/new_snapshot`,
  `signature_intent_hash`. No new primitive crypto needed.
- **Security:** `/share` public+token-gated surface is well-built; the gap is *content* binding and
  recipient-side staleness, not access control. XLSX cost-split leakage is the main redaction gap.
- **Performance:** whole-buffer-in-memory is the reliability risk; streaming + a Queue fallback are
  the fix, gated behind the existing size caps.
- **Blast radius:** cross-cuts `proposal-export`, `publication`, the export route, the share page,
  the publisher drawer, repositories, D1 schema, and tests. No auth/publication-UX redesign.

## Key decisions (summary — full in `15_*.md`)

- DEC-ARCH-1: One shared `proposal_deliverable_packages` append-only table for both surfaces.
- DEC-STORE-1: Store artifact bytes in R2 only when above a streaming threshold; small deliverables
  stay D1-inline (bytes or checksum-only). Below-threshold = checksum-only (regenerable).
- DEC-FORMAT-1: PDF is **deferred** (BLOCKED-EXTERNAL, owner decision on renderer + licensing);
  XLSX + JSON snapshot are the trust-bearing formats in this plan.
- DEC-STREAM-1: Inline streaming via `ReadableStream` for mid-size; Queue-backed background job for
  large-size, mirroring the existing `UPLOAD_JOBS_QUEUE` pattern.
- DEC-SIG-1: Content binding via SHA-256, **not** PKI/qualified e-signature.
- DEC-LINK-1: Do not redesign publication UX; link to that pack.

## Readiness (summary — full in `17_*.md`)

`verification_mode: emulated` → overall readiness capped at 97, package status capped at
`CONDITIONALLY READY` unless an independent reviewer or explicit owner acceptance reviews the final
package. The one `BLOCKED-EXTERNAL` (PDF renderer decision, DEC-FORMAT-1) is isolated from the
XLSX/snapshot trust core, so named slices are implementation-ready.

**Initial scores** (pre-revision draft) and **final scores** are in `17_FINAL_READINESS_REVIEW.md`.

## Confirmation

No application code, tests, migrations, schemas, infrastructure, or Git state was modified by this
planning task. All writes are confined to this plan folder.

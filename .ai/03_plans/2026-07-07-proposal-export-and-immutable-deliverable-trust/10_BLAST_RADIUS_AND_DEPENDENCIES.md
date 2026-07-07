# 10 — Blast Radius and Dependencies

## Impact inventory

| Area | Impact | Classification | Evidence |
|---|---|---|---|
| `src/lib/proposal-export/` (settings, build-model, create-workbook, xlsx-workbook) | Broaden redaction (FR-5); add post-buffer checksum+package write seam | Required change | `settings.ts:28`, `build-proposal-export-model.ts:59-80,440`, `create-proposal-workbook.ts:326-354,708` |
| Export route `route.ts` | Add package write + hash header + size-threshold branch (inline/stream/async) + download audit | Required change | `route.ts:128-156,191-202` |
| `src/lib/proposal-export/types.ts` | Add trust fields to model/metadata (hashPrefix, sourceAsOf, packageVersion) for display | Required change | `types.ts` |
| `src/components/workshop/ProposalExportPreviewDialog.tsx` | Integrity & Source panel + async progress + states | Required change | dialog :55-66, :257-328 |
| `src/components/workshop/estimate-sheet/use-estimate-proposal-preview.ts` | Surface package hash/id from response headers; poll async job | Required change | hook :169-195 |
| New `src/lib/repositories/proposal-deliverable-packages-repository.ts` | The trust-ledger writer/reader | New file | DEC-ARCH-1 |
| New `src/lib/proposal-deliverables/checksum.ts` (or inline in repo) | SHA-256 via Web Crypto + canonical JSON for snapshots | New file | DEC-HASH-1 |
| New `src/lib/proposal-deliverables/redaction-policy.ts` | Config-driven internal-field allowlist + byte-scan | New file | SEC-3 |
| New `src/lib/proposal-deliverables/staleness.ts` | Recipient staleness compute (reuse `readLatestEstimateUpdatedAt`) | New file | FR-4 |
| `src/lib/publication/actions.ts` | Write package row on publish/republish; supersede prior | Required change | `actions.ts:775,845,938,1012` |
| `src/lib/publication/admin-d1-client.ts` | `replace_project_publication` → insert new + supersede prior package; rotate no longer overwrites in place | Required change | `admin-d1-client.ts:488,556` |
| `src/lib/publication/snapshot.ts` | Canonicalize JSON for stable hashing (key ordering) | Required change | `snapshot.ts:477` |
| `src/lib/publication/d1-store.ts` | Record `content_sha256_at_decision` on accept | Required change | `d1-store.ts:647-731` |
| `src/lib/publication/public-repository.ts` | Include staleness in recipient snapshot payload | Required change | `public-repository.ts:662-677` |
| `src/lib/repositories/workspace-repository.ts` | Reuse `readLatestEstimateUpdatedAt` for recipient staleness (already used for manager) | Required change (extend) | `workspace-repository.ts:1070,1101` |
| `src/app/share/[token]/page.tsx` + share components | Render recipient staleness notice | Required change | page + share components |
| `src/app/api/share/[token]/decision/route.ts` | Pass content hash to store | Required change | decision route |
| New `migrations/0040_proposal_deliverable_packages.sql` | Trust ledger + columns | New file | DATA-1/2 |
| New async job consumer (Queue) | `proposal_export` job kind on `UPLOAD_JOBS_QUEUE` consumer | Required change (P1) | ASSUMP-2 |
| `wrangler.jsonc` | Possibly none (reuse `ARCH_UPLOADS_R2` prefix). New binding only if separate R2 namespace chosen | Verification only / Possible change | DEC-STORE-1 |
| `src/lib/types/database.ts` | Add centralized row model for new table (DATA-3) | Required change (P1) | `database.ts` |
| Tests (see `12_*.md`) | New + extended | Required change | many |
| `README.md`, `.ai/06_specs/proposal-package-system.md`, `.ai/10_state/known-issues.md` | Update after implementation | Required change (DOC-1, post-impl) | doc-impact matrix |

## Classification summary

- **Required change:** trust ledger, redaction broadening, checksum, staleness, audit, tests.
- **Probable change:** async job consumer wiring (depends on existing consumer structure).
- **Possible change:** `wrangler.jsonc` (only if separate R2 binding).
- **Verification only:** Better Auth, DO `COLLAB_ROOMS` (unaffected).
- **Explicitly unaffected:** cost library, estimate editing workflow, collaboration invitations,
  uploads (component-library), auth session model, `/share` access mechanics.

## Dependencies (internal)

- D1 migration must land before repository code.
- Redaction policy config before byte-scan test.
- Checksum module before route/repository use.
- Async path depends on Queue consumer (ASSUMP-2 confirmation).

## Dependencies (external / provider)

- Cloudflare D1, R2, Queues (all bound, standing authorization).
- Web Crypto SHA-256 (Worker runtime standard).
- No third-party renderer (PDF deferred — DEC-FORMAT-1).

## Compatibility

- Additive JSON fields → backward-compatible for existing clients.
- New table → no impact on existing reads.
- Pre-feature publications remain readable (no package row).

## Affected active development

- Coordinate with any in-flight publication/Publisher work (file-scope ownership). The
  `publication/*` files are the shared critical path — serialize edits there.

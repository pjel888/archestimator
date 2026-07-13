# 10 — Blast Radius and Dependencies

## Direct impact

| Area | File / surface | Impact | Classification |
|---|---|---|---|
| Storage port | `src/lib/uploads/storage-provider.ts` | widen `uploadObject` to stream; add optional `list`, multipart, `customMetadata` | Required change |
| R2 provider | `src/lib/uploads/r2-storage-provider.ts` | stream put + customMetadata + list + multipart impl | Required change |
| Image routes | `src/app/api/projects/images/route.ts`, `src/app/api/estimate-row-images/route.ts`, `src/app/api/component-library/images/route.ts` | stream body; env cap; customMetadata | Required change |
| Attachment route | `src/app/api/component-library/attachments/route.ts` | stream body; env cap; customMetadata; scan posture retained | Required change |
| Direct upload route | `src/app/api/component-library/attachments/direct-upload/route.ts` | stream PUT; env cap; multipart (DEC-03) or honest 501 | Required change |
| Session strategy | `src/lib/uploads/session-strategy.ts` | wire multipart (DEC-03) | Probable change (conditional) |
| Provider portability | `src/lib/uploads/provider-portability.ts` | R2 multipart impl | Probable change (conditional) |
| Image processing | `src/lib/uploads/server-image-processing.ts` | stream output; Images binding (DEC-07) | Probable change (conditional) |
| Sharp stub | `src/lib/uploads/sharp-cloudflare-stub.ts` | retain or remove per DEC-07 | Possible change |
| Admission | `src/lib/uploads/admission-control.ts` | read env `…CONCURRENT_UPLOADS` | Required change |
| Policy | `src/lib/uploads/policy.ts` | per-surface cap from env | Probable change |
| Records | `src/lib/uploads/upload-records.ts`, `direct-upload-records.ts` | customMetadata echo; multipart part rows (DATA-02) | Probable change |
| Cleanup | `src/lib/uploads/cleanup-job.ts`, `cleanup.ts` | list-reconcile mode | Required change (FR-05) |
| Scan | `src/lib/uploads/scan-job.ts`, `scanning.ts`, `policy-scanner.ts`, `clamd-scanner.ts` | posture doc; optional stream-scan | Verification only (mostly) |
| Worker | `worker.ts` | `30 3` retention pass real storage provider | Required change (FR-06) |
| Scheduled jobs | `src/lib/cloudflare/scheduled-upload-jobs.ts` | pass storage provider to retention | Required change (FR-06) |
| Retention core | `src/lib/compliance/retention-core` | read-only confirm it accepts storage provider | Verification only |
| Queue | `src/lib/cloudflare/upload-job-queue.ts` | unchanged (already idempotent) | Explicitly unaffected |
| Client | `src/lib/uploads/client-upload.ts`, `client-state.ts`, `component-attachment-client.ts` | multipart progress (DEC-03) | Possible change (conditional) |
| next config | `next.config.ts` | image loader (DEC-07) | Possible change (conditional) |
| wrangler config | `wrangler.jsonc` | vars (comments / possibly `ARCHESTIMATOR_IMAGE_PROCESSING_PROVIDER`, `UPLOAD_SCAN_PROVIDER`) | Probable change (vars only — no new bindings) |
| Env types | `cloudflare-env.d.ts` | `cf:typegen` if bindings/types change | Verification only |
| Migration | `migrations/0041_upload_multipart_parts.sql` (next free; re-confirm at impl) | additive, only if DEC-03 + DATA-02 | Conditional |
| Tests | `tests/vitest/upload-*.test.ts`, route tests, new stream/multipart/metadata tests | Required change |
| Proof scripts | `scripts/verify-hosted-upload-*.ts` | extend for stream/memory/multipart gaps | Probable change |

## Transitive impact

- **Image-rendering components:** `ProjectCardThumbnail`, `ComponentLibraryManager`, `MainSidebar`,
  project/estimate galleries — consume same asset descriptors; **explicitly unaffected** (verify
  during impl that DTOs unchanged).
- **Mass deletion:** `src/lib/projects/actions.ts`, `src/lib/mass-deletion/storage-cleanup.ts` —
  already call `removeObjects`; **explicitly unaffected** (verify storage provider signature change
  is backward-compatible: keep `Buffer|Uint8Array` overload alongside stream).
- **Authz:** `src/lib/authz/d1-access.ts` — unchanged.
- **Better Auth** — unchanged.
- **Durable Objects / collaboration** — out of scope (sibling pack).
- **Email** — out of scope.
- **Cron schedule** — unchanged (3 crons retained); only `30 3` handler gains storage provider.

## Compatibility

- **Backward-compatible:** streaming, customMetadata, list, retention-fix, env-cap (except image
  12→4 MiB behavior change — OPEN-01).
- **Additive:** multipart (DEC-03), Images binding (DEC-07).
- **No breaking DTO change:** asset descriptors preserved.
- **Provider interface widening:** keep existing `Buffer|Uint8Array` overload (backward-compat for
  mass-deletion/cleanup callers) + add `ReadableStream`.

## Affected tests

All `tests/vitest/upload-*.test.ts` (≈55 files), route tests, and the 4 hosted proof scripts must
stay green or be extended. New tests per `12`.

## Affected documentation

- `18_STACK_CONTRACT` (this pack) — upload/scanner/Images decisions.
- `13_ROLLOUT_ROLLBACK_AND_OPERATIONS` (this pack) — runbook.
- `wrangler.jsonc` inline comments (vars) — optional.
- `.ai/10_state/current-state.md` — update after implementation (not now; planning-only).

## Affected deployment / ops

- No new binding; no new paid add-on; no provider project boundary change.
- Deploy via existing `cf:deploy`. First-user rollout = same Worker.
- Rollback = revert code + (if DATA-02) `DROP TABLE` migration.

## Active development concurrency

- Shared worktree (main). Multiple agents possible.
- Implementation lanes must declare file-scope ownership in a `LOOP_LEDGER.md` / coordination
  ledger before editing, per `AGENT_OPERATING_PROTOCOL.md` high-concurrency rules.
- The storage-provider interface is a shared file — serialize its edit; routes can follow in
  parallel once the interface is widened.

## Dependencies (ordered)

1. Widen `UploadStorageProvider` interface ( ARCH-02 ) → unblocks all routes.
2. R2 provider stream/metadata/list impl → unblocks routes + cleanup.
3. Route streaming edits (parallel after 1+2).
4. Env-cap enforcement (FR-02) — after routes stream.
5. FR-05/FR-06 cleanup/retention — after provider `list`.
6. DEC-03 multipart — after provider multipart (independent lane).
7. DEC-07 Images — independent lane (server-image-processing only).
8. Tests + proof scripts — alongside each lane.

# 01 — Executive Summary

## What this plan is

A planning-only package that gives a future implementation AI a clear, safe, free-tier path for
upload **memory safety**, **multipart / large-file strategy**, **R2 object lifecycle**,
**scanner integration**, and **Cloudflare Images readiness** — the five areas named in the
`PROMPT.md` brief. It does not change application code.

## Why now

Archestimator is preparing for first users. Every inbound file-upload route currently buffers the
**entire request body into a Node `Buffer` inside the Worker isolate** before writing to R2. On the
Cloudflare Workers runtime the isolate memory cap is **128 MB** (official, 2026-07-05), and that cap
is **per-isolate, shared across concurrent requests**. A few concurrent uploads — or one large
direct-upload PUT (today's signed-single-part path accepts up to **64 MiB − 1**) — can exceed the
isolate budget and cause the runtime to drop in-flight requests with
`Memory limit would be exceeded before EOF`. That is a first-user reliability cliff, not a
theoretical risk.

At the same time, multipart upload is **only strategized, not implemented** (the
`session-strategy.ts` path returns 501 for multipart with an explicit
"need Cloudflare R2 multipart support" comment), R2 objects carry **no `customMetadata`** and the
storage-provider interface has **no `list` method**, the default scanner is **policy-only**
(EICAR substring + content-type, not real AV), and the `IMAGES` binding is declared in
`wrangler.jsonc` but **unused by the upload subsystem at runtime** (the proof router exercises it,
but production image processing falls back to `sharp`, which is stubbed in the Workers proof build).

## Current state (one screen)

| Surface | Today | Risk |
|---|---|---|
| Memory model | All 5 upload routes do `Buffer.from(await file.arrayBuffer())`; direct PUT buffers up to 64 MiB − 1 | OOM under concurrency; isolate eviction |
| Body limits | `wrangler.jsonc` declares 4 MiB body limit, **but it is only read by a dry-run proof route**; real routes hardcode 12/20/64 MiB | Declared limit ≠ enforced limit |
| Multipart | `session-strategy.ts` + `provider-portability.ts` define the shape; `direct-upload/route.ts` 501s | No >5 GiB path; no resumable path |
| R2 metadata | Only `contentType` + `cacheControl` written; no `customMetadata`; provider has no `list` | No object-level audit/lifecycle hooks |
| Scanner | Default = policy scanner (EICAR + content-type); ClamAV behind `UPLOAD_SCAN_PROVIDER=clamd` (unset); scan gating is attachment-only | Default is not real AV; posture undocumented |
| Cloudflare Images | Binding declared; `server-image-processing.ts` can use it, but only when `ARCHESTIMATOR_IMAGE_PROCESSING_PROVIDER=cloudflare-images` (unset) | Proof-only; outputs re-buffered |
| Cleanup/retention | App-level cron cleanup (7d failed / 30d deleted / 1d expired sessions / 365d events); 3rd cron (`30 3`) does D1 retention only, no R2 delete | Orphan R2 objects if D1/cron drifts |

## Target state (the plan's job to specify, not implement)

1. **Streaming-first upload**: widen `UploadStorageProvider.uploadObject` to accept a
   `ReadableStream`, and have each route stream `request.body` (or `file.stream()` from a small
   `formData()`) straight to `R2Bucket.put(key, stream)` — the officially-supported, memory-safe
   pattern. Keep small-buffer paths only where image processing genuinely needs the bytes.
2. **Enforced, honest limits**: make the `ARCH_UPLOAD_HOSTED_*` env vars the single source of truth,
   enforced on the real routes, so the proof-declared limit and the runtime limit agree.
3. **Multipart decision**: enable real R2 multipart for the direct-upload path (free-tier-supported),
   with a documented size threshold and a 501 retained only for genuinely unsupported cases — or,
   if owner prefers, explicitly defer multipart and cap first-user files at the single-PUT ceiling.
4. **R2 lifecycle**: add `customMetadata`, a bounded `list` helper for orphan cleanup, and reconcile
   the 3rd cron's D1 retention pass with actual R2 deletion so D1/cron drift cannot orphan objects.
5. **Scanner posture**: document the default policy scanner as a first-user floor, keep ClamAV as
   the documented upgrade, and record the Cloudflare-CDR option as a future paid decision.
6. **Cloudflare Images**: decide (owner) whether to flip image processing to the `IMAGES` binding
   for production, with the 20 MB input cap and 5,000 transforms/month free quota as the binding
   constraints — or keep `sharp` and accept the proof-build stub.

## Major findings

- **Memory** (P0): every upload path buffers the whole body. The single largest in-memory allocation
  on the hot upload path is the signed direct-upload PUT at 64 MiB − 1
  (`src/app/api/component-library/attachments/direct-upload/route.ts:439`). Five concurrent direct
  PUTs alone can approach the isolate ceiling before any overhead.
- **Limits drift** (P1): the 4 MiB proof-declared body limit is descriptive only; image routes allow
  12 MiB and attachments 20 MiB into memory. First-user "what's my max upload?" has three different
  answers depending on the surface.
- **Multipart stub** (P1): `chooseUploadSessionStrategy` computes a `multipart_resumable` plan but
  `direct-upload/route.ts:231-233` rejects it. The `provider-portability.ts` interface already
  models `MultipartUploadSession`; the R2 provider does not implement it.
- **R2 metadata/list gaps** (P2): no `customMetadata`, no provider `list`. Orphan cleanup relies on
  D1 row truth; if D1 and R2 drift, objects leak silently.
- **3rd cron** (P2): `30 3 * * *` runs `runRetentionPassInD1(env.ARCH_DB, undefined, …)` — the
  `undefined` storage provider means retention-class `uploads_orphaned`/`sessions_expired` tombstone
  D1 rows but never delete the matching R2 objects.
- **Scanner default** (P1 for trust posture): the default `createUploadPolicyScannerProvider` is an
  EICAR-signature + content-type check, not antivirus. This is a defensible first-user floor but must
  be documented honestly; it must not be presented as malware protection.
- **Images binding unused at runtime** (P2): `ARCHESTIMATOR_IMAGE_PROCESSING_PROVIDER` is unset, so
  production image processing uses `sharp`, which `sharp-cloudflare-stub.ts` neutered for the Workers
  proof build. First-user image uploads may 501 unless the provider is set or `sharp` is restored.

## Major decisions (preview — full rationale in `15`)

| ID | Decision | Status |
|---|---|---|
| DEC-01 | Stream upload bodies to R2 `put(stream)` instead of buffering | Resolved (recommended) |
| DEC-02 | Make `ARCH_UPLOAD_HOSTED_*` the single enforced source of truth | Resolved (recommended) |
| DEC-03 | Enable real R2 multipart for direct uploads on free tier | Owner-delegated (recommended enable) |
| DEC-04 | Add R2 `customMetadata` + bounded `list` for lifecycle | Resolved (recommended) |
| DEC-05 | Reconcile 3rd cron retention pass with R2 deletion | Resolved (recommended) |
| DEC-06 | Document policy scanner as first-user floor; ClamAV as upgrade | Resolved (recommended) |
| DEC-07 | Flip production image processing to `IMAGES` binding | Owner-delegated (conditional) |

## Blast radius (preview — full in `10`)

Direct: `src/lib/uploads/` (storage-provider, r2-storage-provider, session-strategy,
provider-portability, server-image-processing, cleanup, scanning, scan-job, admission-control,
runtime-storage-provider, policy), all 5 upload routes, `worker.ts`, `scheduled-upload-jobs.ts`,
`upload-job-queue.ts`, `server-image-processing.ts`, `sharp-cloudflare-stub.ts`, `next.config.ts`,
`cloudflare-env.d.ts`, `wrangler.jsonc` (vars only), one new D1 migration (`0041`, next free; `0040` taken by a concurrent lane), and the
matching vitest/proof suites.

Transitive: every page/component that renders an uploaded image (`ProjectCardThumbnail`,
`ComponentLibraryManager`, `MainSidebar`, project/estimate image galleries), every test that asserts
on upload routes, and the four hosted upload proof scripts.

## Readiness (preview — full in `17`)

- `verification_mode: emulated` (no native independent verifier available this session) → overall
  readiness capped at **97**, and the package status capped at **CONDITIONALLY READY** for this
  high-blast-radius planning work until a human or independent reviewer signs off.
- Initial scores in `17`; final scores in `17`. No internally resolvable P0 planning gap remains.
  Remaining gaps are owner-delegated decisions (DEC-03, DEC-07) and hosted proof that by definition
  cannot be produced in a planning-only pass.

## Confirmation

No application code, tests, migrations, package manifests, provider state, or runtime data was
modified. All writes are confined to this plan folder. `git diff --check` is the planning-write
verification gate.

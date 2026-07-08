# 02 — Feature Brief and Scope

## Source brief

From `PROMPT.md` (`.ai/03_plans/2026-07-07-r2-upload-memory-multipart-and-image-readiness/PROMPT.md`):

> **Goal:** Create a plan pack for upload memory safety, multipart/large-file strategy, R2 object
> lifecycle, scanner integration, and Cloudflare Images readiness.
>
> **Evidence to start from:** `wrangler.jsonc` upload/body/memory env + `ARCH_UPLOADS_R2` + `IMAGES`
> bindings; upload routes and image paths buffer payloads (`src/lib/uploads/`, upload API routes);
> `src/lib/uploads/r2-storage-provider.ts`; existing upload proof scripts focus on production
> observations and scanner proof, but memory/multipart readiness is not a full plan.
>
> **Required plan pack:** file-size classes, memory budget, streaming/multipart decision, image
> processing strategy, R2 metadata, malware scanning, retry behavior, deletion/retention, tests, and
> hosted proof.
>
> **Constraints:** stay within Cloudflare free-tier/bundled limits; do not store raw uploaded
> content in evidence; no new paid dependencies without owner approval.
>
> **Stop condition:** the pack is complete when upload handling has a clear safe path for first-user
> files and future large files.

The `Creating-Plan-Prompt.md` and `Multi-Agent-Execution-Directive.md` are the authoritative
planning-suite contracts layered on top of this brief. This is a **planning-only** task
(`planning-only` classification per the Multi-Agent Directive §0).

## Restated product outcome

A first user of Archestimator can upload a project image, an estimate-row image, a component-library
image, or a component-library attachment **without the Worker OOMing, without an undocumented size
cap surprising them, and without their file silently leaking in R2 forever** — and the team has a
documented, free-tier-compatible path to raise that ceiling (multipart) and to harden content
scanning (ClamAV / Cloudflare CDR) and image processing (Cloudflare Images) when usage grows.

## In scope

1. **Memory safety** for all five inbound upload surfaces:
   - `src/app/api/projects/images/route.ts` (POST/GET/DELETE)
   - `src/app/api/estimate-row-images/route.ts` (POST)
   - `src/app/api/component-library/images/route.ts` (POST/GET/DELETE)
   - `src/app/api/component-library/attachments/route.ts` (POST/GET/DELETE)
   - `src/app/api/component-library/attachments/direct-upload/route.ts` (POST create/finalize, PUT)
2. **Body/size limit model**: `ARCH_UPLOAD_HOSTED_BODY_LIMIT_BYTES`,
   `ARCH_UPLOAD_HOSTED_MEMORY_MB`, `ARCH_UPLOAD_HOSTED_ROUTE_DURATION_MS`,
   `ARCH_UPLOAD_HOSTED_CONCURRENT_UPLOADS`, `ARCH_UPLOAD_STORAGE_LATENCY_P95_MS` as the single
   enforced source of truth; per-surface caps derived from it.
3. **Multipart / large-file strategy**: real R2 `createMultipartUpload`/`uploadPart`/`complete` for
   the direct-upload path; size threshold; resumable/abort behavior; free-tier operation count
   budget.
4. **R2 object lifecycle**: `customMetadata` on every `put`; bounded `list` for orphan
   reconciliation; deletion/retention alignment between D1 rows and R2 objects (incl. the 3rd cron).
5. **Scanner integration posture**: default policy scanner documented as a floor; ClamAV as the
   documented upgrade; Cloudflare CDR as a future paid option; scan-gating consistency across
   surfaces.
6. **Cloudflare Images readiness**: production use of the `IMAGES` binding vs `sharp`; the 20 MB
   input cap and 5,000 transforms/month free quota as binding constraints; streaming output to R2.
7. **Tests and hosted proof**: vitest coverage for streaming, multipart, metadata, lifecycle,
   scanner posture; proof-script gaps for memory pressure and large-file paths.

## Explicitly out of scope

- Implementing any of the above (next suite stage).
- AI-package/ask routes (`src/app/api/ai/*`) — they read `request.json()`, not file uploads.
- Invite/share/unsubscribe `formData()` routes — tokens only, no file payloads.
- Collaboration Durable Object / WebSocket realtime (covered by a sibling pack).
- Email (`EMAIL` binding) outbound path.
- Supabase/Vercel/Resend legacy surfaces (historical only).
- Any paid Cloudflare add-on enablement (Workers Paid, R2 paid, D1 paid, Images paid, Smart
  Placement paid, dedicated egress).
- Storing raw uploaded content, secrets, or PII inside this plan pack.

## Assumptions (validated against repo evidence unless noted)

| ID | Assumption | Evidence / status |
|---|---|---|
| ASSUMP-01 | Active runtime is Cloudflare Workers (OpenNext), D1, R2, DO, Queues, Email — Supabase/Vercel/Resend are historical only | `wrangler.jsonc`, `AGENTS.md` "Stack baseline"; `package.json` has no `@supabase/*` |
| ASSUMP-02 | Worker runs on the Workers Free plan (128 MB isolate, 10 ms CPU/req, 100 MB request body, 50 subrequests, 3 MiB bundle) | `wrangler.jsonc` has no paid flags; cost posture in `AGENTS.md` |
| ASSUMP-03 | R2 free tier (10 GB-month storage, 1M Class A + 10M Class B ops/month, zero egress) is the operative budget | `19` research; `20` cost model |
| ASSUMP-04 | The 4 MiB `ARCH_UPLOAD_HOSTED_BODY_LIMIT_BYTES` is intended as the first-user cap, not a Cloudflare platform limit | It is ~25× tighter than the 100 MB platform ceiling (`19`) |
| ASSUMP-05 | `nodejs_compat` + `runtime = "nodejs"` on upload routes means `Buffer`/`node:net` (clamd) are available, but the isolate is still 128 MB | `wrangler.jsonc` `compatibility_flags`; `19` |
| ASSUMP-06 | First-user files are small-to-medium (project/estimate images, component PDFs/XLSX); >5 GiB files are a future concern, not a launch blocker | Product context (construction estimating); DEC-03 owner decision |

## Constraints (carried from brief + repo)

- **Free-tier only.** No paid add-on without explicit owner approval (`AGENTS.md` cost posture).
- **Bound resources only.** Only `ARCH_UPLOADS_R2`, `IMAGES`, `ARCH_DB`, `UPLOAD_JOBS_QUEUE`,
  `COLLAB_ROOMS`, `EMAIL` as bound in `wrangler.jsonc`. Never the historical Supabase project
  `ebxxqidacheyapmmzavr`, the unrelated `archestimator` provider project, or other accounts.
- **No raw content in evidence.** Hashes, prefixes, sizes, content-types, and `file:line` references
  only.
- **Planning only.** No application/test/migration/package/provider/runtime mutation.
- **Shared worktree.** No branch/worktree/commit/push; file-scope ownership only.

## Success metrics (planning-quality, not product-runtime)

- Every one of the seven in-scope areas has ≥1 requirement with objective acceptance criteria and a
  traced implementation task.
- Every memory-safety/multipart/Images decision is resolved or explicitly isolated as
  `DISCOVERY-REQUIRED` / `BLOCKED-EXTERNAL` with options + recommendation.
- `16_REQUIREMENTS_TRACEABILITY_MATRIX.md` has zero untraced requirements.
- `17_FINAL_READINESS_REVIEW.md` records scores + verification mode + residual gaps honestly.

## Failure metrics (what would make this plan wrong)

- A recommendation that requires a paid Cloudflare add-on (violates the cost constraint).
- A "stream to R2" recommendation that ignores the `formData()`-consumes-body trap
  (`19` pitfall) or the image-processing-needs-bytes reality.
- An enforced-limit model that breaks existing first-user uploads (e.g. capping images below the
  current 12 MiB without an owner decision).
- A multipart plan whose R2 operation-count budget blows the free-tier Class A quota.

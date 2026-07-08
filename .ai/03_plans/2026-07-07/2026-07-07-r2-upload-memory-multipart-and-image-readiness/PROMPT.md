# GLM5.2 Plan Pack Prompt: R2 Upload Memory Multipart And Image Readiness

Date: 2026-07-07
Target folder: `.ai/03_plans/2026-07-07-r2-upload-memory-multipart-and-image-readiness`
Mode: planning only. Create the plan pack in this folder; do not change application code.

## Goal

Create a plan pack for upload memory safety, multipart/large-file strategy, R2 object lifecycle, scanner integration, and Cloudflare Images readiness.

## Evidence To Start From

- `wrangler.jsonc` sets upload/body/memory-related environment values and binds `ARCH_UPLOADS_R2` plus `IMAGES`.
- Upload routes and image processing paths buffer meaningful payloads; inspect `src/lib/uploads/` and upload API routes.
- `src/lib/uploads/r2-storage-provider.ts` implements R2 storage behavior.
- Existing upload proof scripts focus on production observations and scanner proof, but memory/multipart readiness is not a full plan.

## Required Plan Pack

Include file-size classes, memory budget, streaming/multipart decision, image processing strategy, R2 metadata, malware scanning, retry behavior, deletion/retention, tests, and hosted proof.

## Constraints

Stay within Cloudflare free-tier/bundled limits. Do not store raw uploaded content in evidence. Do not introduce new paid dependencies without owner approval.

## Stop Condition

The pack is complete when upload handling has a clear safe path for first-user files and future large files.

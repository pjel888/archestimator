# 15 — Decisions, Assumptions, and Alternatives

## Decisions

### DEC-01 — Stream upload bodies to R2 `put(stream)` [Resolved, recommended]
- **Problem:** Whole-body buffering OOMs the 128 MB isolate under concurrency.
- **Constraints:** Free-tier; `runtime = "nodejs"`; `nodejs_compat`; R2 binding.
- **Options:**
  A. Stream `request.body`/`file.stream()` → `R2Bucket.put(key, stream)`.
  B. Lower buffer cap only.
  C. Workers Paid plan (larger memory).
- **Advantages (A):** official memory-safe pattern; free; fixes root cause.
- **Disadvantages (A):** image transform needs bytes (buffer transform input only); `formData()`
  consumes body (use `file.stream()`).
- **Rejected:** B (still OOM-prone); C (paid; violates constraint).
- **Security:** unchanged (authz/magic-byte retained).
- **Performance:** resolves RISK-01.
- **Operational:** simpler than chunked buffering.
- **Recommended:** A.
- **Reason:** only free-tier root-cause fix.
- **Consequences:** provider interface widens (ARCH-02); routes edit per-surface.
- **Change condition:** none.

### DEC-02 — `ARCH_UPLOAD_HOSTED_*` as single enforced source [Resolved, recommended]
- **Problem:** proof-declared 4 MiB ≠ enforced 12/20/64 MiB.
- **Options:**
  A. Env as single source; routes read it.
  B. Per-route env.
  C. Keep hardcoded + fix proof.
- **Recommended:** A. **Rejected:** B (fragile); C (doesn't fix three-answers confusion).
- **Consequence:** image cap 12→4 MiB behavior change (OPEN-01).

### DEC-03 — Enable real R2 multipart for direct uploads [Owner-delegated, recommended enable]
- **Problem:** multipart strategized but 501; caps first-user/large files.
- **Options:**
  A. Enable real R2 multipart (`createMultipartUpload`/`uploadPart`/`complete`).
  B. Stay 501; cap at single-PUT.
  C. Presign direct-to-R2 URLs.
- **Advantages (A):** free-tier-supported; 5 TiB ceiling; resumable.
- **Disadvantages (A):** op-count cost; client complexity; part cleanup.
- **Rejected:** B (artificial cap); C (bypasses app authz/metadata/scan).
- **Recommended:** A (enable), **conditional on owner approval** + operation budget (`20`).
- **Change condition:** owner declines → retain 501 + document.

### DEC-04 — R2 `customMetadata` + bounded `list` [Resolved, recommended]
- **Problem:** no object-level audit/lifecycle hooks; no orphan reconciliation.
- **Options:**
  A. Add customMetadata + bounded list.
  B. D1-only truth (status quo).
- **Recommended:** A. **Rejected:** B (drift orphans — RISK-09).
- **Consequence:** provider widens; cleanup gains reconcile mode.

### DEC-05 — Reconcile 3rd-cron retention with R2 deletion [Resolved, recommended]
- **Problem:** `30 3` retention passes `undefined` storage → R2 leak.
- **Options:**
  A. Pass real storage provider to retention.
  B. Separate cleanup-only cron.
- **Recommended:** A. **Rejected:** B (op-cost duplication).
- **Consequence:** `worker.ts`/`scheduled-upload-jobs.ts` edit; destructive (dry-run-default).

### DEC-06 — Document policy scanner as floor; ClamAV as upgrade [Resolved, recommended]
- **Problem:** default scanner not AV; must be honest.
- **Options:**
  A. Document floor + ClamAV upgrade path.
  B. Mandate ClamAV now.
  C. Pretend policy scanner is AV.
- **Recommended:** A. **Rejected:** B (network-egress risk, owner decision); C (dishonest).
- **Consequence:** FR-07 doc; OPEN-02 for ClamAV enable.

### DEC-07 — Cloudflare Images binding for production image processing [Owner-delegated, conditional]
- **Problem:** binding declared but unused; sharp stubbed in proof build → image uploads may 501.
- **Options:**
  A. Flip to `IMAGES` binding (`ARCHESTIMATOR_IMAGE_PROCESSING_PROVIDER=cloudflare-images`).
  B. Keep sharp (restore Workers-compat).
  C. Status quo (proof-build 501).
- **Advantages (A):** free transforms (5,000/mo); streams from R2; no sharp bundle.
- **Disadvantages (A):** quota; 20 MB input cap; output format constrained.
- **Advantages (B):** no quota; full format control.
- **Disadvantages (B):** bundle size; Workers-compat risk; proof-build stub.
- **Recommended:** A (binding), **conditional on owner approval**; B is the fallback if A's quota/
  format constraints bind.
- **Change condition:** owner prefers sharp or quota binds → B.

## Open decisions (require owner)

| ID | Decision | Options | Recommendation | Decision owner | Impact of each option |
|---|---|---|---|---|---|
| OPEN-01 | Acknowledge image cap change 12→4 MiB (FR-02) | ack / raise cap via env / keep 12 MiB per-surface | ack (env authoritative) + client pre-check | owner | ack: honest single cap; raise: higher mem risk; keep 12: two-source confusion persists |
| OPEN-02 | Enable ClamAV for real AV (FR-07) | enable (confirm egress) / defer (policy floor) | defer for first-user; enable when egress confirmed | owner | enable: real AV (egress risk); defer: policy floor (honest) |
| DEC-03 | Enable multipart (FR-03) | enable / defer (501) | enable (free-tier; closes 501) | owner | enable: large-file path; defer: cap at single-PUT |
| DEC-07 | Images binding vs sharp (FR-08) | binding / sharp / status quo | binding (conditional) | owner | binding: quota+cap; sharp: bundle risk; quo: 501 |

## Assumptions (from `02`, validated)

ASSUMP-01..06 stand. ASSUMP-06 (>5 GiB files are future) underpins DEC-03 being owner-delegated
rather than launch-blocking.

## Alternatives considered (architectural — from `06`)

1. **Buffer but cap lower** — rejected (RISK-01 root cause).
2. **Presign direct-to-R2** — rejected (bypasses authz/metadata/scan).
3. **Separate storage microservice** — rejected (over-engineering).
4. **Cloudflare CDR now** — rejected (paid; future).
5. **Workers Paid plan** — rejected (free-tier constraint).
6. **R2 bucket lifecycle rules** — recorded, not now (second source of truth).

# 02 — Feature Brief and Scope

## Source brief (verbatim)

From `PROMPT.md` (the authoritative brief for this task):

> **Goal.** Create a plan pack for proposal/export deliverable trust: immutable packages,
> stale-data warnings, redaction, generated file integrity, client confidence, and large-export
> reliability.
>
> **Evidence To Start From.** Proposal export code lives in `src/lib/proposal-export/` and
> proposal/publication API/UI routes. Export preview UI exists in
> `ProposalExportPreviewDialog.tsx`. Publication and share flows can expose selected sheets to
> recipients. Risk docs mention mutable XLSX/export integrity/size concerns and the need for
> trustworthy proposal output.
>
> **Required Plan Pack.** Define export package states, immutability/versioning, checksum or audit
> trail, source/staleness indicators, internal-field redaction, PDF/XLSX decision points,
> large-file streaming, tests, and recipient proof.
>
> **Constraints.** Do not conflate proposal publishing UX with file-integrity implementation; link
> to that pack but keep this one focused on deliverable trust.
>
> **Stop Condition.** The pack is complete when a future executor can make proposal outputs
> trustworthy enough for real client review.

## Scope (in)

**Trust mechanics for issued proposal deliverables**, across both existing surfaces:

1. **Export package states** — define the lifecycle states an issued deliverable moves through
   (draft/preview → issued → superseded → revoked/expired) and which are immutable.
2. **Immutability & versioning** — append-only retention of issued deliverables; republish/rotate
   preserves prior versions; monotonic version per project+surface.
3. **Checksum / audit trail** — SHA-256 content hash of deliverable bytes; persistent D1 audit of
   generation + download + republish + revoke.
4. **Source / staleness indicators** — as-of timestamp, source estimate revision id, "days behind"
   surfaced to **both** managers and recipients; XLSX title block / docProps provenance.
5. **Internal-field redaction** — broaden the client XLSX redaction gate (cost-split columns,
   workspace-name-as-contractor fallback, Commercial-Terms boilerplate); byte-level leak proof.
6. **PDF / XLSX decision points** — explicit decision on format(s); PDF deferred unless owner
   approves renderer/licensing; XLSX + JSON snapshot are trust-bearing now.
7. **Large-file streaming** — `ReadableStream` for mid-size; Queue-backed background generation for
   large-size; replace all-or-nothing 413 with a resumable/async path.
8. **Tests** — checksum, immutability, staleness, redaction byte-scan, streaming ceiling, recipient
   content-binding.
9. **Recipient proof** — view/open + accept/decline records the content hash acted against, so
   approval is bound to *what* was approved, not only the version integer.

## Scope (out / non-goals)

- **Publication UX redesign.** The Publisher drawer, `/share/[token]` dashboard, sheet picker, and
  recipient email flows keep their current shape. Linked pack only. (DEC-LINK-1)
- **Qualified electronic signature / PKI.** We add content binding (SHA-256), not a legally
  binding e-signature. `signature_intent_hash` remains an intent attestation. (DEC-SIG-1)
- **PDF generation engine** (renderer, fonts, licensing) — `BLOCKED-EXTERNAL`. The plan defines the
  *contract* a PDF would satisfy and the integration point, but does not select a renderer.
- **New collaboration/realtime** (Durable Object changes) for the export path.
- **Supabase/Vercel/Resend** re-activation or legacy migration archaeology beyond citing precedents.
- **Cost-library / component-library** versioning (already has its own `*_history`/`*_versions`).
- **Workshop estimating workflow** changes (the editable tree, row mutations) — only the
  *deliverable* that comes out of it.

## Assumptions (ASSUMP-*)

- ASSUMP-1: Cloudflare D1 free-tier limits remain the cost posture (no paid D1/R2 add-ons without
  owner approval — `AGENTS.md`). The design must work within bundled limits; R2 object storage for
  large artifacts is acceptable only because R2 has a generous free tier and the standing mandate
  covers `ARCH_UPLOADS_R2`.
- ASSUMP-2: The existing `UPLOAD_JOBS_QUEUE` (`UPLOAD_JOBS_QUEUE` binding, DLQ configured) can host
  a new `proposal_export` job kind without a new queue binding. To be confirmed by executor via
  `wrangler.jsonc` + the queue consumer.
- ASSUMP-3: SHA-256 via Web Crypto (`crypto.subtle.digest`) is available in the Worker runtime
  (standard). No native module needed.
- ASSUMP-4: The current `maxDuration = 60` for the export route is the Workers limit; background
  Queue jobs have their own limits (confirm in implementation).
- ASSUMP-5: Recipients today do not download an XLSX (only view JSON snapshot). Extending an XLSX
  download to recipients is an **optional** slice, explicitly gated (DEC-RECV-1), not required for
  the core trust ledger.

## Constraints

- **Planning only.** No code/test/migration/config changes by this task.
- **Cloudflare-first.** Active runtime = Workers/OpenNext + D1 + R2 + Queues/Cron + Email. No hybrid
  default.
- **Shared worktree.** No auto-branch/worktree. Future executor coordinates by file-scope ownership.
- **Provider boundary.** Only resources bound in `wrangler.jsonc` (`ARCH_DB`, `ARCH_UPLOADS_R2`,
  `COLLAB_ROOMS`, `UPLOAD_JOBS_QUEUE`, `EMAIL`, `IMAGES`). Never the historical Supabase project.
- **Free-tier cost posture.** No paid add-ons without owner approval.

## Success metrics (planning-level)

- A future executor can implement Phases 1–5 without rediscovering requirements, architecture,
  affected files, failure modes, or validation.
- Every requirement has a stable ID, objective acceptance criteria, a validation method, and test
  coverage mapping.
- The trust ledger (package table), checksum, staleness, redaction, and streaming slices each have
  exact repo-relative paths/symbols or explicit blockers.
- Adversarial scenarios (tampering, stale-action, redaction leak, oversized export, replay) are
  enumerated with expected signals.

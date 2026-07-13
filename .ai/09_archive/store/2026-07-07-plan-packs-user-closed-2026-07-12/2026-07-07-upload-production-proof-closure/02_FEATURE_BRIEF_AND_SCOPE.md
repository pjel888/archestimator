# 02 — Feature Brief and Scope

## Source brief

From `PROMPT.md` (authoritative for this pack):

> Create a closure plan for upload production proof: deployment readback, hosted
> upload operations, live scanner proof, alerts, dashboard evidence, backpressure,
> and retention runbook.
>
> Define every missing proof artifact, expected command/operator input, evidence
> schema, failure interpretation, remediation sequence, and launch gate
> integration.
>
> Do not fake hosted proof. Keep file contents and secrets out of evidence.
> Separate upload architecture changes from proof-closure requirements.

Suite directives in force: `Creating-Plan-Prompt.md` (planning package authoring)
and `Multi-Agent-Execution-Directive.md` (verification mode, evidence classes).

## In scope

1. **The 8-gate bundle** defined by `scripts/check-upload-production-proof-evidence.ts`:
   `deploymentReadback`, `hostedUploadOperations`, `hostedUploadRuntime`,
   `liveScanner`, `alertDelivery`, `dashboardObservation`, `hostedBackpressure`,
   `retentionRunbook`. Each gets a full requirement record in
   `04_REQUIREMENTS_SPECIFICATION.md`.
2. **The producer scripts** that generate or validate each artifact:
   `prove-upload-clamd-live.ts`, `verify-hosted-upload-operations.ts`,
   `verify-hosted-upload-runtime.ts`, `verify-upload-alert-delivery.ts`,
   `verify-upload-production-observations.ts` (dashboard/backpressure/retention),
   `verify-cloudflare-hosted-upload-lifecycle-proof.ts`,
   `verify-cloudflare-hosted-upload-ui-proof.ts`, and the bundle gate itself.
3. **The evidence directory hazard (H1)** — the default-path vs on-disk-location
   drift — specified as an operator-level override convention with a forward
   code-fix note.
4. **The missing-wiring hazard (H2)** — the two closure scripts absent from
   `package.json` — specified as an invocation convention with a forward code-fix
   note.
5. **The filename/boundary naming drift (H3)** — documented so reviewers are not
   misled by `-fail-closed-proof.json` carrying passing content.
6. **Launch-gate integration** — how the bundle result feeds
   `upload-release-gates.json` and `cf:release-gates`.
7. **The no-secrets/no-paths sanitizer contract** — restated per artifact so an
   executor can audit each artifact before it is committed.

## Out of scope (explicitly)

1. **Upload architecture changes.** Multipart/resumable, image processing,
   memory budgets, and storage-path hardening belong to
   `2026-07-07-r2-upload-memory-multipart-and-image-readiness/` and the parent
   `000-Follow Ups/2026-06-26-File-Upload-Audit-And-Improvement/`. This pack
   *reads* those architectures only to define what each proof must demonstrate.
2. **Enabling production uploads.** Proof closure proves the operations surface;
   it does not turn uploads on. That is a separate owner decision.
3. **The act of collecting hosted/live proof.** This is a *planning* pack. The
   actual collection (Phase 1–3 execution) is operator work on a hosted/live
   environment with real secrets, performed after this pack is approved.
4. **Code changes to scripts, `package.json`, or `wrangler.jsonc`.** Forward
   code-fix recommendations are recorded in
   `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` as explicitly future work.
5. **General (non-upload) observability, retention, or provider-exit closure.**
   Those have their own sibling packs (`2026-07-07-observability-alert-proof-and-log-retention/`,
   `2026-07-07-retention-and-dsar-data-lifecycle/`,
   `2026-07-07-provider-exit-final-proof-closure/`). This pack references them
   only where the upload proof depends on their surfaces (alert webhook, cron).
6. **Provider-exit / Supabase archaeology.** Not relevant to upload proof
   closure; the active runtime is Cloudflare-only per `wrangler.jsonc`.

## Success metrics

| Metric | Target | Source |
|---|---|---|
| Bundle gate `passed` | `true` | `upload-production-proof-evidence-check.json` |
| Bundle gate `productionProofReady` | `true` | same |
| Gates passed | 8/8 | `totals.passed === totals.required` |
| Artifacts with hosted/live `proofBoundary` | 8/8 | per-artifact schema check |
| Artifacts leaking secrets/paths/customer data | 0 | sanitizer self-check fields |
| Documented command for each artifact | 8/8 | RTM in `16_REQUIREMENTS_TRACEABILITY_MATRIX.md` |
| Operational hazards with operator-safe fix | 3/3 (H1, H2, H3) | Phase 0 |

## Failure metrics (what would re-open this pack)

- Any artifact passes via a local/preview/fixture origin.
- Any artifact contains a URL, storage path, filename, signed URL, token, or
  customer/project data (sanitizer self-check fails).
- The bundle passes only because of the filename fallback (i.e., the
  non-fail-closed filename was never produced).
- A producer script's strict schema check is relaxed to make an artifact pass.
- A new upload route/cron/binding is added that the bundle does not cover.

## Stakeholders

- **Owner:** Philip Lewis (sign-off on bundle result and on any code-fix forward
  work).
- **Executor:** the operator who runs the Phase 1–3 commands on the hosted/live
  environment with the required secrets.
- **Reviewer:** independent reviewer (required to lift `CONDITIONALLY READY` →
  `IMPLEMENTATION-READY` per the suite verification-mode cap).

## Constraints

- Planning-only: no source/test/migration/config/infra edits from this stage.
- Cloudflare-resource boundary: stay inside `wrangler.jsonc`-bound resources
  (`ARCH_UPLOADS_R2`, `ARCH_DB`, `UPLOAD_JOBS_QUEUE`, `IMAGES`, `EMAIL`). The
  historical Supabase project is out of scope.
- Cost posture: free-tier only; no proof action may enable a paid add-on.
- No-fake-proof: fail-closed is the correct state until real evidence exists.

## Assumptions (validated where possible)

- `ASSUMP-001`: The bundle gate's 8 requirement keys and `candidates` filenames
  are stable. *Validated by direct read of
  `scripts/check-upload-production-proof-evidence.ts`.*
- `ASSUMP-002`: The hosted upload proof routes are deployed and aliased
  (deployment readback already passes). *Validated by the committed
  `upload-hosted-deployment-readback.json`.*
- `ASSUMP-003`: The two untwired scripts work when invoked directly via
  `bun run scripts/<name>.ts`. *Validated by their `if (import.meta.main)`
  entrypoints; not re-executed in this planning stage.*
- `ASSUMP-004` (unvalidated, external): A ClamD-compatible scanner service is
  reachable from the collection environment for the live scanner gate. *Flagged
  as a Phase 2 prerequisite; if unavailable, that gate stays fail-closed and the
  bundle cannot close.*
- `ASSUMP-005` (unvalidated, external): An HTTPS alert webhook endpoint with a
  bearer token is configured for the alert delivery gate. *Same handling.*

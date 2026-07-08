# 06 — Architecture and Technical Design

> This pack changes no runtime architecture. This document defines the
> **evidence-pipeline architecture** — how artifacts are produced, validated,
> and gated.

## Current-state architecture (evidence pipeline)

```
┌───────────────────────────── Hosted / live environment ─────────────────────────────┐
│                                                                                      │
│  Producer scripts (bun run scripts/*.ts)                                             │
│   ├── prove-upload-clamd-live.ts          ──► clean/EICAR via real ClamD             │
│   ├── verify-hosted-upload-operations.ts  ──► /api/internal/upload-{cleanup,scan}    │
│   ├── verify-hosted-upload-runtime.ts     ──► /api/internal/upload-runtime           │
│   ├── verify-upload-alert-delivery.ts     ──► UPLOAD_OPERATIONS_ALERT_WEBHOOK_URL    │
│   └── verify-upload-production-observations.ts ──► operator JSON → 3 artifacts       │
│                                                                                      │
│  Each writes a sanitized JSON artifact with { mode, proofBoundary, passed, ... }     │
│                                                                                      │
└───────────────────────────────────┬──────────────────────────────────────────────────┘
                                    │  (real evidence dir, with override — Phase 0)
                                    ▼
              scripts/check-upload-production-proof-evidence.ts  (bundle gate)
                                    │  strict per-requirement schema validation
                                    ▼
              upload-production-proof-evidence-check.json
                { passed, productionProofReady, totals, requirements[] }
                                    │
                                    ▼
              feeds upload-release-gates.json + cf:release-gates
```

## Target-state architecture

Same as current-state — the pipeline is already correctly designed. The *target*
is to populate it with hosted/live artifacts instead of fail-closed ones, and to
remove the two operational hazards. No new component is introduced.

## Component boundaries

- **Producer scripts** own: invoking the hosted/live surface, sanitizing output,
  writing one artifact per gate (the observations producer writes three).
- **Bundle gate** owns: cross-artifact schema validation and the single
  `productionProofReady` verdict. It never collects evidence and never reads
  secrets.
- **Release-gate integration** owns: surfacing the verdict as a launch blocker.
- **This plan pack** owns: documenting every contract so an executor can drive
  the pipeline without rediscovery.

## Shared contracts

- **`proofBoundary` vocabulary** (the load-bearing contract). Each artifact must
  carry one of these exact strings to pass:
  - `read-only-vercel-deployment-inspection`
  - `hosted-authenticated-dry-run`
  - `hosted-runtime-authenticated-dry-run`
  - `live-clamd-scanner-service-proof`
  - `hosted-alert-delivery-observation`
  - `hosted-dashboard-observation`
  - `hosted-backpressure-observation`
  - `production-retention-runbook-exercise`
- **Opt-in regime vocabulary.** Three regimes, each with a distinct safety shape:
  - *Hard opt-in flag* (`*_PROOF=1`): producer refuses to act without it; writes
    a `skipped` artifact otherwise. Used by live-scanner, alert-delivery, and
    the three observation producers.
  - *Secret-gated*: producer always runs fail-closed probes; escalates to
    authenticated dry-run only if the secret env is present. Used by hosted
    operations and hosted runtime.
  - *No opt-in, local-only*: runs on invoke. Used by the bundle gate and the
    local runbook drill (not part of the 8).
- **Sanitizer contract.** Two independent sanitizers:
  - `verify-upload-production-observations.ts` `pathSafeInput`: rejects
    `storage_path`, `filename`, `component-attachments/`, `component-images/`,
    `project-images/`, `private/`, `signed_url`, `access_token`, `bearer `,
    `supabase.co/storage`, any `https?://`.
  - `verify-upload-alert-delivery.ts` `secretRedacted`/`payloadPathSafe`:
    asserts the recorded artifact does not contain the raw token or storage path.

## Failure boundaries

- A producer failure must not corrupt other artifacts (each writes its own file).
- The bundle gate never writes to the artifacts it reads (read-only validation).
- A fail-closed/skipped artifact is a *valid* artifact (it records that evidence
  is absent); it is not an error. The bundle gate treats it as `failed` for
  closure purposes, which is correct.

## Integration points (read-only proof)

- Internal routes: `/api/internal/upload-{cleanup,scan,runtime,lifecycle-proof}`.
- Alert webhook: external HTTPS endpoint.
- Dashboard: `src/app/workshop/settings/upload-operations/page.tsx`.
- Bundle → release gates: `upload-release-gates.json` consumed by
  `scripts/check-cloudflare-release-gates.ts` (`cf:release-gates`).

## Architectural decisions (summary; full records in `15`)

- **DEC-001:** Keep the bundle gate as the single source of truth (do not add a
  parallel Cloudflare-`readiness`-style gate for upload). Rejected alternative:
  re-wire the newer `readiness`/`blockers` Cloudflare scripts into the bundle —
  out of scope, and would mix conventions.
- **DEC-002:** Forward code-fix = repoint the producer script defaults to the
  real evidence dir (or make the dir an explicit required arg). Out of scope for
  this planning-only pack; tracked for future implementation.
- **DEC-003:** Forward code-fix = add the two missing `package.json` aliases
  (e.g. `cf:upload-proof-bundle`, `cf:upload-production-observations`). Out of
  scope here; tracked for future implementation.
- **DEC-004:** Keep the `candidates` filename fallback in the bundle gate. It is
  intentional and content-validated. Document it (H3) rather than remove it.

## Diagrams

The two ASCII diagrams above (current-state pipeline; see also `01` target-state)
are the only diagrams needed. No data-flow, state-machine, or deployment
diagrams add clarity beyond what `03` and `07` already tabulate.

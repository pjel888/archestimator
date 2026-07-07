# 07 — Data, Database, API, and Network Plan

This plan does **not** change any D1 schema, migration, repository, app-
authorization path, R2 policy, DO state, Queue config, or network contract.
This document defines the **data decision framework** for the Supabase
export/retention/loss choice and documents the operator-record schema the
closure consumes.

## 7.1 No schema change (proof)

- Active D1: 39 migrations (`0001`–`0039`), latest `0039_project_status.sql`.
  This plan adds none.
- No `ALTER`, `CREATE`, `DROP`, or backfill is proposed.
- No repository, app-authz function, or R2/DO/Queue change.
- Therefore no Database Change Blueprint is required (directive §8A: "Never
  plan a database change without a rollback..." — there is no database change).

## 7.2 Data ownership (unchanged)

| Data class | Owner | Change? |
|---|---|---|
| App/auth/relational data | D1 `ARCH_DB` | none |
| Objects/uploads | R2 `ARCH_UPLOADS_R2` | none |
| Realtime room state | DO `COLLAB_ROOMS` | none |
| Background jobs | Queue `UPLOAD_JOBS_QUEUE` | none |
| Historical Supabase data | Supabase `ebxxqidacheyapmmzavr` (legacy) | none (decision only) |

## 7.3 What the Supabase export/retention/loss decision governs

The decision governs the **posture of historical Supabase data** (project
`ebxxqidacheyapmmzavr`) for rollback and retention purposes. It does **not**
govern any active runtime data (which is entirely in Cloudflare). The decision
is recorded in operator-record section `finalExportsOrRetentionDecision`.

## 7.4 The three permissible decisions (data-loss acceptance rule)

Per generator enum (lines 212-239), `decision ∈ {exported, accepted-retention,
accepted-loss}`:

### `exported`
- **Means**: A logical export of the relevant Supabase data has been created
  and stored **outside the repo** (per sanitization boundary), and its
  existence is attested by the operator.
- **Requires**: `backupLocationDescription` (non-empty, sanitized — no private
  path), `acceptedBy`, `evidenceSource`, `rollbackDecision`.
- **Rollback posture**: rollback window preserved. If a future critical
  Cloudflare-side data loss occurred, the export is the fallback.
- **Data-loss claim**: none — data is preserved externally.

### `accepted-retention`
- **Means**: The owner accepts keeping the Supabase project as a **read-only
  rollback/retention surface** for the foreseeable future. No export is made;
  Supabase is not cancelled/deleted/downgraded.
- **Requires**: `acceptedBy`, `evidenceSource`, `rollbackDecision`.
  (`backupLocationDescription` not required.)
- **Rollback posture**: Supabase remains the rollback surface. This is the
  most conservative option.
- **Data-loss claim**: none — Supabase still holds the data.

### `accepted-loss`
- **Means**: The owner explicitly accepts that the historical Supabase data is
  not needed for rollback or retention, and no export is required.
- **Data-loss acceptance rule (DEC-PE-03)** — `accepted-loss` is permissible
  **only when ALL of**:
  1. The owner (`acceptedBy`) explicitly accepts the risk.
  2. Cloudflare is **proven** to be the sole active runtime for the affected
     data (proven by: 0 Supabase refs in `src/`, D1 is the active schema, auth
     is D1-backed — see `03_…` §3.5, §3.6).
  3. Either an export was attempted (and the attempt is recorded) **or** the
     data is provably redundant (e.g., it was one-shot backfill source data
     already applied to D1 and tracked in `supabase/migration-evidence/`).
- **Requires**: `acceptedBy`, `evidenceSource` (must cite the proof of sole-
  runtime + export-attempt/redundancy), `rollbackDecision`.
- **Rollback posture**: **no rollback**. This is the highest-risk option and
  must be recorded with explicit owner acceptance.
- **Data-loss claim**: the plan permits the owner to accept loss, but the
  generator's `accepted-loss` value is *attestation-only* — the data-loss rule
  above is this plan's guardrail on top of the generator, because the
  generator does not independently verify sole-runtime or export-attempt.

### Recommendation for OPEN-PE-01
- **Recommended**: `accepted-retention` (keep Supabase as read-only rollback
  surface) — cheapest, lowest-risk, no data-loss exposure, preserves rollback.
- **Alternative**: `exported` if the owner wants to eventually cancel Supabase
  but preserve data — slightly more work (create + verify export), preserves
  rollback window.
- **Not recommended**: `accepted-loss` unless the owner has positively
  confirmed the historical data is redundant (it is migration source data
  already backfilled into D1). If chosen, the sole-runtime + redundancy proof
  must be cited in `evidenceSource`.

## 7.5 Provider-exit closure checklist (12 gates → FR-PE-01)

| # | Gate | Current | Closure path | Evidence class | Operator-record section / fields |
|---|---|---|---|---|---|
| 1 | release-gates-green | PASS | keep green; re-run `cf:release-gates` if stale | local-automated | (reads artifact) |
| 2 | provider-resources-readable | PASS | keep green; re-run `cf:check-provider-resources` | local-automated | (reads artifact) |
| 3 | cloudflare-email-ready | PASS | keep green; re-run `cf:check-email` | local-automated | (reads artifact) |
| 4 | hosted-auth-matrix-ready | PASS | keep green; re-run auth-matrix script | local-automated | (reads artifact) |
| 5 | no-active-legacy-provider-runtime | PASS | `rg` source scan stays 0 blockers | local-automated | (source scan) |
| 6 | latest-deploy-source-smoke-ready | PASS | keep green; re-run `cf:check-latest-deploy-source-smoke` | local-automated | (reads artifact) |
| 7 | exports-or-retention-decision-recorded | **OPEN** | owner decides (§7.4); fill section | owner-decision + operator-attestation | `finalExportsOrRetentionDecision`: status=recorded, decision, acceptedBy, evidenceSource, rollbackDecision, (backupLocationDescription if exported) |
| 8 | resend-account-status-recorded | PASS | already recorded | operator-attestation | `resendStatus` (recorded) |
| 9 | obsolete-secret-rotation-recorded | PASS | already recorded | operator-attestation | `obsoleteSecretRotation` (recorded) |
| 10 | post-exit-smoke-recorded | **OPEN** | run smoke (§13.3) after OPEN-PE-01; fill section | hosted-provider-backed (smoke run) + operator-attestation | `postExitSmoke`: status=recorded, cloudflareSmokePassed=true, runAt, commands[], evidenceSource |
| 11 | non-owner-google-proof-recorded | **OPEN** | real persona journey OR owner deferral | hosted-provider-backed (journey) OR owner-deferral | `nonOwnerGoogleProof`: status=recorded\|accepted-deferral, policyOutcome, evidenceSource, noCredentialsOrCookiesRecorded=true (recorded) OR acceptedBy+deferralRationale (deferral) |
| 12 | recipient-mailbox-proof-or-deferral-recorded | **OPEN** | real mailbox receipt OR owner deferral | hosted-provider-backed (receipt) OR owner-deferral | `recipientMailboxProofOrDeferral`: status=recorded\|accepted-deferral, mailboxReceiptObserved=true, recipientScopedActionObserved=true, noPrivateEmailContentRecorded=true, evidenceSource (recorded) OR acceptedBy+deferralRationale (deferral) |

Closure = all 12 PASS. `providerExitReady=true` is the single derived signal.

## 7.6 Operator-record schema (sanitized) — FR-PE-05

Boundary (verbatim from generator line 560):
> "Sanitized operator record only. Do not record secrets, tokens, cookies,
> raw mailbox content, provider screenshots with private values, private
> backup paths, or credential material."

6 sections, each `status ∈ {missing, recorded, accepted-deferral}`:

1. **`finalExportsOrRetentionDecision`** — `status`, `decision`
   (`exported`|`accepted-retention`|`accepted-loss`), `acceptedBy`,
   `evidenceSource`, `rollbackDecision`, `backupLocationDescription`
   (required iff `decision=exported`).
2. **`resendStatus`** — `status`, `accountPlanStatus`, `accountEvidenceSource`,
   `apiKeyStatus`, `apiKeyEvidenceSource`, `sendingDomainStatus`,
   `domainEvidenceSource`. *(currently recorded)*
3. **`obsoleteSecretRotation`** — `status`, `cloudflareSecretNamesReviewed`
   (bool), `obsoleteProviderSecretsRemovedOrRotated` (bool),
   `secretValuesNotRecorded` (bool), `evidenceSource`. *(currently recorded)*
4. **`postExitSmoke`** — `status`, `cloudflareSmokePassed` (bool), `runAt`
   (string), `commands` (non-empty string[]), `evidenceSource`.
5. **`nonOwnerGoogleProof`** — `status`; if `recorded`: `policyOutcome`,
   `evidenceSource`, `noCredentialsOrCookiesRecorded=true`; if
   `accepted-deferral`: `acceptedBy`, `deferralRationale`.
6. **`recipientMailboxProofOrDeferral`** — `status`; if `recorded`:
   `mailboxReceiptObserved=true`, `recipientScopedActionObserved=true`,
   `noPrivateEmailContentRecorded=true`, `evidenceSource`; if
   `accepted-deferral`: `acceptedBy`, `deferralRationale`.

The generator's diagnostics echo **only missing field names**, never operator
values (lines 952-955).

## 7.7 API / network (unchanged)

No API contract, route handler, Server Action, DTO, or network behavior
changes. Closure is CLI + JSON file based. The only network activity is the
read-only smoke (route probes / wrangler readback against authorized
Cloudflare resources only).

## 7.8 Access-path matrix (closure inputs)

| Source | Chosen path | Runtime role | Authorization | Posture | Proof | Fallback |
|---|---|---|---|---|---|---|
| Repo source | `rg` scan | read | local | active | source scan | n/a |
| D1 `ARCH_DB` | wrangler readback | read | wrangler auth | active | `cf:check-provider-resources` | re-auth |
| R2 `ARCH_UPLOADS_R2` | wrangler readback | read | wrangler auth | active | `cf:check-provider-resources` | re-auth |
| 5 JSON artifacts | file read | read | local | active | file exists | regenerate via `cf:*` script |
| Operator record | file read/write | operator | local file | active | generator diagnostics | `cf:provider-exit-operator-template` |
| Supabase `ebxxqidacheyapmmzavr` | **none (no mutation)** | n/a | out of bounds | legacy | operator attestation only | owner decision |

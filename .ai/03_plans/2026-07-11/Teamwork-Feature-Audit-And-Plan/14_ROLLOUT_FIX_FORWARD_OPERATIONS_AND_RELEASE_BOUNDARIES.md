# Rollout, Fix-Forward, Operations, and Release Boundaries

## Rollout Phases

1. **Policy and baseline:** reconcile tests, land canonical capability policy behind existing behavior, prove parity.
2. **Data invariants:** allocate/apply local D1 migration, repair duplicates/floors, prove concurrent/failure behavior.
3. **Mutation lifecycle:** replace hidden invite/direct-grant semantics with explicit commands and atomic facts.
4. **Repository isolation:** deploy scoped queries/DTOs before exposing new management UI.
5. **Team access UI:** launch project and estimate management behind a Teamwork feature flag.
6. **Realtime hardening:** introduce protocol version/capability enforcement and upgraded client with compatibility window.
7. **Estimate cursor support:** enable hardened cursor path for editors; viewers receive only.
8. **Cross-pack integration:** Activity and Publisher receipts.
9. **Hosted version preparation:** after `AUTH-001`, upload the exact source version, verify bindings/compatibility, and use a 0%-traffic deployment plus version override for HTTP/D1 proof where supported.
10. **Hosted Durable Object evidence:** after explicit nonzero-canary or cutover authorization, run the two-client DO/browser rehearsal against the exact version.
11. **Release evaluation:** existing observability/support/cutover gates decide production readiness.

## Feature Controls

Use clearly named controls with honest semantics:

- Team access management UI enablement;
- invitation command-v2 enablement;
- realtime protocol-v2 enablement;
- estimate cursors enablement;
- project presence enablement;
- project cursors remain disabled.

If a flag is build/deploy-time, name and document it that way. A runtime kill switch must use a runtime-readable source. Do not claim deploy-independent control for `process.env` values bundled at build time.

## Compatibility

- Server may accept protocol v1 during a bounded v2 rollout only if v1 cannot bypass new capability checks. Otherwise cut over atomically and close v1.
- DTO changes are versioned or dual-read until Publisher receipt passes.
- Activity producer writes only the approved versioned event envelope.
- Invite links created before migration have a deterministic acceptance/reissue policy; no silent invalidation without manager-facing state.

## D1 Migration Operations

- Preflight duplicates and manager-floor violations locally and against the bound D1 only under the existing standing authorization and explicit execution unit.
- Back up/rehearse restore according to repo scripts.
- Apply additive constraints/indexes and required backfill.
- Verify row counts/invariants without logging sensitive rows.
- Fix forward; do not use destructive history or Supabase migrations.

## Rollback and Fix-Forward

| Failure | Immediate action | Forward repair |
| --- | --- | --- |
| UI capability mismatch | disable management UI flag | repair policy/DTO parity |
| invite command errors | disable v2 creation, preserve resolution if safe | fix command/idempotency; do not delete audit facts |
| migration invariant failure | stop before remote apply | repair data/preflight and allocate forward migration if applied |
| Activity consumer mismatch | keep producer adapter local/flagged | update receipt/schema compatibility |
| Publisher incompatibility | retain compatibility adapter | migrate callers and reissue receipt |
| DO auth/schema regression | disable realtime v2/cursors | fix protocol/server/client together |
| fanout/cost spike | cap rooms/rates; disable cursor flag | tune budgets/multiplexer |
| hosted proof error | keep release status not ready | reproduce, fix, rerun exact proof |

## Operational Readiness

Before any release claim:

- structured error-handling gate passes;
- feature-specific metrics and dashboards/queries exist;
- invite delivery/acceptance and realtime auth/reconnect failure codes are operator-visible;
- incident runbook maps stable codes to actions;
- D1 restore rehearsal is current;
- hosted proof artifacts are current and expected-producer versions match;
- `launch:check-support-monitoring` and release gates are evaluated with required artifacts/operator confirmations.

## Release Boundaries

This pack's action ceiling is `EXTERNAL_ACTIONS` because its outer DAG includes scoped hosted D1 and Durable Object proof. The field records intended reach and does not itself authorize any action. This planning run remains `PLAN_ONLY`. `AUTH-001` blocks `UNIT-016` through `UNIT-019`; the plan does not authorize:

- uploading or deploying a production Worker version;
- changing production traffic percentages, including a nonzero Durable Object canary;
- production deployment/cutover;
- paid Cloudflare add-ons;
- unrelated provider/account changes;
- branch/worktree creation, pushing, or history rewriting;
- owner-transfer behavior not specified here.

The repo provides standing authorization for scoped Cloudflare resources, but a production Worker version/deployment or traffic allocation is a distinct release side effect and requires the explicit `AUTH-001` packet. This boundary does not block the independent local slice (`UNIT-001` through `UNIT-008`, plus `UNIT-010` through `UNIT-013`); the separate overlap-manifest blockers still govern `UNIT-009`, `UNIT-014`, and `UNIT-015`.

## Source-Matched Hosted Proof Strategy

Official Cloudflare documentation establishes the deployment constraint:

- `wrangler versions upload` creates a version containing code, assets, bindings, and settings.
- Preview URLs are unavailable for Workers that implement Durable Objects.
- A version override can target a new version only after that version belongs to the current deployment; a 0%-traffic version can therefore support controlled HTTP/D1 proof without general routing.
- Durable Object instances are assigned a Worker version according to deployment percentages. A new version at 0% cannot prove its new DO code; that proof needs an explicitly authorized nonzero canary or full cutover.

Sources reviewed 2026-07-11:

- `https://developers.cloudflare.com/workers/versions-and-deployments/`
- `https://developers.cloudflare.com/workers/versions-and-deployments/preview-urls/`
- `https://developers.cloudflare.com/workers/versions-and-deployments/version-overrides/`
- `https://developers.cloudflare.com/workers/versions-and-deployments/gradual-deployments/with-durable-objects/`

The authorization packet must identify the current deployment, proposed version ID, traffic percentage or cutover, source/config metadata, DO compatibility/migration state, feature flags, monitoring, maximum canary window, rollback, cleanup, and bound D1 migration state. Hosted receipts must prove the exact routed version rather than infer it from a local commit.

## Release Verdict Rules

- Local green + hosted missing: implementation may be complete locally; release remains `NOT_EVALUATED` or `NOT_READY`.
- Hosted feature proof green + observability/support missing: release remains not ready.
- Paid Workers for Platforms and per-tenant D1/R2/custom-hostname partitioning not adopted: no boundary because they are not required.
- All units verified + receipts current + release gates green: separately elevate release status and archive readiness.

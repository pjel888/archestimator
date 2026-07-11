# 2026-07-11 Planning Audit Evidence

## Scope

Read-only/codebase-planning evidence for `PLAN-2026-07-11-teamwork-feature-audit-and-plan`. No application, test, migration, configuration, branch, worktree, provider, or existing plan file was changed during the audit.

## Environment

- Working directory: `/Users/philiplewis/Documents/archestimator`
- Source revision: `e373bc865b978e237deb1d92011c96b0a3639fb4`
- Run scope: `PLAN_ONLY`
- Shared worktree: dirty before this pack; scoped status/diff are frozen in the source audit.
- Supermemory preflight: `bun run supermemory:ensure` passed at `http://localhost:6767`.

## Planning Contract Evidence

- All ten documents in `.ai/08_prompts/000_Planning Prompts/` were reviewed.
- Planning-prompt evaluation suite: PASS, 10 documents, 10 gates, 31 scenarios.
- Initial overlap audit: Publisher PASS; Activity FAIL on three artifact hashes. This is preserved as historical planning evidence.
- Final targeted re-audit after independent-verifier drift detection: Activity FAIL on five stale artifact hashes and Publisher FAIL on eight stale artifact hashes. Their source trees had stopped changing, so the failures were recorded as execution-time owner-refresh dependencies rather than silently rewritten by this pack.
- **Improve-pass re-audit (2026-07-11):** both overlap owners have since refreshed their manifests. `bun run validate:plan-pack` now **passes** for both `.ai/03_plans/2026-07-10/Activity-History-Mapping` and `.../Publisher-And-Shared-Pages`. The previously-recorded hash mismatches are resolved. However, both packs remain `CONDITIONALLY_READY` / `NOT_STARTED`, and the Teamwork consumer receipts (`TEAMWORK-ACTIVITY-CONTRACT-v1`, `TEAMWORK-PUBLISHER-ACCESS-v1`) do not yet exist; `UNIT-009`/`UNIT-014`/`UNIT-015` remain blocked on those receipts, not on manifest staleness.
- Activity mismatch receipt: `README.md`, `11_IMPLEMENTATION_PLAN.md`, `12_COORDINATION_AND_MULTI_AGENT.md`, `LOOP_LEDGER.md`, and `15_PERFORMANCE_AND_QUERY_AUDIT.md`.
- Publisher mismatch receipt: `IMPLEMENTATION_PLAN.md`, `04_REQUIREMENTS_SPECIFICATION.md`, `07_DATA_DATABASE_API_NETWORK_PLAN.md`, `08_SECURITY_PRIVACY_THREAT_MODEL.md`, `10_BLAST_RADIUS_AND_DEPENDENCIES.md`, `11_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md`, `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md`, and `LOOP_LEDGER.md`.
- The Teamwork profile is `high-blast-radius` because scope spans authorization, D1, invitations, Durable Objects, realtime clients, UI, security, performance, operations, and cross-pack contracts.

## Focused Runtime Evidence

Lead focused collaboration run:

- 16 test files;
- 14 passed, 2 failed;
- 85 of 87 tests passed;
- failures are a stale source-string role assertion and a fake-D1 batched-query fixture mismatch.

Focused repository authorization follow-up:

- 3 files passed;
- 30 tests passed.

Independent realtime audit:

- 11 focused Vitest files passed;
- 61 tests passed;
- no browser rerun; existing hosted evidence was inspected and classified stale/insufficient for the new contract.

Independent RBAC/invitation audit:

- a narrower 14-file focused run reported 86 of 87 passing, with the same fake-D1 sheet-only fixture failure;
- source/schema/runtime proof gaps were mapped with exact anchors.

These results are known-red planning inputs, not implementation completion evidence.

## Highest-Confidence Findings

- Potential restricted-sheet metadata exposure through broad project estimate listing.
- Direct sheet-manager summary/action authorization contradiction.
- Target-dominance, self-action, and invite-driven role-change gaps.
- Missing active-D1 atomic manager-floor and unique-pending-invite invariants.
- Project management and pending-invite UI lifecycle incomplete.
- Invite acceptance/reissue/restriction transaction boundaries incomplete.
- Estimate cursors are production-wired but DO capability, identity, refresh, rate, and client auth-ready contracts are incomplete.
- Project/global presence and row/tree synchronization are not complete product surfaces.
- Active D1 revision conflict string does not match the client stable conflict recognizer.
- Neither overlap manifest was valid at the original planning freeze. Both now pass (refreshed 2026-07-11), but general pack validity does not prove the future Teamwork producer/consumer contracts; exact source-matched receipts remain required.

## Cloudflare Platforms Evidence

Official pages retrieved 2026-07-11:

- `https://www.cloudflare.com/solutions/platforms/`
- `https://developers.cloudflare.com/cloudflare-for-platforms/`
- `https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/get-started/`
- `https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/reference/pricing/`

Conclusion: the broader Platforms portfolio includes tenant isolation, per-tenant D1/R2, custom hostnames, and platform operations; Workers for Platforms targets customer-deployed isolated code/custom domains/bindings/metering and currently introduces a paid-plan dependency. The Teamwork slice requires none of those features. Shared bound D1/R2 with tenant predicates plus the existing Worker, Durable Object, Queue, and Email bindings remain the fit; datastore-per-tenant would add provisioning/migration/backup/analytics/incident/cost complexity without fixing the audited RBAC and atomicity gaps.

## Cloudflare Version and Durable Object Deployment Evidence

Official pages retrieved 2026-07-11:

- `https://developers.cloudflare.com/workers/versions-and-deployments/`
- `https://developers.cloudflare.com/workers/versions-and-deployments/preview-urls/`
- `https://developers.cloudflare.com/workers/versions-and-deployments/version-overrides/`
- `https://developers.cloudflare.com/workers/versions-and-deployments/gradual-deployments/with-durable-objects/`

Verified planning facts:

- `wrangler versions upload` creates a version that captures code, assets, bindings, and settings.
- Preview URLs are unavailable for Workers implementing Durable Objects.
- Version overrides can route a version only after it is included in the current deployment; a 0%-traffic version is suitable for controlled HTTP/D1 proof.
- Durable Objects are assigned Worker versions by deployment percentage. A new version at 0% cannot prove its new DO code, so current-code DO proof requires an owner-authorized nonzero canary or full cutover.

These facts establish `AUTH-001`; no hosted action was taken.

## Graph Evidence

GitNexus index was 53 commits stale. Directional results only:

- `canAccessEstimateInD1`: CRITICAL, 97 impacted, 15 direct, 4 processes.
- `getProjectCollaborationSummary`: HIGH, 6 impacted, 3 direct.
- `assertProjectAccessManager`: MEDIUM, 13 impacted, 6 direct, 1 process.
- `CollaborationRoom`: LOW, 3 direct.

Current source and focused tests override stale graph omissions.

## Evidence Limitations

- No source implementation was performed.
- No browser automation or screenshot proof was run because no browser-only behavior changed.
- No hosted Cloudflare action was performed.
- No production, release, support-monitoring, or observability claim is made.
- Existing hosted July 2 invite/cursor proof remains historical and does not prove the planned hardened behavior.

## Planning Verdict

The source audit, decisions, split local/hosted DAG, risk controls, proof stages, and stop conditions are sufficient for a conditionally ready package. The dependency-closed independent local slice may execute; Activity/Publisher integration units wait for their source-matched consumer receipts against the now-valid overlap manifests, and hosted version/deployment plus DO proof remain behind `AUTH-001`. All product acceptance criteria remain unproven until their planned evidence is collected.

## Improve-Stage Precision Pass (2026-07-11)

A second improve-stage audit re-verified every substantive source claim against the same HEAD (`e373bc865`) using four parallel read-only lanes. Results:

- **HEAD advanced** from the frozen baseline `e373bc865` to `f7421fe9b` due to concurrent agent commits. A targeted drift check confirmed **no Teamwork-relevant source anchor changed** (`roles.ts`, `d1-access.ts`, the collaboration tree, the DO/router/client, the invite routes, and migrations `0007`/`0008`/`0013`/`0030` are byte-identical). The only in-scope changes were additive (`account_status` field, corporate-accounts migrations `0050`-`0052`), affecting no substantive claim. The original fingerprint is preserved as the planning-freeze record; `UNIT-001` recomputes at execution start.
- **Overlap packs now pass:** both Activity and Publisher owners refreshed their manifests; `bun run validate:plan-pack` passes for both. The `UNIT-009`/`UNIT-014` blockers are restated as "missing source-matched consumer receipts against the now-valid manifests," not "stale manifests."
- **All confirmed defects stayed confirmed** (sheet-metadata leak, manager-policy dead-control, target-dominance absence, re-invite role overwrite, missing D1 invariants, non-atomic acceptance, literal-vs-code conflict string, event allow-all, no capability enforcement, no revocation path, client no-ack, no reconnect/refresh, key fallback chain, pending invites unrendered, project actions dead at runtime).
- **Precision repairs applied** (no conclusion changed): exact file:line anchors added to `03`/`04`/`05`/`06`/`07`/`09`; `ceo` platform role added; target-dominance wording corrected from "inconsistent" to "uniformly absent"; display-label gap relocated from DO to client hook; auth-ready split into send-gated vs subscribe-ungated.
- **Three newly stated facts** (all implied before, now explicit with evidence): (1) D1 exposes no transaction API, only `batch` (`src/lib/cloudflare/d1.ts:20-24`); (2) `/workshop/pending-invite/route.ts:70` accepts membership on a GET via the signed cookie bridge; (3) the realtime signing secret falls back through four secrets ending in the invite pepper (`realtime-room-token.ts:4-9`).
- **Repo-doc staleness noted (not Teamwork defects):** `AGENTS.md` states 40 migrations/latest `0040` (actual: 52/latest `0052_corporate_accounts`) and Better Auth `1.6.22` (actual `1.6.23`); `package.json` pins `next@16.2.10`. None affects the plan's substantive claims; `UNIT-003` re-lists migrations at execution time.

No plan conclusion, decision, unit, acceptance criterion, risk, or status-tuple field changed during the improve pass.

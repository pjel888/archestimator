# 02 — Feature Brief & Scope

## Source FEATURE BRIEF (from `PROMPT.md`)

> Create a production-readiness plan pack that turns Archestimator launch readiness into a single evidence gate for first users. The pack should define the minimum go/no-go criteria, required proofs, owner-visible status, and release-blocking failures.
>
> Evidence to start from:
> - `package.json` has many proof scripts, but `validate` is narrower than the launch surface.
> - `.github/workflows/ci.yml` runs build, tests, and advisory performance checks, but legal/provider/support/security gates are not one unified launch gate. *(Corrected by discovery: CI is actually in `.github/workflows-disabled/` — currently not running.)*
> - `scripts/check-cloudflare-release-gates.ts`, `scripts/check-legal-owner-readiness.ts`, `scripts/check-support-monitoring-readiness.ts`, and `scripts/generate-cloudflare-provider-exit-pack.ts`.
> - `.ai/10_state/current-state.md` fast path records open launch, legal, provider-exit, and evidence gaps.
>
> Required plan pack: a launch readiness matrix, hard blockers vs advisory warnings, exact scripts/provider proofs, CI integration options, evidence file locations, rollback criteria, and a staged path from local proof to hosted proof.
>
> Constraints: follow `AGENTS.md`; keep work inside Cloudflare-bound resources; do not mutate historical Supabase projects; do not enable paid Cloudflare features; do not claim provider proof from local-only checks.
>
> Stop condition: the pack is complete when GLM5.2 has created review-ready plan documents that an executor can use to implement the launch gate without re-discovering the production-readiness surface.

## Conflict resolution (brief vs repo reality)

| # | Brief assertion | Repo reality | Resolution |
|---|---|---|---|
| C-01 | "`.github/workflows/ci.yml` runs build, tests, and advisory performance checks" | The file is at `.github/workflows-disabled/ci.yml` — **not running** (GitHub only executes `.github/workflows/`) | Plan treats CI as **disabled** and includes "re-enable CI" as an owner-decision (`OPEN-LG-05`), not as an existing gate. The design must work with or without CI. |
| C-02 | "legal/provider/support/security gates are not one unified launch gate" | Confirmed: no single command runs all gates; `cf:release-gates` aggregates artifacts only | Plan defines the unified gate as the missing piece. |

No other conflicts between brief and repo reality. The brief is treated as **requirements data**, not an override surface (per the feature-planning directive).

## Scope (in)

### What the future launch gate must do
1. **Aggregate** all launch-readiness domains into one canonical status report.
2. **Classify** outcomes as pass / advisory / blocker / skipped / missing-evidence.
3. **Distinguish** hard blockers (release-blocking) from advisory warnings (informational).
4. **Label** evidence by class (local-static / local-automated / browser-manual / provider-backed / hosted-production / inferred).
5. **Enforce freshness** (evidence TTL) so stale artifacts cannot silently pass.
6. **Emit** canonical artifacts: JSON report, Markdown report, stdout summary.
7. **Refuse** to claim provider/hosted/production proof from local-only checks.
8. **Expose** owner-visible status (the canonical report is the single source of truth).
9. **Support** staged execution (`--local`, `--with-provider`, `--with-hosted`, `--strict`).
10. **Define** rollback criteria and the local→hosted proof ladder.
11. **Provide** CI integration options (advisory job → blocking job; branch protection; required check).
12. **Cite** evidence with `file:line` references and producer script pins.

### What this *plan* must define (the deliverables)
- Launch readiness **matrix** (domains × criteria × proof × anchor script × evidence location × class × TTL).
- **Hard blockers vs advisory warnings** taxonomy.
- **Exact scripts** to invoke per domain and their exit semantics.
- **Provider/hosted proofs** to require (and which are owner-gated).
- **CI integration options** (given the disabled-workflows reality).
- **Evidence file locations** (the `.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/` pattern + operator-record template paths).
- **Rollback criteria**.
- **Staged local→hosted proof path**.
- The **unified gate script contract** (inputs, outputs, exit codes, aggregation rules) — as a design.

## Non-goals (out)

- **Implementing** the gate script, CI workflow, or any application/test/migration/config code.
- **Mutating** provider state, runtime data, secrets, DNS, deployments, queues, buckets, auth config.
- **Re-deriving** the deep technical analysis in sibling plan packs (d1 hot paths, durable-object scale, observability design, CSP enforcement, privacy/DSAR workflow, AI-safety leakage, etc.). These are **referenced and aggregated**; their acceptance criteria become inputs to the gate.
- **Enabling paid Cloudflare features** (D1 paid plan, R2 paid tier, Smart Placement, Workers Analytics paid, dedicated egress). Out per `AGENTS.md` cost posture.
- **Providing legal advice or authorizing launch.** The gate surfaces legal-owner proof flags; it does not replace counsel.
- **Claiming hosted/provider/production proof from local checks.** Hard constraint, carried from the directive.
- **Mutating the historical Supabase project** `ebxxqidacheyapmmzavr`, the unrelated `archestimator` provider project, or other Cloudflare accounts/projects.
- **Auto-branching / worktree creation.** Shared live worktree; coordinate by file ownership.
- **Changing the existing anchor scripts' behavior.** The gate reports their verdicts; it does not modify them. (A future implementation may add `--json`/exit-code hooks to anchors that lack them, but that is implementation work, scoped in `11`.)

## Acceptance criteria for the *planning package* (this is what "complete" means for this task)

These are the gates the planning task itself must pass (separate from the future gate's acceptance criteria, which live in `04`/`16`):

| AC-P ID | Criterion | Evidence location |
|---|---|---|
| AC-P-01 | Plan folder created at the exact dated path | This folder |
| AC-P-02 | All `exhaustive` documents present | `README.md` doc list |
| AC-P-03 | Launch readiness matrix defined (domains × criteria × proof × anchor × location × class × TTL) | `06` §matrix |
| AC-P-04 | Hard blockers vs advisory warnings classified | `06` §taxonomy |
| AC-P-05 | Exact scripts/provider proofs named per domain | `03`, `06`, `13` |
| AC-P-06 | CI integration options defined (incl. disabled reality) | `13` §CI |
| AC-P-07 | Evidence file locations documented | `03` §evidence-DAG |
| AC-P-08 | Rollback criteria defined | `13` §rollback |
| AC-P-09 | Staged local→hosted proof ladder defined | `13` §ladder |
| AC-P-10 | Requirements have stable IDs + acceptance criteria + validation | `04`, `16` |
| AC-P-11 | Shadow-path matrix covers the gate's failure modes | `04` §shadow |
| AC-P-12 | No claim of provider/hosted proof from local checks | `06`, `07`, `17` |
| AC-P-13 | No application/test/migration/config code modified | `17` + `git status` |
| AC-P-14 | `README.md` states canonical readiness status | `README.md` |
| AC-P-15 | Final verification records `verification_mode` and applies caps | `17` |

## Stakeholders

- **Owner (Philip Lewis):** go/no-go authority; legal signoff; CI re-enable decision; paid-feature enablement.
- **Counsel / legal reviewer:** legal-owner proof flags (external).
- **Operator / ops:** support-monitoring owner fields; provider-exit operator record; hosted manual smoke.
- **Executor (future implementation agent):** builds the gate from this pack.
- **Reviewer (future):** independent verification of the package (raises status from `CONDITIONALLY READY` to `IMPLEMENTATION-READY` if it passes).

## Constraints (carried from `AGENTS.md` + directive)

- Cloudflare-bound resources only (Worker `archestimator-proof`, D1 `ARCH_DB`, R2 `ARCH_UPLOADS_R2`, DO `COLLAB_ROOMS`, Queue `UPLOAD_JOBS_QUEUE`, Email `EMAIL`, Images `IMAGES`).
- No mutation of historical Supabase / other providers.
- No paid Cloudflare features without explicit owner approval.
- No provider/hosted/production proof from local-only checks.
- Proportional verification; fast iteration bias; no heavyweight ceremony where it does not improve correctness.
- Shared live worktree: no auto-branch/worktree.

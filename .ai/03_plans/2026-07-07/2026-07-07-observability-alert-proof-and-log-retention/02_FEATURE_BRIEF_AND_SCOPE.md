# 02 — Feature Brief and Scope

## Source FEATURE BRIEF (verbatim from PROMPT.md)

> **Goal.** Create a plan pack for proving alert delivery, support monitoring, error triage,
> redaction, and log retention before first users.
>
> **Evidence To Start From.**
> - `scripts/check-support-monitoring-readiness.ts` uses operator flags and does not verify inbox
>   access, alert dashboards, incident delivery, hosted auth, or linked feedback rows.
> - `src/lib/observability/logger.ts` and direct `console.error` usage need redaction and retention
>   review.
> - Compliance roadmap items reference log retention.
> - Support feedback, upload proof, Cloudflare observability, and legal readiness all depend on
>   trustworthy operational evidence.
>
> **Required Plan Pack.** Include alert scenarios, delivery proof, triage ownership, incident
> record format, log redaction inventory, retention TTL, evidence retention policy, tests/static
> checks, and launch blocking criteria.
>
> **Constraints.** No raw personal data or secrets in evidence. Separate local test proof from live
> alert proof. Stay within free-tier tooling unless owner approves paid services.
>
> **Stop Condition.** The pack is ready when support and alert readiness can be proven without
> hand-wavy operator claims.

## Scope (what this pack plans)

| # | Scope item | Requirement IDs | Phase |
|---|---|---|---|
| S1 | Alert **scenario catalog** (the set of things that must produce a delivered alert) | FR-01, FR-02 | 1 |
| S2 | **Delivery proof** model replacing operator flags with artifact-based receipts | FR-03, FR-04, TEST-02 | 1 |
| S3 | **Triage ownership** matrix (signal → owner → SLA) | OPS-01, OPS-02 | 2 |
| S4 | **First-24h / first-72h** post-launch review gates | OPS-03, GATE-03 | 2, 6 |
| S5 | **Incident record format** (D1 schema + declare/close runbook) | DATA-01, FR-05 | 4 |
| S6 | **Log redaction inventory** (catalog of emit paths + coverage/gaps) | SEC-01 (inventory only) | 5 |
| S7 | **Retention TTL policy** — enforce the 7 unenforced log/platform classes | DATA-02, DATA-03 | 3 |
| S8 | **Evidence-retention policy** for proof artifacts | DATA-04 | 5 |
| S9 | **Tests / static checks** that readiness evidence is real | TEST-01, TEST-02, TEST-03 | 1, 3, 5 |
| S10 | **Launch-blocking criteria** (go/no-go gates) | GATE-01, GATE-02, GATE-03 | 6 |
| S11 | **Runbook** (find-by-request-id, declare incident, rollback) | DOC-01 | 6 |

## Non-goals (explicitly out of scope)

| NG# | Non-goal | Owner / reason |
|---|---|---|
| NG-1 | Request-id plumbing, error taxonomy, `Server-Timing`, runtime budgets, Analytics Engine metrics infra, sampling tuning | Sibling `2026-07-07-cloudflare-worker-production-observability-and-budgets` owns the *pipes*. This pack consumes their outputs. |
| NG-2 | Redaction *enforcement* fixes (credit-card/phone/IP/raw-header/stack-path gaps; console-bypass migration) | Sibling pack `SEC-01`/`SEC-02`. This pack **inventories** them (§`08`) so the sibling pack has a complete gap list; it does not implement the fix. |
| NG-3 | Paid alerting (PagerDuty, Datadog, Opsgenie) or paid log retention (Logpush, Workers Paid) | PROMPT constraint: free-tier unless owner approves. Documented as owner-gated (`OPEN-ALERT-02`, `OPEN-RET-01`), not implemented. |
| NG-4 | DSAR erasure propagation | `2026-07-07-privacy-request-operations-and-erasure-workflow`, gated `OPEN-ERASE-01`. |
| NG-5 | Re-deciding the 7 already-enforced retention TTLs | Those wait on `OPEN-DEC-004`; this pack only adds the 7 *missing* rules using draft values. |
| NG-6 | Beta-feedback SLA operating loop (columns, alerting on stale feedback) | `2026-07-07-beta-support-feedback-operating-loop` `DATA-02`. This pack references the purge coupling only. |
| NG-7 | D1 backup automation / R2 lifecycle rules | `2026-07-07-d1-r2-backup-restore-operational-readiness`. |
| NG-8 | Application code changes in this *planning* task | Mode is `planning-only`. |

## Scope boundary with the sibling observability pack

The boundary is **pipes vs. proof**:

- **Sibling = pipes.** It builds the mechanisms that *produce* signals: request ids (so a log can
  be correlated), error taxonomy (so a log carries `outcome`/`code`), metrics (so a KPI is
  computed), budgets (so a breach is detectable), sampling (so logs survive), and redaction
  enforcement (so the signal carries no PII).
- **This pack = proof + policy.** It defines *which signals must reach a human*, *proves they do*,
  *names who responds*, *records incidents*, *locks the retention TTLs* for the log/platform
  classes, and *gates launch* on the proof.

The one-directional dependency: **this pack's alert-delivery proof (FR-03/FR-04) depends on the
sibling pack's request-id + error-taxonomy + metrics work being implemented first.** If the
sibling pack is not yet implemented, the proof slices that depend on it are `CONDITIONALLY READY`
and sequence after the sibling's Phases 1–5. This is recorded in `11_…` Phase dependencies and in
`16_…`.

If the sibling pack's metrics (Analytics Engine) or request-id work is descoped or changed, the
affected requirements here (FR-03 error-rate alert, FR-04 correlated proof) must be re-validated
against the new reality — recorded as a stale-plan revalidation checklist item in `README`.

## Constraints (from PROMPT + repo)

- **C-1 (PROMPT):** No raw personal data or secrets in evidence. → Every proof artifact is run
  through `redactForLog` (DEC-09); proof JSON contains only hashes/prefixes/counts/paths.
- **C-2 (PROMPT):** Separate local test proof from live alert proof. → `19_…` evidence-class
  table distinguishes `Local automated` (vitest proof-script runs) from `Provider-backed` (real
  webhook/email/GraphQL round-trip). Launch gates require the latter.
- **C-3 (PROMPT + AGENTS.md):** Free-tier unless owner approves paid. → No paid add-on is enabled.
  Paid paths are `OPEN-*` decisions.
- **C-4 (AGENTS.md):** Standing Cloudflare-resource authorization covers D1/R2/DO/Queue/Email
  inside `wrangler.jsonc` bounds. → A new migration `0040` for incident tables and retention-rule
  additions are within mandate; no per-change owner approval needed for the *schema*, but final
  TTL *policy* still needs `OPEN-DEC-004`.
- **C-5 (AGENTS.md):** Shared-worktree; no automatic branch/worktree creation. → Implementation
  stays on `main`, coordinates by file-scope ownership.
- **C-6 (repo):** `logs_worker_observability` retention is platform-managed; free-tier Workers
  Logs retention is ~3 days, **not** the 30 days the draft schedule states (finding F-03). The
  plan corrects this.

## Assumptions (labeled, validated where possible)

- **A-1:** The sibling observability pack's request-id + error-taxonomy work will be implemented
  (it is `CONDITIONALLY READY`, score 96). If it stalls, FR-03/FR-04 degrade to "correlated by
  timestamp only" — recorded as residual risk R-04.
- **A-2:** A free external cron host (e.g. GitHub Actions scheduled workflow, cron-job.org free
  tier, or a second free Cloudflare Worker on a different account) is available to run the
  error-rate alert poller. Owner chooses (`OPEN-ALERT-01`).
- **A-3:** The draft retention TTLs in `retention-schedule.md` are acceptable as *interim enforced
  values* until `OPEN-DEC-004`. The owner has not rejected them; they are derived from industry
  defaults + the schedule's own rationale.
- **A-4:** Cloudflare Workers Observability GraphQL API is queryable with a read token for the
  error-rate poller (sibling pack OBS-03 assumes this). Validated as official-doc-supported in
  `19_…`; exact query shape deferred to implementation.
- **A-5:** `beta_feedback_submissions` retention coupling (`DATA-02` in the beta-feedback pack)
  remains P3/conditional; this pack does not block on it.

## Success metrics (how we know the plan succeeded *as a plan*)

- Every PROMPT "Required Plan Pack" bullet maps to ≥1 requirement with objective acceptance
  criteria and a validation method that is not "manual QA."
- The stop condition ("proven without hand-wavy operator claims") is operationalized: the
  readiness verifier fails on missing *artifacts*, not missing *flags*, and the launch gates
  require provider-backed evidence.
- No requirement duplicates the sibling observability pack's owned scope.
- The redaction inventory is complete (every emit path catalogued; every gap named with an owner).
- The 7 unenforced retention classes each have a draft-TTL enforcement rule and a `OPEN-DEC-004`
  gate for the final value.

## Failure metrics (what would make the plan *not* ready)

- Any "delivery proof" that reduces to "operator set a flag."
- Any retention claim that is false for the free tier (e.g. "30d logs" when free is ~3d).
- Any incident/launch gate that cannot be checked from an artifact or query.
- Any scope overlap with the sibling observability pack that creates two owners for one file.

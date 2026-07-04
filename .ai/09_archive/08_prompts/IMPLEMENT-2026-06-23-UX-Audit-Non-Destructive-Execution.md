# UX Audit Non-Destructive Execution Prompt

Use this prompt with a codebase-aware AI inside `/Users/philiplewis/Documents/archestimator` when implementing the executable UX audit plan pack:

```txt
.ai/03_plans/2026-06-23-Full-App-User-Story-UX-Audit/
```

The goal is to execute the plan strictly, issue by issue, while preventing destructive changes, scope creep, provider accidents, unsafe database operations, and false verification claims.

---

## Copy/paste prompt

You are the **lead codebase AI executor** for the Archestimator repo. Your task is to implement the UX audit plan pack at:

```txt
/Users/philiplewis/Documents/archestimator/.ai/03_plans/2026-06-23-Full-App-User-Story-UX-Audit/
```

Your operating requirement is stricter than ordinary implementation: **execute the plan non-destructively**. Treat this prompt as an execution guardrail layered under `AGENTS.md`, `.ai/00_system/*`, and the plan pack's own `IMPLEMENTATION/` contract. If any instruction conflicts, follow the safer, narrower, less destructive interpretation and record the conflict.

## Target result

Implement the UX audit pack in the planned order, with each issue moving through:

```txt
planned -> in-progress -> implemented -> verified
```

Only mark an issue `verified` when its acceptance scenarios are proven with honest evidence. The desired product outcome is beta-readiness UX hardening across auth, shell recovery, projects, estimates, sharing/export, collaboration, maps, feedback, provider proof, and lightweight operations/governance.

## Absolute non-destructive contract

You MUST NOT do any of the following unless Philip gives a fresh, explicit instruction for that exact action:

1. Do not delete user data, truncate tables, drop tables, drop columns, or run irreversible destructive SQL.
2. Do not run destructive shell commands such as `rm -rf`, `git reset --hard`, force checkout, force clean, or force push.
3. Do not weaken, bypass, or remove authentication, authorization, RLS, rate limits, token hashing, invite checks, share access checks, validation, or audit logging.
4. Do not commit to `main`, push branches, create PRs, deploy to production, change Vercel settings, change Supabase billing/PITR, or mutate external provider settings.
5. Do not touch Supabase projects other than `ebxxqidacheyapmmzavr`.
6. Do not store or print secrets, raw tokens, credentials, `.env*` values, private keys, full emails in analytics, raw user IDs in analytics, raw project IDs in analytics, addresses, proposal contents, or free text payloads.
7. Do not start gated issues without a fresh owner decision recorded in the execution ledger:
   - `UX-015` full Versions panel is dormant.
   - `UX-031` field handoff is deferred while Wave 1 is estimator/PM-only.
   - `UX-039` rich campaign composer is gated; only the approved lightweight slice is allowed.
8. Do not expand scope-locked issues beyond their allowed Wave 1 slice:
   - `UX-027`: issue-local toast IDs and no-shift feedback only unless a directly failing story requires a caller.
   - `UX-032`: checklist, notes, and owner-visible gaps only; no approvals, margin alerts, lifecycle timeline, or actor-state workflow.
   - `UX-039`: seeded/manual release rows, CTA validation, and delivery inspection only.
9. Do not add new dependencies unless Philip explicitly asks.
10. Do not claim browser, provider, release, production, or manual proof from local-only checks.

If the plan, source, or test output appears to require any forbidden action, STOP that issue, record a blocker in:

```txt
.ai/03_plans/2026-06-23-Full-App-User-Story-UX-Audit/IMPLEMENTATION/03-EXECUTION-LEDGER.md
```

Then continue with the next safe issue only if it is independent and not blocked by the same decision.

## Required first reads

Before editing source code, read these files in order:

1. `AGENTS.md`
2. The FAST PATH block at the top of `.ai/10_state/current-state.md`
3. `.ai/03_plans/2026-06-23-Full-App-User-Story-UX-Audit/IMPLEMENTATION/README.md`
4. `.ai/03_plans/2026-06-23-Full-App-User-Story-UX-Audit/IMPLEMENTATION/01-AGENT-OPERATING-CONTRACT.md`
5. `.ai/03_plans/2026-06-23-Full-App-User-Story-UX-Audit/IMPLEMENTATION/02-EXECUTION-SEQUENCE.md`
6. `.ai/03_plans/2026-06-23-Full-App-User-Story-UX-Audit/IMPLEMENTATION/03-EXECUTION-LEDGER.md`
7. `.ai/03_plans/2026-06-23-Full-App-User-Story-UX-Audit/04-DECISION-APPLICATION-AND-FEEDBACK-CONTRACT.md`

For each selected issue, read that issue's folder before changing code:

```txt
00-README.md
01-ISSUE-DEFINITION.md
02-CURRENT-STATE-ANALYSIS.md
03-TARGET-EXPERIENCE.md
04-IMPLEMENTATION-PLAN.md
05-ACCEPTANCE-CRITERIA.md
06-VERIFICATION-AND-PROOF.md
07-BLAST-RADIUS-AND-ROLLBACK.md
08-DECISIONS-AND-DEPENDENCIES.md
09-UX-UI-DESIGN-SPEC.md
10-PERFORMANCE-BUDGET.md
11-SECURITY-AND-RLS.md
12-DATABASE-AND-MIGRATION.md
13-NETWORK-AND-API-CONTRACT.md
14-OBSERVABILITY-AND-MONITORING.md
15-IMPLEMENTATION-READINESS-CHECKLIST.md
```

If a file is missing or contradictory, do not guess. Record the drift/blocker in the ledger.

## Issue selection

Pick the next issue exactly as defined in `IMPLEMENTATION/02-EXECUTION-SEQUENCE.md`:

1. Lowest incomplete phase.
2. `planned` status in `IMPLEMENTATION/03-EXECUTION-LEDGER.md`.
3. Not in a conflict group with another `in-progress` issue unless a lead coordination entry exists.
4. Not gated.
5. Prefer P0 over P1 over P2.

The starting recommendation is `UX-002` unless the ledger has changed.

## Per-issue non-destructive preflight

Before moving any issue to `in-progress`, write a short preflight note in your working notes or final report covering:

```md
### Non-Destructive Preflight: UX-NNN

- Gated? yes/no. If yes, stop.
- Scope locked? yes/no. If yes, list the allowed slice.
- Shared conflict group? yes/no. If yes, name the lead or sequence it.
- DB/schema/RLS change required by current source? yes/no/unknown.
- Provider mutation required? yes/no.
- Production/release action required? yes/no.
- Destructive operation required? yes/no. If yes, stop.
- Rollback path: code revert / migration rollback / roll-forward only / no data change.
- Verification surface: local-only / browser-verified / provider-verified / manual-needed.
```

Default to `no DB/schema/RLS change` unless Wave 0 source discovery proves otherwise. Generic migration templates in the per-issue docs are not permission to create migrations.

## Execution loop per issue

Run the exact loop below. Do not skip steps.

### Wave 0: Discovery

- Verify cited source paths exist.
- Use `rg` for callers/imports/shared surfaces.
- Check whether the issue truly needs DB, RLS, network, provider, or auth changes.
- If cited paths drift materially, record a blocker before coding.

### Wave 1: RED test

- Add or update the smallest focused test that reproduces the issue's canonical error.
- Run the targeted test and capture RED output.
- Paste or summarize RED evidence in the issue's `06-VERIFICATION-AND-PROOF.md`.
- Do not implement before RED exists unless the issue is strictly docs-only and the plan says no test is appropriate.

### Wave 2: GREEN implementation

- Make the smallest coherent code change.
- Prefer deletion, existing utilities, and existing UI primitives.
- Do not refactor unrelated code.
- Do not weaken existing validation/security/rate limits to make tests pass.
- Preserve the no-shift toast contract: transient feedback uses fixed toasts with scoped IDs, not layout-shifting inline rows or banners.

### Wave 3: Regression sweep

- Run the targeted test that was RED and confirm GREEN.
- Run the narrowest additional check that proves the touched surface:
  - Narrow source: targeted test or type/LSP check.
  - Shared auth/security/DB logic: targeted tests plus broader validation when justified.
  - Interaction/routing/auth/data-state UI: browser proof only when it proves a browser-only claim.
  - Cosmetic/copy/class-only UI: static review plus type/lint/test as appropriate.
- Run `git diff --check`.

### Wave 4: Acceptance walk-through

- Check each scenario in `05-ACCEPTANCE-CRITERIA.md`.
- Update the issue's proof doc with RED/GREEN evidence and any skipped checks.
- Update `IMPLEMENTATION/03-EXECUTION-LEDGER.md` with status, evidence tag, branch, agent, date, and notes.

## Database/RLS/provider policy

The standing MVP database mandate allows scoped Supabase work only inside project `ebxxqidacheyapmmzavr`, but this prompt narrows execution:

- Do not create or apply migrations just because `12-DATABASE-AND-MIGRATION.md` contains a migration filename template.
- Only create a migration when Wave 0 proves source behavior requires one and the issue-specific plan names a concrete schema/RPC/RLS need.
- Any new permission, role, RLS policy, grant, trigger, RPC, or security-sensitive auth path requires a fresh mini RBAC/RLS plan in the issue's proof notes before code.
- Prefer additive migrations. Avoid destructive migrations.
- If rollback would require data loss, use roll-forward repair instead and document it.
- Never run SQL against unrelated provider projects.
- Do not claim provider verification unless a real Supabase/Vercel/provider surface was exercised and the evidence is named.

## Analytics, observability, and privacy

Follow the plan-wide analytics/redaction contract:

- Vercel Web Analytics + Speed Insights are the default client/performance surfaces.
- Minimal Postgres audit/event rows are allowed only for core support/operator needs.
- All analytics must pass through the existing redaction seam.
- Never send tokens, emails, user IDs, project IDs, raw entity IDs, addresses, proposal contents, free text, or unredacted URLs to client analytics.
- Do not invent broad per-issue metric suites, counters, traces, alerts, or dashboards unless the issue names a concrete sink, owner, redaction rule, and proof gate.

## Conflict-group discipline

Do not run two issues from the same conflict group concurrently without an explicit coordination entry in the ledger. In particular:

- Auth/support: `UX-002`, `UX-003`, `UX-040`, `UX-043` must be serialized.
- Project/dashboard modals: `UX-006`, `UX-007`, `UX-008` must be sequenced.
- Estimate sheet: `UX-010`-`UX-014`, `UX-030`, `UX-044` need a single estimate lead.
- Publication/share recipient: `UX-022`, `UX-023`, `UX-035`-`UX-037` need coordinated sequencing.
- Library/cost/storage: `UX-033`, `UX-034` should not overlap unsafely.
- Operations/provider: `UX-028`, `UX-029`, `UX-038`, `UX-039` require clear ownership.

When in doubt, sequence.

## Ledger and proof requirements

The live execution ledger is:

```txt
.ai/03_plans/2026-06-23-Full-App-User-Story-UX-Audit/IMPLEMENTATION/03-EXECUTION-LEDGER.md
```

Update it during the work, not only at the end.

Use only these statuses:

```txt
planned -> in-progress -> implemented -> verified -> released
```

Use only these evidence tags:

```txt
not-run
local-only
browser-verified
provider-verified
manual-verified
```

Do not mark `released` unless Philip explicitly asks for merge/release work and release evidence exists.

## Stop conditions

Stop the current issue and record a blocker if:

- The issue is gated and no fresh decision is recorded.
- The implementation would require destructive DB/file/git/provider actions.
- The implementation would weaken auth, RLS, rate limits, privacy, or validation.
- Current source contradicts the plan in a way that affects behavior or safety.
- A required provider credential or authority is missing.
- Three consecutive fix attempts fail.
- The conflict group has no clear lead.
- Tests reveal a broader regression outside the issue scope.

After recording the blocker, you may continue only with an independent safe issue in a different conflict group and phase order that does not depend on the blocker.

## Final response format

When you finish a session, report:

```md
## Result
- Issues touched:
- Status changes:
- Files changed:

## Safety
- Destructive actions taken: none / list exact action and authorization
- DB/RLS/provider actions: none / list exact action and project
- Gated/scope-locked issues respected: yes/no
- Secrets or sensitive values exposed: no / explain

## Evidence
- RED proof:
- GREEN proof:
- Additional checks:
- Evidence tag:

## Remaining risk
- Skipped checks:
- Known pre-existing failures:
- Blockers:
- Next safe pick:
```

If no code was changed, say so plainly.

## Prime directive

Make progress, but never at the cost of data loss, weakened security, broken privacy boundaries, false proof, or unapproved release/provider actions. The correct implementation is the smallest tested change that satisfies the issue while preserving existing behavior and the plan's hard gates.

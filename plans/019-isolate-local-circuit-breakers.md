# Plan 019: Move the in-process comment circuit breaker (and admission control) off per-isolate state

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0a2667db9..HEAD -- src/app/api/share/[token]/comment/route.ts src/lib/uploads/admission-control.ts src/lib/security/durable-rate-limit-d1.ts`
> If any changed since this plan was written, compare "Current state" against
> the live code; on a mismatch, STOP.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: MED
- **Depends on**: none (but coordinates with the durable-rate-limit primitive also used by plan 003)
- **Category**: correctness / security
- **Planned at**: commit `0a2667db9`, 2026-07-17

## Why this matters

Two surfaces keep per-isolate mutable state for load-shedding / concurrency
control. On Cloudflare Workers, each isolate has its own copy of module-level
state, so these controls shed load per-isolate rather than globally — an
attacker's requests distribute across isolates and never trip a single isolate's
threshold, while a noisy legitimate tenant clustered on one isolate can be shed
unfairly.

1. **Comment circuit breaker** — `src/app/api/share/[token]/comment/route.ts:33-79`
   uses module-level `let` arrays for the breaker.
2. **Upload admission control** — `src/lib/uploads/admission-control.ts:30-32`
   keeps per-actor / per-workspace active-upload counters in module-level `Map`s.
   (`release()` is called in route `finally` blocks, so within an isolate there's
   no leak, but a crashed isolate never decrements; and the cap is per-isolate.)

This plan moves both to the existing D1/Durable-Object-backed durable limiter
(`src/lib/security/durable-rate-limit-d1.ts`) so the controls are global. The
D1-backed direct-upload session cap (`MAX_RESERVED_DIRECT_UPLOAD_SESSIONS_PER_ACTOR`)
already compensates for the direct-upload surface — this plan extends the same
durable approach to the server-mediated image routes and the comment breaker.

## Current state

`src/app/api/share/[token]/comment/route.ts:33-79` (verified) — module-level
`let` arrays for the comment circuit breaker.

`src/lib/uploads/admission-control.ts:30-32` (verified) — module-level `Map`s:
`requestBuckets`, `activeByActor`, `activeByWorkspace`. Line 128-140:
`release()` decrements; routes call it in `finally`.

`src/lib/security/durable-rate-limit-d1.ts` — the durable limiter (also used by
plan 003). Read it to confirm it can express both a fixed-window counter
(for the breaker) and a concurrent-active counter (for admission control). If
it can only do fixed-window, the admission-control concurrency part needs a
Durable Object (the repo has `COLLAB_ROOMS` / `GLOBAL_PRESENCE` DOs as
patterns).

## Commands you will need

| Purpose   | Command                | Expected on success |
|-----------|------------------------|---------------------|
| Typecheck | `bun run type-check`   | exit 0              |
| Tests     | `bun run verify`       | all pass            |

## Scope

**In scope** (the only files you should modify):
- `src/app/api/share/[token]/comment/route.ts` — replace the in-memory breaker
  with a durable check.
- `src/lib/uploads/admission-control.ts` — replace the in-memory counters with
  durable (D1 or DO) concurrency tracking, OR explicitly document them as
  best-effort per-isolate and rely on the D1-backed direct-upload cap for hard
  limits (see step 2 for the decision).

**Out of scope**:
- The durable limiter primitive itself — use as-is (do not expand it in this
  plan; if it can't express what's needed, STOP).
- The estimate-action rate limiter (plan 003 covers it).
- The direct-upload D1 session cap — already durable; leave it.

## Git workflow

- Branch: `advisor/019-durable-circuit-breakers`.
- Commit message: `fix(shares,uploads): move circuit breaker and admission control off per-isolate state`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Comment circuit breaker → durable fixed-window

Read `src/app/api/share/[token]/comment/route.ts:33-79` to understand the
breaker's trip condition (e.g. N failures in a window → shed for M seconds).
Read `durable-rate-limit-d1.ts` to confirm it can express that as a
fixed-window counter keyed by `publicationId` / route.

Replace the module-level arrays with a call to the durable limiter at the top
of the comment handler: if the publication's failure count in the window
exceeds the threshold, shed (return the existing "temporarily unavailable"
response); otherwise proceed and, on failure, increment the durable counter.

Delete the module-level mutable arrays.

**Verify**: `bun run type-check` → exit 0.

### Step 2: Admission control — durable concurrency OR explicit best-effort

Decision point. Read `durable-rate-limit-d1.ts` and decide:

- **(A) If the durable limiter (or a DO) can express a concurrent-active
  counter** (increment on acquire, decrement on release, reject when > cap):
  move `admission-control.ts` to it. This is the ideal fix.
- **(B) If not**: explicitly document `admission-control.ts` as best-effort
  per-isolate (add a JSDoc comment naming the limitation), and extend the
  D1-backed session-cap pattern (already used for direct uploads at
  `direct-upload/route.ts:264-294`) to the server-mediated image routes
  (`/api/projects/images`, `/api/component-library/images`). The D1 cap becomes
  the authoritative concurrency limit; the in-memory map becomes a cheap hint.

Prefer (A) if feasible; (B) is the safe fallback. Record the decision in the
worktree notes.

If you pick (B), add a sweep in `admission-control.ts` that prunes
`activeByActor`/`activeByWorkspace` entries whose `release` was never called
within a TTL window (so a crashed isolate's next invocation on the same isolate
doesn't accumulate stale entries).

**Verify**: `bun run type-check` → exit 0.

### Step 3: Run the gate

**Verify**: `bun run verify` → exit 0.

Tests that asserted on the in-memory breaker / admission maps need updating:
search `grep -rln "circuit\|admission-control\|requestBuckets\|activeByActor" tests/`.
Update them to the durable contract.

## Test plan

- Update affected tests (above).
- If authorized (TEST_TASK), add: the comment breaker trips globally (across
  simulated isolates) after N failures; admission control rejects the N+1th
  concurrent upload globally. Model on existing durable-rate-limit tests
  (`tests/vitest/client-portal-public-rate-limit.test.ts`).

## Done criteria

- [ ] `bun run type-check` exits 0
- [ ] `bun run verify` exits 0
- [ ] `src/app/api/share/[token]/comment/route.ts` has no module-level mutable
      breaker arrays (uses durable limiter)
- [ ] `src/lib/uploads/admission-control.ts` is either durable (option A) or
      explicitly documented best-effort with a TTL sweep (option B)
- [ ] No files outside the in-scope list (plus updated tests) are modified
- [ ] `plans/README.md` status row updated to DONE

## STOP conditions

- The durable limiter can't express either shape needed (fixed-window for the
  breaker, concurrent-active for admission) AND option (B)'s D1 session-cap
  extension would require a new migration the plan didn't budget — report and
  scope down to just the comment breaker (the higher-leverage half).
- A test asserts on the per-isolate behavior as deliberate — report.

## Maintenance notes

- After this lands, the comment breaker and admission control are global. Watch
  the latency of the comment route and the image-upload routes under load —
  they now do an extra D1/DO read.
- The estimate-action rate limiter (plan 003), this plan, and the durable
  direct-upload cap together convert all the in-memory load controls to
  durable. Any new in-memory load control should be justified explicitly.
- Reviewer: confirm no module-level mutable load-control state remains in these
  two files (or is explicitly documented best-effort with a sweep).

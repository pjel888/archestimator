# Plan 003: Move the estimate-action rate limiter off per-isolate memory

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0a2667db9..HEAD -- src/lib/estimates/action-rate-limit.ts src/lib/estimates/actions.ts src/lib/security/durable-rate-limit-d1.ts src/lib/security/durable-rate-limits.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none (independent)
- **Category**: correctness
- **Planned at**: commit `0a2667db9`, 2026-07-17

## Why this matters

`src/lib/estimates/action-rate-limit.ts` keeps its counters in a module-level
`const buckets = new Map<string, number[]>()`. On Cloudflare Workers (OpenNext),
each request is served by a short-lived isolate with its own fresh `buckets`,
so the 40-per-10s and 120-per-60s limits almost never accumulate across
requests — the limiter is effectively a no-op on the production estimate-edit
hot path. Worse, while an isolate lives, every distinct
`(surface, userId, resourceId)` tuple allocates an entry that is never swept
(entries for *other* keys are not pruned), so the map grows without bound until
the isolate is recycled.

This is defense-in-depth (authz still enforces the real boundary), but it is a
named, documented throttle that silently does not throttle. The repo already has
a Durable-Object / D1-backed durable rate limiter (`src/lib/security/durable-rate-limit-d1.ts`,
`durable-rate-limits.ts`) used by the public share surface — this plan routes
the estimate-action limiter through it.

## Current state

`src/lib/estimates/action-rate-limit.ts` (verbatim, full file, verified):

```ts
import "server-only";

export type EstimateActionRateLimitSurface = "estimate-mutation" | "project-estimate-create";

export type EstimateActionRateLimitResult =
  | { allowed: true }
  | { allowed: false; message: string; retryAfter: number };

type EstimateActionRateLimitWindow = { limit: number; seconds: number };

const ESTIMATE_ACTION_RATE_LIMIT_WINDOWS: EstimateActionRateLimitWindow[] = [
  { seconds: 10, limit: 40 },
  { seconds: 60, limit: 120 },
];

const maxWindowMs = Math.max(...ESTIMATE_ACTION_RATE_LIMIT_WINDOWS.map((window) => window.seconds * 1000));
const buckets = new Map<string, number[]>();

// ... checkEstimateActionRateLimit reads/writes `buckets` in memory ...
// ... assertEstimateActionRateLimit calls checkEstimateActionRateLimit and throws ...
// ... resetEstimateActionRateLimitForTests clears `buckets` ...
```

Two call sites (verified):
- `src/lib/estimates/actions.ts:849` and `:941` — `assertEstimateActionRateLimit`
  is wired into `assertCanEditEstimate` (the "estimate-mutation" surface) and
  the "project-estimate-create" surface.

The durable limiter already in the repo: read
`src/lib/security/durable-rate-limit-d1.ts` and `durable-rate-limits.ts`. Note
its public function name(s), how it accepts `(key, limit, windowSeconds)`, and
how it returns `{ allowed, retryAfterSeconds }`. Match that shape. The share
surface uses it at `src/lib/publication/public-rate-limits.ts` and
`src/lib/client-portal/*rate-limit*` — read one call site as the exemplar.

Repo conventions:
- Server-only modules start with `import "server-only";`.
- D1 access in this domain goes through `requireEstimateD1Database()` from
  `@/lib/estimates/d1-intents/database` (or the equivalent in the durable
  limiter — match whichever the exemplar uses).
- Conventional commits (`fix(estimates): ...`).

## Commands you will need

| Purpose   | Command                          | Expected on success |
|-----------|----------------------------------|---------------------|
| Install   | `bun install`                    | exit 0              |
| Typecheck | `bun run type-check`             | exit 0, no errors   |
| Tests     | `bun run verify` (or `bun run test:dom`) | all pass   |

## Scope

**In scope** (the only files you should modify):
- `src/lib/estimates/action-rate-limit.ts` — replace the in-memory
  implementation with one backed by the durable limiter.
- `src/lib/estimates/actions.ts` — only if the call-site signature must change
  (it should not; `assertEstimateActionRateLimit(input)` keeps the same shape).
  If the durable limiter is async and the current one is sync, `assertCanEditEstimate`
  is already async, so `await` is the only change at the two call sites.

**Out of scope** (do NOT touch):
- `src/lib/security/durable-rate-limit-d1.ts` and `durable-rate-limits.ts` —
  use them as-is. If they lack a multi-window capability you need, STOP and
  report rather than expanding the shared primitive in this plan.
- The two configured windows (40/10s, 120/60s) — keep the exact limits.
- Authz (`assertCanEditEstimate`) logic — rate limiting is a separate concern.

## Git workflow

- Branch: `advisor/003-estimate-rate-limiter-durable`.
- Commit message: `fix(estimates): back estimate-action rate limiter with durable store`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Read the durable limiter and pick the integration shape

Read `src/lib/security/durable-rate-limit-d1.ts` and one call site
(`src/lib/publication/public-rate-limits.ts`). Decide:
- Does the durable limiter support a **fixed-window counter** with the limit +
  window shape the estimate limiter needs? (It almost certainly does — that's
  the standard pattern.)
- The estimate limiter has **two** windows (10s and 60s). The durable limiter
  likely takes one window per call. Plan to make **two** keyed checks per
  `assertEstimateActionRateLimit` call — one keyed
  `${surface}:${userId}:${resourceId}:w10s` (limit 40, window 10) and one keyed
  `...:w60s` (limit 120, window 60). If the first denies, return its
  `retryAfter`; otherwise check the second.

Record the durable limiter's exact function signature in your worktree notes —
you'll call it in step 2.

**Verify**: nothing to run; this is reading. Confirm you can name the function
and its return type before proceeding.

### Step 2: Rewrite `action-rate-limit.ts`

Replace the in-memory implementation. Keep the public types
(`EstimateActionRateLimitSurface`, `EstimateActionRateLimitResult`) and the two
exported function names (`checkEstimateActionRateLimit`,
`assertEstimateActionRateLimit`) and `resetEstimateActionRateLimitForTests`
unchanged in **signature**. Internals change:

- `checkEstimateActionRateLimit` becomes `async`. It derives the two durable
  keys (window-suffixed), calls the durable limiter for the 10s window first,
  then (if allowed) the 60s window, and returns the first denial or `{allowed:true}`.
- `assertEstimateActionRateLimit` becomes `async` and `await`s the check.
- `resetEstimateActionRateLimitForTests` — the durable limiter likely has its
  own test-reset; if not, this becomes a no-op (or delegates to the durable
  limiter's test helper). Do not delete the export — tests reference it.

Key construction: keep the existing separator `\u001f` and the same
`surface|userId|resourceId` components, just add the `:wNNs` suffix per window.
Keep the `unknown-user` / `unknown-resource` fallbacks for empty strings.

**Verify**: `bun run type-check` → exit 0.

### Step 3: Update the two call sites to `await`

In `src/lib/estimates/actions.ts`, at the two `assertEstimateActionRateLimit(...)`
call sites (around lines 849 and 941), add `await` if not already present (the
enclosing function `assertCanEditEstimate` is async). If `assertCanEditEstimate`
is NOT already async, STOP — making it async is a larger blast radius and you
should report rather than improvise.

**Verify**: `bun run type-check` → exit 0. Then `grep -n "assertEstimateActionRateLimit" src/lib/estimates/actions.ts` → both call sites are preceded by `await`.

### Step 4: Run the full gate

**Verify**: `bun run verify` → exit 0.

Existing tests that called `checkEstimateActionRateLimit` synchronously or
relied on `resetEstimateActionRateLimitForTests` clearing in-memory state will
need updating to `await` and to use the durable limiter's reset. Update those
test files (search `grep -rn "checkEstimateActionRateLimit\|resetEstimateActionRateLimitForTests\|assertEstimateActionRateLimit" tests/`). The changes are mechanical (add `await`, swap the reset call).

If a test asserts on the *in-memory* `buckets` map directly (unlikely — it's
not exported), STOP and report.

## Test plan

- Update existing rate-limit tests to be async and use the durable reset.
- Do NOT add new tests unless the user authorized test creation (TEST_TASK).
  If they did, model a new test on
  `tests/vitest/client-portal-public-rate-limit.test.ts` (the existing durable
  rate-limit test) — assert denial after exceeding the 40/10s window and the
  120/60s window, and that a fresh key is allowed.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `bun run type-check` exits 0
- [ ] `bun run verify` exits 0
- [ ] `grep -n "new Map<string" src/lib/estimates/action-rate-limit.ts` → no matches (in-memory map removed)
- [ ] `grep -n "import.*durable-rate-limit" src/lib/estimates/action-rate-limit.ts` → shows the durable limiter import
- [ ] Both `assertEstimateActionRateLimit` call sites in `actions.ts` are `await`ed
- [ ] No files outside the in-scope list (plus updated test files) are modified
- [ ] `README.md` status row updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:
- The durable limiter (`durable-rate-limit-d1.ts`) does NOT support the
  fixed-window counter shape needed (e.g. it's token-bucket-only, or returns a
  different result type that can't express `retryAfter`). Report the mismatch.
- `assertCanEditEstimate` is not already async — widening it is a bigger blast
  radius than this plan covers.
- A test asserts directly on the unexported `buckets` map.
- The durable limiter requires a D1 table / migration that doesn't exist yet —
  report what's missing; adding a migration is out of scope here.

## Maintenance notes

- After this lands, the limiter is real (global, not per-isolate). Watch the
  latency of `assertCanEditEstimate` under load — it now does 1-2 D1 reads per
  estimate mutation. If that shows up in traces, consider a short (5s) in-memory
  cache layer in front of the durable check (best-effort, NOT authoritative).
- The two windows (40/10s, 120/60s) are policy, not law — tunable via constants
  in this file.
- Reviewer: confirm (a) no module-level mutable state remains, (b) the durable
  keys include the surface + user + resource + window-suffix so different
  resources don't share a budget, (c) the 10s window is checked before the 60s
  window so the tighter bound wins.
- This plan does NOT address the parallel `admission-control.ts` and
  `comment`-circuit-breaker per-isolate-state issues (findings #18 in the audit
  index, covered by plan 018). Those are separate surfaces.

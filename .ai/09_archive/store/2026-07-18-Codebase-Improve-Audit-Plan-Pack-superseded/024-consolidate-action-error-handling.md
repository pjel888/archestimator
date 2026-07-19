# Plan 024: Consolidate action error handling onto `withActionErrors` + `AppError`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0a2667db9..HEAD -- src/lib/observability/with-action-errors.ts src/lib/observability/app-error.ts src/lib/estimates/actions.ts src/lib/collaboration/actions.ts`
> If in-scope files changed since this plan was written, compare "Current
> state" against the live code; on a mismatch, STOP.

## Status

- **Priority**: P3
- **Effort**: L
- **Risk**: MED
- **Depends on**: 001 (verify baseline — this is a large change that needs the regression gate)
- **Category**: tech-debt
- **Planned at**: commit `0a2667db9`, 2026-07-17

## Why this matters

Action error handling has three coexisting patterns and the "winner" has ~0
adoption:

1. **`withActionErrors` + `AppError`** (the winner) — a complete, well-designed
   wrapper at `src/lib/observability/with-action-errors.ts:28` that normalizes
   errors, logs with request id, returns `actionOk`/`actionFailure` Result
   types, handles `NEXT_REDIRECT` rethrow correctly. Full typed `AppError`
   hierarchy (`app-error.ts:50-150`: `AuthRequiredError`, `ValidationError`,
   `NotFoundError`, `ConflictError`, `DatabaseError`, `UpstreamError`,
   `RateLimitError`, etc.) with `toClientJSON()` + a toast-config mapping
   (`toast-config.ts:10`).
2. **Bare `throw new Error("…")`** — 1194 sites in `src/`, including the largest
   action files (`estimates/actions.ts` ~30 throws, `component-library/actions.ts`).
3. **Hand-rolled `{ ok: false, message }` / `{ ok: true, message, invitePath }`** —
   `collaboration/actions.ts` and ~292 ad-hoc Result returns.

Adoption: only 5 `actionOk`/`actionFailure` call sites (all in
`with-action-errors.ts` + `publication/actions.ts:1149`); 0 `AppError`-subclass
throws anywhere in `src/`. The typed toast UX from `toast-config.ts` only fires
for the rarely-used `AppError` path, so most failures lose their typed tone/code,
and client code must handle three incompatible failure modes per action.

This plan migrates action files onto the winner pattern, one file at a time,
behind `bun run verify` at each step. It is L effort and MED risk (wrapped
actions change return type from `T | throws` to `ActionResult<T>`, so callers
need a corresponding unwrap); the staging below makes it reversible.

## Current state

`src/lib/observability/with-action-errors.ts` (verified full file — read it):
- `withActionErrors(actionName, action, options)` — wraps an async action;
  rethrows `NEXT_REDIRECT`/`NEXT_NOT_FOUND`; normalizes via `normalizeAppError`;
  logs via `logAppError` with request id; returns `actionOk(result)` or
  `actionFailure(appError)`.
- Two modes: `{ successMode: "passthrough", failureMode: "passthrough-message" }`
  for collaboration-style `{ok, message}` callers, and the default
  `ActionResult<T>` mode.

`src/lib/observability/app-error.ts` (verified full file — read it): the full
`AppError` hierarchy with status codes, log levels, and `toClientJSON`.

`src/lib/estimates/actions.ts:165,609,659,845,1048,1640` (and ~25 more) — bare
`throw new Error("…")`.

`src/lib/collaboration/actions.ts:167,1175,1298,1329` — hand-rolled
`return { ok: false, message }` / `return { ok: true, message, invitePath }`.

Exemplar of the winner working: `src/lib/publication/actions.ts:1149` uses
`actionOk`/`actionFailure`.

## Commands you will need

| Purpose   | Command                          | Expected on success |
|-----------|----------------------------------|---------------------|
| Typecheck | `bun run type-check`             | exit 0              |
| Verify    | `bun run verify` (requires plan 001) | all pass        |

## Scope

**In scope** (files you may modify — migrate incrementally):
- `src/lib/estimates/actions.ts` — migrate first (largest throw-heavy file).
- `src/lib/component-library/actions.ts` — migrate second.
- `src/lib/collaboration/actions.ts` — migrate using the `passthrough-message`
  failure mode so its `{ok, message}` callers don't break.
- The corresponding callers in `src/components/workshop/` (unwrap
  `ActionResult<T>` where the return type changes).
- `eslint.config.mjs` — add a `no-restricted-syntax` rule (see step 4) once
  migration is far enough along.

**Out of scope** (do NOT touch in this plan):
- The 1194 throw sites across all of `src/` — this plan migrates the three
  highest-value action files; the rest is follow-up. Do not boil the ocean.
- `with-action-errors.ts`, `app-error.ts`, `toast-config.ts` internals — use
  as-is.
- Non-action throws (utilities, repositories that throw to be caught upstream).

## Git workflow

- Branch: `advisor/024-action-error-consolidation`.
- One commit per action file migrated (so each is independently revertible).
- Commit message style: `refactor(estimates): wrap actions with withActionErrors`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Migrate `estimates/actions.ts` (the largest throw-heavy file)

For each exported `"use server"` action in `estimates/actions.ts`:

1. Convert internal `throw new Error("…")` sites to `throw new <Specific>Error("…")`
   from `app-error.ts` where the error class clearly applies:
   - authz failures → `AuthPermissionDeniedError`
   - "not found" → `NotFoundError`
   - validation → `ValidationError`
   - concurrent-modification → `ConflictError`
   - D1 failures → `DatabaseError`
   - email/provider → `UpstreamError`
   - rate-limit → `RateLimitError`
   For throws that don't map cleanly, leave them as `throw new Error(...)` for
   now — `normalizeAppError` will wrap them as `InternalError`.
2. Wrap the action with `withActionErrors("actionName", async (...args) => { ... })`.
3. Update the action's callers (search for call sites in
   `src/components/workshop/`) to unwrap the `ActionResult<T>`: check `.ok`,
   branch on `.error` for typed toast UX.

Migrate one action at a time, running `bun run verify` after each, so a breakage
is bisectable. If the file has many actions, this step is long — that's expected
(L effort).

**Verify**: `bun run type-check` → exit 0. `bun run verify` → exit 0.

### Step 2: Migrate `component-library/actions.ts`

Same pattern as step 1. This file is also large (~30 throws). Same per-action
cadence with `bun run verify` after each.

**Verify**: `bun run type-check` + `bun run verify` → exit 0.

### Step 3: Migrate `collaboration/actions.ts` using passthrough-message

This file uses hand-rolled `{ok, message, invitePath}` returns that callers
depend on. Use `withActionErrors(name, fn, { successMode: "passthrough", failureMode: "passthrough-message" })`
so the wrapped action still returns `T | (ActionFailure & { message })` —
callers that destructure `{ ok, message }` keep working. Convert the
`return { ok: false, message }` sites to `throw new <Specific>Error(message)`
and let the wrapper produce the passthrough failure.

**Verify**: `bun run type-check` + `bun run verify` → exit 0.

### Step 4: Add an eslint rule banning bare `throw new Error(` in `"use server"` files

Once the three files are migrated, add to `eslint.config.mjs` a
`no-restricted-syntax` rule that errors on `throw new Error(` inside files
matching `"use server"` — with an allowlist/comment-escape for the remaining
un-migrated action files (so this plan's partial migration doesn't break lint
for the rest of the repo). The rule prevents backsliding in the migrated files.

**Verify**: `bun run lint` → exit 0.

### Step 5: Run the full gate

**Verify**: `bun run verify` → exit 0.

## Test plan

- Existing action tests must still pass; update assertions that expected a
  thrown `Error` to expect `ActionResult` failure (`{ ok: false, error: { code, kind, message } }`).
- If authorized (TEST_TASK), add per-action tests asserting the typed error
  code/kind propagates to the client (e.g. an authz-denial returns
  `AUTH_PERMISSION_DENIED`, surfacing the correct toast).

## Done criteria

- [ ] `bun run type-check` exits 0
- [ ] `bun run verify` exits 0
- [ ] `estimates/actions.ts`, `component-library/actions.ts`, and
      `collaboration/actions.ts` exported actions are wrapped with
      `withActionErrors`
- [ ] At least the clearly-mapped throw sites in those files use `AppError`
      subclasses (grep for `throw new AuthPermissionDeniedError|ValidationError|NotFoundError|...`)
- [ ] Callers in `src/components/workshop/` unwrap `ActionResult<T>`
- [ ] `eslint.config.mjs` bans `throw new Error(` in `"use server"` files (with
      documented allowlist for un-migrated files)
- [ ] No files outside the in-scope list are modified
- [ ] `README.md` status row updated to DONE

## STOP conditions

- A caller's unwrap is structurally hard (e.g. the action is used in a
  `useActionState`/`useTransition` that can't easily branch on `ActionResult`)
  — report the specific caller; migrate a different action first and leave the
  hard one for a follow-up.
- `bun run verify` is unavailable (plan 001 not landed) — STOP and land plan
  001 first; this plan is not safe to execute without the regression gate.
- An action's existing tests encode the `throw` semantics so deeply that
  migrating it breaks many tests in ways that aren't mechanical — report and
  skip that action, migrating the rest.

## Maintenance notes

- After this plan, three action files use the winner pattern. The remaining
  ~45 action files are follow-up work; the eslint rule (step 4) keeps the
  migrated files from regressing and gives a worklist for the rest (every
  `"use server"` file still containing `throw new Error(`).
- The typed toasts (`toast-config.ts`) now fire for the migrated actions' typed
  errors — watch the UX improvement and any surprise toast mappings.
- Reviewer: confirm (a) the wrapper's `NEXT_REDIRECT` rethrow works for any
  action that redirects, (b) `collaboration` callers still get `{ok, message}`,
  (c) the eslint allowlist is narrow and documented.
- Because this is L effort / MED risk and touches caller contracts, prefer the
  `execute` variant (dispatched executor + advisor review) over direct
  implementation.

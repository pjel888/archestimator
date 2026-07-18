# Plan 004: Compare CSRF tokens and control secrets in constant time

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0a2667db9..HEAD -- src/lib/publication/security.ts src/lib/cloudflare/collaboration-room.ts`
> If either file changed since this plan was written, compare "Current state"
> against the live code; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `0a2667db9`, 2026-07-17

## Why this matters

Several security-token comparisons in the codebase use JavaScript `!==`, which
is not constant-time and can leak byte-by-byte through response timing. The
practical exploitability is low (these are 256-bit random tokens, and SOP/CORS
constrain cross-origin timing measurement), but the repo already imports
`crypto.timingSafeEqual` and uses it elsewhere for cookie signatures — so this
is a straightforward consistency / defense-in-depth hardening. Three confirmed
sites:

1. CSRF double-submit token — `src/lib/publication/security.ts:395` and `:417`.
2. CollaborationRoom control-secret header — `src/lib/cloudflare/collaboration-room.ts:502`.

`src/lib/security/bearer-auth.ts:30-35` already defines a constant-time pattern
(`authorizeBearerRequest`), and `src/lib/collaboration/realtime-room-token.ts:73`
has a `timingSafeStringEqual` helper — reuse one of those rather than inventing
a new helper.

## Current state

`src/lib/publication/security.ts:393-420` (CSRF check, verified shape):

```ts
// around line 395:
if (csrfHeader !== csrfCookie) { /* reject */ }
// around line 417 (assertSameOriginPublicFormPost):
if (csrfHeader !== csrfCookie) { /* reject */ }
```

The module already imports `timingSafeEqual` at the top (`security.ts:1`) and
uses it for cookie-signature comparison.

`src/lib/cloudflare/collaboration-room.ts:502` (verified):

```ts
if (request.headers.get(CONTROL_SECRET_HEADER) !== configuredSecret) { /* reject */ }
```

Existing constant-time helpers in the repo (read before writing):
- `src/lib/collaboration/realtime-room-token.ts` — `timingSafeStringEqual(a, b)`:
  returns `false` on length mismatch, else `timingSafeEqual` over equal-length
  UTF-8 byte buffers.
- `src/lib/security/bearer-auth.ts` — `authorizeBearerRequest` (digest-then-compare).

Prefer the existing `timingSafeStringEqual` if its export is reachable from both
files without creating a circular import; otherwise add a small local helper.

Repo conventions: server-only modules, no `as any`, conventional commits
(`security(publication): ...`).

## Commands you will need

| Purpose   | Command                | Expected on success |
|-----------|------------------------|---------------------|
| Install   | `bun install`          | exit 0              |
| Typecheck | `bun run type-check`   | exit 0              |
| Tests     | `bun run test:dom`     | all pass            |

## Scope

**In scope** (the only files you should modify):
- `src/lib/publication/security.ts` — replace the two `!==` CSRF comparisons.
- `src/lib/cloudflare/collaboration-room.ts` — replace the `!==` control-secret
  comparison.

**Out of scope**:
- Do not touch other `!==` comparisons that are **not** comparing secret tokens
  (e.g. comparing enum values, IDs, route names — those have no timing-sensitivity).
- Do not add new tests unless authorized (TEST_TASK). Existing CSRF/control tests
  must still pass.

## Git workflow

- Branch: `advisor/004-constant-time-compares`.
- Commit message: `security: compare CSRF and control-secret tokens in constant time`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Add or reuse a constant-time string-equal helper

First read `src/lib/collaboration/realtime-room-token.ts` to confirm
`timingSafeStringEqual` exists and is exported, and that importing it from
`src/lib/publication/security.ts` and `src/lib/cloudflare/collaboration-room.ts`
does NOT create a circular dependency.

- If `timingSafeStringEqual` is safely importable from both files: import it.
  Skip to step 2.
- If importing it would create a cycle (e.g. `realtime-room-token.ts` imports
  from `publication/security.ts`): add a small local helper. Put it in the
  already-existing `src/lib/security/bearer-auth.ts` (next to the existing
  constant-time code) OR inline at the top of each file. A minimal correct
  implementation:

```ts
import { timingSafeEqual } from "node:crypto";

function timingSafeStringEqual(a: string, b: string): boolean {
  const aBytes = Buffer.from(a, "utf-8");
  const bBytes = Buffer.from(b, "utf-8");
  if (aBytes.length !== bBytes.length) return false;
  return timingSafeEqual(aBytes, bBytes);
}
```

Note the length-mismatch early return is required — `timingSafeEqual` throws on
unequal lengths.

**Verify**: `bun run type-check` → exit 0.

### Step 2: Replace the two CSRF comparisons in `publication/security.ts`

At lines ~395 and ~417, replace:

```ts
if (csrfHeader !== csrfCookie) { ... }
```

with:

```ts
if (!timingSafeStringEqual(csrfHeader ?? "", csrfCookie ?? "")) { ... }
```

(Use `?? ""` only if the values can be `undefined`; if they are already
`string`, drop the coalescing. Match what the surrounding code guarantees.)

**Verify**: `bun run type-check` → exit 0.

### Step 3: Replace the control-secret comparison in `collaboration-room.ts`

At line ~502, replace:

```ts
if (request.headers.get(CONTROL_SECRET_HEADER) !== configuredSecret) { ... }
```

with:

```ts
const controlSecret = request.headers.get(CONTROL_SECRET_HEADER) ?? "";
if (!controlSecret || !configuredSecret || !timingSafeStringEqual(controlSecret, configuredSecret)) { ... }
```

The `!controlSecret || !configuredSecret` guards reject empty headers/secrets
before the constant-time compare (an empty configured secret should always
reject) and avoid the equal-length-shortcut leak when both are empty.

**Verify**: `bun run type-check` → exit 0.

### Step 4: Run the test suite

**Verify**: `bun run test:dom` → all pass. Any CSRF or collaboration-room test
that previously relied on the exact `!==` behavior should still pass — the
equality semantics are unchanged, only the timing characteristic.

If a test breaks because it passes an empty/undefined token and expects a
specific error path, adjust the test to pass a real-length mismatched token —
do NOT weaken the helper.

## Test plan

No new tests required (consistency hardening, semantics unchanged). If the user
authorized tests, add one unit test asserting `timingSafeStringEqual("", "")`
returns `false` (empty-secret rejection) and that equal non-empty tokens return
`true` while same-length different tokens return `false`. Model on an existing
helper test in `tests/vitest/`.

## Done criteria

- [ ] `bun run type-check` exits 0
- [ ] `bun run test:dom` exits 0
- [ ] `grep -n "csrfHeader !== csrfCookie" src/lib/publication/security.ts` → no matches
- [ ] `grep -n "CONTROL_SECRET_HEADER) !==" src/lib/cloudflare/collaboration-room.ts` → no matches
- [ ] No files outside the in-scope list are modified
- [ ] `plans/README.md` status row updated to DONE

## STOP conditions

- Drift in either in-scope file.
- Importing `timingSafeStringEqual` from `realtime-room-token.ts` creates a
  circular dependency AND adding it to `bearer-auth.ts` is also cyclic — report
  and propose the inline-helper location before proceeding.
- A CSRF or collaboration-room test fails for a reason other than empty-token
  semantics (record the failing assertion).

## Maintenance notes

- Going forward, any new secret-token comparison should use the shared helper.
  Consider an eslint `no-restricted-syntax` rule banning `!==` between
  identifiers matching `/secret|token|csrf|password/i` — but that's a separate
  DX task (not this plan).
- Reviewer: confirm the empty-string guards in step 3 reject an empty configured
  secret (fail-closed), and that no comparison short-circuits on length in a way
  that leaks length (the `timingSafeStringEqual` length check is unavoidable and
  acceptable — secret lengths are fixed).

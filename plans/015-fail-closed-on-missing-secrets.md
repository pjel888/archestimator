# Plan 015: Fail-closed in production when the telemetry pepper and AI draft-token secret are unset

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0a2667db9..HEAD -- src/lib/publication/security.ts src/lib/ai/package-builder/draft-token.ts`
> If either changed since this plan was written, compare "Current state"
> against the live code; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `0a2667db9`, 2026-07-17

## Why this matters

Two secret-resolution helpers keep non-production string fallbacks that are
safe today but are configuration-drift footguns: if a deployed environment ever
ran with `NODE_ENV` mis-set to a non-`"production"` value, the weak fallback
would silently activate instead of failing closed. Both are defense-in-depth
(no live exploit — surrounding controls hold), but tightening them removes the
footgun.

1. **Telemetry pepper falls back to the publication token-hash secret.**
   `src/lib/publication/security.ts:117-119` — `readTelemetryHashPepper` returns
   `readPublicationTokenHashSecret()` when `ARCHESTIMATOR_TELEMETRY_HASH_PEPPER`
   is unset. The token-hash secret HMACs recipient tokens (bearer-capable
   credentials). Reusing it for telemetry hashes (client IPs, user agents)
   couples two security domains: a token-hash-secret compromise would let an
   attacker reverse historical IP hashes, and vice versa. The codebase's own
   comment at `security.ts:114-116` calls this out.

2. **AI package-builder draft-token signing secret has a non-production string
   fallback.** `src/lib/ai/package-builder/draft-token.ts:20-25` —
   `getDraftSigningSecret()` returns the hardcoded string
   `"archestimator-local-package-builder-draft-token"` when
   `NODE_ENV !== "production"`. `applyPackageBuilderDraft` re-validates
   user+workspace binding from the token payload, so a forged token can't write
   outside the caller's workspace — but the weak fallback is a drift footgun.

This plan makes both fail-closed in production and tightens the non-production
guard to local-only where reasonable.

## Current state

`src/lib/publication/security.ts:107-119` — the production-fail-closed pattern
already exists for `readPublicationTokenHashSecret` (throws at line 103 when
unset in prod). `readTelemetryHashPepper` (lines 114-119) is the one with the
fallback. Read both before editing.

`src/lib/ai/package-builder/draft-token.ts:20-25` — `getDraftSigningSecret()`
returns the local string when `NODE_ENV !== "production"`.

Exemplar for the fix: `security.ts:103` (the token-hash secret's prod throw) and
`src/lib/auth/account-audit.ts:41-43` (DEV_FALLBACK_PEPPER guarded to
non-production).

## Commands you will need

| Purpose   | Command                | Expected on success |
|-----------|------------------------|---------------------|
| Typecheck | `bun run type-check`   | exit 0              |
| Tests     | `bun run verify`       | all pass            |

## Scope

**In scope** (the only files you should modify):
- `src/lib/publication/security.ts` — `readTelemetryHashPepper` throws in
  production when the env var is unset.
- `src/lib/ai/package-builder/draft-token.ts` — tighten
  `getDraftSigningSecret()` (see step 2).

**Out of scope**:
- The token-hash secret helper (`readPublicationTokenHashSecret`) — already
  prod-fail-closed.
- Any rotation of live secrets (operational follow-up; note in Maintenance).

## Git workflow

- Branch: `advisor/015-fail-closed-missing-secrets`.
- Commit message: `security: fail-closed on missing telemetry pepper and draft-token secret`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Telemetry pepper — fail-closed in prod

In `src/lib/publication/security.ts`, change `readTelemetryHashPepper` so that
when `NODE_ENV === "production"` and `ARCHESTIMATOR_TELEMETRY_HASH_PEPPER` is
unset, it throws (mirroring `readPublicationTokenHashSecret` at line 103). Keep
the non-production fallback ONLY for `NODE_ENV !== "production"` (local dev
convenience).

Match the existing throw message style (`security.ts:103`).

**Verify**: `bun run type-check` → exit 0.

### Step 2: Draft-token secret — tighten the non-production guard

In `src/lib/ai/package-builder/draft-token.ts`, change `getDraftSigningSecret()`
so the hardcoded string fallback resolves only under a strict local-dev guard.
Two acceptable options; pick whichever matches the repo's existing local-dev
detection (check `isLocalDevHostname` in `src/lib/auth/dev-auth-gate.ts` or the
`dev-auth` hostname check):

- **(A)** Require `NODE_ENV === "development"` (not just `!== "production"`) for
  the fallback; otherwise throw.
- **(B)** Mirror `isLocalDevHostname` — the fallback resolves only on localhost
  hostnames; otherwise throw.

Prefer (A) if the repo doesn't have a clean runtime hostname check available in
this server-only module; (B) if `isLocalDevHostname` is importable without a
cycle.

Add `ARCHESTIMATOR_AI_PACKAGE_BUILDER_DRAFT_SIGNING_SECRET` (or whichever env
var name the helper already reads — confirm before editing) to `.env.example`
and `.dev.vars.example` if missing, with a comment.

**Verify**: `bun run type-check` → exit 0.

### Step 3: Run the gate

**Verify**: `bun run verify` → exit 0.

Update tests that ran without the env vars set in production-mode: they now need
the env var explicitly. Search:
`grep -rln "readTelemetryHashPepper\|getDraftSigningSecret\|ARCHESTIMATOR_TELEMETRY_HASH_PEPPER" tests/`.

## Test plan

- Update affected tests to set the env vars.
- If authorized (TEST_TASK), add: both helpers throw in `NODE_ENV=production`
  when their env var is unset.

## Done criteria

- [ ] `bun run type-check` exits 0
- [ ] `bun run verify` exits 0
- [ ] `readTelemetryHashPepper` throws in prod when unset (read the function)
- [ ] `getDraftSigningSecret()` fallback is gated to `NODE_ENV === "development"` (or local-hostname)
- [ ] `.env.example` and `.dev.vars.example` declare both env vars
- [ ] No files outside the in-scope list (plus updated tests/examples) are modified
- [ ] `plans/README.md` status row updated to DONE

## STOP conditions

- A production code path calls `readTelemetryHashPepper` without a try/catch
  and would now crash on a misconfigured deploy — report (this is the intended
  fail-closed behavior, but the maintainer should provision the env var first).
- `isLocalDevHostname` import creates a cycle in `draft-token.ts` — use option (A).

## Maintenance notes

- **Operational prerequisite (NOT this plan):** ensure
  `ARCHESTIMATOR_TELEMETRY_HASH_PEPPER` and the draft-token signing secret are
  set in the deployed worker BEFORE merging. `cf:sync-worker-secrets` may help.
- If telemetry hashes were persisted with the cross-domain key before this
  lands, the maintainer may choose to rotate both the pepper and (defensively)
  the token-hash secret and re-hash on read — operational decision, not code
  here.
- Reviewer: confirm both helpers throw in production on missing env, and that
  the non-production guards are strict (not just `!== "production"`).

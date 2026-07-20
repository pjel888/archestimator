# Plan 013: Enforce the client-portal password gate inside the brand-asset resolver

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0a2667db9..HEAD -- src/lib/client-portal/public-repository.ts src/app/api/share/[token]/assets/[assetId]/route.ts`
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

`getClientPortalBrandAsset` (`src/lib/client-portal/public-repository.ts:248-253`)
accepts a `passwordAuthenticated` flag from its caller but does NOT consult
`portal.password_hash` itself — it trusts the caller to pass `false` when a
password is required. The route at `assets/[assetId]/route.ts:19-20` does
currently call `hasClientPortalPasswordSession` and pass the result through, so
there's no live bypass today. But the resolver has no internal enforcement: a
future caller that forgets the pre-check would leak brand assets (logos, cover
image) for password-protected portals to anonymous viewers. Unlike
`resolveClientPortalPublicContext` (line ~168), which derives
`allowAnonymousView` from `passwordHash` server-side, the brand-asset resolver
relies on convention. This plan moves the enforcement inside the resolver so the
contract holds regardless of caller.

## Current state

`src/lib/client-portal/public-repository.ts:248-253` (verified shape):

```ts
export async function getClientPortalBrandAsset(
  ...,
  passwordAuthenticated: boolean,
): Promise<...> {
  // accepts the flag; does NOT check portal.password_hash itself
}
```

`resolveClientPortalPublicContext` (line ~168) is the exemplar — it derives
`allowAnonymousView` from the resolved `passwordHash`. Read it before editing.

`src/app/api/share/[token]/assets/[assetId]/route.ts:19-20` — the one current
caller; passes `hasClientPortalPasswordSession(...)` result positionally.

Check whether section/manifest resolvers in the same file follow the same
convention (the deep audit flagged they do) — if so, fix them identically in
this plan.

## Commands you will need

| Purpose   | Command                | Expected on success |
|-----------|------------------------|---------------------|
| Typecheck | `bun run type-check`   | exit 0              |
| Tests     | `bun run verify`       | all pass            |

## Scope

**In scope** (the only file you should modify):
- `src/lib/client-portal/public-repository.ts` — make
  `getClientPortalBrandAsset` (and any sibling section/manifest resolver using
  the same convention) derive the password requirement from
  `resolved.passwordHash` / `portal.password_hash` and reject when
  `!passwordAuthenticated && passwordHash`.

**Out of scope**:
- The route handler — keeps passing the flag (now used only for telemetry
  distinction, not for enforcement).
- Other client-portal resolvers that already enforce internally.

## Git workflow

- Branch: `advisor/013-brand-asset-password-enforcement`.
- Commit message: `security(client-portal): enforce password gate inside brand-asset resolver`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Move enforcement inside the resolver

Read `resolveClientPortalPublicContext` to see how it derives the gate from
`passwordHash`. Then in `getClientPortalBrandAsset`, after resolving the portal,
add:

```ts
const passwordRequired = Boolean(resolved.passwordHash);
if (passwordRequired && !passwordAuthenticated) {
  return null; // or the existing "not authorized" shape this resolver uses
}
```

Keep the `passwordAuthenticated` parameter — it still carries the
telemetry/audit distinction. But enforcement no longer depends on the caller
having pre-checked.

If the section/manifest resolvers in the same file follow the same
caller-trusts-me convention, apply the identical fix to each.

**Verify**: `bun run type-check` → exit 0.

### Step 2: Run the gate

**Verify**: `bun run verify` → exit 0.

Existing brand-asset / section tests should still pass (the route still passes
the correct flag). If a test called the resolver directly with
`passwordAuthenticated=false` against a password-protected portal and expected
the asset, update it to expect `null` (the corrected behavior).

## Test plan

- Update affected direct-resolver tests (above).
- If authorized (TEST_TASK), add: resolver returns `null` for a
  password-protected portal with `passwordAuthenticated=false`, and returns the
  asset when `passwordAuthenticated=true` or no password is set.

## Done criteria

- [ ] `bun run type-check` exits 0
- [ ] `bun run verify` exits 0
- [ ] `getClientPortalBrandAsset` rejects `!passwordAuthenticated && passwordHash` internally
- [ ] Sibling resolvers (if any used the convention) are fixed identically
- [ ] No files outside the in-scope list (plus updated tests) are modified
- [ ] `README.md` status row updated to DONE

## STOP conditions

- The resolver doesn't have `resolved.passwordHash` / `portal.password_hash` in
  scope — report where the hash lives and whether plumbing it in is a larger
  change.
- A sibling resolver's shape differs enough that the identical fix doesn't
  apply — report each one separately.

## Maintenance notes

- After this lands, the route's pre-check is defense-in-depth, not the
  enforcement layer. Keep it (it's cheap and gives clean telemetry).
- Reviewer: confirm the resolver enforces even when called directly, and that
  the `passwordAuthenticated` flag is retained for telemetry.

# Plan 014: Deduplicate the share-route cookie parser and drop `decodeURIComponent`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0a2667db9..HEAD -- src/app/api/share/[token]/comment/route.ts src/app/api/share/[token]/decision/route.ts src/lib/publication/security.ts`
> If any changed since this plan was written, compare "Current state" against
> the live code; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security / tech-debt
- **Planned at**: commit `0a2667db9`, 2026-07-17

## Why this matters

`src/app/api/share/[token]/comment/route.ts:102-105` and
`src/app/api/share/[token]/decision/route.ts:29-32` each define a local
`parseCookieValue` helper that regex-extracts the session cookie and then calls
`decodeURIComponent`. The canonical helper `readCookieValue` in
`src/lib/publication/security.ts:322-328` intentionally does NOT use
`decodeURIComponent` (the cookie value is `prefix:base64url:base64url` with no
URI-encodable characters). The duplicated copies have already drifted in
whitespace handling and add a `URIError` edge case (caught by surrounding
try/catch, but it means the cookie path silently returns `{}` instead of a
clean 401 on malformed `%`-sequences). The session cookie is HMAC-verified
downstream so forgery is prevented, but duplicating a security-sensitive parser
across two routes is itself a tech-debt finding. This plan deletes both copies
and imports the canonical helper.

## Current state

Two local `parseCookieValue` helpers (verified) at:
- `src/app/api/share/[token]/comment/route.ts:102-105`
- `src/app/api/share/[token]/decision/route.ts:29-32`

Canonical: `src/lib/publication/security.ts:322-328` — `readCookieValue` (not
exported yet; this plan exports it or adds a public alias).

## Commands you will need

| Purpose   | Command                | Expected on success |
|-----------|------------------------|---------------------|
| Typecheck | `bun run type-check`   | exit 0              |
| Tests     | `bun run verify`       | all pass            |

## Scope

**In scope** (the only files you should modify):
- `src/lib/publication/security.ts` — export `readCookieValue` (or add a public
  alias) if not already exported.
- `src/app/api/share/[token]/comment/route.ts` — delete local `parseCookieValue`,
  import and use the canonical helper.
- `src/app/api/share/[token]/decision/route.ts` — same.

**Out of scope**:
- Other share routes — check whether they also duplicate the helper; if so,
  fix them identically (`grep -rn "parseCookieValue\|decodeURIComponent" src/app/api/share`).
- The HMAC verification path — unchanged.

## Git workflow

- Branch: `advisor/014-share-cookie-parser-dedup`.
- Commit message: `security(share): use canonical cookie reader; drop decodeURIComponent`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Export the canonical helper

In `src/lib/publication/security.ts`, ensure `readCookieValue` is exported. If
it's currently module-private, either add `export` to it or add a thin public
alias `readSharedLinkCookieValue`. Read its signature first — match the
`(cookieHeader: string | null, name: string) => string | null` shape the routes
need.

**Verify**: `bun run type-check` → exit 0.

### Step 2: Replace the two local helpers

In each of `comment/route.ts` and `decision/route.ts`:
1. Delete the local `parseCookieValue` function.
2. Import the canonical helper from `@/lib/publication/security`.
3. Replace call sites — the canonical helper returns `string | null`; the
   existing code likely handled a possibly-null return downstream (it's used to
   build `readSessionPayload`). Keep the null-handling; only swap the parse call.

If a call site relied on `decodeURIComponent` being applied (it shouldn't — the
cookie value is base64url), STOP and report; that would indicate a real
divergence worth understanding before removing.

**Verify**: `bun run type-check` → exit 0. Then `grep -rn "parseCookieValue\|decodeURIComponent" src/app/api/share` → no matches.

### Step 3: Run the gate

**Verify**: `bun run verify` → exit 0.

Update share-route tests if any asserted on the `decodeURIComponent` behavior
(unlikely — the value is base64url).

## Test plan

- Update affected tests (above) if any.
- No new tests required (the canonical helper already has its own coverage).

## Done criteria

- [ ] `bun run type-check` exits 0
- [ ] `bun run verify` exits 0
- [ ] `grep -rn "parseCookieValue" src/app/api/share` → no matches
- [ ] `grep -rn "decodeURIComponent" src/app/api/share` → no matches
- [ ] Both routes import the canonical cookie reader from `@/lib/publication/security`
- [ ] No files outside the in-scope list are modified
- [ ] `README.md` status row updated to DONE

## STOP conditions

- A call site genuinely needs `decodeURIComponent` (e.g. the cookie value
  contains URI-encoded characters in some path) — report; that would indicate
  the canonical helper is incomplete, not that this plan is wrong.
- The canonical helper's signature differs enough that the swap isn't
  mechanical — report the diff.

## Maintenance notes

- After this lands, all share routes use one cookie reader. Any new share route
  must import it rather than re-implementing.
- Reviewer: confirm no `decodeURIComponent` remains in `src/app/api/share`, and
  that the canonical helper is now exported.

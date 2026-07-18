# Plan 005: Remove the hardcoded platform-admin email fallback

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0a2667db9..HEAD -- src/lib/auth/roles.ts .env.example .dev.vars.example`
> If any in-scope file changed since this plan was written, compare "Current
> state" against the live code; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `0a2667db9`, 2026-07-17

## Why this matters

`src/lib/auth/roles.ts` defines a hardcoded `DEFAULT_PLATFORM_ADMIN_EMAILS =
"philipjonlewis@gmail.com"`. Production (`NODE_ENV === "production"`) is already
fail-closed — it returns `[]` — so the **primary** deploy is safe. The risk is
any **non-production deployment that is nonetheless reachable externally**
(preview/branch deploys, an OpenNext worker built without `NODE_ENV=production`,
a misconfigured wrangler environment): any visitor who controls a D1 profile
with that email gets `isPlatformAdmin → true`, bypassing all RBAC. The email is
also committed publicly in the repo, so the bar is "register/seed a profile with
that address." This plan removes the fallback so every non-prod environment must
set `PLATFORM_ADMIN_EMAILS` explicitly, and documents the requirement in the
env examples.

## Current state

`src/lib/auth/roles.ts:30-51` (verified):

```ts
export const PLATFORM_ADMIN_EMAILS_ENV = "PLATFORM_ADMIN_EMAILS";
const DEFAULT_PLATFORM_ADMIN_EMAILS = "philipjonlewis@gmail.com";

function readPlatformAdminEmails(env: NodeJS.ProcessEnv = process.env): string[] {
  const raw = env[PLATFORM_ADMIN_EMAILS_ENV];
  if (typeof raw === "string" && raw.trim().length > 0) {
    return raw
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.length > 0);
  }

  // Production fail-closed: ...
  if (env.NODE_ENV === "production") return [];

  return DEFAULT_PLATFORM_ADMIN_EMAILS
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);
}
```

`isPlatformAdmin` (line 62-67) is `isPlatformAdminRole(role) || isPlatformAdminEmail(email)`.
Role-based admin (`ceo`/`admin`) still works after this change.

`.env.example` and `.dev.vars.example` exist at the repo root (verified in
recon). Check whether they already declare `PLATFORM_ADMIN_EMAILS` before
editing — `grep -n "PLATFORM_ADMIN_EMAILS" .env.example .dev.vars.example`.

Conventional commits; the last auth-touching commits follow `feat(auth):` /
`fix(auth):`.

## Commands you will need

| Purpose   | Command                | Expected on success |
|-----------|------------------------|---------------------|
| Install   | `bun install`          | exit 0              |
| Typecheck | `bun run type-check`   | exit 0              |
| Tests     | `bun run verify`       | all pass            |

## Scope

**In scope** (the only files you should modify):
- `src/lib/auth/roles.ts` — remove the default-email fallback.
- `.env.example` — add `PLATFORM_ADMIN_EMAILS` if missing.
- `.dev.vars.example` — add `PLATFORM_ADMIN_EMAILS` if missing.

**Out of scope**:
- Role-based admin (`isPlatformAdminRole`) — unchanged.
- Any D1 data / audit log remediation — that's an operational follow-up noted
  in "Maintenance notes," not code in this plan.
- The `PLATFORM_ADMIN_EMAILS_ENV` export name — keep it.

## Git workflow

- Branch: `advisor/005-admin-email-fallback`.
- Commit message: `security(auth): remove hardcoded platform-admin email fallback`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Remove the fallback in `roles.ts`

In `src/lib/auth/roles.ts`:

1. Delete the `const DEFAULT_PLATFORM_ADMIN_EMAILS = "philipjonlewis@gmail.com";` line.
2. Replace the trailing `return DEFAULT_PLATFORM_ADMIN_EMAILS.split(...)...` block
   with `return [];` — i.e. fail-closed in **all** environments when the env var
   is unset, not just production.

The resulting `readPlatformAdminEmails`:

```ts
function readPlatformAdminEmails(env: NodeJS.ProcessEnv = process.env): string[] {
  const raw = env[PLATFORM_ADMIN_EMAILS_ENV];
  if (typeof raw !== "string" || raw.trim().length === 0) return [];
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);
}
```

Update the comment above to explain: admin access requires explicit
`PLATFORM_ADMIN_EMAILS` in every environment; role-based admin (`ceo`/`admin`)
still applies via `isPlatformAdminRole`.

**Verify**: `bun run type-check` → exit 0.

### Step 2: Document the env var in the examples

For each of `.env.example` and `.dev.vars.example`:
- Run `grep -n "PLATFORM_ADMIN_EMAILS" <file>`.
- If present, skip.
- If absent, add a line in the appropriate section (match the file's existing
  grouping — likely an "auth" or "access" block):

```
# Comma-separated allowlist of platform-admin emails (grants isPlatformAdmin=true
# when combined with a matching D1 profile). Required in EVERY environment where
# email-based platform admin access is desired; unset = no email-based admin.
# Role-based admin (ceo/admin roles) is unaffected.
PLATFORM_ADMIN_EMAILS=philipjonlewis@gmail.com
```

(Keeping Philip's email in the **example** file is fine — examples are
explicitly the local-dev template. The fix is that the *source code* no longer
falls back to it.)

**Verify**: `grep -n "PLATFORM_ADMIN_EMAILS" .env.example .dev.vars.example` → both files match.

### Step 3: Run the full gate

**Verify**: `bun run verify` → exit 0.

If a test relied on `DEFAULT_PLATFORM_ADMIN_EMAILS` being set in non-test,
non-prod environments without specifying the env var, it will now get `[]`. Find
such tests with `grep -rn "isPlatformAdmin\|readPlatformAdminEmails\|DEFAULT_PLATFORM_ADMIN" tests/`.
Update those tests to set `PLATFORM_ADMIN_EMAILS` explicitly in their env setup
(or use a role-based admin). Do NOT re-introduce a hardcoded default.

## Test plan

Update affected tests (mechanical: set the env var in test setup). No new tests
required unless authorized (TEST_TASK). If authorized, add a unit test for
`readPlatformAdminEmails` covering: unset env → `[]`; empty/whitespace env →
`[]`; single email; comma list with whitespace/case; production vs test NODE_ENV
both return the parsed list when set (they should be identical now).

## Done criteria

- [ ] `bun run type-check` exits 0
- [ ] `bun run verify` exits 0
- [ ] `grep -n "DEFAULT_PLATFORM_ADMIN_EMAILS" src/lib/auth/roles.ts` → no matches
- [ ] `grep -n "philipjonlewis" src/lib/auth/roles.ts` → no matches
- [ ] `grep -n "PLATFORM_ADMIN_EMAILS" .env.example .dev.vars.example` → both match
- [ ] No files outside the in-scope list (plus updated tests) are modified
- [ ] `plans/README.md` status row updated to DONE

## STOP conditions

- Drift in `roles.ts` or the example files.
- A test cannot be reasonably updated without re-introducing a hardcoded email
  (record the test and the constraint).
- You discover `DEFAULT_PLATFORM_ADMIN_EMAILS` is imported/referenced from
  another module (it's a module-private `const`, so this should be impossible —
  if true, something has drifted).

## Maintenance notes

- **Operational follow-up (NOT part of this plan):** the maintainer should audit
  `audit_events` in any non-production deployment that ran without
  `PLATFORM_ADMIN_EMAILS` set, since such an environment may have granted admin
  to the hardcoded email. Also ensure Philip's local `.env.local` / `.dev.vars`
  (gitignored) set `PLATFORM_ADMIN_EMAILS` so local dogfooding keeps working.
- After this lands, the only paths to platform-admin are (a) `ceo`/`admin` role,
  or (b) explicit env var. Document this in `AGENTS.md` auth section if convenient.
- Reviewer: confirm `isPlatformAdminRole` is untouched, and that no path returns
  the hardcoded email.

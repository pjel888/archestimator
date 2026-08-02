# UNIT-004 — Use timing-safe bearer comparison in proof routers

> **Historical provenance only — do not execute.** This unit is `SUPERSEDED`
> without implementation here. Its landed current-source behavior is revalidated
> by successor `UNIT-028` in `.ai/03_plans/2026-07-31/Code-Improvement/`.

## Goal

Replace the non-timing-safe `===` bearer-secret comparison in seven internal
proof routers with the existing `authorizeBearerRequest` helper that uses
SHA-256 + `timingSafeEqual`. These routes write production D1; the timing
side-channel is a real secret-recovery risk.

## Status

`SUPERSEDED` · historical dependency: (none) · requirement: `SEC-004` · risks: (none)

## Why this matters

Seven proof routers under `src/lib/cloudflare/*-proof-router.ts` authenticate
internal cron/proof endpoints by comparing `request.headers.get("authorization")`
to `Bearer ${env.CRON_SECRET}` with `===`. A timing side-channel on this
comparison can leak the secret byte-by-byte. The correct implementation already
exists at `src/lib/security/bearer-auth.ts` (`authorizeBearerRequest`, using
`timingSafeEqual` on SHA-256 digests) and is used by the production cron routes
(`upload-scan`, `upload-cleanup`, `upload-runtime`). This unit makes the proof
routers reuse it.

## Current state

The vulnerable pattern, repeated in seven files:

```ts
function isAuthorized(request: Request, env: CloudflareXxxProofEnv) {
  const secret = env.CRON_SECRET?.trim();
  if (!secret) return "missing-secret";
  return request.headers.get("authorization") === `Bearer ${secret}` ? "authorized" : "unauthorized";
}
```

The seven sites:

| File | Line |
|------|------|
| `src/lib/cloudflare/estimate-history-proof-router.ts` | 52 |
| `src/lib/cloudflare/better-auth-proof-router.ts` | 90 |
| `src/lib/cloudflare/collaboration-invitation-proof-router.ts` | 46 |
| `src/lib/cloudflare/observability-proof-router.ts` | 25 |
| `src/lib/cloudflare/upload-lifecycle-proof-router.ts` | 54 |
| `src/lib/cloudflare/d1-performance-proof-router.ts` | 258 |
| `src/lib/cloudflare/jobs-proof-router.ts` | 52 |

The correct helper at `src/lib/security/bearer-auth.ts`:

```ts
// returns { status: "authorized" } | { status: "invalid-secret" } | { status: "missing-secret" }
export function authorizeBearerRequest(request: Request, secrets: ReadonlyArray<string | undefined>): { status: ... }
```

Internally: SHA-256 digest of the supplied bearer value, compared with
`timingSafeEqual` against the digest of each configured secret. Handles the
missing-secret case (empty array → `"missing-secret"`).

Each router's `isAuthorized` currently returns one of `"authorized"` /
`"unauthorized"` / `"missing-secret"`, and the caller maps those to HTTP
responses. The helper returns `"authorized"` / `"invalid-secret"` / `"missing-secret"`.
The mapping is: `"authorized"` → authorized; `"invalid-secret"` → unauthorized;
`"missing-secret"` → missing-secret.

## Owned paths / resources

The seven files above. Add the import of `authorizeBearerRequest` from
`@/lib/security/bearer-auth` to each.

## Implementation boundary

For **each** of the seven files:

1. Confirm the `isAuthorized` function matches the vulnerable pattern above
   (reread each file before edit).
2. Add the import at the top:
   ```ts
   import { authorizeBearerRequest } from "@/lib/security/bearer-auth";
   ```
3. Replace the `isAuthorized` body with:
   ```ts
   function isAuthorized(request: Request, env: CloudflareXxxProofEnv) {
     const result = authorizeBearerRequest(request, [env.CRON_SECRET]);
     if (result.status === "missing-secret") return "missing-secret";
     return result.status === "authorized" ? "authorized" : "unauthorized";
   }
   ```
   (Substitute the correct env type name per file.)
4. Confirm the caller of `isAuthorized` still receives the same three string
   values and maps them the same way — no caller change needed.

Do **not** change the secret used (still `CRON_SECRET`), the route paths, or the
proof-router response shapes. This is a pure drop-in for the comparison
primitive.

## Commands you will need

| Purpose    | Command              | Expected on success |
|------------|----------------------|---------------------|
| Type-check | `bun run type-check` | exit 0, no errors   |
| Lint       | `bun run lint`       | exit 0              |
| Site audit | `rg -n "=== \`Bearer " src/lib/cloudflare` | returns **zero** matches after the edit |

## Scope

**In scope:** the seven proof-router files listed above.

**Out of scope:**
- `src/lib/security/bearer-auth.ts` — already correct; do not modify.
- Splitting `CRON_SECRET` into a separate `PROOF_SECRET` (that is a larger
  follow-up; the audit noted it as SECURITY-02 but it is out of scope for this
  quick-win pack because it changes CI proof scripts).
- The route handlers in `src/app/api/internal/*` — they delegate to the routers;
  no change needed.

## Done criteria

- [ ] `bun run type-check` exits 0
- [ ] `bun run lint` exits 0
- [ ] `rg -n "=== \`Bearer " src/lib/cloudflare` returns zero matches
- [ ] All seven files import `authorizeBearerRequest` from `@/lib/security/bearer-auth`
- [ ] Each `isAuthorized` returns the same three string values its caller expects
- [ ] No files outside the seven are modified

## Acceptance evidence

- `rg -n "authorizeBearerRequest" src/lib/cloudflare` shows seven new imports.
- `rg -n "=== \`Bearer " src/lib/cloudflare` is empty.
- `git diff --stat` shows exactly seven files changed.

## STOP conditions

- Any router's `isAuthorized` does not return `"authorized"|"unauthorized"|"missing-secret"`
  (the caller mapping depends on these exact strings).
- A router uses a secret other than `env.CRON_SECRET` (e.g. a per-route
  `PROOF_SECRET`) — if so, pass that env var into the array instead, but confirm
  the env type has it.
- The `authorizeBearerRequest` signature has changed from what is documented
  above (reread `bearer-auth.ts`).

## Recovery

The edit is mechanical and identical across seven files. If type-check fails on
one file, it is almost certainly the env type name — read the file's existing
type declaration and substitute.

## Maintenance notes

- The follow-up SECURITY-02 (splitting `PROOF_SECRET` from `CRON_SECRET`) is a
  natural next step once this lands; the `authorizeBearerRequest` array already
  accepts multiple secrets, so the split is a one-line change per router when
  the new env var exists.
- A reviewer should confirm no router silently swallowed the `"missing-secret"`
  case — that path must still produce the 503/response the caller expects.

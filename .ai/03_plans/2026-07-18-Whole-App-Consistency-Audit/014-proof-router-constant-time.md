# Unit 014 — Proof Routers Use Non-Timing-Safe Secret Comparison (MEDIUM)

**Finding:** F-14 · **Severity:** MEDIUM · **Priority:** P2 · **Effort:** S · **Risk:** LOW
**Requirement:** `REQ-010` (item) · **Status:** TODO · **Depends on:** — · **Test:** NOT_REQUIRED

## Problem

Seven proof routers compare the supplied Bearer secret with plain `===`:

```ts
return request.headers.get("authorization") === `Bearer ${secret}` ? "authorized" : "unauthorized";
```

The Next.js internal routes (`upload-cleanup`, `upload-scan`, `upload-runtime`)
correctly use `authorizeBearerRequest` with `timingSafeEqual`. The `__cloudflare/*`
proof paths leak the secret via timing.

## Evidence

All seven (grep-confirmed):
- `src/lib/cloudflare/better-auth-proof-router.ts:90`
- `src/lib/cloudflare/collaboration-invitation-proof-router.ts:46`
- `src/lib/cloudflare/d1-performance-proof-router.ts:258`
- `src/lib/cloudflare/estimate-history-proof-router.ts:52`
- `src/lib/cloudflare/jobs-proof-router.ts:52`
- `src/lib/cloudflare/observability-proof-router.ts:25`
- `src/lib/cloudflare/upload-lifecycle-proof-router.ts:54`

Each uses the identical `=== \`Bearer ${secret}\`` shape.

## Fix Direction

Route every proof path through the existing `authorizeBearerRequest` helper (the
same one `upload-cleanup`/`scan`/`runtime` use). It already handles
constant-time compare, missing-secret 503, and the header parse.

```ts
import { authorizeBearerRequest } from "...";
const auth = authorizeBearerRequest(request, secret);
return auth.authorized ? "authorized" : "unauthorized";
```

If the helper's signature doesn't fit the proof-router return type, extract just
the `timingSafeEqual` compare into a tiny shared `safeBearerEqual(request, secret)`
and use it in all seven routers.

### Owned paths
- the seven proof-router files above
- (optional) `src/lib/security/bearer-auth.ts` if a new shared helper is added there

### Prohibited
- Do not change the routing/dispatch logic of the proof routers — only the compare.

## Acceptance Evidence

- `AC-001`: none of the seven files contain a literal `=== \`Bearer ${secret}\``
  compare; all route through the constant-time helper.

## Recovery

None needed.

## Notes

Coordinate with `/improve` `004-csrf-constant-time-compare` (same theme) — these
can be one PR. See `00-PLAN.md` §11.

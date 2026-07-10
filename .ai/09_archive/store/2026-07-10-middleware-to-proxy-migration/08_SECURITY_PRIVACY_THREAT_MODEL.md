# Security, Privacy, and Threat Model

## Threat surface

The `middleware` → `proxy` migration touches the **Edge auth gate**. This is a security-sensitive surface.

## Trust boundaries

```
Internet
  ↓ (untrusted)
Cloudflare Edge (Worker archestimator-proof)
  ↓
middleware.ts → request-proxy.ts (THIS IS THE GATE)
  ↓ (request now carries authorization headers if granted)
Next.js server runtime
  ↓
Better Auth session verification (in server layout)
  ↓
D1 / R2 / Durable Objects (trusted)
```

The middleware itself is the first application-layer trust boundary. It strips spoofed headers (`x-middleware-request-*`), sets cache-control on sensitive routes, and delegates session verification to the server layout.

## Actor model

| Actor | Capability | Mitigation |
|---|---|---|
| Anonymous internet user | Sends arbitrary HTTP requests | Middleware strips spoofed auth headers; server layout verifies Better Auth session |
| Authenticated low-priv user | Tries to access other workspaces | App-layer authorization in D1 repositories (not in middleware) |
| Attacker with stolen cookie | Tries to bypass auth gate | Better Auth session validation; cookie signing; rate limiting (DB-backed) |
| Attacker attempting spoof | Sends `x-middleware-request-auth-verified: 1` header | Middleware strips these headers before forwarding (proven by `tests/vitest/auth-proxy.test.ts:468`) |
| Developer reading warning | May naively rename to `proxy.ts` to silence warning | Phase 1 in-source comment is the primary defense |

## What changes if we rename to `proxy.ts` (Phase 3, blocked)

**Security-relevant changes:** NONE.

The middleware function body, the request-proxy logic, the header stripping, the cache-control directives, the matcher pattern, and the delegation to server layout — **all identical**. Only the file name and export name change.

**Risk if Phase 3 is done incorrectly:** HIGH.

If a future developer:
1. Renames the file
2. Forgets to update one of the 13 reference sites (e.g., a script that scans for `src/middleware.ts`)
3. The scan returns empty → silently no-ops → security-monitoring script becomes a false-pass

Mitigation: Phase 3 implementation plan (when unblocked) requires updating all 13 files atomically + running all 26 tests + verifying the scripts still scan correctly.

## What changes if we DON'T rename (Phase 1 only, recommended)

**Security-relevant changes:** NONE.

The middleware function body remains identical. The deprecation warning is purely cosmetic.

## Credential material taxonomy

| Material | Type | Created by | Stored in | Used in middleware? |
|---|---|---|---|---|
| Better Auth session cookie | Signed cookie | Better Auth runtime | Browser | Read (passed through to server layout) |
| `AUTH_VERIFIED_REQUEST_HEADER` | Internal-only header | request-proxy.ts (server-set) | HTTP header | Stripped if incoming, set if internally generated |
| `TERMS_ACCEPTED_REQUEST_HEADER` | Internal-only header | request-proxy.ts (server-set) | HTTP header | Stripped if incoming, set if internally generated |
| `AUTH_REQUEST_PATH_HEADER` | Internal-only header | request-proxy.ts | HTTP header | Set by middleware, read by server |
| Better Auth secret | Server-only env | Bootstrap | `BETTER_AUTH_SECRET` env | NOT used in middleware (deferred to server layout) |

**Migration impact:** ZERO. All materials remain handled identically when the file is renamed. The file rename does not change which credentials exist, where they're stored, or how they're used.

## Privacy impact

- No PII handled in middleware.
- No analytics calls from middleware.
- No third-party data sharing from middleware.
- Request path is logged via `AUTH_REQUEST_PATH_HEADER` — already privacy-reviewed.

Migration impact: ZERO.

## Abuse scenarios relevant to the rename

| Scenario | Status quo risk | Phase 3 risk |
|---|---|---|
| Attacker sends spoofed auth header | Stripped by middleware | Same (file rename preserves stripping logic) |
| Attacker exploits middleware-skipped path | matcher `["/((?!_next/static|_next/image|favicon.ico).*)"]` applies | Same matcher, same exclusions |
| Attacker triggers cache poisoning | `Cache-Control: private, no-store` set on sensitive redirects | Same headers set |
| Attacker finds an OpenNext routing gap | Unknown; not affected by rename | Unknown; not affected by rename |

## CSP / frame / referrer implications

None. Middleware does not set CSP/frame/referrer headers (those live in `next.config.ts` and route handlers).

## Security testing already in place

| Test file | What it proves |
|---|---|
| `tests/vitest/auth-proxy.test.ts` (22 tests) | Auth gate behaves correctly across all role/path/header combinations |
| `tests/vitest/proxy-sensitive-cache-headers.test.ts` (3 tests) | Sensitive routes get `private, no-store` |
| `tests/vitest/proxy-file-convention.test.ts` (1 test) | The middleware-file lock-in is intentional (security control against naive rename) |

Phase 3 implementation MUST keep all 26 tests passing. Phase 1 (doc-only) keeps all 26 tests passing by definition.

## Compliance / audit considerations

- No regulatory change.
- No data subject access change.
- No breach-notification trigger.
- Internal audit: existing `proxy-file-convention.test.ts` is itself an audit control documenting the intentional choice.

## Residual security risk

**LOW.** The current state is more secure than a naive Phase 3 execution would be, because the test lock-in actively prevents the regression that a careless rename could cause.

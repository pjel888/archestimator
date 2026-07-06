# Security, Privacy, and Threat Model

This planning pass does not change auth/data/security surfaces. The security-relevant content is: (1) how the new loading/measurement/rules work must not weaken existing controls, and (2) threats introduced by proposed future phases (RUM beacon, CI auth fixture, skeleton/error UX revealing state). The active security posture is summarized from `AGENTS.md`, `.ai/10_state/current-state.md` (CSP/compliance entries), and `wrangler.jsonc`.

---

## 1. Scope and trust boundaries

- **In scope for this plan's security review:** the proposed RUM beacon (PERF-02), CI authenticated perf fixture (PERF-04), loading/error UI information disclosure, agent-rule enforcement, and the no-code boundary of this pass.
- **Out of scope (existing, unchanged):** Better Auth session model, D1 app-authorization, R2/DO/Queue/Email boundaries, CSP enforcement on `/share/:path*`. These are referenced, not modified.

Trust boundaries: Browser (public) → Cloudflare Worker (OpenNext) → D1/R2/DO/Queue/Email (bound resources); `/share/:path*` is the public unauthenticated boundary; `/workshop/*` is the authenticated boundary behind `workshop/layout.tsx` server gate.

## 2. Threat model (planning-relevant)

| ID | Threat | Surface | Risk | Mitigation (to enforce in implementation) |
|---|---|---|---|---|
| SEC-01 | RUM beacon leaks PII (project id, email, estimate cost, token, query string) | PERF-02 beacon | High | Payload = `{metric,value,id,routePath,rating,deviceType}` only; routePath stripped of query; CSP allowlist; redaction tests; review against `27-*.md` Rule 8 |
| SEC-02 | RUM endpoint abused for traffic/exfiltration (CSRF/SSRF) | new `/api/internal/web-vitals` | Medium | Same-origin enforce; rate limit; reject non-POST; size cap; no auth needed but no sensitive read |
| SEC-03 | Skeleton/error UI leaks existence/ownership of private data | loading.tsx, error.tsx, not-found | Medium | Skeletons are generic shapes; not-found generic; share token existence already handled by password/not-found pattern — audit for parity on `/invite/[token]` |
| SEC-04 | CI authenticated perf fixture bypasses auth | PERF-04 storage state / dev bypass | Medium-High | Bypass only in isolated CI env + seeded dev data, never prod; secret-scoped; reviewed; never shipped to client bundles |
| SEC-05 | `ssr:false` on estimate chunks moves logic client-side, exposing internal structure | ARCH-02 | Low-Medium | No secrets/repos cross boundary (already enforced); audit bundle for server-only leakage via `ANALYZE=true` |
| SEC-06 | Loading-state timing side-channel (attacker infers data size from skeleton/transition duration) | any | Low | Acceptable for closed-beta; document; mitigate via fixed-shape skeletons |
| SEC-07 | Agent rules weakened/skipped by future agents | ARCH-01 protocol | Medium | `bun run validate:agents` gate; rule referenced from AGENTS.md required reading; rule is policy not bypassable by brief |
| SEC-08 | Beacon endpoint added to CSP without scoping → broader allowlist risk | PERF-02 | Low | Add only the beacon origin; keep `/share/:path*` enforced CSP restrictive |

## 3. Credential material taxonomy (relevant to token routes)

This pass does not introduce credentials, but the token-bearing routes (`/share/[token]`, `/invite/[token]`) carry raw bearer tokens in the URL. Existing handling (hash storage, password unlock, session) is unchanged. Any loading/error UX change on these routes must **not** log or render the token. The RUM beacon must strip query strings so tokens in URLs are not beaconed (SEC-01).

## 4. Privacy / data minimization

- RUM beacon is anonymous + route-path-only (SEC-01).
- Existing client-error reporting scrubs PII (`27-*.md` Rule 8) — keep.
- Loading skeletons carry no data.
- No new data retention introduced by this plan.

## 5. CSP implications

- `next.config.ts` headers: Report-Only on landing/workshop/invite; **enforced** on `/share/:path*`. Any new beacon endpoint must be added to `connect-src`/`img-src` as appropriate for the sink, scoped narrowly. Keep `/share/:path*` CSP restrictive.
- `WebVitalsProbe`/RUM beacon must respect CSP (no inline-script expansion).

## 6. Abuse/rate-limiting

- RUM beacon endpoint: rate-limit per IP (existing `security_rate_limit_events` pattern from `27-*.md` R-008 drift note) to prevent abuse.
- No change to existing share/publication rate limits.

## 7. Security testing expectations (for future implementation phases)

- Denial test: beacon rejects unauthenticated/oversized/malformed payloads.
- Redaction test: beacon payload schema enforced; no PII fields pass.
- Token-route audit: no token in any loading/error UI or beacon.
- CI auth fixture: proof it cannot run against prod (env isolation).

## 8. Residual risk

- This plan is planning-only: no security control is changed. Residual risk is introduced only when PERF-02/PERF-04/ARCH-02 move to implementation; those phases must satisfy SEC-01..08.

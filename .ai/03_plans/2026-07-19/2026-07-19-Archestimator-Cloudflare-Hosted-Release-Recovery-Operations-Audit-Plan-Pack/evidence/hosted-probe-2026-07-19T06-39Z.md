# Hosted Provider Probe — 2026-07-19T06:39Z..06:45Z

Read-only DNS + HTTP probe collected from the audit workstation (Asia/Manila,
non-interactive shell). No Cloudflare API writes, no wrangler auth-gated reads.

## Toolchain

- `wrangler` 4.110.0 via `bunx wrangler` is installed but `bunx wrangler whoami`
  returned **Not logged in. Your auth token has expired and could not be
  refreshed, and the environment is non-interactive.** — every `wrangler` auth-
  gated provider readback is recorded as `EVIDENCE_BLOCKED` in the layer matrix
  with the continuation command `bunx wrangler <cmd> --env prod`.
- `dig`, `/usr/bin/curl` are available; probes below used those.

## DNS — `archestimator.com`

```
A     archestimator.com.            -> 172.67.201.196, 104.21.74.99   (Cloudflare edge)
A     www.archestimator.com.        -> 172.67.201.196, 104.21.74.99   (Cloudflare edge)
NS    archestimator.com.            -> carl.ns.cloudflare.com., ziggy.ns.cloudflare.com.
MX    archestimator.com.            -> 10 eforward1.registrar-servers.com.
                                     -> 10 eforward2.registrar-servers.com.
                                     -> 10 eforward3.registrar-servers.com.
                                     -> 15 eforward4.registrar-servers.com.
                                     -> 20 eforward5.registrar-servers.com.
TXT   archestimator.com.            -> "v=spf1 include:spf.efwd.registrar-servers.com ~all"
TXT   _dmarc.archestimator.com.     -> "v=DMARC1; p=none;"
TXT   default._domainkey            -> (empty)
TXT   google._domainkey             -> (empty)
TXT   cloudflare._domainkey         -> (empty)
TXT   cf._domainkey                 -> (empty)
TXT   mail._domainkey               -> (empty)
A     archestimator-proof.philipjonlewis.workers.dev. -> 104.21.90.71, 172.67.167.191
MX    support.archestimator.com.    -> (empty)
MX    mail.archestimator.com.       -> (empty)
```

### DNS findings

- Apex and `www` resolve on the Cloudflare edge.
- **MX records point at Namecheap `registrar-servers.com` (`eforward1..5`)**, not
  Cloudflare Email Routing. Inbound mail to `@archestimator.com` is handled by
  Namecheap email forwarding, not by a Worker `email()` handler.
- SPF authorizes Namecheap's `spf.efwd.registrar-servers.com` only.
- DMARC is `p=none` (monitor, no enforcement).
- No DKIM record published under common selectors.
- No `support.` or `mail.` MX subdomains.
- `archestimator-proof.philipjonlewis.workers.dev` resolves on the Cloudflare
  edge — the `workers_dev: true` secondary origin is **live and reachable**.

## HTTP probes against `archestimator.com` (HTTPS, GET/HEAD unless noted)

```
GET /                                200  cf-cache-status: HIT  age: 1553184
                                              cache-control: max-age=14400, s-maxage=31536000
                                              content-security-policy-report-only: ...
                                              x-opennext: 1, x-nextjs-prerender: 1
                                              x-request-id: req_4ecc0ed9-… (present)
GET /api/auth/get-session            200  cache-control: private, no-cache, no-store, max-age=0, must-revalidate
                                              strict-transport-security: max-age=63072000; includeSubDomains; preload
                                              referrer-policy: no-referrer
                                              x-content-type-options: nosniff
                                              x-frame-options: DENY
                                              body: null   (session not present — fail-closed)
GET /api/auth/session                404  (Better Auth uses /api/auth/get-session, not /api/auth/session)
GET /api/health                      200  cache-control: no-store
                                              body: {"ok":true,"service":"archestimator","timestamp":"2026-07-19T06:44:23.653Z"}
                                              x-request-id: req_6b96bc24-… (present)
GET /robots.txt                      200  (content-signal / opt-out policy text)
GET /sitemap.xml                     200
GET /admin                           307  Location: /login?next=%2Fadmin
GET /workshop                        307  Location: /login?next=%2Fworkshop
GET /login                           200  (HTML renders "Continue with Google" button)
GET /contact                         200
GET /share                           404
GET /invite                          404
GET /api/share/<fake-token>          404
GET /api/invite/<fake-token>         404
GET /api/internal/health             404  (no internal unauthenticated health surface on apex)
GET /__cloudflare/health             404  (no canonical OpenNext health path on apex)
GET /this-route-does-not-exist-xyz   404
OPTIONS /api/health                  204
```

### Apex findings

- Deployed Worker is reachable; `x-opennext: 1` header confirms OpenNext adapter is live.
- `x-request-id` is propagated end-to-end on every probed response.
- Auth routes are present and `/api/auth/get-session` correctly returns `null`
  when no session cookie is sent (no session leakage, fail-closed).
- `/admin` and `/workshop` redirect unauthenticated users to `/login?next=…`
  (auth gate enforced at the route level).
- `/api/health` returns a deterministic JSON contract (`{ok, service, timestamp}`).
- Sensitive routes (`/api/internal/*`, `/__cloudflare/health`) return 404 on the
  apex — they are not exposed as unauthenticated health surfaces. (Internal
  upload-cleanup/scan routes are addressed in Infosec `SEC-OPS-001`.)
- Security headers present on `/api/auth/get-session`: HSTS preload, nosniff,
  X-Frame-Options DENY, Referrer-Policy no-referrer.
- 404 page is served (Next.js 404 surface works).

## HTTP probes against the `*.workers.dev` secondary origin

```
GET https://archestimator-proof.philipjonlewis.workers.dev/             308 -> https://archestimator.com/
GET https://archestimator-proof.philipjonlewis.workers.dev/api/health   200
GET https://archestimator-proof.philipjonlewis.workers.dev/api/auth/get-session  308 (canonical-host redirect)
GET https://archestimator-proof.philipjonlewis.workers.dev/__cloudflare/health   404
```

### Workers.dev findings

- Secondary origin is live and reachable.
- The canonical-host redirect (`routeCanonicalHostRedirect` in `worker.ts:146`)
  correctly 308s apex-bound paths from the workers.dev origin to
  `archestimator.com`, which is the intended defense documented in Infosec
  `SEC-WORKER-002`. **However**, the workers.dev origin itself still answers
  `/api/health` and can be addressed directly, which is the residual attack
  surface the Infosec pack's UNIT-002 (`workers_dev:false`) is intended to close.
- Cross-reference Infosec `SEC-WORKER-002` (High/Medium): the secondary origin
  is reachable today; the canonical-host redirect is a partial mitigation but
  does not eliminate direct path reachability for non-redirected routes (e.g.
  `/api/health`).

## Provenance

- Probe commands: `dig +short A/CNAME/MX/NS/TXT …`, `/usr/bin/curl -sS -D - …`.
- Workstation date: 2026-07-19 Asia/Manila; probe timestamps in section header.
- No secrets, tokens, or credentials were used. No Cloudflare API write. No
  deploy, no queue send, no email send, no D1 write, no R2 write.

# Evidence & Verification — Next.js / Vercel, Headers & Deploy Readiness

Domain 7 · 2026-06-19 Launch-Readiness Audit · Adversarial verification pass.
Each finding was re-opened against the cited file/line and an attempt made to **refute**
it. Verdicts: confirmed / adjusted / refuted.

## Verification verdicts

### DEPLOY-00 — proxy.ts is the route protection — CONFIRMED (info)
`src/proxy.ts:53` exports `async function proxy(request)`; `:144-146` exports
`config.matcher`. No `middleware.ts` anywhere. Protects `/workshop` (`PROTECTED_PREFIXES`,
`:8`), redirects unauth → `/login` (`:116-122`), enforces closed-beta allowlist
(`:125-135`) and dev-auth bypass (`:65-71`). Accurate. Not a blocker.

### DEPLOY-01 — Report-Only CSP has no report sink — CONFIRMED (medium)
Refutation attempt failed. `next.config.ts:93,163,173` ship
`Content-Security-Policy-Report-Only` with `value: landingReportOnlyCsp` (`:10-21`), which
contains **no** `report-uri`/`report-to`. Repo-wide
`rg "report-uri|report-to|reporting-endpoints|Reporting-Endpoints"` → **0 hits**.
`ls src/app/api/csp-report` → **does not exist**. The Report-Only window genuinely
collects nothing. Confirmed as written.

### DEPLOY-02 — Public/auth routes get zero security headers — CONFIRMED (medium)
`next.config.ts` `async headers()` lists header blocks for exactly: `/`,`/about`,
`/features`,`/pricing`,`/contact` (Report-Only CSP only, `:83-97`); `/share/:path*`
(enforced, `:116`); `/api/share/:path*` (`:130`); `/workshop/:path*` and `/invite/:path*`
(`:158-179`). The routes `/login`, `/privacy`, `/terms`, `/beta` all **exist** as app
segments (`ls src/app` → `login`,`privacy`,`terms`,`beta` present) and appear in **no**
header block → no HSTS, no `X-Frame-Options`, no nosniff, no `Referrer-Policy`, no CSP.
The proxy sets only `Cache-Control` on marketing pages (`src/proxy.ts:77`), not security
headers. `/login` is the credential surface. Confirmed.

### DEPLOY-03 — No robots/sitemap; no global robots policy — ADJUSTED down (medium → low)
The factual claims hold: `ls src/app/robots.ts src/app/sitemap.ts public/robots.txt` →
none; `find public/.well-known/security.txt` → none. **But the severity is inflated.**
The finding's own impact text worries about confidential `/share` content being indexed —
yet `/share`,`/workshop`,`/invite` already carry `X-Robots-Tag: noindex, nofollow`
(`next.config.ts:112` via `shareHardeningHeaders`), so the confidential-content exposure
is already closed by headers. The residual is pure SEO hygiene (no sitemap) + optional
defense-in-depth (a robots disallow behind the existing headers). That is LOW, not MEDIUM.

### DEPLOY-04 — Env readiness names-only — ADJUSTED (scope narrowed; one sub-claim refuted)
- **Confirmed:** `scripts/check-vercel-env-readiness.ts:88` self-documents names-only;
  no t3-env/zod schema exists (`rg "createEnv|@t3-oss|envSchema" src/` → 0 hits); the
  publication secrets (`.env.example:33-35`) are only name-checked; proxy fails **open**
  for non-protected routes when Supabase env is missing (`src/proxy.ts:82-93`).
- **REFUTED sub-claim:** the finding says `getAllowedAppOrigins` "silently produces an
  empty allowed-origins set" and recommends making it throw in production. The actual
  consumer **already throws** — `resolveAuthOrigin` raises `"Missing canonical auth
  origin"` when `allowedOrigins.length === 0 && NODE_ENV==='production'`
  (`src/lib/auth/redirects.ts:69-72`). The auth-redirect path is not a silent foot-gun;
  it fails loud in production. `getAllowedAppOrigins` returning `[]` is by design — the
  consumer guards it.
- Net: the **real** open gap is the publication-secret value/format validation, not the
  origin set. Remediation scoped accordingly. Severity stays medium.

### DEPLOY-05 — X-Powered-By + Permissions-Policy — CONFIRMED (low), overlap corrected
`rg "poweredByHeader" next.config.ts` → none (Next defaults to sending
`X-Powered-By: Next.js`). `rg "Permissions-Policy|Cross-Origin-Opener-Policy"` over
`next.config.ts`+`src/` → none. Confirmed. **Overlap correction:** the prior pack rated
overlap "none", but the 2026-06-01 OWASP roadmap has **R-39 "Standard security headers"**
which explicitly lists Permissions-Policy
(`21-remediation-roadmap.md:78`, `11-api-security-owasp-api-top10.md`). Correct overlap is
**partial: covered-by 2026-06-01-security-owasp R-39** — not net-new.

### DEPLOY-06 — No security.txt — CONFIRMED (low)
`find public/.well-known/security.txt`, `public/security.txt` → none. Accurate. Trivial.

### DEPLOY-07 — staleTimes — CONFIRMED (info)
`next.config.ts:64-67` `staleTimes {dynamic:60, static:180}`, documented intentional
(`:54-63`, current-state Library Optimization). Hand the 60s cross-user assumption to
Domain 8 if multi-collaborator workshop views land before launch. No change.

### DEPLOY-08 — images.remotePatterns — CONFIRMED-GOOD (info)
`next.config.ts:31-50` builds patterns solely from `NEXT_PUBLIC_SUPABASE_URL` restricted
to `/storage/v1/object/public/component-images/**`, `search:""`, no wildcard hosts,
returns `[]` if unset. Tight, no SSRF-via-optimizer surface. No security change.

### DEPLOY-09 — Vercel Analytics under enforced CSP on /share — CONFIRMED (info, verify live)
`src/app/layout.tsx:3,40` mount `<VercelWebAnalytics/>` in the **root** layout → renders
on `/share` (enforced CSP). Verified the package URLs:
`node_modules/@vercel/analytics/dist/react/index.mjs:85` returns same-origin
`/_vercel/insights/script.js` in production (covered by `script-src 'self'`); `:80` uses
cross-origin `https://va.vercel-scripts.com/v1/script.debug.js` **only in debug**. So no
production CSP breakage is expected. Residual is the privacy question of analytics on
confidential shared proposals (mitigated by the `beforeSend` redactor). Verify live, do
not assume.

### DEPLOY-10 — git.deploymentEnabled:false — CONFIRMED (info)
`vercel.json:2-4`. CLI-only deploys. Correct safety posture. Document the manual deploy/
rollback runbook; confirm the `check-vercel-production` rollback-drill input has been
exercised once (`rollbackDrillStatus` defaults `not-provided`).

## Reconciliation against prior packs (re-checked)

- **HSTS:** 2026-06-01 OWASP **R-19** ("HSTS header in next.config.ts") was open; it is
  now shipped for `/share`,`/workshop`,`/invite` (`next.config.ts:111`). The prior gap is
  **resolved** for those routes; the *marketing-route* HSTS gap (DEPLOY-02) is the
  remaining piece. Prior-pack status for HSTS: **stale → mostly resolved**.
- **Permissions-Policy:** covered by OWASP **R-39** — DEPLOY-05 overlap corrected to
  partial (above), not "none".
- **CSP Report-Only / unsafe-inline / nonce deferral:** covered by OWASP doc-16 +
  decision D-9. DEPLOY-01 (the missing *report sink*) is genuinely net-new — the prior
  pack discussed the policy, never the absent reporting endpoint.
- **robots/sitemap/security.txt:** no prior pack — net-new (DEPLOY-03/06), confirmed.

## Per-item proof gates

| Item | Local proof (what it CAN prove) | Provider/live proof (what local CANNOT prove) |
|---|---|---|
| DEPLOY-02 public headers | `bun run build` green (Next validates `headers()`); a unit/integration test that imports `next.config.ts` `headers()` and asserts `/login`,`/privacy`,`/terms`,`/beta` now appear with nosniff+frame+referrer+HSTS | `curl -sI https://www.archestimator.com/login` (+ `/privacy`,`/terms`,`/beta`) shows the headers — only verifiable post-deploy |
| DEPLOY-01 CSP report sink | `bun run build` green; unit test on the new `/api/csp-report` route (204, no-store, rejects oversized body); assert `headers()` now emits `Reporting-Endpoints` + `report-to` | A real browser CSP violation actually POSTs to the sink and a log line appears — only on a deployed URL with a live policy violation |
| DEPLOY-03 robots/sitemap | `bun run build`; unit test on `robots.ts`/`sitemap.ts` output (allow/disallow lists, absolute base from env, marketing routes present) | `curl https://.../robots.txt` and `/sitemap.xml`; Search Console fetch — post-deploy |
| DEPLOY-04 env assertion | unit test: `assertProductionEnv()` throws on blank/short secrets and non-https URLs under `NODE_ENV=production`, passes on a valid set; `bun run build` still green | That Vercel's *actual* production env passes — only by running the assertion against the real Vercel env list (or first prod boot via `instrumentation.ts`) |
| DEPLOY-05 powered-by/perm-policy | `bun run build`; assert `headers()` includes `Permissions-Policy`; (X-Powered-By absence is a Next runtime behavior of `poweredByHeader:false`) | `curl -sI` confirms `X-Powered-By` is gone and `Permissions-Policy` present — post-deploy |
| DEPLOY-06 security.txt | file exists, well-formed (Contact/Expires) — static check | `curl https://.../.well-known/security.txt` 200 — post-deploy |
| DEPLOY-09 analytics on /share | none locally beyond the package-URL inspection already done | devtools on a live `/share` page: no CSP violation from analytics — live only |
| DEPLOY-10 deploy/rollback | `check-vercel-production-readiness.ts` parses the transcript | The rollback drill having actually been performed once on Vercel — human/provider |

## Honest limits of local verification

- Header **presence** is fully testable via `next.config.ts`'s `headers()` (it is a pure
  async function) and `bun run build`. Header **delivery on the live edge** (and any
  Vercel-injected defaults like a platform HSTS) is only provable by `curl -sI` against
  the deployed URL — the repo cannot prove what Vercel adds.
- CSP **report delivery** cannot be proven locally at all; it requires a real browser
  hitting a real policy with a real violation. Local tests can only prove the *endpoint
  exists and the header is emitted*.
- `bun run validate` is **known-red on main** (charts set-state-in-effect;
  `ProposalExportPreviewDialog` design-lint; `test:dom` all-phase can hang). Gate on
  **no NEW reds** vs that baseline, not on a fully-green `validate`. Prefer `bun run
  build` + targeted unit tests over the full `validate` for these header/config changes.

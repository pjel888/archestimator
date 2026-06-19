# Remediation Plan — Next.js / Vercel, Headers & Deploy Readiness

Domain 7 · 2026-06-19 Launch-Readiness Audit · Adversarially verified.
Source of findings: `01-AUDIT-FINDINGS.md` (verdicts in `03-EVIDENCE-AND-VERIFICATION.md`).

## Verdict summary

| ID | Title | Sev (final) | Verdict | Launch blocker |
|---|---|---|---|---|
| DEPLOY-00 | Route protection is `src/proxy.ts`, not middleware | info | confirmed | no |
| DEPLOY-01 | Report-Only CSP has no report sink (violations discarded) | medium | confirmed | no |
| DEPLOY-02 | Public marketing/auth routes (`/login`,`/privacy`,`/terms`,`/beta`) get ZERO security headers | medium | confirmed | no |
| DEPLOY-03 | No `robots.txt`/`sitemap`; no global robots policy | medium → low | adjusted (down) | no |
| DEPLOY-04 | Env readiness validates names only; no value/format check | medium | adjusted (scope) | no |
| DEPLOY-05 | `X-Powered-By` not disabled; no `Permissions-Policy` | low | confirmed | no |
| DEPLOY-06 | No `security.txt` | low | confirmed | no |
| DEPLOY-07 | `staleTimes` router-cache reuse | info | confirmed | no |
| DEPLOY-08 | `images.remotePatterns` scoped to Supabase | info | confirmed-good | no |
| DEPLOY-09 | Vercel Analytics under enforced CSP on `/share` | info | confirmed (verify) | no |
| DEPLOY-10 | `git.deploymentEnabled:false` deliberate | info | confirmed | no |

**Launch blockers: 0.** Production is already live; the token/authed surfaces
(`/share`,`/workshop`,`/invite`) are well-hardened. Every actionable item is small,
additive, and Vercel-revertible. This is a *wider-beta hardening* roadmap, not a
first-deploy gate.

---

## Priority 1 — Close the public-route header gap (DEPLOY-02)

**Why first:** `/login` is the credential surface for the wider beta and currently
ships with no anti-clickjacking, no nosniff, no HSTS, no Referrer-Policy. `/privacy`,
`/terms`, `/beta` are equally bare. This is the single highest-value hardening win and
the only finding touching the auth entry point.

**Files:** `next.config.ts` (`async headers()`).

**Steps:**
1. Define a `publicHardeningHeaders` array = `shareHardeningHeaders` **minus**
   `X-Robots-Tag` (marketing pages want indexing — coordinate with DEPLOY-03) **and**
   relax `X-Frame-Options` from `DENY` to `SAMEORIGIN` for marketing pages if any
   same-origin embedding is desired; otherwise `DENY` is fine (no current iframes).
2. Extend the `landingReportOnly` block's source list to add `/privacy`, `/terms`,
   `/login`, `/beta`, OR add a second block that applies `publicHardeningHeaders`
   (nosniff + frame + referrer + HSTS) to **all** of
   `/`,`/about`,`/features`,`/pricing`,`/contact`,`/privacy`,`/terms`,`/login`,`/beta`.
   Keep the Report-Only CSP only on the marketing pages that already have it, or extend
   it to the new routes too (low risk — same policy already ships on `/workshop`).
3. Decide indexing per route: marketing pages get **no** `X-Robots-Tag` (indexable);
   `/login`,`/beta` should get `X-Robots-Tag: noindex, nofollow` (do not index the auth/
   beta gate). This is where DEPLOY-02 and DEPLOY-03 intersect — resolve them together.

**Risk:** Low. Header-only, build-time validated by Next, revertible. Watch: applying
`X-Frame-Options: DENY` to `/login` is correct (no legitimate iframe of login) but
confirm no embedded OAuth/preview flow relies on framing.
**Effort:** S.
**Dependencies:** Coordinate `X-Robots-Tag` decision with DEPLOY-03. No cross-domain dep.

---

## Priority 2 — Give Report-Only CSP a real report sink (DEPLOY-01)

**Why:** Report-Only CSP on `/`,`/workshop`,`/invite` currently has **no** `report-to`/
`report-uri` and there is no `/api/csp-report` route (verified: repo-wide grep returns
nothing). Browsers compute violations and discard them, so the "observation window" the
config comments repeatedly cite (D-9) collects **zero** data. The deferral to enforce
CSP / drop `unsafe-inline`/`unsafe-eval` becomes permanent by construction — you can
never gather the evidence to flip it.

**Files:**
- `next.config.ts` — add a `Reporting-Endpoints: csp-endpoint="/api/csp-report"`
  response header to the Report-Only blocks, and append `report-to csp-endpoint` to the
  CSP value (modern). Optionally also `report-uri /api/csp-report` for older-browser
  coverage.
- New `src/app/api/csp-report/route.ts` — minimal `POST` handler, `no-store`, parses
  the `application/reports+json` (report-to) and legacy `application/csp-report` bodies,
  logs to the existing observability sink (the same place server logs go), returns `204`.
  Rate-limit/size-cap the body (cap at e.g. 16KB, ignore malformed) to avoid log-spam DoS.

**Risk:** Low-medium. Additive. The one risk is a noisy or unbounded endpoint — cap body
size, do not echo input, no DB writes. Because adding a report sink is the on-ramp to the
*deferred* nonce/enforced-CSP work (security-coordinated), if you also start tightening
the policy this item escalates into HIGH-BLAST-RADIUS and the Codex review gate applies.
Adding only the sink (no policy change) stays lightweight.
**Effort:** M.
**Dependencies:** Feeds the deferred CSP-nonce work (D-9, security domain). No hard dep to land the sink alone.

---

## Priority 3 — Robots / sitemap / per-route indexing policy (DEPLOY-03, adjusted to LOW)

**Why (and why downgraded):** The prior auditor rated this MEDIUM. Adjusted to **LOW**:
the *confidential* surfaces (`/share`,`/workshop`,`/invite`) already ship
`X-Robots-Tag: noindex, nofollow` via `shareHardeningHeaders`, so there is **no
confidential-content indexing exposure** — the real risk DEPLOY-03's own evidence
worried about is already mitigated by headers. The residual is **SEO hygiene** (no
sitemap → weaker/slower indexing of marketing pages) and **defense-in-depth** (a
`robots.txt` disallow as a second layer behind the headers), neither of which is a
hardening or security gap. Keep it, but it is a polish item.

**Files:**
- New `src/app/robots.ts` — `MetadataRoute.Robots`: allow `/`; disallow `/api`,
  `/workshop`, `/invite`, `/share`, `/login`, `/beta`, `/auth`; reference the sitemap.
- New `src/app/sitemap.ts` — `MetadataRoute.Sitemap` listing the marketing routes only
  (`/`,`/about`,`/features`,`/pricing`,`/contact`,`/privacy`,`/terms`). Use
  `getAllowedAppOrigins()[0]` / `NEXT_PUBLIC_APP_URL` for the absolute base — do **not**
  hardcode the domain.

**Risk:** Low. Net-new files, no behavior change to existing routes. Watch: a wrong
`Disallow` could de-index marketing pages — keep the allow/disallow lists explicit and
verify with the post-deploy curl gate.
**Effort:** S.
**Dependencies:** Resolve the `X-Robots-Tag` per-route decision jointly with DEPLOY-02.
Partly Domain 11 (SEO) — hand the sitemap content/priority tuning to that domain.

---

## Priority 4 — Production env value/format assertion (DEPLOY-04, scope adjusted)

**Why (scope correction):** The prior finding claimed `getAllowedAppOrigins` "silently
produces an empty allowed-origins set" and recommended making it throw in production.
**That is already done:** `resolveAuthOrigin` (the consumer) throws
`"Missing canonical auth origin"` when `allowedOrigins.length === 0` and
`NODE_ENV==='production'` (`src/lib/auth/redirects.ts:69-72`). So the auth-redirect path
already fails loud — that part of DEPLOY-04 is **refuted**. The real, still-open gap is
narrower: the **publication secrets** (`PUBLICATION_TOKEN_ENCRYPTION_SECRET`,
`PUBLICATION_TOKEN_HASH_SECRET`, `PUBLICATION_ACCESS_COOKIE_SECRET`, `.env.example:33-35`)
and the proxy's fail-**open** for non-protected routes when Supabase env is missing
(`src/proxy.ts:82-93`) have **no boot/format validation** — a blank or short secret
surfaces only as a runtime decrypt failure when a user hits `/share`. The proxy already
fails *closed* (redirect to login) for protected routes when Supabase env is missing,
which is correct.

**Files:**
- New `src/lib/env/assert-production-env.ts` — no new dependency, no t3-env (confirmed
  none exists). Export an `assertProductionEnv()` that, when `NODE_ENV==='production'`,
  throws on: blank/short publication secrets (min length, e.g. ≥ 32 chars); non-absolute
  or non-`https` `NEXT_PUBLIC_APP_URL`/`NEXT_PUBLIC_SITE_URL`; missing
  `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY`;
  `CLOSED_BETA_ACCESS_ENABLED` not a parseable bool.
- Import it once from a server boot path that runs at startup (e.g. an
  `instrumentation.ts` `register()` hook — the canonical Next way to run code once on
  server boot — guarded to the `nodejs` runtime). Do **not** import into the edge proxy
  (it must stay lean and the publication secrets are server-only).
- Optionally extend `scripts/check-vercel-env-readiness.ts` to *also* assert min-length
  for the publication-secret group when values are provided (it self-documents as
  names-only at `:88`; keep that mode, add an opt-in value-check mode).

**Risk:** Medium. A too-strict assertion could hard-fail a previously-working production
boot — scope the throw to genuinely production-critical vars, test with the real Vercel
env list before enabling, and make the failure message name the offending var. Do not
throw in preview/dev. Verify `instrumentation.ts` runs in the Node runtime (it will not
run env-throwing logic under the edge runtime).
**Effort:** M.
**Dependencies:** None in-domain. Touches the publication/auth surface (Domains 1/2) —
keep the assertion list in sync with their canonical required-env set; coordinate the min
length for the publication secrets with whoever owns the crypto (Domain 7-crypto/OWASP R-7).

---

## Priority 5 — Cheap hardening: `poweredByHeader` + `Permissions-Policy` (DEPLOY-05)

**Files:** `next.config.ts`.
**Steps:**
1. Add `poweredByHeader: false` at the top level of `nextConfig` (removes
   `X-Powered-By: Next.js`).
2. Add `Permissions-Policy: camera=(), microphone=(), geolocation=(), browsing-topics=()`
   to `shareHardeningHeaders` (and thus to the public block from DEPLOY-02). Optionally
   add `Cross-Origin-Opener-Policy: same-origin`.
**Risk:** Low. Confirm no feature relies on the disabled APIs (the app uses none of
camera/mic/geo). COOP can break cross-origin popups — only add it after confirming the
OAuth/Supabase auth popup flow is same-origin or uses redirect.
**Effort:** S.
**Dependencies:** Overlaps OWASP **R-39** ("Standard security headers") — fold this into
that roadmap item rather than re-tracking separately.

---

## Priority 6 — `security.txt` (DEPLOY-06)

**Files:** New `public/.well-known/security.txt` (Contact, Expires, Policy, Preferred-Languages).
**Risk:** None. Static file.
**Effort:** S.
**Dependencies:** None. Set a realistic `Expires` and a real contact (mailto or form URL).

---

## No-action items (record only)

- **DEPLOY-00 / DEPLOY-07 / DEPLOY-08 / DEPLOY-10** — confirmed and correct as-is; no
  code change. DEPLOY-00: add a one-line note to `current-state.md` that Next 16 route
  protection lives in `src/proxy.ts` (not `middleware.ts`) so future auditors don't
  conclude there is no edge auth.
- **DEPLOY-09** — no config change *if* the same-origin analytics script is confirmed
  live. Production loads `/_vercel/insights/script.js` (same-origin, covered by
  `script-src 'self'`); only the debug build uses `https://va.vercel-scripts.com`. Verify
  once on a live `/share` page (devtools → no CSP violation). If analytics on confidential
  shared proposals is undesirable, gate `<VercelWebAnalytics/>` out of the `/share`
  segment — that is a product/privacy call, not a launch blocker.

## Suggested execution order

DEPLOY-02 → DEPLOY-05 (same file, same PR) → DEPLOY-06 → DEPLOY-03 (resolve robots
decision with 02) → DEPLOY-01 → DEPLOY-04. Items 02/05/06/03 are a single small
header+static PR; 01 and 04 are independent follow-ups.

# 16 — CSP / Header Threat Model

The third pass takes the Codex threat model (CSP relaxation, missing headers) and applies it to the CSP and security header configuration. The CSP configuration is in `next.config.ts:6-17` and is enforced on share routes, Report-Only on landing.

## CSP configuration (third-pass reconfirmation)

### `next.config.ts:6-17` — base CSP

```
default-src 'self'
base-uri 'self'
frame-ancestors 'none'
object-src 'none'
form-action 'self'
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://www.clarity.ms
style-src 'self' 'unsafe-inline'
img-src 'self' data: blob: https://*.supabase.co https://www.google-analytics.com https://www.googletagmanager.com https://*.clarity.ms
font-src 'self' data:
connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.google-analytics.com https://region1.google-analytics.com https://www.clarity.ms https://*.clarity.ms
```

### `next.config.ts:60-100` — header routing

- **Landing (`/`, `/about`, `/features`, `/pricing`, `/contact`):** `Content-Security-Policy-Report-Only` with the base CSP value
- **Share page (`/share/:path*`):** `Content-Security-Policy` enforced with the same base CSP value
- **Share API (`/api/share/:path*`):** 3 security headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer-when-downgrade`

### Codex-driven CSP threat model (third-pass)

#### SEC-20260601-3P-016 — Landing CSP includes `'unsafe-inline'` and `'unsafe-eval'` (Low, new)

**Codex claim:** "The CSP includes `'unsafe-inline'` and `'unsafe-eval'` in `script-src` on the landing page."

**Verdict:** **Confirmed (Low).** This is a design choice, not a finding. The landing page uses inline scripts (Clarity analytics) and may use eval-based libraries. The Report-Only mode lets the team monitor violations before enforcing.

**Recommendation:** Consider migrating to nonce-based or hash-based CSP for the landing page in the future. The current posture is acceptable for a marketing page. (R-3P-09 — informational)

#### F-SHARE-12 — `frame-ancestors 'none'` (Info, restated)

**Evidence:**
- `next.config.ts:9` — `frame-ancestors 'none'` in the base CSP source list
- Applies to both landing and share routes (Report-Only vs enforced)

**Verdict:** **Confirmed.** Strong clickjacking defense.

#### F-ERR-05 — CSP Report-Only on landing (Info, restated)

**Evidence:**
- `next.config.ts:60-75` — landing uses `Content-Security-Policy-Report-Only`

**Verdict:** **Confirmed.** Design choice. The team can monitor violations before enforcement.

#### EG-20260601-3P-002 — HSTS header status in production (Yes-blocks)

**Evidence:**
- `next.config.ts` does not set `Strict-Transport-Security`
- Vercel's default behavior may include HSTS, but this is not verifiable from the repo

**Verdict:** **Confirmed (evidence gap).** R-19 is restated.

## Security headers on share API (third-pass reconfirmation)

| Header | Value | Verified |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | Yes (`next.config.ts:95`) |
| `X-Frame-Options` | `DENY` | Yes (`next.config.ts:96`) |
| `Referrer-Policy` | `no-referrer-when-downgrade` | Yes (`next.config.ts:97`) |

These are enforced on `/api/share/:path*`. The third pass confirms they are present.

## Missing security headers (third-pass)

The following security headers are **not** present in `next.config.ts`:

- `Strict-Transport-Security` (R-19, EG-20260601-3P-002)
- `Permissions-Policy` (R-3P-10 — informational)
- `Cross-Origin-Opener-Policy` (COOP) (R-3P-10 — informational)
- `Cross-Origin-Embedder-Policy` (COEP) (R-3P-10 — informational)
- `Cross-Origin-Resource-Policy` (CORP) (R-3P-10 — informational)

**Recommendation:** Add these to `next.config.ts` headers. (R-3P-10 — informational, Low priority)

## Net change to CSP/header threat model (third-pass)

| Item | 1P | 2P | 3P |
|---|---|---|---|
| CSP on share routes | Info | Info | **Info (restated)** |
| CSP Report-Only on landing | Info | Info | **Info (restated)** |
| `frame-ancestors 'none'` | Low | Info | **Info (restated, verified)** |
| `'unsafe-inline'` / `'unsafe-eval'` on landing | (not surfaced) | (not surfaced) | **Low (SEC-20260601-3P-016, design choice)** |
| HSTS missing | (mentioned) | (evidence gap) | **Yes-blocks (EG-20260601-3P-002)** |
| Permissions-Policy, COOP, COEP, CORP | (not surfaced) | (not surfaced) | **Low (R-3P-10, informational)** |

## Cross-references

- See `02_CODEX_THREAT_MODEL_INVENTORY.md` Codex claims #11, #32, #33, #34, #35
- See `04_FINDING_RECONCILIATION_MATRIX.md` for mapping
- See `08_EVIDENCE_GAP_REGISTER_DELTA.md` EG-20260601-3P-002

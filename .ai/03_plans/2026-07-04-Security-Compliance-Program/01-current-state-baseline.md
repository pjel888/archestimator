# 01 — Current State Baseline and File Map

**Purpose:** Inventory of existing security/privacy controls in the Archestimator repo, with concrete file paths that P0/P1/P2 implementation will touch.

**Verification status:** File paths cited from owner analysis and repo README are listed as `[owner-cited]`. Paths confirmed by explore agent (`bg_dc3bdd99`) are marked `[verified]`. Unverified paths are `[pending — see ASSUMP-001]`; re-verify before editing in execution phase.

---

## 1.1 Existing security baseline (already in place)

These controls are why the user analysis calls Archestimator "not weak technically":

| Control | Status | Source |
|---|---|---|
| Protected workshop routing + terms gating | In place | `[owner-cited]` via `src/middleware.ts` (re-exports Better Auth route gate from `src/lib/auth/request-proxy.ts`) |
| App-layer D1 authorization (every data path) | In place | `[owner-cited]` repository helpers under `src/lib/repositories/`; server actions under `src/lib/*/actions.ts` |
| Prepared D1 access checks (no string interpolation) | In place | `[owner-cited]` repository layer |
| Private uploads (R2-backed) | In place | `[owner-cited]` `wrangler.jsonc` R2 binding `ARCH_UPLOADS_R2`; upload API at `src/app/api/component-library/attachments/` |
| MIME / magic-byte validation | In place | `[owner-cited]` upload admission path |
| `no-store` / `nosniff` responses | In place | `[owner-cited]` security headers middleware |
| Signed share-link cookies | In place | `[owner-cited]` `src/lib/publication/` |
| CSRF on public share mutations | In place | `[owner-cited]` `src/app/api/share/[token]/` |
| Durable public rate limits | In place (public surfaces) | `[owner-cited]` |
| CodeQL `security-extended` + `security-and-quality` | In place | `[owner-cited]` `.github/workflows/ci.yml` |
| Pinned GitHub Actions (by SHA) | In place | `[owner-cited]` `.github/workflows/*.yml` |
| Dependabot (npm + GitHub Actions) | In place | `[owner-cited]` `.github/dependabot.yml` |
| CI validates + builds + E2E smoke | In place | `[owner-cited]` `package.json` scripts: `bun run validate`, `bun run build`, `bun run test:e2e` |

Cloudflare migration is complete: `package.json` has zero `@supabase/*` packages; `wrangler.jsonc` is the active deploy substrate with bindings D1 `ARCH_DB`, R2 `ARCH_UPLOADS_R2`, DO `COLLAB_ROOMS`, Queue `UPLOAD_JOBS_QUEUE`, Email `EMAIL`, Images `IMAGES`.

---

## 1.2 File map — surfaces this plan pack will touch

| Surface | Path | Code | Status | P0/P1/P2 owner |
|---|---|---|---|---|
| **Trust page** (public claims about RLS / Postgres / OWASP) | `src/app/trust/page.tsx` — verified overclaims at lines **92, 160, 162** ("Postgres" rate limiting, "Row-level security enforced on every table") | `[TRUST-CLAIM]` | `[verified 2026-07-04 via rg]` | **P0.1** — first fix |
| **Privacy page** (beta-grade notice) | `src/app/privacy/page.tsx` | `[PRIVACY-NOTICE]` | `[verified 2026-07-04 via ls]` | **P1.1** — full notice rewrite |
| **Middleware (route gate)** | `src/middleware.ts` (re-exports `src/lib/auth/request-proxy.ts`) | `[CSP]`, `[CSRF]` | `[owner-cited]` | **P0.2**, **P0.3** |
| **CSP configuration** (currently Report-Only with `unsafe-inline` + `unsafe-eval`) | **Not found in `src/` via rg** — likely in `wrangler.jsonc`, `_worker.js`, or OpenNext adapter config. Re-verify at P0.2 start. | `[CSP]` | `[pending — rg returned no hits in src/]` | **P0.2** |
| **Security headers** (`X-Frame-Options`, `X-Content-Type-Options`, `Cache-Control`, `Referrer-Policy`) | Same location as CSP | `[CSP]` | `[pending — see ASSUMP-001]` | **P0.2** |
| **Upload admission** (in-memory `Map` for request buckets) | Likely under `src/app/api/component-library/attachments/route.ts` or `src/lib/component-library/` | `[UPLOAD-RL]` | `[pending — see ASSUMP-001]` | **P0.4** |
| **Upload active-quota tracker** (in-memory `Map`) | Same area as admission | `[UPLOAD-RL]` | `[pending — see ASSUMP-001]` | **P0.4** |
| **File scan state gate** (blocks pending/infected/unsupported/failed) | Likely in `src/lib/component-library/attachments-*` or `src/app/api/component-library/attachments/` | `[SCAN]` | `[pending — see ASSUMP-001]` | **P1.7** |
| **Publication telemetry HMAC** (correct model, with pepper) | `src/lib/publication/security.ts` lines **1, 79, 212, 451** — uses `createHmac("sha256", secret)` properly | `[HASH-HMAC]` (positive reference) | `[verified 2026-07-04 via rg]` | Reference for **P0.6** migration |
| **Account audit event hashing** (plain SHA-256 — the bug) | `src/lib/auth/account-audit.ts:3,25` — `import { createHash } from "node:crypto"`; `return sha256:${createHash("sha256").update(value).digest("hex")}`. **Plain SHA-256, NOT HMAC.** Companion store at `src/lib/auth/account-audit-d1-store.ts`. | `[HASH-HMAC]` (negative — the gap) | `[verified 2026-07-04 via rg]` | **P0.6** |
| **CSRF protection on share mutations** | `src/app/api/share/[token]/` | `[CSRF]` (positive reference) | `[owner-cited]` | Reference for **P0.3** audit |
| **Cloudflare observability config** | `wrangler.jsonc` (`observability`, `logs`); possibly `tail_consumers` | `[OBS-GOV]` | `[pending — see ASSUMP-001]` | **P0.6+**, **P2.5** |
| **Cron schedule** (existing `0 3 * * *`, `15 3 * * *`) | `wrangler.jsonc` `[triggers]` crons | `[RETENTION]` | `[owner-cited]` | **P1.8** extends |
| **Rate-limit / public route middleware** | Likely `src/lib/auth/request-proxy.ts` or middleware helper | `[UPLOAD-RL]`, `[CSRF]` | `[pending — see ASSUMP-001]` | **P0.4** coordination with `2026-07-02-API-Rate-Limiting-Security-Consolidation` |
| **Legacy Supabase OAuth callback** (still in routes per README) | `src/app/auth/callback/` | `[API-Top10]` API9 inventory | `[verified 2026-07-04 via find]` | **P0.3** inventory — verify clearly marked as migration archaeology |
| **Repo data retention events table** (does not yet exist) | New migration in `migrations/00XX_data_retention_events.sql` | `[RETENTION]` | Not yet created | **P1.8** creates |

---

## 1.3 Cloudflare bindings (verified from `wrangler.jsonc` per README + AGENTS.md)

| Binding | Name | Resource | Relevance |
|---|---|---|---|
| D1 | `ARCH_DB` | `archestimator-proof-db` (id `9bdb29bb-687e-4f51-ae81-7659c426ea5f`) | All compliance artifacts that need persistence (privacy_requests, data_retention_events, HMAC pepper rotation log) |
| R2 | `ARCH_UPLOADS_R2` | `archestimator-proof-uploads` | Upload scanner DLQ; retention enforcement |
| Durable Object | `COLLAB_ROOMS` | class `CollaborationRoom` (SQLite-backed) | Possible rate-limit counter backing (P0.4 alternative) |
| Queue | `UPLOAD_JOBS_QUEUE` (+ DLQ) | `archestimator-upload-jobs` | Scan job pipeline (P1.7) |
| Email | `EMAIL` | Cloudflare Email Service | DSAR intake alias; breach notification |
| Images | `IMAGES` | Cloudflare Images | Out of scope for compliance work |
| Cron | `0 3 * * *`, `15 3 * * *` | — | Extend with retention crons (P1.8) |

**Cost posture:** Free-tier / bundled only. No paid add-ons without explicit owner approval (`AGENTS.md` standing authorization).

---

## 1.4 What is NOT in the baseline (gap summary, by section)

- **Standards mapping:** No ASVS control matrix; no API Top 10 (2023) test matrix → P2.1, P2.2
- **CSP maturity:** Report-Only + `unsafe-inline` + `unsafe-eval` → P0.2
- **Durable rate limits for uploads/auth:** in-memory Maps → P0.4
- **File scanner wiring:** state machine, no real AV → P1.7
- **Trust page accuracy:** overclaims RLS / Postgres → P0.1
- **Privacy operations:** no RoPA, no DSAR workflow, no breach runbook, no processor register → P0.5, P1.1-P1.5
- **Retention schedules:** undefined → P1.8
- **Hashing consistency:** account audit uses plain SHA-256; publication telemetry correctly uses HMAC → P0.6
- **Observability governance:** logs persisted without defined retention / redaction / access review → P2.5
- **Vulnerability disclosure:** no `security.txt`, no intake → P1.6

---

## 1.5 Verification log

**2026-07-04 — Improvement-audit direct Read verification (lead coordinator, OpenCode/Sisyphus):**

The following 4 load-bearing paths were VERIFIED directly via `Read` (not via the cancelled explore agent) with exact line citations. See `08-scorecard-and-improvement-record.md` §4 for the full verification matrix.

| Path | Lines verified | Snippet | Verdict |
|---|---|---|---|
| `src/app/trust/page.tsx` | 92, 160, 162 | "Rate limiting is Postgres, not Redis" / "Durable composite-key rate limiting with Retry-After (Postgres)" / "Row-level security enforced on every table" | ✅ EXACT MATCH |
| `src/lib/auth/account-audit.ts` | 1, 3, 24-26, 48-51 | `import "server-only"` / `import { createHash } from "node:crypto"` / plain SHA-256 hashAccountSecurityValue / **NEW FINDING**: silent error swallowing in recordAccountSecurityEvent catch block | ✅ EXACT MATCH + RISK-016 added |
| `src/lib/publication/security.ts` | 1, 79, 212, 451 | createHmac imports / hashPublicationToken / signPublicationAccessCookiePayload / signSharedLinkSessionCookiePayload | ✅ EXACT MATCH |
| `wrangler.jsonc` | 22-24, 25-29, 30-36, 37-44, 45-58, 59-64, 65-81, 82-96 | All 7 bindings verified: Images, Email, R2, D1, DO, Crons, Queue+DLQ, observability (sampling 0.1 logs / 0.05 traces, persist:true) | ✅ EXACT MATCH |

**2026-07-04 (lead-author direct grep):** Trust page overclaims, publication HMAC, account-audit plain SHA-256, and auth callback legacy path all verified directly via `rg` / `find`. Trust page line citations: 92, 160, 162. Account-audit hashing bug confirmed at `src/lib/auth/account-audit.ts:3,25`. Publication HMAC reference confirmed at `src/lib/publication/security.ts:1,79,212,451`.

**Still pending verification at execution phase** (`[pending — see ASSUMP-001]`):
- CSP configuration location (rg in `src/` returned no hits — investigate `wrangler.jsonc`, OpenNext adapter, or `_worker.js` header transforms at P0.2 start)
- Upload admission path (P0.4)
- File scan-state gate location (P1.7)
- Cloudflare observability config details (P0.6+, P2.5)
- Rate-limit / public route middleware exact location (P0.4)

Any path still pending at execution start triggers a stale-plan revalidation per README checklist. The original explore agent (`bg_dc3bdd99`) was cancelled after 23 minutes without returning; direct `rg` / `find` calls covered the most critical surfaces with lower latency.

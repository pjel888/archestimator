# 09 — Performance, Reliability, and Observability

## 1. Performance profile

The continuity path is **low-performance-risk**: mostly static public pages and one new server action. The only user-perceived-latency-sensitive transitions are the landing page LCP and the login→workshop redirect chain.

### 1.1 Public pages (already `force-static`)
- `/`, `/new`, `/terms`, `/privacy`, `/security`, `/trust`, `/contact`, `/cookies` (new) — all statically rendered at build, CDN-cached (`s-maxage=31536000` for marketing routes per `request-proxy.ts`).
- Adding footer links, a legal line, a `/cookies` page, and metadata exports does **not** change render cost: still static HTML, no new data fetch, no new client JS.
- **Bundle impact:** zero new client JS for Phases 1, 2 (footer/legal/cookies are server-rendered `<a>`/text). Phase 3 may add a tiny Client wrapper for receipt UX (optional; progressive-enhancement form preferred → zero JS required to submit).

### 1.2 `requestBetaAccess` server action
- 3 D1 statements (rate-limit check + rate-limit insert + audit insert) per call. Indexed lookups.
- p50 target: <300ms (D1 from Workers is typically <100ms for indexed point lookups; three sequential ≈ <300ms).
- No payload size concern (small form). Length-capped inputs.

### 1.3 Login → workshop transition (the continuity-hot path)
- Existing: `/login` (cacheable, client island) → Better Auth callback → `/workshop` → terms gate → dashboard.
- **Redirect count:** anonymous visits `/workshop` → proxy → `/login?next=/workshop` → auth → `/workshop` → (terms) → `/workshop/terms` → accept → `/workshop`. This is the existing chain; the pack does **not** lengthen it.
- **Risk to guard:** the new first-project CTA + onboarding redirect must not add a redirect hop. `/workshop/onboarding` → `/workshop/projects` (one redirect, same as today's one redirect to settings — no net increase).

## 2. Performance evaluator contract (PERF-CONT)

| Field | Value |
|---|---|
| **Baseline metric** | `/` LCP, `/` TTFB, `/login` TTFB, redirect count on `/workshop` bounce |
| **Target** | `/` LCP ≤ 2.5s p75 (existing budget), `/` TTFB ≤ 600ms p75, `/login` TTFB ≤ 600ms p75, redirect count ≤ existing (no increase) |
| **Measurement** | `e2e/landing-audit.spec.ts` already captures domInteractive/DCL/load/transfer for `/`. Add: redirect-count assertion on the `/workshop` bounce (Playwright) + `/login` TTFB. Local Playwright is the declared evaluator for the browser-only claims; production RUM is a rollout gate (DOM-CONT). |
| **Fixture size** | n/a (static routes); for `requestBetaAccess`, mock D1 (unit test, not perf) |
| **Runs / flake** | Playwright: 3 runs, take median; flake policy: re-run once on failure, investigate on 2nd failure |
| **Regression threshold** | LCP/TTFB +15% vs baseline OR any new redirect hop → fail |
| **Related functional tests** | `landing-audit.spec.ts`, new `landing-cta-continuity.test.tsx`, new continuity contract test |
| **Evidence artifact** | Playwright HTML report committed to run log; perf metrics recorded in `19` |

**Note:** passing ordinary unit tests is **not** the perf evaluator; the Playwright landing audit + the redirect-count assertion are. Production RUM/CWV proof is a rollout gate (sibling `2026-07-07-production-rum-and-cwv-telemetry` pack owns the RUM surface; this pack only requires no regression).

## 3. Core Web Vitals impact
- **LCP:** unchanged (no new hero asset; `/og/default.png` missing is a pre-existing gap — Phase 2 optionally adds the asset, which would *improve* OG sharing but is not a CWV input for LCP).
- **CLS:** footer link additions are static; no layout shift after hydration if implemented with reserved space (existing footer is end-of-page, minimal CLS risk).
- **INP:** Phase 3 ClosedBetaGate receipt — use progressive-enhancement form (no JS INP cost) or a minimal Client action (negligible INP).

## 4. Bundle / RSC / payload
- **Client JS:** zero net change for Phases 1, 2, 5 (server-rendered). Phase 3 optional small Client wrapper.
- **RSC payload:** negligible (footer links + legal line + receipt text are tiny).
- **API payload:** `requestBetaAccess` returns a tiny DTO.

## 5. Reliability
- **`requestBetaAccess` failure modes:** D1 transient error → return a friendly "Something went wrong, please try again" (do not silently fail; do not expose D1 error). Rate-limit exhaustion → uniform throttled message. Honeypot trip → silent fail-closed (appear successful).
- **Welcome-email failure:** `sendCloudflareEmail` returns `EMAIL_NOT_CONFIGURED`/`EMAIL_BINDING_MISSING` → log + skip (REL-CONT-01); **workshop entry must not block**. Circuit breaker (existing `transactional-email-client.ts`) protects against cascading.
- **Dashboard CTA:** data already server-fetched; if `projectCount` fetch fails, existing dashboard error boundary handles it (CTA simply doesn't render — acceptable degradation).

## 6. Observability
- **`requestBetaAccess`:** structured log (email redacted to prefix/suffix, IP-hash, result). Audit row in `account_security_events` (per `21` A.1). Reuse existing log redaction rules.
- **Welcome email:** security event (`welcome_email_sent`), structured log on success/failure/skip.
- **No new dashboard/alert** required for closed beta (proportionality). Phase 4 failures observable via logs + security events. If email failure rate exceeds circuit-breaker threshold, the existing breaker trips.
- **Metrics sink:** none added (closed-beta scale doesn't justify it); record this as an intentional skip.

## 7. Rollout performance gates (summary; full in `13`)
- **Merge gate:** tests green (incl. new continuity + perf evaluator), `bun run type-check`, `bun run lint`.
- **Closed-beta rollout:** hosted smoke of full path against `archestimator.com`; redirect-count + LCP/TTFB within threshold.
- **Production:** email deliverability proof (Phase 4) + domain confirmation (OPEN-CONT-05).

## 8. Known gaps
- **Production RUM** is owned by the sibling `production-rum-and-cwv-telemetry` pack; this pack requires "no regression" via local Playwright only and records hosted RUM as an external dependency.
- **`/og/default.png`** missing asset (G11) — Phase 2 can add it (improves sharing), but OG image generation is out of scope (no dynamic OG route needed for closed beta).

## 9. Cloudflare Email Service cost / eligibility budget (Phase 4)

Per Improve-Plan-Prompt §9 (cost/resource budget for metered email). Phase 4 (welcome email) is the only metered-service addition in this plan.

| Field | Value | Source/proof |
|---|---|---|
| Resource | Cloudflare Email Service (`EMAIL` binding) | `wrangler.jsonc`; `cloudflare-email-client.ts` |
| Cost class | **NOT VERIFIED at planning time** — Cloudflare Email Service send limits/eligibility (daily/hourly caps, allowed recipient domains, verified-sender requirements) must be confirmed by the owner against the current plan/entitlement before enabling. | owner must verify (OPEN-CONT-04) |
| Volume estimate | 1 send per new enabled user (idempotent). Closed-beta scale: tens to low hundreds of sends total. No batch/digest volume from this plan. | derived from closed-beta stage |
| Failure mode if over-quota / not-eligible | `sendCloudflareEmail` returns an error → circuit breaker (`transactional-email-client.ts`) trips after >50% failure in 5-min window → welcome send skipped gracefully (REL-CONT-01); workshop entry unaffected. | repo evidence |
| Eligibility gate | `ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED=true` + valid `CLOUDFLARE_EMAIL_FROM` (verified sender) required before any send. Default `.env.example` ships disabled. | `.env.example`; `07` §7 |
| Cost risk | Low at closed-beta volume, but **unverified** — do not claim "free" or "within limits" without owner confirmation of the entitlement. | labeled NOT VERIFIED |
| Rollout gate | Email deliverability proof (real inbox, non-spam) at L3 before claiming the welcome email "works." | `13` §1 |

**Honest gap:** the plan does not cite exact Cloudflare Email send limits because (a) they depend on the account entitlement the owner must confirm, and (b) the Improve-Plan audit correctly flagged the prior draft for omitting this budget entirely. This section records the budget *structure* and marks the exact-limit claim `NOT VERIFIED` rather than inventing a number.

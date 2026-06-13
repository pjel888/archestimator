# Shared-Link: Stale Doc/Memory Claims Reconciled Against `main` (2026-06-13)

**Type:** Documentation/integrity reconciliation (not a code bug). **Branch:** `main` @ `f1a80c8d`.
**Context:** Produced during the Shared Link Improvement Plan audit (`.ai/03_plans/2026-06-13-Shared-Link-Improvement-Plan/`). Several `.ai` docs and stored memory observations described shared-link defects that **no longer exist on `main`**. Recorded here so future sessions do not re-chase fixed issues.

## Verified FIXED on main (do NOT reopen)

| Stale claim (source) | Reality on main (verified 2026-06-13) | Evidence |
|---|---|---|
| "CSRF permanently broken; hardcoded `client-post` token" (memory obs 5158/5208/5247) | **Fixed.** Comment/decision/password components mint + send a proper CSRF header/cookie pair. | `SharePageComments.tsx:6,145,197`; `SharePageDecision.tsx:6,160`; `ProjectPublicationPasswordForm.tsx:29` (`createPublicationCsrfHeaders` / `x-archestimator-csrf`). No `"client-post"` literal remains in `src/`. |
| "GET /api/share/[token]/activity always 403 (POST-only CSRF guard)" (memory obs 5155/5171) | **Fixed.** Uses GET-safe `assertSameOrigin`; filters `is_internal`. | `activity/route.ts:80`; `assertSameOrigin` exported from `security.ts:228`. |
| "CostDonutChart hydration fix not confirmable / no guard" (first-draft current-state) | **Fixed via deterministic SVG rounding.** `svg-rounding.ts` exists and is imported. | `CostDonutChart.tsx:8` (`roundSvgPath`, `formatSvgNumber`); regression test `tests/vitest/share/cost-donut-chart-hydration.test.tsx`. |
| "Rate limiting is in-memory only (MVP)" (V2 plan) | **Dual-layer; the durable DB limiter is the real control.** | `supabase/migrations/20260601003000_security_rate_limit_events.sql`; `public-repository.ts:193-243`. |
| Comment XSS via `dangerouslySetInnerHTML` (open concern) | **Not present.** Recipient-controlled fields render as text nodes. | grep `dangerouslySetInnerHTML` in `src/components/share/`, `src/app/share/` → zero matches. |

## Spec drift (docs disagree with code — trust the code)

- Spec mentions a public **"Cost Bubble Chart"** on the share page — it does not exist there (bubble chart is workshop-only). The share chart is the per-sheet **donut** (`CostDonutChart` compact).
- Spec calls the encrypted token **`recopy_token`** — the actual column is **`encrypted_token`** (`migration 20260527120000:20`).
- Spec conflates the **password access cookie** (`ae_publication_access_*`) with the **recipient session cookie** (`shared_link_session_*`) — they are distinct and independent.
- COMPLETION-REPORT / memory obs 4651 call **`ShareFloatingTreeNav`** the active nav — it is **dead code** (imported nowhere); the live sidebar is `ShareEstimateTreePanel`.

## Genuinely OPEN (actionable) items found

- **Stale e2e contract:** `e2e/shared-link-receiver.spec.ts:66` asserts `data-testid="sticky-decision-bar"`, which does **not** exist in `SharePageDecision.tsx` (it uses `data-share-decision-bar` / `decision-locked-badge`). The e2e would fail if run — fix before relying on it. (Tracked as S-13 / P-UI-0 in the plan.)
- **Dead code:** remove `ShareFloatingTreeNav` (UX-16 / S-09).
- Open hardening (not bugs): recipient token in URL, unsalted IP/UA hash, CSP `unsafe-inline/eval`, no `noindex` on `/share` — see `06_SECURITY_AUDIT.md` SEC-01/02/05.

**Method:** read-only source reads + grep + an independent adversarial verification pass (19/19 citations confirmed). No code/schema/data changed.

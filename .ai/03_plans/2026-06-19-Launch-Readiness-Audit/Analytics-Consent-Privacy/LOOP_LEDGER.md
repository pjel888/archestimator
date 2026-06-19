# LOOP_LEDGER — Analytics, A/B-Testing & Consent/Privacy (Phase-2 gap pack)

**Pack:** `.ai/03_plans/2026-06-19-Launch-Readiness-Audit/Analytics-Consent-Privacy/`
**Loop type:** lightweight in-session (audit + adversarial verify + remediation plan). Audit-only;
does not own remediation execution. Codex review gate applies to CONSENT-01 Path B / CONSENT-02
legal-copy diffs if/when executed.

---

## DISCOVER
- 13-domain Launch-Readiness audit's coverage critic flagged analytics/A-B/consent as un-audited.
- Prior gap auditor produced `01-AUDIT-FINDINGS.md` (9 findings, CONSENT-01..09; 2 claimed blockers).
- Scope: GA4 (`@next/third-parties`), Microsoft Clarity (inline tag, session replay), Vercel Web
  Analytics (`@vercel/analytics`), landing consent cookie/banner, `ab_test` cookie, bot detection,
  `/privacy` + `terms-content`. No analytics persistence in Postgres.

## PLAN
- Adversarially verify each of the 9 findings against full-file reads; try to refute; correct
  severity/launch_blocker inflation; re-reconcile `existing_plan_overlap`.
- Produce 02-REMEDIATION-PLAN (verify-gate first) + 03-EVIDENCE-AND-VERIFICATION (verdicts incl.
  refutations + honest proof gates).

## EXECUTE (this pass — verification only, READ-ONLY on source + DB)
- Read all scope files: `layout.tsx`, `VercelWebAnalytics.tsx`, `vercel-web-analytics.ts`,
  `LandingAnalyticsLoader.tsx`, `ClarityScript.tsx`, `CookieConsentBanner.tsx`, `PublicPageShell.tsx`,
  `consent.ts`, `useLandingCookieConsent.ts`, `variant-assigner.ts`, `experiment-tracker.ts`,
  `bot-patterns.ts`, `results-calculator.ts`, `experiments.ts`, `privacy/page.tsx`,
  `ABExperimentProvider.tsx`, `terms-content.ts`, `WebVitalsProbe.tsx`, `next.config.ts` (CSP).
- Reconcile reads: `decisions.md` (786, 648), `current-state.md` (2280, 2345, 2423), `known-issues.md` (404).
- No DB query required (no analytics tables; calculator is dead code).

## VERIFY (verdicts)
- **CONSENT-01:** CONFIRMED, scope ADJUSTED (public routes only — `beforeSend` drops `/workshop|/share|/invite`). **V2 verify-gate / no-go until decided or proven.**
- **CONSENT-02:** CONFIRMED content; launch_blocker DOWNGRADED → covered-by existing recorded launch gate (`decisions.md:786`).
- **CONSENT-03:** REFUTED — Vercel Analytics sends NO `/workshop` event (`vercel-web-analytics.ts` returns null).
- **CONSENT-04/06/07/09:** CONFIRMED (low/low/medium/low; none blocking).
- **CONSENT-05/08:** CONFIRMED CLEAN (bot detection UA-only; calculator dead code, no first-party storage).

## RECORD (artifacts written, all inside this pack)
- `02-REMEDIATION-PLAN.md` — prioritized; CONSENT-01 P0 (Path A gate / Path B document+copy);
  CONSENT-02+07 P1; CONSENT-06/04/09 P2; CONSENT-03/05/08 no-action.
- `03-EVIDENCE-AND-VERIFICATION.md` — per-finding verdicts, refutation, severity-correction table,
  honest proof gates (what static reads prove vs. what needs a live Network capture / legal counsel).
- This ledger.

## DECIDE (owner decisions outstanding)
1. **CONSENT-01 (V2 verify-gate / no-go until decided or proven):** choose Path A (consent-gate Vercel Analytics — recommended, S, no
   legal opinion needed) OR Path B (document legitimate-interest + fix banner copy — needs the pending
   legal review). Do NOT ship current state to external users.
2. **CONSENT-02:** ensure the reviewed-legal-copy replacement (already required by `decisions.md:786`)
   names GA4 / Clarity-session-replay / Vercel Analytics, cookies, consent mechanism, withdrawal, and
   US transfer. Coordinate with the legal-review owner to avoid duplicate work.
3. **CONSENT-07/06/04:** schedule as a hardening batch (consent teardown + source-gating + cookie
   disclosure) — not launch-gating but high value before external scale.
4. **CONSENT-09:** decide if external launch requires a server-side demonstrable-consent log (mirror
   the append-only Terms-acceptance pattern); otherwise defer.

---

## VERIFIED HARD-BLOCKER COUNT: 0 · VERIFY-GATE COUNT: 1 (CONSENT-01 / master V2)

(Prior audit claimed 2; CONSENT-02 reclassified as covered-by an existing recorded launch gate, not a
new surprise blocker; CONSENT-03 refuted.)

## Deletion criteria (unchanged from 00-README)
Delete once each CONSENT-NN is remediated, owner-accepted with a `decisions.md` record, or explicitly
deferred past wider launch; AND `/privacy` accurately reflects the live tracker set.

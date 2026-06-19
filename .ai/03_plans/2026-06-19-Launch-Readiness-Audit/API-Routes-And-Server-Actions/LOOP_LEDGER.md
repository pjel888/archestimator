# LOOP LEDGER — Launch-Readiness: API Routes & Server Actions (Domain 4)

Seeded 2026-06-19 by the adversarial-verification + remediation-planning pass.
Loop surface: lightweight in-session (additive/reversible changes). Escalate to a dated
LOOP_LEDGER pack + Codex review only if remediation expands into the durable rate-limit
RPC/table (Domain-2 high-blast-radius).

**Launch-blocker count: 0.** (API-01 is a conditional soft gate, live only if AI is flipped on.)

---

## DISCOVER
- Prior auditor produced `01-AUDIT-FINDINGS.md` (6 findings: API-01..06) + `00-README.md`.
- Adversarially re-verified all six against live source (read handlers, routes, rate-limit lib,
  upload routes, use-server grep, authz call sites, prior OWASP pack).
- Reconciled vs `.ai/03_plans/2026-06-01-security-owasp-compliance-audit` (F-RL-04 names both AI
  routes; half-closed) and confirmed `security_rate_limit_events` migration exists.

## PLAN
- Wrote `02-REMEDIATION-PLAN.md`: P1 API-01 (package-builder durable quota, reuse `checkAiAskQuota`
  pattern, no migration), P2 API-03 (bound share events metadata), P3 API-02 bookkeeping.
- Wrote `03-EVIDENCE-AND-VERIFICATION.md`: verdicts + per-item proof gates with honest local limits.

## EXECUTE
- (none yet — verification/planning pass only; no source edited)
- [ ] API-01: add `checkPackageBuilderQuota` to `src/lib/ai/rate-limit.ts`; wire into
      `package-builder/handler.ts` deps + call after auth gate; tighter `apply` budget.
- [ ] API-03: byte-cap `body.metadata` in `share/[token]/events/route.ts` (~2 KB, 400 on excess).
- [ ] API-02: mark OWASP F-RL-04 / R-25 closed in the OWASP pack + `decisions.md`.

## VERIFY
- [ ] `bun run build` green (catches use-server async-only-export pitfall).
- [ ] `bunx vitest run tests/vitest/ai-package-builder-route.test.ts` — 429 + `Retry-After` on
      stubbed quota-exceeded.
- [ ] New share-events vitest: >2 KB metadata → 400, not written; in-bound → 204.
- [ ] Re-run API-05 grep after any concurrent action-module edits (zero non-async value exports).
- NOTE: avoid full `bun run validate`/`test:dom` (known-red/hang on main); use targeted vitest +
  build.

## RECORD
- Verdicts: API-01 confirmed (medium, blocker=false conditional); API-02 confirmed (info, stale for
  ask); API-03 confirmed (low); API-04 confirmed (info, safe); API-05 adjusted (info; module count
  24→21, substance unchanged); API-06 confirmed (info, strengths).
- On landing: record accept/reject + fix in `.ai/10_state/decisions.md` and the audit orchestration
  ledger; this pack is deletable per `00-README.md`.

## DECIDE
- **Owner decision needed:** Will AI routes be flipped on for closed beta?
  - If **NO** (current default): no code change is strictly required to launch Domain-4. API-03 is
    cheap hardening worth doing anyway (share is live); API-01 can be pre-staged but isn't gating.
  - If **YES**: API-01 becomes a pre-flip gate — land it before setting `ARCHESTIMATOR_AI_ENABLED=1`.
- Next implementer: start at P1/P2 in `02-REMEDIATION-PLAN.md`; both are S-effort, additive,
  reversible, and mirror shipped patterns.

# LOOP LEDGER — Launch-Readiness: Observability, Reliability & Ops

Seeded by the adversarial verification + remediation-planning pass (2026-06-19). An
implementer continues from PLAN/EXECUTE. Source is READ-ONLY in this pack until Philip
authorizes remediation; concurrent agents must not assume exclusive source access.

## Launch-blocker count: **2** (OPS-01, OPS-03)

Prior auditor claimed 4 (OPS-01/02/03/04). Verification reduced to 2: OPS-02 is gated off by
the AI-disabled feature flag (pre-AI-enable, not pre-launch); OPS-04 is an operator checklist
item, not a code defect.

---

## DISCOVER
- Read `01-AUDIT-FINDINGS.md` + `00-README.md` from disk.
- Re-opened every cited file/line. Key discoveries beyond the audit:
  - **Both AI routes (`ask`, `package-builder`) are 404-gated by `isAiRoutesEnabled()` which
    defaults `false`** (`src/lib/ai/feature-flags.ts:12-22`; routes import handler only if
    enabled). This is the pivot that de-blocks OPS-02. Hosted smoke at current-state.md:1935
    confirms 404 "AI is disabled for closed beta."
  - **decisions.md:748 already records the PITR-off cost decision** (2026-06-03) — OPS-06 is
    mostly covered; residual is only the explicit RPO number.
  - 7 `error.tsx` confirmed, all under `workshop/`; 0 ErrorBoundary classes; providers.tsx
    has no catch.

## PLAN
- Verdicts: OPS-01 confirmed(blocker); OPS-02 adjusted(med, pre-AI gate); OPS-03 confirmed(blocker);
  OPS-04 adjusted(med, checklist); OPS-05 confirmed(med); OPS-06 adjusted(info); OPS-07 confirmed(low);
  OPS-08 confirmed(low).
- Remediation sequenced in `02-REMEDIATION-PLAN.md`:
  - Phase 0 (blockers): R-1 boundaries, R-2 interim sink decision (+R-7 redaction lands with it).
  - Phase 1 (checklist): R-4 readiness probe → R-3 live monitoring + truthful proof flags.
  - Phase 2 (pre-AI-enable): R-5 package-builder rate limit.
  - Phase 3 (debt): R-6 GC cron, R-7 log redaction, R-8 RPO record.

## EXECUTE
- (none — read-only audit pass; no source edited). Implementer starts here.
- Recommended order: R-1, R-2(+R-7), R-4, R-3, then R-5 only when AI is being enabled, then R-6/R-8.

## VERIFY
- Verdicts + per-item proof gates in `03-EVIDENCE-AND-VERIFICATION.md`.
- Note: `bun run validate` is known-red on main — scope Vitest to touched files; do not add new reds.
- High-blast items (R-2 sink with PII, R-4 DB-touching health, R-5 durable rate limit) get a
  Codex review pass before merge.

## RECORD
- Durable findings: `01-AUDIT-FINDINGS.md` (prior) + this folder's 02/03 (verified).
- Accept/defer + the R-2 posture choice + R-8 RPO line go in `.ai/10_state/decisions.md` when Philip rules.

## DECIDE (open owner decisions)
1. **R-2 posture (OPS-03):** Option A (minimal `@sentry/nextjs` + PII scrub) vs Option B
   (accept-risk + Vercel log drain + named watcher). Cannot launch with neither.
2. **R-1 scope:** ship `not-found.tsx` now or defer (optional).
3. **OPS-02 timing:** confirm R-5 is a pre-AI-enable precondition (recorded so it isn't missed
   when `AI_ROUTES_ENABLED` is flipped on).
4. **R-8:** record explicit RPO ≤24h + restore-untested acceptance; run a restore drill or not.
5. **R-6 timing:** defer GC cron to post-beta (likely yes).

## Next action for the implementer
Start R-1 (lowest risk, clears a launch blocker) and R-2's *decision* in parallel; R-1's
`error.digest` logging can ship to `console.error` immediately and be re-pointed at the R-2 sink.

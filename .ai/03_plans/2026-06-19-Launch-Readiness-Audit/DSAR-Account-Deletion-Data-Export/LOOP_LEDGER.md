# LOOP LEDGER — DSAR / Account Deletion / Data Export (Legal Readiness)

Pack: `2026-06-19-Launch-Readiness-Audit/DSAR-Account-Deletion-Data-Export`
Loop type: lightweight in-session (read-only audit + design). The eventual erasure
RPC (P0-B) is HIGH-BLAST-RADIUS DB work and MUST open its own dated pack + Codex review
when implemented.
Launch-blocker count (post-verification): **2** (DSAR-01, DSAR-03).

---

## DISCOVER
- Phase-2 gap pass: the 13-domain launch audit's COVERAGE CRITIC found DSAR/deletion/
  export was owned by no domain. The Auth pack deferred it to the wrong legal/content
  target, which only audited metadata/SEO. Zero prior review.
- A prior gap auditor produced `00-README.md` + `01-AUDIT-FINDINGS.md` (6 findings,
  DSAR-01..06). This pass adversarially verifies them and plans remediation.

## PLAN
- Open each cited source file; re-derive the load-bearing facts (FK delete-rule map,
  PII inventory, trigger inventory, pg_cron state, copy promises) from the LIVE DB
  read-only; try to refute each finding; correct severity/launch_blocker inflation;
  re-check reconcile claims. Then write remediation + evidence + this ledger.

## EXECUTE
- Read: `account-actions.ts` (full), `privacy/page.tsx`, `terms-content.ts`,
  `terms/page.tsx`, `WorkshopSettingsModalContent.tsx`, `mass-deletion/bulk-action.ts`,
  `auth_profiles_ceo_access.sql`.
- Live DB (read-only, ebxxqidacheyapmmzavr): auth.users FK delete-rule map; profiles FK
  delete-rule map; trigger inventory; PII column inventory; pg_cron presence; row counts.
- Reconcile: rg over Analytics-Consent-Privacy + Auth packs + decisions.md/current-state.md.

## VERIFY
- DSAR-01 confirmed (high, blocker) — SET NULL on all `created_by`; no delete trigger;
  client_name/workspace/estimate PII survives. Strengthened: shared-workspace branch real
  (1 ws / 4 profiles).
- DSAR-02 adjusted — capability gap confirmed, but launch_blocker true → **false** (high,
  fix-soon): manual SLA-bound fulfilment is acceptable for first exposure.
- DSAR-03 confirmed (high, blocker) — promise-vs-capability gap in all four copy surfaces.
- DSAR-04 confirmed (medium) — recipient/3rd-party PII unreachable by cascade/mass-deletion.
- DSAR-05 confirmed (medium) — pg_cron absent; no purge/TTL.
- DSAR-06 confirmed (medium) — no self-serve UI/action.
- No finding refuted. One severity adjustment; one strengthening correction; one
  line-number nit (export promise is in `governing-law-notices`, not line 130).

## RECORD
- Wrote `02-REMEDIATION-PLAN.md` (P0 blockers first: P0-A honest copy+SLA, P0-B tested
  erasure RPC/runbook; P1 export + recipient anonymization; P2 self-serve decision +
  retention/pg_cron), `03-EVIDENCE-AND-VERIFICATION.md` (verdicts + honest proof gate),
  this ledger.
- Reconcile outcomes: Analytics-Consent-Privacy = none (coverage hole confirmed);
  Auth pack = partial (deferred here, never picked up); roadmap-08 = partial;
  2026-06-01-security-owasp F-DATA-04/R-21 = stale; archives-feature = partial (DSAR-04).

## DECIDE (owner)
Open decisions for `.ai/10_state/decisions.md`:
1. Launch posture: manual owner-handled DSAR (minimum) vs self-serve UI (later). Manual is
   acceptable for beta→wider IF P0-B runbook exists + is dry-run once + copy matches.
2. Response SLA + retention windows (P0-A / P2-B) — owner + counsel.
3. Accept DSAR-04/05/06 as MEDIUM non-blocking for the beta→wider step (recommended), with
   recipient-PII anonymization folded into the P0-B RPC.
4. Schedule P0-B as its own dated HIGH-BLAST-RADIUS pack + Codex review before building.

NEXT ACTION: land P0-A (hours, copy+SLA) to remove the over-promise immediately; open the
dated pack for P0-B.

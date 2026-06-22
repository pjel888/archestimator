# LOOP LEDGER — Storage Buckets & Upload Lifecycle (Phase-2 gap pack)

**Pack:** `.ai/03_plans/2026-06-19-Launch-Readiness-Audit/Storage-Buckets-And-Upload-Lifecycle/`
**Pass owner:** adversarial verifier + remediation planner
**Date:** 2026-06-19 · **Mode:** read-only on source + DB; writes confined to this pack.
**Launch-blocker count (this surface): 0**

---

## DISCOVER

- Closing a coverage gap: the 13-domain 2026-06-19 launch-readiness audit's COVERAGE
  CRITIC found Supabase Storage **bucket policy + object lifecycle** unowned by any
  domain (API pack covered upload *request* security only).
- Surface: 3 buckets (`component-images` public, `component-attachments` private,
  `project-images` private); 3 upload routes; mass-delete storage cleanup; the
  upload/replace modal UX; `next.config.ts` remote patterns.
- A prior gap auditor produced `00-README.md` + `01-AUDIT-FINDINGS.md` (8 findings,
  STORAGE-01..08). This pass adversarially verifies them and plans remediation.

## PLAN

- Read every cited source file; re-prove every live claim via Supabase MCP
  read-only (buckets, objects, `pg_policies`, reference-join orphan analysis,
  grants, advisors); try to **refute** each finding; correct any severity/blocker
  inflation; re-check `existing_plan_overlap` against `current-state.md` /
  `decisions.md`; then write remediation + evidence + this ledger.

## EXECUTE (verification actions taken)

- Read: `projects/images/route.ts`, `component-library/images/route.ts`,
  `component-library/attachments/route.ts`, `storage-cleanup.ts`,
  `project-image-client.ts`, `ProjectDetailsModal.tsx` (upload/replace handlers).
- DB (live `ebxxqidacheyapmmzavr`): bucket flags/caps/mime; per-bucket object
  count+bytes; all 12 `pg_policies` expressions; orphan reference-join (corrected
  for URL-stored paths); prefix breakdown of the 840 component-images objects;
  `storage.objects` table grants; `get_advisors(security)`.
- Reconcile: `rg` of `decisions.md` (lines 915 archive-only, 917 best-effort
  DB-derived-allowlist cleanup) and `current-state.md`.

## VERIFY (verdicts)

- **0 refuted.** 7 confirmed, 1 adjusted.
- **STORAGE-01 adjusted:** leak mechanism confirmed in code (replace/abandon/
  component-archive all leak; modal-close-after-upload runs no cleanup), but the
  audit's "≈82% / 686 already-materialized orphans" overstates user-driven leak —
  live composition is 530 `internet-` + 308 `seeded-` catalog assets + full-size
  siblings of referenced `-thumb` thumbnails; only **2** objects are true user
  uploads. Path columns store **full public URLs**, not bare names (audit's
  exact-name join undercounted refs to 0; corrected = 154 referenced / 686
  unreferenced). Severity medium / non-blocker **unchanged**; remediation reconciler
  must be user-prefix-scoped + seed-aware or it would delete the catalog.
- **STORAGE-02..08 confirmed** against live evidence (RLS isolation, private serving,
  public fence, service-role chokepoint, missing quota, missing GC, component
  archive-only). No new launch blockers.
- Advisors: 74 WARN, 0 ERROR, **0 storage-related** → RLS posture sound.

## RECORD (artifacts)

- `01-AUDIT-FINDINGS.md` — prior auditor (input).
- `02-REMEDIATION-PLAN.md` — prioritized (P0 none; P1: R1 orphan reconcile, R2
  server-side replace/abandon cleanup, R3 per-workspace quota; P2: R4 document
  public-by-design + guard test, R5 GET `can_access_project` tighten, R6 regression
  tests + service-key bundle guard).
- `03-EVIDENCE-AND-VERIFICATION.md` — per-finding verdicts, live proofs, honest
  proof gate (what static+DB-read can/cannot prove).
- `LOOP_LEDGER.md` — this file.

## DECIDE (next + gates)

- **Gate verdict: SAFE to expose to wider/external users from this surface**, given
  P2 cheap guards (R6 + R4) shipped and P1 (R1 reconcile dry-run-first, R3 quota)
  either scheduled-soon or monitored. No fix is a hard blocker.
- **Owner decisions needed:**
  1. Schedule vs accept-deferred R1 (orphan reconcile) and R3 (quota) — record in
     `.ai/10_state/decisions.md` per the pack's deletion criteria.
  2. Confirm `component-images` public-by-design (R4) so it is not later "fixed".
- **Blast-radius routing:** R1 + R3 (storage DDL / trigger / pg_cron / service-role
  deletes) are HIGH-BLAST-RADIUS → full dated plan-pack loop + `get_advisors` 0-new
  gate + Codex review before merge. R2/R5/R6 are ordinary reversible work.
- **Validation:** `bun run validate` known-red on `main` → gate on `bun run build`
  + focused upload-route Vitest + PG-level prove of any new quota/GC RPC.
- **Pack deletion criteria:** STORAGE-01 + STORAGE-02 each fixed-and-verified or
  owner-accepted-deferred-with-rationale; STORAGE-03..08 triaged; findings
  reconciled into `current-state.md`.

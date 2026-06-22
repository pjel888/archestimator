# LOOP LEDGER — Realtime Collaboration, Presence & Activity Visibility (Phase-2 gap pack)

Date opened: 2026-06-19 · Target DB: `ebxxqidacheyapmmzavr` · Stage: gating
owner-only beta → wider/external exposure. Loop class: lightweight in-session
(read-only audit + remediation planning; no HIGH-BLAST-RADIUS change made here).

**Hard-blocker count: 0. Verify-gate count: 1** (REALTIME-01 / master V1).

---

## DISCOVER

- Coverage critic of the 13-domain 2026-06-19 launch audit found the Supabase
  Realtime collaboration surface (channel-join authz, presence/cursor payload trust,
  visibility leaks, realtime scale, activity-feed visibility) owned by **no** domain
  pack. A prior gap auditor produced `01-AUDIT-FINDINGS.md` (8 findings, 1 LB).
- This pass = adversarial verification of those 8 findings + remediation/evidence/
  ledger authoring.

## PLAN

- Re-open every cited file and try to refute each finding; use Supabase MCP read
  tools to prove/disprove the live RLS/authz claims; reconcile `existing_plan_overlap`
  against decisions.md / current-state.md.
- Produce `02-REMEDIATION-PLAN.md` (verify-gate first), `03-EVIDENCE-AND-
  VERIFICATION.md` (verdicts + honest proof gates), this ledger.

## EXECUTE

- Read in full: `use-project-presence.ts`, `use-estimate-cursor-broadcast.ts`,
  `realtime-identity-server.ts`, `presence-surface.ts`, `feature-flags.ts`,
  `activity-visibility.ts`, `realtime-telemetry.ts`, and the realtime authz migration
  `20260526142913_project_sheet_collaboration_access.sql`.
- Live DB reads on `ebxxqidacheyapmmzavr`: `pg_policies` on `realtime.messages`
  (both policies byte-match migration); `pg_class.relrowsecurity = true`; six authz
  helpers present; `get_advisors(security)` = 74 WARN / 0 ERROR (all SECURITY
  DEFINER-executable class, already RLS-pack-owned).
- Reconciled against `.ai/10_state/decisions.md` (T1.3, D-1, D-4, R-2/R-14, identity
  trust model, coarse-presence-by-contract) — all overlap claims hold.

## VERIFY

- **All 8 findings confirmed; none refuted; none inflated.** One framing adjustment:
  REALTIME-01 is a *verification gap* (unverified hosted setting), not a
  proven-absent control. The master index classifies it as **V1 verify-gate**, not
  a hard blocker.
- Net: Critical 0 · High 0 · Medium 1 · Low 2 · Info 5.
- Validation note: `bun run validate` is known-red on `main`; the binding gate for
  R-01 is an applied-setting screenshot / management-API read (not a migration),
  and the RLS-policy presence check was satisfied live this pass.

## RECORD

- Durable-state landing targets: `.ai/10_state/current-state.md` (Teamspace section)
  + `.ai/10_state/decisions.md` (2026-06-14 Teamspace block: D-1, D-4, T1.3, identity
  trust model). This pack is deletable once R-01 evidence is recorded (or
  owner-accepted-off) and R-02 is bound or owner-accepted.

## DECIDE — open owner decisions

1. **REALTIME-01 (P0, verify-gate / no-go until verified):** Read + record the Supabase realtime ceiling
   (`max_events_per_second`, `max_concurrent_users`) for `ebxxqidacheyapmmzavr`; set a
   conservative per-connection limit if unset; attach evidence. **Required before
   wider exposure.**
2. **REALTIME-02 (P1):** Rule presence-spoof **accepted** for the wider tier
   (recommended — cosmetic, member-confined, no XSS/exfil) and record in
   decisions.md, OR action Option B (bind the presence envelope; ordinary feature
   work, no DB/RLS change).
3. **REALTIME-03 (P2):** Confirm `NEXT_PUBLIC_TEAMSPACE_PROJECT_CURSORS` stays OFF in
   prod Vercel env until R-01 tier headroom is confirmed.
4. **REALTIME-07 / -06 (P2, optional):** ephemeral-key telemetry warn; activity
   `audience:"client"` contract test. No launch gate.

## Escalation note

If REALTIME-02 Option B is taken, that is ordinary reversible feature work (no
DB/RLS change) — lightweight loop suffices. If the Supabase realtime rate-limit/RLS
posture is *changed* (not merely read), that is HIGH-BLAST-RADIUS (DB/security) and
must be recorded here as a dated change with a Codex review gate.

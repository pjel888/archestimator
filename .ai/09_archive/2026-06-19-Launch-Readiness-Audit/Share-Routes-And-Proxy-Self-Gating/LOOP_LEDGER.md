# LOOP_LEDGER — Share Routes & Proxy /api Self-Gating (Phase-2 gap pack)

Loop surface: audit-only (read-only on source + DB). High-blast-radius? No edits made; pack is
gating advisory for wider/external exposure. Launch-blocker count: **0**.

## DISCOVER
- Coverage critic of the 13-domain 2026-06-19 Launch-Readiness audit found this surface
  (4 share routes detail + proxy `/api` self-gating + reusable-sources/aec-classification sweep)
  unowned. Prior gap auditor produced `00-README.md` + `01-AUDIT-FINDINGS.md` (7 findings,
  all info/low, 0 launch-blockers).
- Confirmed unowned: Auth pack explicitly **deferred** "the `/api` short-circuit's API-route
  impact — domain 4"; API-Routes pack detailed `ai/*` but not the 4 share routes.

## PLAN
- Adversarially verify all 7 findings against live source + Supabase reads; try to refute /
  deflate. Then produce remediation plan + evidence + this ledger.

## EXECUTE (verification actions)
- Read in full: `proxy.ts` (short-circuit), `session/route.ts`, `activity/route.ts`,
  `comment/route.ts` (head), `ai/{ask,package-builder}/route.ts` + both handlers (guard region).
- `rg`-verified: guards on `component-library/*`, `projects/images`, `proposal.xlsx`,
  `health`, `webhooks/resend`; token entropy (`randomBytes`, `bytes=32`); `password/route.ts`
  durable limiter; reusable-sources `requireCurrentUserContext` prefix; zero
  `dangerouslySetInnerHTML` in share UI; AI flag default `false`.
- Live Supabase read: confirmed `security_rate_limit_events` + all `shared_link_*` +
  `project_publications` tables exist.

## VERIFY (verdicts)
- SHARE-PROXY-01 confirmed (proxy `/api` short-circuit safe; 16 routes self-gate).
- SHARE-PROXY-02 confirmed (session uncapped; low — 256-bit tokens, not brute-forceable).
- SHARE-PROXY-03 confirmed, accepted design (activity returns non-internal comment bodies w/o
  recipient session; no email/PII leak; owner-decision R3).
- SHARE-PROXY-04 / 05 / 06 / 07 confirmed positives (XSS, durable lockout, cookie hygiene,
  reusable-sources/aec sweep).
- **0 refutations, 0 severity adjustments, 0 launch blockers.** Prior auditor was accurate.

## RECORD
- Wrote `02-REMEDIATION-PLAN.md` (R1 session rate-limit, R2 self-gating invariant test,
  R3 owner decision on activity comment scope, R4 optional in-mem LRU cap).
- Wrote `03-EVIDENCE-AND-VERIFICATION.md` (per-finding re-proof + honest proof-gate limits).
- Pending durable-state writes (outside this pack, owner/next session):
  `.ai/10_state/current-state.md` (share + proxy self-gating coverage closed) and
  `.ai/10_state/decisions.md` (R3 outcome once owner triages).

## DECIDE (gate)
- **Wider/external exposure is NOT blocked by this surface.** No launch blocker.
- Owner triage needed only for R3 (accept/reject activity comment-read scope). R1/R2 are
  recommended hardening (effort S each); R4 optional.
- Delete this pack once owner has triaged every SHARE-PROXY-NN finding and any accepted item is
  fixed + verified (none are launch-blocking).

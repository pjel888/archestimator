# Proposals Inbox Loop Ledger

| ID | Status | Scope | Evidence / next action |
|---|---|---|---|
| MERGE-001 | COMPLETE | Absorb 2026-07-11 plan into this 2026-07-12 pack | `11-ABSORBED-2026-07-11-REQUIREMENTS.md`; predecessor archived as superseded |
| DEEP-001 | COMPLETE | Round-2 deep audit (privacy, compliance, domain, abuse, observability, analytics) | `08`, `09`, `10`; added P1-4…P1-7, P2-8…P2-14, DEC-AUTO-111/112/113 |
| ADV-001 | COMPLETE | Round-3 adversarial pass (12 hypotheses) | `12-ADVERSARIAL-PASS.md`; added P2-15 (i18n) + P2-16 (version-swap race) + P1-6 amplification |
| BOUNDARY-001 | COMPLETE | Round-4 BOUNDARY closure + verified runtime evidence | `12` round 4; cron statically traced; i18n closed DEC-AUTO-114; D1 region **verified APAC** via `bunx wrangler d1 info` |
| AUTH-5 | AUTH_BLOCKED | "100% of all possible requirements" bar is outside static audit (owner decision 2026-07-12) | `13-NON-STATIC-GAPS-AND-ESCALATION.md`; 4 non-static tracks. **Stop condition 3 (true authorization/resource boundary).** Unblocks: (a) `TEST_TASK` for Track 1, (b) owner accepts convergence bar, (c) owner names a scoped non-static concern |
| SLICE-001 | NOT_STARTED | A1+A2 repository resilience and decision typing | Begin at `IMPLEMENTATION_PLAN.md` Slice 1 |
| SLICE-002 | NOT_STARTED | A3 response delivery status | Depends only on the current `d1-store.ts` transaction boundary |
| SLICE-003 | NOT_STARTED | A4 truncation signal | Use `LIMIT 51`; coordinate result-type edits with the client |
| SLICE-003B | NOT_STARTED | A5–A8 deep-audit P1 data-integrity + privacy | The 4 new P1s: PII purge, retention TTL, enumeration fix, unique constraint. Ship before first users. |
| SLICE-003C | NOT_STARTED | A9–A12 deep-audit P2 hardening | Log redaction, refresh observability, rate limit, inbox de-dup. Batchable, independent. |
| SLICE-004 | NOT_STARTED | B1–B5 collection shell and controls | Starts after Track A |
| SLICE-005 | NOT_STARTED | B6–B9 card/list presentation | Starts after B1; preserve action contract |
| SLICE-006 | NOT_STARTED | Reconciliation, analytics, bounded audits | Runs last; includes P2-11/P2-12 + `08` domain items if AUTH-3 authorized |

No tests, builds, typechecks, browser automation, or provider mutations were run
for this planning merge. Test proposals remain proposals until explicitly
authorized by the owner.

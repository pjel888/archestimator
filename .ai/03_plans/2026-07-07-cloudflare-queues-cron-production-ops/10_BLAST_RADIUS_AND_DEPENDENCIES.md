# 10 — Blast Radius and Dependencies

## Direct impact

| Surface | Impact class | Note |
|---|---|---|
| `wrangler.jsonc` (crons/queues) | Verification only | plan does NOT change it; it's the SoT |
| `AGENTS.md:40` | Required change (DOC-002) | one-line cron-count correction |
| `scheduled-upload-jobs.ts` | Verification only | no change planned (cron constants already correct) |
| `worker.ts` | Possible change (D-RETDRY only) | if retention dry-run env gate added — optional |
| `retention-core.ts` | Verification only | no change; rules may extend per OPEN-DEC-007 |
| `upload-job-queue.ts` | Verification only (+ optional shared helper ARCH-002) | no behavioral change planned |
| `migrations/0039_*` (new, DB-INDEX) | Required change (DATA-001) | additive indexes |
| Internal job routes | Verification only | no change; tests may be added (TEST-001) |
| `retention-schedule.md` | Probable change | reflect final decisions + completeness |
| `current-state.md` | Probable change | append entry on completion |
| `README.md` (repo) | Verification only | check if it mentions cron count |
| Operator runbook (new, in this pack) | Required (DOC-001) | new doc |

## Transitive impact

- **Upload subsystem:** cleanup/scan jobs are the consumers of upload state.
  Hardening their ops posture improves upload reliability; no API change.
- **Compliance/privacy:** retention is the data-minimization control. Index
  addition (DB-INDEX) and registry completeness (OPEN-DEC-007) affect retention
  correctness/speed, not privacy posture (TTLs unchanged unless OPEN-DEC-004).
- **Collaboration/publication:** `shared_link_events`, `collaboration_audit_events`,
  `estimate_sheet_events` are retention targets. Purge changes affect audit
  history availability — but TTLs are not changed by this plan.
- **Auth/security:** `account_security_events` is a retention target. Same: TTL
  unchanged.
- **Workers Observability:** sampled logs/traces are a dependency for
  *supportive* signals only (RISK-007).

## Classification of impacts

| Item | Class |
|---|---|
| DB-INDEX migration | Required change |
| AGENTS.md cron fix | Required change |
| Runbook creation | Required change |
| Test additions (TEST-001/002) | Required change |
| Retention dry-run env gate (D-RETDRY) | Possible change (decision-gated) |
| Shared auth helper (ARCH-002) | Possible change (optional follow-up) |
| Hosted proof execution | Required (external, owner-gated) |
| Cron/queue config | Explicitly unaffected |
| New bindings/queues/paid add-ons | Explicitly unaffected (forbidden) |
| UI/routes/components | Explicitly unaffected |
| Supabase `ebxxqidacheyapmmzavr` | Explicitly unaffected (legacy only) |

## Dependencies & ordering

1. Decisions D-CRONSOT, D-IDEMP, D-INDEX, D-RETDRY, D-RETPROC, OPEN-DEC-004,
   OPEN-DOC-007 → resolve (some are owner decisions).
2. DOC-002 (AGENTS.md fix) — independent, land anytime.
3. TEST-001/002 — independent of DB-INDEX.
4. DB-INDEX migration — independent; preview first, then remote.
5. Runbook (DOC-001) — depends on decisions; can draft in parallel.
6. Hosted proof (FR-008) — depends on secrets present + deploy; owner-gated.
7. 30-day observation (REL-003) — gate after the above.

## Backward compatibility

- DB-INDEX: purely additive; old code works unchanged (just faster at scale).
- AGENTS.md fix: doc-only.
- Tests: additive.
- No API/schema/contract breakage.

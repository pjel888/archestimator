# 19 — Research, Review, and QA Evidence

## §1. Research questions and sources

| Question | Source | Date (visible) | Decision changed? | Citation |
|---|---|---|---|---|
| Cloudflare D1 `ALTER ... CHECK` support | D1 is SQLite-based; cannot ALTER CHECK in place | 2026-07 (repo migration `0035` pattern) | Yes — DB-05 uses rebuild pattern | `migrations/0035_account_security_events_hmac_checks.sql` |
| Cloudflare Workers Observability retention (free tier) | Cloudflare docs (platform-managed) | n/a | No — DEC-005 (documented + observed) | `wrangler.jsonc` observability block; Cloudflare docs (re-fetch at impl) |
| Better Auth 1.6.22 revocation API surface | `node_modules/better-auth/` + `src/lib/auth/` | 2026-07 (installed version) | Pending — T-4.2 DISCOVERY | DISCOVERY-REQUIRED |
| DSAR/erasure industry patterns (data subject package) | general best practice | n/a | No — reuse proposal-export pattern | `src/lib/proposal-export/` |
| Philippine DPA IRR / GDPR Art. 5/15/17 retention principles | `retention-schedule.md` counsel notes | 2026-07 (doc) | No — `OPEN-DEC-004` gate | `.ai/10_state/compliance/retention-schedule.md` |

**Searched for but not found (recorded)**: a hosted/production provenance for the 30-day cron run (does not exist yet — this pack defines the gate); a formal DSAR SLA (does not exist — `OPEN-DEC-007`).

**Validation rubric**: research is sufficient when (a) it is tied to a REQ/DEC, (b) it cites repo evidence or official docs, and (c) pending items are isolated as DISCOVERY/blocked. No research is included as a detached appendix.

## §2. Skills and workflows used / unavailable

| Skill/workflow | Used? | Substitute if unavailable |
|---|---|---|
| `archestimator-plan-pack` | Yes | n/a |
| `Explore` (native subagent) | Yes (2 lanes) | n/a |
| `gitnexus` | No (proportional-graph policy: bounded work) | `rg` + targeted reads |
| `cloudflare` / `wrangler` skills | Referenced | current source/config as evidence |
| `ultrawork`/`ultragoal`/`ultraqa`/`autopilot`/`performance-goal`/`autoresearch(-goal)` | Reflected in plan shape; not invoked in planning | n/a |
| `code-review` | Not yet (implementation phase) | emulated adversarial pass |
| Independent verifier (separate native agent) | **Unavailable** | emulated pass → `verification_mode: emulated` |

## §3. Specialist workstream outputs (summary)
- **Source/requirements**: `02_`, `04_`.
- **Codebase architecture**: `03_`, `06_`, `10_`.
- **UX/a11y**: `05_`.
- **Data/DB**: `07_`.
- **Security/privacy**: `08_`.
- **Performance/reliability**: `09_`.
- **Test/QA**: `12_`, §6 below.
- **Ops/rollout**: `13_`.
- **Blast radius**: `10_`.
- **Adversarial**: §6 below.
- **Final verifier**: `17_`.

## §4. Critique-and-revision cycle summaries

### Cycle 1 (initial draft → self-critique)
Findings identified:
- F1: `privacy_request_triage` audit action unclear (reusing `anonymized` is semantically wrong).
- F2: `uploads_orphaned` rule risked double-delete vs upload-cleanup job.
- F3: Better Auth `user` schema migration (initial thought) is upgrade-risky.
- F4: `logs_*` classes have no D1 table — engine cannot purge; need `platformManaged` concept.
- F5: Missing `legal_hold` column makes `skipped_legal_hold` action dead today.

Resolutions applied:
- F1 → recommend adding `transitioned` action (DB-05 expands action CHECK too).
- F2 → `uploads_orphaned` = acceptance-only; R2 deletion owned by upload-cleanup (DEC-001/ASSUMP-008).
- F3 → DEC-003: `profiles.deleted_at` + Better Auth revocation API.
- F4 → `platformManaged` flag on rules; engine writes acceptance row.
- F5 → DB-04 behind flag; `OPEN-DEC-006` policy gate.

### Cycle 2 (consistency + adversarial)
Findings:
- F6: DSAR export must include non-`RetentionClassName` personal-data tables (feedback, terms, memberships) — added to inventory + builder scope.
- F7: Cron env-gate default must be dry-run (safety) — confirmed `RETENTION_DRY_RUN=1` default.
- F8: Cross-workspace export leak test required — added two-fixture test.
- F9: `data_retention_events` rebuild (DB-05) row-preservation must be tested — added to blueprint proof.
- F10: Verification mode is emulated (no second native agent) → readiness cap applies — recorded in `17_`.

All findings resolved or explicitly isolated. No remaining internally resolvable P0/P1 gap.

## §5. Performance evaluator contract
See `09_` §1 (PERF-01/02/03) and `13_` §2. Not duplicated here.

## §6. UltraQA-style adversarial scenario matrix

| ID | User/attacker model | Scenario | Setup | Command/harness | Expected signal | Actual result | Status | Evidence | Cleanup |
|---|---|---|---|---|---|---|---|---|---|
| AQ-01 | anonymous | call admin transition route | mock anon request | role-matrix test | 403/404 | TBD at impl | planned | test | none |
| AQ-02 | workspace non-admin | call admin route | fixture workspace user | role-matrix test | 403/404 | TBD | planned | test | none |
| AQ-03 | platform-admin | erasure without phrase | omit phrase | orchestrator test | throws | TBD | planned | test | none |
| AQ-04 | platform-admin | erasure wrong phrase | bad phrase | orchestrator test | 400 | TBD | planned | test | none |
| AQ-05 | platform-admin | re-run erasure same id | second call | orchestrator test | idempotent | TBD | planned | test | none |
| AQ-06 | system | one target errors mid-erasure | inject D1 error | orchestrator test | not completed | TBD | planned | test | none |
| AQ-07 | platform-admin | export A includes B | two-fixture users | builder test | A excludes B | TBD | planned | test | none |
| AQ-08 | platform-admin | export rate-limit exceeded | N+1 calls | rate-limit test | 429 | TBD | planned | test | none |
| AQ-09 | anonymous | intake rate-limit exceeded | N+1 POSTs | intake test | 429 | TBD | planned | existing+test | none |
| AQ-10 | system | cron dry-run | `RETENTION_DRY_RUN=1` | worker test | no DELETE | TBD | planned | test | none |
| AQ-11 | system | cron D1 error mid-pass | inject error | cron test | skipped+error | TBD | planned | test | none |
| AQ-12 | system | R2 purge fails | inject R2 error | purge test | retry status | TBD | planned | test | none |
| AQ-13 | requester | XSS in description | script payload | DOM test | rendered as text | TBD | planned | test | none |
| AQ-14 | platform-admin | replay export | same request id | export test | cached pkg | TBD | planned | test | none |
| AQ-15 | system | legal_hold row purged (post-DB-04) | hold=1 | repo test | skipped_legal_hold | TBD | planned | test | none |
| AQ-16 | two admins | concurrent transition | parallel calls | repo test | one conflict | TBD | planned | test | none |
| AQ-17 | requester | oversized intake body | >16 KiB | intake test | 413/400 | TBD | planned | existing | none |
| AQ-18 | system | hung cron command | bounded timeout | harness | timeout handled | TBD | planned | test | none |

For docs-only planning work, dynamic adversarial QA is **not applicable to the planning task itself** (no runtime behavior in the pack); this matrix specifies the adversarial QA required for the **future implementation**.

## §7. Independent final verifier evidence
Recorded in `17_`. Verification mode: `emulated` (no second native agent available). The final-verifier pass is a separated review pass by the same agent, applying the readiness cap.

## §8. Explicit validation gaps

| Gap | Why | Risk | Strongest substitute | Unblock action |
|---|---|---|---|---|
| 30-day hosted cron observation | not yet deployed | cannot claim cron proof | local `cf:d1-retention-proof` | deploy + wait 30 days |
| Better Auth revocation API surface | not verified | DSAR erasure may need adjustment | T-4.2 DISCOVERY | DISCOVERY at impl |
| Workers Obs / Email retention readback | platform-managed | cannot prove platform TTL | doc citation | hosted readback |
| `OPEN-DEC-004/006/007/008` | external decisions | policy not final | draft values + flags | counsel/owner sign-off |
| Independent (non-emulated) verifier | no second native agent | readiness cap | emulated pass | separate reviewer lane at impl |

No local-only check is presented as provider/hosted/production proof.

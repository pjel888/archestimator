# 04 — Findings Register

Authoritative narrative findings register. Machine-readable counterpart:
`artifacts/findings.json`. Rejected/refuted: `artifacts/rejected-refuted-findings.json`.

## Severity counts

| Severity | Count |
|---|---|
| Critical | 0 |
| High | 4 |
| Medium | 9 |
| Low / Informational | 4 |
| Rejected / Refuted / Duplicate | 3 |

## Evidence classes used

`CURRENT_SOURCE_CONFIRMED`, `HOSTED_CONFIRMED`, `EVIDENCE_BLOCKED`,
`ALREADY_IMPLEMENTED`, `CROSS_REFERENCE_ACTIVE_PACK`, `NEW_OWNER_HERE`,
`REFUTED_OR_UNREACHABLE`, `DEFERRED_TO_NAMED_STAGE_OR_OWNER`.

## High-severity findings

### OPS-RECOVERY-001 — Hosted D1 recovery posture unverified
- **Domain**: O-04
- **Resource**: `ARCH_DB` (database_id `9bdb29bb<redacted>`)
- **Evidence layer required**: HOSTED_PRODUCTION_READ_ONLY
- **Evidence collected**: EVIDENCE_BLOCKED (AUTH-001 wrangler auth expired);
  localOnly restore rehearsal confirmed at
  `scripts/generate-cloudflare-d1-restore-rehearsal.ts:57-58,341-342`
- **Expected**: Documented RPO/RTO; confirmed backup window; preview-only
  restore drill completed; production restore command chain documented.
- **Actual**: Local-only rehearsal is `localOnly:true / providerBacked:false`;
  no hosted backup/restore evidence in this audit.
- **Release consequence**: Cannot prove the cohort's data can be recovered if
  D1 corruption occurs.
- **Operator consequence**: Philip cannot safely admit design partners until
  RPO/RTO is documented and a preview drill is run.
- **Source/config trace**: `wrangler.jsonc:40-47`;
  `scripts/generate-cloudflare-d1-restore-rehearsal.ts`; cross-ref MVP-Startup
  UNIT-004.
- **Existing-pack disposition**: CROSS_REFERENCE_ACTIVE_PACK for enablement
  work (MVP-Startup UNIT-004 owns PITR enablement + preview drill);
  NEW_OWNER_HERE for the hosted-evidence gap.
- **Severity**: High. **Confidence**: HIGH.
- **Smallest remediation**: Operator: `bunx wrangler login`;
  `bunx wrangler d1 info ARCH_DB --remote`;
  `bunx wrangler d1 backups list ARCH_DB --remote`; run preview-only restore
  drill; document RPO/RTO + restore command chain + approval.
- **Hosted verification needed**: Restore window timestamp + restore duration +
  post-restore schema/row-count/FK smoke.
- **Authorization boundary**: AUTH-001.
- **Recovery / fix-forward**: Document the gap honestly in release-gate.json;
  do NOT admit cohort until GATE-RECOVERY-001 resolved.
- **Unit**: UNIT-001.
- **Second-pass challenge**: Attempted refutation via localOnly rehearsal;
  refutation failed because local rehearsal cannot prove hosted
  window/duration/permissions.

### OPS-OBS-ALERT-002 — Hosted alert delivery for S-01..S-07 scenarios unverified
- **Domain**: O-11
- **Resource**: `OPERATIONAL_INCIDENT_ALERT_WEBHOOK_URL` +
  `OPERATIONAL_INCIDENT_ALERT_WEBHOOK_TOKEN` +
  `OPERATIONAL_INCIDENT_ALERTS_ENABLED`
- **Evidence collected**: REPO_LOCAL — `src/lib/observability/operational-alerts.ts:196-268`
  confirms application-level scaffolding. HOSTED_CONFIRMED of plumbing absent.
- **Expected**: Each of S-01..S-07 produces a delivered webhook payload to an
  operator-visible sink.
- **Actual**: Webhook URL reachability, token validity, and trigger conditions
  never exercised at the hosted layer.
- **Release consequence**: Philip may not detect material failure (uptime,
  error-rate, queue, cron, DLQ) during the controlled beta.
- **Source/config trace**: `src/lib/observability/operational-alerts.ts`;
  `src/lib/observability/alert-scenarios.ts`;
  `scripts/check-alert-scenario-readiness.ts`;
  `scripts/verify-observability-alert-delivery.ts`.
- **Existing-pack disposition**: NEW_OWNER_HERE.
- **Severity**: High. **Confidence**: HIGH.
- **Smallest remediation**: Confirm `OPERATIONAL_INCIDENT_ALERTS_ENABLED=1` in
  Worker secrets; for each scenario run
  `bun run ops:verify-observability-alert -- --scenario <name>`; verify sink.
- **Authorization boundary**: AUTH-001 + operator-driven alert trigger (no
  real customer data).
- **Unit**: UNIT-002.
- **Second-pass challenge**: Challenger noted scaffolding exists — but per
  AGENTS.md a generated readiness artifact is not proof an external alert
  arrived.

### OPS-AUTH-OAUTH-003 — Hosted Google OAuth round-trip not exercised end-to-end
- **Domain**: O-09
- **Resource**: `/api/auth/callback/google` + `BETTER_AUTH_GOOGLE_CLIENT_ID` +
  `BETTER_AUTH_GOOGLE_CLIENT_SECRET` + `BETTER_AUTH_URL`
- **Evidence collected**: HOSTED_CONFIRMED — `/login` renders
  "Continue with Google". CURRENT_SOURCE_CONFIRMED —
  `src/lib/auth/better-auth-cloudflare.ts:234-246`. EVIDENCE_BLOCKED —
  secret presence (AUTH-001). NOT EXERCISED — real-account OAuth flow.
- **Expected**: Real test account completes login → callback → session cookie
  → `/workshop`.
- **Actual**: Round-trip not driven this audit; no evidence `BETTER_AUTH_URL`
  hosted secret is `https://archestimator.com`.
- **Release consequence**: Cohort cannot sign in if `BETTER_AUTH_URL` is
  mis-set or client_id/secret are missing.
- **Source/config trace**: `src/lib/auth/better-auth-cloudflare.ts:234-246`;
  `src/lib/auth/cloudflare-better-auth-runtime.ts:82-103`.
- **Existing-pack disposition**: NEW_OWNER_HERE (Infosec owns token security;
  Quality Master owns session-read coalescing; neither owns hosted round-trip).
- **Severity**: High. **Confidence**: HIGH.
- **Smallest remediation**: With a real test account, drive
  login → callback → `/workshop`; confirm hosted secrets.
- **Authorization boundary**: Operator-driven (real test account; no in-scope
  code change).
- **Unit**: UNIT-003.
- **Second-pass challenge**: Challenger noted UI is present + source confirms
  env-driven config — but UI presence does not prove secrets are populated at
  the hosted Worker.

### OPS-RELEASE-GATE-004 — Controlled-beta release-gate ritual not yet executed
- **Domain**: O-12
- **Resource**: `scripts/check-cloudflare-release-gates.ts` +
  `artifacts/release-gate.json` + `artifacts/recovery-scenario-matrix.csv`
- **Evidence collected**: REPO_LOCAL — `scripts/check-cloudflare-release-gates.ts`
  exists; `release-gate.json` authored this audit. NOT RUN — full ritual.
- **Expected**: Operator runs `bun run cf:release-gates` end-to-end before
  each cohort wave and records a release receipt.
- **Actual**: Ritual defined but not executed.
- **Release consequence**: Each cohort wave admits users without a recorded
  release decision.
- **Source/config trace**: `scripts/check-cloudflare-release-gates.ts`; this
  pack's `release-gate.json` + `recovery-scenario-matrix.csv`.
- **Existing-pack disposition**: NEW_OWNER_HERE.
- **Severity**: High. **Confidence**: HIGH.
- **Smallest remediation**: Execute `release-gate.json` ritual at cohort admit;
  record release receipt.
- **Hosted verification needed**: Stored release receipt with timestamp +
  decision + resolved NO_GO list.
- **Unit**: UNIT-006.
- **Second-pass challenge**: Challenger noted cf:release-gates script exists —
  but a script existing is not the same as the ritual being executed per wave.

## Medium-severity findings (summary — full detail in findings.json)

| ID | Domain | Title | Unit |
|---|---|---|---|
| OPS-DEPLOY-005 | O-01 | Hosted deployment provenance unverified | UNIT-006 |
| OPS-D1-PARITY-006 | O-03 | Hosted D1 migration parity + schema fingerprint unverified | UNIT-007 |
| OPS-EMAIL-MX-007 | O-10 | MX routes via Namecheap not Cloudflare; topology inconsistent | UNIT-004 |
| OPS-EMAIL-DNS-008 | O-10 | DMARC p=none; no DKIM; SPF narrow | UNIT-004 |
| OPS-WORKERS-DEV-009 | O-01/O-02 | workers.dev reachable; partial mitigation (cross-ref Infosec UNIT-002) | UNIT-006 |
| OPS-CRON-ALERT-010 | O-07/O-11 | Cron-failure / missed-run hosted alert not wired | UNIT-002 |
| OPS-OBS-RETENTION-011 | O-11 | Hosted Workers Logs retention not pinned | UNIT-002 |
| OPS-QUEUE-DLQ-012 | O-06 | Live DLQ depth + replay contract undefined | UNIT-005 |
| OPS-DO-STORAGE-013 | O-08 | DO storage use + quarantine runbook missing | UNIT-005 |
| OPS-R2-LIFECYCLE-014 | O-05 | Hosted R2 inventory + cleanup execution unverified | UNIT-005 |

(Note: `OPS-RECOVERY-001` and `OPS-OBS-ALERT-002` and `OPS-AUTH-OAUTH-003`
appear in both High and the severity counts; `OPS-RELEASE-GATE-004` is the
fourth High. The Medium count above is 10 because `OPS-WORKERS-DEV-009` is
cross-referenced; the headline count of 9 reflects distinct-pure-NEW_OWNER
mediums after removing the cross-ref. The full register in findings.json is
authoritative.)

## Low / Informational findings

| ID | Domain | Title | Disposition |
|---|---|---|---|
| OPS-RETENTION-015 | O-11 | Retention cadence + coverage unverified (cross-ref Infosec UNIT-011) | UNIT-007 |
| OPS-CRON-UNMATCHED-016 | O-07 | 30 3 * * * records unmatched-cron noise (cosmetic) | DEFERRED_TO_NAMED_STAGE_OR_OWNER (Quality Master) |
| OPS-CRON-FIVE-MIN-017 | O-07 | 5-min cron writes one event row correctly | ALREADY_IMPLEMENTED (Quality Master UNIT-028 resolved) |
| OPS-D1-RESTORE-005A | O-04 | localOnly:true / providerBacked:false (correct honest behavior) | ALREADY_IMPLEMENTED |

## Rejected / Refuted / Duplicate

| Candidate | Reason | Disposition |
|---|---|---|
| OPS-DEPLOY-CI-AUTO | Out of scope; CI activation owned by Infosec UNIT-012 | CROSS_REFERENCE_ACTIVE_PACK |
| OPS-CRON-CONCURRENCY-LOCK | Refuted; cron is single-instance per trigger + idempotent via state columns | REFUTED_OR_UNREACHABLE |
| OPS-QUEUE-VISIBILITY-TIMEOUT | Refuted; defaults adequate; per-message idempotency exists | REFUTED_OR_UNREACHABLE |

## False-positive controls applied

For every accepted finding:

1. Identified the real actor/persona and reachable starting state.
2. Traced route/component/action/API/repository/persisted state/async side
   effects/output surface.
3. Proved the triggering input or state can actually be produced (or marked
   EVIDENCE_BLOCKED with continuation).
4. Identified current callers/consumers and any upstream guards.
5. Attempted to reproduce at the strongest authorized evidence layer.
6. Attempted to refute the claim (second-pass adversarial challenge for High).
7. Calibrated impact and likelihood independently.
8. Separated root cause from duplicated symptoms.

Zero-caller functions, unmounted components, disabled features, unreachable
states, stale fixtures, and historical provider artifacts are NOT live user
defects. `OPS-CRON-CONCURRENCY-LOCK` and `OPS-QUEUE-VISIBILITY-TIMEOUT` were
rejected on this basis.

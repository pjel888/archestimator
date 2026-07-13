# 15 — Decisions, Assumptions, and Alternatives

## §1. Major decisions (load-bearing, with rationale + rejected alternatives)

### DEC-001 — Reuse the `mass-deletion` pattern for DSAR erasure
- **Problem**: DSAR erasure needs cross-table propagation + R2 cleanup + audit + correlation.
- **Options**:
  - (A) Reuse `src/lib/mass-deletion/bulk-action.ts` (`StorageCleanupTarget`, `createBulkActionCorrelationId`, `validateTypedConfirmationPhrase`).
  - (B) Build a new DSAR-specific orchestration from scratch.
  - (C) Extend the retention engine to do erasure.
- **Recommended**: (A) — reuse the proven pattern; DSAR orchestrator imports the helpers.
- **Rejected**: (B) duplicates a reviewed pattern; (C) conflates TTL-purge with erasure (different trigger, different semantics).
- **Security/Performance/Ops implications**: reuses audited, tested helpers; no new abstraction.

### DEC-002 — TTL source of truth is a code constant (Phase 1); D1 `retention_policy` table deferred
- **Problem**: TTLs need a single source; operator-tunability is a nice-to-have.
- **Options**: (A) code constant now; (B) D1 table now; (C) env flags.
- **Recommended**: (A) now (simplest, no migration, matches existing `DEFAULT_RETENTION_RULES`); (B) deferred to a later phase when operator tuning is justified.
- **Rejected**: (C) env flags are awkward for 14+ classes.

### DEC-003 — Do NOT migrate Better Auth `user` schema; use `profiles.deleted_at` + Better Auth revocation API
- **Problem**: DSAR erasure must remove/anonymize the user identity.
- **Options**: (A) ALTER Better Auth `user` to add `deleted_at`; (B) soft-delete `profiles` (D1) + revoke via Better Auth API; (C) hard-delete `user`.
- **Recommended**: (B) — no Better Auth schema mutation (upgrade-safe); `profiles` is the D1 user record; revocation invalidates sessions.
- **Rejected**: (A) risks Better Auth upgrade conflicts; (C) destroys evidence + irreversible.
- **Condition that would change**: if Better Auth exposes a first-class "deleted/anonymized user" API in a future version.

### DEC-004 — `legal_hold` is optional in Phase 1/2, required before any litigation-hold compliance claim
- **Problem**: `skipped_legal_hold` action exists but no column/policy.
- **Recommended**: ship the column (DB-04) + code path behind `RETENTION_LEGAL_HOLD_ENABLED=0`; policy gated on `OPEN-DEC-006`.

### DEC-005 — Log retention (Workers Observability, Email) is documented + observed, not engine-enforced
- **Problem**: platform-managed TTLs cannot be engine-purged.
- **Recommended**: engine writes an acceptance audit row; docs record the platform TTL; no false purge claim.

### DEC-006 — DSAR admin surface uses platform-admin scope (not workspace `can*InD1`)
- **Problem**: DSAR is cross-workspace.
- **Recommended**: `isPlatformAdminRole` gate; package filtered by `target_user_id`.

### DEC-007 — DSAR erasure default-off until identity-verification threshold set (`OPEN-DEC-007`)
- **Problem**: wrongful erasure is high-harm.
- **Recommended**: `DSAR_ERASURE_ENABLED=0` default; triage/export ship first.

### DEC-008 — DSAR export default JSON + signed R2 URL (interim, pending `OPEN-DEC-008`)
- **Problem**: export format/delivery undecided.
- **Recommended**: JSON default; signed R2 URL (15 min TTL); CSV/ZIP/email delivery decided by `OPEN-DEC-008`.

## §2. Open decisions (external gates)

| ID | Decision | Owner | Options | Recommendation | Impact of each option | Status |
|---|---|---|---|---|---|---|
| OPEN-DEC-002 | Privacy-notice wording (DSAR email confirmation) | counsel | enable / defer email confirm | defer until wording signed | enable: intake emails requester; defer: no email | blocked-external |
| OPEN-DEC-004 | Final TTL values | counsel | accept draft / adjust per jurisdiction | accept draft as beta minimum | accept: ship; adjust: change registry | blocked-external |
| OPEN-DEC-006 | Legal-hold policy (who sets, scope) | counsel + Philip | per-user / per-workspace / per-class; admin-only set | per-class, platform-admin set, audit every change | broader scope = more conflict risk | blocked-external |
| OPEN-DEC-007 | DSAR SLA + identity-verification threshold for erasure | counsel | SLA 30d/45d; identity: email-only / email+token / ID | 30d SLA, email+token for erasure | stricter = slower but safer | blocked-external |
| OPEN-DEC-008 | Export format + delivery channel | counsel + Philip | JSON / JSON+CSV / ZIP; in-app / signed URL / email | JSON + signed URL interim | more formats = more build cost | blocked-external |

## §3. Assumptions (labeled, with validation status)

| ID | Assumption | Source strength | Validation | Status |
|---|---|---|---|---|
| ASSUMP-001 | Latest numbered migration is `0039` at planning-audit time; concurrent agent work created `0040_operational_incidents.sql` during planning (untracked, 2026-07-08) | repo evidence + concurrent `git status` | re-run `ls migrations/ \| tail -5` at impl start | confirmed-stale — re-verify at impl |
| ASSUMP-002 | Better Auth 1.6.22 exposes a revocation API | derived | T-4.2 DISCOVERY | unverified (discovery required) |
| ASSUMP-003 | `data_retention_events` CHECK rebuild preserves rows | derived | mirror `0035` pattern | unverified (test at impl) |
| ASSUMP-004 | Cron daily frequency is sufficient for retention | doc (P1.8) + industry default | counsel sign-off via `OPEN-DEC-004` | draft |
| ASSUMP-005 | R2 signed-URL 15-min TTL is safe for admin delivery | derived | security review | draft |
| ASSUMP-006 | Platform-admin role exists and is enforceable | repo (`isPlatformAdminRole`) | `rg isPlatformAdminRole` | confirmed |
| ASSUMP-007 | Workers Observability free-tier retention is ~3–30d | official (Cloudflare) | hosted readback | unverified (hosted proof) |
| ASSUMP-008 | Upload-cleanup job owns R2 deletion; retention `uploads_orphaned` is acceptance-only | derived | design decision DEC-001 + code review | draft (confirm at impl) |

## §4. Alternatives considered (cross-cutting)
- Unified audit table (merge `upload_events` into `data_retention_events`) — rejected (large migration, loses upload detail).
- Self-serve public DSAR portal — out of scope (separate epic).
- KV for retention policy — rejected (KV is eventually-consistent cache, not source of truth; AGENTS.md).
- Hard-delete user on erasure — rejected (destroys evidence; DEC-003).
- TTLs via env flags — rejected (awkward for 14 classes; DEC-002).

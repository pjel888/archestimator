# 15 — Decisions, Assumptions, And Alternatives

## Decisions

### DEC-01 — Plan profile `exhaustive`
- **Problem:** what profile for this plan?
- **Constraints:** touches D1, auth/identity, email, audit, erasure.
- **Options:** compact / standard / exhaustive.
- **Adv/Disadv:** exhaustive is heavier but matches the high-blast-radius triggers in `AGENT_OPERATING_PROTOCOL.md`.
- **Recommended:** exhaustive. **Reason:** data-integrity + auth + security triggers. **Conditions to change:** if owner narrows scope to intake-only. **Status:** decided.

### DEC-02 — Hashed-token email verification loop
- **Problem:** how to verify anonymous-requester identity.
- **Options:** (a) hashed-token email loop; (b) KBA; (c) SMS/OTP; (d) no verification (status only).
- **Adv/Disadv:** (a) reuses magic-link discipline, low cost; (b)/(c) higher assurance but cost/complexity; (d) unsafe for erasure.
- **Security/perf/ops:** (a) is a one-time bearer token (24h), hash-only storage; cheap; low ops burden.
- **Recommended:** (a). **Reason:** proportionate assurance for closed-beta; reuses existing hashing. **Conditions to change:** counsel requires higher assurance → (b)/(c). **Status:** decided.

### DEC-03 — Reuse `isPlatformAdminRole` as operator gate
- **Problem:** who can operate the queue.
- **Options:** (a) reuse `ceo`/`admin`; (b) new `operator`/`dpo` role.
- **Recommended:** (a) for closed-beta. **Reason:** proven in `beta-allowlist-admin.ts`; zero new role surface. **Conditions to change:** post-beta, introduce DPO role (`OPEN-OPS-01`). **Status:** owner-delegated planning decision (pending owner confirm).

### DEC-04 — Two-step erasure (dry-run + confirm)
- **Problem:** erasure is destructive and scope-sensitive.
- **Options:** (a) dry-run + confirm + re-auth; (b) one-click; (c) auto-on-approval.
- **Recommended:** (a). **Reason:** never auto-purge; reconcile with retention cron via shared audit sink. **Conditions to change:** none. **Status:** decided (gated on `OPEN-ERASE-01` scope).

### DEC-05 — Confirmation email in the existing `after(...)` hook
- **Problem:** where to insert the email.
- **Options:** (a) `after(...)` hook (existing placeholder); (b) queue + cron; (c) inline (block intake).
- **Recommended:** (a). **Reason:** route already has the hook; circuit breaker degrades safely; intake stays fast. **Status:** decided.

### DEC-06 — Reuse `data_retention_events` as erasure audit sink
- **Problem:** where to record erasure evidence.
- **Options:** (a) reuse `data_retention_events`; (b) new dedicated table.
- **Recommended:** (a). **Reason:** existing table already has the right enum (`anonymized`/`purged`) and indexes; retention cron and erasure action share semantics. **Status:** decided.

### DEC-07 — Single additive migration `0037`
- **Problem:** schema evolution.
- **Options:** (a) one additive migration; (b) multiple; (c) in-place alter of 0033.
- **Recommended:** (a). **Reason:** additive is safe; preserves existing rows/constraints. **Status:** decided.

### DEC-08 — Owner-delegated planning decisions vs true owner decisions
- **Catalog:**
  - Owner-delegated planning decisions (safe to default, confirm later): DEC-03 (operator role reuse), SLA target 30d (`OPEN-LEGAL-02` default), minimal erasure scope (`OPEN-ERASE-01` default).
  - True owner/legal decisions (cannot default safely): privacy-notice wording (`OPEN-LEGAL-01`), final SLA policy (`OPEN-LEGAL-02`), final erasure scope (`OPEN-ERASE-01`).

### DEC-09 — Status lookup is token-bearer (not enumeration-safe id-only)
- **Problem:** how requesters check status.
- **Options:** (a) id + token; (b) id only; (c) authenticated "my requests".
- **Recommended:** (a) for anonymous; (c) deferred. **Reason:** 128-bit token prevents enumeration; 404 uniform. **Status:** decided.

## Assumptions

- **ASSUMP-01:** Closed-beta volume is tens–hundreds of requests (no perf pressure). Source: `repo evidence` (pre-launch stage in `current-state.md`).
- **ASSUMP-02:** `AUTH_AUDIT_HASH_PEPPER` is set in all target environments (production throws if absent). Source: `repo evidence` (`account-audit.ts`).
- **ASSUMP-03:** Cloudflare Email binding (`EMAIL`) is wired and deliverable (proven by other flows). Source: `repo evidence` (`better-auth-cloudflare.ts` magic link).
- **ASSUMP-04:** D1 (`ARCH_DB`) and R2 (`ARCH_UPLOADS_R2`) bindings are within free-tier at projected volume. Source: `AGENTS.md` cost posture.
- **ASSUMP-05:** The retention cron continues to run daily at 03:30 UTC unchanged. Source: `repo evidence` (`worker.ts`).
- **ASSUMP-06:** No concurrent agent is editing `privacy-request-repository.ts` during implementation (executor declares ownership). Source: `AGENTS.md` high-concurrency rules.
- **ASSUMP-07:** The 30-day SLA target is acceptable until counsel confirms. Source: owner-delegated.
- **ASSUMP-08:** A minimal erasure scope (user profile + owned estimates) is acceptable until counsel confirms. Source: owner-delegated.
- **ASSUMP-09:** Platform-admin role is acceptable as operator for closed-beta. Source: owner-delegated.

## Alternatives considered (summary)

- New operator/DPO role → rejected for closed-beta (DEC-03).
- KBA/SMS identity assurance → rejected for closed-beta (DEC-02).
- Dedicated erasure audit table → rejected (DEC-06).
- One-click erasure → rejected (DEC-04).
- Inline (blocking) confirmation email → rejected (DEC-05).
- Turnstile at intake → deferred (`ABUSE-2`).

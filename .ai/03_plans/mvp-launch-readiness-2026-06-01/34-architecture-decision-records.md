# Architecture Decision Records

## Fourth-Pass Closed Beta ADRs - 2026-06-02

### ADR: Closed Beta Instead Of Public Launch

Decision: launch as invite-only closed beta. Public paid launch is deferred.

### ADR: Google Sign-In Plus Email Whitelist

Decision: require Google-authenticated Supabase user plus server-side `closed_beta_allowed_emails` status for `/workshop`.

### ADR: Manual Supabase Whitelist Management

Decision: Philip manages allowlist rows manually for MVP. Admin UI is deferred.

### ADR: No Payment/Billing In Closed Beta

Decision: no Stripe, checkout, subscriptions, paid tiers, invoices, or plan enforcement.

### ADR: Pricing Page Hidden Or Reframed

Decision: `/pricing` can remain public only as closed-beta access/contact copy.

### ADR: Redis Deferred

Decision: Redis is deferred unless beta metrics show distributed rate limiting, queueing, or export status needs.

### ADR: Manual Beta Invite Workflow

Decision: Philip can send invite emails manually; Resend beta-invite automation is not P0.

### ADR: Feedback Collection Approach

Decision: P0 feedback is protected `/workshop/feedback` plus support email fallback. The local app now includes an insert-only `beta_feedback_submissions` table path; launch still requires linked migration apply, hosted smoke, monitored review workflow, and alert ownership proof.

Commit audited: `681c95e64864f283950a88dba304eaffe8f2f8b3`

## ADR-001 — Defer Ask Flip From MVP

- Status: Accepted for MVP.
- Context: UI and AI routes exist; MVP requires no unfinished AI visible.
- Decision: Hide Ask Flip and fail-close AI routes by default.
- Alternatives: Ship read-only AI; remove AI code. Rejected because legal/security/cost proof is missing and deletion is unnecessary.
- Consequences: MVP demo focuses on estimating/export.
- Rollback/revisit: Reactivate only after legal/privacy, rate limits, audit, no-provider tests, and opt-in UI copy.

## ADR-002 — Use `detached` For Project-Specific Unlinked Components

- Status: Accepted pending implementation.
- Context: Enum includes `detached`; rows have source metadata.
- Decision: `detached` means intentionally severed from a real library source; `unlinked` means never-linked/manual.
- Alternatives: Use `unlinked` for all. Rejected because it loses provenance semantics.
- Consequences: UI/history must explain state.
- Revisit: If linked schema lacks production enum after linked verification.

## ADR-003 — Preserve Source Snapshot / Metadata Safely

- Status: Accepted.
- Context: `source_snapshot` and `metadata` exist.
- Decision: Preserve previous source snapshot on detach; store user-safe unlink metadata; avoid raw metadata in public DTOs.
- Alternatives: Clear all source data. Rejected because audit/history value is lost.
- Consequences: Payload size/privacy must be controlled.
- Revisit: If event payload size approaches limits.

## ADR-004 — Excel Before PDF

- Status: Accepted.
- Context: References and target users rely on Excel bid forms.
- Decision: MVP ships professional Excel workbook first; PDF proposal letter is post-MVP.
- Alternatives: Build PDF first. Rejected as lower workflow fit and higher layout risk.
- Consequences: Excel formulas/openability are P0.
- Revisit: After beta validates workbook contract.

## ADR-005 — Material/Labor Compatibility Mode

- Status: Accepted pending schema verification.
- Context: Current export maps `itemCost` to material and labor to `0`.
- Decision: MVP may use honest material/labor compatibility mode, with clear notes that labor is not separately modeled unless schema supports it.
- Alternatives: Fake labor split. Rejected as misleading.
- Consequences: Summary/remarks must clarify assumptions.
- Revisit: After labor/supply-install schema decision.

## ADR-006 — Redis Deferred Unless Thresholds Fail

- Status: Accepted with trigger.
- Context: Closed beta scale can use Next/Supabase/TanStack and durable Postgres rate-limit audit.
- Decision: No broad Redis cache for MVP; add Redis/Upstash/Vercel KV for hot-path limiter/job status if public abuse/export/AI thresholds fail.
- Alternatives: Add Redis now. Rejected due new ops surface without current proof.
- Consequences: Performance gates decide.
- Revisit: Public share/invite/AI enabled or export becomes async.

## ADR-007 — Vercel + Supabase + Resend Launch Stack

- Status: Accepted.
- Context: Code already uses Next/Vercel assumptions, Supabase, Resend.
- Decision: Launch on Vercel + Supabase + Resend with env/rollback proof.
- Alternatives: Self-host or replace providers. Rejected for MVP speed.
- Consequences: Provider config is P0.
- Revisit: Reliability/cost/security issue.

## ADR-008 — Legal Pending-Review vs Reviewed Copy

- Status: Accepted no-go rule.
- Context: Current legal pages are placeholders.
- Decision: Public/beta/paid launch requires reviewed or explicitly closed-beta-approved legal copy.
- Alternatives: Keep placeholders. Rejected for launch.
- Consequences: `LEGAL-001` blocks launch.
- Revisit: legal reviewer signs off.

## ADR-009 — Beta Without Billing

- Status: Accepted.
- Context: Billing not required for learning MVP.
- Decision: Closed beta/free preview; paid prospects handled only after legal/support/security readiness.
- Alternatives: Add billing now. Rejected as scope expansion.
- Consequences: Pricing copy must not imply active subscription.
- Revisit: after beta reliability.

## ADR-010 — Observability Stack Required

- Status: Accepted.
- Context: Beta needs error/support visibility.
- Decision: Add Sentry or equivalent plus Vercel/Supabase/Resend dashboards and support inbox.
- Alternatives: Logs only. Rejected for beta support.
- Consequences: Privacy/log scrubbing required.
- Revisit: vendor choice during `OBS-001`.

## ADR-011 — E2E / Manual QA Strategy

- Status: Accepted.
- Context: Critical E2E specs are env-gated and current local E2E was blocked by port collision.
- Decision: Use automated tests plus explicit manual/staging proof for auth, export, Resend, RLS, and demo flows.
- Alternatives: Rely on CI only. Rejected because CI can pass while gated specs skip.
- Consequences: `QA-002` owns zero-defect matrix.
- Revisit: once release E2E env is stable.

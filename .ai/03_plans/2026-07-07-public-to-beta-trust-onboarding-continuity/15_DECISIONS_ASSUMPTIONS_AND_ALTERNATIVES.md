# 15 — Decisions, Assumptions, and Alternatives

## Decisions

### DEC-CONT-01 — Single post-auth clickwrap terms gate; non-binding pre-link on ClosedBetaGate
**Problem:** should `ClosedBetaGate` require a terms-acceptance checkbox (creating a pre-signup gate) in addition to the existing post-auth clickwrap?
**Constraints:** avoid double-gates; keep an auditable `authenticated_clickwrap` record; reduce first-session confusion.
**Options considered:**
- A) Require a checkbox on `ClosedBetaGate` + keep post-auth gate (double gate). **Rejected** — friction; the beta-request is not account creation yet (no identity), so a pre-identity "acceptance" has weak audit value.
- B) Move the gate to pre-signup only. **Rejected** — loses the authenticated, content-hashed, version-pinned record that `0002_legal_terms_acceptance.sql` provides.
- C) **Keep the post-auth clickwrap as the single gate; add a plain-language, non-binding "by requesting access you agree to..." line with links on `ClosedBetaGate`.** **Recommended.**
**Security/UX/ops implications:** C preserves the strong audit record, sets expectation honestly, adds zero friction. The pre-link is informational, not a second legal event.
**Conditions that would change it:** owner/legal requires an explicit pre-identity checkbox (OPEN-CONT-06).

### DEC-CONT-02 — Server-action `requestBetaAccess` replaces silent mailto POST
**Problem:** the `ClosedBetaGate` currently POSTs to `/contact` as a mailto builder with no server intake — no audit, no rate-limit, no receipt.
**Options:**
- A) Keep mailto. **Rejected** — security (no audit/limit) + UX (silent) gaps (G7).
- B) Build a full contact server-action pipeline. **Rejected** — over-scoped; `ClosedBetaGate` only needs beta-request intake.
- C) **A narrow `requestBetaAccess` server action: honeypot + rate-limit + audit row + uniform receipt.** **Recommended.**
**Implications:** C closes G7 + the audit-trail gap with minimal surface; reuses existing tables (no migration).

### DEC-CONT-03 — Claims ledger remains the single truthfulness framework
**Problem:** how to keep continuity copy truthful without inventing a new trust framework.
**Options:** invent a new matrix (rejected — duplication) vs **reuse the existing `claims-ledger` Live/Building/Planned model** (recommended). No new framework invented.

### DEC-CONT-04 — First-project handoff via dashboard CTA + onboarding-redirect refinement (no wizard)
**Problem:** how to provide first-workflow handoff.
**Options:**
- A) Build a guided `/workshop/onboarding` wizard. **Rejected** — over-engineered for closed beta; the sibling `first-user-activation-empty-workspace` pack considers deeper flows.
- B) **Dashboard empty-state CTA + redirect `/workshop/onboarding` to `/workshop/projects` when empty.** **Recommended.**
**Implications:** B is the lightest path that removes the dead-end.

### DEC-CONT-05 — Welcome email = one plain email, no tokens, idempotent, owner-gated
**Problem:** add a welcome touchpoint without credential risk.
**Options:** rich HTML with magic-link reuse (rejected — credential leakage risk) vs **plain email with a `/workshop` link only, idempotent via security event, gated on delivery config** (recommended).

### DEC-CONT-06 — Reuse existing audit/rate-limit/security-event tables (no migration)
**Problem:** where to store `beta_access_requested` + `welcome_email_sent`.
**Options:** new tables (rejected — migration + ceremony) vs **reuse `closed_beta_allowlist_audit_events` + `security_rate_limit_events` + `account_security_events` with new `event_type` values** (recommended). Fallback column-add only if a query proves inefficient.

### DEC-CONT-07 — `/cookies` as a standalone `force-static` page
**Problem:** where the cookie policy lives.
**Options:** embed in `/privacy` only (rejected — consent banner has no direct policy link) vs **standalone `/cookies` linked from the banner** (recommended; OPEN-CONT-03).

## Alternatives evaluated (load-bearing only)
- **Self-serve signup now:** rejected (owner hasn't enabled `L-FUN-2`; closed-beta grant model stays — `02` non-goals).
- **New `/support` or `/help` route:** deferred (support is email-only for closed beta; not needed for continuity).
- **New `(legal)` route group:** rejected (legal pages are flat top-level routes; a group adds churn without benefit).
- **Dynamic OG image route:** deferred (no dynamic OG needed for closed beta; `/og/default.png` static asset suffices if added).

## Assumptions (full list in `02`; validated status)
- ASSUMP-CONT-01..06 (v3 live, grant-based beta, single terms gate, email can be enabled, claims-ledger canonical, archestimator.com domain). Validated except CONT-06 (OPEN-CONT-05).

## Open decisions
OPEN-CONT-01..06 (see README blocked-decisions table). Each has a recommended option and conditional path; none blocks planning completion; they gate specific implementation copy/label slices.

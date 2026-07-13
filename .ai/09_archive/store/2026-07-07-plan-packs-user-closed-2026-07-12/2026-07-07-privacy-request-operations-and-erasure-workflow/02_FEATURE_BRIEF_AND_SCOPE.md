# 02 — Feature Brief And Scope

## Source (verbatim)

> **PROMPT.md** (`/.ai/03_plans/2026-07-07-privacy-request-operations-and-erasure-workflow/PROMPT.md`):
>
> **Goal.** Create a plan pack for turning privacy request intake into an operator-ready workflow with identity verification, status lifecycle, confirmation, fulfillment, and erasure/export evidence.
>
> **Evidence To Start From.** `src/app/api/compliance/privacy-requests/route.ts` provides intake. Privacy request repository/tests and migration support exist, but email confirmation and complete fulfillment workflow remain partial. Retention/DSAR data lifecycle work is related but broader; this pack should focus on user request operations. Compliance roadmap items reference privacy notice, RoPA, processor register, breach runbook, scanner, and retention gates.
>
> **Required Plan Pack.** Define request states, identity checks, SLA timers, operator queue, email templates/proof, export/delete actions, audit evidence, abuse controls, and tests for anonymous and authenticated requesters.
>
> **Constraints.** Keep legal advice out of the implementation plan; call out owner/legal decisions. Do not store secrets or raw personal data in evidence.
>
> **Stop Condition.** The pack is complete when a future executor can implement and verify privacy request operations end to end.
>
> **Mode.** Planning only. Create the plan pack in this folder; do not change application code.

## Brief classification

- `planning-only` (per `PROMPT.md` and `Creating-Plan-Prompt.md` / `Multi-Agent-Execution-Directive.md`).
- Plan profile: `exhaustive` (touches D1 schema/migrations, app authorization, identity verification, email, audit, and data erasure).

## Product outcome

A user (anonymous or authenticated) can submit a privacy request and have it verified, queued for an operator, triaged, fulfilled (export and/or erasure), and closed — with confirmation/status emails at each meaningful transition and an audit trail that survives the retention cron. An operator (platform admin for closed-beta) can work the queue from a UI, transition requests through a defined state machine, and produce evidence of fulfillment.

## In scope

1. Request **states** and allowed **transitions** (state machine + who can trigger each).
2. **Identity verification** for anonymous and authenticated requesters (token-based email loop + authenticated-requester fast path).
3. **SLA timers** (clock start, target, breach detection, escalation owner) — designed, gated on `OPEN-LEGAL-02`.
4. **Operator queue** UI + platform-admin gate (reuse `beta-allowlist-admin.ts` pattern).
5. **Confirmation email** (intake) and **status-update emails** (transitions) — templates + Cloudflare Email proof.
6. **Export fulfillment** (data package generation + secure delivery + evidence).
7. **Erasure/anonymization fulfillment** (dry-run + operator-confirmed; gated on `OPEN-ERASE-01`).
8. **Audit evidence** for every transition and fulfillment (HMAC discipline + `data_retention_events`).
9. **Abuse controls** on intake (D1 sliding-window rate limit; optional Turnstile).
10. **Tests** for anonymous and authenticated requesters, operator denial, identity verification, lifecycle, fulfillment, and abuse.

## Out of scope (non-goals)

- Broader DSAR/retention rework — the retention engine and cron already exist and are referenced, not redesigned.
- Privacy-notice **content** authoring (`OPEN-LEGAL-01`).
- RoPA, processor register, breach runbook **authoring**, DPIA, file-scanner work (separate compliance roadmap items; referenced only).
- A dedicated DPO/operator role (`OPEN-OPS-01` recommends reusing `isPlatformAdminRole`).
- Legal-hold infrastructure beyond a forward-compatible flag.
- Any Supabase/Postgres or legacy-provider work.
- Production rollout of `P3`/`P4` without owner decisions.

## Success criteria for the planning pack

- A future executor can implement and verify the workflow end to end (the `PROMPT.md` stop condition).
- Every requirement has a stable ID, an objective acceptance criterion, an exact target path/symbol (or an explicit `BLOCKED-*` with options + recommendation), and a test/proof mapping.
- The state machine, identity model, SLA model, and credential material taxonomy are fully specified.
- The D1 migration blueprint is implementable without invention.
- Shadow-path matrices are complete for every behavior-bearing flow.
- Owner/legal decisions (`OPEN-LEGAL-01`, `OPEN-LEGAL-02`, `OPEN-ERASE-01`, `OPEN-OPS-01`) are isolated so `P0`–`P2` can proceed independently.

## Stakeholders

- **Owner:** Philip Lewis (product, legal-decision authority, operator role for closed-beta).
- **Legal/counsel:** privacy-notice wording, SLA policy, erasure scope sign-off (`OPEN-LEGAL-01/02`, `OPEN-ERASE-01`).
- **Operator:** platform admin (`ceo`/`admin`) for closed-beta.
- **Implementer:** future execution AI / engineer.
- **Requester:** anonymous or authenticated Archestimator user.

## Constraints

- No legal advice in the implementation plan; owner/legal decisions called out explicitly.
- No secrets or raw personal data stored in evidence; email/IP/UA stored as HMAC hashes (`AUTH_AUDIT_HASH_PEPPER`).
- Stay within Cloudflare resources bound in `wrangler.jsonc` (`ARCH_DB`, `EMAIL`); never touch the legacy Supabase project or other accounts.
- Free-tier cost posture (per `AGENTS.md`); no paid add-ons without owner approval.
- Proportional verification (per `AGENTS.md`): narrow slices use focused type/LSP/test checks; broad `validate`/`build` reserved for shared logic, auth/security, data-integrity, or release.

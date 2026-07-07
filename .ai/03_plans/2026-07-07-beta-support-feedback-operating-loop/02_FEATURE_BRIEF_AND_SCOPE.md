# 02 — Feature Brief and Scope

## Source brief (verbatim from `PROMPT.md`)

> **Goal:** Create a plan pack for the first-user beta support loop: contextual feedback capture, acknowledgement, triage, support monitoring, status expectations, and product-learning evidence.
>
> **Evidence to start from:** `src/app/workshop/feedback/page.tsx`, `src/components/workshop/BetaFeedbackForm.tsx`, `src/app/workshop/settings/feedback/page.tsx`. Support monitoring readiness currently depends on scripts/operator evidence. Existing UX plans mention feedback and support but do not define the operating loop. Launch readiness and observability alert proof depend on support response being real.
>
> **Required plan pack:** Define feedback entry points, required context, severity taxonomy, acknowledgement UX, operator queue, triage SLA, linked evidence, support alert integration, privacy handling, and tests.
>
> **Constraints:** Do not overbuild a CRM. Use the smallest loop that supports first users and produces actionable evidence.
>
> **Stop condition:** The pack is complete when beta feedback can be handled, measured, and followed up without ad hoc operator behavior.

## Interpretation & reconciliation

The brief assumes the feedback loop needs to be *designed from scratch*. The codebase audit (see `03_SOURCE_AND_CODEBASE_AUDIT.md`) shows the **capture half is already built**: D1 tables, Server Actions, admin review queue, auth gating, status audit events, severity/type taxonomy, mailto fallback. Therefore this plan's scope is the **operating loop around the existing capture** — not a green-field build.

Reconciliation: the brief's "Define feedback entry points … severity taxonomy" items map to **documenting and lightly completing** existing surfaces, not creating new ones. The "operator queue" already exists; the gap is the *operating behavior* (notification, SLA, follow-up, retention, proof).

## In scope

### Functional (behavior changes)

1. **Operator notification on new feedback** — operator email (and optional webhook) when a new `blocker` or `high` severity submission lands; queue badge/counter for all severities.
2. **Reporter acknowledgement** — honest success acknowledgement + a status-expectation promise (e.g. "We review blocker/high reports within 1 business day").
3. **Triage SLA** — additive timestamp columns (`first_response_at`, `responded_at`, `alerted_at`); a defined business-day SLA; a daily cron sweep that flags breaches.
4. **SLA breach alerting** — when the sweep detects a breach, fire the operational-alert webhook + log + queue flag.
5. **Reporter follow-up** — email the reporter when their submission moves to `resolved` (and optionally `reviewing`), so the loop is closed back to the user.
6. **Queue pagination** — replace the hard `LIMIT 50` with paginated reads so feedback beyond the latest 50 is reachable (`SUPPORT-001` persona gap).
7. **Retention/privacy TTL** — add `beta_feedback_submissions` to the retention registry with a 365-day TTL; purge only `archived` rows; ensure DSAR/erasure reaches feedback rows (couples to the privacy-request pack).
8. **Readiness proof** — a loop-specific readiness check that the inbox is monitored, alerts deliver, and the queue is live (couples to the launch-readiness + observability-alert-proof packs).

### Non-functional (quality gates)

- Accessibility: fix the weak label association on Type/Severity in `BetaFeedbackForm`; add `aria-live` to acknowledgement regions; focus management after inline submit.
- Security/privacy: feedback content is personal data (consent + legitimate interest) — redact from logs, respect retention, reachable by DSAR.
- Observability: structured `LogRecord`s for every loop event (new, alerted, breached, resolved, purged).
- Performance: queue reads stay sub-50ms at beta scale; SLA sweep stays well under the cron budget.

## Explicit non-goals

- **No CRM/helpdesk.** No ticket-threading, assignment-to-agents, macros, SLA policy engine, CSAT surveys, or Intercom-style widget. (Per brief + `DESIGN.md` line 731: "Do not imitate Intercom's support/helpdesk content.")
- **No real-time chat / live presence.**
- **No public feedback into D1.** The unauthenticated `/contact` mailto path stays a separate funnel for beta (`OPEN-FUNNEL-01`, deferred). Revisit post-beta.
- **No taxonomy changes.** The `feedback_type` (bug/confusing_ux/missing_feature/export_issue/estimate_accuracy/other), `severity` (blocker/high/medium/low), and `status` (new/reviewing/resolved/archived) enums stay as-is.
- **No new operator role.** Reuse `isPlatformAdminRole` (`OPEN-OPS-01`) rather than introducing a dedicated support-operator or DPO role.
- **No screenshot/upload capture.** Out of scope for beta; the page-path + user context is enough context for first users. (Flagged as a future enhancement, not a beta blocker.)
- **No in-app status page for reporters.** Reporters get email follow-up; a "my submissions" view is post-beta.
- **No re-indexing of historical feedback** beyond the additive timestamp columns (nullable; backfill is N/A).

## Scope boundaries (what touches what)

| Surface | In scope? | Note |
|---|---|---|
| `beta_feedback_submissions` schema | additive columns only | `first_response_at`, `responded_at`, `alerted_at` (nullable) — migration `0039` |
| `beta_feedback_status_events` | read-only reuse | audit trail already written; surfaced in queue optionally |
| `BetaFeedbackForm` | light edits | acknowledgement copy + status-expectation text; a11y label fixes |
| `submitBetaFeedback*` actions | extend | set `first_response_at` is operator-driven (set on first status change), not on submit |
| Review queue page | extend | pagination + SLA badges + breach flag |
| `sendEmail` | new call sites | operator notification + reporter follow-up (reuse existing client) |
| `sendUploadOperationalAlert` pattern | clone for feedback | new `sendFeedbackAlert` following the same env triplet |
| Cron `worker.ts scheduled()` | add a branch | daily SLA sweep (e.g. a 4th cron or reuse an existing slot) |
| Retention registry | add a rule | feedback TTL entry (couples to `OPEN-DEC-004`) |
| `/contact` public form | **not touched** | stays mailto (deferred funnel unification) |
| Better Auth / roles | **not touched** | reuse `isPlatformAdminRole` |
| Durable Objects / Queues | **not touched** | cron + direct email is enough; no need to enqueue a feedback job at beta scale |

## Acceptance criteria (product stop condition)

The loop is complete when, demonstrably:

- **AC-1** Every new `blocker`/`high` feedback submission produces an operator notification (email or webhook, with proof of send result logged) within the same request lifecycle, and the operator queue shows an unread/badge counter.
- **AC-2** The reporter sees an honest acknowledgement that names the status-expectation promise, and the success path does not lose the user's input on D1 write failure (mailto fallback carries the payload).
- **AC-3** A daily sweep computes SLA status for every non-archived submission using business-day math, flags breaches, and alerts + logs on breach — without ad hoc operator action.
- **AC-4** When a submission moves to `resolved`, the reporter receives a follow-up email (send result logged; gracefully degraded if email not configured).
- **AC-5** The review queue paginates beyond 50 rows and never silently drops older feedback (`SUPPORT-001`).
- **AC-6** Feedback rows are retained under a documented TTL, only `archived` rows are purged, and DSAR/erasure reaches feedback rows.
- **AC-7** A readiness check proves inbox monitoring + alert delivery + queue liveness before beta widens (links to the launch-readiness evidence gate).

(These are the product-level ACs; per-requirement ACs are in `04_REQUIREMENTS_SPECIFICATION.md`.)

## Coupled / dependent packs

- `2026-07-07-launch-readiness-evidence-gate` — owns the go/no-go gate this loop feeds.
- `2026-07-07-observability-alert-proof-and-log-retention` — owns the hosted alert-delivery proof this loop's alerting depends on (`OPEN-MON-01`).
- `2026-07-07-privacy-request-operations-and-erasure-workflow` — owns the DSAR/erasure path feedback rows must be reachable from (P3).

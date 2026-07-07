# 02 — Feature Brief and Scope

## Source brief (verbatim summary)

From `PROMPT.md`:

- **Goal.** Create a workflow plan for turning an estimate into a client-ready proposal package with clear readiness checks, selected sheets, terms, recipients, and delivery proof.
- **Evidence to start from.** `EstimateHeaderActions.tsx` + `ProposalExportPreviewDialog.tsx` expose proposal/export actions. `PublisherDrawer.tsx` + `SheetPickerList.tsx` support publication. Proposal export integrity has a separate deliverable-trust pack; **this pack focuses on owner workflow**. Existing UX items include proposal and publication flows but **not a unified readiness checklist**.
- **Required plan pack.** Define readiness checklist, missing-data blockers, stale/source-risk warnings, sheet selection, recipient setup, preview states, delivery confirmation, resend/revoke flow, tests, and proof artifacts.
- **Constraints.** Keep internal estimator data protected. Do not assume every proposal must be exported the same way; plan for publishing and downloadable deliverables.
- **Stop condition.** The pack is complete when an executor can implement a coherent owner workflow from estimate to client-ready package.

## Scope (in)

| # | Scope item | Source | Where addressed |
|---|---|---|---|
| S1 | **Readiness model** (hard blockers + soft warnings), server-derived, redacted for client preview | Brief: "clear readiness checks" | 04, 06, 11 |
| S2 | **Missing-data blockers** that prevent Send/Publish (e.g., no recipients configured, zero totals, missing currency) | Brief: "missing-data blockers" | 04, 06 |
| S3 | **Stale / source-risk warnings** at send time (snapshot behind live estimate, unsaved edits, expired/rotated link) | Brief: "stale/source-risk warnings" | 04, 05, 09 |
| S4 | **Sheet selection** for the package (existing) | Brief: "selected sheets" | 03, 06 |
| S5 | **Recipient setup** including owner-composed message (subject + body + personal note) | Brief: "recipients" | 04, 06, 11 |
| S6 | **Preview states** for the package before send (what the client will see vs. what the owner sees) | Brief: "preview states" | 05 |
| S7 | **Delivery confirmation** — honest signal of what is knowable (sent/opened/responded) and what is not (delivered/bounced until provider webhook exists) | Brief: "delivery proof" | 04, 07, 09 |
| S8 | **Resend / revoke flow** coherence with the new readiness + message model | Brief: "resend/revoke flow" | 03, 06 |
| S9 | **Unified owner entry** — connect Export Preview ↔ Publisher drawer so the owner has one coherent journey (optional v1.1 CTA; v1 ships the readiness model feeding both) | Brief: "unified readiness checklist" / owner workflow | 06 |
| S10 | **`publication_activity` notification dispatch** so owners learn about decisions/comments without watching the Activity tab | Derived from "delivery proof" + owner workflow | 04, 11 |
| S11 | **`responded` delivery status** wired on client decision | Derived from "delivery proof" | 07, 11 |
| S12 | **Terms** — surface what terms apply (platform beta terms) at the owner-send step; do **not** invent per-proposal legal terms | Brief: "terms" | 04, 08 |

## Non-goals (out of scope, with rationale)

| # | Non-goal | Rationale |
|---|---|---|
| N1 | New `proposals` table | "Proposal" is already a `project_publications` row + snapshot; adding a table is needless abstraction |
| N2 | PDF generation | Greenfield — no PDF plumbing exists; the PROMPT explicitly separates "downloadable deliverables" (XLSX exists) and the deliverable-trust pack handles export integrity |
| N3 | Bounce/complaint ingestion from Cloudflare Email | Provider limitation: Cloudflare Email Service has no inbound per-recipient webhook wired today; isolated as BLOCKED-EXTERNAL |
| N4 | Recipient read/unread inbox state | Recipient-side IA is covered by the separate `2026-07-07-recipient-proposals-inbox-ia-recovery` plan prompt; this pack stays owner-side |
| N5 | Per-proposal legal terms the client must accept | Platform beta terms are the only terms surface today; adding clickwrap for recipients is a legal/product decision outside owner-workflow scope |
| N6 | R2 snapshot blobs | Snapshot fits comfortably in D1 `snapshot_json` at current scale; blob storage is premature |
| N7 | Realtime collaboration changes | Out of scope; covered by collaboration plans |
| N8 | Provider migration off Cloudflare Email | Out of scope; Cloudflare Email is the active provider |
| N9 | Persisted readiness state on the publication row | Readiness is derived from live estimate + project + recipient state at send time; persisting it would just go stale |

## Conflicts and reconciliations

- **"delivery proof" vs reality.** The brief says "delivery proof." The codebase can prove **sent** (handed to Cloudflare Email), **opened** (link visited), and (after this plan) **responded** (decision submitted). It cannot today prove **delivered to inbox** or **bounced**. Reconciliation: the plan ships honest delivery confirmation for the knowable statuses and isolates the bounce path as an external blocker with a named owner action (not silently smoothed). See `04`/`07`/`15`.
- **"terms" vs platform-only terms.** The brief lists "terms." There are no per-proposal terms in the schema or UI. Reconciliation: the plan surfaces the platform beta terms at the owner-send step (so the owner acknowledges what their recipient is agreeing to by using the platform) and explicitly does not invent new legal artifacts. See `04`/`08`.
- **"selected sheets" granularity.** "Sheet" = an Estimate (the selectable unit in `SheetPickerList`); tabs are sub-units within an estimate used by export. The plan keeps the existing sheet-selection model and does not change granularity.

## Assumptions (labeled)

| ID | Assumption | Strength | Validated by |
|---|---|---|---|
| ASSUMP-01 | Cloudflare Email Service remains the outbound email provider | repo evidence | `transactional-email-client.ts`, `wrangler.jsonc` `EMAIL` binding |
| ASSUMP-02 | Snapshot continues to be stored as D1 JSON (not R2) | repo evidence | `0014`, `snapshot.ts` |
| ASSUMP-03 | The owner/admin role-rank model (`assertProjectPublicationManager`) is the correct authz gate for new owner-side actions | repo evidence | `actions.ts:392` |
| ASSUMP-04 | "Readiness" is a derived, point-in-time computation, not persisted state | derived | consistent with snapshot model + non-goal N9 |
| ASSUMP-05 | The deliverable-trust pack (`2026-07-07-proposal-export-and-immutable-deliverable-trust`) will own export-integrity concerns (hashing, immutable archive); this pack owns the owner workflow | brief | PROMPT.md "this pack should focus on owner workflow" |
| ASSUMP-06 | Owner-composed message is plain text (subject + body), sanitized server-side, no rich-text/HTML injection by the owner | derived | security posture: avoid stored-HTML injection |
| ASSUMP-07 | Bounce/complaint ingestion is not achievable on the current provider without a provider-side webhook decision | repo evidence + inference | empty `src/app/api/webhooks/resend/`, no webhook route |

All assumptions are revisited in `15`.

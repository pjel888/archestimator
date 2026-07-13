# 00 — Agent Coordination

Plan folder: `.ai/03_plans/2026-07-07-recipient-proposals-inbox-ia-recovery`
Plan date (Asia/Manila): 2026-07-07
Plan profile: `exhaustive`
Status: `CONDITIONALLY READY` (see `17_FINAL_READINESS_REVIEW.md`)
Verification mode: `emulated` (separated review passes by the lead agent; no native independent reviewer available in this session)

## Master goal

Convert the `PROMPT.md` feature brief — *recipient proposal inbox information architecture, email-link continuity, wrong-account recovery, expired/revoked link states, and review decision states* — into an evidence-based, codebase-specific, implementation-ready planning package that a separate implementation AI can execute without rediscovering requirements, architecture, affected files, failure modes, or validation procedures.

- User/business outcome: a recipient who receives a proposal email can find, open, review, and decide on that proposal with zero ambiguity; when something goes wrong (wrong account, expired/revoked link, no session, already decided), the recipient sees a clear, differentiated recovery path instead of a generic wall.
- Problem being solved: the inbox and share surfaces currently collapse many recipient failure states into a single generic "unavailable" page, expose no decision history, and do not coordinate the signed-in-app identity with the public-share recipient identity. The brief asks for the IA and recovery to be made unambiguous.
- Planning scope: **planning only**. Create the plan pack in this folder. Do not change application code, tests, migrations, schemas, infrastructure, or configuration.
- Non-goals: implementing the feature; building the owner-side publisher workflow (owned by `2026-07-07-client-ready-proposal-package-workflow`); building the immutable-export trust properties (owned by `2026-07-07-proposal-export-and-immutable-deliverable-trust`); changing the publication token credential model (coordinated with `2026-07-07-invite-token-flow-hardening`); enabling in-app notification dispatch for recipient events (Phase 5 of the client-ready-proposal-workflow, DATA-04 discovery-gated).
- Required codebase analysis: recipient inbox UI + repository + server action, share-page decision flow + session model, publication/recipient/response data model, error/not-found surfaces, test coverage, sibling security plans.
- Required specialist workstreams: product/UX/accessibility, architecture, data/database, security/privacy/threat-model, performance/reliability, testing/QA, blast-radius, adversarial review, final verification.
- Implementation-readiness criteria: every requirement traceable; every task has exact paths/symbols or a safe DISCOVERY-REQUIRED step; shadow-path matrices complete; acceptance criteria objective and testable; readiness scored; no internally resolvable critical gap remains.
- Validation criteria: this pack is validated by static cross-document consistency review, adversarial gap analysis, and an emulated final-verifier pass. No code change is performed.
- Final planning deliverables: the 22 documents in this folder (00–19 + README, with 16–19 being the traceability/readiness/stack/research docs).
- Stop condition: the pack is complete when recipient review and recovery can be implemented without product ambiguity (per `PROMPT.md` stop condition) AND all completion gates in `Creating-Plan-Prompt.md` §17 are met.

## Skills discovered and used

- `archestimator-plan-pack` — confirms this is a high-blast-radius surface (auth, invites, publication, shared-link flows) requiring a dated `.ai/03_plans/` plan pack with `LOOP_LEDGER.md`-style coordination. Used to select the `exhaustive` profile.
- `Creating-Plan-Prompt.md` — the authoritative planning directive; defines the 22-document structure, readiness scoring, and completion gates.
- `Multi-Agent-Execution-Directive.md` — the multi-agent orchestration and evidence rules; defines verification-mode caps.
- Read-only `Explore` subagents — dispatched three parallel lanes (inbox UI; share/security ecosystem; tests/recovery states) to gather codebase evidence. Their reports are summarized in `03_SOURCE_AND_CODEBASE_AUDIT.md` and `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md`.

No skills were fabricated. No skill was used merely as ceremony.

## Coordination ledger

| Lane / Agent | /goal | Scope | Evidence | Dependencies | Findings | Conflicts | Status |
|---|---|---|---|---|---|---|---|
| Lead (this agent) | Synthesize exhaustive plan pack from brief + evidence | Whole pack; owns all writes | PROMPT.md, Creating-Plan-Prompt.md, Multi-Agent-Execution-Directive.md | All lanes | Synthesis below | None | complete |
| Explore lane A "inbox UI" | Map recipient inbox UI surfaces | `src/components/workshop/proposals-page-client.tsx`, `src/components/workshop/proposals-page/*`, route, repository | File paths, symbols, line numbers, code excerpts | None | Path correction (client is NOT in subdir); TanStack-Query-only client; email-keyed repo query; 50-row limit | None | complete |
| Explore lane B "share/security" | Map share decision flow + invite/pub credential model + sibling packs + notifications | `src/components/share/*`, share route, decision API, session route, security.ts, sibling packs | Token taxonomy, cookie model, 9 sibling packs, no in-app recipient notification | Lane A (for inbox-authz contrast) | Decisions immutable (unique partial index); no share-level error.tsx; owner digests email-only; `publication_activity` kind unused | None | complete |
| Explore lane C "tests/recovery" | Map test coverage + recovery/error surfaces | `e2e/shared-link-receiver.spec.ts`, all share/inbox unit tests, error/not-found pages | 5 skipped E2E tests, vitest suites, single generic unavailable surface | Lanes A+B for symbol names | E2E entirely skipped; no differentiated expired/revoked copy (unlike invite flow); no decision-history UI; sub-components untested directly | None | complete |
| Emulated adversarial reviewer | Find P0/P1/P2 gaps in draft | Cross-document consistency, traceability, security | Draft documents | Lead synthesis | See `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` §adversarial review | None | complete |
| Emulated final verifier | Requirement-by-requirement audit | All 22 documents vs brief + repo evidence | Verifier matrix | Lead synthesis | See `17_FINAL_READINESS_REVIEW.md` | None | complete |

All lanes were read-only `Explore` subagents or emulated passes by the lead. No native independent reviewer was available in this session, so the adversarial review and final verification are `verification_mode: emulated`. This caps the package at `CONDITIONALLY READY` for a high-blast-radius surface per `Multi-Agent-Execution-Directive.md` §2 unless an owner accepts the package.

## Open decisions blocking implementation

| ID | Decision | Owner | Options | Recommendation | Impact |
|---|---|---|---|---|---|
| OPEN-IA-01 | Move inbox recipient-matching from email-string to `shared_link_session`-bound `recipientId`? | Owner (security product call) | (a) Keep email-matching (current); (b) Bind to session cookie `recipientId`; (c) Hybrid: email for listing, session for acting | (c) Hybrid — least churn, hardens the acting path without re-architecting the list query | Affects FR-05, FR-06, SEC-02, ARCH-03 |
| OPEN-IA-02 | Add differentiated recipient-visible copy for expired vs revoked vs never-existed tokens? | Owner (UX + privacy) | (a) Single generic "unavailable" (current); (b) Differentiate expired/revoked, keep unknown generic; (c) Full differentiation | (b) Differentiate expired/revoked with "Ask sender for a fresh link", keep unknown generic to avoid token enumeration | Affects FR-09, FR-10, SEC-05, UX-06 |
| OPEN-IA-03 | Allow recipients to revise a decision (undo/change)? | Owner (product) | (a) Keep immutable (current schema + UX); (b) Allow owner-permitted revision; (c) Allow free revision within a window | (a) Keep immutable for V1; surface finality clearly in the locked badge; defer revision to a later pack | Affects FR-12, DATA-03, UX-09 |
| OPEN-IA-04 | Wire `publication_activity` notifications to the recipient inbox (in-app bell)? | Owner (depends on client-ready-proposal-workflow Phase 5 / DATA-04) | (a) Email-only (current); (b) In-app bell + email; (c) In-app only | (a) Email-only for this pack; treat in-app as a downstream dependency of the notification dispatch work | Affects FR-14, ARCH-06 |

None of these block the non-ambiguous planning deliverable. Each is isolated with options, a recommendation, and a documented impact, so implementation can proceed on the recommended path or pause on a named slice pending owner sign-off.

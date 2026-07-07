# Client-Ready Proposal Package Workflow — Plan Pack

**Date:** 2026-07-07
**Plan folder:** `.ai/03_plans/2026-07-07-client-ready-proposal-package-workflow`
**Plan profile:** `exhaustive`
**Plan status:** `CONDITIONALLY READY`
**Verification mode:** `emulated` (single agent; high-blast-radius → capped at `CONDITIONALLY READY` until independent reviewer or owner accepts)
**Overall readiness score:** 96 / 100 (emulated cap 97)

This is a **planning-only** pack. No application code, tests, migrations, or provider state were changed.

---

## What this plan delivers

A planning package for the **owner workflow** that turns a finished estimate into a client-ready, sent, tracked proposal package — stitching three already-built surfaces (export preview, publisher drawer, publication lifecycle) into one coherent journey and closing the readiness / delivery-honesty gaps between them.

**Core gap addressed:** there is no readiness/preflight layer today (only "≥1 estimate selected" is gated), the recipient email copy is hardcoded, `delivery_status='responded'` is never written, `bounced` has no ingestion path, and `publication_activity` notifications are defined but never dispatched.

**In scope:** server-derived readiness model + gate, owner-composed recipient message, `responded` status wiring, notification dispatch, honest delivery labels, Preflight UI, resend/revoke gating, terms surfacing.

**Out of scope (deferred):** PDF generation (greenfield), bounce/complaint ingestion (BLOCKED-EXTERNAL — needs Cloudflare Email webhook decision), recipient inbox read/unread (sibling plan), per-proposal legal clickwrap, R2 snapshot blobs, new `proposals` table.

---

## Implementation start document

**`11_IMPLEMENTATION_PLAN.md`** is the authoritative execution guide. Start there.

### Phase order (dependency-aware)

```
Phase 0 — Discovery (read-only; resolves DATA-04)
   │
   ▼
Phase 1 — Readiness model + tests (spine)         ◄── critical path
   │
   ├──► Phase 2 — Send/Publish gate (needs Phase 1)
   │
   ├──► Phase 3 — `responded` status (independent — parallel-safe)
   │
   ├──► Phase 4 — Owner message + migration 0037 (needs Phase 0)
   │
   ├──► Phase 5 — Notifications dispatch (needs Phase 0 = DATA-04 ok)
   │
   ▼
Phase 6 — Owner UX (Preflight, honest labels, gating, terms) — needs Phases 1–4
   │
   ▼
Phase 7 — Integration, feature flags, docs, validate+build
```

**Critical path:** Phase 0 → Phase 1 → Phase 2 → Phase 6. Phases 3, 4, 5 can run in parallel lanes once their prerequisites are met.

---

## Dependency graph

```
DATA-04 discovery ─┬─► FR-08 notifications (Phase 5)
                   └─► (if absent: FR-08 defers — isolated)

FR-01 readiness lib ─┬─► FR-04 gate (Phase 2)
                     ├─► UX-01 preflight (Phase 6)
                     ├─► UX-02 export hints (Phase 6)
                     ├─► FR-09 resend/revoke gating (Phase 6)
                     └─► PERF-01 bench

migration 0037 ─► FR-05 owner message (Phase 4)

(independent) FR-07 responded flip (Phase 3)
```

---

## Requirement → task → test traceability (quick links)

| Requirement | Phase | Task | Test | Full row |
|---|---|---|---|---|
| FR-01 readiness | P1 | 1.1 | TEST-01 | `16` |
| FR-02 blockers | P1 | 1.1 | TEST-02 | `16` |
| FR-03 warnings | P1 | 1.1 | TEST-03 | `16` |
| FR-04 gate | P2 | 2.1 | TEST-04 | `16` |
| FR-05 message | P4 | 4.1–4.4 | TEST-07/08 | `16` |
| FR-06 honest labels | P6 | 6.3 | TEST-09 | `16` |
| FR-07 responded | P3 | 3.1 | TEST-10/15 | `16` |
| FR-08 notifications | P5 | 5.1 | TEST-11 | `16` |
| FR-09 resend/revoke gating | P6 | 6.3 | TEST-12 | `16` |
| UX-01 preflight | P6 | 6.1 | TEST-05 | `16` |
| UX-02 export hints | P6 | 6.2 | TEST-06 | `16` |
| UX-03 message UI | P4 | 4.3 | TEST-08 | `16` |
| UX-04 terms note | P6 | 6.3 | TEST-13 | `16` |

Full traceability (every requirement, every task, every test, every rollout check) is in `16_REQUIREMENTS_TRACEABILITY_MATRIX.md`.

---

## Blocked decisions table

| ID | Decision | Status | Owner | Recommendation | Unblock action |
|---|---|---|---|---|---|
| REL-01 | Bounce/complaint ingestion | BLOCKED-EXTERNAL | owner + Cloudflare | wait for CF Email inbound webhook; honestly label `sent` meanwhile | provider decision |
| DATA-04 | Do `notification_*` tables exist? | DISCOVERY-REQUIRED (Phase 0) | implementer | run `PRAGMA table_info` + grep `migrations/` | read-only discovery; if absent, FR-08 defers |
| count-unsaved-import | Is `countUnsavedEditableRows` server-importable? | DISCOVERY-REQUIRED (Phase 1) | implementer | import or extract shared pure helper | small refactor if blocked |
| DEC-01 | client-name warn vs block | DECIDED (warn for v1) | planner (owner-delegated) | warn | revisit post-closed-beta |
| DEC-02 | persist vs ephemeral message | DECIDED (persist) | planner (owner-delegated) | persist via `0037` | reversible (nullable cols) |

---

## Stale-plan revalidation checklist (run before first edit)

- [ ] `git status` clean / understand any concurrent-agent changes (`AGENTS.md` Section 6).
- [ ] `ls migrations/ | tail -1` still shows `0036` (else renumber `0037`).
- [ ] `bun run type-check` green on main (baseline).
- [ ] `rg "assertProjectPublicationManager"` still in `src/lib/publication/actions.ts`.
- [ ] `rg "delivery_status IN"` still shows the 5-value CHECK in `0014`.
- [ ] `rg "computeProposalReadiness"` returns nothing (not yet implemented).
- [ ] `rg "notification_deliveries"` — confirm table existence (resolves DATA-04).
- [ ] Re-read `03` (source audit) + `06` (architecture) + `07` (data) + `11` (this impl plan).
- [ ] Confirm sibling plans (`deliverable-trust`, `recipient-inbox-IA`, etc.) haven't landed conflicting changes in `src/lib/publication/*` or `src/components/workshop/publisher/*`.

---

## Commands to run before the first edit

```
git status
git diff --check
ls migrations/ | tail -1
bun run type-check
rg "assertProjectPublicationManager|delivery_status IN|computeProposalReadiness|notification_deliveries" src migrations
```

---

## Files explicitly off-limits (this pack's scope)

- `src/components/workshop/proposals-page/*` (recipient inbox — sibling plan)
- `src/lib/recipient-proposals/*` and `src/lib/repositories/recipient-proposals-repository.ts` (recipient-side)
- `src/lib/proposal-export/xlsx-workbook.ts` (XLSX writer — unchanged)
- Export route caps (`PROPOSAL_EXPORT_*_LIMIT`) in `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts`

---

## Files and systems intentionally unaffected

- R2, Durable Objects, Queues, Cron, Better Auth, Cloudflare WAF/DDoS, Turnstile, KV, Hyperdrive
- `wrangler.jsonc`, `cloudflare-env.d.ts` (no binding changes → no `cf:typegen`)
- Public share route contracts (`/share/[token]`, `/api/share/[token]/*`)
- XLSX export integrity (owned by the separate deliverable-trust pack)

---

## External proof required before production rollout

- Remote D1 migration `0037` applied + `PRAGMA table_info(shared_link_recipients)` shows new columns.
- Real recipient send smoke under the standing Cloudflare mandate (message renders, default fallback works).
- Closed-beta manual smoke: publish/send/decide/resend/revoke end-to-end.
- 24h closed-beta watch: zero `readiness_unavailable` structured-log entries.

---

## Archive policy

**Do not archive automatically.** Archive only after full implementation + closed-beta verification confirms the workflow is live and stable. Named completed slices (e.g., Phase 3 `responded`) may be archived independently if the rest stalls on REL-01.

---

## Document index

| Doc | Purpose |
|---|---|
| `00_AGENT_COORDINATION.md` | Master /goal, lanes, skills, ledger, verification mode |
| `01_EXECUTIVE_SUMMARY.md` | What/why, target-state, status, stop-condition check |
| `02_FEATURE_BRIEF_AND_SCOPE.md` | Brief, scope (S1–S12), non-goals (N1–N9), assumptions |
| `03_SOURCE_AND_CODEBASE_AUDIT.md` | Source map + codebase inventory (file:line) + gaps |
| `04_REQUIREMENTS_SPECIFICATION.md` | Stable IDs, ACs, shadow-path matrices |
| `05_UX_UI_ACCESSIBILITY_PLAN.md` | Journeys, state matrix, a11y, design-system reuse |
| `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` | Current/target architecture, reuse map, decisions |
| `07_DATA_DATABASE_API_NETWORK_PLAN.md` | Migration blueprint, access-path matrix, credential taxonomy |
| `08_SECURITY_PRIVACY_THREAT_MODEL.md` | Threat model, authz, validation, abuse |
| `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` | PERF evaluator, budgets, failure modes, observability |
| `10_BLAST_RADIUS_AND_DEPENDENCIES.md` | Classified impact + parallelization |
| `11_IMPLEMENTATION_PLAN.md` | **Execution guide** — phases, work packages, durable-goal contracts |
| `12_TEST_AND_VALIDATION_STRATEGY.md` | Test execution matrix, commands, gaps |
| `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` | Flags, gates, rollback, runbook |
| `14_RISK_REGISTER.md` | RISK-01..14 with mitigation |
| `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` | DEC-01..08 + rejected alternatives |
| `16_REQUIREMENTS_TRACEABILITY_MATRIX.md` | Requirement → task → test → rollout |
| `17_FINAL_READINESS_REVIEW.md` | Cycles, scores, verifier pass, status |
| `18_STACK_CONTRACT_AND_PRODUCTION_STANDARDS.md` | Cross-cutting stack production decisions |
| `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` | Research, adversarial matrix, evidence gaps |

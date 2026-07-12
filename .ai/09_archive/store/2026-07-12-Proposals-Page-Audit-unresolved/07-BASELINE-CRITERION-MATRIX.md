# 07 — Baseline Criterion Matrix (round 2, re-run)

> Improve-Plan-Prompt Phase 2/6. Read-only audit of the **current** proposals
> page against the dimensions the Improve prompt enumerates. Each cell is
> `PASS | FAIL | BOUNDARY | N/A` with exact evidence. **This is the round-2
> re-run** incorporating the deep-audit findings from `08` (domain), `09`
> (privacy), and `10` (technical). It supersedes the round-1 counts.
>
> Legend: **PASS** = current code meets the bar; **FAIL** = concrete defect or
> gap against intent; **BOUNDARY** = depends on an owner decision / external
> fact; **N/A** = not applicable to this surface.

## Criterion matrix

| Field | Status | Evidence | Missing / contradicted | Repair / AUTH |
|---|---|---|---|---|
| **Objective & scope fidelity** | FAIL | Owner directive "looks like projects page"; current page is a flat table (`proposals-page-client.tsx:114-128`) | No card grid, tabs, search, sort, view modes | Track B (`05`) |
| **Users/jobs (recipient inbox)** | FAIL (partial) | Journey A-D served for the common path, BUT: >50 proposals silently truncated (P2-1), corrupt row blanks all (P1-2), owner `responded` never written (P1-1), recipient PII survives removal (P1-4) | P1-1/2/4, P2-1 | Slices 1-3b |
| **Success/guardrail metrics** | FAIL | **No inbox analytics at all** (P2-11) — the inbox→open→decision funnel is unmeasurable; GA4/Clarity are public-pages-only (`10` §3) | No telemetry, no perf budget | Slice 6 + owner |
| **Source authority/freshness** | PASS | Audit grounded in current source (2026-07-12 reads); spec cross-checked; stale claims flagged (`01` §12, `15_Bugs`) | Spec has stale D3/floating-nav claims | Doc fix (out of scope) |
| **Requirements traceability** | PASS (planning) | `11-ABSORBED-2026-07-11-REQUIREMENTS.md` maps all 16 predecessor units; `05` maps all 25 bugs to A1-A12/B1-B9 units | Implementation unstarted | `IMPLEMENTATION_PLAN.md` |
| **Current-state grounding** | PASS | `01` + `10` — every claim has `file:line` | None | — |
| **Decision closure** | PASS | `06` closes 13 DEC-AUTO-* (incl. round-2 111/112/113); 4 AUTH-* remain owner boundaries | AUTH-1/2/3/4 | Owner |
| **Target design & pattern reuse** | PASS | `04` + `05` name exact primitives/patterns (`WorkshopCollectionLayout`, `Tabs`, `DropdownSelect`, persistence); `08` adds domain design (consent, assumptions) | None | — |
| **Execution DAG/units** | PASS (planning) | `05` (A1-A12, B1-B9) + `IMPLEMENTATION_PLAN.md` (8 ordered slices incl. 3b/3c) + `LOOP_LEDGER.md` | Not started | Slice 1 |
| **UX/accessibility** | FAIL (partial) | Status chips carry icon+text (good); but no list semantics (P3-3), no card-grid, no search/sort, mobile is single-breakpoint (P3-9), wrong-email recovery is one reactive string (AUTH-3) | P3-3, P3-9, Track B | Track B |
| **Architecture/data/contracts** | FAIL | `responded` never written (P1-1); D1 decision race — no unique constraint (P1-7); multi-version rows not de-duped (P2-14); `shared_link_events` write-dead (P2-12); inbox de-dup missing | P1-1, P1-7, P2-12, P2-14 | Slices 2, 3b, 3c, 6 |
| **Security/privacy** | FAIL | Enumeration oracle in `openRecipientProposalAction` (P1-6); recipient PII survives removal (P1-4); audit log no TTL (P1-5); log path leaks un-redacted records (P2-8); no rate limit on inbox query (P2-13). Round-1 said "PASS" — **wrong after deep audit.** | P1-4/5/6, P2-8, P2-13 | Slices 3b, 3c |
| **Performance/reliability** | FAIL | One bad row fails all (P1-2); errors swallowed unlogged (P2-2); silent LIMIT 50 (P2-1); refresh failures invisible in prod (P2-10); no rate limit on inbox (P2-13) | P1-2, P2-1/2/10/13 | Slices 1, 3, 3b, 3c |
| **Observability/monitoring** | FAIL | No Sentry/LogRocket; inbox swallowed-error is completely silent in prod (P2-2); client refresh failure emits no signal (P2-10); `shared_link_events` write-dead (P2-12); realtime/express telemetry are dev stubs | P2-2, P2-10, P2-12 | Slices 1, 3c, 6 |
| **Domain/industry fit** | FAIL (partial) | `08`: no electronic-consent disclosure (ESIGN/UETA/RA 8792 pillar); no sender-side assumptions/exclusions block (RICS NRM). Both beta-recommended. | AUTH-3 | Owner decision |
| **Test decision / evidence** | PASS (process) | All criteria `NOT_REQUIRED` w/ non-test evidence; `TEST_PROPOSAL`s recorded, none auto-run (User Test Authorization Gate honored) | No tests run (correct) | Owner `TEST_TASK` |
| **Operations/rollout/rollback** | BOUNDARY | Local implementation planned; hosted rollout proof separate; no hosted evidence requested | Release proof separate | Owner if release needed |
| **Concurrency/retry/cache** | BOUNDARY | TanStack `retry:false` + 30s staleTime accepted (DEC-AUTO-008); cross-cache gap ≤30s; **but** D1 decision race is real (P1-7) | P1-7 (concurrent decisions), cache staleness accepted | Slice 3b |
| **Idempotency/recovery** | PASS | `openRecipientProposalAction` is a redirect (idempotent); repo read is SELECT (idempotent); snapshot frozen at publish | None | — |
| **Completion audit** | N/A | This is an audit, not an implementation | — | — |

## Summary counts (round 2)

- **PASS:** 6 (source authority, current-state grounding, decision closure, target design, execution DAG, test-decision process, idempotency) — *down from round-1's 9, because round-2 correctly downgraded security, architecture, and observability to FAIL after the deep audit.*
- **FAIL:** 10 (objective fidelity, users/jobs partial, success metrics, UX/a11y partial, architecture/data, security/privacy, performance/reliability, observability, domain fit, requirements-traceability-pending-execution)
- **BOUNDARY:** 3 (operations/rollout, concurrency/cache, + owner decisions via AUTH)
- **N/A:** 1 (completion audit)

## What changed from round 1 → round 2

| Dimension | Round 1 | Round 2 | Why |
|---|---|---|---|
| Security/privacy | PASS (1 KNOWN exception) | **FAIL** | Deep audit found enumeration oracle (P1-6), PII-survives-removal (P1-4), audit-log no TTL (P1-5), log leak (P2-8) |
| Architecture/data | BOUNDARY | **FAIL** | Found decision race (P1-7), write-dead events (P2-12), multi-version rows (P2-14) |
| Observability | (not a row) | **FAIL** | Swallowed errors silent in prod (P2-2), refresh invisible (P2-10), write-dead telemetry (P2-12) |
| Success metrics | BOUNDARY | **FAIL** | No inbox analytics at all — funnel unmeasurable (P2-11) |
| Domain/industry fit | (not a row) | **FAIL (partial)** | `08`: missing consent disclosure + assumptions/exclusions block |
| Users/jobs | PASS | **FAIL (partial)** | P1-4 (PII survives removal) affects the recipient job |
| Idempotency/recovery | PASS | PASS | Confirmed — redirect + SELECT + frozen snapshot |

**Round 1 overstated security/architecture as PASS. The round-2 deep audit corrected this.** The matrix is now honest about the real beta-readiness posture.

## What this matrix proves (round 2)

1. The proposals inbox is **functional and idempotent on the happy path** (idempotency PASS, source grounding PASS, decision closure PASS).
2. It is **not production-hardened**: security/privacy, observability, architecture, and analytics all have real P1/P2 gaps that round 1 missed. These are now mapped to Slices 3b/3c/6.
3. The **dominant remaining work** is: (a) the Track B UX redesign (objective fidelity), (b) the Track A data hardening (P1-1/2/7), (c) the round-2 privacy/security hardening (P1-4/5/6, P2-8), and (d) analytics/observability (P2-10/11/12).
4. The pack is **decision-closed except for 4 owner boundaries** (grouping-in-V1, clientName, domain consent/assumptions, where-bugs-go).

## Resolved items (round 2)

- **P2-7 (auto-expiry sweeper):** statically resolved — **no sweeper exists, but no live bug**. Expiry is read-time-computed everywhere; the partial unique index never conflicts because revoke clears it first. Downgraded to P3 (cosmetic stored-vs-computed status divergence). See `02` P2-7 updated entry.

## Final-readiness note

This pack is **audit-complete and implementation-ready (NOT_STARTED)**. The
round-2 re-run corrected round-1's over-generous security/architecture PASS
ratings. The bug register (25 bugs: 7×P1, 12×P2, 6×P3 after P2-7 downgrade) and
the 8-slice `IMPLEMENTATION_PLAN.md` are the execution contract. See
`12-ADVERSARIAL-PASS.md` for the final convergence check.

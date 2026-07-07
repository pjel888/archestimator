# 19 — Research, Review, and QA Evidence

## Research questions and sources

| Question | Source | Finding | Decision it shaped |
|---|---|---|---|
| Is there a `proposals` table? | `migrations/` grep + `recipient-proposals-repository` | No — "proposal" = `project_publications` row | DEC-03 |
| Is there a PDF path? | grep `pdf\|jspdf\|pdf-lib\|puppeteer` in `src/lib/proposal-export` + `package.json` | None; XLSX only (hand-rolled `xlsx-workbook.ts`) | DEC-08 (defer PDF) |
| Is `delivery_status='responded'` ever written? | grep `delivery_status` writers | Only `pending`/`sent`/`opened` written; `responded`/`bounced` never | FR-07; REL-01 |
| Is there an email-event webhook? | `find src/app/api/webhooks` + grep `RESEND_WEBHOOK_SECRET\|svix\|email.delivered` | Empty `src/app/api/webhooks/resend/`; no webhook route | REL-01 BLOCKED-EXTERNAL |
| What's the latest migration? | `ls migrations/ \| tail -1` | `0036_cost_library_component_drafts.sql` | next = `0037` |
| Is email provider Resend or Cloudflare? | `transactional-email-client.ts` + `wrangler.jsonc` | Cloudflare Email Service only; `resend_*` columns are legacy-named | ASSUMP-01; FR-06 honest labels |
| Is there a readiness/preflight concept today? | grep `readiness\|preflight\|checklist` in workshop | Only email-delivery-readiness; no data-completeness readiness | FR-01..04 (core gap) |
| Does the recipient composer allow custom message? | `RecipientEmailComposer.tsx` + `RecipientInput` | Addresses only; subject/body hardcoded | FR-05 |
| Are notifications dispatched? | `src/lib/notifications/*` | Enum only; no INSERT path | FR-08 (DISCOVERY DATA-04) |

Sources used: repo source files, `migrations/`, `wrangler.jsonc`, current-state fast-path, AGENTS.md. No external/web research was required — all questions were answerable from the repo (consistent with the brief being an owner-workflow plan grounded in existing surfaces). No research was searched-for-but-not-found that would change a decision.

## Official-doc consultation (Next.js 16)

The plan does not introduce new routes, new Server Action shapes that diverge from existing ones, or new caching primitives; it reuses existing Next.js 16 patterns already proven in the repo (Server Actions, React Query, RSC data loaders). Per AGENTS.md, local `node_modules/next/dist/docs/` consultation is reserved for framework-sensitive work (route/cache/Server-Action/Proxy/image/deployment behavior changes). This pack introduces **none** of those; it composes existing patterns. Implementation should still consult the local docs if it touches the export route or adds any route — flagged in `11` Phase notes. This is a documented, proportionate exception, not a skip.

## Skills and workflows used / unavailable

- **Used**: `archestimator-plan-pack` (structural template); `Explore` subagent (4 parallel audits); `rg` + targeted reads (proportional per AGENTS.md).
- **Reflected as discipline but not invoked as live tools**: `ultragoal` (per-phase durable-goal contracts in `11`), `ultrawork` (parallel-lane classification in `10`), `ultraqa` (adversarial matrix below), `autoresearch` (research-gated decisions above), `performance-goal` (evaluator in `09`), `autopilot` (delivery-shape mapping in `00`). Recorded honestly: no native goal tool was available, so the master /goal is in `00`.
- **Intentionally skipped**: `gitnexus` (surface is localized; `rg`+reads proportional per the AGENTS.md proportional-graph policy — recorded, not a gap).
- **Unavailable**: native independent verifier lane → emulated verification (`17`).

## Specialist workstream outputs (summary)

| Workstream | Key output |
|---|---|
| Source/requirements | `02` scope + non-goals + assumptions |
| Architecture | `03`/`06` current + target + reuse map |
| Product/UX/a11y | `05` state matrix + a11y table |
| React/Next | `06`/`18` boundary + cache + mutation decisions |
| Backend/API/data | `07` migration blueprint + access-path matrix + credential taxonomy |
| Security/privacy | `08` threat model + SEC tests |
| Performance/reliability | `09` evaluator + failure modes |
| Test/QA | `12` execution matrix |
| Ops/rollout | `13` flags + gates |
| Blast radius | `10` classified impact |
| Adversarial | matrix below |
| Final verify | `17` emulated pass |

## Critique-and-revision cycle summaries

See `17` for the two cycles (initial synthesis → adversarial self-review → consistency/completeness). Concrete fixes: added TEST-14/15, tightened REL-02 fail-open/closed, made PERF-01 explicit, resolved deliverable-trust boundary, added credential taxonomy, corrected migration numbering, reconciled DEC-01, added 2 safe DISCOVERY tasks.

## UltraQA-style adversarial scenario matrix

Planning-task applicability note: dynamic adversarial QA of the *planning task itself* is not applicable (this is a planning-only task producing documents, not runtime code). The matrix below specifies the adversarial QA **required for future implementation**. Implementation must execute these (or document a narrower substitute per AGENTS.md proportional-verification).

| ID | User/attacker model | Scenario | Setup | Command/harness | Expected signal | Status | Evidence target |
|---|---|---|---|---|---|---|---|
| AQ-01 | owner | publish with 0 estimates selected | fixture: project, no estimates | TEST-04 (`no_estimates`) | `readiness_blocked`, no write | planned | `tests/vitest/publication/readiness-gate.test.ts` |
| AQ-02 | owner | publish with all-zero-priced rows | fixture: rows w/ zero costs | TEST-02 (`no_priced_rows`) | blocker returned | planned | readiness test |
| AQ-03 | owner | publish with no currency | fixture: project.currency_code=null | TEST-02 (`no_currency`) | blocker | planned | readiness test |
| AQ-04 | owner | send when email not configured | env: EMAIL unconfigured | TEST-02 (`email_not_configured`) | blocker + manual-copy fallback | planned | readiness + composer test |
| AQ-05 | owner | oversized message (>120 / >1000) | input: long strings | TEST-07 | field error, rejected | planned | owner-message test |
| AQ-06 | malicious owner | `<script>`/`<a>` in message | input: HTML | TEST-07 | escaped output, no raw HTML | planned | owner-message test |
| AQ-07 | malicious owner | control chars / unusual unicode in message | input: `\x00`, RTL | TEST-07 | rejected or sanitized | planned | owner-message test |
| AQ-08 | recipient from pub A | submit decision with pub B token | cross-pub fixture | TEST-15 | no `responded` flip on pub B | planned | responded cross-pub test |
| AQ-09 | attacker | direct POST to `createProjectPublication` with blocker | direct action call | TEST-04 | `readiness_blocked` | planned | gate test |
| AQ-10 | owner | concurrent publish during revoke | two parallel actions | existing optimistic lock | one wins, one errors | existing | existing publish test |
| AQ-11 | owner | duplicate recipient invite | same email twice | existing dedup | `status:"duplicate"` | existing | existing recipient test |
| AQ-12 | owner | resend opened recipient | confirm modal path | TEST-12 | token rotates, status resets | existing+planned | composer test |
| AQ-13 | owner | mass comment/decision events | many events | TEST-11 + digest rate limit | dedup/throttle, no spam | planned | notifications test |
| AQ-14 | owner | notification dispatch fails mid-publish | stub dispatch throw | TEST-11 (REL-03) | publish still succeeds | planned | notifications test |
| AQ-15 | owner | readiness computation throws | stub `buildProposalExportModel` throw | REL-02 unit test | `readiness_unavailable` warning, hard blockers still computed | planned | readiness test |
| AQ-16 | owner | stale readiness (revoke during compose) | revoke after drawer open | FR-04 re-check at action time | action rejects revoked | planned | gate test |
| AQ-17 | owner | unsubscribe then resend | unsubscribed recipient | existing | resend blocked | existing | existing resend test |
| AQ-18 | owner | self-invite | own email | existing | blocked | existing | existing test |
| AQ-19 | dirty worktree / concurrent-agent | another agent edits `actions.ts` while implementing | `git status` + ledger | re-read before edit | no overwrite | process | AGENTS.md Section 6 |
| AQ-20 | flaky test rerun | bench variance > 20% | rerun PERF-01 | report median+p95 | flag if flaky | planned | bench |

## Performance evaluator contract (restated)

See `09`. Evaluator: `tests/vitest/perf/proposal-readiness.bench.test.ts` over 1200-node/3000-row fixture + small fixture, 50 runs, p95 ≤ 50 ms target, > 50 ms regression threshold, rollback = move prefetch off critical path or flip gate flag.

## Independent final verifier evidence

`verification_mode: emulated`. The verifier pass (a separated pass by the same agent) walked the directive's gap list (`17`) and found no internally resolvable critical gap. Residual gaps: REL-01 (external), DATA-04 (safe discovery), emulated cap. No independent reviewer output exists this session; owner acceptance can substitute.

## Explicit validation gaps

- No live Cloudflare readback (planning-only) — provider facts are repo evidence, not provider proof. Implementation must add remote `PRAGMA table_info` proof after `0037` + a real send smoke.
- No browser/Playwright proof (proportional: claims provable by unit/DOM/static). Browser proof deferred unless a browser-only claim (focus across drawer↔dialog, no-JS Send) is contested during implementation.
- No hosted/production metrics (closed beta, no external users) — local + structured-log evidence is proportional per AGENTS.md.
- REL-01 bounce ingestion unimplemented (external).
- DATA-04 notification-table existence unconfirmed (Phase 0 discovery).

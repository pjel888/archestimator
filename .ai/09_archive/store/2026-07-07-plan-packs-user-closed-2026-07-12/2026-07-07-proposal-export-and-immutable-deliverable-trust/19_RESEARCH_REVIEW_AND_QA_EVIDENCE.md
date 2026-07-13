# 19 — Research, Review, and QA Evidence

## Research questions and sources

| Question | Source | Finding | Impact on plan |
|---|---|---|---|
| Does D1 have content-hash column precedents in this repo? | `migrations/0010_upload_metadata.sql`, `0006_ai_audit_rate_limits.sql` | Yes — `upload_assets.checksum_sha256` (64-hex CHECK, lowercased); `ai_*` `sha256:`-prefixed hashes + `redaction_status` enum | Copied into DATA-1 schema (no new primitive) |
| Is there an append-only snapshot precedent? | `migrations/0025_reusable_source_insert_support.sql` | Yes — `estimate_sheet_events.old_snapshot`/`new_snapshot` JSON + `correlation_id` idempotency | Informs immutability + job idempotency design |
| Is the XLSX builder streaming-capable? | `src/lib/proposal-export/xlsx-workbook.ts:684-700` | No — `writeWorkbookBuffer` returns full `Uint8Array` via `concatBytes` | Drove DEC-STREAM-1 (band approach); Phase 3 notes refactor risk |
| Are recipients able to download XLSX today? | grep `src/app/share`, `src/components/share` | No — JSON snapshot only | DEC-RECV-1 (recipient XLSX = optional) |
| Does `signature_intent_hash` bind content? | `src/lib/publication/d1-store.ts:699-703` | No — binds publicationId:snapshotVersion:signerName:submittedAt | Drove FR-7 (content binding) |
| What's the latest migration number? | `migrations/` | `0039_project_status.sql` (39 files) | Next is `0040` |
| Is Web Crypto SHA-256 available in Workers? | standard Worker runtime | Yes | ARCH-4 (no new crypto) |

**Autoresearch-style validation rubric:** primary/official source first (repo source + Cloudflare
docs via the Cloudflare skill at implementation time); community convention distinguished from
official; citations recorded. Research shaped: DEC-ARCH-1, DEC-STORE-1, DEC-STREAM-1, DEC-HASH-1,
FR-7, DATA-1. No research was included as a detached appendix.

**Searched for but not found:** a hosted oversized-export smoke (explicitly noted as not run in
`known-issues.md:150`) → added as TEST-2 rollout gate.

## Skills / workflows used / unavailable

- Used: `archestimator-plan-pack` (binding), `Creating-Plan-Prompt.md` (structure/rubric),
  `Multi-Agent-Execution-Directive.md` (authority/verification caps), native Explore subagents
  (4 discovery lanes).
- Referenced for future executor: `cloudflare`, `wrangler`, `workers-best-practices`,
  `durable-objects` (not used — DO out of scope), `qa`/`ultraqa` (for implementation-time QA).
- Not used: `gitnexus` (narrow planning; `rg`/reads sufficient per proportional policy),
  Playwright/browser (planning-only; DOM tests suffice per proportional verification).

## Specialist workstream outputs (summary)

- **Product/scope:** brief converted to 10 FR + UX/A11Y/ARCH/DATA/API/SEC/PERF/REL/OPS/TEST/DOC.
- **Architecture:** shared trust ledger; band-based streaming; content addressing.
- **Data:** migration blueprint + access-path matrix + precedents.
- **Security:** threat model T-1..T-15 + denial tests D-1..D-7 + credential taxonomy.
- **Performance:** evaluator contract; budgets.
- **QA:** test execution matrix; adversarial scenario matrix.
- **Ops:** rollout gates; flags; runbook.

## UltraQA-style adversarial scenario matrix

| ID | User/attacker model | Scenario | Setup | Command/harness | Expected signal | Actual result | Status | Evidence | Cleanup |
|---|---|---|---|---|---|---|---|---|---|
| AQ-1 | Contractor disputes issued file | claim file said X | issue package v1; compare disputed bytes | checksum test | sha256 mismatch proves tamper/identity | TBD (impl) | planned | test | none |
| AQ-2 | Manager republishes under accept | republish during recipient accept | concurrent publish+accept | immutability + content-binding test | v1 retained; accept bound to v1 hash; 409 on stale | TBD | planned | test | none |
| AQ-3 | Attacker sends oversized payload | 3001-row export | fixture at cap+1 | route test | 413 with limits | TBD | planned | test | none |
| AQ-4 | Attacker spams async jobs | many job POSTs | rapid requests | rate-limit test | 429 above limit | TBD | planned | test | none |
| AQ-5 | User A polls B's job | cross-user job access | A creates, B polls | ownership test | 403 | TBD | planned | test | none |
| AQ-6 | Client XLSX leaks internal token | byte-scan | client-audience XLSX | redaction-scan test | zero tokens | TBD | planned | test | none |
| AQ-7 | R2 public access attempt | guess object key | direct R2 URL | async test | denied (server-mediated) | TBD | planned | test | none |
| AQ-8 | Recipient views stale snapshot | estimate moved | advanced updated_at | staleness test | notice rendered | TBD | planned | test | none |
| AQ-9 | Orphan R2 after failed insert | R2 ok, D1 fail | inject insert failure | reconcile test | object cleaned | TBD | planned | test | remove fixture |
| AQ-10 | Hash regeneration divergence | non-deterministic builder | regenerate issued pkg | determinism test | same hash (or bytes stored) | TBD | planned | test | none |
| AQ-11 | Duplicate accept (replay) | resubmit | double POST | content-binding test | idempotent/conflict | TBD | planned | test | none |
| AQ-12 | Cross-workspace package read | tenant isolation | workspace B reads A's pkg | denial test | denied | TBD | planned | test | none |

(For this planning-only task, the matrix specifies the scenarios; actual `result`/`status` are
filled at implementation. This is honest: dynamic adversarial QA is not applicable to the
planning artifact itself, but is fully specified for future implementation per the directive.)

## Performance evaluator contract

See `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md`. Summary: baseline = benchmark harness p95 +
memory at 500/1000/2500 rows + threshold-crossing fixture; target = inline p95 < 30s at max,
memory < 80% envelope, async engaged before 70% ceiling; regression = >15%; evidence = benchmark
JSON + hosted perf report.

## Independent final verifier evidence

`verification_mode: independent`. The final verification was performed by a **separate native
Explore verifier agent** with distinct output (a different agent id than the lead author). It
audited all 15 exhaustive-profile completion gates and returned **15/15 satisfied** (14 clean PASS
+ 1 PASS with a minor qualitative-cardinality note). The weakness-signal scan found no hidden
defects (no vague tasks, no unmarked approximate paths, no cross-doc contradictions, no missing
boundary/cache contracts, no unowned placeholders, no untraced requirements).

Full verifier result is summarized in `17_FINAL_READINESS_REVIEW.md` ("Independent verifier
result"). Because the final verifier is genuinely independent, the verification cap does **not**
limit the readiness claim; the `CONDITIONALLY READY` status is driven by the Performance-content
gate (92 < 95), not by verification mode.

## Critique-and-revision cycle summaries

- **Cycle 1 (draft → critique):** initial draft had: (a) vague "streaming" without bands →
  fixed via DEC-STREAM-1 three-band; (b) missing credential taxonomy → added in `04_*.md`; (c)
  missing shadow-path matrices → added; (d) PDF treated as implementable → reclassified
  BLOCKED-EXTERNAL; (e) missing recipient proof of content binding → added FR-7; (f) redaction
  only sheet-level → added byte-scan FR-5/SEC-3; (g) determinism risk on regeneration → added
  DEC-STORE-1a.
- **Cycle 2 (targeted):** addressed P0/P1 gaps: (a) performance evaluator contract formalized;
  (b) rollout gates with metrics/thresholds; (c) orphan R2 reconcile risk (T-15/T4.4); (d)
  cross-document consistency (README ↔ 11 ↔ 17); (e) verification-mode cap explicitly applied to
  status; (f) database change blueprint completeness (cardinality/selectivity/query-count); (g)
  shadow-path completeness for async job.

## Explicit validation gaps (honest)

- Hosted/provider proof (TEST-2) is a rollout gate, not satisfied by this planning task.
- Threshold numbers are DISCOVERY (T3.0), not predetermined.
- `result`/`status` columns in the adversarial matrix are TBD (implementation-time).
- PDF (DEC-FORMAT-1) is BLOCKED-EXTERNAL.
- No additional independent reviewer beyond the native verifier agent (final verification was
  independent; optional owner acceptance would further strengthen).

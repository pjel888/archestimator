# 16 — Requirements Traceability Matrix

| Requirement ID | Source | User Outcome | Phase | Task IDs | Code Areas | Acceptance Criteria | Test Coverage | Rollout Check | Status |
|---|---|---|---|---|---|---|---|---|---|
| FR-1 (immutability) | brief+repo | issued deliverables provably unchanging | P0/P2 | T0.1,T0.2,T2.2 | `proposal_deliverable_packages`, `admin-d1-client.ts`, `actions.ts` | v1 hash/bytes unchanged after republish | repo + immutability tests | flag-on + spot-check | traceable |
| FR-2 (checksum) | brief | prove what was issued | P0/P1/P2 | T0.3,T1.1,T2.1 | checksum module, route, snapshot | content_sha256 == sha256(bytes) | checksum + route + snapshot tests | checksum-mismatch alert = 0 | traceable |
| FR-3 (source stamp) | brief | as-of + revision provenance | P1/P2 | T1.1,T2.1 | route, snapshot, docProps/title | fields present; XLSX title block carries them | route + snapshot tests | spot-check | traceable |
| FR-4 (recipient staleness) | brief | recipients not misled | P2 | T0.5,T2.3 | staleness.ts, public-repository, share page | notice rendered when daysBehind>threshold | recipient-staleness test | monitor | traceable |
| FR-5 (redaction broaden+byte-scan) | brief+repo | no internal leakage in client XLSX | P0/P1 | T0.4,T1.1 | redaction-policy.ts, create-proposal-workbook, route | byte-scan finds zero tokens; cost-split suppressed | redaction-scan + workbook tests | CI gate | traceable |
| FR-6 (large-export reliability) | brief | no OOM/timeout near caps | P3 | T3.0,T3.1,T3.2 | route stream/async, queue consumer | 202/200 chunked at threshold; job completes | streaming + async tests | hosted smoke (TEST-2) | traceable (P1) |
| FR-7 (recipient content binding) | brief | accept bound to content | P2 | T2.4 | d1-store, decision route | content_sha256_at_decision written | content-binding test | spot-check | traceable |
| FR-8 (audit trail) | brief | who/what/when queryable | P1/P2 | T1.1,T1.2,T2.2 | package repo, audit rows | D1 rows for gen/download/republish/view/accept | audit-row tests | audit query | traceable |
| FR-9 (PDF/XLSX decision) | brief | explicit format decision | — | — (decision) | n/a | DEC-FORMAT-1 recorded | n/a | owner unblock | BLOCKED-EXTERNAL (PDF) |
| FR-10 (state machine) | brief | explicit lifecycle | P0 | T0.1,T0.2 | migration, repo | states documented; only issued+ immutable | schema + repo tests | n/a | traceable |
| UX-1 (trust panel) | derived | contractor sees trust info | P1 | T1.3 | ProposalExportPreviewDialog | panel renders hash/staleness/version | DOM test | UX review | traceable |
| UX-2 (recipient staleness notice) | derived | recipient informed | P2 | T2.3 | share page | non-blocking notice | DOM test | UX review | traceable |
| UX-3 (download error states) | derived | clear async vs 413 | P3 | T3.1,T3.2 | dialog, route | distinct copy | DOM test | n/a | traceable |
| A11Y-1 (panel a11y) | derived | accessible trust info | P1 | T1.3 | dialog | role=status, aria-live, focus, non-color | DOM test | a11y review | traceable |
| A11Y-2 (job progress a11y) | derived | async accessible | P3 | T3.2 | dialog | role=progress, aria-busy | DOM test | a11y review | traceable |
| ARCH-1 (shared ledger) | derived | one trust ledger | P0 | T0.1,T0.2 | new table+repo | both surfaces write it | repo test | n/a | traceable |
| ARCH-2 (server-only integrity) | derived | no client secret | all | all | server modules | client display-only | review | n/a | traceable |
| ARCH-3 (stream/queue) | derived | bounded/async | P3 | T3.1,T3.2 | route, queue | bands implemented | streaming/async tests | flag-on | traceable (P1) |
| ARCH-4 (Web Crypto) | derived | no new crypto | P0 | T0.3 | checksum.ts | sha256Hex via subtle | checksum test | n/a | traceable |
| DATA-1 (package table) | derived | ledger schema | P0 | T0.1 | migration | table+CHECK+indexes | schema test | typegen (if binding) | traceable |
| DATA-2 (accept hash column) | derived | content binding storage | P0/P2 | T0.1,T2.4 | migration, d1-store | column present, written | content-binding test | n/a | traceable |
| DATA-3 (TS row models) | derived | centralized types | P0 (P1) | T0.2 | database.ts | row model exists | type-check | n/a | traceable |
| API-1 (hash header) | derived | client display source | P1 | T1.1 | route | header present, prefix matches | route test | n/a | traceable |
| API-2 (async 202) | derived | async contract | P3 | T3.2 | route, status endpoint | 202+jobId; status; download | async test | flag-on | traceable (P1) |
| API-3 (snapshot staleness+hash) | derived | recipient payload | P2 | T2.3,T2.4 | public-repository, decision | fields present | recipient tests | n/a | traceable |
| SEC-1 (authz) | derived | no unauthorized access | all | all | repos, routes | denied tests pass | denial tests | n/a | traceable |
| SEC-2 (R2 unguessable) | derived | no public R2 | P3 | T3.2 | r2 keys, mediated access | keys random; server-mediated | async test | n/a | traceable |
| SEC-3 (redaction CI gate) | derived | leak prevention | P0/P1 | T0.4 | redaction-policy, test | byte-scan in CI | redaction-scan test | CI gate | traceable |
| SEC-4 (job rate limit) | derived | abuse prevention | P3 | T3.2 | route, limiter | 429 above limit | async+ratelimit test | monitor | traceable (P1) |
| PERF-1 (bounded) | derived | within limits | P1/P3 | T1.1,T3.1,T3.2 | route, stream, job | p95<30s; memory bounded | evaluator | perf gate | traceable (thresholds DISCOVERY) |
| PERF-2 (evaluator) | derived | measurable perf | P3 | T3.0 | evaluator | contract defined | evaluator run | gate | traceable |
| REL-1 (idempotent job) | derived | retry-safe | P3 | T3.2 | queue, correlation_id | duplicate → same job | async test | n/a | traceable (P1) |
| REL-2 (no issue without hash) | derived | integrity ordering | P0/P1 | T0.2,T1.1 | repo, route | null hash → not issued | repo test | n/a | traceable |
| OPS-1 (structured logs) | derived | observability | all | all | logs | redacted logs | review | monitor | traceable |
| OPS-2 (feature flag) | derived | rollback path | P3 (P1/2 too) | T1.x,T3.x | flags | flag works | flag test | flag-off rollback | traceable |
| TEST-1 (tests) | brief | coverage | all | all | tests | matrix green | tests | CI | traceable |
| TEST-2 (hosted smoke) | brief+repo | real-surface proof | P4 | T4.1 | script | oversized export completes | hosted run | rollout gate | traceable (hosted) |
| DOC-1 (docs) | derived | accurate docs | P4 | T4.3 | README, spec, known-issues | updated post-impl | review | post-impl | traceable |

No requirement is untraced. Every task maps to ≥1 requirement. Every requirement maps to source +
task + AC + test + rollout check.

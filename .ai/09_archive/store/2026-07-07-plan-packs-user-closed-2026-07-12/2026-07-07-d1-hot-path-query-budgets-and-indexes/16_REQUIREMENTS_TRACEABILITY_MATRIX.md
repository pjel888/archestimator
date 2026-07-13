# 16 — Requirements Traceability Matrix

Columns per directive Phase 3 §2: `Source ID | Requirement | Source evidence | Source strength | Plan section | Work item | Acceptance criteria | Test/proof | Risk | Status | Gap/decision`.

Source-strength tags: `brief` (from PROMPT), `repo evidence` (verified in source), `official docs` (Cloudflare/React docs), `assumption` (labeled, unverified), `derived` (synthesized from other sources).

| Source ID | Requirement | Source evidence | Source strength | Plan section | Work item | Acceptance criteria | Test/proof | Risk | Status | Gap/decision |
|---|---|---|---|---|---|---|---|---|---|---|
| S-PROMPT-1 | PERF-001 (map flows→queries) | PROMPT.md s1; `03` §2 (11 HP rows, file:line) + §3 (12 repos verified) | brief + repo evidence | `03` §2-3 | (planning only) | AC-PERF-001-1/2 | doc review; `rg getCloudflareD1Database src/lib/repositories` | none | Done | none |
| S-PROMPT-2 | PERF-002 (p95/p99 + query-count budgets) | PROMPT.md s2; `09` table (11 HP + auth floor, p95 1×/10×, p99 10×, queries) | brief + derived | `09` | T-P0-01, T-P5-02 | AC-PERF-002-1/2/3 | proof scripts assert p95+count | budgets derived from precedent + A1 | Done (planning); P0/P5 impl | none |
| S-PROMPT-2 + S-CF-DOCS | PERF-003 (subrequest budgets) | PROMPT.md s2; Workers Limits docs (50 free/invocation) | brief + official docs | `09` subreq column | T-P4-02 | AC-PERF-003-1/2/3 | T-P4-02 DISCOVERY + assertion | RISK-06 (API may not exist) | Done (planning); P4 impl | fallback to D1-call counting if no runtime API |
| S-PROMPT-3 | PERF-004 (required indexes) | PROMPT.md s3; `03` §3 G1-G5; migrations verified (0029:24-25 for G4) | brief + repo evidence | `07` blueprints; `11` T-P1-01/02, T-P2-03 | T-P1-01, T-P1-02, T-P2-03 | AC-PERF-004-1/2/3/4 | migration tests + hosted EXPLAIN (T-P4-03) | RISK-02 (local≠hosted plan) | Done (planning); P1/P2 impl | G4 confirmed needed (no longer DISCOVERY) |
| S-PROMPT-4 | PERF-005 (fixture sizes) | PROMPT.md s4; `12` tiers | brief | `12` | T-P3-00 | AC-PERF-005-1/2/3 | manifest shape test | 100× too large for local sqlite3 | Done (planning); P3 impl | local capped at 10× |
| S-PROMPT-5 | PERF-006 (N+1 risks) | PROMPT.md s5; `estimates/page.tsx:103-109`; `d1-access.ts:271` (3-EXISTS verified) | brief + repo evidence | `11` T-P2-01; `08` threat model | T-P2-01 | AC-PERF-006-1/2/3 | TEST-SEC-01/04, query-count test | RISK-01 (authz parity) | Done (planning); P2 impl | none |
| S-PROMPT-6 | PERF-007 (local+hosted proof) | PROMPT.md s6; `03` §4 gap analysis (8 repos no proof verified) | brief + repo evidence | `11` P3, P4 | T-P0-01, T-P3-01…08, T-P4-01 | AC-PERF-007-1/2/3/4 | proof green local + hosted | RISK-08 (SQL coupling) | Done (planning); P3/P4 impl | none |
| S-PROMPT-C1 | PERF-008 (no paid features) | PROMPT.md "Constraints"; AGENTS.md cost posture | brief + repo evidence | `15` rejected list | (cross-cutting) | AC-PERF-008-1/2 | migration/wrangler diff review | none | Done | none |
| S-PROMPT-C2 | PERF-009 (scope: D1 only) | PROMPT.md "Keep plan scope…" | brief | `02` non-goals | (cross-cutting) | AC-PERF-009-1/2 | scope review | none | Done | none |
| S-PROMPT-STOP | PERF-010 (stop condition) | PROMPT.md "Stop Condition" | brief | `11`, `12`, `17` | all phases | AC-PERF-010-1/2/3 | final verifier | none | Done | none |
| S-CF-D1-PRICING | **PERF-011 (rows-read budget)** | Cloudflare D1 Pricing docs (5M rows read/day free); `09` projection | official docs + derived | `09` rowsRead columns; `11` P1/P5 | T-P0-01, T-P1-01/02, T-P2-02, T-P4-02, T-P5-01 | AC-PERF-011-1/2/3/4 | hosted proof rows-read column; CI gate on EXPLAIN | RISK (10× volume may exceed 5M if P1 skipped) | **Done (added in audit pass)** | A1 volume assumption must be validated via P4 hosted evidence |

## Performance-sensitive requirements — additional mapping (directive §12)

| Requirement | Baseline | Target | Measurement source | Regression threshold | Rollback trigger |
|---|---|---|---|---|---|
| PERF-002 (HP-1) | current hosted p95 | ≤400ms @10× p95 | `cf:d1-runtime-proof` | p95>400ms | hosted p95>550ms p99 |
| PERF-002 (HP-5) | `4+N` queries | ≤6 queries | query-count test + proof | >6 queries | revert T-P2-01 |
| PERF-003 | no subrequest budget | ≤ budget `09` | router subrequest column | >budget | investigate; fallback to D1-count proxy |
| PERF-004 (G1-G4) | FULL/TEMP B-TREE scan | index-used EXPLAIN | local + hosted EXPLAIN | TEMP B-TREE reappears | DROP index; investigate |
| PERF-006 | N+1 (4+N) | ≤6 | TEST-SEC-01 + query-count test | parity fail or count>6 | revert to loop |
| **PERF-011** | **unmeasured rows-read** | **rowsRead/req ≤ `09` budget; daily <5M** | **hosted proof rows-read column (or EXPLAIN-derived estimate)** | **any HP rowsRead/req > budget OR daily projection >5M** | **apply missing P1 index; add LIMIT; if persistent, owner decides on D1 paid** |

## Task → requirement reverse map (every task traces to ≥1 requirement)

| Task | Requirement(s) |
|---|---|
| T-P0-01 | PERF-002, PERF-007, PERF-011 |
| T-P0-02 | PERF-001, PERF-007 |
| T-P1-01 | PERF-004, PERF-011 |
| T-P1-02 | PERF-004, PERF-011 |
| T-P2-01 | PERF-006 |
| T-P2-02 | PERF-002, PERF-011 |
| T-P2-03 | PERF-004 (G5), PERF-002, PERF-011 |
| T-P2-04 | PERF-002, PERF-011 (optional, gated) |
| T-P3-00 | PERF-005 |
| T-P3-01…08 | PERF-007 |
| T-P4-01 | PERF-007 |
| T-P4-02 | PERF-003, PERF-011 |
| T-P4-03 | PERF-004, PERF-011 |
| T-P5-01 | PERF-007, PERF-011 |
| T-P5-02 | PERF-010 |

No requirement untraced. No orphan task. Every requirement has source evidence + acceptance criteria + a planned proof path.

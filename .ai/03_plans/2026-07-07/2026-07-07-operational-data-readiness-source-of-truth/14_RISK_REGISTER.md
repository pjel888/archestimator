# 14 — Risk Register

Probability: Low/Med/High. Impact: Low/Med/High. Severity = function. All risks here are planning/execution risks for *this docs/scripts feature*; runtime risks are out of scope (no runtime change).

| ID | Description | Trigger | Prob | Impact | Severity | Affected areas | Detection | Prevention | Mitigation | Contingency | Owner | Residual | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RISK-1 | Detector false-negative misses a drift class | new binding type / new doc phrasing not in regex | Med | High | **High** | agent trust, plans | adversarial suite coverage; per-fact summary (AC-FR-3e) | pin generator fields; require new fact-class → new test | add assertion + test; warn on unknown binding type | manual audit on major substrate change | impl | medium | open until TEST-1 lands |
| RISK-2 | Canonical home grows too long; agents stop reading it | scope creep, prose accumulation | Med | Med | Med | agent startup speed | ERGO-1 ≤30-line Fast Facts check | Fast Facts discipline; detail below fold | split home if >~150 lines | owner review | owner | low | open |
| RISK-3 | `AGENTS.md`/`current-state.md` edit conflict under concurrency | many agents edit high-traffic files | Med | Low | Low | merge conflicts | `git diff --check`; re-read before edit | file-ownership ledger; small scoped edits | rebase; re-apply | serialize edits | impl | low | open |
| RISK-4 | Snapshot non-determinism breaks DATA-1 guard | `generatedAt` or unordered keys | Low | Med | Low | CI flake | determinism test | stable key order; only `generatedAt` non-deterministic; detector ignores it | fix ordering | pin order | impl | low | open |
| RISK-5 | Secret leaks into snapshot | generator echoes full `vars` or reads `.env` | Low | **High** | **High** | security | SEC-1 secret-scan | allowlist fields; never read `.env`/`dev.vars` | redact; rotate if real leak | rollback + rotation | impl | low (with SEC-1) | open until SEC-1 test lands |
| RISK-6 | JSONC parse breaks on `wrangler.jsonc` edge case | comment style, trailing commas | Low | Med | Low | generator | parse unit test | tolerant stripper + test | hand-fix parser | use existing parser lib | impl | low | open |
| RISK-7 | Owner does not confirm home location (OPEN-1) | — | Med | Low | Low | blocker for IMPLEMENTATION-READY | — | provide recommendation + safe default | proceed with `docs/OPERATIONAL_TRUTH.md` assumption | swap path later (cheap) | owner | low | open |
| RISK-8 | CI stays disabled; detector only runs pre-commit/manual | GitHub Actions remains disabled (§3.6) | High | Med | Med | drift re-enters via non-commit path | weekly manual audit | pre-commit hook + documented cadence | enforce pre-commit | re-enable Actions | owner | medium | open |
| RISK-9 | Sibling pack duplicates the detector | both packs implement a stale-doc guard | Low | Low | Low | wasted work, two scripts | boundary agreement (DEC-CANONICAL-SCRIPT) | umbrella lives here; cross-ref T-12 | consolidate | pick one | impl | low | mitigated |
| RISK-10 | Posture (provider-exit) drifts silently because detector only checks citation marker, not narrative truth | runbook flips, home not updated | Med | Med | Med | agent reads stale posture | citation-marker assertion only catches missing source | quarterly posture review | manual update protocol row | owner audit | owner | medium | open |
| RISK-11 | Over-redaction confusion: `databaseId` mistaken for secret | reviewer flags the id | Low | Low | Low | home completeness | document classification (T-SEC-2) | state in home "binding id, not secret" | add note | — | impl | low | open |
| RISK-12 | `generate-cloudflare-migration-inventory.ts` still scans only `supabase/migrations/` → someone relies on it for active count | dev assumes cf:inventory counts active D1 | Low | Med | Low | wrong count | home notes the limitation | home + script header comment | fix that script separately (out of scope here) | — | impl/future | low | open |

## Critical risks focus

- **RISK-1 (detector false-negative)** and **RISK-5 (secret leak)** are the two High-severity risks. Both are mitigated by mandatory tests (TEST-1, SEC-1) that must land before the feature is considered done.
- **RISK-10 (posture drift)** is inherent: a detector cannot prove narrative *truth*, only that a citation exists. Residual risk accepted; quarterly posture review is the contingency.

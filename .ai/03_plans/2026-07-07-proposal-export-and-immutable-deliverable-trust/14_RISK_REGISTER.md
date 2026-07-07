# 14 — Risk Register

| ID | Description | Trigger | Probability | Impact | Severity | Affected areas | Detection | Prevention | Mitigation | Contingency | Owner | Residual | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RISK-1 | Async job path adds operational complexity / new failure modes | Phase 3 enablement | Medium | Medium | High | export, queue, R2 | job failure rate metric | flag default-off; idempotent; DLQ | staged rollout ring 1 | disable flag (inline+413 resume) | impl | Medium | Open |
| RISK-2 | Redaction byte-scan misses a token (false negative) | new internal field added without allowlist update | Low | High | High | XLSX client export | CI byte-scan test | config-driven allowlist; owner review (T0.4 DISCOVERY) | add token to allowlist + rescan | rescan + republish | impl/owner | Medium | Open |
| RISK-3 | Orphan R2 objects accumulate | R2 write succeeds, D1 insert fails | Low | Low | Medium | R2 storage | storage audit | batch atomicity where possible | reconcile job/lifecycle (T4.4) | manual cleanup | impl | Low | Open |
| RISK-4 | Snapshot canonicalization changes hash stability | JSON key ordering bug | Low | Medium | Medium | snapshot checksum | checksum stability test | deterministic canonicalizer (T0.3) | fix canonicalizer | re-hash is reproducible (deterministic) | impl | Low | Open |
| RISK-5 | Verify-mode cap (emulated) limits readiness claim | no independent reviewer | High | Low | Medium | pack readiness | readiness review | request owner/independent review | label CONDITIONALLY READY honestly | owner accepts or reviewer engaged | lead | Medium | Open |
| RISK-6 | PDF decision deferred blocks a deliverable format some clients want | owner hasn't approved renderer | Medium | Medium | Medium | PDF format | owner request | clear contract for future PDF | XLSX+JSON trust-bearing now | owner decision (DEC-FORMAT-1) | owner | Medium | Open (BLOCKED-EXTERNAL) |
| RISK-7 | Performance regression from added writes (+2 queries/export) | high export volume | Low | Low | Low | export latency | p95 metric | batch where possible | streaming/async absorbs | monitor | impl | Low | Open |
| RISK-8 | D1 app-authz (no DB-enforced RLS) — insider could alter audit rows | malicious privileged actor | Low | High | High | audit integrity | audit anomalies | append-only convention; no DELETE path; sensitive ops to `account_security_events` | tamper-evident hashing (future: hash chain) | incident response | owner | Medium | Open (accepted — D1 has no RLS) |
| RISK-9 | `source_estimate_revision` field ambiguity | unclear which estimate field is the revision | Medium | Low | Low | source stamp | impl discovery | use `updated_at` if no revision id | DISCOVERY T1.1 | fallback to timestamp | impl | Low | Open |
| RISK-10 | Concurrent `publication/*` edits collide with other in-flight work | shared worktree | Medium | Medium | Medium | publication files | git status + ledger | file-scope ownership; serialize | re-read before edit | coordinate | impl | Low | Open |
| RISK-11 | Recipient staleness notice causes confusion/alarm | poor copy | Low | Low | Low | recipient UX | UX review | neutral non-blocking copy (UX-2) | refine copy | iterate | impl/owner | Low | Open |
| RISK-12 | Pre-feature snapshots lack checksums — gap in historical proof | existing publications | High (certain) | Low | Low | historical audit | n/a | honest labeling "pre-integrity-tracking" | republish to get checksum | n/a | owner | Low | Accepted |

No unmitigated critical risk. RISK-8 (insider audit tampering) is Medium residual due to D1's lack
of DB-enforced RLS — accepted with app-layer discipline; a future hash-chain could strengthen it
(not in scope).

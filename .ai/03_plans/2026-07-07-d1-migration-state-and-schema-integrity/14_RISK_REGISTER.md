# 14 — Risk Register

| ID | Description | Trigger | Prob. | Impact | Severity | Affected areas | Detection | Prevention | Mitigation | Contingency | Owner | Residual risk | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RISK-001 | Remote `ARCH_DB` migration-applied state for `0033`–`0038` is unknown at plan time | First-users deploy assumes schema that isn't there | Medium | High | **High** | compliance tables, component drafts, audit HMAC | Phase 3 readback (`d1 migrations list --remote` + verifier `--remote`) | This plan surfaces it as a gate | Owner runs Phase 3 before first users | Staged apply per §7.3 | Philip | Unknown until Phase 3 | Open (BLOCKED-EXTERNAL) |
| RISK-002 | `0035` (HMAC table rebuild) is partially applied or re-run on remote | Operator re-runs `0035` after a partial apply | Low | **Critical** (audit data loss) | **Critical** | `account_security_events` audit trail | Verifier compliance gate (REQ-SEC-01); §7.3 row-count check | §7.3 "never re-run 0035" rule; fix-forward only | Row-count reconciliation; restore from backup (DB-INT-04) | Philip | Low if §7.3 is followed | Open (procedural control) |
| RISK-003 | Expected-schema set drifts as new migrations are added (verifier becomes stale) | New migration `0039+` added without re-running the generator | Medium | Medium | Medium | verifier accuracy | Verifier generates expected set from `migrations/` at run time (AD-3) | Generation (not hardcoded) keeps it in sync automatically | Doc-count guard (T-06) catches doc drift; CI wiring catches verifier drift | Impl agent | Very low (by construction) | Mitigated by design |
| RISK-004 | Better Auth schema applied differently across local/preview/remote (out-of-band) | `compileCloudflareBetterAuthD1Migrations` applied to local but not remote, or applied with different options | Low | Medium | Medium | auth tables | Verifier checks auth tables as a separate expected set (REQ-DATA-03) | Treat auth as first-class canonical source | Manual apply via proof route; re-verify | Impl agent | Low | Open (hosted-proof gate) |
| RISK-005 | Hosted D1 restore is unproven (rehearsal is local-only) | A real remote-restore need arises (incident) and the procedure has never been executed end-to-end | Low | High | High | disaster recovery | Phase 5 hosted rehearsal (owner-gated) | Local rehearsal proves mechanics; runbook documents hosted steps | Staging restore rehearsal before first users | Philip | Medium until hosted rehearsal done | Open (BLOCKED-EXTERNAL) |
| RISK-006 | Wrangler `d1 migrations list` output format changes (parser breaks) silently | Wrangler version upgrade changes CLI output shape | Low | Low | Low | ledger script | Strict parser + fail-closed on parse error | Pin Wrangler version (repo already uses `bunx wrangler`); unit test fixtures | Update parser; re-run | Impl agent | Low | Mitigated by fail-closed design |
| RISK-007 | Doc edits collide with a concurrent agent editing `AGENTS.md`/`README.md`/`package.json` | Shared-worktree concurrency | Medium | Low | Low | doc files | `git status` + re-read before edit (shared-worktree policy) | File-scope ownership in coordination ledger | Re-read and re-apply | Impl agent | Low | Mitigated by process |
| RISK-008 | The plan prompt's stale premise ("through 0036") causes a future reader to under-scope | A future executor reads only `PROMPT.md` and inspects just `0033`–`0036` | Medium | Medium | Medium | plan adoption | This plan records the staleness (SAD-001; REQ-DOC-03) | `02_…` brief-vs-reality table; optional PROMPT.md annotation | This plan covers `0033`–`0038` | Lead | Low | Mitigated by recording |
| RISK-009 | A non-idempotent ALTER migration (`0021`/`0025`/`0028`/`0029`/`0032`) is partially applied remotely and then "fixed" by re-running the file | Operator re-runs the migration file after partial apply | Low | Medium | Medium | affected tables | Verifier detects "applied but column missing"; §7.3 fix-forward | §7.3 per-column reconciliation rule | One-off ALTER for missing columns only; mark applied | Impl agent | Low if §7.3 is followed | Open (procedural control) |
| RISK-010 | Free-tier D1 limits (write/request) exceeded by repeated verifier `--remote` runs | Many CI/agents run `--remote` in a tight loop | Very Low | Low | Low | D1 quota | n/a | Verifier is read-only (4 catalog reads); negligible quota use | Owner-run, not CI-run, for `--remote` | Philip | Very low | Mitigated by design |
| RISK-011 | Overstating readiness: claiming remote state is clean from local evidence | Reviewer treats local PASS as remote PASS | Medium | High | High | plan credibility | This plan explicitly isolates hosted proof as a gate | `17_…` records `verification_mode: emulated` + cap; README states `CONDITIONALLY READY` | Independent/owner review of the package | Lead | Low | Mitigated by explicit gating |

## Severity summary

- **Critical:** RISK-002 (`0035` re-run data loss).
- **High:** RISK-001 (remote state unknown), RISK-005 (hosted restore unproven), RISK-011 (overstating readiness).
- **Medium:** RISK-003, RISK-004, RISK-008, RISK-009.
- **Low:** RISK-006, RISK-007, RISK-010.

## Unmitigated critical risks

**RISK-002** is mitigated only procedurally (the §7.3 "never re-run 0035" rule + compliance
gate). It cannot be made structurally impossible without editing `0035` (forbidden). The
residual risk is "operator fails to follow §7.3." This is the single most important
operational discipline the plan introduces and the reason `0035` has a dedicated fix-forward
row and compliance gate.

No other critical risk is unmitigated.

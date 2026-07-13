# 19 — Research, Review, and QA Evidence

## 19.1 Research questions and sources

This plan is primarily grounded in **direct repo evidence** (`rg`/file-read), not external
research. The single external-dependency is Wrangler D1 semantics.

| Research question | Source | Current official guidance vs community convention | Plan decision it changed | Searched-but-not-found |
|---|---|---|---|---|
| How are D1 migrations applied/tracked? | Wrangler CLI behavior + `21_DATABASE_CHANGE_BLUEPRINTS.md:71,81` + `README.md:66` + `current-state.md:271,3444` | Official: Wrangler `d1 migrations apply` + internal `d1_migrations` tracker. Community: sometimes a custom runner. Archestimator uses official Wrangler only. | Confirmed no custom runner; build read-only tooling around Wrangler (AD-1) | No `cf:apply-migrations` script exists (confirmed empty grep) |
| Does D1 support `ADD COLUMN IF NOT EXISTS`? | SQLite docs (well-established) | SQLite does NOT support it; migrations are plain SQL not scripts | Fix-forward policy §7.3 (never retrofit; per-column reconcile) | — |
| What is the free-tier D1 Time Travel retention? | Official URL cited at `generate-cloudflare-d1-restore-rehearsal.ts:70` (`developers.cloudflare.com/d1/…/#time-travel-restore`) | Official doc (not re-fetched in-session to avoid staleness) | Did NOT assert a specific number; flagged for impl-time confirmation (§13.4) | The exact free-tier retention window (deferred to impl) |
| Is there an existing schema-drift checker? | Repo search (`schema_drift`, `table_exists`, `pragma_table_info`) | n/a (repo evidence) | Confirmed none exists; generalize `better-auth-proof-router.ts` pattern (AD-2) | No general schema-drift helper anywhere |

**Rubric used to decide research sufficiency:** for each plan decision, is there (a) direct
repo evidence, (b) official-doc citation, or (c) a documented assumption? All three are
present for every load-bearing decision. No research is included as a detached appendix.

## 19.2 Skills and workflows used / unavailable

| Skill / workflow | Used? | Why |
|---|---|---|
| `archestimator-plan-pack` | Yes (read) | Confirms `exhaustive` profile + `LOOP_LEDGER.md` pattern |
| Creating-Plan-Prompt | Yes (governing) | Document set, readiness scoring, completion gates |
| Multi-Agent-Execution-Directive | Yes (governing) | Authority model, verification-mode caps, concurrent-repo safety |
| `Explore` subagent (×3) | Yes (native) | Parallel read-only discovery (migration mechanism, doc drift, schema tooling) |
| `cloudflare` / `wrangler` skills | Read (referenced) | Wrangler D1 semantics; no execution needed for planning |
| `gitnexus` | Not used | Narrow local evidence; proportional policy (`AGENTS.md`) says graph tools are for broad/unfamiliar refactors, not narrow `rg`/file reads |
| `ultraqa` / `ultrawork` / `autopilot` | Not invoked | Planning-only; directive loop run in-session by the lead |
| Native independent verifier | **Unavailable** | No separate verifier lane in-session → `verification_mode: emulated` (cap 97) |

No skill was fabricated. No unavailable required capability was silently substituted.

## 19.3 Specialist workstream outputs

| Workstream | Output | Where captured |
|---|---|---|
| Product strategy / scope / requirements | 16 requirements, 11 tasks, full traceability | `04_…`, `16_…` |
| Codebase architecture | Current/target architecture, AD-1…AD-6 | `06_…`, `03_…` |
| Data / database / migrations | Full 38-migration classification, fix-forward policy, schema-verify SQL, 5 DB-INT blueprints | `07_…` |
| Security / privacy / threat model | Compliance-table gate, `0035` HMAC risk, threat table | `08_…` |
| Performance / reliability / ops | n/a-with-justification for perf; failure modes; restore runbook | `09_…`, `13_…` |
| Blast radius | Direct/transitive impact, classification | `10_…` |
| Test / QA strategy | Test execution matrix + 10-row adversarial matrix | `12_…` |
| Rollout / rollback | Landing order, release gates, restore options | `13_…` |
| Risk | 11 risks, severity, mitigations | `14_…` |
| Decisions / alternatives | 6 load-bearing decisions + 6 assumptions | `15_…` |
| Adversarial gap analysis | P0/P1/P2 findings (below) | this doc §19.5 |
| Final verification | req-by-req audit, readiness scores | `17_…` |

## 19.4 Critique-and-revision cycle summaries

**Cycle 1 (initial draft → first critique):**
- *Draft state:* initial README + 00 + 01 + 04.
- *Findings raised:* (a) initial draft cited PROMPT.md "through 0036" uncritically; (b) cron
  count discrepancy (AGENTS says 2, wrangler has 3) was initially missed; (c) Better Auth
  schema source split was under-emphasized.
- *Resolution:* added `02_…` brief-vs-reality table (SAD-001/002); expanded §7.4 to treat
  auth tables as first-class (DEC-002); added cron drift to REQ-DOC-02 and the doc-count guard.

**Cycle 2 (post-expansion → second critique):**
- *Draft state:* all 19 docs drafted.
- *Findings raised:* (a) `0037` and `0038` were initially under-covered in the non-idempotent
  table; (b) restore-rehearsal extension needed a concrete "real schema" approach, not just
  "extend it"; (c) the `d1_migrations` tracker is Wrangler-internal and must not be
  conflated with a hypothetical app-level table.
- *Resolution:* §7.2 now covers all 38 with class tags; §7.3 includes `0037` (data mutation)
  and notes `0038` triggers are idempotent; DB-INT-04 specifies the real-schema rehearsal
  approach; `03_…` §3.3 and `07_…` §7.1 explicitly state `d1_migrations` is Wrangler-internal.

**Cycle 3 (final emulated verification):** see `17_…`. No new P0; confirmed the hosted-proof
boundary is the sole blocker for `IMPLEMENTATION-READY`.

Two full cycles met the `exhaustive` minimum; the third was the final verification pass.

## 19.5 UltraQA-style adversarial scenario matrix

For a planning task, the adversarial matrix targets the **plan's claims** and the **future
scripts' failure modes**. The future-implementation runtime adversarial QA is in `12_…` §12.3.

| ID | Claim / scenario | Attack | Expected defense | Status |
|---|---|---|---|---|
| AQ-P1 | "AGENTS.md is current on migrations" | Re-check after a new migration lands | Doc-count guard (T-06) catches it | Covered (Phase 4) |
| AQ-P2 | "The verifier covers all tables" | Add a migration creating a new table; re-run verifier | Generator (AD-3) picks it up automatically | Covered by design |
| AQ-P3 | "Remote state matches local" (overclaim) | Reviewer treats local PASS as remote PASS | `17_…` records `emulated` cap + `CONDITIONALLY READY`; hosted-proof gate explicit | Covered |
| AQ-P4 | "0035 is safe" | Operator re-runs `0035` after partial apply | §7.3 "never re-run"; compliance gate (REQ-SEC-01) detects missing HMAC | Covered (procedural) |
| AQ-P5 | "Better Auth tables are in migrations/" | Reader looks for `user`/`session`/etc. in `migrations/` and concludes drift | `07_…` §7.4 + REQ-DATA-03 explicitly state auth is out-of-band | Covered |
| AQ-P6 | "The prompt premise is accurate" | Reader trusts "through 0036" | `02_…` SAD-001/002 records the staleness | Covered |
| AQ-P7 | "Inventory scripts cover active migrations" | Reader trusts `cf:inventory` for D1 drift | `03_…` §3.6 flags they scan legacy Supabase dir (F-7) | Covered |

## 19.6 Performance evaluator contract

§9.1. Summary: no runtime perf claim; the verify/ledger completing fast and correctly IS
the declared evaluator; threshold = "completes without error in trivial wall-clock time."
Satisfied by construction (4 catalog round-trips).

## 19.7 Independent final verifier evidence

`verification_mode: emulated` — the final verification was a separated pass by the same
agent (the lead), recorded in `17_…`. No native independent verifier was available.

To lift the package to `verification_mode: independent`, an owner or separate reviewer
should perform a fresh review pass and record their findings in this doc (or a sibling
`17b_INDEPENDENT_REVIEW.md`) with `verification_mode: independent`.

## 19.8 Explicit validation gaps

| Gap | Why | Risk left | Strongest substitute | Unblock action |
|---|---|---|---|---|
| Remote D1 migration-applied state | Planning-only; no hosted access | Remote schema/compliance tables may be absent | `current-state.md:271` snapshot (2026-07-06) | Owner runs Phase 3 readbook |
| Remote schema-existence readback | Same | Same | Better Auth proof route covers 4 tables only | Owner runs `verify-d1-schema-integrity --remote` (after impl) |
| Hosted D1 restore rehearsal | Destructive; owner-gated | Restore procedure unproven end-to-end | Local SQLite rehearsal (mechanics proven) | Owner runs staging restore |
| Free-tier Time Travel retention window | Official doc not re-fetched in-session | Restore timestamp window assumption | Official-doc URL cited (`generate-cloudflare-d1-restore-rehearsal.ts:70`) | Impl agent confirms at impl time |
| `verification_mode: independent` | No separate verifier lane | Readiness capped at 97; status capped at `CONDITIONALLY READY` | Emulated pass | Owner / independent reviewer |

None of these gaps is hidden; each is recorded with a substitute and an unblock action.

## 19.9 Confirmation

No external research was used to overclaim. All citations are either direct repo
`file:line` evidence, official-doc URLs (already cited in repo scripts), or explicitly
labeled assumptions. The package does not claim hosted/provider/production proof from
local evidence.

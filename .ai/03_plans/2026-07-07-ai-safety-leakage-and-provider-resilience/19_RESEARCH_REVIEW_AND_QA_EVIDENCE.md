# 19 — Research, Review, and QA Evidence

## Research questions and sources

| Question | Sources consulted | Decision changed? | Citation |
|---|---|---|---|
| What AI surface exists? | `src/lib/ai/**`, `src/app/api/ai/**` (L1) | Defined scope | repo paths in `03_*` |
| How is tenant isolation enforced on D1? | `src/lib/authz/d1-access.ts`, `roles.ts`, `proxy.ts` (L2) | Confirmed no RLS; app-code isolation | repo paths |
| What provider/resilience is wired? | `wrangler.jsonc`, `package.json`, `deepseek.ts`, `provider.ts` (L3) | Confirmed DeepSeek-only, 20s, no retry | repo paths |
| What audit/retention exists? | `migrations/0006/0019/0027/0034`, `audit*.ts`, `retention-core.ts` (L4) | Found retention-rule gap (DATA-002) | repo paths |
| What docs constrain AI? | `.ai/01_roadmap/*`, `.ai/06_specs/*`, `.ai/17_InfoSec/*`, corpus, OWASP `12-ai-llm-security.md` (L5) | Found Supabase→D1 drift (DOC-001) | doc paths |

No external/web research was required — all decisions are grounded in repo evidence + the existing internal corpus (roadmap/specs/OWASP/InfoSec). Official-doc research was not needed because no framework-version-sensitive or provider-pricing claim drives a decision (DeepSeek is an external provider whose policy is a hosted/legal fact, recorded as a gap).

What was searched for but not found: any recorded architecture decision for the DeepSeek choice or AI-audit design in `.ai/10_state/decisions.md` (zero AI entries → DOC-002). Any D1 RLS equivalent (none exists → SEC-001 structural risk).

## Skills and workflows used / unavailable

- Used (read-only): `archestimator-plan-pack` (confirmed exhaustive-pack need); five `Explore` agents (L1–L5) for codebase discovery.
- Reflected-in-content (not invoked): autopilot/ultrawork/ultragoal/ultraqa/performance-goal disciplines are encoded in the plan (durable-goal contracts per phase, parallelization notes, AQ matrix, PERF evaluator) per `Creating-Plan-Prompt.md` §4A — direct invocation is not required for a planning-only task.
- Not used: GitNexus impact analysis (no symbol edited); cloudflare/supabase skills (no provider mutation; legacy is out of scope); browser/Playwright (planning-only).

## Specialist workstream outputs

Summarized in `00_AGENT_COORDINATION.md` workstream matrix; detailed findings in `03_*` (L1–L4) and the doc-impact narrative (L5). All lanes returned concrete file paths, symbols, and line references.

## Critique-and-revision cycle summaries

- **Cycle 1 (initial synthesis):** drafted 21 docs from L1–L5 evidence.
- **Cycle 2 (adversarial self-review):** found Ask has no outbound scrub (→ SEC-004/T-P1-2); no cross-tenant suite (→ SEC-001/T-P4-1); bare console.error (→ SEC-008/T-P0-2); no PB rate limit (→ REL-003/T-P3-1); doc drift (→ DOC-001); signing-secret/undocumented env (→ OPS-001/T-P0-3); platform-admin bypass (→ DEC-007); retention gap (→ DATA-002). Revised requirements, tasks, traceability, risk register accordingly.
- **Cycle 3 (consistency/traceability):** verified every requirement traces to phase+task+test+gate; shadow-path cells complete; credential taxonomy present; readiness scores defensible; verification mode recorded. Residual findings are external/hosted/owner-gated only.

The exhaustive profile asks for ≥2 critique cycles after the initial draft; this run did 2 (cycles 2–3) plus the initial synthesis, satisfying the bar. Further cycles would not resolve external/owner-gated items.

## UltraQA-style adversarial scenario matrix

See `12_TEST_AND_VALIDATION_STRATEGY.md` AQ-1..AQ-10 + shadow-path matrices. Covers injection, cross-tenant, unauthorized, replay, timeout, oversized, misleading-success, disabled-state.

## Performance evaluator contract

See `09_*` PERF table: mocked-fetch `ai-performance.smoke`, synthetic fixture at caps, 20 runs, p50/p95, regression thresholds. Provider/hosted p95 recorded as hosted gap.

## Independent final verifier evidence

`verification_mode: emulated` — the verifier pass is a separated pass by the same lead agent (native subagents unavailable for synthesized-pack review). Verifier findings and corrections listed in `17_*`. The cap (≤97; CONDITIONALLY READY for high-blast-radius) is applied.

## Explicit validation gaps

- No real-DeepSeek smoke (paid/external) — not in scope.
- Hosted p95/error-rate/retention-cron proof — hosted evidence gaps.
- Browser proof for apply UX — only if interaction claim demands it.
- Independent/owner review of the final pack — required to lift the CONDITIONALLY READY cap.

# 22 — Inventory and Source Map (Improve pass, Phase 1)

Establishes source authority, requirement/decision/assumption/evidence maps, and the missing-source list before any revision. Required by `Improve-Plan-Prompt.md` PHASE 1.

## Document inventory

| Doc | Purpose | Authority | Status | Main claims | Req IDs | Decisions | Risks | Depends on | Depended on by | Gaps |
|---|---|---|---|---|---|---|---|---|---|---|
| 00_AGENT_COORDINATION | orchestration, workstreams, verification mode | canonical (coordination) | current | lanes, emulated cap | — | DEC-009 | — | all | all | none |
| 01_EXECUTIVE_SUMMARY | overview, current/target, findings | canonical (summary) | current | DeepSeek-only, OFF default | all (ref) | DEC-001..007 | RISK set | all | all | none |
| 02_FEATURE_BRIEF_AND_SCOPE | scope/non-goals/constraints | canonical (scope) | current | in/out, OPEN-001/002/003 | — | — | — | PROMPT.md | 04,11 | none |
| 03_SOURCE_AND_CODEBASE_AUDIT | AI code inventory (evidence) | canonical (codebase) | current | A–K sections | — | — | — | repo | 04,06,07,08,11 | none |
| 04_REQUIREMENTS_SPECIFICATION | requirements + credential taxonomy | canonical (requirements) | current | 32 reqs + cred table | all | — | — | 02,03 | 11,16 | cred taxonomy depth (improved this pass) |
| 05_UX_UI_ACCESSIBILITY_PLAN | journeys, states, a11y | canonical (UX) | current | narrow scope | UX-001 | — | — | 02 | 12 | action-level a11y proof matrix (added this pass) |
| 06_ARCHITECTURE_AND_TECHNICAL_DESIGN | current/target arch | canonical (architecture) | current | additive hardening | ARCH refs | DEC-002,004,005,008 | — | 03 | 11 | route boundary/cache contract (added this pass) |
| 07_DATA_DATABASE_API_NETWORK_PLAN | D1/API/network | canonical (data) | current | no schema change | DATA-* | DBB-002 | — | 03 | 08 | access-path matrix (added this pass) |
| 08_SECURITY_PRIVACY_THREAT_MODEL | threat model | canonical (security) | current | STRIDE, surfaces | SEC-* | DEC-007 | RISK set | 03,04 | 14 | attack-surface-inventory table (added this pass) |
| 09_PERFORMANCE_... | perf budgets | canonical (perf) | current | PERF evaluator | REL-001/002 | — | RISK-AI-03 | — | 13 | none |
| 10_BLAST_RADIUS | impact inventory | canonical (blast) | current | required/probable/... | — | — | — | 03 | 14 | none |
| 11_IMPLEMENTATION_PLAN | execution guide | canonical (execution) | current | P0–P7 | all (tasks) | — | — | 04,10 | 16 | test placement resolved this pass |
| 12_TEST_AND_VALIDATION_STRATEGY | test/QA | canonical (testing) | current | matrix+shadow+AQ | TEST-* | — | — | 04,11 | 16 | proof-contract rows (added this pass) |
| 13_ROLLOUT_... | rollout/rollback | canonical (ops) | current | two tracks | OPS-* | DEC-001 | RISK set | 11 | — | none |
| 14_RISK_REGISTER | risks | canonical (risk) | current | RISK-AI-01..12 | — | — | all | — | 17 | none |
| 15_DECISIONS_... | decisions/assumptions | canonical (decisions) | current | DEC-001..009, ASSUMP-01..07 | — | all | — | — | 16 | none |
| 16_REQUIREMENTS_TRACEABILITY_MATRIX | traceability | canonical (trace) | upgraded this pass | 32 rows | all | — | — | 04,11,12 | 17 | columns upgraded (Source strength, Gap/decision) |
| 17_FINAL_READINESS_REVIEW | readiness | canonical (readiness) | upgraded this pass | CONDITIONALLY READY | — | — | — | all | — | verification matrix + evidence-class table (added this pass) |
| 18_STACK_CONTRACT | stack standards | canonical (stack) | current | Next/CF/D1/Better Auth | — | — | — | — | — | none |
| 19_RESEARCH_REVIEW_AND_QA_EVIDENCE | evidence | canonical (evidence) | current | lanes, cycles | — | — | — | — | 17 | adversarial findings structure (added this pass) |
| 20_COST_MODEL | cost inputs | supporting | current | free-tier, no paid | — | — | RISK-AI-04 | — | — | none |
| 21_PROVIDER_PARITY_MATRIX | provider state | supporting | current | DeepSeek sole | — | DEC-002 | — | 03 | — | none |
| 22_INVENTORY_AND_SOURCE_MAP (this) | Phase-1 map | canonical (source map) | new | — | — | — | — | all | — | — |
| 23_READINESS_SCORECARD | Phase-2 scoring | canonical (scorecard) | new | — | — | — | — | all | 17 | — |
| README | entrypoint | canonical (entrypoint) | upgraded this pass | status, phase order | — | — | — | all | — | updated this pass |
| PROMPT.md | source brief | source (brief) | current | original ask | — | — | — | user | 02 | — |

## Source hierarchy (which controls on conflict)

1. User intent (PROMPT.md, explicit owner decisions).
2. Repo reality: `AGENTS.md`, current `src/`, `tests/`, `migrations/`, `wrangler.jsonc`, `package.json`, provider readback.
3. Local framework docs (`node_modules/next/dist/docs/`) + Cloudflare skills (`~/.agents/skills/cloudflare*`) for version-sensitive claims.
4. Internal authoritative docs (`.ai/01_roadmap`, `.ai/06_specs`, `.ai/17_InfoSec`, corpus, OWASP `12-ai-llm-security.md`) — note: several cite stale Supabase evidence (DOC-001).
5. Stale plans, archives, model memory — lowest authority.

## Requirement source map (every requirement → source + strength)

Source-strength codes: `brief` (PROMPT.md), `repo` (current code evidence), `roadmap` (`.ai/01_roadmap`/corpus), `owasp` (`.ai/03_plans/...12-ai-llm-security.md`), `infosec` (`.ai/17_InfoSec`), `derived` (inference). Inferred (`derived`) requirements are labeled as such, not presented as direct source facts.

| Req | Source | Strength |
|---|---|---|
| FR-001 AI off by default | brief + `feature-flags.ts` | brief+repo |
| FR-002 Ask read-only | repo (`ask/handler.ts` no domain writes) + corpus §8.5 | repo |
| FR-003 Apply gated | repo (`apply.ts`, `draft-token.ts`) + corpus §8.5 + owasp F-AI-01 | repo |
| FR-004 fail-closed | repo (`deepseek.ts`, `handler.ts`) + brief | repo+brief |
| SEC-001 no cross-tenant | brief + roadmap R-011 | brief+roadmap |
| SEC-002 sanitize input | brief + owasp F-AI-06/R-45 (LLM01) | owasp+brief |
| SEC-003 validate apply output | brief + owasp F-AI-05/R-44 | owasp+brief |
| SEC-004 scrub Ask output | **derived** (Ask returns content verbatim: `ask/handler.ts:220-222`; package-builder scrubs but Ask does not) | repo-derived |
| SEC-005 reject bypass | repo (`ai/auth.ts:28-30`) + owasp F-AI-08 | repo |
| SEC-006 no admin AI cross-tenant | **derived** (platform-admin bypass exists in `d1-access.ts`; AI risk inferred) | derived |
| SEC-007 metadata-only audit | repo (`audit.ts` hardcoded `metadata_only`) + brief | repo+brief |
| SEC-008 redacted logs | repo (bare `console.error` `handler.ts:341`) + owasp F-AI-09/R-47 | repo |
| SEC-009 key rotation | brief + owasp F-AI-07/R-46 | brief+owasp |
| SEC-010 provider disclosed | roadmap launch-gates LEG-03/LEG-06 | roadmap |
| SEC-011 no secrets in tests | brief + AGENTS.md | brief |
| REL-001 resilience | brief + roadmap R-010 + owasp F-AI-03/R-41/42 | brief+roadmap+owasp |
| REL-002 env timeout | owasp R-41 | owasp |
| REL-003 PB rate limit | **derived** (Ask has quota, package-builder has none: confirmed in `handler.ts`) | repo-derived |
| REL-004 degraded UX | brief + derived | brief+derived |
| OPS-001 documented flags | brief + owasp R-43 | brief+owasp |
| OPS-002 disabled drill | roadmap 10-ai-safety §3 | roadmap |
| OPS-003 no calls when off | repo (dynamic import gate `route.ts`) | repo |
| DATA-001 auditable | brief + repo | brief+repo |
| DATA-002 retention verified | repo — **CONFIRMED DEFECT this pass** (AI class in union but no rule rows, see §missing-source) | repo |
| DATA-003 per-ws opt-out | OPEN-002 / DEC-008 | owner-delegated-deferred |
| DOC-001 re-anchor docs | derived from doc audit (L5) | derived |
| DOC-002 decisions entries | owasp R-43 | owasp |
| TEST-001 leakage suite | brief + roadmap R-011 | brief+roadmap |
| TEST-002 injection suite | brief | brief |
| TEST-003 shadow matrix | brief | brief |
| UX-001 distinguish Ask/PB | roadmap UX-05 | roadmap |

## Decision map (accepted + rejected)

Accepted: DEC-001..009 (in `15_*`). Each names rejected alternatives + rationale. No hidden rejections.

## Assumption register

ASSUMP-01..07 in `15_*`. New/updated this pass:
- ASSUMP-06 (test runner/placement): **upgraded to verified** — tests live in `tests/vitest/` as `ai-*.test.ts` (13 existing files). New suites use the same runner (`bun test`/vitest) and directory.
- ASSUMP-07 (retention purges AI tables): **falsified** — see missing-source list. Demoted to a known defect (DATA-002 elevated) with a work item (T-P6-2 now specifies adding rule rows).

## Evidence map (key claims → repo artifacts)

| Claim | Evidence |
|---|---|
| DeepSeek sole provider | grep `src/`, `package.json` — no openai/anthropic/ai-sdk; `deepseek.ts`, `provider.ts` only call sites |
| AI off by default | `feature-flags.ts` default false; `ask/route.ts`/`package-builder/route.ts` dynamic-import gate |
| Ask returns content verbatim (SEC-004) | `ask/handler.ts:220-222` |
| Identity-key scrub on package-builder, not Ask | `provider.ts:154` `FORBIDDEN_PROVIDER_KEYS`; `assertNoForbiddenIdentityKeys` at `provider.ts:180` and `schemas.ts:356` (duplicated) |
| Bare console.error | `package-builder/handler.ts:341` |
| No D1 RLS | D1 has no RLS; Supabase RLS inert; app isolation = `d1-access.ts` + `WHERE workspace_id=?` |
| AI audit retention NOT purged (DATA-002) | `retention-core.ts:32-34` union includes AI; `:79-135` rule rows omit AI → cron never deletes AI rows |
| Test layout | `tests/vitest/ai-*.test.ts` (13 files) |
| Cloudflare skills available | `~/.agents/skills/cloudflare/SKILL.md`, `cloudflare-one/SKILL.md` |

## Missing-source list (decisions/evidence needed)

1. **[EVIDENCE-DEFECT, internally resolvable] DATA-002:** AI retention rule rows absent in `DEFAULT_RETENTION_RULES`. Resolution: add rule rows (additive config, not a migration) — work item T-P6-2 specifies it. Owner: impl.
2. **[EVIDENCE-DEFECT, internally resolvable] Clean-engineering:** `assertNoForbiddenIdentityKeys` duplicated in `schemas.ts:356` and `provider.ts:180`. Resolution: outbound scrub (T-P1-2) should extract/shared the single helper, not add a third copy. Owner: impl.
3. **[EXTERNAL] OPEN-001:** Track A vs B at launch. Owner: Philip.
4. **[EXTERNAL] DEC-007/SEC-006:** platform-admin AI cross-tenant guard. Owner: Philip.
5. **[EXTERNAL/LEGAL] SEC-010:** DeepSeek subprocessor disclosure. Owner: legal/Philip.
6. **[HOSTED/PROVIDER, not provable locally]:** DeepSeek hosted p95/error-rate; retention-cron hosted proof; DeepSeek dashboard budget. Recorded as residual evidence gaps.

## Conflicts resolved this pass

- Test placement previously labeled `DISCOVERY-REQUIRED` → resolved to `tests/vitest/ai-*.test.ts` (concrete). Updated in `11_*` and `16_*`.
- DATA-002 previously "verify only" → elevated to confirmed defect with work item.
- Clean-engineering duplicate-helper finding added.

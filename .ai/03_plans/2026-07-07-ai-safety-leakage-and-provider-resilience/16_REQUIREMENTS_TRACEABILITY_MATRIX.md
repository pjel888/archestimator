# 16 — Requirements Traceability Matrix

Improve-pass schema (required by `Improve-Plan-Prompt.md` PHASE 3 §2):
`Source ID | Requirement | Source evidence | Source strength | Plan section | Work item | Acceptance criteria | Test/proof | Risk | Status | Gap/decision`.

Source-strength codes: `brief` (PROMPT.md), `repo` (current code), `roadmap` (`.ai/01_roadmap`/corpus), `owasp`, `infosec`, `derived` (inference — labeled, not presented as fact).

| Source ID | Requirement | Source evidence | Strength | Plan section | Work item | Acceptance criteria | Test/proof | Risk | Status | Gap/decision |
|---|---|---|---|---|---|---|---|---|---|---|
| SRC-BRIEF, `feature-flags.ts` | FR-001 AI off by default | `feature-flags.ts` default false; routes 404; `WorkshopPageShell.tsx:152` UI gate | brief+repo | 04,11 | T-P0-1 | flag false → 404 + UI hidden + no provider call | `tests/vitest/ai-disabled-state.test.ts` | RISK-AI-01 adjacency | pending | none — clear |
| SRC-REPO (`ask/handler.ts` no domain writes); corpus §8.5 | FR-002 Ask read-only | static proof: no INSERT/UPDATE/DELETE on domain tables in `ask/handler.ts` | repo | 04,11 | T-P0-1 | no domain writes | `tests/vitest/ai-ask-no-writes.test.ts` | future-edit regression | pending | none |
| SRC-REPO (`apply.ts`,`draft-token.ts`); owasp F-AI-01; corpus §8.5 | FR-003 Apply gated | token+hash+userId+wsId+editor+idempotency denials | repo | 04,11 | T-P3-2 | all denials pass | `tests/vitest/ai-package-builder-security-contract.test.ts` (extend) | apply abuse | pending | none |
| SRC-BRIEF; `deepseek.ts`,`handler.ts` | FR-004 fail-closed | no key→503; provider err→502/fallback | brief+repo | 04,11 | T-P2-2 | 502/503+fallback | `tests/vitest/ai-provider-fail-closed.test.ts` | RISK-AI-03 | pending | none |
| SRC-BRIEF; roadmap R-011 | SEC-001 no cross-tenant | `WHERE workspace_id=?` everywhere; no D1 RLS backstop | brief+roadmap | 04,08,11 | T-P4-1 | no B data in provider payload | `tests/vitest/ai-cross-tenant-leakage.test.ts` | **RISK-AI-01 Critical** | pending | **launch-blocker for Track B** |
| SRC-BRIEF; owasp F-AI-06/R-45 (LLM01) | SEC-002 sanitize input | user text forwarded verbatim today (length-cap only) | owasp+brief | 04,06,11 | T-P1-1 | injection neutralized+flagged | `tests/vitest/ai-sanitize.test.ts` | RISK-AI-02 | pending | none |
| SRC-BRIEF; owasp F-AI-05/R-44 | SEC-003 validate apply output | `assertNoForbiddenIdentityKeys` + strict parser exist | owasp+brief | 04,11 | T-P3-2 | crafted payload rejected | `ai-package-builder-security-contract.test.ts` (extend) | apply smuggling | pending | none |
| SRC-REPO-derived (`ask/handler.ts:220-222` returns content verbatim; `provider.ts:154` scrubs PB only) | SEC-004 scrub Ask output | Ask has NO outbound scrub (PB has `FORBIDDEN_PROVIDER_KEYS`) | derived | 04,06,11 | T-P1-2 | identity/secret scrubbed from Ask response | `tests/vitest/ai-ask-outbound-scrub.test.ts` | RISK-AI-02 | pending | none — derived, evidence-cited |
| SRC-REPO (`ai/auth.ts:28-30`); owasp F-AI-08 | SEC-005 reject bypass | dev/admin bypass throws | repo | 04,11 | T-P4-1 (extend) | 403+audit blocked | `tests/vitest/ai-auth-guard.test.ts` (extend) | bypass | pending | none |
| SRC-REPO-derived (`d1-access.ts` `isPlatformAdmin` fast-path) | SEC-006 no admin AI cross-tenant | platform admin bypasses probes; AI under admin = no boundary | derived | 04,08,11 | T-P4-3 (owner-gated) | admin sees own ws only via AI | denial test | RISK-AI-05 | blocked | **DEC-007 owner sign-off** |
| SRC-BRIEF; `audit.ts` hardcoded `metadata_only`; CHECK constraints | SEC-007 metadata-only | hashes only; `sha256:` enforced | repo+brief | 04,07 | verify | no raw prompt/completion in DB/logs | `tests/vitest/ai-audit-metadata-only.test.ts` | forensic blindness | verify | none (DEC-005 accepted) |
| SRC-REPO (`package-builder/handler.ts:341` bare `console.error`) | SEC-008 redacted logs | bare console.error bypasses `redactForLog` | repo | 04,11 | T-P0-2 | no raw content in logs | `tests/vitest/ai-apply-log-redaction.test.ts` | secret leak | pending | none |
| SRC-BRIEF; owasp F-AI-07/R-46 | SEC-009 key rotation | no runbook; key read fresh each call | brief+owasp | 13,11 | T-P6-1 | runbook exists | doc review | RISK-AI-07 | pending | none |
| SRC-ROADMAP (LEG-03/LEG-06) | SEC-010 provider disclosed | DeepSeek not yet in subprocessor list | roadmap | 13,11 | T-P7-3 | DeepSeek named + copy truthful | legal review | RISK-AI-12 | pending | **external/legal** |
| SRC-BRIEF; AGENTS.md | SEC-011 no secrets in tests | convention | brief | 04 | convention | synthetic fixtures only | fixture scan | — | convention | none |
| SRC-BRIEF; roadmap R-010; owasp F-AI-03/R-41/42 | REL-001 resilience | 20s timeout only; no retry/breaker | brief+roadmap+owasp | 09,11 | T-P2-2 | retry+jitter+breaker | `tests/vitest/ai-provider-resilience.test.ts` | RISK-AI-03 | pending | none |
| SRC-OWASP R-41 | REL-002 env timeout | hard-coded 20s | owasp | 09,11 | T-P2-1 | env override | `tests/vitest/ai-provider-config.test.ts` | — | pending | none |
| SRC-REPO-derived (Ask has quota via `rate-limit.ts`; PB has none) | REL-003 PB rate limit | no quota on `/api/ai/package-builder` | derived | 11 | T-P3-1 | 429+Retry-After | `tests/vitest/ai-package-builder-rate-limit.test.ts` | RISK-AI-04 | pending | none — derived, evidence-cited |
| SRC-BRIEF | REL-004 degraded UX | honest unavailable state | brief | 05 | UI verify | labeled states | DOM assertion | UX | verify | none |
| SRC-BRIEF; owasp R-43 | OPS-001 documented flags | 7 AI env vars undocumented in `.env.example` | brief+owasp | 13,11 | T-P0-3 | all flags in env-example + decisions.md | `tests/vitest/closed-beta-env-manifest.test.ts` (extend) | RISK-AI-07 | pending | none |
| SRC-ROADMAP (10-ai-safety §3) | OPS-002 disabled drill | no automated off-state check | roadmap | 13,11 | T-P5-2 | off-state holds (deployed) | `scripts/ai-disabled-check.mjs` + runbook | — | pending | none |
| SRC-REPO (`route.ts` dynamic-import gate) | OPS-003 no calls when off | handler not imported when off | repo | 04,11 | T-P0-1 | no outbound fetch when off | `ai-disabled-state.test.ts` | — | pending | none |
| SRC-BRIEF; repo | DATA-001 auditable | `ai_*` tables populated | brief+repo | 07 | verify | rows+categories present | `tests/vitest/ai-audit-flow.test.ts` | — | verify | none |
| SRC-REPO-DEFECT (`retention-core.ts:32-34` union has AI; `:79-135` rule rows OMIT AI) | DATA-002 retention verified | AI class declared but NO purge rule → AI rows never deleted | repo (defect) | 07,11 | T-P6-2 (add rule rows) | AI rows purged by cron | retention suite extend + hosted proof | unbounded AI row growth | pending | **CONFIRMED DEFECT — internally resolvable** |
| SRC-OPEN-002/DEC-008 | DATA-003 per-ws opt-out | none today | owner-delegated-deferred | 07,15 | DBB-002 (deferred) | deferred | n/a | tenant governance | deferred | **DEC-008 deferred past launch** |
| SRC-DERIVED (doc audit L5) | DOC-001 re-anchor docs | AI docs cite Supabase (RLS/RPC/`authMode==='supabase'`) | derived | 11 | T-P7-1 | no AI doc cites Supabase as current | doc review | RISK-AI-09 | pending | none |
| SRC-OWASP R-43 | DOC-002 decisions entries | `decisions.md` has zero AI entries | owasp | 11 | T-P7-2 | AI decision IDs present | doc review | — | pending | none |
| SRC-BRIEF; roadmap R-011 | TEST-001 leakage suite | no suite exists | brief+roadmap | 12,11 | T-P4-1 | green | `ai-cross-tenant-leakage.test.ts` | RISK-AI-01 | pending | none |
| SRC-BRIEF | TEST-002 injection suite | no suite exists | brief | 12,11 | T-P1-1,T-P4-2 | green | `tests/vitest/ai-prompt-injection.test.ts` | RISK-AI-02 | pending | none |
| SRC-BRIEF | TEST-003 shadow matrix | no matrix exists | brief | 12,11 | T-P5-1 | matrix green | `tests/vitest/ai-adversarial-shadow-paths.test.ts` | — | pending | none |
| SRC-ROADMAP (UX-05) | UX-001 distinguish Ask/PB | disclosure + guidance | roadmap | 05 | UI verify | disclosure present | DOM/a11y assertion | RISK-AI-11/12(confusion) | verify | none |

## Traceability integrity

- Every requirement has: source evidence, source strength, work item, acceptance criterion, test/proof.
- Every work item traces back to ≥1 requirement.
- No `derived` requirement is presented as a direct source fact (SEC-004, SEC-006, REL-003, DOC-001 are explicitly labeled `derived` with evidence citations).
- No requirement untraced. No phantom work items.
- Source-strength distribution: `repo` 13, `brief` 9, `roadmap` 5, `owasp` 7, `derived` 4, `infosec` 0 (InfoSec findings folded into repo/owasp).

## Performance-sensitive rows (also map to PERF evaluator in `09_*`)

FR-004, REL-001, REL-002, REL-003 → baseline (mocked-fetch), target (p95 budgets), measurement (`ai-performance.smoke`), regression threshold, rollback trigger (disable switch) — all defined in `09_*`.

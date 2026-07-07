# 16 — Requirements Traceability Matrix

| Req ID | Source | User Outcome | Phase | Task IDs | Code Areas | Acceptance Criteria | Test Coverage | Rollout Check | Status |
|---|---|---|---|---|---|---|---|---|---|
| FR-001 | brief/repo | AI off by default | P0 | T-P0-1 | feature-flags.ts, routes, WorkshopPageShell | 404 + hidden + no call | ai-disabled-state.test | cf:ai-disabled-check | pending |
| FR-002 | brief/corpus | Ask read-only | P0 | T-P0-1 | ask/handler.ts | no domain writes | ai-ask-no-writes.test | n/a | pending |
| FR-003 | corpus/owasp | Apply gated | P3 | T-P3-2 | apply.ts, draft-token.ts, schemas.ts | all denials pass | security-contract (extend) | n/a | pending |
| FR-004 | repo/brief | fail-closed | P2 | T-P2-2 | provider-client.ts | 502/503+fallback | ai-provider-fail-closed.test | n/a | pending |
| SEC-001 | brief/R-011 | no cross-tenant | P4 | T-P4-1 | read-context.ts, read-tools.ts, apply.ts | no B data in payload | cross-tenant-leakage.test | leakage suite green | pending (launch-blocker for enable) |
| SEC-002 | brief/owasp | sanitized input | P1 | T-P1-1 | sanitize.ts | neutralized+flagged | ai-sanitize.test | n/a | pending |
| SEC-003 | brief/owasp | validated apply | P3 | T-P3-2 | schemas.ts, provider.ts | crafted rejected | security-contract (extend) | n/a | pending |
| SEC-004 | brief | scrubbed Ask output | P1 | T-P1-2 | outbound-scrub.ts, ask/handler.ts | identity/secret scrubbed | ai-ask-outbound-scrub.test | n/a | pending |
| SEC-005 | repo/owasp | reject bypass | P4 | T-P4-1 (extend) | ai/auth.ts | 403 | ai-auth-guard (extend) | n/a | pending |
| SEC-006 | derived/DEC-007 | no admin AI cross-tenant | P4 | T-P4-3 (owner-gated) | ai/auth.ts, read-*.ts | admin sees own ws only | denial test | owner sign-off | blocked-external |
| SEC-007 | brief/repo | metadata-only | P0 | (verify) | audit*.ts | hashes only | ai-audit-metadata-only.test | n/a | verify |
| SEC-008 | repo/owasp | redacted logs | P0 | T-P0-2 | handler.ts:341, logger.ts | no raw content | ai-apply-log-redaction.test | n/a | pending |
| SEC-009 | brief/owasp | key rotation | P6 | T-P6-1 | runbook | runbook exists | doc review | runbook | pending |
| SEC-010 | launch-gates | provider disclosed | P7 | T-P7-3 | privacy docs | DeepSeek named | doc/legal review | subprocessor list | pending |
| SEC-011 | brief/AGENTS | no secrets in tests | P1 | (convention) | test fixtures | synthetic only | fixture scan | n/a | convention |
| REL-001 | brief/R-010 | resilience | P2 | T-P2-2 | provider-client.ts | retry+breaker | ai-provider-resilience.test | n/a | pending |
| REL-002 | owasp/R-41 | env timeout | P2 | T-P2-1 | feature-flags/config | env override | ai-provider-config.test | n/a | pending |
| REL-003 | repo | PB rate limit | P3 | T-P3-1 | rate-limit.ts, handler.ts | 429+Retry-After | ai-package-builder-rate-limit.test | n/a | pending |
| REL-004 | brief | honest degraded UX | P1/P5 | (UI verify) | EstimateCopilotFloatingButton.tsx | labeled states | DOM assertion | n/a | verify |
| OPS-001 | brief | documented flags | P0 | T-P0-3 | .env.example, decisions.md | all flags listed | env-manifest test | n/a | pending |
| OPS-002 | roadmap | disabled drill | P5 | T-P5-2 | scripts/ai-disabled-check.mjs | off-state holds | drill runbook | drill | pending |
| OPS-003 | repo | no calls when off | P0 | T-P0-1 | routes | dynamic-import gate | disabled-state test | n/a | pending |
| DATA-001 | brief | auditable | P0 | (verify) | audit-d1-store.ts | rows populated | existing audit tests | n/a | verify |
| DATA-002 | repo | retention verified | P6 | T-P6-2 | retention-core.ts | AI rule rows | retention suite (extend) | cron proof (hosted) | pending |
| DATA-003 | OPEN-002/DEC-008 | per-ws opt-out | deferred | n/a | n/a | deferred | n/a | n/a | deferred |
| DOC-001 | L5 | docs re-anchored | P7 | T-P7-1 | AI docs | no supabase-current | doc review | n/a | pending |
| DOC-002 | owasp/R-43 | decisions entries | P7 | T-P7-2 | decisions.md | AI decision IDs | doc review | n/a | pending |
| TEST-001 | brief/R-011 | leakage suite | P4 | T-P4-1 | tests | green | cross-tenant-leakage.test | n/a | pending |
| TEST-002 | brief | injection suite | P1/P4 | T-P1-1,T-P4-2 | tests | green | ai-prompt-injection.test | n/a | pending |
| TEST-003 | brief | shadow matrix | P5 | T-P5-1 | tests | matrix green | ai-adversarial-shadow-paths.test | n/a | pending |
| UX-001 | roadmap UX-05 | distinguish Ask/PB | P5 | (UI verify) | floating button, copy | disclosure present | DOM/a11y assertion | n/a | verify |

Every requirement maps to source, phase, task(s), acceptance, test, and rollout check. No requirement untraced. Performance-sensitive rows (REL-001, FR-004) also map to the PERF evaluator in `09_*`.

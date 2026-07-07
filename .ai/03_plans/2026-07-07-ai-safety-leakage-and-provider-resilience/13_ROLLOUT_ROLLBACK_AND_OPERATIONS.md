# 13 — Rollout, Rollback, and Operations

## Release strategy

Two tracks per OPEN-001:

**Track A — Ship-with-AI-OFF (DEC-001 recommendation):**
1. Land Phase 0 (OFF-state proof + console.error fix + env docs) and Phase 7 (doc re-anchor + decisions + privacy).
2. Deploy with `ARCHESTIMATOR_AI_ENABLED=false` (or unset), `DEEPSEEK_API_KEY` unset in prod env (or set but unused).
3. Run `cf:ai-disabled-check` against deployed env (OPS-002).
4. Phases 1–6 land later, behind the still-off flag, as pre-enablement hardening.

**Track B — Enable-after-hardening (owner-gated, post Track-A):**
1. Complete Phases 1–6.
2. Closed-beta enable: flip `ARCHESTIMATOR_AI_ENABLED=true` + `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED=true` for a limited cohort (env-level; no per-workspace yet).
3. Monitor error/timeout/leakage signals for 1–2 weeks.
4. Broaden or roll back based on gates.

## Rollout performance gates (Track B)

| Metric | Source | Merge gate | Beta gate | Prod gate | Rollback trigger |
|---|---|---|---|---|---|
| AI route error-rate | Workers Observability + audit `error_class` | n/a | < 5% | < 2% | > 5% sustained 1h |
| Ask timeout-rate | audit + logs | n/a | < 5% | < 2% | > 10% |
| Apply failure-rate | `ai_package_apply_commands` status | n/a | < 3% | < 1% | > 5% |
| Cross-tenant incident | leakage suite (CI) | must be green | must be green | must be green | any incident → disable |
| Cost/spend | DeepSeek dashboard (external) | n/a | within budget | within budget | over budget → tighten quota/disable |

Regression window: 7 days post-enable. Sample: limited cohort. Hosted metrics = hosted evidence gap until deployed.

## Feature flags (OPS-001)

| Flag | Default | Purpose |
|---|---|---|
| `ARCHESTIMATOR_AI_ENABLED` | false | master AI kill switch |
| `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED` | false | client UI gate (browser-visible) |
| `AI_PACKAGE_BUILDER_READ_TOOLS_ENABLED` | true | PB read tools |
| `AI_PACKAGE_BUILDER_DRAFT_ENABLED` | true | PB draft/refine |
| `AI_PACKAGE_BUILDER_APPLY_SHELL_ENABLED` | true | PB apply shell |
| `AI_PACKAGE_BUILDER_APPLY_TREE_ENABLED` | true | PB apply tree writes |
| `AI_PACKAGE_BUILDER_APPLY_ROWS_ENABLED` | true | PB apply row writes |
| `AI_PACKAGE_BUILDER_MEMORY_ENABLED` | false | learned preferences |
| `DEEPSEEK_API_KEY` | unset | provider credential |
| `DEEPSEEK_MODEL` | deepseek-v4-flash | model override |
| `DEEPSEEK_REQUEST_TIMEOUT_MS` (new) | 20000 | timeout |
| `AI_PACKAGE_BUILDER_DRAFT_SIGNING_SECRET` | unset (throws in prod) | apply token HMAC |

## Rollback

- **Global:** `ARCHESTIMATOR_AI_ENABLED=false` → routes 404, UI hidden, no provider calls.
- **Granular (PB):** `AI_PACKAGE_BUILDER_APPLY_*_ENABLED=false` to disable writes while keeping read/draft.
- **Credential:** rotate `DEEPSEEK_API_KEY` (and signing secret) per runbook (SEC-009); read-fresh-per-call means rotation takes effect without redeploy.
- **Data:** AI apply writes are reversible via the estimate history (`estimate_sheet_events`) + idempotency ledger; a bad apply can be reverted by re-running the estimate's undo/history path. Document a "revert last AI apply" runbook step.

## Observability (ops)

- Audit tables (D1) are the source of truth for "what ran." Runbook query: error-rate by `error_class` per day per workspace.
- Workers Observability: tail logs for provider failures; traces 0.05.
- Structured provider-call log line (T-P6-3): `{ai_route, provider, outcome, duration_ms, error_class}`.
- No PII in any of the above.

## Post-release verification

- Re-run leakage + injection suites in CI on every change to `src/lib/ai/**`.
- Weekly: spot-check `ai_data_access_events` for unexpected `source_tables` or row counts.
- Track B: 7-day regression window review before broadening.

## Support / incident

- Incident lever: disable switch (immediate) → key rotation (if credential suspected) → apply revert (if bad write).
- Forensics limit: metadata-only audit → exact prompt not recoverable; rely on `provider_send_categories` + category-level provenance.

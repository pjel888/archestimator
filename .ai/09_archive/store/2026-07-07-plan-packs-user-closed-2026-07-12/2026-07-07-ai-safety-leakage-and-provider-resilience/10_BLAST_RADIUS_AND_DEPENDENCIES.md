# 10 — Blast Radius and Dependencies

Direct + transitive impact of the target hardening. Classification: **Required** / **Probable** / **Possible** / **Verification only** / **Explicitly unaffected**.

## Users / roles

| Impact | Class | Note |
|---|---|---|
| All users: AI stays off by default | Required | No behavior change at launch (DEC-001) |
| Workspace viewers: cannot apply (already true) | Verification only | Confirm existing editor gate |
| Platform admins: (target) no AI cross-tenant bypass (SEC-006) | Possible (owner-gated) | Behavior change; DEC-007 |

## Screens / components / routes

| Asset | Class | Change |
|---|---|---|
| `EstimateCopilotFloatingButton.tsx` | Verification only | Confirm flag-gated render + a11y |
| `WorkshopPageShell.tsx` | Verification only | Confirm UI gate (line 152) |
| `/api/ai/ask` | Required (SEC-002/SEC-004/REL-001) | sanitize + outbound scrub + provider wrapper |
| `/api/ai/package-builder` | Required (REL-001/REL-003) | provider wrapper + rate limit |

## APIs / services / shared libs

| Asset | Class | Change |
|---|---|---|
| `src/lib/ai/deepseek.ts` | Required | use provider wrapper; env timeout |
| `src/lib/ai/package-builder/provider.ts` | Required | use provider wrapper; env timeout |
| `src/lib/ai/read-context.ts` | Probable | route reads via scoped-query helper (optional) |
| `src/lib/ai/package-builder/read-tools.ts` | Probable | same |
| `src/lib/ai/audit.ts` / `audit-d1-store.ts` | Verification only | no change; confirm fail-closed policy |
| `src/lib/ai/rate-limit.ts` | Probable | add package-builder scope |
| `src/lib/ai/auth.ts` | Verification only | no change |
| `src/lib/ai/package-builder/apply.ts` | Verification only | no change; drill only |
| `src/lib/ai/package-builder/schemas.ts` | Verification only | strict parser unchanged |
| `src/lib/ai/package-builder/draft-token.ts` | Verification only | no change; document secret |
| `src/lib/observability/redact.ts` | Possible | reuse injection patterns in sanitize |
| `src/lib/observability/logger.ts` | Possible | route bare console.error through it |

## New files (proposed exact paths)

| Path | Responsibility |
|---|---|
| `src/lib/ai/sanitize.ts` | prompt-injection sanitization + length cap |
| `src/lib/ai/outbound-scrub.ts` | identity/secret/SQL/command scrub for Ask output (extend `assertNoForbiddenIdentityKeys`) |
| `src/lib/ai/provider-client.ts` | timeout + retry + jitter + circuit breaker wrapper |
| `src/lib/ai/scoped-query.ts` | (optional) workspace-bound query helper |
| `tests/.../ai-cross-tenant-leakage.test.ts` | TEST-001 |
| `tests/.../ai-prompt-injection.test.ts` | TEST-002 |
| `tests/.../ai-provider-resilience.test.ts` | REL-001 |
| `tests/.../ai-adversarial-shadow-paths.test.ts` | TEST-003 |
| `scripts/ai-disabled-check.*` (or `cf:ai-disabled-check`) | OPS-002 |
| `.ai/…/ai-incident-runbook.md` | SEC-009/Ops |

(Exact test file locations to be confirmed at implementation time against the existing `ai-*` test layout — `DISCOVERY-REQUIRED` only for placement, behavior fully specified.)

## Database / migrations

| Asset | Class | Change |
|---|---|---|
| AI tables (`0006/0019/0027`) | Verification only | no schema change (DBB-001) |
| Retention rules (`retention-core.ts`) | Probable | verify/add AI rule rows (DBB-003) |
| Per-workspace opt-out | Explicitly unaffected (deferred, DBB-002) | not in launch |

## Background jobs / integrations / caches

| Asset | Class | Change |
|---|---|---|
| Retention cron (`30 3 * * *`) | Verification only | confirm AI table purge |
| `revalidatePath` in apply | Verification only | unchanged |
| DeepSeek integration | Required | wrapper + env config |
| Queue / Durable Object / R2 / Email | Explicitly unaffected | AI does not use these |

## Auth / authorization

| Asset | Class | Change |
|---|---|---|
| Better Auth session path | Verification only | unchanged |
| `d1-access.ts` membership probes | Verification only | unchanged (SEC-006 is AI-side, not d1-access) |
| Platform-admin bypass on AI | Possible | DEC-007 AI-side guard |

## Tests / analytics / monitoring / docs

| Asset | Class | Change |
|---|---|---|
| Existing `ai-*` tests | Verification only | keep green |
| New test suites | Required | TEST-001/002/003, REL-001 |
| AI-constraining docs | Required | DOC-001 re-anchor |
| `decisions.md` | Required | DOC-002 add AI decisions |
| Privacy notice / subprocessor list | Required | SEC-010 |

## Backward compatibility

All hardening is additive; the off-state is unchanged; the on-state gets safer. No public API contract change. Apply idempotency unchanged.

## Other active dev work

Git status shows active edits in `.agents/skills/gitnexus/**`, several sibling `.ai/03_plans` packs, and component-library work. None overlap with `src/lib/ai/**` or the AI routes, so concurrent-edit risk is low. Implementation will re-check `git status` before each edit (concurrent-agent discipline, Multi-Agent Directive §6).

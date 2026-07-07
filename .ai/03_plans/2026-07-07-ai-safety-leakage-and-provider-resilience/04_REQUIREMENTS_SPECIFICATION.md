# 04 — Requirements Specification

Stable IDs across categories. Priority: **Must** (blocks launch/enablement), **Should** (hardening), **Could** (deferred). Source codes: `brief` (PROMPT.md), `repo` (code evidence), `roadmap` (`.ai/01_roadmap`), `owasp` (`.ai/03_plans/2026-06-01-security-owasp-compliance-audit/12-ai-llm-security.md`), `infosec` (`.ai/17_InfoSec`), `corpus` (`.ai/00_corpus`), `derived` (inference from the above).

## FR — Functional

### FR-001 (Must, brief, repo)
AI must be **disabled by default**. Routes return 404 unless `ARCHESTIMATOR_AI_ENABLED` truthy; Ask UI hidden unless `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED`.
- AC: With flag false, `POST /api/ai/ask` and `/api/ai/package-builder` return 404 `{error:"AI is disabled for closed beta."}`; floating button not rendered.
- Validation: Vitest asserting 404 + DOM test asserting UI absence.
- Affected: `feature-flags.ts`, `ask/route.ts`, `package-builder/route.ts`, `WorkshopPageShell.tsx:152`.
- Risk: a stale/leaked env flipping the flag in prod. Mitigation: closed-beta env manifest test.

### FR-002 (Must, brief, repo)
Ask Flip is **read-only** — zero write paths to project/estimate/component/proposal/user data.
- AC: Static/grep proof that `ask/handler.ts` performs no D1 INSERT/UPDATE/DELETE on domain tables; only audit writes.
- Validation: assertion test over the Ask handler's DB call set.
- Risk: future edit introducing a write. Mitigation: lint/test guard.

### FR-003 (Must, repo, corpus §8.5)
Package-builder **apply** requires confirmation, HMAC-signed draft token (30-min TTL) bound to user+workspace, hash match, workspace-editor authorization, and idempotency.
- AC: Apply fails without valid token / on hash mismatch / on userId mismatch / on workspace mismatch / on viewer role / on replayed idempotency key.
- Validation: existing `ai-package-builder-security-contract` + new denial tests.

### FR-004 (Should, brief, repo)
AI must **fail closed** when the provider is unavailable or misconfigured (no key → 503; provider error → 502 Ask / deterministic fallback package-builder).
- AC: Unset `DEEPSEEK_API_KEY` → 503; simulated provider 5xx/timeout → 502 for Ask, deterministic draft for package-builder.
- Validation: unit tests with mocked fetch.

## SEC — Security / Privacy

### SEC-001 (Must, brief, roadmap R-011, owasp F-AI-06)
All data read for the prompt must be **workspace-scoped** from the authenticated session; no cross-tenant data may reach the provider.
- AC: A query in workspace A's session never returns workspace B's rows; proven by a cross-tenant leakage test suite (two workspaces, swapped-context attempt).
- Validation: new `ai-cross-tenant-leakage.test.ts` (R-011 launch-blocker).
- Risk: a future AI tool forgetting `WHERE workspace_id = ?` (no DB safety net on D1). Mitigation: centralized scoped-query helper + test that every AI read binds workspaceId.

### SEC-002 (Must, brief, owasp F-AI-06/R-45, LLM01)
User text forwarded to the provider must be **sanitized for prompt injection** and length-capped.
- AC: Known injection phrases are neutralized/flagged before the provider call; messages > cap are rejected/truncated.
- Validation: prompt-injection test corpus; assert provider payload contains the neutralized form.
- Note: Sanitization is defense-in-depth, not a substitute for treating output as untrusted.

### SEC-003 (Must, brief, owasp F-AI-05/R-44)
AI output that drives writes (package-builder draft) must be **strictly validated** (allow-list keys, reject identity keys, cap nodes/rows/components per apply) before any write.
- AC: A crafted provider output with `workspaceId`/unknown keys/oversized arrays is rejected; apply never proceeds.
- Validation: `parsePackageBuilderProviderSuggestion` + `validatePackageBuilderDraft` denial tests.

### SEC-004 (Must, brief)
Ask Flip output returned to the client must **not** leak forbidden identity or secret material.
- AC: Ask output passes the same identity-key scrubbing package-builder uses; secrets/SQL/commands blocked.
- Validation: extend identity-scrub test to the Ask response path (currently Ask has **no** output scrubbing — gap).
- Risk: model echoes workspace_id/user_id or a stored secret. Mitigation: outbound scrub on Ask content.

### SEC-005 (Must, repo, owasp F-AI-08)
AI routes must **reject the admin-DB / dev-bypass auth mode**.
- AC: Dev/admin bypass → 403 with audit `blocked`.
- Validation: existing `ai-auth-guard` test + denial assertions.

### SEC-006 (Should, derived, DEC-007)
Platform-admin sessions should **not bypass tenant scoping on AI paths** (admin may not use AI to read/write another tenant).
- AC: A platform-admin user invoking AI only sees their own workspace's data (AI explicitly re-binds workspaceId, ignoring the admin fast-path).
- Validation: denial test. (Behavior change — flagged DEC-007.)

### SEC-007 (Must, brief, repo)
Audit must be **metadata-only**: no raw prompts/completions in D1, logs, or analytics; only hashes + category provenance + curated summaries.
- AC: grep/DB-query proof that no `ai_*` table or log line stores raw prompt/completion text; CHECK constraints enforce `sha256:`.
- Validation: schema assertion + log-scan test.

### SEC-008 (Must, repo, owasp F-AI-09/R-47)
No service-role key or AI-audit client material may be logged; the one bare `console.error` in the apply handler must route through the redacting logger.
- AC: `package-builder/handler.ts:341` uses structured logger with `redactForLog`; no raw error embedding user/estimate text reaches logs.
- Validation: log-output assertion test.

### SEC-009 (Must, brief, owasp F-AI-07/R-46)
`DEEPSEEK_API_KEY` must have a **documented rotation + revocation runbook**.
- AC: Runbook in `.ai/` + ops checklist; key read fresh each call (already true) enabling rotation without redeploy.
- Validation: doc + runbook review.

### SEC-010 (Must, brief, launch-gates LEG-03/LEG-06)
DeepSeek must be disclosed as a subprocessor with purpose/data/location in the privacy notice and subprocessor list.
- AC: Privacy notice + subprocessor list name DeepSeek; AI copy uses "assisted/reviewable," never "autonomous/agentic."
- Validation: doc review (truthfulness audit).

### SEC-011 (Must, repo, AGENTS.md)
No secrets or real customer content in tests/evidence.
- AC: Tests use synthetic fixtures only; no real workspace data.
- Validation: test-fixture scan.

## REL — Reliability / Provider Resilience

### REL-001 (Should, brief, roadmap R-010, owasp F-AI-03/R-41/R-42)
Provider calls must have **bounded resilience**: configurable timeout, retry-with-jitter on transient 5xx/network (capped), and a circuit breaker to avoid hammering a down provider.
- AC: Transient 5xx retried ≤N times with jitter; consecutive failures open a circuit (fail-closed); deterministic fallback preserved for package-builder.
- Validation: mocked-fetch resilience tests; circuit-open/close test.

### REL-002 (Should, owasp F-AI-03/R-41)
Provider model + timeout must be **env-configurable**, not hard-coded.
- AC: `DEEPSEEK_MODEL` already exists; add `DEEPSEEK_REQUEST_TIMEOUT_MS` env (documented).
- Validation: env override test.

### REL-003 (Should, repo)
Package-builder route must have a **rate limit** (Ask has one; package-builder does not).
- AC: Per-user+IP quota on `/api/ai/package-builder` draft/refine/apply.
- Validation: quota test.

### REL-004 (Should, brief)
Degraded/provider-down UX must be honest and recoverable.
- AC: Ask shows a clear "unavailable" state (not a hang); package-builder continues with deterministic draft labeled as such.
- Validation: DOM/E2E assertion.

## OPS — Operations / Disable Switches

### OPS-001 (Must, brief)
A single global disable switch (`ARCHESTIMATOR_AI_ENABLED`) plus granular package-builder flags must exist and be documented.
- AC: Flags documented in `.env.example`/`.dev.vars.example` and `.ai/10_state/decisions.md` (OWASP R-43).
- Validation: env-manifest test + decisions.md review.

### OPS-002 (Should, roadmap 10-ai-safety §3)
An **automated rollback/disabled-state drill** must prove AI can be turned off and that off-state holds (404 + no provider calls + key unset in prod env).
- AC: A scripted check (e.g., `cf:ai-disabled-check`) asserts the off-state against deployed env.
- Validation: drill runbook + script.

### OPS-003 (Should, repo)
No provider calls occur when AI is disabled.
- AC: With flag false, no outbound `fetch` to `api.deepseek.com` from any code path.
- Validation: dynamic-import gate test (handler not imported when off).

## DATA — Data / Auditability

### DATA-001 (Must, brief)
Every AI run, tool call, and data-access event must be auditable with workspace+actor attribution and category provenance.
- AC: `ai_action_runs`/`ai_tool_calls`/`ai_data_access_events` populated; `provider_send_categories` present.
- Validation: existing audit tests.

### DATA-002 (Should, repo)
AI audit tables must have a **verified retention rule** (declared in `0034` but rule rows unverified).
- AC: Confirm `retention-core.ts` rule rows for AI tables; confirm cron purges them.
- Validation: retention-core inspection + targeted purge test.

### DATA-003 (Could, OPEN-002, DEC-008)
Per-workspace AI opt-out. Deferred past launch (all-or-nothing acceptable for beta).

## DOC — Documentation

### DOC-001 (Must, L5)
All AI-constraining docs must be **re-anchored from Supabase to D1/Better Auth** (controls intact, evidence pointers stale).
- AC: `10-ai-safety-readiness.md`, `ai-assistant-and-package-builder-spec.md`, `deep/architecture-overview.md`, `02-security-tenancy-data-protection.md`, OWASP `12-ai-llm-security.md`, corpus §393 updated to cite D1 migrations `0006/0019/0027`, `authMode==="better-auth"`, `audit-d1-store.ts`.
- Validation: doc review + grep that no AI doc cites `authMode==='supabase'` as current.

### DOC-002 (Must, owasp R-43)
Record the DeepSeek-provider-choice and AI-audit/flag design decisions in `.ai/10_state/decisions.md` (currently zero AI entries).
- AC: New decision IDs in `decisions.md`.

## TEST — Testing

### TEST-001 (Must, brief, R-011)
**Cross-tenant leakage test suite** (launch-blocker) — two workspaces, swapped/foreign IDs, asserts no cross-tenant data in prompt payload or response.
- AC: Suite passes; covers read-context, read-tools, apply library-item references.

### TEST-002 (Must, brief)
**Prompt-injection / context-boundary test suite** — injection corpus, asserts neutralization + that provider payload is labeled untrusted + that output does not exfiltrate identity.
- AC: Suite passes.

### TEST-003 (Must, SEC-008)
**Adversarial shadow-path matrix** for both routes (nil/empty/invalid/oversized/Unicode/path-traversal-like/injection/unauthorized/cross-tenant/duplicate/concurrent/timeout/partial-success/misleading-success).

(See `12_TEST_AND_VALIDATION_STRATEGY.md` for the full matrices.)

## UX/A11Y (light — only floating button + launch copy)

### UX-001 (Should, roadmap UX-05)
Users must be able to distinguish Ask (read-only) from package-builder (draft+confirm).
- AC: In-app capability disclosure + first-time guidance; floating button has accessible name/role.
- Validation: DOM a11y assertions + (if browser proof justified) interaction test.

## Shadow-path coverage

Shadow-path matrices for each route are in `12_TEST_AND_VALIDATION_STRATEGY.md`. No requirement is considered complete until every applicable shadow-path cell is answered or marked N/A with reason.

## Credential-material taxonomy (per Multi-Agent Directive §7)

| Material | Raw/hash/encrypted/derived/public | Created by | Stored in | Read by | Client-visible? | URL/cookie/session? | Rotation/revocation | Proof |
|---|---|---|---|---|---|---|---|---|
| `DEEPSEEK_API_KEY` | raw secret | DeepSeek console (external) | Workers secret / `.dev.vars` (server-only) | `deepseek.ts:42`, `provider.ts:256` | No | No (server fetch Bearer) | Manual rotation; runbook SEC-009 | env-manifest test (name only) |
| `AI_PACKAGE_BUILDER_DRAFT_SIGNING_SECRET` | raw secret (HMAC key) | ops | Workers secret (server-only) | `draft-token.ts:21` | No | No | Manual rotation (rotating invalidates in-flight tokens — acceptable) | throws-if-unset in prod |
| Draft token | HMAC-signed JWT-like (derived) | `createPackageDraftToken` | client (transient, 30min) / never D1 | `verifyPackageDraftToken` | Yes (request body) | No | TTL expiry + re-issue | timing-safe verify + userId+workspaceId binding |
| Session cookie | encrypted (Better Auth) | Better Auth | browser | `getCurrentUserContext` | Yes | Yes (cookie) | revocation via D1 session delete | cookie-cache disabled → always DB-verified |
| AI audit hashes | sha256 hash | `hashAiAuditValue` | D1 `ai_*` tables | audit-d1-store | No | No | N/A (derived) | CHECK `sha256:` constraint |

Raw tokens (draft token bearer) are required for the apply flow and are bound to user+workspace at verification — a stored hash is **not** a substitute (the verifier recovers the raw token from the request and re-derives the comparison server-side). No AI path stores raw bearer material in D1.

**Extended depth taxonomy (boundary visibility, hash-as-key vs public-route-accepted, replay/copy-paste/expired/revoked/duplicate/cross-recipient):** see `08_SECURITY_PRIVACY_THREAT_MODEL.md` → "Credential material taxonomy — depth". That table covers, per material: create/store/read/rotate/log/destroy, every boundary that may see it (D1, server-only code, Server Action, Route Handler, browser URL, client props, DOM, network payload, logs, analytics, tests, provider console, external user), whether each hash is lookup-only or accepted by a public route (only the draft token is public-route-accepted, and it is bound to user+workspace), whether encrypted values decrypt only after authz, and the replay/copy-paste/expired/revoked/duplicate/cross-recipient handling for the draft-token apply flow. The depth taxonomy is consolidated in `08_*` to avoid duplication (anti-slop).

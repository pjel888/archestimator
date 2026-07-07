# 03 — Source and Codebase Audit

Evidence source: five parallel read-only `Explore` lanes (L1–L5) over `src/lib/ai/**`, `src/app/api/ai/**`, `src/lib/authz/**`, `src/lib/auth/**`, `src/lib/observability/**`, `src/lib/repositories/**`, `migrations/`, `wrangler.jsonc`, `package.json`, `.env*`. All entries are **EVIDENCE** unless tagged INFERENCE.

## A. AI entry points (2 routes)

| Route | Method | File | Gate | Behavior |
|---|---|---|---|---|
| `/api/ai/ask` | POST | `src/app/api/ai/ask/route.ts` (7 LOC) → `handler.ts` (238 LOC) | `isAiRoutesEnabled()` else 404 | Read-only Q&A. Auth → provider-backed check → 503 if no key → quota → read context → DeepSeek → return `{message, provider, model, usage}`. Audit started/completed/failed. |
| `/api/ai/package-builder` | POST | `src/app/api/ai/package-builder/route.ts` (7 LOC) → `handler.ts` (540 LOC) | `isAiRoutesEnabled()` else 404 | Modes: draft/refine/feedback/apply. Draft calls DeepSeek optionally (falls back to deterministic `buildPackageBuilderDraft`). Apply = signed-token + hash + authz + flags + idempotency. |

## B. AI lib surface (`src/lib/ai/`)

| File | LOC | Key symbols | Responsibility |
|---|---|---|---|
| `feature-flags.ts` | 23 | `isAiRoutesEnabled`, `isAskFlipUiEnabled`, `createAiDisabledResponse`, `readBooleanFeatureFlag` | Master + UI kill switches (default false). |
| `auth.ts` | 49 | `getAiRequestUserContext`, `isProviderBackedAiAuthMode`, `isProviderBackedAiUserContext`, `AiRequestUserContext` | Identity resolver. **Rejects local admin DB bypass** (`ai/auth.ts:28-30`). Requires `authMode==="better-auth"` + non-null `workspaceId` to be "provider-backed". |
| `deepseek.ts` | 78 | `askDeepSeek`, `hasDeepSeekApiKey`, types | DeepSeek transport for Ask. `temperature:0.2`, `max_tokens:900`, `stream:false`, **20s `AbortController` timeout**, no retry. |
| `read-context.ts` | 2222 | `readAiAskReadContext`, `classifyAskReadIntent`, many read helpers | **Primary data-into-prompt surface for Ask.** 9 intents via regex (no LLM). All queries `WHERE workspace_id = ?`. Bounded caps (`ASK_READ_CONTEXT_*_LIMIT`). `readBoundedString` truncates text. Parameterized SQL; `escapeD1LikeTerm` on LIKE. Anti-injection guidance injected into `guidance[]`. |
| `rate-limit.ts` | 79 | `checkAiAskQuota`, `AiAskQuotaResult` | D1 token-bucket via `security_rate_limit_events`. 10/min, 60/hour per `[workspaceId,userId,clientIp]`. **Ask only — package-builder has no rate limit.** |
| `audit.ts` | 310 | `recordAiAskAuditEvent`, `buildAiAskAuditEvent`, `buildAiPackageActionRun`, `buildAiPackageToolCall`, `buildAiPackageDataAccessEvent`, `recordAiPackageAuditRows`, `recordAiPackageApplyAuthorization`, `hashAiAuditValue` | Audit builders. **`redaction_status:"metadata_only"` hardcoded.** Raw message/route/UA/tool-args/results are SHA-256 hashed (`hashAiAuditValue`). `safeSummary` curated non-PII. `provider_send_categories` records what was sent. |
| `audit-d1-store.ts` | 396 | upsert/insert helpers | Writes to `ai_action_runs` (ON CONFLICT(run_id) DO UPDATE), `ai_tool_calls`, `ai_data_access_events` (ON CONFLICT(id) DO NOTHING). CHECK constraints enforce `sha256:` format. |
| `package-builder/provider.ts` | 299 | `createDeepSeekPackageBuilderProvider`, `parsePackageBuilderProviderSuggestion`, types | DeepSeek transport + prompt for package-builder. `temperature:0.1`, `max_tokens:1200`, 20s timeout. **Output validation `assertNoForbiddenIdentityKeys`** rejects `workspaceId/userId/actorUserId` in output. Forbidden-output instruction in prompt. |
| `package-builder/schemas.ts` | 1462 | `parsePackageBuilderDraft/Request/ApplyRequest`, `validatePackageBuilderDraft`, `buildPackageDraftHash`, `assertNoForbiddenIdentityKeys`, `assertAllowedKeys` | Strict allow-list parser. `assertNoForbiddenIdentityKeys` on **every inbound request**. Draft hash binds signed token. String length caps. Hardened. |
| `package-builder/draft-token.ts` | 115 | `createPackageDraftToken`, `verifyPackageDraftToken` | HMAC-SHA256 over `{version,draftId,draftHash,userId,workspaceId,provider,model,expiresAt}`. Secret `AI_PACKAGE_BUILDER_DRAFT_SIGNING_SECRET` (**throws if unset in prod**; dev fallback). 30-min TTL. Verify: timing-safe compare + expiry + draftId+hash match + **userId+workspaceId match session**. |
| `package-builder/apply.ts` | 2716 | `applyPackageBuilderDraft` (+ per-intent `apply*Draft`) | **Only AI write path.** Re-resolves human session (`requireCurrentUserContext`) and asserts identity+workspace equality before write. Per-branch authz (`isWorkspaceEditorInD1`, `canEditEstimateInD1`). `validateLinkedLibraryRows` re-verifies workspace ownership + active + version/`updated_at` match. Idempotency via `ai_package_apply_commands`. Writes `estimate_sheet_events` with `metadata.source:"ai-package-builder-apply"`. |
| `package-builder/draft.ts` | 2445 | `buildPackageBuilderDraft`, `refinePackageBuilderDraft` | **Deterministic, no LLM.** Regex parse + scoring + allowances. Stamps `untrustedDataNotice`. The provider-resilience fallback. |
| `package-builder/read-tools.ts` | 1637 | `readPackageBuilderTools` | 12 named read tools. Broader surface than Ask (includes `client_name`, `location`, `project_code`, `library_folders`). Caps: 12 projects, 80 nodes/rows, 24 historical estimates. Emits `ai_tool_calls` + `ai_data_access_events`. |
| `package-builder/memory.ts` | 381 | `readPackageBuilderMemoryPreferences`, `recordPackageBuilderMemorySignals`, etc. | Learned accept/reject signals → ranking hints only (not sent to provider). `source_label` plaintext ≤160. Gated `AI_PACKAGE_BUILDER_MEMORY_ENABLED` (default off). |
| `package-builder/feature-flags.ts` | 28 | `getPackageBuilderFeatureFlags` | 6 granular flags. |

## C. Data INTO prompts (the leakage attack surface)

1. **User message** (≤8000 chars Ask; package-builder message) — sent **verbatim** to DeepSeek. No PII/redaction scan. (Evidence: `ask/handler.ts:184`, `provider.ts:245`.)
2. **Browser route context** (projectName/estimateName/selectedNodeName + UUIDs from URL/DOM) — Ask sends as labeled "untrusted" JSON; package-builder uses UUIDs server-side only.
3. **Server-derived workspace data** (projects, estimates, cost library, templates, historical rows, activity, charts) — bounded slices, workspace-scoped, labeled "untrusted data." Main exfiltration-to-provider vector.
4. Memory labels — read into ranking only, **not** sent to provider.

## D. Data OUT of model (the injection/back-flow surface)

- **Ask:** model `content` returned **verbatim to client** — no output filtering, PII scan, or schema validation (`ask/handler.ts:220-225`). Identity-key blocklist is **not** applied to Ask output (only to package-builder output).
- **Package-builder:** `parsePackageBuilderProviderSuggestion` validates JSON + `assertNoForbiddenIdentityKeys` on output. Draft then re-validated by `validatePackageBuilderDraft` + signed-token hash before Apply.

## E. Redaction / filtering (current state)

- **NO PII detection, no moderation/profanity filter, no content classification** anywhere in the AI surface. (Evidence: grep `pii|sanitiz|moderat|profanity` — no functional hits.)
- Hash-only audit at the **logging** layer (raw prompts never reach D1 audit tables).
- Identity-key blocklist at **inbound** (`schemas.ts:356-369`) and package-builder **outbound** (`provider.ts:180-192`).
- Grounding/anti-injection **prompt text** (not enforceable redaction) in both system prompts.
- Structural caps (row counts, string lengths) limit volume, not sensitivity.
- `src/lib/observability/redact.ts` scrubs Bearer/JWT/share/invite tokens/hex≥32/emails and replaces prompt-injection phrases (`ignore previous instructions`, `print secrets`, `system prompt` → `[UNTRUSTED_INSTRUCTION]`) with `tainted_fields[]`. Used by the **structured logger only** — the one bare `console.error` in `package-builder/handler.ts:341` bypasses it.

## F. Tenant boundary model AI must respect

- Primitive: **workspace**. Three membership tiers: workspace_members (owner/admin/member/viewer), project_members, estimate_sheet_members (`src/lib/auth/roles.ts`).
- **No D1 RLS** — Supabase RLS is inert on the active substrate. All isolation is app code: `src/lib/authz/d1-access.ts` + `WHERE workspace_id = ?` discipline.
- **Platform admin** (`profiles.role IN ('ceo','admin')`) **bypasses every membership probe** in `d1-access.ts` (`if (isPlatformAdmin(user)) return true;`). INFERENCE: an AI path under a platform-admin session has no tenant boundary.
- Proxy (`src/proxy.ts`) **excludes `/api/*`** — AI routes self-enforce via `getAiRequestUserContext`.
- AI read tools use **transitive (chain) scoping** for `estimate_nodes WHERE id = ?` then re-validate against a workspace-scoped parent — safe today, fragile under refactor.
- `isWorkspaceMemberInD1` is mislabeled: it actually means "editor" (excludes `viewer`).

## G. Provider config & resilience

- `wrangler.jsonc`: Worker `archestimator-proof`, D1 `ARCH_DB`, R2, DO `COLLAB_ROOMS`, Queue `UPLOAD_JOBS_QUEUE`, Images, Email. **No AI binding, no KV.** Observability: logs 0.1, traces 0.05 sampling.
- `package.json`: **no AI SDK deps.** Scripts: `validate` = type-check+lint+lint:design-system+lint:design+test+test:dom; `cf:*`; `graph:*`.
- Provider: DeepSeek, raw `fetch`, Bearer from `DEEPSEEK_API_KEY` (read fresh each call), model `deepseek-v4-flash` (overridable `DEEPSEEK_MODEL`).
- **Resilience: 20s hard timeout per call, no retry, no jitter, no circuit breaker, no fallback provider.** Package-builder → deterministic draft fallback. Ask → 502.
- **Undocumented env vars (ops gap):** `DEEPSEEK_MODEL`, `AI_PACKAGE_BUILDER_DRAFT_SIGNING_SECRET` (**required in prod, throws if unset**), 6 `AI_PACKAGE_BUILDER_*_ENABLED` flags — none in `.env.example`/`.dev.vars.example`.

## H. D1 schema & auditability

- AI migrations: `0006` (audit+rate-limit tables), `0019` (memory), `0027` (apply idempotency), `0034` (retention classes incl. AI tables).
- AI tables all carry `workspace_id NOT NULL` + `actor_user_id NOT NULL`. Hash columns enforced `sha256:` by CHECK.
- Audit tables record `provider_send_categories` (strong provenance) but **not raw prompts** → post-hoc forensic reconstruction impossible from D1 alone.
- Retention cron (`worker.ts` `30 3 * * *`) covers AI tables per `0034`, but the concrete rule rows in `retention-core.ts` (beyond L120) were not fully verified (L4 INFERENCE).
- No per-workspace AI opt-out in D1 (all-or-nothing via env).

## I. Observability sinks where AI data could leak

1. Structured logger → `logs/dev.ndjson` (dev) / console (prod). Redacts identity/secrets **but not business content** (project/material/supplier/cost). If AI context is ever logged there, it persists.
2. One bare `console.error("AI package Apply failed", error)` at `package-builder/handler.ts:341` bypasses `redactForLog` — an error embedding user text/estimate content could reach logs unredacted. (Single concrete gap.)
3. `component_library_telemetry_events` has schema CHECK (`NOT LIKE '%token%'/'%signed%'/'%storage_path%'`) — AI does not write here.
4. Audit tables themselves = intended sink (hashes + summaries).
5. Cloudflare Workers logs/tail — no custom body-exporting sink in code.

## J. Downstream consumers / dependencies

- `revalidatePath` calls in `apply.ts` — cache invalidation after AI writes. (No WebSocket/Pusher broadcast in `apply.ts`; collaborators see changes on next navigation.)
- `estimate_sheet_events` is the domain audit chain AI writes participate in (retention 365d, version-control snapshots).
- `security_rate_limit_events` is shared with any future rate-limited surface.

## K. What is NOT in the codebase (anti-inventory)

- No OpenAI/Anthropic/AI-SDK/langchain/Workers-AI deps or call sites.
- No `prompt`/`llm`/`openai`/`generation` D1 tables.
- No RAG/vector/embedding storage.
- No stored-conversation persistence.
- No multi-step agent loop beyond one refine round.
- No AI key rotation utility or runbook.
- No AI circuit-breaker/retry utility.

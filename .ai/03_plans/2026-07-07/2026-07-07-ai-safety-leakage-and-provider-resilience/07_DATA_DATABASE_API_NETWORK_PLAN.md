# 07 — Data, Database, API, and Network Plan

## D1 schema (AI-relevant) — current and target

No schema changes are **required** to harden AI for launch. The existing AI tables already enforce hash-only audit and workspace attribution. Optional/future items are noted.

### Existing AI tables (migrations `0006`, `0019`, `0027`)

| Table | Purpose | Workspace binding | Sensitive cols |
|---|---|---|---|
| `ai_action_runs` | per-run record (started/completed/failed/blocked) | `workspace_id`, `actor_user_id` NOT NULL | `request_message_hash`, `route_context_hash`, `user_agent_hash` (all `sha256:` enforced) |
| `ai_tool_calls` | per-tool call | `workspace_id`, `actor_user_id` | `args_hash`, `result_hash` |
| `ai_data_access_events` | per-read audit | `workspace_id`, `actor_user_id` | `filter_hash` |
| `ai_package_apply_commands` | idempotency ledger | `workspace_id → workspaces ON DELETE CASCADE`, `UNIQUE(workspace_id, idempotency_key)` | `result_json`, `failure_json` (operational, not PII) |
| `ai_package_builder_memory_preferences` | accept/reject signals | `workspace_id → workspaces`, `actor_user_id` | `source_label` (≤160, plaintext) |
| `security_rate_limit_events` | quota counters | `key_hash` = sha256(workspace+user+IP) | hashed key |

### Database change blueprints

**DBB-001 (none required for launch hardening).** The audit/rate-limit/memory/apply schema already supports the target state. Documenting this explicitly so the implementation AI does not invent migrations.

**DBB-002 (optional, DEFERRED — DATA-003/OPEN-002):** per-workspace AI opt-out. Would add `workspace_account_settings.ai_enabled INTEGER NOT NULL DEFAULT 1` + a CHECK + repository helper. **Not in launch scope.** If pursued later: migration `0039_workspace_ai_opt_out.sql`, backfill `1`, app-authz read in AI handlers, test that opt-out workspace gets 404. Owner: Philip.

**DBB-003 (verify only — DATA-002):** retention rule rows. Confirm `retention-core.ts` includes rule entries for `ai_action_runs`, `ai_tool_calls`, `ai_data_access_events` (declared in `0034` class list). If missing, add rule rows (additive config, not a schema migration). Local proof: `bun run test` on the retention suite; provider proof: a cron-run `data_retention_events` row showing AI rows tombstoned (hosted; not a local claim).

### Index/query expectations

- AI reads are bounded (≤500 rows worst case for chart summary; ≤48 for most lists). Existing indexes `(workspace_id, …)` suffice. No new index required for launch.
- `ai_action_runs (workspace_id, actor_user_id, created_at DESC)` and `(status, created_at DESC)` exist.
- N+1: read-context/read-tools use single bounded queries per source; no N+1 observed.

## API contracts (the two AI routes)

### `POST /api/ai/ask`
- Auth: Better Auth session (`getAiRequestUserContext`), provider-backed, non-null workspaceId.
- Body: `{ message: string (≤8000), routeContext?: { projectName?, estimateName?, selectedNodeName?, projectId?, estimateId?, selectedNodeId?, activeTabId? } }`.
- 200: `{ message: string (scrubbed per SEC-004), provider: "deepseek", model, usage }`.
- 404 (disabled), 401 (no session), 403 (not provider-backed / no workspace / admin bypass), 429 (rate limited + `Retry-After`), 503 (no key), 502 (provider fail/timeout).
- Idempotency: none (read-only). Rate-limited.

### `POST /api/ai/package-builder`
- Auth: same + `isProviderBackedAiUserContext`.
- Body: `{ mode: "draft"|"refine"|"feedback"|"apply", …draft/refine/feedback/apply payloads, draftToken? (apply) }`.
- 200: `{ mode, draft, draftHash, draftToken?, provider, model, usage, productionWrite, serverValidation }`.
- Apply additionally: HMAC token verify + hash match + userId+workspaceId match + workspace-editor authz + idempotency.
- Statuses as above + 409 on idempotent replay detection (current behavior returns existing result; document it).

### Network behavior
- Outbound: `https://api.deepseek.com/chat/completions`, Bearer, JSON, `stream:false`. Timeout 20s (→ env `DEEPSEEK_REQUEST_TIMEOUT_MS` REL-002). Retry+jitter+breaker (REL-001).
- No SSRF risk: URL is hard-coded (not user-derived). Model/endpoint not user-controllable.
- No webhooks inbound.

## Error contracts

Map AI failures to the existing taxonomy (`src/lib/observability/app-error.ts`): `UpstreamError` (502, `UPSTREAM_ERROR`) for provider 5xx/timeout; `NetworkError` (503, `NETWORK_ERROR`) for DNS/connection/no-key. Today the handlers return plain `NextResponse.json`; target: route through `AppError` for consistent shape + redaction (INFOSEC-APP-003 already fixed the reflected-error case for apply; extend the discipline).

## Provider-readback / proof boundary

- Local: mocked-fetch tests (no real DeepSeek call).
- Provider-backed: a single optional, owner-approved, synthetic-key smoke against DeepSeek's API in a staging env is **not** required for launch and is explicitly **not** in scope (paid/external). The deterministic fallback proves the package-builder path without any provider call.

## Retention / deletion / audit

- AI audit rows: 365-day class (per `0034`); verify rule rows (DBB-003).
- `estimate_sheet_events` AI-attributed rows: 365-day class, version-control snapshots (AI apply writes old/new snapshots).
- DSAR (privacy_requests) must be able to delete/hash AI audit rows by `actor_user_id` — confirm the retention/privacy plumbing covers `ai_*` tables (DATA-002 adjacency).

## Concurrency / transaction boundaries

- Apply writes are inside the existing `estimate_sheet_events` atomicity pattern (correlation_id idempotency). D1 transactions are limited; the idempotency ledger is the safety net. No new transaction needs.
- Rate-limit counters: best-effort increment (acceptable; over-counting errs safe).

## Access-path matrix (Improve pass — required by PHASE 3 §6)

`Source | Chosen API/repository/binding | Runtime role | Authorization check | Latest schema/policy posture | Proof source | Fallback`. If a chosen path cannot read/write/call the source after current migrations/app-authz/policies, it is a P0 — none found here (all paths are live and workspace-scoped).

| Source | Chosen path | Runtime role | Authorization check | Schema/policy posture | Proof source | Fallback |
|---|---|---|---|---|---|---|
| `projects` / `estimates` / `estimate_nodes` / `estimate_row_items` | `src/lib/ai/read-context.ts`, `package-builder/read-tools.ts` (D1 `ARCH_DB`, parameterized, `WHERE workspace_id=?`) | Worker (server-only) | session `workspaceId` bound in SQL; transitive child reads re-validate parent against workspace | D1 migrations 0007/0015/0021/0025/0026; **no D1 RLS** — app-code isolation | `tests/vitest/ai-ask-read-context.test.ts`, `ai-package-builder-read-tools.test.ts` | return `available:false` / empty |
| `cost_library_items` + price options / `library_folders` | read-context + read-tools (D1, workspace-bound) | Worker | `workspace_id=?` | migration 0026 | read-tools test | empty |
| `estimate_templates` + nodes/rows | read-context + read-tools | Worker | `workspace_id=?` | migration 0024 | read-tools test | empty |
| `estimate_sheet_events` (write) | `package-builder/apply.ts` | Worker as ws editor | `canEditEstimateInD1` + token + idempotency | migration 0021/0025; `metadata.source='ai-package-builder-apply'` | `tests/vitest/ai-package-builder-apply.test.ts` | rollback via history + idempotency |
| `cost_library_items` (write via apply) | apply.ts `validateLinkedLibraryRows` | Worker as ws editor | re-verify workspace ownership + active + version/`updated_at` match | migration 0026 | apply test | reject stale/foreign |
| `ai_action_runs` / `ai_tool_calls` / `ai_data_access_events` (audit write) | `audit-d1-store.ts` | Worker | server-only; `workspace_id`+`actor_user_id` NOT NULL; hash CHECKs | migration 0006; **retention rule rows MISSING (DATA-002 defect)** | `tests/vitest/ai-audit-flow.test.ts`, `ai-audit-schema.test.ts` | best-effort (except Apply authz fail-closed) |
| `ai_package_apply_commands` (idempotency) | apply.ts | Worker as ws editor | `UNIQUE(workspace_id,idempotency_key)` | migration 0027 | apply test | idempotent replay |
| `ai_package_builder_memory_preferences` | memory.ts (default OFF) | Worker | `workspace_id→workspaces` | migration 0019; **not in retention union** | `tests/vitest/ai-package-builder-memory.test.ts` | disabled by flag |
| `security_rate_limit_events` | rate-limit.ts | Worker | hashed key `[ws,user,ip]` | migration 0006 | (Ask) route test | deny 429 |
| DeepSeek HTTP API | `deepseek.ts`, `provider.ts` (raw `fetch`, Bearer) | Worker (server-only) | server env key; hard-coded URL (no SSRF) | external; no repo schema | mocked-fetch tests; no real call in scope | Ask→502; PB→deterministic draft |
| Better Auth session (D1) | `getCurrentUserContext` | Worker | DB-verified session; cookie-cache disabled | Better Auth 1.6.22 on D1 | auth tests | 401 |

No P0 access-path gap: every AI read/write resolves through a live, workspace-scoped D1 path or a server-only external call. The one defect (AI retention rule rows) is operational (purge), not an access-path blockage.

## DATA-002 defect note (confirmed this pass)

`retention-core.ts:79-135` `DEFAULT_RETENTION_RULES` has rows for `account_security_events`, `account_audit_legacy_sha256`, `collaboration_audit_events`, `shared_link_events`, `estimate_sheet_events`, `privacy_requests_*` — but **none for `ai_action_runs`, `ai_tool_calls`, `ai_data_access_events`** despite those being in the `RetentionClassName` union (lines 32-34). Consequence: AI audit rows accumulate indefinitely. Resolution = work item T-P6-2 (add rule rows, additive config, no migration). Hosted proof of actual purge remains a hosted gap.

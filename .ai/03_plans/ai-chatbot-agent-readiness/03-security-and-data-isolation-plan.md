# 03 Security And Data Isolation Plan

**Date:** 2026-05-23
**Scope:** secure multi-user AI integration with Supabase
**No implementation in this file.**

## Security target

The AI agent must only use data belonging to the authenticated user's current workspace and explicitly selected project/estimate context. It must not leak or act on data from other users, workspaces, projects, or tenants.

The model itself is not the security boundary. The security boundary is:

1. authenticated server request context;
2. app-owned tool layer;
3. typed schemas;
4. Supabase RLS and grants;
5. workspace/project/estimate validation;
6. audit logs and tests.

## Supabase security principles

Use the caller's authenticated context for normal AI reads/writes.

Supabase documents that Edge Functions can create a client using the `Authorization` header so database queries execute with the user's RLS context. Supabase also documents that service/secret keys bypass RLS and must never be exposed to the frontend.

For Archestimator:

- AI server routes should use the same user-scoped server-client pattern as the app.
- If AI handlers live under `src/app/api/ai/*`, they must authenticate internally. `src/proxy.ts` currently bypasses `/api`, so API routes do not inherit `/workshop` route protection.
- AI code needs its own `requireAiUserContext` / `createAiUserScopedSupabaseClient` helper before implementation. It must always use the authenticated anon/session path, reject execution when `ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1`, and have a regression test proving AI tools cannot pass through the local admin DB bypass.
- `service_role` must not be used for normal AI reads/writes.
- If a rare admin path is needed, it must have a written justification, separate function, no model-selected target ids, and a dedicated audit record.
- Local dev auth/admin bypass is only for localhost inspection and protected smoke work. AI feature code should not be designed around it.

## Tenant model

Every AI-owned or AI-adjacent table must include:

- `workspace_id uuid not null`;
- `actor_user_id uuid not null`;
- `created_at timestamptz not null`;
- safe target columns such as `project_id`, `estimate_id`, `node_id`, `row_id` where applicable;
- correlation/run id for traceability.

Phase 1 AI tables should be minimal:

- `ai_action_runs`
- `ai_tool_calls`
- `ai_data_access_events`

Only add `ai_conversations` and `ai_messages` after the raw-vs-redacted storage and retention policy is approved. Keep `ai_eval_cases` or eval fixtures outside production tables unless there is a clear product need. Future `ai_document_chunks` / `ai_embeddings` belong to the later RAG phase.

All must have RLS enabled before exposure.

## RLS policy requirements

For AI tables:

- `SELECT` should default to `actor_user_id = auth.uid()` for full conversation/message content.
- Workspace admins may see safe summaries/action metadata where product policy requires review or audit.
- Broad workspace-member access to raw prompts/messages is not the default; if it is later approved, store redacted/safe summaries and document the product decision.
- `INSERT` only when `actor_user_id = auth.uid()` and `public.is_workspace_member(workspace_id)`.
- `UPDATE` only for controlled status transitions, if needed.
- No client-side `DELETE` in MVP.
- Include both `USING` and `WITH CHECK` on write policies.

Message/log storage defaults:

- Raw user prompts are not stored by default in Phase 1.
- Hidden/system/developer prompts are never stored in database tables.
- Tool args/results are redacted before logging; log hashes, target ids, row counts, source table names, and safe summaries instead.
- If raw conversation retention is later approved, raw rows must be actor-only, have an expiry/retention policy, and exclude sensitive provider/system prompts.

External provider-send defaults:

- Local log minimization does not by itself solve provider-side processing risk. Every model call still sends selected content to an external AI provider unless a local model is used.
- Phase 1 may send minimized, route-scoped context to the approved OpenAI provider only after the implementation plan names the exact fields allowed into prompts/tool results.
- Non-OpenAI providers, including hosted DeepSeek, are blocked from real tenant data until a separate vendor approval gate passes.
- DeepSeek evals, if any, must use synthetic or redacted fixtures only until privacy/compliance approval is documented.
- The provider-send policy must define "never send" fields before model calls: secrets, raw uploaded specs, client PII, exact addresses, supplier private terms, legal proposal text, and sensitive project notes are excluded by default.
- If DeepSeek is ever approved, the app must pass only a server-derived non-PII tenant/user-scoped provider `user_id` where supported; the model or browser must never supply or override it.

For AI RPCs:

- Prefer `SECURITY INVOKER`.
- Use explicit argument names and UUID validation.
- If `SECURITY DEFINER` is unavoidable, put helper functions in a private/unexposed schema, set a safe `search_path`, revoke public execute, and grant only the required role/function.

Supabase migration checklist:

- no anon grants for AI tables;
- explicit authenticated grants only where needed;
- explicit revokes for public AI tables/functions not intended for Data API access;
- private schema for helper functions that should not be exposed;
- `SECURITY DEFINER` only with private schema, fixed `search_path`, explicit execute grants, and tests for overbroad access;
- RLS and grant tests must fail closed when grants are missing or too broad.

## Tool data access rules

Every AI tool must:

- derive `workspace_id` from the authenticated user, never from model arguments;
- validate `project_id` belongs to that workspace;
- validate `estimate_id` belongs to that project;
- validate `node_id` belongs to that estimate;
- validate row writes target Area Nodes only;
- preserve the active `group | area` estimate-tree invariant;
- enforce server-side limits on rows/nodes generated in one request;
- return minimal data needed for the next model step.

Every AI tool needs a manifest before implementation:

- mode: Ask, Draft, or Apply;
- allowed user-provided args;
- server-derived fields;
- workspace/project/estimate owner loader;
- maximum returned rows/results;
- returned fields allowed into model context;
- data-access audit event shape;
- prompt-injection handling notes;
- scope: current route only, current project only, or explicit opt-in for prior projects.

For MVP, `search_prior_estimates` is not registered. Prior-project search is future scope and requires explicit user opt-in because same-workspace data can still cross client/project boundaries.

The model may propose:

- natural-language brief;
- candidate room/area structure;
- candidate row items;
- quantities;
- budget allocation;
- assumptions and uncertainty notes.

The model may not decide:

- whether a workspace id is valid;
- whether it can see another workspace;
- whether a write is authorized;
- whether destructive operations are allowed;
- whether to bypass confirmation.

## Retrieval and vector/RAG security

Do not add vector search until the deterministic app data tools are stable.

If RAG is later added:

- embeddings inherit the same `workspace_id`, `project_id`, and document permissions as their source records;
- vector matching functions must filter by workspace before returning chunks;
- RLS must be enabled on chunk/vector tables;
- similarity RPCs must not return global nearest neighbors across tenants;
- tests must include two users with similar documents in different workspaces and prove no cross-return.

Supabase's AI/vector docs support pgvector and semantic search, but security must be designed into the table/RPC boundary.

## Prompt and output data handling

Do not log full prompts or raw retrieved chunks by default.

Audit logs should store:

- run id;
- tool name;
- actor user id;
- workspace id;
- target ids;
- high-level action type;
- status;
- token/model metadata;
- validation errors;
- safe summaries.

For provider calls, audit metadata should also include provider, model, base URL class, provider response id, redaction status, field categories sent, cache-hit/miss token metadata where available, provider `user_id` value class, provider policy version, and consent/privacy-notice version.

Ask and Draft tools must also create data-access audit events, not only Apply runs. Record tool name, source tables, filter hash, row count, target ids, blocked attempts, redaction status, and safe summary.

Avoid storing:

- full client notes;
- full proposal text;
- full retrieved document chunks;
- hidden prompts;
- secrets;
- supplier/customer sensitive details unless there is a product reason and RLS policy.

## Existing app-specific risks to test

- CEO/platform-wide access policies are real database policies. AI tests need both ordinary workspace users and CEO/admin contexts so broad admin visibility is not accidentally treated as normal user behavior.
- Project/dashboard fallback sample data still exists in some route paths. AI tools must distinguish persisted Supabase records from sample UI fallback data.
- Component taxonomy can be shared/global, but suppliers, folders, item rows, templates, project data, and estimates are workspace-bound.
- Browser-side repositories rely on RLS; write-capable AI paths should use server command handlers with explicit validation and audit logs.
- Supabase Realtime is not active. AI responses should not promise cross-device live freshness beyond server actions/cache refresh until realtime becomes explicit scope.

## Confirmation policy

No confirmation needed:

- read-only answer about visible current context;
- library search;
- template search;
- draft-only patch proposal.

Confirmation required:

- create project;
- create estimate;
- create estimate tree;
- insert estimate rows;
- update quantities/costs;
- insert template;
- generate export/proposal snapshots;
- any action that changes persisted data.

First Apply slice limit:

- Only project + estimate shell creation is registerable in the first Apply implementation.
- Template insertion, tree creation, row insertion, and cost/quantity updates are confirmation-required in principle, but remain future Phase 5+ tools and must not be registered in the MVP tool registry.

Not allowed in MVP:

- delete project;
- delete estimate;
- delete rows/nodes;
- move large existing tree sections;
- mass cost updates;
- workspace membership changes;
- admin/system operations.

## Initial limits

Use conservative hard limits before telemetry exists:

- max input message: 8,000 characters;
- max 12 messages per minute per user;
- max 30 messages per hour per workspace;
- max 8 tool calls per run;
- max 25 rows returned per search tool;
- max Draft patch size: 30 nodes and 100 rows;
- max Phase 4 Apply scope: one project plus one estimate shell;
- reject over-limit requests explicitly instead of silently truncating or partially applying.

## Security readiness checklist

- [ ] AI server route validates identity with trusted server auth, not client-provided user metadata.
- [ ] AI user-scoped Supabase helper rejects admin DB bypass and has a regression test with `ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1`.
- [ ] All AI tables have `workspace_id` and RLS before exposure.
- [ ] AI migrations include explicit grants/revokes and no anon grants.
- [ ] No AI tool uses `service_role` for normal user reads/writes.
- [ ] Tool schemas do not accept `workspace_id`.
- [ ] Every tool validates target ids against workspace/project/estimate boundaries.
- [ ] Every registered tool has a manifest with scope, max results, returned fields, and audit event shape.
- [ ] All write tools are draft-first and confirmation-gated.
- [ ] AI data-access audit events exist before Ask mode ships.
- [ ] Two-user/two-workspace leakage tests cover reads, writes, RPCs, and retrieval.
- [ ] Prompt-injection tests cover malicious project notes, component descriptions, and uploaded docs.
- [ ] Rate limits and per-run mutation limits exist.

## Source links

- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase secure data: https://supabase.com/docs/guides/database/secure-data
- Supabase API security and grants: https://supabase.com/docs/guides/api/securing-your-api
- Supabase Edge Function auth context: https://supabase.com/docs/guides/functions/auth
- Supabase AI/vector overview: https://supabase.com/docs/guides/ai
- Supabase semantic search: https://supabase.com/docs/guides/ai/semantic-search

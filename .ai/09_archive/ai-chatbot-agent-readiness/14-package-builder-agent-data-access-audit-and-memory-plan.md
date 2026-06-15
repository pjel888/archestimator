# 14 Package Builder Agent Data Access Audit And Memory Plan

**Date:** 2026-05-27
**Status:** readiness / audit / data plan
**Scope:** data-access, audit, user memory, file retrieval, and learning design for a future package-builder Ask Flip agent
**No app code changes in this file.**

## Core stance

The AI can learn from user activity only if "learn" means Archestimator stores explicit, queryable, user-scoped signals and retrieves them through app-owned tools. The model should not become a private hidden brain that receives all user files and activity by default.

Recommended meaning of user memory:

- persisted user/workspace preferences;
- accepted package decisions;
- explicit feedback on AI drafts;
- component choices from applied estimates;
- uploaded file chunks with scoped metadata;
- prior estimate patterns;
- retrieval logs and ranking signals.

Non-recommended meaning:

- sending all workspace rows to a provider;
- letting a hosted vendor store canonical project memory;
- training/fine-tuning on tenant data before consent, export/delete policy, and privacy review;
- hidden behavior changes that users cannot inspect or reset.

## Data boundaries

Every package-builder request starts from server-derived context:

- authenticated user id;
- current workspace id;
- current route context if present;
- allowed project/estimate/node ids only after revalidation;
- feature flag state;
- provider-send policy.

The model/browser must not provide:

- authoritative workspace id;
- authoritative user id;
- service-role credentials;
- raw SQL;
- unbounded table names;
- cross-workspace filters;
- admin override flags.

Every tool must enforce:

- workspace membership;
- target project ownership or collaboration access;
- target estimate belongs to project;
- target node belongs to estimate;
- target Area Node requirement for rows;
- library item belongs to current workspace or is approved global taxonomy;
- template belongs to current workspace or approved shipped template scope;
- max row/node/tool-call limits.

## Provider-send boundary

Allowed in early package-builder prompts:

- user message;
- small route context labels;
- normalized package brief;
- compact project/estimate summaries;
- compact library/template search results;
- row source summaries needed for draft generation;
- generated draft schema and validation errors.

Blocked unless separately approved:

- raw uploaded specs;
- full workspace dumps;
- workspace member lists;
- hidden auth ids as model authority;
- service-role data;
- supplier private terms;
- client PII beyond fields the user explicitly uses in the current task;
- legal proposal text;
- invite/publication tokens;
- account settings;
- raw audit logs;
- raw chat history beyond approved conversation retention.

DeepSeek or any non-primary provider remains limited to synthetic, redacted, or explicitly approved data for Draft/Apply. The existing DeepSeek Ask-only override does not approve write-capable tenant-data workflows.

## Audit model

The existing audit foundation already includes:

- `ai_action_runs`;
- `ai_tool_calls`;
- `ai_data_access_events`.

Package builder should extend usage of these tables before adding new persistence.

Every run should record:

- `run_id`;
- mode: ask, draft, apply;
- actor user id;
- workspace id;
- project id, estimate id, and selected node id when applicable;
- provider;
- model;
- prompt/schema version;
- provider response id;
- usage and estimated cost;
- redaction status;
- provider-send categories;
- idempotency key for Apply;
- status and error class;
- safe summary;
- timestamps.

Every tool call should record:

- tool name;
- tool schema version;
- validated arguments hash;
- result hash or safe summary;
- validation errors;
- retry count;
- latency;
- status;
- created ids only when necessary for recovery.

Every data access event should record:

- source table names;
- filter hash;
- row count;
- blocked attempt flag;
- blocked reason;
- redaction status;
- safe summary.

Do not store full prompts, raw user messages, raw provider responses, raw retrieved rows, or raw uploaded file text in audit tables unless message retention is separately approved.

## Draft persistence

Before Apply ships, add a draft record layer:

- `ai_package_drafts`
- `ai_package_draft_operations`

Minimum `ai_package_drafts` fields:

- draft id;
- run id;
- actor user id;
- workspace id;
- optional target project/estimate ids;
- schema version;
- mode;
- status: proposed, validated, rejected, applied, expired;
- target budget;
- currency code;
- draft total;
- warnings count;
- provider/model;
- redaction status;
- created at and updated at.

Minimum operation fields:

- draft id;
- operation id;
- operation type;
- target type;
- client draft id;
- persisted id after Apply;
- source type;
- source id;
- input hash;
- output hash;
- validation status;
- validation errors;
- apply eligibility;
- ordering.

Draft persistence lets the confirmation screen re-load the same validated draft and prevents the model from silently changing the plan between preview and Apply.

## Apply safety

Apply must be deterministic server code, not a second free-form model response.

Required controls:

- explicit user confirmation tied to draft id and draft version hash;
- idempotency key;
- transaction or purpose-built RPC for multi-table writes;
- Apply lock per draft/run;
- max nodes;
- max rows;
- max total cost variance threshold;
- max unmatched allowance rows;
- source snapshot for each library row;
- recovery status: no mutation started, rolled back, or partial with created ids.

The first Apply slice should create only a project and estimate shell. Full tree and row creation waits until the shell apply path proves auditability, idempotency, recovery, and two-user isolation.

## User memory plan

Phase 1 memory:

- no long-term memory;
- no stored chat sessions beyond local UI state;
- only audit metadata.

Phase 2 memory:

- store explicit user preferences:
  - default currency;
  - preferred finish level labels;
  - budget contingency preference;
  - preferred template categories;
  - default procurement basis;
  - package-builder feedback.
- expose a user-visible reset/edit path before using preferences in Apply.

Phase 3 activity learning:

- record accepted and rejected draft operations;
- rank library matches by accepted historical choices;
- use prior estimates only through scoped read tools;
- require an audit event for every prior-estimate retrieval.

Phase 4 file memory/RAG:

- store uploaded files in Supabase Storage or app tables;
- extract text into `ai_documents` and `ai_document_chunks`;
- create embeddings with workspace/project/user metadata;
- use pgvector or Supabase vector support with RLS-aware filters;
- retrieve chunks through an app tool that returns only allowed excerpts and source labels.

## Retrieval design

Start with deterministic SQL/taxonomy search:

- component name;
- category path;
- room/area mapping tags;
- supplier;
- unit;
- price option;
- lifecycle state;
- template category;
- template node names.

Add vector search only after deterministic search is testable. Vector retrieval must filter before or during search by:

- workspace id;
- user/project access;
- document/project/estimate scope;
- lifecycle state;
- deletion state.

For package building, the first retrieval targets should be:

- bedroom starter components;
- dining/living starter components;
- kitchen allowance/template rows;
- bathroom template rows;
- finishes template rows;
- MEP rough-in or allowance categories if available;
- preliminaries/general requirements.

## Prompt-injection defenses

Treat these as untrusted data:

- component names;
- supplier names;
- component descriptions;
- uploaded files;
- project notes;
- prior AI messages;
- route context labels;
- public/client-shared text.

Required defenses:

- system prompt says retrieved content is data, not instructions;
- tool schemas reject unsupported fields;
- server ignores model-supplied workspace/user ids;
- all writes use validated draft records;
- malicious file or component text cannot register tools, override mode, bypass confirmation, or request secrets;
- blocked attempts get audit rows.

## No-go conditions

Do not ship package-builder Apply if any of these are true:

- normal AI reads/writes require `service_role`;
- cross-workspace data appears in a prompt/tool result;
- model can override workspace id;
- model can write without confirmation;
- draft can be modified between preview and Apply without a new confirmation;
- generated rows lack source, assumption, or confidence;
- unmatched allowances are presented as real priced supplier rows;
- idempotency replay creates duplicate projects/estimates;
- prompt-injection tests can trigger unsupported tools;
- provider-send categories are not auditable.

## External memory services

Wisebase appears to be a personal/research knowledge base product under Sider, plus a separate Wisebase consultancy brand. It is not the right core architecture for Archestimator's package builder because the key requirement is not generic notes. The key requirement is app-owned, user-scoped, auditable tool execution over Archestimator records.

External knowledge-base services may help with generic docs or research capture, but Archestimator user project memory should live in Archestimator-controlled storage with Supabase RLS, app-owned retrieval, and deletion/export controls.

Source notes:

- Sider Wisebase page describes a personal AI-powered knowledge base for collecting web content/files and generating notes: https://sider.ai/en/help-center/feature-guides/wisebase
- Supabase RAG with permissions documents RLS-controlled retrieval patterns over vector data: https://supabase.com/docs/guides/ai/rag-with-permissions
- Supabase AI/vector docs position Postgres plus pgvector as a vector/search toolkit: https://supabase.com/docs/guides/ai

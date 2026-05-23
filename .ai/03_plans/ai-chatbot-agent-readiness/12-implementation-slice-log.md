# 12 Implementation Slice Log

**Date:** 2026-05-23
**Scope:** first implementation slice after readiness planning

## User override

The user approved implementation and explicitly requested DeepSeek for now because credits/API key are available in `.env.local`.

This overrides the fourth-pass default recommendation only for the first **Ask-only** implementation slice. The broader vendor-risk gate still applies before DeepSeek is used for write-capable Draft/Apply tools or richer tenant-data retrieval.

## Implemented Ask-only slice

- Floating lower-right Estimate Copilot launcher on the protected estimate workspace route.
- Ask-only chat panel.
- Server-side `/api/ai/ask` route.
- DeepSeek Chat Completions call via server-side `fetch`.
- `DEEPSEEK_API_KEY` required server-side; optional `DEEPSEEK_MODEL`, defaulting to `deepseek-v4-flash`.
- AI auth helper that rejects local admin DB bypass and does not expose the provider key to the browser.
- Focused route/UI/auth guard tests.

## Implemented Phase 1 audit foundation

- Migration `20260523144932_ai_audit_foundation.sql` adds metadata-only AI audit tables:
  - `ai_action_runs`;
  - `ai_tool_calls`;
  - `ai_data_access_events`.
- AI audit tables include `workspace_id`, `actor_user_id`, run correlation, mode/status/provider/model metadata, hashed request/context fields, redaction status, and safe summaries only.
- RLS is enabled on all AI audit tables before exposure.
- Direct anon/authenticated table grants are revoked so browser clients cannot forge audit rows; server-side audit persistence uses the server-only Supabase service-role key only for metadata audit writes.
- `src/lib/ai/audit.ts` builds metadata-only Ask audit rows and hashes message, route context, and user-agent values before persistence.
- `/api/ai/ask` now records best-effort completed/failed Ask audit metadata after provider calls while preserving the existing Ask-only response contract.
- `src/lib/ai/auth.ts` now derives the authenticated user's default workspace id for audit ownership, rejects Supabase users without a workspace before provider calls, and still rejects admin DB bypass before any AI route work.
- Focused audit schema/flow tests were added.

## Still not implemented

- Draft patch mode.
- Apply mode.
- Stored conversations.
- Component-library retrieval beyond user-provided visible route hints.
- Project/estimate create/edit tools.
- Vector/RAG.

## Safety boundary

The first live DeepSeek integration is limited to Ask-only. It must not create, edit, delete, apply, save, or mutate Archestimator records.

## Provider-send override

Allowed fields for this DeepSeek Ask-only override:

- the user's current chat message;
- bounded project display name;
- bounded estimate display name;
- bounded selected estimate node display name.

Not allowed in this slice:

- raw uploaded specs/documents;
- client PII beyond the visible project display name;
- supplier private terms;
- service-role data;
- hidden prompts;
- workspace/member lists;
- raw component-library dumps;
- any server-derived authorization ids as model authority.

Browser-provided route context is serialized as untrusted JSON and must never become authorization input.

## Latest verification

- `bun run test:dom -- tests/vitest/ai-audit-schema.test.ts tests/vitest/ai-audit-flow.test.ts tests/vitest/ai-ask-route.test.ts tests/vitest/ai-auth-guard.test.ts tests/vitest/estimate-copilot-floating-button.test.tsx` passed: 5 files, 19 tests.
- `bun run type-check` passed.
- Changed-file ESLint passed for AI route/auth/audit and AI test files.
- `bun run lint:font-size` passed.
- `git diff --check` passed.

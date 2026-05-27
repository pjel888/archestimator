# 12 Implementation Slice Log

**Date:** 2026-05-23
**Scope:** first implementation slice after readiness planning

## User override

The user approved implementation and explicitly requested DeepSeek for now because credits/API key are available in `.env.local`.

This overrides the fourth-pass default recommendation only for the first **Ask-only** implementation slice. The broader vendor-risk gate still applies before DeepSeek is used for write-capable Draft/Apply tools or richer tenant-data retrieval.

## Implemented Ask-only slice

- Ask Flip footer utility mounted through the protected workshop shell.
- Two-column Ask-only chat panel with local/in-memory chat sessions on the left and the active Ask chat on the right.
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
- Stored conversations or Supabase-backed chat sessions.
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

- 2026-05-26 Ask Flip footer update: `bun run test:dom tests/vitest/estimate-copilot-floating-button.test.tsx tests/vitest/ai-ask-route.test.ts tests/vitest/workshop-reset.test.tsx tests/vitest/estimate-sheet-cost-inputs.test.tsx tests/vitest/project-dashboard-ui.test.ts` passed: 5 files, 59 tests.
- 2026-05-26 Ask Flip footer update: `bun test tests/unit/reset-baseline.test.ts` passed: 2 tests.
- 2026-05-26 Ask Flip footer update: `bun run type-check` passed.
- 2026-05-26 Ask Flip footer update: `bun run build` passed.
- 2026-05-26 Ask Flip footer update: changed-file ESLint passed for the Ask Flip component, workshop shell, app providers, Ask route, and focused tests.
- `bun run lint:font-size` passed.
- Browser smoke on `/workshop/projects` verified one `Open Ask Flip` footer action, one `Ask Flip` region, one `Ask Flip chat sessions` complementary region, no legacy `Open Estimate Copilot` action, no legacy fixed root, and no browser console/page errors at `1440x900` and `390x844`. Screenshots: `.omx/artifacts/ask-flip-footer-smoke-20260526.png` and `.omx/artifacts/ask-flip-footer-mobile-smoke-20260526.png`.
- `git diff --check` passed.

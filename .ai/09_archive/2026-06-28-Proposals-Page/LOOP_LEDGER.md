# Loop Ledger - 2026-06-28 Proposals Page

Append-only coordination log for the planning package.

## Master goal

Ship a planning-ready specification for `/workshop/proposals`: the signed-in recipient inbox for Archestimator. It lists every publication sent to the signed-in user's verified email across all workspaces and opens active proposals through the existing `/share/[token]` surface without exposing credential material.

## Plan profile

`exhaustive` - touches Supabase/RLS/RPC, auth, publication/shared-link security, cross-workspace reads, Server Actions, route UI, and browser/provider proof gates.

## Status

`IMPLEMENTATION-READY` for planning handoff. No source/runtime/provider proof is claimed. Implementation completion remains gated by SQL, action, DOM, browser, static leak, and build/type evidence.

## Lane log

| Lane | Goal | Status | Notes |
|---|---|---|---|
| Lead | Repair and integrate the plan pack | COMPLETE | Patched planning docs only; no app/test/migration/provider edits |
| Source audit | Reconfirm token/session/schema/sidebar/client-server patterns | COMPLETE | Found decisive token taxonomy and enum evidence |
| Security/data council | Challenge RPC/session/security model | COMPLETE | P0 token/hash/session issues resolved |
| Feasibility council | Challenge Next.js/client/server implementation path | COMPLETE | Added explicit `"use server"` loader and fixed invalid status |
| Product/UX/design council | Resolve open owner decisions and state coverage | COMPLETE | Same-tab Review, status copy, shortcuts, disabled expired/revoked rows |
| Test/QA council | Challenge validation adequacy | COMPLETE | Provider SQL and browser smoke are mandatory implementation gates |
| Final verification | Audit repaired docs for stale contradictions | COMPLETE | Native verifier `Hypatia` returned PASS; no P0/P1 planning contradiction found |

## Conflicts encountered

The original draft conflicted with current source reality by treating `project_publications.token_hash` as share URL material and by trying to use `recipient_token_hash` for session establishment. Current source controls; the plan now uses `encrypted_token` server-side recovery after authorization.

## Iteration count

One major council-driven repair pass after the initial package. Further edits should be evidence-driven only: fix stale contradictions, do not expand scope.

## Implementation continuation - 2026-06-29

Lead lane: Codex solo implementation with bounded read-only subagent audits for repo/test patterns.

Execution target: ship the recipient proposals inbox end to end: Supabase RPCs, server-only repository, route and client UI, sidebar entry, open-proposal Server Action, focused tests, type/lint/build/provider/browser evidence where available.

Initial evidence:
- Read plan package and execution prompts before source edits.
- Read current Next.js local docs for App Router pages, Server/Client Components, Server Functions, forms, cookies, and redirect behavior.
- Read existing publication, sidebar, Supabase, route-shell, and test harness patterns.
- Read-only subagents confirmed no existing recipient-proposals implementation and identified local test patterns.

Stop condition: pass the focused repository/action/route/client/sidebar tests plus type/lint/build/static leak checks, then complete provider and browser proof if the local Supabase/Vercel/browser credentials and services are available in this environment. Any unavailable proof must be reported as an explicit validation gap.

## Implementation proof - 2026-06-29

Status: implemented and provider/browser-proven locally for the linked Archestimator Supabase project.

Delivered surface:
- `/workshop/proposals` recipient inbox route, loading state, TanStack Query client refresh, empty/error/list states, and sidebar entry.
- Server-only RPC repository plus Server Action bridge for recipient proposal loading.
- `openRecipientProposalAction` authorizes the signed-in email through `authorize_recipient_publication_for_current_user`, recovers the existing publication token server-side only, sets the shared-link session cookies, and redirects to `/share/[token]`.
- Supabase migration `20260629000000_recipient_proposals_rpc.sql` adds the lower-email recipient index plus `list_recipient_publications_for_current_user` and `authorize_recipient_publication_for_current_user`.

Evidence:
- Focused Vitest: `bun run test:dom tests/vitest/recipient-proposals-repository.test.ts tests/vitest/recipient-proposals-route-gate.test.ts tests/vitest/recipient-proposals-page.test.tsx tests/vitest/recipient-proposals-action.test.ts tests/vitest/main-sidebar-proposals-item.test.tsx` passed (`5` files / `18` tests).
- `bun run type-check` passed.
- `bun run lint` passed with existing unrelated warnings only.
- `bun run build` passed and included `ƒ /workshop/proposals`.
- `git diff --check` passed.
- Static credential leak checks found no token/hash/service-role terms in the proposals route/client/repository/migration surface; action tests contain credential terms only as source-contract assertions.
- Linked Supabase provider proof on project `ebxxqidacheyapmmzavr` confirmed both RPCs are `security definer`, stable, `search_path=public`, executable by authenticated/postgres/service_role, and that `shared_link_recipients_lower_email_idx` exists.
- Browser proof passed via `scripts/prove-recipient-proposals-browser.mjs`; artifact: `.omx/artifacts/recipient-proposals-page/recipient-proposals-browser-2026-06-28T183402Z/recipient-proposals-browser-proof.json`.

Browser proof note: the local Next dev client transition reached `/share/[token]` and set both shared-link cookies, but initially observed the share loading shell. The proof recorded this and then reloaded the same `/share/[token]` URL with the action-created cookies; the share page rendered `main[aria-label="Proposal review"]`, the expected project content, no-estimates state, and no browser/page errors. Tokens and email-like strings are redacted in the retained artifact.

Validation gaps and unrelated reds:
- Supabase CLI/local reset/type generation remained unavailable in this environment (`supabase`/`npx supabase`/`bunx supabase` exited 137; local Postgres was not responding). RPC types were patched manually and linked-provider SQL proof was collected through the Supabase connector.
- `bun run lint:design-system` remains red only on unrelated pre-existing Add Component/estimate-sheet design-system findings; no Proposals files remain in that output.

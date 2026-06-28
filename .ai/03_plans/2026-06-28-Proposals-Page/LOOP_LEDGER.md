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

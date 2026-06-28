# 19 - Research, Review, and QA Evidence

## Source evidence inspected

| Question | Evidence | Planning decision |
|---|---|---|
| What is the repo's Security Definer RPC pattern? | Recent RPC migrations including project activity collaboration audit and sidebar favorites | New functions use `security definer`, `set search_path = public`, explicit grants, and drop-first reapply shape |
| How are publication tokens stored? | `project_publications` migration and `src/lib/publication/actions.ts` | Raw token is generated at publish time; `token_hash` is an HMAC lookup key; `encrypted_token` is the server recovery source |
| How are share sessions created? | `src/lib/publication/security.ts`, `/api/share/[token]/session/route.ts`, `/share/[token]/page.tsx` | Existing cookie helper needs raw publication token, publication id, credential version, and recipient id |
| Can recipients directly read their rows? | `shared_link_recipients` RLS and column grants | No; list and authorization must use scoped Security Definer RPCs |
| What publication statuses exist? | `project_publication_status` enum migration | Only `published`, `expired`, `revoked`; no fourth branch |
| How should client refetch call server data? | Existing TanStack Query + `"use server"` action patterns in Library/Templates pages | Add explicit `src/lib/recipient-proposals/actions.ts` loader |
| Where does nav insertion happen? | `MainSidebar.tsx` `sidebarNavItems` array | Insert Proposals above Publisher; shortcuts shift by owner-delegated decision |

## Council evidence

| Lane | Reviewer role | Key output |
|---|---|---|
| Security/data | Native security lens | Original token bridge was unsafe and nonfunctional; replaced with server-only decrypt/cookie bridge |
| Feasibility/Next.js | Native feasibility reviewer | Original enum and client refetch gaps repaired |
| Product/UX/design | Native design reviewer | Open decisions resolved; state matrix and browser proof requirements strengthened |
| Test/QA | Native test engineer | Mocked-only proof rejected; provider SQL, action, DOM, leak, and browser gates added |

Full integration record: `20_OWNER_DELEGATED_DECISIONS_AND_COUNCIL_REVIEW.md`.

## Repaired findings

| Finding | Original risk | Repair |
|---|---|---|
| Legacy link-token field / `token_hash` treated as link material | Dead `/share/[token]` URLs and hash exposure | Removed from DTO/action contract; raw token recovered only server-side |
| Action tried to bridge through `recipient_token_hash` | Existing session helper cannot use it; credential exposure risk | Authorization RPC returns only ids; action sets session with raw publication token |
| Revoked/expired behavior inconsistent | User could see disabled row but action might open it | UI disables row; action rechecks and returns unavailable |
| Browser proof was not a hard gate | Same-tab redirect/cookie behavior is browser-only | Browser smoke is mandatory for implementation completion |
| Client refetch boundary implicit | Implementer could invent a new HTTP route or unsafe client call | Added explicit `"use server"` loader |

## Validation evidence for this planning task

Planned and run during planning repair:

- Direct source reads of relevant migrations, publication actions/security, share session route, workshop pages, sidebar, and client/server data patterns.
- Independent council review outputs integrated into plan docs.
- Static stale-term scans after patching.
- `git diff --check` against the planning docs and prompt files.

Not run because this is planning-only:

- Provider SQL/migration application.
- Browser/Playwright smoke.
- Type-check, lint, app tests, build.
- Production, hosted, or manual user proof.

## Implementation evidence requirements

Implementation must paste or reference concrete output for:

1. Supabase SQL readback and denial cases.
2. Action tests for success and all negative paths.
3. DOM tests for all route states.
4. Static credential leak checks.
5. Browser smoke showing same-tab Review click creates a valid share session.
6. Type-check/lint/build results or known-red unrelated failures.

## Citation integrity

This plan pack uses current repo source as implementation reality. Citations may drift if merges occur before implementation; the stale-plan checklist in `README.md` names the files and symbols to re-check before the first implementation edit.

# 16 — Requirements Traceability Matrix

Every requirement is traced to source evidence, source strength, work package, acceptance criterion, test method, and current status. Source strength values: `brief`, `repo evidence`, `assumption`, `derived`.

| Req ID | Source | Source strength | WP | Acceptance | Test method | Status |
|---|---|---:|---|---|---|---|
| FR-01 | Brief | brief | WP-5, WP-7 | Route renders with chrome | `tests/vitest/project-activity-page/route.test.tsx` | Pending |
| FR-02 | `02` ODD-11 + dashboard precedent | repo evidence | WP-5 | Invalid id -> 404/redirect; spectator -> permission-denied | `route.test.tsx` denial cases | Pending |
| FR-03 | Brief + owner-delegated ODD-12 | brief | WP-0, WP-1 | 6-source merged timeline with RPC-backed collaboration audit | `repository.test.ts` + RPC proof | Pending |
| FR-04 | Brief | brief | WP-1, WP-7 | Scope selector changes list; estimate scope excludes project-wide collab rows | `repository.test.ts` + `client.test.tsx` | Pending |
| FR-05 | Brief | brief | WP-1, WP-4, WP-7 | Action multi-select filters list | `repository.test.ts` + `action-classes.test.ts` + `client.test.tsx` | Pending |
| FR-06 | Brief + ODD-02 | brief | WP-1, WP-2, WP-7 | Actor dropdown filters list | `repository.test.ts` + `client.test.tsx` | Pending |
| FR-07 | Brief + ODD-03/ODD-09 | brief | WP-1, WP-2, WP-7 | Client dropdown filters list; no email DTO | `repository.test.ts` + `client.test.tsx` | Pending |
| FR-08 | AGENTS.md + ODD-06 | derived | WP-3 | Filter/scope URL state round-trips; cursor absent from shareable URL | `url-state.test.ts` | Pending |
| FR-09 | Existing pagination precedent + ODD-06 | repo evidence | WP-1, WP-5b, WP-7 | Cursor stable; no dupes; URL unchanged on Load more | `repository.test.ts` + `route-handler.test.ts` + `client.test.tsx` | Pending |
| FR-10 | Existing `readPublisherWorkspaceActivity` partial pattern | repo evidence | WP-1 | Partial flag + banner | `repository.test.ts` | Pending |
| FR-11 | Baseline refresh affordance | assumption | WP-7 | Refresh resets cursor/list and refetches | `client.test.tsx` | Pending |
| FR-12 | `02` non-goals | derived | n/a (v2) | n/a | n/a | Out of scope |
| UX-01 | Brief | brief | WP-8, WP-9 | Side-by-side chrome match | Manual visual review | Pending |
| UX-02 | Product dashboard pattern | derived | WP-7 | Sticky filter row + Clear; browser/manual proof for actual sticky behavior | `client.test.tsx` + visual review | Pending |
| UX-03 | Existing `ActivityViewModel` | repo evidence | WP-7 | Item fields render | `client.test.tsx` | Pending |
| UX-04 | AGENTS.md state coverage + counts contract | derived | WP-1, WP-7 | Empty states use `scopeTotalCount`/`filteredTotalCount` | `client.test.tsx` | Pending |
| UX-05 | AGENTS.md state coverage | derived | WP-6, WP-7 | Skeleton + spinner | `client.test.tsx` | Pending |
| UX-06 | AGENTS.md state coverage | derived | WP-7 | Friendly error UI | `client.test.tsx` | Pending |
| UX-07 | FR-02 | derived | WP-7 | Permission-denied panel | `client.test.tsx` | Pending |
| UX-08 | ODD-08 | assumption | WP-7 | "Edited by me" preset | `client.test.tsx` | Pending |
| A11Y-01 | AGENTS.md | derived | WP-7 | Keyboard operable incl. mobile drawer/tablet overflow | Manual + `client.test.tsx` | Pending |
| A11Y-02 | AGENTS.md | derived | WP-7 | Screen-reader semantics | axe in `client.test.tsx` + manual | Pending |
| A11Y-03 | AGENTS.md | derived | WP-7 | Focus restoration | Manual + `client.test.tsx` | Pending |
| A11Y-04 | AGENTS.md | derived | WP-7 | Reduced motion respected | Manual | Pending |
| A11Y-05 | AGENTS.md | derived | WP-7 | Non-color status cues | Visual review | Pending |
| A11Y-06 | AGENTS.md | derived | WP-7 | Contrast AA | axe in `client.test.tsx` | Pending |
| ARCH-01 | AGENTS.md + Next.js docs | repo evidence | WP-5 | RSC owns initial/filter fetch | Code review | Pending |
| ARCH-02 | AGENTS.md + React pattern | repo evidence | WP-7 | Smallest "use client" | Code review | Pending |
| ARCH-03 | AGENTS.md + repo server-only pattern | repo evidence | WP-1 | Repository server-only | Code review (`import "server-only"` + grep) | Pending |
| ARCH-04 | Non-regression | derived | All | Existing tests still pass or known-red failures documented unrelated | `bun run validate` known-red handling | Pending |
| ARCH-05 | AGENTS.md + Next.js cache docs | repo evidence | WP-5 | No cross-user cache; no `use cache`/`cacheTag` v1 | Code review | Pending |
| DATA-01 | DEC-07 + deny migration | repo evidence | WP-0 | Scoped RPC migration; direct table read remains denied | migration test + SQL proof | Pending |
| DATA-02 | AGENTS.md | repo evidence | WP-1 | Project_id scoping unconditional | `repository.test.ts` | Pending |
| DATA-03 | Pagination precedent | repo evidence | WP-1 | Cursor tie-breakers | `repository.test.ts` | Pending |
| DATA-04 | `07` | repo evidence | WP-0, WP-1 | Index usage | Manual `EXPLAIN` | Pending |
| API-01 | DEC-08 | derived | WP-5b | Authenticated loader only; no public activity API | `route-handler.test.ts` + code review | Pending |
| API-02 | AGENTS.md cache/read freshness | derived | WP-5 | Read-your-own-writes on navigation | Manual | Pending |
| SEC-01 | `08` | repo evidence | WP-5, WP-5b | Server-side ownership for page and loader | Code review + denial test | Pending |
| SEC-02 | `08` T-02/T-12 | repo evidence | WP-1, WP-7 | No email leak; non-PII duplicate disambiguator | `security.test.ts` | Pending |
| SEC-03 | `08` | repo evidence | All | No client secrets | Code review | Pending |
| SEC-04 | `08` + deny migration | repo evidence | WP-0, WP-1 | RLS/RPC last line; no service_role; direct collab table denied | code review + SQL proof | Pending |
| SEC-05 | `08` T-10 | derived | WP-1, WP-5b | Limit clamp 50 | Code review | Pending |
| SEC-06 | `08` T-03/T-04/T-06 | derived | All | No CSRF/injection; loader safe errors | Code review + route tests | Pending |
| PERF-01 | `09` | derived | WP-5, WP-12 | TTFB <= 300ms p50 and <= 600ms p95 | authenticated timing fixture | Pending |
| PERF-02 | `09` | derived | WP-7 | Bundle <= 10 KB gzipped | `bun run build` | Pending |
| PERF-03 | `09` | derived | WP-1 | No N+1 label lookups | Code review | Pending |
| PERF-04 | `09` | derived | WP-1 | Parallel source/count queries | Code review | Pending |
| REL-01 | FR-10 | repo evidence | WP-1 | Partial resilience | `repository.test.ts` | Pending |
| REL-02 | `09` | derived | WP-5, WP-7 | Graceful Supabase/loader error | `client.test.tsx` + route tests | Pending |
| REL-03 | `09` | derived | WP-1 | No silent failures | Code review | Pending |
| OPS-01 | Optional | assumption | WP-7 | Optional flag | Code review (if added) | Pending |
| OPS-02 | `13` | derived | WP-1 | Structured logs | Code review | Pending |
| OPS-03 | `13` | repo evidence | All | Rollback documented incl. RPC rollback | `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` | Done (in this plan) |
| TEST-01 | `12` | derived | WP-1 | Repository tests | `bun run test:dom -- project-activity-page` | Pending |
| TEST-02 | `12` | derived | WP-7 | DOM tests | Same | Pending |
| TEST-03 | `12` | derived | All | Security denial + RPC tests | Same + SQL proof | Pending |
| TEST-04 | `12` | derived | WP-7 | a11y assertions | Same | Pending |
| DOC-01 | `12` | derived | All | Copy reviewed | Manual | Pending |
| DOC-02 | v2 | derived | n/a | n/a | n/a | Out of scope |

## Summary counts

- Total requirements: 59
- Pending implementation: 56
- Out of scope (v2): 2 (FR-12, DOC-02)
- Already satisfied by this plan: 1 (OPS-03)

## Requirement-by-requirement completion audit (final verifier — emulated)

The final verifier (this run, same-agent emulated) confirms:
- Every requirement has a stable ID. ✅
- Every requirement has a source. ✅
- Every requirement has an acceptance criterion. ✅
- Every requirement has a test method. ✅
- Every requirement has a status. ✅
- No requirement is untraced. ✅

Residual concern: planning traceability cannot prove that implementation will satisfy every acceptance criterion. The implementation agent must re-verify each requirement as it lands, and the final plan package still needs a separate verifier pass after this revision.

# 16 - Requirements Traceability Matrix

Every requirement traces to a source, implementation phase, acceptance criterion, proof method, and current status. All statuses are `Pending impl` because this task is planning-only.

| Requirement ID | Source strength | User/system outcome | Phase | Code areas | Acceptance criteria | Proof method | Status |
|---|---|---|---|---|---|---|---|
| FR-001 | User decision | Authenticated recipient route exists at `/workshop/proposals` | 3 | Route + shell | Unauth redirects; auth renders shell/list boundary | Route test + browser smoke | Pending impl |
| FR-002 | User decision + repo evidence | Recipient sees publications sent to verified email across workspaces | 1,2 | List RPC + repository | Case-insensitive email match; cross-workspace rows included; no workspace membership granted | Provider SQL + repository test | Pending impl |
| FR-003 | Council-corrected source evidence | List rows have safe shape and stable order | 1,2,3 | RPC + DTO + UI | Sorted `published_at desc`; status limited to `published`, `expired`, `revoked`; no credentials | Provider SQL + DOM test + static grep | Pending impl |
| FR-004 | Security council | Active row opens existing share surface safely | 4 | Server Action + row form | Authorize first; decrypt raw token server-side; set cookies; same-tab `redirect()` | Action tests + browser smoke | Pending impl |
| FR-005 | User decision + owner-delegated | Sidebar includes Proposals above Publisher | 5 | `MainSidebar.tsx` | Proposals shortcut `⌘4`; Publisher `⌘5`; active/prefetch works | Sidebar DOM/static test | Pending impl |
| UX-001 | Repo pattern | Loading state does not shift page chrome | 3 | `loading.tsx`, skeleton | Shell visible; skeleton mirrors row density | DOM test | Pending impl |
| UX-002 | Product | Empty state explains no received proposals | 3 | Empty state component | No dead-end; no feature tutorial copy | DOM test | Pending impl |
| UX-003 | Product/reliability | Error state is recoverable | 3 | Error state + query boundary | Retry available; no credential detail leaked | DOM test | Pending impl |
| UX-004 | Owner-delegated | Status labels are clear and non-color-only | 3 | Row component | `New`, `Opened`, `Decision submitted`, `Expired`, `Revoked`; icons/text visible | DOM/a11y test | Pending impl |
| UX-005 | Repo pattern | Client refetch works without new HTTP route | 2,3 | `"use server"` loader + TanStack Query | Focus refresh deduped; errors typed | Client test/manual dev proof | Pending impl |
| A11Y-001 | WCAG/repo standard | Keyboard users can navigate and review | 3,4 | Row/form/buttons | Logical tab order; disabled rows not actionable; focus visible | DOM + browser smoke | Pending impl |
| A11Y-002 | WCAG/repo standard | Screen readers receive route/list/status context | 3 | Page and row components | Semantic headings/list/buttons; status text exposed | DOM/a11y assertions | Pending impl |
| ARCH-001 | Repo pattern | Server Component route with minimal client boundary | 3 | Route + client components | Data starts server-side; `"use client"` only for interactivity | Static inspection + type-check | Pending impl |
| ARCH-002 | Repo pattern | Server-only repository boundary | 2 | Repository | Imports `server-only`; no client imports | Static grep + type-check | Pending impl |
| ARCH-003 | Council-corrected security | No credential field crosses client boundary | 1,2,3,4 | RPC, DTOs, action state, UI | No `token_hash`, `encrypted_token`, `recipient_token_hash` in client payloads or URLs | Static grep + action/browser proof | Pending impl |
| DATA-001 | Repo RPC pattern | List RPC safely bypasses RLS for recipient self-read | 1 | Migration | `security definer`, `set search_path`, grants to authenticated only | Migration review + provider SQL | Pending impl |
| DATA-002 | Performance | Email lookup uses index | 1 | Migration | `shared_link_recipients_lower_email_idx` exists and query plan uses it | Provider `EXPLAIN` | Pending impl |
| DATA-003 | Security council | Authorization RPC returns only ids | 1,4 | Migration + action | No credential columns; denies non-recipient | Provider SQL + action negative tests | Pending impl |
| DATA-004 | Stack contract | Generated types reflect new RPCs | 1 | Generated types | `bun run gen:types` updates functions; type-check passes | `gen:types` + type-check | Pending impl |
| API-001 | Repo convention | No new HTTP route for the inbox bridge | 4 | Server Action | Review is form/action; success redirects server-side | Static inspection + browser smoke | Pending impl |
| SEC-001 | Security | Email-verified `auth.uid()` binding | 1 | List/authorize RPCs | Uses caller's auth email; no target email param | Provider SQL denial tests | Pending impl |
| SEC-002 | Security | Credential material never exposed | 1-4 | RPCs, repo, action, UI | No list/action return includes credentials; no logging | Static grep + tests | Pending impl |
| SEC-003 | Security | Direct Server Action POST is authorized | 4 | `openRecipientProposalAction` | Invalid/missing/wrong publication denied before token read | Action tests | Pending impl |
| SEC-004 | Security | Revoked/expired rows cannot open | 3,4 | UI + action | Visible disabled; action rejects if invoked directly | DOM + action tests | Pending impl |
| SEC-005 | Security | Privileged token read is bounded server-only | 4 | Action helper | Admin/service read occurs only after authz and returns no DTO | Code review + static import checks | Pending impl |
| PERF-001 | Performance | RPC p95 remains under MVP budget | 6 | RPC | p95 <= 300ms for 50 fixture publications; rollback at >500ms | Provider `EXPLAIN ANALYZE` | Pending impl |
| PERF-002 | Performance | Route TTFB stays under budget | 6 | Route | Local authed TTFB <= 500ms | Local curl/browser timing | Pending impl |
| PERF-003 | Performance | Client bundle impact stays small | 6 | Client components | No new deps; bundle delta <= 5KB gzipped unless justified | Build output | Pending impl |
| REL-001 | Reliability | RPC failure renders recoverable UI | 2,3 | Repository + client | Typed failure path; Retry control | Repository + DOM tests | Pending impl |
| REL-002 | Reliability | Review duplicate-click is safe | 4 | Form/action | Pending/disabled state; repeated action does not leak or corrupt session | Action + browser smoke | Pending impl |
| OPS-001 | Operations | Rollout has reversible migration/app path | 6 | Migration/app | Drop functions/index; revert app code | Rollback checklist | Pending impl |
| OPS-002 | Evidence policy | Provider/browser proof blocks implementation completion | 6 | SQL/browser | SQL and Playwright smoke recorded in implementation ledger | Evidence review | Pending impl |
| TEST-001 | QA | SQL/RLS/provider behavior is real-chain proven | 1,6 | Provider | Fixture and denial cases pass | Provider SQL proof | Pending impl |
| TEST-002 | QA | Repository/loader shape is typed and safe | 2,6 | Repository/server function | DTO shape matches contract; failures typed | Unit tests | Pending impl |
| TEST-003 | QA | UI state matrix is covered | 3,6 | Components | Loading/empty/success/error/expired/revoked states render | DOM tests | Pending impl |
| TEST-004 | QA | Action bridge is covered | 4,6 | Server Action | Success and all denial/unavailable paths covered | Action tests | Pending impl |
| TEST-005 | QA | Browser-only claims are proven in a browser | 6 | App route/share route | Real click-through establishes session and lands on share page | Playwright smoke | Pending impl |

## Summary

- 36 requirements.
- 0 untraced.
- 0 owner decisions left open.
- All behavior-bearing requirements map to at least one proof method.
- Provider SQL and browser proof are implementation-completion gates, not planning evidence.

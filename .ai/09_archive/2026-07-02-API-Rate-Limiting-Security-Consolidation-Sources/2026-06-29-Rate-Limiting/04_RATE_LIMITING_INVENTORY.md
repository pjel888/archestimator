---
title: Rate Limiting Inventory
plan_id: 2026-06-29-rate-limiting
created: 2026-06-29
profile: exhaustive
owner: Archestimator
---

# Rate Limiting Inventory

Inventory date: 2026-06-30, with a fourth-pass current-checkout overlay on 2026-07-01. Route discovery originally found 30 `route.ts` files under `src/app` and 27 `src/lib/**/*actions.ts` files. This inventory focuses on rate-relevant surfaces and records low-risk static routes as low priority. The method/action/frontend worksheet in `19_IMPLEMENTATION_CONTRACT_WORKSHEET.md` is part of this inventory and must be refreshed before implementation.

## Current Mechanism Inventory

| Surface | Entry point | Current control | Store | Key basis | Current response | Gaps |
| --- | --- | --- | --- | --- | --- | --- |
| Share snapshot/root GET | `src/app/api/share/[token]/route.ts:22-28`; helper `public-repository.ts:513-525` | 60/min | Postgres `security_rate_limit_events` | token hash + IP hash | 429 + `Retry-After` | No central policy registry. |
| Share events POST | `src/app/api/share/[token]/events/route.ts:83-89`; helper `public-repository.ts:550-562` | 60/min | Postgres | token hash + IP hash | 429 + `Retry-After` | Same-origin guard exists; no edge layer. |
| Share activity GET | `src/app/api/share/[token]/activity/route.ts:90-99`; helper `public-repository.ts:565-577` | 60/min | Postgres | token hash + IP hash | 429 + `Retry-After` | Public read fanout still tunable. |
| Share session POST | `src/app/api/share/[token]/session/route.ts:67-75`; helper `public-repository.ts:580-595` | 10/min, 50/hour | Postgres | token hash + IP hash | 429 + `Retry-After` | Prompt path `recipient-session` missing. |
| Share password POST | `src/app/api/share/[token]/password/route.ts:26-33`, `:62-81`; helpers `public-repository.ts:598-649`, `security.ts:549-626` | 5/15min durable plus local hard lockout | Postgres + memory | token hash + IP hash | 429 + `Retry-After` | Mixed durable/local lockout. |
| Share comments GET/POST | `src/app/api/share/[token]/comment/route.ts:199-206`, `:321-328`; helpers `public-repository.ts:652-682` | read 60/min; write 5/min, 20/hour | Postgres; plus local circuit | recipient/publication | 429 + `Retry-After` | Local circuit not distributed. |
| Share decisions GET/POST | `src/app/api/share/[token]/decision/route.ts:155-163`, `:280-287`; helpers `public-repository.ts:685-712` | read 60/min; write 5/min | Postgres | recipient/publication | 429 + `Retry-After` | Needs false-positive flow for client approvals. |
| Share unsubscribe GET/POST | `src/app/api/share/[token]/unsubscribe/route.ts:107-115`; helper `public-repository.ts:715-735` | 5/min, 20/hour | Postgres | token/IP/recipient token hash | 429 + `Retry-After` | Needs careful UX copy. |
| Proposal XLSX export | `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts:374-380`; helper `public-repository.ts:528-548` | 12/min, 120/hour | Postgres | user + client IP | 429 + `Retry-After` | Expensive route still needs observability. |
| Invite create/resend actions | `src/lib/collaboration/actions.ts:510-515`, `:651-656`, `:798-803`, `:848-853`; helpers `invite-entry.ts:244-277` | create 20/hour; resend 5/hour | Postgres | user/project or invitation + HMAC IP | Action result | Separate from global policy. |
| Invite resolve/continue/accept | `src/app/invite/[token]/page.tsx:77-85`; `accept/route.ts:108-112`; `continue/route.ts:45-52`; helpers `invite-entry.ts:280-316` | resolve 30/min; continue 10/min; accept 5/min | Postgres | token + HMAC IP + optional user | UI/route response | Sign-out route has same-origin but no limiter. |
| AI ask | `src/app/api/ai/ask/handler.ts:95-135`; `src/lib/ai/rate-limit.ts:17-79` | 10/min, 60/hour | Postgres | workspace + user + IP | 429 + `Retry-After`; 503 if quota unavailable | Package-builder route needs handler-chain confirmation. |
| Upload/image admission | `src/lib/uploads/admission-control.ts:24-148`; route callers in attachment/image APIs | 12/min; active actor 3; active workspace 6 | Process memory | surface + workspace + user + IP | 429 + `Retry-After` | Not distributed; exact capacity also partially durable in direct upload path. |
| Direct attachment capacity | `direct-upload/route.ts:135-194` | durable active session checks plus memory admission | DB + memory | workspace/user | 429 + `Retry-After` | Needs one policy model. |
| Estimate mutations | `src/lib/estimates/action-rate-limit.ts:14-82`; `src/lib/estimates/actions.ts` callers | 40/10s, 120/min | Process memory | surface + user + resource | thrown error | High-frequency editing risk; not distributed. |
| Client error intake | `src/app/api/internal/client-error/route.ts:8-57`, `:111-118` | 10/min | Process memory | forwarded IP | 429 JSON | No `cf-connecting-ip`; no central telemetry limiter. |
| Email dispatch/provider delivery | `src/lib/email/cloudflare-email-client.ts`, `src/lib/email/transactional-email-client.ts`; older Resend rows are stale until re-verified. | provider wrapper/circuit semantics must be re-inventoried | Cloudflare Email/provider logs plus app delivery idempotency | actor + recipient + publication/project/email hash | structured failure/action result | Circuit, idempotency, and provider spend budget must be refreshed for Cloudflare Email. |
| Email provider webhook/callback | Current runtime does not use the older Resend path as the planning anchor. | signature/config/body-size/idempotency if a provider callback exists | none/provider-specific | webhook secret/signature/event id | 400/413/503/500 or provider-native | Rate limit remains secondary to signature/replay/idempotency; P0 must confirm whether any Cloudflare Email callback exists. |
| Internal upload jobs | `src/app/api/internal/upload-cleanup/route.ts`, `upload-scan/route.ts`, `upload-runtime/route.ts`; legacy Vercel cron `vercel.json:3-12`; Cloudflare cron `wrangler.jsonc:59-64`; Cloudflare queue `wrangler.jsonc:65-80` | secret/config/body guards; queue producer/consumer settings | none/queue/DLQ | secret/job identity + queue message identity | 401/413/etc. | Needs idempotency/replay-first, queue backpressure, consumer retry/DLQ alerts, cron overlap policy, and rate limit second. |
| Contact/support | `src/components/landing/ContactForm.tsx:64-134`; `contact-mailto.ts` | mailto only | none | user email client | no server write | Future server intake needs Turnstile and limiter. |
| Auth API/login/callback | `src/app/api/auth/[...all]/route.ts`, `src/app/auth/callback/route.ts`, `src/lib/auth/actions.ts`, `src/lib/auth/better-auth-cloudflare.ts`, `src/lib/auth/cloudflare-better-auth-runtime.ts` | Better Auth/provider/session hardening; no unified app limiter found | Better Auth provider/app/D1 as configured | user/email/IP/provider identity | provider-dependent, including Better Auth `X-Retry-After` on built-in limiter denial | Must coordinate Better Auth built-in limits with app limiter and avoid account lockout false positives. |
| CollaborationRoom realtime transport | `wrangler.jsonc:45-58`, `src/lib/cloudflare/collaboration-room.ts`, `src/lib/cloudflare/collaboration-room-router.ts` | DO room transport/fanout; no app quota found in static scan | Durable Object | room + user/client/session | WebSocket/DO behavior | Use for realtime room quota proof only after hosted validation; not a generic rate-limit counter. |
| Cloudflare Images transform path | `wrangler.jsonc:22-24` | provider binding exists; app transform policy must be inventoried | Cloudflare Images/cache | image/source + transform params + actor/resource | provider/edge response | Unique transformation cardinality, cache-busting, and spend limits need explicit budgets. |
| Workers Logs/Traces correlation | `wrangler.jsonc:82-96` | logs sampled at 0.1, traces at 0.05 | Cloudflare logs/traces plus app events | request/policy/resource hashes | observability event | App-side denial events are primary for completeness; Worker logs are sampled correlation only. |

## Full Route List

`src/app` route handlers observed in the original inventory: AI ask, AI package-builder, auth catch-all, component-library attachments/direct-upload/scan-override/images, estimate-row-images, health, internal client-error/upload-cleanup/upload-runtime/upload-scan, project activity, proposal XLSX export, project images, share root/activity/comment/decision/events/password/session/unsubscribe, auth callback, invite accept/continue/sign-out, workshop pending-invite, and then-current provider webhook rows. P0 must re-run route discovery because the 2026-07-01 checkout has Cloudflare Email/Better Auth/D1 migration changes and stale Resend-specific paths.

## Server Action Groups

Action files observed: auth account/actions/beta allowlist, collaboration actions/pending/realtime identity/summary, component library actions/template editor, estimate-sheet preferences, estimates actions/express promotion/subtree, favorites, legal, notifications, projects/location, publication, publisher activity/drawer, recipient proposals, reusable sources, workshop actions/beta feedback/review/group.

Future implementation must classify each action as: no limiter needed, authenticated mutation limiter, expensive read limiter, email/provider limiter, storage limiter, or public token limiter. Do not assume route inventory alone covers server actions.

## Prompt-Required Inventory Fields

Every implementation work item must fill these fields before editing the target route/action:

| Field | Required use |
| --- | --- |
| Surface | Product surface such as share password, invite accept, upload admission, AI package-builder, auth login, webhook, or server action group. |
| Path / Function | Exact route path and exported method, or exact server action function. |
| HTTP Method or Action Type | Route method, Server Function mutation/read/provider call, internal job, webhook, or telemetry intake. |
| Current Auth / Session Gate | Current auth, same-origin, token, signature, secret, or public access gate. |
| Current Limit Exists? | `yes`, `no`, `partial`, or `local-only`, with source reference. |
| Current Limit Mechanism | Postgres events/RPC, process memory, provider control, circuit breaker, WAF, none. |
| Current Key Shape | Current actor/resource/client key basis. |
| Proposed Actor Key | Future normalized user/workspace/recipient/session/email key. |
| Proposed Resource Key | Future token/project/publication/estimate/upload/job/provider key. |
| Proposed Limit Class | Public token, auth, storage, AI/cost, export, email, webhook/internal, telemetry, or no-policy rationale. |
| Proposed Window(s) | Starting hypothesis or explicit "none; use idempotency/signature instead". |
| Proposed Store / Provider | Postgres, RPC, memory supplemental, WAF, Workers RL, Durable Object, D1, provider, none. |
| Server-Authoritative Gate | The auth/authz/validation/idempotency/rate-limit gate that runs before side effects or provider calls. |
| Direct Invocation Behavior | Expected behavior when DevTools, scripted `fetch`, direct Server Action invocation, or replay bypasses UI controls. |
| Client Control Needed | Pending state, keyboard parity, single-flight, debounce/throttle, cancellation, idempotency key, multi-tab coordination, optimistic rollback, cooldown, or no client guard with rationale. |
| Cloudflare Edge Rule Needed? | Observe-only WAF/Turnstile/Worker candidate and proof gate. |
| Worker Binding Candidate? | Whether approximate per-location Worker rate limiting is acceptable. |
| Turnstile Candidate? | Whether human verification is appropriate and accessible. |
| Failure Response | 429/403/401/503/drop/native action result, with no provider secret leakage. |
| Retry-After Strategy | Header/body/action field, client cooldown behavior, accessible copy, or explicit not applicable. |
| Privacy / PII Handling | Raw/hash/encrypted/public marker and retention class. |
| Observability Event | Policy ID, decision, store, hashes, runtime, and sampling rules. |
| Test Coverage Needed | Unit, route/action, store, distributed, provider, browser/manual, operations. |
| Migration Stage | Stage 0 through 10 from rollout plan. |
| Risk | Security, UX, cost, provider, privacy, performance, or low. |
| Owner Notes | Decision, override, support, or false-positive workflow. |

# Performance, Reliability, Observability, and Cost

## Performance Principles

- Authorize in set-based queries; avoid N+1 membership checks.
- Select only fields the actor may receive.
- Open one multiplexed realtime socket per topic/session.
- Keep cursor frames small and ephemeral.
- Preserve existing estimate editing responsiveness under roster/cursor load.
- Measure normal, 10x, and abuse-scale behavior before raising flags.

## Initial Budgets

These are product budgets to validate and refine against the repo performance protocol and current Cloudflare limits.

| Surface | Normal target | 10x target | Failure behavior |
| --- | --- | --- | --- |
| Team access summary | <= 4 bounded D1 queries; p95 <= 300 ms hosted | 1,000 members/invites without N+1 | paginate/defer details, do not broaden access |
| sheet navigation | one set-based authorized-ID query | 1,000 sheets | return only accessible rows |
| invite command | bounded transaction + outbox intent | concurrent duplicate attempts | idempotent conflict/result |
| cursor client | <= 12.5 outbound fps with distance threshold | multi-tab folded | drop superseded cursor frames |
| room fanout | p95 relay <= 100 ms at 20 sessions | benchmark 100 sessions | rate/cap/slow-client controls |
| reconnect | visible state within 1 s; recover within bounded backoff | regional interruption simulation | degrade quietly, never claim subscribed |
| access revocation | target disconnect/deny <= 5 s; hard maximum 30 s | forced control-path failure | token expiry + membership-version denial; fail proof over 30 s |
| cursor rendering | no layout shift; stable editing frame time | 20 visible cursors | coalesce/hide excess with presence count |

Implementation must reconcile these with `.ai/00_system/PERFORMANCE_LOADING_AND_MOUNT_PROTOCOL.md` and numeric roadmap budgets before proof.

## D1 Reliability

- Unique indexes and transactional commands resolve races deterministically.
- Retry only idempotent commands with stable idempotency keys.
- Email delivery does not hold a database transaction open.
- Queue/outbox failures are observable and retry-bounded.
- Migration preflight finds duplicate pending invites and manager-floor violations before applying constraints.
- Forward-fix and D1 restore rehearsal are documented before remote migration.

## Realtime Reliability

- Authorization acknowledgement and deadline.
- Refresh before five-minute expiry.
- Heartbeat/liveness and bounded reconnect.
- Membership revocation targets 5 seconds and must never exceed 30 seconds, using trusted control acknowledgement with membership-version/token-expiry fallback.
- Connection/session caps and slow-client handling.
- Runtime/deploy-time kill-switch semantics are accurately named and tested.
- Project cursor flag stays off until hosted capacity proof passes.

## Observability

Use the structured logger and existing ops gates. Required stable codes cover:

- capability denial and policy reason;
- manager-floor/target-dominance conflict;
- invite create/delivery/reissue/revoke/accept outcomes;
- transaction retry/partial-failure prevention;
- optimistic row revision conflict;
- realtime auth/refresh/reconnect/schema/rate/cap/fanout outcomes;
- cross-pack receipt state.

No raw `console.warn/error` on covered sensitive paths. Run `bun run validate:error-handling` and, when an artifact is needed, `bun run ops:check-error-handling`.

Operational metrics must use redacted IDs and aggregate counts. Raw tokens, emails, URLs, user labels, request IDs, and WebSocket payloads are excluded.

## Local Versus Hosted Proof

- Local tests prove policy, SQL invariants, command behavior, DOM states, and DO protocol units.
- Hosted D1 proof proves the bound database invitation lifecycle.
- Hosted DO/browser proof proves two-client identity, cursor, reconnect, refresh, denial, and cleanup.
- Production observability/support/cutover readiness requires the existing hosted proof and support-monitoring gates; none is inferred from this plan.

## Cloudflare Platforms Feasibility

### What the feature is

Cloudflare for Platforms is a broader platform-provider portfolio covering tenant isolation patterns, per-tenant storage such as D1/R2, custom hostnames/domains, and platform operations. Workers for Platforms is the compute product for businesses that let customers deploy isolated Workers/functions, attach per-customer bindings and limits, use dispatch namespaces, and meter/monetize tenant workloads.

Official sources reviewed 2026-07-11:

- `https://www.cloudflare.com/solutions/platforms/`
- `https://developers.cloudflare.com/cloudflare-for-platforms/`
- `https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/get-started/`
- `https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/reference/pricing/`

The current official pricing page lists Workers for Platforms as a paid product starting at USD 25/month with included usage and overages.

### Fit decision

`DEC-AUTO-012`: **defer Workers for Platforms and per-tenant datastore/custom-hostname partitioning for the Teamwork slice.**

Reasons:

1. Teamwork does not execute customer-authored code.
2. It does not require one Worker per customer, dispatch namespaces, customer custom domains, or per-customer code bindings.
3. Shared bound `ARCH_DB` and `ARCH_UPLOADS_R2` with explicit tenant predicates remain the proportionate storage model. Datastore-per-tenant would add provisioning, migration fanout, backup/restore, analytics, incident-response, and cost complexity without repairing the current RBAC, query-isolation, or transaction defects.
4. Existing Worker + D1 + Durable Objects + Queue + Email bindings map directly to the required data, realtime, delivery, and scheduled operations.
5. The repo mandate is free-tier/bundled Cloudflare operation unless the owner explicitly approves a paid add-on.
6. Adding a paid platform control plane would increase tenancy, deployment, observability, and incident complexity without solving the identified policy/atomicity gaps.

### Revisit triggers

Evaluate Workers for Platforms again only if the product adds one or more of:

- customer-written automations/extensions;
- per-customer executable plugins;
- customer-controlled custom domains for generated apps;
- regulatory/contractual need for isolated tenant code execution beyond current Worker/DO isolation;
- regulatory, scale, residency, or hard-isolation evidence showing shared tenant-predicated D1/R2 is insufficient;
- customer-specific compute metering and billing.

That future branch requires an explicit owner decision for paid cost plus a separate dependency/security/tenancy plan. It is not an active authorization boundary and does not block the locally ready slice.

## Cost Guardrails

- Stay within bound `ARCH_DB`, `COLLAB_ROOMS`, `UPLOAD_JOBS_QUEUE`, `EMAIL`, and existing Worker resources.
- No paid Workers for Platforms, Analytics, Smart Placement, or other add-on activation.
- Record D1 reads/writes, DO requests/messages/duration, queue operations, and email counts in hosted proof.
- Feature flags/caps must prevent an abusive room or invite storm from causing uncontrolled spend.

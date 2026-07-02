---
title: Pre-Beta Implementation Cutline
plan_id: 2026-06-29-rate-limiting
created: 2026-07-01
profile: exhaustive
owner: Archestimator
---

# Pre-Beta Implementation Cutline

This addendum repairs the proportionality and actionability gap identified on 2026-07-01. The earlier package correctly captured the full abuse surface, but it let the exhaustive contract inventory behave like a universal pre-edit gate. That is too large for a pre-beta app with no production enforcement yet.

The new rule is: **finish only the contracts that apply to the selected implementation slice; keep every other safety question explicit as N/A, provider-blocking, or backlog.**

## Readiness Position

| Scope | Readiness | Reason |
| --- | --- | --- |
| Full package enforcement | NOT READY | No implementation, shadow metrics, dashboards, provider proof, or false-positive review exists. |
| Cloudflare/WAF/Turnstile/DO/provider rollout | NOT READY | Hosted/provider proof remains absent. |
| Scoped pre-beta local app-layer implementation plan | CONDITIONALLY READY | A first slice may proceed if it re-inventories the current checkout, locks existing behavior, answers the applicable worksheet fields, and avoids unrelated provider/runtime changes. |
| First behavior-preserving registry slice | READY TO PLAN | The allowed slice is narrow enough to plan without completing all route/action/provider rows. |

## First Shippable Scope: Lean P0A

**Lean P0A: Public Share Existing-Limiter Consolidation**

This is the first candidate implementation slice because the public share routes already have durable limiter behavior, direct public abuse exposure, and concrete regression targets. The slice is behavior-preserving: it may centralize policy naming, response helpers, identity construction, and tests, but it must not change thresholds, user copy, provider configuration, Cloudflare settings, or production enforcement posture.

| Dimension | Lean P0A decision |
| --- | --- |
| Owned route rows | `RC-017` through `RC-024`: share activity, comment, decision, events, password, root token route, session, unsubscribe. |
| Owned action rows | None unless implementation discovers a directly coupled public-share Server Action. |
| Required contracts | `LP0A-001` through `LP0A-012` in `19_IMPLEMENTATION_CONTRACT_WORKSHEET.md`; applicable `SCE` rows only for the touched public-share routes. |
| Required proofs | `PROOF-RL-002` plus `PROOF-RL-031`; existing behavior-lock tests must fail on changed thresholds, response status/body/header shape, cache posture, or token-existence leakage. |
| Store boundary | Existing Postgres/security-event behavior only. No D1/DO/provider migration. |
| Identity boundary | Preserve current key semantics unless the slice explicitly migrates to a versioned HMAC key with continuity/rollback proof. |
| Response boundary | Preserve current `429`/`Retry-After` and no-store/cache posture. Do not add draft quota metadata to public token routes unless a separate leakage review approves it. |
| Observability boundary | Add or specify app-side events only if they preserve raw-token/raw-IP suppression and do not block the behavior-preserving slice. |
| Rollback | Revert the wrapper/registry path to existing helper behavior; no provider rollback should be needed. |

## Required Before Lean P0A Source Edits

1. Re-run current-checkout inventory for `RC-017` through `RC-024` only.
2. Record exact current windows, key dimensions, response status, response body, `Retry-After`, cache headers, and failure behavior for those routes.
3. Write behavior-lock tests for allow, near-limit, deny, expiry/reset, invalid token, valid reviewer, shared NAT/reviewer-friendly path, and store failure where the existing behavior has a defined failure mode.
4. Fill the `LP0A` worksheet rows in `19`, including explicit N/A rows for auth, Better Auth, WAF, Turnstile, DO, queue, cron, image, cache, and Bot Management.
5. Confirm no provider/runtime/config changes are part of the slice.

## Not Required Before Lean P0A

| Deferred scope | Why it is not a Lean P0A blocker |
| --- | --- |
| Better Auth limiter authority | Public share routes do not use Better Auth sign-in, 2FA, or OAuth callback paths. It remains blocking for auth throttles. |
| WAF managed-rule and hosted Server Action proof | Lean P0A is local app-layer behavior preservation. WAF proof is provider-blocking before edge decisions, not before local share-route tests. |
| Turnstile | No challenge is introduced by Lean P0A. |
| Generic Durable Object or D1 limiter store | Lean P0A preserves existing Postgres/security-event behavior. |
| `CollaborationRoom` realtime quotas | Not touched by public share route consolidation. |
| Queue/cron/images/cache provider budgets | Not touched unless the selected implementation adds those calls, which Lean P0A must not do. |
| Broad frontend client guard library | Public share client controls can be recorded as route-specific follow-up; server behavior remains authoritative. |
| All Server Action function-level rows | No Server Action is in the initial public-share route slice unless discovered during re-inventory. |
| Bot Management | Edge/bot escalation remains observe-first and provider-blocking, not local P0A-blocking. |

## Safety Invariants That Cannot Be Weakened

- No raw share token, raw recipient token, raw IP, raw email, cookie, provider secret, or challenge secret may be logged or persisted by new limiter code.
- Public/token routes must not reveal whether a token, recipient, account, or publication exists through quota metadata, cacheable denial bodies, or materially different invalid-token behavior.
- Server-side gates remain authoritative. Client controls are never security boundaries.
- Denials must occur before expensive side effects, writes, provider calls, or publication state changes for the touched route.
- Any identity-key migration must be versioned and rollbackable.
- Any provider, WAF, Turnstile, D1, DO, queue, cron, image, or cache claim requires the corresponding provider or hosted proof before rollout.

## Milestone Cutline

| Milestone | Allowed work | Blocking evidence | Explicitly out of scope |
| --- | --- | --- | --- |
| P0A Lean share slice | Behavior-lock and wrapper/registry consolidation for `RC-017` through `RC-024`. | `PROOF-RL-002`, `PROOF-RL-031`, `LP0A` worksheet rows. | Auth, Better Auth, WAF, Turnstile, DO/D1 migration, queue/cron/images/cache, global client guard library. |
| P0B Auth slice | Better Auth/app authority, migration identity, auth recovery, generic responses. | `SCE-018`, `SCE-020`, `PROOF-RL-028`. | Public-share route consolidation unless needed for shared helpers. |
| P0C Expensive authenticated slice | AI/export/upload behavior-lock and cost/resource budgets. | Relevant `RC`, `SCE-004`, `PROOF-RL-004`, `PROOF-RL-006`, `PROOF-RL-014`. | WAF/Turnstile/provider rollout. |
| P1 Provider/edge proof | WAF observe, hosted Server Action proof, Turnstile, DO/D1/Cloudflare provider budgets. | `SCE-019`, `CP` rows, `PROOF-RL-008`, `PROOF-RL-009`, `PROOF-RL-029`, provider readback. | Local app behavior refactors not needed for provider proof. |
| Post-beta hardening | Bot Management, broad anomaly detection, full client guard library, advanced resource budgets across all surfaces. | Traffic baseline, false-positive review, support runbook. | First-user app-layer behavior preservation. |

## Criteria Mapping

| Criterion | Before this addendum | After this addendum |
| --- | --- | --- |
| Exhaustiveness | Full surface captured. | Preserved; no contract rows were deleted. |
| Honesty/readiness | Correctly refused production enforcement. | Preserved; full enforcement remains NOT READY. |
| Proportionality | Too many global P0 gates for pre-beta. | Repaired by Lean P0A applicability scope and milestone cutline. |
| Actionability | Implementer faced all rows before any source edit. | Repaired by an exact first slice, required tests, required worksheet rows, and explicit deferrals. |
| Cloudflare/migration awareness | Strong but sometimes over-blocking local work. | Re-scoped: provider proof blocks provider claims, not local app-layer behavior preservation. |
| Adversarial review | Strong. | Preserved through non-weakenable safety invariants and explicit N/A evidence. |

## 100 Percent Planning-Criteria Closure

This is a completion matrix for the planning-improvement request. It is not a production-readiness score and it does not claim implementation, provider, browser, or hosted proof.

| Criterion from the 2026-07-01 assessment | Closure condition for this planning task | Status |
| --- | --- | --- |
| Exhaustiveness | Keep the full threat, standards, provider, auth, frontend, observability, privacy, and proof inventory visible. | 100% covered for planning; no rows removed. |
| Honesty/readiness | Keep full enforcement and provider rollout as NOT READY while stating the smaller next step precisely. | 100% covered for planning; readiness remains split and evidence-classed. |
| Proportionality | Stop treating every cross-cutting row as a universal first-edit blocker. | 100% covered for planning; Lean P0A and applicability statuses define the cutline. |
| Actionability | Name the first shippable slice, owned rows, required proofs, required worksheet answers, deferrals, and stop conditions. | 100% covered for planning; Lean P0A is ready to become a separate implementation plan. |
| Cloudflare/migration awareness | Keep WAF/Server Action, Better Auth, DO/D1, queue/cron/images/cache, and sampled-log gates, but block only the slices they govern. | 100% covered for planning; provider proof blocks provider claims, not local app behavior preservation. |
| Adversarial review | Preserve non-weakenable safety invariants and require explicit N/A/deferred answers instead of silent omissions. | 100% covered for planning; `PROOF-RL-031` verifies this cutline. |

## Stop Condition For This Addendum

This addendum is complete when README, `09`, `10`, `16`, `17`, `18`, and `19` all reference the pre-beta cutline, Lean P0A, applicability-scoped contract interpretation, and the new proof `PROOF-RL-031`. It does not authorize source implementation by itself; it authorizes a separate, scoped implementation plan to start from Lean P0A.

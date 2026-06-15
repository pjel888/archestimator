# Beta access optimization spike — 2026-06-06

Status: **SPIKE COMPLETE / NO AUTH CODE CHANGE JUSTIFIED**.

## Scope

Workstream 3.3 asked for a beta access optimization spike because `getClosedBetaAccessForEmail` sits on the protected-route/auth critical path. This artifact records the measured result and the no-change decision.

## Blast radius

Fresh GitNexus index: `07b5567`, up to date after `npx gitnexus analyze`.

- `getClosedBetaAccessForEmail` impact: **CRITICAL**.
- Impact summary: 69 impacted symbols, 3 direct callers, 32 affected processes, 12 modules.
- Representative affected surfaces: auth callback, workshop pages/settings, image APIs, component-library mutation actions, AI package builder, estimate creation, and project/estimate pages.
- `src/proxy.ts:proxy` upstream impact: LOW, but it calls `getClosedBetaAccessForEmail`, so any beta-access optimization still inherits the critical access-control blast radius.

Decision: do not change `getClosedBetaAccessForEmail`, do not replace `supabase.auth.getUser()` with `getSession()`, and do not cache allowlist decisions in this PR-0B packet.

## Current code-path evidence

Existing `src/proxy.ts` behavior already keeps the public fast path narrow:

- static assets, `_next`, and `/api` bypass proxy auth work;
- public routes (`/`, marketing pages, `/invite`, `/share`, `/beta`) return before creating the Supabase server client;
- protected `/workshop` unauthenticated requests call `getUser()` and redirect to `/login?next=...`;
- signed-in protected/auth-route requests call `getClosedBetaAccessForEmail` and fail closed by signing out denied/revoked users;
- `/beta/access-required` remains public to avoid redirect loops.

Focused tests passed:

```bash
bun run test:dom -- tests/vitest/auth-proxy.test.ts tests/vitest/closed-beta-access.test.ts
# 2 files / 25 tests passed
```

## Live provider evidence

Supabase project: `ebxxqidacheyapmmzavr` only. No SlateCamp or unrelated provider project was touched.

### Allowlist table stats

| Table | Live rows | Dead rows | seq_scan | idx_scan | Analyze seen |
| --- | ---: | ---: | ---: | ---: | --- |
| `closed_beta_allowed_emails` | 1 | 2 | 8 | 659 | never |
| `profiles` | 3 | 15 | 78055 | 228502 | 2026-06-01 |
| `workspace_members` | 1 | 26 | 269633 | 594675 | 2026-05-28 |
| `workspaces` | 1 | 31 | 16 | 18672 | never |

### Beta access RPC probe

Read-only synthetic probe:

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM public.check_closed_beta_access('synthetic-performance-probe@example.invalid');
```

Result summary:

- `Function Scan on check_closed_beta_access`
- shared buffers hit: 98
- planning time: 0.037ms
- execution time: 0.914ms

Interpretation: at current closed-beta scale, the beta-access RPC is not the dominant performance bottleneck.

## Hosted unauthenticated proxy timing

Timing evidence: `evidence/2026-06-06-auth-proxy-hosted-unauth-timing.json`.

Method: 3 `curl -sS -o /dev/null -w ...` samples per route, no cookies.

| Route | Result | Time total samples | Notes |
| --- | --- | --- | --- |
| `/workshop` | 307 to `/login?next=%2Fworkshop` | 200ms, 190ms, 195ms | Unauthenticated proxy redirect is fast and stable in this sample. |
| `/login` | 200 | 447ms, 576ms, 462ms | Auth UI render path, no authenticated fixture. |
| `/beta/access-required` | 200 | 560ms, 427ms, 613ms | Public route avoids redirect loops. |
| `/` | 200 | 1483ms, 721ms, 520ms | Public marketing page; first sample likely cold/network-heavy. |

## Decision

No production auth/proxy optimization is justified in this branch.

Reasons:

1. `getClosedBetaAccessForEmail` is CRITICAL blast radius.
2. Existing proxy tests already prove public routes skip Supabase auth lookup.
3. Current live `check_closed_beta_access` synthetic EXPLAIN is <1ms.
4. Hosted unauthenticated `/workshop` redirect samples are ~190-200ms total.
5. Safe authenticated hosted fixture/storage state is still missing, so the signed-in getUser + beta RPC waterfall cannot be fully measured.

## Reopen conditions

Reopen beta-access optimization only with:

- safe authenticated hosted fixture/storage state;
- hosted route timing that separates `getUser()`, beta RPC, route render, and Supabase query time;
- security/architecture approval for any `getUser()`/allowlist/caching change;
- auth proxy, beta allowlist, hosted auth verification, and invite-entry regression proof.

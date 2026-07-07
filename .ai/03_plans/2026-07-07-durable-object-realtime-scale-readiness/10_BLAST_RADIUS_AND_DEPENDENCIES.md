# 10 — Blast Radius and Dependencies

## Impact classification legend
`Required` · `Probable` · `Possible` · `Verification only` · `Explicitly unaffected`

## Direct impact

| Area | Path / Symbol | Classification | Note |
|---|---|---|---|
| DO class | `src/lib/cloudflare/collaboration-room.ts` | **Required** | presence keying, cap, rate-limit, alarm, auto-response, reconnect hooks |
| DO router | `src/lib/cloudflare/collaboration-room-router.ts` | Verification only | unchanged; existing tests guard it |
| Worker entry | `worker.ts` | Verification only | unchanged unless a `vars` knob is added |
| Browser client | `src/lib/cloudflare/collaboration-room-client.ts` | **Required** | reconnect/re-authz |
| Presence hook | `src/hooks/use-project-presence.ts` | **Required** | refresh-before-expiry, re-auth-on-reconnect |
| Cursor hook | `src/hooks/use-estimate-cursor-broadcast.ts` | **Required** | same refresh treatment |
| Row-update hook | `src/hooks/use-estimate-row-update-broadcast.ts` | **Required** | same |
| Telemetry | `src/lib/collaboration/realtime-telemetry.ts` | **Required** | prod sink (REL-02) |
| Identity action | `src/lib/collaboration/realtime-identity-actions.ts` | Probable | refresh path (FR-06) |
| Config | `wrangler.jsonc` | Probable | new `vars` (cap, rate-limit) |
| Config | `package.json` | **Required** | `@cloudflare/vitest-pool-workers` devDep + script |
| Config | `vitest.config.ts` | **Required** | workers-pool project |
| Tests | `tests/vitest/*collab*`, `*realtime*` | **Required** | new + extended |
| Scripts | `scripts/verify-cloudflare-hosted-collaboration-ui-proof.ts` | Possible | extend if OPEN-02 |

## Transitive impact

| Area | Classification | Note |
|---|---|---|
| `ProjectTeamspaceHeader` | Verification only | consumes hardened hook; no source change |
| `EstimateSheetCursorLayer` / `EstimateSheetContent` | Verification only | consumes hardened cursor hook |
| `realtime-room-token.ts` / `realtime-identity*.ts` | Verification only | unchanged; existing tests guard |
| `presence-surface.ts` | Explicitly unaffected | contract preserved (SEC-01c) |
| `feature-flags.ts` | Possible | a runtime knob may be added (OPS-01) |
| D1 `ARCH_DB` | Explicitly unaffected | no migration; authz probe unchanged |
| R2 `ARCH_UPLOADS_R2` | Explicitly unaffected | |
| Queue `UPLOAD_JOBS_QUEUE` | Explicitly unaffected | |
| Cron triggers | Explicitly unaffected | no cron touches the DO; prune uses the DO alarm |
| Email `EMAIL` | Explicitly unaffected | |
| Better Auth | Explicitly unaffected | session/auth unchanged |
| Cloudflare WAF/DDoS | Explicitly unaffected | separate concern |

## Users / roles affected

| Role | Effect |
|---|---|
| Project viewer | no behavior change (presence-only per D-4) |
| Project editor | more-reliable presence/cursors; transparent token refresh |
| Platform admin | unchanged |
| Anonymous | still cannot authorize |

## Backward compatibility

- Wire schema unchanged except the `presence-state.state` **key** (index → userId), which is
  transparent to the generic client consumer (verified by the hook's `Object.values` read).
- No client co-deploy required for FR-03.
- Token TTL, signing, and verification unchanged.

## Concurrent-work / sibling-plan dependencies

| Sibling plan | Interaction |
|---|---|
| `2026-07-07-cloudflare-queues-cron-production-ops/` | none (no cron change here) |
| `2026-07-07-cloudflare-worker-production-observability-and-budgets/` | overlaps on Workers Observability; coordinate the sink choice (OPEN-03) |
| `2026-07-07-test-harness-stability-and-flake-budget/` | the new workers-pool project must respect the flake-budget/quarantine policy |
| `2026-07-07-global-nonced-csp-enforcement/` | confirm `wss:` connect remains allowed if CSP tightens |
| `2026-07-07-launch-readiness-evidence-gate/` | this plan's evidence feeds that gate |

No file-level conflict (all sibling packs are PROMPT-only at planning time; this plan's
writes are confined to its own folder).

## Documentation impact

| Doc | Update needed (future impl) |
|---|---|
| `.ai/10_state/decisions.md` | add DO-hardening decision block (DOC-01) |
| `.ai/10_state/current-state.md` | add a Fast Path entry once implemented |
| `.ai/06_specs/teamspaces-collaboration-spec.md` | update transport language (DO, not Supabase Realtime) when convenient |
| code comments | DEC-DO-02/06/08 rationale |

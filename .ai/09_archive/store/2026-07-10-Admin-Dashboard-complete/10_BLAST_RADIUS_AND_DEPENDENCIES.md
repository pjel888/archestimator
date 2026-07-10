# 10 — Blast Radius and Dependencies

## 10.1 Impact matrix

| Area | Impact | Classification | Details |
|---|---|---|---|
| `src/app/admin/**` | new | Required change | New route group, 7 pages + layout |
| `src/lib/admin/**` | new | Required change | repositories, actions, clients, audit, flags, health probes |
| `src/components/admin/**` | new | Required change | shell, sidebar, charts, tables, inbox, tiles |
| `src/lib/auth/roles.ts` | edit | Required change | add `isPlatformAdminEmail()` + `PLATFORM_ADMIN_EMAILS` |
| `src/lib/auth/request-proxy.ts` | edit | Required change | add `/admin` to `PROTECTED_PREFIXES` + admin check |
| `src/lib/auth/session.ts` | possible edit | Probable change | wire `isPlatformAdminEmail` into context (or keep in roles) |
| 4× `philipjonlewis@gmail.com` literals | edit | Probable change | consolidate into `isPlatformAdminEmail` (separately landable refactor) |
| `migrations/0041..0044_*.sql` | new | Required change | support, flags, audit, cache tables |
| `wrangler.jsonc` | edit | Required change | 2 new DO classes, optional AE + ratelimit bindings |
| `package.json` / `bun.lock` | edit | Required change | `recharts`; P2 `postal-mime` |
| `worker.ts` | edit | Required change | route `GlobalPresence` + `SupportInbox` DO requests; P2 Email Worker |
| `src/app/providers.tsx` | possible edit | Probable change | admin query hooks registered (or local to admin layout) |
| `src/lib/cloudflare/*` | new | Required change | `global-presence.ts`, `support-inbox.ts` DO classes + routers |
| `cloudflare-env.d.ts` | regenerate | Required change | `bun run cf:typegen` after binding changes |
| `.env.example` / `.dev.vars.example` | edit | Required change | new vars (see 18) |
| `.ai/10_state/current-state.md` | edit | Required change | record admin dashboard addition (DOC-STATE-01) |
| Public marketing site | none | Explicitly unaffected | analytics wiring unchanged |
| Workshop routes (`/workshop/**`) | none | Explicitly unaffected | admin is additive |
| Better Auth identity tables | none | Explicitly unaffected | read-only |
| Existing `CollaborationRoom` DO | none | Explicitly unaffected | new DOs are siblings |
| Retention cron | possible edit | Possible change | extend `runRetentionPassInD1` to prune `admin_audit_events` |

## 10.2 Dependencies

- **External (owner-gated, BLOCKED-EXTERNAL):**
  - GA4 service-account + Data API enablement (OPEN-1) — gates FR-ANALYTICS-02.
  - Clarity Data Export API token (OPEN-2) — gates FR-ANALYTICS-03.
  - CF GraphQL Analytics API scoped token (OPEN-3) — gates FR-OVERVIEW-03.
  - Cloudflare Access OTP allowlist (OPEN-4) — gates FR-AUTH-03.
  - Inbound `support@` Email Routing address (OPEN-5) — gates FR-SUPPORT-03.
  - Approval to add `recharts` + new DO bindings (OPEN-6).
- **Internal ordering:**
  - Migrations `0041–0044` before repositories.
  - `roles.ts` allowlist helper before `request-proxy.ts` gate.
  - DO classes before WS hooks.
  - Audit helper before any mutating action.

## 10.3 Compatibility / backward compatibility

- All changes additive (new routes, tables, DOs, env vars). No existing route
  contract changes. The 4-literal consolidation is behavior-preserving (returns
  the same boolean for the same email).
- `recharts` adds bundle weight only to the admin chunk (dynamic import).

## 10.4 Documentation impact

- `.ai/10_state/current-state.md` — append admin dashboard entry (DOC-STATE-01).
- `src/app/admin/README.md` (or `.ai` ops note) — runbook (DOC-RUNBOOK-01).
- `DESIGN.md` — no change (alpha; admin reuses tokens).
- `.env.example` / `.dev.vars.example` — new vars documented.

## 10.5 Concurrency / shared-worktree safety

- Repo is a shared live worktree. Implementation must lease file scopes (see
  `00_AGENT_COORDINATION.md` ownership model), re-read touched files before
  edits, and run `git diff --check`. No auto-branch/worktree.

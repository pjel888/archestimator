# 15 — Decisions, Assumptions, and Alternatives

## 15.1 Major decisions (load-bearing)

### DEC-1 — Admin route at `/admin` (flat, new route group)
- **Problem:** where does the operator surface live?
- **Options:** (a) `/workshop/admin` (b) `/admin` (c) `/dashboard`.
- **(a) rejected:** couples to `WorkshopPageShell` + workshop gating; workshop
  is user-facing, admin is operator-only — different shells.
- **(c) rejected:** "dashboard" risks collision with future user dashboards.
- **Chosen:** (b) `/admin` — distinct, operator-semantic, matches flat router.
- **Conditions to revisit:** if a second operator needs role-scoped admin areas.

### DEC-2 — Layered auth: app allowlist + role + optional CF Access
- **Problem:** gate to one email simply and safely.
- **Options:** env allowlist only / `isAdmin` column / BA admin plugin
  `adminUserIds` / CF Access only / layered.
- **Chosen:** layered — `isPlatformAdminEmail` (env, default
  `philipjonlewis@gmail.com`) composed with `isPlatformAdminRole`; optional CF
  Access OTP as edge gate.
- **Rejected `isAdmin` column:** research Q2 — redundant with existing
  `profiles.role`, bug-prone (stray `true` grants admin).
- **Rejected `adminUserIds`-only:** keys on user IDs created post-first-login;
  less ergonomic than email env var for a solo dev, and BA plugin roles are fixed.
- **Rejected CF-Access-only:** would make the app-layer depend on an external
  service for its core authz; app-layer must stand alone; Access is additive.
- **Conditions to revisit:** adding a 2nd admin → just append the email.

### DEC-3 — Realtime presence via new `GlobalPresence` DO (Hibernation API)
- **Problem:** "users online now" without a persistent server.
- **Options:** DO / D1 heartbeat / KV TTL / Analytics Engine only / 3rd-party.
- **Chosen:** DO `getWebSockets().length` (authoritative live count) + optional
  Analytics Engine mirror for trend.
- **Rejected D1 heartbeat:** write-per-heartbeat cost on D1 (research Q3).
- **Rejected KV TTL:** eventually-consistent, laggy (research Q3; AGENTS: KV cache-only).
- **Rejected Analytics-Engine-only:** ingestion latency for "right now".
- **Conditions to revisit:** if global DO becomes a hot spot at very high scale
  → shard by region and aggregate.

### DEC-4 — Support inbox = D1 + `SupportInbox` DO (in-app chat), P2 email-to-ticket
- **Problem:** "chat inbox" for solo customer support.
- **Options:** build (D1+DO) / 3rd-party widget (Tawk.to/Crisp/Intercom/Chatwoot)
  / email-only.
- **Chosen:** build in-app chat reusing the DO+Email stack (full data ownership,
  free-tier, unified inbox); Phase-2 email-to-ticket via Cloudflare Email Worker.
- **Rejected 3rd-party widget:** data ownership, branding, and the brief wants
  the inbox *in the dashboard*.
- **Rejected email-only:** not a "chat inbox"; Philip wants realtime.
- **Conditions to revisit:** if support volume exceeds solo capacity → adopt
  Chatwoot/Tawk.to.

### DEC-5 — Charts via `recharts`
- **Problem:** no charting lib installed; d3-shape hand-rolling insufficient.
- **Options:** recharts / Tremor / extend d3.
- **Chosen:** `recharts` (React-native, pragmatic, lighter than Tremor).
- **Rejected Tremor:** heavier, opinionated dashboard kit, couples design system.
- **Rejected d3 extension:** too much bespoke work for an internal surface.
- **Conditions to revisit:** if bundle still too heavy → link-out to provider
  dashboards instead of inline charts.

### DEC-6 — Feature flags D1-backed with TTL cache
- **Options:** D1 / KV / LaunchDarkly.
- **Chosen:** D1 system-of-record + short-TTL server cache.
- **Rejected KV:** eventually consistent (AGENTS: KV cache-only, not source of truth).
- **Rejected LaunchDarkly:** overkill pre-revenue.
- **Conditions to revisit:** targeting/experiments → adopt a real platform.

### DEC-7 — Analytics: link-out MVP + owner-gated server reads
- **Problem:** surface CF/Clarity/GA without credentials today.
- **Chosen:** P0 link-out + cached metric tiles only when secrets present.
- **Rationale:** IDs are `NEXT_PUBLIC_*` (public); read APIs need owner-provided
  service accounts/tokens (BLOCKED-EXTERNAL OPEN-1/2/3). Avoids blocking MVP.
- **Conditions to revisit:** when Philip provisions credentials.

### DEC-8 — Defer billing UI / experiment analytics / log search
- **Rationale:** solo dev, pre-revenue; hosted surfaces (Stripe Portal, GA4,
  Workers Observability) cover these. Avoids rebuilding commodity dashboards.

## 15.2 Assumptions

| ID | Assumption | Strength | Validation |
|---|---|---|---|
| ASSUMP-1 | Better Auth Google OAuth works for the owner today | repo evidence | confirmed (`better-auth-cloudflare.ts`) |
| ASSUMP-2 | D1 free-tier suffices for admin tables at solo-dev scale | derived | cardinality table (09) |
| ASSUMP-3 | `recharts` gzips to ≤ ~150 KB | official docs/approx | bundle analyzer at impl |
| ASSUMP-4 | CF GraphQL essential datasets are free | official docs (research Q4) | verify in-account |
| ASSUMP-5 | `ratelimit` binding is GA + free | official docs (changelog 2025-09-19) | `wrangler` validation |
| ASSUMP-6 | Hibernation API `getWebSockets()` count survives hibernation | official docs (research Q3) | DO test |
| ASSUMP-7 | Owner will provision GA4/Clarity/CF tokens if read-tiles wanted | owner-delegated | OPEN-1/2/3 |
| ASSUMP-8 | Public-site analytics wiring (consent-gated) stays unchanged | repo evidence | confirmed |

## 15.3 Open decisions (BLOCKED-EXTERNAL) — options, recommendation, impact

### OPEN-1 — GA4 service-account + Data API credentials
- **Why external:** requires Google Cloud actions (enable API, create SA,
  grant Viewer on GA4 property).
- **Options:** (a) provision SA + JSON secret (recommended for in-dashboard GA);
  (b) link-out only (MVP default).
- **Recommendation:** (b) for MVP; (a) when Philip wants GA in-dashboard.
- **Impact:** gates FR-ANALYTICS-02 (read-tile). Without it: link-out only.

### OPEN-2 — Clarity Data Export API token
- **Why external:** Clarity dashboard action; quota 10/day, 1–3 day lookback.
- **Options:** (a) provision token (cached daily); (b) link-out only.
- **Recommendation:** (b) for MVP; (a) later.
- **Impact:** gates FR-ANALYTICS-03.

### OPEN-3 — Cloudflare GraphQL Analytics API scoped token
- **Why external:** Cloudflare account action (mint read-only token).
- **Options:** (a) provision scoped Analytics-Read token (recommended,
  free essential datasets); (b) link-out only.
- **Recommendation:** (a) — it's the highest-value, lowest-cost read (free,
  essential HTTP/firewall datasets per research Q4). Still MVP-link-out until
  Philip mints it.
- **Impact:** gates FR-OVERVIEW-03 trend tile.

### OPEN-4 — Cloudflare Access OTP allowlist on `/admin`
- **Why external:** Zero Trust configuration; hosted-only proof.
- **Options:** (a) enable Access OTP allowlist (free ≤50 users, recommended
  defense-in-depth); (b) app-layer gate only.
- **Recommendation:** (a) post-MVP as hardening.
- **Impact:** gates FR-AUTH-03 edge layer.

### OPEN-5 — Inbound `support@` Email Routing address + Email Worker
- **Why external:** Email Routing config + DNS.
- **Options:** (a) provision inbound address + Email Worker (Phase 2,
  recommended to unify email support); (b) in-app chat only (MVP).
- **Recommendation:** (b) for MVP; (a) when email-support volume appears.
- **Impact:** gates FR-SUPPORT-03.

### OPEN-6 — Approve `recharts` dep + new DO bindings
- **Why external:** dependency/infra additions (AGENTS: package + wrangler changes).
- **Options:** approve / reject (fall back to d3 / link-out).
- **Recommendation:** approve (enables clean charts + realtime).
- **Impact:** gates DEC-5, Phase 2 DOs.

### OPEN-7 — Presence privacy (opt-in per user)
- **Why external:** product/privacy call.
- **Options:** (a) always-on count (no individual exposure); (b) opt-in.
- **Recommendation:** (a) — count is aggregate, no individual identity exposed
  to admin beyond what `getCurrentUserContext` already provides.
- **Impact:** minor; affects copy/consent.

# 19 — Research, Review, and QA Evidence

## 19.1 Research questions, sources, and plan impact

### Q1 — Solo-dev admin dashboard canonical sections
- **Sources:** PostHog dashboards docs; Stripe customer-management docs; LaunchDarkly pricing.
- **Current vs community:** canonical = live usage, recent users, revenue, errors, support.
- **Plan decisions changed:** adopted 6-section minimal set (Overview, Users, Support, Analytics, Flags, Audit/Observability); deferred billing/experiments/log-search.
- **Not found:** single authoritative "solo-dev admin" spec — synthesized from product-health dashboard guidance.

### Q2 — Single-admin Google OAuth allowlist (Better Auth)
- **Sources:** Better Auth (admin plugin, Google provider v1.2.7+, OAuth concepts, databaseHooks); BA issue #3926 (`offline_access` invalid_scope).
- **Decisions changed:** layered auth (DB-hook allowlist + `adminUserIds` style via env + CF Access); rejected `isAdmin` column.
- **Not found:** official BA version stamp on admin plugin page.

### Q3 — Realtime active users on Workers
- **Sources:** Cloudflare DO State/WebSockets (Hibernation `getWebSockets()`); Analytics Engine + pricing.
- **Decisions changed:** chose DO + optional AE mirror; rejected D1 heartbeat / KV TTL.
- **Not found:** n/a.

### Q4 — Cloudflare analytics data access
- **Sources:** GraphQL Analytics API (+ limits 300/5min); Workers Logs/Observability/Logpush/Tail Workers; Workers pricing/limits.
- **Decisions changed:** GraphQL essential datasets (free) + Tail Worker/AE for log-derived metrics; defer Logpush (paid); flag R2/D1/Queue GraphQL exposure as unverified.
- **Not found:** official doc exposing R2/D1/Queue metrics via GraphQL — flagged for in-account verification.

### Q5 — Embedding Clarity + GA4
- **Sources:** Clarity setup + Data Export API (+ Q&A limits: 10/day, 1–3 day lookback); Next.js `next/script` for GA; GA4 Data API quickstart + service-account JWT.
- **Decisions changed:** corrected brief — Clarity *does* have a read API (quota-limited); GA4 needs service account; consent-gate unchanged.
- **Not found:** a single canonical Next.js 16 cookie-banner doc — treated as integration pattern.

### Q6 — Support inbox for solo dev
- **Sources:** Cloudflare Email Worker `email()` handler; Email Routing local dev; Tawk.to/Crisp/Chatwoot pricing.
- **Decisions changed:** build in-app chat (D1+DO) MVP + P2 email-to-ticket; rejected 3rd-party widget.
- **Not found:** n/a.

### Q7 — Admin security baseline
- **Sources:** Cloudflare Access OTP; Workers ratelimit binding (GA 2025-09-19); Workers secrets; OWASP API4 (2023).
- **Decisions changed:** layered CF Access + BA gate + ratelimit + audit + secrets + server-only PII.
- **Not found:** official Cloudflare-mandated audit schema (baseline expectation, not a feature).

### Validation rubric used
- Prefer official/primary docs over blog noise. ✓
- Distinguish current official vs community convention. ✓
- Record citations + visible dates. ✓ (where available; many CF pages undated — flagged).
- Record what was searched but not found. ✓ (R2/D1/Queue GraphQL; BA admin plugin version).
- State which plan decisions the research changed. ✓ above.

## 19.2 Specialist workstream outputs

- **Auth audit** → `03` §3.1 (roles, allowlist, proxy, profiles).
- **Analytics/realtime audit** → `03` §3.2 (Clarity/GA/CF beacon, DO presence, logs, wrangler).
- **Schema/UI audit** → `03` §3.3 (40 migrations, ui primitives, conventions, tokens, no charts lib, no support tables).
- **Research** → above + woven into `04`/`06`/`08`/`15`.

## 19.3 Critique-and-revision cycle summaries

### Cycle 1 (initial synthesis)
- Produced 00–19 drafts from the four lane outputs.
- **Gaps found:** (a) no chart lib decision → added DEC-5 (recharts); (b) support
  idempotency missing → added `client_message_id` UNIQUE (07, REL-INBOX-01); (c)
  email-failure path vague → REL-INBOX-02 explicit; (d) PII in bundle unaddressed
  → SEC-PII-01; (e) bundle size unbounded → PERF-BUNDLE-01 + dynamic import;
  (f) analytics credentials assumed → corrected to BLOCKED-EXTERNAL OPEN-1/2/3;
  (g) Clarity "no read API" claim corrected (research Q5).

### Cycle 2 (adversarial pass — emulated)
- **Findings:** (1) `isPlatformAdmin` literal consolidation not tracked → added
  T-6.3; (2) DSAR gap on support data → RISK-13 + T-6.5; (3) audit table growth
  → RISK-15 + retention prune; (4) XSS in support body → AQ-7 + render-text rule;
  (5) DO hot spot → RISK-4 + fallback; (6) perf evaluator missing auth/session
  setup → noted in 09; (7) `cloudflare-env.d.ts` regen step missing → added to
  T-2.1/Phase tasks; (8) presence privacy → OPEN-7; (9) `components.json` lucide
  stale-config → noted (use Phosphor); (10) admin chunk isolation → dynamic import
  re-emphasized.

### Cycle 3 (final-verifier pass — emulated)
- Confirmed: every requirement traced (16); every P0 task has exact paths/symbols;
  shadow-path matrix complete (04); DB blueprints complete (07); test matrix maps
  every req (12); no internally-resolvable critical gap remains.
- **Residual:** emulated verification caps readiness at 97; BLOCKED-EXTERNAL
  (OPEN-1..5) caps package at CONDITIONALLY READY for those slices.

## 19.4 Adversarial scenario matrix
See `12_TEST_AND_VALIDATION_STRATEGY.md` §12.3 (AQ-1..14).

## 19.5 Performance evaluator contract
See `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` §9.2.

## 19.6 Independent final verifier evidence
**Verification mode: emulated** (no separate verifier agent ran). The lead
performed a separated adversarial + final-verifier pass. Per the Suite
Succession contract, this caps overall readiness at 97 and (for this
high-blast-radius package) caps status at `CONDITIONALLY READY` until a human
(Philip) or an independent reviewer approves. See `17_FINAL_READINESS_REVIEW.md`.

## 19.7 Explicit validation gaps

- Provider read-back for GA4/Clarity/CF Analytics (OPEN-1/2/3) — tiles ship as
  link-out until resolved.
- Cloudflare Access edge proof (OPEN-4) — hosted-only; app-layer gate is locally proven.
- Perf evaluator is local Playwright, not hosted production perf.
- R2/D1/Queue metrics via GraphQL unverified in official docs — verify in-account
  before depending on them (none are required for MVP).

## 19.8 Skills/workflows used or unavailable

- Used: `archestimator-plan-pack` (binding), the two attached directives,
  parallel Explore/research agents.
- Consulted (via research): Cloudflare/Better Auth/Clarity/GA official docs.
- Not used (justified): GitNexus (proportional; read-only lanes cheaper),
  `design`/`team` (alpha design + planning-only), `autopilot`/`ultrawork`/
  `ultragoal`/`ultraqa` (these are execution-shape skills; this is planning-only
  synthesis; their discipline is reflected in the plan structure instead).
- Unavailable: native independent verifier agent → emulated (capped).

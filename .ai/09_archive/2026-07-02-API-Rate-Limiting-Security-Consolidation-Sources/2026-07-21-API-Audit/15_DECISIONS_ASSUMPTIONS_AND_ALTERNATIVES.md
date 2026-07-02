# 15 — Decisions, Assumptions, and Alternatives

> Plan pack: Archestimator API Audit
> Plan folder: `.ai/03_plans/2026-07-21-API-Audit/`
> Verification mode: `emulated`

This is the source of truth for `DEC-*`, `ASSUMP-*`, `OPEN-*` IDs. Every downstream doc that references one cites back here.

## DEC-* decisions

| DEC ID | Decision | Rationale | Rejected alternatives | Status | Linked RISK | Linked WP |
|---|---|---|---|---|---|---|
| DEC-001 | Active runtime remains Cloudflare-only (no migration back to Supabase) | Production cutover READY 2026-07-01; Supabase/Vercel/Resend wiring is migration archaeology | Re-migrate to Supabase/Resend; Hybrid | locked | n/a | n/a |
| DEC-002 | OpenNext remains the Next.js-to-Worker adapter | Migration to alternative (e.g., custom Worker handler) would require parallel infrastructure | Custom Worker handler; Cloudflare Pages (not Workers) | locked | n/a | n/a |
| DEC-003 | Better Auth remains the auth provider | Audit may recommend config changes, NOT replacement | Auth.js, Clerk, Auth0, Supabase Auth | locked | RISK-037 | n/a |
| DEC-004 | D1 as system of record | Production D1 provider green per FAST PATH | KV as system of record (eventual); external Postgres via Hyperdrive | locked (no replacement) | n/a | n/a |
| DEC-005 | R2 for object storage | Production existing setup | KV for object storage (eventual, not blob-handling suitable); external S3 | locked | RISK-027 | n/a |
| DEC-006 | Durable Objects + WebSocket for realtime collaboration | Production existing setup; SQLite-backed | Server-Sent Events only (no bidirectional); long-polling | locked | RISK-032 | n/a |
| DEC-007 | Cloudflare Queues for background uploads | Production existing setup; at-least-once with DLQ | KV-as-queue (anti-pattern); external queue (BullMQ) | locked | RISK-006, RISK-008 | n/a |
| DEC-008 | Cloudflare Cron Triggers for scheduled upload jobs | Production existing setup | External scheduler (cron-job.org); app-side ticking | locked | RISK-007 | n/a |
| DEC-009 | Cloudflare Email Service for outbound transactional email | Production existing setup; DMARC posture | Resend (legacy, removed from dependencies); external SMTP | locked | RISK-010 | n/a |
| DEC-010 | Workers Observability for logs + traces | Production existing setup; 0.1 sampling rate | External sink (Sentry, Datadog) as ADDITION not replacement (`OPEN-010`) | locked | RISK-009, RISK-023 | n/a |
| DEC-011 | Audit-pack's own readiness label is `CONDITIONALLY READY` (per emulated verification cap) | Per Multi-Agent-Execution-Directive §2, emulated verification caps high-blast-radius exhaustive planning packages at `CONDITIONALLY READY` without independent reviewer or owner sign-off | Claim `IMPLEMENTATION-READY` (would require independent reviewer); claim `NOT READY` (would ignore audit completeness) | locked | RISK-024 | n/a |
| DEC-012 | Audit does NOT deploy Cloudflare provider resources | Audit is docs-only; future remediation phases are SEPARATE implementation plan packs | Running `wrangler deploy` from this audit (out of scope); running migrations | locked | n/a | n/a |
| DEC-013 | Audit grounds itself in `wrangler.jsonc` + `cloudflare-env.d.ts` + `worker.ts` + filesystem scan, NOT the historical README | Root README stacks stale stack description (Supabase/Resend) | Use historical README as audit scope | locked | RISK-018 | n/a |
| DEC-014 | Audit-grounded D1 access-path matrix reuses `cf:d1-authz-matrix` + `cf:d1-rpc-map` output artifacts (`SRC-019`) | They are canonical; re-deriving risks drift | Re-derive every table from scratch (waste of effort) | locked | n/a | n/a |
| DEC-015 | Audit's stable IDs namespaces are unified across this pack | Predictability; cross-doc traceability | Per-doc IDs (would conflict) | locked | RISK-025 | n/a |
| DEC-016 | Sibling plan pack IDs are honored (SCE-* / RL-* / RL-FR-* / RL-NFR-* / PROOF-RL-* from `.ai/03_plans/2026-06-29-Rate-Limiting/`) | Avoid ID collision | Use new RL-* namespace (would collide) | locked | RISK-026 | n/a |
| DEC-017 | The future remediation phases (Phase 1-12 in `11_*.md`) are independently landable in separate PRs | Reduce blast radius | One big-bang PR | locked | n/a | WP-001..WP-012 |
| DEC-018 | Pre-existing RED tests (~131 / 36 files) are documented as awareness markers; remediating them belongs to Phase 12 | Audit cannot fix tests; audit can identify them | Fix tests as part of audit (out of scope: not docs-only) | locked | RISK-017 | WP-012 |
| DEC-019 | `PUBLICATION_TOKEN_ENCRYPTION_SECRET` and `PUBLICATION_TOKEN_HASH_SECRET` exist as distinct materials (C4 raw encrypted-at-rest + C5 hash for lookup) — confirmed from `cloudflare-env.d.ts` | Distinct materials have distinct lifecycle — recovery vs lookup | Collapse into one secret | locked | RISK-003 | WP-005 |
| DEC-020 | `BETTER_AUTH_TRUSTED_ORIGINS` MUST be parsed as exact-match list (no wildcard) | CSRF posture depends on it | Wildcard accept (.reject per Cloudflare guidance) | proposed-for-verification | RISK-011, RISK-026 | WP-002 |
| DEC-021 | DMARC `p=reject` recommended eventually (when DMARC alignment verified) | Public email integrity | Keep `p=none` indefinitely; jump straight to `p=reject` without testing | proposed-for-verification | RISK-010 | WP-009 |
| DEC-022 | Workers Observability sampling rate 0.1 is a deliberate cost-time-quality trade-off — audit confirms sufficiency or recommends raise | Without explicit decision, P0 forensic visibility is implicit | Hard-code 0.1 (default); raise to 1.0 (full sampling) | proposed-for-verification | RISK-009 | WP-008 |
| DEC-023 | Cloudflare WAF + Rate Limiting posture is `OPEN-003` — coordinate with sibling rate-limit plan pack | Out of scope for this audit; sibling owns SCE-* / RL-* IDs | Make decision in this audit | locked (delegated) | RISK-026 | n/a |
| DEC-024 | AI surfaces are deferred but reachable when feature flag enabled — audit treats them as reachable | `ARCHESTIMATOR_AI_ENABLED=true` activates `/api/ai/*` | Treat AI surfaces as out-of-scope (would skip reachable surface) | locked | RISK-013, RISK-014 | WP-011 |

## ASSUMP-* assumptions

| ASSUMP ID | Assumption | Source | Validation | Status |
|---|---|---|---|---|
| ASSUMP-001 | `migrations/` is the active D1 migration directory (29 files) | READ of `migrations/` folder + `bun run cf:d1-rpc-map` artifacts | Confirmed via filesystem scan | validated |
| ASSUMP-002 | `supabase/migrations/` directory is migration archaeology (not active) | FAST PATH `current-state.md:96`: "active runtime/config/package source no longer shows active Supabase, Vercel, or Resend provider wiring" | Confirmed via FAST PATH | validated |
| ASSUMP-003 | 29 Route Handlers + 30 Server Action files + Better Auth mount + 1 DO class + 1 Queue consumer + 2 Cron triggers + 1 Email binding constitutes the active API surface | Filesystem scan + wrangler.jsonc + cloudflare-env.d.ts | Confirmed; review after any new binding added | validated |
| ASSUMP-004 | D1 has no RLS — app code enforces row-level access scoping | Cloudflare guidance | Confirmed via Cloudflare D1 docs | validated |
| ASSUMP-005 | Workers scheduled handlers do NOT have native overlap protection | Cloudflare cron docs | Confirmed via Cloudflare docs | validated |
| ASSUMP-006 | Queue binding is at-least-once delivery (NOT exactly-once) | Cloudflare Queue docs | Confirmed via Cloudflare docs | validated |
| ASSUMP-007 | KV is eventually consistent and NOT suitable for rate limiting, sessions, locks, strong counters, or transactional state | Cloudflare KV guidance; Creating-Plan-Prompt §3 | Confirmed via Cloudflare docs | validated |
| ASSUMP-008 | Workers Observability retains logs for 3 days (free) or 30 days (paid) | Cloudflare Workers Observability pricing | Audit recommends explicit confirmation (`OPEN-009`) | proposed-for-verification |
| ASSUMP-009 | The repo has ~131 pre-existing RED `test:dom` tests across 36 files | FAST PATH `current-state.md:48-53` | Cited per FAST PATH; may have drifted | valid as of audit-open |
| ASSUMP-010 | The Cloudflare Migration Codex sibling pack's D1 RPC names are still active | Listing in FAST PATH `current-state.md:81-84` | Confirmed | validated |
| ASSUMP-011 | Better Auth D1 storage adapter is a custom implementation (not built-in) | File listing `src/lib/auth/better-auth-cloudflare.ts` + `src/lib/auth/cloudflare-better-auth-runtime.ts` | Confirm with code review in Phase 5 | identified |
| ASSUMP-012 | Each API surface has file:line evidence in `03_*.md` | This audit's inventory | Self-evident | validated |

## OPEN-* open decisions

| OPEN ID | Decision needed | Owner | Linked RISK | Linked REQ | Status |
|---|---|---|---|---|---|
| OPEN-001 | Batch PR vs per-surface slice remediation | Philip / future remediation | n/a | n/a | OPEN |
| OPEN-002 | Workers Observability sampling rate sufficient? | Philip / ops | RISK-009 | REQ-REL-003 | OPEN |
| OPEN-003 | Activate Cloudflare WAF + Rate-Limit rules? (sibling pack owns) | Philip / rate-limiter owner | RISK-026 | REQ-SEC-006 | OPEN |
| OPEN-004 | Independent reviewer sign-off to lift `CONDITIONALLY READY` → `IMPLEMENTATION-READY` | Philip / independent reviewer | RISK-024 | n/a | OPEN |
| OPEN-005 | README root stack drift — fix-forward to Cloudflare-only OR leave as migration-archaeology reference | Philip | RISK-018 | REQ-DOC-001 | OPEN |
| OPEN-006 | DMARC `p=reject` — replace current `p=none`? | Philip / ops | RISK-010 | REQ-SEC-011 | OPEN |
| OPEN-007 | Audit logs retention policy | Philip / ops | RISK-028 | n/a | OPEN |
| OPEN-008 | Strict hosted client p95 methodology — fix shifting cache outliers OR accept | Philip / ops | RISK-020 | REQ-PERF-001 | OPEN |
| OPEN-009 | Workers Observability paid tier decision | Philip / ops | RISK-022 | n/a | OPEN |
| OPEN-010 | External log/trace sink addition | Philip / ops | RISK-023 | n/a | OPEN |
| OPEN-011 | Server Action manifest — auto-generation vs manual ledger | future remediation | RISK-030 | REQ-ARCH-002 | OPEN |
| OPEN-012 | TanStack Query staleTime tuning per surface | future remediation | RISK-031 | PERF-002 | OPEN |
| OPEN-013 | AI audit table storage policy — retain raw prompts? | Philip / privacy | RISK-034 | n/a | OPEN |
| OPEN-014 | Better Auth account-linking rules — verify config + add test | future remediation | RISK-036 | n/a | OPEN |
| OPEN-015 | Better Auth `secret` rotation procedure — document once or per-quarter | Philip / ops | RISK-021 | REQ-OPS-001 | OPEN |
| OPEN-016 | Audit pack archive policy — manually archive OR auto-archive after full implementation | Philip | RISK-025 | n/a | OPEN |

## Rejected alternatives summary

| Alternative | Why rejected |
|---|---|
| Re-migrate auth/DB from Cloudflare-only back to Supabase | Regression after production cutover READY (DEC-001) |
| Use KV for rate limiting / sessions | Anti-pattern per Cloudflare guidance (DEC-007 / ASSUMP-007) |
| Use external Postgres via Hyperdrive only (no D1) | Loses atomicity with Workers; Hyperdrive is acceleration, not a DB replacement |
| Use Cloudflare Pages (not Workers) | Loses Worker entry chaining (worker.ts ordered routers) |
| Use Server-Sent Events only for collaboration | Loses bidirectional cursor / presence |
| Re-derive D1 access-path matrix from scratch instead of citing `cf:d1-authz-matrix` output | Wastes exploration effort (DEC-014) |
| Treat AI surfaces as out-of-scope because feature-flagged off by default | Reachable surface when flag on (DEC-024) |
| Treat pre-existing RED test suite as audit failure | Pre-existing per FAST PATH; audit identifies not fixes (DEC-018) |
| Claim `IMPLEMENTATION-READY` without independent reviewer | Emulated verification cap (DEC-011) |
| Make decisions about WAF / rate-limit posture in THIS audit | Sibling plan pack owns (`DEC-023`) |
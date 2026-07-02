# 14 — Risk Register

> Plan pack: Archestimator API Audit
> Plan folder: `.ai/03_plans/2026-07-21-API-Audit/`
> Verification mode: `emulated`

This is the source of truth for all `RISK-*` IDs. Every downstream doc that references a risk cites it back here.

## Severity scale

- **P0** — must fix; security, data-integrity, or availability impact. Blocks release readiness until resolved.
- **P1** — should fix; degraded posture but not a release blocker.
- **P2** — nice-to-fix; cosmetic or operational debt.

## Risk register

| RISK ID | Surface | Risk | Severity | Likelihood | Impact | Mitigation | Owner | Linked REQ / OPEN | WP-* | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| RISK-001 | D1 access layer (scattered) | Unscoped prepared statement allows cross-workspace read/write | P0 | High (no RLS) | High (tenant bypass) | Phase 1 centralize D1 access; per-table `workspace_id`/`owner_id` scoping | future remediation | REQ-SEC-001 | WP-001 | identified |
| RISK-002 | Server Action without auth/ownership | Anonymous post mutates anonymously | P0 | Medium | High | Phase 2 per-action verdict completion | future remediation | REQ-SEC-002 | WP-002 | identified |
| RISK-003 | Credential-material collapse | Distinct materials confused for one "token" type | P0 | Medium | High (replay attack) | Phase 5 Credential-material module | future remediation | REQ-SEC-003 | WP-005 | identified |
| RISK-004 | Direct-upload mint | Cross-workspace signed URL minted (IDOR-style) | P1 | Low-Medium | High | Phase 1 + Phase 5 verify object-key scoping + Phase 2 verdict completion | future remediation | REQ-API-009 | WP-001+WP-005 | identified |
| RISK-005 | Internal `/api/internal/*` route anonymous | PIR drive survives without secret check | P0 | Low | High | Phase 6 secret-gate verification + denial test | future remediation | REQ-API-007 | WP-006 | identified |
| RISK-006 | Queue DLQ silent | Stuck upload → UX loses confirmation | P1 | Medium-Low | Medium | Phase 7 DLQ alert | future remediation | REQ-REL-002 | WP-007 | identified |
| RISK-007 | Cron overlap | State corruption on cron double-fire | P1 | Low | High | Phase tests `controller.cron` dispatch + overlap guard | future remediation | REQ-PERF-004, SRC-013 | WP-011 | identified |
| RISK-008 | Queue at-least-once duplicate without dedup | Same upload processed twice | P1 | High (at-least-once delivery guarantee) | Medium | Phase tests dedup key + Phase 4 idempotency keys | future remediation | REQ-REL-001, SRC-014 | WP-011 | identified |
| RISK-009 | Workers Observability sampling 0.1 insufficient for P0 | P0 errors missed in forensic | P1 | Medium | High | Phase 8 sampling-rate decision | future remediation | OPEN-002, REQ-REL-003 | WP-008 | OPEN |
| RISK-010 | DMARC `p=none` | Transactional email reputation degraded; spoof risk | P2 | High | Medium | Phase 9 DMARC `p=reject` | future remediation ops | OPEN-006, REQ-SEC-011 | WP-009 | OPEN |
| RISK-011 | BETTER_AUTH_TRUSTED_ORIGINS wildcard parsing | CSRF on state-changing requests | P0 | Unknown | High | Phase 2 code review + bad-origin denial test | future remediation | REQ-SEC-007, SRC-002 | WP-002 | identified |
| RISK-012 | Better Auth ratelimiter on KV (eventual consistency) | Brute-force window allows bursts | P1 | Medium | High | Phase tests to confirm D1 storage adapter | future remediation | REQ-SEC-008 | WP-011 | identified |
| RISK-013 | AI feature flag bypass | Anonymous or authenticated calls AI when flag off | P1 | Low | High | Phase tests flag-off denial | future remediation | REQ-AI-002 | WP-011 | identified |
| RISK-014 | AI outbound SSRF | User-controllable URL → internal fetch | P1 | Low | High | Phase tests SSRF allowlist + private-IP block | future remediation | REQ-SEC-009 | WP-011 | identified |
| RISK-015 | Google Maps outbound SSRF | Same as RISK-014 | P1 | Low | High | Phase tests for location-actions | future remediation | REQ-SEC-009, SRC-010 | WP-011 | identified |
| RISK-016 | Server Action `throw new Error(...)` leaks path | Internal paths visible to client on error path | P1 | Medium | Low | Phase 3 envelope return stable code | future remediation | REQ-SEC-005 | WP-003 | identified |
| RISK-017 | Pre-existing RED tests (~131 / 36 files) | Slow CI; masks new bugs | P1 | High | Medium | Phase 12 triage + owners | future remediation | SRC-018, AC-041 | WP-012 | identified |
| RISK-018 | README root stack drift (still Supabase/Resend) | Future agents audit dead surfaces | P2 | High | Low | Phase 10 README update OR explicit migration-archaeology note | future remediation | REQ-DOC-001 | WP-010 | identified |
| RISK-019 | Public static page cache leaks state | `routeStaticPublicPageThroughCache` serves authed content as static | P1 | Low-Medium | High | Phase 8 static-cache eligibility review per route | future remediation | PERF-001, SRC-005 | WP-008 | identified |
| RISK-020 | Strict hosted client p95 shifting outliers (cache-hit variance) | Synthetic bench reveals outliers | P2 | High | Low | Phase 8 methodology fix OR accept | future remediation | OPEN-008, REQ-PERF-001 | WP-008 | OPEN |
| RISK-021 | Better Auth secret rotation undocumented | Compromise recovery is slow | P2 | Low | High | Phase 5 + Phase 9 document rotation procedures | future remediation | REQ-OPS-001 | WP-005 | identified |
| RISK-022 | Cloudflare Workers billing / observability paid-tier decision missing | Cost ceiling unknown | P2 | Medium | Low | Phase 8 + ops decision (`OPEN-009`) | future remediation | OPEN-009 | WP-008 | OPEN |
| RISK-023 | External log/trace sink missing | P0 errors missed if Observability retention low | P2 | High (3-day free retention) | Medium | Phase 8 external sink (`OPEN-010`) | future remediation | OPEN-010 | WP-008 | OPEN |
| RISK-024 | Audit pack verification `emulated` (no independent reviewer) | Audit findings may have unintentional bias | P1 | High | Medium | Independent reviewer sign-off needed to lift `CONDITIONALLY READY` | Philip / independent reviewer | OPEN-004 | n/a | OPEN |
| RISK-025 | Audit pack itself becomes stale >14 days | Future remediation may apply outdated findings | P2 | Medium-Low | Medium | Stale-plan revalidation checklist in README + audit-pack `LOOP_LEDGER` | future remediation | README revalidation | n/a | identified |
| RISK-026 | `OPEN-003` unresolved WAF/rate-limit decision | Public endpoints unbounded without rate-limit when WAF off | P1 | High | Medium | Coordinate with sibling plan pack `.ai/03_plans/2026-06-29-Rate-Limiting/` (owns RL-* IDs) | Philip / rate-limiter owner | OPEN-003 | n/a | OPEN |
| RISK-027 | Object-key design embeds PII | List bucket leaks PII | P1 | Unknown | High | Phase tests object-key design | future remediation | REQ-SEC-012, R2-001 | WP-011 | identified |
| RISK-028 | Audit logs retention policy undefined | Forensic visibility vs privacy tradeoff | P2 | High | Low | OPEN-007 (retention policy decision) | Philip / ops | OPEN-007 | n/a | OPEN |
| RISK-029 | Migration rollback SQL missing per migration | Failed migration unrecoverable | P1 | High (need to verify each of 29 migrations) | High | Phase verifies per-migration rollback SQL | future remediation | REQ-OPS-003 | WP-011 | identified |
| RISK-030 | Server Action manifest not auto-generated | Drift between codebase state and docs | P2 | Medium | Low | Phase 10 manifest auto-generation | future remediation | REQ-ARCH-002 | WP-010 | identified |
| RISK-031 | TanStack Query staleTime breaks read-your-own-writes for high-frequency estimate row mutations | Optimistic UI shows stale | P1 | Low-Medium | Medium | Verify each hook uses canonical-return | future remediation | PERF-002 | WP-003 | identified |
| RISK-032 | Durable Object WebSocket reconnect storm | Reconnect-loop DDoS risk | P1 | Low | High | DO ticket rate-limit per session | future remediation | REQ-SEC-010, SRC-012 | WP-005 | identified |
| RISK-033 | Cron `console.log` doesn't surface failures | Cron fails silently | P2 | Medium | Low | Phase 8 structured-logger OR justified `console.log` | future remediation | REQ-REL-004 | WP-008 | identified |
| RISK-034 | AI audit table may retain raw prompts containing PII | Privacy retention policy | P2 | Medium (AI deferred) | Medium | OPEN-007 + Phase 12 verify audit table redaction | future remediation | REQ-SEC-006 (privacy) | WP-012 | OPEN |
| RISK-035 | No constant-time compare on token hashes | Timing attack on token enumeration | P0 | Unknown | High | Denial test + verify in `src/lib/publication/**` and `src/lib/collaboration/**` | future remediation | REQ-SEC-003 | WP-005 | identified |
| RISK-036 | Better Auth account-linking edge case (Google OAuth + magic link with same email) | Account integrity hole | P1 | Medium | Medium | Verify Better Auth config + account-linking test | future remediation | (Better Auth docs) | WP-002 | identified |
| RISK-037 | Better Auth D1 storage adapter schema drift from Better Auth upstream | Better Auth upgrades break custom adapter | P2 | Medium | Medium | Pin Better Auth version; monitor upstream | future remediation | REQ-OPS-002 | WP-008 | identified |

## Aggregated count

- **P0**: RISK-001, RISK-002, RISK-003, RISK-005, RISK-011, RISK-035 = **6 P0 risks**
- **P1**: RISK-004, RISK-006, RISK-007, RISK-008, RISK-009, RISK-012, RISK-013, RISK-014, RISK-015, RISK-016, RISK-017, RISK-019, RISK-024, RISK-026, RISK-027, RISK-029, RISK-031, RISK-032, RISK-036 = **19 P1 risks**
- **P2**: RISK-010, RISK-018, RISK-020, RISK-021, RISK-022, RISK-023, RISK-025, RISK-028, RISK-030, RISK-033, RISK-034, RISK-037 = **12 P2 risks**

Total: **37 risks** identified in this audit pass.

> P0 risks MUST be resolved BEFORE lifting `CONDITIONALLY READY` → `IMPLEMENTATION-READY`. P1 risks SHOULD be resolved per Phase. P2 risks NICE-TO-FIX.
# 03 — Historical and Active Plan Reconciliation

> **Historical audit provenance.** “Active” below describes the July 19 audit
> baseline only. Current execution authority is
> `.ai/03_plans/2026-07-31/Code-Improvement/`; this predecessor is non-runnable.

Per master prompt §5, every historical security finding/recommendation and every security-relevant active plan was re-checked against current source at HEAD `7f9a484b4`. **No historical severity, recommendation, or verdict was copied.** Each row reconstructs the current code path and independently confirms, overturns, or marks obsolete.

Lineage matrix is in `artifacts/historical-reconciliation.csv`; this document is the human-readable summary.

## 3.1 June 1, 2026 audit (`.ai/09_archive/2026-06-01-security-owasp-compliance-audit/`)

**Baseline:** Supabase/Postgres + RLS + Vercel edge. **Current:** Cloudflare D1 (SQLite, no RLS) + Cloudflare Workers/OpenNext. The provider migration invalidates any finding that depends on Postgres RLS, SECURITY DEFINER, or Supabase Auth. Findings about *application-layer* behavior (CSP, headers, dev-auth, AI rate limits, CI gaps) were re-checked against current source.

### Top 5 June 1 findings reconciled

| June 1 ID | June 1 title | June 1 sev | Current status | Current evidence | New finding / unit |
|---|---|---|---|---|---|
| J1-Top1 | CI pipeline lacks SAST/SCA/secret-scanning/dependency-review; `permissions:` not declared | High | **STILL_PRESENT** | `.github/workflows/` is empty; all workflows in `.github/workflows-disabled/` (ci, codeql, dependency-review, dependabot, release, react-doctor). CODEOWNERS is advisory-only. | `SEC-CI-001` + `SEC-CI-002` → `UNIT-012` (AUXILIARY) |
| J1-Top2 | No structured security monitoring/alerting for rate-limit/auth-failure/webhook events | High | **PARTIALLY_REMEDIATED** | `src/lib/observability/{logger,redact,operational-alerts,alert-scenarios}.ts` now exist; `emitLogRecord` is structured; `operational-alerts.ts` has incident alert webhook. Residual: `SEC-LOG-001` (3 worker.ts cron paths bypass redactor via raw `console.error("...", error)`). | `SEC-LOG-001` → `UNIT-010` |
| J1-Top3 | AI endpoints have no rate limit / per-tenant cost cap | Medium | **PARTIALLY_REMEDIATED** | `/api/ai/ask` now calls `checkAiAskQuota` (10/min, 60/hr per workspace+user+IP). Residual: `/api/ai/package-builder` has no quota; sub-feature flags fail open. | `SEC-AI-002` + `SEC-AI-001` → folded into `UNIT-005` wave-2 backlog note (no separate unit; package-builder is feature-flagged off by default) |
| J1-Top4 | Share cookie `Secure`/`SameSite` not explicit; HSTS not configured | Medium | **REMEDIATED_AND_VERIFIED** | `next.config.ts:196,287` sets `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`. Share cookies are `HttpOnly; SameSite=Lax; Secure` (prod) via `publication/security.ts:370,558-559`. Residual informational: `SEC-BROWSER-005` notes the `Secure` flag is NODE_ENV-conditional (not request-derived). | `SEC-BROWSER-005` (Low; no unit — minor hardening recommendation) |
| J1-Top5 | `src/proxy.ts` short-circuits `/api/*` so API requests bypass proxy auth wall | Medium | **OBSOLETE_PROVIDER** | `src/proxy.ts` no longer exists; current `src/middleware.ts` proxies via `request-proxy.ts` and does not short-circuit `/api/*`. Each API route handler is independently authorized. | (no unit — closed) |

### June 1 sub-findings batch-dispositioned

(See `artifacts/historical-reconciliation.csv` for the row-per-finding matrix. Summary dispositions:)

- All Supabase RLS / SECURITY DEFINER / Postgres function hijacking / `search_path` findings → `OBSOLETE_PROVIDER` (RLS is not a D1 concept; current app-layer authz in `d1-access.ts` is the replacement control, independently verified).
- All Vercel-edge findings → `OBSOLETE_PROVIDER` (Cloudflare Workers/OpenNext is the current edge).
- All webhook signature verification findings (Svix on `/api/webhooks/resend`) → `OBSOLETE_PROVIDER` (the resend webhook route no longer exists; email is now via Cloudflare `EMAIL` binding, not Resend/Svix).
- "DeepSeek TLS pinning" finding → `OBSOLETE_PROVIDER` as written (TLS pinning remains a non-goal; the 20s `AbortController` timeout is the current control and is sufficient for an alpha).
- "HSTS not configured" → `REMEDIATED_AND_VERIFIED`.
- "CSP `next.config.ts`" → `PARTIALLY_VERIFIED` (CSP is now present, but only `/share/*` is enforced and it has `'unsafe-inline'+'unsafe-eval'`; workshop/invite are Report-Only without `report-to` → `SEC-BROWSER-001`).

### Master prompt §5 re-test of prior rejected claims

The prompt explicitly required re-testing the factual basis of prior rejected claims. Dispositions:

- **IDOR / BOLA** (prior rejected): re-tested → **CONFIRMED not exploitable today** on every repository function audited, with one latent gap (`SEC-AUTHZ-001` support-conversations data layer has no internal predicate; all current callers are admin-gated so it is latent).
- **SQL injection** (prior rejected): re-tested → **CONFIRMED not exploitable**. Dynamic identifiers are constrained by `assertSafeIdentifier` regex, table allowlists, and TS-literal column maps. Values are always `?`-bound.
- **Path traversal** (prior rejected): re-tested → **CONFIRMED not exploitable**. Object keys are server-derived from `workspaceId`/`userId`/randomUUID; `assertSafeStoragePath` rejects `..`, `\\`, leading `/`, and segments failing `^[A-Za-z0-9][A-Za-z0-9._-]*$`.
- **Production dev-auth reachability** (prior rejected): re-tested → **CONFIRMED not reachable in production**. `dev-auth-gate.ts:12-14` requires `NODE_ENV !== "production"` AND `ARCHESTIMATOR_DEV_AUTH_BYPASS === "1"` AND loopback host AND ≥32-char secret.
- **Durable Object room-ID crafting** (prior rejected): re-tested → **CONFIRMED not exploitable**. The DO ID is derived from the client path, but authorization happens *inside* the DO via a topic-bound HMAC token; the issuing server action enforces D1 authz before minting.
- **Hardcoded secrets** (prior rejected): re-tested → **CONFIRMED no live secrets in tracked content**. Only fixture/placeholder values present (e.g., `local-proof-secret`, `sk-test`, `:dummy` envelopes).
- **Scan-override forgery** (prior rejected): re-tested → **CONFIRMED not exploitable**. Platform-admin-only with ≥8-char reason, future expiry, exact checksum match, D1 audit event.

## 3.2 Active plans reconciled (`.ai/03_plans/` and recent archives)

| Active / recent plan | Security-relevant content | Reconciliation |
|---|---|---|
| `2026-07-18-Archestimator-Whole-Repo-Performance-Audit` | Performance-only; no security remediation units. | No overlap; preserved untouched. |
| `2026-07-18-Whole-App-Consistency-Audit` | Consistency-only; no security remediation units. | No overlap; preserved untouched. |
| `2026-07-18-Codebase-Improve-Audit-Plan-Pack` | Code-quality; no security remediation units. | No overlap. |
| `2026-07-18-MVP-Startup-Readiness-Audit` | Lead capture, PITR/restore drill, beta dashboard, founder notifications, variant accommodation. | One overlap: `004-backup-pitr-and-restore-drill` touches backup/restore. This audit's `SEC-PRIV-002` (retention registry gaps) and `RISK-002` (hosted D1 PITR cadence not verified) are complementary, not duplicative. No unit duplicated. |
| `2026-07-19-Archestimator-Whole-Repo-Quality-Master-Plan-Pack` | (Concurrent work, preserved untouched.) | Inspected for overlap; none found with this audit's units. |

### Archived security-relevant completion packs inspected

(Per master prompt §5, security-relevant archived packs that claim a remediation landed were checked against current source.)

- `2026-07-12-Archestimator-Admin-Founder-Homebase-Supplement-Plan-Pack-complete` — admin security surface (requireAdminContext, assertAdminApiOrigin, IP hashing). **REMEDIATED_AND_VERIFIED** in current source (`admin/require-admin.ts:36-60`, `auth/account-audit.ts:36-53`).
- `2026-07-12-Proposals-Page-Audit-unresolved` (CANCELLED) — `/workshop/proposals` findings preserved in its ARCHIVE-DISPOSITION; not duplicated here.
- `2026-07-16-Master-Codebase-Architecture-Deepening-Plan-Pack-complete` — architectural; no security remediation claims to re-verify.

## 3.3 Lineage matrix artifact

`artifacts/historical-reconciliation.csv` contains the row-per-finding lineage matrix with columns: `prior_id, prior_title, prior_source, prior_baseline_head, current_status, current_evidence, current_path_lines, new_finding_id, existing_unit_or_plan, disposition_reason`.

Allowed current statuses used: `REMEDIATED_AND_VERIFIED`, `STILL_PRESENT`, `REGRESSED` (none), `OBSOLETE_PROVIDER`, `MIGRATED_BUT_REQUIRES_REAUDIT` (none — reaudit done), `MISDIAGNOSED_OR_REFUTED` (none new — the re-tested prior rejections are re-confirmed), `DUPLICATE_CURRENT_FINDING` (none), `ACTIVE_EXISTING_UNIT` (none — no existing active unit duplicates a current finding), `NEEDS_RUNTIME_OR_HOSTED_EVIDENCE` (timing claims), `NEW_SCOPE_NOT_PREVIOUSLY_AUDITED` (the Cloudflare D1 / DO / queue / worker-edge surface is new scope relative to the Supabase-era audit).

# 08 — Security, Privacy, and Threat Model

## Trust boundaries

| Boundary | Crossing | Control |
|---|---|---|
| Operator ↔ tool | CLI invocation | operator token (SEC-003) for repair; dry-run is ungated locally but gated for hosted |
| Tool ↔ D1 | SQL | read-only interface for detection (AD-1); writable only in repair path |
| Tool ↔ R2 | object API | `list`/`head` for detection; `delete` only in repair |
| Report ↔ persistence/filesystem | report file | redaction gate (FR-004/SEC-002) |
| Audit module ↔ application code | none | audit queries raw D1; does not import application authz |

## Actor roles

- **Operator (Philip / delegated engineer):** runs dry-run and repair; holds the repair token.
- **Reviewer:** reads redacted reports; no token.
- **Attacker model:** an actor who obtains a persisted report file, or who can read CI artifacts. Threat: the report leaks sensitive data. Mitigation: redaction gate + TEST-003.
- **Insider with D1 access:** out of scope — if you have raw D1 access, the audit is not your leak surface.

## Attack surface

The audit adds **no new customer-facing HTTP surface** in core scope. The only new surfaces are:
1. A CLI script (`cf:orphan-audit`) — operator-only, not exposed.
2. Report files — the leak surface; mitigated by redaction.
3. (Optional) an internal cron route — `CRON_SECRET`-gated like the existing upload-cleanup route.

## Attack Surface Inventory

Per `Improve-Plan-Prompt.md:743-749`, Server Actions / Route Handlers / public routes / upload-storage / provider-backed data require this inventory. The mandated columns: `Entry point | Actor | Authn/authz and ownership check | Input validation | Output DTO | Cache/header behavior | Rate/abuse posture | Required tests`.

| Entry point | Actor | Authn/authz + ownership check | Input validation | Output DTO (minimized) | Cache/header behavior | Rate/abuse posture | Required tests |
|---|---|---|---|---|---|---|---|
| `cf:orphan-audit` dry-run (CLI, detection) | operator (repo holder) | operator-only; no HTTP surface; detection uses `ReadOnlyD1` (SEC-001 type-level gate) | flags validated at script boundary (`--target`, `--r2-cost-cap` numeric) | redacted JSON report (FR-004: counts, SHA-256 prefixes, ≤2-segment key prefixes; never raw hashes/tokens/paths) | n/a (no HTTP) | n/a — operator tool, not user-facing | P-001…P-009, P-016 |
| `cf:orphan-audit repair` (CLI, mutation) | operator (token holder) | `ORPHAN_AUDIT_REPAIR_TOKEN` env match (SEC-003) + `--from-report` + `--confirm`; per-class allowlist (`06`) | report schema validated; repair action from fixed allowlist per class | before/after count diff per class; `data_retention_events` audit row | n/a | n/a — single-operator window; idempotent (REL-001) | P-008, P-013 |
| `/api/internal/orphan-audit` (optional cron route) **— N/A unless built** | Cloudflare Cron | `CRON_SECRET` match (SEC-005, mirrors `/api/internal/upload-cleanup`); 401 without it | cron payload only | redacted report to R2/known path | no-store (token-bearing, operator-scoped) | Cloudflare rate-limit rule if externally reachable | P-014 (conditional) |
| **N/A — explicit ruling:** no Server Action, no public route, no client-facing mutation is added in core scope. The dry-run/repair are CLI-only. **Reason:** the audit is an operator/devtool capability, not a product feature (per `02` scope + `05` UX). If a future task adds a UI surface, re-open this inventory. | — | — | — | — | — | — | — |

## Column-projection denylist (SEC-001 enforcement)

Detection queries must never project sensitive columns into the audit's result set. The denylist is enforced structurally:

- `password_hash` (scrypt hash — public-route-accepted; ORPH-014 detection selects on `status` only)
- `encrypted_token` (publication token material)
- `token_hash` (share/invite token hashes)
- `snapshot_json` (publication snapshot may contain recipient PII)

A test (part of P-007) asserts no detection query SELECT-list includes these columns. The report formatter (`report.ts`) additionally accepts only the typed `OrphanFinding` shape (counts, prefixes, hashes-of-paths) — it cannot receive a raw sensitive value even if a future query tried to project one.

## Credential material taxonomy (for repair + report)

The standard (`Improve-Plan-Prompt.md:200-223`) mandates this taxonomy for any plan touching hashes, tokens, cookies, share URLs, or password unlocks. This pack touches `publication.password_hash` (ORPH-014 detects its retention on revoke), so the taxonomy must be exact.

| Material | Raw/hash/encrypted/derived/public | Created by | Stored in | Read by | Boundary that may see it | Used for URL/cookie/session? | Public-route-accepted? | Rotation/revocation | Proof |
|---|---|---|---|---|---|---|---|---|---|
| Repair token (`ORPHAN_AUDIT_REPAIR_TOKEN`) | raw secret (env) | operator | env var (never `.env` committed, never logged) | repair module only | server-only; never DOM/URL/client/logs | no | n/a | operator-rotated; destroyed (unset) after repair window | SEC-003 token-gate test |
| Report `storage_path` SHA-256 prefix (12 hex) | derived | `report.ts` | report JSON | operator + reviewer only (intended); never external user / DOM / browser URL | operator/reviewer + CI artifacts (if redaction holds, TEST-003) | no | n/a | n/a (not a credential; non-invertible prefix) | TEST-003 redaction test |
| R2 object key prefix (≤2 segments) | derived | `report.ts` | report JSON | operator + reviewer only | operator/reviewer; never external user | no | n/a | n/a | TEST-003 redaction test |
| `publication.password_hash` | **hash (scrypt-sha256-v1)** — NOT a lookup key | `hashPublicationPassword` (`src/lib/publication/actions.ts:820`, `src/lib/publication/security.ts:142-160`) | `project_publications.password_hash` | `verifyProjectPublicationPasswordByToken` (server-only) AND the **public** `POST /api/share/[token]/password` route (`src/app/api/share/[token]/password/route.ts:68` via `src/lib/publication/public-repository.ts:679-690`) | DB + server-only + public route handler (the value itself never reaches the browser; only its derived `credentialVersion` does — see next row) | no (the hash value itself) | **YES** — accepted by the public password-unlock route (gated by `isActivePublication`, `public-repository.ts:686`, which rejects revoked pubs BEFORE hash compare) | **revoke does NOT clear it** — `revokeProjectPublication` (`actions.ts:1012-1026`) only sets `status='revoked'`/`revoked_at`; the hash is retained. This is exactly ORPH-014. SEC-004 requires destroy-on-revoke. | ORPH-014 detection + SEC-004 |
| `credentialVersion` (derived from `password_hash`) | **derived (SHA-256 prefix, base64url 22 chars)** of `password_hash` | `deriveCredentialVersion(data.password_hash)` (`src/lib/publication/security.ts:194-196`) | the `publication-access-v1` Set-Cookie + JSON response bodies | written to browser via `Set-Cookie` (`password/route.ts:114-118`) and JSON (`public-repository.ts:646,817`; `share/[token]/activity/route.ts:123,143`) | **browser (cookie + JSON body)** — client-visible by design | **YES** (cookie value) | n/a (derived; non-invertible by design — a 22-char SHA-256 slice cannot recover the scrypt hash or password) | rotates when `password_hash` rotates (password change) | **Source-cited reason + proof gate (SEC-006):** the `credentialVersion` is a cache-busting/credential-rotation signal returned to the browser so the share UI can detect a stale access state and re-prompt. It is derived (non-invertible), but because it is a derived credential value reaching a client-visible surface, it requires an explicit proof gate (test asserting the prefix alone is non-invertible and changes on password rotation) per the standard's cap rule. |

**Correction note:** a prior draft of this table row for `password_hash` stated "revoke clears row" — this was factually false. `revokeProjectPublication` does NOT clear `password_hash` or delete the row; it only sets `status='revoked'` and `revoked_at`. The retention is the pack's ORPH-014 finding. Verified at `src/lib/publication/actions.ts:1012-1026` and `03` §4.4.

**Destroy-on-revoke expectation (SEC-004):** because `password_hash` is a public-route-accepted scrypt hash (not a lookup key), retaining it on a revoked publication is a credential-lifecycle defect, not merely a data-integrity orphan. SEC-004 (in `04`) requires that revoke/expire destroy `password_hash` (and `encrypted_token`, recipient/token material). This is reclassified from the prior draft's P1 to **P0** for the security dimension.

**Server-only enforcement for `password_hash` value (SEC-001 strengthened):** the audit's detection query for ORPH-014 selects on `status='revoked'` (not `SELECT *`), so the hash value is not projected into the audit's result set. SEC-001 acceptance now requires an explicit column-projection denylist (`password_hash`, `encrypted_token`, `token_hash`, `snapshot_json`) enforced on all detection queries, with a test asserting no detection query selects these columns. This converts "not read by audit" from assertion to proof.

Key rule: the audit **never reads or reports raw `password_hash`, raw tokens, recipient emails, or full storage paths**. Only SHA-256 prefixes and bucket+first-2-segments. The `credentialVersion` row above documents the one derived credential value that legitimately reaches the browser (with source-cited reason + proof gate), satisfying the standard's cap-rule exception.

## Privilege escalation

- The audit does not grant any privilege. It reads raw D1; it does not bypass `authz/d1-access.ts` for application requests (it is not in the request path).
- Repair deletes rows/objects; it does not change ownership or roles.

## Input sanitization

- Script flags validated; no SQL string interpolation — all queries use bind parameters.
- Repair actions are selected from a fixed per-class allowlist (delete-row / delete-object / set-null), never derived from report content beyond the row identity.

## Injection risks

- Detection SQL is static (generated from the manifest, parameterized). No user input reaches SQL text.
- Report content is treated as untrusted data by the formatter (redaction applied regardless of source).

## Secrets / environment variables

- `ORPHAN_AUDIT_REPAIR_TOKEN` — repair-only; never logged.
- Existing `CRON_SECRET` reused if the optional cron route is added.
- No `NEXT_PUBLIC_*` involvement.

## Logging safety

- stdout summary: counts + prefixes + hashes only.
- Never log: raw storage paths, raw object bytes, tokens, hashes-of-passwords, recipient emails.
- The redaction formatter is the single chokepoint; no other code path emits report content.

## Tenant isolation

- The audit reads across all workspaces (it is a global integrity check). This is correct for an operator tool. Repair is scoped per finding, not per workspace, but each finding is itself workspace-scoped (rows carry `workspace_id` where applicable).
- No cross-tenant data is *combined* in a report; findings are listed individually with their `workspace_id` hash prefix (redacted).

## Rate limits / abuse

- N/A (operator tool, not user-facing). The optional cron route inherits `CRON_SECRET` gating.

## Privacy / data minimization

- Reports contain the minimum needed to triage: class, table, count, key prefix, path hash, severity. No row contents, no user PII.
- DSAR interaction (FR-006): the audit excludes legal-hold rows and provides a per-user/per-workspace query template for future erasure.

## Security testing

- TEST-002 (read-only instrumentation): proves detection writes nothing.
- TEST-003 (redaction): proves reports contain no secret-like patterns.
- SEC-003 token-gate test: proves repair refuses without the token.
- Denial test for repair: `--from-report` with a tampered report → schema mismatch refusal.

## Incident-response implications

- If the audit finds P0 orphans in production, the runbook (`13`) defines triage and owner escalation.
- A repair leaves an audit row in `data_retention_events` — the incident record.

## CSP / frame / referrer

- N/A (no UI).

## Summary of residual security risk

- If a future report field is added without updating the redaction regex, it could leak. Mitigation: schema-locked reporter + TEST-003 in CI.
- The optional cron route, if added, must inherit `CRON_SECRET` gating or it becomes an unauthenticated integrity-probe endpoint.

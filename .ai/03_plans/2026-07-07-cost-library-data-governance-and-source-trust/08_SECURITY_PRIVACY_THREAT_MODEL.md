# 08 — Security, Privacy, and Threat Model

## Trust boundaries

1. **Internet → Cloudflare Worker** (WAF/DDoS, existing).
2. **Worker → Better Auth session** (existing session identity → `userId`, `workspaceId`, role).
3. **Server Action → D1** (app-authz layer `src/lib/authz/d1-access.ts`; D1 has no native RLS).
4. **Reviewer (admin/editor) ↔ cost entry** (new governance boundary).
5. **Importer (editor) ↔ bulk data** (new import boundary).

## Actors & roles

| Actor | Capabilities |
|---|---|
| Anonymous | none (all library routes auth-gated) |
| Workspace member | read library |
| Workspace editor | create/update/draft/import/export (no accept/lock/supersede) |
| Workspace admin | editor + accept/reject/lock/unlock/supersede/assign + set `origin='owner-accepted'` |
| Platform admin | workspace-admin bypass (audited) |

## Threat model

| ID | Threat | Vector | Impact | Detection | Prevention | Mitigation | Residual |
|---|---|---|---|---|---|---|---|
| T1 | Privilege escalation: editor calls `acceptCostEntry` directly via Server Action POST | direct POST to `"use server"` action | untrusted cost marked accepted | denial test; audit event | `isCostLibraryGovernanceAdminInD1` inside the action | revoke + audit | low |
| T2 | Cross-workspace review: admin of WS A acts on WS B entry | forged `entryId`/`workspaceId` | data leak/integrity | denial test | every action re-derives `workspaceId` from the entry row, never trusts client | per-workspace audit | low |
| T3 | Lost update: two reviewers accept concurrently | race | one update silently lost | concurrency test | optimistic `review_revision` conflict guard | refresh + retry | low |
| T4 | Import formula injection → spreadsheet CSV-injection in downstream tools | CSV `=cmd` cells | client-side calc tool exploitation | import test | strip/neutralize `=+-@` prefixes; export adds `'` prefix guard | advisory in export | low |
| T5 | Import XSS via stored `name` rendered in UI | `<script>` in name | XSS in library list | validation test | existing `normalizeQuickAddText` + React text rendering (no `dangerouslySetInnerHTML`) | CSP | very low |
| T6 | Import oversized payload DoS | huge CSV | Worker CPU/memory | row/size cap | 5 MB + row cap; streaming parse | 400 error | low |
| T7 | Enumeration of entry ids in review actions | guessed UUIDs | info disclosure | id format | opaque ids (existing); rate by authz | audit | low |
| T8 | Audit tampering: attacker edits review-event history | direct D1 (no app path) | loss of accountability | append-only test | no UPDATE/DELETE code path; migration-time controls | D1 access governance | medium (D1 has no RLS) |
| T9 | Supersede chain abuse: supersede a superseded entry | bad state transition | inconsistent data | constraint test | CHECK + app guard (`superseded` ⇒ terminal) | constraint | low |
| T10 | Self-assign + self-accept without oversight | admin accepts own import | false trust | audit + (optional) two-person rule | audit transparency; `OPEN-5` two-person optional | owner policy | medium |
| T11 | Stale cache shows wrong review state after accept | TanStack/Next cache | user sees old state | integration test | `revalidateLibraryRoutes` + query invalidation | reload banner | low |
| T12 | `origin='owner-accepted'` set by non-admin | direct POST | unvetted data marked trusted | denial test | admin-only setter | audit | low |

## Input validation

- Reuse `validateQuickAddComponentInput` + `sanitizeComponentSourceUrl` + control-char strip.
- Import: per-row schema validation; reject rows with unknown columns; formula-prefix neutralization.
- `review_note`: length cap (e.g., 1000 chars), control-char strip.

## Injection / rendering risks

- **SQL injection:** all D1 access via parameterized queries (existing repository pattern; new actions must follow — no string interpolation).
- **XSS:** React text rendering; no `dangerouslySetInnerHTML` in new UI. Source URLs sanitized.
- **CSV injection:** neutralize on import; advisory prefix on export.
- **SSRF:** `pricingSource` URL is stored, not fetched server-side; no outbound fetch from review/import. (Attachment scan is an existing path.)

## CSRF / same-site

- Server Actions use Next.js built-in CSRF protection (existing). No new raw Route Handlers that bypass it.

## Secrets / `NEXT_PUBLIC_`

- No new secrets. `reviewed_by`/`assigned_to` are user ids (not PII-sensitive beyond existing user tables). No `NEXT_PUBLIC_` exposure of review internals.

## Logging safety

- Audit events store `actor_user_id`, `note` (user-entered, sanitized), state transitions. No secrets, no full cost payloads in logs (cost is not sensitive; supplier URLs already validated https). Existing telemetry sanitizer (`library-telemetry.ts`) extended to redact any new sensitive fields if introduced.

## Tenant isolation

- Every query/action includes `workspace_id` predicate derived from the entry row, not the client. Cross-workspace tests in `12`.

## Abuse / rate limits

- Import is editor-gated, workspace-scoped, size/row capped. No Cloudflare rate-limit rule required initially (existing posture). If abuse emerges, add route-level limit (OPS).

## Privacy / data minimization

- Cost data is not PII. Reviewer/assignee are user ids (existing user-table references). Export excludes internal ids unless requested. No new personal data collected.

## Auditability

- Review-event audit (append-only) covers every state transition with actor, timestamp, note, revision, correlation id. Governance-admin can query workspace-scoped history. Retention in `13`.

## Security testing required (denial tests)

- `accept-cost-entry-denied-for-editor.test.ts`
- `cross-workspace-review-denied.test.ts`
- `import-formula-injection-neutralized.test.ts`
- `supersede-terminal-state-enforced.test.ts`
- `origin-owner-accepted-admin-only.test.ts`
- `review-event-append-only.test.ts`
- Concurrency: `accept-cost-entry-revision-conflict.test.ts`

These map to `SEC-*` requirements and the shadow-path matrices in `04`.

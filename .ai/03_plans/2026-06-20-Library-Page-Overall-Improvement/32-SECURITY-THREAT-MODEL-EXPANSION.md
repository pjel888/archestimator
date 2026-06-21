# 32 — Security Threat Model Expansion

> **Status:** Living document. Initialized 2026-06-21 by the Ultrawork audit
> loop. Expands the security threat model beyond
> [14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md](14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md)
> to cover abuse cases, attack vectors, and mitigations specific to the
> Library page.
>
> **Scope:** Threat model, attack vectors, abuse cases, mitigations,
> telemetry for security events, and per-surface security acceptance
> criteria.
>
> **Companion docs:** [14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md](14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md),
> [13-DATA-CONTRACTS-ROUTE-CACHE.md](13-DATA-CONTRACTS-ROUTE-CACHE.md),
> [33-DB-RLS-AND-MIGRATION-CONTRACT.md](33-DB-RLS-AND-MIGRATION-CONTRACT.md),
> [27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md](27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md).

---

## 1. Purpose

Doc 14 defines the baseline authz and data exposure model. This doc expands
it with:

1. **Full threat model** — assets, actors, attack vectors, mitigations.
2. **Abuse cases** — how a malicious user could misuse the Library.
3. **Attack vectors** — specific paths an attacker could exploit.
4. **Mitigations** — concrete defenses for each vector.
5. **Security telemetry** — events to emit for security monitoring.
6. **Per-surface security acceptance criteria** — pass conditions.

---

## 2. Threat model

### Assets at risk

| Asset | Sensitivity | Impact if exposed |
|---|---|---|
| Component pricing data | Confidential | Business harm — competitors see pricing |
| Component cost formulas | Confidential | Business harm — IP theft |
| Folder structure | Internal | Reputational harm — organizational structure exposed |
| Template definitions | Confidential | Business harm — IP theft |
| Trust/freshness metadata | Internal | Reputational harm — outdated pricing exposed |
| User PII (email, name) | Confidential | Legal harm — GDPR/CCPA violation |
| Workspace membership | Internal | Reputational harm — org chart exposed |
| Public snapshot content | Public (intentional) | No harm if redaction works correctly |

### Actors and trust boundaries

| Actor | Trust level | Access boundary |
|---|---|---|
| Unauthenticated | None | Public snapshots only (redacted) |
| Viewer (member) | Low | Read-only library within workspace |
| Member | Medium | Read/write library within workspace |
| Admin | High | Read/write library + manage members within workspace |
| Owner | Highest | Full control within workspace |
| Service role (server) | System | Bypasses RLS — must never be used for user requests |
| Attacker | Hostile | Attempts to escalate privileges or exfiltrate data |

### Trust boundaries

1. **Client → Server:** untrusted input (validate everything)
2. **Server → Database:** trusted (RLS enforces per-user access)
3. **Server → Public snapshot:** redaction required (builder-time + runtime)
4. **Workspace A → Workspace B:** zero trust (RLS enforces isolation)
5. **User → Other user's data:** zero trust (RLS enforces per-user access within workspace)

---

## 3. Attack vectors and mitigations

### V-001: Cross-workspace data bleed via cache

- **Vector:** Cache key not scoped to workspace → user in Workspace A sees Workspace B's cached data
- **Severity:** Critical
- **Mitigation:** All cache keys MUST be workspace-scoped: `library:<workspace_id>:<surface>` (per [26](26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md) C-007)
- **Test:** Cache-bleed test in [18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md](18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md)
- **Telemetry:** `cache_bleed_detected` event (assertive)
- **Status:** Mitigated by doc 13 cache key design

### V-002: Privilege escalation via client-side role check

- **Vector:** Client checks role (e.g., `if (user.role === 'admin')`) and attacker bypasses via DevTools
- **Severity:** Critical
- **Mitigation:** All authorization MUST be server-side (RLS + server action checks). Client checks are UX only.
- **Test:** Attempt mutation with viewer role → must fail server-side
- **Telemetry:** `authz_denied` event with user_id, action, workspace_id
- **Status:** Mitigated by doc 14 §35-57

### V-003: Public snapshot contains live trust data

- **Vector:** Public snapshot renders trust chips → attacker sees live pricing freshness
- **Severity:** Medium
- **Mitigation:** Trust chips redacted from public snapshots → "Snapshot verified on {date}" label instead (per [26](26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md) C-012)
- **Test:** Render public snapshot → verify no trust chips, only frozen label
- **Telemetry:** `redaction_regression` event if trust chip appears in public snapshot
- **Status:** Mitigated by doc 11 §184-224 + doc 14

### V-004: IDOR (Insecure Direct Object Reference) via component ID

- **Vector:** User changes `?component=<id>` to another workspace's component ID → sees data
- **Severity:** Critical
- **Mitigation:** RLS enforces component belongs to user's workspace. Server action validates workspace ownership.
- **Test:** Attempt to load component from another workspace → must get 404/403
- **Telemetry:** `idor_attempt` event with user_id, component_id, workspace_id
- **Status:** Mitigated by RLS (doc 14, 33)

### V-005: XSS via component/folder name

- **Vector:** User names component `<script>alert('xss')</script>` → renders in another user's view
- **Severity:** High
- **Mitigation:** React escapes by default. Never use `dangerouslySetInnerHTML`. Sanitize on render.
- **Test:** Create component with script tag → verify it renders as text, not script
- **Telemetry:** `xss_attempt` event if script tag detected in user input
- **Status:** Mitigated by React's default escaping

### V-006: Formula injection via import

- **Vector:** User imports CSV with `=HYPERLINK("evil.com")` formula → opens in Excel as executable
- **Severity:** Medium
- **Mitigation:** Prefix cell with `'` (single quote) for export. Sanitize on import. (per [15](15-INPUT-IMPORT-EXPORT-FILE-HANDLING.md) §60-75)
- **Test:** Import CSV with formula → verify neutralized
- **Telemetry:** `formula_injection_detected` event
- **Status:** Mitigated by doc 15

### V-007: CSRF via server action

- **Vector:** Attacker submits form to Library server action from another origin
- **Severity:** High
- **Mitigation:** Next.js server actions have built-in CSRF protection. Verify origin header.
- **Test:** Attempt server action from wrong origin → must fail
- **Telemetry:** `csrf_attempt` event
- **Status:** Mitigated by Next.js defaults (verify in doc 14)

### V-008: Rate limit bypass on search

- **Vector:** Attacker spams search endpoint to DoS or exfiltrate data via timing
- **Severity:** Medium
- **Mitigation:** Rate limit search RPC (e.g., 10 requests/second per user). Server-side debounce.
- **Test:** Spam 100 searches in 1 second → verify rate-limited
- **Telemetry:** `rate_limit_exceeded` event
- **Status:** To verify in doc 14

### V-009: Snapshot redaction bypass via deep link

- **Vector:** Attacker finds a deep link to a live component (not snapshot) via shared URL
- **Severity:** High
- **Mitigation:** Shared URLs point to snapshots, not live components. Snapshot route verifies redaction.
- **Test:** Attempt to access live component via shared URL → must redirect to snapshot
- **Telemetry:** `snapshot_bypass_attempt` event
- **Status:** Mitigated by doc 14 §114-170

### V-010: Sensitive data in URL params

- **Vector:** Component IDs, folder IDs, or filter state in URL → logged in server logs, browser history, referer headers
- **Severity:** Low
- **Mitigation:** Use route segments (not query params) for IDs. Avoid putting sensitive data in URL.
- **Test:** Verify no sensitive data in URL params
- **Telemetry:** n/a
- **Status:** Mitigated by doc 13 route design

### V-011: Service role key exposure

- **Vector:** Service role key used in client-side code → attacker extracts key and bypasses RLS
- **Severity:** Critical
- **Mitigation:** Service role key NEVER used in client code. Server-only. Verified by build check.
- **Test:** `rg "SERVICE_ROLE" src/ --type ts --type tsx` → must only appear in server-only files
- **Telemetry:** n/a
- **Status:** Mitigated by convention (verify)

### V-012: Telemetry payload contains PII

- **Vector:** Telemetry event includes user email, component name, or other PII
- **Severity:** Medium
- **Mitigation:** Telemetry events use ID-only payloads (per [20](20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md) §55-60). No PII in events.
- **Test:** Audit event payloads → verify no PII
- **Telemetry:** `telemetry_pii_leak` event (meta-monitoring)
- **Status:** Mitigated by doc 20

---

## 4. Abuse cases

### A-001: Bulk scraping via search

- **Scenario:** Attacker uses search to enumerate all components in a workspace
- **Mitigation:** Rate limit search. Workspace membership required. RLS enforces access.
- **Detection:** `search_rate_anomaly` event (>100 searches/minute)

### A-002: Public snapshot enumeration

- **Scenario:** Attacker enumerates snapshot URLs to find un-redacted data
- **Mitigation:** Snapshot URLs are unguessable (UUID). Rate limit snapshot access. Redaction verified per snapshot.
- **Detection:** `snapshot_enumeration_pattern` event (>10 snapshot access/minute from same IP)

### A-003: Folder structure exfiltration via API

- **Scenario:** Attacker uses folder API to map organizational structure
- **Mitigation:** Workspace membership required. RLS enforces. Rate limit.
- **Detection:** `folder_api_anomaly` event

### A-004: Template IP theft via export

- **Scenario:** Member exports all templates and leaves company
- **Mitigation:** Audit log for export. Rate limit export. Post-beta: DLP integration.
- **Detection:** `bulk_export` event (>50 templates exported in one session)

### A-005: Trust metadata manipulation

- **Scenario:** Attacker manipulates trust metadata to make stale pricing look fresh
- **Mitigation:** Trust metadata is server-computed, not client-set. No user input to trust state.
- **Detection:** `trust_state_tamper` event (if client attempts to set trust state)

---

## 5. Security telemetry events

| Event | Trigger | Payload | Severity |
|---|---|---|---|
| `authz_denied` | User attempts action they don't have role for | user_id, action, workspace_id, role | Info |
| `idor_attempt` | User attempts to access resource outside their workspace | user_id, resource_id, workspace_id | Warn |
| `cache_bleed_detected` | Cross-workspace data detected in cache | workspace_a, workspace_b, cache_key | Error |
| `redaction_regression` | Trust chip appears in public snapshot | snapshot_id, component_id | Error |
| `xss_attempt` | Script tag detected in user input | user_id, field, input_snippet | Warn |
| `formula_injection_detected` | Formula detected in import | user_id, field, formula | Warn |
| `csrf_attempt` | Server action called from wrong origin | origin, action, user_id | Warn |
| `rate_limit_exceeded` | User exceeds rate limit | user_id, endpoint, count | Info |
| `snapshot_bypass_attempt` | Attempt to access live component via shared URL | user_id, url, workspace_id | Warn |
| `telemetry_pii_leak` | PII detected in telemetry payload | event_name, field | Error |
| `search_rate_anomaly` | >100 searches/minute | user_id, count, window | Warn |
| `snapshot_enumeration_pattern` | >10 snapshot access/minute from same IP | ip, count, window | Warn |
| `folder_api_anomaly` | Abnormal folder API usage | user_id, pattern | Warn |
| `bulk_export` | >50 templates exported in one session | user_id, count | Warn |
| `trust_state_tamper` | Client attempts to set trust state | user_id, attempted_value | Error |

---

## 6. Per-surface security acceptance criteria

| Surface | Security criterion | Pass condition |
|---|---|---|
| Library overview | RLS enforces workspace isolation | Viewer in WS A cannot see WS B data |
| Component card | IDOR protected | Changing `?component=<id>` to other WS → 404 |
| Component inspector | Authz enforced server-side | Viewer cannot edit (server action rejects) |
| Quick add form | Input validated + sanitized | Script tag in name → escaped, not executed |
| Folder management | RLS + authz | Viewer cannot create/delete folders |
| Template preview | RLS + authz | Viewer cannot insert template |
| Overlay/modal | No sensitive data in DOM | Public snapshot overlay shows redacted data |
| Trust chip | Redacted in public snapshots | Public snapshot shows "verified on {date}" not live trust |
| Search/filter | Rate limited | >10 searches/second → rate limited |
| Dense mode row | Same RLS as sparse mode | No data bleed in dense mode |
| Public snapshot | Fully redacted | No live trust, no PII, no cross-workspace data |
| Export | Rate limited + audited | Bulk export triggers `bulk_export` event |

### Acceptance template (for every actionable row)

```
Security: <criterion> | <test> | <event>
```

Examples:
```
Security: RLS enforced | jsdom + integration test | authz_denied event
Security: IDOR protected | Playwright IDOR test | idor_attempt event
Security: Redaction verified | Playwright snapshot test | redaction_regression event
Security: n/a (no sensitive data in this row)
```

---

## 7. Verification

```bash
# RLS policies exist for all Library tables
rg "CREATE POLICY.*library" supabase/migrations/
# Expected: policies for components, folders, templates

# Service role key not in client code
rg "SERVICE_ROLE" src/ --type ts --type tsx
# Expected: only in server-only files (app/api/, server actions)

# No dangerouslySetInnerHTML in Library components
rg "dangerouslySetInnerHTML" src/components/library/
# Expected: 0 matches

# Rate limiting configured
rg "rateLimit|rate_limit" src/app/library/ src/lib/
# Expected: rate limit middleware for search + export

# Security telemetry events defined
rg "authz_denied|idor_attempt|cache_bleed" src/
# Expected: events emitted in relevant code paths

# Every actionable row has a Security: field
rg "Security:" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/ -g "*.md" --count
# Expected: 26+ files with Security: rows (after Wave 2)
```

---

## 8. Gap closure

### Current state

- Doc 14 defines baseline authz + redaction ✓
- Doc 15 defines formula injection defense ✓
- No full threat model (this doc fills that gap)
- No abuse cases (this doc defines them)
- No security telemetry schema (this doc defines it)
- No per-surface security criteria (this doc defines them)

### Required updates to other docs

- [14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md](14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md): add cross-ref to this doc for full threat model
- [20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md](20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md): add security events from §5
- [18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md](18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md): add security ADV scenarios for each attack vector
- Every doc with actionable rows: add `Security:` field per row

---

## 9. Sign-off

| Reviewer | Verdict | Date | Notes |
|---|---|---|---|
| Security lead | pending | — | — |
| Backend lead | pending | — | — |
| Planning lead | pending | — | — |
| Reviewer gate (Oracle) | pending | — | — |

The security threat model is complete when:
1. Every attack vector in §3 has a mitigation + test + telemetry event.
2. Every abuse case in §4 has a mitigation + detection event.
3. Every surface in §6 has a security pass condition.
4. All four reviewers sign off above.

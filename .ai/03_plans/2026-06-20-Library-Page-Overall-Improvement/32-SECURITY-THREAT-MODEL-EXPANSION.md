# 32 — Security Threat Model Expansion

> **Status:** DRAFT expansion of [14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md](14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md).
> Re-verified 2026-06-21 against the keystone
> [19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md).
> Honest framing: cross-workspace authz is **already strong** (per
> [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §RLS/Authz Primitives),
> so the real open items here are **few and specific** — the un-scoped cache
> key (V-001, OPEN until C-007), **rate limiting not implemented** (V-008,
> Phase-later), the snapshot-builder field-selection audit (V-003), and the
> **security telemetry events being entirely PROPOSED** (§5 — none registered
> in doc 20 yet). Vectors marked "Mitigated by doc 14" are inherited, not
> re-derived here. Sign-offs in §9 are pending. Living document, initialized
> 2026-06-21 by the Ultrawork audit loop. Expands the security threat model
> beyond doc 14 to cover abuse cases, attack vectors, and mitigations specific
> to the Library page.
>
> **Scope:** Threat model, attack vectors, abuse cases, mitigations,
> telemetry for security events, and per-surface security acceptance
> criteria.
>
> **Companion docs:** [14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md](14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md),
> [13-DATA-CONTRACTS-ROUTE-CACHE.md](13-DATA-CONTRACTS-ROUTE-CACHE.md),
> [33-DB-RLS-AND-MIGRATION-CONTRACT.md](33-DB-RLS-AND-MIGRATION-CONTRACT.md),
> [20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md](20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md),
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

Roles are the four-value `workspace_role` enum `owner | admin | member | viewer` (per [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Enums). `viewer` and `member` are DISTINCT enum values — do not conflate them.

| Actor | Trust level | Access boundary |
|---|---|---|
| Unauthenticated | None | Public snapshots only (redacted frozen `snapshot_json`) |
| viewer | Low | Read-only library within workspace (`is_workspace_member` true, `is_workspace_editor` false) |
| member | Medium | Read/write library within workspace (`is_workspace_editor` true) |
| admin | High | Read/write library + manage members within workspace |
| owner | Highest | Full control within workspace |
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

- **Vector:** The ONE un-scoped cache key `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY = ["workspace-component-library"]` (`src/lib/component-library/query-keys.ts:5`) is shared across workspaces → user in Workspace A can read Workspace B's cached data
- **Severity:** Critical
- **Mitigation (C-007 — real resolution, not a new key shape):** Scope `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY` by `workspaceId`, mirroring the already-scoped `workspaceComponentRowsLibraryQueryKey(workspaceId, projectId?)`. The rows-library and templates keys are **already** workspace-scoped (per [19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Query Keys) — do NOT invent a new `library:<workspace_id>:<surface>` convention. The migration MUST touch ALL call sites of the un-scoped key: the symbol itself plus its primary reader `TemplateEditorClient.tsx:160` (which uses the **inline literal** `["workspace-component-library"]`, so a symbol-name grep misses it — it is the same cache entry) and the writers `LibraryPageClient.tsx:126`, `src/hooks/use-estimate-row-mutations.ts:335`, `EstimateSheetContent.tsx:1238/1241`. Missing the editor's inline-literal read at `:160` leaves the bleed open.
- **Test:** Cache-bleed test in [18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md](18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md); cross-workspace isolation is already tested for the rows-library key — replicate that test shape.
- **Telemetry:** `cache_bleed_detected` event (Register in doc 20 — Telemetry lead, Phase 0B-3, EV-TELEMETRY-SEC)
- **Status:** OPEN until C-007 migration lands in [13-DATA-CONTRACTS-ROUTE-CACHE.md](13-DATA-CONTRACTS-ROUTE-CACHE.md) and every call site above is migrated

### V-002: Privilege escalation via client-side role check

- **Vector:** Client checks role (e.g., `if (user.role === 'admin')`) and attacker bypasses via DevTools
- **Severity:** Critical
- **Mitigation:** All authorization MUST be server-side (RLS + server action checks via `rpc("is_workspace_editor", {target_workspace_id})` / `rpc("is_workspace_member", ...)`, already implemented). Client checks are UX only.
- **Test:** Attempt mutation with viewer role → must fail server-side
- **Telemetry:** `authz_denied` event with user_id, action, workspace_id (Register in doc 20 — Telemetry lead, Phase 0B-3, EV-TELEMETRY-SEC)
- **Status:** Mitigated by doc 14 §35-57

### V-003: Public snapshot trust-data exposure

- **Vector (corrected framing per [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Public/Share Snapshot Surface):** the public surface `src/app/share/[token]` + `src/app/api/share/[token]/route.ts` renders a **frozen snapshot** from `project_publications.snapshot_json` (versioned by `snapshot_version`) — it **never** queries `cost_library_items` or `cost_library_item_price_history` live. So there are no "live trust chips" to redact on a live route; the vector is the **snapshot builder** serializing private fields into `snapshot_json`.
- **Severity:** Medium
- **Mitigation:** The snapshot builder must not serialize private trust/pricing fields; trust chips are REDACTED from public/shared snapshots (per [26](26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md) C-012). Public snapshots show "Snapshot verified on {date}" (copy key `trust.public_snapshot.label`). Audit the builder's field selection (not a hypothetical live endpoint) — see [14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md](14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md) §Public/Share Threat Model.
- **Test:** Render public snapshot → verify no live trust chips, only frozen label
- **Telemetry:** `redaction_regression` event if a private field appears in `snapshot_json` (Register in doc 20 — Telemetry lead, Phase 0B-3, EV-TELEMETRY-SEC)
- **Status:** Mitigated by doc 14 snapshot-builder audit (NOT by redacting "live trust chips" — those do not exist on the public route)

### V-004: IDOR (Insecure Direct Object Reference) via component ID

- **Vector:** User changes `?component=<id>` (components-tab inspector selector only, per [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) route-state ruling) to another workspace's component ID → sees data
- **Severity:** Critical
- **Mitigation:** RLS enforces component belongs to user's workspace. Server action validates workspace ownership (`is_workspace_member`).
- **Test:** Attempt to load component from another workspace → must get 404/403
- **Telemetry:** `idor_attempt` event with user_id, resource_id, workspace_id (Register in doc 20 — Telemetry lead, Phase 0B-3, EV-TELEMETRY-SEC)
- **Status:** Mitigated by RLS (doc 14, [33](33-DB-RLS-AND-MIGRATION-CONTRACT.md))

### V-005: XSS via component/folder name

- **Vector:** User names component `<script>alert('xss')</script>` → renders in another user's view
- **Severity:** High
- **Mitigation:** React escapes by default. Never use `dangerouslySetInnerHTML`. Sanitize on render.
- **Test:** Create component with script tag → verify it renders as text, not script
- **Telemetry:** `xss_attempt` event if script tag detected in user input (Register in doc 20 — Telemetry lead, Phase 0B-3, EV-TELEMETRY-SEC)
- **Status:** Mitigated by React's default escaping

### V-006: Formula injection via import

- **Vector:** User imports CSV with `=HYPERLINK("evil.com")` formula → opens in Excel as executable
- **Severity:** Medium
- **Mitigation:** Prefix cell with `'` (single quote) for export. Sanitize on import. (per [15](15-INPUT-IMPORT-EXPORT-FILE-HANDLING.md) §60-75)
- **Test:** Import CSV with formula → verify neutralized
- **Telemetry:** `formula_injection_detected` event (Register in doc 20 — Telemetry lead, Phase 0B-3, EV-TELEMETRY-SEC)
- **Status:** Mitigated by doc 15

### V-007: CSRF via server action

- **Vector:** Attacker submits form to Library server action from another origin
- **Severity:** High
- **Mitigation:** Next.js server actions have built-in CSRF protection. Verify origin header.
- **Test:** Attempt server action from wrong origin → must fail
- **Telemetry:** `csrf_attempt` event (Register in doc 20 — Telemetry lead, Phase 0B-3, EV-TELEMETRY-SEC)
- **Status:** Mitigated by Next.js defaults (verify in doc 14)

### V-008: Rate limit bypass on search

- **Vector:** Attacker spams search to DoS or exfiltrate data via timing. Note: components-tab search/filter is 100% client-side synchronous today (`ComponentLibraryManager.tsx:876-882`, per [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Performance Reality) — there is no search RPC to rate-limit until/unless server search is added (Phase-later).
- **Severity:** Medium
- **Mitigation:** Proposed threshold only (e.g., 10 requests/second per user on a server search RPC) — rate limiting is **not implemented anywhere**; rate-limiting is Postgres-backed (not Redis) per project memory and is Phase-later. State thresholds as **proposed, not enforced**.
- **Test:** N/A today (no server search endpoint). When a server search RPC lands: spam 100 searches in 1 second → verify rate-limited.
- **Telemetry:** `rate_limit_exceeded` event (Register in doc 20 — Telemetry lead, Phase-later, EV-TELEMETRY-SEC)
- **Status:** OPEN — rate limiting is NOT implemented; Phase-later. Telemetry `rate_limit_exceeded` is Phase-later.

### V-009: Snapshot redaction bypass via deep link

- **Vector:** Attacker finds a deep link to a live component (not snapshot) via shared URL
- **Severity:** High
- **Mitigation:** Shared URLs point to snapshots (frozen `snapshot_json`), not live components. Snapshot route verifies redaction.
- **Test:** Attempt to access live component via shared URL → must redirect to snapshot
- **Telemetry:** `snapshot_bypass_attempt` event (Register in doc 20 — Telemetry lead, Phase 0B-3, EV-TELEMETRY-SEC)
- **Status:** Mitigated by doc 14 §114-170

### V-010: Sensitive data in URL params

- **Vector:** Component IDs, folder IDs, or filter state in URL → logged in server logs, browser history, referer headers
- **Severity:** Low
- **Mitigation:** Use route segments (not query params) for IDs. `?component=<id>` is the components-tab inspector selector only; avoid putting sensitive data in URL.
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
- **Telemetry:** `telemetry_pii_leak` event (meta-monitoring) (Register in doc 20 — Telemetry lead, Phase 0B-3, EV-TELEMETRY-SEC)
- **Status:** Mitigated by doc 20

---

## 4. Abuse cases

### A-001: Bulk scraping via search

- **Scenario:** Attacker uses search to enumerate all components in a workspace
- **Mitigation:** Rate limit server search (proposed threshold only — rate limiting is NOT implemented; Phase-later). Workspace membership required. RLS enforces access. (Search is client-side today — V-008.)
- **Detection:** `search_rate_anomaly` event (>100 searches/minute) (Register in doc 20 — Telemetry lead, Phase-later, EV-TELEMETRY-SEC)

### A-002: Public snapshot enumeration

- **Scenario:** Attacker enumerates snapshot URLs to find un-redacted data
- **Mitigation:** Share tokens are **opaque** (`encrypted_token`, hashed via `project_publications_token_hash_idx`) — not "UUID". Rate limit snapshot access (proposed threshold only — not implemented; Phase-later). Redaction verified per snapshot.
- **Detection:** `snapshot_enumeration_pattern` event (>10 snapshot access/minute from same IP) (Register in doc 20 — Telemetry lead, Phase-later, EV-TELEMETRY-SEC)

### A-003: Folder structure exfiltration via API

- **Scenario:** Attacker uses folder API to map organizational structure
- **Mitigation:** Workspace membership required. RLS enforces. Rate limit (proposed threshold only — not implemented; Phase-later).
- **Detection:** `folder_api_anomaly` event (Register in doc 20 — Telemetry lead, Phase-later, EV-TELEMETRY-SEC)

### A-004: Template IP theft via export

- **Scenario:** Member exports all templates and leaves company
- **Mitigation:** Audit log for export. Rate limit export (proposed threshold only — not implemented; Phase-later). Post-beta: DLP integration.
- **Detection:** `bulk_export` event (>50 templates exported in one session) (Register in doc 20 — Telemetry lead, Phase-later, EV-TELEMETRY-SEC)

### A-005: Trust metadata manipulation

- **Scenario:** Attacker manipulates trust metadata to make stale pricing look fresh
- **Mitigation:** Trust metadata is server-computed, not client-set. No user input to trust state.
- **Detection:** `trust_state_tamper` event (if client attempts to set trust state) (Register in doc 20 — Telemetry lead, Phase 0B-3, EV-TELEMETRY-SEC)

---

## 5. Security telemetry events

> **Registration:** none of these events are confirmed to exist in
> [20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md](20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md)
> or the codebase today. Each must be registered in doc 20 (the canonical
> event registry) and implemented before its row is actionable. Reconcile doc
> 20 vs this table into a single registry — do not keep two. The "Register in
> doc 20" status below is the tracked row for that work.

| Event | Trigger | Payload | Severity | Register in doc 20 |
|---|---|---|---|---|
| `authz_denied` | User attempts action they don't have role for | user_id, action, workspace_id, role | Info | Register in doc 20 — Telemetry lead, Phase 0B-3, EV-TELEMETRY-SEC |
| `idor_attempt` | User attempts to access resource outside their workspace | user_id, resource_id, workspace_id | Warn | Register in doc 20 — Telemetry lead, Phase 0B-3, EV-TELEMETRY-SEC |
| `cache_bleed_detected` | Cross-workspace data detected in cache | workspace_a, workspace_b, cache_key | Error | Register in doc 20 — Telemetry lead, Phase 0B-3, EV-TELEMETRY-SEC |
| `redaction_regression` | Private field appears in `snapshot_json` | snapshot_id, component_id | Error | Register in doc 20 — Telemetry lead, Phase 0B-3, EV-TELEMETRY-SEC |
| `xss_attempt` | Script tag detected in user input | user_id, field, input_snippet | Warn | Register in doc 20 — Telemetry lead, Phase 0B-3, EV-TELEMETRY-SEC |
| `formula_injection_detected` | Formula detected in import | user_id, field, formula | Warn | Register in doc 20 — Telemetry lead, Phase 0B-3, EV-TELEMETRY-SEC |
| `csrf_attempt` | Server action called from wrong origin | origin, action, user_id | Warn | Register in doc 20 — Telemetry lead, Phase 0B-3, EV-TELEMETRY-SEC |
| `rate_limit_exceeded` | User exceeds rate limit | user_id, endpoint, count | Info | Register in doc 20 — Telemetry lead, Phase-later, EV-TELEMETRY-SEC (rate limiting not implemented) |
| `snapshot_bypass_attempt` | Attempt to access live component via shared URL | user_id, url, workspace_id | Warn | Register in doc 20 — Telemetry lead, Phase 0B-3, EV-TELEMETRY-SEC |
| `telemetry_pii_leak` | PII detected in telemetry payload | event_name, field | Error | Register in doc 20 — Telemetry lead, Phase 0B-3, EV-TELEMETRY-SEC |
| `search_rate_anomaly` | >100 searches/minute | user_id, count, window | Warn | Register in doc 20 — Telemetry lead, Phase-later, EV-TELEMETRY-SEC |
| `snapshot_enumeration_pattern` | >10 snapshot access/minute from same IP | ip, count, window | Warn | Register in doc 20 — Telemetry lead, Phase-later, EV-TELEMETRY-SEC |
| `folder_api_anomaly` | Abnormal folder API usage | user_id, pattern | Warn | Register in doc 20 — Telemetry lead, Phase-later, EV-TELEMETRY-SEC |
| `bulk_export` | >50 templates exported in one session | user_id, count | Warn | Register in doc 20 — Telemetry lead, Phase-later, EV-TELEMETRY-SEC |
| `trust_state_tamper` | Client attempts to set trust state | user_id, attempted_value | Error | Register in doc 20 — Telemetry lead, Phase 0B-3, EV-TELEMETRY-SEC |

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
| Search/filter | Rate limited (proposed; NOT implemented — V-008) | N/A today (client-side search); when server search lands: >10 searches/second → rate limited |
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

Paths below use the real Library roots per
[19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md)
§Verified File Paths. There is **no** `src/components/library/` and no
`src/app/library/` — earlier drafts cited both; those commands returned "No
such directory" and would have made an engineer wrongly conclude "no
`dangerouslySetInnerHTML`, no rate limiting — all clear".

```bash
# Library roots exist (expect all four)
ls -d src/components/workshop/library/ \
      src/components/workshop/component-library/ \
      src/components/workshop/component-library-manager/ \
      src/app/workshop/library/

# RLS policies exist for all Library tables
rg "CREATE POLICY.*library" supabase/migrations/
# Expected: policies for cost_library_items, library_folders, estimate_templates

# Service role key not in client code
rg "SERVICE_ROLE" src/ --type ts --type tsx
# Expected: only in server-only files (app/api/, server actions)

# No dangerouslySetInnerHTML in Library components (re-run against REAL paths)
rg "dangerouslySetInnerHTML" \
   src/components/workshop/library/ \
   src/components/workshop/component-library/ \
   src/components/workshop/component-library-manager/ \
   src/app/workshop/library/
# Expected: 0 matches (React escapes by default per V-005)

# Rate limiting configured (re-run against REAL paths)
rg "rateLimit|rate_limit" src/app/workshop/library/ src/lib/
# Expected: 0 matches today — rate limiting is NOT implemented (V-008 OPEN, Phase-later). Do NOT expect "rate limit middleware" to be present.

# The un-scoped cache-bleed key is still present until C-007 lands (V-001)
rg -n "WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY = " src/lib/component-library/query-keys.ts
rg -n '"workspace-component-library"' src/components/workshop/library/template-editor/TemplateEditorClient.tsx
# Expected: both present today (the bleed is OPEN until the C-007 migration in V-001 lands).

# Security telemetry events defined (post-registration only)
rg "authz_denied|idor_attempt|cache_bleed" src/
# Expected today: 0 matches — events are PROPOSED, none registered in doc 20 yet (see §5 "Register in doc 20" status).

# Every actionable row has a Security: field
rg "Security:" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/ -g "*.md" --count
# Expected: measured baseline is ~1 pack-wide today (only this doc declares it); the "26+ files" target is aspirational until Wave 2 adds the field per doc.
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

### Required updates to other docs (tracked rows)

| Update | Target doc | Owner | Phase | Evidence |
|---|---|---|---|---|
| Add cross-ref to this doc for full threat model | [14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md](14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md) | Security lead | 0A | EV-SEC-XREF |
| Register all 15 security events from §5 into the canonical event registry (reconcile into a single registry — do not keep two) | [20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md](20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md) | Telemetry lead | 0B-3 / Phase-later | EV-TELEMETRY-SEC |
| Add security ADV scenarios for each attack vector (cache-bleed, IDOR, redaction, snapshot bypass) | [18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md](18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md) | QA lead | 0B-3 | EV-SEC-ADV |
| Add `Security:` field per actionable row | Every doc with actionable rows | Doc owners | 1–5 | per-doc EV |

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

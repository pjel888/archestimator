# 32 — Security Threat Model Expansion

> **Status:** DRAFT expansion of
> [14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md](14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md).
> Re-verified 2026-06-21 against the keystone
> [19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md)
> and the DB/RLS contract
> [33-DB-RLS-AND-MIGRATION-CONTRACT.md](33-DB-RLS-AND-MIGRATION-CONTRACT.md).
> Every RLS policy name, RPC, call-site path:line, and index below is bound to
> real code (verified via `rg`/`fd`). Honest framing: cross-workspace authz is
> **already strong** — the real open items are few and specific (V-001 the
> cache-bleed key, V-003 the snapshot-builder field-selection audit, V-008 the
> missing server-search rate limiter). Security telemetry events in §5 are
> **entirely PROPOSED** — none are registered in doc 20 yet. Sign-offs in §9
> are pending. Living document, initialized 2026-06-21 by the Ultrawork audit
> loop. Expands the security threat model beyond doc 14 to cover abuse cases,
> attack vectors, and mitigations specific to the Library page.
>
> **Scope:** Threat model, attack vectors, abuse cases, mitigations,
> telemetry for security events, and per-surface security acceptance
> criteria. Each **gate row** (an attack vector V-*, an abuse case A-*, a
> per-surface acceptance row in §6) satisfies the 12-dimension template or
> delegates the dimension to its companion doc per
> [34](34-ROW-LEVEL-COMPLETENESS-MATRIX.md) §3 (C-018/C-019/C-020).
>
> **Companion docs:**
> [14](14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md),
> [13](13-DATA-CONTRACTS-ROUTE-CACHE.md),
> [33](33-DB-RLS-AND-MIGRATION-CONTRACT.md),
> [20](20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md),
> [27](27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md),
> [29](29-BROWSER-PROOF-AND-VISUAL-QA-MATRIX.md).

---

## 1. Purpose

Doc 14 defines the baseline authz and data exposure model. This doc expands
it with:

1. **Full threat model** — assets, actors, attack vectors, mitigations (§2–§3).
2. **Abuse cases** — how a malicious user could misuse the Library (§4).
3. **Attack vectors** — specific paths an attacker could exploit, each bound
   to a real surface (file:line) and a real RLS policy name (§3).
4. **Mitigations** — concrete defenses for each vector, citing the migration
   or code path that enforces them.
5. **Security telemetry** — events to emit for security monitoring (§5 — all
   PROPOSED, none registered in doc 20 yet).
6. **Per-surface security acceptance criteria** — pass conditions (§6).

---

## 2. Threat model

### Assets at risk

| Asset | Sensitivity | Impact if exposed | Where it lives |
|---|---|---|---|
| Component pricing data | Confidential | Business harm — competitors see pricing | `cost_library_items.unit_cost`, `misc_cost`, `pricing_date`, `cost_library_item_price_options`, `cost_library_item_price_history` |
| Component cost formulas / lineage | Confidential | Business harm — IP theft | `cost_library_items.metadata`, `cost_library_item_versions`, `source_snapshot` on `estimate_row_items` / `estimate_template_row_items` |
| Folder structure | Internal | Reputational harm — organizational structure exposed | `library_folders` (workspace-scoped) |
| Template definitions | Confidential | Business harm — IP theft | `estimate_templates`, `estimate_template_nodes`, `estimate_template_row_items` |
| Trust/freshness metadata | Internal | Reputational harm — outdated pricing exposed | derived from `cost_library_items.pricing_date` + `pricing_source` (free text) |
| User PII (email, name) | Confidential | Legal harm — GDPR/CCPA violation | `auth.users`, `profiles`, `workspace_members` |
| Workspace membership | Internal | Reputational harm — org chart exposed | `workspace_members` (4 policies, see [33](33-DB-RLS-AND-MIGRATION-CONTRACT.md) §3.2) |
| Public snapshot content | Public (intentional) | No harm IF redaction works | `project_publications.snapshot_json` (frozen, redacted — see V-003) |

### Actors and trust boundaries

Roles are the four-value `workspace_role` enum `owner | admin | member | viewer`
(per [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Enums). `viewer` and
`member` are DISTINCT enum values — do not conflate them. The four authz
primitives are defined in [33](33-DB-RLS-AND-MIGRATION-CONTRACT.md) §3.1:
`is_platform_admin`, `is_workspace_admin`, `is_workspace_editor` (true for
owner+admin+member, NOT viewer), `is_workspace_member` (any membership).

| Actor | Trust level | Access boundary |
|---|---|---|
| Unauthenticated | None | Public snapshots only (redacted frozen `snapshot_json`) |
| `viewer` | Low | Read-only Library within workspace (`is_workspace_member` true, `is_workspace_editor` false) |
| `member` | Medium | Read/write Library within workspace (`is_workspace_editor` true) |
| `admin` | High | Read/write Library + manage members/publications within workspace (`is_workspace_admin` true) |
| `owner` | Highest | Full control within workspace |
| Service role (server) | System | Bypasses RLS — must never be used for user requests |
| Attacker | Hostile | Attempts to escalate privileges or exfiltrate data |

### Trust boundaries

1. **Client → Server:** untrusted input (validate everything server-side).
2. **Server → Database:** trusted (RLS enforces per-user access; see [33](33-DB-RLS-AND-MIGRATION-CONTRACT.md) §3).
3. **Server → Public snapshot:** redaction required (builder-time + runtime).
4. **Workspace A → Workspace B:** zero trust (RLS enforces isolation).
5. **User → Other user's data within a workspace:** zero trust for writes
   (RLS editor-gates); read-isolation within a workspace is INTENTIONAL
   (workspace members see each other's library rows by design — workspace is
   the trust boundary, not the user).

---

## 3. Attack vectors and mitigations

> Each row is a **gate row** (high-risk contract) per
> [34](34-ROW-LEVEL-COMPLETENESS-MATRIX.md) §3. The 12-dimension template is
> inlined at the end of each vector. Informational context (vector
> description, mitigation narrative) precedes the gate-row footer.

### V-001: Cross-workspace data bleed via the un-scoped cache key

- **Vector:** The ONE un-scoped cache key
  `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY = ["workspace-component-library"]`
  (`src/lib/component-library/query-keys.ts:7`) is shared across workspaces →
  a user in Workspace A can read Workspace B's cached data when switching
  workspaces without a cache invalidation.
- **Severity:** Critical.
- **Verified current surface (6 call sites, reconciled with
  [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Query Keys per the
  keystone-bindings-agent pass in
  [LOOP_LEDGER](LOOP_LEDGER.md) §3):**
  1. `src/lib/component-library/query-keys.ts:7` (symbol definition) + `:14` (lite variant).
  2. `src/components/workshop/library/template-editor/TemplateEditorClient.tsx:160` (inline-literal read — a symbol-name grep misses this) + `:166` (self-invalidate via the same inline literal).
  3. `src/components/workshop/LibraryPageClient.tsx:126` (invalidate via symbol).
  4. `src/hooks/use-estimate-row-mutations.ts:432` (invalidate via symbol).
  5. `src/components/workshop/EstimateSheetContent.tsx:1299` + `:1302` (invalidate via symbol; note real path is `src/components/workshop/EstimateSheetContent.tsx`, not `src/components/workshop/estimate-sheet/`).
  6. `src/lib/component-library/actions.ts` (uses the symbol internally).
  Earlier "3 files / 5 sites" drafts were under-counts: a literal-only grep
  misses the symbol-based invalidations at sites 3/4/5. The migration MUST
  touch ALL 6 call sites, especially the editor's inline-literal read at
  `TemplateEditorClient.tsx:160` which a symbol-name grep misses.
- **Mitigation (C-007 — real resolution, not a new key shape):** scope
  `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY` by `workspaceId`, mirroring the
  already-scoped `workspaceComponentRowsLibraryQueryKey(workspaceId,
  projectId?)`. The rows-library and templates keys are **already**
  workspace-scoped (per
  [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Query Keys) — do NOT
  invent a new `library:<workspace_id>:<surface>` convention. The migration
  MUST touch all 6 call sites above.
- **Test:** cache-bleed test in
  [18](18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md); cross-workspace isolation
  is already tested for the rows-library key — replicate that test shape for
  this key.

> **Gate row:** Owner: Security lead · Phase: 0B · Flag: `library_cache_scope`
> (per [21](21-FEATURE-FLAGS-AND-ROLLOUT.md)) · Rollback: redeploy flag=false
> (reverts to un-scoped key; cache-bleed re-opens) · Evidence: EV-0B-CACHE-BLEED ·
> Telemetry: `cache_bleed_detected` · Copy: n/a (silent failure, no UI text) ·
> A11y: n/a · Perf: n/a (cache scoping is O(1)) · Browser-proof: jsdom
> (TanStack Query cache isolation is testable in jsdom) · i18n: n/a ·
> Binding: `src/lib/component-library/query-keys.ts:7,14` +
> `src/components/workshop/library/template-editor/TemplateEditorClient.tsx:160,166` +
> `src/components/workshop/LibraryPageClient.tsx:126` +
> `src/hooks/use-estimate-row-mutations.ts:432` +
> `src/components/workshop/EstimateSheetContent.tsx:1299,1302` +
> `src/lib/component-library/actions.ts`

### V-002: Privilege escalation via client-side role check

- **Vector:** Client checks role (e.g., `if (user.role === 'admin')`) and
  attacker bypasses via DevTools → unauthorized mutation.
- **Severity:** Critical.
- **Mitigation:** all authorization is server-side (RLS + server-action RPC
  guards). The four RLS policies on `cost_library_items` (select for
  members+; insert/update/delete for editors only — see
  [33](33-DB-RLS-AND-MIGRATION-CONTRACT.md) §3.2) and on `library_folders`
  (select for members; insert/update/delete for editors only) enforce this at
  the DB layer. Action-layer RPCs (`is_workspace_editor`,
  `is_workspace_admin`) are defense-in-depth. Client checks are UX only.
- **Test:** attempt mutation with `viewer` role → must fail server-side
  (RLS reject + action RPC reject).
- **Status:** Mitigated by [14](14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md) and
  the policies in [33](33-DB-RLS-AND-MIGRATION-CONTRACT.md) §3.2.

> **Gate row:** Owner: Security lead · Phase: 0B · Flag: n/a (existing) ·
> Rollback: n/a (already enforced) · Evidence: EV-0A-RLS-COMPONENTS ·
> Telemetry: `authz_denied` · Copy: `permission.denied_announcement` ·
> A11y: see [31](31-A11Y-ACCEPTANCE-CRITERIA-MATRIX.md) §denied-states · Perf:
> n/a · Browser-proof: jsdom (server-action reject testable) · i18n: see
> [28](28-I18N-RTL-AND-LOCALIZATION-CONTRACT.md) · Binding:
> `supabase/migrations/20260614144136_command_split_core_public_policies.sql:4-40`
> (cost_library_items) + `20260603235355_harden_library_folder_editor_access.sql:190-205`
> (library_folders)

### V-003: Public snapshot trust-data exposure

- **Vector (corrected framing per
  [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Public/Share Snapshot Surface):**
  the public surface `src/app/share/[token]` + `src/app/api/share/[token]/route.ts`
  renders a **frozen snapshot** from `project_publications.snapshot_json`
  (versioned by `snapshot_version`) — it **never** queries `cost_library_items`
  or `cost_library_item_price_history` live. The vector is the **snapshot
  builder** serializing private fields into `snapshot_json`.
- **Severity:** Medium.
- **Mitigation:** the snapshot builder must not serialize private trust/pricing
  fields. `buildSnapshotForProject` (`src/lib/publication/actions.ts:389`)
  uses an explicit `estimate_row_items` column allowlist (`.from("estimate_row_items")`
  at :415) and **never queries `cost_library_items` /
  `cost_library_item_price_history`**; the public-read sanitizer
  `sanitizeProjectPublicationSnapshotForPublicRead`
  (`src/lib/publication/snapshot.ts:301`) re-derives each public row from a
  fixed allowlist. Per [26](26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md) C-012,
  trust chips are REDACTED from public/shared snapshots; public snapshots
  show "Snapshot verified on {date}" (copy key `trust.public_snapshot.label`).
- **Test:** render a public snapshot → verify no live trust chips, no
  `unitCost`/`miscCost`/`pricing_source` fields in the rendered DOM; only the
  frozen label.
- **Status:** Mitigated by the snapshot-builder field-selection audit (NOT by
  redacting "live trust chips" — those do not exist on the public route).

> **Gate row:** Owner: Security lead · Phase: 0A · Flag: n/a (existing) ·
> Rollback: n/a (already enforced by builder + sanitizer) · Evidence:
> ADV-PUBLIC-REDACTION · Telemetry: `redaction_regression` · Copy:
> `trust.public_snapshot.label` · A11y: n/a · Perf: n/a · Browser-proof:
> Playwright (snapshot render is a browser-only proof — see
> [29](29-BROWSER-PROOF-AND-VISUAL-QA-MATRIX.md)) · i18n: key-based · Binding:
> `src/lib/publication/actions.ts:389-415` + `src/lib/publication/snapshot.ts:301`

### V-004: IDOR (Insecure Direct Object Reference) via component ID

- **Vector:** user changes `?component=<id>` (components-tab inspector
  selector only, per
  [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) route-state ruling) to
  another workspace's component ID → sees data.
- **Severity:** Critical.
- **Mitigation:** RLS enforces the component belongs to the caller's
  workspace via the `cost library items can be read by members and managers`
  policy (U.SING `is_workspace_member(workspace_id)` — see
  [33](33-DB-RLS-AND-MIGRATION-CONTRACT.md) §3.2). Server action
  `loadCurrentWorkspaceComponentLibrary` validates workspace ownership.
- **Test:** attempt to load a component from another workspace → must get
  empty result / 404 (RLS returns 0 rows; the policy does not raise, it
  filters).
- **Status:** Mitigated by RLS ([33](33-DB-RLS-AND-MIGRATION-CONTRACT.md) §3.2).

> **Gate row:** Owner: Security lead · Phase: 0B · Flag: n/a (existing) ·
> Rollback: n/a · Evidence: EV-0A-RLS-COMPONENTS · Telemetry: `idor_attempt` ·
> Copy: `permission.denied_announcement` · A11y: see [31](31-A11Y-ACCEPTANCE-CRITERIA-MATRIX.md)
> §not-found · Perf: n/a · Browser-proof: Playwright (real cross-workspace IDOR
> needs a browser session) · i18n: n/a · Binding:
> `supabase/migrations/20260614144136_command_split_core_public_policies.sql:4-12`
> + `src/lib/component-library/actions.ts` (`loadCurrentWorkspaceComponentLibrary`)

### V-005: XSS via component / folder name

- **Vector:** user names a component `<script>alert('xss')</script>` → renders
  in another member's view.
- **Severity:** High.
- **Mitigation:** React escapes by default. Verified: zero
  `dangerouslySetInnerHTML` in any Library surface
  (`rg "dangerouslySetInnerHTML" src/components/workshop/library/
  src/components/workshop/component-library/
  src/components/workshop/component-library-manager/
  src/app/workshop/library/` → 0 hits). Sanitize on render; never introduce
  `dangerouslySetInnerHTML` for user-supplied text.
- **Test:** create a component with a script tag → verify it renders as text,
  not script.
- **Status:** Mitigated by React's default escaping.

> **Gate row:** Owner: Frontend lead · Phase: 0A · Flag: n/a · Rollback: n/a ·
> Evidence: EV-FRONTEND-08 · Telemetry: `xss_attempt` · Copy: n/a · A11y: n/a ·
> Perf: n/a · Browser-proof: jsdom (Testing Library render of escaped text) ·
> i18n: n/a · Binding: verified absence — `rg "dangerouslySetInnerHTML"`
  against the four Library roots returns 0 hits.

### V-006: Formula injection via import / export

- **Vector:** user imports a CSV with `=HYPERLINK("evil.com")` formula →
  opens in Excel as executable. (Export direction: app writes a formula into
  a cell that executes on open in the recipient's spreadsheet.)
- **Severity:** Medium.
- **Mitigation:** the live export surface is the proposal/publication
  workbook exporter `createProposalWorkbook`
  (`src/lib/proposal-export/create-proposal-workbook.ts`); every data string
  column carries the text number-format `TEXT_FORMAT = "@"` (`:50`, applied
  to columns at `:60-88`) so a cell whose text begins with `=`, `+`, `-`, or
  `@` is written and read as **literal text, never a formula**. Any
  Library-catalog export added later MUST route through the same
  `TEXT_FORMAT` text-cell path. Import direction: bulk import is Phase-later
  (see [15](15-INPUT-IMPORT-EXPORT-FILE-HANDLING.md) §Deferred Import).
- **Test:** `vitest run tests/vitest/proposal-export-formula-safety.test.ts`
  — unsafe formula-like text round-trips as LITERAL TEXT (no leading char
  stripped, no quote-prefix corruption).
- **Status:** Export mitigated by
  [15](15-INPUT-IMPORT-EXPORT-FILE-HANDLING.md) §"CSV/Spreadsheet Formula
  Safety". Import defense is Phase-later (no import route exists today).

> **Gate row:** Owner: Export lane · Phase: 0A/1 (export test executable
  today) · Flag: n/a · Rollback: n/a · Evidence: EV-FRONTEND-08 · Telemetry:
> `formula_injection_detected` · Copy: n/a · A11y: n/a · Perf: n/a ·
> Browser-proof: jsdom (ExcelJS round-trip testable in jsdom) · i18n: n/a ·
> Binding: `src/lib/proposal-export/create-proposal-workbook.ts:50,60-88`

### V-007: CSRF via server action

- **Vector:** attacker submits a form to a Library server action from another
  origin.
- **Severity:** High.
- **Mitigation:** Next.js server actions have built-in CSRF protection
  (origin-header verification). Server actions in
  `src/lib/component-library/actions.ts` are all `"use server"` async fns.
- **Test:** attempt a server action from a wrong origin → must fail.
- **Status:** Mitigated by Next.js defaults.

> **Gate row:** Owner: Backend lead · Phase: 0A · Flag: n/a · Rollback: n/a ·
> Evidence: EV-0A-CSRF · Telemetry: `csrf_attempt` · Copy: n/a · A11y: n/a ·
> Perf: n/a · Browser-proof: Playwright (cross-origin POST needs a real
> browser) · i18n: n/a · Binding: `src/lib/component-library/actions.ts`
> (`"use server"` header)

### V-008: Rate limit absence on a hypothetical server-search RPC

- **Vector:** IF a server-search RPC is added (Phase-later), an attacker
  could spam it to DoS or exfiltrate via timing.
- **Severity:** Medium (LOW today — there is no RPC to attack).
- **Mitigation:** components-tab search/filter is 100% client-side synchronous
  today (`src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:876-882`,
  per [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Performance Reality) —
  there is NO search RPC to rate-limit. Rate limiting IS implemented on the
  SHARE/publication path (`checkProjectPublicationSnapshotRateLimit` at
  `src/lib/publication/public-repository.ts:513`) — but NOT on any Library
  search RPC (none exists). When/if server search lands, rate limiting is
  Postgres-backed (not Redis) per project memory; the threshold is PROPOSED
  (e.g., 10 req/s/user) and Phase-later.
- **Test:** N/A today. When a server-search RPC lands: spam 100 searches in
  1 second → verify rate-limited.
- **Status:** OPEN for the hypothetical search RPC; the publication path is
  already rate-limited.

> **Gate row:** Owner: Backend lead · Phase: Phase-later · Flag: n/a (no RPC
> exists) · Rollback: n/a · Evidence: EV-PHASE-LATER-RATE-LIMIT · Telemetry:
> `rate_limit_exceeded` · Copy: `error.rate_limited` · A11y: see
> [31](31-A11Y-ACCEPTANCE-CRITERIA-MATRIX.md) §error-states · Perf: see
> [30](30-PERF-BUDGET-AND-REGRESSION-GATES.md) · Browser-proof: Playwright ·
> i18n: see [28](28-I18N-RTL-AND-LOCALIZATION-CONTRACT.md) · Binding: today —
> client-side `ComponentLibraryManager.tsx:876-882` (no RPC); Phase-later —
> rate-limit pattern at `src/lib/publication/public-repository.ts:513`

### V-009: Snapshot redaction bypass via deep link

- **Vector:** attacker finds a deep link to a LIVE component (not a snapshot)
  via a shared URL.
- **Severity:** High.
- **Mitigation:** shared URLs point to snapshots (frozen `snapshot_json`),
  not live components. The share route (`src/app/share/[token]`,
  `src/app/api/share/[token]/route.ts`) resolves the token via the
  service-role client (`src/lib/publication/public-repository.ts:132-140`),
  rate-limits (`:513`), and serves the redacted snapshot. There is no live
  library endpoint to bypass to. Tokens are opaque (`encrypted_token` +
  `token_hash` indexed via `project_publications_token_hash_idx` — see
  [33](33-DB-RLS-AND-MIGRATION-CONTRACT.md) §3.2), not enumerable UUIDs.
- **Test:** attempt to access `/workshop/library/components/<other-ws-id>`
  via a shared URL → must redirect to the snapshot or 404.
- **Status:** Mitigated by the route design.

> **Gate row:** Owner: Security lead · Phase: 0B · Flag: n/a (existing) ·
> Rollback: n/a · Evidence: EV-0A-RLS-PUBLICATIONS · Telemetry:
> `snapshot_bypass_attempt` · Copy: `permission.denied_announcement` · A11y:
> n/a · Perf: n/a · Browser-proof: Playwright · i18n: n/a · Binding:
> `src/app/share/[token]/` + `src/app/api/share/[token]/route.ts` +
> `src/lib/publication/public-repository.ts:132-140,513`

### V-010: Sensitive data in URL params

- **Vector:** component IDs, folder IDs, or filter state in URL → logged in
  server logs, browser history, referer headers.
- **Severity:** Low.
- **Mitigation:** use route segments (not query params) for IDs. `?component=<id>`
  is the components-tab inspector selector ONLY (per
  [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) route-state ruling);
  the template detail route is a segment route
  `/workshop/library/templates/[templateId]`. Filter state in URL is
  non-sensitive (taxonomy/freshness).
- **Test:** verify no sensitive data beyond opaque IDs is in URL params.
- **Status:** Mitigated by [13](13-DATA-CONTRACTS-ROUTE-CACHE.md) route design.

> **Gate row:** Owner: Planning lead · Phase: 0B · Flag: n/a · Rollback: n/a ·
> Evidence: EV-0B-ROUTE-STATE · Telemetry: n/a · Copy: n/a · A11y: n/a · Perf:
> n/a · Browser-proof: n/a · i18n: n/a · Binding:
> `src/components/workshop/LibraryPageClient.tsx` (route-state owner for
> `?component=<id>`, per [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md))

### V-011: Service role key exposure

- **Vector:** service role key used in client-side code → attacker extracts
  key and bypasses RLS.
- **Severity:** Critical.
- **Mitigation:** service role key NEVER used in client code; server-only.
  Verified by build convention. The one legitimate use is the share-route
  service-role client (`src/lib/publication/public-repository.ts:132-140`,
  server-only).
- **Test:** `rg "SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE" src/ --type ts --type tsx`
  → must only appear in server-only files (app/api/, lib/* server modules).
- **Status:** Mitigated by convention.

> **Gate row:** Owner: Security lead · Phase: 0A · Flag: n/a · Rollback: n/a ·
> Evidence: EV-0A-SERVICE-ROLE · Telemetry: n/a · Copy: n/a · A11y: n/a ·
> Perf: n/a · Browser-proof: n/a · i18n: n/a · Binding:
> `src/lib/publication/public-repository.ts:132-140` (the one legitimate
> service-role client)

### V-012: Telemetry payload contains PII

- **Vector:** telemetry event includes user email, component name, or other
  PII.
- **Severity:** Medium.
- **Mitigation:** telemetry events use ID-only payloads (per
  [20](20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md) §55-60). No PII in events.
- **Test:** audit event payloads → verify no PII.
- **Status:** Mitigated by [20](20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md).

> **Gate row:** Owner: Telemetry lead · Phase: 0B-3 · Flag: n/a · Rollback:
> n/a · Evidence: EV-TELEMETRY-SEC · Telemetry: `telemetry_pii_leak` · Copy:
> n/a · A11y: n/a · Perf: n/a · Browser-proof: n/a · i18n: n/a · Binding:
> [20](20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md) §55-60 (payload discipline)

### V-013: Price-audit tampering via direct table write

- **Vector:** an authenticated user with table grants tries to rewrite price
  history to hide a discrepancy or fake a "trusted" price.
- **Severity:** High.
- **Mitigation:** `cost_library_item_price_options` and
  `cost_library_item_price_history` are **SELECT-ONLY at the grant layer**
  for `authenticated` (`20260603234326_harden_component_price_audit_grants.sql:23-29`
  revokes INSERT/UPDATE/TRUNCATE/DELETE). Writes go ONLY through the
  security-definer RPC `upsert_cost_library_component_price_option`
  (re-granted execute to `authenticated` only at `:31-33`). This makes the
  price audit trail tamper-evident — a malicious member cannot rewrite it
  even inside their own workspace.
- **Test:** attempt a direct `INSERT INTO cost_library_item_price_history` as
  an authenticated non-admin → must be rejected by the missing grant.
- **Status:** Mitigated by the grant-layer revoke
  ([33](33-DB-RLS-AND-MIGRATION-CONTRACT.md) §3.2).

> **Gate row:** Owner: Security lead · Phase: 0B · Flag: n/a (existing) ·
> Rollback: n/a · Evidence: EV-0A-RLS-PRICE-AUDIT · Telemetry:
> `trust_state_tamper` · Copy: `permission.denied_announcement` · A11y: n/a ·
> Perf: n/a · Browser-proof: n/a · i18n: n/a · Binding:
> `supabase/migrations/20260603234326_harden_component_price_audit_grants.sql:1-36`

### V-014: Bulk-archive preview/execute TOCTOU

- **Vector:** between previewing a bulk-archive and executing it, a row
  changes (added/removed/lifecycle-flipped) such that the user confirms one
  set but a different set is archived.
- **Severity:** High.
- **Mitigation:** the bulk-archive flow is a hash-locked two-phase RPC.
  `preview_bulk_archive_library_components(target_workspace_id,
  target_item_ids, acting_user_id)` (`20260603160000_mass_deletion_governance.sql:323`)
  returns a preview + hash; `execute_bulk_archive_library_components(...,
  expected_preview_hash, ...)` (`:390`) **re-runs the preview and rejects if
  the hash diverges** (`:401`). Both RPCs revoke execute from `public`/`anon`.
- **Test:** between preview and execute, mutate one of the target rows →
  execute must reject with hash mismatch.
- **Status:** Mitigated by the hash-lock discipline
  ([33](33-DB-RLS-AND-MIGRATION-CONTRACT.md) §3.2).

> **Gate row:** Owner: Security lead · Phase: 0B · Flag: n/a (existing) ·
> Rollback: n/a · Evidence: EV-0A-RLS-BULK-ARCHIVE · Telemetry:
> `bulk_archive_hash_mismatch` · Copy: `confirm.bulk_archive_changed` · A11y:
> see [31](31-A11Y-ACCEPTANCE-CRITERIA-MATRIX.md) §destructive-confirmation ·
> Perf: see [30](30-PERF-BUDGET-AND-REGRESSION-GATES.md) · Browser-proof:
> Playwright (two-step UI flow) · i18n: see
> [28](28-I18N-RTL-AND-LOCALIZATION-CONTRACT.md) · Binding:
> `supabase/migrations/20260603160000_mass_deletion_governance.sql:323-464` +
> `src/components/workshop/BulkDestructivePreviewModal.tsx`

---

## 4. Abuse cases

> Abuse-case rows are **informational** under the relaxed scope
> ([34](34-ROW-LEVEL-COMPLETENESS-MATRIX.md) §3) — they delegate to the
> mitigation already bound in §3 and to doc 20 for telemetry. They are NOT
> gate rows; they do not need the inline 12-dim template.

### A-001: Bulk scraping via search

- **Scenario:** attacker uses search to enumerate all components in a workspace.
- **Mitigation:** search is client-side today (V-008); the data is already
  workspace-member-visible. Workspace membership required; RLS enforces
  access. If a server-search RPC lands (Phase-later), rate-limit it.
- **Detection:** `search_rate_anomaly` event (>100 searches/minute) —
  register in [20](20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md), Phase-later,
  EV-TELEMETRY-SEC.

### A-002: Public snapshot enumeration

- **Scenario:** attacker enumerates snapshot URLs to find un-redacted data.
- **Mitigation:** share tokens are **opaque** (`encrypted_token` + `token_hash`,
  not "UUID") — see V-009. Rate-limited on the publication path
  (`src/lib/publication/public-repository.ts:513`). Redaction verified per
  snapshot (V-003).
- **Detection:** `snapshot_enumeration_pattern` event (>10 snapshot
  access/minute from same IP) — register in
  [20](20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md), Phase-later, EV-TELEMETRY-SEC.

### A-003: Folder structure exfiltration via API

- **Scenario:** attacker uses folder API to map organizational structure.
- **Mitigation:** workspace membership required (`members can view library
  folders` policy, [33](33-DB-RLS-AND-MIGRATION-CONTRACT.md) §3.2). Writes
  are editor-only. The structure is workspace-member-visible by design.
- **Detection:** `folder_api_anomaly` event — register in
  [20](20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md), Phase-later, EV-TELEMETRY-SEC.

### A-004: Template IP theft via export

- **Scenario:** member exports all templates and leaves company.
- **Mitigation:** there is **no template-export route today** (Phase-later —
  see [15](15-INPUT-IMPORT-EXPORT-FILE-HANDLING.md) §Deferred Export). When
  one ships: audit-log every export, rate-limit, and consider DLP integration
  post-beta.
- **Detection:** `bulk_export` event (>50 templates exported in one session)
  — register in [20](20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md), Phase-later,
  EV-TELEMETRY-SEC.

### A-005: Trust metadata manipulation

- **Scenario:** attacker manipulates trust metadata to make stale pricing
  look fresh.
- **Mitigation:** trust metadata is server-computed from `pricing_date` +
  `pricing_source`, never client-set. Price mutations go through the RPC
  audit trail (V-013). No user input controls the trust derivation.
- **Detection:** `trust_state_tamper` event (if a client attempts to set
  trust state directly) — register in
  [20](20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md), Phase 0B-3, EV-TELEMETRY-SEC.

---

## 5. Security telemetry events (all PROPOSED)

> **Registration:** none of these events are confirmed to exist in
> [20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md](20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md)
> or the codebase today. Each must be registered in doc 20 (the canonical
> event registry) and implemented before its row is actionable. Reconcile
> doc 20 vs this table into a single registry — do not keep two. The
> "Register in doc 20" status below is the tracked row for that work.

| Event | Trigger | Payload (ID-only) | Severity | Phase | Register in doc 20 |
|---|---|---|---|---|---|
| `authz_denied` | User attempts action their role doesn't permit | `user_id, action, workspace_id, role` | Info | 0B-3 | EV-TELEMETRY-SEC |
| `idor_attempt` | User attempts to access resource outside their workspace | `user_id, resource_id, workspace_id` | Warn | 0B-3 | EV-TELEMETRY-SEC |
| `cache_bleed_detected` | Cross-workspace data detected in cache | `workspace_a, workspace_b, cache_key` | Error | 0B-3 | EV-TELEMETRY-SEC |
| `redaction_regression` | Private field appears in `snapshot_json` | `snapshot_id, component_id` | Error | 0B-3 | EV-TELEMETRY-SEC |
| `xss_attempt` | Script tag detected in user input | `user_id, field, input_hash` | Warn | 0B-3 | EV-TELEMETRY-SEC |
| `formula_injection_detected` | Formula detected in import/export | `user_id, field, direction` | Warn | 0B-3 | EV-TELEMETRY-SEC |
| `csrf_attempt` | Server action called from wrong origin | `origin, action, user_id` | Warn | 0B-3 | EV-TELEMETRY-SEC |
| `rate_limit_exceeded` | User exceeds rate limit | `user_id, endpoint, count` | Info | Phase-later | EV-TELEMETRY-SEC |
| `snapshot_bypass_attempt` | Attempt to access live component via shared URL | `user_id, url, workspace_id` | Warn | 0B-3 | EV-TELEMETRY-SEC |
| `telemetry_pii_leak` | PII detected in telemetry payload | `event_name, field` | Error | 0B-3 | EV-TELEMETRY-SEC |
| `search_rate_anomaly` | >100 searches/minute | `user_id, count, window` | Warn | Phase-later | EV-TELEMETRY-SEC |
| `snapshot_enumeration_pattern` | >10 snapshot access/minute from same IP | `ip_hash, count, window` | Warn | Phase-later | EV-TELEMETRY-SEC |
| `folder_api_anomaly` | Abnormal folder API usage | `user_id, pattern_hash` | Warn | Phase-later | EV-TELEMETRY-SEC |
| `bulk_export` | >50 templates exported in one session | `user_id, count` | Warn | Phase-later | EV-TELEMETRY-SEC |
| `trust_state_tamper` | Client attempts to set trust state | `user_id, attempted_value_hash` | Error | 0B-3 | EV-TELEMETRY-SEC |
| `bulk_archive_hash_mismatch` | Bulk-archive preview/execute hash diverges | `user_id, workspace_id, target_count` | Warn | 0B-3 | EV-TELEMETRY-SEC |

> **PII discipline:** payloads are ID-only or hashed; no free-text user
> content (per [20](20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md) §55-60). Where
> a payload field might contain user input (e.g., an XSS snippet), store a
> hash, not the raw value.

---

## 6. Per-surface security acceptance criteria (gate rows)

| Surface | Security criterion | Pass condition | Gate-row footer |
|---|---|---|---|
| Library overview | RLS enforces workspace isolation | Viewer in WS A cannot see WS B data | Owner: Security lead · Phase: 0A · Flag: n/a · Rollback: n/a · Evidence: EV-0A-RLS-COMPONENTS · Telemetry: `authz_denied` · Copy: n/a · A11y: n/a · Perf: n/a · Browser-proof: jsdom · i18n: n/a · Binding: `20260614144136:4-12` |
| Component card / inspector | IDOR-protected | Changing `?component=<id>` to another WS → empty result | Owner: Security lead · Phase: 0B · Flag: n/a · Rollback: n/a · Evidence: EV-0A-RLS-COMPONENTS · Telemetry: `idor_attempt` · Copy: `permission.denied_announcement` · A11y: see [31](31-A11Y-ACCEPTANCE-CRITERIA-MATRIX.md) §not-found · Perf: n/a · Browser-proof: Playwright · i18n: n/a · Binding: `20260614144136:4-12` |
| Quick add form | Input validated + sanitized | Script tag in name → escaped, not executed | Owner: Frontend lead · Phase: 3 · Flag: `library_quick_add` · Rollback: redeploy flag=false · Evidence: EV-FRONTEND-08 · Telemetry: `xss_attempt` · Copy: see [22](22-COPY-DECK-AND-MICROCOPY.md) §11 · A11y: see [31](31-A11Y-ACCEPTANCE-CRITERIA-MATRIX.md) · Perf: n/a · Browser-proof: jsdom · i18n: see [28](28-I18N-RTL-AND-LOCALIZATION-CONTRACT.md) · Binding: `src/components/workshop/component-library-manager/AddComponentModal.tsx` + `src/components/workshop/component-library/NewComponentForm.tsx` |
| Folder management | Editor-gated writes; member-gated reads | Viewer cannot create/delete/reorder folders | Owner: Security lead · Phase: 0B · Flag: `library_folder_dialogs` · Rollback: redeploy flag=false · Evidence: EV-0A-RLS-FOLDERS · Telemetry: `authz_denied` · Copy: `permission.denied_announcement` · A11y: n/a · Perf: n/a · Browser-proof: jsdom · i18n: n/a · Binding: `20260603235355_harden_library_folder_editor_access.sql:190-214` |
| Template preview | RLS + authz | Viewer cannot insert template | Owner: Security lead · Phase: 0B · Flag: n/a · Rollback: n/a · Evidence: EV-0A-RLS-TEMPLATES · Telemetry: `authz_denied` · Copy: `permission.denied_announcement` · A11y: n/a · Perf: n/a · Browser-proof: jsdom · i18n: n/a · Binding: `20260615145915:40-149` |
| Overlay / modal | No sensitive data in DOM | Public snapshot overlay shows redacted data only | Owner: Security lead · Phase: 0A · Flag: n/a · Rollback: n/a · Evidence: ADV-PUBLIC-REDACTION · Telemetry: `redaction_regression` · Copy: `trust.public_snapshot.label` · A11y: n/a · Perf: n/a · Browser-proof: Playwright · i18n: key-based · Binding: `src/lib/publication/snapshot.ts:301` |
| Trust chip | Redacted in public snapshots | Public snapshot shows "verified on {date}" not live trust | Owner: Security lead · Phase: 0A · Flag: n/a · Rollback: n/a · Evidence: ADV-PUBLIC-REDACTION · Telemetry: `redaction_regression` · Copy: `trust.public_snapshot.label` · A11y: n/a · Perf: n/a · Browser-proof: Playwright · i18n: key-based · Binding: `src/lib/publication/snapshot.ts:301` + `src/lib/publication/actions.ts:389` |
| Search/filter | N/A today (client-side); rate-limited when server search lands | N/A today; Phase-later: >10 req/s → rate-limited | Owner: Backend lead · Phase: Phase-later · Flag: n/a · Rollback: n/a · Evidence: EV-PHASE-LATER-RATE-LIMIT · Telemetry: `rate_limit_exceeded` · Copy: `error.rate_limited` · A11y: n/a · Perf: see [30](30-PERF-BUDGET-AND-REGRESSION-GATES.md) · Browser-proof: Playwright · i18n: see [28](28-I18N-RTL-AND-LOCALIZATION-CONTRACT.md) · Binding: client-side `ComponentLibraryManager.tsx:876-882`; Phase-later RPC TBD |
| Dense mode row | Same RLS as sparse mode | No data bleed in dense mode | Owner: Frontend lead · Phase: 5 · Flag: `library_dense_mode` · Rollback: redeploy flag=false · Evidence: EV-PHASE-5-DENSE · Telemetry: `cache_bleed_detected` · Copy: n/a · A11y: see [31](31-A11Y-ACCEPTANCE-CRITERIA-MATRIX.md) · Perf: see [30](30-PERF-BUDGET-AND-REGRESSION-GATES.md) · Browser-proof: Playwright · i18n: see [28](28-I18N-RTL-AND-LOCALIZATION-CONTRACT.md) · Binding: [33](33-DB-RLS-AND-MIGRATION-CONTRACT.md) §3.2 (same policies for both modes) |
| Public snapshot | Fully redacted | No live trust, no PII, no cross-workspace data | Owner: Security lead · Phase: 0A · Flag: n/a · Rollback: n/a · Evidence: ADV-PUBLIC-REDACTION · Telemetry: `redaction_regression` · Copy: `trust.public_snapshot.label` · A11y: n/a · Perf: n/a · Browser-proof: Playwright · i18n: key-based · Binding: `src/app/share/[token]/` + `src/app/api/share/[token]/route.ts` + `src/lib/publication/public-repository.ts:132-140,513` |
| Bulk archive | Hash-locked two-phase | Preview/execute divergence → reject | Owner: Security lead · Phase: 0B · Flag: n/a · Rollback: n/a · Evidence: EV-0A-RLS-BULK-ARCHIVE · Telemetry: `bulk_archive_hash_mismatch` · Copy: `confirm.bulk_archive_changed` · A11y: see [31](31-A11Y-ACCEPTANCE-CRITERIA-MATRIX.md) §destructive-confirmation · Perf: see [30](30-PERF-BUDGET-AND-REGRESSION-GATES.md) · Browser-proof: Playwright · i18n: see [28](28-I18N-RTL-AND-LOCALIZATION-CONTRACT.md) · Binding: `20260603160000_mass_deletion_governance.sql:323-464` |
| Price audit trail | SELECT-only at grant layer for authenticated | Direct INSERT/UPDATE on price history → rejected by missing grant | Owner: Security lead · Phase: 0B · Flag: n/a · Rollback: n/a · Evidence: EV-0A-RLS-PRICE-AUDIT · Telemetry: `trust_state_tamper` · Copy: `permission.denied_announcement` · A11y: n/a · Perf: n/a · Browser-proof: n/a · i18n: n/a · Binding: `20260603234326_harden_component_price_audit_grants.sql:1-36` |

### Acceptance template

```
Security: <criterion> | <test> | <event>
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

# RLS policies exist for all Library tables (verified names in doc 33 §3.2)
supabase db execute --sql "SELECT tablename, policyname FROM pg_policies WHERE schemaname='public' AND tablename IN ('cost_library_items','library_folders','estimate_templates','estimate_template_nodes','estimate_template_row_items','cost_library_item_price_options','cost_library_item_price_history','project_publications','workspace_members') ORDER BY tablename, policyname"
# Expected: matches doc 33 §3.2 row-for-row; library_folders has the EDITOR-gated 4-policy split.

# Service role key not in client code
rg "SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE" src/ --type ts --type tsx
# Expected: only in server-only files (app/api/, lib/* server modules).

# No dangerouslySetInnerHTML in Library components (verified absence — V-005)
rg "dangerouslySetInnerHTML" \
   src/components/workshop/library/ \
   src/components/workshop/component-library/ \
   src/components/workshop/component-library-manager/ \
   src/app/workshop/library/
# Expected: 0 matches.

# Rate limiting on the publication path (already implemented — V-008 partial)
rg -n "checkProjectPublicationSnapshotRateLimit" src/lib/publication/public-repository.ts
# Expected: hit at :513. (No rate limiting on a Library search RPC — none exists; V-008 is Phase-later.)

# The un-scoped cache-bleed key is still present until C-007 lands (V-001)
rg -n 'WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY = ' src/lib/component-library/query-keys.ts
rg -n '"workspace-component-library"' src/components/workshop/library/template-editor/TemplateEditorClient.tsx
# Expected: both present today (V-001 is OPEN until the C-007 migration).
# Full 6-site reconciliation in doc 19 §Query Keys (verified by keystone-bindings-agent):

# Price-audit tables are SELECT-only for authenticated (V-013)
supabase db execute --sql "SELECT relname, proacl FROM pg_class WHERE relname IN ('cost_library_item_price_options','cost_library_item_price_history')"
# Expected: authenticated has select only.

# Security telemetry events defined (post-registration only)
rg "authz_denied|idor_attempt|cache_bleed_detected|trust_state_tamper|bulk_archive_hash_mismatch" src/
# Expected today: 0 matches — events are PROPOSED, none registered in doc 20 yet (see §5).

# Every actionable row has a Security: field
rg "Security:" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/ -g "*.md" --count
# Expected baseline: this doc + docs that cite this contract; propagation to every gate row is a Phase-later residual per doc 34 §6.
```

---

## 8. Gap closure

### Current state

- Doc 14 defines baseline authz + redaction ✓
- Doc 15 defines formula injection defense ✓
- Doc 33 defines per-table RLS policy contract ✓ (canonical SQL-level facts)
- This doc fills the gap: full threat model + abuse cases + telemetry schema
  + per-surface security criteria ✓

### Required updates to other docs (tracked rows)

| Update | Target doc | Owner | Phase | Evidence |
|---|---|---|---|---|
| Add cross-ref to this doc for full threat model | [14](14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md) | Security lead | 0A | EV-SEC-XREF |
| Register all 16 security events from §5 into the canonical event registry (reconcile into a single registry — do not keep two) | [20](20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md) | Telemetry lead | 0B-3 / Phase-later | EV-TELEMETRY-SEC |
| Add security ADV scenarios for each attack vector (cache-bleed, IDOR, redaction, snapshot bypass, price-audit tamper, bulk-archive TOCTOU) | [18](18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md) | QA lead | 0B-3 | EV-SEC-ADV |
| Add `Security:` field per gate row | Every doc with gate rows | Doc owners | 1–5 | per-doc EV |
| Reconcile the stale cache-bleed call-site citations (LibraryPageClient.tsx:126, use-estimate-row-mutations.ts:335, EstimateSheetContent.tsx:1238/1241) | [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) | Keystone owner | 0A | EV-19-RECONCILE |

---

## 9. Sign-off

| Reviewer | Verdict | Date | Notes |
|---|---|---|---|
| Security lead | pending | — | — |
| Backend lead | pending | — | — |
| Planning lead | pending | — | — |
| Reviewer gate (Oracle) | pending | — | — |

The security threat model is complete when:
1. Every attack vector in §3 has a mitigation bound to a real RLS policy / RPC / code path + test + telemetry event.
2. Every abuse case in §4 has a mitigation + detection event.
3. Every surface in §6 has a security pass condition with the 12-dim template satisfied or delegated.
4. All four reviewers sign off above.

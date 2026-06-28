# 08 — Security, Privacy, and Threat Model

## Trust boundaries

```
┌─────────────────────────────────────────────────────────┐
│ Untrusted browser (attacker controls DOM, URL, cookies?) │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼  (HTTPS only; auth cookie via Supabase SSR)
┌─────────────────────────────────────────────────────────┐
│ Next.js proxy (src/proxy.ts) — auth gate                │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ Server Component + repository (server-only)             │
│  - can_edit_project                                      │
│  - getCurrentWorkspaceProject                            │
│  - RLS on normal reads                                   │
│  - scoped security-definer RPC for collaboration audit    │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ Supabase Postgres + RLS (last line of defense)          │
└─────────────────────────────────────────────────────────┘
```

## Actor model

| Actor | Capability |
|---|---|
| Authenticated workspace member | Can navigate to the route; can edit some projects |
| Authenticated non-member (other workspace) | Must be denied at ownership check |
| Unauthenticated user | Must be redirected by proxy |
| Authenticated user with revoked membership | Must be denied at `can_edit_project` |
| Attacker who stole a session cookie | Has same access as victim; mitigated by Supabase auth best-practices (httpOnly cookies, SameSite) |
| Attacker controlling URL params | Cannot bypass server-side scoping; URL params are validated and bad values are ignored or 404 |

## Threat catalog

### T-01 — Cross-workspace / cross-project access (IDOR)
- **Vector:** Attacker supplies `?actor=<victim_user_id>` or `?client=<victim_recipient_id>` belonging to another project.
- **Mitigation:** Server-side repository enforces `project_id = <this project>` on every source query. URL filter values are only used to filter **within** the already-scoped result set, never to scope it.
- **Test:** Security denial test — request project A's activity with an actor user-id from project B → expect zero rows for that actor, no leakage.

### T-02 — Recipient PII exposure
- **Vector:** `shared_link_comments.author_email` and `shared_link_recipients.email` are PII.
- **Mitigation:** Repository **strips** email fields from outgoing DTOs. Only `display_name` (or fallback `Client`) is sent to the client. The dropdown uses `display_name` as the label and `id` as the value.
- **Test:** DOM test asserts no email appears in rendered HTML for a fixture where the comment row has an `author_email`.

### T-03 — Pagination Route Handler abuse
- **Vector:** Attacker calls the Load more Route Handler directly with another project id, malformed filters, oversized limits, or tampered cursor.
- **Mitigation:** The handler is authenticated, calls the same ownership/edit gate as the page, validates every query param against the same URL-state parser, clamps limit to 50, returns only the display-safe DTO, and sets no cross-user cache headers.
- **Test:** Route Handler denial tests for unauthenticated, unauthorized project, malformed cursor, oversized limit, and cross-project filter ids.

### T-04 — RLS / RPC bypass
- **Vector:** A repository bug that uses `service_role`, directly reads `collaboration_audit_events`, or exposes a security-definer RPC without the correct ownership check.
- **Mitigation:** The repository uses `createSupabaseServerClient()` (authenticated user context), never service role. Normal source tables use RLS. `collaboration_audit_events` remains directly denied and is read only through `read_project_collaboration_audit_events(...)`, which authorizes with `can_edit_project(target_project_id)`.
- **Test:** Code review + assert no `supabaseAdmin`/`serviceRole` import in the new files; migration test verifies direct table access remains denied; local/provider SQL proof verifies authorized RPC success and unauthorized RPC denial.

### T-05 — XSS via activity body
- **Vector:** Client comment `body` or estimate `target_label` could contain HTML.
- **Mitigation:** React escapes all rendered text. **Never** use `dangerouslySetInnerHTML`. The activity body is plain text in the timeline.
- **Test:** Code review (grep for `dangerouslySetInnerHTML` in the new files) + DOM test with an `<script>` fixture.

### T-06 — CSRF
- **Not applicable for v1** — no mutation endpoint.

### T-07 — Information disclosure via error messages
- **Vector:** A 500 with a stack trace could leak DB structure.
- **Mitigation:** Errors are caught in the Server Component and rendered as a generic friendly message. The underlying error is logged server-side only.
- **Test:** Manual + DOM test simulating a Supabase error.

### T-08 — URL-state injection
- **Vector:** Attacker tricks user into clicking a URL with malformed `?scope=` or `?action=`.
- **Mitigation:** URL parsers validate against an allowlist. Unknown values are ignored (fall back to defaults).
- **Test:** DOM test with malformed params.

### T-09 — Cursor tampering
- **Vector:** Attacker modifies the opaque cursor passed to the pagination loader to bypass pagination limits or force expensive scans.
- **Mitigation:** Cursor is a small JSON encoded with base64 + signature OR is internally re-validated as per-source `(created_at: ISO8601, id: UUID)`. Even if tampered, the server limit clamp, RPC authorization, and RLS prevent unbounded or cross-project reads.
- **Test:** Repository + Route Handler tests with malformed cursor → graceful reset to page 1 or 400 with safe error body.

### T-10 — Rate-limit / abuse
- **Vector:** Automated client hammering "Load more".
- **Mitigation:** Hard limit on `limit` (≤ 50 per request). The page is read-only and the cost of each request is bounded. Existing Supabase rate limits apply.
- **Test:** Code review.

### T-11 — Deletion-audit scope confusion
- **Vector:** The user expects "all deletions in this project" but the project-delete audit lives in `mass_deletion_events` (workspace-level), not in `estimate_sheet_events`.
- **Mitigation:** v1 does not surface `mass_deletion_events`. The "Deletions" filter only shows project-scoped deletions (row, node, tab, sheet-level). The empty state copy is honest about scope.
- **Test:** Copy review.

### T-12 — Recipient display-name collision
- **Vector:** Two recipients named "John".
- **Mitigation:** The dropdown disambiguates with non-PII context such as publication title/date or a stable ordinal (`John (June 24 share)` / `John (2)`). Recipient email is never sent to the client DTO. The timeline only shows `display_name`.
- **Test:** DOM test.

## PII / data minimization matrix

| Field | Stored? | Sent to client? | Reason |
|---|---|---|---|
| `profiles.id` | yes | yes (as actor value) | Needed for filter URL |
| `profiles.display_name` | yes | yes (actor label) | User-facing |
| `profiles.email` | yes | **no** | PII minimization; existing convention in `readActorLabels` already prefers display_name |
| `shared_link_recipients.id` | yes | yes (as client value) | Needed for filter URL |
| `shared_link_recipients.display_name` | yes | yes (client label) | User-facing |
| `shared_link_recipients.email` | yes | **no** | PII minimization |
| `shared_link_comments.author_email` | yes | **no** | PII minimization |
| `shared_link_comments.author_name` | yes | yes (fallback if no recipient display_name) | User-facing |
| `shared_link_comments.body` | yes | yes | The comment text |
| `shared_link_responses.decision` | yes | yes | Decision status |
| `shared_link_responses.note` | yes | yes | Client note |
| `shared_link_responses.signer_name` | yes | yes | Signer display name |
| `estimate_sheet_events.payload` / `changed_fields` / `old_snapshot` / `new_snapshot` | yes | yes (rendered as change fields) | Audit detail |
| `estimate_sheet_events.actor_user_id` | yes | yes | Needed for filter |

## Authorization matrix

| Role | Can view the page? | Can view all sources? | Can view all actors? |
|---|---|---|---|
| Workspace owner | Yes | Yes | Yes |
| Project editor | Yes | Yes | Yes |
| Project viewer (read-only) | **No** (permission-denied panel) | — | — |
| Workspace member not on project | **No** (ownership check fails → 404) | — | — |
| Unauthenticated | **No** (proxy redirect) | — | — |

## Secrets handling

- No new env vars for v1.
- No `NEXT_PUBLIC_` additions.
- `service_role` is **never** imported by the new files.
- The collaboration-audit RPC is security-definer but exposes no secret fields and is callable only by `authenticated`.

## Logging safety

- Source-unavailable warnings are logged with a structured label (e.g. `[project-activity] source unavailable: collaboration_audit_events`).
- No PII in logs (no email, no recipient token hash, no actor email).
- Pagination loader errors use safe labels/status codes, not SQL error text.

## CSP and frame behavior

- The page inherits the existing workshop CSP.
- No new frame-ancestors exposure. No new download endpoints.

## Compliance notes

- The page surfaces audit data the workspace already legally holds (per the existing `estimate_sheet_events`, publication, and shared-link audit logs).
- No new data collection.
- No new tracking. No new analytics events required for v1.

## Security testing expectations

- Vitest denial tests (T-01, T-08, T-09).
- DOM tests (T-02, T-05, T-07).
- Code review checklist (T-03, T-04, T-06, T-10, T-11, T-12).

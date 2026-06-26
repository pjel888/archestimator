# 27 — Threat Model

> Closes the audit-prompt gap: "Authentication, authorization, privacy, and security threats" with formal STRIDE per surface.
> Builds on [15-SECURITY-AND-INTEGRITY-AUDIT.md](./15-SECURITY-AND-INTEGRITY-AUDIT.md) (controls inventory) and feeds [22-RISK-REGISTER.md](./22-RISK-REGISTER.md) RR-18 (RLS verification).

## Scope

The Estimate Sheet Right Sidebar surface: dynamic-imported `EstimateRightSidebar` component, its server actions in `src/lib/component-library/actions.ts` and `src/lib/reusable-sources/actions.ts`, the upload routes `/api/component-library/images` and `/api/component-library/attachments`, and the RPCs they invoke.

## Assets

| Asset | Sensitivity | Where |
|---|---|---|
| Component cost data (price, supplier, variant) | Confidential (workspace-scoped business data) | `cost_library_items`, `cost_library_item_price_options`, `cost_library_item_variant_cost_entries` |
| Component attachments (PDF, XLS) | Confidential | Storage bucket + `variant_attachments` |
| Component images | Confidential (could reveal supplier/brand) | Storage bucket + image URLs |
| Estimate template content | Confidential | `estimate_templates`, `estimate_template_nodes`, `estimate_template_row_items` |
| Estimate tree (current project) | Confidential | `estimate_nodes`, `estimate_row_items` |
| Other projects' estimate trees (reusable sources) | Confidential | Same tables, RLS-enforced scoping |
| User session | High — auth credentials | Supabase Auth session cookie |
| User preferences (favorites, recents, ordering) | Low — device-local | Browser localStorage |
| Audit trail | Integrity-critical | `estimate_sheet_events`, `library_telemetry_events` |

## Threat agents

| Agent | Capability | Motivation |
|---|---|---|
| Authenticated user from another workspace | Valid session, attempts cross-workspace access via direct RPC calls | Curiosity, competitive intelligence, accidental |
| Authenticated user with read-only role on target workspace | Valid session, attempts to mutate | Accidental (UI bug), curiosity |
| Authenticated user with editor role on target workspace | Valid session, attempts quota bypass or unauthorized schema access | Misuse, abuse |
| Malicious client (script in browser, no valid session) | Direct RPC invocation attempts | Probe, exploit |
| Man-in-the-middle (MITM) | Network interception (mitigated by TLS) | Eavesdrop, tamper |
| Compromised collaborator device | Stolen session cookie | Lateral movement |
| Insider (Eng with prod DB access) | Direct DB access (out of scope) | Out of scope |

## STRIDE per surface

### Library tab — Component CRUD

| Threat | Surface | Current controls | Residual risk | Recommended |
|---|---|---|---|---|
| **S**poofing | Component create via `createCostLibraryComponent` | Supabase Auth session required (`requireCurrentUserContext`) | Low | None |
| **T**ampering | Component edit | `assertCanManageLibrary` (RPC `is_workspace_editor`) | Low | Phase 1 Task 1.2 wires Edit through modal which preserves this guard |
| **R**epudiation | Bulk archive | `recordLibraryEvent` audit + `correlation_id` | Low | Phase 1 archive events added in observability plan |
| **I**nformation disclosure | Component read | RLS on `cost_library_items` (verification pending — RR-18) | Medium | Verify RLS; document |
| **D**enial of service | Quota bypass | `LIBRARY_COMPONENT_CAP = 10,000` checked in action | Low (race-acceptable) | Accepted; see RR-22 |
| **E**levation of privilege | Cross-workspace component creation | RPC receives `target_workspace_id`, RLS blocks cross-workspace | Low | None |

### Library tab — Folder CRUD

| Threat | Surface | Current controls | Residual risk | Recommended |
|---|---|---|---|---|
| **T**ampering | Folder create/rename/reorder | `assertCanManageLibraryFolders` | Low | None |
| **I**nformation disclosure | Folder read | RLS on `library_folders` (verification pending — RR-18) | Medium | Verify RLS |
| **E**oP | Folder delete (Phase 2 Task 2.2 adds this) | Will reuse `deleteLibraryFolder` RPC with `target_workspace_id` | Low | Add RLS verify before Phase 2 |

### Project tab — Projection

| Threat | Surface | Current controls | Residual risk | Recommended |
|---|---|---|---|---|
| **I**nformation disclosure | Projection derives from `estimate_row_items` | RLS on estimate tables enforces project membership | Low (relies on RLS) | Verify RLS |
| **T**ampering | (Read-only by design — no mutate surface) | N/A | None | None |

### Templates tab — Template CRUD

| Threat | Surface | Current controls | Residual risk | Recommended |
|---|---|---|---|---|
| **S**poofing | Template create | `requireCurrentUserContext` + `assertCanManageLibrary` + `assertCanPublishEstimateTemplateFromEstimate` | Low | None |
| **T**ampering | Template rename/delete | `assertCanManageLibrary` | Low | None |
| **I**nformation disclosure | Template browse | RLS on `estimate_templates` (workspace-scoped) | Low | Verify RLS |
| **D**oS | Quota | `LIBRARY_TEMPLATE_CAP = 2,000` | Low | None |
| **R**epudiation | Template create / delete | `recordLibraryEvent` | Low | None |

### Reusable project sources — Browse + Insert

| Threat | Surface | Current controls | Residual risk | Recommended |
|---|---|---|---|---|
| **I**nformation disclosure | Cross-project source browse | RLS-enforced user client; only accessible projects returned | Low | Verify RLS on `estimate_nodes`, `estimate_tabs`, `estimate_row_items` |
| **T**ampering | Source insert into target estimate | RPC `insert_estimate_subtree_into_estimate_with_history` re-reads source under RLS client; re-checks `can_edit_estimate` for target | Low | None — strong defense-in-depth |
| **R**epudiation | Source insert | Deterministic `correlation_id` (SHA-256-derived) for replay-safe dedup | Low | None |
| **E**oP | Direct RPC invocation with arbitrary source ids | Source re-read under RLS client throws "no longer available" if access denied | Low | None — verified in doc 09 |

### Insertion / drag-drop / bulk

| Threat | Surface | Current controls | Residual risk | Recommended |
|---|---|---|---|---|
| **T**ampering | Drag payload injection | Payload readers (`readEstimateTemplateDragPayload`, `readProjectSourceDragPayload`) validate structure; server re-validates | Low | None |
| **T**ampering | Cross-workspace drag payload | Server actions validate source ids under RLS client | Low | None |
| **I**nformation disclosure | Drag payload contents | Payloads contain only ids (no PII); rendered UI is workspace-scoped | Low | None |

### File uploads (images, attachments)

| Threat | Surface | Current controls | Residual risk | Recommended |
|---|---|---|---|---|
| **T**ampering | Path traversal in upload route | `normalizeComponentImageRouteUrl` rejects `..`, `\`, `#`, encoded traversal; 12 test cases verified | Low | None |
| **T**ampering | MIME type spoofing | Client-side MIME check (`ALLOWED_UPLOAD_TYPES`); server-side MIME verification pending — RR-18 | Medium | Add server-side MIME verification; do not trust client |
| **I**nformation disclosure | File content leakage across workspaces | Storage bucket path includes workspace id; RLS on bucket pending verification — RR-18 | Medium | Verify bucket RLS |
| **D**oS | Large file upload | Client-side size cap (20MB); server-side cap pending verification | Medium | Add server-side Content-Length enforcement |
| **S**poofing | Unauthenticated upload | Route requires auth (verify in route handler — RR-18) | Low-Medium | Verify |

### URL handling

| Threat | Surface | Current controls | Residual risk | Recommended |
|---|---|---|---|---|
| **T**ampering (Stored XSS via URL) | Component source URL | `sanitizeComponentSourceUrl` blocks `javascript:`, `data:` schemes; test coverage verified | Low | None |
| **T**ampering (Stored XSS via image URL) | Component image URL | `normalizeEstimateRowImageUrl` + `normalizeComponentImageRouteUrl` sanitize | Low | None |
| **I**nformation disclosure | External image leak via Referer | External images use `rel="noreferrer"` on anchor; image tags need verification | Low | Add `referrerPolicy="no-referrer"` to external `<img>` tags |

### Telemetry

| Threat | Surface | Current controls | Residual risk | Recommended |
|---|---|---|---|---|
| **I**nformation disclosure | PII in telemetry | `recordLibraryEvent` allow-list + `UNSAFE_TELEMETRY_STRING_PATTERN` scan + 120-char cap | Low | None |
| **I**nformation disclosure | URL/path leakage in telemetry | Same controls drop URL/path patterns | Low | None |

### Panel shell + persistence

| Threat | Surface | Current controls | Residual risk | Recommended |
|---|---|---|---|---|
| **I**nformation disclosure | Width / collapse state in cookie + localStorage | No sensitive data in panel state | Low | None |
| **T**ampering | Cookie tampering (width) | Cookie is non-security context; tampering only affects layout | Low | None |

## Highest-priority open threats

1. **RR-18: RLS not verified on 8 sidebar tables** — every "Information disclosure" row above depends on RLS being enabled. If any of these tables lacks RLS, cross-workspace leakage is possible. **Mitigation**: run `rg "ENABLE ROW LEVEL SECURITY" supabase/migrations/` and remediate any gap before Phase 1 ships.
2. **Server-side MIME / size enforcement on upload routes** — client-side checks are bypassable. **Mitigation**: verify route handlers enforce MIME and Content-Length server-side.
3. **Storage bucket RLS for images and attachments** — verify the storage bucket policies require workspace membership.
4. **External image Referer leakage** — add `referrerPolicy="no-referrer"` to external image tags.

## Defense-in-depth summary

| Layer | Mechanism |
|---|---|
| Network | TLS (Vercel default), CSP (Report-Only) |
| Auth | Supabase Auth session cookie, `requireCurrentUserContext` on every server action |
| Client gating | CRUD affordances hidden for read-only users |
| Server authorization | `is_workspace_editor`, `can_edit_estimate`, `can_edit_project` RPC guards |
| Database | RLS on user-data tables (verify RR-18) |
| RPC | SECURITY DEFINER only where necessary; most RPCs are INVOKER |
| Input validation | Server-action input validators (`assertQuickAddComponentInput`, `normalizePriceOptionInput`) |
| Output sanitization | React default escaping; URL sanitization for `javascript:` schemes |
| Telemetry sanitization | `recordLibraryEvent` allow-list + pattern scan |

## Out of scope

- Phishing, social engineering against users.
- Infrastructure-level attacks (Vercel account compromise, Supabase account compromise).
- Insider threats (Eng with prod access — covered by separate ops policy).
- Side-channel attacks (timing, power) — not relevant for this B2B SaaS context.

## Revisiting

- Threat model revisited at each release milestone.
- New finding → add row to STRIDE table, add risk to [22-RISK-REGISTER.md](./22-RISK-REGISTER.md).
- New RPC → add threat row covering spoofing/tampering/repudiation/information-disclosure/elevation.

# 08 — Security, Privacy, and Threat Model

This plan introduces **no new trust boundaries, no new public surfaces, no new auth paths, no schema changes, and no new network contracts**. Security scope is therefore narrow: confirm existing controls still hold for the new empty-state CTAs, and enforce analytics redaction.

## Trust boundaries (unchanged)

- **Public** (landing, login, signup, invite, share) — outside `/workshop`.
- **Authenticated workspace** (`/workshop/**`) — behind the proxy gate (`lib/auth/request-proxy.ts:130`, `PROTECTED_PREFIXES=["/workshop"]`) + layout gate (`app/workshop/layout.tsx:23`).
- **Server Action layer** — `requireAuth` + workspace scoping (`getCurrentWorkspaceProject`, `assertCanEditProject`).

## Actor roles (unchanged)

- **Owner / member** of a workspace — can create projects/estimates (`canEditProject===true`, `canCreateEstimates===true`).
- **Read-only collaborator** — `canEditProject===false`; CTAs hidden (AC-02c/03b/04d), actions assert-can-edit as backstop.
- **Anonymous** — redirected to `/login?next=…` by proxy.

## Threat model (start-path-relevant)

| Threat | Surface | Control | Status |
|---|---|---|---|
| Unauthorized project/estimate create | start CTAs | CTA disabled when `!canCreate*`; Server Action asserts `requireAuth` + `assertCanEditProject` | Preserved (no new action) |
| Cross-tenant (IDOR) create | create actions | `getCurrentWorkspaceProject` scopes projectId to caller's workspace | Preserved |
| Client-side bypass of CTA gating | empty states | UI hiding is convenience; Server Actions are the enforcement (deny at action layer) | Preserved — no action trusts UI alone |
| PII leak via analytics | FR-06 events | Redaction: no names/clients in events (SEC-02); test asserts | **New control** (this plan) |
| XSS via empty-state copy | empty states | Copy is static literals (no user input rendered); no `dangerouslySetInnerHTML` | Safe by construction |
| CSRF on create | create actions | Better Auth same-site session; Server Actions | Preserved |
| Open redirect | n/a | No new redirects | n/a |

## Input validation (unchanged)

- `NewProjectForm` validates `name` client-side (`:266`); server normalizes the rest. No change.
- `createEstimateSheetDraft` accepts optional `{ name? }`; server auto-generates if absent. No change.

## Analytics & privacy (FR-06)

- Events: `project_created`, `estimate_started`, `estimate_first_area_added`, `estimate_first_row_added`.
- **Payload:** workspace id (or a workspace-scoped hash), boolean "first" flags, counts. **No** project/estimate/client names, no locations, no emails.
- "First" semantics computed from counts server-side (e.g. `countProjectEstimateSheetsForProject===0` pre-create) to avoid stale-client false positives.
- Redaction verified by a unit test (`start-path-activation-events.test.ts`) that asserts no name/client fields appear in emitted events.

## Credential material taxonomy

**Not applicable.** This plan introduces no credentials, tokens, cookies, share links, or session changes.

## Security testing

- No new auth/security test needed beyond the redaction test (SEC-02) and confirming existing denial tests still pass (read-only collaborator CTA-hidden behavior).
- Existing `assertCanEditProject` / `canEditProjectInD1` denial paths unchanged.

## Residual risk

- Low. The only new client-rendered affordances are empty-state CTAs that call already-authorized Server Actions. Enforcement remains server-side.
- Analytics redaction is the one new control; residual risk = a future event accidentally adding a PII field — mitigated by the redaction test + code review.

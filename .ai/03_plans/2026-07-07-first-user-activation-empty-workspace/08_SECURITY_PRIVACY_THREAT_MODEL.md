# 08 — Security, Privacy, and Threat Model

## 8.1 Trust boundaries and actors

| Boundary | Crossing | Control |
|---|---|---|
| Internet → Worker | Public request to `/workshop` or a Server Action | `src/proxy.ts` → `request-proxy.ts`; Better Auth session cookie; closed-beta allowlist; terms gate |
| Worker → D1 | Milestone read/write, activation event log | Existing D1 app-authorization (workspace membership) |
| Server Action → Client | Mutation result DTO | Existing DTO minimization; activation adds no new sensitive fields to DTOs |

Actors: closed-beta creator (workspace `owner`), invited collaborator (`editor`/`viewer`), platform admin/CEO (`ceo`/`admin`). Activation surfaces target the creator/owner; collaborators are addressed in `OPEN-DEC-02`.

## 8.2 Threat model (activation-specific)

| ID | Threat | Surface | Mitigation | Proof |
|---|---|---|---|---|
| SEC-T1 | Cross-workspace milestone read/enumeration | `getMilestones(workspaceId)` | Pass caller's authorized `workspaceId` from session context, never from client input; reuse existing homebase workspace-membership authz | Denial test: caller A queries B's workspace → empty/deny |
| SEC-T2 | Milestone write by non-member | `markMilestone` inline in Server Actions | Inherits the action's existing authz (`canEditWorkspaceContentRole` etc.); never callable directly from client | Denial test: non-member invoke → D1 authz deny |
| SEC-T3 | Activation event leaks PII (email, raw tokens, project names) | `emitActivationEvent` | Payload schema allows only: `workspace_id`, `user_id` (app id, not email), `event_type`, `milestone_first`, `source`, `ts`. Redaction via existing `src/lib/observability/redact`. No free-form strings. | Schema unit test + redaction test |
| SEC-T4 | Server Action direct POST bypassing the UI CTA | `createProjectRecord` etc. | Already authz-protected; activation emits the same event regardless of `source`. `source` is informational, not a trust switch. | Existing action tests + new emit-on-direct-invoke test |
| SEC-T5 | Opt-in sample project escapes workspace authz | Sample seed path (OPEN-DEC-01) | Sample rows inserted under the caller's `workspace_id` with `project_members` `owner` = caller; governed by identical D1 authz | Denial test: sample project visible only to workspace members (BLOCKED-EXTERNAL until OPEN-DEC-01) |
| SEC-T6 | Dismiss control spoofing | `welcome_dismissed_at` write | Dismiss is a Server Action (or inline in an existing one) gated by workspace-member authz; client cannot write D1 directly | Test: anonymous dismiss invoke → deny |
| SEC-T7 | Enumeration of milestone timestamps via timing | Milestone read | Single-row PK lookup; no per-user timing side channel of consequence | n/a (single-row) |
| SEC-T8 | Event-log injection / log forging | `emitActivationEvent` | Typed enum fields only; no client-supplied free text in the event body | Schema test rejects unknown fields |

## 8.3 Input validation

- All milestone column writes are server-derived (`excluded.<col>` = server timestamp), not client-supplied.
- `source` is an enum (`"welcome" | "projects_empty" | "toolbar" | "library_empty" | "publisher_empty" | null`); validated server-side before emit.
- No new client-supplied string enters D1 or logs via activation.

## 8.4 Credential material taxonomy

Activation introduces **no new credentials**. It does not mint tokens, set cookies, or handle raw/share/password material. The terminal rung (`createProjectPublication`) reuses the existing publication token/password machinery (`0014_publication_shared_links.sql`, scrypt hashing, encrypted tokens) unchanged — see `src/lib/publication/security.ts`. The shared-link password lockout hardening (5-attempt/1-hour window, per current-state) is inherited as-is.

| Material | Status | Note |
|---|---|---|
| Publication token / password hash | Unchanged (existing) | Not touched by activation |
| Session cookie | Unchanged | Activation reads identity via existing session context |
| Activation event payload | New, non-secret | Workspace/user ids only; redacted |

## 8.5 Abuse / rate-limiting

- No new abuse surface: activation emits are bounded by the rate of existing mutations (project/estimate/area/publication create), each already covered by existing limits where relevant.
- The terminal export already has `checkProposalExportRateLimit`.
- Closed-beta entry is allowlist-gated, so the activation funnel population is bounded by the allowlist size.

## 8.6 Privacy

- Data minimization: milestones store timestamps only — no content, no PII.
- Activation events store workspace/user ids the app already handles; no new PII.
- No new data leaves the Worker/observability boundary (no third-party SDK in `/workshop` for closed beta).
- Consent: existing cookie-consent gate covers landing analytics only; activation events are operational/first-party telemetry (server logs), not advertising — consistent with the closed-beta posture. If/when a richer analytics SDK is added (OPEN-DEC-02), it must be consent-gated and reviewed separately.

## 8.7 Security testing expectations

- Cross-workspace denial test (SEC-T1).
- Non-member write denial test (SEC-T2).
- Event payload schema + redaction test (SEC-T3, SEC-T8).
- Direct-invoke still emits + authz-deny for non-member (SEC-T4).
- (If OPEN-DEC-01 accepted) sample-project authz denial test (SEC-T5).

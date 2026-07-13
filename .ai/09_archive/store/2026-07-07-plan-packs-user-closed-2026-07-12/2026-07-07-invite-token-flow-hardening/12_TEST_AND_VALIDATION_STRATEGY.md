# Test and Validation Strategy

**Policy (AGENTS.md):** Choose the lightest proof that actually proves the claim. Origin/CSRF changes are server behavior → unit tests + curl. Revoke UI is a new interactive element → DOM/a11y tests + targeted keyboard proof on preview. Non-regression gates → existing invite test suite. Security denial → role-matrix + denial tests.

## 1. Test layers and commands

| Layer | Command (focused) | Purpose |
|---|---|---|
| Unit (domain logic) | `bun run test -- invite-origin` | Origin helper policy |
| Unit (D1 store) | `bun run test -- collaboration-invitation-d1-store` | Resolve/accept/revoke/wrong-account/replay |
| Unit (actions) | `bun run test -- project-collaboration-actions` | Invite/create/resend/copy/revoke |
| Unit (feature flag) | `bun run test -- project-invite-feature-flag` | Disabled-flag fail-closed |
| Unit (schema) | `bun run test -- project-invite-entry-schema` | No raw-token column, one-active-token, materialized expiry |
| DOM (route contract) | `bun run test -- project-invite-entry-route` | Terminal states, preview, wrong-account |
| DOM (pending invite) | `bun run test -- workshop-pending-invite` | Bridge consumption, banners, accept-by-id |
| DOM (revoke UI) | `bun run test -- publisher-revoke-invite` (new) | Button, dialog, keyboard, a11y |
| Migration | `bun run test -- migration-0038` (new) | Additive column, rollback |
| Hosted proof | `bun run test -- collaboration-invitation-proof-script` | End-to-end D1 invariants (extend for revoke) |
| Type/lint | `bun run type-check && bun run lint` | Compile-time + design-system lint |
| Build | `bun run build` | Bundle-size delta (PERF-02) |
| Manual/curl | preview deploy | No-header POST → 403; FR-03 signed-out flow |

Broad `bun run validate` / `bun run build` reserved for release-gate (P6) per AGENTS.md iteration bias.

## 2. Proof-contract ledger (mandated 10-column format)

Per the Improve directive §11, every planned proof is a row with: `Proof ID | Requirement IDs | Implementation unit | Layer | Fixture/input | Assertion | File target | Command/evidence | Red/green expectation | Cleanup/skip rule`.

| Proof ID | Requirement IDs | Implementation unit | Layer | Fixture/input | Assertion | File target | Command/evidence | Red/green expectation | Cleanup/skip rule |
|---|---|---|---|---|---|---|---|---|---|
| PC-01 | SEC-01, ARCH-01 | P1-T1 (origin tighten) | Unit | mock `Request` with no Origin/Referer (prod env), cross-host Origin, same-host Origin, dev env, kill-switch off | no-header→403 in prod; cross-host→403; same-host→pass; dev→pass; kill-switch off→pass | `tests/vitest/invite-accept-origin.test.ts` (extend) | `bun run test -- invite-accept-origin` | Red before P1-T1 (no-header passes today); green after | none |
| PC-02 | SEC-02 | P1-T2 (continue guard + form-POST CTA) | Unit + DOM | mock `Request` no Origin/Referer (prod), cross-host, same-host form POST; DOM: rendered CTA is `<form method="post">` | POST no-header→403, no cookie; cross-host→403; same-host→cookie set; DOM: CTA is form not anchor | `tests/vitest/invite-continue-origin.test.ts` (new) + `tests/vitest/project-invite-entry-route.test.ts` (DOM extend) | `bun run test -- invite-continue-origin project-invite-entry-route` | Red before (no-header mints cookie today); green after | none |
| PC-03 | SEC-03 | (non-regression) | Unit | bridge cookie fixtures (valid, tampered, expired) | hash-only payload; HMAC tamper→null; >30min→null | `tests/vitest/pending-invite-cookie.test.ts` (existing) | `bun run test -- pending-invite-cookie` | Green throughout (non-regression) | none |
| PC-04 | SEC-04 | P1-T4 (cookie attrs) | Unit/DOM | mock sign-out response; mock pending-invite-action call | `Set-Cookie` for both session cookies has `HttpOnly; Secure(prod); SameSite=Lax; Path=/; Max-Age=0` | `tests/vitest/project-invite-sign-out-route.test.ts` + `tests/vitest/workshop-pending-invite.test.tsx` (extend) | `bun run test -- sign-out workshop-pending-invite` | Red before (only `Max-Age=0; Path=/` today); green after | none |
| PC-05 | SEC-05, SEC-14 | P2-T1 (continue disabled short-circuit) | Unit | `PROJECT_INVITE_ENTRY_ENABLED!='true'` env; POST /continue | continue sets NO cookie + redirects to invite; resolve renders disabled (non-regression); accept redirects to /workshop (non-regression) | `tests/vitest/project-invite-feature-flag.test.ts` (extend) | `bun run test -- project-invite-feature-flag` | Red before (continue mints cookie when disabled); green after | none |
| PC-06 | SEC-06 | (static gate) | Static | changed source files + this plan folder | no base64url 32+ char live tokens; revoke audit uses `token_hint` not raw | changed files (rg scan) | `rg -n '[A-Za-z0-9_-]{43,}' src/ .ai/03_plans/2026-07-07-invite-token-flow-hardening/` | Green (no live tokens) | skip if no source changes yet |
| PC-07 | SEC-07, SEC-15, FR-01, ARCH-03 | P3-T2/T3 (revoke action+RPC) | Unit + Repository | D1 fixture: pending invitation; non-manager actor; cross-workspace invitationId; already-terminal invitation | manager→revoked+lifecycle+tokens+audit; non-manager→deny; cross-workspace→deny; already-terminal→no-op | `tests/vitest/project-collaboration-revoke-invitation.test.ts` (new) + `tests/vitest/collaboration-invitation-d1-store.test.ts` (extend) | `bun run test -- revoke-invitation collaboration-invitation-d1-store` | Red before (no revoke action); green after | D1 fixture cleanup |
| PC-08 | SEC-08, SEC-14 | (audit/non-regression) | Unit | mixed-case invited email vs lowercased session email | wrong-account denied; `normalizeEmail` consistent across create/accept/direct-grant | `tests/vitest/collaboration-invitation-d1-store.test.ts` (extend) | `bun run test -- collaboration-invitation-d1-store` | Green (non-regression; documents existing correctness) | none |
| PC-09 | SEC-09 | P5-T1 (realtime key separation) | Unit | missing `REALTIME_IDENTITY_SIGNING_KEY` env | realtime identity disabled/denies (not falling back to invite pepper) | `tests/vitest/project-collaboration-realtime.test.ts` + `tests/vitest/cloudflare-collaboration-room-auth.test.ts` (extend) | `bun run test -- realtime room-auth` | Red before (falls back to pepper); green after | none |
| PC-10 | SEC-10 | P4-T1 (direct-grant promotion guard) | Unit | existing higher-role member; direct-grant lower role; direct-grant higher role; `updateProjectCollaboratorRole` demotion regression | lower→unchanged; higher→promoted; explicit demotion still works (regression) | `tests/vitest/project-collaboration-actions.test.ts` (extend) | `bun run test -- project-collaboration-actions` | Red before (direct-grant downgrades); green after; demotion regression must stay green | none |
| PC-11 | SEC-11 | P5-T2 (auth_trigger, OPEN-SEC-01-gated) | Migration/Unit | per owner choice: remove enum OR wire login-time grant | enum removed (migration applies) OR login-time grant fires | `tests/vitest/migration-0039-*.test.ts` (new, if remove) OR `account-actions` test (if wire) | `bun run test -- auth_trigger` | Blocked until OPEN-SEC-01 resolves | skip until OPEN-SEC-01 |
| PC-12 | SEC-12 | (non-regression) | Unit/DOM | malformed/oversized/short token strings | `invalid` terminal state; no DB lookup | `tests/vitest/project-invite-entry-route.test.ts` (existing) | `bun run test -- project-invite-entry-route` | Green (non-regression) | none |
| PC-13 | FR-02, FR-04, FR-05, FR-06 | (non-regression) | Unit/DOM | D1 fixtures: revoked/expired/already-used/wrong-account tokens | revoked→nulled details; expired→terminal; already-used→terminal; wrong-account→no membership+audit | `tests/vitest/collaboration-invitation-d1-store.test.ts` + `tests/vitest/project-invite-entry-route.test.ts` (existing) | `bun run test -- collaboration-invitation-d1-store project-invite-entry-route` | Green (non-regression) | none |
| PC-14 | FR-03 | P1 verification (onboarding continuity) | Manual/browser (preview) | preview deploy + test invite for a fresh email | signed-out → Continue (form POST) → magic-link auth → `/workshop/pending-invite` → membership created → `/workshop?invite=accepted` | (preview deploy transcript) | manual: curl no-header + browser flow on preview | Pass = membership row in D1 + accepted banner | test invite teardown |
| PC-15 | UX-03, A11Y-01, SEC-07 | P3-T4 (revoke UI) | DOM/a11y + manual keyboard | rendered `PublisherProjectMembersPanel` with ≥1 pending invitation; keyboard nav | "Pending invitations" section renders; revoke button on pending rows only; dialog opens; Tab/Enter/Esc/focus-restore; `aria-label`="Revoke invitation for <email>" | `tests/vitest/publisher-revoke-invite.test.tsx` (new) | `bun run test -- publisher-revoke-invite` + manual keyboard pass on preview | Red before (no section/button); green after | none |
| PC-16 | DATA-01 | P3-T1 (migration 0038) | Migration | local D1 apply + readback | `revoked_reason` column present on `collaboration_invitations`; rollback applies cleanly (or fix-forward documented) | `tests/vitest/migration-0038-revoke-reason.test.ts` (new) | `bun run test -- migration-0038` + `bun run cf:d1:migrate:local` + readback | Red before (column absent); green after | local D1 only |
| PC-17 | PERF-01 | P6-T1 (no hot-path query regression) | Unit | existing proof fixtures | resolve query count == baseline (3-4); accept query count == baseline (5-7) | NEW query-count assertion added to `tests/vitest/collaboration-invitation-d1-store.test.ts` (P6) | `bun run test -- collaboration-invitation-d1-store` | Green = no increase. (No assertion exists today — P6 adds one; until then PERF-01 evidence = code-review gate.) | none |
| PC-18 | TEST-02 | P6-T3 (adversarial) | Mixed | AQ-01..AQ-14 scenarios from `19` §5 | each AQ scenario's expected signal matches actual | per-AQ file in `19` §5 | per-AQ command in `19` §5 | per-AQ red/green in `19` §5 | per-AQ cleanup |

**Completion rule:** No requirement may have only "manual QA" without exact steps, actor, setup, expected observations, and pass/fail criteria. PC-14 (FR-03) is specified: actor=invited collaborator (test email), setup=manager invites test email on preview, steps=open `/invite/<token>` signed-out → Continue (form POST) → complete magic-link auth → land on `/workshop/pending-invite` → membership created, expected=`/workshop?invite=accepted` + project visible, pass/fail=membership row exists in D1 + banner shows accepted.

**Known-red broad-validation posture:** No invite-related broad command is known-red today. `bun run validate`/`bun run build` are reserved for the P6 release gate (per AGENTS.md iteration bias); focused `bun run test -- <pattern>` commands are the per-claim evidence. If a broad command is red at implementation time for unrelated reasons, record the known-red ledger entry (command, date, failure excerpt) and rely on the focused PC commands above.

## 3. Adversarial (UltraQA-style) scenario matrix (summary — full in `19` §5)

| ID | Scenario | Test type |
|---|---|---|
| AQ-01 | POST `/accept` no Origin/Referer → 403 in prod | unit |
| AQ-02 | POST `/accept` cross-host Origin → 403 | unit |
| AQ-03 | POST `/continue` no Origin/Referer → 403 in prod | unit |
| AQ-04 | POST `/sign-out` no Origin/Referer → 403 in prod | unit |
| AQ-05 | same-site form POST → allowed (FR-03) | unit + manual |
| AQ-06 | revoke pending → revoked + tokens revoked + audit | unit |
| AQ-07 | replay used token (other actor) → `already_used` + audit | unit (existing) |
| AQ-08 | wrong-account accept → no membership + audit | unit (existing) |
| AQ-09 | disabled flag → resolve/continue/accept deny safely | unit |
| AQ-10 | malformed/oversized token → invalid (regex `32-256`) | unit (existing) |
| AQ-11 | IDOR: revoke another workspace's invitation → deny | unit |
| AQ-12 | duplicate revoke submit → idempotent | unit |
| AQ-13 | pepper compromise simulation (document, don't execute) | doc |
| AQ-14 | email send failure → degrade to manual share | unit (existing) |

## 4. Denial tests (security)
- Non-manager revoke → 403/error (SEC-07, SEC-15).
- Cross-workspace revoke → deny.
- No-header mutating POST → 403 (SEC-01/02).
- Used token by other actor → `already_used` (FR-05).
- Wrong-account → no membership (FR-04).

## 5. Accessibility tests
- Revoke button Tab-reachable, Enter/Space activate (A11Y-01).
- Confirmation dialog focus trap + restore + Esc cancel.
- Accessible name "Revoke invitation for <email>".
- Color not the only cue (destructive variant has text + icon).

## 6. Validation gaps (honest)
- **No invite e2e Playwright spec exists.** FR-03 + AQ-05 rely on manual preview proof for the full signed-out → auth → accept round-trip. A future Playwright spec is recommended but not required by this pack (browser proof is opt-in per AGENTS.md; the unit/DOM tests + manual curl cover the security claims).
- **Hosted proof harness** runs against preview D1, not production — production rollout relies on the migration being additive + the readback query.

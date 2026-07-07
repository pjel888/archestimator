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

## 2. Test Execution Matrix

| Requirement | Test file path | Test type | Existing/new | Fixture/data setup | Command | Expected evidence | Known pre-existing reds | Owner |
|---|---|---|---|---|---|---|---|---|
| SEC-01 | `tests/vitest/invite-accept-origin.test.ts` | Unit | Extend | mock Request w/ headers | `bun run test -- invite-accept-origin` | no-header-denied-prod, cross-host-denied, same-host-allowed, dev-allow, kill-switch | none | impl |
| SEC-02 | `tests/vitest/invite-continue-origin.test.ts` (new) | Unit | New | mock Request | `bun run test -- invite-continue-origin` | no-header-denied-prod, cross-host-denied, same-site-allowed | none | impl |
| SEC-03 | `tests/vitest/pending-invite-cookie.test.ts` | Unit | Existing (verify) | bridge cookie fixtures | `bun run test -- pending-invite-cookie` | hash-only, HMAC reject, TTL | none | impl |
| SEC-04 | `tests/vitest/project-invite-sign-out-route.test.ts`, `tests/vitest/workshop-pending-invite.test.tsx` | Unit/DOM | Extend | mock response cookies | `bun run test -- sign-out` / `workshop-pending-invite` | Set-Cookie attrs present | none | impl |
| SEC-05 | `tests/vitest/project-invite-feature-flag.test.ts` | Unit | Extend | flag-off env | `bun run test -- project-invite-feature-flag` | disabled → resolve disabled, continue no cookie, accept no RPC | none | impl |
| SEC-06 | (rg scan + code review) | Static | New | changed source + plan folder | `rg '[A-Za-z0-9_-]{32,}'` | no live tokens | none | impl |
| SEC-07 | `tests/vitest/project-collaboration-revoke-invitation.test.ts` (new), `tests/vitest/collaboration-invitation-d1-store.test.ts` | Unit | New + Extend | D1 fixtures | `bun run test -- revoke-invitation` / `collaboration-invitation-d1-store` | manager success, non-manager deny, already-terminal no-op, audit, tokens revoked | none | impl |
| SEC-08 | `tests/vitest/collaboration-invitation-d1-store.test.ts` | Unit | Extend | mixed-case emails | `bun run test -- collaboration-invitation-d1-store` | wrong-account denied on case diff | none | impl |
| SEC-09 | `tests/vitest/project-collaboration-realtime.test.ts`, `tests/vitest/cloudflare-collaboration-room-auth.test.ts` | Unit | Extend | missing key env | `bun run test -- realtime` / `room-auth` | missing key → deny/disable | none | impl |
| SEC-10 | `tests/vitest/project-collaboration-actions.test.ts` | Unit | Extend | existing higher-role member | `bun run test -- project-collaboration-actions` | direct-grant lower role → unchanged | none | impl |
| SEC-11 | `tests/vitest/migration-0038-*.test.ts` (new) or `account-actions` test | Unit/Migration | New (per OPEN-SEC-01) | — | `bun run test -- auth_trigger` | enum removed OR login-time grant | none | impl |
| SEC-15 | `tests/vitest/project-collaboration-revoke-invitation.test.ts` | Unit | New (extend) | cross-workspace invitation | `bun run test -- revoke-invitation` | non-manager/cross-workspace deny | none | impl |
| FR-02/04/05/06 | `tests/vitest/collaboration-invitation-d1-store.test.ts`, `tests/vitest/project-invite-entry-route.test.ts` | Unit/DOM | Existing (verify) | D1 fixtures | `bun run test -- collaboration-invitation-d1-store` / `project-invite-entry-route` | terminal states, wrong-account, replay, expiry | none | impl |
| FR-03 | manual e2e (preview) | Manual | New | preview deploy + test invite | curl + browser | signed-out → continue → auth → pending-invite → accepted | none | impl |
| UX-03, A11Y-01 | `tests/vitest/publisher-revoke-invite.test.tsx` (new) | DOM/a11y | New | render members panel | `bun run test -- publisher-revoke-invite` | button pending-only, dialog, keyboard, a11y name | none | impl |
| DATA-01 | `tests/vitest/migration-0038-revoke-reason.test.ts` (new) | Migration | New | local D1 | `bun run test -- migration-0038` | column present, rollback | none | impl |
| PERF-01 | `tests/vitest/collaboration-invitation-d1-store.test.ts` (query-count) | Unit | Extend | — | `bun run test -- collaboration-invitation-d1-store` | resolve/accept query count unchanged | none | impl |

**Completion rule:** No requirement may have only "manual QA" without exact steps, actor, setup, expected observations, and pass/fail criteria. FR-03's manual e2e is specified: actor=invited collaborator (test email), setup=manager invites test email on preview, steps=open `/invite/<token>` signed-out → Continue → complete magic-link auth → land on `/workshop/pending-invite` → membership created, expected=`/workshop?invite=accepted` + project visible, pass/fail=membership row exists in D1 + banner shows accepted.

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

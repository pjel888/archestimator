# Testing and Verification Plan

## Existing relevant commands

From `package.json` and `.ai/00_system/VALIDATION_MATRIX.md`:

```bash
bun run validate
bun run build
git diff --check
bun run test:e2e
bun run lint:design-system
```

Supabase commands must be discovered with `supabase --help` before use. Use migration/type/provider commands only for ArchEstimator project `ebxxqidacheyapmmzavr`, never archestimator.

## Docs-only current task verification

For this plan package:

```bash
git status --short
git diff --stat
git diff --check
git diff -- .ai
```

Runtime validation/build/e2e are not required for docs-only `.ai` changes under `.ai/00_system/VALIDATION_MATRIX.md:133-134`, but future implementation must run them.

## Future targeted tests needed

### Unit tests

| Test | Purpose | Pass/fail |
| --- | --- | --- |
| Terms metadata test | `CURRENT_TERMS` has key/version/effectiveDate/hash/privacy dependency. | PASS if missing/invalid metadata fails. |
| Required-version compare | Current accepted version returns no gate; old version returns gate. | PASS if exact current version only satisfies required version. |
| Acceptance insert validation | Wrong/missing version rejected; server version accepted. | PASS if browser-supplied unsupported version cannot be persisted. |
| Idempotency/duplicate | Two accepts for same user/version produce one canonical acceptance result. | PASS if no duplicate ambiguity/user error. |
| Metadata minimization | IP/UA raw/hash/omit behavior matches policy. | PASS if raw fields are absent unless approved. |

### Route/action tests

| Test | Purpose | Pass/fail |
| --- | --- | --- |
| Unauthenticated acceptance POST | Cannot accept without auth. | 401/redirect safe failure. |
| Authenticated current acceptance POST | Persists current user/version/timestamp/context. | DB mock called with server-derived user id/time. |
| Save failure | UI receives safe error and does not proceed. | No protected redirect on failed write. |
| Auth callback redirect if changed | Callback routes accepted/missing users correctly. | No open redirects/loops. |

### DOM/Vitest tests

| Test | Purpose | Pass/fail |
| --- | --- | --- |
| Acceptance panel renders version/effective date | Users see legal metadata before accepting. | Version/effective date visible. |
| Terms/Privacy links accessible | Legal docs reachable. | Links have accessible names and hrefs. |
| Checkbox/button state | Affirmative acceptance required. | Accept disabled until required affirmation if chosen. |
| Error state | Save failure shown with retry/support. | User sees non-leaking error and retry. |
| Settings legal card | Accepted version/status visible. | Current accepted version shown. |

### E2E tests

Required when browser/auth/protected-route/user-flow changes are implemented:

1. New user must accept Terms where required before entering `/workshop`.
2. Acceptance persists with correct user/version/timestamp.
3. User cannot bypass required acceptance by direct protected route navigation.
4. User who accepted current version is not repeatedly blocked.
5. Old Terms version triggers re-acceptance if planned.
6. Legal links are accessible from acceptance UI.
7. Keyboard/focus behavior works in modal/sheet/page.
8. Mobile/responsive layout works.
9. Error state when acceptance save fails allows retry/support and does not enter app.
10. Billing/subscription flows remain intact if billing exists; currently mark N/A because billing is deferred and no Stripe/checkout exists.

### RLS and database tests

- User A can select own acceptance rows.
- User A cannot select User B acceptance rows.
- User A cannot insert row for User B.
- Anon cannot read/write acceptance rows.
- Authenticated insert requires own user id and valid version.
- Update/delete are disallowed unless a narrow admin/server path is explicitly approved.
- Missing Data API grants fail in local test before app gate is enabled.

## Full validation sequence for future implementation

```bash
git status --short --branch
git diff --check
bun run lint:design-system
bun run validate
bun run build
bun run test:e2e
```

Add targeted commands as files are touched, for example:

```bash
bun test tests/unit/legal-terms-version.test.ts
bun test tests/unit/legal-terms-acceptance.test.ts
vitest run tests/vitest/terms-acceptance-ui.test.tsx --maxWorkers=1
playwright test e2e/terms-acceptance.spec.ts
```

## Smoke tests

- Signed-out `/terms` renders current version/effective date.
- Signed-out `/privacy` renders and is linked from Terms.
- Signed-out `/workshop` redirects to login.
- Signed-in unaccepted user sees acceptance gate.
- Signed-in accepted user enters `/workshop`.
- Direct `/terms` and `/privacy` never redirect to acceptance gate.
- Save failure and retry do not expose DB/provider details.

## Manual QA

- Read full Terms page on desktop/mobile.
- Verify focus order and screen-reader labels.
- Verify print/save/copy Terms link if implemented.
- Verify support contact and legal notices contact match approved copy.
- Verify no UI text violates `DESIGN.md` compact app/workshop constraints.
- Verify current closed-beta no-payment copy is still accurate.

## Pass/fail definitions

- PASS: all required tests and validations pass, no known legal copy approval gap, no RLS leaks, no auth loops, no all-user lockout, and `.ai` is updated.
- FAIL: any current-version user is incorrectly blocked, any unaccepted user bypasses a hard gate, any cross-user RLS access is possible, final legal copy is unapproved, or design-system lint fails.
- If tests are not possible, strongest alternative verification is static source review + route/manual browser smoke + SQL/RLS proof + documented validation gap; do not claim fully verified.

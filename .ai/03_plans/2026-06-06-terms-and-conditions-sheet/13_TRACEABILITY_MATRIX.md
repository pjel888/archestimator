# Traceability Matrix

| Requirement | Acceptance criterion | Files/modules likely affected | Implementation step | Test/verification | Risk/rollback | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Public Terms page | `/terms` shows version/effective date/Privacy link unauthenticated. | `src/app/terms/page.tsx`, legal content module. | Phase 2. | DOM/public route smoke; build. | Revert page/content. | Planned. |
| Privacy link dependency | Acceptance UI links Terms and Privacy. | `/terms`, `/privacy`, login, acceptance UI. | Phases 2/6. | DOM link tests; manual keyboard. | Revert UI copy. | Planned. |
| Explicit affirmative acceptance | User must affirm before protected app if required. | Acceptance page/sheet/component. | Phase 6. | E2E new user cannot bypass. | Disable gate. | Planned. |
| Version display | Version/effective date visible and stored. | legal content module, UI, DB row. | Phases 2/3/4. | Unit metadata; DB assertion. | Revert version bump. | Planned. |
| Acceptance timestamp | Server stores `accepted_at`. | DB schema, acceptance action/route. | Phases 3/4. | Unit/route/SQL tests. | Gate off until fixed. | Planned. |
| Accepted version | Row stores Terms key/version/hash. | DB schema, content metadata. | Phases 2/3/4. | Unit/SQL. | Re-accept after fix if material. | Planned. |
| Accepting user id | Server-derived auth user id persisted. | Supabase server client/action. | Phase 4. | Auth route/action tests. | Disable gate. | Planned. |
| Optional IP/UA metadata | Hash/omit/store per privacy/legal decision. | acceptance action, DB schema, Privacy copy. | Phases 1/3/4. | Unit/schema/privacy review. | Stop collection/anonymize. | Planned. |
| Re-acceptance | Old version triggers prompt. | status helper, UI gate. | Phase 7. | E2E old-version user. | Revert required version/gate. | Planned. |
| Existing user behavior | Hard gate or grace explicitly chosen. | status helper, feature flag/UI. | Phases 1/7/9. | E2E + beta smoke. | Switch to soft/off. | Planned. |
| Supabase persistence | Acceptance table with RLS/grants/indexes. | migration, generated types. | Phase 3. | SQL/RLS tests; typecheck. | App gate disabled; rollback/fix migration. | Planned. |
| RLS isolation | Users cannot access others' records. | policies/tests. | Phase 3. | RLS denial tests. | Revoke grants/policies. | Planned. |
| Admin/support evidence | Authorized retrieval without cross-user leakage. | server-only admin/support route/helper. | Later Phase 6 or follow-up. | Admin auth tests; RLS. | Disable retrieval. | Planned. |
| Auth/protected gate | Unaccepted user blocked; accepted user proceeds. | session/helper/workshop gate/callback. | Phases 5/6. | E2E protected route. | Disable gate. | Planned. |
| Avoid redirect loops | Legal/auth/invite/share remain accessible. | `src/proxy.ts`, gate route exemptions. | Phases 5/6. | E2E/smoke routes. | Revert proxy/gate. | Planned. |
| Billing edge cases | Future checkout acceptance/cancel/refund/tax planned; no billing now. | future billing routes, pricing copy. | Future paid plan. | N/A now; future tests. | Stop billing launch. | Planned future. |
| Output responsibility copy | Users told to independently verify all outputs. | Terms content and acceptance summary. | Phase 1/2/6. | Legal review; DOM copy check. | Copy rollback/re-accept. | Planned. |
| No professional role disclaimer | Terms says tool only, no licensed pro/contractor/etc. | Terms content. | Phase 1/2. | Legal review; copy check. | Copy rollback. | Planned. |
| Design-system compliance | App/workshop UI passes lint. | components/UI. | Phase 6. | `bun run lint:design-system`. | Revert/fix UI. | Planned. |
| Accessibility | Keyboard/focus/link/error states work. | acceptance UI. | Phase 6. | DOM/E2E/manual. | Revert modal/sheet or use page. | Planned. |
| Deployment safety | DB first, app second, gate last. | migration/release process. | Phase 9. | release checklist/provider proof. | Gate off/app rollback. | Planned. |
| `.ai` hygiene | State/tasks/logs/bugs/archive updated. | `.ai/*`. | Phases 10/11. | diff review. | Follow-up docs patch. | Planned. |

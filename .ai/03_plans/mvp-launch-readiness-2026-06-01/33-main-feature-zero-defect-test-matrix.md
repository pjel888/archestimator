# Main Feature Zero-Defect Test Matrix

## Fourth-Pass Closed Beta Test Rows - 2026-06-02

Add zero-defect rows:

| Feature | Required closed beta result |
| --- | --- |
| Allowlist access | Non-whitelisted Google-authenticated user cannot access `/workshop`. |
| Whitelisted access | Whitelisted Google-authenticated user can access `/workshop`. |
| Revoked access | Revoked user is blocked even with an existing session. |
| Public routes | Marketing, legal, share, and invite routes remain accessible as designed. |
| First-run onboarding | Whitelisted no-workspace user reaches default workspace path. |
| Feedback path | Beta user can report feedback/support from visible route or in-app link. |
| Pricing copy | No visible copy implies active payment, checkout, or public paid launch. |
| Beta legal | Terms/privacy/AUP/disclaimers match closed beta status. |

Commit audited: `681c95e64864f283950a88dba304eaffe8f2f8b3`

Current state: **not green**. `bun run test:dom` fails and E2E was blocked by a local port collision.

| Feature | Critical path | Failure modes | Automated tests | Manual tests | Production smoke | Owner acceptance | P0 no-go |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Auth/onboarding | Login -> callback -> workshop -> first project | bad callback, no workspace, expired magic link | auth callback/proxy/magic link/E2E | new/returning/expired/invited | hosted auth smoke | Product/Eng | auth fails |
| Project creation/list/detail | Create/list/open project | RLS denial false positive/negative, validation failure | project action/DOM/RLS | create/open/delete if visible | staging/prod project smoke | Eng | cannot create/open |
| Estimate sheet create/open/duplicate | Create/open/duplicate estimate | wrong project, stale cache, duplicate missing rows | estimate action/DOM | create/open/duplicate | core smoke | Eng/QA | estimate inaccessible |
| Component library browse/create/insert | Browse/search/create/insert | missing seed, wrong source ID, insert fails | library UI/actions | search/create/insert | demo smoke | Product/Eng | insert fails |
| Template browse/preview/insert | Browse/preview/insert | fallback masks empty, wrong insertion target | template UI/actions | preview/insert into group | demo smoke | Product/Eng | template insert fails |
| Estimate row edit/delete/replace | Edit/delete/replace row | lost history, revision conflict, wrong totals | row mutation tests | edit/delete/replace and Activity | core smoke | Eng/QA | data corruption |
| Project-specific unlink | Detach linked row | library mutated, state ambiguous, metadata leaked | RPC/action/hook/UI/share tests | detach/edit/library unchanged | core smoke | Eng/Product | library mutation/ambiguity |
| Excel export | Download/open bid workbook | wrong formulas, raw dump, timeout, auth leak | model/workbook/route tests | Excel + secondary app open/print | export smoke | Product/Eng | formula/open failure |
| Share/invite/email | Send/open/share/comment if visible | token leak, email false success, CSRF | share/invite/webhook/security tests | send/open/revoke/expire | staging smoke | Security/Release | unverified email/security |
| Settings basics | Support/legal/profile | no support, misleading legal | render/accessibility tests | navigate settings/support/legal | smoke | Product | no support/legal |
| AI deferral | Workshop and direct API | AI visible/callable/provider call | disabled UI/route tests | footer/API check | smoke | Eng/Product | AI visible/callable |

Zero-defect means P0 flows have no known launch-blocking defects and every accepted exception is documented as a no-go or explicit beta limitation.

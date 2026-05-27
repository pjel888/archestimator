# Local Implementation And Validation Evidence

**Date:** 2026-05-27
**Scope:** local implementation evidence for the sign-up/login/authentication plan pack
**Launch status:** local implementation evidence exists; private beta and public launch remain blocked by external provider, legal, Vercel, QA, and owner evidence.

## Implemented Local Scope

| Area | Evidence |
| --- | --- |
| Auth entry | `/login` is the canonical passwordless auth entry. It offers Google OAuth first and email sign-in link fallback, removes internal CEO/founder copy, avoids password UI, and links to truthful Terms/Privacy status pages. |
| Auth actions | `signInWithEmail` and `signInWithGoogle` use the central safe-next sanitizer and canonical origin resolver. Provider errors are mapped to stable public codes. Google no longer requests offline access. |
| Callback | `/auth/callback` uses stable public errors for missing/exchange failures, resolves redirects through the configured origin policy, and sends authenticated users to `/workshop`. |
| Proxy | Signed-out `/workshop` routes redirect to `/login` with sanitized next; signed-in `/login` redirects to `/workshop`; protected route requests pass a server-only request-path header for downstream route context; dev auth bypass remains localhost-gated and production-disabled. |
| Account data | Added `user_onboarding_profiles`, `workspace_account_settings`, and `account_security_events` migration plus generated type updates. On 2026-05-27 the migration was applied to linked Supabase project `ebxxqidacheyapmmzavr` and repaired into remote migration history after local login failed on a missing `user_onboarding_profiles` schema-cache lookup. |
| Optional settings | `/workshop/settings/profile` and `/workshop/settings/workspace` own the profile/workspace detail correction paths. Stale `/workshop/onboarding` traffic redirects to `/workshop/settings` and is not a required first-run gate. |
| Settings | Added `/workshop/settings/profile` and `/workshop/settings/workspace`; profile-owned and workspace-owned data are separate, and workspace edits require owner/admin role. |
| Invites | Protected workspace bootstrap reuses existing workspace, project, or estimate-sheet membership before creating any new default workspace. If a membership exists but its workspace is unavailable, bootstrap fails into support/repair instead of silently creating a separate organization workspace. |
| Consent posture | Marketing consent form input is ignored until legal-ready versioned consent/withdrawal records and notice copy exist; `marketing_consent_at` remains dormant. |
| Audit | Added server-owned best-effort account security audit inserts with hashed request metadata and raw secret/provider-payload redaction. |
| Legal status pages | Added `/privacy` and `/terms` as truthful launch-status pages; they are not final legal artifacts and explicitly block public self-serve launch. |
| Sensitive APIs | Added executable tests for AI unauthenticated rejection, proposal export current-workspace/no-store boundaries, component image/attachment storage delete ownership filters, auth-before-body-parsing on storage upload routes, and project image cross-workspace upload denial. |

## Validation Evidence

Fresh local evidence captured in this implementation pass:

| Command | Result |
| --- | --- |
| `bunx vitest run tests/vitest/auth-onboarding-guard.test.ts --maxWorkers=1` before the invite-continuity implementation patch | FAIL as intended: the first `workspace_members` lookup occurred after fallback workspace creation. |
| `bunx vitest run tests/vitest/auth-onboarding-guard.test.ts --maxWorkers=1` after the immediate-workshop-entry correction | PASS: executable tests prove successful post-auth destinations resolve to `/workshop`, stale onboarding paths do not block workspace access, workspace/project/estimate membership is reused, no fallback workspace insert occurs for invited collaborators, missing membership workspaces do not trigger fallback creation, and `profiles.default_workspace_id` is updated to the member workspace. |
| `bunx vitest run tests/vitest/auth-sensitive-api-boundaries.test.ts --maxWorkers=1` after storage-denial coverage | PASS: 13 executable/source-contract tests cover auth-before-body-parsing for storage upload routes, component image and attachment delete ownership filtering, project image delete ownership filtering, project image cross-workspace upload denial before storage writes, AI boundary source coverage, and proposal export no-store/current-workspace repository boundary. |
| `bunx vitest run tests/vitest/auth-redirect-sanitizer.test.ts tests/vitest/auth-error-mapping.test.ts tests/vitest/auth-entry-ui-contract.test.ts tests/vitest/auth-account-data-contract.test.ts tests/vitest/auth-account-data-schema.test.ts tests/vitest/auth-onboarding-contract.test.ts tests/vitest/auth-settings-ui-contract.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/auth-magic-link.test.ts tests/vitest/auth-callback-route.test.ts tests/vitest/auth-proxy.test.ts tests/vitest/auth-onboarding-guard.test.ts tests/vitest/ai-ask-route.test.ts tests/vitest/proposal-export-route.test.ts --maxWorkers=1` | PASS: 14 files, 104 tests after storage-denial expansion. The focused suite covers project/sheet invite continuity, optional settings contracts, stale onboarding redirect, prefixed settings fields, dormant marketing consent, membership-workspace repair failure, storage path ownership denial, cross-workspace project image upload denial, intake length limits, and production origin fail-closed behavior. |
| `bun run validate` | PASS: typecheck, ESLint with one pre-existing TanStack Table React Compiler warning, design-system lint, 2 unit tests, 83 Vitest files, 535 passed, 2 skipped. |
| `bun run build` | PASS: production build generated 25 app routes including `/login`, `/auth/callback`, `/privacy`, `/terms`, `/workshop/onboarding`, and `/workshop/settings/*`. |
| `git diff --check` | PASS. |
| Linked Supabase RED check before remote apply | FAIL as intended: `to_regclass('public.user_onboarding_profiles')`, `to_regclass('public.workspace_account_settings')`, and `to_regclass('public.account_security_events')` all returned `null`; remote migration history stopped at `20260526142913`. |
| `supabase db query --linked --file supabase/migrations/20260527072220_auth_account_data.sql` plus `supabase migration repair --status applied 20260527072220 --linked --yes` | PASS: remote table existence query returns all three auth-account tables, RLS/grant check matches the intended no-browser-write posture for onboarding profile completion and account security events, and migration history now includes `20260527072220 auth_account_data`. |
| Temporary `philipjonlewis@gmail.com` auth-session smoke | PASS with caveat: a generated one-time Supabase email session for Philip's existing profile verified authenticated reads against `user_onboarding_profiles` return no `PGRST205` schema-cache error; the temporary session was revoked. This did not complete the live Google account-picker flow because Browser was unavailable and Computer Use timed out. |
| Headless Playwright smoke on `NEXT_PUBLIC_APP_URL=http://localhost:3001 ARCHESTIMATOR_ALLOWED_APP_ORIGINS=http://localhost:3001 ARCHESTIMATOR_DEV_AUTH_BYPASS=0 ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=0 bunx next start -p 3001` | PASS: `/login` unsafe external next sanitized to `/workshop`; no password input; Google and email-link controls visible; callback missing-code redirects to `/login?error=callback_missing_code&next=%2Fworkshop`; no raw provider/external URL leak; signed-out `/workshop/projects/project-1?tab=estimates` redirects to `/login?next=%2Fworkshop%2Fprojects%2Fproject-1%3Ftab%3Destimates`; `/signup` returns 404; `/privacy` and `/terms` show pending-review launch-blocking status copy. |
| `$code-review` final loop | PASS: code/security lane `APPROVE`; architecture lane `CLEAR`. Final targeted review confirmed enum docs match implementation and evidence wording no longer overstates storage route behavior coverage. |

Impact and review-risk evidence captured for the sensitive auth/workspace path:

| Command / Check | Result |
| --- | --- |
| `npx gitnexus impact isJsonValue --repo archestimator --direction upstream --depth 2 --include-tests` | LOW: one direct caller (`sanitizeAccountSecurityMetadata`), one focused contract test, one auth callback process downstream. |
| `npx gitnexus impact sanitizeAccountSecurityMetadata --repo archestimator --direction upstream --depth 2 --include-tests` | LOW: one focused contract test, no affected processes reported. |
| `npx gitnexus impact ensureDefaultWorkspace --direction upstream --repo archestimator` | CRITICAL: 79 impacted symbols, 25 direct callers, and 30 affected processes. The follow-up change was kept narrow: the required onboarding gate was removed from workspace bootstrap, and existing workspace/project/estimate membership is reused before inserting a default workspace. |
| `npx gitnexus impact Function:src/app/api/component-library/images/route.ts:POST/DELETE`, `Function:src/app/api/component-library/attachments/route.ts:POST/DELETE`, and `Function:src/app/api/projects/images/route.ts:POST/DELETE` | LOW for each targeted route handler: zero upstream callers, zero affected processes. The follow-up change added executable tests only. |
| code-review-graph scoped `detect_changes` over the auth implementation file set | Risk score 0.60 across 39 scoped auth/test files, 132 changed functions/classes, 0 affected flows reported, 94 test gaps reported by graph coverage heuristics. |
| code-review-graph scoped impact for `src/lib/repositories/workspace-repository.ts` | HIGH: 30 directly changed nodes, 500 impacted nodes within two hops, 86 additional files affected. The scoped risk is mitigated by the targeted invite-continuity regression plus full validate/build/browser gates. |
| `npx gitnexus detect-changes --repo archestimator` | CRITICAL for the whole dirty working tree: 65 files, 250 changed symbols, 196 affected processes. This is a closeout/merge warning for the broad shared working tree, not a launch-ready verdict for external provider/legal evidence. |

## Local Evidence Not Yet Captured

These are still required before calling the feature launch-ready or merge-ready from the broad working tree:

- isolate or reconcile the broad dirty working tree before merge closeout, because GitNexus detects 65 changed files, 250 changed symbols, and critical blast radius across 196 affected processes;
- live Google browser smoke for `/login` redirect-away and settings correction paths with the user's Google account, because Browser was unavailable and Computer Use timed out in the local session;
- owner-provided Supabase, Google, Vercel, legal/privacy, QA, and support evidence rows listed below.

## Launch Blockers

Local implementation does not satisfy private beta or public launch. The launch-blocking rows remain:

- reviewed Privacy Notice and Terms;
- legal entity/operator, jurisdictions, subprocessor list, retention, DSAR/export/delete/correction, cookie/analytics, student/minor posture;
- Supabase dashboard evidence for Site URL, redirect allow-list, provider enablement, password/passwordless posture, anonymous/phone/passkey/SAML disabled status, OTP expiry, resend cooldown, rate limits, CAPTCHA, SMTP/templates, audit retention;
- Google OAuth consent screen, authorized domains, redirect URI inventory, scopes, support email, and verification state;
- Vercel production/staging/preview URL policy, deployment protection, env-var presence, and redeploy requirements;
- named Support/Ops, Security, Legal/Privacy, Supabase, Google Cloud, Vercel, QA, Product, and Engineering owners for accepted risks and launch decision rows.

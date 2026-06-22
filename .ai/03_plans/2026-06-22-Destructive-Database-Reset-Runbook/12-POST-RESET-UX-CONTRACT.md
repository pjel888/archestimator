# 12 Post-Reset UX Contract

This file makes the user-facing post-reset behavior explicit for Variant A.
It complements the app surface map in `06-APP-SURFACE-IMPACT-MAP.md`.

## Canonical Variant A UX Default

After Variant A, an existing Auth user should still sign in and reach the
workshop. If `profiles.default_workspace_id` is null because workspaces were
deleted, the app should use the existing default-workspace bootstrap path to
create or select a fresh workspace.

Default user posture:

- preserve `profiles`;
- preserve `user_onboarding_profiles` unless the owner explicitly wants
  re-onboarding;
- preserve beta, legal, security, and audit evidence;
- show empty states for project, estimate, library, publication, and
  collaboration content;
- do not expose old project, estimate, invite, or public-share data.

If this flow requires app code changes, stop execution and return to planning.

## Surface Contract

| Surface | Entry condition | Expected screen | Primary action | Failure/error state | Success state | Accessibility proof |
|---|---|---|---|---|---|---|
| Login/callback | existing Auth user signs in | protected app reached without beta/legal/security regression | continue to workshop | closed-beta denial uses normal access-denied state | session and profile loaded | focus lands on main content after redirect |
| Workshop home | profile preserved, default workspace null | workspace bootstrap or setup recovery, not a crash | create/select fresh workspace | clear non-alarming recovery message if bootstrap fails | fresh workspace available | heading names the state; CTA keyboard reachable |
| Projects | no projects | empty projects state | create project | create failure names retry/support path | new project appears | empty-state CTA has accessible name |
| Project detail/bookmark | old project id is opened | not-found or redirect without data exposure | return to projects | no generic 500 | old id cannot expose reset data | focus not trapped after redirect |
| Estimates | no estimates under new project | empty estimate list/editor affordance | create estimate | create failure leaves user on recoverable state | new estimate opens | form errors are announced |
| Estimate editor stale id | old estimate id is opened | not-found or project-scoped missing state | return to project estimates | no stale rows rendered | no old data visible | heading describes missing estimate |
| Library | empty library | empty folders/components state | create folder/component/price option | validation/upload errors are visible | new component can be inserted into estimate | controls reachable by keyboard |
| Publications | old publications reset | no active links | create public link | no old token exposes data | new link works and can be revoked | status copy names link state |
| Public share route | old `/share/[token]` opened | expired/not-found share state | no app data shown | no generic 500 and no reset data leak | new token displays only new data | page title/heading identify expired link |
| Collaboration invite | old invite/token opened | expired/not-found invite state | return/sign in if appropriate | no token metadata leak | new invite flow starts if configured | message is screen-reader visible |
| Settings profile | profile preserved | profile settings render | edit supported profile fields | validation errors visible | saved changes persist | form labels intact |
| Settings workspace | workspace was recreated or absent | workspace settings show current fresh workspace or setup recovery | create/update workspace | no crash on null workspace | workspace state persists | focus moves to first error on failure |
| Storage upload | target buckets emptied | upload control still works | upload/read/delete new object | failure names retry/support path | object count converges after delete | upload status announced |

## Stale Link Outcomes

Old identifiers must fail closed:

- old project routes: not-found or redirect to empty project list;
- old estimate routes: not-found under the current project context;
- old public share tokens: expired/not-found share page, no data exposure;
- old invite tokens: expired/not-found invite page, no token details exposed;
- old Storage object URLs: object missing or access denied according to bucket policy;
- old library item references: no stale insert source; newly created components work.

Do not accept generic server errors for stale-link proof.

## Copy Requirements

Post-reset empty/error copy should be short, factual, and non-alarming:

- say what is empty or no longer available;
- provide one next action when possible;
- avoid mentioning internal table names, tokens, RLS, or destructive reset details
  to end users;
- log technical details only in operator evidence.

Required copy states:

- fresh workspace creation failure;
- beta access denial;
- expired public link;
- expired invite;
- missing project;
- missing estimate;
- empty library;
- Storage upload/delete failure.

## Accessibility Checklist

Future app smoke must cover:

- meaningful page heading for each empty or missing-data state;
- keyboard reachable primary CTA;
- visible focus after redirects and dialogs;
- announced form/upload errors;
- no focus trap after stale-link redirects;
- links/buttons with specific accessible names;
- no text-only status conveyed exclusively by color.

## UX No-Go Conditions

Stop or return to planning if:

- post-login behavior with null `profiles.default_workspace_id` is unresolved;
- preserved onboarding state conflicts with workspace bootstrap;
- old public/share/invite links expose reset data;
- empty states require app code changes not covered by a separate plan;
- UX proof cannot distinguish a valid empty state from a crash or generic 500.

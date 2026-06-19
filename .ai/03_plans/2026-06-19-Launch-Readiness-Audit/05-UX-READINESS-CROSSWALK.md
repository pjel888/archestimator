# UX Readiness Crosswalk

Date: 2026-06-19. This crosswalk converts launch gates into user-visible flows and
acceptance checks. It is a planning artifact, not browser proof.

| Gate | User-visible surface | Required UX state coverage | Acceptance evidence |
|---|---|---|---|
| B3 root error boundaries | `/`, `/login`, `/invite/*`, `/share/*`, `/privacy`, `/terms` | Branded 404, recoverable error, global crash fallback, mobile text fit, keyboard focusable actions. | Source/build proof plus targeted forced-error or component/route proof. |
| B4/B7 observability and support | All beta surfaces | Error copy tells users what happened without leaking internals; support path and owner response path are known. | Runbook + sink/alert evidence. |
| B8/B9 DSAR | `/privacy`, `/terms`, workshop settings/account support text | Request submitted, acknowledged, in-progress, fulfilled, denied/needs identity proof, retention exception. | Copy review + DSAR runbook dry-run. |
| V2 consent | Landing/public pages, `/privacy`, `/terms`, banner/settings | Essential-only, accept analytics, withdraw consent, no-cookie/new visitor, copy matches runtime tracking. | Network capture or decision/copy proof. |
| Share route hardening | `/share/[token]`, password/expired/not-found branches | Valid proposal, password required, expired/revoked, invalid token, unauthenticated recipient, unfurl metadata without client totals. | Source proof + targeted manual/browser proof when implemented. |
| B1/B2 quality gate | User-facing flows touched by fixes | No regression in workshop navigation, projects list, root pages, and changed components. | CI/validate + targeted tests. |
| Projects performance pack | `/workshop/projects` | Skeleton parity, image loading/failure, empty/error states, search responsiveness, large-list scroll behavior. | `05_STATUS.md`, `06_PERCEIVED_PERFORMANCE_ACCEPTANCE.md`, metrics/tests. |

## UX minimums for implementation agents

- Every public/legal/share flow touched by a launch fix needs success, empty/not-found,
  loading, error, and permission-denied states listed before implementation starts.
- Legal and consent copy changes need readability review: body text must be legible on
  mobile and desktop, and the copy must not overpromise self-serve capability.
- Keyboard and screen-reader checks are required when adding or changing dialogs,
  banners, forms, error boundaries, or destructive actions.
- Mobile checks are required for public/legal/share/account states because these
  surfaces are likely to be opened from email or messaging links.


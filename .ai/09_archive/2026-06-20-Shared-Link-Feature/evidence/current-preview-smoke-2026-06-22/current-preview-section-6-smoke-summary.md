# Current Preview Shared-Link Section 6 Smoke Proof

Status: **PASS**

- Generated: `2026-06-21T17:02:18.324Z`
- Git SHA: `704010cb`
- Supabase project: `ebxxqidacheyapmmzavr`
- Preview deployment: `https://archestimator-qwzc7517y-philipjonlewis-projects.vercel.app`
- Mode: `current-preview-section-6-smoke`

| Runbook row | Check | Expected | Observed status | Result |
| --- | --- | --- | ---: | --- |
| 6.1 | Open recipient link | 200 and rendered fixture text | 200 | PASS |
| 6.2 | Password route | wrong 401, correct 204 | 401/204 | PASS |
| 6.3 | Comment stale snapshot | 409 | 409 | PASS |
| 6.4 | Decision stale snapshot | 409 | 409 | PASS |
| 6.5 | Public activity route | 200 | 200 | PASS |
| 6.6 | Recipient session cookies | shared_link_session_* and shared_link_session_*_ok set | 200 | PASS |

## Cleanup Counts

```json
{
  "openFixture": {
    "project_publication_events": 0,
    "project_publications": 0,
    "projects": 0,
    "shared_link_comments": 0,
    "shared_link_events": 0,
    "shared_link_recipients": 0,
    "shared_link_responses": 0,
    "workspaces": 0
  },
  "passwordFixture": {
    "project_publication_events": 0,
    "project_publications": 0,
    "projects": 0,
    "shared_link_comments": 0,
    "shared_link_events": 0,
    "shared_link_recipients": 0,
    "shared_link_responses": 0,
    "workspaces": 0
  }
}
```

## Notes

- 6.2 wrong-password ARIA association is covered by `tests/vitest/project-publication-page.test.tsx`; hosted smoke proves wrong/correct route status on the current preview.
- 6.5 authenticated owner Activity-tab rendering is covered by `tests/vitest/project-publication-activity.test.tsx`; hosted smoke proves public activity route health on the current preview, and `tests/vitest/project-publication-page.test.tsx` proves the public page does not mount the activity feed.
- 6.7 provider advisors are closed by the scoped owner/DBA waiver and baseline disposition, not by this route smoke.
- Raw publication tokens, recipient tokens, passwords, CSRF tokens, cookies, and provider credentials are not written to this artifact.

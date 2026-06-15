# 08 - Readiness, Risks, and Open Questions

## Readiness Verdict

The share page is ready for a UX/UI improvement plan, but not ready for unbounded feature expansion.

Ready:

- Public route is functional.
- Snapshot model exists.
- Tree/grid/chart receiver surfaces exist.
- Comments and decisions are already session-gated.
- Tests exist around core behavior.
- Live route renders locally.

Not ready:

- Durable public rate limiting remains a known production-hardening gap.
- E2E receiver tests are written but gated/skipped without seeded fixtures.
- Route-local empty/loading/error states are incomplete.
- The current component composition is too centralized in `SharePageTabs`.
- GitNexus CLI failed in this planning session, so future symbol-impact compliance needs repair or documented fallback.

## Product Risks

| Risk | Severity | Notes |
| --- | --- | --- |
| Making the page prettier but not easier to inspect | High | Layout must prioritize row comprehension |
| Hiding response controls too much | Medium | Accept/comment must stay discoverable for session recipients |
| Adding advanced proposal features prematurely | Medium | The product should not imply issued/legal proposal maturity |
| Confusing Shared Link with Teamspaces | High | Public receiver must not grant membership |
| Over-optimizing for one DEMO_PROJECT_PLACEHOLDER snapshot | Medium | Validate with multiple sheet/row densities |

## Technical Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| `SharePageTabs` becomes too large | High | Extract before adding feature state |
| Chart changes affect workshop charts | Medium | Use wrapper or share-only prop path |
| Right rail refactor breaks comments/decision | High | Move containers first, keep component internals unchanged |
| Mobile sticky bars overlap content | Medium | Screenshot and keyboard QA |
| Tree fidelity mismatches real estimate hierarchy | Medium | Use `getBestShareTree` where possible |
| Public API behavior changes accidentally | High | Keep first layout pass API-free |

## Security Risks

Do not change these during layout-only work:

- token hashing/encryption,
- password cookie,
- shared-link recipient session cookie,
- CSRF header/cookie handling,
- comment/decision API authorization,
- CSP/security headers,
- public event behavior.

If a future feature needs API behavior, make it a separate security-reviewed slice.

## Resolved Product Defaults

These are now selected defaults for the first implementation sequence:

- Desktop is a workspace, not a polished document preview.
- Mobile is row-reading-first.
- Chart is contextual, not first-screen dominant.
- Comments/decision are visible for session recipients and minimized for non-session viewers.
- Snapshot/generated status appears in the first viewport.
- Tree should prefer real snapshot nodes when available.
- Print/export stays deferred.

## Remaining Product Questions

These are not blockers for the first layout implementation:

1. Should mobile default to Tree View or Grid Preview after the toolbar lands?
2. Is the public receiver allowed to expose recipient email/display name once session is validated?
3. Should Request Revision require a note before submit, or strongly prompt with an optional note?
4. What sender contact affordance is allowed for password/expired/revoked states without leaking private details?

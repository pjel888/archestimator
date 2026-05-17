# Validation Matrix

**Last updated:** 2026-05-17

## Reset baseline code-change gate

After the reset cleanup, the live product surface is only:

```txt
/
/workshop
```

Use this gate for baseline code/docs changes:

```bash
bun run validate
bun run build
git diff --check
```

`bun run validate` covers type-check, lint, Bun unit tests, and Vitest DOM tests.

## Documentation-only changes

- Verify referenced paths exist.
- Ensure new files are in the correct `.ai` folder.
- Run `git diff --check` before finalizing.

If the documentation change is meant to fix agent drift, degraded performance, stale context, or repeated mistakes, also verify:

- `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md` exists and is linked from `.ai/README.md` and `.ai/00_system/DOCS_SOURCE_OF_TRUTH.md`;
- the change identifies the active source of truth rather than adding another parallel instruction set;
- the final report states what remains unverified.

## Deleted-route policy

Do not recreate E2E or route coverage for deleted prototype routes. The following route families were intentionally removed and should stay absent unless Philip explicitly reapproves a fresh implementation:

- `/login`
- `/signup`
- `/projects`
- `/component-library`
- `/proposals`
- `/spikes`
- `/workshop/projects`
- `/workshop/components`

## Manual browser QA

For the reset baseline, manual QA is intentionally small:

1. `/` loads the preserved landing page.
2. Landing CTAs point to `/workshop`, not deleted sample/project/login/signup routes.
3. `/workshop` loads as an empty page.
4. A removed route such as `/workshop/projects` resolves through Next's not-found behavior, not a legacy redirect.

## Future implementation gate

Before rebuilding any app/workshop functionality:

1. Write a small screen brief in `.ai/03_plans/`.
2. State the exact user job, non-goals, route scope, and deletion criteria.
3. Add tests only for approved behavior.
4. Run `bun run validate`, `bun run build`, and `git diff --check`.

## Estimation-domain claims

For cost, materials, labor, code, tax, or professional-practice claims:

- cite source and date;
- separate assumptions from verified facts;
- preserve calculation inputs and formulas;
- record uncertainty ranges when exact values are not reliable.

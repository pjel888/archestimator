# 05 — UX / UI / Accessibility Plan

## Applicability: NOT APPLICABLE (with evidence)

This is a **data / operations / schema-integrity plan**, not a user-facing feature. Per
the Creating-Plan-Prompt directive (§8A and §8): "For docs-only planning work, record why
dynamic adversarial QA is not applicable to the planning task itself, while still
specifying the adversarial QA required for future implementation."

The plan's deliverables are:
1. Markdown planning documents (this pack).
2. Two proposed additive scripts (`scripts/audit-d1-migration-state.ts`,
   `scripts/verify-d1-schema-integrity.ts`, `scripts/check-doc-migration-counts.mjs`) —
   CLI tools invoked by developers/CI, not rendered in the app.
3. Documentation edits (`AGENTS.md`, `README.md`) — developer-facing prose.

None of these produce user-visible UI, routes, components, forms, dialogs, or interactions.
There is no user journey, no loading/empty/error UI state, no keyboard/focus/screen-reader
behavior, no responsive layout, no Tailwind/design-system impact.

## What this means for the plan

- **No React/Next.js rendering decisions** (Server vs Client, Suspense, cache, mutations) — out of scope.
- **No performance budgets** for routes/APIs/UI — out of scope (catalog-read queries are constant-time; see `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md`).
- **No accessibility matrix** — no UI to assess.
- **No design-system reuse** — no UI primitives needed.
- **No Storybook / Playwright / visual QA** — correctly skipped under the repo's proportional verification policy (`AGENTS.md` "Verification Policy").

## Script UX (developer-facing, minimal)

The proposed CLI scripts should follow existing repo conventions for proof scripts:
- Print a JSON summary to stdout (matches `cf:d1-*` family pattern).
- Exit non-zero on a failing gate (matches `generate-cloudflare-d1-restore-rehearsal.ts:443`).
- Write optional markdown/JSON artifacts under a documented evidence path (matches existing `OUTPUT_FILE`/`MARKDOWN_FILE` env pattern, e.g. `generate-cloudflare-d1-restore-rehearsal.ts:438-439`).
- No interactive prompts (scriptable in CI).

This is the entirety of the "UX" surface. It is covered by the existing script conventions;
no separate accessibility or UX work is required.

## Adversarial QA for future implementation

Even though there is no runtime UI, the implementation scripts have behavior that needs
adversarial coverage (covered in `12_TEST_AND_VALIDATION_STRATEGY.md` and
`19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md`):
- Verifier script with an empty D1 (all tables missing → all FAIL, non-zero exit).
- Verifier script with a superset of tables (extra tables → PASS with note).
- Doc-count guard when `migrations/` has a new file not yet reflected in docs (→ FAIL).
- Ledger diff when remote lists a migration not in the local dir (→ "missing-from-dir" state).

## Conclusion

UX/UI/accessibility: **not applicable** to this planning task, with the reason recorded.
The only "UX" is developer-facing CLI script output, which reuses existing repo conventions.
No accessibility, design-system, or browser-proof obligation applies.

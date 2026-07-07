# 18 — Stack Contract and Production Standards

Consolidates the cross-cutting production decisions for this feature against the Archestimator baseline stack. Most layers are **not applicable with reason** because this is a docs/scripts feature with no runtime path.

## Next.js 16 / React 19
- **n/a.** No route, no component, no Server Action, no Client boundary, no cache/revalidation. The canonical home is plain Markdown, not a Next route. Stated with reason per the bar.

## Bun / TypeScript
- Generator is `.ts` run via `bun run` (consistent with existing `scripts/*.ts`). Type-checked by `bun run type-check`.
- Detector is `.mjs` (Node ESM) for pre-commit/CI speed without a TS compile step. JSDoc-typed where helpful; not part of `tsc`'s checked input unless added to `tsconfig` include (decision: do **not** add `.mjs` to `tsconfig` — keep it zero-config Node; cover correctness with the vitest suite).

## Tailwind v4 / design-system
- **n/a.** No rendered UI. Markdown only.

## OpenNext / Cloudflare Workers
- **n/a (no Worker change).** The feature reads `wrangler.jsonc`/`worker.ts` as files; it does not deploy, does not change the Worker, does not add bindings. The Worker `archestimator-proof` is explicitly unaffected.

## Cloudflare D1
- **n/a (no D1 change).** Generator counts local `migrations/` filenames only; never queries D1 (local or remote). No migration created/applied. Remote-apply reconciliation belongs to the sibling d1-migration-integrity pack. **No Database Change Blueprint** (stated with reason in `07`).

## Cloudflare R2 / Durable Objects / Queues / Email / Images
- **n/a.** No object storage, DO state, queue message, email, or image operation. Read-only binding-name echo only.

## Better Auth
- **n/a.** No auth/session/permission surface. The feature has no authz boundary (it reads committed files).

## TanStack Query / Zustand
- **n/a.** No client state, no server-state cache.

## Cloudflare provider boundary (per `AGENTS.md` standing authorization)
- This feature stays strictly inside read-only file access. It does **not** exercise the standing D1/R2/DO/Queue/Email authorization because it makes no provider calls. No paid add-on enabled (respects free-tier posture).

## Cost posture
- Zero runtime cost. CI cost = one short job (negligible against free tier). No paid add-on. Consistent with repo cost posture.

## TypeScript / validation / domain modeling
- Snapshot has a typed shape (`OperationalTruthSnapshot`) defined in the generator. No `any`. Determinism enforced by stable key order.

## Testing standards
- Vitest unit + adversarial (repo-native). No Playwright (no browser claim). No provider proof (no provider call). Proportional.

## Observability
- CI check-run red/green + PR diff on snapshot JSON. No Workers Analytics, no logs sink, no dashboard needed (dev tool, not runtime service). `09` details.

## Rollout / rollback
- Additive merge; `git revert` safe; no production rollout. `13` details.

## Documentation standards
- Canonical home + update protocol + handoff rules are the deliverable. Sibling cross-ref required. `AGENTS.md` gains one pointer bullet.

## Concurrent-repository safety (shared worktree)
- All planning writes confined to this folder. Execution-phase edits to `AGENTS.md`/`README.md`/`current-state.md` follow the high-concurrency discipline (ledger ownership, re-read before edit, `git diff --check`). No branch/worktree operations.

## Cross-cutting invariants
- No secrets in any generated artifact (SEC-1).
- Mechanical facts flow substrate → generator → snapshot → home; detector closes the loop.
- Posture facts are curated with mandatory citation.
- Provider readback stays out of scope (DEC-NO-CLOUDFLARE-API).

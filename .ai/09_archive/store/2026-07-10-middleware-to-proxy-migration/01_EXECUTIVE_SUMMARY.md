# Executive Summary

## The question

User reported Next.js 16.2.10 emits a deprecation warning on `bun dev`:

```
⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
```

User asked: investigate the issue, assess blast radius, decide whether to plan or fix directly.

## The answer

**This is NOT a quick fix. It is a known, intentional, documented trade-off.**

The current `src/middleware.ts` is the correct entrypoint for Archestimator's Cloudflare Worker deploy path. Philip tried the rename on Jul 7, 2026, hit a runtime break, and reverted on Jul 8, 2026 with the commit message:

> "The OpenNext Cloudflare runtime uses `src/middleware.ts` as the Edge middleware entrypoint; the legacy `src/proxy.ts` convention is no longer honored and needs to be retired."

(Note: Philip's commit message mislabels `proxy.ts` as "legacy" — `proxy.ts` is actually the NEW Next.js convention — but the operational conclusion is correct: OpenNext Cloudflare 1.20.1 does not honor `proxy.ts`.)

## Evidence (3 sources, all in-repo)

1. **Git history** (`evidence/git-history.txt`): four commits over 8 days show two full flips between `proxy.ts` and `middleware.ts`, ending in `middleware.ts` on Jul 8.
2. **OpenNext source** (`evidence/opennext-source.txt`): `node_modules/@opennextjs/cloudflare/dist/cli/build/utils/middleware.js` exports `useNodeMiddleware()` which only checks `_middleware` manifest entries. No `proxy` equivalent exists.
3. **Test lock-in** (`tests/vitest/proxy-file-convention.test.ts`): Philip's Jul 8 commit explicitly added a regression test that fails if anyone renames without fixing the runtime. The test name literally says: "uses middleware instead of Next proxy because OpenNext Cloudflare rejects Node.js proxy runtime."

## Recommendation

**Do NOT rename.** Three low-risk documentation actions are recommended (Phase 1):

1. Add an in-source comment in `src/middleware.ts` explaining why it's not `proxy.ts`
2. Reconcile contradictory `.ai/10_state/current-state.md` entries (line 204-207 current vs line 861-867 stale)
3. Update README to clarify the intentional choice

Future Phases 2–4 are BLOCKED until OpenNext Cloudflare supports `proxy.ts`:

- **Phase 2:** (optional, on-demand) re-verify OpenNext 1.20.1 still rejects proxy.ts via scratch-build experiment
- **Phase 3:** (BLOCKED) rename + update 13 files once OpenNext supports it
- **Phase 4:** monitor `@opennextjs/cloudflare` releases; consider upstream contribution

## Readiness verdict

**CONDITIONALLY READY**

- Phase 1: `IMPLEMENTATION-READY` (after owner approval)
- Phases 2–4: `NOT READY` (upstream blocker)

## Cost of the warning

The warning is purely cosmetic on `bun dev`. It does not:
- Affect production builds (`bun run build` succeeds)
- Affect Worker deploys (`bun run cf:deploy` succeeds)
- Affect test runs (`bun run test:dom` passes 26 middleware-related tests)
- Cause any runtime behavior change
- Block any Next.js feature

The warning DOES:
- Appear on every `bun dev` startup (2× in startup output)
- Generate AI-agent noise (this conversation as proof)
- Risk a future developer "fixing" it incorrectly and breaking Cloudflare deploy

The Phase 1 in-source comment is the **primary defense** against the latter risk.

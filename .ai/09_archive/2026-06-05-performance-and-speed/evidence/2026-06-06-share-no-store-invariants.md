# Share/publication no-store invariants — 2026-06-06

Status: **LOCAL INVARIANTS LOCKED / HOSTED PROOF OPEN**.

## Scope

Locked the current share/publication security posture before any share endpoint performance optimization:

- `/api/share/[token]/route.ts`
- `/api/share/[token]/activity/route.ts`
- `/api/share/[token]/comment/route.ts`
- `/api/share/[token]/decision/route.ts`
- `/api/share/[token]/events/route.ts`
- `/api/share/[token]/password/route.ts`
- `/api/share/[token]/session/route.ts`
- `/api/share/[token]/unsubscribe/route.ts`
- `/share/[token]/page.tsx`

## Regression coverage

Added `tests/vitest/share-no-store-invariants.test.ts` to assert:

- every tokenized share API route keeps `export const dynamic = "force-dynamic"`;
- every tokenized share API route contains `Cache-Control: no-store`;
- tokenized share API routes do not opt into numeric `revalidate`, public cache-control, or `s-maxage`;
- `/share/[token]` stays force-dynamic and does not use numeric `revalidate` or `unstable_cache`.

## Verification

Command:

```bash
bun run test:dom -- tests/vitest/share-no-store-invariants.test.ts tests/vitest/project-publication-security.test.ts tests/vitest/project-publication-route.test.ts tests/vitest/project-publication-page.test.tsx
```

Result: 4 files passed / 56 tests passed. jsdom printed two existing `Not implemented: navigation to another Document` notices during page tests; the command still exited 0.

## Interpretation

- This packet does not make share endpoints faster by itself.
- It preserves the security/cache boundary required before any future pagination, RPC, hosted timing, or cache-adjacent optimization.
- Do not add shared/public caching to tokenized share APIs or the tokenized share page without a separate security review and hosted proof.

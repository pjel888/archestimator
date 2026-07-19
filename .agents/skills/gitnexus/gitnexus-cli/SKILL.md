---
name: gitnexus-cli
description: Check or refresh Archestimator's GitNexus index through the repository's guarded commands when a broad code-intelligence task needs it. Do not install global packages, invoke npx or latest-version fallbacks, clean indexes, generate wikis, or publish artifacts by default.
---

# GitNexus CLI

## Safe Commands

```bash
bun run graph:gitnexus -- status
bun run graph:reindex
bun run graph:neutralize
```

- Use `status` only when `.gitnexus/run.cjs` exists.
- Use `graph:reindex` for the canonical guarded refresh. If it refuses because
  the pinned runner is absent, record degraded tooling and continue from source
  or Code Review Graph.
- Use `graph:neutralize` after a generator rewrites agent guidance with absolute
  graph mandates.

Do not run `clean`, `wiki`, global installers, `npx gitnexus`, or registry-based
fallbacks unless the user explicitly requests that separate operation.

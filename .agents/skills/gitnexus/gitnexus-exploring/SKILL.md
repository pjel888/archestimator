---
name: gitnexus-exploring
description: Use an available GitNexus index for broad Archestimator architecture mapping, unfamiliar execution-flow discovery, or cross-module relationship lookup. Do not use it for narrow file lookup, and fall back to Code Review Graph plus targeted source reads when unavailable.
---

# GitNexus Exploration

1. Read `gitnexus://repo/archestimator/context` and note freshness.
2. Query one concrete concept or flow rather than traversing the full graph.
3. Inspect context for the key symbol and only the relevant process resource.
4. Verify entrypoints, boundaries, and mutable details in current source.
5. Report the map with file references, graph freshness, and unresolved gaps.

Use `rg` or repository reads directly for known files, strings, and narrow
reversible work.

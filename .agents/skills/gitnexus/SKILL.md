---
name: gitnexus
description: Use GitNexus only when its MCP resources or the repository-pinned local runner are available for broad architecture exploration, unfamiliar call-chain tracing, or high-risk symbol impact analysis. Do not use it for narrow reversible edits, and fall back to configured Code Review Graph plus targeted source reads when GitNexus is unavailable.
---

# GitNexus Router

Treat this as an optional code-intelligence adapter. `AGENTS.md` and
`.ai/00_system/AGENT_OPERATING_PROTOCOL.md` remain authoritative.

## Availability Gate

1. Check whether `gitnexus://repo/archestimator/context` is readable or
   `.gitnexus/run.cjs` exists.
2. If neither exists, do not install, fetch, or generate a runner. Use the
   configured Code Review Graph surface and targeted source reads.
3. If the index is stale, run `bun run graph:reindex` only. Accept a guarded
   refusal as degraded tooling, not a blocker.

## Route

- Architecture and flows: `gitnexus-exploring`.
- Bug call chains: `gitnexus-debugging`.
- Upstream blast radius: `gitnexus-impact-analysis`.
- Rename or extraction planning: `gitnexus-refactoring`.
- Tool/resource reference: `gitnexus-guide`.
- Safe local CLI status/reindex: `gitnexus-cli`.

Use graph output as navigation evidence. Confirm claims in current source and
report when the graph is missing or stale.

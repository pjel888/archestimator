---
name: explore-codebase
description: Map how Archestimator currently works from source, configuration, and active diffs, with graph context only for relationships that need it. Use for architecture, route, symbol, data-flow, provider, or dependency questions; do not use for implementation, exhaustive repository inventories, or graph-first ceremony on narrow lookups.
---

<!-- ARCHESTIMATOR REPO-LOCAL OVERRIDE — additive; preserve through fleet 3-way merge. Do not delete. -->
> **ArchEstimator repo policy (override):** This skill's graph-first workflow applies to broad/high-risk/unfamiliar-code work. For narrow, reversible local edits, a focused `rg`/targeted-read/LSP check is sufficient — do not force full graph traversal or the token cap on small changes. Canonical authority: `.ai/00_system/AGENT_OPERATING_PROTOCOL.md` + `AGENT_FRAMEWORK_PROTOCOL.md`; `.ai` wins on any conflict.
<!-- END ARCHESTIMATOR REPO-LOCAL OVERRIDE -->

# Explore Codebase

Return current, traceable facts rather than a generic repository tour.

## Workflow

1. Define the concrete question, entry surface, and evidence needed to answer
   it. Keep historical plans and memory subordinate to current source.
2. Inspect `git status --short --branch` and any relevant diff so concurrent or
   uncommitted behavior is not missed.
3. Read the smallest authoritative surfaces: route or action entry points,
   imported modules, schemas, configuration, package scripts, and nearby
   callers. Prefer targeted `rg` and source reads over broad dumps.
4. Use GitNexus or code-review-graph as supplementary evidence when the question
   genuinely needs transitive callers, execution flows, communities, or
   unfamiliar-module relationships. Do not request repository-wide graph stats
   for a narrow lookup.
5. Reconcile graph results with the active diff and current files. Mark stale
   index output, historical documents, and unsupported inferences explicitly.
6. Report the answer with clickable `path:line` references, the relevant flow or
   boundary, and any evidence gap that remains.

Stop once the question is answered with sufficient current-source evidence. Do
not edit code, add planning artifacts, or expand into unrelated architecture.

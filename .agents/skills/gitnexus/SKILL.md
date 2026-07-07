---
name: gitnexus
description: "Use the GitNexus knowledge graph for broad codebase exploration, high-risk shared-symbol/API refactors, unfamiliar call chains, and bug tracing that is cheaper to answer with the graph than with manual rg tracing. Index skill only: it routes to one of six sub-skills and defers the detailed flow to that sub-skill's SKILL.md. NOTE the repo-local proportional-graph policy override below: the graph is NOT mandatory for narrow, reversible local edits."
---

<!-- ARCHESTIMATOR REPO-LOCAL OVERRIDE — additive; preserve through fleet 3-way merge. Do not delete. -->
> **ArchEstimator repo policy (override):** This skill's graph-first workflow applies to broad/high-risk/unfamiliar-code work — broad exploration ("how does X work?"), high-risk shared-symbol/API refactors, unfamiliar call chains, and non-trivial debugging where a graph answer is cheaper than manual tracing. For narrow, reversible local edits, a focused `rg`/targeted-read/LSP check is sufficient — do NOT force full graph traversal or hit the token cap on small changes. Canonical authority: `.ai/00_system/AGENT_OPERATING_PROTOCOL.md` + `AGENT_FRAMEWORK_PROTOCOL.md`; `.ai` wins on any conflict. The auto-generated GitNexus absolutes ("MUST"/"NEVER"/"ALWAYS") in `AGENTS.md` / `CLAUDE.md` are subordinate to this proportional policy.
<!-- END ARCHESTIMATOR REPO-LOCAL OVERRIDE -->

## GitNexus — Code Intelligence Index

GitNexus indexes this repo (`archestimator`) into a knowledge graph of symbols,
relationships, and execution flows. This file is a **thin index** — pick the
sub-skill that matches your task, then **read that sub-skill's `SKILL.md`** for
the detailed workflow, checklist, and tool examples. Do not re-derive the flow
here.

### Before you start

- If the index is stale (the skill says "Index is stale"), run
  `bun run graph:reindex` only when its safe-runner guard passes. If the local
  runner is absent or contains registry-resolved fallback logic, skip the
  refresh until a pinned, lockfile-controlled GitNexus runner is reviewed and
  added.
- For any task, reading `gitnexus://repo/archestimator/context` first gives the
  codebase overview and freshness check (~150 tokens).

### Six sub-skills (read the matching SKILL.md for the detailed flow)

| Task shape | Sub-skill to read | Use for |
|---|---|---|
| Understand architecture / "How does X work?" | `gitnexus-exploring` | broad exploration, project structure, tracing execution flows, unfamiliar code |
| Blast radius / "What breaks if I change X?" | `gitnexus-impact-analysis` | safety analysis before edits, dependents map, pre-commit scope check |
| Trace bugs / "Why is X failing?" | `gitnexus-debugging` | error tracing, symptom → root cause, call-chain debugging |
| Rename / extract / split / refactor | `gitnexus-refactoring` | safe multi-file renames, module extraction, service splits |
| Tools, resources, schema reference | `gitnexus-guide` | tool/resource/schema quick reference, pagination, Cypher examples |
| Index, status, clean, wiki CLI commands | `gitnexus-cli` | `analyze`/`status`/`clean`/`wiki`/`list` CLI commands and flags |

### Proportional use (when NOT to load a sub-skill)

This graph is **optional** for narrow, reversible local edits — a focused
`rg`/targeted-read/LSP check is enough there. Reach for a sub-skill when the
task is broad, high-risk, or genuinely unfamiliar. See the override banner
above and `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`.

### Token efficiency

When you do use the graph: prefer the lightweight `gitnexus://repo/...`
resources (~100–500 tokens), `detail_level="minimal"`, and targeted `query` /
`context` / `impact` calls over broad traversal.

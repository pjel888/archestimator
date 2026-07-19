---
name: gitnexus-guide
description: Explain Archestimator's optional GitNexus capability, safe availability checks, and proportional tool routing. Use when an agent needs to choose between GitNexus, configured Code Review Graph, and targeted source inspection; do not assume any GitNexus tool or resource exists.
---

# GitNexus Guide

GitNexus is optional in this repository. Current runtime capability, not generated
documentation, decides whether its tools can be used.

## Selection

- Use targeted source reads for known files and narrow reversible changes.
- Use configured Code Review Graph for broad graph work when available.
- Use GitNexus `query`, `context`, `impact`, `detect_changes`, or `rename` only
  when those exact tools are exposed and the index is readable.
- Use `bun run graph:reindex` as the only refresh path.

Never infer safety from absent graph results. Confirm code behavior and provider
boundaries in current source, and state graph availability or freshness in reports.

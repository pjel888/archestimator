---
name: gitnexus-impact-analysis
description: Use an available GitNexus index to estimate upstream blast radius for a shared symbol, public API, auth boundary, or broad refactor. Do not require graph analysis for narrow reversible edits, and never convert heuristic depth or caller counts into absolute breakage claims.
---

# GitNexus Impact Analysis

1. Confirm the index is available and fresh enough for the target.
2. Request upstream impact for the exact symbol and review direct callers first.
3. Inspect affected processes and dynamic or string references in current source.
4. Compare the current diff when changes already exist.
5. Classify risk from actual boundary importance, coupling, and uncertainty.

Report direct evidence, inferred transitive effects, stale-index limitations, and
the smallest validation that could prove the change. Testing remains user-gated.

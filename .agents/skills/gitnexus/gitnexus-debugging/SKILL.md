---
name: gitnexus-debugging
description: Use an available GitNexus index to supplement Archestimator bug tracing after runtime evidence identifies a suspect symbol or flow. Do not replace the repository's snapshot-first debug workflow, and fall back to Code Review Graph plus current source when GitNexus is unavailable.
---

# GitNexus Debugging

1. Follow `../../debug-issue/SKILL.md` for snapshot, freshness, origin, and log
   classification.
2. Confirm GitNexus availability through `../SKILL.md`.
3. Query the observed error, route, action, or suspect symbol.
4. Inspect callers, callees, and the smallest relevant process trace.
5. Confirm the suspected root cause in current source.
6. Stop when the evidence explains the symptom and identifies the narrow repair.

Do not treat missing graph paths as proof that a runtime path cannot exist.

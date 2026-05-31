# Code Review Graph Detect Changes

Command surface: `mcp__code_review_graph.detect_changes_tool`

Parameters:

- `repo_root`: `/Users/philiplewis/archestimator`
- `base`: `HEAD`
- `detail_level`: `minimal`
- `max_depth`: `2`

Result:

- Status: ok
- Changed files analyzed: 43
- Changed functions/classes: 78
- Affected flows: 0
- Test gaps: 31
- Overall risk score: 0.60
- Untested examples reported by graph: `createQueryClient`, `Loading`, `ProjectEstimateNodePage`, `ProjectLayout`, `formatCompactMoney`
- Review priorities reported by graph: `useEstimateAreaTreeQuery`, `test:protected workshop projects redirects signed-out users to login@L3`, `test:login page keeps compact shared-control UI visible@L10`

Notes:

- This is a broad route-transition slice with shared shell/repository/test changes, so the graph risk score remains non-trivial even though route-targeted validation passed.
- Do not treat this as a release-ready approval; it is scope/risk evidence for the current branch only.

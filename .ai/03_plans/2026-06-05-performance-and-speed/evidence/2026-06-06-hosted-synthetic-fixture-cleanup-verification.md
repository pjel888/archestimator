# Hosted synthetic fixture cleanup verification — 2026-06-06T03:21:16.650Z

Status: **PASSED**.

Run ID: `codex-perf-20260606032046-2983cf73`

Storage paths removed through app DELETE: true

| Surface | Remaining rows | Zero residue |
| --- | ---: | --- |
| auth_users | 0 | yes |
| beta_rows | 0 | yes |
| estimate_nodes | 0 | yes |
| estimate_row_items | 0 | yes |
| estimates | 0 | yes |
| profiles | 0 | yes |
| project_publications | 0 | yes |
| projects | 0 | yes |
| workspaces | 0 | yes |

Note: Cleanup deletes only the current runId synthetic auth/database fixtures after hosted proof capture. Sensitive cookies, passwords, and storage object paths are not written.

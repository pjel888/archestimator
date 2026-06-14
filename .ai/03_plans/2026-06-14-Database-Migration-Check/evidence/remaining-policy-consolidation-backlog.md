# Policy Consolidation Backlog

Date: 2026-06-14

After `20260614144712_narrow_private_rls_policies_to_authenticated`, the
official advisor reports `0` `multiple_permissive_policies` warnings.

Resolved warning counts:

| Table | Prior warning count |
| --- | ---: |
| `cost_library_items` | 24 |
| `estimate_nodes` | 24 |
| `estimate_row_items` | 24 |
| `estimate_tabs` | 4 |
| `estimates` | 19 |
| `profiles` | 12 |
| `projects` | 19 |
| `workspace_members` | 24 |
| `workspaces` | 8 |

Resolution path:

- `20260614144000_consolidate_low_risk_permissive_policies` merged simple
  OR-equivalent policy pairs.
- `20260614144136_command_split_core_public_policies` split broad `ALL`
  policies for the four highest-count shared tables.
- `20260614144359_command_split_remaining_public_policies` split the remaining
  public-table policy groups.
- `20260614144712_narrow_private_rls_policies_to_authenticated` narrowed private
  app policies to `authenticated`, which also allowed anonymous helper execute
  grants to be revoked safely.

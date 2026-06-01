# Fresh Bundle Manifest Audit - 2026-06-01

Command evidence:

- `bun run build` passed on Next.js 16.2.6 / Turbopack.
- Because `@next/bundle-analyzer` is not installed and no new dependency was added in this cleanup pass, this audit uses the generated Next.js client-reference manifests and static chunk sizes from `.next/`.

Aggregate output from `.next/static/chunks` after the fresh build:

| Metric | Value |
| --- | ---: |
| Static JS/CSS chunk files | 60 |
| Total JS bytes | 2,820,490 |
| Total CSS bytes | 159,299 |
| Estimated gzip JS bytes | 902,557 |
| Estimated gzip CSS bytes | 50,976 |
| Server app bytes | 1,332,364 |
| App routes in manifest | 43 |

Largest initial JS routes from client-reference manifests:

| Route | JS files | Initial JS bytes | CSS bytes | Client modules |
| --- | ---: | ---: | ---: | ---: |
| `/workshop/projects/[projectId]/estimates/page` | 12 | 799,425 | 159,299 | 32 |
| `/workshop/projects/[projectId]/charts/page` | 12 | 733,088 | 159,299 | 34 |
| `/workshop/projects/[projectId]/estimates/[nodeId]/page` | 12 | 697,010 | 159,299 | 36 |
| `/workshop/projects/[projectId]/page` | 11 | 693,476 | 159,299 | 32 |
| `/workshop/templates/page` | 9 | 394,732 | 159,299 | 28 |
| `/workshop/page` | 7 | 342,461 | 159,299 | 28 |
| `/workshop/projects/page` | 7 | 327,610 | 159,299 | 28 |
| `/share/[token]/page` | 6 | 302,015 | 159,299 | 32 |
| `/features/page` | 6 | 242,953 | 159,299 | 50 |
| `/workshop/library/page` | 7 | 233,955 | 159,299 | 30 |

Interpretation:

- The fresh build confirms the prior library split remains in effect: `/workshop/library/page` is still in the lower route group at 233,955 initial JS bytes.
- The largest remaining initial JS routes are project-estimate, charts, estimate workspace, and project detail. Those need a real analyzer/profiler pass before adding more memoization, virtualization, or broad route splits.
- This is a stronger no-dependency manifest audit, not a replacement for a true `@next/bundle-analyzer` treemap if the project owner approves adding that dev dependency.

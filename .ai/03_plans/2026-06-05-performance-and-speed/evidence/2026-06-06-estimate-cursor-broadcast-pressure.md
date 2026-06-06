# Estimate cursor broadcast pressure — 2026-06-06

Status: **LOCAL CURSOR PRESSURE GUARD IMPLEMENTED / PROVIDER PROOF OPEN**.

Synthetic local guard benchmark. The runtime hook also keeps its existing time throttle; this report only measures the new distance/target queue gate before Supabase broadcast send.

## Result

| Scenario | Pointer moves | Queued broadcasts | Reduction |
| --- | ---: | ---: | ---: |
| Tiny same-cell movement | 120 | 20 | 83% |
| Row target changes | 120 | 120 | 0% |

## Interpretation

- Tiny pointer movement inside the same estimate cell is suppressed until movement reaches 6px.
- Row/column target changes still queue immediately so remote cursor context stays useful.
- This is local queue-pressure evidence only; it does not prove Supabase Realtime provider throughput or multi-user INP improvement.

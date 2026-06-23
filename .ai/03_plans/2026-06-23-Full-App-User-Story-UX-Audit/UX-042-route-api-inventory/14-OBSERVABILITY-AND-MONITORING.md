# UX-042 — Observability And Monitoring

Date: 2026-06-23

## Metrics

### Counters
| Metric | Event | Labels |
|---|---|---|
| `042_route_api_inventory_action_total` | Action performed | `status=success/failure`, `surface=Route and API inventory` |
| `042_route_api_inventory_error_total` | Error prevented by fix | `error_type=validation/auth/network` |

### Histograms
| Metric | What | Buckets (ms) |
|---|---|---|
| `042_route_api_inventory_duration_ms` | Action trigger→completion | [50, 100, 250, 500, 1000, 2500, 5000] |

### Gauges
| Metric | What |
|---|---|
| `042_route_api_inventory_active` | Concurrent operations |

## Structured Logs
```json
{
  "timestamp": "ISO",
  "level": "info|warn|error",
  "issueId": "UX-042",
  "surface": "Route and API inventory"
}
```

## Levels
| Level | When | Sampling |
|---|---|---|
| info | Normal: started, completed, transition | 100% dev, 10% prod |
| warn | Recoverable: retry success, quota near | 100% |
| error | Unrecoverable: mutation failed, provider down | 100% |

## Traces
| Span | Parent | Attributes |
|---|---|---|
| `042_route_api_inventory.action` | page.render | `issueId=UX-042` |
| `042_route_api_inventory.validate` | `042_route_api_inventory.action` | inputLength, valid |
| `042_route_api_inventory.mutate` | `042_route_api_inventory.action` | mutationType, entityId |

## Alerts
| Alert | Condition | Severity | Runbook |
|---|---|---|---|
| Error spike | `042_route_api_inventory_error_total` > 10/5min | P1 | Check logs; reroute to App shell/routing lead |
| Latency spike | p95 > 5s | P2 | Check Supabase queries |
| Success rate drop | < 95% over 15min | P1 | Check provider health |

## Audit Trail

If mutations are involved: `estimate_sheet_events`, `account_security_events`, `collaboration_audit_events`, `shared_link_events`.

## Implementation Hooks: UX-042

- Counter for each state transition
- Log every error at warn with specific reason
- Trace span for async operation
- If new UI state, log state entry with trigger

## Linkage

[04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md) | [10-PERFORMANCE-BUDGET.md](10-PERFORMANCE-BUDGET.md) | [13-NETWORK-AND-API-CONTRACT.md](13-NETWORK-AND-API-CONTRACT.md)

#  — Observability And Monitoring

Date: 2026-06-23

## Metrics

### Counters
| Metric | Event | Labels |
|---|---|---|
| `002_beta_access_status_action_total` | Action performed | `status=success/failure`, `surface=Closed beta / Auth` |
| `002_beta_access_status_error_total` | Error prevented by fix | `error_type=validation/auth/network` |

### Histograms
| Metric | What | Buckets (ms) |
|---|---|---|
| `002_beta_access_status_duration_ms` | Action trigger→completion | [50, 100, 250, 500, 1000, 2500, 5000] |

### Gauges
| Metric | What |
|---|---|
| `002_beta_access_status_active` | Concurrent operations |

## Structured Logs
```json
{
  "timestamp": "ISO",
  "level": "info|warn|error",
  "issueId": "",
  "surface": "Closed beta / Auth"
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
| `002_beta_access_status.action` | page.render | `issueId=` |
| `002_beta_access_status.validate` | `002_beta_access_status.action` | inputLength, valid |
| `002_beta_access_status.mutate` | `002_beta_access_status.action` | mutationType, entityId |

## Alerts
| Alert | Condition | Severity | Runbook |
|---|---|---|---|
| Error spike | `002_beta_access_status_error_total` > 10/5min | P1 | Check logs; reroute to Auth/support lead |
| Latency spike | p95 > 5s | P2 | Check Supabase queries |
| Success rate drop | < 95% over 15min | P1 | Check provider health |

## Audit Trail

If mutations are involved: `estimate_sheet_events`, `account_security_events`, `collaboration_audit_events`, `shared_link_events`.

## Implementation Hooks: 

- Counter for each state transition
- Log every error at warn with specific reason
- Trace span for async operation
- If new UI state, log state entry with trigger

## Linkage

[04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md) | [10-PERFORMANCE-BUDGET.md](10-PERFORMANCE-BUDGET.md) | [13-NETWORK-AND-API-CONTRACT.md](13-NETWORK-AND-API-CONTRACT.md)

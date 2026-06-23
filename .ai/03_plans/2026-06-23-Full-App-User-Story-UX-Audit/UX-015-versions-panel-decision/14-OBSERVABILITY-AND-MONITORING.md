# UX-015 — Observability And Monitoring

Date: 2026-06-23

## Metrics

### Counters
| Metric | Event | Labels |
|---|---|---|
| `015_versions_panel_decision_action_total` | Action performed | `status=success/failure`, `surface=Estimates` |
| `015_versions_panel_decision_error_total` | Error prevented by fix | `error_type=validation/auth/network` |

### Histograms
| Metric | What | Buckets (ms) |
|---|---|---|
| `015_versions_panel_decision_duration_ms` | Action trigger→completion | [50, 100, 250, 500, 1000, 2500, 5000] |

### Gauges
| Metric | What |
|---|---|
| `015_versions_panel_decision_active` | Concurrent operations |

## Structured Logs
```json
{
  "timestamp": "ISO",
  "level": "info|warn|error",
  "issueId": "UX-015",
  "surface": "Estimates"
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
| `015_versions_panel_decision.action` | page.render | `issueId=UX-015` |
| `015_versions_panel_decision.validate` | `015_versions_panel_decision.action` | inputLength, valid |
| `015_versions_panel_decision.mutate` | `015_versions_panel_decision.action` | mutationType, entityId |

## Alerts
| Alert | Condition | Severity | Runbook |
|---|---|---|---|
| Error spike | `015_versions_panel_decision_error_total` > 10/5min | P1 | Check logs; reroute to Proposal/export lead |
| Latency spike | p95 > 5s | P2 | Check Supabase queries |
| Success rate drop | < 95% over 15min | P1 | Check provider health |

## Audit Trail

If mutations are involved: `estimate_sheet_events`, `account_security_events`, `collaboration_audit_events`, `shared_link_events`.

## Implementation Hooks: UX-015

- Counter for each state transition
- Log every error at warn with specific reason
- Trace span for async operation
- If new UI state, log state entry with trigger

## Linkage

[04-IMPLEMENTATION-PLAN.md](04-IMPLEMENTATION-PLAN.md) | [10-PERFORMANCE-BUDGET.md](10-PERFORMANCE-BUDGET.md) | [13-NETWORK-AND-API-CONTRACT.md](13-NETWORK-AND-API-CONTRACT.md)

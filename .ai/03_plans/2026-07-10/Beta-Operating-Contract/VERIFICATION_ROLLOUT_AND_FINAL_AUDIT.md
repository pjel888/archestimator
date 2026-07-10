# Verification, Rollout, And Final Audit

## Proof Matrix

| Test | Criterion | Command/surface and expected signal |
| --- | --- | --- |
| `TEST-001` | `AC-001` | Metric registry/query fixtures cover bots, anonymous, tests, duplicates, missing denominator, stale source, deletion; invalid definitions fail. |
| `TEST-002` | `AC-002` | Focused DOM/source/provider-network tests prove no global/no-consent/forbidden-route analytics and allowed post-consent behavior. |
| `TEST-003` | `AC-003` | Admin repository/DOM tests cover real/zero/partial/error/stale/denied; only actual values or `Unavailable` render. |
| `TEST-004` | `AC-004` | Local alert catalog/producer, incident dry-run, support-monitoring fixtures plus authorized hosted delivery/acknowledgment and rollback drill. |
| `TEST-005` | `AC-005` | Installed Better Auth storage/config assertions, current/other/all revoke tests, D1 access matrix, restore-session canary, signed acceptance/mitigation. |
| `TEST-006` | `AC-006` | Legal readiness fixtures and versioned owner/counsel records prove limited-cohort scope and broader/paid boundary. |
| `TEST-007` | `AC-007` | Operating artifact fixture suite and strict release consumer reject stale/missing/unknown/contradictory evidence. |

## Gates

### `GATE-001` — Local operating implementation (`FAIL`)

Run targeted telemetry/Admin/incident/support/auth/legal tests, `bun run validate:error-handling`, `bun run type-check`, alert catalog, observability drill, support-monitoring and legal/auth readiness in non-mutating mode, plan validator, and diff check. Local output must distinguish local proof from hosted/human gaps.

### `GATE-002` — Hosted operations (`BOUNDARY`, `AUTH-001`)

Requires production consent/provider proof, Workers Logs/alert delivery, incident/support acknowledgment, named primary/backup coverage, rollback, and review artifacts for the exact release.

### `GATE-003` — Human risk/legal decision (`BOUNDARY`, `AUTH-002`)

Requires time-bounded owner auth-risk decision, limited-cohort legal confirmations, and explicit qualified-counsel status for broader/public/paid scope. Source text or agent judgment cannot satisfy it.

## Adversarial Matrix

- Cloudflare analytics loads globally, before consent, after withdrawal, or on a forbidden public/share surface.
- Bot/test/anonymous traffic inflates active user or recipient metrics.
- Metric query errors or missing provider config render zero/sample values.
- Events duplicate on retry, cross workspaces, lack snapshot/version identity, or outlive retention/deletion.
- Alert webhook delivers but no named operator acknowledges; primary owner unavailable and backup absent.
- Rollback procedure references a stale deployment/artifact or worsens data integrity.
- Sign-out revokes only cookie state, revoke-all misses a session, cookie cache masks revocation, or D1 restore revives a token.
- D1/export/operator permissions exceed the documented role.
- Terms/privacy versions differ between UI, acceptance record, and readiness artifact.
- Owner limited-Beta confirmation is presented as counsel approval for paid/public launch.
- Evidence belongs to another release/environment or is older than its freshness window.

## Rollout

1. Fix consent regression and land the metric registry behind disabled production flags.
2. Replace Admin stubs with real/unavailable DTOs and verify role/access behavior.
3. Land incident/support/rollback schemas and local drills.
4. Land auth evidence/revocation/restore treatment and legal gate separation.
5. Compose non-mutating operating artifact; release remains red.
6. Resolve `AUTH-001/002`, run a limited proof window, collect acknowledgments/decisions, and clean up.
7. Release only the named limited cohort if exact-SHA release truth and every applicable gate are current.

## Rollback And Fix-forward

- Analytics defect: remove/disable provider injection immediately and retain only redacted diagnostics.
- Metric/Admin defect: render `Unavailable`; do not substitute cached/sample values beyond the declared freshness window.
- Alert/support defect: use the documented manual escalation channel and keep release red.
- Auth defect: revoke sessions, rotate affected credentials/secrets, restrict D1/export access, and execute the incident plan.
- Legal gate defect/version mismatch: stop expansion; preserve current limited-cohort constraints until explicit resolution.
- Remove synthetic proof data, flags, sessions, webhooks, and credentials by run ID; cleanup failure remains an incident/blocker.

## Completion Audit

- [ ] `BETA-P0-06`: metric definitions, consent, bot/test/anonymous separation, retention/deletion, production flag, and hosted proof are current.
- [ ] `BETA-P0-07`: named primary/backup, severity/targets, support, incident, rollback, communication, and review drills pass.
- [ ] `BETA-P0-08`: raw session-token taxonomy, D1/backup access, revocation/restore drill, mitigation or time-boxed acceptance are recorded.
- [ ] `BETA-P0-09`: limited cohort is explicitly approved and broader/public/paid launch remains counsel-gated until approved.
- [ ] `BETA-P1-07`: every operator metric is real or `Unavailable`; no stub/sample fallback remains.
- [ ] No raw sensitive telemetry, token, webhook, owner-label value, or private URL appears in evidence.
- [ ] Hosted and human evidence is distinct from local proof and matches release ID/SHA/environment.
- [ ] Distinct verifier reran the final gates and confirmed cleanup.

Stop only on a current, scoped operating decision. A rich local script inventory is not production readiness.

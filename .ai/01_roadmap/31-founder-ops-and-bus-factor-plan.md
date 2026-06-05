# Founder Ops & Bus-Factor Plan

**Last updated:** 2026-05-30
**Purpose:** Reduce OWNER_NAME_PLACEHOLDER bottleneck during beta. Define operating model for solo founder.

---

## 1. the owner's Roles During Beta

| Role | Responsibility |
|------|---------------|
| Product owner | Feature decisions, roadmap, prioritization |
| Developer | Code implementation, bug fixes, infrastructure |
| Support operator | User questions, bug reports, onboarding |
| Incident owner | Production incidents, rollback decisions |
| PM / researcher | Beta feedback synthesis, usability observation |
| Legal/ops | Beta agreements, subprocessor management, domain/email |

**Risk:** All roles converge on one person. This plan defines operating limits and delegation pathways.

## 2. Maximum Weekly Operating Load

| Activity | Max Hours/Week |
|----------|---------------|
| Development / implementation | 15–20 |
| Support triage + response | 5 |
| Beta feedback synthesis | 2 |
| Weekly participant check-ins | 3–4 (30 min × 5–8 participants) |
| Incident response | As needed (preempts other work) |
| Legal/ops/admin | 2 |
| **Total max** | **~32 hours** |

**Rule:** If combined support + incident + feedback load exceeds 10 hours in a week, pause new feature development and focus on stability.

## 3. Support Triage Workflow

```
Incoming (SUPPORT_INBOX_PLACEHOLDER)
    │
    ├── Security / data-loss / auth-blocking → IMMEDIATE response
    │
    ├── Bug report with repro steps → Acknowledge within 24h, fix within 3 business days
    │
    ├── Feature request → Log in .ai feedback log, review during weekly synthesis
    │
    ├── "How do I...?" → Answer within 24h, add to FAQ/onboarding docs if repeated
    │
    └── Spam / non-applicable → Archive
```

## 4. Incident Triage Workflow

```
Incident detected (Sentry alert, user report, or manual observation)
    │
    ├── Severity assessment
    │   ├── SEV-1: Data loss, security breach, complete outage → Drop everything
    │   ├── SEV-2: Major feature broken, auth issues → Address within 4h
    │   ├── SEV-3: Minor bug, UX issue → Address within 24h
    │   └── SEV-4: Cosmetic, non-blocking → Address in next dev cycle
    │
    ├── Response
    │   ├── Acknowledge incident to affected users
    │   ├── Diagnose root cause
    │   ├── Implement fix or rollback
    │   ├── Verify fix in staging
    │   └── Deploy with OWNER_NAME_PLACEHOLDER approval
    │
    └── Post-incident
        ├── Document in incident log
        ├── Update runbook if procedure changed
        └── Schedule postmortem if SEV-1 or SEV-2
```

## 5. Feedback Triage Workflow

```
Weekly: collect all feedback from:
  - Participant weekly check-ins
  - SUPPORT_INBOX_PLACEHOLDER
  - Direct messages / Slack / chat
  - .ai feedback log
    │
    ├── Categorize by type: bug / UX / feature / performance / security
    │
    ├── Score severity (1–4)
    │   ├── 1: Critical — blocks core workflow
    │   ├── 2: Major — significant friction
    │   ├── 3: Minor — annoyance or polish
    │   └── 4: Nice-to-have — future consideration
    │
    ├── Map to roadmap: which goal card or layer?
    │
    └── Update: 00-dashboard, relevant goal card, or create new card
```

## 6. Weekly Review Agenda

30-minute self-review every Friday:

1. **Support review:** How many tickets? Any patterns?
2. **Incident review:** Any incidents this week? What was root cause?
3. **Feedback synthesis:** Top 3 themes from participant feedback
4. **Goal progress:** Which cards moved? Any blockers?
5. **Performance:** Any regressions? Bundle size or latency changes?
6. **Next week priorities:** Top 3 things to work on
7. **Beta health check:** Any reason to pause beta?

## 7. What Can Be Automated

| Task | Automation Potential | Priority |
|------|---------------------|----------|
| Error alerting | Sentry alerts for SEV-1/SEV-2 | Before beta |
| Uptime monitoring | Synthetic health check | Before beta |
| Support auto-responder | "Got your message, will respond within 24h" | Before beta |
| Feedback form | Structured form linked in app | BETA P1 |
| Weekly feedback reminder | Automated email to participants | BETA P1 |
| CI/CD | GitHub Actions + Vercel | Before beta |
| Secret scanning | CI pipeline | Before beta |
| Log aggregation | Vercel log drain to Sentry or equivalent | BETA P1 |

## 8. What Can Be Delegated Later

| Task | When to Delegate | To Whom |
|------|-----------------|---------|
| Frontline support | After 20+ users | Part-time support contractor |
| Legal document review | Before public launch | Legal counsel |
| UI/UX design | When redesigning for public launch | Freelance designer |
| DevOps/infrastructure | When scaling beyond single region | DevOps contractor |
| QA/testing | When beta grows beyond 8 users | Part-time QA |
| Content/marketing | Before public launch | Marketing contractor |

## 9. When to Pause Beta

Pause controlled beta if:

- A SEV-1 security or data-loss incident occurs and cannot be resolved within 4 hours
- Support/incident load exceeds 10 hours in a single week
- A participant reports data they cannot afford to lose and recovery is uncertain
- Supabase or Vercel has an extended outage (> 4 hours) affecting all users
- OWNER_NAME_PLACEHOLDER is unavailable for > 3 consecutive business days without coverage
- 2+ participants drop out and replacements cannot be recruited

**Pause procedure:**
1. Notify all participants: "Beta is temporarily paused while we address [reason]"
2. Stop new feature development
3. Focus exclusively on stabilization
4. Resume only when root cause is resolved and OWNER_NAME_PLACEHOLDER approves

## 10. Bus-Factor Risks

| Risk | Current State | Mitigation |
|------|--------------|------------|
| OWNER_NAME_PLACEHOLDER is sole developer | No backup developer | Document architecture in DESIGN.md and .ai/ docs. Code is in GitHub. |
| OWNER_NAME_PLACEHOLDER is sole incident responder | No escalation path | Document runbooks. Sentry alerts go to OWNER_NAME_PLACEHOLDER only. |
| OWNER_NAME_PLACEHOLDER controls all credentials | No shared access | Credentials in password manager (1Password or equivalent). No sharing for beta. |
| OWNER_NAME_PLACEHOLDER is sole domain/DNS admin | No backup admin | Domain registered in the owner's name. DNS documented. |
| OWNER_NAME_PLACEHOLDER is sole Supabase admin | No backup admin | Supabase project owner is Philip. No sharing for beta. |
| OWNER_NAME_PLACEHOLDER is sole code owner | Code is on GitHub | Private repo. No other collaborators with write access for beta. |

**Beta posture:** Accept bus-factor risk for beta (solo founder is the reality). For public launch, create emergency access procedure with trusted delegate.

## 11. Minimum Operating Dashboard

OWNER_NAME_PLACEHOLDER should check these weekly:

| Metric | Source | Target |
|--------|--------|--------|
| Active beta participants | Manual count | 5–8 |
| Support tickets this week | Email inbox | < 5 |
| Open incidents | Incident log | 0 SEV-1/SEV-2 |
| Uptime (health check) | Synthetic monitor | > 99% |
| Error rate | Sentry | < 5% of requests |
| Performance baseline | Lighthouse / bundle analyzer | Within beta targets |
| Goal cards completed | 26-codex-goal-cards.md | Incrementing weekly |
| Feedback themes | Weekly synthesis | 3+ themes captured |

---

## Decisions Embedded

| Decision | Status |
|----------|--------|
| OWNER_NAME_PLACEHOLDER is incident owner for beta | `DECIDED / PHILIP` |
| OWNER_NAME_PLACEHOLDER is rollback authority for beta | `DECIDED / PHILIP` |
| No deploy without OWNER_NAME_PLACEHOLDER approval | `PERMANENT` |
| Beta pauses if support/incident load exceeds capacity | `DECIDED` |

---

*Review this plan before beta kickoff. Update after first 2 weeks of beta based on actual operating data.*

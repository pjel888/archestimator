# 27 — Gradual Rollout Strategy

**Status:** Complete  
**Created:** 2026-05-29  
**Purpose:** Safe deployment strategies for performance optimizations using feature flags, percentage rollouts, and monitoring. Minimizes risk and enables quick rollback if issues arise.

---

## Table of Contents

1. [Rollout Philosophy](#1-rollout-philosophy)
2. [Feature Flags Implementation](#2-feature-flags-implementation)
3. [Percentage Rollout Strategy](#3-percentage-rollout-strategy)
4. [Canary Deployments](#4-canary-deployments)
5. [Monitoring During Rollout](#5-monitoring-during-rollout)
6. [Rollback Procedures](#6-rollback-procedures)
7. [Rollout Checklist](#7-rollout-checklist)
8. [Phase-Specific Rollout Plans](#8-phase-specific-rollout-plans)

---

## 1. Rollout Philosophy

### 1.1 Core Principles

**Start small, scale gradually:**
1. **Internal testing** — Team uses feature for 1 week
2. **Beta users** — 5% of users for 1 week
3. **Gradual increase** — 5% → 25% → 50% → 100%
4. **Monitor at each stage** — Check metrics before increasing
5. **Quick rollback** — Revert within 5 minutes if issues arise

**Why gradual rollout?**
- **Minimize blast radius** — If something breaks, only affects small % of users
- **Validate assumptions** — Real user data may differ from lab tests
- **Catch edge cases** — Production has more scenarios than testing
- **Build confidence** — Gradual success builds team confidence

### 1.2 Rollout Timeline

```
Week 1: Internal testing (team only)
Week 2: Beta users (5% of traffic)
Week 3: Gradual increase (5% → 25% → 50%)
Week 4: Full rollout (100%)
```

**Total time:** 4 weeks per phase

**Exceptions:**
- **Critical bugs** — Immediate rollback
- **Major performance wins** — Can accelerate to 2 weeks
- **Low-risk changes** — Can skip beta (e.g., code splitting)

---

## 2. Feature Flags Implementation

### 2.1 Feature Flag Service

**Tool:** LaunchDarkly, Split.io, or custom implementation

**Custom implementation:**

```typescript
// src/lib/feature-flags.ts
type FeatureFlag = {
  name: string;
  enabled: boolean;
  percentage: number; // 0-100
  allowList?: string[]; // User IDs
};

const FLAGS: Record<string, FeatureFlag> = {
  'performance-phase-1': {
    name: 'Performance Phase 1',
    enabled: true,
    percentage: 100,
  },
  'performance-phase-1.5': {
    name: 'Performance Phase 1.5',
    enabled: true,
    percentage: 5, // Start with 5%
  },
  'react-memo-optimization': {
    name: 'React Memo Optimization',
    enabled: true,
    percentage: 5,
  },
  'proxy-middleware-migration': {
    name: 'Proxy Middleware Migration',
    enabled: true,
    percentage: 1, // Start with 1% (high risk)
    allowList: ['internal-user-1', 'internal-user-2'],
  },
};

export function isFeatureEnabled(flagName: string, userId?: string): boolean {
  const flag = FLAGS[flagName];
  
  if (!flag || !flag.enabled) {
    return false;
  }
  
  // Check allow list
  if (flag.allowList && userId && flag.allowList.includes(userId)) {
    return true;
  }
  
  // Check percentage
  if (userId) {
    const hash = hashString(userId);
    const bucket = hash % 100;
    return bucket < flag.percentage;
  }
  
  return false;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}
```

### 2.2 Using Feature Flags

**In components:**

```typescript
// src/components/ProjectList.tsx
import { isFeatureEnabled } from '@/lib/feature-flags';
import { useUser } from '@/hooks/useUser';

function ProjectList() {
  const { user } = useUser();
  const enableOptimization = isFeatureEnabled('react-memo-optimization', user?.id);
  
  if (enableOptimization) {
    return <OptimizedProjectList />;
  }
  
  return <LegacyProjectList />;
}
```

**In middleware:**

```typescript
// src/middleware.ts
import { isFeatureEnabled } from '@/lib/feature-flags';

export async function middleware(request: NextRequest) {
  const userId = request.cookies.get('user-id')?.value;
  
  if (isFeatureEnabled('proxy-middleware-migration', userId)) {
    // New middleware logic
    return newMiddlewareLogic(request);
  }
  
  // Old proxy logic
  return oldProxyLogic(request);
}
```

### 2.3 Feature Flag Dashboard

**Create admin page to manage flags:**

```typescript
// src/app/admin/feature-flags/page.tsx
export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState(FLAGS);
  
  const updateFlag = (name: string, percentage: number) => {
    setFlags(prev => ({
      ...prev,
      [name]: { ...prev[name], percentage },
    }));
    
    // Save to database/API
    fetch('/api/feature-flags', {
      method: 'POST',
      body: JSON.stringify({ name, percentage }),
    });
  };
  
  return (
    <div>
      <h1>Feature Flags</h1>
      {Object.entries(flags).map(([name, flag]) => (
        <div key={name}>
          <h2>{flag.name}</h2>
          <label>
            Percentage: {flag.percentage}%
            <input
              type="range"
              min="0"
              max="100"
              value={flag.percentage}
              onChange={(e) => updateFlag(name, Number(e.target.value))}
            />
          </label>
        </div>
      ))}
    </div>
  );
}
```

---

## 3. Percentage Rollout Strategy

### 3.1 Rollout Stages

| Stage | Percentage | Duration | Criteria to Proceed |
|-------|-----------|----------|---------------------|
| **Internal** | 0% (team only) | 1 week | No critical bugs |
| **Beta** | 5% | 1 week | Error rate < 1%, latency improved |
| **Early adopters** | 25% | 1 week | Error rate < 0.5%, latency improved |
| **Majority** | 50% | 1 week | Error rate < 0.1%, latency improved |
| **Full rollout** | 100% | Ongoing | All metrics green |

### 3.2 Rollout Decision Tree

```
Start at 5%
  ↓
Monitor for 1 week
  ↓
├─ Error rate > 1%? → Rollback
├─ Latency worse? → Rollback
├─ User complaints? → Investigate
└─ All good? → Increase to 25%
  ↓
Monitor for 1 week
  ↓
├─ Error rate > 0.5%? → Rollback to 5%
├─ Latency worse? → Rollback to 5%
├─ User complaints? → Investigate
└─ All good? → Increase to 50%
  ↓
Monitor for 1 week
  ↓
├─ Error rate > 0.1%? → Rollback to 25%
├─ Latency worse? → Rollback to 25%
├─ User complaints? → Investigate
└─ All good? → Increase to 100%
```

### 3.3 Rollout Automation

**File:** `scripts/rollout.ts`

```typescript
const ROLLOUT_STAGES = [
  { percentage: 5, duration: 7 * 24 * 60 * 60 * 1000 }, // 1 week
  { percentage: 25, duration: 7 * 24 * 60 * 60 * 1000 },
  { percentage: 50, duration: 7 * 24 * 60 * 60 * 1000 },
  { percentage: 100, duration: Infinity },
];

async function checkMetrics(flagName: string): Promise<boolean> {
  const metrics = await fetchMetrics(flagName);
  
  // Check error rate
  if (metrics.errorRate > 0.01) {
    console.error(`Error rate too high: ${metrics.errorRate}`);
    return false;
  }
  
  // Check latency
  if (metrics.latencyP95 > 500) {
    console.error(`Latency too high: ${metrics.latencyP95}ms`);
    return false;
  }
  
  return true;
}

async function advanceRollout(flagName: string) {
  const currentStage = await getCurrentStage(flagName);
  const nextStage = ROLLOUT_STAGES[currentStage + 1];
  
  if (!nextStage) {
    console.log('Already at 100%');
    return;
  }
  
  const metricsOk = await checkMetrics(flagName);
  
  if (metricsOk) {
    console.log(`Advancing to ${nextStage.percentage}%`);
    await updatePercentage(flagName, nextStage.percentage);
  } else {
    console.log('Metrics not ok, staying at current percentage');
  }
}

// Run daily
advanceRollout('performance-phase-1.5');
```

---

## 4. Canary Deployments

### 4.1 What Are Canary Deployments?

**Canary deployment:** Deploy new version to small % of servers, monitor, then roll out to all servers.

**Benefits:**
- Test in production with real traffic
- Quick rollback if issues arise
- Compare metrics between old and new versions

### 4.2 Vercel Canary Deployments

**Using Vercel's deployment protection:**

```bash
# Deploy to preview environment
vercel --target=preview

# Test with team
# ...

# Promote to production (canary)
vercel promote <deployment-url> --target=production --percentage=5

# Monitor for 1 week
# ...

# Increase to 25%
vercel promote <deployment-url> --target=production --percentage=25

# ... continue rollout
```

### 4.3 Comparing Canary vs Control

**Metrics to compare:**

| Metric | Control (old) | Canary (new) | Delta |
|--------|---------------|--------------|-------|
| **Error rate** | 0.1% | 0.08% | -20% ✅ |
| **Latency P50** | 300ms | 150ms | -50% ✅ |
| **Latency P95** | 800ms | 400ms | -50% ✅ |
| **LCP** | 2.5s | 1.8s | -28% ✅ |
| **Overlay visibility** | 100% | 15% | -85% ✅ |

**Decision:** If all metrics improve or stay same, proceed with rollout.

---

## 5. Monitoring During Rollout

### 5.1 Key Metrics to Watch

**Every 15 minutes:**

1. **Error rate** — Should not increase
2. **Navigation latency** — Should decrease or stay same
3. **Overlay visibility rate** — Should decrease
4. **Core Web Vitals** — Should improve or stay same
5. **User complaints** — Check support tickets

### 5.2 Alerting During Rollout

**Stricter thresholds during rollout:**

| Metric | Normal Threshold | Rollout Threshold |
|--------|------------------|-------------------|
| **Error rate** | > 1% (warning) | > 0.5% (warning) |
| **Latency P95** | > 500ms (warning) | > 400ms (warning) |
| **Overlay visibility** | > 20% (warning) | > 30% (warning) |

**Alert channels:**
- Slack #performance-alerts
- PagerDuty (for critical alerts)
- Email (daily summary)

### 5.3 Dashboard During Rollout

**Create dedicated rollout dashboard:**

```typescript
// src/app/admin/rollout-dashboard/page.tsx
export default function RolloutDashboard() {
  const { data: metrics } = useSWR('/api/metrics/rollout');
  
  return (
    <div>
      <h1>Rollout Dashboard</h1>
      
      <h2>Control vs Canary</h2>
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th>Control</th>
            <th>Canary</th>
            <th>Delta</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Error Rate</td>
            <td>{metrics.control.errorRate}%</td>
            <td>{metrics.canary.errorRate}%</td>
            <td className={metrics.canary.errorRate < metrics.control.errorRate ? 'text-green' : 'text-red'}>
              {((metrics.canary.errorRate - metrics.control.errorRate) / metrics.control.errorRate * 100).toFixed(1)}%
            </td>
          </tr>
          {/* More metrics */}
        </tbody>
      </table>
      
      <h2>Rollout Progress</h2>
      <progress value={metrics.percentage} max="100" />
      <span>{metrics.percentage}%</span>
    </div>
  );
}
```

---

## 6. Rollback Procedures

### 6.1 When to Rollback

**Immediate rollback if:**
- Error rate increases by > 50%
- Navigation latency increases by > 50%
- Critical bugs reported (auth failures, data loss)
- User complaints spike

**Investigate (don't rollback yet) if:**
- Error rate increases by 10-50%
- Navigation latency increases by 10-50%
- Minor bugs reported (UI glitches)

### 6.2 Rollback Steps

**Step 1: Disable feature flag**

```typescript
// src/lib/feature-flags.ts
const FLAGS = {
  'performance-phase-1.5': {
    name: 'Performance Phase 1.5',
    enabled: false, // ← Set to false
    percentage: 0,
  },
};
```

**Step 2: Deploy immediately**

```bash
# Commit change
git add src/lib/feature-flags.ts
git commit -m "Rollback: disable performance phase 1.5"

# Deploy to production
vercel --prod
```

**Step 3: Verify rollback**

```bash
# Check error rate
curl https://api.example.com/metrics/error-rate

# Check latency
curl https://api.example.com/metrics/latency

# Both should return to baseline
```

**Step 4: Investigate root cause**

```bash
# Check logs
vercel logs --output=raw | grep "error"

# Check Sentry
# https://sentry.io/organizations/archestimator/issues/

# Check user reports
# https://support.example.com/tickets
```

**Step 5: Fix and re-rollout**

```bash
# Fix issue
# ...

# Re-enable feature flag
# Set percentage to 1% (start over)
```

### 6.3 Emergency Rollback (5 minutes)

**If critical issue in production:**

```bash
# 1. SSH into production server
ssh production

# 2. Edit feature flags directly
vim /app/config/feature-flags.json
# Set all performance flags to false

# 3. Restart server
pm2 restart all

# 4. Verify
curl https://api.example.com/health
```

**Alternative: Vercel deployment rollback**

```bash
# Rollback to previous deployment
vercel rollback

# Verify
vercel inspect
```

---

## 7. Rollout Checklist

### 7.1 Pre-Rollout Checklist

- [ ] **All tests pass** — Unit, integration, E2E
- [ ] **Performance budgets met** — Bundle size, latency, Core Web Vitals
- [ ] **Feature flags implemented** — Can enable/disable without deploy
- [ ] **Monitoring in place** — Dashboard, alerts, logging
- [ ] **Rollback plan documented** — Steps to rollback in 5 minutes
- [ ] **Team trained** — Everyone knows how to rollback
- [ ] **Beta users selected** — 5% of users identified
- [ ] **Communication plan** — Inform team before rollout

### 7.2 During Rollout Checklist

**Daily:**
- [ ] Check error rate (should not increase)
- [ ] Check latency (should decrease or stay same)
- [ ] Check user complaints (should not spike)
- [ ] Check Sentry for new errors

**Weekly:**
- [ ] Review rollout dashboard
- [ ] Compare control vs canary metrics
- [ ] Decide: advance, hold, or rollback
- [ ] Update team on progress

### 7.3 Post-Rollout Checklist

- [ ] **100% rollout achieved** — All users on new version
- [ ] **Metrics improved** — Latency, error rate, Core Web Vitals
- [ ] **No regressions** — All tests still pass
- [ ] **Documentation updated** — Remove feature flags, update docs
- [ ] **Retrospective** — What went well, what to improve

---

## 8. Phase-Specific Rollout Plans

### 8.1 Phase 1 Rollout (Quick Wins)

**Risk level:** LOW

**Changes:**
- Increase React Query `staleTime`
- Add `loading.tsx` skeletons
- Code split heavy components
- Add React `cache()` to repositories
- Add 150ms delay to loading overlay

**Rollout plan:**
- **Week 1:** Internal testing (team only)
- **Week 2:** Beta users (5%)
- **Week 3:** Full rollout (100%)

**Why faster?** Low risk, easy to rollback, high confidence.

### 8.2 Phase 1.5 Rollout (Critical Infrastructure)

**Risk level:** MEDIUM-HIGH

**Changes:**
- Proxy.ts → middleware migration
- React.memo optimization
- Project layout caching
- Error boundaries

**Rollout plan:**
- **Week 1:** Internal testing (team only)
- **Week 2:** Beta users (5%)
- **Week 3:** Early adopters (25%)
- **Week 4:** Majority (50%)
- **Week 5:** Full rollout (100%)

**Why slower?** Proxy migration is high risk, need more validation.

**Special considerations:**
- **Proxy migration:** Start with 1% (allow list only)
- **React.memo:** Can rollout faster (low risk)
- **Layout caching:** Start with 5%, monitor cache hit rate
- **Error boundaries:** Can rollout faster (additive change)

### 8.3 Phase 2 Rollout (Strategic Investments)

**Risk level:** MEDIUM

**Changes:**
- Hover prefetch
- Suspense in layouts
- bfcache compatibility
- N+1 query fixes

**Rollout plan:**
- **Week 1:** Internal testing (team only)
- **Week 2:** Beta users (5%)
- **Week 3:** Early adopters (25%)
- **Week 4:** Full rollout (100%)

**Special considerations:**
- **Hover prefetch:** Monitor for excessive API calls
- **Suspense:** Check for hydration errors
- **bfcache:** Verify on all browsers
- **N+1 fixes:** Monitor query count

### 8.4 Phase 3 Rollout (Peak-Load Hardening)

**Risk level:** MEDIUM-HIGH

**Changes:**
- Virtualized lists
- Streaming for chart data
- Component library pagination

**Rollout plan:**
- **Week 1:** Internal testing (team only)
- **Week 2:** Beta users (5%)
- **Week 3:** Early adopters (25%)
- **Week 4:** Majority (50%)
- **Week 5:** Full rollout (100%)

**Special considerations:**
- **Virtualization:** Test with 100+ items
- **Streaming:** Check for layout shift
- **Pagination:** Verify search/filter still works

---

## 9. Communication Plan

### 9.1 Internal Communication

**Before rollout:**
- Slack message to #engineering
- Email to team
- Calendar invite for rollout start

**During rollout:**
- Daily Slack updates in #performance-rollout
- Weekly email summary
- Immediate alerts for issues

**After rollout:**
- Slack announcement in #engineering
- Blog post (optional)
- Team retrospective

### 9.2 User Communication

**Beta users:**
- Email invitation to beta program
- Instructions on how to provide feedback
- Thank you email after beta

**Full rollout:**
- Release notes in app
- Blog post (optional)
- Social media announcement (optional)

---

## 10. Success Metrics

### 10.1 Rollout Success Criteria

**Phase is successful if:**
- [ ] Error rate does not increase
- [ ] Navigation latency improves by > 20%
- [ ] Overlay visibility rate decreases by > 50%
- [ ] No critical bugs reported
- [ ] User complaints < 5 per week
- [ ] 100% rollout achieved within 5 weeks

### 10.2 Rollout Failure Criteria

**Rollback if:**
- [ ] Error rate increases by > 50%
- [ ] Navigation latency increases by > 50%
- [ ] Critical bugs reported (auth failures, data loss)
- [ ] User complaints > 20 per week
- [ ] Cannot achieve 100% rollout within 8 weeks

---

**Next:** See `28-code-style-guide.md` for coding standards and best practices.

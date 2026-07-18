# 03 — Experiments, Metrics, and Operating Plan

Audit commit `a41a07d01`. Six experiments with pass/fail/inconclusive/kill
rules, minimum event taxonomy, founder operating cadence.

---

## A. Design-partner experiment

### Participant criteria (include)

- AEC professional in the Philippines (or PH-adjacent SE Asia) producing ≥4
  estimates per quarter.
- Currently estimating in Excel (not an existing SaaS user).
- Owner/founder/decision-maker of their estimating workflow (no procurement
  gate).
- Willing to share one real (or realistic) past estimate for the first session.
- Willing to commit to a weekly 15-min check-in for ≥4 weeks.
- Uses email and a modern browser; has GCash/bank access for any future paid
  step.

### Exclusion criteria

- Firms where estimating is gated by IT, procurement, or legal review.
- Users whose primary need is visualization, 3D, or BIM (wrong product).
- Users without reliable internet for weekly calls.
- Material suppliers or distributors (wrong side of marketplace).
- Existing users of paid estimating SaaS who would be comparing feature parity
  rather than evaluating the cold-start value.

### Cohort mix (5–8 participants)

- 4–6 primary beachhead: solo/freelance cost estimator or QS.
- 1–2 secondary: solo architect / small architectural practice.
- 0–1 stretch: small (≤3 seats) fit-out contractor (only if access is
  exceptional and support capacity allows).

### Outreach (in priority order)

1. Philip's direct network (LinkedIn, prior professional contacts in PH AEC).
2. PH construction/architecture communities and groups.
3. Referrals from design partners once 2+ are active (M2 referral field).
4. Cold outreach only if (1)–(3) yield fewer than 5 qualified candidates in
   2 weeks.

### Qualification

- 30-min call using the problem-interview script (`M4-02`).
- Capture: persona, company, estimating volume, current tool, top friction,
  budget authority.
- Record result in `beta_access_requests` (`status = qualified` or
  `rejected`).

### Kickoff (first guided session)

- 60-min founder-led session: user's real data imported or sample estimate
  reviewed; first project + estimate created; first priced row; first total;
  first export preview.
- Capture: starting data format, setup time, friction log, perceived value.

### Real-workflow task (week 1)

- User attempts a real bid (or re-estimate of a past bid) using Archestimator.
- Founder on call/Slack for questions; user keeps their Excel backup.

### Weekly questions (15 min)

1. Did you open Archestimator this week? For what?
2. Did you produce or revise an estimate? For what kind of job?
3. Did you reuse anything from your library or a template?
4. Did anything block you or waste your time?
5. Did you share/export anything to a client? What happened?
6. On a 1–10 scale, how disappointed would you be if Archestimator disappeared
   next week? (Sean Ellis test.)
7. Would you pay `[candidate price]` per month for this? Why or why not?

### Exit criteria (per participant)

- **Pass:** completed ≥2 real estimates in 4 weeks AND reused library/template
  on the second AND would be "very disappointed" to lose it (≥7).
- **Partial:** completed 1 real estimate; ambiguous on retention.
- **Fail:** did not complete a real estimate; or did not return after week 1.
- **Mismatch:** was the wrong segment from the start (record why; refine ICP).

### Participant risk disclosure

- The product is closed beta; no SLA; data may be lost; users must keep their
  own spreadsheet or file backup; support is best-effort during business hours.
- Stated in the beta agreement (M1-05) and Terms clickwrap.

### Evidence to collect

- Activation events for each participant (from M1-02 emitter).
- Week-1 and week-4 activity (from M3-02 retention metric).
- Reuse events (library items reused in new estimates).
- Share/export events.
- Weekly notes (qualitative).
- Pricing-conversation outcomes (M4-02, M4-03).

---

## B. Activation experiment

### Activation definition

**Primary:** `first_valid_total` milestone reached within 24h of
`invite_accepted`. (Source: `rows.ts:2015-2033`; activation ledger.)

**Secondary (week-1 strength):** `export_completed` OR `publication_created`
within 7 days of `invite_accepted`.

### Time-to-first-value target

- **Guided-sample path:** <2 minutes (calibration baseline).
- **Blank path with seeded library:** <5 minutes.
- **Blank path with empty library + express rows:** <10 minutes.
- **Concierge import path (M3-01 shipped):** <30 minutes including import.

Target for the cohort: median time-to-first-value ≤15 minutes from workshop
land.

### First-session script

1. Founder joins call (or shares a Loom for async).
2. User signs in via magic link or Google.
3. User accepts Terms (recorded).
4. User lands on workshop dashboard (with mounted checklist after M2-01).
5. Founder walks the guided sample (2 min) to prove the engine.
6. Founder and user import the user's real data (or hand-key 5–10 representative
   items) — 15–20 min.
7. User creates a real estimate using those items — 10–15 min.
8. User exports BOQ XLSX — 1 min.
9. Founder and user preview a shared-link handoff — 5 min.

### Observed friction log

Capture per session:
- time per step;
- screens where the user hesitated;
- places the user tried to do something the product does not support;
- vocabulary mismatches (PH AEC terms);
- error states encountered.

### Success / failure criteria

- **Pass:** ≥80% of the cohort reaches `first_valid_total` in the kickoff
  session; ≥60% reaches `export_completed` in week 1.
- **Inconclusive:** 50–80% reach first-value; specific friction identified but
  not yet addressed.
- **Fail:** <50% reach first-value; product is not usable enough for
  unattended repeat use. Pivot: double down on import + onboarding polish; do
  not recruit more until pass.

---

## C. Retention experiment

### Week-1 behavior

- User returns to the workshop within 7 days of kickoff.
- Creates a second estimate OR revises the first.
- Reuses at least one library item.

### Week-4 behavior

- User has produced or revised ≥2 estimates in the 4-week window.
- Library has grown OR a template has been instantiated.
- User has shared or exported at least once.

### Second-estimate signal

The clearest retention signal: a *second* estimate in the same workspace. The
schema supports detecting this from `estimates` rows + creation timestamps.

### Reuse signal

`estimate_row_items.source_library_item_id` non-null in an estimate whose
`created_at` is >7 days after the source library item was first priced
(`pricing_provenance_origin` lineage, `migrations/0072_…sql:60-80`).

### Share / export signal

`export_completed` and `publication_created` events (already in activation
ledger).

### Stop / continue criteria

- **Continue:** ≥50% of the cohort has produced a second estimate by end of
  week 4.
- **Pivot:** 25–50% produce a second estimate; investigate the failing half
  with interviews.
- **Kill (reframe thesis):** <25% produce a second estimate; the reuse thesis
  is not validated for this segment. Either narrow the segment further or
  reposition the value prop (e.g. "faster first estimate" rather than "reuse").

---

## D. Pricing experiment

### Problem interviews (≥5)

- How do you estimate today? Walk me through a recent bid.
- How long did it take? Where did the time go?
- What broke or was painful?
- What did it cost you in time, errors, or lost bids?
- What tools have you tried? Why did they not stick?

### Value interviews (≥2 active users)

- For the estimates you have done in Archestimator, how much time did it save?
- What is that worth in PHP per week?
- What would you stop doing or stop paying for if you adopted it?
- Who else in your network has this pain?

### Van Westendorp PSM (≥5 respondents)

Four questions, deployed as a short form:
1. At what price would Archestimator be so cheap that you'd doubt its quality?
2. At what price would it be a bargain?
3. At what price is it getting expensive?
4. At what price is it so expensive you wouldn't buy?

Aggregate to find the acceptable-price band and the optimal price point.

### Direct willingness-to-pay ask

Concrete founding-member offer (placeholder number, e.g. ₱499 or ₱999 / month
for the first 12 months, founder-member rate locked). Capture the response:
accepted / counter / refused.

### Founding-customer offer

- Founder-member rate: X% off published price, locked for 12 months.
- Founding members get naming in early case studies (with consent).
- Cap at 10 founding members.

### Target evidence before publishing pricing

- ≥5 problem interviews documented.
- ≥2 active users on real estimates for ≥4 weeks.
- ≥5 Van Westendorp responses.
- ≥3 direct WTP conversations (1 accept or counter).
- 1 alternative mapped per active user.

### Evidence before building billing

- ≥2 users have accepted a specific price.
- ≥1 user has paid (manual invoice OK).
- Founder is confident the price covers Cloudflare unit economics + margin.

---

## E. Founder operating cadence

### Daily checks (≤5 min)

- `/admin` Beta health card: leads, activation funnel, week-1 retained, open
  feedback by severity, open incidents.
- `support@archestimator.com` inbox.
- Workers Observability error tail (or `/admin/observability`).

### Weekly review (60 min)

- Cohort stalled-state (`listActivationCohort`): who is `setup_stalled`,
  `value_stalled`, `handoff_stalled`, `not_started`? Action each.
- Feedback queue (`/workshop/settings/feedback`): tag per the qualitative
  framework (one-off / repeated friction / core blocker / missing capability /
  trust failure / segment mismatch). Update `status`. Close with the user
  where possible.
- Support inbox (`/admin/support`): close resolved, escalate blockers.
- Activity feeds per active project: client comments/decisions needing a
  response.
- Write weekly synthesis to `.ai/13_research/cohort-N-week-YYYYWW.md`.

### Support triage (as-incurred, target <24h ack)

- Any beta feedback marked `blocker` or `high` severity: same-day ack.
- Any client comment on a shared link within 24h.
- Any support email within 1 business day.

### Incident triage

- Use `bun run ops:incident` to record; surfaces on `/admin`.
- Severity ≥ "major": notify all active cohort within 24h by email + in-app
  announcement.

### Feedback synthesis (weekly, 30 min slot)

- Read all new events (M2-03 wiring surfaces these as notifications).
- Apply the qualitative framework:
  - **one-off preference** → note, no action;
  - **repeated friction** → candidate for backlog;
  - **core workflow blocker** → priority for the next iteration;
  - **missing expected capability** → segment test (do others expect it too?);
  - **trust failure** → escalate; consider pause;
  - **market-segment mismatch** → refine ICP / exclusion criteria.
- Update `beta_feedback_submissions.status` and notes.

### Release communication

- Any source change deployed to the cohort: in-app announcement via
  `broadcastNotification` (`/admin/notifications`); email if material.
- Change log captured at `/admin/releases`.

### Cohort health (monthly)

- Re-run retention metrics (M3-02).
- Re-run reuse rate (M3-02).
- Compare to prior month; identify stalls.
- Decide: continue cohort / close cohort / recruit next cohort.

### Pause criteria

Stop recruiting and stop the cohort if **any** of:
- a trust failure occurs (data loss, cross-workspace leak, totals bug) until
  root-caused and fixed;
- weekly support burden exceeds the founder's available capacity for 2
  consecutive weeks;
- <25% of the cohort produces a second estimate in week 4 and interviews do
  not surface a fixable cause;
- a single design partner escalates a legal/compliance issue.

---

## F. Minimum event taxonomy

Each event: name, trigger, actor, identifiers, properties, PII rule, metric
served, implementation surface.

| Event | Trigger | Actor | Identifiers | Properties | PII rule | Metric served | Surface |
|---|---|---|---|---|---|---|---|
| `landing_cta_click` | User clicks a public CTA | anonymous visitor | session_id, ip (hashed) | `cta_id`, `location`, `href`, `variant` | No PII. IP stored only as salted hash. | CTA conversion, A/B variant lift | `LandingCTAs.tsx` onClick |
| `access_request_submitted` | Access-request server action succeeds | anonymous visitor | normalized_email, ip (hashed) | `persona`, `company` (optional), `estimating_volume`, `current_tool`, `source_cta`, `inquiry_type` | Email stored (operational). IP hashed. | access_request_to_kickoff_conversion; source_of_qualified_leads | new `submitAccessRequest` action |
| `access_request_qualified` | Admin sets status=`qualified` | founder (admin) | lead_id | `notes` (sanitized) | notes from founder only | qualification rate | `/admin/access-requests` status update |
| `invite_accepted` | Existing activation event — mirror to `product_events` | user | user_id, workspace_id | `invitation_source` | none | activation funnel; acquisition conversion | reuse `invitation-d1-store.ts:585,717` |
| `project_created` | Existing activation event — mirror | user | user_id, workspace_id | `project_type`, `path` (`guided_sample` / `workspace_template` / `blank`) | none | path-to-first-value distribution | reuse `projects/actions.ts:1154` |
| `first_valid_total` | Existing activation event — mirror | user | user_id, workspace_id, estimate_id | `time_since_invite_seconds`, `row_count` | none | TTFV; activation funnel | reuse `rows.ts:2015-2033` |
| `export_completed` | Existing activation event — mirror | user | user_id, workspace_id, estimate_id | `format` (xlsx), `audience` (internal/client), `row_count` | none | export rate; activation funnel | reuse `proposal-export-completed/route.ts:61` |
| `publication_created` | Existing activation event — mirror | user | user_id, workspace_id, publication_id | `recipient_count`, `password_protected` | none | share rate; activation funnel | reuse `publication/admin-d1-client.ts:620` |
| `library_item_reused` *(M3-02)* | A row in a new estimate references a `source_library_item_id` first priced >7d ago | user | user_id, workspace_id, library_item_id, estimate_id | `days_since_first_priced` | none | reuse rate; retention predictor | new derived query (not real-time emit) |
| `second_estimate_created` *(M3-02)* | A workspace creates its second estimate | user | user_id, workspace_id, estimate_id | `days_since_first_estimate` | none | week-1 retention signal | new derived query |
| `client_opened_shared_link` *(exists)* | Recipient opens `/share/[token]` | client recipient | publication_id, recipient_id | `first_open`, `re_open` | none | client engagement | reuse existing `recordProjectPublicationAnalyticsEvent` |

**Reuse rather than double-emit.** The activation ledger already records the
in-product milestones; the minimum change is (a) emit landing-side events that
do not exist today, (b) expose the existing activation events through a single
`/admin` view, and (c) add the two derived queries (reuse + second estimate).

**PII rule:** email is operational (needed for access requests); IP is always
salted-hashed; no client-identifying data in client-side events; consent
follows the existing analytics consent gate (`LandingAnalyticsLoader.tsx`).

---

## G. Mandatory startup metrics

Recommend the final set after cohort-1 data, but evaluate these candidates
(master prompt §14):

### Acquisition

- qualified access requests per week — *available after M1-01*
- access-request-to-kickoff conversion — *available after M1-01*
- source of qualified leads — *available after M1-01*
- walkthrough attendance — *manual*

### Activation

- % reaching first calculated total — *available (activation ledger)*
- % reaching first export/share — *available (activation ledger)*
- median time to first value — *derivable after M1-02*
- project-to-estimate conversion — *derivable*
- estimate-to-five-meaningful-rows conversion — *derivable*
- import/starter-data usage — *available after M3-01*

### Retention

- week-1 active workspaces — *available after M3-02*
- week-4 active workspaces — *available after M3-02*
- second estimate created — *available after M3-02*
- second export/share — *derivable*
- library/template reuse — *available after M3-02*
- resumed work within 7 days — *derivable*

### Collaboration and client value

- shared links opened — *exists*
- comments or decisions — *exists*
- decision-to-revision loop — *derivable*
- invite acceptance — *exists*
- collaborator contribution — *derivable*

### Learning

- completed feedback sessions — *manual*
- critical friction themes — *manual synthesis*
- hypothesis confirmed/rejected — *manual*
- experiment decision latency — *manual*
- % feedback closed with the user — *derivable*

### Commercial

- willingness-to-pay interviews completed — *manual*
- users naming a budget — *manual*
- users accepting a concrete offer — *manual*
- projected monthly price — *manual*
- manual-invoice conversion — *available after M5-01*
- churn reason — *manual*

### Founder operations

- onboarding minutes per user — *manual*
- support minutes per active workspace — *manual*
- open critical incidents — *exists (`/admin`)*
- unresolved support age — *derivable*
- cost per active workspace — *manual (Cloudflare dashboard)*
- email delivery failures — *exists (`transactional-email-client.ts` circuit
  breaker)*
- manual admin actions per user — *derivable from audit trail*

**Preference:** a small founder dashboard (the `/admin` Beta health card from
M1-03) over a large analytics taxonomy. The activation ledger + 8 events +
2 derived queries cover Stage A and B. Stage C+ may warrant a real analytics
service.

---

## H. Experiment summary table

| # | Experiment | Goal | Pass signal | Fail signal | Kill / pivot criteria | Earliest read |
|---|---|---|---|---|---|---|
| 1 | Beachhead validation | Confirm solo estimator segment | ≥5 qualified candidates reachable in 2 weeks; ≥3 with recurring pain + budget authority | <3 qualified candidates; pain is mild or one-off | Reframe ICP; pivot to architect segment | Week 0–1 (recruiting) |
| 2 | Concierge first value | Prove user can build credible estimate in 1 session | ≥80% reach first_valid_total in kickoff | <50% reach first-value | Pause recruiting; fix onboarding + import | Week 1 (per kickoff) |
| 3 | Reuse thesis | Prove "never start from zero" | ≥50% produce a 2nd estimate with reused library item by week 4 | <25% produce 2nd estimate | Reframe value prop (faster first vs reuse); narrow segment | End of week 4 |
| 4 | Client handoff | Prove output is useful outside estimator | ≥1 real client opens + comments/decides; estimator does not abandon for separate handoff | No client engagement; estimator reverts to email/Excel for handoff | Defer share work; focus on solo value | Week 2–4 |
| 5 | Willingness to pay | Distinguish praise from purchase intent | ≥3 users name a credible budget; ≥1 accepts a specific price | Users praise but refuse any price; or name unviably low prices | Defer paid MVP; re-evaluate value metric | Week 4+ |
| 6 | Founder operability | Ensure beta does not collapse under load | Weekly ops fit within founder capacity; incidents visible; no critical workflow depends on undocumented memory | Support burden exceeds capacity 2 weeks running; an ops gap causes user-visible harm | Pause cohort; automate the bottleneck | Ongoing, weekly review |

For each experiment: pass, fail, inconclusive, next action, and kill criteria
are defined above. An inconclusive result triggers an interview round to
disambiguate before pivoting.

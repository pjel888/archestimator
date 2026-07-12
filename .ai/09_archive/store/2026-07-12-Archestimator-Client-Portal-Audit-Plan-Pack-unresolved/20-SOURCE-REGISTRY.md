# 20 — Source Registry

## 1. Source authority

For current Archestimator truth, use this order:

1. current repository source and D1 migrations;
2. hosted/staging proof artifacts when produced;
3. dated Notion Product Truth and current numbered Homebase pages;
4. current plan packs/audits as historical or implementation guidance;
5. official external documentation for benchmark patterns.

The localhost page itself was not reachable from this tool environment. Its behavior was assessed through the current route, components, repositories, migrations, and existing repository audits. Browser/UI proof remains a separate user-authorized evidence task.

## 2. GitHub repository

**Repository:** `pjel888/archestimator`  
**Observed branch:** `main`  
**Observed commit:** `2dab33405d72de6c345b42b00b7887ba67db7a24`  
**Observed date:** 2026-07-12

### Project governance

- `AGENTS.md`
- `DESIGN.md`
- `.agents/skills/archestimator-plan-pack/SKILL.md`
- `.ai/10_state/current-state.md`
- `.ai/06_specs/shared-link-and-publication-spec.md` — historical/currently stale in parts

### Public share route

- `src/app/share/[token]/page.tsx`
- `src/app/share/[token]/loading.tsx`
- `src/app/share/[token]/not-found.tsx`
- `src/app/share/print.css`
- `src/components/share/ShareContainer.tsx`
- `src/components/share/ShareReviewWorkspace.tsx`
- `src/components/share/SharePageTabs.tsx`
- `src/components/share/ShareEstimateTreePanel.tsx`
- `src/components/share/ShareEstimateTreeView.tsx`
- `src/components/share/SharePageComments.tsx`
- `src/components/share/SharePageDecision.tsx`
- `src/components/share/SharePageDecisionConfirmDialog.tsx`
- `src/components/share/SharePageProposalHeader.tsx`
- `src/components/share/SharePageSummaryCard.tsx`
- `src/components/share/SharePageSessionBanner.tsx`
- `src/components/share/SharedLinkActivityFeed.tsx`
- `src/components/share/share-review-target.ts`

### Public APIs

- `src/app/api/share/[token]/route.ts`
- `src/app/api/share/[token]/password/route.ts`
- `src/app/api/share/[token]/session/route.ts`
- `src/app/api/share/[token]/comment/route.ts`
- `src/app/api/share/[token]/decision/route.ts`
- `src/app/api/share/[token]/activity/route.ts`
- `src/app/api/share/[token]/unsubscribe/route.ts`

### Publication domain

- `src/lib/publication/types.ts`
- `src/lib/publication/snapshot.ts`
- `src/lib/publication/security.ts`
- `src/lib/publication/public-repository.ts`
- `src/lib/publication/d1-store.ts`
- `src/lib/publication/actions.ts`
- `src/lib/publication/admin-d1-client.ts`
- `src/lib/publication/activity-helpers.ts`
- `src/lib/publication/client-csrf.ts`
- `src/lib/publication/image-url.ts`

### Publisher

- `src/app/workshop/publisher/page.tsx`
- `src/app/workshop/publisher/preview/[projectId]/page.tsx`
- `src/components/workshop/publisher/PublisherRosterClient.tsx`
- `src/components/workshop/publisher/PublisherDrawer.tsx`
- `src/components/workshop/publisher/ShareWizard.tsx`
- `src/components/workshop/publisher/PublisherActivityFeed.tsx`
- `src/components/workshop/publisher/ShareLinkDisplay.tsx`
- `src/components/workshop/publication/RecipientEmailComposer.tsx`
- `src/components/workshop/publication/SheetPickerList.tsx`
- `src/lib/publisher/roster-repository.ts`
- `src/lib/publisher/activity-repository.ts`
- `src/lib/publisher/permissions.ts`

### Roles and assets

- `src/lib/auth/roles.ts`
- `src/app/api/projects/images/route.ts`
- `src/lib/uploads/*`

### Financial/chart domain

- `src/lib/project-charts/types.ts`
- `src/lib/project-charts/aggregate-project-charts.ts`
- `src/lib/repositories/project-charts-repository.ts`
- `src/components/charts/CostDonutChart.tsx`

### D1 migrations

- `migrations/0005_account_settings.sql`
- `migrations/0014_publication_shared_links.sql`
- `migrations/0015_publication_admin_sidecars.sql`
- `migrations/0066_publication_foreign_keys.sql`
- current ordered migration list must be re-read immediately before implementation

### Existing repository plan/audit evidence

- `.ai/03_plans/2026-07-10/Publisher-And-Shared-Pages/*` — historical plan; white-label was explicitly out of scope then
- `.ai/03_plans/2026-07-10/Activity-History-Mapping/*`
- `.ai/09_archive/store/2026-07-12-Publisher-Page-Audit-complete/*`
- `.ai/03_plans/2026-07-12/Proposals-Page-Audit/*`
- `.ai/09_archive/store/2026-07-12-Shared-Estimate-Page-superseded/*` — source-reviewed predecessor; retained findings and exclusions are recorded in `21-SHARED-ESTIMATE-PAGE-AUDIT-DELTA.md`

## 3. Notion sources

### Current truth

- [Archestimator Product Truth & Beta Readiness — 2026-07-10](https://app.notion.com/p/3993f3aafe3e81a7b26cdf44454a27bf)
- [Archestimator Homebase](https://app.notion.com/p/9a33f3aafe3e821d87ba0133e683ceb6)
- [Archestimator Master Corpus v5.0](https://app.notion.com/p/3863f3aafe3e813383e3d9a53d6d5331)

### Domain pages

- [03 Product OS](https://app.notion.com/p/2cb3f3aafe3e83109e8e81ac73879645)
- [04 Roadmap and Timeline](https://app.notion.com/p/61b3f3aafe3e83babf0881cc43149c19)
- [05 Engineering and Architecture](https://app.notion.com/p/5753f3aafe3e832bbab1014ff305004c)
- [06 Database and Infrastructure](https://app.notion.com/p/8463f3aafe3e825aa37f81320b357039)
- [11 Security, Privacy, and Compliance](https://app.notion.com/p/bc53f3aafe3e8254beb301767826a94a)
- [12 Metrics and Quality Bar](https://app.notion.com/p/5f63f3aafe3e83c7a27601df8964b871)
- [01 Brand and Positioning](https://app.notion.com/p/91c3f3aafe3e838bbea981eb6673d472)
- [02 Marketing and GTM](https://app.notion.com/p/97b3f3aafe3e82da90b681c559b8cf3d)
- [10 Pricing and Business Model](https://app.notion.com/p/a483f3aafe3e82d88c2b01f89b720478)

### Feature records

- [Shared proposal review, comments, and recipient decisions](https://app.notion.com/p/3993f3aafe3e81caa4d6c7a3f68b5576)
- [Publisher roster and publication management](https://app.notion.com/p/3993f3aafe3e81fba0f1ce46f58fa62d)
- [Deletion-independent estimate/activity archive snapshots](https://app.notion.com/p/aa13f3aafe3e82a2b91081c08a9554ba)
- [Client archive subscription access](https://app.notion.com/p/d263f3aafe3e8272baa281d2d72f8577)
- [Future: Approval-to-Payment Workflow](https://app.notion.com/p/7fe3f3aafe3e834c82aa01d738d92fa6)

## 4. Official external research

### Qwilr

- [Adding branding (colors & fonts) to your account](https://help.qwilr.com/article/61-brand-setup)
- [Setting up a Custom Domain](https://help.qwilr.com/article/63-custom-domain)
- [Adding security to a Qwilr Page](https://help.qwilr.com/article/151-adding-security)
- [Adding Identity Verification to a Page](https://help.qwilr.com/article/154-can-i-see-who-viewed-my-projects)
- [Qwilr Analytics](https://help.qwilr.com/article/156-analytics-insights)
- [Accessing and downloading the Audit Trail](https://help.qwilr.com/article/157-the-audit-trail)
- [What can an Account Admin do?](https://help.qwilr.com/article/143-account-administrators)
- [What can a Creator do?](https://help.qwilr.com/article/680-what-can-a-creator-do)

### Procore

- [Submittals](https://support.procore.com/products/online/user-guide/project-level/submittals)
- [Correspondence](https://support.procore.com/products/online/user-guide/project-level/correspondence) — configurable correspondence types, granular permissions, status/workflow, related records, filtering, and mobile response reinforce structured work items rather than one unbounded chat feed
- [User Permissions Matrix — Web](https://support.procore.com/references/user-permissions-matrix-web)

### Bluebeam

- [Collaborate in Studio with teammates who don't own Revu](https://support.bluebeam.com/studio/how-to/collaborate-with-teammates-who-dont-own-revu.html)
- [Studio FAQs](https://support.bluebeam.com/studio/resources/studio-faqs.html)

### Figma, Notion, Slack

- [Figma — Add comments to files](https://help.figma.com/hc/en-us/articles/360041068574-Add-comments-to-files)
- [Figma — View and manage comments](https://help.figma.com/hc/en-us/articles/360041547593-View-and-manage-comments) — pins, replies, resolve/unresolve, unread, filters, and deep links support the contextual-thread decision
- [Notion — Comments, mentions & reactions](https://www.notion.com/help/comments-mentions-and-reminders)
- [Slack — Use threads to organise discussions](https://slack.com/help/articles/115000769927-Use-threads-to-organize-discussions-)

### Security, roles, accessibility

- [NIST — Role Based Access Control](https://csrc.nist.gov/projects/role-based-access-control)
- [OWASP — Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [OWASP — Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [W3C — How to Meet WCAG 2.2](https://www.w3.org/WAI/WCAG22/quickref/)

### Cloudflare

- [Configuring Cloudflare for SaaS](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/start/getting-started/)

## 5. Evidence not produced

- screenshot of the exact localhost route;
- visual/browser audit;
- runtime network trace;
- current D1 hosted row inspection;
- current production/staging header proof;
- fresh code graph impact query; a bounded GitNexus query was run, but the index was 173 commits behind and the guarded refresh correctly refused an unpinned `gitnexus@latest` fallback, so current source inspection remains authoritative;
- automated tests/build;
- migration dry run;
- legal opinion;
- user research interviews.

These are planned evidence surfaces, not hidden assumptions.

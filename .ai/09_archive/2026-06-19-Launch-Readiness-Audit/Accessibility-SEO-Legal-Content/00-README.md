# Launch-Readiness Audit — Accessibility, SEO & Legal/Content Readiness

> Canonical status override: before implementing from this pack, read
> `../03-LAUNCH-GATE-DECISION-REGISTER.md` and `../08-IMPLEMENTATION-HANDOFF.md`.
> Pack-local blocker counts are historical/domain-scoped; the root register is authoritative
> for wider/external beta.

Part of the **2026-06-19 Launch-Readiness Audit** (umbrella: `.ai/03_plans/2026-06-19-Launch-Readiness-Audit`).
This pack is **deletable**: it is an audit + remediation proposal, not landed work. If Philip
rejects the direction, delete the whole folder — nothing else references it.

## Exact owner job
Make Archestimator safe to expose to closed-beta users from an **accessibility, SEO/metadata,
and legal/content** standpoint: no search-engine indexing of private client proposals, readable
legal pages, baseline metadata/OG, branded error/not-found recovery, and no glaring WCAG 2.1 AA
regressions on the public marketing + legal surface. DESIGN.md is an **alpha guide** — this pack
**advises** on contrast/sizing, it does not gate or block on design grounds.

## Routes / screens affected (remediation surface)
- Public marketing: `/` (home), `/about`, `/features`, `/pricing`, `/contact`
- Legal: `/privacy`, `/terms`, `/workshop/terms`
- Public proposal: `/share/[token]` (SEO/robots posture — **private content**)
- Auth/beta: `/login`, `/beta/access-required`
- Global: root layout metadata, a new `robots.ts`/`sitemap.ts` (coordinated with the Deploy pack),
  root `not-found.tsx` / `error.tsx` / `global-error.tsx`

## Non-goals
- Re-architecting the design system / brand palette (alpha; defer to Philip).
- Workshop-internal (behind-auth) deep a11y sweep of every grid/dialog — covered piecemeal by prior
  charts/teamspace packs; this pass covers the **public** surface + global error/SEO posture.
- robots.ts/sitemap.ts **ownership** — those are already planned by the
  `2026-06-19-Launch-Readiness-Audit/NextJS-Vercel-Deploy-And-Headers` pack. This pack supplies the
  **content requirements** (noindex `/share`, `/workshop`, `/login`, `/beta`, `/invite`; sitemap =
  public marketing+legal only) for that work, it does not re-own the files.

## Files expected to change during remediation
- `src/app/layout.tsx` (add `metadataBase`, default `openGraph`/`twitter`)
- `src/app/{about,features,pricing,contact,privacy,terms}/page.tsx` (per-page `metadata` exports)
- `src/app/privacy/page.tsx`, `src/app/terms/page.tsx` (legal-page font-size readability)
- `src/app/share/[token]/page.tsx` (`robots: { index:false, follow:false }` in `generateMetadata`)
- New: `src/app/not-found.tsx`, `src/app/error.tsx`, `src/app/global-error.tsx`
- Coordinated (Deploy pack owns the file): `src/app/robots.ts`, `src/app/sitemap.ts`
- Possibly a shared skip-link in `PublicPageShell` / root layout

## Validation gate
- `bun run build` succeeds (catches `metadataBase` resolution warnings, use-server, etc.).
- Manual: `/share/<token>` response `<meta name="robots" content="noindex">` present;
  `curl /robots.txt` disallows `/share`, `/workshop`, `/login`, `/beta`, `/invite`, `/api`.
- Manual axe/Lighthouse pass on `/`, `/pricing`, `/privacy`, `/terms` (no AA contrast/size criticals).
- `bun run validate` is **known-red on main** (charts set-state-in-effect; ProposalExportPreviewDialog
  design-lint) — do not block this pack on those pre-existing reds; assert no NEW reds in touched files.

## Deletion criteria
Delete this folder if Philip decides (a) the site should be fully indexable incl. `/share`, and
(b) legal-page sizing + missing metadata/error-UX are acceptable for closed beta. Findings that are
genuine launch blockers (share-page indexing of client data) should then be re-homed, not lost.

## Loop-surface selection
Lightweight in-session loop with proportional verification. Only the `robots`/`noindex`/legal-indexing
items touch a security/privacy boundary (private client data exposure) and warrant the Codex review
gate; the metadata/error-UX/contrast items are ordinary reversible UI work.

## Durable-state path
`.ai/10_state/current-state.md` (record outcome) and `.ai/10_state/decisions.md` (if Philip rules on
the indexing posture or legal-sizing). Evidence/ledger under this folder.

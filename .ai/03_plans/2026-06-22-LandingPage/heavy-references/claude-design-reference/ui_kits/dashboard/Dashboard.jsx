/* eslint-disable */
/**
 * Workshop dashboard — static recreation of the LIVE v2 editorial bento
 * (src/components/workshop/dashboard/WorkshopDashboard.tsx). Babel-standalone
 * JSX, no TypeScript, no imports. DS components are read off the global
 * namespace; React is global. Mirrors the live class names so this card reads
 * as the same system.
 *
 * Synced state: the greeting was lifted OUT of the bento into the workspace
 * HEADER (WorkshopHeaderGreeting — a compact sun/moon strip), and the recent
 * Projects/Sheets ledgers were re-skinned (filled header icon, a per-row
 * favorite star, name-over-meta rows, a right-aligned date). Brand orange is
 * clay #AA412A; favorite stars are NEUTRAL (tertiary/secondary), matching the
 * live code. Signal #F24405 never used.
 */

const { Button } = window.ArchestimatorDesignSystem_3fbb6f || {};

// ── Realistic Philippine-peso AEC sample data ────────────────────────────────
const PROJECT_COUNT = 14;
const COMPONENT_COUNT = 312;
const TEMPLATE_COUNT = 18;

const PUBLISHED_PROJECTS = [
  { id: "p1", name: "San Juan Townhouse Renovation", meta: "Opened Jun 12" },
  { id: "p2", name: "Mandaluyong Mixed-Use Podium", meta: "47 opens" },
  { id: "p3", name: "Tagaytay Hillside Villa", meta: "Opened Jun 09" },
  { id: "p4", name: "BGC Office Fit-Out — Level 9", meta: "23 opens" },
  { id: "p5", name: "Cebu Seaside Clubhouse", meta: "Shared link" },
];

const RECENT_COMPONENTS = [
  { id: "c1", name: "CHB 150mm Load-Bearing Wall", meta: "Jun 18" },
  { id: "c2", name: "Reinforced Concrete Column (400×400)", meta: "Jun 17" },
  { id: "c3", name: "Gypsum Ceiling on Metal Furring", meta: "Jun 16" },
  { id: "c4", name: "Vitrified Floor Tile 600×600", meta: "Jun 14" },
  { id: "c5", name: "Powder-Coated Aluminium Window", meta: "Jun 13" },
];

const FAVORITE_PROJECTS = [
  {
    id: "f1",
    name: "San Juan Townhouse Renovation",
    code: "PRJ-014",
    sheets: [
      { id: "s1", name: "Structural Works", code: "ES-021" },
      { id: "s2", name: "Architectural Finishes", code: "ES-022" },
    ],
  },
  {
    id: "f2",
    name: "Tagaytay Hillside Villa",
    code: "PRJ-011",
    sheets: [{ id: "s3", name: "Sitework & Excavation", code: "ES-017" }],
  },
  { id: "f3", name: "BGC Office Fit-Out — Level 9", code: "PRJ-009", sheets: [] },
];

const RECENT_PROJECTS = [
  { id: "rp1", name: "San Juan Townhouse Renovation", meta: "Quezon City", date: "Jun 18", fav: true },
  { id: "rp2", name: "Mandaluyong Mixed-Use Podium", meta: "Mandaluyong", date: "Jun 17", fav: false },
  { id: "rp3", name: "Tagaytay Hillside Villa", meta: "Cavite", date: "Jun 15", fav: true },
  { id: "rp4", name: "BGC Office Fit-Out — Level 9", meta: "Taguig", date: "Jun 12", fav: false },
  { id: "rp5", name: "Cebu Seaside Clubhouse", meta: "Cebu", date: "Jun 08", fav: false },
];

const RECENT_SHEETS = [
  { id: "rs1", name: "Structural Works", project: "San Juan Townhouse", date: "Jun 18", fav: true },
  { id: "rs2", name: "Architectural Finishes", project: "San Juan Townhouse", date: "Jun 17", fav: false },
  { id: "rs3", name: "Sitework & Excavation", project: "Tagaytay Villa", date: "Jun 15", fav: true },
  { id: "rs4", name: "MEPF Rough-In", project: "Mandaluyong Podium", date: "Jun 11", fav: false },
  { id: "rs5", name: "Concrete & Formworks", project: "Cebu Clubhouse", date: "Jun 06", fav: false },
];

const CONTINUE = {
  name: "Structural Works",
  project: "San Juan Townhouse Renovation",
  code: "ES-021",
  edited: "Jun 18",
};

// ── Small presentational pieces ──────────────────────────────────────────────

function Icon({ name, weight, className, style }) {
  const base = weight === "fill" ? "ph-fill" : "ph";
  return <i className={`${base} ph-${name}${className ? " " + className : ""}`} style={style} aria-hidden="true" />;
}

function PublishedList({ items }) {
  if (items.length === 0) {
    return <p className="dashboard-published-empty">No shared links yet</p>;
  }
  return (
    <ul className="dashboard-published-list" aria-label="Recent published project shared links">
      {items.map((item) => (
        <li key={item.id} className="dashboard-published-list-item">
          <a href="#" className="dashboard-published-link">
            <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.name}>
              {item.name}
            </span>
            <span className="text-secondary" style={{ flexShrink: 0, fontFamily: "var(--font-numeric)", fontSize: 9 }}>
              {item.meta}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

// ── Content destination tile (Projects + Components) ─────────────────────────

function ContentTile({ kind, index, title, countLabel, countValue, ledgerTitle, ledgerItems }) {
  const ibandClass = kind === "projects" ? "iband-projects" : "iband-components";
  const toneClass =
    kind === "projects" ? "dashboard-destination-card--projects" : "dashboard-destination-card--components";
  return (
    <div
      aria-label={title}
      className={`dashboard-destination-card dashboard-destination-grid dashboard-card-hover ${toneClass} group ${ibandClass}`}
      style={{ position: "relative", height: "100%", minHeight: 118, width: "100%" }}
    >
      <div className="destcard-toprow">
        <span className="dashboard-destination-card-index destcard-index">{index}</span>
        <a href="#" aria-label={`Open ${title}`} className="dashboard-project-card-arrow">
          <Icon name="arrow-up-right" className="dashboard-destination-card-icon destcard-arrow-ico" />
        </a>
      </div>

      <div className="dashboard-project-card-panel destcard-panel">
        <div className="dashboard-project-count-panel">
          <span className="destcard-countlabel text-secondary">{countLabel}</span>
          <span className="dashboard-bignum-value">{countValue}</span>
        </div>
        <div className="dashboard-published-panel">
          <div className="dashboard-published-header">
            <span className="text-ink" style={{ fontSize: 12, fontWeight: 500 }}>
              {ledgerTitle}
            </span>
          </div>
          <PublishedList items={ledgerItems} />
        </div>
      </div>

      <div className="destcard-titlerow">
        <span className="dashboard-destination-card-title destcard-title">{title}</span>
      </div>
    </div>
  );
}

// ── Simple destination tile (Templates) ──────────────────────────────────────

function SimpleTile({ iband, index, title }) {
  return (
    <div
      aria-label={title}
      className={`dashboard-destination-card dashboard-card-hover destcard-simple group ${iband}`}
      style={{ height: "100%", minHeight: 118, width: "100%" }}
    >
      <span className="d-index">
        <span className="dashboard-destination-card-index destcard-index">{index}</span>
      </span>
      <a href="#" aria-label={`Open ${title}`} className="dashboard-project-card-arrow d-arrow">
        <Icon name="arrow-up-right" className="dashboard-destination-card-icon destcard-arrow-ico" />
      </a>
      <span className="d-title">
        <span className="dashboard-destination-card-title destcard-title">{title}</span>
      </span>
    </div>
  );
}

// ── Library hub (Continue cell + new-project / new-component / new-sheet) ─────

function LibraryHub() {
  return (
    <div className="dashboard-destination-card--library iband-library" aria-label="Library">
      <span className="iband-library-continue-slot">
        <a href="#" className="dashboard-destination-card dashboard-card-hover continue-link" aria-label={`Continue editing ${CONTINUE.name}`}>
          <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
            <span className="dashboard-continue-hover-target continue-eyebrow">Continue where you left off</span>
            <span className="dashboard-continue-hover-target dashboard-continue-title continue-title">{CONTINUE.name}</span>
            <span className="dashboard-continue-hover-target continue-meta">
              {CONTINUE.project} · {CONTINUE.code}
            </span>
          </span>
          <span className="continue-foot">
            <span className="dashboard-continue-hover-target continue-eyebrow">Edited {CONTINUE.edited}</span>
            <Icon name="arrow-right" className="dashboard-continue-hover-target" style={{ fontSize: 18, color: "var(--ink)" }} />
          </span>
        </a>
      </span>

      <span className="iband-library-stack">
        <button type="button" className="dashboard-destination-card dashboard-card-hover iband-library-new-project" aria-label="New project">
          <Icon name="folder-plus" style={{ fontSize: 16 }} />
        </button>
        <span className="iband-library-action-grid">
          <a href="#" className="dashboard-destination-card dashboard-card-hover iband-library-new-component" aria-label="New component">
            <Icon name="package" style={{ fontSize: 16 }} />
          </a>
          <button type="button" className="dashboard-destination-card dashboard-card-hover iband-library-new-sheet" aria-label="New estimate sheet">
            <Icon name="file-plus" style={{ fontSize: 16 }} />
          </button>
        </span>
      </span>
    </div>
  );
}

// ── Favorites tree ───────────────────────────────────────────────────────────

function FavoritesTree() {
  const initial = {};
  FAVORITE_PROJECTS.forEach((p) => {
    if (p.sheets.length > 0) initial[p.id] = true;
  });
  const [open, setOpen] = React.useState(initial);
  const toggle = (id) => setOpen((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <section className="ledger desk-board-favs-inner" aria-label="Favourites">
      <div className="ledger-head">
        <Icon name="star" weight="fill" className="ledger-head-ico" />
        <h2>Favourites</h2>
      </div>
      <div className="ledger-body" role="tree" aria-label="Favorite projects">
        {FAVORITE_PROJECTS.map((project) => {
          const hasSheets = project.sheets.length > 0;
          const isOpen = !!open[project.id];
          return (
            <div key={project.id} role="treeitem" aria-expanded={hasSheets ? isOpen : undefined} aria-label={project.name}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 8px" }}>
                {hasSheets ? (
                  <button type="button" className="tree-toggle" aria-hidden="true" onClick={() => toggle(project.id)}>
                    <Icon name={isOpen ? "caret-down" : "caret-right"} />
                  </button>
                ) : (
                  <span aria-hidden="true" style={{ width: 16, flexShrink: 0 }} />
                )}
                <a href="#" className="tree-row">
                  <Icon name="folder" className="tree-ico" style={{ fontSize: 13 }} />
                  <span className="tree-name" title={project.name}>{project.name}</span>
                  <span className="tree-code">{project.code}</span>
                </a>
              </div>
              {hasSheets && isOpen ? (
                <div role="group" className="tree-children">
                  {project.sheets.map((sheet) => (
                    <a key={sheet.id} href="#" className="tree-row">
                      <Icon name="file-text" className="tree-ico" style={{ fontSize: 11 }} />
                      <span className="tree-sub" title={sheet.name}>{sheet.name}</span>
                      <span className="tree-code">{sheet.code}</span>
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Recent projects / sheets ledgers ─────────────────────────────────────────

function RecentRow({ typeIcon, name, sub, date, fav }) {
  return (
    <li className="rec-row">
      <span className="rec-iconcol">
        <Icon name={typeIcon} className="rec-typeico" />
        <button type="button" className={`rec-star${fav ? " is-fav" : ""}`} aria-label={fav ? "Unfavourite" : "Favourite"}>
          <Icon name="star" weight={fav ? "fill" : "regular"} />
        </button>
      </span>
      <a href="#" className="rec-main">
        <span className="rec-name" title={name}>{name}</span>
        <span className="rec-sub" title={sub}>{sub}</span>
      </a>
      <time className="rec-date">{date}</time>
    </li>
  );
}

function RecentProjects() {
  return (
    <section className="ledger" aria-label="Recent projects">
      <div className="ledger-head">
        <Icon name="folder" weight="fill" className="ledger-head-ico" />
        <h2>Projects</h2>
      </div>
      <div className="ledger-body">
        <ul>
          {RECENT_PROJECTS.map((p) => (
            <RecentRow key={p.id} typeIcon="folder" name={p.name} sub={p.meta} date={p.date} fav={p.fav} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function RecentSheets() {
  return (
    <section className="ledger" aria-label="Recent estimate sheets">
      <div className="ledger-head">
        <Icon name="file-text" weight="fill" className="ledger-head-ico" />
        <h2>Sheets</h2>
      </div>
      <div className="ledger-body">
        <ul>
          {RECENT_SHEETS.map((s) => (
            <RecentRow key={s.id} typeIcon="file-text" name={s.name} sub={s.project} date={s.date} fav={s.fav} />
          ))}
        </ul>
      </div>
    </section>
  );
}

// ── App shell (glass rail + floating white surface) ──────────────────────────

function Rail() {
  const items = [
    { ico: "squares-four", active: true },
    { ico: "folders", active: false },
    { ico: "books", active: false },
    { ico: "chart-bar", active: false },
  ];
  return (
    <nav className="app-rail" aria-label="Primary">
      <img className="app-rail-logo" src="../../assets/archestimator_logo_white.svg" alt="Archestimator" />
      {items.map((item, i) => (
        <span key={i} className={`app-rail-ico${item.active ? " is-active" : ""}`}>
          <Icon name={item.ico} />
        </span>
      ))}
      <span className="app-rail-spacer" />
      <span className="app-rail-ico"><Icon name="gear" /></span>
      <span className="app-rail-ico"><Icon name="user-circle" /></span>
    </nav>
  );
}

// ── Workspace header greeting (mirrors WorkshopHeaderGreeting) ────────────────

function HeaderGreeting() {
  return (
    <div className="app-greeting" aria-label="Good morning, Philip">
      <span className="app-greeting-ico"><Icon name="sun-horizon" /></span>
      <h1 className="app-greeting-col">
        <span className="app-greeting-eyebrow">Good morning</span>
        <span className="app-greeting-name">Philip</span>
      </h1>
    </div>
  );
}

function Dashboard() {
  return (
    <div className="app-frame">
      <Rail />
      <main className="app-surface">
        <div className="app-titlebar">
          <HeaderGreeting />
          <span className="app-titlebar-spacer" />
          <span className="app-titlebar-actions">
            <span className="app-titlebar-ico"><Icon name="bell" /></span>
            <span className="app-titlebar-ico"><Icon name="gear-six" /></span>
          </span>
        </div>

        <div className="dashboard-canvas-wash dashboard-scroll" aria-label="Workshop dashboard">
          <div className="dashboard-root" style={{ padding: 8 }}>
            {/* Destination field — Projects, Components, Templates, Library */}
            <div className="dashboard-imageband">
              <ContentTile
                kind="projects"
                index="01"
                title="Projects"
                countLabel="Project Count"
                countValue={PROJECT_COUNT}
                ledgerTitle="Published Projects"
                ledgerItems={PUBLISHED_PROJECTS}
              />
              <ContentTile
                kind="components"
                index="02"
                title="Components"
                countLabel="Component Count"
                countValue={COMPONENT_COUNT}
                ledgerTitle="Recently Added Components"
                ledgerItems={RECENT_COMPONENTS}
              />
              <SimpleTile iband="iband-templates" index="03" title="Templates" />
              <LibraryHub />
            </div>

            {/* Working desk — Favorites over the two recent ledgers */}
            <div className="dashboard-desk">
              <div className="desk-board">
                <div className="desk-board-favs">
                  <FavoritesTree />
                </div>
                <div className="desk-board-recents">
                  <div className="desk-recproj">
                    <RecentProjects />
                  </div>
                  <div className="desk-recsheet">
                    <RecentSheets />
                  </div>
                </div>
              </div>
              <div className="desk-continue" style={{ position: "relative", minHeight: 0, overflow: "visible", borderRadius: "var(--radius-xs)" }}>
                <a href="#" className="dashboard-destination-card dashboard-card-hover destcard-simple" aria-label="Library" style={{ display: "block", height: "100%", minHeight: 118, width: "100%" }}>
                  <span className="d-index">
                    <span className="dashboard-destination-card-index destcard-index">04</span>
                  </span>
                  <span className="d-arrow">
                    <Icon name="arrow-up-right" className="dashboard-destination-card-icon destcard-arrow-ico" />
                  </span>
                  <span className="d-title">
                    <span className="dashboard-destination-card-title destcard-title">Library</span>
                  </span>
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="app-footer">
          <span><Icon name="sparkle" /> Ask Archestimator</span>
          <span className="app-footer-spacer" />
          <span>₱ 3,964,714.00 tracked · ES-021</span>
        </div>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Dashboard />);

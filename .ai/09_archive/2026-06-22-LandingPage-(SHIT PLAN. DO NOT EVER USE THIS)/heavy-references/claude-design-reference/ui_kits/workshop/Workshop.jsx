/* Workshop estimate workspace — faithful recreation of the live Archestimator
   estimate shell (src/components/workshop/WorkshopPageShell.tsx):

     floating glass nav rail  ·  ONE liquid-glass workspace surface

   The workspace surface is a single frosted panel (one backdrop-filter) that
   holds the project tree · centre estimate sheet · right library dock · bottom
   budget bar as TRANSPARENT chrome zones, divided only by hairlines. Chrome
   controls use the .liquid-btn (workshop-liquid-button) recipe — translucent
   fill, bright edge, soft shadow, no child blur. The estimate sheet itself stays
   document-like (white paper rows on hairlines). Mounted by index.html. */
const { SegmentedControl } = window.ArchestimatorDesignSystem_3fbb6f;
const peso = (n) => "₱ " + n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const NAV = [
  { icon: "ph-squares-four", key: "dash" },
  { icon: "ph-folders", key: "projects" },
  { icon: "ph-stack", key: "library" },
  { icon: "ph-file-text", key: "proposals" },
  { icon: "ph-users-three", key: "clients" },
  { icon: "ph-cards", key: "templates" },
  { icon: "ph-gear", key: "settings" },
];

const TREE = [
  { label: "General Requirements", icon: "ph-folder", depth: 1, kind: "group" },
  { label: "Construction Supervision", icon: "ph-circle", depth: 2 },
  { label: "Mobilization + Demobilization", icon: "ph-circle", depth: 2 },
  { label: "Temporary Facilities", icon: "ph-circle", depth: 2 },
  { label: "Permits, Bonds + Insurances", icon: "ph-circle", depth: 2 },
  { label: "Lot", icon: "ph-folder", depth: 1, kind: "group", open: true },
  { label: "House", icon: "ph-folder", depth: 2, open: true },
  { label: "Ground Floor", icon: "ph-folder", depth: 3, open: true, active: true },
  { label: "Living Room", icon: "ph-circle", depth: 4, occupied: true },
  { label: "Dining Area", icon: "ph-circle", depth: 4, occupied: true },
  { label: "Show Kitchen", icon: "ph-circle", depth: 4 },
  { label: "Powder Room", icon: "ph-circle", depth: 4 },
  { label: "Bedroom 1 / Guest Room", icon: "ph-circle", depth: 4 },
  { label: "Second Floor", icon: "ph-folder", depth: 3 },
  { label: "Master Bedroom", icon: "ph-circle", depth: 4 },
  { label: "Master Walk-in Closet", icon: "ph-circle", depth: 4 },
];

const LIB = [
  { label: "All Components", icon: "ph-stack", depth: 1, open: true },
  { label: "Administration", icon: "ph-folder", depth: 2, open: true },
  { label: "Project Requirements", icon: "ph-folder", depth: 3, open: true },
  { label: "General Requirements", icon: "ph-folder", depth: 4, open: true },
  { label: "General Requirements Allowance", icon: "ph-cube", depth: 5, price: "₱185,000.00", unit: "/month" },
  { label: "Permits", icon: "ph-circle", depth: 4 },
  { label: "Fees", icon: "ph-circle", depth: 4 },
  { label: "Submittals", icon: "ph-circle", depth: 4 },
  { label: "Mockups", icon: "ph-circle", depth: 4 },
  { label: "Temporary Works", icon: "ph-folder", depth: 3 },
  { label: "Site Protection", icon: "ph-circle", depth: 4 },
  { label: "Temporary Enclosures", icon: "ph-circle", depth: 4 },
  { label: "Scaffolding", icon: "ph-circle", depth: 4 },
  { label: "Existing Conditions", icon: "ph-folder", depth: 3 },
  { label: "Site Surveys", icon: "ph-circle", depth: 4 },
  { label: "Measured Drawings", icon: "ph-circle", depth: 4 },
];

const ROWS = [
  { n: "01", mat: "Loose lighting allowance", thumb: "#cdb8a6", qty: 2, sub: 4900, misc: 500, total: 5400 },
  { n: "02", mat: "Coffee table allowance", thumb: "#b7a690", qty: 1, sub: 6350, misc: 800, total: 7150, sel: true },
  { n: "03", mat: "Value living room sofa set", thumb: "#9aa0a6", qty: 1, sub: 28950, misc: 1500, total: 30450 },
  { n: "04", mat: "TV console allowance", thumb: "#c2b09c", qty: 1, sub: 7200, misc: 1000, total: 8200 },
];

function LiquidButton({ className = "", children, ...rest }) {
  return (
    <button type="button" className={"liquid-btn " + className} {...rest}>{children}</button>
  );
}

function TreeRow({ node }) {
  const occupied = node.occupied;
  return (
    <div className={"tree-row" + (node.active ? " is-active" : "")} style={{ paddingLeft: 8 + node.depth * 14 }}>
      {node.kind === "group" || node.icon === "ph-folder" ? (
        <i className={"ph " + (node.open ? "ph-caret-down" : "ph-caret-right")} style={{ fontSize: 9, color: "var(--tertiary)", width: 10 }} />
      ) : <span style={{ width: 10, display: "inline-block" }} />}
      <i className={"ph " + node.icon} style={{ fontSize: 13, color: occupied ? "var(--occupied-glyph)" : "var(--tertiary)" }} />
      <span className="tree-label">{node.label}</span>
    </div>
  );
}

function GroupBar({ code, name, total }) {
  return (
    <div className="group-bar">
      <i className="ph ph-caret-down" style={{ fontSize: 10, color: "var(--tertiary)" }} />
      <i className="ph ph-folder" style={{ fontSize: 13, color: "var(--tertiary)" }} />
      <div className="group-meta">
        <span className="group-code">{code}</span>
        <span className="group-name">{name}</span>
      </div>
      <span className="group-total">{peso(total)}</span>
    </div>
  );
}

function SheetTable() {
  const cols = ["#", "", "Materials", "Qty", "Subtotal", "Adjustment", "Misc Cost", "Total Item Cost"];
  return (
    <div className="area-block">
      <div className="area-head">
        <i className="ph ph-caret-down" style={{ fontSize: 10, color: "var(--tertiary)" }} />
        <i className="ph ph-cube" style={{ fontSize: 13, color: "var(--occupied-glyph)" }} />
        <div className="group-meta"><span className="group-code">02.01.01.02</span><span className="group-name">Living Room</span></div>
        <span className="group-total">{peso(51200)}</span>
      </div>
      <div className="breadcrumb-mini">Lot · House · Ground Floor · Living Room</div>
      <table className="sheet">
        <thead><tr>{cols.map((c, i) => <th key={i} className={i >= 3 ? "num" : ""}>{c}</th>)}</tr></thead>
        <tbody>
          {ROWS.map((r) => (
            <tr key={r.n} className={r.sel ? "sel" : ""}>
              <td className="rn">{r.n}</td>
              <td><span className="cb" data-on={r.sel} /></td>
              <td>
                <div className="mat">
                  <span className="thumb" style={{ background: r.thumb }} />
                  <div className="mat-text"><span className="mat-name">{r.mat}</span><span className="mat-sub">{peso(r.sub)} / pc</span></div>
                </div>
              </td>
              <td className="num">{r.qty}</td>
              <td className="num">{peso(r.sub)}</td>
              <td className="num adj"><span className="adj-tag">Contingency 0%</span></td>
              <td className="num">{peso(r.misc)}</td>
              <td className="num strong">{peso(r.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="drop-zone"><i className="ph ph-plus" /> Drag and drop estimate component here</div>
    </div>
  );
}

function Workshop() {
  const [view, setView] = React.useState("default");
  const [tab, setTab] = React.useState("components");
  return (
    <div className="ws">
      {/* Floating glass nav rail (the live sidebar, collapsed). */}
      <nav className="rail ae-glass">
        <div className="logo"><img src="../../assets/archestimator_logo_white.svg" width="22" height="22" alt="" /></div>
        {NAV.map((n) => (
          <button key={n.key} className={"navitem" + (n.key === "projects" ? " is-active" : "")} aria-label={n.key}>
            <i className={"ph " + n.icon} />
          </button>
        ))}
      </nav>

      {/* ONE liquid-glass workspace surface — tree · sheet · dock · budget bar
          are transparent chrome zones inside this single frosted panel. */}
      <div className="workspace">
        {/* project tree (transparent zone, hairline divider) */}
        <aside className="tree-panel">
          <div className="search"><i className="ph ph-magnifying-glass" /><span>Search Tree</span></div>
          <div className="panel-toolbar">
            <div className="tool-left">
              <LiquidButton className="icon" aria-label="Filter"><i className="ph ph-funnel" /></LiquidButton>
              <LiquidButton className="icon" aria-label="List"><i className="ph ph-list" /></LiquidButton>
              <LiquidButton className="icon" aria-label="Collapse"><i className="ph ph-arrows-in-line-vertical" /></LiquidButton>
            </div>
            <div className="tool-right">
              <LiquidButton className="icon add" aria-label="Add area"><i className="ph ph-plus" /></LiquidButton>
              <LiquidButton className="icon add" aria-label="Add group"><i className="ph ph-folder-plus" /></LiquidButton>
            </div>
          </div>
          <div className="panel-tab">Sheets</div>
          <div className="tree-scroll">{TREE.map((n, i) => <TreeRow key={i} node={n} />)}</div>
        </aside>

        {/* centre work surface */}
        <main className="center">
          <header className="ws-bar">
            <span className="ws-code">ES-001</span>
            <span className="ws-title">LEWIS RESIDENCE</span>
            <span className="ws-version">LEWIS RESIDENCE · 001</span>
            <div className="ws-actions">
              <LiquidButton><i className="ph ph-share-network" /> Shared link</LiquidButton>
              <LiquidButton>Teamspaces</LiquidButton>
              <div className="avatars"><span className="av av-pl">PL</span><span className="av av-le">LE</span></div>
              <LiquidButton className="icon" aria-label="Settings"><i className="ph ph-gear" /></LiquidButton>
            </div>
          </header>
          <div className="sheet-toolbar">
            <div className="search sheet-search"><i className="ph ph-magnifying-glass" /><span>Search Sheet</span></div>
            <div className="tool-right">
              <LiquidButton className="icon" aria-label="History"><i className="ph ph-clock-counter-clockwise" /></LiquidButton>
              <LiquidButton className="icon" aria-label="Export"><i className="ph ph-file-xls" /></LiquidButton>
            </div>
          </div>
          <div className="sheet-scroll">
            <GroupBar code="02" name="Lot" total={3460519} />
            <GroupBar code="02.01" name="House" total={3460519} />
            <GroupBar code="02.01.01" name="Ground Floor" total={508150} />
            <SheetTable />
          </div>
          <footer className="budget-bar">
            <span className="crumb">Workshop · Projects · Lewis Residence</span>
            <div className="budget-block"><span className="bnum">{peso(2000000)}</span><span className="blabel">Project budget</span></div>
            <div className="health">
              <div className="health-head"><span>Budget health</span><span className="over">198% used</span></div>
              <div className="health-track"><div className="health-fill" /></div>
              <span className="health-note">₱1.96M over · 198% used</span>
            </div>
            <div className="budget-block right"><span className="bnum danger">{peso(3964714)}</span><span className="blabel">Ongoing project cost</span></div>
            <LiquidButton className="ask-flip"><i className="ph ph-chat-circle-dots" /> Ask Flip</LiquidButton>
          </footer>
        </main>

        {/* right library dock (transparent zone, hairline divider) */}
        <aside className="dock">
          <div className="search"><i className="ph ph-magnifying-glass" /><span>Search Library Tree</span></div>
          <div className="panel-toolbar">
            <div className="tool-left">
              <LiquidButton className="icon" aria-label="Filter"><i className="ph ph-funnel" /></LiquidButton>
              <LiquidButton className="icon" aria-label="List"><i className="ph ph-list" /></LiquidButton>
            </div>
            <LiquidButton className="icon add" aria-label="Add component"><i className="ph ph-plus" /></LiquidButton>
          </div>
          <div className="dock-tabs">
            <button className={"dock-tab" + (tab === "components" ? " is-active" : "")} onClick={() => setTab("components")}>Components</button>
            <button className={"dock-tab" + (tab === "templates" ? " is-active" : "")} onClick={() => setTab("templates")}>Templates</button>
          </div>
          <div className="viewby">
            <span className="viewby-label">View by</span>
            <SegmentedControl ariaLabel="View by" value={view} onValueChange={setView}
              options={[{ value: "default", label: "Default" }, { value: "suppliers", label: "Suppliers" }, { value: "brand", label: "Brand" }]} />
          </div>
          <div className="tree-scroll">
            {LIB.map((n, i) => (
              <div key={i} className="tree-row" style={{ paddingLeft: 8 + n.depth * 12 }}>
                {n.icon === "ph-folder" || n.icon === "ph-stack" ? (
                  <i className={"ph " + (n.open ? "ph-caret-down" : "ph-caret-right")} style={{ fontSize: 9, color: "var(--tertiary)", width: 10 }} />
                ) : <span style={{ width: 10, display: "inline-block" }} />}
                <i className={"ph " + n.icon} style={{ fontSize: 13, color: n.price ? "var(--occupied-glyph)" : "var(--tertiary)" }} />
                <span className="tree-label">{n.label}</span>
                {n.price && <span className="lib-price">{n.price}<span className="lib-unit">{n.unit}</span></span>}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Workshop />);

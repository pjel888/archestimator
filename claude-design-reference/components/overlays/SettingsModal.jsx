import React from "react";

/**
 * SettingsModal — the workshop's account/settings surface (live:
 * WorkshopSettingsModal + WorkshopSettingsModalContent), shown as a composed
 * pattern rather than a single primitive. A wide (920px) Modal whose flush body
 * holds a two-pane layout: a muted left nav of setting groups and a scrolling
 * column of bordered sections, each a list of link rows (label + description +
 * open-affordance). The Account group ends with a danger Sign-out row.
 *
 * Built from the shared Modal shell + Button off the namespace, so it inherits
 * the exact dialog chrome (soft-red close chip, hairline header) and button
 * styling. `canManagePlatform` reveals the closed-beta operations group.
 */

let injected = false;
function useSettingsCss() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const el = document.createElement("style");
  el.setAttribute("data-ae", "settings-modal");
  el.textContent = `
  .ae-settings-modal.ae-modal{max-width:920px;}
  .ae-settings{display:grid;grid-template-columns:220px minmax(0,1fr);height:560px;overflow:hidden;}
  .ae-settings__nav{border-right:1px solid var(--hairline);background:var(--surface-muted);padding:8px;
    display:flex;flex-direction:column;gap:4px;}
  .ae-settings__navlink{display:flex;align-items:center;gap:8px;height:40px;padding:0 8px;border:1px solid transparent;
    border-radius:var(--radius-xs,3px);font-family:var(--font-sf-pro);font-size:11px;font-weight:500;line-height:16px;
    letter-spacing:0;color:var(--secondary);text-decoration:none;cursor:pointer;transition:background .15s ease,color .15s ease;}
  .ae-settings__navlink:hover{background:#fff;color:var(--ink);}
  .ae-settings__navlink[data-current="true"]{border-color:var(--divider-sibling);background:#fff;color:var(--ink);
    box-shadow:0 1px 2px rgba(0,0,0,.06);}
  .ae-settings__navicon{display:grid;place-items:center;width:24px;height:24px;flex:none;border:1px solid var(--divider-sibling);
    border-radius:var(--radius-xs,3px);background:#fff;color:var(--tertiary);}
  .ae-settings__navlabel{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .ae-settings__scroll{min-height:0;overflow-y:auto;padding:16px;}
  .ae-settings__inner{max-width:660px;margin:0 auto;display:flex;flex-direction:column;gap:12px;}
  .ae-settings__section{overflow:hidden;border:1px solid var(--hairline);border-radius:var(--radius-xs,3px);background:#fff;}
  .ae-settings__secHead{display:flex;align-items:flex-start;gap:8px;border-bottom:1px solid var(--hairline);padding:12px;}
  .ae-settings__secIcon{display:grid;place-items:center;width:28px;height:28px;flex:none;border:1px solid var(--divider-sibling);
    border-radius:var(--radius-xs,3px);background:var(--surface-muted);color:var(--tertiary);margin-top:2px;}
  .ae-settings__secTitle{margin:0;font-family:var(--font-sf-pro);font-size:12px;font-weight:500;line-height:16px;
    letter-spacing:0;color:var(--ink);}
  .ae-settings__secDesc{margin:2px 0 0;font-family:var(--font-sf-pro);font-size:10px;line-height:16px;letter-spacing:0;color:var(--tertiary);}
  .ae-settings__rows{list-style:none;margin:0;padding:0;}
  .ae-settings__row{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:66px;padding:8px 12px;
    border-top:1px solid var(--hairline);text-decoration:none;cursor:pointer;transition:background .15s ease;}
  .ae-settings__rows>li:first-child .ae-settings__row,.ae-settings__rows>li:first-child{border-top:0;}
  .ae-settings__rowlink:hover{background:var(--surface-muted);}
  .ae-settings__rowName{display:block;font-family:var(--font-sf-pro);font-size:11px;font-weight:500;line-height:16px;
    letter-spacing:0;color:var(--ink);}
  .ae-settings__rowDesc{display:block;margin-top:2px;font-family:var(--font-sf-pro);font-size:10px;line-height:16px;
    letter-spacing:0;color:var(--tertiary);}
  .ae-settings__rowArrow{display:grid;place-items:center;width:28px;height:28px;flex:none;border:1px solid var(--divider-sibling);
    border-radius:var(--radius-xs,3px);background:#fff;color:var(--tertiary);margin-top:2px;transition:color .15s ease;}
  .ae-settings__rowlink:hover .ae-settings__rowArrow{color:var(--ink);}
  .ae-settings__note{display:flex;align-items:center;gap:8px;border:1px solid var(--hairline);border-radius:var(--radius-xs,3px);
    background:var(--surface-muted);padding:8px 12px;font-family:var(--font-sf-pro);font-size:10px;line-height:16px;letter-spacing:0;color:var(--tertiary);}
  .ae-settings__note--paper{background:#fff;}
  `;
  document.head.appendChild(el);
}

const GLYPH_COMMON_PROPS = { width: 14, height: 14, viewBox: "0 0 256 256", fill: "none", "aria-hidden": "true" };
const GLYPH_STROKE_PROPS = { stroke: "currentColor", strokeWidth: 14, strokeLinecap: "round", strokeLinejoin: "round" };

function Glyph({ name }) {
  if (name === "account")
    return (
      <svg {...GLYPH_COMMON_PROPS}>
        <circle cx="128" cy="128" r="88" {...GLYPH_STROKE_PROPS} />
        <circle cx="128" cy="108" r="30" {...GLYPH_STROKE_PROPS} />
        <path d="M70 198a72 72 0 0 1 116 0" {...GLYPH_STROKE_PROPS} />
      </svg>
    );
  if (name === "support")
    return (
      <svg {...GLYPH_COMMON_PROPS}>
        <circle cx="128" cy="128" r="88" {...GLYPH_STROKE_PROPS} />
        <circle cx="128" cy="128" r="36" {...GLYPH_STROKE_PROPS} />
        <path d="M70 70l33 33M186 70l-33 33M70 186l33-33M186 186l-33-33" {...GLYPH_STROKE_PROPS} />
      </svg>
    );
  if (name === "beta")
    return (
      <svg {...GLYPH_COMMON_PROPS}>
        <path d="M148 56a40 40 0 0 0 52 52l-92 92a28 28 0 0 1-40-40z" {...GLYPH_STROKE_PROPS} />
      </svg>
    );
  if (name === "arrow")
    return (
      <svg {...GLYPH_COMMON_PROPS} width="13" height="13">
        <path d="M96 84h76v76M168 88 84 172" {...GLYPH_STROKE_PROPS} />
      </svg>
    );
  if (name === "briefcase")
    return (
      <svg {...GLYPH_COMMON_PROPS} width="12" height="12">
        <rect x="40" y="80" width="176" height="120" rx="8" {...GLYPH_STROKE_PROPS} />
        <path d="M96 80V64a16 16 0 0 1 16-16h32a16 16 0 0 1 16 16v16" {...GLYPH_STROKE_PROPS} />
      </svg>
    );
  return null;
}

const ACCOUNT_ITEMS = [
  { label: "Profile settings", description: "Update profile-owned account details used across the workshop." },
  { label: "Workspace settings", description: "Update workspace-owned account fields for estimates and proposals." },
];
const SUPPORT_ITEMS = [
  { label: "Send beta feedback", description: "Report workflow blockers, export issues, and confusing estimating details during beta." },
  { label: "Terms and privacy", description: "Review beta terms, privacy status, estimate accuracy limits, and data deletion contact paths." },
  { label: "Terms acceptance", description: "Reopen the protected clickwrap screen to review the current accepted Terms version." },
];
const PLATFORM_ITEMS = [
  { label: "Beta users", description: "Add, activate, revoke, and annotate closed beta allowlist rows." },
  { label: "Beta feedback", description: "Review authenticated beta feedback and keep triage status current." },
];

function LinkRow({ label, description }) {
  return (
    <li>
      <a href="#" className="ae-settings__row ae-settings__rowlink" aria-label={`Open ${label}`}>
        <span style={{ minWidth: 0 }}>
          <span className="ae-settings__rowName">{label}</span>
          <span className="ae-settings__rowDesc">{description}</span>
        </span>
        <span className="ae-settings__rowArrow">
          <Glyph name="arrow" />
        </span>
      </a>
    </li>
  );
}

function Section({ icon, title, description, children }) {
  return (
    <section className="ae-settings__section">
      <header className="ae-settings__secHead">
        <span className="ae-settings__secIcon">
          <Glyph name={icon} />
        </span>
        <div style={{ minWidth: 0 }}>
          <h3 className="ae-settings__secTitle">{title}</h3>
          <p className="ae-settings__secDesc">{description}</p>
        </div>
      </header>
      <ul className="ae-settings__rows">{children}</ul>
    </section>
  );
}

export function SettingsModal({ open = true, onClose, inline = true, canManagePlatform = true }) {
  useSettingsCss();
  const NS = (typeof window !== "undefined" && window.ArchestimatorDesignSystem_3fbb6f) || {};
  const Modal = NS.Modal;
  const Button = NS.Button;
  if (!Modal) return null;
  const nav = [
    { id: "account", label: "Account", icon: "account" },
    { id: "support", label: "Support and legal", icon: "support" },
  ];
  if (canManagePlatform) nav.push({ id: "beta", label: "Beta operations", icon: "beta" });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Settings"
      description="Manage account, workspace, and beta operations."
      closeLabel="Close settings"
      size="xl"
      flushBody
      className="ae-settings-modal"
    >
      <div className="ae-settings">
        <nav className="ae-settings__nav" aria-label="Settings sections">
          {nav.map((g, i) => (
            <a key={g.id} href={`#settings-${g.id}`} className="ae-settings__navlink" data-current={i === 0}>
              <span className="ae-settings__navicon">
                <Glyph name={g.icon} />
              </span>
              <span className="ae-settings__navlabel">{g.label}</span>
            </a>
          ))}
        </nav>

        <div className="ae-settings__scroll">
          <div className="ae-settings__inner">
            <Section icon="account" title="Account" description="Profile and workspace account details.">
              {ACCOUNT_ITEMS.map((it) => (
                <LinkRow key={it.label} {...it} />
              ))}
              <li>
                <div className="ae-settings__row">
                  <div style={{ minWidth: 0 }}>
                    <span className="ae-settings__rowName">Sign out</span>
                    <span className="ae-settings__rowDesc">End this browser session and return to login.</span>
                  </div>
                  {Button ? (
                    <Button variant="danger" size="sm" style={{ flex: "none", whiteSpace: "nowrap" }}>
                      Sign out
                    </Button>
                  ) : null}
                </div>
              </li>
            </Section>

            <Section icon="support" title="Support and legal" description="Feedback, terms, and data requests.">
              {SUPPORT_ITEMS.map((it) => (
                <LinkRow key={it.label} {...it} />
              ))}
            </Section>
            <p className="ae-settings__note">
              For account deletion or data export requests during beta, send feedback or email support@archestimator.com.
            </p>

            {canManagePlatform ? (
              <Section icon="beta" title="Closed beta operations" description="Closed beta access and triage.">
                {PLATFORM_ITEMS.map((it) => (
                  <LinkRow key={it.label} {...it} />
                ))}
              </Section>
            ) : null}

            <div className="ae-settings__note ae-settings__note--paper">
              <Glyph name="briefcase" />
              <span style={{ minWidth: 0 }}>Settings changes apply across the current workshop account.</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

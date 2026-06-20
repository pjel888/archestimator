import React from "react";

/**
 * Modal — the app's centered dialog (live: AppModal over the Dialog primitive).
 * White paper on a dim scrim, 3px radius, hairline border, one soft shadow.
 * Header carries an 11px medium title + 10px tertiary description and the
 * signature soft-red close chip; body is 10px secondary; footer right-aligns
 * actions. `tone` tints the border + title for success/warning/danger flows.
 *
 * Presentational: it renders OPEN inline so the design tool can show the real
 * surface. Pass `inline` (default for cards) to scrim the nearest positioned
 * stage instead of the viewport; clear it for a true fixed overlay.
 */

let injected = false;
function useModalCss() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const el = document.createElement("style");
  el.setAttribute("data-ae", "modal");
  el.textContent = `
  .ae-modal-scrim{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;
    padding:16px;background:rgba(0,0,0,.25);}
  .ae-modal-scrim[data-inline="true"]{position:absolute;}
  .ae-modal-scrim[data-blur="true"]{backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);}
  .ae-modal{position:relative;z-index:1001;display:flex;flex-direction:column;min-height:0;width:100%;
    max-height:calc(100% - 32px);overflow:hidden;border:1px solid var(--hairline);border-radius:var(--radius-xs,3px);
    background:#fff;color:var(--ink);box-shadow:0 18px 48px rgba(17,24,39,.18),0 4px 12px rgba(17,24,39,.08);}
  .ae-modal--xs{max-width:320px;}
  .ae-modal--sm{max-width:384px;}
  .ae-modal--md{max-width:448px;}
  .ae-modal--lg{max-width:672px;}
  .ae-modal--xl{max-width:896px;}
  .ae-modal--success{border-color:var(--success-soft);}
  .ae-modal--warning{border-color:var(--warning-soft);}
  .ae-modal--danger,.ae-modal--destructive{border-color:var(--danger-soft);}
  .ae-modal__head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;min-height:40px;
    padding:8px 12px;border-bottom:1px solid var(--hairline);}
  .ae-modal__titles{min-width:0;}
  .ae-modal__title{margin:0;font-family:var(--font-sf-pro);font-size:11px;font-weight:500;line-height:16px;
    letter-spacing:0;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .ae-modal--success .ae-modal__title{color:var(--success);}
  .ae-modal--warning .ae-modal__title{color:var(--warning);}
  .ae-modal--danger .ae-modal__title,.ae-modal--destructive .ae-modal__title{color:var(--danger);}
  .ae-modal__desc{margin:2px 0 0;font-family:var(--font-sf-pro);font-size:10px;font-weight:500;line-height:16px;
    letter-spacing:0;color:var(--tertiary);}
  .ae-modal__x{display:grid;place-items:center;width:24px;height:24px;flex:none;padding:0;border:0;cursor:pointer;
    border-radius:var(--radius-xs,3px);color:#B84646;background:#FBE8E8;outline:none;
    transition:background .15s ease,color .15s ease;}
  .ae-modal__x:hover{color:#8B2E2E;background:#F2CCCC;}
  .ae-modal__x:focus-visible{box-shadow:0 0 0 2px #fff,0 0 0 4px var(--focus);}
  .ae-modal__body{min-height:0;flex:1;overflow:auto;padding:12px;font-family:var(--font-sf-pro);font-size:10px;
    line-height:16px;letter-spacing:0;color:var(--secondary);}
  .ae-modal__body--flush{padding:0;background:var(--surface-muted);}
  .ae-modal__foot{border-top:1px solid var(--hairline);padding:8px 12px;}
  .ae-modal__actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;min-width:0;}
  `;
  document.head.appendChild(el);
}

// Share the chrome injector so Sheet / SettingsModal paint the same head/body/foot.
if (typeof window !== "undefined") {
  const __ns = (window.ArchestimatorDesignSystem_3fbb6f = window.ArchestimatorDesignSystem_3fbb6f || {});
  __ns.__ensureModalCss = useModalCss;
}

function ModalCloseChip({ onClose, closeLabel }) {
  return (
    <button type="button" className="ae-modal__x" aria-label={closeLabel} onClick={onClose}>
      <svg width="13" height="13" viewBox="0 0 256 256" fill="none" aria-hidden="true">
        <path d="M200 56 56 200M200 200 56 56" stroke="currentColor" strokeWidth="18" strokeLinecap="round" />
      </svg>
    </button>
  );
}

export function Modal({
  open = true,
  onClose,
  title,
  description,
  footer,
  size = "md",
  tone = "default",
  inline = false,
  blur = true,
  flushBody = false,
  closeLabel = "Close",
  bodyClassName = "",
  className = "",
  children,
}) {
  useModalCss();
  if (!open) return null;
  const destructive = tone === "destructive" || tone === "danger";
  return (
    <div className="ae-modal-scrim" data-inline={inline} data-blur={blur}>
      <div
        role={destructive ? "alertdialog" : "dialog"}
        aria-modal="true"
        className={`ae-modal ae-modal--${size} ae-modal--${tone} ${className}`}
      >
        <div className="ae-modal__head">
          <div className="ae-modal__titles">
            <h2 className="ae-modal__title">{title}</h2>
            {description ? <p className="ae-modal__desc">{description}</p> : null}
          </div>
          <ModalCloseChip onClose={onClose} closeLabel={closeLabel} />
        </div>
        <div className={`ae-modal__body ${flushBody ? "ae-modal__body--flush" : ""} ${bodyClassName}`}>
          {children}
        </div>
        {footer ? (
          <div className="ae-modal__foot">
            <div className="ae-modal__actions">{footer}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

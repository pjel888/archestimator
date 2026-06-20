import React from "react";

/**
 * Sheet — the edge-anchored panel / drawer (live: Sheet + Drawer + SidePanel
 * over the Dialog primitive). Same paper, hairline border, header / body /
 * footer chrome and soft-red close chip as Modal, but pinned full-height to the
 * right or left, or full-width along the bottom. Use it for inspectors, filters,
 * and contextual editing that should keep the page behind partially in view.
 */

let injected = false;
function useSheetCss() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const el = document.createElement("style");
  el.setAttribute("data-ae", "sheet");
  el.textContent = `
  .ae-sheet-scrim{position:fixed;inset:0;z-index:1000;display:flex;padding:12px;background:rgba(0,0,0,.2);}
  .ae-sheet-scrim[data-inline="true"]{position:absolute;}
  .ae-sheet-scrim[data-scrim="false"]{background:transparent;}
  .ae-sheet-scrim[data-blur="true"]{backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);}
  .ae-sheet-scrim[data-side="right"]{align-items:stretch;justify-content:flex-end;}
  .ae-sheet-scrim[data-side="left"]{align-items:stretch;justify-content:flex-start;}
  .ae-sheet-scrim[data-side="bottom"]{align-items:flex-end;justify-content:stretch;}
  .ae-sheet{max-height:calc(100% - 24px);box-shadow:0 18px 48px rgba(17,24,39,.14);}
  .ae-sheet[data-side="right"],.ae-sheet[data-side="left"]{height:100%;}
  .ae-sheet[data-side="bottom"]{width:100%;}
  .ae-sheet--narrow{width:320px;max-width:calc(100% - 24px);}
  .ae-sheet--md{width:420px;max-width:calc(100% - 24px);}
  .ae-sheet--wide{width:640px;max-width:calc(100% - 24px);}
  .ae-sheet--bottom-narrow{height:260px;max-height:calc(100% - 24px);}
  .ae-sheet--bottom-md{height:360px;max-height:calc(100% - 24px);}
  .ae-sheet--bottom-wide{height:520px;max-height:calc(100% - 24px);}
  `;
  document.head.appendChild(el);
}

export function Sheet({
  open = true,
  onClose,
  title,
  description,
  footer,
  side = "right",
  size = "md",
  inline = false,
  blur = false,
  scrim = true,
  closeLabel = "Close panel",
  bodyClassName = "",
  children,
}) {
  useSheetCss();
  const NS = (typeof window !== "undefined" && window.ArchestimatorDesignSystem_3fbb6f) || {};
  if (NS.__ensureModalCss) NS.__ensureModalCss();
  if (!open) return null;
  const isBottom = side === "bottom";
  const sizeClass = isBottom ? `ae-sheet--bottom-${size === "narrow" || size === "wide" ? size : "md"}` : `ae-sheet--${size === "md" ? "md" : size}`;
  return (
    <div className="ae-sheet-scrim" data-inline={inline} data-blur={blur} data-scrim={scrim} data-side={side}>
      <div role="dialog" aria-modal="true" data-side={side} className={`ae-modal ae-sheet ${sizeClass}`}>
        <div className="ae-modal__head">
          <div className="ae-modal__titles">
            <h2 className="ae-modal__title">{title}</h2>
            {description ? <p className="ae-modal__desc">{description}</p> : null}
          </div>
          <button type="button" className="ae-modal__x" aria-label={closeLabel} onClick={onClose}>
            <svg width="13" height="13" viewBox="0 0 256 256" fill="none" aria-hidden="true">
              <path d="M200 56 56 200M200 200 56 56" stroke="currentColor" strokeWidth="18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className={`ae-modal__body ${bodyClassName}`}>{children}</div>
        {footer ? (
          <div className="ae-modal__foot">
            <div className="ae-modal__actions">{footer}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

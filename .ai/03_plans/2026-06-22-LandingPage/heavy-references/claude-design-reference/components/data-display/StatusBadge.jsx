import React from "react";

/**
 * StatusBadge — semantic estimate/proposal state chip with optional leading dot.
 * approved → success, review → warning, danger → danger, draft/inactive → neutral.
 */

let injected = false;
function useStatusCss() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const el = document.createElement("style");
  el.setAttribute("data-ae", "status-badge");
  el.textContent = `
  .ae-status{display:inline-flex;align-items:center;justify-content:center;min-width:96px;padding:6px;
    border-radius:var(--radius-xs,3px);font-family:var(--font-sf-pro);font-size:8px;font-weight:500;
    line-height:1;letter-spacing:0;text-transform:uppercase;}
  .ae-status__dot{width:6px;height:6px;border-radius:50%;margin-right:6px;}
  .ae-status--approved,.ae-status--active{background:var(--success-soft);color:var(--success);}
  .ae-status--approved .ae-status__dot,.ae-status--active .ae-status__dot{background:var(--success);}
  .ae-status--review{background:var(--warning-soft);color:var(--warning);}
  .ae-status--review .ae-status__dot{background:var(--warning);}
  .ae-status--danger{background:var(--danger-soft);color:var(--danger);}
  .ae-status--danger .ae-status__dot{background:var(--danger);}
  .ae-status--draft{background:var(--surface-muted);color:var(--muted);}
  .ae-status--draft .ae-status__dot{background:var(--muted);}
  .ae-status--inactive{background:var(--surface-muted);color:var(--tertiary);}
  .ae-status--inactive .ae-status__dot{background:var(--tertiary);}
  `;
  document.head.appendChild(el);
}

export function StatusBadge({ status, showDot = false, className = "", children, ...props }) {
  useStatusCss();
  return (
    <span className={`ae-status ae-status--${status} ${className}`} {...props}>
      {showDot && <span className="ae-status__dot" aria-hidden="true" />}
      {children}
    </span>
  );
}

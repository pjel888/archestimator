import React from "react";

/**
 * Archestimator Button — the single button primitive for app/workshop UI.
 * SF Pro, 10px/medium, 3px radius, zero tracking. Strong-neutral primary;
 * never construction-orange outside the named estimate-sheet exception.
 */

let injected = false;
function useButtonCss() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const css = `
  .ae-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;white-space:nowrap;
    font-family:var(--font-sf-pro);font-size:10px;font-weight:500;line-height:1;letter-spacing:0;
    border-radius:var(--radius-xs,3px);border:1px solid transparent;cursor:pointer;
    transition:background .15s ease,color .15s ease,border-color .15s ease;outline:none;}
  .ae-btn:focus-visible{box-shadow:0 0 0 2px #fff,0 0 0 4px var(--focus);}
  .ae-btn:disabled{pointer-events:none;opacity:.5;}
  /* sizes */
  .ae-btn--xs{min-height:28px;min-width:96px;padding:4px 6px;}
  .ae-btn--sm{min-height:32px;min-width:96px;padding:6px 8px;}
  .ae-btn--md{min-height:36px;min-width:96px;padding:8px 10px;}
  .ae-btn--lg{min-height:40px;min-width:96px;padding:8px 12px;}
  /* variants */
  .ae-btn--primary{background:var(--primary);color:#fff;}
  .ae-btn--primary:hover{background:var(--accent-dark);}
  .ae-btn--secondary{background:var(--surface);color:var(--ink);border-color:var(--divider);}
  .ae-btn--secondary:hover{background:var(--surface-muted);}
  .ae-btn--soft{background:var(--accent-soft);color:var(--accent-dark);border-color:color-mix(in srgb,var(--accent) 20%,transparent);}
  .ae-btn--soft:hover{background:var(--surface-muted);}
  .ae-btn--outline{background:transparent;color:var(--ink);border-color:var(--hairline);}
  .ae-btn--outline:hover{background:var(--surface-muted);}
  .ae-btn--ghost{background:transparent;color:var(--muted);}
  .ae-btn--ghost:hover{background:var(--surface-muted);color:var(--ink);}
  .ae-btn--plain{background:transparent;color:var(--secondary);}
  .ae-btn--plain:hover{color:var(--ink);}
  .ae-btn--danger{background:#fff;color:var(--danger);border-color:var(--danger-soft);}
  .ae-btn--danger:hover{background:var(--danger-soft);}
  /* add-affordance — named estimate-sheet exception */
  .ae-btn--add{background:var(--add-affordance-bg);color:var(--add-affordance-fg);}
  .ae-btn--add:hover{background:var(--add-affordance-bg-hover);color:var(--add-affordance-fg-hover);}
  `;
  const el = document.createElement("style");
  el.setAttribute("data-ae", "button");
  el.textContent = css;
  document.head.appendChild(el);
}

export function Button({
  variant = "secondary",
  size = "md",
  type = "button",
  className = "",
  children,
  ...props
}) {
  useButtonCss();
  const buttonProps = {
    ...props,
    className: `ae-btn ae-btn--${variant} ae-btn--${size} ${className}`,
  };
  if (type === "submit") return <button {...buttonProps} type="submit">{children}</button>;
  if (type === "reset") return <button {...buttonProps} type="reset">{children}</button>;
  return <button {...buttonProps} type="button">{children}</button>;
}

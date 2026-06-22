import React from "react";

/**
 * IconButton — square icon-only control built on the same scale as Button.
 * Pass an icon (or single glyph) as children. Sizes are fixed squares so the
 * 1px-outline iconography sits flush; use `aria-label` for the action name.
 */

let injected = false;
function useIconBtnCss() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const css = `
  .ae-iconbtn{display:grid;place-items:center;padding:0;border:1px solid transparent;cursor:pointer;
    color:var(--secondary);background:transparent;border-radius:var(--radius-xs,3px);
    transition:background .15s ease,color .15s ease,border-color .15s ease;outline:none;}
  .ae-iconbtn:focus-visible{box-shadow:0 0 0 2px #fff,0 0 0 4px var(--focus);}
  .ae-iconbtn:disabled{pointer-events:none;opacity:.5;}
  .ae-iconbtn--xs{width:28px;height:28px;}
  .ae-iconbtn--sm{width:32px;height:32px;}
  .ae-iconbtn--md{width:36px;height:36px;}
  .ae-iconbtn--lg{width:40px;height:40px;}
  .ae-iconbtn--ghost:hover{background:var(--surface-muted);color:var(--ink);}
  .ae-iconbtn--secondary{background:var(--surface);border-color:var(--divider);color:var(--ink);}
  .ae-iconbtn--secondary:hover{background:var(--surface-muted);}
  .ae-iconbtn--add{background:var(--add-affordance-bg);color:var(--add-affordance-fg);}
  .ae-iconbtn--add:hover{background:var(--add-affordance-bg-hover);color:var(--add-affordance-fg-hover);}
  `;
  const el = document.createElement("style");
  el.setAttribute("data-ae", "icon-button");
  el.textContent = css;
  document.head.appendChild(el);
}

export function IconButton({
  variant = "ghost",
  size = "md",
  type = "button",
  className = "",
  children,
  ...props
}) {
  useIconBtnCss();
  return (
    <button
      type={type}
      className={`ae-iconbtn ae-iconbtn--${variant} ae-iconbtn--${size} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

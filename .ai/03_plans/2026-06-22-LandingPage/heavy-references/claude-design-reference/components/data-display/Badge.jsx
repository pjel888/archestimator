import React from "react";

/**
 * Badge — small uppercase status/label pill. Tones carry meaning only.
 * Keeps the product's 96px min-width so badges align in dense tables.
 */

let injected = false;
function useBadgeCss() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const el = document.createElement("style");
  el.setAttribute("data-ae", "badge");
  el.textContent = `
  .ae-badge{display:inline-flex;align-items:center;justify-content:center;min-width:96px;
    border:1px solid;border-radius:var(--radius-xs,3px);font-family:var(--font-sf-pro);
    font-weight:500;line-height:1;letter-spacing:0;text-transform:uppercase;font-variant-numeric:tabular-nums;}
  .ae-badge--xs{min-height:16px;padding:1px 4px;font-size:8px;}
  .ae-badge--sm{min-height:20px;padding:1px 6px;font-size:9px;}
  .ae-badge--neutral{border-color:var(--hairline);background:var(--surface-muted);color:var(--tertiary);}
  .ae-badge--accent{border-color:color-mix(in srgb,var(--accent) 20%,transparent);background:var(--accent-soft);color:var(--accent-dark);}
  .ae-badge--success{border-color:color-mix(in srgb,var(--success) 20%,transparent);background:color-mix(in srgb,var(--success) 10%,#fff);color:var(--success);}
  .ae-badge--warning{border-color:color-mix(in srgb,var(--warning) 25%,transparent);background:color-mix(in srgb,var(--warning) 10%,#fff);color:var(--warning);}
  .ae-badge--danger{border-color:var(--danger-soft);background:var(--danger-soft);color:var(--danger);}
  `;
  document.head.appendChild(el);
}

export function Badge({ tone = "neutral", size = "sm", className = "", children, ...props }) {
  useBadgeCss();
  return (
    <span className={`ae-badge ae-badge--${tone} ae-badge--${size} ${className}`} {...props}>
      {children}
    </span>
  );
}

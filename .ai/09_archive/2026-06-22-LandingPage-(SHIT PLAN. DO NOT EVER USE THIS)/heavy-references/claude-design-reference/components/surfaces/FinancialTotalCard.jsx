import React from "react";

/**
 * FinancialTotalCard — strong numeric hierarchy, minimal decoration. The
 * `primary` variant is the ink-filled grand-total card; `default` is a bordered
 * white sub-total. Values render tabular so columns of figures align.
 */

let injected = false;
function useTotalCss() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const el = document.createElement("style");
  el.setAttribute("data-ae", "financial-total");
  el.textContent = `
  .ae-total{display:flex;flex-direction:column;padding:16px;border-radius:var(--radius-xs,3px);letter-spacing:0;}
  .ae-total--default{background:var(--surface);border:1px solid var(--hairline);color:var(--ink);}
  .ae-total--primary{background:var(--primary);color:#fff;}
  .ae-total__label{font-family:var(--font-sf-pro);font-size:9px;font-weight:500;text-transform:uppercase;color:var(--tertiary);}
  .ae-total--primary .ae-total__label{color:rgba(255,255,255,.7);}
  .ae-total__value{margin-top:4px;font-family:var(--font-sf-pro);font-size:12px;font-weight:500;
    line-height:1.15;font-variant-numeric:tabular-nums;}
  .ae-total__sub{margin-top:4px;font-family:var(--font-sf-pro);font-size:10px;color:var(--muted);}
  .ae-total--primary .ae-total__sub{color:rgba(255,255,255,.7);}
  `;
  document.head.appendChild(el);
}

export function FinancialTotalCard({ label, value, sublabel, variant = "default", className = "", ...props }) {
  useTotalCss();
  return (
    <div className={`ae-total ae-total--${variant} ${className}`} {...props}>
      <div className="ae-total__label">{label}</div>
      <div className="ae-total__value">{value}</div>
      {sublabel && <div className="ae-total__sub">{sublabel}</div>}
    </div>
  );
}

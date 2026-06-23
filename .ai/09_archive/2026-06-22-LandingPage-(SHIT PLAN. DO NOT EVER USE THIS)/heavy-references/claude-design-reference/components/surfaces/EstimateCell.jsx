import React from "react";

/**
 * EstimateCell — a single spreadsheet cell, 36px tall, hairline-bordered.
 * `selected` paints the accent-soft background; `editing` rings it; `numeric`
 * switches to medium tabular figures. Compose into rows for the estimate sheet.
 */

let injected = false;
function useCellCss() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const el = document.createElement("style");
  el.setAttribute("data-ae", "estimate-cell");
  el.textContent = `
  .ae-cell{display:flex;align-items:center;height:36px;padding:8px;border:1px solid var(--hairline);
    font-family:var(--font-sf-pro);font-size:10px;font-weight:400;line-height:14px;letter-spacing:0;
    color:var(--ink);background:var(--surface);}
  .ae-cell--selected{background:var(--accent-soft);}
  .ae-cell--editing{box-shadow:inset 0 0 0 1px var(--primary);}
  .ae-cell--numeric{font-weight:500;font-variant-numeric:tabular-nums;}
  .ae-cell--left{justify-content:flex-start;}
  .ae-cell--center{justify-content:center;}
  .ae-cell--right{justify-content:flex-end;}
  `;
  document.head.appendChild(el);
}

export function EstimateCell({ value, selected, editing, numeric, align = "left", className = "", ...props }) {
  useCellCss();
  return (
    <div
      className={`ae-cell ae-cell--${align} ${selected ? "ae-cell--selected" : ""} ${editing ? "ae-cell--editing" : ""} ${numeric ? "ae-cell--numeric" : ""} ${className}`}
      {...props}
    >
      {value}
    </div>
  );
}

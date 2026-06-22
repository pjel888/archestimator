import React from "react";

/**
 * Card — flat white, thin-bordered, content-first surface. `interactive` adds a
 * quiet lift on hover. One surface owns each work zone; avoid card-on-card nesting.
 */

let injected = false;
function useCardCss() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const el = document.createElement("style");
  el.setAttribute("data-ae", "card");
  el.textContent = `
  .ae-card{background:var(--surface);border:1px solid var(--hairline);border-radius:var(--radius-xs,3px);color:var(--ink);}
  .ae-card--interactive{transition:transform .2s ease,box-shadow .2s ease,border-color .2s ease;}
  .ae-card--interactive:hover{transform:translateY(-2px);border-color:var(--muted);box-shadow:var(--shadow-card-hover);}
  `;
  document.head.appendChild(el);
}

export function Card({ interactive = false, className = "", children, ...props }) {
  useCardCss();
  return (
    <div className={`ae-card ${interactive ? "ae-card--interactive" : ""} ${className}`} {...props}>
      {children}
    </div>
  );
}

import React from "react";

/**
 * SegmentedControl — single-select group on a muted track; the active option
 * lifts to a white pill. Arrow-key roving per WAI-ARIA. Used for the
 * estimate library's Default / Suppliers / Brand view switch, chart break-downs, etc.
 */

let injected = false;
function useSegCss() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const el = document.createElement("style");
  el.setAttribute("data-ae", "segmented");
  el.textContent = `
  .ae-seg{display:inline-grid;grid-auto-flow:column;gap:4px;padding:2px;border-radius:var(--radius-xs,3px);
    background:var(--surface-muted);}
  .ae-seg__btn{min-height:24px;padding:0 8px;border:0;border-radius:var(--radius-xs,3px);background:transparent;
    font-family:var(--font-sf-pro);font-size:10px;font-weight:500;line-height:1;letter-spacing:0;
    color:var(--tertiary);cursor:pointer;transition:background .15s ease,color .15s ease;outline:none;}
  .ae-seg__btn:focus-visible{box-shadow:0 0 0 2px var(--focus);}
  .ae-seg__btn:hover{color:var(--ink);}
  .ae-seg__btn[aria-pressed="true"]{background:#fff;color:var(--ink);box-shadow:0 1px 2px rgba(0,0,0,.08);}
  `;
  document.head.appendChild(el);
}

export function SegmentedControl({ ariaLabel, options, value, onValueChange, className = "" }) {
  useSegCss();
  const refs = React.useRef([]);
  const selected = Math.max(0, options.findIndex((o) => o.value === value));
  function move(next) {
    const i = (next + options.length) % options.length;
    onValueChange && onValueChange(options[i].value);
    refs.current[i] && refs.current[i].focus();
  }
  function onKey(e) {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); move(selected + 1); }
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); move(selected - 1); }
    else if (e.key === "Home") { e.preventDefault(); move(0); }
    else if (e.key === "End") { e.preventDefault(); move(options.length - 1); }
  }
  return (
    <div role="group" aria-label={ariaLabel} onKeyDown={onKey}
      className={`ae-seg ${className}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))` }}>
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <button key={o.value} ref={(n) => (refs.current[i] = n)} type="button"
            className="ae-seg__btn" aria-pressed={on} tabIndex={on ? 0 : -1}
            onClick={() => onValueChange && onValueChange(o.value)}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

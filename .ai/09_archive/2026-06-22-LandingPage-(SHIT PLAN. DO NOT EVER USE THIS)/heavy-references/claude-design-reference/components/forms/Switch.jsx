import React from "react";

/**
 * Switch — compact square (3px) toggle. Ink fill when on; tertiary knob when off.
 * Small footprint suits dense settings rows rather than marketing pages.
 */

let injected = false;
function useSwitchCss() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const el = document.createElement("style");
  el.setAttribute("data-ae", "switch");
  el.textContent = `
  .ae-switch{display:inline-flex;align-items:center;gap:8px;cursor:pointer;}
  .ae-switch[data-disabled="true"]{cursor:not-allowed;opacity:.5;}
  .ae-switch__track{position:relative;display:inline-flex;align-items:center;width:24px;height:14px;
    flex:none;border:1px solid var(--hairline);border-radius:var(--radius-xs,3px);background:var(--surface);
    transition:background .15s ease,border-color .15s ease;outline:none;padding:0;cursor:inherit;}
  .ae-switch__track:focus-visible{box-shadow:0 0 0 1px #fff,0 0 0 3px var(--focus);}
  .ae-switch__track[data-on="true"]{background:var(--primary);border-color:var(--primary);}
  .ae-switch__knob{display:block;width:10px;height:10px;border-radius:var(--radius-xs,3px);
    background:var(--tertiary);transform:translateX(2px);transition:transform .15s ease,background .15s ease;
    box-shadow:0 1px 2px rgba(0,0,0,.15);}
  .ae-switch__track[data-on="true"] .ae-switch__knob{background:#fff;transform:translateX(12px);}
  .ae-switch__label{font-family:var(--font-sf-pro);font-size:10px;font-weight:500;line-height:1;color:var(--ink);}
  `;
  document.head.appendChild(el);
}

export function Switch({ checked = false, onChange, label, disabled = false, className = "", ...props }) {
  useSwitchCss();
  return (
    <label className={`ae-switch ${className}`} data-disabled={disabled}>
      <button
        {...props}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        data-on={checked}
        className="ae-switch__track"
        onClick={() => !disabled && onChange && onChange(!checked)}
      >
        <span className="ae-switch__knob" />
      </button>
      {label && <span className="ae-switch__label">{label}</span>}
    </label>
  );
}

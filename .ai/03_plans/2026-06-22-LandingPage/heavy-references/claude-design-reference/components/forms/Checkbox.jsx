import React from "react";

/**
 * Checkbox — 3px square that fills ink-solid with a checkmark when on.
 * Matches the dense estimate-sheet selection checkboxes.
 */

let injected = false;
function useCheckboxCss() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const el = document.createElement("style");
  el.setAttribute("data-ae", "checkbox");
  el.textContent = `
  .ae-check{display:inline-flex;align-items:center;gap:8px;cursor:pointer;}
  .ae-check[data-disabled="true"]{cursor:not-allowed;opacity:.5;}
  .ae-check__box{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;
    flex:none;border:1px solid var(--divider-sibling);border-radius:var(--radius-xs,3px);background:#fff;
    color:#fff;transition:background .12s ease,border-color .12s ease;outline:none;padding:0;cursor:inherit;}
  .ae-check__box:focus-visible{box-shadow:0 0 0 1px #fff,0 0 0 3px var(--focus);}
  .ae-check__box[data-on="true"]{background:var(--primary);border-color:var(--primary);}
  .ae-check__tick{width:8px;height:8px;display:block;}
  .ae-check__label{font-family:var(--font-sf-pro);font-size:10px;font-weight:400;line-height:1;color:var(--ink);}
  `;
  document.head.appendChild(el);
}

export function Checkbox({ checked = false, onChange, label, disabled = false, className = "", ...props }) {
  useCheckboxCss();
  return (
    <label className={`ae-check ${className}`} data-disabled={disabled}>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        disabled={disabled}
        data-on={checked}
        className="ae-check__box"
        onClick={() => !disabled && onChange && onChange(!checked)}
        {...props}
      >
        {checked && (
          <svg className="ae-check__tick" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M2.5 6.2 5 8.6 9.5 3.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      {label && <span className="ae-check__label">{label}</span>}
    </label>
  );
}

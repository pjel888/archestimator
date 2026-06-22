import React from "react";

/**
 * Input + Field — the canonical app text control. 10px/medium, 3px radius,
 * hairline border that warms to the accent on focus with the accent-soft fill.
 * Field wraps it with the 9px uppercase tertiary label the product uses.
 */

let injected = false;
function useInputCss() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const el = document.createElement("style");
  el.setAttribute("data-ae", "input");
  el.textContent = `
  .ae-input{width:100%;min-width:0;height:32px;padding:0 8px;border:1px solid var(--hairline);
    border-radius:var(--radius-xs,3px);background:#fff;font-family:var(--font-sf-pro);font-size:10px;
    font-weight:500;line-height:1;letter-spacing:0;color:var(--ink);outline:none;
    box-shadow:inset 0 1px 0 rgba(17,17,17,0.02);transition:border-color .15s ease,background .15s ease;}
  .ae-input::placeholder{color:var(--tertiary);}
  .ae-input:hover{border-color:var(--tertiary);}
  .ae-input:focus{border-color:var(--accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--focus) 18%,transparent);}
  .ae-input--invalid{border-color:var(--danger);color:var(--danger);}
  .ae-input--invalid:focus{border-color:var(--danger);box-shadow:0 0 0 2px var(--danger-soft);}
  .ae-input--right{text-align:right;}
  .ae-input--center{text-align:center;}
  .ae-field{display:flex;flex-direction:column;gap:4px;min-width:0;}
  .ae-field__label{display:block;font-family:var(--font-sf-pro);font-size:9px;font-weight:500;
    line-height:12px;letter-spacing:0;text-transform:uppercase;color:var(--tertiary);}
  .ae-field__req{color:var(--danger);margin-left:2px;}
  .ae-field__help{font-family:var(--font-sf-pro);font-size:9px;line-height:12px;color:var(--tertiary);}
  .ae-field__err{font-family:var(--font-sf-pro);font-size:9px;line-height:12px;color:var(--danger);}
  `;
  document.head.appendChild(el);
}

export function Input({ align = "left", invalid = false, className = "", ...props }) {
  useInputCss();
  const a = align === "right" ? "ae-input--right" : align === "center" ? "ae-input--center" : "";
  return (
    <input
      className={`ae-input ${a} ${invalid ? "ae-input--invalid" : ""} ${className}`}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

export function Field({ label, required, helperText, errorText, children, className = "" }) {
  useInputCss();
  return (
    <label className={`ae-field ${className}`}>
      <span className="ae-field__label">
        {label}{required && <span className="ae-field__req" aria-hidden="true">*</span>}
      </span>
      {children}
      {errorText ? <span className="ae-field__err">{errorText}</span>
        : helperText ? <span className="ae-field__help">{helperText}</span> : null}
    </label>
  );
}

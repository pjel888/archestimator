import React from "react";

/**
 * Chip — compact toggle / filter / removable tag. Renders a real button so it
 * is keyboard-operable; `active` fills it solid ink. Tones: neutral/accent/danger.
 */

let injected = false;
function useChipCss() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const el = document.createElement("style");
  el.setAttribute("data-ae", "chip");
  el.textContent = `
  .ae-chip{display:inline-flex;align-items:center;gap:4px;min-height:20px;padding:1px 6px;
    border:1px solid;border-radius:var(--radius-xs,3px);font-family:var(--font-sf-pro);font-size:9px;
    font-weight:500;line-height:1;letter-spacing:0;cursor:pointer;background:none;
    transition:background .15s ease,border-color .15s ease,color .15s ease;outline:none;}
  .ae-chip:focus-visible{box-shadow:0 0 0 1px #fff,0 0 0 3px var(--focus);}
  .ae-chip:disabled{pointer-events:none;opacity:.5;}
  .ae-chip--neutral{border-color:var(--hairline);background:var(--surface-muted);color:var(--ink);}
  .ae-chip--neutral:hover{border-color:var(--tertiary);}
  .ae-chip--accent{border-color:color-mix(in srgb,var(--accent) 30%,transparent);background:var(--accent-soft);color:var(--accent-dark);}
  .ae-chip--accent:hover{border-color:var(--accent);}
  .ae-chip--danger{border-color:var(--danger-soft);background:var(--danger-soft);color:var(--danger);}
  .ae-chip--danger:hover{border-color:var(--danger);}
  .ae-chip--active{border-color:var(--ink);background:var(--ink);color:#fff;}
  .ae-chip__x{display:inline-flex;align-items:center;justify-content:center;width:12px;height:12px;font-size:9px;}
  `;
  document.head.appendChild(el);
}

export function Chip({
  tone = "neutral",
  active = false,
  removable = false,
  onRemove,
  removeLabel = "Remove",
  type = "button",
  className = "",
  children,
  ...props
}) {
  useChipCss();
  const cls = active ? "ae-chip ae-chip--active" : `ae-chip ae-chip--${tone}`;
  const buttonProps = {
    ...props,
    "aria-pressed": active || undefined,
    className: `${cls} ${className}`,
  };
  const labelContent = (
    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{children}</span>
  );
  const removeButton = removable && (
    <span
      role="button"
      tabIndex={0}
      aria-label={removeLabel}
      className="ae-chip__x"
      onClick={(e) => { e.stopPropagation(); onRemove && onRemove(); }}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onRemove && onRemove(); } }}
    >×</span>
  );
  if (type === "submit") return <button {...buttonProps} type="submit">{labelContent}{removeButton}</button>;
  if (type === "reset") return <button {...buttonProps} type="reset">{labelContent}{removeButton}</button>;
  return <button {...buttonProps} type="button">{labelContent}{removeButton}</button>;
}

import React from "react";

/**
 * Avatar — square (3px radius) user/entity image with initials fallback.
 * Square corners keep it consistent with the architectural radius scale.
 */

let injected = false;
function useAvatarCss() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const el = document.createElement("style");
  el.setAttribute("data-ae", "avatar");
  el.textContent = `
  .ae-avatar{position:relative;display:inline-flex;align-items:center;justify-content:center;
    overflow:hidden;flex:none;border:1px solid var(--hairline);border-radius:var(--radius-xs,3px);
    background:var(--surface-muted);color:var(--ink);font-family:var(--font-sf-pro);font-weight:500;
    text-transform:uppercase;letter-spacing:0;}
  .ae-avatar img{width:100%;height:100%;object-fit:cover;display:block;}
  .ae-avatar--xs{width:20px;height:20px;font-size:9px;}
  .ae-avatar--sm{width:28px;height:28px;font-size:10px;}
  .ae-avatar--md{width:36px;height:36px;font-size:12px;}
  .ae-avatar--lg{width:48px;height:48px;font-size:12px;}
  `;
  document.head.appendChild(el);
}

export function Avatar({ src, alt, initials, size = "md", className = "", ...props }) {
  useAvatarCss();
  const [err, setErr] = React.useState(false);
  return (
    <div className={`ae-avatar ae-avatar--${size} ${className}`} {...props}>
      {src && !err ? (
        <img src={src} alt={alt || "Avatar"} onError={() => setErr(true)} />
      ) : (
        <span>{(initials || "?").slice(0, 2)}</span>
      )}
    </div>
  );
}

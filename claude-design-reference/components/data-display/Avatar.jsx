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
  .ae-avatar__image{width:100%;height:100%;background-position:center;background-size:cover;background-repeat:no-repeat;display:block;}
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
  const safeSrc = typeof src === "string" ? src : "";

  React.useEffect(() => {
    if (!safeSrc || typeof window === "undefined") return;
    let mounted = true;
    setErr(false);
    const probe = new window.Image();
    probe.onerror = () => {
      if (mounted) setErr(true);
    };
    probe.src = safeSrc;
    return () => {
      mounted = false;
    };
  }, [safeSrc]);

  return (
    <div className={`ae-avatar ae-avatar--${size} ${className}`} {...props}>
      {safeSrc && !err ? (
        <span
          className="ae-avatar__image"
          role="img"
          aria-label={alt || "Avatar"}
          style={{ backgroundImage: `url(${JSON.stringify(safeSrc)})` }}
        />
      ) : (
        <span>{(initials || "?").slice(0, 2)}</span>
      )}
    </div>
  );
}

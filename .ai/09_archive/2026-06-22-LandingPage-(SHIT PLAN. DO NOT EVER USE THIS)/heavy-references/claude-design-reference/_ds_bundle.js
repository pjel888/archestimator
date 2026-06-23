/* @ds-bundle: {"format":3,"namespace":"ArchestimatorDesignSystem_3fbb6f","components":[{"name":"Button","sourcePath":"components/buttons/Button.jsx"},{"name":"IconButton","sourcePath":"components/buttons/IconButton.jsx"},{"name":"Avatar","sourcePath":"components/data-display/Avatar.jsx"},{"name":"Badge","sourcePath":"components/data-display/Badge.jsx"},{"name":"Chip","sourcePath":"components/data-display/Chip.jsx"},{"name":"StatusBadge","sourcePath":"components/data-display/StatusBadge.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Field","sourcePath":"components/forms/Input.jsx"},{"name":"SegmentedControl","sourcePath":"components/forms/SegmentedControl.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Card","sourcePath":"components/surfaces/Card.jsx"},{"name":"EstimateCell","sourcePath":"components/surfaces/EstimateCell.jsx"},{"name":"FinancialTotalCard","sourcePath":"components/surfaces/FinancialTotalCard.jsx"},{"name":"Modal","sourcePath":"components/overlays/Modal.jsx"},{"name":"ConfirmDialog","sourcePath":"components/overlays/ConfirmDialog.jsx"},{"name":"Sheet","sourcePath":"components/overlays/Sheet.jsx"},{"name":"SettingsModal","sourcePath":"components/overlays/SettingsModal.jsx"}],"sourceHashes":{"components/buttons/Button.jsx":"100340653f6c","components/buttons/IconButton.jsx":"64d07fafe43d","components/data-display/Avatar.jsx":"2a6cc808bf95","components/data-display/Badge.jsx":"4218700a9b3a","components/data-display/Chip.jsx":"85ebf5dee036","components/data-display/StatusBadge.jsx":"466b94a3f3fd","components/forms/Checkbox.jsx":"f73855c2ad98","components/forms/Input.jsx":"4408a8d3c45f","components/forms/SegmentedControl.jsx":"7fce25a0613c","components/forms/Switch.jsx":"af4d5d5a945c","components/surfaces/Card.jsx":"653ed2a50d0b","components/surfaces/EstimateCell.jsx":"fb31bdfcff27","components/surfaces/FinancialTotalCard.jsx":"9687c6daf630","ui_kits/dashboard/Dashboard.jsx":"2625ea44c59f","ui_kits/workshop/Workshop.jsx":"14aff0673c39","components/overlays/Modal.jsx":"ba167afa5e1a","components/overlays/ConfirmDialog.jsx":"390ec4eba214","components/overlays/Sheet.jsx":"34af7ad59b4a","components/overlays/SettingsModal.jsx":"4fff8dcae902"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.ArchestimatorDesignSystem_3fbb6f = window.ArchestimatorDesignSystem_3fbb6f || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/buttons/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Archestimator Button — the single button primitive for app/workshop UI.
 * SF Pro, 10px/medium, 3px radius, zero tracking. Strong-neutral primary;
 * never construction-orange outside the named estimate-sheet exception.
 */

let injected = false;
function useButtonCss() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const css = `
  .ae-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;white-space:nowrap;
    font-family:var(--font-sf-pro);font-size:10px;font-weight:500;line-height:1;letter-spacing:0;
    border-radius:var(--radius-xs,3px);border:1px solid transparent;cursor:pointer;
    transition:background .15s ease,color .15s ease,border-color .15s ease;outline:none;}
  .ae-btn:focus-visible{box-shadow:0 0 0 2px #fff,0 0 0 4px var(--focus);}
  .ae-btn:disabled{pointer-events:none;opacity:.5;}
  /* sizes */
  .ae-btn--xs{min-height:28px;min-width:96px;padding:4px 6px;}
  .ae-btn--sm{min-height:32px;min-width:96px;padding:6px 8px;}
  .ae-btn--md{min-height:36px;min-width:96px;padding:8px 10px;}
  .ae-btn--lg{min-height:40px;min-width:96px;padding:8px 12px;}
  /* variants */
  .ae-btn--primary{background:var(--primary);color:#fff;}
  .ae-btn--primary:hover{background:var(--accent-dark);}
  .ae-btn--secondary{background:var(--surface);color:var(--ink);border-color:var(--divider);}
  .ae-btn--secondary:hover{background:var(--surface-muted);}
  .ae-btn--soft{background:var(--accent-soft);color:var(--accent-dark);border-color:color-mix(in srgb,var(--accent) 20%,transparent);}
  .ae-btn--soft:hover{background:var(--surface-muted);}
  .ae-btn--outline{background:transparent;color:var(--ink);border-color:var(--hairline);}
  .ae-btn--outline:hover{background:var(--surface-muted);}
  .ae-btn--ghost{background:transparent;color:var(--muted);}
  .ae-btn--ghost:hover{background:var(--surface-muted);color:var(--ink);}
  .ae-btn--plain{background:transparent;color:var(--secondary);}
  .ae-btn--plain:hover{color:var(--ink);}
  .ae-btn--danger{background:#fff;color:var(--danger);border-color:var(--danger-soft);}
  .ae-btn--danger:hover{background:var(--danger-soft);}
  /* add-affordance — named estimate-sheet exception */
  .ae-btn--add{background:var(--add-affordance-bg);color:var(--add-affordance-fg);}
  .ae-btn--add:hover{background:var(--add-affordance-bg-hover);color:var(--add-affordance-fg-hover);}
  `;
  const el = document.createElement("style");
  el.setAttribute("data-ae", "button");
  el.textContent = css;
  document.head.appendChild(el);
}
function Button({
  variant = "secondary",
  size = "md",
  type = "button",
  className = "",
  children,
  ...props
}) {
  useButtonCss();
  const buttonProps = {
    ...props,
    className: `ae-btn ae-btn--${variant} ae-btn--${size} ${className}`
  };
  if (type === "submit") return /*#__PURE__*/React.createElement("button", { ...buttonProps, type: "submit" }, children);
  if (type === "reset") return /*#__PURE__*/React.createElement("button", { ...buttonProps, type: "reset" }, children);
  return /*#__PURE__*/React.createElement("button", { ...buttonProps, type: "button" }, children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/buttons/Button.jsx", error: String((e && e.message) || e) }); }

// components/buttons/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * IconButton — square icon-only control built on the same scale as Button.
 * Pass an icon (or single glyph) as children. Sizes are fixed squares so the
 * 1px-outline iconography sits flush; use `aria-label` for the action name.
 */

let injected = false;
function useIconBtnCss() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const css = `
  .ae-iconbtn{display:grid;place-items:center;padding:0;border:1px solid transparent;cursor:pointer;
    color:var(--secondary);background:transparent;border-radius:var(--radius-xs,3px);
    transition:background .15s ease,color .15s ease,border-color .15s ease;outline:none;}
  .ae-iconbtn:focus-visible{box-shadow:0 0 0 2px #fff,0 0 0 4px var(--focus);}
  .ae-iconbtn:disabled{pointer-events:none;opacity:.5;}
  .ae-iconbtn--xs{width:28px;height:28px;}
  .ae-iconbtn--sm{width:32px;height:32px;}
  .ae-iconbtn--md{width:36px;height:36px;}
  .ae-iconbtn--lg{width:40px;height:40px;}
  .ae-iconbtn--ghost:hover{background:var(--surface-muted);color:var(--ink);}
  .ae-iconbtn--secondary{background:var(--surface);border-color:var(--divider);color:var(--ink);}
  .ae-iconbtn--secondary:hover{background:var(--surface-muted);}
  .ae-iconbtn--add{background:var(--add-affordance-bg);color:var(--add-affordance-fg);}
  .ae-iconbtn--add:hover{background:var(--add-affordance-bg-hover);color:var(--add-affordance-fg-hover);}
  `;
  const el = document.createElement("style");
  el.setAttribute("data-ae", "icon-button");
  el.textContent = css;
  document.head.appendChild(el);
}
function IconButton({
  variant = "ghost",
  size = "md",
  type = "button",
  className = "",
  children,
  ...props
}) {
  useIconBtnCss();
  const buttonProps = {
    ...props,
    className: `ae-iconbtn ae-iconbtn--${variant} ae-iconbtn--${size} ${className}`
  };
  if (type === "submit") return /*#__PURE__*/React.createElement("button", { ...buttonProps, type: "submit" }, children);
  if (type === "reset") return /*#__PURE__*/React.createElement("button", { ...buttonProps, type: "reset" }, children);
  return /*#__PURE__*/React.createElement("button", { ...buttonProps, type: "button" }, children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/buttons/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/data-display/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
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
function Avatar({
  src,
  alt,
  initials,
  size = "md",
  className = "",
  ...props
}) {
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
  return /*#__PURE__*/React.createElement("div", _extends({
    className: `ae-avatar ae-avatar--${size} ${className}`
  }, props), safeSrc && !err ? /*#__PURE__*/React.createElement("span", {
    className: "ae-avatar__image",
    role: "img",
    "aria-label": alt || "Avatar",
    style: {
      backgroundImage: `url(${JSON.stringify(safeSrc)})`
    }
  }) : /*#__PURE__*/React.createElement("span", null, (initials || "?").slice(0, 2)));
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/data-display/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Badge — small uppercase status/label pill. Tones carry meaning only.
 * Keeps the product's 96px min-width so badges align in dense tables.
 */

let injected = false;
function useBadgeCss() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const el = document.createElement("style");
  el.setAttribute("data-ae", "badge");
  el.textContent = `
  .ae-badge{display:inline-flex;align-items:center;justify-content:center;min-width:96px;
    border:1px solid;border-radius:var(--radius-xs,3px);font-family:var(--font-sf-pro);
    font-weight:500;line-height:1;letter-spacing:0;text-transform:uppercase;font-variant-numeric:tabular-nums;}
  .ae-badge--xs{min-height:16px;padding:1px 4px;font-size:8px;}
  .ae-badge--sm{min-height:20px;padding:1px 6px;font-size:9px;}
  .ae-badge--neutral{border-color:var(--hairline);background:var(--surface-muted);color:var(--tertiary);}
  .ae-badge--accent{border-color:color-mix(in srgb,var(--accent) 20%,transparent);background:var(--accent-soft);color:var(--accent-dark);}
  .ae-badge--success{border-color:color-mix(in srgb,var(--success) 20%,transparent);background:color-mix(in srgb,var(--success) 10%,#fff);color:var(--success);}
  .ae-badge--warning{border-color:color-mix(in srgb,var(--warning) 25%,transparent);background:color-mix(in srgb,var(--warning) 10%,#fff);color:var(--warning);}
  .ae-badge--danger{border-color:var(--danger-soft);background:var(--danger-soft);color:var(--danger);}
  `;
  document.head.appendChild(el);
}
function Badge({
  tone = "neutral",
  size = "sm",
  className = "",
  children,
  ...props
}) {
  useBadgeCss();
  return /*#__PURE__*/React.createElement("span", _extends({
    className: `ae-badge ae-badge--${tone} ae-badge--${size} ${className}`
  }, props), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/Badge.jsx", error: String((e && e.message) || e) }); }

// components/data-display/Chip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
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
function Chip({
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
    className: `${cls} ${className}`
  };
  const labelContent = /*#__PURE__*/React.createElement("span", {
    style: {
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, children);
  const removeButton = removable && /*#__PURE__*/React.createElement("span", {
    role: "button",
    tabIndex: 0,
    "aria-label": removeLabel,
    className: "ae-chip__x",
    onClick: e => {
      e.stopPropagation();
      onRemove && onRemove();
    },
    onKeyDown: e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        onRemove && onRemove();
      }
    }
  }, "\xD7");
  if (type === "submit") return /*#__PURE__*/React.createElement("button", { ...buttonProps, type: "submit" }, labelContent, removeButton);
  if (type === "reset") return /*#__PURE__*/React.createElement("button", { ...buttonProps, type: "reset" }, labelContent, removeButton);
  return /*#__PURE__*/React.createElement("button", { ...buttonProps, type: "button" }, labelContent, removeButton);
}
Object.assign(__ds_scope, { Chip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/Chip.jsx", error: String((e && e.message) || e) }); }

// components/data-display/StatusBadge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * StatusBadge — semantic estimate/proposal state chip with optional leading dot.
 * approved → success, review → warning, danger → danger, draft/inactive → neutral.
 */

let injected = false;
function useStatusCss() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const el = document.createElement("style");
  el.setAttribute("data-ae", "status-badge");
  el.textContent = `
  .ae-status{display:inline-flex;align-items:center;justify-content:center;min-width:96px;padding:6px;
    border-radius:var(--radius-xs,3px);font-family:var(--font-sf-pro);font-size:8px;font-weight:500;
    line-height:1;letter-spacing:0;text-transform:uppercase;}
  .ae-status__dot{width:6px;height:6px;border-radius:50%;margin-right:6px;}
  .ae-status--approved,.ae-status--active{background:var(--success-soft);color:var(--success);}
  .ae-status--approved .ae-status__dot,.ae-status--active .ae-status__dot{background:var(--success);}
  .ae-status--review{background:var(--warning-soft);color:var(--warning);}
  .ae-status--review .ae-status__dot{background:var(--warning);}
  .ae-status--danger{background:var(--danger-soft);color:var(--danger);}
  .ae-status--danger .ae-status__dot{background:var(--danger);}
  .ae-status--draft{background:var(--surface-muted);color:var(--muted);}
  .ae-status--draft .ae-status__dot{background:var(--muted);}
  .ae-status--inactive{background:var(--surface-muted);color:var(--tertiary);}
  .ae-status--inactive .ae-status__dot{background:var(--tertiary);}
  `;
  document.head.appendChild(el);
}
function StatusBadge({
  status,
  showDot = false,
  className = "",
  children,
  ...props
}) {
  useStatusCss();
  return /*#__PURE__*/React.createElement("span", _extends({
    className: `ae-status ae-status--${status} ${className}`
  }, props), showDot && /*#__PURE__*/React.createElement("span", {
    className: "ae-status__dot",
    "aria-hidden": "true"
  }), children);
}
Object.assign(__ds_scope, { StatusBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/StatusBadge.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
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
function Checkbox({
  checked = false,
  onChange,
  label,
  disabled = false,
  className = "",
  ...props
}) {
  useCheckboxCss();
  return /*#__PURE__*/React.createElement("label", {
    className: `ae-check ${className}`,
    "data-disabled": disabled
  }, /*#__PURE__*/React.createElement("button", {
    ...props,
    type: "button",
    role: "checkbox",
    "aria-checked": checked,
    disabled: disabled,
    "data-on": checked,
    className: "ae-check__box",
    onClick: () => !disabled && onChange && onChange(!checked)
  }, checked && /*#__PURE__*/React.createElement("svg", {
    className: "ae-check__tick",
    viewBox: "0 0 12 12",
    fill: "none",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M2.5 6.2 5 8.6 9.5 3.4",
    stroke: "currentColor",
    strokeWidth: "1.6",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }))), label && /*#__PURE__*/React.createElement("span", {
    className: "ae-check__label"
  }, label));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
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
function Input({
  align = "left",
  invalid = false,
  className = "",
  ...props
}) {
  useInputCss();
  const a = align === "right" ? "ae-input--right" : align === "center" ? "ae-input--center" : "";
  return /*#__PURE__*/React.createElement("input", _extends({
    className: `ae-input ${a} ${invalid ? "ae-input--invalid" : ""} ${className}`,
    "aria-invalid": invalid || undefined
  }, props));
}
function Field({
  label,
  required,
  helperText,
  errorText,
  children,
  className = ""
}) {
  useInputCss();
  return /*#__PURE__*/React.createElement("label", {
    className: `ae-field ${className}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "ae-field__label"
  }, label, required && /*#__PURE__*/React.createElement("span", {
    className: "ae-field__req",
    "aria-hidden": "true"
  }, "*")), children, errorText ? /*#__PURE__*/React.createElement("span", {
    className: "ae-field__err"
  }, errorText) : helperText ? /*#__PURE__*/React.createElement("span", {
    className: "ae-field__help"
  }, helperText) : null);
}
Object.assign(__ds_scope, { Input, Field });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/SegmentedControl.jsx
try { (() => {
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
function SegmentedControl({
  ariaLabel,
  options,
  value,
  onValueChange,
  className = ""
}) {
  useSegCss();
  const refs = React.useRef([]);
  const selected = Math.max(0, options.findIndex(o => o.value === value));
  function move(next) {
    const i = (next + options.length) % options.length;
    onValueChange && onValueChange(options[i].value);
    refs.current[i] && refs.current[i].focus();
  }
  function onKey(e) {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      move(selected + 1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      move(selected - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      move(0);
    } else if (e.key === "End") {
      e.preventDefault();
      move(options.length - 1);
    }
  }
  return /*#__PURE__*/React.createElement("div", {
    role: "group",
    "aria-label": ariaLabel,
    onKeyDown: onKey,
    className: `ae-seg ${className}`,
    style: {
      gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))`
    }
  }, options.map((o, i) => {
    const on = o.value === value;
    return /*#__PURE__*/React.createElement("button", {
      key: o.value,
      ref: n => refs.current[i] = n,
      type: "button",
      className: "ae-seg__btn",
      "aria-pressed": on,
      tabIndex: on ? 0 : -1,
      onClick: () => onValueChange && onValueChange(o.value)
    }, o.label);
  }));
}
Object.assign(__ds_scope, { SegmentedControl });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/SegmentedControl.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
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
function Switch({
  checked = false,
  onChange,
  label,
  disabled = false,
  className = "",
  ...props
}) {
  useSwitchCss();
  return /*#__PURE__*/React.createElement("label", {
    className: `ae-switch ${className}`,
    "data-disabled": disabled
  }, /*#__PURE__*/React.createElement("button", {
    ...props,
    type: "button",
    role: "switch",
    "aria-checked": checked,
    disabled: disabled,
    "data-on": checked,
    className: "ae-switch__track",
    onClick: () => !disabled && onChange && onChange(!checked)
  }, /*#__PURE__*/React.createElement("span", {
    className: "ae-switch__knob"
  })), label && /*#__PURE__*/React.createElement("span", {
    className: "ae-switch__label"
  }, label));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
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
function Card({
  interactive = false,
  className = "",
  children,
  ...props
}) {
  useCardCss();
  return /*#__PURE__*/React.createElement("div", _extends({
    className: `ae-card ${interactive ? "ae-card--interactive" : ""} ${className}`
  }, props), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/Card.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/EstimateCell.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
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
function EstimateCell({
  value,
  selected,
  editing,
  numeric,
  align = "left",
  className = "",
  ...props
}) {
  useCellCss();
  return /*#__PURE__*/React.createElement("div", _extends({
    className: `ae-cell ae-cell--${align} ${selected ? "ae-cell--selected" : ""} ${editing ? "ae-cell--editing" : ""} ${numeric ? "ae-cell--numeric" : ""} ${className}`
  }, props), value);
}
Object.assign(__ds_scope, { EstimateCell });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/EstimateCell.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/FinancialTotalCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
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
function FinancialTotalCard({
  label,
  value,
  sublabel,
  variant = "default",
  className = "",
  ...props
}) {
  useTotalCss();
  return /*#__PURE__*/React.createElement("div", _extends({
    className: `ae-total ae-total--${variant} ${className}`
  }, props), /*#__PURE__*/React.createElement("div", {
    className: "ae-total__label"
  }, label), /*#__PURE__*/React.createElement("div", {
    className: "ae-total__value"
  }, value), sublabel && /*#__PURE__*/React.createElement("div", {
    className: "ae-total__sub"
  }, sublabel));
}
Object.assign(__ds_scope, { FinancialTotalCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/FinancialTotalCard.jsx", error: String((e && e.message) || e) }); }

// components/overlays/Modal.jsx
try { (() => {
/**
 * Modal — the app's centered dialog (live: AppModal over the Dialog primitive).
 * White paper on a dim scrim, 3px radius, hairline border, one soft shadow.
 * Header carries an 11px medium title + 10px tertiary description and the
 * signature soft-red close chip; body is 10px secondary; footer right-aligns
 * actions. `tone` tints the border + title for success/warning/danger flows.
 *
 * Presentational: it renders OPEN inline so the design tool can show the real
 * surface. Pass `inline` (default for cards) to scrim the nearest positioned
 * stage instead of the viewport; clear it for a true fixed overlay.
 */

let injected = false;
function useModalCss() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const el = document.createElement("style");
  el.setAttribute("data-ae", "modal");
  el.textContent = `
  .ae-modal-scrim{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;
    padding:16px;background:rgba(0,0,0,.25);}
  .ae-modal-scrim[data-inline="true"]{position:absolute;}
  .ae-modal-scrim[data-blur="true"]{backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);}
  .ae-modal{position:relative;z-index:1001;display:flex;flex-direction:column;min-height:0;width:100%;
    max-height:calc(100% - 32px);overflow:hidden;border:1px solid var(--hairline);border-radius:var(--radius-xs,3px);
    background:#fff;color:var(--ink);box-shadow:0 18px 48px rgba(17,24,39,.18),0 4px 12px rgba(17,24,39,.08);}
  .ae-modal--xs{max-width:320px;}
  .ae-modal--sm{max-width:384px;}
  .ae-modal--md{max-width:448px;}
  .ae-modal--lg{max-width:672px;}
  .ae-modal--xl{max-width:896px;}
  .ae-modal--success{border-color:var(--success-soft);}
  .ae-modal--warning{border-color:var(--warning-soft);}
  .ae-modal--danger,.ae-modal--destructive{border-color:var(--danger-soft);}
  .ae-modal__head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;min-height:40px;
    padding:8px 12px;border-bottom:1px solid var(--hairline);}
  .ae-modal__titles{min-width:0;}
  .ae-modal__title{margin:0;font-family:var(--font-sf-pro);font-size:11px;font-weight:500;line-height:16px;
    letter-spacing:0;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .ae-modal--success .ae-modal__title{color:var(--success);}
  .ae-modal--warning .ae-modal__title{color:var(--warning);}
  .ae-modal--danger .ae-modal__title,.ae-modal--destructive .ae-modal__title{color:var(--danger);}
  .ae-modal__desc{margin:2px 0 0;font-family:var(--font-sf-pro);font-size:10px;font-weight:500;line-height:16px;
    letter-spacing:0;color:var(--tertiary);}
  .ae-modal__x{display:grid;place-items:center;width:24px;height:24px;flex:none;padding:0;border:0;cursor:pointer;
    border-radius:var(--radius-xs,3px);color:#B84646;background:#FBE8E8;outline:none;
    transition:background .15s ease,color .15s ease;}
  .ae-modal__x:hover{color:#8B2E2E;background:#F2CCCC;}
  .ae-modal__x:focus-visible{box-shadow:0 0 0 2px #fff,0 0 0 4px var(--focus);}
  .ae-modal__body{min-height:0;flex:1;overflow:auto;padding:12px;font-family:var(--font-sf-pro);font-size:10px;
    line-height:16px;letter-spacing:0;color:var(--secondary);}
  .ae-modal__body--flush{padding:0;background:var(--surface-muted);}
  .ae-modal__foot{border-top:1px solid var(--hairline);padding:8px 12px;}
  .ae-modal__actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;min-width:0;}
  `;
  document.head.appendChild(el);
}

// Share the chrome injector so Sheet / SettingsModal paint the same head/body/foot.
if (typeof window !== "undefined") {
  const __ns = window.ArchestimatorDesignSystem_3fbb6f = window.ArchestimatorDesignSystem_3fbb6f || {};
  __ns.__ensureModalCss = useModalCss;
}
function ModalCloseChip({
  onClose,
  closeLabel
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "ae-modal__x",
    "aria-label": closeLabel,
    onClick: onClose
  }, /*#__PURE__*/React.createElement("svg", {
    width: "13",
    height: "13",
    viewBox: "0 0 256 256",
    fill: "none",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M200 56 56 200M200 200 56 56",
    stroke: "currentColor",
    strokeWidth: "18",
    strokeLinecap: "round"
  })));
}
function Modal({
  open = true,
  onClose,
  title,
  description,
  footer,
  size = "md",
  tone = "default",
  inline = false,
  blur = true,
  flushBody = false,
  closeLabel = "Close",
  bodyClassName = "",
  className = "",
  children
}) {
  useModalCss();
  if (!open) return null;
  const destructive = tone === "destructive" || tone === "danger";
  return /*#__PURE__*/React.createElement("div", {
    className: "ae-modal-scrim",
    "data-inline": inline,
    "data-blur": blur
  }, /*#__PURE__*/React.createElement("div", {
    role: destructive ? "alertdialog" : "dialog",
    "aria-modal": "true",
    className: `ae-modal ae-modal--${size} ae-modal--${tone} ${className}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "ae-modal__head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ae-modal__titles"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "ae-modal__title"
  }, title), description ? /*#__PURE__*/React.createElement("p", {
    className: "ae-modal__desc"
  }, description) : null), /*#__PURE__*/React.createElement(ModalCloseChip, {
    onClose: onClose,
    closeLabel: closeLabel
  })), /*#__PURE__*/React.createElement("div", {
    className: `ae-modal__body ${flushBody ? "ae-modal__body--flush" : ""} ${bodyClassName}`
  }, children), footer ? /*#__PURE__*/React.createElement("div", {
    className: "ae-modal__foot"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ae-modal__actions"
  }, footer)) : null));
}
Object.assign(__ds_scope, { Modal });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/overlays/Modal.jsx", error: String((e && e.message) || e) }); }

// components/overlays/ConfirmDialog.jsx
try { (() => {
/**
 * ConfirmDialog — the small decision modal (live: ConfirmDialog over AppModal).
 * A short `sm` modal with a ghost Cancel and a primary/danger Confirm. Use
 * `tone="destructive"` for delete/irreversible actions — it switches the
 * confirm to the danger button, sets the alertdialog role, and tints the head.
 * `busy` swaps the confirm label to "Working" and disables it; `error` shows a
 * soft-red banner above the message.
 */

let injected = false;
function useConfirmCss() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const el = document.createElement("style");
  el.setAttribute("data-ae", "confirm-dialog");
  el.textContent = `
  .ae-confirm__msg{font-family:var(--font-sf-pro);font-size:10px;line-height:16px;letter-spacing:0;color:var(--secondary);}
  .ae-confirm__err{margin-bottom:12px;border:1px solid var(--danger-soft);background:var(--danger-soft);
    padding:6px 8px;font-family:var(--font-sf-pro);font-size:9px;line-height:16px;color:var(--danger);}
  `;
  document.head.appendChild(el);
}
function ConfirmDialog({
  open = true,
  onConfirm,
  onCancel,
  onClose,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  busy = false,
  error,
  inline = false,
  children
}) {
  useConfirmCss();
  const NS = typeof window !== "undefined" && window.ArchestimatorDesignSystem_3fbb6f || {};
  const Modal = NS.Modal;
  const Button = NS.Button;
  if (!Modal) return null;
  const destructive = tone === "destructive" || tone === "danger";
  const close = onClose || onCancel;
  const footer = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    onClick: onCancel
  }, cancelLabel), /*#__PURE__*/React.createElement(Button, {
    variant: destructive ? "danger" : "primary",
    "aria-busy": busy ? "true" : undefined,
    disabled: busy,
    onClick: busy ? undefined : onConfirm
  }, busy ? "Working" : confirmLabel));
  return /*#__PURE__*/React.createElement(Modal, {
    open: open,
    onClose: close,
    title: title,
    description: description,
    tone: tone,
    size: "sm",
    inline: inline,
    footer: footer
  }, error ? /*#__PURE__*/React.createElement("div", {
    className: "ae-confirm__err"
  }, error) : null, children ? /*#__PURE__*/React.createElement("div", {
    className: "ae-confirm__msg"
  }, children) : null);
}
Object.assign(__ds_scope, { ConfirmDialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/overlays/ConfirmDialog.jsx", error: String((e && e.message) || e) }); }

// components/overlays/Sheet.jsx
try { (() => {
/**
 * Sheet — the edge-anchored panel / drawer (live: Sheet + Drawer + SidePanel
 * over the Dialog primitive). Same paper, hairline border, header / body /
 * footer chrome and soft-red close chip as Modal, but pinned full-height to the
 * right or left, or full-width along the bottom. Use it for inspectors, filters,
 * and contextual editing that should keep the page behind partially in view.
 */

let injected = false;
function useSheetCss() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const el = document.createElement("style");
  el.setAttribute("data-ae", "sheet");
  el.textContent = `
  .ae-sheet-scrim{position:fixed;inset:0;z-index:1000;display:flex;padding:12px;background:rgba(0,0,0,.2);}
  .ae-sheet-scrim[data-inline="true"]{position:absolute;}
  .ae-sheet-scrim[data-scrim="false"]{background:transparent;}
  .ae-sheet-scrim[data-blur="true"]{backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);}
  .ae-sheet-scrim[data-side="right"]{align-items:stretch;justify-content:flex-end;}
  .ae-sheet-scrim[data-side="left"]{align-items:stretch;justify-content:flex-start;}
  .ae-sheet-scrim[data-side="bottom"]{align-items:flex-end;justify-content:stretch;}
  .ae-sheet{max-height:calc(100% - 24px);box-shadow:0 18px 48px rgba(17,24,39,.14);}
  .ae-sheet[data-side="right"],.ae-sheet[data-side="left"]{height:100%;}
  .ae-sheet[data-side="bottom"]{width:100%;}
  .ae-sheet--narrow{width:320px;max-width:calc(100% - 24px);}
  .ae-sheet--md{width:420px;max-width:calc(100% - 24px);}
  .ae-sheet--wide{width:640px;max-width:calc(100% - 24px);}
  .ae-sheet--bottom-narrow{height:260px;max-height:calc(100% - 24px);}
  .ae-sheet--bottom-md{height:360px;max-height:calc(100% - 24px);}
  .ae-sheet--bottom-wide{height:520px;max-height:calc(100% - 24px);}
  `;
  document.head.appendChild(el);
}
function Sheet({
  open = true,
  onClose,
  title,
  description,
  footer,
  side = "right",
  size = "md",
  inline = false,
  blur = false,
  scrim = true,
  closeLabel = "Close panel",
  bodyClassName = "",
  children
}) {
  useSheetCss();
  const NS = typeof window !== "undefined" && window.ArchestimatorDesignSystem_3fbb6f || {};
  if (NS.__ensureModalCss) NS.__ensureModalCss();
  if (!open) return null;
  const isBottom = side === "bottom";
  const sizeClass = isBottom ? `ae-sheet--bottom-${size === "narrow" || size === "wide" ? size : "md"}` : `ae-sheet--${size === "md" ? "md" : size}`;
  return /*#__PURE__*/React.createElement("div", {
    className: "ae-sheet-scrim",
    "data-inline": inline,
    "data-blur": blur,
    "data-scrim": scrim,
    "data-side": side
  }, /*#__PURE__*/React.createElement("div", {
    role: "dialog",
    "aria-modal": "true",
    "data-side": side,
    className: `ae-modal ae-sheet ${sizeClass}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "ae-modal__head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ae-modal__titles"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "ae-modal__title"
  }, title), description ? /*#__PURE__*/React.createElement("p", {
    className: "ae-modal__desc"
  }, description) : null), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "ae-modal__x",
    "aria-label": closeLabel,
    onClick: onClose
  }, /*#__PURE__*/React.createElement("svg", {
    width: "13",
    height: "13",
    viewBox: "0 0 256 256",
    fill: "none",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M200 56 56 200M200 200 56 56",
    stroke: "currentColor",
    strokeWidth: "18",
    strokeLinecap: "round"
  })))), /*#__PURE__*/React.createElement("div", {
    className: `ae-modal__body ${bodyClassName}`
  }, children), footer ? /*#__PURE__*/React.createElement("div", {
    className: "ae-modal__foot"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ae-modal__actions"
  }, footer)) : null));
}
Object.assign(__ds_scope, { Sheet });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/overlays/Sheet.jsx", error: String((e && e.message) || e) }); }

// components/overlays/SettingsModal.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * SettingsModal — the workshop's account/settings surface (live:
 * WorkshopSettingsModal + WorkshopSettingsModalContent), shown as a composed
 * pattern rather than a single primitive. A wide (920px) Modal whose flush body
 * holds a two-pane layout: a muted left nav of setting groups and a scrolling
 * column of bordered sections, each a list of link rows (label + description +
 * open-affordance). The Account group ends with a danger Sign-out row.
 *
 * Built from the shared Modal shell + Button off the namespace, so it inherits
 * the exact dialog chrome (soft-red close chip, hairline header) and button
 * styling. `canManagePlatform` reveals the closed-beta operations group.
 */

let injected = false;
function useSettingsCss() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const el = document.createElement("style");
  el.setAttribute("data-ae", "settings-modal");
  el.textContent = `
  .ae-settings-modal.ae-modal{max-width:920px;}
  .ae-settings{display:grid;grid-template-columns:220px minmax(0,1fr);height:560px;overflow:hidden;}
  .ae-settings__nav{border-right:1px solid var(--hairline);background:var(--surface-muted);padding:8px;
    display:flex;flex-direction:column;gap:4px;}
  .ae-settings__navlink{display:flex;align-items:center;gap:8px;height:40px;padding:0 8px;border:1px solid transparent;
    border-radius:var(--radius-xs,3px);font-family:var(--font-sf-pro);font-size:11px;font-weight:500;line-height:16px;
    letter-spacing:0;color:var(--secondary);text-decoration:none;cursor:pointer;transition:background .15s ease,color .15s ease;}
  .ae-settings__navlink:hover{background:#fff;color:var(--ink);}
  .ae-settings__navlink[data-current="true"]{border-color:var(--divider-sibling);background:#fff;color:var(--ink);
    box-shadow:0 1px 2px rgba(0,0,0,.06);}
  .ae-settings__navicon{display:grid;place-items:center;width:24px;height:24px;flex:none;border:1px solid var(--divider-sibling);
    border-radius:var(--radius-xs,3px);background:#fff;color:var(--tertiary);}
  .ae-settings__navlabel{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .ae-settings__scroll{min-height:0;overflow-y:auto;padding:16px;}
  .ae-settings__inner{max-width:660px;margin:0 auto;display:flex;flex-direction:column;gap:12px;}
  .ae-settings__section{overflow:hidden;border:1px solid var(--hairline);border-radius:var(--radius-xs,3px);background:#fff;}
  .ae-settings__secHead{display:flex;align-items:flex-start;gap:8px;border-bottom:1px solid var(--hairline);padding:12px;}
  .ae-settings__secIcon{display:grid;place-items:center;width:28px;height:28px;flex:none;border:1px solid var(--divider-sibling);
    border-radius:var(--radius-xs,3px);background:var(--surface-muted);color:var(--tertiary);margin-top:2px;}
  .ae-settings__secTitle{margin:0;font-family:var(--font-sf-pro);font-size:12px;font-weight:500;line-height:16px;
    letter-spacing:0;color:var(--ink);}
  .ae-settings__secDesc{margin:2px 0 0;font-family:var(--font-sf-pro);font-size:10px;line-height:16px;letter-spacing:0;color:var(--tertiary);}
  .ae-settings__rows{list-style:none;margin:0;padding:0;}
  .ae-settings__row{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:66px;padding:8px 12px;
    border-top:1px solid var(--hairline);text-decoration:none;cursor:pointer;transition:background .15s ease;}
  .ae-settings__rows>li:first-child .ae-settings__row,.ae-settings__rows>li:first-child{border-top:0;}
  .ae-settings__rowlink:hover{background:var(--surface-muted);}
  .ae-settings__rowName{display:block;font-family:var(--font-sf-pro);font-size:11px;font-weight:500;line-height:16px;
    letter-spacing:0;color:var(--ink);}
  .ae-settings__rowDesc{display:block;margin-top:2px;font-family:var(--font-sf-pro);font-size:10px;line-height:16px;
    letter-spacing:0;color:var(--tertiary);}
  .ae-settings__rowArrow{display:grid;place-items:center;width:28px;height:28px;flex:none;border:1px solid var(--divider-sibling);
    border-radius:var(--radius-xs,3px);background:#fff;color:var(--tertiary);margin-top:2px;transition:color .15s ease;}
  .ae-settings__rowlink:hover .ae-settings__rowArrow{color:var(--ink);}
  .ae-settings__note{display:flex;align-items:center;gap:8px;border:1px solid var(--hairline);border-radius:var(--radius-xs,3px);
    background:var(--surface-muted);padding:8px 12px;font-family:var(--font-sf-pro);font-size:10px;line-height:16px;letter-spacing:0;color:var(--tertiary);}
  .ae-settings__note--paper{background:#fff;}
  `;
  document.head.appendChild(el);
}
const GLYPH_COMMON_PROPS = {
  width: 14,
  height: 14,
  viewBox: "0 0 256 256",
  fill: "none",
  "aria-hidden": "true"
};
const GLYPH_STROKE_PROPS = {
  stroke: "currentColor",
  strokeWidth: 14,
  strokeLinecap: "round",
  strokeLinejoin: "round"
};
function Glyph({
  name
}) {
  if (name === "account") return /*#__PURE__*/React.createElement("svg", GLYPH_COMMON_PROPS, /*#__PURE__*/React.createElement("circle", _extends({
    cx: "128",
    cy: "128",
    r: "88"
  }, GLYPH_STROKE_PROPS)), /*#__PURE__*/React.createElement("circle", _extends({
    cx: "128",
    cy: "108",
    r: "30"
  }, GLYPH_STROKE_PROPS)), /*#__PURE__*/React.createElement("path", _extends({
    d: "M70 198a72 72 0 0 1 116 0"
  }, GLYPH_STROKE_PROPS)));
  if (name === "support") return /*#__PURE__*/React.createElement("svg", GLYPH_COMMON_PROPS, /*#__PURE__*/React.createElement("circle", _extends({
    cx: "128",
    cy: "128",
    r: "88"
  }, GLYPH_STROKE_PROPS)), /*#__PURE__*/React.createElement("circle", _extends({
    cx: "128",
    cy: "128",
    r: "36"
  }, GLYPH_STROKE_PROPS)), /*#__PURE__*/React.createElement("path", _extends({
    d: "M70 70l33 33M186 70l-33 33M70 186l33-33M186 186l-33-33"
  }, GLYPH_STROKE_PROPS)));
  if (name === "beta") return /*#__PURE__*/React.createElement("svg", GLYPH_COMMON_PROPS, /*#__PURE__*/React.createElement("path", _extends({
    d: "M148 56a40 40 0 0 0 52 52l-92 92a28 28 0 0 1-40-40z"
  }, GLYPH_STROKE_PROPS)));
  if (name === "arrow") return /*#__PURE__*/React.createElement("svg", _extends({}, GLYPH_COMMON_PROPS, {
    width: "13",
    height: "13"
  }), /*#__PURE__*/React.createElement("path", _extends({
    d: "M96 84h76v76M168 88 84 172"
  }, GLYPH_STROKE_PROPS)));
  if (name === "briefcase") return /*#__PURE__*/React.createElement("svg", _extends({}, GLYPH_COMMON_PROPS, {
    width: "12",
    height: "12"
  }), /*#__PURE__*/React.createElement("rect", _extends({
    x: "40",
    y: "80",
    width: "176",
    height: "120",
    rx: "8"
  }, GLYPH_STROKE_PROPS)), /*#__PURE__*/React.createElement("path", _extends({
    d: "M96 80V64a16 16 0 0 1 16-16h32a16 16 0 0 1 16 16v16"
  }, GLYPH_STROKE_PROPS)));
  return null;
}
const ACCOUNT_ITEMS = [{
  label: "Profile settings",
  description: "Update profile-owned account details used across the workshop."
}, {
  label: "Workspace settings",
  description: "Update workspace-owned account fields for estimates and proposals."
}];
const SUPPORT_ITEMS = [{
  label: "Send beta feedback",
  description: "Report workflow blockers, export issues, and confusing estimating details during beta."
}, {
  label: "Terms and privacy",
  description: "Review beta terms, privacy status, estimate accuracy limits, and data deletion contact paths."
}, {
  label: "Terms acceptance",
  description: "Reopen the protected clickwrap screen to review the current accepted Terms version."
}];
const PLATFORM_ITEMS = [{
  label: "Beta users",
  description: "Add, activate, revoke, and annotate closed beta allowlist rows."
}, {
  label: "Beta feedback",
  description: "Review authenticated beta feedback and keep triage status current."
}];
function LinkRow({
  label,
  description
}) {
  return /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "ae-settings__row ae-settings__rowlink",
    "aria-label": `Open ${label}`
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "ae-settings__rowName"
  }, label), /*#__PURE__*/React.createElement("span", {
    className: "ae-settings__rowDesc"
  }, description)), /*#__PURE__*/React.createElement("span", {
    className: "ae-settings__rowArrow"
  }, /*#__PURE__*/React.createElement(Glyph, {
    name: "arrow"
  }))));
}
function Section({
  icon,
  title,
  description,
  children
}) {
  return /*#__PURE__*/React.createElement("section", {
    className: "ae-settings__section"
  }, /*#__PURE__*/React.createElement("header", {
    className: "ae-settings__secHead"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ae-settings__secIcon"
  }, /*#__PURE__*/React.createElement(Glyph, {
    name: icon
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("h3", {
    className: "ae-settings__secTitle"
  }, title), /*#__PURE__*/React.createElement("p", {
    className: "ae-settings__secDesc"
  }, description))), /*#__PURE__*/React.createElement("ul", {
    className: "ae-settings__rows"
  }, children));
}
function SettingsModal({
  open = true,
  onClose,
  inline = true,
  canManagePlatform = true
}) {
  useSettingsCss();
  const NS = typeof window !== "undefined" && window.ArchestimatorDesignSystem_3fbb6f || {};
  const Modal = NS.Modal;
  const Button = NS.Button;
  if (!Modal) return null;
  const nav = [{
    id: "account",
    label: "Account",
    icon: "account"
  }, {
    id: "support",
    label: "Support and legal",
    icon: "support"
  }];
  if (canManagePlatform) nav.push({
    id: "beta",
    label: "Beta operations",
    icon: "beta"
  });
  return /*#__PURE__*/React.createElement(Modal, {
    open: open,
    onClose: onClose,
    title: "Settings",
    description: "Manage account, workspace, and beta operations.",
    closeLabel: "Close settings",
    size: "xl",
    flushBody: true,
    className: "ae-settings-modal"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ae-settings"
  }, /*#__PURE__*/React.createElement("nav", {
    className: "ae-settings__nav",
    "aria-label": "Settings sections"
  }, nav.map((g, i) => /*#__PURE__*/React.createElement("a", {
    key: g.id,
    href: `#settings-${g.id}`,
    className: "ae-settings__navlink",
    "data-current": i === 0
  }, /*#__PURE__*/React.createElement("span", {
    className: "ae-settings__navicon"
  }, /*#__PURE__*/React.createElement(Glyph, {
    name: g.icon
  })), /*#__PURE__*/React.createElement("span", {
    className: "ae-settings__navlabel"
  }, g.label)))), /*#__PURE__*/React.createElement("div", {
    className: "ae-settings__scroll"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ae-settings__inner"
  }, /*#__PURE__*/React.createElement(Section, {
    icon: "account",
    title: "Account",
    description: "Profile and workspace account details."
  }, ACCOUNT_ITEMS.map(it => /*#__PURE__*/React.createElement(LinkRow, _extends({
    key: it.label
  }, it))), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("div", {
    className: "ae-settings__row"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "ae-settings__rowName"
  }, "Sign out"), /*#__PURE__*/React.createElement("span", {
    className: "ae-settings__rowDesc"
  }, "End this browser session and return to login.")), Button ? /*#__PURE__*/React.createElement(Button, {
    variant: "danger",
    size: "sm",
    style: {
      flex: "none",
      whiteSpace: "nowrap"
    }
  }, "Sign out") : null))), /*#__PURE__*/React.createElement(Section, {
    icon: "support",
    title: "Support and legal",
    description: "Feedback, terms, and data requests."
  }, SUPPORT_ITEMS.map(it => /*#__PURE__*/React.createElement(LinkRow, _extends({
    key: it.label
  }, it)))), /*#__PURE__*/React.createElement("p", {
    className: "ae-settings__note"
  }, "For account deletion or data export requests during beta, send feedback or email support@archestimator.com."), canManagePlatform ? /*#__PURE__*/React.createElement(Section, {
    icon: "beta",
    title: "Closed beta operations",
    description: "Closed beta access and triage."
  }, PLATFORM_ITEMS.map(it => /*#__PURE__*/React.createElement(LinkRow, _extends({
    key: it.label
  }, it)))) : null, /*#__PURE__*/React.createElement("div", {
    className: "ae-settings__note ae-settings__note--paper"
  }, /*#__PURE__*/React.createElement(Glyph, {
    name: "briefcase"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 0
    }
  }, "Settings changes apply across the current workshop account."))))));
}
Object.assign(__ds_scope, { SettingsModal });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/overlays/SettingsModal.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/Dashboard.jsx
try { (() => {
/* eslint-disable */
/**
 * Workshop dashboard — static recreation of the LIVE v2 editorial bento
 * (src/components/workshop/dashboard/WorkshopDashboard.tsx). Babel-standalone
 * JSX, no TypeScript, no imports. DS components are read off the global
 * namespace; React is global. Mirrors the live class names so this card reads
 * as the same system.
 *
 * Synced state: the greeting was lifted OUT of the bento into the workspace
 * HEADER (WorkshopHeaderGreeting — a compact sun/moon strip), and the recent
 * Projects/Sheets ledgers were re-skinned (filled header icon, a per-row
 * favorite star, name-over-meta rows, a right-aligned date). Brand orange is
 * clay #AA412A; favorite stars are NEUTRAL (tertiary/secondary), matching the
 * live code. Signal #F24405 never used.
 */

const {
  Button
} = window.ArchestimatorDesignSystem_3fbb6f || {};

// ── Realistic Philippine-peso AEC sample data ────────────────────────────────
const PROJECT_COUNT = 14;
const COMPONENT_COUNT = 312;
const TEMPLATE_COUNT = 18;
const PUBLISHED_PROJECTS = [{
  id: "p1",
  name: "San Juan Townhouse Renovation",
  meta: "Opened Jun 12"
}, {
  id: "p2",
  name: "Mandaluyong Mixed-Use Podium",
  meta: "47 opens"
}, {
  id: "p3",
  name: "Tagaytay Hillside Villa",
  meta: "Opened Jun 09"
}, {
  id: "p4",
  name: "BGC Office Fit-Out — Level 9",
  meta: "23 opens"
}, {
  id: "p5",
  name: "Cebu Seaside Clubhouse",
  meta: "Shared link"
}];
const RECENT_COMPONENTS = [{
  id: "c1",
  name: "CHB 150mm Load-Bearing Wall",
  meta: "Jun 18"
}, {
  id: "c2",
  name: "Reinforced Concrete Column (400×400)",
  meta: "Jun 17"
}, {
  id: "c3",
  name: "Gypsum Ceiling on Metal Furring",
  meta: "Jun 16"
}, {
  id: "c4",
  name: "Vitrified Floor Tile 600×600",
  meta: "Jun 14"
}, {
  id: "c5",
  name: "Powder-Coated Aluminium Window",
  meta: "Jun 13"
}];
const FAVORITE_PROJECTS = [{
  id: "f1",
  name: "San Juan Townhouse Renovation",
  code: "PRJ-014",
  sheets: [{
    id: "s1",
    name: "Structural Works",
    code: "ES-021"
  }, {
    id: "s2",
    name: "Architectural Finishes",
    code: "ES-022"
  }]
}, {
  id: "f2",
  name: "Tagaytay Hillside Villa",
  code: "PRJ-011",
  sheets: [{
    id: "s3",
    name: "Sitework & Excavation",
    code: "ES-017"
  }]
}, {
  id: "f3",
  name: "BGC Office Fit-Out — Level 9",
  code: "PRJ-009",
  sheets: []
}];
const RECENT_PROJECTS = [{
  id: "rp1",
  name: "San Juan Townhouse Renovation",
  meta: "Quezon City",
  date: "Jun 18",
  fav: true
}, {
  id: "rp2",
  name: "Mandaluyong Mixed-Use Podium",
  meta: "Mandaluyong",
  date: "Jun 17",
  fav: false
}, {
  id: "rp3",
  name: "Tagaytay Hillside Villa",
  meta: "Cavite",
  date: "Jun 15",
  fav: true
}, {
  id: "rp4",
  name: "BGC Office Fit-Out — Level 9",
  meta: "Taguig",
  date: "Jun 12",
  fav: false
}, {
  id: "rp5",
  name: "Cebu Seaside Clubhouse",
  meta: "Cebu",
  date: "Jun 08",
  fav: false
}];
const RECENT_SHEETS = [{
  id: "rs1",
  name: "Structural Works",
  project: "San Juan Townhouse",
  date: "Jun 18",
  fav: true
}, {
  id: "rs2",
  name: "Architectural Finishes",
  project: "San Juan Townhouse",
  date: "Jun 17",
  fav: false
}, {
  id: "rs3",
  name: "Sitework & Excavation",
  project: "Tagaytay Villa",
  date: "Jun 15",
  fav: true
}, {
  id: "rs4",
  name: "MEPF Rough-In",
  project: "Mandaluyong Podium",
  date: "Jun 11",
  fav: false
}, {
  id: "rs5",
  name: "Concrete & Formworks",
  project: "Cebu Clubhouse",
  date: "Jun 06",
  fav: false
}];
const CONTINUE = {
  name: "Structural Works",
  project: "San Juan Townhouse Renovation",
  code: "ES-021",
  edited: "Jun 18"
};

// ── Small presentational pieces ──────────────────────────────────────────────

function Icon({
  name,
  weight,
  className,
  style
}) {
  const base = weight === "fill" ? "ph-fill" : "ph";
  return /*#__PURE__*/React.createElement("i", {
    className: `${base} ph-${name}${className ? " " + className : ""}`,
    style: style,
    "aria-hidden": "true"
  });
}
function PublishedList({
  items
}) {
  if (items.length === 0) {
    return /*#__PURE__*/React.createElement("p", {
      className: "dashboard-published-empty"
    }, "No shared links yet");
  }
  return /*#__PURE__*/React.createElement("ul", {
    className: "dashboard-published-list",
    "aria-label": "Recent published project shared links"
  }, items.map(item => /*#__PURE__*/React.createElement("li", {
    key: item.id,
    className: "dashboard-published-list-item"
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "dashboard-published-link"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    },
    title: item.name
  }, item.name), /*#__PURE__*/React.createElement("span", {
    className: "text-secondary",
    style: {
      flexShrink: 0,
      fontFamily: "var(--font-numeric)",
      fontSize: 9
    }
  }, item.meta)))));
}

// ── Content destination tile (Projects + Components) ─────────────────────────

function ContentTile({
  kind,
  index,
  title,
  countLabel,
  countValue,
  ledgerTitle,
  ledgerItems
}) {
  const ibandClass = kind === "projects" ? "iband-projects" : "iband-components";
  const toneClass = kind === "projects" ? "dashboard-destination-card--projects" : "dashboard-destination-card--components";
  return /*#__PURE__*/React.createElement("div", {
    "aria-label": title,
    className: `dashboard-destination-card dashboard-destination-grid dashboard-card-hover ${toneClass} group ${ibandClass}`,
    style: {
      position: "relative",
      height: "100%",
      minHeight: 118,
      width: "100%"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "destcard-toprow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dashboard-destination-card-index destcard-index"
  }, index), /*#__PURE__*/React.createElement("a", {
    href: "#",
    "aria-label": `Open ${title}`,
    className: "dashboard-project-card-arrow"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-up-right",
    className: "dashboard-destination-card-icon destcard-arrow-ico"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "dashboard-project-card-panel destcard-panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "dashboard-project-count-panel"
  }, /*#__PURE__*/React.createElement("span", {
    className: "destcard-countlabel text-secondary"
  }, countLabel), /*#__PURE__*/React.createElement("span", {
    className: "dashboard-bignum-value"
  }, countValue)), /*#__PURE__*/React.createElement("div", {
    className: "dashboard-published-panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "dashboard-published-header"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-ink",
    style: {
      fontSize: 12,
      fontWeight: 500
    }
  }, ledgerTitle)), /*#__PURE__*/React.createElement(PublishedList, {
    items: ledgerItems
  }))), /*#__PURE__*/React.createElement("div", {
    className: "destcard-titlerow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dashboard-destination-card-title destcard-title"
  }, title)));
}

// ── Simple destination tile (Templates) ──────────────────────────────────────

function SimpleTile({
  iband,
  index,
  title
}) {
  return /*#__PURE__*/React.createElement("div", {
    "aria-label": title,
    className: `dashboard-destination-card dashboard-card-hover destcard-simple group ${iband}`,
    style: {
      height: "100%",
      minHeight: 118,
      width: "100%"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "d-index"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dashboard-destination-card-index destcard-index"
  }, index)), /*#__PURE__*/React.createElement("a", {
    href: "#",
    "aria-label": `Open ${title}`,
    className: "dashboard-project-card-arrow d-arrow"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-up-right",
    className: "dashboard-destination-card-icon destcard-arrow-ico"
  })), /*#__PURE__*/React.createElement("span", {
    className: "d-title"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dashboard-destination-card-title destcard-title"
  }, title)));
}

// ── Library hub (Continue cell + new-project / new-component / new-sheet) ─────

function LibraryHub() {
  return /*#__PURE__*/React.createElement("div", {
    className: "dashboard-destination-card--library iband-library",
    "aria-label": "Library"
  }, /*#__PURE__*/React.createElement("span", {
    className: "iband-library-continue-slot"
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "dashboard-destination-card dashboard-card-hover continue-link",
    "aria-label": `Continue editing ${CONTINUE.name}`
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 2,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "dashboard-continue-hover-target continue-eyebrow"
  }, "Continue where you left off"), /*#__PURE__*/React.createElement("span", {
    className: "dashboard-continue-hover-target dashboard-continue-title continue-title"
  }, CONTINUE.name), /*#__PURE__*/React.createElement("span", {
    className: "dashboard-continue-hover-target continue-meta"
  }, CONTINUE.project, " \xB7 ", CONTINUE.code)), /*#__PURE__*/React.createElement("span", {
    className: "continue-foot"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dashboard-continue-hover-target continue-eyebrow"
  }, "Edited ", CONTINUE.edited), /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-right",
    className: "dashboard-continue-hover-target",
    style: {
      fontSize: 18,
      color: "var(--ink)"
    }
  })))), /*#__PURE__*/React.createElement("span", {
    className: "iband-library-stack"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "dashboard-destination-card dashboard-card-hover iband-library-new-project",
    "aria-label": "New project"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "folder-plus",
    style: {
      fontSize: 16
    }
  })), /*#__PURE__*/React.createElement("span", {
    className: "iband-library-action-grid"
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "dashboard-destination-card dashboard-card-hover iband-library-new-component",
    "aria-label": "New component"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "package",
    style: {
      fontSize: 16
    }
  })), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "dashboard-destination-card dashboard-card-hover iband-library-new-sheet",
    "aria-label": "New estimate sheet"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "file-plus",
    style: {
      fontSize: 16
    }
  })))));
}

// ── Favorites tree ───────────────────────────────────────────────────────────

function FavoritesTree() {
  const initial = {};
  FAVORITE_PROJECTS.forEach(p => {
    if (p.sheets.length > 0) initial[p.id] = true;
  });
  const [open, setOpen] = React.useState(initial);
  const toggle = id => setOpen(prev => ({
    ...prev,
    [id]: !prev[id]
  }));
  return /*#__PURE__*/React.createElement("section", {
    className: "ledger desk-board-favs-inner",
    "aria-label": "Favourites"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ledger-head"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "star",
    weight: "fill",
    className: "ledger-head-ico"
  }), /*#__PURE__*/React.createElement("h2", null, "Favourites")), /*#__PURE__*/React.createElement("div", {
    className: "ledger-body",
    role: "tree",
    "aria-label": "Favorite projects"
  }, FAVORITE_PROJECTS.map(project => {
    const hasSheets = project.sheets.length > 0;
    const isOpen = !!open[project.id];
    return /*#__PURE__*/React.createElement("div", {
      key: project.id,
      role: "treeitem",
      "aria-expanded": hasSheets ? isOpen : undefined,
      "aria-label": project.name
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "0 8px"
      }
    }, hasSheets ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "tree-toggle",
      "aria-hidden": "true",
      onClick: () => toggle(project.id)
    }, /*#__PURE__*/React.createElement(Icon, {
      name: isOpen ? "caret-down" : "caret-right"
    })) : /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      style: {
        width: 16,
        flexShrink: 0
      }
    }), /*#__PURE__*/React.createElement("a", {
      href: "#",
      className: "tree-row"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "folder",
      className: "tree-ico",
      style: {
        fontSize: 13
      }
    }), /*#__PURE__*/React.createElement("span", {
      className: "tree-name",
      title: project.name
    }, project.name), /*#__PURE__*/React.createElement("span", {
      className: "tree-code"
    }, project.code))), hasSheets && isOpen ? /*#__PURE__*/React.createElement("div", {
      role: "group",
      className: "tree-children"
    }, project.sheets.map(sheet => /*#__PURE__*/React.createElement("a", {
      key: sheet.id,
      href: "#",
      className: "tree-row"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "file-text",
      className: "tree-ico",
      style: {
        fontSize: 11
      }
    }), /*#__PURE__*/React.createElement("span", {
      className: "tree-sub",
      title: sheet.name
    }, sheet.name), /*#__PURE__*/React.createElement("span", {
      className: "tree-code"
    }, sheet.code)))) : null);
  })));
}

// ── Recent projects / sheets ledgers ─────────────────────────────────────────

function RecentRow({
  typeIcon,
  name,
  sub,
  date,
  fav
}) {
  return /*#__PURE__*/React.createElement("li", {
    className: "rec-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "rec-iconcol"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: typeIcon,
    className: "rec-typeico"
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: `rec-star${fav ? " is-fav" : ""}`,
    "aria-label": fav ? "Unfavourite" : "Favourite"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "star",
    weight: fav ? "fill" : "regular"
  }))), /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "rec-main"
  }, /*#__PURE__*/React.createElement("span", {
    className: "rec-name",
    title: name
  }, name), /*#__PURE__*/React.createElement("span", {
    className: "rec-sub",
    title: sub
  }, sub)), /*#__PURE__*/React.createElement("time", {
    className: "rec-date"
  }, date));
}
function RecentProjects() {
  return /*#__PURE__*/React.createElement("section", {
    className: "ledger",
    "aria-label": "Recent projects"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ledger-head"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "folder",
    weight: "fill",
    className: "ledger-head-ico"
  }), /*#__PURE__*/React.createElement("h2", null, "Projects")), /*#__PURE__*/React.createElement("div", {
    className: "ledger-body"
  }, /*#__PURE__*/React.createElement("ul", null, RECENT_PROJECTS.map(p => /*#__PURE__*/React.createElement(RecentRow, {
    key: p.id,
    typeIcon: "folder",
    name: p.name,
    sub: p.meta,
    date: p.date,
    fav: p.fav
  })))));
}
function RecentSheets() {
  return /*#__PURE__*/React.createElement("section", {
    className: "ledger",
    "aria-label": "Recent estimate sheets"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ledger-head"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "file-text",
    weight: "fill",
    className: "ledger-head-ico"
  }), /*#__PURE__*/React.createElement("h2", null, "Sheets")), /*#__PURE__*/React.createElement("div", {
    className: "ledger-body"
  }, /*#__PURE__*/React.createElement("ul", null, RECENT_SHEETS.map(s => /*#__PURE__*/React.createElement(RecentRow, {
    key: s.id,
    typeIcon: "file-text",
    name: s.name,
    sub: s.project,
    date: s.date,
    fav: s.fav
  })))));
}

// ── App shell (glass rail + floating white surface) ──────────────────────────

function Rail() {
  const items = [{
    ico: "squares-four",
    active: true
  }, {
    ico: "folders",
    active: false
  }, {
    ico: "books",
    active: false
  }, {
    ico: "chart-bar",
    active: false
  }];
  return /*#__PURE__*/React.createElement("nav", {
    className: "app-rail",
    "aria-label": "Primary"
  }, /*#__PURE__*/React.createElement("img", {
    className: "app-rail-logo",
    src: "../../assets/archestimator_logo_white.svg",
    alt: "Archestimator"
  }), items.map((item, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    className: `app-rail-ico${item.active ? " is-active" : ""}`
  }, /*#__PURE__*/React.createElement(Icon, {
    name: item.ico
  }))), /*#__PURE__*/React.createElement("span", {
    className: "app-rail-spacer"
  }), /*#__PURE__*/React.createElement("span", {
    className: "app-rail-ico"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "gear"
  })), /*#__PURE__*/React.createElement("span", {
    className: "app-rail-ico"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "user-circle"
  })));
}

// ── Workspace header greeting (mirrors WorkshopHeaderGreeting) ────────────────

function HeaderGreeting() {
  return /*#__PURE__*/React.createElement("div", {
    className: "app-greeting",
    "aria-label": "Good morning, Philip"
  }, /*#__PURE__*/React.createElement("span", {
    className: "app-greeting-ico"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "sun-horizon"
  })), /*#__PURE__*/React.createElement("h1", {
    className: "app-greeting-col"
  }, /*#__PURE__*/React.createElement("span", {
    className: "app-greeting-eyebrow"
  }, "Good morning"), /*#__PURE__*/React.createElement("span", {
    className: "app-greeting-name"
  }, "Philip")));
}
function Dashboard() {
  return /*#__PURE__*/React.createElement("div", {
    className: "app-frame"
  }, /*#__PURE__*/React.createElement(Rail, null), /*#__PURE__*/React.createElement("main", {
    className: "app-surface"
  }, /*#__PURE__*/React.createElement("div", {
    className: "app-titlebar"
  }, /*#__PURE__*/React.createElement(HeaderGreeting, null), /*#__PURE__*/React.createElement("span", {
    className: "app-titlebar-spacer"
  }), /*#__PURE__*/React.createElement("span", {
    className: "app-titlebar-actions"
  }, /*#__PURE__*/React.createElement("span", {
    className: "app-titlebar-ico"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "bell"
  })), /*#__PURE__*/React.createElement("span", {
    className: "app-titlebar-ico"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "gear-six"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "dashboard-canvas-wash dashboard-scroll",
    "aria-label": "Workshop dashboard"
  }, /*#__PURE__*/React.createElement("div", {
    className: "dashboard-root",
    style: {
      padding: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "dashboard-imageband"
  }, /*#__PURE__*/React.createElement(ContentTile, {
    kind: "projects",
    index: "01",
    title: "Projects",
    countLabel: "Project Count",
    countValue: PROJECT_COUNT,
    ledgerTitle: "Published Projects",
    ledgerItems: PUBLISHED_PROJECTS
  }), /*#__PURE__*/React.createElement(ContentTile, {
    kind: "components",
    index: "02",
    title: "Components",
    countLabel: "Component Count",
    countValue: COMPONENT_COUNT,
    ledgerTitle: "Recently Added Components",
    ledgerItems: RECENT_COMPONENTS
  }), /*#__PURE__*/React.createElement(SimpleTile, {
    iband: "iband-templates",
    index: "03",
    title: "Templates"
  }), /*#__PURE__*/React.createElement(LibraryHub, null)), /*#__PURE__*/React.createElement("div", {
    className: "dashboard-desk"
  }, /*#__PURE__*/React.createElement("div", {
    className: "desk-board"
  }, /*#__PURE__*/React.createElement("div", {
    className: "desk-board-favs"
  }, /*#__PURE__*/React.createElement(FavoritesTree, null)), /*#__PURE__*/React.createElement("div", {
    className: "desk-board-recents"
  }, /*#__PURE__*/React.createElement("div", {
    className: "desk-recproj"
  }, /*#__PURE__*/React.createElement(RecentProjects, null)), /*#__PURE__*/React.createElement("div", {
    className: "desk-recsheet"
  }, /*#__PURE__*/React.createElement(RecentSheets, null)))), /*#__PURE__*/React.createElement("div", {
    className: "desk-continue",
    style: {
      position: "relative",
      minHeight: 0,
      overflow: "visible",
      borderRadius: "var(--radius-xs)"
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "dashboard-destination-card dashboard-card-hover destcard-simple",
    "aria-label": "Library",
    style: {
      display: "block",
      height: "100%",
      minHeight: 118,
      width: "100%"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "d-index"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dashboard-destination-card-index destcard-index"
  }, "04")), /*#__PURE__*/React.createElement("span", {
    className: "d-arrow"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-up-right",
    className: "dashboard-destination-card-icon destcard-arrow-ico"
  })), /*#__PURE__*/React.createElement("span", {
    className: "d-title"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dashboard-destination-card-title destcard-title"
  }, "Library"))))))), /*#__PURE__*/React.createElement("div", {
    className: "app-footer"
  }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement(Icon, {
    name: "sparkle"
  }), " Ask Archestimator"), /*#__PURE__*/React.createElement("span", {
    className: "app-footer-spacer"
  }), /*#__PURE__*/React.createElement("span", null, "\u20B1 3,964,714.00 tracked \xB7 ES-021"))));
}
ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(Dashboard, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/Dashboard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workshop/Workshop.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Workshop estimate workspace — faithful recreation of the live Archestimator
   estimate shell (src/components/workshop/WorkshopPageShell.tsx):

     floating glass nav rail  ·  ONE liquid-glass workspace surface

   The workspace surface is a single frosted panel (one backdrop-filter) that
   holds the project tree · centre estimate sheet · right library dock · bottom
   budget bar as TRANSPARENT chrome zones, divided only by hairlines. Chrome
   controls use the .liquid-btn (workshop-liquid-button) recipe — translucent
   fill, bright edge, soft shadow, no child blur. The estimate sheet itself stays
   document-like (white paper rows on hairlines). Mounted by index.html. */
const {
  SegmentedControl
} = window.ArchestimatorDesignSystem_3fbb6f;
const peso = n => "₱ " + n.toLocaleString("en-PH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});
const NAV = [{
  icon: "ph-squares-four",
  key: "dash"
}, {
  icon: "ph-folders",
  key: "projects"
}, {
  icon: "ph-stack",
  key: "library"
}, {
  icon: "ph-file-text",
  key: "proposals"
}, {
  icon: "ph-users-three",
  key: "clients"
}, {
  icon: "ph-cards",
  key: "templates"
}, {
  icon: "ph-gear",
  key: "settings"
}];
const TREE = [{
  label: "General Requirements",
  icon: "ph-folder",
  depth: 1,
  kind: "group"
}, {
  label: "Construction Supervision",
  icon: "ph-circle",
  depth: 2
}, {
  label: "Mobilization + Demobilization",
  icon: "ph-circle",
  depth: 2
}, {
  label: "Temporary Facilities",
  icon: "ph-circle",
  depth: 2
}, {
  label: "Permits, Bonds + Insurances",
  icon: "ph-circle",
  depth: 2
}, {
  label: "Lot",
  icon: "ph-folder",
  depth: 1,
  kind: "group",
  open: true
}, {
  label: "House",
  icon: "ph-folder",
  depth: 2,
  open: true
}, {
  label: "Ground Floor",
  icon: "ph-folder",
  depth: 3,
  open: true,
  active: true
}, {
  label: "Living Room",
  icon: "ph-circle",
  depth: 4,
  occupied: true
}, {
  label: "Dining Area",
  icon: "ph-circle",
  depth: 4,
  occupied: true
}, {
  label: "Show Kitchen",
  icon: "ph-circle",
  depth: 4
}, {
  label: "Powder Room",
  icon: "ph-circle",
  depth: 4
}, {
  label: "Bedroom 1 / Guest Room",
  icon: "ph-circle",
  depth: 4
}, {
  label: "Second Floor",
  icon: "ph-folder",
  depth: 3
}, {
  label: "Master Bedroom",
  icon: "ph-circle",
  depth: 4
}, {
  label: "Master Walk-in Closet",
  icon: "ph-circle",
  depth: 4
}];
const LIB = [{
  label: "All Components",
  icon: "ph-stack",
  depth: 1,
  open: true
}, {
  label: "Administration",
  icon: "ph-folder",
  depth: 2,
  open: true
}, {
  label: "Project Requirements",
  icon: "ph-folder",
  depth: 3,
  open: true
}, {
  label: "General Requirements",
  icon: "ph-folder",
  depth: 4,
  open: true
}, {
  label: "General Requirements Allowance",
  icon: "ph-cube",
  depth: 5,
  price: "₱185,000.00",
  unit: "/month"
}, {
  label: "Permits",
  icon: "ph-circle",
  depth: 4
}, {
  label: "Fees",
  icon: "ph-circle",
  depth: 4
}, {
  label: "Submittals",
  icon: "ph-circle",
  depth: 4
}, {
  label: "Mockups",
  icon: "ph-circle",
  depth: 4
}, {
  label: "Temporary Works",
  icon: "ph-folder",
  depth: 3
}, {
  label: "Site Protection",
  icon: "ph-circle",
  depth: 4
}, {
  label: "Temporary Enclosures",
  icon: "ph-circle",
  depth: 4
}, {
  label: "Scaffolding",
  icon: "ph-circle",
  depth: 4
}, {
  label: "Existing Conditions",
  icon: "ph-folder",
  depth: 3
}, {
  label: "Site Surveys",
  icon: "ph-circle",
  depth: 4
}, {
  label: "Measured Drawings",
  icon: "ph-circle",
  depth: 4
}];
const ROWS = [{
  n: "01",
  mat: "Loose lighting allowance",
  thumb: "#cdb8a6",
  qty: 2,
  sub: 4900,
  misc: 500,
  total: 5400
}, {
  n: "02",
  mat: "Coffee table allowance",
  thumb: "#b7a690",
  qty: 1,
  sub: 6350,
  misc: 800,
  total: 7150,
  sel: true
}, {
  n: "03",
  mat: "Value living room sofa set",
  thumb: "#9aa0a6",
  qty: 1,
  sub: 28950,
  misc: 1500,
  total: 30450
}, {
  n: "04",
  mat: "TV console allowance",
  thumb: "#c2b09c",
  qty: 1,
  sub: 7200,
  misc: 1000,
  total: 8200
}];
function LiquidButton({
  className = "",
  children,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    className: "liquid-btn " + className
  }, rest), children);
}
function TreeRow({
  node
}) {
  const occupied = node.occupied;
  return /*#__PURE__*/React.createElement("div", {
    className: "tree-row" + (node.active ? " is-active" : ""),
    style: {
      paddingLeft: 8 + node.depth * 14
    }
  }, node.kind === "group" || node.icon === "ph-folder" ? /*#__PURE__*/React.createElement("i", {
    className: "ph " + (node.open ? "ph-caret-down" : "ph-caret-right"),
    style: {
      fontSize: 9,
      color: "var(--tertiary)",
      width: 10
    }
  }) : /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      display: "inline-block"
    }
  }), /*#__PURE__*/React.createElement("i", {
    className: "ph " + node.icon,
    style: {
      fontSize: 13,
      color: occupied ? "var(--occupied-glyph)" : "var(--tertiary)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "tree-label"
  }, node.label));
}
function GroupBar({
  code,
  name,
  total
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "group-bar"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph ph-caret-down",
    style: {
      fontSize: 10,
      color: "var(--tertiary)"
    }
  }), /*#__PURE__*/React.createElement("i", {
    className: "ph ph-folder",
    style: {
      fontSize: 13,
      color: "var(--tertiary)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "group-meta"
  }, /*#__PURE__*/React.createElement("span", {
    className: "group-code"
  }, code), /*#__PURE__*/React.createElement("span", {
    className: "group-name"
  }, name)), /*#__PURE__*/React.createElement("span", {
    className: "group-total"
  }, peso(total)));
}
const SHEET_COLUMNS = ["#", "", "Materials", "Qty", "Subtotal", "Adjustment", "Misc Cost", "Total Item Cost"];
function SheetTable() {
  return /*#__PURE__*/React.createElement("div", {
    className: "area-block"
  }, /*#__PURE__*/React.createElement("div", {
    className: "area-head"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph ph-caret-down",
    style: {
      fontSize: 10,
      color: "var(--tertiary)"
    }
  }), /*#__PURE__*/React.createElement("i", {
    className: "ph ph-cube",
    style: {
      fontSize: 13,
      color: "var(--occupied-glyph)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "group-meta"
  }, /*#__PURE__*/React.createElement("span", {
    className: "group-code"
  }, "02.01.01.02"), /*#__PURE__*/React.createElement("span", {
    className: "group-name"
  }, "Living Room")), /*#__PURE__*/React.createElement("span", {
    className: "group-total"
  }, peso(51200))), /*#__PURE__*/React.createElement("div", {
    className: "breadcrumb-mini"
  }, "Lot \xB7 House \xB7 Ground Floor \xB7 Living Room"), /*#__PURE__*/React.createElement("table", {
    className: "sheet"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, SHEET_COLUMNS.map((c, i) => /*#__PURE__*/React.createElement("th", {
    key: i,
    className: i >= 3 ? "num" : ""
  }, c)))), /*#__PURE__*/React.createElement("tbody", null, ROWS.map(r => /*#__PURE__*/React.createElement("tr", {
    key: r.n,
    className: r.sel ? "sel" : ""
  }, /*#__PURE__*/React.createElement("td", {
    className: "rn"
  }, r.n), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
    className: "cb",
    "data-on": r.sel
  })), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("div", {
    className: "mat"
  }, /*#__PURE__*/React.createElement("span", {
    className: "thumb",
    style: {
      background: r.thumb
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "mat-text"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mat-name"
  }, r.mat), /*#__PURE__*/React.createElement("span", {
    className: "mat-sub"
  }, peso(r.sub), " / pc")))), /*#__PURE__*/React.createElement("td", {
    className: "num"
  }, r.qty), /*#__PURE__*/React.createElement("td", {
    className: "num"
  }, peso(r.sub)), /*#__PURE__*/React.createElement("td", {
    className: "num adj"
  }, /*#__PURE__*/React.createElement("span", {
    className: "adj-tag"
  }, "Contingency 0%")), /*#__PURE__*/React.createElement("td", {
    className: "num"
  }, peso(r.misc)), /*#__PURE__*/React.createElement("td", {
    className: "num strong"
  }, peso(r.total)))))), /*#__PURE__*/React.createElement("div", {
    className: "drop-zone"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph ph-plus"
  }), " Drag and drop estimate component here"));
}
function Workshop() {
  const [view, setView] = React.useState("default");
  const [tab, setTab] = React.useState("components");
  return /*#__PURE__*/React.createElement("div", {
    className: "ws"
  }, /*#__PURE__*/React.createElement("nav", {
    className: "rail ae-glass"
  }, /*#__PURE__*/React.createElement("div", {
    className: "logo"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "22",
    viewBox: "0 0 22 22",
    "aria-hidden": "true",
    focusable: "false"
  }, /*#__PURE__*/React.createElement("image", {
    href: "../../assets/archestimator_logo_white.svg",
    width: "22",
    height: "22"
  }))), NAV.map(n => /*#__PURE__*/React.createElement("button", {
    key: n.key,
    className: "navitem" + (n.key === "projects" ? " is-active" : ""),
    "aria-label": n.key
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph " + n.icon
  })))), /*#__PURE__*/React.createElement("div", {
    className: "workspace"
  }, /*#__PURE__*/React.createElement("aside", {
    className: "tree-panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "search"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph ph-magnifying-glass"
  }), /*#__PURE__*/React.createElement("span", null, "Search Tree")), /*#__PURE__*/React.createElement("div", {
    className: "panel-toolbar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tool-left"
  }, /*#__PURE__*/React.createElement(LiquidButton, {
    className: "icon",
    "aria-label": "Filter"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph ph-funnel"
  })), /*#__PURE__*/React.createElement(LiquidButton, {
    className: "icon",
    "aria-label": "List"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph ph-list"
  })), /*#__PURE__*/React.createElement(LiquidButton, {
    className: "icon",
    "aria-label": "Collapse"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph ph-arrows-in-line-vertical"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "tool-right"
  }, /*#__PURE__*/React.createElement(LiquidButton, {
    className: "icon add",
    "aria-label": "Add area"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph ph-plus"
  })), /*#__PURE__*/React.createElement(LiquidButton, {
    className: "icon add",
    "aria-label": "Add group"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph ph-folder-plus"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "panel-tab"
  }, "Sheets"), /*#__PURE__*/React.createElement("div", {
    className: "tree-scroll"
  }, TREE.map((n, i) => /*#__PURE__*/React.createElement(TreeRow, {
    key: i,
    node: n
  })))), /*#__PURE__*/React.createElement("main", {
    className: "center"
  }, /*#__PURE__*/React.createElement("header", {
    className: "ws-bar"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ws-code"
  }, "ES-001"), /*#__PURE__*/React.createElement("span", {
    className: "ws-title"
  }, "LEWIS RESIDENCE"), /*#__PURE__*/React.createElement("span", {
    className: "ws-version"
  }, "LEWIS RESIDENCE \xB7 001"), /*#__PURE__*/React.createElement("div", {
    className: "ws-actions"
  }, /*#__PURE__*/React.createElement(LiquidButton, null, /*#__PURE__*/React.createElement("i", {
    className: "ph ph-share-network"
  }), " Shared link"), /*#__PURE__*/React.createElement(LiquidButton, null, "Teamspaces"), /*#__PURE__*/React.createElement("div", {
    className: "avatars"
  }, /*#__PURE__*/React.createElement("span", {
    className: "av av-pl"
  }, "PL"), /*#__PURE__*/React.createElement("span", {
    className: "av av-le"
  }, "LE")), /*#__PURE__*/React.createElement(LiquidButton, {
    className: "icon",
    "aria-label": "Settings"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph ph-gear"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "sheet-toolbar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "search sheet-search"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph ph-magnifying-glass"
  }), /*#__PURE__*/React.createElement("span", null, "Search Sheet")), /*#__PURE__*/React.createElement("div", {
    className: "tool-right"
  }, /*#__PURE__*/React.createElement(LiquidButton, {
    className: "icon",
    "aria-label": "History"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph ph-clock-counter-clockwise"
  })), /*#__PURE__*/React.createElement(LiquidButton, {
    className: "icon",
    "aria-label": "Export"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph ph-file-xls"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "sheet-scroll"
  }, /*#__PURE__*/React.createElement(GroupBar, {
    code: "02",
    name: "Lot",
    total: 3460519
  }), /*#__PURE__*/React.createElement(GroupBar, {
    code: "02.01",
    name: "House",
    total: 3460519
  }), /*#__PURE__*/React.createElement(GroupBar, {
    code: "02.01.01",
    name: "Ground Floor",
    total: 508150
  }), /*#__PURE__*/React.createElement(SheetTable, null)), /*#__PURE__*/React.createElement("footer", {
    className: "budget-bar"
  }, /*#__PURE__*/React.createElement("span", {
    className: "crumb"
  }, "Workshop \xB7 Projects \xB7 Lewis Residence"), /*#__PURE__*/React.createElement("div", {
    className: "budget-block"
  }, /*#__PURE__*/React.createElement("span", {
    className: "bnum"
  }, peso(2000000)), /*#__PURE__*/React.createElement("span", {
    className: "blabel"
  }, "Project budget")), /*#__PURE__*/React.createElement("div", {
    className: "health"
  }, /*#__PURE__*/React.createElement("div", {
    className: "health-head"
  }, /*#__PURE__*/React.createElement("span", null, "Budget health"), /*#__PURE__*/React.createElement("span", {
    className: "over"
  }, "198% used")), /*#__PURE__*/React.createElement("div", {
    className: "health-track"
  }, /*#__PURE__*/React.createElement("div", {
    className: "health-fill"
  })), /*#__PURE__*/React.createElement("span", {
    className: "health-note"
  }, "\u20B11.96M over \xB7 198% used")), /*#__PURE__*/React.createElement("div", {
    className: "budget-block right"
  }, /*#__PURE__*/React.createElement("span", {
    className: "bnum danger"
  }, peso(3964714)), /*#__PURE__*/React.createElement("span", {
    className: "blabel"
  }, "Ongoing project cost")), /*#__PURE__*/React.createElement(LiquidButton, {
    className: "ask-flip"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph ph-chat-circle-dots"
  }), " Ask Flip"))), /*#__PURE__*/React.createElement("aside", {
    className: "dock"
  }, /*#__PURE__*/React.createElement("div", {
    className: "search"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph ph-magnifying-glass"
  }), /*#__PURE__*/React.createElement("span", null, "Search Library Tree")), /*#__PURE__*/React.createElement("div", {
    className: "panel-toolbar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tool-left"
  }, /*#__PURE__*/React.createElement(LiquidButton, {
    className: "icon",
    "aria-label": "Filter"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph ph-funnel"
  })), /*#__PURE__*/React.createElement(LiquidButton, {
    className: "icon",
    "aria-label": "List"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph ph-list"
  }))), /*#__PURE__*/React.createElement(LiquidButton, {
    className: "icon add",
    "aria-label": "Add component"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph ph-plus"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "dock-tabs"
  }, /*#__PURE__*/React.createElement("button", {
    className: "dock-tab" + (tab === "components" ? " is-active" : ""),
    onClick: () => setTab("components")
  }, "Components"), /*#__PURE__*/React.createElement("button", {
    className: "dock-tab" + (tab === "templates" ? " is-active" : ""),
    onClick: () => setTab("templates")
  }, "Templates")), /*#__PURE__*/React.createElement("div", {
    className: "viewby"
  }, /*#__PURE__*/React.createElement("span", {
    className: "viewby-label"
  }, "View by"), /*#__PURE__*/React.createElement(SegmentedControl, {
    ariaLabel: "View by",
    value: view,
    onValueChange: setView,
    options: [{
      value: "default",
      label: "Default"
    }, {
      value: "suppliers",
      label: "Suppliers"
    }, {
      value: "brand",
      label: "Brand"
    }]
  })), /*#__PURE__*/React.createElement("div", {
    className: "tree-scroll"
  }, LIB.map((n, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "tree-row",
    style: {
      paddingLeft: 8 + n.depth * 12
    }
  }, n.icon === "ph-folder" || n.icon === "ph-stack" ? /*#__PURE__*/React.createElement("i", {
    className: "ph " + (n.open ? "ph-caret-down" : "ph-caret-right"),
    style: {
      fontSize: 9,
      color: "var(--tertiary)",
      width: 10
    }
  }) : /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      display: "inline-block"
    }
  }), /*#__PURE__*/React.createElement("i", {
    className: "ph " + n.icon,
    style: {
      fontSize: 13,
      color: n.price ? "var(--occupied-glyph)" : "var(--tertiary)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "tree-label"
  }, n.label), n.price && /*#__PURE__*/React.createElement("span", {
    className: "lib-price"
  }, n.price, /*#__PURE__*/React.createElement("span", {
    className: "lib-unit"
  }, n.unit))))))));
}
ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(Workshop, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workshop/Workshop.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Chip = __ds_scope.Chip;

__ds_ns.StatusBadge = __ds_scope.StatusBadge;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Field = __ds_scope.Field;

__ds_ns.SegmentedControl = __ds_scope.SegmentedControl;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.EstimateCell = __ds_scope.EstimateCell;

__ds_ns.FinancialTotalCard = __ds_scope.FinancialTotalCard;

__ds_ns.Modal = __ds_scope.Modal;

__ds_ns.ConfirmDialog = __ds_scope.ConfirmDialog;

__ds_ns.Sheet = __ds_scope.Sheet;

__ds_ns.SettingsModal = __ds_scope.SettingsModal;

})();

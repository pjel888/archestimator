/* VERIFY-ONLY stub — NOT uploaded. The real _ds_bundle.js (the compiled DS
   component bundle) lives in the project and is untouched. The dashboard kit
   only destructures Button from the namespace and renders bespoke glass chrome,
   so a minimal stub is enough to render it for local visual verification. */
(function () {
  function Button(props) {
    var rest = Object.assign({}, props);
    delete rest.children;
    var buttonType = rest.type;
    delete rest.type;
    if (buttonType === "submit") return React.createElement("button", { ...rest, type: "submit" }, props.children);
    if (buttonType === "reset") return React.createElement("button", { ...rest, type: "reset" }, props.children);
    return React.createElement("button", { ...rest, type: "button" }, props.children);
  }
  window.ArchestimatorDesignSystem_3fbb6f = { Button: Button };
})();

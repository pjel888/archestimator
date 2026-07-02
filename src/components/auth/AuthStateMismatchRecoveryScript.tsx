const authStateMismatchRecoveryScript = String.raw`
(function () {
  try {
    var params = new URLSearchParams(window.location.search);
    var hasStateMismatch = params.get("error") === "state_mismatch";
    var isResetHop = window.location.pathname === "/login" && params.get("oauth_state_reset") === "1";
    if (!hasStateMismatch && !isResetHop) return;

    var next = params.get("next") || "/workshop";
    if (next.charAt(0) !== "/" || next.indexOf("//") === 0) next = "/workshop";

    try {
      if (window.caches && typeof window.caches.keys === "function") {
        window.caches.keys().then(function (keys) {
          return Promise.all(keys.map(function (key) { return window.caches.delete(key); }));
        }).catch(function () {});
      }
    } catch (_) {}

    var target = new URL("/login", window.location.origin);
    target.searchParams.set("next", next);
    target.searchParams.set("oauth_state_reset", "1");
    if (isResetHop) target.searchParams.set("oauth_state_reset_done", "1");
    window.location.replace(target.toString());
  } catch (_) {}
})();`;

export function AuthStateMismatchRecoveryScript() {
  return (
    <script
      data-auth-state-mismatch-recovery=""
      dangerouslySetInnerHTML={{ __html: authStateMismatchRecoveryScript }}
    />
  );
}

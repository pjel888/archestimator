"use client";

import { useEffect } from "react";

/**
 * Deferred liquid-glass arming.
 *
 * The workshop's stacked `backdrop-filter` blurs (sidebar rail, full workspace
 * frost, the many dashboard tiles) are the heaviest first-paint cost, so every
 * glass surface ships with `backdrop-filter: none` in globals.css and only blurs
 * once `<html data-glass="ready">` is set. We set that flag AFTER the first cheap
 * paint has committed AND the main thread is idle (post-hydration), so content
 * lands fast and the frost ramps in afterwards (the ramp is driven by the
 * animatable `--glass-blur-amount` registered property).
 *
 * Opt-outs are enforced in CSS — the armed rules are nested inside
 * `@supports (backdrop-filter)` + `@media (prefers-reduced-transparency:
 * no-preference)` — and we ALSO short-circuit here so we never even toggle the
 * attribute (or run the ramp) for unsupported / reduced-transparency users.
 *
 * Renders `null`: a leaf client component that mutates the DOM imperatively in an
 * effect (never via SSR markup, so there is no hydration mismatch) and pulls no
 * other component into the client bundle.
 */
export function LiquidGlassReady() {
  useEffect(() => {
    const root = document.documentElement;
    if (root.dataset.glass === "ready") return; // already armed (e.g. client nav)

    // Respect the opt-outs up front. CSS enforces them too, but this avoids
    // needlessly toggling the attribute / running the ramp for these users.
    const supportsBackdrop =
      typeof CSS !== "undefined" &&
      typeof CSS.supports === "function" &&
      (CSS.supports("backdrop-filter", "blur(1px)") ||
        CSS.supports("-webkit-backdrop-filter", "blur(1px)"));
    if (!supportsBackdrop) return;
    if (window.matchMedia?.("(prefers-reduced-transparency: reduce)").matches) return;

    let cancelled = false;
    let raf1 = 0;
    let raf2 = 0;
    let idleHandle: number | null = null;
    let timeoutHandle: number | null = null;

    const arm = () => {
      if (!cancelled) root.dataset.glass = "ready";
    };

    // Hard backstop, independent of the rAF chain. requestAnimationFrame is
    // parked while the document is hidden (e.g. a page opened in a background
    // tab), which would otherwise stall the whole arm chain — and the rIC
    // timeout below is downstream of rAF, so it can't rescue it. This ensures
    // the frost always arms within a bounded time. Generous so it never preempts
    // the normal post-idle path on a foreground load.
    const backstopHandle = window.setTimeout(arm, 1500);

    const scheduleIdle = () => {
      if (cancelled) return;
      if (typeof window.requestIdleCallback === "function") {
        idleHandle = window.requestIdleCallback(arm, { timeout: 400 });
      } else {
        // Safari/iOS have no requestIdleCallback — a short timeout is close enough.
        timeoutHandle = window.setTimeout(arm, 200);
      }
    };

    const scheduleAfterPaint = () => {
      if (cancelled) return;
      // Double rAF => at least one cheap (no-blur) paint has committed.
      raf1 = window.requestAnimationFrame(() => {
        raf2 = window.requestAnimationFrame(scheduleIdle);
      });
    };

    // Avoid arming mid-font-swap (a blur ramp during a FOUT reflow looks janky);
    // cap the wait so a slow font can never block the frost indefinitely.
    const fontsReady = document.fonts?.ready ?? Promise.resolve();
    void Promise.race([
      fontsReady,
      new Promise<void>((resolve) => window.setTimeout(resolve, 1000)),
    ]).then(scheduleAfterPaint);

    return () => {
      cancelled = true;
      window.clearTimeout(backstopHandle);
      if (raf1) window.cancelAnimationFrame(raf1);
      if (raf2) window.cancelAnimationFrame(raf2);
      if (idleHandle != null && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleHandle);
      }
      if (timeoutHandle != null) window.clearTimeout(timeoutHandle);
    };
  }, []);

  return null;
}

"use client";

import { useLenis } from "lenis/react";
import { useEffect } from "react";

const LANDING_HEADER_OFFSET_PX = 68;
const DESKTOP_SNAP_QUERY = "(min-width: 1024px)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const SNAP_SECTION_SELECTOR = "[data-landing-snap-section='true']";
const SNAP_WHEEL_IGNORE_SELECTOR = [
  "[data-lenis-prevent]",
  "[data-landing-snap-ignore]",
  "input",
  "textarea",
  "select",
  "[contenteditable='true']",
].join(", ");
const SNAP_KEYBOARD_IGNORE_SELECTOR = [
  "[data-lenis-prevent]",
  "[data-landing-snap-ignore]",
  "a",
  "button",
  "input",
  "textarea",
  "select",
  "summary",
  "[role='button']",
  "[role='link']",
  "[role='tab']",
  "[contenteditable='true']",
].join(", ");
const SNAP_POSITION_EPSILON = 8;
const WHEEL_DELTA_EPSILON = 6;
const USER_SCROLL_SETTLE_DELAY_MS = 220;
const SETTLE_DURATION_SECONDS = 0.86;
const SETTLE_FALLBACK_UNLOCK_MS = 1_200;
const MIN_SETTLE_DISTANCE_PX = 32;
const FORWARD_SECTION_COMMIT_PROGRESS = 0.3;
const BACKWARD_SECTION_COMMIT_PROGRESS = 0.7;

function easeOutQuart(t: number) {
  return 1 - Math.pow(1 - t, 4);
}

function getSnapPointForSection(section: HTMLElement) {
  return Math.max(0, Math.round(section.getBoundingClientRect().top + window.scrollY - LANDING_HEADER_OFFSET_PX));
}

function getLandingSnapPoints() {
  const sectionPoints = Array.from(document.querySelectorAll<HTMLElement>(SNAP_SECTION_SELECTOR)).map(getSnapPointForSection);
  return Array.from(new Set([0, ...sectionPoints])).sort((a, b) => a - b);
}

function getDirectionalSnapPoint(points: number[], currentScrollY: number, direction: number) {
  if (direction > 0) {
    return points.find((point) => point > currentScrollY + SNAP_POSITION_EPSILON) ?? points.at(-1);
  }

  return points.findLast((point) => point < currentScrollY - SNAP_POSITION_EPSILON) ?? points[0];
}

function getSoftSettleSnapPoint(points: number[], currentScrollY: number, direction: number) {
  if (points.length < 2) return null;

  const previousPoint = points.findLast((point) => point <= currentScrollY + SNAP_POSITION_EPSILON) ?? points[0];
  const nextPoint = points.find((point) => point >= currentScrollY - SNAP_POSITION_EPSILON) ?? points.at(-1);

  if (typeof nextPoint !== "number" || previousPoint === nextPoint) {
    return null;
  }

  const segmentSize = nextPoint - previousPoint;
  if (segmentSize <= 0) return null;

  const segmentProgress = Math.min(1, Math.max(0, (currentScrollY - previousPoint) / segmentSize));
  if (direction > 0) {
    return segmentProgress >= FORWARD_SECTION_COMMIT_PROGRESS ? nextPoint : previousPoint;
  }
  if (direction < 0) {
    return segmentProgress <= BACKWARD_SECTION_COMMIT_PROGRESS ? previousPoint : nextPoint;
  }

  return segmentProgress >= 0.5 ? nextPoint : previousPoint;
}

function shouldIgnoreSnapTarget(target: EventTarget | null, selector: string) {
  return target instanceof Element && Boolean(target.closest(selector));
}

export function LandingSnapController() {
  const lenis = useLenis();

  useEffect(() => {
    if (!lenis) return;

    const desktopSnapQuery = window.matchMedia(DESKTOP_SNAP_QUERY);
    const reducedMotionQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    let isSettling = false;
    let settleTimer: number | undefined;
    let unlockTimer: number | undefined;
    let lastUserScrollDirection = 0;

    const clearSettleTimer = () => {
      if (settleTimer) {
        window.clearTimeout(settleTimer);
        settleTimer = undefined;
      }
    };

    const unlockSettle = () => {
      isSettling = false;
      if (unlockTimer) {
        window.clearTimeout(unlockTimer);
        unlockTimer = undefined;
      }
    };

    const isEnabled = () => desktopSnapQuery.matches && !reducedMotionQuery.matches;

    const settleTo = (targetScrollY: number) => {
      const distance = Math.abs(targetScrollY - window.scrollY);
      if (distance <= MIN_SETTLE_DISTANCE_PX) return;

      isSettling = true;
      if (unlockTimer) window.clearTimeout(unlockTimer);

      lenis.scrollTo(targetScrollY, {
        duration: SETTLE_DURATION_SECONDS,
        easing: easeOutQuart,
        onComplete: unlockSettle,
        userData: { initiator: "landing-soft-settle" },
      });

      unlockTimer = window.setTimeout(unlockSettle, SETTLE_FALLBACK_UNLOCK_MS);
    };

    const settleAfterUserScroll = () => {
      clearSettleTimer();
      if (!isEnabled() || isSettling || lastUserScrollDirection === 0) return;

      settleTimer = window.setTimeout(() => {
        const points = getLandingSnapPoints();
        const targetScrollY = getSoftSettleSnapPoint(points, window.scrollY, lastUserScrollDirection);
        if (targetScrollY === null) return;
        settleTo(targetScrollY);
      }, USER_SCROLL_SETTLE_DELAY_MS);
    };

    const onWheel = (event: WheelEvent) => {
      if (!isEnabled() || event.ctrlKey || event.metaKey || shouldIgnoreSnapTarget(event.target, SNAP_WHEEL_IGNORE_SELECTOR)) return;
      if (Math.abs(event.deltaY) <= WHEEL_DELTA_EPSILON) return;

      lastUserScrollDirection = Math.sign(event.deltaY);
      if (isSettling) unlockSettle();
      settleAfterUserScroll();
    };

    const onScroll = () => {
      settleAfterUserScroll();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isEnabled() || shouldIgnoreSnapTarget(event.target, SNAP_KEYBOARD_IGNORE_SELECTOR)) return;

      const direction = event.key === "ArrowDown" || event.key === "PageDown" || (event.key === " " && !event.shiftKey)
        ? 1
        : event.key === "ArrowUp" || event.key === "PageUp" || (event.key === " " && event.shiftKey)
          ? -1
          : 0;
      if (direction === 0) return;

      const points = getLandingSnapPoints();
      const targetScrollY = getDirectionalSnapPoint(points, window.scrollY, direction);
      if (typeof targetScrollY !== "number" || Math.abs(targetScrollY - window.scrollY) <= MIN_SETTLE_DISTANCE_PX) {
        return;
      }

      event.preventDefault();
      lastUserScrollDirection = direction;
      clearSettleTimer();
      settleTo(targetScrollY);
    };

    const onPreferenceChange = () => {
      clearSettleTimer();
      unlockSettle();
    };

    window.addEventListener("wheel", onWheel, { passive: true, capture: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    desktopSnapQuery.addEventListener("change", onPreferenceChange);
    reducedMotionQuery.addEventListener("change", onPreferenceChange);

    return () => {
      clearSettleTimer();
      unlockSettle();
      window.removeEventListener("wheel", onWheel, { capture: true });
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKeyDown);
      desktopSnapQuery.removeEventListener("change", onPreferenceChange);
      reducedMotionQuery.removeEventListener("change", onPreferenceChange);
    };
  }, [lenis]);

  return null;
}

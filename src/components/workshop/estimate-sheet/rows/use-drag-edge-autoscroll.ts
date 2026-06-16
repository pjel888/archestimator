"use client";

import { useEffect, type RefObject } from "react";

const EDGE_ZONE_PX = 72;
const MAX_SPEED_PX = 18;

/**
 * Auto-scroll speed (px per animation frame) for a pointer at `clientY` over a
 * scroll container whose viewport spans [top, bottom]. Negative scrolls up,
 * positive down, 0 when the pointer is outside the container or in its calm
 * middle band. Speed ramps linearly with how deep the pointer sits in the edge
 * hot zone, so a slow nudge near the edge scrolls gently and the very edge
 * scrolls fast. Pure + deterministic so the ramp is unit-testable.
 */
export function computeEdgeScrollSpeed(
  clientY: number,
  top: number,
  bottom: number,
  edge: number = EDGE_ZONE_PX,
  maxSpeed: number = MAX_SPEED_PX,
): number {
  if (clientY <= top || clientY >= bottom) return 0;
  if (clientY < top + edge) {
    const intensity = (top + edge - clientY) / edge; // (0, 1]
    return -Math.ceil(intensity * maxSpeed);
  }
  if (clientY > bottom - edge) {
    const intensity = (clientY - (bottom - edge)) / edge; // (0, 1]
    return Math.ceil(intensity * maxSpeed);
  }
  return 0;
}

/**
 * While a drag is in flight, auto-scroll the nearest scroll container as the
 * pointer approaches its top/bottom edge — the standard "drag to the edge to
 * keep scrolling" affordance. Without it, a native HTML5 drag captures the
 * pointer and the user can't reach off-screen drop targets (e.g. the bottom-most
 * node), made worse by the drop zones that only appear mid-drag and grow the
 * page. `anchorRef` is any element inside the scroll container; the scroller is
 * resolved via the `[data-estimate-pointer-surface]` marker. Listeners attach
 * imperatively (the dragover stream is read-only — it never preventDefaults, so
 * child drop targets keep working) and a continuous rAF loop carries the scroll
 * smoothly between the intermittent dragover events.
 */
export function useDragEdgeAutoScroll(anchorRef: RefObject<HTMLElement | null>, enabled: boolean): void {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const scroller = anchorRef.current?.closest<HTMLElement>("[data-estimate-pointer-surface]") ?? null;
    if (!scroller) return;

    let frame: number | null = null;
    let speed = 0;

    const tick = () => {
      if (speed === 0) {
        frame = null;
        return;
      }

      const previousScrollTop = scroller.scrollTop;
      scroller.scrollTop += speed;

      if (scroller.scrollTop === previousScrollTop) {
        speed = 0;
        frame = null;
        return;
      }

      frame = requestAnimationFrame(tick);
    };

    const stop = () => {
      speed = 0;
      if (frame !== null) {
        cancelAnimationFrame(frame);
        frame = null;
      }
    };

    const handleDragOver = (event: DragEvent) => {
      const rect = scroller.getBoundingClientRect();
      speed = computeEdgeScrollSpeed(event.clientY, rect.top, rect.bottom);
      if (speed === 0) {
        stop();
        return;
      }
      if (frame === null) frame = requestAnimationFrame(tick);
    };

    const handleDragLeave = (event: DragEvent) => {
      if (event.relatedTarget instanceof Node && scroller.contains(event.relatedTarget)) return;
      const rect = scroller.getBoundingClientRect();
      if (
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      ) {
        return;
      }
      stop();
    };

    scroller.addEventListener("dragover", handleDragOver);
    scroller.addEventListener("dragleave", handleDragLeave);
    // A drag that ends or drops anywhere must halt the loop, even if the pointer
    // was sitting in the hot zone (a drop at the very bottom edge otherwise
    // scrolls forever). dragend fires on the source, so listen at the document.
    document.addEventListener("dragend", stop, { capture: true });
    document.addEventListener("drop", stop, { capture: true });
    window.addEventListener("blur", stop);

    return () => {
      scroller.removeEventListener("dragover", handleDragOver);
      scroller.removeEventListener("dragleave", handleDragLeave);
      document.removeEventListener("dragend", stop, { capture: true });
      document.removeEventListener("drop", stop, { capture: true });
      window.removeEventListener("blur", stop);
      stop();
    };
  }, [anchorRef, enabled]);
}

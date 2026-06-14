"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { useIsHydrated } from "@/hooks/use-is-hydrated";
import { isProjectPageCursorsEnabled } from "@/lib/collaboration/feature-flags";
import { getCollaborationColorForUser } from "@/lib/collaboration/colors";
import { routeToActiveSurface } from "@/lib/collaboration/presence-surface";
import {
  useEstimateCursorCollaboration,
  type RemoteEstimateCursor,
} from "@/hooks/use-estimate-cursor-broadcast";

/**
 * Project-wide page cursors (Teamspace plan T5.3 / D-1 / D-5).
 *
 * CAPACITY-GATED + OFF BY DEFAULT. Reuses the exact sheet-cursor engine
 * (`useEstimateCursorCollaboration`, sender-bound identity, throttle/GC) on the
 * `project:{id}` channel with page-relative document coordinates. Broad page
 * cursors multiply realtime fan-out, so this stays disabled until the Supabase
 * tier (D-1) is confirmed — flip `NEXT_PUBLIC_TEAMSPACE_PROJECT_CURSORS=on`.
 *
 * Per D-5 it activates only on the project OVERVIEW surface first (never the
 * estimate sheet, which already has its own cursor layer). Touch devices are
 * suppressed by default (08 §2.3).
 */
export function ProjectCursorLayer({
  projectId,
  userId,
  displayName,
}: {
  projectId: string | null | undefined;
  userId: string | null | undefined;
  displayName: string | null | undefined;
}) {
  const pathname = usePathname();
  const surface = routeToActiveSurface(pathname);
  const flagEnabled = isProjectPageCursorsEnabled();
  const hydrated = useIsHydrated();
  // `window.matchMedia` is browser-only — reading it in render makes the server
  // (always false) disagree with the client. Gate on hydration so `enabled`
  // (which controls whether this layer renders any DOM) is identical server-side
  // and on the first client render; the coarse-pointer check applies post-commit.
  const isCoarsePointer =
    hydrated && typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(pointer: coarse)").matches
      : false;
  const enabled = flagEnabled && surface === "overview" && Boolean(projectId && userId) && !isCoarsePointer;

  const { broadcastCursor, remoteCursors } = useEstimateCursorCollaboration({
    estimateId: projectId ?? undefined,
    channelTopic: projectId ? `project:${projectId}` : undefined,
    userId,
    displayName,
    enabled,
    throttleMs: 100, // more potential movers on a page than a sheet (06 §5)
  });

  // Broadcast page-relative document coords (survive scroll — 07 §2.4).
  useEffect(() => {
    if (!enabled) return;
    function handlePointerMove(event: PointerEvent) {
      broadcastCursor({
        x: Math.round(event.pageX),
        y: Math.round(event.pageY),
        fracX: null,
        fracY: null,
        rowId: null,
        columnId: null,
      });
    }
    document.addEventListener("pointermove", handlePointerMove);
    return () => document.removeEventListener("pointermove", handlePointerMove);
  }, [broadcastCursor, enabled]);

  if (!enabled || remoteCursors.length === 0) return null;
  return <ProjectCursorsOverlay cursors={remoteCursors} />;
}

function ProjectCursorsOverlay({ cursors }: { cursors: RemoteEstimateCursor[] }) {
  const markerRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const positionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const cursorsRef = useRef<RemoteEstimateCursor[]>(cursors);
  useEffect(() => {
    cursorsRef.current = cursors;
  });

  useEffect(() => {
    if (cursors.length === 0) return;
    const reduceMotion =
      typeof window !== "undefined" && window.matchMedia
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false;
    let raf = 0;
    const positions = positionsRef.current;
    function frame() {
      for (const cursor of cursorsRef.current) {
        const element = markerRefs.current.get(cursor.userId);
        if (!element) continue;
        // page coords → viewport coords (fixed overlay), recomputed each frame.
        const targetX = cursor.x - window.scrollX;
        const targetY = cursor.y - window.scrollY;
        const previous = positions.get(cursor.userId) ?? { x: targetX, y: targetY };
        const nextX = reduceMotion ? targetX : previous.x + (targetX - previous.x) * 0.25;
        const nextY = reduceMotion ? targetY : previous.y + (targetY - previous.y) * 0.25;
        positions.set(cursor.userId, { x: nextX, y: nextY });
        element.style.transform = `translate3d(${Math.round(nextX)}px, ${Math.round(nextY)}px, 0)`;
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [cursors.length]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[55]" aria-hidden="true" data-project-cursor-layer>
      {cursors.map((cursor) => {
        const color = getCollaborationColorForUser(cursor.userId);
        return (
          <div
            key={cursor.userId}
            ref={(element) => {
              if (element) markerRefs.current.set(cursor.userId, element);
              else markerRefs.current.delete(cursor.userId);
            }}
            className="absolute left-0 top-0 flex items-start gap-1 will-change-transform"
            data-project-remote-cursor={cursor.userId}
            data-project-remote-cursor-color={color.name}
          >
            <span
              className="mt-0.5 block size-2 rotate-45 rounded-xs"
              style={{ backgroundColor: color.cursor, boxShadow: `0 0 0 1px rgba(255, 255, 255, 0.9), 0 0 0 4px ${color.ring}` }}
            />
            <span
              className="max-w-28 truncate rounded-xs px-1.5 py-0.5 text-[8px] font-medium leading-[10px] shadow-[0_4px_12px_rgba(17,24,39,0.18)]"
              style={{ backgroundColor: color.cursor, color: color.text }}
            >
              {cursor.displayName ?? `User ${cursor.userId.slice(0, 8)}`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

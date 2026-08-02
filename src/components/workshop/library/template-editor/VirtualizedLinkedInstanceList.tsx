"use client";

import { useState } from "react";
import Link from "next/link";

type LinkedInstanceStatusItem = {
  instanceId: string;
  projectId: string;
  projectName: string;
  estimateId: string;
  estimateName: string;
  linkState: "linked" | "updating" | "failed";
  appliedVersionNumber: number;
  targetVersionNumber: number;
};

const ROW_HEIGHT = 24;
const VIEWPORT_HEIGHT = 128;
const OVERSCAN = 5;

export function VirtualizedLinkedInstanceList({ items }: { items: LinkedInstanceStatusItem[] }) {
  const [scrollTop, setScrollTop] = useState(0);
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const visibleCount = Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT) + OVERSCAN * 2;
  const visibleItems = items.slice(startIndex, startIndex + visibleCount);

  return (
    <div
      className="mt-1 max-h-32 overflow-auto"
      data-template-linked-instance-virtual-list="true"
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
    >
      <div className="relative w-full" style={{ height: items.length * ROW_HEIGHT }}>
        {visibleItems.map((item, visibleIndex) => {
          const itemIndex = startIndex + visibleIndex;
          return (
            <Link
              key={item.instanceId}
              href={`/workshop/projects/${item.projectId}/estimates/${item.estimateId}`}
              className="absolute left-0 top-0 flex h-6 w-full items-center justify-between gap-2 rounded-xs px-1 hover:bg-surfaceMuted"
              style={{ transform: `translateY(${itemIndex * ROW_HEIGHT}px)` }}
            >
              <span className="min-w-0 truncate">{item.projectName} · {item.estimateName}</span>
              <span className={item.linkState === "failed" ? "text-danger" : "text-tertiary"}>
                {item.linkState === "linked"
                  ? `v${item.appliedVersionNumber}`
                  : item.linkState === "updating"
                    ? `v${item.appliedVersionNumber}→${item.targetVersionNumber}`
                    : "Failed"}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

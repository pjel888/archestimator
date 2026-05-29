"use client";

import React, { useEffect, useRef, useState } from "react";
import type { ShareTreeNode } from "@/lib/share/reconstruct-share-tree";
import { WORKSHOP_TREE_INDENT_STEP } from "@/components/workshop/tree-visual-style";

interface ShareFloatingTreeNavProps {
  nodes: ShareTreeNode[];
  activeId?: string;
  onNavigate?: (id: string) => void;
  className?: string;
}

/**
 * P4: Compact floating navigation tree for the share receiver Tree View.
 * 
 * - Sticky sidebar (desktop only)
 * - Click scrolls smoothly to the corresponding node in the tree
 * - IntersectionObserver highlights the currently visible section
 * - Hidden on mobile and when Grid Preview is active
 */
export function ShareFloatingTreeNav({ nodes, activeId, onNavigate, className }: ShareFloatingTreeNavProps) {
  const [observedActiveId, setObservedActiveId] = useState<string | undefined>(activeId);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Flatten nodes for the nav (groups + areas) while preserving some hierarchy via indentation
  const flatItems: Array<{ id: string; label: string; depth: number; kind: "group" | "area" }> = [];

  const flatten = (list: ShareTreeNode[], depth: number) => {
    list.forEach((node) => {
      flatItems.push({ id: node.id, label: node.label, depth, kind: node.kind });
      if (node.children.length > 0) {
        flatten(node.children, depth + 1);
      }
    });
  };
  flatten(nodes, 0);

  useEffect(() => {
    // Cleanup previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the entry that is most visible (highest intersectionRatio in viewport)
        let best: IntersectionObserverEntry | null = null;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (!best || entry.intersectionRatio > best.intersectionRatio) {
              best = entry;
            }
          }
        }
        if (best) {
          const id = best.target.id;
          setObservedActiveId(id);
          onNavigate?.(id);
        }
      },
      {
        rootMargin: "-20% 0px -60% 0px", // Bias toward the top third of the viewport
        threshold: [0.1, 0.25, 0.5, 0.75, 1.0],
      }
    );

    observerRef.current = observer;

    // Observe all tree nodes that have matching IDs
    flatItems.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes]); // Re-attach when tree structure changes

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setObservedActiveId(id);
      onNavigate?.(id);
    }
  };

  if (flatItems.length === 0) return null;

  // Compact nav: scaled indent from shared workshop constant for consistency (matches main tree visual language).
  // DESIGN: ≤10px text, regular weights, xs radius, hairline hovers, strong/default/subtle palette.
  // Root (virtual or natural) at depth 0 stands out as the "all data" container for the sheet.
  return (
    <nav
      className={`hidden lg:block w-[148px] flex-shrink-0 sticky top-3 self-start pr-1 text-[9px] ${className || ""}`}
      aria-label="Estimate navigation"
      role="navigation"
    >
      <div className="text-[8px] font-medium text-tertiary mb-0.5 px-1 tracking-normal">SECTIONS</div>
      <ul className="space-y-0">
        {flatItems.map((item) => {
          const isActive = observedActiveId === item.id;
          const isRoot = item.depth === 0;
          const indent = Math.min(item.depth * Math.floor(WORKSHOP_TREE_INDENT_STEP * 0.55), 48);

          return (
            <li key={item.id}>
              <button
                onClick={() => handleClick(item.id)}
                className={`w-full text-left px-1 py-[1px] rounded-xs transition-colors truncate ${
                  isActive
                    ? "bg-surfaceMuted text-ink font-medium border-l border-l-ink/70"
                    : isRoot
                    ? "text-ink font-medium hover:bg-surfaceMuted/70"
                    : "text-secondary hover:text-ink hover:bg-surfaceMuted/50"
                }`}
                style={{ paddingLeft: `${indent + (isRoot ? 2 : 4)}px` }}
                title={item.label}
                data-nav-depth={item.depth}
                data-nav-kind={item.kind}
              >
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

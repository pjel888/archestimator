"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import type { ShareDecisionType } from "@/components/share/SharePageDecisionConfirmDialog";

const STICKY_DECISION_THRESHOLD = 320;

export function StickyDecisionBar() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateVisibility = () => setIsVisible(window.scrollY >= STICKY_DECISION_THRESHOLD);
    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateVisibility);
  }, []);

  const requestDecision = (decision: ShareDecisionType) => {
    document.getElementById("share-response")?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.dispatchEvent(new CustomEvent<ShareDecisionType>("share:request-decision", { detail: decision }));
  };

  if (!isVisible) return null;

  return (
    <aside
      role="region"
      aria-label="Quick response"
      className="share-print-hidden fixed bottom-4 right-4 z-40 hidden rounded-xs border border-hairline bg-white p-2 shadow-sm sm:block"
    >
      <div className="flex items-center gap-2">
        <Button type="button" variant="primary" size="sm" onClick={() => requestDecision("accepted")}>Approve</Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => requestDecision("revision_requested")}>Request changes</Button>
        <Button type="button" variant="plain" size="sm" onClick={() => requestDecision("declined")}>Decline</Button>
      </div>
    </aside>
  );
}

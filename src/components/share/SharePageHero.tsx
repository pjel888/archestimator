"use client";

import React from "react";
import Image from "next/image";
import { normalizePublicationImageUrl } from "@/lib/publication/image-url";

interface SharePageHeroProps {
  project: {
    name: string;
    coverImageUrl?: string | null;
  };
}

/**
 * P9 SharePageHero: renders cover image from projects.metadata (captured into snapshot.project at publish time).
 * - Next.js <Image> with `priority` — the cover is the above-the-fold hero and is frequently the
 *   LCP element, so it is fetched eagerly with high priority (OPT-9 / PERF-11). The explicit
 *   aspect-ratio wrapper below reserves layout to protect CLS while it loads.
 * - Design-system strict: rounded-xs (3px), hairline border, proposal/surface tokens, ≤12px / 9px labels, SF Pro stack
 * - Responsive: full-bleed in container, graceful no-image (null) for old snapshots / no cover
 * - Additive, backwards compatible (old snapshot_json without coverImageUrl render nothing extra)
 */
export default function SharePageHero({ project }: SharePageHeroProps) {
  const coverImageUrl = normalizePublicationImageUrl(project?.coverImageUrl);

  if (!coverImageUrl) {
    return null;
  }

  return (
    <div className="relative w-full overflow-hidden rounded-xs border border-hairline bg-surfaceMuted">
      <div className="relative aspect-[16/6] w-full sm:aspect-[16/5]">
        <Image
          src={coverImageUrl}
          alt={`${project.name} project cover`}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 768px, (max-width: 1280px) 1120px, 1280px"
          priority
        />
      </div>
    </div>
  );
}

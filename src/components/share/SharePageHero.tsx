"use client";

import React from "react";
import Image from "next/image";

interface SharePageHeroProps {
  project: {
    name: string;
    coverImageUrl?: string | null;
  };
}

/**
 * P9 SharePageHero: renders cover image from projects.metadata (captured into snapshot.project at publish time).
 * - Next.js <Image> with loading="lazy" (never eager on public receiver)
 * - Design-system strict: rounded-xs (3px), hairline border, proposal/surface tokens, ≤12px / 9px labels, SF Pro stack
 * - Responsive: full-bleed in container, graceful no-image (null) for old snapshots / no cover
 * - Additive, backwards compatible (old snapshot_json without coverImageUrl render nothing extra)
 */
export default function SharePageHero({ project }: SharePageHeroProps) {
  if (!project?.coverImageUrl) {
    return null;
  }

  return (
    <div className="relative w-full overflow-hidden rounded-xs border border-hairline bg-surfaceMuted">
      <div className="relative aspect-[16/6] w-full sm:aspect-[16/5]">
        <Image
          src={project.coverImageUrl}
          alt={`${project.name} project cover`}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 768px, 1024px"
          loading="lazy"
        />
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/35 to-transparent p-2 sm:p-2.5">
        <p className="text-[9px] font-medium uppercase leading-3 text-white/90">Project cover</p>
      </div>
    </div>
  );
}

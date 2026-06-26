"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";

import { cn } from "@/lib/ui/cn";

type ProjectCardThumbnailProps = {
  children?: ReactNode;
  fallbackSeed: string;
  imageUrl: string | null;
  isListView: boolean;
  mapImageUrl?: string | null;
  motif: string;
  motifSize: string;
  wrapperClass: string;
};

const PROJECT_THUMBNAIL_GRADIENTS = [
  "linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(246,247,248,0.96) 54%, rgba(255,255,255,1) 100%)",
  "linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(244,245,246,0.96) 48%, rgba(255,255,255,1) 100%)",
  "linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(247,248,249,0.96) 52%, rgba(255,255,255,1) 100%)",
  "linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(245,246,247,0.96) 46%, rgba(255,255,255,1) 100%)",
] as const;

function passthroughImageLoader({ src }: { src: string }) {
  return src;
}

function gradientIndex(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash % PROJECT_THUMBNAIL_GRADIENTS.length;
}

export function ProjectCardThumbnail({
  children,
  fallbackSeed,
  imageUrl,
  isListView,
  mapImageUrl,
  motif,
  motifSize,
  wrapperClass,
}: ProjectCardThumbnailProps) {
  const [failedMapImageUrl, setFailedMapImageUrl] = useState<string | null>(null);
  const canRenderMapImage = Boolean(mapImageUrl && failedMapImageUrl !== mapImageUrl);
  const fallbackGradient = PROJECT_THUMBNAIL_GRADIENTS[gradientIndex(fallbackSeed)];

  return (
    <div className={cn("relative shrink-0 overflow-hidden bg-surfaceMuted", wrapperClass)} data-project-card-thumbnail>
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt=""
          fill
          sizes={isListView ? "64px" : "(max-width: 768px) 100vw, 320px"}
          unoptimized
          loading="lazy"
          className="object-cover transition-transform duration-200 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      ) : canRenderMapImage ? (
        <Image
          src={mapImageUrl ?? ""}
          alt=""
          fill
          sizes={isListView ? "64px" : "(max-width: 768px) 100vw, 320px"}
          loader={passthroughImageLoader}
          unoptimized
          loading="lazy"
          onError={() => setFailedMapImageUrl(mapImageUrl ?? null)}
          className="object-cover transition-transform duration-200 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      ) : (
        <div
          data-project-card-generated-gradient
          className="flex h-full w-full items-center justify-center px-2"
          style={{ background: fallbackGradient }}
        >
          <span className={cn("truncate font-medium tracking-normal text-secondary", motifSize)}>
            {motif}
          </span>
        </div>
      )}

      {children}
    </div>
  );
}

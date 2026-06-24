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
  "radial-gradient(circle at 18% 16%, rgba(242, 68, 5, 0.22), transparent 30%), linear-gradient(135deg, rgba(255,255,255,0.94) 0%, rgba(237,244,248,0.84) 48%, rgba(255,255,255,0.9) 100%)",
  "radial-gradient(circle at 82% 18%, rgba(44, 123, 229, 0.18), transparent 32%), linear-gradient(135deg, rgba(253,252,247,0.96) 0%, rgba(231,241,235,0.86) 50%, rgba(255,255,255,0.92) 100%)",
  "radial-gradient(circle at 22% 82%, rgba(41, 128, 99, 0.2), transparent 34%), linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(244,238,228,0.9) 52%, rgba(236,242,246,0.88) 100%)",
  "radial-gradient(circle at 74% 72%, rgba(133, 92, 255, 0.16), transparent 30%), linear-gradient(135deg, rgba(248,250,252,0.96) 0%, rgba(238,242,235,0.88) 46%, rgba(255,250,246,0.92) 100%)",
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

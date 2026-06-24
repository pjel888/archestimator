"use client";

import Image from "next/image";
import type { ReactNode } from "react";

import { cn } from "@/lib/ui/cn";

type ProjectCardThumbnailProps = {
  children?: ReactNode;
  imageUrl: string | null;
  isListView: boolean;
  motif: string;
  motifSize: string;
  wrapperClass: string;
};

export function ProjectCardThumbnail({
  children,
  imageUrl,
  isListView,
  motif,
  motifSize,
  wrapperClass,
}: ProjectCardThumbnailProps) {
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
      ) : (
        <div className="flex h-full w-full items-center justify-center px-2">
          <span className={cn("truncate font-medium tracking-normal text-secondary", motifSize)}>
            {motif}
          </span>
        </div>
      )}

      {children}
    </div>
  );
}

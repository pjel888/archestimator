"use client";

import Image from "next/image";
import {
  ImageSquare,
  Trash,
  UploadSimple,
} from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";

type ProjectImagePanelProps = {
  imageInputId: string;
  isSubmitting: boolean;
  previewUrl: string;
  selectedImage: File | null;
  onChooseImage: (file: File) => void;
  onClearImage: () => void;
};

export function ProjectImagePanel({
  imageInputId,
  isSubmitting,
  previewUrl,
  selectedImage,
  onChooseImage,
  onClearImage,
}: ProjectImagePanelProps) {
  return (
    <div
      data-project-image-panel
      className="relative aspect-[4/3] min-h-0 overflow-hidden rounded-xs border border-hairline bg-surfaceMuted"
    >
      <div className="absolute inset-0">
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt=""
            fill
            sizes="(max-width: 1024px) calc(100vw - 2rem), 460px"
            unoptimized
            className="object-cover"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 bg-[radial-gradient(circle_at_18%_16%,rgba(242,68,5,0.12),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.94)_0%,rgba(237,244,248,0.78)_48%,rgba(255,255,255,0.9)_100%)] text-tertiary">
            <span className="grid size-12 place-items-center rounded-xs border border-white/80 bg-white/74">
              <ImageSquare size={24} weight="regular" aria-hidden="true" />
            </span>
            <span className="text-[9px] font-medium uppercase leading-3 tracking-normal">
              Project image
            </span>
          </div>
        )}
      </div>

      <div className="absolute inset-x-2 bottom-2 rounded-xs border border-white/70 bg-white/88 p-2 shadow-[0_10px_30px_-24px_rgba(17,17,17,0.5)]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[9px] font-medium uppercase leading-3 tracking-normal text-tertiary">
            Project image
          </span>
          {selectedImage ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-7 rounded-xs text-tertiary hover:bg-dangerSoft hover:text-danger"
              aria-label="Remove project image"
              disabled={isSubmitting}
              onClick={onClearImage}
            >
              <Trash size={16} weight="regular" />
            </Button>
          ) : null}
        </div>
        <input
          id={imageInputId}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          aria-label="Upload project image"
          disabled={isSubmitting}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.currentTarget.value = "";
            if (!file) return;
            onChooseImage(file);
          }}
          className="sr-only"
        />
        <label
          htmlFor={imageInputId}
          className={[
            "mt-2 inline-flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-xs border border-hairline bg-white/92 px-2 text-[10px] font-medium text-ink transition hover:bg-white focus-within:ring-2 focus-within:ring-focus",
            isSubmitting ? "pointer-events-none opacity-60" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <UploadSimple size={16} weight="regular" aria-hidden="true" />
          {selectedImage ? "Change image" : "Upload image"}
        </label>
      </div>
    </div>
  );
}

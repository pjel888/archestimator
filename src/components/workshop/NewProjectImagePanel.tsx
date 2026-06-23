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
    <div className="relative min-h-[280px] overflow-hidden bg-surfaceMuted lg:min-h-[504px]">
      <div className="absolute inset-0">
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt=""
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            unoptimized
            className="object-cover"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 bg-[linear-gradient(135deg,#fff0e5_0%,#edf4f8_42%,#ffffff_100%)] text-tertiary">
            <ImageSquare size={42} weight="regular" aria-hidden="true" />
            <span className="text-[9px] font-medium uppercase tracking-normal">
              Project image
            </span>
          </div>
        )}
      </div>

      <div className="absolute inset-x-2 bottom-2 rounded-xs border border-white/70 bg-white/86 p-2 shadow-[0_18px_44px_-32px_rgba(17,17,17,0.55)] backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[9px] font-medium uppercase tracking-normal text-tertiary">
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
              <Trash size={13} weight="regular" />
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
            "mt-2 inline-flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-xs border border-hairline bg-white px-2 text-[10px] font-medium text-ink transition hover:bg-surfaceMuted focus-within:ring-2 focus-within:ring-focus",
            isSubmitting ? "pointer-events-none opacity-60" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <UploadSimple size={13} weight="regular" aria-hidden="true" />
          {selectedImage ? "Change image" : "Upload image"}
        </label>
      </div>
    </div>
  );
}

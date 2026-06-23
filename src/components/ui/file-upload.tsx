import { useState, useRef, type DragEvent, type ChangeEvent, type Ref } from "react";
import { UploadSimple, X, File as FileIcon } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/ui/cn";

export type FileUploadProps = {
  ref?: Ref<HTMLInputElement>;
  className?: string;
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  onFilesSelected?: (files: File[]) => void;
  disabled?: boolean;
  invalid?: boolean;
};

function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function FileUpload({ className, accept, multiple, maxSize, onFilesSelected, disabled, invalid, ref }: FileUploadProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const setRefs = (node: HTMLInputElement) => {
      inputRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    const handleDragOver = (e: DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
      setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
      setIsDragging(false);
    };

    const processFiles = (newFiles: File[]) => {
      setError(null);
      
      if (maxSize) {
        const oversizedFiles = newFiles.filter(f => f.size > maxSize);
        if (oversizedFiles.length > 0) {
          setError(`File size exceeds limit (${Math.round(maxSize / 1024 / 1024)}MB)`);
          return;
        }
      }

      const updatedFiles = multiple ? [...files, ...newFiles] : [newFiles[0]];
      setFiles(updatedFiles);
      onFilesSelected?.(updatedFiles);
    };

    const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFiles(Array.from(e.dataTransfer.files));
      }
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(Array.from(e.target.files));
      }
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    };

    const removeFile = (indexToRemove: number) => {
      const updatedFiles = files.filter((_, index) => index !== indexToRemove);
      setFiles(updatedFiles);
      onFilesSelected?.(updatedFiles);
      if (updatedFiles.length === 0) {
        setError(null);
      }
    };

    return (
      <div className={cn("flex w-full flex-col gap-1.5", className)}>
        <label
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "relative flex w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xs border border-dashed bg-surface px-3 py-3 text-center transition focus-within:border-accent focus-within:ring-2 focus-within:ring-focus",
            isDragging ? "border-accent bg-accentSoft" : "border-hairline hover:border-tertiary hover:bg-surfaceMuted",
            invalid || error ? "border-danger bg-dangerSoft/30 text-danger hover:border-danger" : "",
            disabled ? "cursor-not-allowed opacity-50 hover:border-hairline hover:bg-surface" : ""
          )}
        >
          <input
            ref={setRefs}
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={handleChange}
            disabled={disabled}
            className="sr-only"
          />
          <UploadSimple size={14} weight="regular" className={cn("text-tertiary", (invalid || error) && "text-danger")} />
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-medium text-ink">
              {isDragging ? "Drop files here" : "Click or drag files to upload"}
            </span>
            <span className="text-[9px] text-tertiary">
              {accept ? `Accepts ${accept}` : "Any file type"}
              {maxSize ? ` up to ${Math.round(maxSize / 1024 / 1024)}MB` : ""}
            </span>
          </div>
        </label>

        {error && (
          <span className="text-[9px] font-medium text-danger">{error}</span>
        )}

        {files.length > 0 && (
          <div className="flex flex-col gap-1">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between rounded-xs border border-hairline bg-surface px-2 py-1.5"
              >
                <div className="flex min-w-0 items-center gap-1.5">
                  <FileIcon size={12} weight="regular" className="shrink-0 text-tertiary" />
                  <span className="truncate text-[10px] font-medium text-ink">{file.name}</span>
                  <span className="shrink-0 text-[9px] text-tertiary">{formatFileSize(file.size)}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    removeFile(index);
                  }}
                  disabled={disabled}
                  className="grid size-4 shrink-0 place-items-center rounded-xs text-tertiary hover:bg-surfaceMuted hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={`Remove ${file.name}`}
                >
                  <X size={10} weight="regular" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
}

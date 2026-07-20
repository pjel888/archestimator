"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Paperclip,
  Image as ImageIcon,
  TextB,
  TextItalic,
  TextUnderline,
  ListBullets,
  ListNumbers,
  LinkSimple,
  Quotes,
  Code,
  ArrowCounterClockwise,
  ArrowClockwise,
  X,
} from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/ui/cn";

export type SupportComposerDraft = {
  draftId: string;
  r2Key: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  isImage: boolean;
  previewUrl: string | null;
};

type SupportRichComposerProps = {
  id: string;
  placeholder?: string;
  disabled?: boolean;
  fromLabel: string;
  savedReplies?: Array<{ id: string; label: string; body: string }>;
  submitLabel?: string;
  pendingLabel?: string;
  isPending?: boolean;
  onSubmit: (payload: { html: string; text: string; drafts: SupportComposerDraft[] }) => void;
  className?: string;
};

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function htmlToText(html: string) {
  return html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/\s*p\s*>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .trim();
}

async function uploadDraft(file: File): Promise<SupportComposerDraft> {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch("/api/admin/support/uploads", {
    method: "POST",
    body: form,
  });
  const payload = (await response.json()) as SupportComposerDraft & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || "Upload failed.");
  }
  return {
    draftId: payload.draftId,
    r2Key: payload.r2Key,
    filename: payload.filename,
    contentType: payload.contentType,
    sizeBytes: payload.sizeBytes,
    isImage: payload.isImage,
    previewUrl: payload.previewUrl,
  };
}

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-6 w-6 items-center justify-center rounded-xs text-secondary transition",
        active ? "bg-surfaceMuted text-ink" : "hover:bg-surfaceMuted hover:text-ink",
        disabled && "opacity-40",
      )}
    >
      {children}
    </button>
  );
}

export function SupportRichComposer({
  id,
  placeholder = "Write your message…",
  disabled = false,
  fromLabel,
  savedReplies = [],
  submitLabel = "Send",
  pendingLabel = "Sending",
  isPending = false,
  onSubmit,
  className,
}: SupportRichComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [drafts, setDrafts] = useState<SupportComposerDraft[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      Placeholder.configure({ placeholder }),
    ],
    editable: !disabled && !isPending,
    editorProps: {
      attributes: {
        id,
        class:
          "support-composer-prose min-h-28 max-h-56 overflow-auto px-2 py-1.5 text-[11px] leading-4 text-ink outline-none",
        "aria-label": "Message body",
      },
      handlePaste(_view, event) {
        const files = Array.from(event.clipboardData?.files ?? []);
        if (files.length === 0) return false;
        event.preventDefault();
        void addFiles(files);
        return true;
      },
      handleDrop(_view, event) {
        const files = Array.from(event.dataTransfer?.files ?? []);
        if (files.length === 0) return false;
        event.preventDefault();
        void addFiles(files);
        return true;
      },
      handleKeyDown(_view, event) {
        if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
          event.preventDefault();
          submitCurrent();
          return true;
        }
        return false;
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled && !isPending);
  }, [disabled, editor, isPending]);

  async function addFiles(files: File[]) {
    if (files.length === 0) return;
    setUploadError(null);
    setUploading(true);
    try {
      const next: SupportComposerDraft[] = [];
      for (const file of files.slice(0, 10)) {
        next.push(await uploadDraft(file));
      }
      setDrafts((current) => [...current, ...next].slice(0, 10));
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function removeDraft(draftId: string) {
    setDrafts((current) => current.filter((draft) => draft.draftId !== draftId));
  }

  function insertSavedReply(body: string) {
    if (!editor) return;
    const html = body
      .split(/\n{2,}/)
      .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br>")}</p>`)
      .join("");
    editor.commands.insertContent(html);
    editor.commands.focus("end");
  }

  function setLink() {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const next = window.prompt("Link URL", previous || "https://");
    if (next === null) return;
    if (!next.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: next.trim() }).run();
  }

  function submitCurrent() {
    if (!editor || disabled || isPending || uploading) return;
    const html = editor.getHTML();
    const text = htmlToText(html);
    if (!text && drafts.length === 0) return;
    onSubmit({ html, text: text || "(attachment)", drafts });
  }

  return (
    <div
      className={cn(
        "rounded-xs border border-hairline bg-white",
        dragOver && "border-ink bg-surfaceMuted/40",
        className,
      )}
      onDragEnter={(event) => {
        event.preventDefault();
        setDragOver(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => setDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragOver(false);
        void addFiles(Array.from(event.dataTransfer.files ?? []));
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline px-2 py-1">
        <p className="text-[9px] font-medium uppercase leading-3 text-tertiary">From {fromLabel}</p>
        {savedReplies.length > 0 && (
          <label className="text-[9px] leading-3 text-tertiary" htmlFor={`${id}-saved`}>
            Saved reply
            <select
              id={`${id}-saved`}
              className="ml-1 rounded-xs border border-hairline bg-white px-1 py-0.5 text-[10px]"
              defaultValue=""
              disabled={disabled || isPending}
              onChange={(event) => {
                const value = event.currentTarget.value;
                if (value) insertSavedReply(value);
                event.currentTarget.value = "";
              }}
            >
              <option value="">Insert…</option>
              {savedReplies.map((saved) => (
                <option key={saved.id} value={saved.body}>
                  {saved.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-0.5 border-b border-hairline px-1.5 py-1">
        <ToolbarButton
          label="Bold"
          active={editor?.isActive("bold")}
          disabled={!editor || disabled || isPending}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <TextB size={12} />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={editor?.isActive("italic")}
          disabled={!editor || disabled || isPending}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <TextItalic size={12} />
        </ToolbarButton>
        <ToolbarButton
          label="Underline"
          active={editor?.isActive("underline")}
          disabled={!editor || disabled || isPending}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        >
          <TextUnderline size={12} />
        </ToolbarButton>
        <ToolbarButton
          label="Bullet list"
          active={editor?.isActive("bulletList")}
          disabled={!editor || disabled || isPending}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <ListBullets size={12} />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          active={editor?.isActive("orderedList")}
          disabled={!editor || disabled || isPending}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListNumbers size={12} />
        </ToolbarButton>
        <ToolbarButton
          label="Quote"
          active={editor?.isActive("blockquote")}
          disabled={!editor || disabled || isPending}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        >
          <Quotes size={12} />
        </ToolbarButton>
        <ToolbarButton
          label="Inline code"
          active={editor?.isActive("code")}
          disabled={!editor || disabled || isPending}
          onClick={() => editor?.chain().focus().toggleCode().run()}
        >
          <Code size={12} />
        </ToolbarButton>
        <ToolbarButton label="Link" active={editor?.isActive("link")} disabled={!editor || disabled || isPending} onClick={setLink}>
          <LinkSimple size={12} />
        </ToolbarButton>
        <span className="mx-1 h-3 w-px bg-hairline" aria-hidden />
        <ToolbarButton
          label="Undo"
          disabled={!editor || disabled || isPending || !editor.can().undo()}
          onClick={() => editor?.chain().focus().undo().run()}
        >
          <ArrowCounterClockwise size={12} />
        </ToolbarButton>
        <ToolbarButton
          label="Redo"
          disabled={!editor || disabled || isPending || !editor.can().redo()}
          onClick={() => editor?.chain().focus().redo().run()}
        >
          <ArrowClockwise size={12} />
        </ToolbarButton>
        <span className="mx-1 h-3 w-px bg-hairline" aria-hidden />
        <ToolbarButton
          label="Attach files"
          disabled={disabled || isPending || uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip size={12} />
        </ToolbarButton>
        <ToolbarButton
          label="Attach images"
          disabled={disabled || isPending || uploading}
          onClick={() => imageInputRef.current?.click()}
        >
          <ImageIcon size={12} />
        </ToolbarButton>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          onChange={(event) => {
            void addFiles(Array.from(event.currentTarget.files ?? []));
            event.currentTarget.value = "";
          }}
        />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          multiple
          onChange={(event) => {
            void addFiles(Array.from(event.currentTarget.files ?? []));
            event.currentTarget.value = "";
          }}
        />
        <span className="ml-auto text-[9px] leading-3 text-tertiary">
          {uploading ? "Uploading…" : "⌘↵ send · drop files"}
        </span>
      </div>

      <EditorContent editor={editor} />

      {drafts.length > 0 && (
        <ul className="flex flex-wrap gap-1 border-t border-hairline px-2 py-1.5" aria-label="Attachments">
          {drafts.map((draft) => (
            <li
              key={draft.draftId}
              className="flex max-w-full items-center gap-1 rounded-xs border border-hairline bg-surfaceMuted/50 px-1.5 py-1"
            >
              {draft.isImage && draft.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={draft.previewUrl} alt="" className="h-6 w-6 rounded-xs object-cover" />
              ) : (
                <Paperclip size={10} className="text-tertiary" />
              )}
              <span className="truncate text-[9px] leading-3 text-ink">
                {draft.filename}
                <span className="text-tertiary"> · {formatBytes(draft.sizeBytes)}</span>
              </span>
              <button
                type="button"
                className="text-tertiary hover:text-ink"
                aria-label={`Remove ${draft.filename}`}
                onClick={() => removeDraft(draft.draftId)}
              >
                <X size={10} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {(uploadError || dragOver) && (
        <p className="border-t border-hairline px-2 py-1 text-[9px] leading-3 text-tertiary" role="status">
          {uploadError ?? "Drop files to attach"}
        </p>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-hairline px-2 py-1.5">
        <p className="text-[9px] leading-3 text-tertiary">
          Formatted HTML email with file and image attachments.
        </p>
        <Button
          type="button"
          variant="outline"
          size="xs"
          disabled={
            disabled ||
            isPending ||
            uploading ||
            (!editor?.getText().trim() && drafts.length === 0)
          }
          onClick={submitCurrent}
        >
          {isPending ? pendingLabel : submitLabel}
        </Button>
      </div>
    </div>
  );
}

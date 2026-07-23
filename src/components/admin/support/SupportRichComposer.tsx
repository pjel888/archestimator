"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  attachmentId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  isImage: boolean;
  previewUrl: string | null;
};

type PersistedSupportDraft = {
  id: string;
  revision: number;
  body_html?: string | null;
};

type SupportComposerDraftFields = {
  to_json?: string | null;
  cc_json?: string | null;
  subject?: string | null;
  from_identity_id?: string | null;
};

type SupportDraftSnapshot = SupportComposerDraftFields & {
  body_html: string | null;
  body_text: string | null;
};

type SupportRichComposerProps = {
  id: string;
  placeholder?: string;
  disabled?: boolean;
  fromLabel: string;
  draftId: string;
  draftKind: "reply" | "new_email";
  conversationId?: string;
  savedReplies?: Array<{ id: string; label: string; body: string }>;
  submitLabel?: string;
  pendingLabel?: string;
  isPending?: boolean;
  onSubmit: (payload: { draftScopeKey: string; html: string; text: string; drafts: SupportComposerDraft[] }) => void;
  onDiscard?: () => void;
  draftFields?: SupportComposerDraftFields;
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

async function uploadDraft(file: File, draftId: string, draftKind: "reply" | "new_email", conversationId?: string): Promise<SupportComposerDraft> {
  const form = new FormData();
  form.append("file", file);
  form.append("draftId", draftId);
  form.append("kind", draftKind);
  if (conversationId) form.append("conversationId", conversationId);
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
    attachmentId: payload.attachmentId,
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
        "inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-xs text-secondary transition md:h-6 md:w-6",
        active ? "bg-surfaceMuted text-ink" : "hover:bg-surfaceMuted hover:text-ink",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      <span className="pointer-events-none inline-flex items-center justify-center">{children}</span>
    </button>
  );
}

export function SupportRichComposer({
  id,
  placeholder = "Write your message…",
  disabled = false,
  fromLabel,
  draftId,
  draftKind,
  conversationId,
  savedReplies = [],
  submitLabel = "Send",
  pendingLabel = "Sending",
  isPending = false,
  onSubmit,
  onDiscard,
  draftFields,
  className,
}: SupportRichComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [drafts, setDrafts] = useState<SupportComposerDraft[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [draftStatus, setDraftStatus] = useState<"idle" | "saving" | "saved" | "conflict" | "degraded">("idle");
  const [draftContent, setDraftContent] = useState({ bodyHtml: "", bodyText: "" });
  const [linkEditorOpen, setLinkEditorOpen] = useState(false);
  const [linkHref, setLinkHref] = useState("");
  const [persistedDraftId, setPersistedDraftId] = useState<string | null>(null);
  const persistedDraftRef = useRef<PersistedSupportDraft | null>(null);
  const draftSaveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const draftBlockedRef = useRef(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        link: false,
        underline: false,
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
    onUpdate: ({ editor: nextEditor }) => {
      const html = nextEditor.getHTML();
      setDraftContent({ bodyHtml: html, bodyText: htmlToText(html) });
    },
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

  useEffect(() => {
    let cancelled = false;
    persistedDraftRef.current = null;
    draftBlockedRef.current = false;
    void fetch("/api/admin/support/drafts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scopeKey: draftId, kind: draftKind, conversationId }),
    }).then(async (response) => {
      const payload = await response.json() as { draft?: PersistedSupportDraft };
      if (!response.ok || !payload.draft || cancelled) {
        if (!cancelled) setDraftStatus("degraded");
        return;
      }
      persistedDraftRef.current = payload.draft;
      setPersistedDraftId(payload.draft.id);
      if (payload.draft.body_html && editor?.isEmpty) {
        editor.commands.setContent(payload.draft.body_html);
        setDraftContent({ bodyHtml: payload.draft.body_html, bodyText: htmlToText(payload.draft.body_html) });
      }
      setDraftStatus("saved");
    }).catch(() => {
      if (!cancelled) setDraftStatus("degraded");
    });
    return () => { cancelled = true; };
  }, [conversationId, draftId, draftKind, editor]);

  const enqueueDraftSave = useCallback((snapshot: SupportDraftSnapshot) => {
    const expectedDraftId = persistedDraftRef.current?.id;
    if (!expectedDraftId) return Promise.resolve(false);

    const task = draftSaveQueueRef.current.then(async () => {
      const persisted = persistedDraftRef.current;
      if (!persisted || persisted.id !== expectedDraftId || draftBlockedRef.current) return false;
      setDraftStatus("saving");
      try {
        const response = await fetch(`/api/admin/support/drafts/${persisted.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            revision: persisted.revision,
            ...snapshot,
          }),
        });
        const payload = await response.json() as { draft?: PersistedSupportDraft };
        if (response.status === 409) {
          draftBlockedRef.current = true;
          setDraftStatus("conflict");
          return false;
        }
        if (!response.ok || !payload.draft) {
          setDraftStatus("degraded");
          return false;
        }
        persistedDraftRef.current = payload.draft;
        setDraftStatus("saved");
        return true;
      } catch {
        setDraftStatus("degraded");
        return false;
      }
    });

    draftSaveQueueRef.current = task.then(() => undefined, () => undefined);
    return task;
  }, []);

  useEffect(() => {
    if (!persistedDraftId || draftBlockedRef.current) return;
    const timer = window.setTimeout(() => {
      void enqueueDraftSave({
        body_html: draftContent.bodyHtml || null,
        body_text: draftContent.bodyText || null,
        ...draftFields,
      });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [draftContent.bodyHtml, draftContent.bodyText, draftFields, enqueueDraftSave, persistedDraftId]);

  async function addFiles(files: File[]) {
    if (files.length === 0) return;
    setUploadError(null);
    setUploading(true);
    try {
      const next: SupportComposerDraft[] = [];
      for (const file of files.slice(0, 10)) {
        next.push(await uploadDraft(file, draftId, draftKind, conversationId));
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

  function openLinkEditor() {
    if (!editor) return;
    setLinkHref((editor.getAttributes("link").href as string | undefined) || "https://");
    setLinkEditorOpen(true);
  }

  function applyLink() {
    if (!editor) return;
    if (!linkHref.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setLinkEditorOpen(false);
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: linkHref.trim() }).run();
    setLinkEditorOpen(false);
  }

  async function persistCurrentDraft(html: string, text: string) {
    return enqueueDraftSave({
      body_html: html || null,
      body_text: text || null,
      ...draftFields,
    });
  }

  async function submitCurrent() {
    if (!editor || disabled || isPending || uploading) return;
    const html = editor.getHTML();
    const text = htmlToText(html);
    if (!text && drafts.length === 0) return;
    if (!await persistCurrentDraft(html, text || "(attachment)")) return;
    onSubmit({ draftScopeKey: draftId, html, text: text || "(attachment)", drafts });
  }

  async function discardCurrentDraft() {
    const persisted = persistedDraftRef.current;
    if (!persisted || disabled || isPending) return;
    setDraftStatus("saving");
    try {
      const response = await fetch(`/api/admin/support/drafts/${persisted.id}`, { method: "DELETE" });
      if (!response.ok) {
        setDraftStatus("degraded");
        return;
      }
      editor?.commands.clearContent();
      setDrafts([]);
      onDiscard?.();
    } catch {
      setDraftStatus("degraded");
    }
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
      <div className="flex flex-col gap-1.5 border-b border-hairline px-2 py-1.5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[9px] font-medium leading-3 text-secondary">From {fromLabel}</p>
        {savedReplies.length > 0 && (
          <label className="flex items-center justify-between gap-2 text-[9px] leading-3 text-tertiary" htmlFor={`${id}-saved`}>
            Saved reply
            <select
              id={`${id}-saved`}
              className="h-7 min-w-32 rounded-xs border border-hairline bg-white px-2 text-[10px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-focus"
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

      <div className="flex flex-wrap items-center gap-0.5 border-b border-hairline px-1.5 py-1.5 md:py-1">
        <ToolbarButton
          label="Bold"
          active={editor?.isActive("bold")}
          disabled={!editor || disabled || isPending}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <TextB size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={editor?.isActive("italic")}
          disabled={!editor || disabled || isPending}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <TextItalic size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Underline"
          active={editor?.isActive("underline")}
          disabled={!editor || disabled || isPending}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        >
          <TextUnderline size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Bullet list"
          active={editor?.isActive("bulletList")}
          disabled={!editor || disabled || isPending}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <ListBullets size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          active={editor?.isActive("orderedList")}
          disabled={!editor || disabled || isPending}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListNumbers size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Quote"
          active={editor?.isActive("blockquote")}
          disabled={!editor || disabled || isPending}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        >
          <Quotes size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Inline code"
          active={editor?.isActive("code")}
          disabled={!editor || disabled || isPending}
          onClick={() => editor?.chain().focus().toggleCode().run()}
        >
          <Code size={16} />
        </ToolbarButton>
        <ToolbarButton label="Link" active={editor?.isActive("link")} disabled={!editor || disabled || isPending} onClick={openLinkEditor}>
          <LinkSimple size={16} />
        </ToolbarButton>
        <span className="mx-1 h-3 w-px bg-hairline" aria-hidden />
        <ToolbarButton
          label="Undo"
          disabled={!editor || disabled || isPending || !editor.can().undo()}
          onClick={() => editor?.chain().focus().undo().run()}
        >
          <ArrowCounterClockwise size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Redo"
          disabled={!editor || disabled || isPending || !editor.can().redo()}
          onClick={() => editor?.chain().focus().redo().run()}
        >
          <ArrowClockwise size={16} />
        </ToolbarButton>
        <span className="mx-1 h-3 w-px bg-hairline" aria-hidden />
        <ToolbarButton
          label="Attach files"
          disabled={disabled || isPending || uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Attach images"
          disabled={disabled || isPending || uploading}
          onClick={() => imageInputRef.current?.click()}
        >
          <ImageIcon size={16} />
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
        <span className="ml-auto hidden text-[9px] leading-3 text-tertiary sm:inline">
          {uploading ? "Uploading…" : draftStatus === "saving" ? "Saving…" : draftStatus === "saved" ? "Saved" : draftStatus === "conflict" ? "Draft conflict" : draftStatus === "degraded" ? "Draft storage unavailable" : "⌘↵ send · drop files"}
        </span>
      </div>

      {linkEditorOpen && (
        <form
          className="flex items-center gap-1 border-b border-hairline px-2 py-1"
          onSubmit={(event) => {
            event.preventDefault();
            applyLink();
          }}
        >
          <label className="sr-only" htmlFor={`${id}-link-url`}>Link URL</label>
          <input
            id={`${id}-link-url`}
            value={linkHref}
            onChange={(event) => setLinkHref(event.currentTarget.value)}
            className="min-w-0 flex-1 rounded-xs border border-hairline px-1.5 py-0.5 text-[9px]"
            placeholder="https://"
            autoFocus
          />
          <Button type="submit" size="xs" variant="outline">Apply</Button>
          <Button type="button" size="xs" variant="ghost" onClick={() => setLinkEditorOpen(false)}>Cancel</Button>
        </form>
      )}

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
                className="inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-xs text-tertiary transition hover:bg-surfaceMuted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                aria-label={`Remove ${draft.filename}`}
                onClick={() => removeDraft(draft.draftId)}
              >
                <X size={16} className="pointer-events-none" aria-hidden />
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

      <div className="flex flex-col gap-2 border-t border-hairline px-2 py-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[9px] leading-3 text-tertiary">
          Autosaved draft · Attachments supported
        </p>
        <div className="grid grid-cols-2 gap-1 sm:flex sm:items-center">
          {onDiscard ? <Button type="button" variant="ghost" size="xs" disabled={disabled || isPending || uploading || draftStatus !== "saved"} onClick={discardCurrentDraft}>Discard</Button> : null}
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
    </div>
  );
}

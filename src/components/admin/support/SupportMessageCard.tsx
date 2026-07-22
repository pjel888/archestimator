"use client";

import { Paperclip } from "@phosphor-icons/react";

import { formatAdminMessageTime } from "@/lib/admin/datetime";
import { sanitizeSupportHtml } from "@/lib/email/support-email-html";
import { cn } from "@/lib/ui/cn";
import type { SupportAttachmentRow, SupportMessageRow } from "@/lib/repositories/support-conversations-d1";

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function sendStatusLabel(status: SupportMessageRow["send_status"], transport: SupportMessageRow["transport"]) {
  if (transport !== "email") return status === "sent" ? "Recorded" : status;
  if (status === "sent") return "Accepted";
  if (status === "pending") return "Pending";
  if (status === "send_failed") return "Failed";
  return status;
}

type SupportMessageCardProps = {
  message: SupportMessageRow;
  attachments: SupportAttachmentRow[];
};

export function SupportMessageCard({ message, attachments }: SupportMessageCardProps) {
  const isAdmin = message.sender_role === "admin";
  const isEmail = message.transport === "email";
  const html = message.body_html ? sanitizeSupportHtml(message.body_html) : null;
  let warning: { flags?: string[] } | null = null;
  if (message.warning_flags_json) {
    try {
      warning = JSON.parse(message.warning_flags_json) as { flags?: string[] };
    } catch {
      warning = null;
    }
  }

  return (
    <article
      className={cn(
        "mb-2 rounded-xs border border-hairline p-2.5",
        isEmail ? "w-full bg-white" : "max-w-[88%]",
        !isEmail && (isAdmin ? "ml-auto bg-surfaceMuted" : "mr-auto bg-white"),
      )}
    >
      <header className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-1.5 text-[9px] leading-3 text-tertiary">
        <span className="font-medium text-secondary">
          {isAdmin
            ? "You"
            : message.from_name || message.from_address || (message.sender_role === "user" ? "User" : message.sender_role)}
          {message.transport === "email" ? " · Email" : " · In-app"}
          {message.direction !== "internal" ? ` · ${message.direction}` : ""}
        </span>
        <span>
          {sendStatusLabel(message.send_status, message.transport)} · {formatAdminMessageTime(message.created_at)}
        </span>
      </header>

      {html ? (
        <div
          className="support-message-html text-[11px] leading-4 text-ink [&_a]:underline [&_blockquote]:border-l [&_blockquote]:border-hairline [&_blockquote]:pl-2 [&_blockquote]:text-secondary [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:mb-1.5 [&_ul]:list-disc [&_ul]:pl-4"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre className="whitespace-pre-wrap font-sans text-[11px] leading-4 text-ink">{message.body_text}</pre>
      )}

      {warning?.flags && warning.flags.length > 0 && (
        <p className="mt-1 text-[9px] leading-3 text-tertiary">Warning: {warning.flags.join(", ")}</p>
      )}

      {attachments.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1" aria-label="Attachments">
          {attachments.map((attachment) => {
            const isImage = (attachment.content_type ?? "").startsWith("image/");
            const canOpen = attachment.storage_status === "stored";
            const href = `/api/admin/support/attachments/${attachment.id}`;
            return (
              <li key={attachment.id}>
                {canOpen ? (
                  <a
                    href={href}
                    className="inline-flex items-center gap-1 rounded-xs border border-hairline bg-white px-1.5 py-1 text-[9px] leading-3 text-ink hover:bg-surfaceMuted"
                  >
                    {isImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={href} alt="" className="h-8 w-8 rounded-xs object-cover" />
                    ) : (
                      <Paperclip size={10} className="text-tertiary" />
                    )}
                    <span>
                      {attachment.filename}
                      <span className="text-tertiary"> · {formatBytes(attachment.size_bytes)}</span>
                    </span>
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-xs border border-dashed border-hairline px-1.5 py-1 text-[9px] leading-3 text-tertiary">
                    {attachment.filename} — {attachment.storage_status}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}

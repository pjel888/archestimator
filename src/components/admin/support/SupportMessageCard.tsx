"use client";

import { Paperclip } from "@phosphor-icons/react";

import { formatAdminMessageTime } from "@/lib/admin/datetime";
import { Button } from "@/components/ui/button";
import { sanitizeSupportHtml } from "@/lib/email/support-email-html";
import { cn } from "@/lib/ui/cn";
import type {
  SupportAttachmentRow,
  SupportMessageContextRow,
  SupportMessageRow,
} from "@/lib/repositories/support-conversations-d1";

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
  context: SupportMessageContextRow | null;
  onRetryAttachments: () => void;
};

export function SupportMessageCard({
  message,
  attachments,
  context,
  onRetryAttachments,
}: SupportMessageCardProps) {
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

      {context ? (
        <details className="mt-2 rounded-xs border border-hairline bg-surfaceMuted/45 px-2 py-1.5">
          <summary className="min-h-6 cursor-pointer text-[9px] font-medium leading-6 text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
            Included details
          </summary>
          <dl className="grid gap-x-3 gap-y-1 border-t border-hairline pt-1.5 text-[9px] leading-3 sm:grid-cols-[7rem_minmax(0,1fr)]">
            <dt className="text-tertiary">Message reference</dt>
            <dd className="break-all text-secondary">{message.id}</dd>
            <dt className="text-tertiary">Route</dt>
            <dd className="break-all text-secondary">{context.route_template}</dd>
            <dt className="text-tertiary">Optional diagnostics</dt>
            <dd className="text-secondary">{context.diagnostics_shared ? "Shared" : "Not shared"}</dd>
            {context.diagnostics_shared ? (
              <>
                {context.workspace_id ? <><dt className="text-tertiary">Workspace</dt><dd className="break-all text-secondary">{context.workspace_id}</dd></> : null}
                {context.project_id ? <><dt className="text-tertiary">Project</dt><dd className="break-all text-secondary">{context.project_id}</dd></> : null}
                {context.estimate_id ? <><dt className="text-tertiary">Estimate</dt><dd className="break-all text-secondary">{context.estimate_id}</dd></> : null}
                {context.viewport_width && context.viewport_height ? <><dt className="text-tertiary">Viewport</dt><dd className="text-secondary">{context.viewport_width} × {context.viewport_height}</dd></> : null}
                {context.timezone ? <><dt className="text-tertiary">Timezone</dt><dd className="text-secondary">{context.timezone}</dd></> : null}
                {context.browser_family || context.os_family ? <><dt className="text-tertiary">Browser / OS</dt><dd className="text-secondary">{[context.browser_family, context.os_family].filter(Boolean).join(" / ")}</dd></> : null}
                {context.app_release ? <><dt className="text-tertiary">App release</dt><dd className="break-all text-secondary">{context.app_release}</dd></> : null}
              </>
            ) : null}
          </dl>
        </details>
      ) : null}

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
                  <div className="flex items-center gap-1 rounded-xs border border-dashed border-hairline px-1.5 py-1 text-[9px] leading-3 text-tertiary">
                    <span>{attachment.filename} is unavailable ({attachment.storage_status}). The message remains available.</span>
                    <Button type="button" variant="ghost" size="xs" className="min-h-6 px-1.5" onClick={onRetryAttachments}>
                      Retry
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}

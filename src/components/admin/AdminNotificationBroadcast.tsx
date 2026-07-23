"use client";

import { useState, useTransition } from "react";

import { broadcastNotification } from "@/lib/admin/notification-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const KINDS = [
  { value: "system_notice", label: "System notice" },
  { value: "release_announcement", label: "Release announcement" },
  { value: "security_notice", label: "Security alert" },
  { value: "beta_feedback", label: "Beta feedback request" },
];

const SEVERITIES = ["info", "success", "warning", "critical"];
const SURFACES = [
  { value: "toast_and_center", label: "Toast + notification center" },
  { value: "center", label: "Notification center only" },
  { value: "modal", label: "Modal (release announcements)" },
];

export function AdminNotificationBroadcast() {
  const [kind, setKind] = useState("system_notice");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [severity, setSeverity] = useState("info");
  const [surface, setSurface] = useState("toast_and_center");
  const [actionLabel, setActionLabel] = useState("");
  const [actionHref, setActionHref] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setResult(null);
    startTransition(async () => {
      const res = await broadcastNotification({
        kind,
        title,
        body,
        severity,
        surface,
        actionLabel: actionLabel || undefined,
        actionHref: actionHref || undefined,
      });
      if (res.ok) {
        setResult(`Sent to ${res.deliveryCount} active users (notification ${res.notificationId.slice(0, 8)}…).`);
        setTitle("");
        setBody("");
        setActionLabel("");
        setActionHref("");
      } else {
        const messages: Record<string, string> = {
          validation: "Invalid input. Check field lengths and use a /workshop action link.",
          d1_unavailable: "Database is unavailable.",
          failed: "Broadcast failed. Check the audit log.",
        };
        setResult(messages[res.error] ?? "Broadcast failed.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="grid gap-2 md:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-[9px] font-medium uppercase leading-3 text-tertiary">Type</span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="rounded-xs border border-hairline px-2 py-1 text-[11px] text-ink"
          >
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>{k.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[9px] font-medium uppercase leading-3 text-tertiary">Severity</span>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="rounded-xs border border-hairline px-2 py-1 text-[11px] text-ink"
          >
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-[9px] font-medium uppercase leading-3 text-tertiary">Title (max 120)</span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          required
          className="rounded-xs border border-hairline px-2 py-1 text-[11px] text-ink"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[9px] font-medium uppercase leading-3 text-tertiary">Body (max 2000)</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          required
          rows={4}
          className="rounded-xs border border-hairline px-2 py-1 text-[11px] text-ink"
        />
      </label>

      <div className="grid gap-2 md:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-[9px] font-medium uppercase leading-3 text-tertiary">Surface</span>
          <select
            value={surface}
            onChange={(e) => setSurface(e.target.value)}
            className="rounded-xs border border-hairline px-2 py-1 text-[11px] text-ink"
          >
            {SURFACES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[9px] font-medium uppercase leading-3 text-tertiary">Action label (optional)</span>
          <input
            type="text"
            value={actionLabel}
            onChange={(e) => {
              setActionLabel(e.target.value);
              if (!e.target.value) setActionHref("");
            }}
            maxLength={40}
            placeholder="e.g. View changes"
            className="rounded-xs border border-hairline px-2 py-1 text-[11px] text-ink"
          />
        </label>
      </div>

      {actionLabel && (
        <label className="flex flex-col gap-1">
          <span className="text-[9px] font-medium uppercase leading-3 text-tertiary">Action link (must start with /workshop)</span>
          <input
            type="text"
            value={actionHref}
            onChange={(e) => setActionHref(e.target.value)}
            placeholder="/workshop/…"
            pattern="^/workshop(?:$|/.*)"
            required={Boolean(actionLabel)}
            className="rounded-xs border border-hairline px-2 py-1 text-[11px] text-ink"
          />
        </label>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button type="submit" disabled={isPending || !title || !body} className="min-h-9 w-full sm:w-auto">
          {isPending ? "Sending…" : "Broadcast to all active users"}
        </Button>
        {result && (
          <Badge tone={result.includes("Sent to") ? "success" : "warning"} size="xs" className="min-w-0 px-1">
            {result}
          </Badge>
        )}
      </div>
    </form>
  );
}

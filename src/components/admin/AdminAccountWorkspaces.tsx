"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LinkBreak } from "@phosphor-icons/react/dist/ssr";

import {
  linkWorkspaceAction,
  unlinkWorkspaceAction,
} from "@/lib/admin/corporate-account-actions";
import type {
  WorkspaceLinkCandidateRow,
  WorkspaceSummaryRow,
} from "@/lib/admin/corporate-account-repository";
import { Button } from "@/components/ui/button";

export function AdminAccountWorkspaces({
  accountId,
  workspaces,
  linkableWorkspaces,
}: {
  accountId: string;
  workspaces: WorkspaceSummaryRow[];
  linkableWorkspaces: WorkspaceLinkCandidateRow[];
}) {
  const router = useRouter();
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Workspaces not already linked to this account.
  const linkedIds = new Set(workspaces.map((w) => w.id));
  const available = linkableWorkspaces.filter((w) => !linkedIds.has(w.id));

  function handleLink(event: React.FormEvent) {
    event.preventDefault();
    setNotice(null);
    startTransition(async () => {
      const result = await linkWorkspaceAction({ workspaceId: selectedWorkspaceId, accountId });
      setNotice(result.ok ? "Workspace linked." : result.error);
      if (result.ok) {
        setSelectedWorkspaceId("");
        router.refresh();
      }
    });
  }

  function handleUnlink(workspaceId: string) {
    setNotice(null);
    startTransition(async () => {
      const result = await unlinkWorkspaceAction({ workspaceId });
      setNotice(result.ok ? "Workspace unlinked." : result.error);
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Link workspace */}
      {available.length > 0 && (
        <form onSubmit={handleLink} className="flex flex-wrap items-end gap-2">
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-[9px] font-medium uppercase leading-3 text-tertiary">Workspace</span>
            <select
              value={selectedWorkspaceId}
              onChange={(e) => setSelectedWorkspaceId(e.target.value)}
              className="rounded-xs border border-hairline px-2 py-1 text-[11px] text-ink"
            >
              <option value="">Select a workspace…</option>
              {available.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name} - {ws.corporate_account_id
                    ? `Move from ${ws.corporate_account_name ?? "another account"}`
                    : "No corporate account"}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" disabled={isPending || !selectedWorkspaceId}>
            Link workspace
          </Button>
        </form>
      )}

      {notice && <span className="text-[9px] leading-3 text-tertiary">{notice}</span>}

      {/* Workspaces list */}
      {workspaces.length === 0 ? (
        <p className="py-2 text-center text-[10px] text-tertiary">No linked workspaces.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-hairline">
              <th scope="col" className="px-2 py-1 text-left text-[9px] font-medium uppercase leading-3 text-tertiary">Name</th>
              <th scope="col" className="px-2 py-1 text-left text-[9px] font-medium uppercase leading-3 text-tertiary">Slug</th>
              <th scope="col" className="px-2 py-1 text-left text-[9px] font-medium uppercase leading-3 text-tertiary">Created</th>
              <th scope="col" className="px-2 py-1 text-right text-[9px] font-medium uppercase leading-3 text-tertiary"></th>
            </tr>
          </thead>
          <tbody>
            {workspaces.map((ws) => (
              <tr key={ws.id} className="border-b border-hairline">
                <td className="px-2 py-1 text-[10px] font-medium leading-4 text-ink">{ws.name}</td>
                <td className="px-2 py-1 text-[9px] leading-3 text-tertiary">{ws.slug ?? "—"}</td>
                <td className="px-2 py-1 text-[9px] leading-3 text-tertiary">
                  {new Date(ws.created_at).toLocaleDateString()}
                </td>
                <td className="px-2 py-1 text-right">
                  <Button
                    size="icon-xs"
                    variant="secondary"
                    disabled={isPending}
                    onClick={() => handleUnlink(ws.id)}
                    aria-label={`Unlink ${ws.name}`}
                    title="Unlink"
                  >
                    <LinkBreak aria-hidden size={13} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

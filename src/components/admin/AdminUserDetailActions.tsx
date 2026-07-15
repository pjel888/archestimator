"use client";

import { useState, useTransition } from "react";

import { banUser, reactivateUser, suspendUser } from "@/lib/admin/user-actions";
import { Button } from "@/components/ui/button";

export function AdminUserDetailActions({
  userId,
  email,
  currentStatus,
}: {
  userId: string;
  email: string;
  currentStatus: string;
}) {
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAction(action: "suspend" | "ban" | "reactivate") {
    setNotice(null);
    startTransition(async () => {
      const fn = action === "suspend" ? suspendUser : action === "ban" ? banUser : reactivateUser;
      const result = await fn(userId);
      if (!result.ok) {
        const messages: Record<string, string> = {
          self_target: "You cannot modify your own account.",
          protected_target: "Platform admins and the founder cannot be suspended or banned here.",
          validation: "Invalid user ID.",
          d1_unavailable: "Database is unavailable.",
          not_found: "User not found.",
          failed: "Action failed.",
        };
        setNotice(messages[result.error] ?? "Action failed.");
      } else {
        setNotice(`User ${action}ed successfully. Refresh to see the updated status.`);
      }
    });
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1">
      {currentStatus === "active" ? (
        <>
          <Button
            size="sm"
            variant="secondary"
            disabled={isPending}
            onClick={() => handleAction("suspend")}
            aria-label={`Suspend ${email}`}
          >
            Suspend
          </Button>
          <Button
            size="sm"
            variant="danger"
            disabled={isPending}
            onClick={() => handleAction("ban")}
            aria-label={`Ban ${email}`}
          >
            Ban
          </Button>
        </>
      ) : (
        <Button
          size="sm"
          variant="secondary"
          disabled={isPending}
          onClick={() => handleAction("reactivate")}
          aria-label={`Reactivate ${email}`}
        >
          Reactivate
        </Button>
      )}
      {notice && <span className="text-[9px] leading-3 text-tertiary">{notice}</span>}
    </div>
  );
}

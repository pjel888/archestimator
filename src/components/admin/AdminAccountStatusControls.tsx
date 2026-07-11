"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { updateCorporateAccountStatusAction } from "@/lib/admin/corporate-account-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function AdminAccountStatusControls({
  accountId,
  status,
  accountName,
}: {
  accountId: string;
  status: string;
  accountName: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleStatusChange(newStatus: string) {
    const verb = newStatus === "active" ? "reactivate" : newStatus === "suspended" ? "suspend" : "archive";
    const confirmed = window.confirm(
      `${verb.charAt(0).toUpperCase() + verb.slice(1)} "${accountName}"?` +
        (newStatus === "archived" ? "\n\nArchived accounts are hidden from the default list but can be restored." : ""),
    );
    if (!confirmed) return;

    startTransition(async () => {
      const result = await updateCorporateAccountStatusAction({ accountId, status: newStatus });
      if (result.ok) {
        router.refresh();
      } else {
        window.alert(result.error);
      }
    });
  }

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      <Badge
        tone={status === "active" ? "success" : status === "suspended" ? "warning" : "danger"}
        size="xs"
        className="min-w-0 px-1"
      >
        {status}
      </Badge>

      {status === "active" && (
        <>
          <Button
            size="sm"
            variant="secondary"
            disabled={isPending}
            onClick={() => handleStatusChange("suspended")}
            title="Temporarily disable the account"
          >
            Suspend
          </Button>
          <Button
            size="sm"
            variant="danger"
            disabled={isPending}
            onClick={() => handleStatusChange("archived")}
            title="Hide from the default list (reversible)"
          >
            Archive
          </Button>
        </>
      )}

      {status === "suspended" && (
        <>
          <Button
            size="sm"
            variant="secondary"
            disabled={isPending}
            onClick={() => handleStatusChange("active")}
          >
            Reactivate
          </Button>
          <Button
            size="sm"
            variant="danger"
            disabled={isPending}
            onClick={() => handleStatusChange("archived")}
          >
            Archive
          </Button>
        </>
      )}

      {status === "archived" && (
        <Button
          size="sm"
          variant="secondary"
          disabled={isPending}
          onClick={() => handleStatusChange("active")}
        >
          Restore
        </Button>
      )}
    </div>
  );
}

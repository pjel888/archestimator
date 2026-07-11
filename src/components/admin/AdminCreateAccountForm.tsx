"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createCorporateAccountAction } from "@/lib/admin/corporate-account-actions";
import { Button } from "@/components/ui/button";

export function AdminCreateAccountForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setNotice(null);
    startTransition(async () => {
      const result = await createCorporateAccountAction({ name, description });
      if (result.ok) {
        setNotice(`Account "${name}" created.`);
        setName("");
        setDescription("");
        router.refresh();
      } else {
        setNotice(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-1 flex-col gap-1">
        <span className="text-[9px] font-medium uppercase leading-3 text-tertiary">Name</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={200}
          required
          placeholder="e.g. ABC Construction Inc."
          className="rounded-xs border border-hairline px-2 py-1 text-[11px] text-ink"
        />
      </label>
      <label className="flex flex-1 flex-col gap-1">
        <span className="text-[9px] font-medium uppercase leading-3 text-tertiary">Description (optional)</span>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          placeholder="Brief description"
          className="rounded-xs border border-hairline px-2 py-1 text-[11px] text-ink"
        />
      </label>
      <Button type="submit" disabled={isPending || !name}>
        {isPending ? "Creating…" : "Create"}
      </Button>
      {notice && <span className="text-[9px] leading-3 text-tertiary">{notice}</span>}
    </form>
  );
}

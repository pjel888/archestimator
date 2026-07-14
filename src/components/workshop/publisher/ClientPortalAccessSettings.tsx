"use client";

import { useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { updateClientPortalAccessAction } from "@/lib/client-portal/access-actions";

export function ClientPortalAccessSettings({ accessEnabled: initialAccessEnabled, passwordEnabled, portalId, projectId }: { accessEnabled: boolean; passwordEnabled: boolean; portalId: string; projectId: string }) {
  const [accessEnabled, setAccessEnabled] = useState(initialAccessEnabled);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [passwordAction, setPasswordAction] = useState<"keep" | "remove" | "replace">("keep");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await updateClientPortalAccessAction({ accessEnabled, password: passwordAction === "replace" ? password : undefined, passwordAction, portalId, projectId });
        setPassword("");
        setPasswordAction("keep");
        setSaved(true);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Client Portal access could not be saved.");
      }
    });
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <label className="flex items-start gap-3 text-sm text-ink">
        <input checked={accessEnabled} className="mt-0.5" onChange={(event) => setAccessEnabled(event.target.checked)} type="checkbox" />
        <span><span className="block font-medium">Portal access enabled</span><span className="mt-0.5 block text-xs text-secondary">Turning access off invalidates existing recipient and password sessions.</span></span>
      </label>
      <label className="block text-sm text-ink">
        <span className="font-medium">Password</span>
        <select className="mt-1 block w-full rounded-md border border-hairline bg-white px-3 py-2 text-sm" onChange={(event) => setPasswordAction(event.target.value as "keep" | "remove" | "replace")} value={passwordAction}>
          <option value="keep">Keep {passwordEnabled ? "current password" : "portal open"}</option>
          <option value="replace">Set a new password</option>
          {passwordEnabled ? <option value="remove">Remove password</option> : null}
        </select>
      </label>
      {passwordAction === "replace" ? <label className="block text-sm text-ink"><span className="font-medium">New password</span><input autoComplete="new-password" className="mt-1 block w-full rounded-md border border-hairline bg-white px-3 py-2 text-sm" minLength={4} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /></label> : null}
      {error ? <p className="text-xs text-destructive" role="alert">{error}</p> : null}
      {saved ? <p className="text-xs text-secondary" role="status">Access settings saved. Existing sessions were invalidated when credentials changed.</p> : null}
      <Button disabled={pending} type="submit">{pending ? "Saving…" : "Save access"}</Button>
    </form>
  );
}

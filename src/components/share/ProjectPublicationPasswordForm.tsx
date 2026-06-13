"use client";

import { FormEvent, useState } from "react";

type ProjectPublicationPasswordFormProps = {
  token: string;
};

function createCsrfToken() {
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function ProjectPublicationPasswordForm({ token }: ProjectPublicationPasswordFormProps) {
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "invalid" | "error" | "locked">("idle");

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setStatus("submitting");
    const csrfToken = createCsrfToken();
    document.cookie = `ae_publication_csrf=${csrfToken}; Path=/; SameSite=Lax; Max-Age=3600`;
    const response = await fetch(`/api/share/${token}/password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-archestimator-csrf": csrfToken,
      },
      body: JSON.stringify({ password }),
    }).catch(() => null);

    if (response?.status === 204) {
      window.location.reload();
      return;
    }

    if (response?.status === 429) {
      setStatus("locked");
      return;
    }

    setStatus(response?.status === 401 ? "invalid" : "error");
  }

  const isLocked = status === "locked";
  const isSubmitting = status === "submitting";

  return (
    <form className="mt-4 grid gap-2" onSubmit={submitPassword}>
      <label className="grid gap-1 text-[13px] font-medium leading-[18px] tracking-normal text-secondary">
        Password
        <input
          className="h-9 border border-hairline bg-white px-2 text-[13px] leading-[18px] tracking-normal text-ink outline-none focus:border-secondary disabled:cursor-not-allowed disabled:opacity-60"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.currentTarget.value)}
          autoComplete="current-password"
          disabled={isSubmitting || isLocked}
        />
      </label>
      {status === "invalid" ? <p className="text-[13px] leading-[18px] tracking-normal text-danger">Password is invalid.</p> : null}
      {status === "error" ? <p className="text-[13px] leading-[18px] tracking-normal text-danger">Unable to unlock publication.</p> : null}
      {isLocked ? (
        <p className="text-[13px] leading-[18px] tracking-normal text-danger">Too many attempts. Please try again later.</p>
      ) : null}
      <button
        className="h-9 bg-ink px-3 text-[13px] font-medium leading-none tracking-normal text-white transition hover:bg-secondary disabled:cursor-wait disabled:opacity-60"
        type="submit"
        disabled={isSubmitting || isLocked}
      >
        Unlock
      </button>
    </form>
  );
}

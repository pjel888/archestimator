"use client";

import { FormEvent, useState } from "react";
import { Eye, EyeSlash } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";

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
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
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
  const feedbackId = "project-publication-password-feedback";
  const feedback =
    status === "invalid"
      ? "Password is invalid."
      : status === "error"
        ? "Unable to unlock publication."
        : isLocked
          ? "Too many attempts. Please try again later."
          : null;

  return (
    <form className="mt-4 grid gap-2" onSubmit={submitPassword}>
      <label className="grid gap-1 text-[13px] font-medium leading-[18px] tracking-normal text-secondary">
        Password
        <span className="flex h-9 border border-hairline bg-white focus-within:bg-accentSoft">
          <input
            className="min-w-0 flex-1 bg-transparent px-2 text-[13px] leading-[18px] tracking-normal text-ink outline-none disabled:cursor-not-allowed disabled:opacity-60"
            type={isPasswordVisible ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
            autoComplete="current-password"
            disabled={isSubmitting || isLocked}
            aria-invalid={feedback ? "true" : undefined}
            aria-describedby={feedback ? feedbackId : undefined}
          />
          <IconButton
            type="button"
            variant="plain"
            size="icon"
            className="grid w-9 cursor-pointer place-items-center text-secondary transition hover:bg-surfaceMuted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-60"
            label={isPasswordVisible ? "Hide entered value" : "Show entered value"}
            aria-pressed={isPasswordVisible}
            disabled={isSubmitting || isLocked}
            onClick={() => setIsPasswordVisible((visible) => !visible)}
            icon={isPasswordVisible ? <EyeSlash size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
          />
        </span>
      </label>
      <p className="text-[12px] leading-[16px] tracking-normal text-secondary">
        Don&apos;t have the password? Contact the sender who shared this proposal.
      </p>
      {feedback ? (
        <p id={feedbackId} role="alert" className="text-[13px] leading-[18px] tracking-normal text-danger">
          {feedback}
        </p>
      ) : null}
      <Button
        variant="plain"
        size="md"
        className="h-9 cursor-pointer bg-ink px-3 !text-[13px] font-medium leading-none tracking-normal text-white transition hover:bg-secondary disabled:cursor-wait disabled:opacity-60"
        type="submit"
        disabled={isSubmitting || isLocked}
      >
        Unlock
      </Button>
    </form>
  );
}

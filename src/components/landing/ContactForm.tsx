"use client";

import { useState, type FormEvent } from "react";
import { EnvelopeOpen } from "@phosphor-icons/react/dist/ssr";

const SUPPORT_EMAIL = "support@archestimator.com";

export type ContactIntent = "early-access" | "walkthrough" | "general";
type ContactInquiryType = ContactIntent | "feedback";

type SupportMailtoInput = {
  name: string;
  email: string;
  org: string;
  inquiryType: string;
  message: string;
};

const inquiryLabels: Record<ContactInquiryType, string> = {
  "early-access": "Early access request",
  walkthrough: "Product walkthrough request",
  feedback: "Product feedback",
  general: "General question",
};

function normalizeInquiryType(value: string): ContactInquiryType {
  if (value === "access") return "early-access";
  if (value === "demo") return "walkthrough";
  if (value === "feedback") return "feedback";
  if (value === "walkthrough") return "walkthrough";
  if (value === "early-access") return "early-access";
  return "general";
}

export function buildSupportMailto(input: SupportMailtoInput) {
  const inquiryType = normalizeInquiryType(input.inquiryType);
  const inquiryLabel = inquiryLabels[inquiryType];
  const subject = `Archestimator ${inquiryLabel}`;
  const body = [
    `Name: ${input.name.trim()}`,
    `Email: ${input.email.trim()}`,
    `Organization: ${input.org.trim() || "Not provided"}`,
    `Inquiry type: ${inquiryLabel}`,
    "",
    "Message:",
    input.message.trim(),
  ].join("\n");

  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function ContactForm({ initialIntent = "early-access" }: { initialIntent?: ContactIntent }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [org, setOrg] = useState("");
  const [inquiryType, setInquiryType] = useState<ContactInquiryType>(initialIntent);
  const [message, setMessage] = useState("");
  const [mailtoLink, setMailtoLink] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!name.trim() || !email.trim() || !message.trim()) {
      setErrorMsg("Please fill out all required fields.");
      return;
    }

    const nextMailtoLink = buildSupportMailto({ name, email, org, inquiryType, message });
    setMailtoLink(nextMailtoLink);
    window.open(nextMailtoLink, "_self");
  };

  if (mailtoLink) {
    return (
      <div
        className="rounded-[12px] border border-[#cfcfca] bg-[#f5f5f3] p-8 text-center shadow-sm"
        role="alert"
        aria-live="polite"
      >
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
          <EnvelopeOpen className="size-7" weight="bold" />
        </div>
        <h2 className="mt-5 text-[22px] font-semibold tracking-normal text-[#111111]">
          Support email draft prepared
        </h2>
        <p className="mt-3 text-[14px] leading-6 text-[#626260]">
          Your email app should open a draft addressed to <strong>{SUPPORT_EMAIL}</strong>. Send that draft to request access, book a walkthrough, or share workflow feedback.
        </p>
        <p className="mt-2 text-[12px] leading-5 text-[#626260]">
          If the draft did not open, email <strong>{SUPPORT_EMAIL}</strong> directly and include the account email plus project or estimate context.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href={mailtoLink}
            className="inline-flex min-h-10 items-center justify-center rounded-[5px] bg-[#17181c] px-5 text-[11px] font-bold uppercase tracking-normal text-white transition hover:bg-[#2a2b30] active:scale-95"
          >
            Open email draft
          </a>
          <button
            type="button"
            onClick={() => {
              setMailtoLink("");
              setName("");
              setEmail("");
              setOrg("");
              setInquiryType(initialIntent);
              setMessage("");
            }}
            className="inline-flex min-h-10 items-center justify-center rounded-[5px] border border-[#cfcfca] bg-white px-5 text-[11px] font-bold uppercase tracking-normal text-[#17181c] transition hover:bg-[#eeeeec] active:scale-95"
          >
            Start another message
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[12px] border border-[#cfcfca] bg-[#f5f5f3] p-6 shadow-sm sm:p-8"
      noValidate
    >
      <h2 className="text-[20px] font-semibold tracking-normal text-[#111111]">
        Send a message
      </h2>
      <p className="mt-1 text-[13px] text-[#626260]">
        This form opens a support email draft. Nothing is stored until you send it.
      </p>

      {errorMsg ? (
        <div
          className="mt-5 rounded-[6px] border border-red-500/15 bg-red-500/5 p-3 text-[13px] font-medium text-red-600"
          role="alert"
        >
          {errorMsg}
        </div>
      ) : null}

      <div className="mt-6 space-y-5">
        <div>
          <label
            htmlFor="contact-name"
            className="block text-[12px] font-semibold uppercase tracking-normal text-[#111111]"
          >
            Full name <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="contact-name"
            type="text"
            required
            aria-required="true"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="mt-2 min-h-10 w-full rounded-[6px] border border-[#cfcfca] bg-white px-3 text-[14px] text-[#111111] outline-none transition placeholder:text-[#a6a6a4] focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
          />
        </div>

        <div>
          <label
            htmlFor="contact-email"
            className="block text-[12px] font-semibold uppercase tracking-normal text-[#111111]"
          >
            Email address <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="contact-email"
            type="email"
            required
            aria-required="true"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="mt-2 min-h-10 w-full rounded-[6px] border border-[#cfcfca] bg-white px-3 text-[14px] text-[#111111] outline-none transition placeholder:text-[#a6a6a4] focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
          />
        </div>

        <div>
          <label
            htmlFor="contact-org"
            className="block text-[12px] font-semibold uppercase tracking-normal text-[#111111]"
          >
            Organization
          </label>
          <input
            id="contact-org"
            type="text"
            value={org}
            onChange={(e) => setOrg(e.target.value)}
            placeholder="Company or studio name"
            className="mt-2 min-h-10 w-full rounded-[6px] border border-[#cfcfca] bg-white px-3 text-[14px] text-[#111111] outline-none transition placeholder:text-[#a6a6a4] focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
          />
        </div>

        <div>
          <label
            htmlFor="contact-inquiry"
            className="block text-[12px] font-semibold uppercase tracking-normal text-[#111111]"
          >
            Inquiry type
          </label>
          <div className="relative mt-2">
            <select
              id="contact-inquiry"
              value={inquiryType}
              onChange={(e) => setInquiryType(normalizeInquiryType(e.target.value))}
              className="min-h-10 w-full appearance-none rounded-[6px] border border-[#cfcfca] bg-white px-3 text-[14px] text-[#111111] outline-none transition focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
            >
              <option value="early-access">Request early access</option>
              <option value="walkthrough">Book a walkthrough</option>
              <option value="feedback">Share product feedback</option>
              <option value="general">General question</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#626260]">
              <span className="text-[10px]">v</span>
            </div>
          </div>
        </div>

        <div>
          <label
            htmlFor="contact-message"
            className="block text-[12px] font-semibold uppercase tracking-normal text-[#111111]"
          >
            Message <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <textarea
            id="contact-message"
            required
            aria-required="true"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell us what you estimate, where your current workflow breaks, and what you want to see."
            className="mt-2 w-full resize-y rounded-[6px] border border-[#cfcfca] bg-white p-3 text-[14px] text-[#111111] outline-none transition placeholder:text-[#a6a6a4] focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
          />
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-[320px] text-[11px] leading-4 text-[#626260]">
          Opening an email draft keeps this request on your device until you send it.
        </p>

        <button
          type="submit"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[5px] bg-brand-orange px-6 text-[12px] font-bold uppercase tracking-normal text-white transition hover:bg-brand-orange-dark disabled:bg-[#cfcfca] disabled:text-[#626260]"
        >
          Open Email Draft
        </button>
      </div>
    </form>
  );
}

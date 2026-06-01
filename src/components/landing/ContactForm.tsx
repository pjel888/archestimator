"use client";

import { useState, FormEvent } from "react";
import { EnvelopeOpen } from "@phosphor-icons/react/dist/ssr";

const SUPPORT_EMAIL = "support@archestimator.com";

type SupportMailtoInput = {
  name: string;
  email: string;
  org: string;
  inquiryType: string;
  message: string;
};

const inquiryLabels: Record<string, string> = {
  access: "Closed beta access request",
  demo: "Product demo request",
  feedback: "Beta product feedback",
  other: "General question",
};

export function buildSupportMailto(input: SupportMailtoInput) {
  const inquiryLabel = inquiryLabels[input.inquiryType] ?? inquiryLabels.other;
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

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [org, setOrg] = useState("");
  const [inquiryType, setInquiryType] = useState("access");
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
        className="rounded-[16px] border border-[#cfcfca] bg-[#f5f5f3] p-8 text-center shadow-sm"
        role="alert"
        aria-live="polite"
      >
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
          <EnvelopeOpen className="size-7" weight="bold" />
        </div>
        <h2 className="mt-5 text-[22px] font-semibold tracking-tight text-[#111111]">
          Support email draft prepared
        </h2>
        <p className="mt-3 text-[14px] leading-6 text-[#626260]">
          Your email app should open a draft addressed to <strong>{SUPPORT_EMAIL}</strong>. Send that draft to request access, share beta feedback, or report a workflow issue.
        </p>
        <p className="mt-2 text-[12px] leading-5 text-[#626260]">
          If the draft did not open, email <strong>{SUPPORT_EMAIL}</strong> directly and include your Google sign-in email plus the project or estimate context.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href={mailtoLink}
            className="inline-flex min-h-10 items-center justify-center rounded-[5px] bg-[#17181c] px-5 text-[11px] font-bold uppercase tracking-[0.02em] text-white transition hover:bg-[#2a2b30] active:scale-95"
          >
            Open email draft
          </a>
          <button
            onClick={() => {
              setMailtoLink("");
              setName("");
              setEmail("");
              setOrg("");
              setInquiryType("access");
              setMessage("");
            }}
            className="inline-flex min-h-10 items-center justify-center rounded-[5px] border border-[#cfcfca] bg-white px-5 text-[11px] font-bold uppercase tracking-[0.02em] text-[#17181c] transition hover:bg-[#eeeeec] active:scale-95"
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
      className="rounded-[16px] border border-[#cfcfca] bg-[#f5f5f3] p-6 shadow-sm sm:p-8"
      noValidate
    >
      <h2 className="text-[20px] font-semibold tracking-tight text-[#111111]">
        Send a message
      </h2>
      <p className="mt-1 text-[13px] text-[#626260]">
        Fill out the form below and we will get back to you.
      </p>

      {errorMsg && (
        <div 
          className="mt-5 rounded-[6px] bg-red-500/5 p-3 border border-red-500/15 text-red-600 text-[13px] font-medium"
          role="alert"
        >
          {errorMsg}
        </div>
      )}

      <div className="mt-6 space-y-5">
        {/* Name Field */}
        <div>
          <label 
            htmlFor="contact-name"
            className="block text-[12px] font-semibold text-[#111111] uppercase tracking-wider"
          >
            Full Name <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="contact-name"
            type="text"
            required
            aria-required="true"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            className="mt-2 w-full min-h-10 rounded-[6px] border border-[#cfcfca] bg-white px-3 text-[14px] text-[#111111] placeholder-[#a6a6a4] outline-none transition focus:border-[#ff7a1a] focus:ring-1 focus:ring-[#ff7a1a] disabled:bg-[#eeeeec]/50"
          />
        </div>

        {/* Email Field */}
        <div>
          <label 
            htmlFor="contact-email"
            className="block text-[12px] font-semibold text-[#111111] uppercase tracking-wider"
          >
            Email Address <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="contact-email"
            type="email"
            required
            aria-required="true"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="john@example.com"
            className="mt-2 w-full min-h-10 rounded-[6px] border border-[#cfcfca] bg-white px-3 text-[14px] text-[#111111] placeholder-[#a6a6a4] outline-none transition focus:border-[#ff7a1a] focus:ring-1 focus:ring-[#ff7a1a] disabled:bg-[#eeeeec]/50"
          />
        </div>

        {/* Organization Field */}
        <div>
          <label 
            htmlFor="contact-org"
            className="block text-[12px] font-semibold text-[#111111] uppercase tracking-wider"
          >
            Organization
          </label>
          <input
            id="contact-org"
            type="text"
            value={org}
            onChange={(e) => setOrg(e.target.value)}
            placeholder="e.g. Acme Construction"
            className="mt-2 w-full min-h-10 rounded-[6px] border border-[#cfcfca] bg-white px-3 text-[14px] text-[#111111] placeholder-[#a6a6a4] outline-none transition focus:border-[#ff7a1a] focus:ring-1 focus:ring-[#ff7a1a] disabled:bg-[#eeeeec]/50"
          />
        </div>

        {/* Inquiry Type Field */}
        <div>
          <label 
            htmlFor="contact-inquiry"
            className="block text-[12px] font-semibold text-[#111111] uppercase tracking-wider"
          >
            Inquiry Type
          </label>
          <div className="relative mt-2">
            <select
              id="contact-inquiry"
              value={inquiryType}
              onChange={(e) => setInquiryType(e.target.value)}
              className="w-full min-h-10 rounded-[6px] border border-[#cfcfca] bg-white px-3 text-[14px] text-[#111111] outline-none transition focus:border-[#ff7a1a] focus:ring-1 focus:ring-[#ff7a1a] appearance-none disabled:bg-[#eeeeec]/50"
            >
              <option value="access">Request Early Access</option>
              <option value="demo">Request a Product Demo</option>
              <option value="feedback">Provide Product Feedback</option>
              <option value="other">General Questions</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#626260]">
              <span className="text-[10px]">▼</span>
            </div>
          </div>
        </div>

        {/* Message Field */}
        <div>
          <label 
            htmlFor="contact-message"
            className="block text-[12px] font-semibold text-[#111111] uppercase tracking-wider"
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
            placeholder="Tell us about your team and estimating workflow needs..."
            className="mt-2 w-full rounded-[6px] border border-[#cfcfca] bg-white p-3 text-[14px] text-[#111111] placeholder-[#a6a6a4] outline-none transition focus:border-[#ff7a1a] focus:ring-1 focus:ring-[#ff7a1a] disabled:bg-[#eeeeec]/50 resize-y"
          />
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] leading-4 text-[#626260] max-w-[280px]">
          By submitting, you agree to our honest feedback terms. We store contact info solely to process your request.
        </p>

        <button
          type="submit"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[5px] bg-[#ff7a1a] px-6 text-[12px] font-bold uppercase tracking-[0.02em] text-white transition hover:bg-[#e06610] disabled:bg-[#cfcfca] disabled:text-[#626260]"
        >
          Open Email Draft
        </button>
      </div>
    </form>
  );
}

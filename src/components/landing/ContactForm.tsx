"use client";

import { useReducer, type FormEvent } from "react";
import { EnvelopeOpen } from "@phosphor-icons/react/dist/ssr";

import { buildSupportMailto, normalizeInquiryType, SUPPORT_EMAIL } from "./contact-mailto";

export type ContactIntent = "early-access" | "walkthrough" | "general";
type ContactInquiryType = ContactIntent | "feedback";

type ContactFormState = {
  name: string;
  email: string;
  org: string;
  inquiryType: ContactInquiryType;
  message: string;
  mailtoLink: string;
  errorMsg: string;
};

type ContactFormAction =
  | { type: "field"; field: "name" | "email" | "org" | "message"; value: string }
  | { type: "inquiry"; value: ContactInquiryType }
  | { type: "submit:error"; message: string }
  | { type: "submit:success"; mailtoLink: string }
  | { type: "reset"; initialIntent: ContactIntent };

function getInitialContactFormState(initialIntent: ContactIntent): ContactFormState {
  return {
    name: "",
    email: "",
    org: "",
    inquiryType: initialIntent,
    message: "",
    mailtoLink: "",
    errorMsg: "",
  };
}

function contactFormReducer(state: ContactFormState, action: ContactFormAction): ContactFormState {
  switch (action.type) {
    case "field":
      return { ...state, [action.field]: action.value };
    case "inquiry":
      return { ...state, inquiryType: action.value };
    case "submit:error":
      return { ...state, errorMsg: action.message, mailtoLink: "" };
    case "submit:success":
      return { ...state, errorMsg: "", mailtoLink: action.mailtoLink };
    case "reset":
      return getInitialContactFormState(action.initialIntent);
    default:
      return state;
  }
}

export function ContactForm({ initialIntent = "early-access" }: { initialIntent?: ContactIntent }) {
  const [formState, dispatchForm] = useReducer(contactFormReducer, initialIntent, getInitialContactFormState);
  const { name, email, org, inquiryType, message, mailtoLink, errorMsg } = formState;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !message.trim()) {
      dispatchForm({ type: "submit:error", message: "Please fill out all required fields." });
      return;
    }

    const nextMailtoLink = buildSupportMailto({ name, email, org, inquiryType, message });
    dispatchForm({ type: "submit:success", mailtoLink: nextMailtoLink });
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
            onClick={() => dispatchForm({ type: "reset", initialIntent })}
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
            onChange={(e) => dispatchForm({ type: "field", field: "name", value: e.target.value })}
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
            onChange={(e) => dispatchForm({ type: "field", field: "email", value: e.target.value })}
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
            onChange={(e) => dispatchForm({ type: "field", field: "org", value: e.target.value })}
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
              onChange={(e) => dispatchForm({ type: "inquiry", value: normalizeInquiryType(e.target.value) })}
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
            onChange={(e) => dispatchForm({ type: "field", field: "message", value: e.target.value })}
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

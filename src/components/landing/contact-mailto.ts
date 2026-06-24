const SUPPORT_EMAIL = "support@archestimator.com";

type ContactInquiryType = "early-access" | "walkthrough" | "general" | "feedback";

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

export function normalizeInquiryType(value: string): ContactInquiryType {
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

export { SUPPORT_EMAIL };

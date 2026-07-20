/**
 * The `/new` immersive landing copy contract.
 *
 * Short copy only — the page is four narrative sections plus a footer.
 * The dev-only invariant at the bottom enforces the founder reset:
 * at most four main narrative sections and at most 260 visible words
 * before the footer.
 */

export const EARLY_ACCESS_HREF = "/contact?intent=started#contact-form";
export const SIGN_IN_HREF = "/login?next=/workshop";

export const hero = {
  eyebrow: "Construction estimating software",
  title: "The estimate should remember.",
  lead: "Build the number, carry it into a clear proposal, collect feedback, and revise without losing the context behind the cost.",
  ctaLabel: "Request early access",
  microLine: "Less rework. Clearer proposals. Better cost decisions.",
} as const;

/** Tiny four-state index shown under the hero copy. */
export const STATE_LABELS = ["Estimate", "Proposal", "Review", "Revision"] as const;
export const STATE_INDEX_LABEL = STATE_LABELS.join(" · ");

export const storyBeats = [
  {
    heading: "Build the number.",
    sentence: "Structure quantities, rates, sources, and totals so the cost story has somewhere to live.",
  },
  {
    heading: "Carry it into the proposal.",
    sentence: "Change the format without rebuilding the commercial logic in another file.",
  },
  {
    heading: "Let feedback land on the cost.",
    sentence: "Keep questions and decisions beside the proposal context being reviewed.",
  },
  {
    heading: "Revise without losing the reason.",
    sentence: "Use the preserved trail to guide the next edit; Archestimator never changes the estimate for you.",
  },
] as const;

export const benefits = {
  heading: "Spreadsheets calculate. They do not remember.",
  phrases: ["Less rework.", "Clearer proposals.", "Better cost decisions."] as const,
  body: "Archestimator keeps Excel in reach while connecting the estimate, proposal, feedback, and revision around it.",
  status: "Pre-release product · founder-led onboarding · controlled early access",
} as const;

export const close = {
  heading: "Keep the number and the next decision connected.",
  body: "Bring a real estimate. We will walk the workflow with you.",
  ctaLabel: "Request early access",
} as const;

export const header = {
  signInLabel: "Sign in",
} as const;

export const footerLinks = [
  { label: "Features", href: "/features" },
  { label: "Trust", href: "/trust" },
  { label: "Security", href: "/security" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
] as const;

export const footerLine = "Pre-release product · © 2026 Archestimator";

/** The four main narrative sections, in document order. */
export const MAIN_SECTIONS = ["hero", "story", "benefits", "close"] as const;

/* ------------------------------------------------------------------ */
/* Dev-only contract invariant                                         */
/* ------------------------------------------------------------------ */

const countWords = (value: string): number =>
  value.split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token)).length;

/** Every visible copy string rendered before the footer. */
const VISIBLE_COPY_BEFORE_FOOTER: readonly string[] = [
  hero.eyebrow,
  hero.title,
  hero.lead,
  hero.ctaLabel, // header CTA
  hero.ctaLabel, // hero CTA
  hero.microLine,
  header.signInLabel,
  STATE_INDEX_LABEL,
  ...storyBeats.flatMap((beat) => [beat.heading, beat.sentence]),
  benefits.heading,
  ...benefits.phrases,
  benefits.body,
  benefits.status,
  close.heading,
  close.body,
  close.ctaLabel,
];

export const VISIBLE_WORD_COUNT = VISIBLE_COPY_BEFORE_FOOTER.reduce(
  (total, value) => total + countWords(value),
  0,
);

if (process.env.NODE_ENV !== "production") {
  if (MAIN_SECTIONS.length > 4) {
    throw new Error("The /new immersive page must contain at most 4 main narrative sections.");
  }
  if (VISIBLE_WORD_COUNT > 260) {
    throw new Error(
      `The /new immersive page must stay at or under 260 visible words before the footer (currently ${VISIBLE_WORD_COUNT}).`,
    );
  }
}

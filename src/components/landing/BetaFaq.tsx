"use client";

import { useState } from "react";
import { CaretDown } from "@phosphor-icons/react/dist/ssr";
import { trackConversion } from "@/lib/ab-testing/experiment-tracker";

const betaFaqItems = [
  {
    id: "q1",
    question: "What does the closed beta include?",
    answer:
      "The estimate workspace, the reusable component library, multiple estimate sheets per project, and proposal share pages. Revision history and proposal comparison are in active development.",
  },
  {
    id: "q2",
    question: "What does it cost?",
    answer:
      "Nothing during beta. Public pricing comes after, shaped with beta teams. No credit card, no surprise conversion.",
  },
  {
    id: "q3",
    question: "What happens to my data after beta?",
    answer:
      "Your projects, estimates, and library remain yours. We will give clear notice and migration paths before any plan changes.",
  },
  {
    id: "q4",
    question: "How do I get access?",
    answer:
      "Request access and tell us how your team quotes. We onboard teams in small batches so the first estimate gets real support.",
  },
] as const;

export function BetaFaq() {
  const [openId, setOpenId] = useState<string | null>(null);

  function toggleItem(id: string) {
    const isOpening = openId !== id;
    setOpenId(isOpening ? id : null);

    if (isOpening) {
      trackConversion("hero-cta-copy", "faq_open", { question_id: id });
    }
  }

  return (
    <div className="mt-16 max-w-[860px]">
      <h3 className="landing-h3 text-ink-1">Beta questions, answered plainly.</h3>

      <div className="mt-6 border-t border-line-1">
        {betaFaqItems.map((item) => {
          const isOpen = openId === item.id;
          const buttonId = `beta-faq-${item.id}-question`;
          const panelId = `beta-faq-${item.id}-panel`;

          return (
            <div key={item.id} className="border-b border-line-1">
              <h4>
                <button
                  type="button"
                  id={buttonId}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggleItem(item.id)}
                  className="flex min-h-12 w-full items-center justify-between gap-6 py-4 text-left text-[15px] font-medium text-ink-1 transition-colors hover:text-brand-clay-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-clay motion-reduce:transition-none"
                >
                  {item.question}
                  <CaretDown
                    aria-hidden="true"
                    weight="bold"
                    className={`size-4 shrink-0 text-ink-3 transition-transform duration-200 motion-reduce:transition-none ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </h4>
              {/* Collapsible without JS-measured heights: the grid row animates
                  between 0fr and 1fr; visibility flips discretely so closed
                  answers leave the accessibility tree and tab order. */}
              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
                  isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div
                  className={`overflow-hidden transition-[visibility] duration-300 motion-reduce:transition-none ${
                    isOpen ? "visible" : "invisible"
                  }`}
                >
                  <p className="landing-body max-w-[68ch] pb-5 text-ink-2">{item.answer}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

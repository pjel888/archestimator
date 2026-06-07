"use client";

import { useState } from "react";
import { CaretDown } from "@phosphor-icons/react/dist/ssr";
import { MotionReveal } from "./MotionReveal";

interface FAQItem {
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    question: "How does access work?",
    answer: "Request access with the Google account you want enabled. If approved, that account can enter the workspace after it is added to the access list.",
  },
  {
    question: "Will there be product walkthrough videos?",
    answer: "Yes. Short walkthroughs are planned for quote build, revision review, and proposal handoff once the recordings are approved for public use.",
  },
  {
    question: "Can I import or export my existing quote sheets?",
    answer: "The current workspace supports structured quote work and reusable cost components. Spreadsheet import, export, and document handoff workflows remain planned paths and should not be presented as finished public capabilities yet.",
  },
  {
    question: "How does Archestimator differ from spreadsheets?",
    answer: "Spreadsheets are flexible, but they often separate quote structure, supplier context, revision evidence, and proposal language. Archestimator is built to keep those commercial decisions closer together while the offer matures.",
  },
  {
    question: "Is my quote data protected?",
    answer: "Workspace access is protected by login and row-level access rules. Broader security, privacy, and compliance claims should stay pending until the reviewed Privacy Notice, Terms, and security posture are published.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section
      id="faq"
      data-landing-snap-section="true"
      className="relative scroll-mt-[68px] bg-white border-b border-[#dedbd6] px-4 py-24 sm:px-6 sm:py-32 lg:px-8"
    >
      <div className="mx-auto w-full max-w-[1120px]">
        <MotionReveal>
          <div className="text-center mb-16">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-normal text-[#7b7b78]">
              Access FAQ
            </p>
            <h2 className="mt-4 text-[34px] font-normal leading-[1.05] tracking-normal text-[#111111] sm:text-[44px]">
              A few practical notes before access.
            </h2>
            <p className="mx-auto mt-4 max-w-[540px] text-[14px] leading-[1.5] text-[#626260]">
              Access is intentionally small while quote workflows, revision review, and proposal handoff continue to mature.
            </p>
          </div>
        </MotionReveal>

        <div className="mx-auto max-w-[820px] space-y-4">
          {faqData.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <MotionReveal key={index} staggerIndex={index + 1}>
                <div className="rounded-[10px] border border-[#dedbd6] bg-[#faf9f6] transition duration-300 hover:border-[#ff7a1a]/30">
                  <button
                    onClick={() => toggleFAQ(index)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between px-5 py-4 text-left font-medium text-[#111111] focus:outline-none"
                  >
                    <span className="text-[14px] sm:text-[15px] font-semibold tracking-normal">
                      {item.question}
                    </span>
                    <span
                      className={`flex size-6 shrink-0 items-center justify-center rounded-full border border-[#dedbd6] bg-white text-[#ff7a1a] transition-transform duration-300 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    >
                      <CaretDown size={14} weight="bold" />
                    </span>
                  </button>
                  <div
                    className={`grid transition-all duration-300 ease-in-out ${
                      isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="px-5 pb-5 pt-1 text-[13px] sm:text-[14px] leading-[1.6] text-[#4f4f4d] border-t border-[#dedbd6]/50">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                </div>
              </MotionReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

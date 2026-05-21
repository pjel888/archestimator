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
    question: "How does the MVP preview work?",
    answer: "The MVP preview offers free access (₱0) to our early-stage estimating workspace. By participating, you get direct access to the tool, and your usage and feedback directly help us shape the product features, interfaces, and roadmap before our public release.",
  },
  {
    question: "Can I import my existing Excel estimating sheets?",
    answer: "We support structured manual entry and quick copy-paste into our project hierarchy to ensure clean cost structures. While direct Excel importing is not yet supported, we plan to support structured Excel and PDF exporting in future updates to make handoffs seamless.",
  },
  {
    question: "Is my estimate data secure?",
    answer: "Yes. Your data is stored securely using Supabase with strict Row-Level Security (RLS) policies, meaning only authorized users in your workspace can access or modify your estimates. We prioritize local-first responsiveness and secure cloud syncing.",
  },
  {
    question: "How does Archestimator differ from spreadsheets?",
    answer: "Traditional spreadsheets suffer from broken formulas, disconnected tabs, and high risk of errors. Archestimator structures estimates by project hierarchy, lets you reuse cost components across projects, tracks revisions systematically, and compares proposals side-by-side without duplicating sheets.",
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
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7b7b78]">
              Got questions?
            </p>
            <h2 className="mt-4 text-[34px] font-normal leading-[1.05] tracking-[-0.045em] text-[#111111] sm:text-[44px]">
              Frequently Asked Questions
            </h2>
            <p className="mx-auto mt-4 max-w-[540px] text-[14px] leading-[1.5] text-[#626260]">
              Everything you need to know about the Archestimator MVP preview and our product direction.
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
                    <span className="text-[14px] sm:text-[15px] font-semibold tracking-[-0.015em]">
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

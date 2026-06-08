"use client";

import { useState } from "react";
import { CaretDown } from "@phosphor-icons/react/dist/ssr";
import { MotionReveal } from "./MotionReveal";

interface FAQItem {
  question: string;
  answer: string;
}

const insightCards = [
  {
    title: "Why quote logic breaks before the proposal",
    body: "Most quote problems start when quantities, supplier notes, and assumptions live in different places.",
  },
  {
    title: "How reusable assemblies change estimate review",
    body: "A component library gives teams a calmer way to reuse scope while still checking the job-specific details.",
  },
  {
    title: "What beta testers should expect",
    body: "The closed beta is focused on estimate structure, catalog reuse, revision context, and proposal handoff direction.",
  },
] as const;

const faqData: FAQItem[] = [
  {
    question: "How does the closed beta work?",
    answer: "Archestimator is invite-only during closed beta. Request access with the Google account you want enabled; approved testers can enter the workspace after their email is allowlisted.",
  },
  {
    question: "Can I import my existing Excel quote sheets?",
    answer: "We support structured manual entry and quick copy-paste into the workspace to keep line items clean. Direct Excel importing is not yet supported, and spreadsheet/document handoff remains a planned workflow.",
  },
  {
    question: "Is my quote data protected?",
    answer: "Workspace access is protected by login and row-level access rules. Broader security, privacy, and compliance claims stay pending until the reviewed Privacy Notice, Terms, and security posture are published.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section
      id="insights"
      data-landing-snap-section="true"
      className="relative scroll-mt-[68px] border-b border-[#ebe4dc] bg-[#fffdf9] px-6 py-24 sm:px-8 sm:py-32 lg:px-12"
    >
      <div className="mx-auto w-full max-w-[1952px]">
        <MotionReveal>
          <div className="mb-12 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <p className="text-[12px] font-semibold text-[#9b4e29]">
                Field notes
              </p>
              <h2 className="mt-4 text-[42px] font-normal leading-[1.06] tracking-normal text-[#171514] sm:text-[56px]">
                Get the latest field notes.
              </h2>
            </div>
            <p className="max-w-[460px] text-[15px] leading-7 text-[#5f554d]">
              Short product essays for teams replacing fragile spreadsheets with a more deliberate quote workflow.
            </p>
          </div>
        </MotionReveal>

        <div className="grid gap-4 lg:grid-cols-3">
          {insightCards.map((card, index) => (
            <MotionReveal key={card.title} staggerIndex={index + 1}>
              <article className="flex min-h-[240px] flex-col justify-between rounded-[8px] border border-[#ded2c7] bg-[#fbf7f2] p-6">
                <span className="text-[12px] font-semibold text-[#9b4e29]">
                  0{index + 1}
                </span>
                <div>
                  <h3 className="text-[25px] font-normal leading-[1.12] tracking-normal text-[#171514]">
                    {card.title}
                  </h3>
                  <p className="mt-4 text-[14px] leading-6 text-[#625950]">{card.body}</p>
                </div>
              </article>
            </MotionReveal>
          ))}
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-[minmax(0,0.48fr)_minmax(0,0.72fr)]">
          <MotionReveal>
            <div>
              <p className="text-[12px] font-semibold text-[#9b4e29]">
                Closed beta FAQ
              </p>
              <h3 className="mt-3 text-[30px] font-normal leading-[1.12] tracking-normal text-[#171514]">
                Practical details before you request access.
              </h3>
            </div>
          </MotionReveal>

          <div className="space-y-3">
            {faqData.map((item, index) => {
              const isOpen = openIndex === index;

              return (
                <MotionReveal key={item.question} staggerIndex={index + 4}>
                  <div className="rounded-[8px] border border-[#ded2c7] bg-white transition duration-300 hover:border-[#c7835c]">
                    <button
                      onClick={() => toggleFAQ(index)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center justify-between gap-5 px-5 py-4 text-left font-medium text-[#171514] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b65f2f]"
                    >
                      <span className="text-[14px] font-semibold">
                        {item.question}
                      </span>
                      <span
                        className={`flex size-6 shrink-0 items-center justify-center rounded-full border border-[#ded2c7] bg-[#fbf7f2] text-[#a9532d] transition-transform duration-300 ${
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
                        <p className="border-t border-[#ebe4dc] px-5 pb-5 pt-4 text-[14px] leading-6 text-[#5f554d]">
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
      </div>
    </section>
  );
}

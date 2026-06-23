"use client";

import { useState } from "react";
import type { CSSProperties } from "react";

import { RevealOnScroll } from "@/components/frontdoor/utilities/RevealOnScroll";
import { SectionEyebrow } from "@/components/frontdoor/utilities/SectionEyebrow";
import styles from "../FrontdoorPage.module.css";

type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

const ITEMS: ReadonlyArray<FaqItem> = [
  {
    id: "spreadsheet",
    question: "Is Archestimator a spreadsheet replacement?",
    answer:
      "It replaces the spreadsheet rebuild loop for AEC cost proposals. You still bring your own rates, suppliers, and judgment. Archestimator keeps them connected.",
  },
  {
    id: "production",
    question: "What is available today?",
    answer:
      "The estimate workspace, cost library, revision records, shared proposal links, and exports are active product areas. Teams that need onboarding can book a walkthrough around a real estimate.",
  },
  {
    id: "audience",
    question: "Who is it for first?",
    answer:
      "AEC teams in the Philippines and Southeast Asia: cost estimators, architects, contractors, quantity surveyors, fit-out firms, and the clients and owners who review their proposals.",
  },
  {
    id: "ai",
    question: "Does Archestimator use AI to write estimates?",
    answer:
      "No. AI features are deferred from launch. The product is for estimators who want their judgment structured, not replaced.",
  },
  {
    id: "privacy",
    question: "Is my data private?",
    answer:
      "Yes. Your data is yours. Archestimator does not pool, anonymize, or sell customer data. Cross-customer aggregation is explicitly not part of the model.",
  },
  {
    id: "pricing",
    question: "Where does pricing live?",
    answer:
      "Pricing lives on the pricing page. Teams with complex workflows can use a walkthrough to map onboarding, library setup, and proposal handoff before starting.",
  },
];

export function FaqSection() {
  const [openId, setOpenId] = useState<string | null>(ITEMS[0]?.id ?? null);

  return (
    <section className={styles.faqSection} aria-labelledby="faq-title">
      <div className={styles.faq}>
        <RevealOnScroll className={styles.faqHead}>
          <SectionEyebrow label="Plain answers" />
          <h2 id="faq-title" className={styles.h2} style={{ marginTop: "0.6rem" } as CSSProperties}>
            Answers
          </h2>
          <p className={styles.lede} style={{ marginTop: "0.4rem" } as CSSProperties}>
            Practical answers about the workflow, data posture, and first teams Archestimator is built for.
          </p>
        </RevealOnScroll>

        <RevealOnScroll delayMs={120}>
          <div className={styles.faqList}>
            {ITEMS.map((item) => {
              const isOpen = openId === item.id;
              return (
                <div key={item.id} className={styles.faqItem} data-open={isOpen ? "true" : "false"}>
                  <button
                    type="button"
                    className={styles.faqQuestion}
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${item.id}`}
                    onClick={() => setOpenId(isOpen ? null : item.id)}
                  >
                    <span>{item.question}</span>
                    <span className={styles.faqToggle} aria-hidden="true">
                      <span className={`${styles.faqToggleLine} ${styles.faqToggleLineH}`} />
                      <span className={`${styles.faqToggleLine} ${styles.faqToggleLineV}`} />
                    </span>
                  </button>
                  <div id={`faq-answer-${item.id}`} className={styles.faqAnswer}>
                    <div className={styles.faqAnswerInner}>
                      <p className={styles.faqAnswerText}>{item.answer}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}

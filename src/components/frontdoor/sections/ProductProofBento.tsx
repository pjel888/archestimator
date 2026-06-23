import type { CSSProperties } from "react";
import { RevealOnScroll } from "@/components/frontdoor/utilities/RevealOnScroll";
import { SectionEyebrow } from "@/components/frontdoor/utilities/SectionEyebrow";
import { ArrowUpRight } from "@/components/frontdoor/icons";
import styles from "../FrontdoorPage.module.css";

type BentoCardSpec = {
  ordinal: string;
  title: string;
  body: string;
  placeholderTag: string;
  spanClass: string;
};

const CARDS: ReadonlyArray<BentoCardSpec> = [
  {
    ordinal: "01",
    title: "Estimate Sheet",
    body: "Build the estimate in project structure. Project tree, Areas, rows, quantities, totals — save state on every line.",
    placeholderTag: "ESTIMATE SHEET",
    spanClass: styles.bentoSpanA,
  },
  {
    ordinal: "02",
    title: "Cost Library",
    body: "Reuse your prices, suppliers, variants, and templates.",
    placeholderTag: "COST LIBRARY",
    spanClass: styles.bentoSpanB,
  },
  {
    ordinal: "03",
    title: "Activity",
    body: "Keep every revision on the record.",
    placeholderTag: "ACTIVITY",
    spanClass: styles.bentoSpanC,
  },
  {
    ordinal: "04",
    title: "Shared Proposal",
    body: "Send one review surface for comments and decisions.",
    placeholderTag: "SHARED LINK",
    spanClass: styles.bentoSpanD,
  },
  {
    ordinal: "05",
    title: "XLSX Export",
    body: "Package the work for handoff and review.",
    placeholderTag: "EXPORT",
    spanClass: styles.bentoSpanE,
  },
  {
    ordinal: "06",
    title: "Project Charts",
    body: "See where the money goes by space, category, or supplier.",
    placeholderTag: "CHARTS",
    spanClass: styles.bentoSpanF,
  },
];

export function ProductProofBento() {
  return (
    <section className={styles.bentoSection} aria-labelledby="bento-title">
      <div className={styles.bentoHead}>
        <RevealOnScroll>
          <SectionEyebrow ordinal="04" label="LIVE PRODUCT PROOF" />
        </RevealOnScroll>
        <RevealOnScroll as="h2" className={styles.h2} delayMs={60} id="bento-title" style={{ marginTop: "0.75rem" } as CSSProperties}>
          The estimate-to-proposal loop, on the record.
        </RevealOnScroll>
        <RevealOnScroll as="p" className={styles.lede} delayMs={120} style={{ marginTop: "0.5rem" } as CSSProperties}>
          Every Archestimator surface turns estimating work into reusable commercial infrastructure.
        </RevealOnScroll>
      </div>
      <div className={styles.bento}>
        {CARDS.map((card, index) => (
          <RevealOnScroll
            key={card.ordinal}
            delayMs={index * 50}
            className={`${styles.bentoCard} ${card.spanClass}`}
          >
            <div className={styles.bentoCardInner}>
              <div className={styles.bentoCardHead}>
                <span className={styles.bentoOrdinal}>{card.ordinal}</span>
                <ArrowUpRight className={styles.bentoArrow} />
              </div>
              <h3 className={styles.bentoTitle}>{card.title}</h3>
              <p className={styles.bentoBody}>{card.body}</p>
              <div className={styles.bentoPlaceholder}>
                <span>{card.placeholderTag} &middot; placeholder</span>
              </div>
            </div>
          </RevealOnScroll>
        ))}
      </div>
    </section>
  );
}

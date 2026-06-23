import type { CSSProperties } from "react";
import { RevealOnScroll } from "@/components/frontdoor/utilities/RevealOnScroll";
import { SectionEyebrow } from "@/components/frontdoor/utilities/SectionEyebrow";
import { ProductSurfacePanel, type ProductSurfaceKind } from "./ProductSurfacePanel";
import { ArrowUpRight } from "@/components/frontdoor/icons";
import styles from "../FrontdoorPage.module.css";

type BentoCardSpec = {
  title: string;
  body: string;
  surface: ProductSurfaceKind;
  spanClass: string;
};

const CARDS: ReadonlyArray<BentoCardSpec> = [
  {
    title: "Estimate Sheet",
    body: "Build the estimate in project structure. Project tree, areas, rows, quantities, totals - save state on every line.",
    surface: "estimate",
    spanClass: styles.bentoSpanA,
  },
  {
    title: "Cost Library",
    body: "Reuse your prices, suppliers, variants, and templates.",
    surface: "library",
    spanClass: styles.bentoSpanB,
  },
  {
    title: "Activity",
    body: "Keep every revision on the record.",
    surface: "activity",
    spanClass: styles.bentoSpanC,
  },
  {
    title: "Shared Proposal",
    body: "Send one review surface for comments and decisions.",
    surface: "proposal",
    spanClass: styles.bentoSpanD,
  },
  {
    title: "XLSX Export",
    body: "Package the work for handoff and review.",
    surface: "export",
    spanClass: styles.bentoSpanE,
  },
  {
    title: "Project Charts",
    body: "See where the money goes by space, category, or supplier.",
    surface: "charts",
    spanClass: styles.bentoSpanF,
  },
];

export function ProductLoopBento() {
  return (
    <section className={styles.bentoSection} aria-labelledby="bento-title">
      <div className={styles.bentoHead}>
        <RevealOnScroll>
          <SectionEyebrow label="The estimate loop" />
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
            key={card.title}
            delayMs={index * 50}
            className={`${styles.bentoCard} ${card.spanClass}`}
          >
            <div className={styles.bentoCardInner}>
              <div className={styles.bentoCardHead}>
                <span className={styles.bentoSurfaceLabel}>{card.surface}</span>
                <ArrowUpRight className={styles.bentoArrow} />
              </div>
              <h3 className={styles.bentoTitle}>{card.title}</h3>
              <p className={styles.bentoBody}>{card.body}</p>
              <ProductSurfacePanel kind={card.surface} />
            </div>
          </RevealOnScroll>
        ))}
      </div>
    </section>
  );
}

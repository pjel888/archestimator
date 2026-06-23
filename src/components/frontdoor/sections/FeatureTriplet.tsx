import type { CSSProperties } from "react";
import { Database, ShieldCheck, PaperPlaneTilt } from "@/components/frontdoor/icons";
import { RevealOnScroll } from "@/components/frontdoor/utilities/RevealOnScroll";
import { SectionEyebrow } from "@/components/frontdoor/utilities/SectionEyebrow";
import styles from "../FrontdoorPage.module.css";

type TripletCardSpec = {
  ordinal: string;
  title: string;
  body: string;
  Icon: typeof Database;
};

const CARDS: ReadonlyArray<TripletCardSpec> = [
  {
    ordinal: "01",
    title: "Reusable Library",
    body: "Your prices, suppliers, brands, and variants. Stop rebuilding from scratch.",
    Icon: Database,
  },
  {
    ordinal: "02",
    title: "Defensible Numbers",
    body: "Activity, row version history, and revision context. Every total is explainable.",
    Icon: ShieldCheck,
  },
  {
    ordinal: "03",
    title: "Proposal Handoff",
    body: "Shared links with comments, decisions, and password protection. The estimate becomes something a client can approve.",
    Icon: PaperPlaneTilt,
  },
];

export function FeatureTriplet() {
  return (
    <section className={styles.tripletSection} aria-labelledby="triplet-title">
      <div className={styles.tripletHead}>
        <RevealOnScroll>
          <SectionEyebrow ordinal="05" label="WHY IT MATTERS" />
        </RevealOnScroll>
        <RevealOnScroll as="h2" className={styles.h2} delayMs={60} id="triplet-title" style={{ marginTop: "0.75rem" } as CSSProperties}>
          Less spreadsheet drift. More estimate control.
        </RevealOnScroll>
      </div>
      <div className={styles.triplet}>
        {CARDS.map((card, index) => {
          const { Icon } = card;
          return (
            <RevealOnScroll key={card.ordinal} delayMs={index * 70} className={styles.tripletCard}>
              <span className={styles.tripletIcon} aria-hidden="true">
                <Icon />
              </span>
              <span className={styles.tripletOrdinal}>{card.ordinal}</span>
              <h3 className={styles.tripletTitle}>{card.title}</h3>
              <p className={styles.tripletBody}>{card.body}</p>
            </RevealOnScroll>
          );
        })}
      </div>
    </section>
  );
}

import type { CSSProperties } from "react";
import { Database, ShieldCheck, PaperPlaneTilt } from "@/components/frontdoor/icons";
import { RevealOnScroll } from "@/components/frontdoor/utilities/RevealOnScroll";
import { SectionEyebrow } from "@/components/frontdoor/utilities/SectionEyebrow";
import styles from "../FrontdoorPage.module.css";

type TripletCardSpec = {
  id: string;
  title: string;
  body: string;
  Icon: typeof Database;
};

const CARDS: ReadonlyArray<TripletCardSpec> = [
  {
    id: "library",
    title: "Reuse the prices you already trust.",
    body: "Keep suppliers, assemblies, variants, and dated rates close to the estimate instead of scattered across sheets.",
    Icon: Database,
  },
  {
    id: "revisions",
    title: "Explain how the total changed.",
    body: "Revision context and activity history make the number easier to defend when scope or assumptions move.",
    Icon: ShieldCheck,
  },
  {
    id: "proposal",
    title: "Send one proposal record.",
    body: "Share links, comments, decisions, and exports from the same work instead of sending another detached file.",
    Icon: PaperPlaneTilt,
  },
];

export function FeatureTriplet() {
  return (
    <section className={styles.tripletSection} aria-labelledby="triplet-title">
      <div className={styles.tripletHead}>
        <RevealOnScroll>
          <SectionEyebrow label="Why teams switch" />
        </RevealOnScroll>
        <RevealOnScroll as="h2" className={styles.h2} delayMs={60} id="triplet-title" style={{ marginTop: "0.75rem" } as CSSProperties}>
          Less spreadsheet drift. More estimate control.
        </RevealOnScroll>
      </div>
      <div className={styles.triplet}>
        {CARDS.map((card, index) => {
          const { Icon } = card;
          return (
            <RevealOnScroll key={card.id} delayMs={index * 70} className={styles.tripletCard}>
              <span className={styles.tripletIcon} aria-hidden="true">
                <Icon />
              </span>
              <h3 className={styles.tripletTitle}>{card.title}</h3>
              <p className={styles.tripletBody}>{card.body}</p>
            </RevealOnScroll>
          );
        })}
      </div>
    </section>
  );
}
